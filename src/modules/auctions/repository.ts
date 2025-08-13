import { Op, Transaction, literal } from 'sequelize'
import { GenericRepository } from '../../lib/base-repository.js'
import { Auction } from './model.js'
import { DatabaseConnection } from '../../database/index.js'
import { Bid } from '../bids/model.js'
import { AuctionAsset } from '../auxiliary-models/auction-assets.js'
import { Asset } from '../assets/model.js'
import { Favourite } from '../favourites/model.js'
import { Location } from '../auxiliary-models/location.js'
import { config } from '../../config.js'
import { Account } from '../accounts/model.js'
import { BidRepository } from '../bids/repository.js'
import { AssetsRepository } from '../assets/repository.js'
import { Review } from '../reviews/model.js'
import { PaginatedQueryParams } from '../../types.js'
import { DATABASE_MODELS } from '../../constants/model-names.js'
import { LastSeenAuction } from '../last-seen/model.js'
import { VectorsManager } from '../../lib/vectors-manager.js'
import { Category } from '../categories/model.js'
import { AuctionSimilarity } from '../auction-similarities/model.js'
import { Literal } from 'sequelize/types/utils.js'
import { SettingsRepository } from '../settings/repository.js'
import { AuctionSimilarityRepository } from '../auction-similarities/repository.js'
import { GENERAL } from '../../constants/errors.js'
import { CoinsRefunder } from '../../lib/coins-refunder.js'
import { ChatGroupAuction } from '../auction-similarities/chat-group-auctions.js'
import {
  AuctionHistoryEvent,
  HistoryEventTypes,
} from '../auxiliary-models/auction-history-events.js'
import { AuctionMapCluster } from '../auction-map-clusters/model.js'
import { Comment } from '../comments/entity.js'

interface ApplyFilterQueryOverAuctionsParams {
  categories: string[]
  subCategories: string[]
  locationIds: string[]
  activeOnly: boolean
  getCount?: boolean
  accountIdToIgnore?: string
  orderBy?: string
  orderDirection?: 'ASC' | 'DESC'
  minPrice?: number
  maxPrice?: number
  query?: string
  accountId?: string
  promotedOnly?: boolean
  started?: boolean
}

class AuctionsRepository extends GenericRepository<Auction> {
  constructor() {
    super(Auction)
  }

  public async storeHistoryEvent(
    auctionId: string,
    type: HistoryEventTypes,
    details: Record<string, unknown> = {}
  ) {
    await AuctionHistoryEvent.create({ auctionId, type, details })
  }

  public async getSummary(auctionId: string) {
    return await Auction.findByPk(auctionId, {
      include: [
        { model: Asset, as: 'auctionAssets' },
        {
          model: Account,
          attributes: ['id', 'name', 'email', 'picture', 'verified'],
        },
      ],
    })
  }

  public async findByIds(ids: string[], transaction?: Transaction) {
    const auctions = await Auction.findAll({
      where: { id: { [Op.in]: ids } },
      include: [
        {
          model: Account,
          attributes: ['id', 'name', 'email', 'picture', 'verified'],
        },
        { model: Asset, as: 'auctionAssets' },
      ],
      transaction,
    })

    return BidRepository.applyBidsCountToAuctions(auctions)
  }

  public async getManySummary(auctionIds: string[]) {
    return await Auction.findAll({
      where: { id: { [Op.in]: auctionIds } },
      include: [
        {
          model: Account,
          attributes: ['id', 'name', 'email', 'picture', 'verified'],
        },
        { model: Asset, as: 'auctionAssets', required: false },
      ],
    })
  }

