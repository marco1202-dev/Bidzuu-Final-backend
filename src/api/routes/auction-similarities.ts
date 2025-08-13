import { Router } from 'express'
import { Authenticator } from '../middlewares/auth.js'
import { HttpRateLimiter } from '../middlewares/rate-limiter.js'
import { AuctionSimilaritiesController } from '../../modules/auction-similarities/controller.js'
import { HttpIPRateLimiter } from '../middlewares/ip_rate_limiter.js'

const auctionSimilaritiesRouter = Router()

auctionSimilaritiesRouter.post(
  '/',
  await Authenticator.authenticateHttp(),
  HttpRateLimiter.limitRequestsForUser,
  AuctionSimilaritiesController.getRecommendations
)

auctionSimilaritiesRouter.post(
  '/similar',
  HttpIPRateLimiter.limitRequestsForUser,
  AuctionSimilaritiesController.getSimilarAuctions
)

export { auctionSimilaritiesRouter }
