import { Request, Response } from 'express'
import { GENERAL } from '../../constants/errors.js'
import { OffersRepository } from './repository.js'
import { WebSocketInstance } from '../../ws/instance.js'
import { WebsocketEvents } from '../../ws/socket-module.js'
import { FCMNotificationService } from '../../lib/notifications/index.js'

export class OffersController {
  public static async submitOffer(req: Request, res: Response) {
    const { account } = res.locals
    const { auctionId, amount, message, currencyId } = req.body

    try {
      // Validate required fields
      if (!auctionId || !amount || !currencyId) {
        return res.status(400).send({ error: 'Missing required fields' })
      }

      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).send({ error: 'Invalid offer amount' })
      }

      // Validate offer message length if provided
      if (message && message.length > 500) {
        return res.status(400).send({ error: 'Offer message cannot exceed 500 characters' })
      }

      // Create the offer
      const offer = await OffersRepository.createOffer({
        auctionId,
        offererId: account.id,
        amount,
        message,
        currencyId,
      })

      // Get the auction to find the owner
      const { Auction } = await import('../auctions/model.js')
      const auction = await Auction.findByPk(auctionId)

      // Send notification to auction owner
      await FCMNotificationService.sendNewOfferOnAuction(auction, account.id, amount, message)

      // Send websocket event to auction owner
      const socketInstance = WebSocketInstance.getInstance()
      socketInstance.sendEventToAccount(auction.accountId, WebsocketEvents.OFFER_RECEIVED, {
        offer: offer.toJSON(),
      })

      return res.status(201).json({
        success: true,
        offer: offer.toJSON(),
      })
    } catch (error) {
      console.error('Error submitting offer:', error)
      if (error.message.includes('not found')) {
        return res.status(404).send({ error: error.message })
      }
      if (error.message.includes('must be at least') || error.message.includes('cannot exceed')) {
        return res.status(400).send({ error: error.message })
      }
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getOffersForAuction(req: Request, res: Response) {
    const { auctionId } = req.params
    const { account } = res.locals

    try {
      // Get the auction to check ownership
      const { Auction } = await import('../auctions/model.js')
      const auction = await Auction.findByPk(auctionId)

      if (!auction) {
        return res.status(404).send({ error: 'Auction not found' })
      }

      // Only auction owner can see offers
      if (auction.accountId !== account.id) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      const offers = await OffersRepository.getOffersForAuction(auctionId)
      return res.status(200).json({ offers })
    } catch (error) {
      console.error('Error getting offers for auction:', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getOffersByOfferer(req: Request, res: Response) {
    const { account } = res.locals

    try {
      const offers = await OffersRepository.getOffersByOfferer(account.id)
      return res.status(200).json({ offers })
    } catch (error) {
      console.error('Error getting offers by offerer:', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async acceptOffer(req: Request, res: Response) {
    const { account } = res.locals
    const { offerId } = req.params

    try {
      // Get the offer to check auction ownership
      const { Offer } = await import('./model.js')
      const offer = await Offer.findByPk(offerId, {
        include: [{ model: (await import('../auctions/model.js')).Auction, as: 'auction' }],
      })

      if (!offer) {
        return res.status(404).send({ error: 'Offer not found' })
      }

      // Only auction owner can accept offers
      if (offer.auction.accountId !== account.id) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      // Accept the offer
      const acceptedOffer = await OffersRepository.acceptOffer(offerId)

      // Send notification to offerer
      await FCMNotificationService.sendOfferAccepted(acceptedOffer)

      // Send websocket event to offerer
      const socketInstance = WebSocketInstance.getInstance()
      socketInstance.sendEventToAccount(acceptedOffer.offererId, WebsocketEvents.OFFER_ACCEPTED, {
        offer: acceptedOffer.toJSON(),
      })

      return res.status(200).json({
        success: true,
        message: 'Offer accepted successfully',
        offer: acceptedOffer.toJSON(),
      })
    } catch (error) {
      console.error('Error accepting offer:', error)
      if (error.message.includes('not found')) {
        return res.status(404).send({ error: error.message })
      }
      if (error.message.includes('not pending')) {
        return res.status(400).send({ error: error.message })
      }
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async rejectOffer(req: Request, res: Response) {
    const { account } = res.locals
    const { offerId } = req.params
    const { rejectionReason } = req.body

    try {
      // Get the offer to check auction ownership
      const { Offer } = await import('./model.js')
      const offer = await Offer.findByPk(offerId, {
        include: [{ model: (await import('../auctions/model.js')).Auction, as: 'auction' }],
      })

      if (!offer) {
        return res.status(404).send({ error: 'Offer not found' })
      }

      // Only auction owner can reject offers
      if (offer.auction.accountId !== account.id) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      // Reject the offer
      const rejectedOffer = await OffersRepository.rejectOffer(offerId, rejectionReason)

      // Send notification to offerer
      await FCMNotificationService.sendOfferRejected(rejectedOffer)

      // Send websocket event to offerer
      const socketInstance = WebSocketInstance.getInstance()
      socketInstance.sendEventToAccount(rejectedOffer.offererId, WebsocketEvents.OFFER_REJECTED, {
        offer: rejectedOffer.toJSON(),
      })

      return res.status(200).json({
        success: true,
        offer: rejectedOffer.toJSON(),
      })
    } catch (error) {
      console.error('Error rejecting offer:', error)
      if (error.message.includes('not found')) {
        return res.status(404).send({ error: error.message })
      }
      if (error.message.includes('not pending')) {
        return res.status(400).send({ error: error.message })
      }
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async counterOffer(req: Request, res: Response) {
    const { account } = res.locals
    const { offerId } = req.params
    const { counterAmount, counterMessage } = req.body

    try {
      // Validate required fields
      if (!counterAmount || typeof counterAmount !== 'number' || counterAmount <= 0) {
        return res.status(400).send({ error: 'Invalid counter offer amount' })
      }

      // Validate counter offer message length if provided
      if (counterMessage && counterMessage.length > 500) {
        return res.status(400).send({ error: 'Counter offer message cannot exceed 500 characters' })
      }

      // Get the offer to check auction ownership
      const { Offer } = await import('./model.js')
      const offer = await Offer.findByPk(offerId, {
        include: [{ model: (await import('../auctions/model.js')).Auction, as: 'auction' }],
      })

      if (!offer) {
        return res.status(404).send({ error: 'Offer not found' })
      }

      // Only auction owner can counter offers
      if (offer.auction.accountId !== account.id) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      // Counter the offer
      const counteredOffer = await OffersRepository.counterOffer(
        offerId,
        counterAmount,
        counterMessage
      )

      // Send notification to offerer
      await FCMNotificationService.sendOfferCountered(counteredOffer)

      // Send websocket event to offerer
      const socketInstance = WebSocketInstance.getInstance()
      socketInstance.sendEventToAccount(counteredOffer.offererId, WebsocketEvents.OFFER_COUNTERED, {
        offer: counteredOffer.toJSON(),
      })

      return res.status(200).json({
        success: true,
        offer: counteredOffer.toJSON(),
      })
    } catch (error) {
      console.error('Error countering offer:', error)
      if (error.message.includes('not found')) {
        return res.status(404).send({ error: error.message })
      }
      if (error.message.includes('not pending')) {
        return res.status(400).send({ error: error.message })
      }
      if (error.message.includes('must be at least') || error.message.includes('cannot exceed')) {
        return res.status(400).send({ error: error.message })
      }
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }
}
