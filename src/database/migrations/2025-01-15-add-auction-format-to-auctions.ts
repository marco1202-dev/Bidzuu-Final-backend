import { QueryInterface, DataTypes } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'

export async function up({ context }: { context: QueryInterface }) {
  try {
    // Check if auctionFormat column already exists using raw SQL
    const [results] = await context.sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = '${DATABASE_MODELS.AUCTIONS}' 
       AND column_name = 'auctionFormat'`
    )

    // Only add auctionFormat column if it doesn't exist
    if (!results || (results as any[]).length === 0) {
      await context.addColumn(DATABASE_MODELS.AUCTIONS, 'auctionFormat', {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'auction',
      })
      console.log('Added auctionFormat column to auctions table')
    } else {
      console.log('auctionFormat column already exists')
    }
  } catch (error) {
    console.error('Error adding auctionFormat column to auctions table:', error)
    throw error
  }
}

export async function down({ context }: { context: QueryInterface }) {
  try {
    // Remove auctionFormat column from auctions table
    await context.removeColumn(DATABASE_MODELS.AUCTIONS, 'auctionFormat')
    console.log('Successfully removed auctionFormat column from auctions table')
  } catch (error) {
    console.error('Error removing auctionFormat column from auctions table:', error)
    throw error
  }
}
