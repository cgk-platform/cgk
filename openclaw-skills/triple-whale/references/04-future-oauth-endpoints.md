# Triple Whale API — Future OAuth Endpoints

> These endpoints require OAuth app registration and are NOT available with API key auth.
> This document is a reference for when VitaHustle upgrades to OAuth.

## OAuth Registration

### Step 1: Register App

1. Go to `developers.triplewhale.com`
2. Create a new application
3. Note the `client_id` and `client_secret`
4. Set redirect URI (e.g., `http://localhost:18789/oauth/callback`)

### Step 2: Authorization Flow

```
GET https://app.triplewhale.com/oauth/authorize
  ?client_id=<client_id>
  &redirect_uri=<redirect_uri>
  &response_type=code
  &scope=read write
  &state=<random_state>
```

User approves access, TW redirects to:

```
<redirect_uri>?code=<auth_code>&state=<state>
```

### Step 3: Exchange Code for Tokens

```bash
POST https://api.triplewhale.com/api/v2/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "client_id": "<client_id>",
  "client_secret": "<client_secret>",
  "code": "<auth_code>",
  "redirect_uri": "<redirect_uri>"
}
```

Response:

```json
{
  "access_token": "tw_at_xxxxxxxxxxxxx",
  "refresh_token": "tw_rt_xxxxxxxxxxxxx",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### Step 4: Refresh Token

```bash
POST https://api.triplewhale.com/api/v2/oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "client_id": "<client_id>",
  "client_secret": "<client_secret>",
  "refresh_token": "<refresh_token>"
}
```

---

## Moby AI Endpoint

### Overview

Moby is Triple Whale's natural-language analytics interface. Ask questions in plain English and get structured data back.

### Endpoint

```
POST /orcabase/api/moby
```

### Auth

```
Authorization: Bearer <access_token>
```

### Request

```json
{
  "shopDomain": "vita-hustle.myshopify.com",
  "question": "What was our best performing ad creative last week?",
  "context": {
    "dateRange": "last_7d"
  }
}
```

### Parameters

| Field        | Type   | Required | Description                                         |
| ------------ | ------ | -------- | --------------------------------------------------- |
| `shopDomain` | string | Yes      | Shopify domain                                      |
| `question`   | string | Yes      | Natural language question                           |
| `context`    | object | No       | Optional context hints (date range, channel filter) |

### Example Questions

- "What was our best performing ad creative last week?"
- "Show me revenue by channel for the last 30 days"
- "Which campaigns have declining ROAS?"
- "What's the LTV of customers acquired through Meta vs Google?"
- "Compare this week to last week for all paid channels"
- "Which ad sets have a CPA above $50?"
- "Show me the top 5 products by revenue this month"

### Response

```json
{
  "answer": "Your best performing ad creative last week was 'Kevin_Hart_DubaiChoc_1x1' in the 'VH_TOFU_BundleSave_Feb26' campaign...",
  "data": {
    "type": "table",
    "headers": ["Ad Name", "Spend", "Revenue", "ROAS", "Orders"],
    "rows": [
      ["Kevin_Hart_DubaiChoc_1x1", 2500, 9800, 3.92, 67],
      ["BundleSave_Static_50off", 1800, 6300, 3.5, 43]
    ]
  },
  "sql": "SELECT ad_name, SUM(spend) as spend, SUM(revenue) as revenue... FROM pixel_joined_tvf..."
}
```

### Notes

- Moby translates questions to SQL queries internally
- Response includes both human-readable answer and structured data
- The `sql` field shows the generated query (useful for learning/debugging)
- Rate limit: ~30 requests/minute

---

## SQL Endpoint (ClickHouse)

### Overview

Direct SQL access to Triple Whale's ClickHouse data warehouse. Enables custom analytics queries against raw pixel and attribution data.

### Endpoint

```
POST /orcabase/api/sql
```

### Auth

```
Authorization: Bearer <access_token>
```

### Request

```json
{
  "shopDomain": "vita-hustle.myshopify.com",
  "query": "SELECT date, channel, SUM(revenue) as rev, SUM(spend) as spend FROM blended_stats_tvf WHERE date >= '2026-02-01' GROUP BY date, channel ORDER BY date DESC"
}
```

### Parameters

| Field        | Type   | Required | Description          |
| ------------ | ------ | -------- | -------------------- |
| `shopDomain` | string | Yes      | Shopify domain       |
| `query`      | string | Yes      | ClickHouse SQL query |

### Response

```json
{
  "columns": ["date", "channel", "rev", "spend"],
  "data": [
    ["2026-02-19", "meta", 5200.0, 1500.0],
    ["2026-02-19", "google", 1200.0, 400.0],
    ["2026-02-18", "meta", 4800.0, 1450.0]
  ],
  "rowCount": 42,
  "executionTimeMs": 145
}
```

---

## Key ClickHouse Tables

### `pixel_joined_tvf` — Pixel Event Data

The most granular table. Contains individual pixel events with attribution.

| Column               | Type     | Description                                                |
| -------------------- | -------- | ---------------------------------------------------------- |
| `event_date`         | Date     | Event date                                                 |
| `event_timestamp`    | DateTime | Event timestamp                                            |
| `event_type`         | String   | `pageview`, `add_to_cart`, `initiate_checkout`, `purchase` |
| `shop_domain`        | String   | Shopify domain                                             |
| `customer_id`        | String   | Hashed customer identifier                                 |
| `order_id`           | String   | Shopify order ID (for purchase events)                     |
| `revenue`            | Float64  | Order revenue (for purchase events)                        |
| `channel`            | String   | Attributed channel                                         |
| `campaign`           | String   | Campaign name                                              |
| `adset`              | String   | Ad set name                                                |
| `ad`                 | String   | Ad creative name                                           |
| `attribution_model`  | String   | Model used                                                 |
| `attribution_credit` | Float64  | Credit assigned (0-1)                                      |
| `utm_source`         | String   | UTM source                                                 |
| `utm_medium`         | String   | UTM medium                                                 |
| `utm_campaign`       | String   | UTM campaign                                               |
| `device_type`        | String   | `desktop`, `mobile`, `tablet`                              |
| `country`            | String   | Country code                                               |
| `region`             | String   | State/region                                               |
| `landing_page`       | String   | Landing page URL                                           |
| `referrer`           | String   | Referrer URL                                               |

### `blended_stats_tvf` — Blended Metrics by Date

Aggregated daily metrics by channel. Used for trend analysis and dashboards.

| Column                       | Type    | Description                      |
| ---------------------------- | ------- | -------------------------------- |
| `date`                       | Date    | Metric date                      |
| `channel`                    | String  | Channel name                     |
| `spend`                      | Float64 | Ad spend                         |
| `revenue`                    | Float64 | Attributed revenue               |
| `roas`                       | Float64 | Return on ad spend               |
| `purchases`                  | UInt64  | Order count                      |
| `impressions`                | UInt64  | Impression count                 |
| `clicks`                     | UInt64  | Click count                      |
| `ctr`                        | Float64 | Click-through rate               |
| `cpm`                        | Float64 | Cost per mille                   |
| `cpc`                        | Float64 | Cost per click                   |
| `cpa`                        | Float64 | Cost per acquisition             |
| `new_customer_revenue`       | Float64 | Revenue from new customers       |
| `returning_customer_revenue` | Float64 | Revenue from returning customers |
| `new_customer_orders`        | UInt64  | New customer order count         |
| `returning_customer_orders`  | UInt64  | Returning customer order count   |

### `orders_tvf` — Order Data

Order-level data with customer information.

| Column                | Type          | Description                    |
| --------------------- | ------------- | ------------------------------ |
| `order_id`            | String        | Shopify order ID               |
| `order_date`          | DateTime      | Order timestamp                |
| `total_price`         | Float64       | Order total                    |
| `currency`            | String        | Currency code                  |
| `customer_email`      | String        | Customer email (may be hashed) |
| `customer_type`       | String        | `new` or `returning`           |
| `products`            | Array(String) | Product names in order         |
| `product_ids`         | Array(String) | Product IDs in order           |
| `discount_code`       | String        | Discount code used             |
| `shipping_country`    | String        | Shipping country               |
| `shipping_region`     | String        | Shipping state/region          |
| `attributed_channel`  | String        | Primary attributed channel     |
| `attributed_campaign` | String        | Campaign name                  |

---

## Example SQL Queries

### Daily Revenue by Channel (Last 30 Days)

```sql
SELECT
  date,
  channel,
  SUM(revenue) as revenue,
  SUM(spend) as spend,
  SUM(revenue) / NULLIF(SUM(spend), 0) as roas
