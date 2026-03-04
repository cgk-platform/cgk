# Triple Whale API — Attribution & Customer Journeys

## Endpoint

```
POST /attribution/get-orders-with-journeys-v2
```

## Description

Returns order-level attribution data with full customer journey touchpoints. Each order includes the complete path from first interaction to purchase, with attribution credit assigned based on the selected model.

This is the most granular data available via API key — shows exactly which channels and touchpoints led to each purchase.

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
  "attributionModel": "totalImpact",
  "limit": 50
}
```

### Parameters

| Field              | Type   | Required | Description                                   |
| ------------------ | ------ | -------- | --------------------------------------------- |
| `shopDomain`       | string | Yes      | Shopify `.myshopify.com` domain               |
| `startDate`        | string | Yes      | Start date (`YYYY-MM-DD`)                     |
| `endDate`          | string | Yes      | End date (`YYYY-MM-DD`)                       |
| `attributionModel` | string | Yes      | Attribution model to use (see below)          |
| `limit`            | int    | No       | Max orders to return (default varies by plan) |

### Attribution Model Values

| API Value                | Shortcut      | Description                                                         |
| ------------------------ | ------------- | ------------------------------------------------------------------- |
| `totalImpact`            | `ti`          | ML-based proportional credit distribution. **Recommended default.** |
| `tripleAttribution`      | `ta`          | Rules-based multi-touch (first + last + linear blend)               |
| `tripleAttributionViews` | `ta-views`    | Triple Attribution including view-through events                    |
| `linearAll`              | `linear-all`  | Equal credit to all touchpoints                                     |
| `linearPaid`             | `linear-paid` | Equal credit to paid touchpoints only                               |
| `firstClick`             | `first-click` | 100% credit to first touchpoint                                     |
| `lastClick`              | `last-click`  | 100% credit to last touchpoint                                      |

## Response

```json
{
  "orders": [
    {
      "orderId": "5678901234",
      "createdAt": "2026-02-18T14:32:00Z",
      "totalPrice": 149.99,
      "currency": "USD",
      "customerEmail": "customer@example.com",
      "customerType": "new",
      "attributedChannel": "meta",
      "attributedCampaign": "VH_TOFU_BundleSave_Feb26",
      "attributedAdset": "Lookalike_1pct_Purchasers",
      "attributedAd": "Kevin_Hart_DubaiChoc_1x1",
      "attributionCredit": 0.65,
      "journey": [
        {
          "timestamp": "2026-02-15T09:12:00Z",
          "channel": "meta",
          "type": "click",
          "campaign": "VH_TOFU_BundleSave_Feb26",
          "adset": "Lookalike_1pct_Purchasers",
          "ad": "Kevin_Hart_DubaiChoc_1x1",
          "credit": 0.35
        },
        {
          "timestamp": "2026-02-16T20:45:00Z",
          "channel": "email",
          "type": "click",
          "campaign": "Abandon_Cart_Flow",
          "credit": 0.15
        },
        {
          "timestamp": "2026-02-17T11:30:00Z",
          "channel": "meta",
          "type": "impression",
          "campaign": "VH_RETARGET_Feb26",
          "adset": "Website_Visitors_7d",
          "ad": "BundleSave_Reminder_9x16",
          "credit": 0.1
        },
        {
          "timestamp": "2026-02-18T14:28:00Z",
          "channel": "direct",
          "type": "visit",
          "credit": 0.05
        },
        {
          "timestamp": "2026-02-18T14:32:00Z",
          "channel": "meta",
          "type": "click",
          "campaign": "VH_RETARGET_Feb26",
          "adset": "Website_Visitors_7d",
          "ad": "BundleSave_Reminder_1x1",
          "credit": 0.35
        }
      ]
    }
  ],
  "totalOrders": 230,
  "totalRevenue": 33600.0,
  "attributionModel": "totalImpact"
}
```

## Response Fields

### Order-Level Fields

| Field                | Type   | Description                                             |
| -------------------- | ------ | ------------------------------------------------------- |
| `orderId`            | string | Shopify order ID                                        |
| `createdAt`          | string | Order timestamp (ISO 8601)                              |
| `totalPrice`         | float  | Order total in USD                                      |
| `currency`           | string | Currency code (typically USD)                           |
| `customerEmail`      | string | Customer email (may be masked depending on TW settings) |
| `customerType`       | string | `new` or `returning`                                    |
| `attributedChannel`  | string | Primary channel receiving credit for this order         |
| `attributedCampaign` | string | Campaign name (if applicable)                           |
| `attributedAdset`    | string | Ad set name (if applicable)                             |
| `attributedAd`       | string | Ad name (if applicable)                                 |
| `attributionCredit`  | float  | Credit percentage for the attributed channel (0-1)      |
| `journey`            | array  | Ordered list of touchpoints leading to purchase         |

### Journey Touchpoint Fields

| Field       | Type   | Description                                                                 |
| ----------- | ------ | --------------------------------------------------------------------------- |
| `timestamp` | string | Touchpoint timestamp (ISO 8601)                                             |
| `channel`   | string | Channel (meta, google, email, direct, organic, etc.)                        |
| `type`      | string | Interaction type: `click`, `impression`, `visit`, `email_open`, `sms_click` |
| `campaign`  | string | Campaign name (if from paid channel)                                        |
| `adset`     | string | Ad set name (if from Meta/Google)                                           |
| `ad`        | string | Ad creative name (if from Meta/Google)                                      |
| `credit`    | float  | Attribution credit for this touchpoint (0-1, sums to 1 across journey)      |

### Summary Fields

| Field              | Type   | Description                    |
| ------------------ | ------ | ------------------------------ |
| `totalOrders`      | int    | Total orders in the result set |
| `totalRevenue`     | float  | Sum of all order revenues      |
| `attributionModel` | string | Model used for attribution     |

## Attribution Models — Deep Dive

### Total Impact (TI) — Default

**How it works:** Machine learning model that analyzes all touchpoints across all orders to determine the incremental impact of each channel. Uses statistical methods similar to Shapley values.

**Strengths:**

- Most accurate for budget allocation decisions
- Accounts for "assist" value (channels that contribute but don't close)
- Not biased toward first or last touch

**Limitations:**

- Needs 7+ days of data for stable reads
- Single-day TI values can fluctuate as the model recalculates
- Harder to explain to stakeholders than simple models

**When to use:** Strategic budget allocation, weekly/monthly reporting, executive dashboards.

### Triple Attribution (TA)

**How it works:** Rules-based model that blends first-touch (30%), last-touch (40%), and linear (30%) attribution.

**Strengths:**

- More stable than TI for short date ranges
- Closer to what ad platforms report (easier to compare)
- Good for daily monitoring

**Limitations:**

- Arbitrary weight distribution
- Doesn't account for incremental impact

**When to use:** Daily monitoring, comparing against platform-reported numbers.

### Triple Attribution + Views (TA-Views)

**How it works:** Same as TA but includes view-through events (impressions) as valid touchpoints.

**Strengths:**

- Shows full-funnel impact including impressions
- More realistic for display/video campaigns

**Limitations:**

- Can over-credit channels with high impression volume
- Noisy for channels with broad targeting

**When to use:** Evaluating video/display campaigns, understanding upper-funnel impact.

### Linear All

**How it works:** Equal credit distributed across all touchpoints in the journey.

**Strengths:**

- No bias — every touchpoint gets equal credit
- Easy to understand and explain

**Limitations:**

- Doesn't account for varying touchpoint importance
- Over-credits low-value touchpoints

**When to use:** Fairness analysis, understanding which channels appear in journeys.

### Linear Paid

**How it works:** Equal credit distributed only across paid touchpoints. Organic/direct touchpoints receive zero credit.

**Strengths:**

- Isolates paid media contribution
- Good for ROAS-focused analysis

**Limitations:**

- Ignores organic/direct contribution entirely
- Can inflate paid channel importance

**When to use:** Paid media team reporting, ROAS optimization.

### First Click

**How it works:** 100% credit to the first touchpoint in the customer journey.

**Strengths:**

- Shows which channels discover new customers
- Best for evaluating prospecting/awareness campaigns

**Limitations:**

- Ignores all subsequent touchpoints
- Over-credits awareness channels

**When to use:** Evaluating top-of-funnel campaigns, prospecting channel decisions.

### Last Click

**How it works:** 100% credit to the last touchpoint before purchase.

**Strengths:**

- Most comparable to Google Analytics default
- Shows which channels close the deal

**Limitations:**

- Over-credits retargeting/brand channels
- Undervalues discovery channels

**When to use:** Comparing to GA data, evaluating conversion campaigns.

## Examples

### cURL — Total Impact, Last 7 Days

```bash
curl -X POST https://api.triplewhale.com/api/v2/attribution/get-orders-with-journeys-v2 \
  -H "x-api-key: $TRIPLE_WHALE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "shopDomain": "vita-hustle.myshopify.com",
    "startDate": "2026-02-13",
    "endDate": "2026-02-19",
    "attributionModel": "totalImpact",
    "limit": 10
  }'
```

### Script Usage

```bash
# Total Impact, 5 orders
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py attribution \
  --start 2026-02-19 --end 2026-02-19 --model ti --limit 5

# Triple Attribution, table format
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py attribution \
  --start 2026-02-13 --end 2026-02-19 --model ta --format table

# First Click for prospecting analysis
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py attribution \
  --model first-click --start 2026-02-13 --end 2026-02-19 --format json
```

## Notes

- Journey touchpoints are ordered chronologically (earliest first)
- `credit` values across all touchpoints in a journey sum to 1.0
- `attributedChannel` is the channel with the highest credit in the journey
- Customer journeys can span days or weeks — the date range filters by order date, not touchpoint date
- Large date ranges with no `limit` may return very large responses — use `limit` for API efficiency
- Total Impact model recalculates daily — historical TI values may shift slightly as more data is collected
