import AdminJS from 'adminjs'
import AdminJSExpress from '@adminjs/express'
import Connect from 'connect-pg-simple'
import session from 'express-session'
// @ts-ignore
import * as AdminJSSequelize from '@adminjs/sequelize'
import { config } from '../config.js'
import componentLoader, { customComponents } from './component-loader.js'
import { Location } from '../modules/auxiliary-models/location.js'
import { createCategoryResource } from './resources/category.js'
import { createAssetResource } from './resources/asset.js'
import { createAccountResource } from './resources/account.js'
import { createAuctionResource } from './resources/auction.js'
import { createBidResource } from './resources/bid.js'
import { createNotificationResource } from './resources/notification.js'
import { createReviewResource } from './resources/review.js'
import { createFilterItemResource } from './resources/filter-item.js'
import { createSearchHistoryItemResource } from './resources/search-history-item.js'
import { createPaymentResource } from './resources/payment.js'
import { getCustomStyles } from './styles/custom.js'
import { loadDashboardData } from './utils/loaders.js'
import { createSettingsResource } from './resources/settings.js'
import { createNotificationsContentResource } from './resources/notifications-content.js'
import { createUserMessageResource } from './resources/user-messages.js'
import { createCurrenciesResource } from './resources/currencies.js'
import { createExchangeRatesResource } from './resources/exchange-rates.js'
import { createWebPaymentProductResource } from './resources/web-payment-products.js'

const DEFAULT_ADMIN = {
  email: config.ADMIN.ADMIN_EMAIL,
  password: config.ADMIN.ADMIN_PASSWORD,
  role: 'admin',
}

const DEFAULT_READONLY_ADMIN = {
  email: config.ADMIN.READONLY_EMAIL,
  password: config.ADMIN.READONLY_PASSWORD,
  role: 'readonly',
}

class AdminPanel {
  init(app) {
    app.set('trust proxy', 1)

    app.use((req, res, next) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      res.set('Pragma', 'no-cache')
      res.set('Expires', '0')
      next()
    })

    app.get('/styles.css', async (req, res) => {
      res.setHeader('Content-Type', 'text/css')
      const styles = getCustomStyles()
      res.send(styles)
    })

    AdminJS.registerAdapter({
      Resource: AdminJSSequelize.Resource,
      Database: AdminJSSequelize.Database,
    })

    const adminJS = new AdminJS({
      dashboard: {
        component: customComponents.DashboardPage,
        handler: loadDashboardData,
      },
      branding: {
        companyName: 'BidZuu',
        withMadeWithLove: false,
        logo: 'assets/logo.png',
        favicon: 'https://cdn.tanna.app/biddo/logo.png',
      },
      assets: {
        styles: [
          '/styles.css',
          'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
        ],
      },
      locale: {
        language: 'en',
        availableLanguages: ['en'],
        translations: {
          en: {
            resources: {
              accounts: {
                properties: {
                  acceptedTermsAndCondition: 'Accepted Terms',
                },
              },
            },
          },
        },
      },
      componentLoader,
      resources: [
        {
          resource: Location,
          options: {
            navigation: false,
          },
        },
        createSettingsResource(),
        createNotificationsContentResource(),
        createAssetResource(),
        createAccountResource(),
        createAuctionResource(),
        createBidResource(),
        createCategoryResource(),
        createNotificationResource(),
        createReviewResource(),
        createFilterItemResource(),
        createSearchHistoryItemResource(),
        createCurrenciesResource(),
        createExchangeRatesResource(),
        createPaymentResource(),
        createUserMessageResource(),
        createWebPaymentProductResource(),
      ],
    })

    if (process.env.NODE_ENV !== 'production') {
      adminJS.watch()
    }

    const ConnectSession = Connect(session)
    const dbConfig = {
      user: config.DATABASE.POSTGRES_USER,
      host: config.DATABASE.POSTGRES_SERVER,
      database: config.DATABASE.POSTGRES_DB,
      password: config.DATABASE.POSTGRES_PASSWORD,
      ...(config.DATABASE.ALLOW_ADMIN_SSL?.toString()?.toLowerCase() === 'true'
        ? { ssl: process.env.NODE_ENV === 'production' ? true : false }
        : {}),
    }

    const sessionStore = new ConnectSession({
      conObject: dbConfig,
      tableName: 'session',
      createTableIfMissing: true,
    })

    const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
      adminJS,
      {
        authenticate: async (email, password) => {
          if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
            return { email, role: DEFAULT_ADMIN.role }
          }

          if (
            email === DEFAULT_READONLY_ADMIN.email &&
            password === DEFAULT_READONLY_ADMIN.password
          ) {
            return { email, role: DEFAULT_READONLY_ADMIN.role }
          }

          return null
        },
        cookiePassword: config.ADMIN.COOKIE_PASSWORD,
      },
      null,
      {
        store: sessionStore,
        resave: true,
        saveUninitialized: true,
        secret: config.ADMIN.COOKIE_PASSWORD,
        name: 'Biddo Admin',
      }
    )
    app.use(adminJS.options.rootPath, adminRouter)
  }
}

const adminPanelInstance = new AdminPanel()
export { adminPanelInstance as AdminPanel }