  public async createWithDetails(
    accountId: string,
    auction: Partial<Auction>,
    assets: Express.Multer.File[] = []
  ) {
    return await DatabaseConnection.getInstance().transaction(async (transaction: Transaction) => {
      const { locationPretty } = auction

      // We need to check if the account has enough coins to create the auction
      const [settings, auctionsFromSameAccount] = await Promise.all([
        SettingsRepository.get(),
        Auction.count({
          where: { accountId: auction.accountId },
          transaction,
        }),
      ])

      const { freeAuctionsCount, auctionsCoinsCost } = settings

      if (auctionsFromSameAccount >= freeAuctionsCount) {
        const account = await Account.findByPk(accountId, { transaction })
        if (account.coins < auctionsCoinsCost) {
          throw new Error(GENERAL.NOT_ENOUGH_COINS)
        }

        account.coins -= auctionsCoinsCost
        await account.save({ transaction })

        auction.paidCoins = auctionsCoinsCost
      }

      // If the location does not exist inside the database,
      // we are going to create it
      let location = await Location.findOne({
        where: {
          name: locationPretty,
        },
        transaction,
      })

      if (!location) {
        location = await Location.create({ name: locationPretty }, { transaction })
      }

      auction.locationId = location.id

      try {
        const auctionVector = await this.generateVectorForAuction(auction, transaction)

        auction.vectors = auctionVector
      } catch (error) {
        console.error('Could not create auction vector while creating auction', error)
      }

      // Create the actual auction
      const createdAuction = await Auction.create(auction, {
        transaction,
        returning: true,
      })

      await this.storeAuctionAssets(assets, createdAuction.id, transaction)

      // Set the expiration date
      const auctionActiveTimeInHours =
        settings.auctionActiveTimeInHours || config.AUCTION_ACTIVE_TIME_IN_HOURS

      if (!auction.expiresAt) {
        // no expire date, setting default

        const expireDate = new Date()
        expireDate.setTime(expireDate.getTime() + auctionActiveTimeInHours * 60 * 60 * 1000)

        createdAuction.expiresAt = expireDate
        createdAuction.startedAt = new Date()
        await createdAuction.save({ transaction })
      }

      const auctionDetails = await this.findByIds([createdAuction.id], transaction)
      const resultAuction = auctionDetails[0]

      await AuctionSimilarityRepository.updateSimilaritiesForAuction(
        resultAuction,
        transaction,
        false
      )

      return resultAuction
    })
  }

  public async getLatest() {
    const AUCTIONS_TO_TAKE = 12

    // Check if there are more that AUCTIONS_TO_TAKE promoted auctions.
    // If there are, we are going to show only promoted auctions, in a random order
    const promotedAuctionsCount = await Auction.count({
      where: {
        promotedAt: { [Op.ne]: null },
        expiresAt: { [Op.gte]: new Date() },
        startedAt: { [Op.ne]: null },
        acceptedBidId: null,
      },
    })

    if (promotedAuctionsCount > AUCTIONS_TO_TAKE) {
      const auctions = await Auction.findAll({
        order: literal('RANDOM()'),
        attributes: { exclude: ['vectors'] },
        where: {
          promotedAt: { [Op.ne]: null },
          expiresAt: { [Op.gte]: new Date() },
          startedAt: { [Op.ne]: null },
          acceptedBidId: null,
        },
        include: [
          {
            model: Account,
            attributes: ['id', 'name', 'email', 'picture', 'verified'],
          },
          { model: Asset, as: 'auctionAssets' },
        ],
        limit: AUCTIONS_TO_TAKE,
      })

      return BidRepository.applyBidsCountToAuctions(auctions)
    }

    const orderConditions: (string | [string | Literal, string])[] = []
    orderConditions.push(
      [literal('(CASE WHEN "promotedAt" IS NOT NULL THEN 1 ELSE 0 END)'), 'DESC'],
      ['promotedAt', 'DESC'],
      ['createdAt', 'DESC']
    )

    const auctions = await Auction.findAll({
      order: orderConditions,
      attributes: { exclude: ['vectors'] },
      where: {
        expiresAt: { [Op.gte]: new Date() },
        startedAt: { [Op.ne]: null },
        acceptedBidId: null,
      },
      include: [
        {
          model: Account,
          attributes: ['id', 'name', 'email', 'picture', 'verified'],
        },
        { model: Asset, as: 'auctionAssets' },
      ],
      limit: AUCTIONS_TO_TAKE,
    })

    return BidRepository.applyBidsCountToAuctions(auctions)
  }

