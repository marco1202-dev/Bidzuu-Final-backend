import { GenericRepository } from '../../lib/base-repository.js'
import { VerificationRequest } from './model.js'
import { Account } from '../accounts/model.js'

class VerificationRequestsRepository extends GenericRepository<VerificationRequest> {
  constructor() {
    super(VerificationRequest)
  }

  public async createVerificationRequest(data: {
    accountId: string
    firstName: string
    lastName: string
    address: string
    city: string
    state: string
    zipCode: string
    mobileNumber: string
    dateOfBirth: string
    country: string
    idCardImageUrl: string
    extractedData?: Record<string, any>
  }): Promise<VerificationRequest> {
    return await VerificationRequest.create(data)
  }

  public async getPendingVerificationRequests(): Promise<VerificationRequest[]> {
    return await VerificationRequest.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: Account,
          as: 'account',
          attributes: ['id', 'name', 'email', 'picture'],
        },
      ],
      order: [['createdAt', 'DESC']],
    })
  }

  public async getVerificationRequestById(id: string): Promise<VerificationRequest | null> {
    return await VerificationRequest.findByPk(id, {
      include: [
        {
          model: Account,
          as: 'account',
          attributes: ['id', 'name', 'email', 'picture'],
        },
      ],
    })
  }

  public async updateVerificationRequestStatus(
    id: string,
    status: 'approved' | 'rejected',
    adminNotes?: string,
    reviewedBy?: string
  ): Promise<[number, VerificationRequest[]]> {
    return await VerificationRequest.update(
      {
        status,
        adminNotes,
        reviewedBy,
        reviewedAt: new Date(),
      },
      {
        where: { id },
        returning: true,
      }
    )
  }

  public async getVerificationRequestsByAccountId(accountId: string): Promise<VerificationRequest[]> {
    return await VerificationRequest.findAll({
      where: { accountId },
      order: [['createdAt', 'DESC']],
    })
  }

  public async hasPendingVerificationRequest(accountId: string): Promise<boolean> {
    const result = await VerificationRequest.findOne({
      where: { accountId, status: 'pending' },
    })
    return !!result
  }
}

export default new VerificationRequestsRepository()
