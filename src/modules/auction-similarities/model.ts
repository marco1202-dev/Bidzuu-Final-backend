import { Model, DataTypes } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'
import { getModelConfig } from '../../utils/db.js'
import { Auction } from '../auctions/model.js'

export class AuctionSimilarity extends Model {
  declare auctionId1: string
  declare auctionId2: string
  declare similarity: number

  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  declare readonly firstAuction: Auction
  declare readonly secondAuction: Auction

  static initModel = initModel
  static initAssociations = initAssociations
}

function initModel(): void {
  const modelConfig = getModelConfig(DATABASE_MODELS.AUCTION_SIMILARITIES)

  AuctionSimilarity.init(
    {
      auctionId1: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      auctionId2: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      similarity: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    },
    modelConfig
  )
}

function initAssociations() {
  AuctionSimilarity.belongsTo(Auction, {
    foreignKey: 'auctionId1',
    as: 'firstAuction',
  })

  AuctionSimilarity.belongsTo(Auction, {
    foreignKey: 'auctionId2',
    as: 'secondAuction',
  })
  return
}
