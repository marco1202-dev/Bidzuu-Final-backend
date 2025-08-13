// This cron will run every hour, checking if the last exchange rate is older than
// 12 hours. If it is, it will try to fetch the exchange rates from two URL:
// - https://open.er-api.com/v6/latest
// - https://api.frankfurter.app/latest?base=usd
// If the first URL does not return any data, it will try the second one.
// If both URLs do not return any data, it will not update the exchange rate.

import { schedule } from 'node-cron'
import { ExchangeRatesRepository } from '../modules/exchange-rates/repository.js'
import { ExchangeRate } from '../modules/exchange-rates/model.js'
import { CurrenciesRepository } from '../modules/currencies/repository.js'
import { WebSocketInstance } from '../ws/instance.js'
import { WebsocketEvents } from '../ws/socket-module.js'
import { deleteDataFromCache } from '../api/middlewares/cache.js'
import { EXCHANGE_RATES_CACHE_KEY } from '../modules/exchange-rates/controller.js'
import { config } from '../config.js'
export const runFetchExchangeRatesCron = () => {
  console.log('Running fetch exchange rates cron')
  // wait for 5 seconds before running the cron
  setTimeout(() => {
    fetchExchangeRates()
  }, 5000)

  schedule('0 * * * *', () => {
    console.log('Running fetch exchange rates cron')
    fetchExchangeRates()
  })
}

const fetchExchangeRates = async () => {
  const [lastExchangeRate, count] = await Promise.all([
    ExchangeRatesRepository.getLatest(),
    ExchangeRatesRepository.count(),
  ])

  if (lastExchangeRate) {
    const lastExchangeRateDate = new Date(lastExchangeRate.ratesDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - lastExchangeRateDate.getTime())
    const diffHours = Math.round(diffTime / (1000 * 60 * 60))
    if (diffHours < 12) {
      return
    }

    // If we added an exchange rate in the last 12 hours, we should not fetch a new one
    const lastAddedDate = new Date(lastExchangeRate.createdAt)
    const addedDiffTime = Math.abs(now.getTime() - lastAddedDate.getTime())
    const addedDiffHours = Math.round(addedDiffTime / (1000 * 60 * 60))
    if (addedDiffHours < 12 && count > 1) {
      console.log('Last exchange rate was added in the last 12 hours, skipping')
      return
    }
  }

  try {
    console.log('Attempting to fetch exchange rates from Open Exchange Rates API...')
    let exchangeRate = await fetchOpenExchangeRates()
    if (!exchangeRate) {
      console.log('Open Exchange Rates API failed, trying Frankfurter API...')
      exchangeRate = await fetchFrankfurterExchangeRates()
    }

    if (!exchangeRate) {
      console.log('Frankfurter API failed, trying ExchangeRate-API as fallback...')
      exchangeRate = await fetchExchangeRateAPI()
    }

    if (!exchangeRate) {
      console.error('All exchange rate APIs failed. Exchange rates will not be updated.')
      return
    }

    console.log('Successfully fetched exchange rates from API')

    // If the date difference between the last exchange rate and the current exchangeRate is not more than 12 hours, we should not update the exchange rate
    if (
      exchangeRate.ratesDate.getFullYear() === lastExchangeRate?.ratesDate.getFullYear() &&
      exchangeRate.ratesDate.getMonth() === lastExchangeRate?.ratesDate.getMonth() &&
      exchangeRate.ratesDate.getDate() === lastExchangeRate?.ratesDate.getDate()
    ) {
      console.log('Exchange rate is from the same day as the last one, skipping')
      return
    }

    await exchangeRate.save()
    console.log('Exchange rates updated successfully')

    deleteDataFromCache(EXCHANGE_RATES_CACHE_KEY)
    const socketInstance = WebSocketInstance.getInstance()
    socketInstance.sendEventToAllAccounts(WebsocketEvents.NEW_EXCHANGE_RATE, {
      ...exchangeRate.toJSON(),
    })
  } catch (error) {
    console.error('Error fetching exchange rates:', error)
  }
}