FROM blended_stats_tvf
WHERE date >= today() - 30
GROUP BY date, channel
ORDER BY date DESC, revenue DESC
```

### Top Campaigns by ROAS

```sql
SELECT
  campaign,
  SUM(spend) as total_spend,
  SUM(revenue) as total_revenue,
  SUM(revenue) / NULLIF(SUM(spend), 0) as roas,
  COUNT(DISTINCT order_id) as orders
FROM pixel_joined_tvf
WHERE event_type = 'purchase'
  AND event_date >= today() - 7
  AND channel = 'meta'
GROUP BY campaign
HAVING total_spend > 100
ORDER BY roas DESC
LIMIT 10
```

### New vs Returning Customer Mix

```sql
SELECT
  date,
  SUM(new_customer_orders) as new_orders,
  SUM(returning_customer_orders) as returning_orders,
  SUM(new_customer_revenue) as new_revenue,
  SUM(returning_customer_revenue) as returning_revenue
FROM blended_stats_tvf
WHERE date >= today() - 30
GROUP BY date
ORDER BY date DESC
```

### Landing Page Performance

```sql
SELECT
  landing_page,
  COUNT(*) as visits,
  COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN order_id END) as purchases,
  SUM(CASE WHEN event_type = 'purchase' THEN revenue ELSE 0 END) as revenue
