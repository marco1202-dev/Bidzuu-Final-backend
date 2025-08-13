import { Router } from 'express'
import { CurrenciesController } from '../../modules/currencies/controller.js'
import { HttpIPRateLimiter } from '../middlewares/ip_rate_limiter.js'

const currenciesRouter = Router()

currenciesRouter.get('/', HttpIPRateLimiter.limitRequestsForUser, CurrenciesController.getAll)

export { currenciesRouter }
