import { Request, Response } from 'express'
import { ReviewRepository } from './repository.js'
import { GENERAL } from '../../constants/errors.js'
import { AuctionsRepository } from '../auctions/repository.js'
import { BidRepository } from '../bids/repository.js'
import { FCMNotificationService } from '../../lib/notifications/index.js'
import { TranslationManager } from '../../lib/translation-manager.js'

export class ReviewsController {
  public static async getForLoggedInAccount(req: Request, res: Response) {
    const { account } = res.locals
    const { page = 0, perPage = 20 } = req.params

    try {
      const reviews = await ReviewRepository.getReceivedByAccount(
        account.id,
        parseInt(page.toString()),
        parseInt(perPage.toString())
      )
      return res.status(200).json(reviews)
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async translateReviewDetails(req: Request, res: Response) {
    const { reviewId, lang } = req.params
    try {
      const review = await ReviewRepository.getOneById(reviewId)
      if (!review) {
        return res.status(404).send({ error: GENERAL.NOT_FOUND })
      }

      if (!review.description?.length) {
        return res.status(200).json({ description: '' })
      }

      const translatedReview = await TranslationManager.translate(review.description, lang)
      return res.status(200).json({ description: translatedReview })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getReceivedForAccount(req: Request, res: Response) {
    const { accountId, page = 0, perPage = 20 } = req.params
    try {
      const reviews = await ReviewRepository.getReceivedByAccount(
        accountId,
        parseInt(page.toString()),
        parseInt(perPage.toString())
      )
      return res.status(200).json(reviews)
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async createOrUpdate(req: Request, res: Response) {
    const { account } = res.locals
    let { id } = req.body
    const { stars, description, auctionId } = req.body

    id = id ?? undefined

    try {
      if (!account.email) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      if (!auctionId) {
        return res.status(500).send({ error: GENERAL.BAD_REQUEST })
      }

      const auction = await AuctionsRepository.getOneById(auctionId)
      if (!auction) {
        return res.status(500).send({ error: GENERAL.BAD_REQUEST })
      }

      if (!auction.acceptedBidId) {
        return res.status(500).send({ error: GENERAL.BAD_REQUEST })
      }

      const acceptedBid = await BidRepository.getOneById(auction.acceptedBidId)
      if (!acceptedBid) {
        return res.status(500).send({ error: GENERAL.BAD_REQUEST })
      }

      if (acceptedBid.bidderId !== account.id && auction.accountId !== account.id) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      const isAuctionOwner = auction.accountId === account.id

      const review = await ReviewRepository.createOrUpdate({
        id,
        stars,
        description,
        auctionId,
        fromAccountId: account.id,
        toAccountId: isAuctionOwner ? acceptedBid.bidderId : auction.accountId,
      })

      if (!id) {
        FCMNotificationService.sendNewReview(
          isAuctionOwner ? acceptedBid.bidderId : auction.accountId
        )
      }

      return res.status(200).json(review)
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }
}
