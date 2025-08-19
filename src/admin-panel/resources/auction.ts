import { Auction } from '../../modules/auctions/model.js'
import { customComponents } from '../component-loader.js'
import { AuctionsRepository } from '../../modules/auctions/repository.js'
import { DatabaseConnection } from '../../database/index.js'
import { loadAssetsForAuctions } from '../utils/loaders.js'

export const createAuctionResource = () => {
  return {
    resource: Auction,
    options: {
      navigation: {
        name: 'General',
        icon: 'Home',
      },
      properties: {
        mainCategoryId: {
          type: 'string',
          components: {
            list: customComponents.AuctionCategoryCard,
            show: customComponents.AuctionCategoryCard,
          },
        },
        subCategoryId: {
          type: 'string',
          components: {
            list: customComponents.AuctionCategoryCard,
            show: customComponents.AuctionCategoryCard,
          },
        },
        initialCurrencyId: {
          components: {
            show: customComponents.JsonbField,
            list: customComponents.JsonbFieldList,
            edit: customComponents.SimpleInput,
          },
        },
        assets: {
          components: {
            show: customComponents.AuctionAssets,
            edit: customComponents.AuctionAssets,
          },
        },
        auctionAssets: {
          isVirtual: true,
          components: {
            list: customComponents.AuctionAssetsCarousel,
          },
        },
        acceptedBidId: {
          type: 'string',
        },
      },
      editProperties: [
        'assets',
        'mainCategoryId',
        'subCategoryId',
        'title',
        'description',
        'isNewItem',
        'acceptedBidId',
        'startingPrice',
        'initialPriceInDollars',
        'initialCurrencyId',
        'lastPrice',
        'promotedAt',
        'youtubeLink',
        'allowOffers',
        'auctionFormat',
      ],
      filterProperties: [
        'id',
        'accountId',
        'locationPretty',
        'mainCategoryId',
        'subCategoryId',
        'title',
        'description',
        'isNewItem',
        'acceptedBidId',
        'startingPrice',
        'lastPrice',
        'hasCustomStartingPrice',
        'allowOffers',
        'auctionFormat',
        'expiresAt',
        'promotedAt',
        'createdAt',
        'updatedAt',
      ],
      listProperties: [
        'auctionAssets',
        'accountId',
        'locationPretty',
        'mainCategoryId',
        'title',
        'views',
        'lastPrice',
        'allowOffers',
        'auctionFormat',
        'createdAt',
        'promotedAt',
        'acceptedBidAt',
      ],
      showProperties: [
        'assets',
        'id',
        'accountId',
        'locationPretty',
        'locationLat',
        'locationLong',
        'mainCategoryId',
        'subCategoryId',
        'initialCurrencyId',
        'initialPriceInDollars',
        'title',
        'description',
        'youtubeLink',
        'views',
        'isNewItem',
        'acceptedBidId',
        'acceptedBidAt',
        'startingPrice',
        'lastPrice',
        'hasCustomStartingPrice',
        'allowOffers',
        'auctionFormat',
        'expiresAt',
        'promotedAt',
        'createdAt',
        'updatedAt',
      ],
      actions: {
        new: {
          isVisible: false,
          isAccessible: false,
        },
        delete: {
          isAccessible: ({ currentAdmin }) => currentAdmin.role === 'admin',
          handler: deleteAuction,
          guard: 'All the data related to this auction will be removed! ',
        },
        bulkDelete: {
          isAccessible: ({ currentAdmin }) => currentAdmin.role === 'admin',
          actionType: 'bulk',
          handler: deleteBulkAuctions,
        },
        show: {
          before: loadAssetsForAuctionRecord,
        },
        edit: {
          isAccessible: ({ currentAdmin }) => currentAdmin.role === 'admin',
          before: loadAssetsForAuctionRecord,
        },
        list: {
          after: loadAssetsForAllAuctions,
        },
      },
    },
  }
}

const loadAssetsForAllAuctions = async (response, request, context) => {
  const { records } = response
  if (records && records.length > 0) {
    const auctionIds = records.map((record) => record.id)
    const assets = await loadAssetsForAuctions(auctionIds)

    assets.forEach((asset) => {
      const matchingRecord = records.find((record) => record.id === asset.auctionId)

      if (!matchingRecord.params.assets) {
        matchingRecord.params.assets = []
      }
      if (matchingRecord) {
        matchingRecord.params.assets.push(asset.asset)
      }
    })
  }
  return response
}

const loadAssetsForAuctionRecord = async (request, context) => {
  const { record } = context
  delete record.vectors

  const itemId = record.id()
  if (record && record.id) {
    const assets = await loadAssetsForAuctions(itemId)
    context.record.params.assets = assets.map((el) => el.asset)
  }
  return request
}

const deleteBulkAuctions = async (request, response, context) => {
  const { records } = context
  const auctionIds = records.map((record) => record.id()) as string[]
  const recordsInJSON = records.map((record) => record.toJSON(context.currentAdmin))

  if (request.method !== 'post') {
    return {
      records: recordsInJSON,
    }
  }

  const transaction = await DatabaseConnection.getInstance().transaction()

  try {
    for (const auctionId of auctionIds) {
      await AuctionsRepository.deleteAuction(auctionId, transaction, false)
    }
    await transaction.commit()

    return {
      records: recordsInJSON,
      notice: {
        message: 'Auctions were deleted successfully',
        type: 'success',
      },
      redirectUrl: '/admin/resources/auctions',
    }
  } catch (error) {
    try {
      await transaction.rollback()
    } catch (err) {
      console.error('Could not rollback transaction', err)
    }

    return {
      records: recordsInJSON,
      notice: {
        message: `There was an error deleting the records: ${error.message}`,
        type: 'error',
      },
    }
  }
}

const deleteAuction = async (request, response, context) => {
  const { record } = context
  const auctionId = record.params.id

  try {
    await AuctionsRepository.deleteAuction(auctionId)

    return {
      record: record.toJSON(context.currentAdmin),
      notice: {
        message: 'Auction was deleted successfully',
        type: 'success',
      },
      redirectUrl: '/admin/resources/auctions',
    }
  } catch (error) {
    return {
      record: record.toJSON(context.currentAdmin),
      notice: {
        message: `There was an error deleting the record: ${error.message}`,
        type: 'error',
      },
    }
  }
}
