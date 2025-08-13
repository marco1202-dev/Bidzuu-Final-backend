import { Request, Response } from 'express'
import { GENERAL } from '../../constants/errors.js'
import { Favourite } from './model.js'
import { Auction } from '../auctions/model.js'
import { FavouritesRepository } from './repository.js'
import { FCMNotificationService } from '../../lib/notifications/index.js'
import { AuctionsRepository } from '../auctions/repository.js'
import { generateNameForAccount } from '../../lib/notifications/utils.js'
import { HistoryEventTypes } from '../auxiliary-models/auction-history-events.js'

export class FavouritesController {
  public static async loadForAccount(req: Request, res: Response) {
    const { account } = res.locals

    try {
      const auctions = await FavouritesRepository.getFavouritesByAccountId(account.id)
      return res.status(200).json(auctions)
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getAccountsWhoAddedAuctionToFavourites(req: Request, res: Response) {
    const { auctionId, page, perPage } = req.params

    try {
      if (!auctionId) {
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      const auction = await Auction.findByPk(auctionId)
      if (!auction) {
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      const accounts = await FavouritesRepository.getAccountsWhoAddedAuctionToFavourites(
        auctionId,
        page ? parseInt(page) : 0,
        perPage ? parseInt(perPage) : 20
      )
      return res.status(200).json(accounts)
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async addToFavourites(req: Request, res: Response) {
    const { account } = res.locals
    const { auctionId } = req.params

    try {
      if (!auctionId) {
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      const auction = await Auction.findByPk(auctionId)
      if (!auction) {
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      await FavouritesRepository.create({ accountId: account.id, auctionId })
      if (account.email) {
        FCMNotificationService.sendAuctionAddedToFavourites(account, auction)
      }

      AuctionsRepository.storeHistoryEvent(auctionId, HistoryEventTypes.ADD_TO_FAVORITES, {
        accountName: generateNameForAccount(account),
        accountId: account.id,
      })

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async removeFromFavourites(req: Request, res: Response) {
    const { account } = res.locals
    const { auctionId } = req.params

    try {
      if (!auctionId) {
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      await Favourite.destroy({ where: { accountId: account.id, auctionId } })

      AuctionsRepository.storeHistoryEvent(auctionId, HistoryEventTypes.REMOVE_FROM_FAVORITES, {
        accountName: generateNameForAccount(account),
        accountId: account.id,
      })
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }
}
