import { QueryInterface, DataTypes } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface
}) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    // Check if hasReversePrice column already exists
    const tableDescription = await queryInterface.describeTable(DATABASE_MODELS.AUCTIONS)

    // Only add hasReversePrice column if it doesn't exist
    if (!tableDescription.hasReversePrice) {
      await queryInterface.addColumn(
        DATABASE_MODELS.AUCTIONS,
        'hasReversePrice',
        {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true, // Default to true since reverse price is now required
        },
        { transaction }
      )
      console.log('Added hasReversePrice column to auctions table')
    } else {
      console.log('hasReversePrice column already exists')
    }

    await transaction.commit()
    console.log('Successfully completed reverse price migration')
  } catch (error) {
    await transaction.rollback()
    console.error('Error in reverse price migration:', error)
    throw error
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface
}) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    // Remove hasReversePrice column from auctions table
    await queryInterface.removeColumn(DATABASE_MODELS.AUCTIONS, 'hasReversePrice', { transaction })

    await transaction.commit()
    console.log('Successfully removed hasReversePrice column from auctions table')
  } catch (error) {
    await transaction.rollback()
    console.error('Error removing hasReversePrice column from auctions table:', error)
    throw error
  }
}
