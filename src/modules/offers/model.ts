import { DataTypes, Model } from 'sequelize'
import { literal } from 'sequelize'
import { getModelConfig } from '../../utils/db.js'
import { DATABASE_MODELS } from '../../constants/model-names.js'
import { Account } from '../accounts/model.js'
import { Auction } from '../auctions/model.js'
import { Currency } from '../currencies/model.js'

export class Offer extends Model {
  declare id: string
  declare auctionId: string
  declare offererId: string
  declare amount: number
  declare message: string | null
  declare status: 'pending' | 'accepted' | 'rejected' | 'countered'
  declare rejectionReason: string | null
  declare counterOfferAmount: number | null
  declare counterOfferMessage: string | null
  declare currencyId: string
  declare initialPriceInDollars: number
  declare usedExchangeRateId: string | null

  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  declare readonly auction: Auction
  declare readonly offerer: Account
  declare readonly currency: Currency

  static initModel = initModel
  static initAssociations = initAssociations
}

function initModel(): void {
  const modelConfig = getModelConfig(DATABASE_MODELS.OFFERS)

  Offer.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: literal('gen_random_uuid()'),
        primaryKey: true,
      },
      auctionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: DATABASE_MODELS.AUCTIONS,
          key: 'id',
        },
      },
      offererId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: DATABASE_MODELS.ACCOUNTS,
          key: 'id',
        },
      },
      amount: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      message: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'countered'),
        allowNull: false,
        defaultValue: 'pending',
      },
      rejectionReason: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      counterOfferAmount: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      counterOfferMessage: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      currencyId: {
        type: DataTypes.UUID,
        allowNull: false,
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

function initAssociations(): void {
  Offer.belongsTo(Auction, {
    foreignKey: 'auctionId',
    as: 'auction',
  })

  Offer.belongsTo(Account, {
    foreignKey: 'offererId',
    as: 'offerer',
  })

  Offer.belongsTo(Currency, {
    foreignKey: 'currencyId',
    as: 'currency',
  })

  Auction.hasMany(Offer, {
    foreignKey: 'auctionId',
    as: 'offers',
  })

  Account.hasMany(Offer, {
    foreignKey: 'offererId',
    as: 'offers',
  })
}
