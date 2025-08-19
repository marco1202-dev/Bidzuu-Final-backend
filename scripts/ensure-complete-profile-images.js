import { DatabaseConnection } from '../src/database/index.js'
import { AccountsRepository } from '../src/modules/accounts/repository.js'
import { config } from '../src/config/index.js'

/**
 * Script to ensure every user has a complete profile image setup
 * This script will find all accounts without complete profile images and assign them
 * multiple image variations with fallbacks for different use cases
 */

async function ensureCompleteProfileImages() {
  try {
    console.log('🚀 Starting complete profile image assignment for all users...')

    // Initialize database connection
    const sequalizeConfig = {
      ...config.DATABASE,
      timezone: '+00:00',
    }

    DatabaseConnection.init(sequalizeConfig)
    DatabaseConnection.initializeModels()

    console.log('📡 Connected to database successfully')

    // Run the bulk update to ensure all accounts have complete profile images
    await AccountsRepository.ensureAllAccountsHavePictures()

    console.log('✅ Complete profile image assignment completed successfully!')
    console.log('\n💡 All users now have complete profile image setups:')
    console.log('   📸 Primary profile picture (icotar.com)')
    console.log('   🖼️  Thumbnail version (100px)')
    console.log('   🖼️  Large version (400px)')
    console.log('   🔄 Fallback images (UI Avatars)')
    console.log('   🌟 Gravatar fallback (if email available)')
    console.log('   📱 Multiple image sizes for different UI contexts')
    console.log('   🛡️  Reliable fallback system for consistent user experience')

  } catch (error) {
    console.error('❌ Error during complete profile image assignment:', error)
    process.exit(1)
  } finally {
    // Close database connection
    await DatabaseConnection.getInstance().close()
    process.exit(0)
  }
}

// Run the script
ensureCompleteProfileImages()