  public async updateAuction(
    auctionId: string,
    newAuctionData: Partial<Auction>,
    newAssets: Express.Multer.File[],
    assetsToKeepIds: string[] = []
  ) {
    assetsToKeepIds = [].concat(assetsToKeepIds)

    return await DatabaseConnection.getInstance().transaction(async (transaction: Transaction) => {
      try {
        const auctionVector = await this.generateVectorForAuction(newAuctionData, transaction)

        newAuctionData.vectors = auctionVector
      } catch (error) {
        console.error('Could not create auction vector while updating auction', error)
      }

      const updateResult = await Auction.update(newAuctionData, {
        where: { id: auctionId },
        returning: true,
        transaction,
      })

      const updatedAuction = updateResult[1][0]

      const auctionAssetsToDestroy = await AuctionAsset.findAll({
        where: { auctionId, assetId: { [Op.notIn]: assetsToKeepIds } },
        transaction,
      })

      const assetIdsToDestroy = auctionAssetsToDestroy.map((el) => el.assetId)
      const assetsToDestroy = await Asset.findAll({
        where: { id: { [Op.in]: assetIdsToDestroy } },
        transaction,
      })

      await AuctionAsset.destroy({
        where: { auctionId, assetId: { [Op.notIn]: assetsToKeepIds } },
        transaction,
      })

      await Promise.all([
        ...assetsToDestroy.map((el) => AssetsRepository.removeAssetFromStorage(el.path)),

        Asset.destroy({
          where: { id: { [Op.in]: assetIdsToDestroy } },
          transaction,
        }),
      ])

      await this.storeAuctionAssets(newAssets, updatedAuction.id, transaction, false)

      return updatedAuction
    })
  }

