import sequelize from 'sequelize'
import { GenericRepository } from '../../lib/base-repository.js'
import { Account } from '../accounts/model.js'
import { Review } from './model.js'
import { Asset } from '../assets/model.js'

class ReviewRepository extends GenericRepository<Review> {
  constructor() {
    super(Review)
  }

  public getReviewsStatsForAccount(accountId: string) {
    return Review.findAll({
      where: { toAccountId: accountId },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('stars')), 'averageStars'],
        [sequelize.fn('COUNT', sequelize.col('stars')), 'count'],
      ],
    })
  }

  public async getReceivedByAccount(accountId: string, page: number, perPage: number) {
    return Review.findAll({
      where: { toAccountId: accountId },
      include: [
        {
          model: Account,
          as: 'reviewer',
          attributes: ['id', 'picture', 'name', 'email', 'verified'],
          include: [{ model: Asset, as: 'asset' }],
        },
      ],
      limit: perPage,
      offset: page * perPage,
      order: [['createdAt', 'DESC']],
    })
  }

  public async createOrUpdate(review: Partial<Review>) {
    const { id, stars, description, fromAccountId, toAccountId, auctionId } = review
    if (id) {
      const [, reviews] = await this.update({ id }, { stars, description })
      return reviews[0]
    }

    const actuallyExists = await Review.findOne({
      where: {
        fromAccountId,
        toAccountId,
        auctionId,
      },
    })

    if (actuallyExists) {
      const [, reviews] = await this.update({ id: actuallyExists.id }, { stars, description })
      return reviews[0]
    }

    if (!id) {
      return await this.create(review)
    }
  }
}

const reviewRepositoryInstance = new ReviewRepository()
Object.freeze(reviewRepositoryInstance)

export { reviewRepositoryInstance as ReviewRepository }
