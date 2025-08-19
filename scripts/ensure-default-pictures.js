import { DatabaseConnection } from '../src/database/index.js'
import { AccountsRepository } from '../src/modules/accounts/repository.js'
import { config } from '../src/config/index.js'

/**
 * Script to ensure every user has a default image automatically
 * This script will find all accounts without pictures and assign them default avatars
 */

async function ensureDefaultPictures() {
  try {
    console.log('🚀 Starting default picture assignment for all users...')

    // Initialize database connection
    const sequalizeConfig = {
      ...config.DATABASE,
      timezone: '+00:00',
    }

    DatabaseConnection.init(sequalizeConfig)
    DatabaseConnection.initializeModels()

    console.log('📡 Connected to database successfully')

    // Run the bulk update to ensure all accounts have pictures
    await AccountsRepository.ensureAllAccountsHavePictures()

    console.log('✅ Default picture assignment completed successfully!')
    console.log('\n💡 All users now have default avatar images')
    console.log('   - New users will automatically get default images')
    console.log('   - Existing users without images have been updated')
    console.log('   - Images are generated using icotar.com service')

  } catch (error) {
    console.error('❌ Error during default picture assignment:', error)
    process.exit(1)
  } finally {
    // Close database connection
    await DatabaseConnection.getInstance().close()
    process.exit(0)
  }
}

// Run the script
ensureDefaultPictures()
