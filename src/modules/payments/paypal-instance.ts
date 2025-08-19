import checkoutNodeJssdk from '@paypal/checkout-server-sdk'
import { WebPaymentProductsRepository } from '../web-payment-products/repository.js'
import { Currency } from '../currencies/model.js'
import { CurrenciesRepository } from '../currencies/repository.js'
import { config } from '../../config.js'
import { Account } from '../accounts/model.js'
import { PaymentsRepository } from './repository.js'
import { PAYPAL_ALLOWED_CURRENCIES } from '../../constants/paypal.js'
import { SettingsRepository } from '../settings/repository.js'
import { MilestoneRepository } from '../milestones/repository.js'
import { Auction } from '../auctions/model.js'

const configureEnvironment = (clientId: string, clientSecret: string) => {
  const isSandbox = process.env.FORCE_PAYPAL_SANDBOX?.toString() === 'true'

  return process.env.NODE_ENV === 'production' && !isSandbox
    ? new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret)
    : new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret)
}

class PaypalInstance {
  async getPaypal() {
    const settings = await SettingsRepository.get()
    const paypalClientId = settings?.paypalClientId || config.PAYPAL.CLIENT_ID
    const paypalClientSecret = settings?.paypalClientSecret || config.PAYPAL.CLIENT_SECRET
    if (!paypalClientId || !paypalClientSecret) {
      console.error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are not provided')
      return null
    }
    return new checkoutNodeJssdk.core.PayPalHttpClient(
      configureEnvironment(paypalClientId, paypalClientSecret)
    )
  }

  async capturePayment(orderId: string) {
    const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId)
    const paypal = await this.getPaypal()
    if (!paypal) {
      console.error('Paypal client not found')
    }

    const capture = await paypal.execute(request)

    const purchaseUnit = capture.result.purchase_units[0]
    const customId = purchaseUnit?.payments?.captures?.[0]?.custom_id || 'N/A'
    const [accountId, secondId, currencyId] = customId.split('__')
    const amount = parseFloat(purchaseUnit?.payments?.captures?.[0]?.amount?.value || 0)

    const account = await Account.findByPk(accountId)
    if (!account) {
      throw new Error('Account not found')
    }

    const currency = await Currency.findByPk(currencyId)
    if (!currency) {
      throw new Error('Currency not found')
    }

    // Check if this is an auction payment by trying to find an auction first
    const auction = await Auction.findByPk(secondId)

    if (auction) {
      // This is an auction payment - create a milestone
      await MilestoneRepository.createMilestone({
        auctionId: secondId,
        buyerId: accountId,
        sellerId: auction.accountId,
        amount: amount,
        currencyId,
        paymentTransactionId: orderId,
        paymentMethod: 'paypal',
        description: `Payment for auction: ${auction.title}`,
      })
    } else {
      // This is a regular payment (coin package)
      const product = await WebPaymentProductsRepository.getById(secondId)
      if (!product) {
        throw new Error('Product not found')
      }

      await PaymentsRepository.handleProviderPayment({
        accountId,
        productId: secondId,
        currencyId,
        store: 'paypal',
        transactionId: orderId,
        paidAmount: amount,
        createdAt: new Date(),
      })
    }
  }

  async createPaymentSession(accountId: string, productId: string, currencyId: string) {
    const paypal = await this.getPaypal()
    if (!paypal) {
      console.error('Paypal client not found')
      return null
    }

    const product = await WebPaymentProductsRepository.getById(productId)
    if (!product) {
      throw new Error('Product not found')
    }

    const currency = await Currency.findByPk(currencyId)
    if (!currency) {
      throw new Error('Currency not found')
    }

    let integerPrice = 0
    const currencyIsAllowed = PAYPAL_ALLOWED_CURRENCIES.includes(currency.code)
    if (!currencyIsAllowed) {
      integerPrice = Math.floor(product.priceInUSD)
    } else {
      const priceInPurchasedCurrency = await CurrenciesRepository.getPriceInCurrency(
        product.priceInUSD,
        currencyId
      )

      integerPrice = Math.floor(priceInPurchasedCurrency)
    }

    let dollarCurrency = null
    if (!currencyIsAllowed) {
      dollarCurrency = await CurrenciesRepository.getUSDCurrency()
    }

    const settings = await SettingsRepository.get()
    const webAppUrl = settings?.webAppUrl || config.WEB_APP_URL

    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest()
    request.headers['prefer'] = 'return=representation'
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            value: integerPrice.toString(),
            currency_code: currencyIsAllowed ? currency.code || 'USD' : 'USD',
          },
          custom_id: `${accountId}__${productId}__${currencyIsAllowed ? currencyId : dollarCurrency?.id
            }`,
        },
      ],
      application_context: {
        return_url: `${webAppUrl}/payment-success`,
        cancel_url: webAppUrl,
      },
    })

    const order = await paypal.execute(request)
    if (order.statusCode !== 201) {
      throw new Error('Some Error Occured at backend')
    }

    const approvalUrl = order.result.links.find((link) => link.rel === 'approve').href
    return approvalUrl
  }

  async createAuctionPaymentSession(accountId: string, auctionId: string, amount: number, currencyId: string) {
    const paypal = await this.getPaypal()
    if (!paypal) {
      console.error('Paypal client not found')
      return null
    }

    const currency = await Currency.findByPk(currencyId)
    if (!currency) {
      throw new Error('Currency not found')
    }

    let integerAmount = 0
    const currencyIsAllowed = PAYPAL_ALLOWED_CURRENCIES.includes(currency.code)
    if (!currencyIsAllowed) {
      integerAmount = Math.floor(amount)
    } else {
      integerAmount = Math.floor(amount)
    }

    let dollarCurrency = null
    if (!currencyIsAllowed) {
      dollarCurrency = await CurrenciesRepository.getUSDCurrency()
    }

    const settings = await SettingsRepository.get()
    const webAppUrl = settings?.webAppUrl || config.WEB_APP_URL

    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest()
    request.headers['prefer'] = 'return=representation'
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            value: integerAmount.toString(),
            currency_code: currencyIsAllowed ? currency.code || 'USD' : 'USD',
          },
          custom_id: `${accountId}__${auctionId}__${currencyIsAllowed ? currencyId : dollarCurrency?.id
            }`,
        },
      ],
      application_context: {
        return_url: `${webAppUrl}/auction/${auctionId}/success`,
        cancel_url: `${webAppUrl}/auction/${auctionId}`,
      },
    })

    const order = await paypal.execute(request)
    if (order.statusCode !== 201) {
      throw new Error('Some Error Occured at backend')
    }

    const approvalUrl = order.result.links.find((link) => link.rel === 'approve').href
    return approvalUrl
  }
}

const paypalInstance = new PaypalInstance()
Object.freeze(paypalInstance)

export { paypalInstance as PaypalInstance }
