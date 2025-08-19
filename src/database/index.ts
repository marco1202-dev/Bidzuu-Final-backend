import { Sequelize } from 'sequelize'
import { config } from '../config.js'
import { Account } from '../modules/accounts/model.js'
import { Auction } from '../modules/auctions/model.js'
import { Asset } from '../modules/assets/model.js'
import { AuctionAsset } from '../modules/auxiliary-models/auction-assets.js'
import { Category } from '../modules/categories/model.js'
import { Location } from '../modules/auxiliary-models/location.js'
import { Bid } from '../modules/bids/model.js'
import { Favourite } from '../modules/favourites/model.js'
import { Follower } from '../modules/followers/model.js'
import { Notification } from '../modules/notifications/model.js'
import { Review } from '../modules/reviews/model.js'
import { SearchHistoryItem } from '../modules/search-history/model.js'
import { Report } from '../modules/reports/model.js'
import { ChatGroup } from '../modules/chat/model.js'
import { ChatMessage } from '../modules/auxiliary-models/chat-message.js'
import { LastSeenAuction } from '../modules/last-seen/model.js'
import { FilterItem } from '../modules/filters/model.js'
import { AuctionSimilarity } from '../modules/auction-similarities/model.js'
import { Payment } from '../modules/payments/model.js'
import { Settings } from '../modules/settings/model.js'
import { RewardAd } from '../modules/ads/model.js'
import { NotificationContent } from '../modules/auxiliary-models/notification-content.js'
import { PushSubscription } from '../modules/auxiliary-models/push-subscription.js'
import { AuctionMapCluster } from '../modules/auction-map-clusters/model.js'
import { ChatGroupAuction } from '../modules/auction-similarities/chat-group-auctions.js'
import { AuctionHistoryEvent } from '../modules/auxiliary-models/auction-history-events.js'
import { Comment } from '../modules/comments/entity.js'
import { UserMessage } from '../modules/user-messages/model.js'
import { Currency } from '../modules/currencies/model.js'
import { ExchangeRate } from '../modules/exchange-rates/model.js'
import { WebPaymentProduct } from '../modules/web-payment-products/model.js'
import { TranslationCache } from '../modules/auxiliary-models/translations-cache.js'
import { AiResponse } from '../modules/auxiliary-models/ai-responses.js'
import { Offer } from '../modules/offers/model.js'
import { VerificationRequest } from '../modules/verification-requests/model.js'
import { Milestone } from '../modules/milestones/model.js'
let sequalizee

export const DatabaseConnection = {
  init(databaseConfig) {
    if (sequalizee) {
      throw new Error('Sequelize already initialized')
    }

    sequalizee = new Sequelize(databaseConfig)
  },

  async syncLatestModels() {
    if (config.APP_ENV !== 'test') {
      throw new Error('Use migrations when on environment different than the test one')
    }

    await sequalizee.sync()
  },

  getInstance() {
    return sequalizee
  },

  initializeModels() {
    const models = [
      Account,
      Auction,
      Asset,
      AuctionAsset,
      Category,
      Location,
      Bid,
      Favourite,
      Follower,
      Notification,
      Review,
      SearchHistoryItem,
      Report,
      ChatGroup,
      ChatMessage,
      LastSeenAuction,
      FilterItem,
      AuctionSimilarity,
      Payment,
      Settings,
      RewardAd,
      NotificationContent,
      PushSubscription,
      AuctionMapCluster,
      ChatGroupAuction,
      AuctionHistoryEvent,
      Comment,
      UserMessage,
      Currency,
      ExchangeRate,
      WebPaymentProduct,
      TranslationCache,
      AiResponse,
      Offer,
      VerificationRequest,
      Milestone,
    ]
    models.forEach((model) => model.initModel())
    models.forEach((model) => model.initAssociations())
  },
}
