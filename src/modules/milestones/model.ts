import { DataTypes, Model } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'
import { getModelConfig } from '../../utils/db.js'
import { Account } from '../accounts/model.js'
import { Auction } from '../auctions/model.js'
import { Currency } from '../currencies/model.js'

export class Milestone extends Model {
  declare id: string
  declare auctionId: string
  declare buyerId: string
  declare sellerId: string
  declare amount: number
  declare currencyId: string
  declare status: 'pending' | 'confirmed' | 'released' | 'disputed' | 'cancelled'
  declare paymentTransactionId: string
  declare paymentMethod: 'stripe' | 'paypal' | 'razorpay'
  declare description: string
  declare dueDate: Date | null
  declare confirmedAt: Date | null
  declare releasedAt: Date | null
  declare disputeReason: string | null
  declare createdAt: Date
  declare updatedAt: Date

  // Associations
  declare readonly auction: Auction
  declare readonly buyer: Account
  declare readonly seller: Account
  declare readonly currency: Currency

  // Static methods
  static initModel: () => void
  static initAssociations: () => void
}

export const initMilestoneModel = () => {
  Milestone.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      auctionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: DATABASE_MODELS.AUCTIONS,
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      buyerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: DATABASE_MODELS.ACCOUNTS,
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sellerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: DATABASE_MODELS.ACCOUNTS,
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      amount: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      currencyId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: DATABASE_MODELS.CURRENCIES,
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'released', 'disputed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      paymentTransactionId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      paymentMethod: {
        type: DataTypes.ENUM('stripe', 'paypal', 'razorpay'),
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      confirmedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      releasedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      disputeReason: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    getModelConfig(DATABASE_MODELS.MILESTONES)
  )
}

export const initMilestoneAssociations = () => {
  Milestone.belongsTo(Auction, {
    foreignKey: 'auctionId',
    as: 'auction',
  })

  Milestone.belongsTo(Account, {
    foreignKey: 'buyerId',
    as: 'buyer',
  })

  Milestone.belongsTo(Account, {
    foreignKey: 'sellerId',
    as: 'seller',
  })

  Milestone.belongsTo(Currency, {
    foreignKey: 'currencyId',
    as: 'currency',
  })
}

// Add static methods to the class
Milestone.initModel = initMilestoneModel
Milestone.initAssociations = initMilestoneAssociations
