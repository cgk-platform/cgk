# TikTok Ads Integration Reference

> **Source**: Copied from `/docs/ai-reference/TIKTOK-ADS-INTEGRATION.md`

The TikTok integration enables pixel tracking, Events API for server-side conversion tracking, and spend data sync for P&L reporting.

## Features
- Client-side pixel tracking (page views, purchases)
- Server-side Events API for accurate conversion attribution
- OAuth 2.0 authentication for Marketing API access
- Spend data sync for P&L reporting
- View-through attribution (VTA) data sync

## Environment Variables
```bash
# Client-side pixel (required for tracking)
NEXT_PUBLIC_TIKTOK_PIXEL_ID=     # Your TikTok Pixel ID (e.g., "C...")
                                  # Get from: TikTok Ads Manager > Assets > Events > Web Events

# Server-side Events API (required for CAPI)
TIKTOK_PIXEL_ID=                 # Same as above (server-side access)
TIKTOK_EVENTS_API_ACCESS_TOKEN=  # Events API access token
                                  # Get from: TikTok Ads Manager > Assets > Events > Settings > Access Token

# Marketing API OAuth (required for spend sync)
TIKTOK_APP_ID=                   # OAuth App ID
TIKTOK_APP_SECRET=               # OAuth App Secret
TIKTOK_REDIRECT_URI=             # OAuth callback URL
                                  # Get from: TikTok for Developers > My Apps > Create/Select App
```

## How to Obtain TikTok Credentials

1. **Pixel ID & Events API Token** (for tracking):
   - Go to TikTok Ads Manager: https://ads.tiktok.com
   - Navigate to Assets > Events > Web Events
   - Create or select your pixel
   - Copy the Pixel ID
   - Go to Settings > Generate Access Token for Events API

2. **Marketing API Credentials** (for spend sync):
   - Go to TikTok for Developers: https://developers.tiktok.com
   - Create a new app or select existing
   - Enable "Marketing API" permission
   - Copy App ID and App Secret
   - Add OAuth redirect URI to app settings

## Key Files (Platform Structure)
```
packages/integrations/src/tiktok/
├── pixel.ts              # Client-side pixel helpers
├── events-api.ts         # Server-side Events API
├── oauth.ts              # OAuth flow for Marketing API
├── insights.ts           # Spend data fetching
└── db/                   # Database operations

apps/admin/src/app/api/admin/tiktok/
├── oauth/                # OAuth endpoints
├── connections/          # Account management
└── sync/                 # Spend sync triggers
```

## Data Flow
```
TikTok Events API <- sendTikTokEvent() <- Order Webhook (Inngest job)
                                            |
TikTok Marketing API -> fetchDailySpend() -> {tenant_schema}.tiktok_daily_spend
                                            |
                       updateDailyTotalsWithTikTokSpend()
                                            |
                       P&L Statement (Marketing -> Ad Spend -> TikTok)
```

## Multi-Tenant Considerations

1. **Credentials per Tenant**: Each tenant has their own TikTok Pixel and Ad Account
   - Store encrypted tokens in tenant schema
   - Pixel ID stored in tenant settings

2. **Tenant-Isolated Tables**:
   - `{tenant_schema}.tiktok_daily_spend` - Daily spend records
   - `{tenant_schema}.tiktok_connections` - OAuth connections

3. **Events API**: Server-side conversion tracking
   - Include tenant context when processing order webhooks
   - Deduplicate using order ID + tenant ID

## Events API Payload

```typescript
interface TikTokEventPayload {
  event: 'CompletePayment' | 'AddToCart' | 'ViewContent'
  event_time: number  // Unix timestamp
  user: {
    email?: string    // SHA256 hashed
    phone?: string    // SHA256 hashed
    external_id?: string
    ttclid?: string   // TikTok click ID from URL
  }
  properties: {
    content_type: 'product'
    content_id: string
    currency: 'USD'
    value: number
    quantity?: number
  }
}
```

## Scheduled Jobs (Inngest)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `tiktok/spend-sync` | Daily 3 AM | Sync spend data per tenant |
| `tiktok/vta-sync` | Daily 2:30 AM | Sync view-through attribution |

## Error Handling

- **40001**: Invalid access token - refresh or re-auth
- **40002**: Insufficient permissions - check app scopes
- **40105**: Rate limit exceeded - back off and retry
