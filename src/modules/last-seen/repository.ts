import { Transaction } from 'sequelize'
import { DatabaseConnection } from '../../database/index.js'
import { GenericRepository } from '../../lib/base-repository.js'
import { PaginatedQueryParams } from '../../types.js'
import { AuctionsRepository } from '../auctions/repository.js'
import { LastSeenAuction } from './model.js'

class LastSeenAuctionsRepository extends GenericRepository<LastSeenAuction> {
  constructor() {
    super(LastSeenAuction)
  }

  public async getLastSeenByAccount(accountId: string, paginationParams: PaginatedQueryParams) {
    const { page, perPage } = paginationParams

    const auctionIds = await LastSeenAuction.findAll({
      where: { accountId },
      order: [['updatedAt', 'DESC']],
      limit: perPage,
      offset: page * perPage,
      attributes: ['auctionId'],
    })

    return AuctionsRepository.findByIds(auctionIds.map((auction) => auction.auctionId))
  }

  public async storeLastSeenAuction(accountId: string, auctionId: string) {
    return await DatabaseConnection.getInstance().transaction(async (transaction: Transaction) => {
      // remove the last seen auction if it exists
      await LastSeenAuction.destroy({
        where: { accountId, auctionId },
        transaction,
      })

      // store the new last seen auction
      await LastSeenAuction.create(
        {
          accountId,
          auctionId,
          lastSeenAt: new Date(),
        },
        { transaction }
      )
    })
  }
}

const lastSeenAuctionRepositoryInstance = new LastSeenAuctionsRepository()
Object.freeze(lastSeenAuctionRepositoryInstance)

export { lastSeenAuctionRepositoryInstance as LastSeenAuctionsRepository }
