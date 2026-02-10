# Google Ads Integration Reference

> **Source**: Copied from `/docs/ai-reference/GOOGLE-ADS-INTEGRATION.md`

The Google Ads integration syncs spend data for P&L reporting, mirroring the Meta Ads architecture.

## Features
- OAuth 2.0 authentication with CSRF protection
- Automatic syncs via Inngest scheduled jobs
- Historical data backfill (up to 3 years)
- Rate limit handling with exponential backoff
- Multi-account support
- AES-256-GCM encrypted token storage

## Key Files (Platform Structure)
```
packages/integrations/src/google-ads/
├── types.ts           # All TypeScript interfaces
├── config.ts          # API config, GAQL queries, utilities
├── client/            # Google Ads API client with rate limiting
├── oauth/             # OAuth flow and token management
├── db/                # Database operations (connections, spend, sync jobs)
├── insights/          # GAQL queries for spend data
├── sync/              # Scheduled sync jobs
└── analytics.ts       # P&L integration helpers

apps/admin/src/app/api/admin/google-ads/
├── oauth/             # OAuth initiation and callback
├── connections/       # List/disconnect accounts
├── sync/              # Manual sync triggers and status
└── init/              # Schema initialization

apps/admin/src/app/admin/google-ads/  # Admin UI
```

## Environment Variables
```bash
GOOGLE_ADS_CLIENT_ID=           # OAuth Client ID
GOOGLE_ADS_CLIENT_SECRET=       # OAuth Client Secret
GOOGLE_ADS_DEVELOPER_TOKEN=     # API Access Token (from Google Ads)
GOOGLE_ADS_REDIRECT_URI=        # OAuth callback URL
GOOGLE_ADS_ENCRYPTION_KEY=      # 32+ character encryption key for tokens
GOOGLE_ADS_LOGIN_CUSTOMER_ID=   # Optional: MCC Account ID
```

## Data Flow
```
Google Ads API -> fetchDailySpend() -> {tenant_schema}.google_daily_spend table
                                             |
                      updateDailyTotalsWithGoogleSpend()
                                             |
                      {tenant_schema}.daily_totals.google_spend_cents
                                             |
                      P&L Statement (Marketing -> Ad Spend -> Google)
```

## Key Patterns
- Uses GAQL (Google Ads Query Language) for API queries
- Micros to cents conversion: `micros / 10000 = cents`
- Customer ID format: 10 digits without dashes (e.g., `1234567890`)
- Sync jobs run in 30-day chunks for large backfills

## Multi-Tenant Considerations

1. **Credentials per Tenant**: Each tenant has their own Google Ads account(s)
   - Store encrypted refresh tokens in tenant schema
   - OAuth callback must resolve correct tenant

2. **Tenant-Isolated Tables**:
   - `{tenant_schema}.google_daily_spend` - Daily spend records
   - `{tenant_schema}.google_ads_connections` - OAuth connections
   - `{tenant_schema}.google_ads_sync_jobs` - Sync job history

3. **Scheduled Sync Jobs** (Inngest):
   - Daily sync per tenant: `cron/google-ads-sync`
   - Include `tenantId` in all event payloads
   - Process tenants in parallel with rate limit awareness

## GAQL Query Examples

**Daily Spend by Campaign:**
```sql
SELECT
  campaign.id,
  campaign.name,
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks,
  segments.date
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
```

**Account-Level Spend:**
```sql
SELECT
  customer.id,
  metrics.cost_micros,
  segments.date
FROM customer
WHERE segments.date = '2025-02-10'
```

## Error Handling

- **AUTHENTICATION_ERROR**: Refresh token expired, trigger re-auth flow
- **QUOTA_EXHAUSTED**: Back off and retry with exponential delay
- **INVALID_CUSTOMER_ID**: Customer ID format wrong or not accessible
