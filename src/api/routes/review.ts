import { Router } from 'express'
import { Authenticator } from '../middlewares/auth.js'
import { HttpRateLimiter } from '../middlewares/rate-limiter.js'
import { ReviewsController } from '../../modules/reviews/controller.js'
import { HttpIPRateLimiter } from '../middlewares/ip_rate_limiter.js'

const reviewRouter = Router()

reviewRouter.get(
  '/:page/:perPage',
  await Authenticator.authenticateHttp(),
  HttpRateLimiter.limitRequestsForUser,
  ReviewsController.getForLoggedInAccount
)
reviewRouter.get(
  '/:accountId',
  HttpIPRateLimiter.limitRequestsForUser,
  ReviewsController.getReceivedForAccount
)
reviewRouter.get(
  '/:accountId/:page/:perPage',
  HttpIPRateLimiter.limitRequestsForUser,
  ReviewsController.getReceivedForAccount
)

reviewRouter.get(
  '/translate/review/:reviewId/:lang',
  HttpIPRateLimiter.limitRequestsForUser,
  ReviewsController.translateReviewDetails
)

reviewRouter.post(
  '/',
  await Authenticator.authenticateHttp(),
  HttpRateLimiter.limitRequestsForUser,
  ReviewsController.createOrUpdate
)

export { reviewRouter }