  public async search(paginationParams: PaginatedQueryParams) {
    const { query, page, perPage } = paginationParams

    return await Auction.findAll({
      limit: perPage,
      offset: page * perPage,
      attributes: { exclude: ['vectors'] },
      order: [['createdAt', 'DESC']],
      where: {
        [Op.or]: [
          { title: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
        ],
      },
      include: [
        {
          model: Account,
          attributes: ['id', 'name', 'email', 'picture', 'verified'],
        },
        { model: Asset, as: 'auctionAssets' },
      ],
    })
  }

  public async promoteAuction(auctionId: string, accountId: string, cost: number) {
    return await DatabaseConnection.getInstance().transaction(async (transaction: Transaction) => {
      await Auction.update({ promotedAt: new Date() }, { where: { id: auctionId }, transaction })

      await Account.decrement('coins', {
        where: { id: accountId },
        by: cost,
        transaction,
      })
    })
  }

  public async getDetails(auctionId: string) {
    const auction = await Auction.findByPk(auctionId, {
      // Include the count of the favourites for this auction
      attributes: {
        include: [
          [
            literal(
              `(SELECT COUNT(*) FROM ${DATABASE_MODELS.ACCOUNT_FAVOURITES} WHERE "auctionId" = "${DATABASE_MODELS.AUCTIONS}"."id")`
            ),
            'likesCount',
          ],
        ],
      },
      order: [
        [{ model: Bid, as: 'bids' }, 'isRejected', 'ASC'],
        [{ model: Bid, as: 'bids' }, 'isAccepted', 'DESC'],
      ],
      include: [
        {
          model: Account,
          attributes: ['id', 'name', 'email', 'picture', 'verified'],
          include: [
            { model: Review, required: false, as: 'receivedReviews' },
            { model: Asset, as: 'asset' },
          ],
        },
        { model: Asset, as: 'auctionAssets' },
        {
          model: Review,
          as: 'reviews',
          include: [
            {
              model: Account,
              as: 'reviewer',
              attributes: ['id', 'name', 'email', 'picture', 'verified'],
              include: [{ model: Asset, as: 'asset' }],
            },
            {
              model: Account,
              as: 'reviewed',
              attributes: ['id', 'name', 'email', 'picture', 'verified'],
              include: [{ model: Asset, as: 'asset' }],
            },
          ],
        },
        {
          model: Bid,
          as: 'bids',
          include: [
            {
              model: Account,
              as: 'bidder',
              attributes: ['id', 'name', 'email', 'picture', 'verified'],
              include: [{ model: Asset, as: 'asset' }],
            },
          ],
        },
        { model: AuctionHistoryEvent, as: 'auctionHistoryEvents', order: [['createdAt', 'DESC']] },
      ],
    })

    return auction.toJSON()
  }

  public async deleteAuction(
    auctionId: string,
    transaction?: Transaction,
    commitTransaction = true
  ) {
    transaction = transaction || (await DatabaseConnection.getInstance().transaction())

    try {
      await CoinsRefunder.handleDeleteAuctionRefund(auctionId, transaction)

      // We need to remove all the related data
      await Favourite.destroy({ where: { auctionId }, transaction })

      await Bid.destroy({ where: { auctionId }, transaction })

      await LastSeenAuction.destroy({ where: { auctionId }, transaction })

      await this.removeAuctionAssets(auctionId, transaction)

      await AuctionHistoryEvent.destroy({ where: { auctionId }, transaction })

      await Comment.destroy({ where: { auctionId }, transaction })

      await ChatGroupAuction.destroy({ where: { auctionId }, transaction })

      await AuctionSimilarity.destroy({
        where: { [Op.or]: { auctionId1: auctionId, auctionId2: auctionId } },
        transaction,
      })

      await AuctionMapCluster.destroy({ where: { id: auctionId }, transaction })

      await Auction.destroy({ where: { id: auctionId }, transaction })

      if (commitTransaction) {
        await transaction.commit()
      }
    } catch (error) {
      if (commitTransaction) {
        console.error('Coult not commit transaction - delete auction', error)
        await transaction.rollback()
      } else {
        throw error
      }
    }
  }

  public async countForAccount(
    accountId: string,
    status: 'closed' | 'active' | 'all',
    query?: string
  ) {
    let extraQuery = {}
    switch (status) {
      case 'closed':
        extraQuery = {
          [Op.or]: [{ expiresAt: { [Op.lt]: new Date() } }, { acceptedBidId: { [Op.ne]: null } }],
        }
        break
      case 'active':
        extraQuery = {
          expiresAt: { [Op.gte]: new Date() },
          startedAt: { [Op.ne]: null },
          acceptedBidId: null,
        }
        break
    }

    const QUERY_WHERE_STMT = query
      ? {
        where: {
          [Op.or]: [literal(`"title" ILIKE $1`), literal(`"description" ILIKE $1`)],
        },
      }
      : {}

    return await Auction.count({
      where: { ...extraQuery, ...QUERY_WHERE_STMT, accountId },
      include: [],
      ...(query ? { bind: [`%${query}%`] } : {}),
    })
  }

  public async findForAccount(
    accountId: string,
    status: 'closed' | 'active' | 'all',
    params?: PaginatedQueryParams
  ) {
    const {
      page = 0,
      perPage = 20,
      orderDirection = 'DESC',
      orderBy = 'createdAt',
      query,
    } = params || {}

    let extraQuery = {}
    switch (status) {
      case 'closed':
        extraQuery = {
          [Op.or]: [{ expiresAt: { [Op.lt]: new Date() } }, { acceptedBidId: { [Op.ne]: null } }],
        }
        break
      case 'active':
        extraQuery = {
          expiresAt: { [Op.gte]: new Date() },
          acceptedBidId: null,
        }
        break
    }

    const QUERY_WHERE_STMT = query
      ? {
        where: {
          [Op.or]: [literal(`"title" ILIKE $1`), literal(`"description" ILIKE $1`)],
        },
      }
      : {}

    const needToAddPromotionOrder =
      orderBy === 'createdAt' && orderDirection?.toLowerCase() === 'desc'

    const orderConditions: (string | [string | Literal, string])[] = []
    if (needToAddPromotionOrder) {
      orderConditions.push(
        [literal('(CASE WHEN "promotedAt" IS NOT NULL THEN 1 ELSE 0 END)'), 'DESC'],
        ['promotedAt', 'DESC'],
        [orderBy, orderDirection]
      )
    } else {
      orderConditions.push([orderBy, orderDirection])
    }

    const auctions = await Auction.findAll({
      where: { ...extraQuery, ...QUERY_WHERE_STMT, accountId },
      limit: perPage,
      offset: page * perPage,
      attributes: { exclude: ['vectors'] },
      order: orderConditions,
      include: [
        { model: Asset, as: 'auctionAssets', required: false },
        {
          model: Account,
          attributes: ['id', 'name', 'email', 'picture', 'verified'],
        },
      ],
      ...(query ? { bind: [`%${query}%`] } : {}),
    })

    return BidRepository.applyBidsCountToAuctions(auctions)
  }

  public async findByLocationProximity(
    lat: number,
    lng: number,
    mainCategoryId: string,
    maxDistanceInKM = 5
  ) {
    // 6371 - earth radius in km
    const QUERY_FOR_AUCTIONS = `
      SELECT id FROM (
        SELECT  id,
          (
            6371 
            * acos(cos(radians($lat)) 
            * cos(radians("locationLat")) 
            * cos(radians("locationLong") - radians($lng)) 
            + sin(radians($lat)) 
            * sin(radians("locationLat")) 
          )
        )
        AS distance
        FROM auctions
        WHERE "expiresAt" >= NOW() 
          AND "acceptedBidId" IS NULL
          ${mainCategoryId !== 'all' ? 'AND "mainCategoryId" = $mainCategoryId' : ''}
        ) al
      WHERE distance <= $maxDistanceInKM
      ORDER BY distance
    `
    const [auctions] = await DatabaseConnection.getInstance().query(QUERY_FOR_AUCTIONS, {
      raw: true,
      bind: { maxDistanceInKM, lat, lng, mainCategoryId },
    })
    const auctionIds = auctions.map((el) => el.id)
    return this.findByIds(auctionIds)
  }

  public async loadFilteredAuctions(
    categories: string[],
    subCategories: string[],
    locationIds: string[],
    activeOnly: boolean,
    params: PaginatedQueryParams,
    accountIdToIgnore?: string,
    minPrice?: number,
    maxPrice?: number,
    accountId?: string,
    promotedOnly?: boolean,
    started = true
  ) {
    const { page, perPage, orderDirection = 'DESC', orderBy = 'createdAt', query } = params

    const auctionIdsToSelect = await this.applyFilterQueryOverAuctions({
      categories,
      subCategories,
      locationIds,
      accountIdToIgnore,
      activeOnly,
      getCount: false,
      orderBy,
      orderDirection,
      minPrice,
      maxPrice,
      promotedOnly,
      started,
    })

    const QUERY_WHERE_STMT = query
      ? {
        [Op.or]: [
          { title: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
        ],
      }
      : {}

    const ACCOUNT_WHERE_STMS = accountId
      ? { accountId }
      : accountIdToIgnore
        ? { accountId: { [Op.ne]: accountIdToIgnore } }
        : {}

    const needToAddPromotionOrder =
      orderBy === 'createdAt' && orderDirection?.toLowerCase() === 'desc'

    const orderConditions: (string | [string | Literal, string])[] = []
    if (needToAddPromotionOrder) {
      if (started === false) {
        orderConditions.push(['startAt', 'ASC'])
      }

      orderConditions.push(
        [literal('(CASE WHEN "promotedAt" IS NOT NULL THEN 1 ELSE 0 END)'), 'DESC'],
        ['promotedAt', 'DESC'],
        [orderBy, orderDirection]
      )
    } else {
      orderConditions.push([orderBy, orderDirection])
    }

    const auctions = await Auction.findAll({
      limit: perPage,
      offset: page * perPage,
      order: orderConditions,
      attributes: { exclude: ['vectors'] },
      where: {
        id: {
          [Op.in]:
            typeof auctionIdsToSelect !== 'number'
              ? auctionIdsToSelect.rows.map((el) => el.id)
              : [],
        },
        ...QUERY_WHERE_STMT,
        ...ACCOUNT_WHERE_STMS,
      },
      include: [
        { model: Asset, as: 'auctionAssets', required: false },
        {
          model: Account,
          attributes: ['id', 'name', 'email', 'picture', 'verified'],
        },
      ],
    })

    return BidRepository.applyBidsCountToAuctions(auctions)
  }

  public async findAllLocations() {
    const QUERY = `
      SELECT "${DATABASE_MODELS.LOCATIONS}"."id", "name", COALESCE(COUNT("name"), 0) as "auctionsCount"
      FROM "${DATABASE_MODELS.LOCATIONS}"
      LEFT JOIN "${DATABASE_MODELS.AUCTIONS}" ON "${DATABASE_MODELS.AUCTIONS}"."locationId" = "${DATABASE_MODELS.LOCATIONS}"."id" AND "expiresAt" >= NOW()
      GROUP BY "${DATABASE_MODELS.LOCATIONS}"."id","name"
    `
    const [result] = await DatabaseConnection.getInstance().query(QUERY, {
      raw: true,
    })

    return result
  }

  public async applyFilterQueryOverAuctions(params: ApplyFilterQueryOverAuctionsParams) {
    const {
      categories,
      subCategories,
      locationIds,
      activeOnly,
      accountIdToIgnore,
      orderBy,
      orderDirection,
      minPrice,
      maxPrice,
      getCount,
      accountId,
      query,
      promotedOnly = false,
      started = true,
    } = params

    if (
      orderDirection &&
      orderDirection.toUpperCase() !== 'ASC' &&
      orderDirection.toUpperCase() !== 'DESC'
    ) {
      throw new Error('Invalid params')
    }

    if (orderBy && orderBy !== 'createdAt' && orderBy !== 'lastPrice') {
      throw new Error('Invalid params')
    }

    const QUERY_WHERE_STMT = query
      ? {
        [Op.or]: [
          { title: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
        ],
      }
      : {}

    const PROMOTED_STMT = promotedOnly
      ? {
        promotedAt: {
          [Op.ne]: null,
        },
      }
      : {}

    const PRICE_WHERE_STMT =
      minPrice || maxPrice
        ? {
          startingPrice: {
            [Op.and]: {
              ...(minPrice && { [Op.gte]: minPrice }),
              ...(maxPrice && { [Op.lte]: maxPrice }),
            },
          },
        }
        : {}

    const whereStatement = {
      ...QUERY_WHERE_STMT,
      ...(activeOnly && {
        [Op.and]: { expiresAt: { [Op.gte]: new Date() }, acceptedBidId: null },
      }),
      ...(started ? { startedAt: { [Op.ne]: null } } : { startedAt: { [Op.eq]: null } }),
      ...(categories?.length && { mainCategoryId: { [Op.in]: categories } }),
      ...(subCategories?.length && {
        subCategoryId: { [Op.in]: subCategories },
      }),
      ...(locationIds?.length && { locationId: { [Op.in]: locationIds } }),
      ...(accountIdToIgnore && { accountId: { [Op.ne]: accountIdToIgnore } }),
      ...PRICE_WHERE_STMT,
      ...PROMOTED_STMT,
      ...(accountId && { accountId }),
    }

    return getCount
      ? Auction.count({ where: whereStatement })
      : Auction.findAndCountAll({
        where: whereStatement,
        order: orderBy ? [[orderBy, orderDirection]] : [['createdAt', 'DESC']],
      })
  }

  public async countAllByBidStatus(
    accountId: string,
    bidStatus: 'all' | 'accepted' | 'rejected',
    query?: string
  ) {
    const extraQuery = {}
    switch (bidStatus) {
      case 'accepted':
        extraQuery['isAccepted'] = true
        break
      case 'rejected':
        extraQuery['isRejected'] = true
        break
      default:
        break
    }

    const QUERY_WHERE_STMT = query
      ? {
        [Op.or]: [literal(`"title" ILIKE $1`)],
      }
      : {}

    const bids = await Bid.findAll({
      where: {
        ...extraQuery,
        bidderId: accountId,
        [Op.and]: {
          ...QUERY_WHERE_STMT,
        },
      },
      attributes: ['id', 'auctionId', 'isAccepted', 'isRejected'],
      include: [
        {
          model: Auction,
          as: 'auction',
          attributes: ['id', 'title'],
        },
      ],
      ...(query ? { bind: [`%${query}%`] } : {}),
    })
    const auctionIds = bids.map((bid) => bid.auctionId)
    const uniqueAuctionIds = [...new Set(auctionIds)]
    return uniqueAuctionIds.length
  }

  public async getAllByBidStatus(
    accountId: string,
    bidStatus: 'all' | 'accepted' | 'rejected',
    params?: PaginatedQueryParams
  ) {
    const {
      page = 0,
      perPage = 20,
      orderDirection = 'DESC',
      orderBy = 'createdAt',
      query,
    } = params || {}

    const extraQuery = {}
    switch (bidStatus) {
      case 'accepted':
        extraQuery['isAccepted'] = true
        break
      case 'rejected':
        extraQuery['isRejected'] = true
        break
      default:
        break
    }

    const QUERY_WHERE_STMT = query
      ? {
        [Op.or]: [literal(`"title" ILIKE $1`)],
      }
      : {}

    const bids = await Bid.findAll({
      where: {
        ...extraQuery,
        bidderId: accountId,
        [Op.and]: {
          ...QUERY_WHERE_STMT,
        },
      },
      attributes: ['id', 'auctionId', 'isAccepted', 'isRejected'],
      include: [
        {
          model: Auction,
          as: 'auction',
          attributes: ['id', 'title'],
        },
      ],
      ...(query ? { bind: [`%${query}%`] } : {}),
    })

    const bidIds = bids.map((bid) => bid.id)
    const auctionIds = bids.map((bid) => bid.auctionId)
    const uniqueAuctionIds = [...new Set(auctionIds)]

    const needToAddPromotionOrder =
      orderBy === 'createdAt' && orderDirection?.toLowerCase() === 'desc'

    const orderConditions: (string | [string | Literal, string])[] = []
    if (needToAddPromotionOrder) {
      orderConditions.push(
        [literal('(CASE WHEN "promotedAt" IS NOT NULL THEN 1 ELSE 0 END)'), 'DESC'],
        ['promotedAt', 'DESC'],
        [orderBy, orderDirection]
      )
    } else {
      orderConditions.push([orderBy, orderDirection])
    }

    const auctions = await Auction.findAll({
      where: { id: { [Op.in]: uniqueAuctionIds } },
      limit: perPage,
      offset: page * perPage,
      order: orderConditions,
      include: [
        { model: Asset, as: 'auctionAssets', required: false },
        {
          model: Account,
          attributes: ['id', 'name', 'email', 'picture', 'verified'],
        },
        {
          model: Bid,
          as: 'bids',
          where: { bidderId: accountId, id: { [Op.in]: bidIds } },
        },
      ],
    })

    return BidRepository.applyBidsCountToAuctions(auctions)
  }

  private async removeAuctionAssets(auctionId: string, transaction: Transaction) {
    const auctionAssets = await AuctionAsset.findAll({
      where: { auctionId },
      transaction,
    })

    if (!auctionAssets.length) {
      return
    }

    await AuctionAsset.destroy({ where: { auctionId }, transaction })

    for (const asset of auctionAssets) {
      await AssetsRepository.removeAsset(asset.assetId, transaction)
    }
  }

  private async storeAuctionAssets(
    assets: Express.Multer.File[],
    auctionId: string,
    transaction: Transaction,
    cleanupBefore = true
  ) {
    if (cleanupBefore) {
      await this.removeAuctionAssets(auctionId, transaction)
    }

    const storedAssets = [] as Asset[]
    for (const asset of assets) {
      const createdAsset = await AssetsRepository.storeAsset(asset, transaction)
      if (createdAsset) {
        storedAssets.push(createdAsset)

        await AuctionAsset.create({ assetId: createdAsset.id, auctionId }, { transaction })
      }
    }
  }

  async generateVectorForAuction(auction: Partial<Auction>, transaction: Transaction) {
    const { mainCategoryId, subCategoryId } = auction
    const [mainCategory, subCategory] = await Promise.all([
      Category.findByPk(mainCategoryId, { transaction }),
      Category.findByPk(subCategoryId, { transaction }),
    ])

    try {
      return await VectorsManager.createAuctionVector(auction, mainCategory, subCategory)
    } catch (error) {
      console.error('Could not create auction vector', error)
      return {}
    }
  }
}

const auctionsRepositoryInstance = new AuctionsRepository()
Object.freeze(auctionsRepositoryInstance)

export { auctionsRepositoryInstance as AuctionsRepository }
