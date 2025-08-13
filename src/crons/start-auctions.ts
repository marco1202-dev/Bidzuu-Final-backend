// This cron will run every 10 minutes, checking if there any any
// auctions that have not started yet, but should have.
// If so, it will start the auction and send required notifications
import { schedule } from 'node-cron'
import { Auction } from '../modules/auctions/model.js'
import { DatabaseConnection } from '../database/index.js'
import { Op } from 'sequelize'
import { FCMNotificationService } from '../lib/notifications/index.js'

export const runStartAuctionsCron = () => {
  startAuctions()

  schedule('*/10 * * * *', () => {
    console.log('Running start auctions cron')
    startAuctions()
  })
}

const startAuctions = async () => {
  const auctionsToStart = await Auction.findAll({
    where: {
      startAt: {
        [Op.and]: {
          [Op.ne]: null,
          [Op.lt]: new Date(),
        },
      },
      startedAt: null,
    },
  })

  console.info(`Found ${auctionsToStart.length} auctions to start`)
  if (!auctionsToStart.length) {
    return
  }

  const transaction = await DatabaseConnection.getInstance().transaction()

  try {
    for (const auction of auctionsToStart) {
      await Auction.update({ startedAt: new Date() }, { where: { id: auction.id }, transaction })
      await Promise.all([
        FCMNotificationService.sendMyAuctionStarted(auction),
        FCMNotificationService.sendFavouriteAuctionStarted(auction),
      ])
    }

    await transaction.commit()
  } catch (error) {
    console.error(`Error running start auctions cron: ${error}`)
    await transaction.rollback()
  }
}
