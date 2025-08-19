import { Request, Response } from 'express'
import { MilestoneRepository } from './repository.js'
import { GENERAL } from '../../constants/errors.js'
import { DatabaseConnection } from '../../database/index.js'
import { Transaction } from 'sequelize'

export class MilestoneController {
  public static async getMilestones(req: Request, res: Response) {
    try {
      const { account } = res.locals
      const { type = 'all' } = req.query

      let milestones
      switch (type) {
        case 'buyer':
          milestones = await MilestoneRepository.getByBuyerId(account.id)
          break
        case 'seller':
          milestones = await MilestoneRepository.getBySellerId(account.id)
          break
        default:
          milestones = [
            ...(await MilestoneRepository.getByBuyerId(account.id)),
            ...(await MilestoneRepository.getBySellerId(account.id)),
          ]
          // Sort by creation date
          milestones.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }

      return res.status(200).json(milestones)
    } catch (error) {
      console.error('Error getting milestones:', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getMilestone(req: Request, res: Response) {
    try {
      const { milestoneId } = req.params
      const { account } = res.locals

      const milestone = await MilestoneRepository.getOneById(milestoneId)
      if (!milestone) {
        return res.status(404).send({ error: 'Milestone not found' })
      }

      // Check if user has access to this milestone
      if (milestone.buyerId !== account.id && milestone.sellerId !== account.id) {
        return res.status(403).send({ error: 'Access denied' })
      }

      return res.status(200).json(milestone)
    } catch (error) {
      console.error('Error getting milestone:', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async confirmMilestone(req: Request, res: Response) {
    try {
      const { milestoneId } = req.params
      const { account } = res.locals

      const milestone = await MilestoneRepository.getOneById(milestoneId)
      if (!milestone) {
        return res.status(404).send({ error: 'Milestone not found' })
      }

      // Only seller can confirm milestone
      if (milestone.sellerId !== account.id) {
        return res.status(403).send({ error: 'Only seller can confirm milestone' })
      }

      if (milestone.status !== 'pending') {
        return res.status(400).send({ error: 'Milestone cannot be confirmed in current status' })
      }

      await MilestoneRepository.confirmMilestone(milestoneId)

      return res.status(200).json({ success: true, message: 'Milestone confirmed successfully' })
    } catch (error) {
      console.error('Error confirming milestone:', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async releaseMilestone(req: Request, res: Response) {
    try {
      const { milestoneId } = req.params
      const { account } = res.locals

      const milestone = await MilestoneRepository.getOneById(milestoneId)
      if (!milestone) {
        return res.status(404).send({ error: 'Milestone not found' })
      }

      // Only buyer can release milestone
      if (milestone.buyerId !== account.id) {
        return res.status(403).send({ error: 'Only buyer can release milestone' })
      }

      if (milestone.status !== 'confirmed') {
        return res.status(400).send({ error: 'Milestone must be confirmed before release' })
      }

      // Use transaction to ensure data consistency
      await DatabaseConnection.getInstance().transaction(async (transaction: Transaction) => {
        await MilestoneRepository.releaseMilestone(milestoneId, transaction)

        // Here you would typically transfer the money to the seller
        // For now, we'll just mark it as released
        // In a real implementation, you'd integrate with your payment processor
        // to transfer the escrowed funds to the seller
      })

      return res.status(200).json({ success: true, message: 'Milestone released successfully' })
    } catch (error) {
      console.error('Error releasing milestone:', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async disputeMilestone(req: Request, res: Response) {
    try {
      const { milestoneId } = req.params
      const { reason } = req.body
      const { account } = res.locals

      if (!reason) {
        return res.status(400).send({ error: 'Dispute reason is required' })
      }

      const milestone = await MilestoneRepository.getOneById(milestoneId)
      if (!milestone) {
        return res.status(404).send({ error: 'Milestone not found' })
      }

      // Both buyer and seller can dispute
      if (milestone.buyerId !== account.id && milestone.sellerId !== account.id) {
        return res.status(403).send({ error: 'Access denied' })
      }

      if (milestone.status !== 'pending' && milestone.status !== 'confirmed') {
        return res.status(400).send({ error: 'Milestone cannot be disputed in current status' })
      }

      await MilestoneRepository.disputeMilestone(milestoneId, reason)

      return res.status(200).json({ success: true, message: 'Milestone disputed successfully' })
    } catch (error) {
      console.error('Error disputing milestone:', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async cancelMilestone(req: Request, res: Response) {
    try {
      const { milestoneId } = req.params
      const { account } = res.locals

      const milestone = await MilestoneRepository.getOneById(milestoneId)
      if (!milestone) {
        return res.status(404).send({ error: 'Milestone not found' })
      }

      // Only buyer can cancel milestone
      if (milestone.buyerId !== account.id) {
        return res.status(403).send({ error: 'Only buyer can cancel milestone' })
      }

      if (milestone.status !== 'pending') {
        return res.status(400).send({ error: 'Milestone cannot be cancelled in current status' })
      }

      // Use transaction to ensure data consistency
      await DatabaseConnection.getInstance().transaction(async (transaction: Transaction) => {
        await MilestoneRepository.cancelMilestone(milestoneId, transaction)

        // Here you would typically refund the buyer
        // For now, we'll just mark it as cancelled
        // In a real implementation, you'd integrate with your payment processor
        // to refund the escrowed funds to the buyer
      })

      return res.status(200).json({ success: true, message: 'Milestone cancelled successfully' })
    } catch (error) {
      console.error('Error cancelling milestone:', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }
}
