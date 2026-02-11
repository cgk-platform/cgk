# Shopify App Environment Variables

This document describes all environment variables required for the CGK Platform Shopify App.

## Required Variables

### Shopify App OAuth

| Variable | Source | Secret? | Description |
|----------|--------|---------|-------------|
| `SHOPIFY_CLIENT_ID` | Partners Dashboard -> Client credentials | No | App client ID |
| `SHOPIFY_CLIENT_SECRET` | Partners Dashboard -> Client credentials | **Yes** | App client secret |

### Token Encryption

| Variable | Source | Secret? | Description |
|----------|--------|---------|-------------|
| `SHOPIFY_TOKEN_ENCRYPTION_KEY` | Generate yourself | **Yes** | 32-byte hex key for AES-256-GCM |

Generate with:
```bash
openssl rand -hex 32
```

### Webhook Verification

| Variable | Source | Secret? | Description |
|----------|--------|---------|-------------|
| `SHOPIFY_WEBHOOK_SECRET` | Same as client secret or app settings | **Yes** | HMAC verification key |

## Optional Variables

### Web Pixel Settings

| Variable | Source | Secret? | Description |
|----------|--------|---------|-------------|
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | GA4 Admin | No | GA4 Measurement ID (G-XXXXXX) |
| `GA4_MEASUREMENT_PROTOCOL_SECRET` | GA4 Admin -> Data Streams | **Yes** | Measurement Protocol secret |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Events Manager | No | Meta Pixel ID |
| `META_CAPI_ACCESS_TOKEN` | Meta Events Manager | **Yes** | Conversions API token |

### Platform URLs

| Variable | Source | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_BASE_URL` | Your domain | Base URL for redirects |
| `PLATFORM_API_URL` | Your domain | API endpoint for events |
| `SHOPIFY_API_VERSION` | Shopify | API version (default: 2026-01) |

### Development

| Variable | Source | Description |
|----------|--------|-------------|
| `SHOPIFY_DEV_STORE` | Your dev store | Development store URL |

## CI/CD Secrets (GitHub Actions)

| Secret | Source | Description |
|--------|--------|-------------|
| `SHOPIFY_CLI_PARTNERS_TOKEN` | Partners -> Settings -> CLI tokens | For automated deployments |

## Setup Steps

### 1. Create App in Shopify Partners

1. Go to https://partners.shopify.com
2. Navigate to **Apps** -> **Create app**
3. Choose **Create app manually**
4. Configure:
   - App name: `CGK Platform Functions`
   - App URL: `https://your-domain.com/api/shopify-app/auth`

### 2. Copy Credentials

From Partners Dashboard -> Client credentials:
1. Copy **Client ID** -> `SHOPIFY_CLIENT_ID`
2. Copy **Client secret** -> `SHOPIFY_CLIENT_SECRET`

### 3. Generate Encryption Key

```bash
# Generate 32-byte hex key
openssl rand -hex 32
```

Copy output to `SHOPIFY_TOKEN_ENCRYPTION_KEY`.

### 4. Configure Webhook Secret

Use the same value as `SHOPIFY_CLIENT_SECRET` for `SHOPIFY_WEBHOOK_SECRET`.

### 5. Link App Locally

```bash
cd apps/shopify-app
shopify app config link
```

This creates `.shopify/project.json` linking to your Partners app.

### 6. Set Up CI/CD

1. Go to Partners Dashboard -> Settings -> CLI tokens
2. Create a new token
3. Add to GitHub Secrets as `SHOPIFY_CLI_PARTNERS_TOKEN`

## Security Notes

- **Never commit** `.env.local` or any file containing secrets
- Use environment variables in CI/CD, not hardcoded values
- The `.env.example` file should never contain real values
- Rotate secrets immediately if compromised
- Use different credentials for development and production
