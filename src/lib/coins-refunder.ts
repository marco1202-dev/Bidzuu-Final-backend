import { Op, Transaction } from 'sequelize'
import { Auction } from '../modules/auctions/model.js'
import { Account } from '../modules/accounts/model.js'
import { Bid } from '../modules/bids/model.js'
import { BidRepository } from '../modules/bids/repository.js'

class CoinsRefunder {
  handleRejectBidRefund = async (bid: Bid, transaction: Transaction) => {
    if (bid.paidCoins && !bid.coinsPaidBack) {
      const account = await Account.findByPk(bid.bidderId, { transaction })
      if (!account) {
        return
      }

      account.coins += bid.paidCoins
      await account.save({ transaction })

      await BidRepository.update(
        { id: bid.id },
        { coinsPaidBack: true },
        transaction
      )
    }
  }

  handleDeleteBidRefund = async (bid: Bid, transaction: Transaction) => {
    if (bid.paidCoins && !bid.isAccepted && !bid.coinsPaidBack) {
      const account = await Account.findByPk(bid.bidderId, { transaction })
      if (!account) {
        return
      }

      account.coins += bid.paidCoins
      await account.save({ transaction })
    }
  }

  handleAcceptBidRefund = async (bid: Bid, transaction: Transaction) => {
    // If there are any other bids to this bid's auction and
    // there were coins spent to create them, refund them
    const otherBids = await Bid.findAll({
      where: {
        auctionId: bid.auction.id,
        id: { [Op.ne]: bid.id },
        coinsPaidBack: false,
        paidCoins: { [Op.gt]: 0 },
      },
      transaction,
    })

    if (otherBids.length) {
      // We are updating each account one by one,
      // so that the "afterUpdate" hook is triggered
      for (const otherBid of otherBids) {
        const account = await Account.findByPk(otherBid.bidderId, {
          transaction,
        })
        if (!account) {
          return
        }

        account.coins += otherBid.paidCoins
        await account.save({ transaction })
      }

      await BidRepository.update(
        { id: { [Op.in]: otherBids.map((otherBid) => otherBid.id) } },
        { coinsPaidBack: true },
        transaction
      )
    }
  }

  handleDeleteAuctionRefund = async (
    auctionId: string,
    transaction: Transaction
  ) => {
    const bidsCount = await Bid.count({ where: { auctionId }, transaction })
    if (bidsCount > 0) {
      // If there are any bids that were not accepted, refund the coins
      const bids = await Bid.findAll({
        where: { auctionId, isAccepted: false },
        transaction,
      })

      // We are updating each account one by one,
      // so that the "afterUpdate" hook is triggered
      for (const bid of bids) {
        const account = await Account.findByPk(bid.bidderId, { transaction })
        if (!account) {
          return
        }

        account.coins += bid.paidCoins
        await account.save({ transaction })
      }

      await Bid.update(
        { coinsPaidBack: true },
        {
          where: { id: { [Op.in]: bids.map((bid) => bid.id) } },
          transaction,
        }
      )
      return
    }

    // Refund coins to the auction creator if there were any spent and no bids were made
    const auctionDetails = await Auction.findByPk(auctionId, { transaction })
    if (auctionDetails.paidCoins > 0 && !auctionDetails.coinsPaidBack) {
      const account = await Account.findByPk(auctionDetails.accountId, {
        transaction,
      })

      if (!account) {
        return
      }

      account.coins += auctionDetails.paidCoins
      await account.save({ transaction })
    }
  }
}

const coinsRefunder = new CoinsRefunder()
export { coinsRefunder as CoinsRefunder }
