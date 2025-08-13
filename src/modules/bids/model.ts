import { DataTypes, Model, literal } from 'sequelize'
import { Account } from '../accounts/model.js'
import { Auction } from '../auctions/model.js'
import { getModelConfig } from '../../utils/db.js'
import { DATABASE_MODELS } from '../../constants/model-names.js'
import { Currency } from '../currencies/model.js'

export class Bid extends Model {
  declare id: string
  declare auctionId: string
  declare bidderId: string

  declare locationPretty: string
  declare locationLat: number
  declare locationLong: number
  declare description: string

  declare isAccepted: boolean
  declare isRejected: boolean
  declare rejectionReason: string

  declare wasSeenNotificationSent: boolean

  declare price: number

  declare paidCoins: number
  declare coinsPaidBack: boolean

  declare initialCurrencyId: string
  declare usedExchangeRateId: string

  declare initialPriceInDollars: number

  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  declare readonly auction: Auction
  declare readonly bidder: Account
  declare readonly initialCurrency?: Currency

  static initModel = initModel
  static initAssociations = initAssociations
}

function initModel(): void {
  const modelConfig = getModelConfig(DATABASE_MODELS.BIDS)
  Bid.init(
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
      },
      bidderId: {
        type: DataTypes.UUID,
        references: {
          model: DATABASE_MODELS.ACCOUNTS,
          key: 'id',
        },
      },
      price: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      locationPretty: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      locationLat: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      locationLong: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      isRejected: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      rejectionReason: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      isAccepted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      wasSeenNotificationSent: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      paidCoins: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      coinsPaidBack: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      initialCurrencyId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: DATABASE_MODELS.CURRENCIES,
          key: 'id',
        },
      },
      initialPriceInDollars: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      usedExchangeRateId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: DATABASE_MODELS.EXCHANGE_RATES,
          key: 'id',
        },
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
  Bid.hasOne(Currency, {
    foreignKey: 'id',
    sourceKey: 'initialCurrencyId',
    as: 'initialCurrency',
    onDelete: 'cascade',
  })

  Bid.belongsTo(Account, {
    foreignKey: 'bidderId',
    onDelete: 'cascade',
    as: 'bidder',
  })

  Bid.belongsTo(Auction, {
    foreignKey: 'auctionId',
    onDelete: 'cascade',
  })
}