const fetchOpenExchangeRates = async () => {
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.EXCHANGE_RATES.REQUEST_TIMEOUT) // 10 second timeout

    const response = await fetch(config.EXCHANGE_RATES.OPEN_EXCHANGE_RATES_URL, {
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    // Check if response is ok
    if (!response.ok) {
      console.error(`Open exchange rates API returned status: ${response.status} ${response.statusText}`)
      return null
    }

    // Check content type to ensure we're getting JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`Open exchange rates API returned non-JSON content: ${contentType}`)
      // Log the first few characters of the response to debug
      const textResponse = await response.text()
      console.error(`Response preview: ${textResponse.substring(0, 200)}...`)
      return null
    }

    const data = (await response.json()) as {
      result: string
      data: string
      time_last_update_utc: string
      base_code: string
      rates: Record<string, number>
    }

    if (data.result !== 'success') {
      throw new Error(`Open exchange rates result is not success: ${data}`)
    }

    if (data.base_code !== 'USD') {
      throw new Error(`Open exchange rates base code is not USD: ${data}`)
    }

    const currencies = await CurrenciesRepository.getAll()
    const usdCurrency = currencies.find((currency) => currency.code === 'USD')
    if (!usdCurrency) {
      throw new Error('USD currency not found')
    }

    const exchangeRate = new ExchangeRate({
      ratesDate: new Date(data.time_last_update_utc),
      rates: data.rates,
      baseCurrencyId: usdCurrency.id,
    })

    return exchangeRate
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Open exchange rates API request timed out after 10 seconds')
    } else {
      console.error('Error fetching open exchange rates:', error)
    }
    return null
  }
}

const fetchFrankfurterExchangeRates = async () => {
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.EXCHANGE_RATES.REQUEST_TIMEOUT) // 10 second timeout

    const response = await fetch(config.EXCHANGE_RATES.FRANKFURTER_URL, {
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    // Check if response is ok
    if (!response.ok) {
      console.error(`Frankfurter exchange rates API returned status: ${response.status} ${response.statusText}`)
      return null
    }

    // Check content type to ensure we're getting JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`Frankfurter exchange rates API returned non-JSON content: ${contentType}`)
      // Log the first few characters of the response to debug
      const textResponse = await response.text()
      console.error(`Response preview: ${textResponse.substring(0, 200)}...`)
      return null
    }

    const data = (await response.json()) as {
      base: string
      date: string
      rates: Record<string, number>
    }

    if (data.base !== 'USD') {
      throw new Error(`Frankfurter exchange rates base code is not USD: ${data}`)
    }

    const currencies = await CurrenciesRepository.getAll()
    const usdCurrency = currencies.find((currency) => currency.code === 'USD')
    if (!usdCurrency) {
      throw new Error('USD currency not found')
    }

    const exchangeRate = new ExchangeRate({
      ratesDate: new Date(data.date),
      rates: data.rates,
      baseCurrencyId: usdCurrency.id,
    })

    return exchangeRate
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Frankfurter exchange rates API request timed out after 10 seconds')
    } else {
      console.error('Error fetching frankfurter exchange rates:', error)
    }
    return null
  }
}

const fetchExchangeRateAPI = async () => {
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.EXCHANGE_RATES.REQUEST_TIMEOUT) // 10 second timeout

    const response = await fetch(config.EXCHANGE_RATES.EXCHANGE_RATE_API_URL, {
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    // Check if response is ok
    if (!response.ok) {
      console.error(`ExchangeRate-API returned status: ${response.status} ${response.statusText}`)
      return null
    }

    // Check content type to ensure we're getting JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`ExchangeRate-API returned non-JSON content: ${contentType}`)
      // Log the first few characters of the response to debug
      const textResponse = await response.text()
      console.error(`Response preview: ${textResponse.substring(0, 200)}...`)
      return null
    }

    const data = (await response.json()) as {
      base: string
      date: string
      rates: Record<string, number>
    }

    if (data.base !== 'USD') {
      throw new Error(`ExchangeRate-API base code is not USD: ${data.base}`)
    }

    const currencies = await CurrenciesRepository.getAll()
    const usdCurrency = currencies.find((currency) => currency.code === 'USD')
    if (!usdCurrency) {
      throw new Error('USD currency not found')
    }

    const exchangeRate = new ExchangeRate({
      ratesDate: new Date(data.date),
      rates: data.rates,
      baseCurrencyId: usdCurrency.id,
    })

    return exchangeRate
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('ExchangeRate-API request timed out after 10 seconds')
    } else {
      console.error('Error fetching ExchangeRate-API:', error)
    }
    return null
  }
}
