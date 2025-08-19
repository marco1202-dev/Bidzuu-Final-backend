import { Op, Transaction } from 'sequelize'
import { DatabaseConnection } from '../../database/index.js'
import { GenericRepository } from '../../lib/base-repository.js'
import { Offer } from './model.js'
import { Auction } from '../auctions/model.js'
import { Account } from '../accounts/model.js'
import { Currency } from '../currencies/model.js'
import { CurrenciesRepository } from '../currencies/repository.js'

class OffersRepository extends GenericRepository<Offer> {
  constructor() {
    super(Offer)
  }

  public async getOffersForAuction(auctionId: string) {
    return await Offer.findAll({
      where: { auctionId },
      include: [
        {
          model: Account,
          as: 'offerer',
          attributes: ['id', 'name', 'email', 'picture'],
        },
        {
          model: Currency,
          as: 'currency',
          attributes: ['id', 'code', 'symbol'],
        },
      ],
      order: [['createdAt', 'DESC']],
    })
  }

  public async getOffersByOfferer(offererId: string) {
    return await Offer.findAll({
      where: { offererId },
      include: [
        {
          model: Auction,
          as: 'auction',
          attributes: ['id', 'title', 'startingPrice', 'allowOffers'],
        },
        {
          model: Currency,
          as: 'currency',
          attributes: ['id', 'code', 'symbol'],
        },
      ],
      order: [['createdAt', 'DESC']],
    })
  }

  public async createOffer(offerData: {
    auctionId: string
    offererId: string
    amount: number
    message?: string
    currencyId: string
  }) {
    const { auctionId, offererId, amount, message, currencyId } = offerData

    // Get the auction to validate and get starting price
    const auction = await Auction.findByPk(auctionId)
    if (!auction) {
      throw new Error('Auction not found')
    }

    // Validate offer amount is reasonable
    const minOfferAmount = auction.startingPrice * 0.1 // Minimum 10% of starting price
    const maxOfferAmount = auction.startingPrice * 10

    if (amount < minOfferAmount) {
      throw new Error(`Offer amount must be at least ${minOfferAmount}`)
    }

    if (amount > maxOfferAmount) {
      throw new Error(`Offer amount cannot exceed ${maxOfferAmount}`)
    }

    // Get price in dollars for the offer
    const priceInDollars = await CurrenciesRepository.getPriceInDollars(amount, currencyId)

    return await Offer.create({
      auctionId,
      offererId,
      amount,
      message: message || null,
      currencyId,
      initialPriceInDollars: priceInDollars,
      status: 'pending',
    })
  }

  public async acceptOffer(offerId: string, transaction?: Transaction) {
    return await DatabaseConnection.getInstance().transaction(async (dbTransaction: Transaction) => {
      const txn = transaction || dbTransaction

      const offer = await Offer.findByPk(offerId, {
        include: [{ model: Auction, as: 'auction' }],
        transaction: txn,
      })

      if (!offer) {
        throw new Error('Offer not found')
      }

      if (offer.status !== 'pending') {
        throw new Error('Offer is not pending')
      }

      // Update offer status
      await offer.update({ status: 'accepted' }, { transaction: txn })

      // Mark auction as sold with this offer
      await offer.auction.update(
        {
          acceptedOfferId: offer.id,
          acceptedOfferAt: new Date(),
        },
        { transaction: txn }
      )

      // Reject all other pending offers for this auction
      await Offer.update(
        {
          status: 'rejected',
          rejectionReason: 'Another offer was accepted',
        },
        {
          where: {
            auctionId: offer.auctionId,
            id: { [Op.ne]: offerId },
            status: 'pending',
          },
          transaction: txn,
        }
      )

      return offer
    })
  }

  public async rejectOffer(offerId: string, rejectionReason?: string, transaction?: Transaction) {
    const offer = await Offer.findByPk(offerId)
    if (!offer) {
      throw new Error('Offer not found')
    }

    if (offer.status !== 'pending') {
      throw new Error('Offer is not pending')
    }

    return await offer.update({
      status: 'rejected',
      rejectionReason: rejectionReason || null,
    })
  }

  public async counterOffer(
    offerId: string,
    counterAmount: number,
    counterMessage?: string,
    transaction?: Transaction
  ) {
    const offer = await Offer.findByPk(offerId, {
      include: [{ model: Auction, as: 'auction' }],
    })

    if (!offer) {
      throw new Error('Offer not found')
    }

    if (offer.status !== 'pending') {
      throw new Error('Offer is not pending')
    }

    // Validate counter offer amount
    const minCounterAmount = offer.auction.startingPrice * 0.1
    const maxCounterAmount = offer.auction.startingPrice * 10

    if (counterAmount < minCounterAmount) {
      throw new Error(`Counter offer amount must be at least ${minCounterAmount}`)
    }

    if (counterAmount > maxCounterAmount) {
      throw new Error(`Counter offer amount cannot exceed ${maxCounterAmount}`)
    }

    return await offer.update({
      status: 'countered',
      counterOfferAmount: counterAmount,
      counterOfferMessage: counterMessage || null,
    })
  }

  public async getPendingOffersCount(auctionId: string) {
    return await Offer.count({
      where: {
        auctionId,
        status: 'pending',
      },
    })
  }
}

const offersRepositoryInstance = new OffersRepository()
Object.freeze(offersRepositoryInstance)

export { offersRepositoryInstance as OffersRepository }
