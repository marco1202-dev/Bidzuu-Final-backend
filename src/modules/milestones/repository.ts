import { GenericRepository } from '../../lib/base-repository.js'
import { Milestone } from './model.js'
import { Transaction } from 'sequelize'
import { Account } from '../accounts/model.js'
import { Auction } from '../auctions/model.js'
import { Currency } from '../currencies/model.js'

class MilestoneRepository extends GenericRepository<Milestone> {
  constructor() {
    super(Milestone)
  }

  public async createMilestone(milestoneData: {
    auctionId: string
    buyerId: string
    sellerId: string
    amount: number
    currencyId: string
    paymentTransactionId: string
    paymentMethod: 'stripe' | 'paypal' | 'razorpay'
    description?: string
    dueDate?: Date
  }) {
    return await Milestone.create(milestoneData)
  }

  public async getByPaymentTransactionId(transactionId: string) {
    return await Milestone.findOne({
      where: { paymentTransactionId: transactionId },
    })
  }

  public async getByAuctionId(auctionId: string) {
    return await Milestone.findOne({
      where: { auctionId },
      include: [
        { model: Account, as: 'buyer' },
        { model: Account, as: 'seller' },
        { model: Currency, as: 'currency' },
      ],
    })
  }

  public async getByBuyerId(buyerId: string) {
    return await Milestone.findAll({
      where: { buyerId },
      include: [
        { model: Auction, as: 'auction' },
        { model: Currency, as: 'currency' },
      ],
      order: [['createdAt', 'DESC']],
    })
  }

  public async getBySellerId(sellerId: string) {
    return await Milestone.findAll({
      where: { sellerId },
      include: [
        { model: Auction, as: 'auction' },
      ],
      order: [['createdAt', 'DESC']],
    })
  }

  public async confirmMilestone(milestoneId: string, transaction?: Transaction) {
    return await Milestone.update(
      {
        status: 'confirmed',
        confirmedAt: new Date(),
      },
      {
        where: { id: milestoneId },
        transaction,
      }
    )
  }

  public async releaseMilestone(milestoneId: string, transaction?: Transaction) {
    return await Milestone.update(
      {
        status: 'released',
        releasedAt: new Date(),
      },
      {
        where: { id: milestoneId },
        transaction,
      }
    )
  }

  public async disputeMilestone(milestoneId: string, reason: string, transaction?: Transaction) {
    return await Milestone.update(
      {
        status: 'disputed',
        disputeReason: reason,
      },
      {
        where: { id: milestoneId },
        transaction,
      }
    )
  }

  public async cancelMilestone(milestoneId: string, transaction?: Transaction) {
    return await Milestone.update(
      {
        status: 'cancelled',
      },
      {
        where: { id: milestoneId },
        transaction,
      }
    )
  }

  public async getPendingMilestones() {
    return await Milestone.findAll({
      where: { status: 'pending' },
      include: [
        { model: Auction, as: 'auction' },
        { model: Account, as: 'buyer' },
        { model: Account, as: 'seller' },
        { model: Currency, as: 'currency' },
      ],
      order: [['createdAt', 'ASC']],
    })
  }

  public async getConfirmedMilestones() {
    return await Milestone.findAll({
      where: { status: 'confirmed' },
      include: [
        { model: Auction, as: 'auction' },
        { model: Account, as: 'buyer' },
        { model: Account, as: 'seller' },
        { model: Currency, as: 'currency' },
      ],
      order: [['confirmedAt', 'ASC']],
    })
  }
}

const milestoneRepositoryInstance = new MilestoneRepository()
Object.freeze(milestoneRepositoryInstance)

export { milestoneRepositoryInstance as MilestoneRepository }
