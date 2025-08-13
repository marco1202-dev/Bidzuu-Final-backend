// This cron job will run every hour and remove the auction clusters that have expired.
import { schedule } from 'node-cron'
import { AuctionMapCluster } from '../modules/auction-map-clusters/model.js'
import { Op } from 'sequelize'

export const runAuctionMapClustersCron = async () => {
  try {
    await removeExpiredAuctionMapClusters()
  } catch (error) {
    console.error('Error removing expired auction map clusters', error)
  }

  schedule('0 * * * *', () => {
    console.log('Running demo auctions cron')
    removeExpiredAuctionMapClusters()
  })
}

const removeExpiredAuctionMapClusters = async () => {
  try {
    await AuctionMapCluster.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    })
  } catch (error) {
    console.error('Error removing expired auction map clusters', error)
  }
}
