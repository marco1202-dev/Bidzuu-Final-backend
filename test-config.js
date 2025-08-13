console.log('=== PAYMENT CONFIGURATION CHECK ===\n');

const paymentVars = {
  'PAYMENT_AUTH_KEY': 'Payment authentication key',
  'PAYMENT_PRODUCT_50_COINS': '50 coins product ID',
  'PAYMENT_PRODUCT_200_COINS': '200 coins product ID',
  'PAYMENT_PRODUCT_500_COINS': '500 coins product ID',
  'STRIPE_SECRET_KEY': 'Stripe secret key',
  'STRIPE_WEBHOOK_SIGNING_SECRET': 'Stripe webhook secret',
  'STRIPE_PRODUCT_50_COINS': 'Stripe 50 coins product',
  'STRIPE_PRODUCT_200_COINS': 'Stripe 200 coins product',
  'STRIPE_PRODUCT_500_COINS': 'Stripe 500 coins product'
};

console.log('✅ SET VARIABLES:');
console.log('❌ MISSING VARIABLES:\n');

for (const [varName, description] of Object.entries(paymentVars)) {
  if (process.env[varName]) {
    const value = process.env[varName];
    const length = value.length;
    console.log(`✅ ${varName}: SET (${length} chars) - ${description}`);
  } else {
    console.log(`❌ ${varName}: MISSING - ${description}`);
  }
}

console.log('\n=== END CHECK ===');
