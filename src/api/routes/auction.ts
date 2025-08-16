import multer from 'multer'
import { Router } from 'express'
import { Authenticator } from '../middlewares/auth.js'
import { HttpRateLimiter } from '../middlewares/rate-limiter.js'
import { AuctionsController } from '../../modules/auctions/controller.js'
import { valdiateFilesInRequest } from '../middlewares/upload.js'
import { validateHttpRequest } from '../middlewares/validate-request.js'
import { auctionValidation } from '../../modules/auctions/validation.js'
import { HttpIPRateLimiter } from '../middlewares/ip_rate_limiter.js'
import { cacheMiddleware } from '../middlewares/cache.js'

const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for video files
  },
})

const auctionRouter = Router()

auctionRouter.get('/latest', HttpIPRateLimiter.limitRequestsForUser, AuctionsController.getLatest)
auctionRouter.get(
  '/details/:auctionId',
  HttpIPRateLimiter.limitRequestsForUser,
  await Authenticator.tryToAuthenticateHttp(),
  AuctionsController.getDetails
)
auctionRouter.get(
  '/summary/:auctionId',
  HttpIPRateLimiter.limitRequestsForUser,
  cacheMiddleware,
  AuctionsController.getSummary
)
auctionRouter.get(
  '/search/:keyword/:page/:perPage',
  HttpIPRateLimiter.limitRequestsForUser,
  AuctionsController.search
)
auctionRouter.get(
  '/byLocationProximity/:lat/:lng/:mainCategoryId/:distance',
  HttpIPRateLimiter.limitRequestsForUser,
  AuctionsController.getByLocationProximity
)
auctionRouter.get(
  '/translate/:auctionId/:lang',
  HttpIPRateLimiter.limitRequestsForUser,
  AuctionsController.translateAuctionDetails
)

auctionRouter.post(
  '/summary/many',
  HttpIPRateLimiter.limitRequestsForUser,
  AuctionsController.getManySummary
)
auctionRouter.post(
  '/byAccount/active/:accountId',
  HttpIPRateLimiter.limitRequestsForUser,
  AuctionsController.getActiveByAccount
)
auctionRouter.post(
  '/byAccount/active/count/:accountId',
  HttpIPRateLimiter.limitRequestsForUser,
  AuctionsController.countActiveByAccount
)
auctionRouter.post(
  '/filter/count',
  HttpIPRateLimiter.limitRequestsForUser,
  AuctionsController.countFilteredAuctions
)
auctionRouter.post(
  '/filter/auctions',
  HttpIPRateLimiter.limitRequestsForUser,
  AuctionsController.loadFilteredAuctions
)
auctionRouter.post(
  '/all/account/:status',
  await Authenticator.authenticateHttp(),
  HttpRateLimiter.limitRequestsForUser,
  AuctionsController.getAllForAccountByStatus
)
auctionRouter.post(
  '/all/account/:status/count',
  await Authenticator.authenticateHttp(),
  HttpRateLimiter.limitRequestsForUser,
  AuctionsController.countForAccountByStatus
)
auctionRouter.post(
  '/byBid/:status',
  await Authenticator.authenticateHttp(),
  HttpRateLimiter.limitRequestsForUser,
  AuctionsController.getAuctionsByBidStatus
)
auctionRouter.post(
  '/byBid/:status/count',
  await Authenticator.authenticateHttp(),
  HttpRateLimiter.limitRequestsForUser,
  AuctionsController.countAuctionsByBidStatus
)
auctionRouter.post(
  '/',
  await Authenticator.authenticateHttp(),
  HttpRateLimiter.limitRequestsForUser,
  upload.array('files'),
  valdiateFilesInRequest,
  validateHttpRequest(auctionValidation.createOrUpdate),
  AuctionsController.create
)

auctionRouter.put(
  '/promote/:auctionId',
  await Authenticator.authenticateHttp(),
  HttpRateLimiter.limitRequestsForUser,
  AuctionsController.promoteAuction
)
auctionRouter.put(
  '/:auctionId',
  await Authenticator.authenticateHttp(),
  HttpRateLimiter.limitRequestsForUser,
  upload.array('files'),
  valdiateFilesInRequest,
  validateHttpRequest(auctionValidation.createOrUpdate),
  AuctionsController.update
)

auctionRouter.delete(
  '/:auctionId',
  await Authenticator.authenticateHttp(),
  HttpRateLimiter.limitRequestsForUser,
  AuctionsController.delete
)

export { auctionRouter }
