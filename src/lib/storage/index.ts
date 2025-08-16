import { config } from '../../config.js'
import { SettingsRepository } from '../../modules/settings/repository.js'
import { AWSStorage } from './aws.js'
import { DiskStorage } from './disk.js'
import { GoogleStorage } from './google.js'
import { ExpressFile } from './types.js'
import { Response } from 'express'

class AssetStorageHandler {
  async getHandler() {
    const storageType = await this.getStorageType()

    if (storageType === 'google') {
      try {
        const googleStorage = new GoogleStorage()
        // Test if Google Storage is working
        const bucket = await googleStorage.getBucket()
        if (bucket) {
          console.log('✅ Using Google Cloud Storage')
          return googleStorage
        } else {
          console.warn('⚠️ Google Cloud Storage failed, falling back to disk storage')
          return new DiskStorage()
        }
      } catch (error) {
        console.error('❌ Google Cloud Storage error, falling back to disk storage:', error.message)
        return new DiskStorage()
      }
    }

    if (storageType === 'aws') {
      return new AWSStorage()
    }

    return new DiskStorage()
  }

  async getStorageType() {
    try {
      const settings = await SettingsRepository.get()
      const gCloudBucket = settings?.googleCloudStorageBucket || config.GCLOUD_STORAGE.BUCKET

      console.log(`Storage type check - Google Cloud bucket: ${gCloudBucket}`)

      if (!!gCloudBucket?.length && gCloudBucket !== 'bidzuu_bucket') {
        // Test Google Cloud Storage connection before selecting it
        try {
          const googleStorage = new GoogleStorage()
          const bucket = await googleStorage.getBucket()
          if (bucket) {
            console.log('✅ Google Cloud Storage is available and working')
            return 'google'
          } else {
            console.log('⚠️ Google Cloud Storage bucket exists but connection failed, falling back to disk')
          }
        } catch (error) {
          console.log('⚠️ Google Cloud Storage test failed, falling back to disk:', error.message)
        }
      }

      const awsAccessKeyId = settings?.awsAccessKeyId || config.AWS_STORAGE.ACCESS_KEY_ID
      const awsSecretAccessKey = settings?.awsSecretAccessKey || config.AWS_STORAGE.SECRET_ACCESS_KEY
      const awsStorageBucket = settings?.awsStorageBucket || config.AWS_STORAGE.BUCKET
      const awsStorageRegion = settings?.awsStorageRegion || config.AWS_STORAGE.REGION

      if (
        awsAccessKeyId?.length &&
        awsSecretAccessKey?.length &&
        awsStorageBucket?.length &&
        awsStorageRegion?.length
      ) {
        console.log('✅ AWS S3 storage is available')
        return 'aws'
      }

      console.log('✅ Using disk storage as fallback')
      return 'disk'
    } catch (error) {
      console.error('Error determining storage type:', error)
      console.log('✅ Falling back to disk storage due to error')
      return 'disk'
    }
  }

  async upload(file: ExpressFile) {
    try {
      console.log(`🚀 AssetStorageHandler: Starting upload for file: ${file.originalname}, type: ${file.mimetype}, size: ${file.size}`)

      const handler = await this.getHandler()
      console.log(`✅ AssetStorageHandler: Using storage handler: ${handler.constructor.name}`)

      const result = await handler.upload(file)
      if (!result) {
        throw new Error(`Upload failed with ${handler.constructor.name} handler`)
      }

      console.log(`✅ AssetStorageHandler: Upload successful with ${handler.constructor.name}`)
      return result
    } catch (error) {
      console.error(`❌ AssetStorageHandler: Upload failed with primary handler: ${error.message}`)

      // Try fallback to disk storage if primary fails
      try {
        console.log('🔄 AssetStorageHandler: Attempting fallback to disk storage...')
        const diskHandler = new DiskStorage()
        const result = await diskHandler.upload(file)
        if (result) {
          console.log('✅ AssetStorageHandler: Successfully uploaded to disk storage as fallback')
          return result
        }
      } catch (diskError) {
        console.error('❌ AssetStorageHandler: Fallback to disk storage also failed:', diskError.message)
      }

      throw error
    }
  }

  async delete(path: string) {
    const handler = await this.getHandler()
    return handler.delete(path)
  }

  async serveFile(path: string, res: Response) {
    const handler = await this.getHandler()
    return handler.sendToClient(path, res)
  }

  async getFileUrl(path: string) {
    const handler = await this.getHandler()
    return handler.getFileUrl(path)
  }
}

const storageHandler = new AssetStorageHandler()
Object.freeze(storageHandler)

export { storageHandler as AssetStorageHandler }
