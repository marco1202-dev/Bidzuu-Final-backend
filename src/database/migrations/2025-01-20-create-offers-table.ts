import { QueryInterface, DataTypes } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'

export async function up({ context }: { context: QueryInterface }) {
  try {
    await context.createTable(DATABASE_MODELS.OFFERS, {
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
      offererId: {
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
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
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
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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
    })

    // Add indexes for better performance
    await context.addIndex(DATABASE_MODELS.OFFERS, ['auctionId'])
    await context.addIndex(DATABASE_MODELS.OFFERS, ['offererId'])
    await context.addIndex(DATABASE_MODELS.OFFERS, ['status'])
    await context.addIndex(DATABASE_MODELS.OFFERS, ['createdAt'])

    console.log('Created offers table successfully')
  } catch (error) {
    console.error('Error creating offers table:', error)
    throw error
  }
}

export async function down({ context }: { context: QueryInterface }) {
  try {
    await context.dropTable(DATABASE_MODELS.OFFERS)
    console.log('Dropped offers table successfully')
  } catch (error) {
    console.error('Error dropping offers table:', error)
    throw error
  }
}
