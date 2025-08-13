// This cron will run every hour, checking if there are any
// auctions that have expired, without having an accepted bid.
// If so, it will refund the coins to the auction other and
// to the bidders that did not have their bid accepted.
import { schedule } from 'node-cron'
import { Auction } from '../modules/auctions/model.js'
import { literal, Op } from 'sequelize'
import { Account } from '../modules/accounts/model.js'
import { Bid } from '../modules/bids/model.js'
import { DatabaseConnection } from '../database/index.js'
import {
  AuctionHistoryEvent,
  HistoryEventTypes,
} from '../modules/auxiliary-models/auction-history-events.js'

export const runCoinsRefundCron = () => {
  refundCoins()

  schedule('0 * * * *', () => {
    console.log('Running demo auctions cron')
    refundCoins()
  })
}

const refundCoins = async () => {
  const expiredAuctions = await Auction.findAll({
    where: {
      expiresAt: {
        [Op.lt]: new Date(),
      },
      acceptedBidId: null,
      paidCoins: { [Op.gt]: 0 },
      coinsPaidBack: false,
    },
    include: [{ model: Bid, as: 'bids' }],
  })

  if (!expiredAuctions.length) {
    return
  }

  const transaction = await DatabaseConnection.getInstance().transaction()

  try {
    const { auctionsWithBids, auctionsWithNoBids } = expiredAuctions.reduce(
      (acc, auction) => {
        if (auction.bids.length) {
          acc.auctionsWithBids.push(auction)
        } else {
          acc.auctionsWithNoBids.push(auction)
        }
        return acc
      },
      { auctionsWithBids: [], auctionsWithNoBids: [] }
    )

    // if a specific auction does not have any bids, we can refund the coins to the auction owner
    for (const auction of auctionsWithNoBids) {
      // Not using increment, so that the "afterUpdate" hook is triggered
      await Account.update(
        { coins: literal(`coins + ${auction.paidCoins}`) },
        { where: { id: auction.accountId }, transaction }
      )

      await Auction.update({ coinsPaidBack: true }, { where: { id: auction.id }, transaction })

      await AuctionHistoryEvent.create(
        {
          auctionId: auction.id,
          type: HistoryEventTypes.COINS_REFUNDED,
          details: {},
        },
        { transaction }
      )
    }

    // if an auction has bids, we need to refund the coins to the bidders
    for (const auction of auctionsWithBids) {
      const promises = auction.bids.map((bid) => {
        if (bid.paidCoins <= 0 || bid.coinsPaidBack) {
          return Promise.resolve([]) as Promise<unknown>
        }

        // Not using increment, so that the "afterUpdate" hook is triggered
        return Account.update(
          { coins: literal(`coins + ${bid.paidCoins}`) },
          { where: { id: bid.bidderId }, transaction }
        )
      })

      await Promise.all(promises)
      await Bid.update(
        { coinsPaidBack: true },
        {
          where: { id: { [Op.in]: auction.bids.map((bid) => bid.id) } },
          transaction,
        }
      )
    }

    await transaction.commit()
  } catch (error) {
    console.error('Error refunding coins', error)
    await transaction.rollback()
    return
  }
}
