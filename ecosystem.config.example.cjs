module.exports = {
  apps: [
    {
      name: 'Biddo',
      script: './dist/index.js',
      env: {
        APP_ENV: 'production',
        NODE_ENV: 'production',
        PORT: 7777,
        APP_VERSION: '1.0.0',
        POSTGRES_SERVER: 'YOU_POSTGRES_SERVER',
        POSTGRES_PORT_EXTERNAL: '5432',
        POSTGRES_USER: 'YOUR_POSTGRES_USER',
        POSTGRES_PASSWORD: 'YOUR_POSTGRES_PASSWORD',
        POSTGRES_DB: 'YOUR_POSTGRES_DB',
        POSTGRES_CONNECTION_MAX_POOL: '90',
        PAYPAL_CLIENT_ID: '',
        PAYPAL_CLIENT_SECRET: '',
        FORCE_PAYPAL_SANDBOX: 'false',
        SEQUELIZE_DEBUG: '0',
        GCLOUD_STORAGE_BUCKET: 'YOUR_GCLOUD_STORAGE_BUCKET_IF_USED',
        ADMIN_ENABLED: true,
        ADMIN_EMAIL: 'admin@biddo.com',
        ADMIN_PASSWORD: 'password',
        READONLY_EMAIL: 'test@biddo.com',
        READONLY_PASSWORD: 'password',
        ADMIN_COOKIE_PASSWORD: 'mycustomwebhooksecret1',
        RUN_IN_DEMO_MODE: false, // If this is true, the server will automatically create auctions, for demo purposes. More info in the `src/crons/default-auctions` file
        DEMO_MAIN_ACCOUNT_EMAIL: 'test@test.com',
        WEB_APP_URL: 'http://localhost:3000', // Replace this with your web app URL
        STRIPE_SECRET_KEY: '', // Replace this with your Stripe secret key
        STRIPE_WEBHOOK_SIGNING_SECRET: '', // Replace this with your Stripe webhook signing secret
        STRIPE_PRODUCT_50_COINS: '', // Replace this with your Stripe product ID for 50 coins
        STRIPE_PRODUCT_200_COINS: '', // Replace this with your Stripe product ID for 200 coins
        STRIPE_PRODUCT_500_COINS: '', // Replace this with your Stripe product ID for 500 coins
        VAPID_PUBLIC_KEY: '', // Replace this with your VAPID public key
        VAPID_PRIVATE_KEY: '', // Replace this with your VAPID private key
        SUPPORT_EMAIL: '', // Replace this with your support email
        GOOGLE_MAPS_API_KEY: '', // Replace this with your Google Maps API key
        OPENAI_API_KEY: '', // Replace this with your OpenAI API key
      },
    },
  ],
}
