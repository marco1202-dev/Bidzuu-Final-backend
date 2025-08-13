import { Storage } from '@google-cloud/storage'
import { config } from '../../config.js'
import { v4 as uuidv4 } from 'uuid'
import jimp from 'jimp'
import { compressFile } from './utils.js'
import { ExpressFile, StorageHandler } from './types.js'
import { Response } from 'express'
import { SettingsRepository } from '../../modules/settings/repository.js'
import { join } from 'path'

export class GoogleStorage implements StorageHandler {
  constructor() { }

  async getBucket() {
    try {
      const bucketName = await this.getBucketName()
      if (!bucketName) {
        console.error('Google Cloud Storage bucket is not provided')
        return null
      }

      console.log(`Attempting to connect to Google Cloud Storage bucket: ${bucketName}`)

      // Try multiple paths for service account file
      const possiblePaths = [
        'service-account.json',
        join(process.cwd(), 'service-account.json'),
        join(process.cwd(), 'server', 'service-account.json'),
        config.GCLOUD_STORAGE.KEY_FILE || ''
      ].filter(path => path && path.length > 0)

      let googleCloudStorage
      for (const keyPath of possiblePaths) {
        try {
          console.log(`Trying service account path: ${keyPath}`)
          googleCloudStorage = new Storage({
            keyFilename: keyPath,
            projectId: config.GCLOUD_STORAGE.PROJECT_ID
          })
          // Test the connection
          await googleCloudStorage.getBuckets()
          console.log(`Successfully connected using service account: ${keyPath}`)
          break
        } catch (error) {
          console.log(`Failed to connect using service account: ${keyPath}`, error.message)
          continue
        }
      }

      if (!googleCloudStorage) {
        console.error('Could not initialize Google Cloud Storage with any service account file')
        return null
      }

      const bucket = googleCloudStorage.bucket(bucketName)

      // Test if bucket exists and is accessible
      try {
        const [exists] = await bucket.exists()
        if (!exists) {
          console.error(`Bucket ${bucketName} does not exist or is not accessible`)
          return null
        }
        console.log(`Successfully connected to bucket: ${bucketName}`)
        return bucket
      } catch (error) {
        console.error(`Error accessing bucket ${bucketName}:`, error.message)
        return null
      }
    } catch (error) {
      console.error('Error in getBucket:', error)
      return null
    }
  }

  async upload(file: ExpressFile) {
    try {
      console.log('Starting Google Cloud Storage upload for file:', file.originalname)

      file.filename = uuidv4()
      file.mimetype = file.mimetype ?? jimp.MIME_JPEG

      let buffer = file.buffer
      try {
        buffer = await compressFile(file.buffer, file.mimetype)
        console.log(`File compressed, original size: ${file.buffer.length}, compressed size: ${buffer.length}`)
      } catch (error) {
        console.error(`Could not compress file: ${error}`)
        // Continue with original buffer
      }

      const bucket = await this.getBucket()
      if (!bucket) {
        throw new Error('Google Cloud Storage bucket is not available')
      }

      console.log(`Uploading file ${file.filename} to bucket`)

      await bucket.file(`${file.filename}`).save(buffer, {
        metadata: {
          gzip: true,
          contentType: file.mimetype,
          cacheControl: 'public, max-age=172800', // cache for 2 days
        },
        resumable: false,
      })

      console.log(`Successfully uploaded file ${file.filename} to Google Cloud Storage`)
      return file
    } catch (error) {
      console.error(`Could not upload file to Google Cloud Storage: ${error}`)
      throw error // Re-throw to let caller handle it
    }
  }

  async delete(path: string) {
    try {
      console.log(`Attempting to delete file from Google Cloud Storage: ${path}`)
      const bucket = await this.getBucket()
      if (!bucket) {
        throw new Error('Google Cloud Storage bucket is not available')
      }
      await bucket.file(`${path}`).delete()
      console.log(`Successfully deleted file: ${path}`)
    } catch (error) {
      console.error(`Could not delete file from Google Cloud Storage: ${error}`)
      throw error
    }
  }

  async sendToClient(path: string, res: Response) {
    try {
      const bucketName = await this.getBucketName()
      if (!bucketName) {
        console.error('Google Cloud Storage bucket is not provided')
        return res.status(500).send('Google Cloud Storage bucket is not provided')
      }

      const url = `https://storage.googleapis.com/${bucketName}/${path}`
      console.log(`Redirecting to Google Cloud Storage URL: ${url}`)
      res.redirect(url)
    } catch (error) {
      console.error('Error in sendToClient:', error)
      res.status(500).send('Error serving file from Google Cloud Storage')
    }
  }

  async getFileUrl(path: string) {
    try {
      const bucketName = await this.getBucketName()
      if (!bucketName) {
        throw new Error('Google Cloud Storage bucket is not provided')
      }
      return `https://storage.googleapis.com/${bucketName}/${path}`
    } catch (error) {
      console.error('Error in getFileUrl:', error)
      throw error
    }
  }

  private async getBucketName() {
    try {
      const settings = await SettingsRepository.get()
      const bucketName = settings?.googleCloudStorageBucket || config.GCLOUD_STORAGE.BUCKET
      console.log(`Resolved bucket name: ${bucketName}`)
      return bucketName
    } catch (error) {
      console.error('Error getting bucket name:', error)
      return null
    }
  }
}
