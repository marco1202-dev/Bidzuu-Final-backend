import { DataTypes, Model, literal } from 'sequelize'
import { getModelConfig } from '../../utils/db.js'
import { DATABASE_MODELS } from '../../constants/model-names.js'
import { Account } from '../accounts/model.js'
import { Auction } from '../auctions/model.js'

export class LastSeenAuction extends Model {
  declare id: string
  declare accountId: string
  declare auctionId: string
  declare lastSeenAt: Date
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  static initModel = initModel
  static initAssociations = initAssociations
}

function initModel(): void {
  const modelConfig = getModelConfig(DATABASE_MODELS.LAST_SEEN_AUCTIONS)
  LastSeenAuction.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: literal('gen_random_uuid()'),
        primaryKey: true,
      },
      accountId: {
        type: DataTypes.UUID,
        references: {
          model: DATABASE_MODELS.ACCOUNTS,
          key: 'id',
        },
      },
      auctionId: {
        type: DataTypes.UUID,
        references: {
          model: DATABASE_MODELS.AUCTIONS,
          key: 'id',
        },
      },
      lastSeenAt: {
        type: DataTypes.DATE,
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
  LastSeenAuction.belongsTo(Account, {
    foreignKey: 'accountId',
    as: 'seenBy',
  })
  LastSeenAuction.belongsTo(Auction, {
    foreignKey: 'auctionId',
    as: 'seenAuction',
  })
}
