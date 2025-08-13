import { Request, Response } from 'express'
import { GENERAL } from '../../constants/errors.js'
import { AccountsRepository } from './repository.js'
import { FollowersRepository } from '../followers/repository.js'
import { getAuth } from 'firebase-admin/auth'
import { AuctionsRepository } from '../auctions/repository.js'
import { ReviewRepository } from '../reviews/repository.js'
import { Account } from './model.js'
import { FiltersRepository } from '../filters/repository.js'

export class AccountsController {
  public static async getAuthenticated(req: Request, res: Response) {
    try {
      const authenticatedAccount = res.locals.account
      const [followedByAccountsIds, followingAccountsIds, filters] = await Promise.all([
        FollowersRepository.getFollowersAccountIds(authenticatedAccount.id),
        FollowersRepository.getFollowingAccountIds(authenticatedAccount.id),
        FiltersRepository.findAll({
          where: { accountId: authenticatedAccount.id },
        }),
      ])

      authenticatedAccount.filters = filters
      authenticatedAccount.followedByAccountsIds = followedByAccountsIds
      authenticatedAccount.followingAccountsIds = followingAccountsIds
      if (authenticatedAccount.rawEmail) {
        authenticatedAccount.email = authenticatedAccount.rawEmail
      }

      const extraInfo = await AccountsController.getExtraDetailsForAccount(authenticatedAccount.id)

      return res.json({ ...authenticatedAccount, ...extraInfo })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async search(req: Request, res: Response) {
    const { keyword, page = 1, perPage = 5 } = req.body
    if (!keyword) {
      res.status(500).send({ error: GENERAL.BAD_REQUEST })
      return
    }

    try {
      const accounts = await AccountsRepository.search({
        query: keyword,
        page: parseInt(page.toString()),
        perPage: parseInt(perPage.toString()),
      })

      return res.status(200).json(accounts)
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getStats(req: Request, res: Response) {
    const { account } = res.locals
    try {
      const stats = await AccountsRepository.getStats(account.id)
      return res.status(200).json(stats)
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getDetails(req: Request, res: Response) {
    const { accountId } = req.params
    try {
      if (!accountId || accountId === 'null' || accountId === 'undefined') {
        return res.status(400).json({ error: GENERAL.BAD_REQUEST })
      }

      const promises = [
        AccountsRepository.getOneWithDetails(accountId),
        AuctionsRepository.loadFilteredAuctions(
          [],
          [],
          [],
          true,
          {
            perPage: 8,
            page: 0,
            query: '',
          },
          undefined,
          undefined,
          undefined,
          accountId
        ),
      ]

      const [account, auctions] = await Promise.all(promises)
      const extraInfo = await AccountsController.getExtraDetailsForAccount(accountId)

      const result = {
        ...(account as Account)?.toJSON(),
        auctions,
        ...extraInfo,
      }

      const fieldsToDelete = [
        'allowedNotifications',
        'acceptedTermsAndCondition',
        'blockedAccounts',
        'deficeFCMToken',
        'categoriesSetupDone',
        'coins',
        'email',
        'preferredCategoriesIds',
        'identities',
      ]

      fieldsToDelete.forEach((field) => {
        delete result[field]
      })

      return res.status(200).json({
        ...(account as Account).toJSON(),
        auctions,
        ...extraInfo,
      })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async blockAccount(req: Request, res: Response) {
    const { account } = res.locals
    const { accountId } = req.params

    try {
      await AccountsRepository.blockAccount(account.id, accountId)
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async unblockAccount(req: Request, res: Response) {
    const { account } = res.locals
    const { accountId } = req.params

    try {
      await AccountsRepository.unblockAccount(account.id, accountId)
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async requestVerification(req: Request, res: Response) {
    const { account } = res.locals

    try {
      const alreadyAsked = await AccountsRepository.hasVerificationRequest(account.id)
      if (alreadyAsked) {
        return res.status(400).json({ error: 'Already requested' })
      }

      await AccountsRepository.requestVerification(account.id)
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async deleteAccountData(req: Request, res: Response) {
    const { account } = res.locals

    try {
      await AccountsRepository.deleteAccountData(account.id)

      try {
        const firebaseAuth = getAuth()
        await firebaseAuth.deleteUser(account.authId)
      } catch (error) {
        console.error('Could not delete firebase user: ', error)
      }

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error(`Could not delete account: ${account.id}`, error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async update(req: Request, res: Response) {
    try {
      const files = req.files as Express.Multer.File[]
      const profileAsset = files?.length ? files[0] : null

      const {
        name = '',
        locationLatLng,
        locationPretty,
        acceptedTermsAndCondition,
        introDone,
        introSkipped,
        picture,
        deviceFCMToken,
        selectedCurrencyId,
        categoriesSetupDone,
      } = req.body

      const meta =
        req.body.meta && typeof req.body.meta === 'string'
          ? JSON.parse(req.body.meta)
          : req.body.meta

      const [latitude = null, longitude = null] =
        locationLatLng && locationLatLng !== 'null' ? JSON.parse(locationLatLng || '[]') : []

      const allowedNotifications =
        req.body.allowedNotifications && typeof req.body.allowedNotifications === 'string'
          ? JSON.parse(req.body.allowedNotifications)
          : req.body.allowedNotifications ?? {}

      const preferredCategoriesIds =
        req.body.preferredCategoriesIds &&
        typeof req.body.preferredCategoriesIds === 'string' &&
        req.body.preferredCategoriesIds.startsWith('[')
          ? JSON.parse(req.body.preferredCategoriesIds)
          : req.body.preferredCategoriesIds && typeof req.body.preferredCategoriesIds === 'string'
          ? [req.body.preferredCategoriesIds]
          : req.body.preferredCategoriesIds ?? []

      if (allowedNotifications) {
        Object.keys(allowedNotifications).forEach((key) => {
          allowedNotifications[key] =
            allowedNotifications[key] === 'true' || allowedNotifications[key] === true
        })
      }

      const updatedAccount = await AccountsRepository.updateWithPreferences(
        {
          id: res.locals.account.id,
          name,
          ...(meta ? { meta } : {}),
          allowedNotifications,
          locationPretty,
          acceptedTermsAndCondition,
          introDone,
          introSkipped,
          deviceFCMToken,
          locationLat: latitude,
          locationLong: longitude,
          ...(selectedCurrencyId && { selectedCurrencyId }),
          preferredCategoriesIds: preferredCategoriesIds ? [].concat(preferredCategoriesIds) : [],
          ...(categoriesSetupDone !== undefined && categoriesSetupDone !== null
            ? { categoriesSetupDone }
            : {}),
          ...(picture && { picture }),
        },
        profileAsset
      )

      return res.status(200).json(updatedAccount)
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  private static async getExtraDetailsForAccount(accountId: string) {
    const countPromises = [
      ReviewRepository.getReviewsStatsForAccount(accountId),
      AuctionsRepository.applyFilterQueryOverAuctions({
        categories: [],
        subCategories: [],
        locationIds: [],
        activeOnly: true,
        accountId,
      }),
    ]

    const [reviewsCount, activeAuctionsCount] = await Promise.all(countPromises)

    const followersStats = await FollowersRepository.getStatsForAccount(accountId)
    const reviewAverage = reviewsCount[0].toJSON()

    return {
      ...followersStats,
      reviewsCount: reviewAverage.count,
      reviewsAverage: reviewAverage.averageStars,
      activeAuctionsCount: (activeAuctionsCount as { count: number }).count,
    }
  }
}
