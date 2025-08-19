import { Request, Response } from 'express'
import { Op } from 'sequelize'

import { GENERAL } from '../../constants/errors.js'
import { Notification } from './model.js'
import { NotificationsRepository } from './repository.js'

export class NotificationsController {
  public static async getForAccount(req: Request, res: Response) {
    const { account } = res.locals
    const { page, perPage } = req.params

    try {
      const notifications =
        await NotificationsRepository.getNotificationsPaginated(
          account.id,
          page ? parseInt(page) : 0,
          perPage ? parseInt(perPage) : 20
        )

      return res.status(200).json(notifications)
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getUnreadNotificationsCount(req: Request, res: Response) {
    const { account } = res.locals

    try {
      const unreadNotificationsCount =
        await NotificationsRepository.getUnreadNotificationsCount(account.id)

      return res.status(200).json({ unreadNotificationsCount })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async markAsRead(req: Request, res: Response) {
    const { account } = res.locals
    const { notificationId } = req.params
    try {
      const notification = await Notification.findByPk(notificationId)
      if (!notification || notification.accountId !== account.id) {
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      notification.read = true
      notification.readAt = new Date()
      await notification.save()

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async markAllAsRead(req: Request, res: Response) {
    const { account } = res.locals

    try {
      await Notification.update(
        { read: true, readAt: new Date() },
        { where: { accountId: account.id } }
      )

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async createOfferNotification(req: Request, res: Response) {
    const { account } = res.locals
    const { auctionId, offerAmount, offerMessage } = req.body

    try {
      // Validate required fields
      if (!auctionId || !offerAmount || typeof offerAmount !== 'number' || offerAmount <= 0) {
        return res.status(400).send({ error: 'Invalid offer data' })
      }

      // Validate offer message length if provided
      if (offerMessage && offerMessage.length > 500) {
        return res.status(400).send({ error: 'Offer message cannot exceed 500 characters' })
      }

      // Get the auction to find the owner
      const { Auction } = await import('../../modules/auctions/model.js')
      const auction = await Auction.findByPk(auctionId)

      if (!auction) {
        return res.status(404).send({ error: 'Auction not found' })
      }

      // Ensure the person submitting the offer is not the auction owner
      if (auction.accountId === account.id) {
        return res.status(400).send({ error: 'Cannot submit offer on your own auction' })
      }

      // Ensure the auction allows offers
      if (!auction.allowOffers) {
        return res.status(400).send({ error: 'This auction does not allow offers' })
      }

      // Ensure the auction is not closed
      if (auction.markedAsClosedAt || auction.expiresAt < new Date()) {
        return res.status(400).send({ error: 'Cannot submit offer on closed auction' })
      }

      // Ensure the auction has started
      if (!auction.startedAt || auction.startedAt > new Date()) {
        return res.status(400).send({ error: 'Cannot submit offer on auction that has not started' })
      }

      // Ensure auction is not already sold
      if (auction.acceptedBidId) {
        return res.status(400).send({ error: 'Cannot submit offer on auction that has already been sold' })
      }

      // Validate offer amount is reasonable
      const minOfferAmount = auction.startingPrice * 0.1 // Minimum 10% of starting price
      const maxOfferAmount = auction.startingPrice * 10 // Maximum 10x starting price

      if (offerAmount < minOfferAmount) {
        return res.status(400).send({ error: `Offer amount must be at least ${minOfferAmount}` })
      }

      if (offerAmount > maxOfferAmount) {
        return res.status(400).send({ error: `Offer amount cannot exceed ${maxOfferAmount}` })
      }

      // Check if there are existing bids and ensure offer is competitive
      if (auction.bids && auction.bids.length > 0) {
        const highestBid = Math.max(...auction.bids.map(bid => bid.price || 0))
        if (offerAmount <= highestBid) {
          return res.status(400).send({ error: `Offer amount must be higher than the current highest bid (${highestBid})` })
        }
      }

      // Check if user has already submitted an offer recently (within last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const recentNotification = await Notification.findOne({
        where: {
          type: 'NEW_OFFER_ON_AUCTION',
          entityId: auctionId,
          initiatedByAccountId: account.id,
          createdAt: {
            [Op.gte]: oneHourAgo
          }
        }
      })

      if (recentNotification) {
        return res.status(429).send({ error: 'You have already submitted an offer recently. Please wait before submitting another.' })
      }

      // Get currency information
      const { Currency } = await import('../../modules/currencies/model.js')
      const currency = await Currency.findByPk(auction.initialCurrencyId)
      const currencySymbol = currency?.symbol || '$'

      // Create notification for the auction owner
      const notification = await Notification.create({
        accountId: auction.accountId,
        type: 'NEW_OFFER_ON_AUCTION',
        title: {
          en: 'New Offer Received',
          fr: 'Nouvelle offre reçue',
        },
        description: {
          en: `You received a new offer of ${currencySymbol}${offerAmount} on your auction${offerMessage ? `: "${offerMessage}"` : ''}`,
          fr: `Vous avez reçu une nouvelle offre de ${currencySymbol}${offerAmount} sur votre enchère${offerMessage ? `: "${offerMessage}"` : ''}`,
        },
        entityId: auctionId,
        read: false,
        initiatedByAccountId: account.id,
      })

      console.log(`Created offer notification for auction ${auctionId}, owner: ${auction.accountId}, offer: ${currencySymbol}${offerAmount}`)

      return res.status(201).json({ success: true, notificationId: notification.id })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }
}
