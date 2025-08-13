import { runAuctionMapClustersCron } from './auction-map-clusters.js'
import { runCloseExpiredAuctionsCron } from './close-auctions.js'
import { runCoinsRefundCron } from './coins-refund.js'
import { runDemoAuctionsCron } from './default-auctions/index.js'
import { runRemoveEmptyChatsCron } from './remove-empty-chats.js'
import { runStartAuctionsCron } from './start-auctions.js'
import { runFetchExchangeRatesCron } from './fetch-exchange-rates.js'
export const runAppCrons = async () => {
  await runAuctionMapClustersCron()
  runCoinsRefundCron()
  runDemoAuctionsCron()
  runCloseExpiredAuctionsCron()
  runRemoveEmptyChatsCron()
  runStartAuctionsCron()
  runFetchExchangeRatesCron()
}
