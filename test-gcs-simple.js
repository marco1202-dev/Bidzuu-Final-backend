#!/usr/bin/env node

/**
 * Simple test script to diagnose Google Cloud Storage connection issues
 * Run with: node test-gcs-simple.js
 */

// Load environment variables from .env file
import { readFileSync } from 'fs'
import { join } from 'path'

// Load .env file manually
function loadEnvFile() {
  try {
    const envPath = join(process.cwd(), '.env')
    const envContent = readFileSync(envPath, 'utf8')

    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim()
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '')
          process.env[key] = cleanValue
        }
      }
    })

    console.log('✅ Loaded .env file successfully')
  } catch (error) {
    console.log('⚠️ Could not load .env file:', error.message)
    console.log('   Make sure you have a .env file in your server directory')
  }
}

// Load environment variables first
loadEnvFile()

import { Storage } from '@google-cloud/storage'

async function testGoogleCloudStorage() {
  console.log('🔍 Testing Google Cloud Storage Connection...\n')

  // Check environment variables
  console.log('🌍 Environment Variables:')
  console.log(`  GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET'}`)
  console.log(`  GCLOUD_STORAGE_BUCKET: ${process.env.GCLOUD_STORAGE_BUCKET || 'NOT SET'}`)
  console.log(`  GCLOUD_STORAGE_PROJECT_ID: ${process.env.GCLOUD_STORAGE_PROJECT_ID || 'NOT SET'}`)
  console.log(`  GCLOUD_STORAGE_KEY_FILE: ${process.env.GCLOUD_STORAGE_KEY_FILE || 'NOT SET'}`)

  // Show all GCLOUD related environment variables
  console.log('\n🔍 All GCLOUD Environment Variables:')
  Object.keys(process.env)
    .filter(key => key.startsWith('GCLOUD') || key.startsWith('GOOGLE'))
    .forEach(key => {
      console.log(`  ${key}: ${process.env[key]}`)
    })
  console.log('')

  // Check service account file
  console.log('🔑 Service Account File Check:')
  console.log(`  Current working directory: ${process.cwd()}`)

  const possiblePaths = [
    'service-account.json',
    join(process.cwd(), 'service-account.json'),
  ]

  console.log('  Checking these paths:')
  possiblePaths.forEach(path => console.log(`    - ${path}`))
  console.log('')

  let serviceAccountFound = false
  let serviceAccountPath = null

  for (const path of possiblePaths) {
    try {
      const stats = readFileSync(path, 'utf8')
      const parsed = JSON.parse(stats)
      console.log(`  ✅ ${path}: Found and valid JSON`)
      console.log(`     Project ID: ${parsed.project_id}`)
      console.log(`     Client Email: ${parsed.client_email}`)
      console.log(`     Type: ${parsed.type}`)
      serviceAccountFound = true
      serviceAccountPath = path
      break
    } catch (error) {
      console.log(`  ❌ ${path}: ${error.message}`)
    }
  }

  if (!serviceAccountFound) {
    console.log('\n❌ No valid service account file found!')
    console.log('   Please ensure service-account.json exists in the server directory')
    return
  }

  console.log('')

  // Test connection
  console.log('🚀 Testing Connection:')
  try {
    let storageOptions = {}

    if (process.env.GCLOUD_STORAGE_PROJECT_ID && process.env.GCLOUD_STORAGE_KEY_FILE) {
      storageOptions = {
        projectId: process.env.GCLOUD_STORAGE_PROJECT_ID,
        keyFilename: process.env.GCLOUD_STORAGE_KEY_FILE,
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      storageOptions = {
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      }
    } else if (serviceAccountPath) {
      storageOptions = {
        keyFilename: serviceAccountPath,
      }
    } else {
      storageOptions = {
        keyFilename: 'service-account.json',
      }
    }

    console.log('  Using options:', storageOptions)

    const storage = new Storage(storageOptions)

    // Test authentication
    console.log('  Testing authentication...')
    const [buckets] = await storage.getBuckets()
    console.log(`  ✅ Authentication successful! Found ${buckets.length} buckets`)

    // List buckets
    if (buckets.length > 0) {
      console.log('  Available buckets:')
      buckets.forEach(bucket => console.log(`    - ${bucket.name}`))
    }

    // Test specific bucket if configured
    if (process.env.GCLOUD_STORAGE_BUCKET) {
      console.log(`  Testing access to bucket: ${process.env.GCLOUD_STORAGE_BUCKET}`)
      const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET)
      const [exists] = await bucket.exists()

      if (exists) {
        console.log(`  ✅ Bucket ${process.env.GCLOUD_STORAGE_BUCKET} exists and is accessible`)

        // Test upload permissions
        try {
          const testFile = bucket.file('test-connection.txt')
          await testFile.save('test content', {
            metadata: { contentType: 'text/plain' }
          })
          console.log('  ✅ Upload test successful')

          // Clean up test file
          await testFile.delete()
          console.log('  ✅ Test file cleaned up')
        } catch (error) {
          console.log(`  ❌ Upload test failed: ${error.message}`)
        }
      } else {
        console.log(`  ❌ Bucket ${process.env.GCLOUD_STORAGE_BUCKET} does not exist or is not accessible`)
      }
    }

  } catch (error) {
    console.log(`  ❌ Connection failed: ${error.message}`)

    if (error.message?.includes('invalid_grant') || error.message?.includes('account not found')) {
      console.log('\n🔑 AUTHENTICATION ERROR DIAGNOSIS:')
      console.log('  This error means your service account credentials are invalid or expired.')
      console.log('  Possible causes:')
      console.log('    1. Service account key file is corrupted or invalid')
      console.log('    2. Service account has been deleted or disabled')
      console.log('    3. Service account key has expired')
      console.log('    4. Service account lacks necessary permissions')
      console.log('    5. Project ID is incorrect')
      console.log('\n  Solutions:')
      console.log('    1. Generate a new service account key in Google Cloud Console')
      console.log('    2. Ensure service account has Storage Object Admin role')
      console.log('    3. Verify project ID matches your service account')
      console.log('    4. Check if service account is enabled')
    }
  }
}

testGoogleCloudStorage().catch(console.error)
