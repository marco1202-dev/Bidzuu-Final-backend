import { Router } from 'express'
import { VerificationRequestsController } from '../../modules/verification-requests/controller.js'
import { Authenticator } from '../middlewares/auth.js'
import { HttpRateLimiter } from '../middlewares/rate-limiter.js'

const verificationRequestsRouter = Router()

// Submit verification request (authenticated users)
verificationRequestsRouter.post(
  '/submit',
  await Authenticator.authenticateHttp(),
  HttpRateLimiter.limitRequestsForUser,
  VerificationRequestsController.submitVerificationRequest
)

// Get pending verification requests (admin only)
verificationRequestsRouter.get(
  '/pending',
  await Authenticator.authenticateHttp(),
  HttpRateLimiter.limitRequestsForUser,
  VerificationRequestsController.getPendingVerificationRequests
)

// Get specific verification request (admin only)
verificationRequestsRouter.get(
  '/:id',
  await Authenticator.authenticateHttp(),
  HttpRateLimiter.limitRequestsForUser,
  VerificationRequestsController.getVerificationRequestById
)

// Update verification request status (admin only)
verificationRequestsRouter.put(
  '/:id/status',
  await Authenticator.authenticateHttp(),
  HttpRateLimiter.limitRequestsForUser,
  VerificationRequestsController.updateVerificationRequestStatus
)

export default verificationRequestsRouter
