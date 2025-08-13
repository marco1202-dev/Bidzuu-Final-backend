import { Router } from 'express'
import { Authenticator } from '../middlewares/auth.js'
import { HttpRateLimiter } from '../middlewares/rate-limiter.js'
import { FavouritesController } from '../../modules/favourites/controller.js'

const favouriteRouter = Router()
favouriteRouter.use(await Authenticator.authenticateHttp())
favouriteRouter.use(HttpRateLimiter.limitRequestsForUser)

favouriteRouter.get('/', FavouritesController.loadForAccount)
favouriteRouter.get(
  '/accounts/:auctionId/:page/:perPage',
  FavouritesController.getAccountsWhoAddedAuctionToFavourites
)

favouriteRouter.put('/add/:auctionId', FavouritesController.addToFavourites)
favouriteRouter.put(
  '/remove/:auctionId',
  FavouritesController.removeFromFavourites
)

export { favouriteRouter }
