import { Router } from 'express'
import { MilestoneController } from '../../modules/milestones/controller.js'
import { Authenticator } from '../middlewares/auth.js'

const milestonesRouter = Router()

// Apply authentication middleware to all routes
milestonesRouter.use(await Authenticator.authenticateHttp())

// Get all milestones for the authenticated user
milestonesRouter.get('/', MilestoneController.getMilestones)

// Get a specific milestone
milestonesRouter.get('/:milestoneId', MilestoneController.getMilestone)

// Confirm milestone (seller only)
milestonesRouter.post('/:milestoneId/confirm', MilestoneController.confirmMilestone)

// Release milestone (buyer only)
milestonesRouter.post('/:milestoneId/release', MilestoneController.releaseMilestone)

// Dispute milestone
milestonesRouter.post('/:milestoneId/dispute', MilestoneController.disputeMilestone)

// Cancel milestone (buyer only)
milestonesRouter.post('/:milestoneId/cancel', MilestoneController.cancelMilestone)

export { milestonesRouter }
