import { QueryInterface, DataTypes } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'

export async function up({ context }: { context: QueryInterface }) {
  try {
    await context.createTable(DATABASE_MODELS.MILESTONES, {
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
    })

    // Add indexes for better query performance
    await context.addIndex(DATABASE_MODELS.MILESTONES, ['auctionId'])
    await context.addIndex(DATABASE_MODELS.MILESTONES, ['buyerId'])
    await context.addIndex(DATABASE_MODELS.MILESTONES, ['sellerId'])
    await context.addIndex(DATABASE_MODELS.MILESTONES, ['status'])
    await context.addIndex(DATABASE_MODELS.MILESTONES, ['paymentTransactionId'])

    console.log('✅ Created milestones table successfully')
  } catch (error) {
    console.error('❌ Error creating milestones table:', error)
    throw error
  }
}

export async function down({ context }: { context: QueryInterface }) {
  try {
    await context.dropTable(DATABASE_MODELS.MILESTONES)
    console.log('✅ Dropped milestones table successfully')
  } catch (error) {
    console.error('❌ Error dropping milestones table:', error)
    throw error
  }
}
