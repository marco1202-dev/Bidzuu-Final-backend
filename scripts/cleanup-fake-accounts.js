import { DatabaseConnection } from '../src/database/index.js'
import { Account } from '../src/modules/accounts/model.js'
import { config } from '../src/config/index.js'

/**
 * Script to identify and clean up fake accounts created with generated emails
 * Run this script to find accounts with @biddo.app emails that are likely fake
 */

async function cleanupFakeAccounts() {
  try {
    // Initialize database connection
    const sequalizeConfig = {
      ...config.DATABASE,
      timezone: '+00:00',
    }

    DatabaseConnection.init(sequalizeConfig)
    DatabaseConnection.initializeModels()

    console.log('🔍 Searching for fake accounts...')

    // Find accounts with @biddo.app emails that contain underscores (indicating generated emails)
    const fakeAccounts = await Account.findAll({
      where: {
        email: {
          [require('sequelize').Op.like]: '%@biddo.app'
        }
      },
      attributes: ['id', 'email', 'name', 'authId', 'isAnonymous', 'createdAt', 'lastSeenAt']
    })

    console.log(`📊 Found ${fakeAccounts.length} potential fake accounts:`)

    if (fakeAccounts.length > 0) {
      fakeAccounts.forEach((account, index) => {
        console.log(`${index + 1}. ID: ${account.id}`)
        console.log(`   Email: ${account.email}`)
        console.log(`   Name: ${account.name || 'N/A'}`)
        console.log(`   Auth ID: ${account.authId || 'N/A'}`)
        console.log(`   Anonymous: ${account.isAnonymous}`)
        console.log(`   Created: ${account.createdAt}`)
        console.log(`   Last Seen: ${account.lastSeenAt || 'Never'}`)
        console.log('   ---')
      })

      // Find accounts that are definitely fake (no authId, anonymous, and generated email)
      const definitelyFake = fakeAccounts.filter(account =>
        !account.authId &&
        account.isAnonymous &&
        account.email.includes('_')
      )

      console.log(`\n🚨 ${definitelyFake.length} accounts are definitely fake (no authId, anonymous, generated email):`)

      if (definitelyFake.length > 0) {
        definitelyFake.forEach((account, index) => {
          console.log(`${index + 1}. ${account.email} (ID: ${account.id})`)
        })

        // Ask for confirmation before deletion
        console.log('\n⚠️  WARNING: These accounts will be permanently deleted!')
        console.log('To proceed with deletion, uncomment the deletion code in this script.')

        // Uncomment the following lines to actually delete the fake accounts
        /*
        console.log('\n🗑️  Deleting fake accounts...')
        for (const account of definitelyFake) {
          await account.destroy()
          console.log(`Deleted: ${account.email}`)
        }
        console.log('✅ Fake accounts cleanup completed!')
        */
      }

      // Find accounts that might be real but have generated emails
      const potentiallyReal = fakeAccounts.filter(account =>
        account.authId &&
        !account.isAnonymous
      )

      console.log(`\n⚠️  ${potentiallyReal.length} accounts might be real but have generated emails:`)

      if (potentiallyReal.length > 0) {
        potentiallyReal.forEach((account, index) => {
          console.log(`${index + 1}. ${account.email} (ID: ${account.id}, Auth ID: ${account.authId})`)
        })

        console.log('\n💡 These accounts have authId and are not marked as anonymous.')
        console.log('   They might be real users who signed up before the email validation was fixed.')
        console.log('   Consider manually reviewing these accounts before deletion.')
      }

    } else {
      console.log('✅ No fake accounts found!')
    }

    // Also check for accounts without emails (should not exist after our fix)
    const accountsWithoutEmail = await Account.findAll({
      where: {
        email: null
      },
      attributes: ['id', 'email', 'name', 'authId', 'isAnonymous', 'createdAt']
    })

    if (accountsWithoutEmail.length > 0) {
      console.log(`\n⚠️  Found ${accountsWithoutEmail.length} accounts without email addresses:`)
      accountsWithoutEmail.forEach((account, index) => {
        console.log(`${index + 1}. ID: ${account.id}, Name: ${account.name || 'N/A'}, Auth ID: ${account.authId || 'N/A'}`)
      })
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    // Close database connection
    await DatabaseConnection.getInstance().close()
    process.exit(0)
  }
}

// Run the cleanup
cleanupFakeAccounts()
