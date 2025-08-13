import { DatabaseConnection } from '../../database/index.js'
import { Bid } from '../../modules/bids/model.js'
import { BidRepository } from '../../modules/bids/repository.js'
import { customComponents } from '../component-loader.js'
import { loadAssetsForAuctions } from '../utils/loaders.js'

export const createBidResource = () => {
  return {
    resource: Bid,
    options: {
      navigation: {
        name: 'General',
        icon: 'Home',
      },
      properties: {
        auctionAssets: {
          isVirtual: true,
          components: {
            list: customComponents.AuctionAssetsCarousel,
          },
        },
        initialCurrencyId: {
          components: {
            show: customComponents.JsonbField,
            list: customComponents.JsonbFieldList,
            edit: customComponents.SimpleInput,
          },
        },
      },
      listProperties: [
        'auctionAssets',
        'auctionId',
        'bidderId',
        'locationPretty',
        'isAccepted',
        'isRejected',
        'wasSeenNotificationSent',
        'price',
        'createdAt',
      ],
      editProperties: [
        'locationPretty',
        'locationLat',
        'locationLong',
        'isAccepted',
        'isRejected',
        'initialPriceInDollars',
        'initialCurrencyId',
        'usedExchangeRateId',
        'wasSeenNotificationSent',
        'price',
      ],
      filterProperties: [
        'id',
        'auctionId',
        'bidderId',
        'locationPretty',
        'isAccepted',
        'isRejected',
        'wasSeenNotificationSent',
        'initialCurrencyId',
        'usedExchangeRateId',
        'price',
        'createdAt',
        'updatedAt',
      ],
      showProperties: [
        'id',
        'auctionId',
        'bidderId',
        'locationPretty',
        'locationLat',
        'locationLong',
        'description',
        'isAccepted',
        'initialCurrencyId',
        'usedExchangeRateId',
        'initialPriceInDollars',
        'isRejected',
        'rejectionReason',
        'wasSeenNotificationSent',
        'price',
        'createdAt',
        'updatedAt',
      ],
      actions: {
        new: {
          isVisible: false,
          isAccessible: false,
        },
        edit: {
          isAccessible: ({ currentAdmin }) => currentAdmin.role === 'admin',
        },
        delete: {
          isAccessible: ({ currentAdmin }) => currentAdmin.role === 'admin',
          handler: deleteBid,
          guard: 'All the data related to this bid will be removed! ',
        },
        bulkDelete: {
          isAccessible: ({ currentAdmin }) => currentAdmin.role === 'admin',
          actionType: 'bulk',
          handler: deleteBulkBids,
        },
        list: {
          after: loadAuctionAssetsForAllBids,
        },
      },
    },
  }
}

const loadAuctionAssetsForAllBids = async (response, request, context) => {
  const { records } = response
  if (records && records.length > 0) {
    const auctionIds = records.map((record) => record.params.auctionId)
    const assets = await loadAssetsForAuctions(auctionIds)

    assets.forEach((asset) => {
      const matchingRecords = records.filter(
        (record) => record.params.auctionId === asset.auctionId
      )

      matchingRecords.forEach((matchingRecord) => {
        if (!matchingRecord.params.assets) {
          matchingRecord.params.assets = []
        }
        if (matchingRecord) {
          matchingRecord.params.assets.push(asset.asset)
        }
      })
    })
  }
  return response
}

const deleteBulkBids = async (request, response, context) => {
  const { records } = context
  const bidIds = records.map((record) => record.id()) as string[]
  const recordsInJSON = records.map((record) => record.toJSON(context.currentAdmin))

  if (request.method !== 'post') {
    return {
      records: recordsInJSON,
    }
  }

  const transaction = await DatabaseConnection.getInstance().transaction()

  try {
    for (const bidId of bidIds) {
      await BidRepository.deleteBid(bidId, transaction, false)
    }
    await transaction.commit()

    return {
      records: recordsInJSON,
      notice: {
        message: 'Bids were deleted successfully',
        type: 'success',
      },
      redirectUrl: '/admin/resources/bids',
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

const deleteBid = async (request, response, context) => {
  const { record } = context
  const bidId = record.params.id

  try {
    await BidRepository.deleteBid(bidId)

    return {
      record: record.toJSON(context.currentAdmin),
      notice: {
        message: 'Bid was deleted successfully',
        type: 'success',
      },
      redirectUrl: '/admin/resources/bids',
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
