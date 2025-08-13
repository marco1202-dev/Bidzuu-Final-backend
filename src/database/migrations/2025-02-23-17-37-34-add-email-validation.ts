import sequelize, { DataTypes } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'

export async function up({ context: queryInterface }: { context: sequelize.QueryInterface }) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    await queryInterface.addColumn(
      DATABASE_MODELS.SETTINGS,
      'emailValidationEnabled',
      {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
      { transaction }
    )

    await queryInterface.addColumn(
      DATABASE_MODELS.SETTINGS,
      'allowUnvalidatedUsersToCreateAuctions',
      {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
      { transaction }
    )

    await queryInterface.addColumn(
      DATABASE_MODELS.SETTINGS,
      'allowUnvalidatedUsersToCreateBids',
      {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
      { transaction }
    )

    await queryInterface.addColumn(
      DATABASE_MODELS.SETTINGS,
      'allowAnonymousUsersToCreateAuctions',
      {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
      { transaction }
    )

    await queryInterface.addColumn(
      DATABASE_MODELS.SETTINGS,
      'allowAnonymousUsersToCreateBids',
      {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
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
    await queryInterface.removeColumn(DATABASE_MODELS.SETTINGS, 'emailValidationEnabled', {
      transaction,
    })

    await queryInterface.removeColumn(
      DATABASE_MODELS.SETTINGS,
      'allowUnvalidatedUsersToCreateAuctions',
      { transaction }
    )

    await queryInterface.removeColumn(
      DATABASE_MODELS.SETTINGS,
      'allowUnvalidatedUsersToCreateBids',
      { transaction }
    )

    await queryInterface.removeColumn(
      DATABASE_MODELS.SETTINGS,
      'allowAnonymousUsersToCreateAuctions',
      { transaction }
    )

    await queryInterface.removeColumn(DATABASE_MODELS.SETTINGS, 'allowAnonymousUsersToCreateBids', {
      transaction,
    })

    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
