import { Router } from 'express'
import { AuctionsController } from '../../modules/auctions/controller.js'
import { HttpIPRateLimiter } from '../middlewares/ip_rate_limiter.js'

const locationsRouter = Router()
locationsRouter.use(HttpIPRateLimiter.limitRequestsForUser)

locationsRouter.get('/all', AuctionsController.getAllLocations)

export { locationsRouter }
