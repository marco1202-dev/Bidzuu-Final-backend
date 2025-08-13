import { Router } from 'express'
import { Authenticator } from '../middlewares/auth.js'
import { HttpRateLimiter } from '../middlewares/rate-limiter.js'
import { LastSeenAuctionsController } from '../../modules/last-seen/controller.js'

const lastSeenAuctionsRouter = Router()
lastSeenAuctionsRouter.use(await Authenticator.authenticateHttp())
lastSeenAuctionsRouter.use(HttpRateLimiter.limitRequestsForUser)

lastSeenAuctionsRouter.get(
  '/:page/:perPage',
  LastSeenAuctionsController.getLastSeenByAccount
)

lastSeenAuctionsRouter.post('/', LastSeenAuctionsController.storeLastSeen)

export { lastSeenAuctionsRouter }
