import { DataTypes, Model } from 'sequelize'
import { Account } from '../accounts/model.js'
import { Review } from '../reviews/model.js'
import { Location } from '../auxiliary-models/location.js'
import { DATABASE_MODELS } from '../../constants/model-names.js'
import sequelize from 'sequelize'
import { getModelConfig } from '../../utils/db.js'
import { Asset } from '../assets/model.js'
import { Bid } from '../bids/model.js'
import { AuctionHistoryEvent } from '../auxiliary-models/auction-history-events.js'
import { Comment } from '../comments/entity.js'
import { Currency } from '../currencies/model.js'

export class Auction extends Model {
  declare id: string
  declare accountId: string

  declare locationId: string
  declare locationPretty: string
  declare locationLat: number
  declare locationLong: number

  declare mainCategoryId: string
  declare subCategoryId: string

  declare title: string
  declare description: string
  declare views: number
  declare isNewItem: boolean
  declare youtubeLink: string | null

  declare acceptedBidId: string | null
  declare acceptedBidAt: Date

  declare startingPrice: number
  declare hasCustomStartingPrice: boolean
  declare lastPrice: number

  declare vectors: Record<string, number[]>

  declare paidCoins: number
  declare coinsPaidBack: boolean

  declare startAt: Date
  declare startedAt: Date

  declare expiresAt: Date
  declare promotedAt: Date | null
  declare markedAsClosedAt: Date | null

  declare initialCurrencyId: string
  declare lastPriceCurrencyId: string
  declare initialPriceInDollars: number

  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  declare readonly account: Account
  declare readonly auctionAssets: Asset[]
  declare readonly bids: Bid[]
  declare readonly review: Review[]
  declare readonly auctionHistoryEvents: AuctionHistoryEvent[]
  declare readonly comments: Comment[]
  declare readonly initialCurrency: Currency

  static initModel = initModel
  static initAssociations = initAssociations
}

function initModel(): void {
  const modelConfig = getModelConfig(DATABASE_MODELS.AUCTIONS)

  Auction.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      accountId: {
        type: DataTypes.UUID,
        references: {
          model: DATABASE_MODELS.ACCOUNTS,
          key: 'id',
        },
      },
      locationId: {
        type: DataTypes.UUID,
        references: {
          model: DATABASE_MODELS.LOCATIONS,
          key: 'id',
        },
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
      mainCategoryId: {
        type: DataTypes.UUID,
        references: {
          model: DATABASE_MODELS.CATEGORIES,
          key: 'id',
        },
      },
      subCategoryId: {
        type: DataTypes.UUID,
        references: {
          model: DATABASE_MODELS.CATEGORIES,
          key: 'id',
        },
      },
      title: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING(1000),
      },
      youtubeLink: {
        type: sequelize.DataTypes.STRING(500),
        allowNull: true,
      },
      isNewItem: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      views: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      acceptedBidId: {
        type: DataTypes.UUID,
        references: {
          model: DATABASE_MODELS.BIDS,
          key: 'id',
        },
        allowNull: true,
      },
      acceptedBidAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      startingPrice: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      hasCustomStartingPrice: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      lastPrice: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      initialPriceInDollars: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      promotedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      vectors: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      startAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      markedAsClosedAt: {
        allowNull: true,
        type: DataTypes.DATE,
        defaultValue: null,
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
      lastPriceCurrencyId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: DATABASE_MODELS.CURRENCIES,
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
  Auction.hasOne(Currency, {
    foreignKey: 'id',
    sourceKey: 'initialCurrencyId',
    as: 'initialCurrency',
    onDelete: 'cascade',
  })

  Auction.hasOne(Location, {
    foreignKey: 'id',
    sourceKey: 'locationId',
    as: 'location',
    onDelete: 'cascade',
  })

  Auction.belongsTo(Account, {
    foreignKey: 'accountId',
    onDelete: 'cascade',
  })

  Auction.belongsToMany(Account, {
    through: { model: DATABASE_MODELS.ACCOUNT_FAVOURITES },
    foreignKey: 'auctionId',
    otherKey: 'accountId',
    as: 'auctionLikes',
  })

  Auction.belongsToMany(Asset, {
    through: { model: DATABASE_MODELS.AUCTION_ASSETS },
    foreignKey: 'auctionId',
    otherKey: 'assetId',
    as: 'auctionAssets',
  })

  Auction.hasMany(Bid, {
    foreignKey: 'auctionId',
    onDelete: 'cascade',
    as: 'bids',
  })

  Auction.hasMany(Review, {
    foreignKey: 'auctionId',
    onDelete: 'cascade',
    as: 'reviews',
  })

  Auction.hasMany(AuctionHistoryEvent, {
    foreignKey: 'auctionId',
    onDelete: 'cascade',
    as: 'auctionHistoryEvents',
  })

  Auction.hasMany(Comment, {
    foreignKey: 'auctionId',
    onDelete: 'cascade',
    as: 'comments',
  })
}
