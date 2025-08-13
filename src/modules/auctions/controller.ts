import { Request, Response } from 'express'
import { GENERAL } from '../../constants/errors.js'
import { AuctionsRepository } from './repository.js'
import { Auction } from './model.js'
import { FCMNotificationService } from '../../lib/notifications/index.js'
import { Bid } from '../bids/model.js'
import { config } from '../../config.js'
import { SettingsRepository } from '../settings/repository.js'
import { AuctionSimilarityRepository } from '../auction-similarities/repository.js'
import { AuctionMapClustersRepository } from '../auction-map-clusters/repository.js'
import { TranslationManager } from '../../lib/translation-manager.js'
import { generateNameForAccount } from '../../lib/notifications/utils.js'
import {
  AuctionHistoryEvent,
  HistoryEventTypes,
} from '../auxiliary-models/auction-history-events.js'
import { Op } from 'sequelize'
import { CurrenciesRepository } from '../currencies/repository.js'

export class AuctionsController {
  public static async create(req: Request, res: Response) {
    const { account } = res.locals
    const {
      latLng,
      location,
      title,
      description,
      hasCustomStartingPrice = false,
      price,
      mainCategoryId,
      subCategoryId,
      startAt,
      expiresAt,
      condition,
      youtubeLink,
    } = req.body
    let { initialCurrencyId } = req.body

    try {
      if (!account.email) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      if (!location || !latLng) {
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      if (!initialCurrencyId || initialCurrencyId === 'null' || !initialCurrencyId.length) {
        if (account.selectedCurrencyId) {
          initialCurrencyId = account.selectedCurrencyId
        } else {
          const settings = await SettingsRepository.get()
          initialCurrencyId = settings.defaultCurrencyId
        }
      }

      const files = req.files as Express.Multer.File[]
      const [latitude, longitude] = JSON.parse(latLng)

      const initialPriceInDollars = await CurrenciesRepository.getPriceInDollars(
        price,
        initialCurrencyId
      )

      const newAuction: Partial<Auction> = {
        description,
        youtubeLink,
        initialCurrencyId,
        accountId: account.id,
        locationPretty: location,
        title,
        mainCategoryId,
        initialPriceInDollars,
        subCategoryId,
        startAt: startAt
          ? new Date(
              typeof startAt === 'string'
                ? startAt.startsWith('"')
                  ? startAt.slice(1, -1)
                  : startAt
                : startAt
            )
          : undefined,
        expiresAt: expiresAt
          ? new Date(
              typeof expiresAt === 'string'
                ? expiresAt.startsWith('"')
                  ? expiresAt.slice(1, -1)
                  : expiresAt
                : expiresAt
            )
          : undefined,
        hasCustomStartingPrice,
        locationLat: latitude,
        locationLong: longitude,
        startingPrice: price,
        lastPrice: price,
        isNewItem: condition === 'new',
      }

      const auction = await AuctionsRepository.createWithDetails(account.id, newAuction, files)

      FCMNotificationService.sendNewAuctionFromFollowingAccount(account, auction.id)

      AuctionMapClustersRepository.storeForAuction(auction.id)

      return res.status(200).json(auction)
    } catch (error) {
      console.error('Cannot create auction', error)
      if (error.message === GENERAL.NOT_ENOUGH_COINS) {
        return res.status(400).send({ error: GENERAL.NOT_ENOUGH_COINS })
      }
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getLatest(req: Request, res: Response) {
    try {
      const auctions = await AuctionsRepository.getLatest()
      return res.status(200).json(auctions)
    } catch (error) {
      console.error('Cannot get latest auctions', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getAllLocations(req: Request, res: Response) {
    try {
      const locations = await AuctionsRepository.findAllLocations()

      return res.status(200).json(locations)
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async countAuctionsByBidStatus(req: Request, res: Response) {
    const { account } = res.locals
    const { status } = req.params

    const { query = '' } = req.body

    try {
      if (status !== 'all' && status !== 'accepted' && status !== 'rejected') {
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      const count = await AuctionsRepository.countAllByBidStatus(account.id, status, query)
      return res.status(200).json({ count })
    } catch (error) {
      console.error(error)
      return res.status(500).send({ error: GENERAL.BAD_REQUEST })
    }
  }

  public static async getAuctionsByBidStatus(req: Request, res: Response) {
    const { account } = res.locals
    const { status } = req.params

    const {
      page = 0,
      perPage = 20,
      query = '',
      orderDirection = 'DESC',
      orderBy = 'createdAt',
    } = req.body

    try {
      if (status !== 'all' && status !== 'accepted' && status !== 'rejected') {
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      const auctions = await AuctionsRepository.getAllByBidStatus(account.id, status, {
        page,
        perPage,
        query,
        orderBy,
        orderDirection,
      })

      return res.status(200).json(auctions)
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async update(req: Request, res: Response) {
    const { account } = res.locals
    const { auctionId } = req.params
    const {
      latLng,
      location,
      title,
      youtubeLink,
      description,
      hasCustomStartingPrice = false,
      price,
      initialCurrencyId,
      mainCategoryId,
      subCategoryId,
      startAt,
      expiresAt,
      condition,
    } = req.body

    try {
      if (!account.email) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      if (!location || !latLng) {
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      const auctionToUpdate = await Auction.findByPk(auctionId)
      if (!auctionToUpdate) {
        throw new Error('Auction not found')
      }

      if (auctionToUpdate.accountId !== account.id) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      const auctionBidsCount = await Bid.count({ where: { auctionId } })
      // If the auction already has a bid, the auction price cannot be changed
      if (
        auctionBidsCount > 0 &&
        (auctionToUpdate.hasCustomStartingPrice !== hasCustomStartingPrice ||
          (auctionToUpdate.startingPrice && auctionToUpdate.startingPrice !== price))
      ) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      const assetsToKeep =
        typeof req.body?.assetsToKeep === 'string' && req.body.assetsToKeep === ''
          ? []
          : typeof req.body?.assetsToKeep === 'string' && req.body?.assetsToKeep?.indexOf('[') === 0
          ? JSON.parse(req.body.assetsToKeep)
          : req.body.assetsToKeep

      const files = req.files as Express.Multer.File[]
      const [latitude, longitude] = JSON.parse(latLng)

      let initialPriceInDollars

      if (initialCurrencyId) {
        initialPriceInDollars = await CurrenciesRepository.getPriceInDollars(
          price,
          initialCurrencyId
        )
      }

      const auctionToUpdateData: Partial<Auction> = {
        description,
        accountId: account.id,
        locationPretty: location,
        title,
        mainCategoryId,
        subCategoryId,
        youtubeLink,
        startAt: startAt
          ? new Date(
              typeof startAt === 'string'
                ? startAt.startsWith('"')
                  ? startAt.slice(1, -1)
                  : startAt
                : startAt
            )
          : undefined,
        expiresAt: expiresAt
          ? new Date(
              typeof expiresAt === 'string'
                ? expiresAt.startsWith('"')
                  ? expiresAt.slice(1, -1)
                  : expiresAt
                : expiresAt
            )
          : undefined,
        hasCustomStartingPrice,
        locationLat: latitude,
        locationLong: longitude,
        startingPrice: price,
        lastPrice: price,
        isNewItem: condition === 'new',
        ...(initialCurrencyId && { initialCurrencyId }),
        ...(initialPriceInDollars && { initialPriceInDollars }),
      }

      const updatedAuction = await AuctionsRepository.updateAuction(
        auctionId,
        auctionToUpdateData,
        files,
        assetsToKeep
      )

      try {
        await AuctionSimilarityRepository.updateSimilaritiesForAuction(updatedAuction)
      } catch (error) {
        console.error('Could not update auction similarities', error)
      }

      if (auctionToUpdate.startingPrice !== price) {
        FCMNotificationService.sendFavouriteAuctionPriceChange(
          account,
          auctionToUpdate,
          auctionToUpdate.startingPrice,
          price
        )
      }

      AuctionMapClustersRepository.storeForAuction(auctionId)
      AuctionsRepository.storeHistoryEvent(auctionId, HistoryEventTypes.UPDATE_AUCTION)

      FCMNotificationService.sendAuctionUpdated(updatedAuction)
      return res.status(200).json(updatedAuction)
    } catch (error) {
      console.error('Cannot update auction', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async countForAccountByStatus(req: Request, res: Response) {
    const { status } = req.params
    const { account } = res.locals
    const { query = '' } = req.body

    try {
      if (status !== 'all' && status !== 'active' && status !== 'closed') {
        return res.status(500).send({ error: GENERAL.BAD_REQUEST })
      }

      const count = await AuctionsRepository.countForAccount(account.id, status, query)

      return res.status(200).json({ count })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getAllForAccountByStatus(req: Request, res: Response) {
    const { account } = res.locals
    const { status } = req.params

    const {
      page = 0,
      perPage = 20,
      query = '',
      orderDirection = 'DESC',
      orderBy = 'createdAt',
    } = req.body

    try {
      if (status !== 'all' && status !== 'active' && status !== 'closed') {
        return res.status(500).send({ error: GENERAL.BAD_REQUEST })
      }

      const allAuctions = await AuctionsRepository.findForAccount(account.id, status, {
        page,
        perPage,
        query,
        orderBy,
        orderDirection,
      })

      return res.status(200).json(allAuctions)
    } catch (error) {
      console.error(error)
      return res.status(500).send({ error: GENERAL.BAD_REQUEST })
    }
  }

  public static async loadFilteredAuctions(req: Request, res: Response) {
    const { account } = res.locals

    const {
      categories = [],
      subCategories = [],
      locationIds = [],
      activeOnly = false,
      includeMyAuctions = true,
      promotedOnly = false,
      query = '',
      page = 0,
      perPage = 20,
      started = true,
      usedCurrencyId = null,
      orderDirection = 'DESC',
      orderBy = 'createdAt',
    } = req.body

    let { minPrice = 0, maxPrice = 0 } = req.body

    try {
      if (minPrice) {
        const minPriceIsNaN = Number.isNaN(parseInt(`${minPrice}`))
        if (minPriceIsNaN) {
          return res.status(500).send({ error: GENERAL.BAD_REQUEST })
        }

        minPrice = await CurrenciesRepository.getPriceInDollars(
          parseInt(`${minPrice}`),
          usedCurrencyId
        )
      }

      if (maxPrice) {
        const maxPriceIsNaN = Number.isNaN(parseInt(`${maxPrice}`))
        if (maxPriceIsNaN) {
          return res.status(500).send({ error: GENERAL.BAD_REQUEST })
        }

        maxPrice = await CurrenciesRepository.getPriceInDollars(
          parseInt(`${maxPrice}`),
          usedCurrencyId
        )
      }
    } catch (error) {
      return res.status(500).send({ error: GENERAL.BAD_REQUEST })
    }

    try {
      const auctions = await AuctionsRepository.loadFilteredAuctions(
        typeof categories === 'string' ? JSON.parse(categories) : categories,
        typeof subCategories === 'string' ? JSON.parse(subCategories) : subCategories,
        typeof locationIds === 'string' ? JSON.parse(locationIds) : locationIds,
        activeOnly,
        {
          page,
          perPage,
          query,
          orderBy,
          orderDirection,
        },
        includeMyAuctions === false ? account.id : undefined,
        minPrice,
        maxPrice,
        undefined,
        promotedOnly,
        started
      )

      return res.status(200).json(auctions)
    } catch (error) {
      console.error('Cannot load filtered auctions', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getByLocationProximity(req: Request, res: Response) {
    const { lat, lng, mainCategoryId, maxDistance = 5 } = req.params
    try {
      const parsableDistance = parseInt(`${maxDistance}`)
      if (Number.isNaN(parsableDistance)) {
        return res.status(500).send({ error: GENERAL.BAD_REQUEST })
      }
    } catch (error) {
      return res.status(500).send({ error: GENERAL.BAD_REQUEST })
    }

    try {
      const distanceToParse = parseInt(`${maxDistance}`)
      if (distanceToParse > 200) {
        return res.status(500).send({ error: GENERAL.BAD_REQUEST })
      }

      const allAuctions = await AuctionsRepository.findByLocationProximity(
        parseFloat(lat),
        parseFloat(lng),
        mainCategoryId,
        distanceToParse
      )

      return res.status(200).json(allAuctions)
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async countFilteredAuctions(req: Request, res: Response) {
    const { account } = res.locals

    const {
      categories = [],
      subCategories = [],
      locationIds = [],
      activeOnly = false,
      includeMyAuctions = true,
      query = '',
      usedCurrencyId = null,
      started = true,
    } = req.body

    let { minPrice = 0, maxPrice = 0 } = req.body

    try {
      if (minPrice) {
        const minPriceIsNaN = Number.isNaN(parseInt(`${minPrice}`))
        if (minPriceIsNaN) {
          return res.status(500).send({ error: GENERAL.BAD_REQUEST })
        }

        minPrice = await CurrenciesRepository.getPriceInDollars(
          parseInt(`${minPrice}`),
          usedCurrencyId
        )
      }

      if (maxPrice) {
        const maxPriceIsNaN = Number.isNaN(parseInt(`${maxPrice}`))
        if (maxPriceIsNaN) {
          return res.status(500).send({ error: GENERAL.BAD_REQUEST })
        }

        maxPrice = await CurrenciesRepository.getPriceInDollars(
          parseInt(`${maxPrice}`),
          usedCurrencyId
        )
      }
    } catch (error) {
      return res.status(500).send({ error: GENERAL.BAD_REQUEST })
    }

    try {
      const count = await AuctionsRepository.applyFilterQueryOverAuctions({
        categories: typeof categories === 'string' ? JSON.parse(categories) : categories,
        subCategories:
          typeof subCategories === 'string' ? JSON.parse(subCategories) : subCategories,
        locationIds: typeof locationIds === 'string' ? JSON.parse(locationIds) : locationIds,
        activeOnly,
        query,
        ...(includeMyAuctions === false && { accountIdToIgnore: account.id }),
        minPrice,
        maxPrice,
        getCount: true,
        started,
      })

      return res.status(200).json({ count })
    } catch (error) {
      console.error('Cannot count filtered auctions', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getManySummary(req: Request, res: Response) {
    const { auctionIds } = req.body

    try {
      const summary = await AuctionsRepository.getManySummary(auctionIds)
      if (!summary) {
        return res.status(500).send({ error: GENERAL.BAD_REQUEST })
      }

      return res.status(200).json(summary)
    } catch (error) {
      console.error('Cannot get many auction summary', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async translateAuctionDetails(req: Request, res: Response) {
    const { auctionId, lang } = req.params

    try {
      const auction = await Auction.findByPk(auctionId)
      if (!auction) {
        return res.status(500).send({ error: GENERAL.BAD_REQUEST })
      }

      const { title, description } = auction
      const [translatedTitle, translatedDescription] = await Promise.all([
        TranslationManager.translate(title, lang),
        TranslationManager.translate(description, lang),
      ])

      return res.status(200).json({ title: translatedTitle, description: translatedDescription })
    } catch (error) {
      console.error('Cannot translate auction details', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async search(req: Request, res: Response) {
    const { keyword, page = 0, perPage = 10 } = req.params
    if (!keyword) {
      res.status(500).send({ error: GENERAL.BAD_REQUEST })
      return
    }

    try {
      const auctions = await AuctionsRepository.search({
        query: keyword,
        page: parseInt(page.toString()),
        perPage: parseInt(perPage.toString()),
      })

      return res.status(200).json(auctions)
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async countActiveByAccount(req: Request, res: Response) {
    const { accountId } = req.params
    const { query = '' } = req.body

    try {
      const count = await AuctionsRepository.applyFilterQueryOverAuctions({
        categories: [],
        subCategories: [],
        locationIds: [],
        activeOnly: true,
        query,
        accountId,
        getCount: true,
      })

      return res.status(200).json({ count })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getActiveByAccount(req: Request, res: Response) {
    const { accountId } = req.params

    const {
      page = 0,
      perPage = 20,
      query = '',
      orderDirection = 'DESC',
      orderBy = 'createdAt',
    } = req.body

    try {
      const allAuctions = await AuctionsRepository.loadFilteredAuctions(
        [],
        [],
        [],
        true,
        {
          page,
          perPage,
          query,
          orderBy,
          orderDirection,
        },
        undefined,
        undefined,
        undefined,
        accountId
      )

      return res.status(200).json(allAuctions)
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getSummary(req: Request, res: Response) {
    const { auctionId } = req.params

    try {
      const summary = await AuctionsRepository.getSummary(auctionId)
      if (!summary) {
        return res.status(500).send({ error: GENERAL.BAD_REQUEST })
      }

      return res.status(200).json(summary)
    } catch (error) {
      console.error('Cannot get auction summary', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getDetails(req: Request, res: Response) {
    const { account } = res.locals
    try {
      const { auctionId } = req.params
      const auction = await AuctionsRepository.getDetails(auctionId)
      if (!auction) {
        return res.status(500).send({ error: GENERAL.BAD_REQUEST })
      }

      if (account?.id !== auction.accountId) {
        const oldestHistoryEvent =
          account?.id &&
          (await AuctionHistoryEvent.findOne({
            where: { auctionId, details: { [Op.contains]: { accountId: account.id } } },
            order: [['createdAt', 'DESC']],
          }))

        const thirtySecondsAgo = new Date(Date.now() - 30 * 1000)
        const canIncrement = oldestHistoryEvent
          ? oldestHistoryEvent.createdAt < thirtySecondsAgo
          : true

        if (account && canIncrement) {
          AuctionsRepository.storeHistoryEvent(auctionId, HistoryEventTypes.VIEW_AUCTION, {
            accountName: generateNameForAccount(account),
            accountId: account.id,
          })
        }

        if (canIncrement) {
          Auction.increment('views', { by: 1, where: { id: auctionId } })
          auction.views += 1
        }

        delete auction.auctionHistoryEvents
      }

      delete auction.vectors

      return res.status(200).json(auction)
    } catch (error) {
      console.error('Cannot get auction details', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async promoteAuction(req: Request, res: Response) {
    const { account } = res.locals
    const { auctionId } = req.params

    try {
      const [auction, settings] = await Promise.all([
        AuctionsRepository.getOneById(auctionId),
        SettingsRepository.get(),
      ])
      if (!auction) {
        return res.status(500).send({ error: GENERAL.BAD_REQUEST })
      }

      if (auction.accountId !== account.id) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      const promotionCost = settings.promotionCoinsCost ?? config.PROMOTE_AUCTION_COINS_COST

      if (account.coins - promotionCost < 0) {
        return res.status(500).send({ error: GENERAL.NOT_ENOUGH_COINS })
      }

      await AuctionsRepository.promoteAuction(auctionId, account.id, promotionCost)

      AuctionsRepository.storeHistoryEvent(auctionId, HistoryEventTypes.PROMOTE_AUCTION)

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async delete(req: Request, res: Response) {
    const { account } = res.locals
    const { auctionId } = req.params
    try {
      if (!account.email) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }
      const auction = await AuctionsRepository.getOneById(auctionId)
      if (auction?.accountId !== account.id) {
        return res.status(500).send({ error: GENERAL.FORBIDDEN })
      }

      if (auction.acceptedBidId) {
        return res.status(500).send({ error: GENERAL.FORBIDDEN })
      }

      await AuctionsRepository.deleteAuction(auctionId)
      AuctionMapClustersRepository.storeForAuction(auctionId)

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Cannot delete auction', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }
}
