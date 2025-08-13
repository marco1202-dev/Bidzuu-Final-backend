import { Model, DataTypes } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'
import { Auction } from '../auctions/model.js'
import { getModelConfig } from '../../utils/db.js'
import { Asset } from '../assets/model.js'

export class AuctionAsset extends Model {
  declare auctionId: string
  declare assetId: string

  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  declare readonly asset: Asset

  static initModel = initModel
  static initAssociations = initAssociations
}

function initModel(): void {
  const modelConfig = getModelConfig(DATABASE_MODELS.AUCTION_ASSETS)
  AuctionAsset.init(
    {
      auctionId: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      assetId: {
        type: DataTypes.UUID,
        primaryKey: true,
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
  AuctionAsset.belongsTo(Auction, {
    foreignKey: 'auctionId',
    onDelete: 'cascade',
  })
  AuctionAsset.belongsTo(Asset, {
    foreignKey: 'assetId',
    onDelete: 'cascade',
    as: 'asset',
  })
}
