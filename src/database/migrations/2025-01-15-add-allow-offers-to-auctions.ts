import { QueryInterface, DataTypes } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'

export async function up({ context }: { context: QueryInterface }) {
  try {
    // Check if allowOffers column already exists using raw SQL
    const [results] = await context.sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = '${DATABASE_MODELS.AUCTIONS}' 
       AND column_name = 'allowOffers'`
    )

    // Only add allowOffers column if it doesn't exist
    if (!results || (results as any[]).length === 0) {
      await context.addColumn(DATABASE_MODELS.AUCTIONS, 'allowOffers', {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      })
      console.log('Added allowOffers column to auctions table')
    } else {
      console.log('allowOffers column already exists')
    }
  } catch (error) {
    console.error('Error adding allowOffers column to auctions table:', error)
    throw error
  }
}

export async function down({ context }: { context: QueryInterface }) {
  try {
    // Remove allowOffers column from auctions table
    await context.removeColumn(DATABASE_MODELS.AUCTIONS, 'allowOffers')
    console.log('Successfully removed allowOffers column from auctions table')
  } catch (error) {
    console.error('Error removing allowOffers column from auctions table:', error)
    throw error
  }
}
