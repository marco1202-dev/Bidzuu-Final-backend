import { Router } from 'express'
import { OffersController } from '../../modules/offers/controller.js'
import { Authenticator } from '../middlewares/auth.js'
import { HttpRateLimiter } from '../middlewares/rate-limiter.js'

const offersRouter = Router()

// All routes require authentication
offersRouter.use(await Authenticator.authenticateHttp())
offersRouter.use(HttpRateLimiter.limitRequestsForUser)

// Submit a new offer
offersRouter.post('/', OffersController.submitOffer)

// Get offers for a specific auction (auction owner only)
offersRouter.get('/auction/:auctionId', OffersController.getOffersForAuction)

// Get offers by the current user
offersRouter.get('/my-offers', OffersController.getOffersByOfferer)

// Accept an offer (auction owner only)
offersRouter.put('/:offerId/accept', OffersController.acceptOffer)

// Reject an offer (auction owner only)
offersRouter.put('/:offerId/reject', OffersController.rejectOffer)

// Counter an offer (auction owner only)
offersRouter.put('/:offerId/counter', OffersController.counterOffer)

export { offersRouter }
