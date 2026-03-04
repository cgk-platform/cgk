# Triple Whale API — Summary Page Endpoint

## Endpoint

```
POST /summary-page/get-data
```

## Description

Returns dashboard-level metrics for a date range, optionally filtered by channel. This is the primary endpoint for getting blended performance data — the same data shown on the Triple Whale Summary Page dashboard.

## Request

### Headers

```
x-api-key: <api-key>
Content-Type: application/json
```

### Body

```json
{
  "shopDomain": "vita-hustle.myshopify.com",
  "startDate": "2026-02-13",
  "endDate": "2026-02-19",
  "channel": "meta",
  "metrics": ["totalRevenue", "blendedRoas", "netProfit"]
}
```

### Parameters

| Field        | Type     | Required | Description                                                     |
| ------------ | -------- | -------- | --------------------------------------------------------------- |
| `shopDomain` | string   | Yes      | Shopify `.myshopify.com` domain                                 |
| `startDate`  | string   | Yes      | Start date (`YYYY-MM-DD`)                                       |
| `endDate`    | string   | Yes      | End date (`YYYY-MM-DD`)                                         |
| `channel`    | string   | No       | Filter to a specific channel (e.g., `meta`, `google`, `tiktok`) |
| `metrics`    | string[] | No       | Limit response to specific metric keys                          |

### Channel Filter Values

| Value       | Platform                                           |
| ----------- | -------------------------------------------------- |
| `meta`      | Facebook + Instagram                               |
| `google`    | Google Ads (Search + Shopping + Display + YouTube) |
| `tiktok`    | TikTok Ads                                         |
| `snapchat`  | Snapchat Ads                                       |
| `pinterest` | Pinterest Ads                                      |
| `email`     | Email marketing (Klaviyo, etc.)                    |
| `sms`       | SMS marketing (Attentive, etc.)                    |
| `organic`   | Organic search + social                            |
| `direct`    | Direct traffic                                     |
| `referral`  | Referral traffic                                   |

When `channel` is omitted, blended (all-channel) metrics are returned.

## Response

### Blended Response (no channel filter)

```json
{
  "totalRevenue": 45678.5,
  "totalOrders": 312,
  "blendedRoas": 3.2,
  "mer": 4.1,
  "netProfit": 12345.0,
  "totalSpend": 14274.0,
  "aov": 146.4,
  "newCustomerRevenue": 28200.0,
  "returningCustomerRevenue": 17478.5,
  "newCustomerOrders": 192,
  "returningCustomerOrders": 120,
  "ncpa": 52.3,
  "ltvToCpa": 2.8,
  "channels": {
    "meta": {
      "spend": 10500.0,
      "revenue": 33600.0,
      "roas": 3.2,
      "cpa": 45.65,
      "purchases": 230,
      "impressions": 1250000,
      "clicks": 18750,
      "ctr": 1.5,
      "cpm": 8.4,
      "cpc": 0.56
    },
    "google": {
      "spend": 2800.0,
      "revenue": 8400.0,
      "roas": 3.0,
      "cpa": 40.0,
      "purchases": 70
    },
    "email": {
      "revenue": 3200.0,
      "purchases": 12
    }
  }
}
```

### Channel-Filtered Response

When `channel` is specified, the response contains only that channel's metrics at the top level (no `channels` nested object):

```json
{
  "spend": 10500.0,
  "revenue": 33600.0,
  "roas": 3.2,
  "cpa": 45.65,
  "purchases": 230,
  "impressions": 1250000,
  "clicks": 18750,
  "ctr": 1.5,
  "cpm": 8.4,
  "cpc": 0.56
}
```

## Metrics Reference

### Blended Metrics (Top-Level)

| Key                        | Type  | Description                                                      |
| -------------------------- | ----- | ---------------------------------------------------------------- |
| `totalRevenue`             | float | Sum of all revenue across all channels and organic               |
| `totalOrders`              | int   | Sum of all orders                                                |
| `blendedRoas`              | float | `totalRevenue / totalSpend` — the master KPI                     |
| `mer`                      | float | Marketing Efficiency Ratio: `totalRevenue / totalMarketingSpend` |
| `netProfit`                | float | Revenue - COGS - Ad Spend - Fulfillment - Fees                   |
| `totalSpend`               | float | Sum of all ad spend across all paid channels                     |
| `aov`                      | float | Average Order Value: `totalRevenue / totalOrders`                |
| `newCustomerRevenue`       | float | Revenue from first-time purchasers                               |
| `returningCustomerRevenue` | float | Revenue from repeat purchasers                                   |
| `newCustomerOrders`        | int   | Orders from first-time purchasers                                |
| `returningCustomerOrders`  | int   | Orders from repeat purchasers                                    |
| `ncpa`                     | float | New Customer CPA: `totalSpend / newCustomerOrders`               |
| `ltvToCpa`                 | float | Customer LTV / CPA ratio                                         |

### Channel Metrics (Per-Channel)

| Key           | Type  | Description                                            |
| ------------- | ----- | ------------------------------------------------------ |
| `spend`       | float | Channel ad spend                                       |
| `revenue`     | float | Revenue attributed to this channel (by selected model) |
| `roas`        | float | Channel ROAS: `revenue / spend`                        |
| `cpa`         | float | Channel CPA: `spend / purchases`                       |
| `purchases`   | int   | Orders attributed to this channel                      |
| `impressions` | int   | Ad impressions (paid channels only)                    |
| `clicks`      | int   | Ad clicks (paid channels only)                         |
| `ctr`         | float | Click-through rate: `clicks / impressions * 100`       |
| `cpm`         | float | Cost per mille: `spend / impressions * 1000`           |
| `cpc`         | float | Cost per click: `spend / clicks`                       |

### Meta-Reported Fields (When Available)

Some TW responses include the platform's self-reported numbers alongside TW's attribution:

| Key                     | Type  | Description                                     |
| ----------------------- | ----- | ----------------------------------------------- |
| `spendMetaReported`     | float | Spend as reported by Meta (should match TW)     |
| `revenueMetaReported`   | float | Revenue as Meta reports it (typically inflated) |
| `roasMetaReported`      | float | ROAS as Meta calculates it                      |
| `purchasesMetaReported` | int   | Purchases as Meta counts them                   |

## Examples

### cURL — Blended Summary

```bash
curl -X POST https://api.triplewhale.com/api/v2/summary-page/get-data \
  -H "x-api-key: $TRIPLE_WHALE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "shopDomain": "vita-hustle.myshopify.com",
    "startDate": "2026-02-13",
    "endDate": "2026-02-19"
  }'
```

### cURL — Meta Channel Only

```bash
curl -X POST https://api.triplewhale.com/api/v2/summary-page/get-data \
  -H "x-api-key: $TRIPLE_WHALE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "shopDomain": "vita-hustle.myshopify.com",
    "startDate": "2026-02-13",
    "endDate": "2026-02-19",
    "channel": "meta"
  }'
```

### Script Usage

```bash
# Blended summary
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py summary \
  --start 2026-02-13 --end 2026-02-19

# Meta channel filtered
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py summary \
  --start 2026-02-13 --end 2026-02-19 --channel meta

# JSON for piping
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py summary \
  --start 2026-02-13 --end 2026-02-19 --format json
```

## Notes

- Date ranges are inclusive: `startDate=2026-02-13&endDate=2026-02-19` includes both Feb 13 and Feb 19
- Revenue attribution model used depends on TW account settings (default: Total Impact)
- `netProfit` requires COGS and fulfillment costs to be configured in TW
- Channel availability depends on which integrations are connected in TW
- Data freshness: typically 1-2 hours lag from real-time
