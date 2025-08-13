import { Model, DataTypes, literal } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'
import { getModelConfig } from '../../utils/db.js'
import { Asset } from '../assets/model.js'
import { Auction } from '../auctions/model.js'

export enum HistoryEventTypes {
  ADD_TO_FAVORITES = 'ADD_TO_FAVORITES',
  REMOVE_FROM_FAVORITES = 'REMOVE_FROM_FAVORITES',
  UPDATE_AUCTION = 'UPDATE_AUCTION',
  PLACE_BID = 'PLACE_BID',
  ACCEPT_BID = 'ACCEPT_BID',
  REJECT_BID = 'REJECT_BID',
  PROMOTE_AUCTION = 'PROMOTE_AUCTION',
  VIEW_AUCTION = 'VIEW_AUCTION',
  COINS_REFUNDED = 'COINS_REFUNDED',
}

export class AuctionHistoryEvent extends Model {
  declare id: string
  declare auctionId: string
  declare type: string
  declare details: Record<string, unknown>

  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  declare readonly asset: Asset

  static initModel = initModel
  static initAssociations = initAssociations
}

function initModel(): void {
  const modelConfig = getModelConfig(DATABASE_MODELS.AUCTION_HISTORY_EVENTS)
  AuctionHistoryEvent.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: literal('gen_random_uuid()'),
        primaryKey: true,
      },
      auctionId: {
        type: DataTypes.UUID,
        references: {
          model: DATABASE_MODELS.AUCTIONS,
          key: 'id',
        },
        primaryKey: true,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      details: {
        type: DataTypes.JSONB,
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
  AuctionHistoryEvent.belongsTo(Auction, {
    foreignKey: 'auctionId',
    onDelete: 'cascade',
  })
}
