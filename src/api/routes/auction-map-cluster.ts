import { Router } from 'express'
import { HttpIPRateLimiter } from '../middlewares/ip_rate_limiter.js'
import { AuctionMapClustersController } from '../../modules/auction-map-clusters/controller.js'

const auctionMapClusterRouter = Router()

auctionMapClusterRouter.get(
  '/',
  HttpIPRateLimiter.limitRequestsForUser,
  AuctionMapClustersController.getAll
)

export { auctionMapClusterRouter }
