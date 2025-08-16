import * as dotenv from 'dotenv'
dotenv.config()

// function getDomainExtension(url) {
//   try {
//     const { hostname } = new URL(url)

//     // Split the hostname by dots
//     const parts = hostname.split('.')

//     // Handle cases like "www.google.com" and "google.com"
//     if (parts.length > 2) {
//       return parts.slice(-2).join('.')
//     }

//     return hostname
//   } catch (error) {
//     console.error('Invalid URL:', error)
//     return null
//   }
// }

export const config = {
  APP_ENV: process.env.APP_ENV,
  APP_VERSION: process.env.APP_VERSION,
  PORT: process.env.PORT,
  AUCTION_ACTIVE_TIME_IN_HOURS: 96,
  RATE_LIMIT_PER_SECOND: 100,
  IP_RATE_LIMIT_PER_SECOND: 20,
  MAX_ALLOWED_ASSETS: 10,
  MAX_ASSET_SIZE: 100 * 1024 * 1024, //100MB (increased for video support)
  WEB_APP_URL: process.env.WEB_APP_URL,
  ALLOW_HEADERS:
    'Authorization, Origin, sentry-trace, X-Requested-With, Content-Type, Accept, X-App-Id, X-App-Secret, X-Access-Token, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Invitation-Token',
  ALLOW_METHODS: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  ALLOW_ORIGIN: true, // Allow all origins
  PAYMENT_AUTH_KEY: process.env.PAYMENT_AUTH_KEY,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  OPENAI: {
    API_KEY: process.env.OPENAI_API_KEY || '',
  },
  ADMIN: {
    ENABLED: process.env.ADMIN_ENABLED ?? true,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    READONLY_EMAIL: process.env.READONLY_EMAIL,
    READONLY_PASSWORD: process.env.READONLY_PASSWORD,
    COOKIE_PASSWORD: process.env.ADMIN_COOKIE_PASSWORD ?? 'mycustomcookiepassword',
  },
  PAYMENT_PRODUCTS: [
    {
      coins: 50,
      products: [].concat(process.env.PAYMENT_PRODUCT_50_COINS?.split(',')),
    },
    {
      coins: 200,
      products: [].concat(process.env.PAYMENT_PRODUCT_200_COINS?.split(',')),
    },
    {
      coins: 500,
      products: [].concat(process.env.PAYMENT_PRODUCT_500_COINS?.split(',')),
    },
  ],
  STRIPE: {
    SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    WEBHOOK_SIGNING_SECRET: process.env.STRIPE_WEBHOOK_SIGNING_SECRET,
  },
  PAYPAL: {
    CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
  },
  RAZORPAY: {
    KEY_ID: process.env.RAZORPAY_KEY_ID,
    SECRET_KEY: process.env.RAZORPAY_SECRET_KEY,
    WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  PROMOTE_AUCTION_COINS_COST: 50,
  DATABASE: {
    POSTGRES_SERVER: process.env.POSTGRES_SERVER,
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_DB: process.env.POSTGRES_DB,
    POSTGRES_PORT: process.env.POSTGRES_PORT_EXTERNAL,
    POSTGRES_CONNECTION_MAX_POOL: +process.env.POSTGRES_CONNECTION_MAX_POOL,
    SEQUELIZE_DEBUG: +process.env.SEQUELIZE_DEBUG,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    ALLOW_ADMIN_SSL: process.env.ALLOW_ADMIN_SSL ?? true,
  },
  GCLOUD_STORAGE: {
    BUCKET: process.env.GCLOUD_STORAGE_BUCKET,
    PROJECT_ID: process.env.GCLOUD_STORAGE_PROJECT_ID,
    KEY_FILE: process.env.GCLOUD_STORAGE_KEY_FILE,
    // Additional Google Cloud Storage configuration
    CREDENTIALS_PATH: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'service-account.json',
    REGION: process.env.GCLOUD_STORAGE_REGION || 'us-central1',
    // Storage class and lifecycle settings
    STORAGE_CLASS: process.env.GCLOUD_STORAGE_CLASS || 'STANDARD',
    // Cache control settings
    CACHE_CONTROL: process.env.GCLOUD_STORAGE_CACHE_CONTROL || 'public, max-age=172800',
    // Public access settings
    PUBLIC_ACCESS: process.env.GCLOUD_STORAGE_PUBLIC_ACCESS === 'true',
  },
  EXCHANGE_RATES: {
    OPEN_EXCHANGE_RATES_URL: process.env.OPEN_EXCHANGE_RATES_URL || 'https://open.er-api.com/v6/latest',
    FRANKFURTER_URL: process.env.FRANKFURTER_URL || 'https://api.frankfurter.app/latest?base=usd',
    EXCHANGE_RATE_API_URL: process.env.EXCHANGE_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest/USD',
    REQUEST_TIMEOUT: parseInt(process.env.EXCHANGE_RATES_TIMEOUT) || 10000, // 10 seconds default
  },
  AWS_STORAGE: {
    BUCKET: process.env.AWS_STORAGE_BUCKET,
    REGION: process.env.AWS_STORAGE_REGION,
    ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  },
  // General storage configuration
  STORAGE: {
    // Default storage provider (google, aws, disk)
    DEFAULT_PROVIDER: process.env.STORAGE_DEFAULT_PROVIDER || 'google',
    // File size limits
    MAX_FILE_SIZE: parseInt(process.env.STORAGE_MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    // Allowed file types
    ALLOWED_FILE_TYPES: process.env.STORAGE_ALLOWED_FILE_TYPES?.split(',') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'heic', 'heif', 'heics', 'heifs', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp', 'ogv', 'ts', 'mts', 'm2ts', 'vob', 'asf', 'rm', 'rmvb', 'divx', 'xvid', 'h264', 'h265', 'hevc', 'vp8', 'vp9', 'av1'],
    // Image compression settings
    COMPRESS_IMAGES: process.env.STORAGE_COMPRESS_IMAGES !== 'false',
    // Image quality (1-100)
    IMAGE_QUALITY: parseInt(process.env.STORAGE_IMAGE_QUALITY) || 80,
  },
  WEB_PUSH: {
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,
  },
}
