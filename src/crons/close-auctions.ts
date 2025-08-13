// This cron will run every 30 minutes, checking if there are any
// auctions that have expired, without having an accepted bid.
import { schedule } from 'node-cron'
import { Auction } from '../modules/auctions/model.js'
import { Op } from 'sequelize'
import { SettingsRepository } from '../modules/settings/repository.js'
import { DatabaseConnection } from '../database/index.js'
import { FCMNotificationService } from '../lib/notifications/index.js'
import { WebSocketInstance } from '../ws/instance.js'
import { WebsocketEvents } from '../ws/socket-module.js'
import { CoinsRefunder } from '../lib/coins-refunder.js'
import { BidRepository } from '../modules/bids/repository.js'

export const runCloseExpiredAuctionsCron = () => {
  closeExpiredAuctions()

  schedule('*/30 * * * *', () => {
    console.log('Running close auctions cron')
    closeExpiredAuctions()
  })
}

const closeExpiredAuctions = async () => {
  const closedAuctions = await Auction.findAll({
    where: {
      expiresAt: {
        [Op.lt]: new Date(),
      },
      acceptedBidId: null,
      markedAsClosedAt: null,
    },
  })

  if (!closedAuctions.length) {
    return
  }

  console.log(`Closing ${closedAuctions.length} auctions`)

  const settings = await SettingsRepository.get()
  const transaction = await DatabaseConnection.getInstance().transaction()
  try {
    for (const auction of closedAuctions) {
      const now = new Date()

      auction.markedAsClosedAt = now

      if (settings.automaticallyAcceptBidOnAuctionClose) {
        const highestBid = await BidRepository.getHighestBid(auction.id, transaction)

        if (highestBid) {
          auction.acceptedBidAt = now
          auction.acceptedBidId = highestBid.id

          highestBid.isAccepted = true

          FCMNotificationService.sendBidAccepted(highestBid)
          await CoinsRefunder.handleAcceptBidRefund(highestBid, transaction)

          const socketInstance = WebSocketInstance.getInstance()
          socketInstance.sendEventToAccount(highestBid.bidderId, WebsocketEvents.BID_ACCEPTED, {
            ...highestBid.toJSON(),
          })
        }
      }

      await auction.save({ transaction })
    }
    await transaction.commit()
  } catch (error) {
    console.error('Error closing auctions', error)
    await transaction.rollback()
  }
}
