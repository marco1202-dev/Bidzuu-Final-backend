import sequelize, { DataTypes } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'

export async function up({
  context: queryInterface,
}: {
  context: sequelize.QueryInterface
}) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    await queryInterface.addColumn(
      DATABASE_MODELS.SETTINGS,
      'freeAuctionsCount',
      {
        type: DataTypes.INTEGER,
        defaultValue: 2,
      },
      { transaction }
    )
    await queryInterface.addColumn(
      DATABASE_MODELS.SETTINGS,
      'freeBidsCount',
      {
        type: DataTypes.INTEGER,
        defaultValue: 2,
      },
      { transaction }
    )
    await queryInterface.addColumn(
      DATABASE_MODELS.SETTINGS,
      'auctionsCoinsCost',
      {
        type: DataTypes.INTEGER,
        defaultValue: 25,
      },
      { transaction }
    )
    await queryInterface.addColumn(
      DATABASE_MODELS.SETTINGS,
      'bidsCoinsCost',
      {
        type: DataTypes.INTEGER,
        defaultValue: 25,
      },
      { transaction }
    )
    await queryInterface.addColumn(
      DATABASE_MODELS.AUCTIONS,
      'paidCoins',
      {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      { transaction }
    )
    await queryInterface.addColumn(
      DATABASE_MODELS.AUCTIONS,
      'coinsPaidBack',
      {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      { transaction }
    )
    await queryInterface.addColumn(
      DATABASE_MODELS.BIDS,
      'paidCoins',
      {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      { transaction }
    )
    await queryInterface.addColumn(
      DATABASE_MODELS.BIDS,
      'coinsPaidBack',
      {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
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

export async function down({
  context: queryInterface,
}: {
  context: sequelize.QueryInterface
}) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    // Make sure you add your down seed/migration here and use the above created transaction if necessary

    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
