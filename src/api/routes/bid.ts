import { Router } from 'express'
import { Authenticator } from '../middlewares/auth.js'
import { HttpRateLimiter } from '../middlewares/rate-limiter.js'
import { BidsController } from '../../modules/bids/controller.js'

const bidsRouter = Router()
bidsRouter.use(await Authenticator.authenticateHttp())
bidsRouter.use(HttpRateLimiter.limitRequestsForUser)

bidsRouter.post('/:auctionId', BidsController.create)

bidsRouter.put('/:bidId', BidsController.update)
bidsRouter.put(
  '/markBidsAsSeen/:auctionId',
  BidsController.markBidsFromAuctionAsSeen
)

bidsRouter.delete('/:bidId', BidsController.delete)

export { bidsRouter }
