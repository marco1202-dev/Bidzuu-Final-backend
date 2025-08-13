import { DataTypes, Model, literal } from 'sequelize'
import { Account } from '../accounts/model.js'
import { getModelConfig } from '../../utils/db.js'
import { DATABASE_MODELS } from '../../constants/model-names.js'
import { Auction } from '../auctions/model.js'

export class Review extends Model {
  declare id: string
  declare fromAccountId: string
  declare toAccountId: string
  declare auctionId: string

  declare stars: number
  declare description: string

  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  declare readonly fromAccount: Account
  declare readonly toAccount: Account

  static initModel = initModel
  static initAssociations = initAssociations
}

function initModel(): void {
  const modelConfig = getModelConfig(DATABASE_MODELS.REVIEWS)
  Review.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: literal('gen_random_uuid()'),
        primaryKey: true,
      },
      fromAccountId: {
        type: DataTypes.UUID,
        references: {
          model: DATABASE_MODELS.ACCOUNTS,
          key: 'id',
        },
      },
      toAccountId: {
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
      stars: {
        type: DataTypes.INTEGER,
        validate: {
          min: 1,
          max: 5,
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
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
  Review.belongsTo(Account, { foreignKey: 'fromAccountId', as: 'reviewer' })
  Review.belongsTo(Account, { foreignKey: 'toAccountId', as: 'reviewed' })
  Review.belongsTo(Auction, { foreignKey: 'auctionId', as: 'auction' })
}
