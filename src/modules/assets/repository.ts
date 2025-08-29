import { GenericRepository } from '../../lib/base-repository.js'
import { Asset } from './model.js'
import { Transaction } from 'sequelize'
import { AssetStorageHandler } from '../../lib/storage/index.js'

class AssetsRepository extends GenericRepository<Asset> {
  constructor() {
    super(Asset)
  }

  public async storeAsset(asset: Express.Multer.File, transaction?: Transaction) {
    try {
      console.log(`🚀 AssetsRepository: Starting asset storage for file: ${asset.originalname}, type: ${asset.mimetype}, size: ${asset.size}`)

      const resultFile = await AssetStorageHandler.upload(asset)
      if (!resultFile) {
        throw new Error('File upload failed - no result returned from storage handler')
      }

      const { filename, size } = resultFile
      console.log(`✅ AssetsRepository: File uploaded successfully, filename: ${filename}, size: ${size}`)

      const assetData = new Asset({
        path: filename,
        size,
        initialName: asset.originalname || asset.filename,
        assetType: 'uploaded',
      })

      const savedAsset = await assetData.save({ transaction })
      console.log(`💾 AssetsRepository: Asset saved to database with ID: ${savedAsset.id}`)

      return savedAsset
    } catch (error) {
      console.error(`❌ AssetsRepository: Failed to store asset: ${error.message}`)
      throw error
    }
  }

  public async storeAssetFromUrl(imageUrl: string, transaction?: Transaction) {
    try {
      console.log(`🚀 AssetsRepository: Starting asset storage for URL: ${imageUrl}`)

      // Validate URL format
      if (!this.isValidImageUrl(imageUrl)) {
        throw new Error('Invalid image URL format')
      }

      const assetData = new Asset({
        path: '', // Empty path for URL assets
        size: 0, // Size not applicable for URL assets
        initialName: this.extractFilenameFromUrl(imageUrl),
        imageUrl: imageUrl,
        assetType: 'url',
      })

      const savedAsset = await assetData.save({ transaction })
      console.log(`💾 AssetsRepository: URL asset saved to database with ID: ${savedAsset.id}`)

      return savedAsset
    } catch (error) {
      console.error(`❌ AssetsRepository: Failed to store URL asset: ${error.message}`)
      throw error
    }
  }

  public async removeAsset(assetId: string, transaction: Transaction) {
    const asset = await this.getOneById(assetId, transaction)
    if (!asset) {
      return
    }

    // Only remove from storage if it's an uploaded asset
    if (asset.assetType === 'uploaded') {
      await this.removeAssetFromStorage(asset.path)
    }

    return await this.deleteById(assetId, transaction)
  }

  public async removeAssetFromStorage(path: string) {
    try {
      await AssetStorageHandler.delete(path)
    } catch (error) {
      console.error('Could not remove asset from disk', error)
    }
  }

  private extractFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const filename = pathname.split('/').pop() || 'image'
      return filename
    } catch {
      return 'image'
    }
  }

  private isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      const validProtocols = ['http:', 'https:']

      // Check protocol
      if (!validProtocols.includes(urlObj.protocol)) {
        console.log(`❌ Invalid protocol: ${urlObj.protocol}`)
        return false
      }

      // Check if it's a valid URL structure
      if (!urlObj.hostname || urlObj.hostname.length === 0) {
        console.log(`❌ Invalid hostname: ${urlObj.hostname}`)
        return false
      }

      // Allow URLs with query parameters (like Unsplash URLs)
      // Don't require specific file extensions since many image services use query-based URLs
      console.log(`✅ Valid image URL: ${url}`)
      return true
    } catch (error) {
      console.log(`❌ URL parsing error: ${error.message}`)
      return false
    }
  }
}

const assetRepositoryInstance = new AssetsRepository()
export default assetRepositoryInstance
