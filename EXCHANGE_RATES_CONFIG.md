# Exchange Rates Configuration

## Overview
The exchange rates system fetches currency conversion rates from multiple APIs to ensure reliability and fallback options.

## API Endpoints

### Primary APIs (in order of preference):
1. **Open Exchange Rates**: `https://open.er-api.com/v6/latest`
2. **Frankfurter**: `https://api.frankfurter.app/latest?base=usd`
3. **ExchangeRate-API**: `https://api.exchangerate-api.com/v4/latest/USD`

## Configuration

You can override the default API endpoints by setting these environment variables:

```bash
# Override API endpoints (optional)
OPEN_EXCHANGE_RATES_URL=https://open.er-api.com/v6/latest
FRANKFURTER_URL=https://api.frankfurter.app/latest?base=usd
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest/USD

# Request timeout in milliseconds (default: 10000)
EXCHANGE_RATES_TIMEOUT=10000
```

## Troubleshooting

### Common Issues

1. **"Unexpected token '<', "<!DOCTYPE "..." error**
   - This means the API is returning HTML instead of JSON
   - Usually indicates the API is down or returning an error page
   - The system will automatically try the next API in the fallback chain

2. **API timeouts**
   - Default timeout is 10 seconds
   - Increase `EXCHANGE_RATES_TIMEOUT` if needed
   - Check your network connectivity

3. **All APIs failing**
   - Check if all three APIs are accessible from your server
   - Verify firewall/network restrictions
   - Check API status pages

### Testing APIs

Run the test script to check API status:

```bash
node test-apis.js
```

This will test all three APIs and show their response status and content type.

### Monitoring

The system logs detailed information about:
- Which API is being attempted
- Response status codes
- Content type validation
- Fallback attempts
- Success/failure of each API

Check your server logs for detailed exchange rate fetching information.

## Rate Limiting

Be aware that these APIs may have rate limits:
- **Open Exchange Rates**: Free tier has limits
- **Frankfurter**: Generally generous limits
- **ExchangeRate-API**: Free tier available

The system is designed to handle failures gracefully and will not spam the APIs.