FROM pixel_joined_tvf
WHERE event_date >= today() - 7
GROUP BY landing_page
HAVING visits > 50
ORDER BY revenue DESC
LIMIT 20
```

### Creative Performance (Ad Level)

```sql
SELECT
  ad,
  campaign,
  SUM(CASE WHEN event_type = 'purchase' THEN attribution_credit ELSE 0 END) as attributed_purchases,
  SUM(CASE WHEN event_type = 'purchase' THEN revenue * attribution_credit ELSE 0 END) as attributed_revenue
FROM pixel_joined_tvf
WHERE event_date >= today() - 7
  AND channel = 'meta'
  AND ad != ''
GROUP BY ad, campaign
ORDER BY attributed_revenue DESC
LIMIT 10
```

---

## Implementation Notes for OAuth Upgrade

When upgrading to OAuth:

1. **Add to `.env`:**

   ```
   TRIPLE_WHALE_OAUTH_CLIENT_ID=
   TRIPLE_WHALE_OAUTH_CLIENT_SECRET=
   TRIPLE_WHALE_OAUTH_ACCESS_TOKEN=
   TRIPLE_WHALE_OAUTH_REFRESH_TOKEN=
   TRIPLE_WHALE_OAUTH_EXPIRES_AT=
   ```

2. **Add to helper script:**
   - Token refresh function (check expiry, refresh if needed)
   - OAuth header builder (Bearer token instead of x-api-key)
   - `cmd_moby()` implementation (replace stub)
   - `cmd_sql()` implementation (replace stub)

3. **Add token refresh cron:**
   - Similar to Meta token refresh
   - Weekly or before-expiry refresh
   - Updates `.env` with new tokens

4. **Add to LaunchAgents:**
   - `com.openclaw-vitahustle.tw-token-refresh.plist`
   - Weekly schedule, similar to Meta token refresh plists
