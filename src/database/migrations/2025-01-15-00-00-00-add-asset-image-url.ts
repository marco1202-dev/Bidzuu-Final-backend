import sequelize, { DataTypes } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'

export async function up({ context: queryInterface }: { context: sequelize.QueryInterface }) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    await queryInterface.addColumn(
      DATABASE_MODELS.ASSETS,
      'imageUrl',
      {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'External image URL for assets that are not uploaded files'
      },
      { transaction }
    )

    await queryInterface.addColumn(
      DATABASE_MODELS.ASSETS,
      'assetType',
      {
        type: DataTypes.ENUM('uploaded', 'url'),
        defaultValue: 'uploaded',
        allowNull: false,
        comment: 'Type of asset: uploaded file or external URL'
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
    await queryInterface.removeColumn(DATABASE_MODELS.ASSETS, 'imageUrl', { transaction })
    await queryInterface.removeColumn(DATABASE_MODELS.ASSETS, 'assetType', { transaction })
    await transaction.commit()
  } catch (error) {
    console.error(error)
    await transaction.rollback()
    throw error
  }
}
