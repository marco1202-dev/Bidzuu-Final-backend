import { GenericRepository } from '../../lib/base-repository.js'
import { Account } from '../accounts/model.js'
import { Asset } from '../assets/model.js'
import { Auction } from '../auctions/model.js'
import { AuctionsRepository } from '../auctions/repository.js'
import { Favourite } from './model.js'

class FavouritesRepository extends GenericRepository<Favourite> {
  constructor() {
    super(Favourite)
  }

  public async getAccountsWhoAddedAuctionToFavourites(auctionId: string, page = 0, perPage = 20) {
    const favourites = await this.findAll({
      where: { auctionId },
      include: [
        {
          model: Account,
          as: 'account',
          attributes: ['id', 'name', 'email', 'picture', 'verified'],
          include: [{ model: Asset, as: 'asset' }],
        },
      ],
      offset: page * perPage,
      limit: perPage,
    })

    return favourites
      .map((favourite) => (favourite.account?.email ? favourite.account : null))
      .filter((el) => el)
  }

  public async getFavouriteAuctions(accountId: string) {
    return await this.findAll({
      where: { accountId },
      include: [
        {
          model: Auction,
          as: 'auction',
          attributes: ['id', 'vectors'],
        },
      ],
    })
  }

  public async getFavouritesByAccountId(accountId: string) {
    const auctionsForAccount = await this.findAll({ where: { accountId } })
    const auctionIds = auctionsForAccount.map((auction) => auction.auctionId)

    return AuctionsRepository.findByIds(auctionIds)
  }
}

const favouritesRepositoryInstance = new FavouritesRepository()
Object.freeze(favouritesRepositoryInstance)

export { favouritesRepositoryInstance as FavouritesRepository }
