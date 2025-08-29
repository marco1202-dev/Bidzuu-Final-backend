import { schedule } from 'node-cron'
import { Account } from '../../modules/accounts/model.js'
import { AuctionsRepository } from '../../modules/auctions/repository.js'
import { CategoriesRepository } from '../../modules/categories/repository.js'
import { DEFAULT_AUCTIONS_DATA, DefaultAuctionData, IMAGES_STORAGE_PREFIX } from './constants.js'
import { Asset } from '../../modules/assets/model.js'
import AssetsRepository from '../../modules/assets/repository.js'
import { Transaction } from 'sequelize'
import { DatabaseConnection } from '../../database/index.js'
import { Location } from '../../modules/auxiliary-models/location.js'
import { Category } from '../../modules/categories/model.js'
import { Auction } from '../../modules/auctions/model.js'
import { SettingsRepository } from '../../modules/settings/repository.js'
import { AuctionAsset } from '../../modules/auxiliary-models/auction-assets.js'
import { config } from '../../config.js'
import { AuctionSimilarityRepository } from '../../modules/auction-similarities/repository.js'
import { AuctionMapClustersRepository } from '../../modules/auction-map-clusters/repository.js'
import { CurrenciesRepository } from '../../modules/currencies/repository.js'

// This CRON will run only if the "RUN_IN_DEMO_MODE" environment variable is set to "true".
// This is going to create a few auctions every hour, if the number of active auctions
// is smaller than 50. Do not do this if you are running the app in production

// If you want to automatically create auctions in the demo mode,
// you also need to add "DEMO_MAIN_ACCOUNT_EMAIL" environment variable.
// This will point to the user that will be used to create the auctions.
export const runDemoAuctionsCron = () => {
  if (process.env.RUN_IN_DEMO_MODE !== 'true') {
    return
  }

  // Adding default auctions on start
  addDefaultAuctions()

  schedule('0 * * * *', () => {
    console.log('Running demo auctions cron')
    addDefaultAuctions()
  })
}

