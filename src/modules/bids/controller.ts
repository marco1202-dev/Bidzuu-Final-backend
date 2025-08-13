import { Request, Response } from 'express'
import { GENERAL } from '../../constants/errors.js'
import { Auction } from '../auctions/model.js'
import { Bid } from './model.js'
import { BidRepository } from './repository.js'
import { FCMNotificationService } from '../../lib/notifications/index.js'
import { Account } from '../accounts/model.js'
import { WebSocketInstance } from '../../ws/instance.js'
import { WebsocketEvents } from '../../ws/socket-module.js'
import { AuctionsRepository } from '../auctions/repository.js'
import { HistoryEventTypes } from '../auxiliary-models/auction-history-events.js'
import { generateNameForAccount } from '../../lib/notifications/utils.js'
import { SettingsRepository } from '../settings/repository.js'
import { CurrenciesRepository } from '../currencies/repository.js'

export class BidsController {
  public static async delete(req: Request, res: Response) {
    const { account } = res.locals

    try {
      if (!account.email) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      const { bidId } = req.params
      const bid = await Bid.findByPk(bidId, { include: { model: Auction } })
      if (!bid || !bid.auction) {
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      if (bid.isAccepted || bid.isRejected) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      if (account.id !== bid.bidderId) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      await BidRepository.deleteBid(bid)

      FCMNotificationService.sendBidRemoved(bid.auctionId)
      return res.status(200).send({ success: true })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async markBidsFromAuctionAsSeen(req: Request, res: Response) {
    const { account } = res.locals
    const { auctionId } = req.params

    try {
      if (!account.email) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      const auction = await AuctionsRepository.findOne({
        where: { id: auctionId },
      })
      if (!auction) {
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      if (auction.accountId !== account.id) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      const updatedBids = await BidRepository.markBidsFromAuctionAsSeen(auctionId)
      if (!updatedBids.length) {
        return res.status(200).send({ success: true, message: 'No bids to update' })
      }

      FCMNotificationService.sendBidWasSeen(auctionId, updatedBids)

      return res.status(200).send()
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async update(req: Request, res: Response) {
    const { account } = res.locals
    const { bidId } = req.params
    const { isAccepted, isRejected, rejectionReason = '' } = req.body

    try {
      if (isAccepted === isRejected) {
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      const bid = await Bid.findByPk(bidId, {
        include: [{ model: Auction }],
      })
      if (!bid || !bid.auction) {
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }
      if (bid.auction.acceptedBidId || (bid.isRejected && isAccepted)) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      // Check if account is owner of auction
      if (account.id !== bid.auction.accountId) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      const socketInstance = WebSocketInstance.getInstance()

      if (isAccepted) {
        await BidRepository.acceptBid(bid)
        FCMNotificationService.sendBidAccepted(bid)

        socketInstance.sendEventToAccount(bid.bidderId, WebsocketEvents.BID_ACCEPTED, {
          ...bid.toJSON(),
        })

        AuctionsRepository.storeHistoryEvent(bid.auction.id, HistoryEventTypes.ACCEPT_BID)
      } else {
        await BidRepository.rejectBid(bid, rejectionReason)

        FCMNotificationService.sendBidRejected(bid)
        socketInstance.sendEventToAccount(bid.bidderId, WebsocketEvents.BID_REJECTED, {
          ...bid.toJSON(),
        })
        AuctionsRepository.storeHistoryEvent(bid.auction.id, HistoryEventTypes.REJECT_BID)
      }
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async create(req: Request, res: Response) {
    const { account } = res.locals
    const { auctionId } = req.params
    const { latLng = '[]', location, price, usedExchangeRateId, description = '' } = req.body
    let { initialCurrencyId } = req.body

    try {
      const existingAuction = await Auction.findByPk(auctionId)
      if (!existingAuction || !existingAuction.id) {
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      if (existingAuction.accountId === account.id) {
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      // If the auction already has an accepted bid or is expired, return 400
      if (existingAuction.acceptedBidId) {
        console.info(
          `[BID_CREATE] Auction ${auctionId} has already accepted bid. ${account?.id} tried to add bid.`
        )
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      const auctionIsExpired = existingAuction.expiresAt <= new Date()
      if (auctionIsExpired || existingAuction.acceptedBidId) {
        console.info(
          `[BID_CREATE] Auction ${auctionId} is expired or inactive. ${account?.id} tried to add bid.`
        )
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      const auctionOwnerAccount = await Account.findByPk(existingAuction.accountId)
      if (!auctionOwnerAccount) {
        return res.status(400).send({ error: GENERAL.BAD_REQUEST })
      }

      if (auctionOwnerAccount.blockedAccounts?.indexOf(account.id) !== -1) {
        console.info(`[BID_CREATE] Account ${account.id} is blocked by ${auctionOwnerAccount.id}`)
        return res.status(403).send({ error: GENERAL.FORBIDDEN })
      }

      const parsedLatLong = latLng === 'null' ? JSON.parse('[]') : JSON.parse(latLng || '[]')
      let latitude: number | null = null
      let longitude: number | null = null

      if (Array.isArray(parsedLatLong)) {
        ;[latitude, longitude] = parsedLatLong
      } else if (typeof parsedLatLong === 'object') {
        latitude = parsedLatLong.lat
        longitude = parsedLatLong.lng
      }

      if (!initialCurrencyId || initialCurrencyId === 'null' || !initialCurrencyId.length) {
        if (account.selectedCurrencyId) {
          initialCurrencyId = account.selectedCurrencyId
        } else {
          const settings = await SettingsRepository.get()
          initialCurrencyId = settings.defaultCurrencyId
        }
      }

      const initialPriceInDollars = await CurrenciesRepository.getPriceInDollars(
        price,
        initialCurrencyId
      )
      const newBid: Partial<Bid> = {
        locationLat: latitude,
        locationLong: longitude,
        locationPretty: location,
        bidderId: account.id,
        initialCurrencyId,
        initialPriceInDollars,
        usedExchangeRateId,
        price: price ? parseFloat((Math.round(price * 100) / 100).toFixed(2)) : null,
        auctionId,
        description,
      }

      const bid = await BidRepository.createBid(account.id, existingAuction, newBid)

      FCMNotificationService.sendNewBidOnAuction(existingAuction)
      FCMNotificationService.sendSomeoneElseAddedBidToAuction(existingAuction, account.id)
      FCMNotificationService.sendNewBidOnFavouriteAuction(account, existingAuction)

      AuctionsRepository.storeHistoryEvent(auctionId, HistoryEventTypes.PLACE_BID, {
        accountName: generateNameForAccount(account),
        accountId: account.id,
      })
      return res.status(200).json(bid)
    } catch (error) {
      console.error(`Could not create bid: `, error)
      if (error.message === GENERAL.NOT_ENOUGH_COINS) {
        return res.status(400).send({ error: GENERAL.NOT_ENOUGH_COINS })
      }

      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }
}
