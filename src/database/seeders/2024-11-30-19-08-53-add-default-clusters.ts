import sequelize from 'sequelize'
import { Auction } from '../../modules/auctions/model.js'
import { Asset } from '../../modules/assets/model.js'
import { AuctionMapCluster } from '../../modules/auction-map-clusters/model.js'

export async function up({
  context: queryInterface,
}: {
  context: sequelize.QueryInterface
}) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    const allAuctions = await Auction.findAll({
      include: [{ model: Asset, as: 'auctionAssets' }],
      where: {
        expiresAt: {
          [sequelize.Op.gte]: new Date(),
        },
        acceptedBidId: null,
      },
    })
    if (!allAuctions.length) {
      return
    }

    const auctionClusters = allAuctions.map((auction) => ({
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
    }))

    await AuctionMapCluster.bulkCreate(auctionClusters, { transaction })

    await transaction.commit()
  } catch (error) {
    console.error(error)
    await transaction.rollback()
    throw error
  }
}

export async function down({
  context: queryInterface,
}: {
  context: sequelize.QueryInterface
}) {
  const transaction = await queryInterface.sequelize.transaction()
  try {
    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
