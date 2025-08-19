import sequelize from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'

export async function up({ context: queryInterface }: { context: sequelize.QueryInterface }) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    await queryInterface.createTable(
      DATABASE_MODELS.VERIFICATION_REQUESTS,
      {
        id: {
          type: sequelize.DataTypes.UUID,
          defaultValue: sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        accountId: {
          type: sequelize.DataTypes.UUID,
          allowNull: false,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
        },
        firstName: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
        },
        lastName: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
        },
        address: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
        },
        city: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
        },
        state: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
        },
        zipCode: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
        },
        mobileNumber: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
        },
        dateOfBirth: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
        },
        country: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
        },
        idCardImageUrl: {
          type: sequelize.DataTypes.TEXT,
          allowNull: false,
        },
        extractedData: {
          type: sequelize.DataTypes.JSONB,
          allowNull: true,
        },
        status: {
          type: sequelize.DataTypes.ENUM('pending', 'approved', 'rejected'),
          allowNull: false,
          defaultValue: 'pending',
        },
        adminNotes: {
          type: sequelize.DataTypes.TEXT,
          allowNull: true,
        },
        reviewedBy: {
          type: sequelize.DataTypes.UUID,
          allowNull: true,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
        },
        reviewedAt: {
          type: sequelize.DataTypes.DATE,
          allowNull: true,
        },
        createdAt: {
          allowNull: false,
          type: sequelize.DataTypes.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: sequelize.DataTypes.DATE,
        },
      },
      { transaction }
    )

    await transaction.commit()
  } catch (error) {
    console.error(error)
    await transaction.rollback()
    throw error
  }
}

export async function down({ context: queryInterface }: { context: sequelize.QueryInterface }) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    await queryInterface.dropTable(DATABASE_MODELS.VERIFICATION_REQUESTS, { transaction })
    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
