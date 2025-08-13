import { Op, Transaction } from 'sequelize'
import { DatabaseConnection } from '../../database/index.js'
import { GenericRepository } from '../../lib/base-repository.js'
import { Bid } from './model.js'
import { Auction } from '../auctions/model.js'
import { Account } from '../accounts/model.js'
import { AuctionsRepository } from '../auctions/repository.js'
import { SettingsRepository } from '../settings/repository.js'
import { GENERAL } from '../../constants/errors.js'
import { CoinsRefunder } from '../../lib/coins-refunder.js'
import { CurrenciesRepository } from '../currencies/repository.js'
import { ExchangeRatesRepository } from '../exchange-rates/repository.js'

class BidRepository extends GenericRepository<Bid> {
  constructor() {
    super(Bid)
  }

  public async applyBidsCountToAuctions(auctions: Auction[]) {
    const auctionIds = auctions.map((el) => el.id)
    if (!auctionIds.length) {
      return []
    }

    const counts = await Bid.count({
      attributes: ['auctionId'],
      where: { auctionId: { [Op.in]: auctionIds } },
      group: ['auctionId'],
    })

    auctions.forEach((auction) => {
      const countValue = counts.find((el) => el.auctionId === auction.id)
      auction.setDataValue('bidsCount', countValue?.count || 0)
    })

    return auctions
  }

  public async markBidsFromAuctionAsSeen(auctionId: string) {
    const bidsToUpdate = await Bid.findAll({
      where: { auctionId, wasSeenNotificationSent: false },
    })

    if (!bidsToUpdate.length) {
      return []
    }

    await Bid.update({ wasSeenNotificationSent: true }, { where: { auctionId } })
    return bidsToUpdate
  }

  public async deleteBid(bid: Bid | string, transaction?: Transaction, commitTransaction = true) {
    transaction = transaction || (await DatabaseConnection.getInstance().transaction())
    try {
      if (typeof bid === 'string') {
        bid = await Bid.findOne({
          where: { id: bid },
          include: { model: Auction },
          transaction,
        })
      }

      await CoinsRefunder.handleDeleteBidRefund(bid, transaction)

      await Auction.update(
        { acceptedBidId: null },
        { where: { acceptedBidId: bid.id }, transaction }
      )

      await Bid.destroy({ where: { id: bid.id }, transaction })

      if (bid.auction.lastPrice === bid.price) {
        const highestBid = await this.getHighestBid(bid.auction.id, transaction)
        if (highestBid) {
          await Auction.update(
            { lastPrice: highestBid.price, lastPriceCurrencyId: highestBid.initialCurrencyId },
            { where: { id: bid.auction.id }, transaction }
          )
        } else {
          await Auction.update(
            {
              lastPrice: bid.auction.startingPrice,
              lastPriceCurrencyId: null,
            },
            { where: { id: bid.auction.id }, transaction }
          )
        }
      }

      if (commitTransaction) {
        await transaction.commit()
      }
    } catch (error) {
      if (commitTransaction) {
        console.error(`Could not commit transaction - delete bid: `, error)
        await transaction.rollback()
      } else {
        throw error
      }
    }
  }

  public async createBid(accountId: string, auction: Auction, bid: Partial<Bid>) {
    return await DatabaseConnection.getInstance().transaction(async (transaction: Transaction) => {
      const [settings, accountBidsCount] = await Promise.all([
        SettingsRepository.get(),
        Bid.count({ where: { bidderId: accountId } }),
      ])

      // If the account has reached the maximum number of bids allowed for free
      // and the account does not have enough credits to place a bid, return an error
      const { freeBidsCount, bidsCoinsCost } = settings
      if (accountBidsCount >= freeBidsCount) {
        const account = await Account.findByPk(accountId, { transaction })
        if (account.coins < bidsCoinsCost) {
          throw new Error(GENERAL.NOT_ENOUGH_COINS)
        }

        account.coins -= bidsCoinsCost
        await account.save({ transaction })

        bid.paidCoins = bidsCoinsCost
      }

      const createdBid = await Bid.create(bid, { transaction })

      auction.lastPrice = bid.price
      auction.lastPriceCurrencyId = bid.initialCurrencyId
      await auction.save({ transaction })

      return await Bid.findByPk(createdBid.id, {
        include: [
          {
            model: Account,
            as: 'bidder',
            attributes: ['id', 'name', 'email', 'picture', 'verified'],
          },
        ],
        transaction,
      })
    })
  }

  public async rejectBid(bid: Bid, rejectionReason?: string) {
    return await DatabaseConnection.getInstance().transaction(async (transaction: Transaction) => {
      try {
        await CoinsRefunder.handleRejectBidRefund(bid, transaction)

        await super.update(
          { id: bid.id },
          { isRejected: true, rejectionReason, isAccepted: false },
          transaction
        )
      } catch (error) {
        await transaction.rollback()
      }
    })
  }

  public async acceptBid(bid: Bid) {
    return await DatabaseConnection.getInstance().transaction(async (transaction: Transaction) => {
      try {
        const now = new Date()
        const promises = [
          AuctionsRepository.update(
            { id: bid.auction.id },
            {
              acceptedBidId: bid.id,
              acceptedBidAt: now,
            },
            transaction
          ),
          super.update({ id: bid.id }, { isAccepted: true }, transaction),
        ]

        await Promise.all<unknown>(promises)

        await CoinsRefunder.handleAcceptBidRefund(bid, transaction)
      } catch (error) {
        await transaction.rollback()
      }
    })
  }

  async getHighestBid(auctionId: string, transaction?: Transaction) {
    const [currencies, exchangeRates] = await Promise.all([
      CurrenciesRepository.getAll(),
      ExchangeRatesRepository.getLatest(),
    ])

    const allAuctionBids = await Bid.findAll({
      where: { auctionId },
      transaction,
    })

    const usdCurrency = currencies.find((currency) => currency.code === 'USD')
    if (!usdCurrency) {
      throw new Error('USD currency not found')
    }

    const usdExchangeRate = exchangeRates.rates[usdCurrency.code]
    const allAuctionsWithBidAmountInDollars = allAuctionBids.map((bid) => {
      const bidCurrency = currencies.find((currency) => currency.id === bid.initialCurrencyId)
      if (!bidCurrency) {
        throw new Error('Bid currency not found')
      }

      const bidExchangeRate = exchangeRates.rates[bidCurrency.code]
      const bidAmountInDollars = (bid.price / bidExchangeRate) * usdExchangeRate

      return {
        ...bid.toJSON(),
        bidAmountInDollars,
      }
    })

    const highestBid = allAuctionsWithBidAmountInDollars.reduce((max, current) => {
      return current.bidAmountInDollars > max.bidAmountInDollars ? current : max
    }, allAuctionsWithBidAmountInDollars[0])

    return highestBid as unknown as Bid
  }
}

const bidRepositoryInstance = new BidRepository()
Object.freeze(bidRepositoryInstance)

export { bidRepositoryInstance as BidRepository }
