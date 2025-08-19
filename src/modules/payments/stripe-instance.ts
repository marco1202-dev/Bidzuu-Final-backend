import Stripe from 'stripe'
import { config } from '../../config.js'
import { Currency } from '../currencies/model.js'
import { CurrenciesRepository } from '../currencies/repository.js'
import { WebPaymentProductsRepository } from '../web-payment-products/repository.js'
import { SettingsRepository } from '../settings/repository.js'

class StripeInstance {
  async getStripe() {
    const settings = await SettingsRepository.get()
    const stripe = new Stripe(settings?.stripeSecretKey || config.STRIPE.SECRET_KEY)
    return stripe
  }

  async createPaymentSession(accountId: string, productId: string, currencyId: string) {
    const product = await WebPaymentProductsRepository.getById(productId)
    if (!product) {
      throw new Error('Product not found')
    }

    const currency = await Currency.findByPk(currencyId)
    if (!currency) {
      throw new Error('Currency not found')
    }

    const priceInPurchasedCurrency = await CurrenciesRepository.getPriceInCurrency(
      product.priceInUSD,
      currencyId
    )

    const integerPrice = Math.floor(priceInPurchasedCurrency)

    const settings = await SettingsRepository.get()
    const webAppUrl = settings?.webAppUrl || config.WEB_APP_URL

    const stripe = await this.getStripe()
    return await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: currency.code || 'usd',
            product_data: {
              name: `${product.coinsNo} Coins Package`,
              description: 'Virtual currency purchase',
            },
            unit_amount: integerPrice * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${webAppUrl}`,
      cancel_url: `${webAppUrl}`,
      metadata: {
        accountId,
        productId,
        currencyId,
      },
    })
  }

  async createAuctionPaymentSession(accountId: string, auctionId: string, amount: number, currencyId: string) {
    const currency = await Currency.findByPk(currencyId)
    if (!currency) {
      throw new Error('Currency not found')
    }

    const integerAmount = Math.floor(amount)

    const settings = await SettingsRepository.get()
    const webAppUrl = settings?.webAppUrl || config.WEB_APP_URL

    const stripe = await this.getStripe()
    return await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: currency.code || 'usd',
            product_data: {
              name: `Auction Purchase`,
              description: 'Buy It Now auction purchase',
            },
            unit_amount: integerAmount * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${webAppUrl}/auction/${auctionId}/success`,
      cancel_url: `${webAppUrl}/auction/${auctionId}`,
      metadata: {
        accountId,
        auctionId,
        amount: amount.toString(),
        currencyId,
      },
    })
  }
}

const stripeInstance = new StripeInstance()
export { stripeInstance as StripeInstance }
