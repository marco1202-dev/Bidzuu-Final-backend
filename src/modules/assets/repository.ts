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
      })

      const savedAsset = await assetData.save({ transaction })
      console.log(`💾 AssetsRepository: Asset saved to database with ID: ${savedAsset.id}`)

      return savedAsset
    } catch (error) {
      console.error(`❌ AssetsRepository: Failed to store asset: ${error.message}`)
      throw error
    }
  }

  public async removeAsset(assetId: string, transaction: Transaction) {
    const asset = await this.getOneById(assetId, transaction)
    if (!asset) {
      return
    }

    await this.removeAssetFromStorage(asset.path)
    return await this.deleteById(assetId, transaction)
  }

  public async removeAssetFromStorage(path: string) {
    try {
      await AssetStorageHandler.delete(path)
    } catch (error) {
      console.error('Could not remove asset from disk', error)
    }
  }
}

const assetRepositoryInstance = new AssetsRepository()
Object.freeze(assetRepositoryInstance)

export { assetRepositoryInstance as AssetsRepository }