const addDefaultAuctions = async () => {
  try {
    const accountForAuctionsEmail = process.env.DEMO_MAIN_ACCOUNT_EMAIL
    const accountForAuctions = await Account.findOne({
      where: {
        email: accountForAuctionsEmail,
      },
    })

    if (!accountForAuctions) {
      console.log('Could not find the account for default auctions')
      return
    }

    const activeAuctionsCount = await getActiveAuctionsCount()
    if (activeAuctionsCount >= 50) {
      return
    }

    const allCategories = await CategoriesRepository.findAll({})
    if (!allCategories) {
      console.error('Could not find any categories')
      return
    }

    console.info('Adding default auctions to the database')
    // Sorting the auctions list randomly, so the auctions are not created in the same order
    const randomlySortedAuctionsData = DEFAULT_AUCTIONS_DATA.sort(() => Math.random() - 0.5)

    const transaction = await DatabaseConnection.getInstance().transaction()
    let count = 1
    try {
      for (const auctionToCreate of randomlySortedAuctionsData) {
        await createAuction(auctionToCreate, allCategories, accountForAuctions, transaction)
        count += 1
      }

      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  } catch (error) {
    console.error('Could not add default auctions', error)
  }
}

const createAuction = async (
  auctionToCreate: DefaultAuctionData,
  allCategories: Category[],
  accountForAuctions: Account,
  transaction: Transaction
) => {
  const assetId = await getAuctionIdFromAssetName(auctionToCreate.assetName, transaction)
  if (!assetId) {
    const error = `Could not find asset for auction ${auctionToCreate.assetName}`
    throw new Error(error)
  }

  const mainCategoryId = allCategories.find(
    (category) =>
      category.name.en.toLowerCase() === auctionToCreate.mainCategory.toLowerCase() &&
      !category.parentCategoryId
  )?.id
  if (!mainCategoryId) {
    throw new Error(`Could not find category for auction ${auctionToCreate.mainCategory}`)
  }
  const subCategoryId = allCategories.find(
    (category) =>
      category.name.en.toLowerCase() === auctionToCreate.subCategory.toLowerCase() &&
      !!category.parentCategoryId
  )?.id

  if (!subCategoryId) {
    const error = `Could not find sub category for auction ${auctionToCreate.subCategory}`
    throw new Error(error)
  }

  let location = await Location.findOne({
    where: {
      name: auctionToCreate.location,
    },
    transaction,
  })

  if (!location) {
    location = await Location.create({ name: auctionToCreate.location }, { transaction })
  }

  const currencies = await CurrenciesRepository.getAll()
  const usdCurrency = currencies.find((currency) => currency.code === 'USD')
  if (!usdCurrency) {
    throw new Error('USD currency not found')
  }

  // 1 in 10 chanches this is true
  const needToPromote = Math.random() < 0.1
  const needToStartInTheFuture = !needToPromote && Math.random() < 0.1
  const now = new Date()
  const twoDaysAfter = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
  const fiveDaysAfter = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)

  const useThreeDaysAfter = Math.random() < 0.5
  const threeDaysAfter = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const sixDaysAfter = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000)

  const auctionData = {
    assetId,
    mainCategoryId,
    subCategoryId,
    locationId: location.id,
    initialCurrencyId: usdCurrency.id,
    locationPretty: auctionToCreate.location,
    locationLat: auctionToCreate.latLng.latitude,
    locationLong: auctionToCreate.latLng.longitude,
    initialPriceInDollars: auctionToCreate.price,
    title: auctionToCreate.title,
    isNewItem: true,
    description: '',
    hasCustomStartingPrice:
      auctionToCreate.price !== 5 && auctionToCreate.price !== 10 && auctionToCreate.price !== 15,
    startingPrice: auctionToCreate.price,
    lastPrice: auctionToCreate.price,
    accountId: accountForAuctions.id,
    startedAt: needToStartInTheFuture ? null : new Date(),
    vectors: {},
    ...(needToStartInTheFuture
      ? {
        startAt: useThreeDaysAfter ? threeDaysAfter : twoDaysAfter,
        expiresAt: useThreeDaysAfter ? sixDaysAfter : fiveDaysAfter,
      }
      : {}),
  }

  const auctionVector = await AuctionsRepository.generateVectorForAuction(auctionData, transaction)
  auctionData.vectors = auctionVector

  // Create the actual auction
  const [createdAuction, settings] = await Promise.all([
    Auction.create(auctionData, {
      transaction,
      returning: true,
    }),
    SettingsRepository.get(),
  ])

  await AuctionAsset.create({ assetId, auctionId: createdAuction.id }, { transaction })

  // Set the expiration date
  const auctionActiveTimeInHours =
    settings.auctionActiveTimeInHours || config.AUCTION_ACTIVE_TIME_IN_HOURS

  const expireDate = new Date()
  expireDate.setTime(expireDate.getTime() + auctionActiveTimeInHours * 60 * 60 * 1000)

  createdAuction.expiresAt = expireDate

  if (needToPromote) {
    createdAuction.promotedAt = new Date()
  }

  await createdAuction.save({ transaction })

  await AuctionMapClustersRepository.storeForAuction(createdAuction.id, transaction, false)

  await AuctionSimilarityRepository.updateSimilaritiesForAuction(createdAuction, transaction, false)
}

const getAuctionIdFromAssetName = async (name: string, transaction: Transaction) => {
  const existingAsset = await Asset.findOne({
    where: { initialName: name },
    transaction,
  })
  if (existingAsset) {
    return existingAsset.id
  }

  const downloadedAsset = await downloadAssetFromPath(`${IMAGES_STORAGE_PREFIX}/${name}`)

  const mimetypeFromName = name.split('.').pop()
  const multerFile = bufferToMulterFile(downloadedAsset, name, mimetypeFromName)
  const createdAsset = await AssetsRepository.storeAsset(
    multerFile as Express.Multer.File,
    transaction
  )

  return createdAsset.id
}

const getActiveAuctionsCount = async () => {
  const count = await AuctionsRepository.applyFilterQueryOverAuctions({
    categories: [],
    subCategories: [],
    locationIds: [],
    activeOnly: true,
    query: undefined,
    getCount: true,
  })

  return typeof count === 'number' ? count : count.count
}

const downloadAssetFromPath = async (path: string) => {
  try {
    const response = await fetch(path)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}: ${response.statusText}`)
    }

    // Read the file data into a buffer
    const buffer = await response.arrayBuffer()
    return Buffer.from(buffer) // Convert to Buffer
  } catch (error) {
    console.error(`Error downloading file: ${error.message}`)
    throw error
  }
}

function bufferToMulterFile(buffer, originalname, mimetype) {
  return {
    fieldname: 'file',
    originalname: originalname,
    encoding: '7bit',
    mimetype: mimetype,
    size: buffer.length,
    buffer: buffer,
    destination: '',
    filename: '',
    path: '',
  }
}
