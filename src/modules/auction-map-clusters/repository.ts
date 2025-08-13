import { Transaction } from 'sequelize'
import { DatabaseConnection } from '../../database/index.js'
import { GenericRepository } from '../../lib/base-repository.js'
import { Asset } from '../assets/model.js'
import { Auction } from '../auctions/model.js'
import { AuctionMapCluster } from './model.js'

class AuctionMapClustersRepository extends GenericRepository<AuctionMapCluster> {
  constructor() {
    super(AuctionMapCluster)
  }

  public async storeForAuction(
    auctionId: string,
    transaction?: Transaction,
    commit = true
  ) {
    transaction =
      transaction || (await DatabaseConnection.getInstance().transaction())

    try {
      await AuctionMapCluster.destroy({
        where: { id: auctionId },
        transaction,
      })

      const auction = await Auction.findOne({
        where: { id: auctionId },
        include: [{ model: Asset, as: 'auctionAssets' }],
        transaction,
      })
      if (!auction) {
        return
      }

      const cluster = new AuctionMapCluster({
        id: auction.id,
        locationLat: auction.locationLat,
        locationLong: auction.locationLong,
        meta: {
          assetPath: auction.auctionAssets?.length
            ? auction.auctionAssets[0].path
            : '',
          mainCategoryId: auction.mainCategoryId,
        },
        expiresAt: auction.expiresAt,
      })

      await cluster.save({ transaction })
      if (commit) {
        try {
          await transaction.commit()
        } catch (error) {
          console.error(
            'Coult not commit transaction - store auction map cluster',
            error
          )
        }
      }
    } catch (error) {
      console.error('Error storing auction map cluster', auctionId, error)
      if (commit) {
        await transaction.rollback()
      }
    }
  }
}

const auctionMapClustersRepositoryInstance = new AuctionMapClustersRepository()
Object.freeze(auctionMapClustersRepositoryInstance)

export { auctionMapClustersRepositoryInstance as AuctionMapClustersRepository }
