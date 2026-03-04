---
name: triple-whale
emoji: "\U0001F433"
triggers:
  - triple whale
  - tw report
  - tw summary
  - tw vs meta
  - attribution
  - blended roas
  - blended metrics
  - total impact
  - triple attribution
  - mer
  - net profit
  - source of truth
  - customer journeys
  - touchpoint analysis
  - channel attribution
  - real roas
  - sanity check spend
requires:
  env:
    - TRIPLE_WHALE_API_KEY
---

# Triple Whale — Analytics Source of Truth

Triple Whale is VitaHustle's **source of truth** for all ad spend decisions. It provides first-party pixel attribution that is independent of any ad platform's self-reported data.

**Why Triple Whale > Meta Reported:**

- Meta counts view-through conversions that may not be real
- Meta uses last-touch within its own ecosystem, inflating its contribution
- Triple Whale uses first-party pixel data with multiple attribution models
- Triple Whale's Total Impact model uses ML to distribute credit across all touchpoints

**Rule: When TW and Meta disagree, TW wins for decision-making.** Meta is directional only.

---

## Mode System

This skill is **read-only**. All commands fetch data — no write operations are available with API key authentication.

Future OAuth upgrade will unlock:

- Moby AI (natural language queries)
- SQL endpoint (direct ClickHouse queries)

---

## Environment Variables

| Variable                   | Required | Description                                        |
| -------------------------- | -------- | -------------------------------------------------- |
| `TRIPLE_WHALE_API_KEY`     | Yes      | API key from TW Settings > API Keys                |
| `TRIPLE_WHALE_SHOP_DOMAIN` | Yes      | Shopify domain (e.g., `vita-hustle.myshopify.com`) |

Set in `~/.openclaw-vitahustle/skills/triple-whale/.env`

---

## API Overview

| Key         | Value                                |
| ----------- | ------------------------------------ |
| Base URL    | `https://api.triplewhale.com/api/v2` |
| Auth        | `x-api-key` header                   |
| Format      | JSON request/response                |
| Rate Limits | 429 with `Retry-After` header        |

All dates use `YYYY-MM-DD` format. All currency values are in USD.

---

## Attribution Models Reference

Triple Whale offers multiple attribution models. Each tells a different story about how revenue is attributed to marketing channels.

| Shortcut      | Full Name                  | Description                                                                            | Best For                                                          |
| ------------- | -------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `ti`          | Total Impact               | ML-based model distributing credit across all touchpoints proportionally. **DEFAULT.** | Strategic decisions, budget allocation, true channel contribution |
| `ta`          | Triple Attribution         | Rules-based multi-touch (first + last + linear blend)                                  | Comparing to platform-reported data, daily monitoring             |
| `ta-views`    | Triple Attribution + Views | Same as TA but includes view-through events                                            | Understanding full-funnel impact including impressions            |
| `linear-all`  | Linear (All)               | Equal credit to every touchpoint in the journey                                        | Fair distribution analysis, no bias toward first/last             |
| `linear-paid` | Linear (Paid)              | Equal credit to paid touchpoints only                                                  | Isolating paid media contribution                                 |
| `first-click` | First Click                | 100% credit to first touchpoint                                                        | Prospecting/awareness campaign evaluation                         |
| `last-click`  | Last Click                 | 100% credit to last touchpoint before purchase                                         | Comparing to Google Analytics defaults, conversion campaigns      |

### When to Use Which Model

- **Day-to-day monitoring:** Total Impact (TI) — most stable and accurate
- **Platform comparison (TW vs Meta):** Triple Attribution (TA) — closest to platform logic
- **Budget allocation decisions:** Total Impact (TI) — accounts for assist value
- **Prospecting evaluation:** First Click — shows which channels discover new customers
- **Retargeting evaluation:** Last Click — shows which channels close the deal
- **Full-funnel analysis:** TA + Views — includes impression impact

**Important:** Total Impact needs at least 7 days of data for stable reads. Single-day TI can fluctuate significantly due to the ML model's learning window.

---

## Quick Reference — API Key Endpoints

| #   | Endpoint                                   | Method | Description                                    |
| --- | ------------------------------------------ | ------ | ---------------------------------------------- |
| 1   | `/users/api-keys/me`                       | GET    | Validate API key, return key metadata          |
| 2   | `/summary-page/get-data`                   | POST   | Dashboard metrics (blended + channel)          |
| 3   | `/attribution/get-orders-with-journeys-v2` | POST   | Order-level attribution with customer journeys |

### Aggregation Commands (built on endpoint #3)

| Command     | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| `ads`       | Ad-level attribution breakdown (orders, revenue, AOV, new %) |
| `adsets`    | Ad set-level attribution breakdown                           |
| `campaigns` | Campaign-level attribution breakdown                         |

All three use the attribution endpoint with API key auth — no OAuth required.

---

## Common Operations

### 1. Validate API Key

```bash
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py test-auth
```

Expected output:

```
Authentication successful!
  Shop: vita-hustle.myshopify.com
  Key name: openclaw-prod
  Scopes: read
```

### 2. Summary Page (Blended Metrics)

```bash
# Last 7 days (default)
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py summary

# Specific date range
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py summary \
  --start 2026-02-13 --end 2026-02-19

# Filter to Meta channel only
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py summary \
  --start 2026-02-13 --end 2026-02-19 --channel meta

# JSON output
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py summary \
  --start 2026-02-13 --end 2026-02-19 --format json

# Save snapshot to history
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py summary \
  --start 2026-02-13 --end 2026-02-19 --save
```

Output (summary format):

```
VitaHustle — Triple Whale Summary (Feb 13 - Feb 19, 2026)

Blended Metrics:
  Total Revenue:               $45,678
  Total Orders:                312
  Blended ROAS:                3.20x
  MER:                         4.10x
  Net Profit:                  $12,345
  Total Spend:                 $14,274
  AOV:                         $146.40
  New Customer Revenue:        $28,200
  Returning Customer Revenue:  $17,478
  NCPA:                        $52.30
  LTV/CPA:                     2.80x
```

### 3. Order Attribution

```bash
# Default (Total Impact, last 7 days, 50 orders)
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py attribution

# Specific model and limit
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py attribution \
  --start 2026-02-19 --end 2026-02-19 --model ti --limit 5

# Triple Attribution model
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py attribution \
  --model ta --start 2026-02-13 --end 2026-02-19

# First Click for prospecting analysis
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py attribution \
  --model first-click --start 2026-02-13 --end 2026-02-19
```

### 4. TW vs Meta Comparison

```bash
# Default comparison (Total Impact)
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py compare \
  --start 2026-02-13 --end 2026-02-19

# Using Triple Attribution model for closer comparison
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py compare \
  --start 2026-02-13 --end 2026-02-19 --model ta
```

Output:

```
TW vs Meta — Feb 13 - Feb 19, 2026
Attribution Model: TI

Metric          | TW (TI)    | Meta Reported | Delta
----------------+------------+---------------+--------
Spend           | $10,500    | $10,500       | --
Revenue         | $33,600    | $38,200       | -12.0%
ROAS            | 3.20x      | 3.64x         | -12.1%
Orders          | 230        | 267           | -13.9%
CPA             | $45.65     | $39.33        | +16.1%

Blended Context:
  Total Revenue:          $45,678
  Total Spend:            $14,274
  Blended ROAS:           3.20x
  MER:                    4.10x
  Net Profit:             $12,345
```

### 5. List Channels

```bash
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py channels \
  --start 2026-02-13 --end 2026-02-19
```

### 6. Ad-Level Breakdown

```bash
# All Meta ads, sorted by revenue (default)
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py ads \
  --start 2026-02-13 --end 2026-02-19 --source meta

# Top 10 Meta ads
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py ads \
  --start 2026-02-13 --end 2026-02-19 --source meta --limit 10

# All ads across all sources (includes organic, google, etc.)
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py ads \
  --start 2026-02-13 --end 2026-02-19

# Ads in a specific campaign (use campaign ID)
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py ads \
  --start 2026-02-13 --end 2026-02-19 --campaign 120227473046300409 --sort orders

# JSON output for piping
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py ads \
  --start 2026-02-13 --end 2026-02-19 --source meta --format json
```

### 7. Ad Set-Level Breakdown

```bash
# Meta ad sets
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py adsets \
  --start 2026-02-13 --end 2026-02-19 --source meta

# Ad sets in a specific campaign
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py adsets \
  --start 2026-02-13 --end 2026-02-19 --source meta --campaign 120227473046300409

# Top 5 ad sets by AOV
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py adsets \
  --start 2026-02-13 --end 2026-02-19 --source meta --sort aov --limit 5
```

### 8. Campaign-Level Breakdown

```bash
# All campaigns across all sources
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py campaigns \
  --start 2026-02-13 --end 2026-02-19

# Meta campaigns only, sorted by orders
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py campaigns \
  --start 2026-02-13 --end 2026-02-19 --source meta --sort orders

# Using linear model instead of last platform click
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py campaigns \
  --start 2026-02-13 --end 2026-02-19 --model linear
```

### Aggregation Command Options (ads, adsets, campaigns)

| Option       | Default    | Description                                                                             |
| ------------ | ---------- | --------------------------------------------------------------------------------------- |
| `--start`    | 7 days ago | Start date (YYYY-MM-DD)                                                                 |
| `--end`      | yesterday  | End date (YYYY-MM-DD)                                                                   |
| `--model`    | `lpc`      | Attribution model: `lpc` (last platform click), `last`, `first`, `linear`, `linear-all` |
| `--source`   | (all)      | Filter by source: `meta`/`facebook`, `google`, `snap`, `tiktok`, `klaviyo`              |
| `--campaign` | (all)      | Filter by campaign ID (ads and adsets only)                                             |
| `--sort`     | `revenue`  | Sort by: `revenue`, `orders`, `aov`                                                     |
| `--limit`    | 0 (all)    | Max rows to display                                                                     |
| `--format`   | `summary`  | Output format: `summary`, `table`, `json`                                               |
| `--no-names` | off        | Skip Meta API name resolution (show raw numeric IDs)                                    |

**Name resolution:** Numeric ad/adset/campaign IDs from Facebook and Google are
automatically resolved to human-readable names via the Meta Insights API. This adds
one extra API call per query. IDs that can't be resolved (paused/deleted ads not in
the date range) show with a `(?)` suffix. Use `--no-names` to skip resolution.
Auto-paginates up to 500 orders per query.

---

## Summary Page Metrics Reference

The summary page endpoint can return these metrics (availability depends on your TW plan and connected integrations):

### Blended/Top-Level Metrics

| Metric                     | Key                        | Description                                                |
| -------------------------- | -------------------------- | ---------------------------------------------------------- |
| Total Revenue              | `totalRevenue`             | All revenue across all channels                            |
| Total Orders               | `totalOrders`              | All orders across all channels                             |
| Blended ROAS               | `blendedRoas`              | Total Revenue / Total Spend                                |
| MER                        | `mer`                      | Marketing Efficiency Ratio (Revenue / All Marketing Spend) |
| Net Profit                 | `netProfit`                | Revenue minus COGS minus ad spend minus fees               |
| Total Spend                | `totalSpend`               | All ad spend across all channels                           |
| AOV                        | `aov`                      | Average Order Value                                        |
| New Customer Revenue       | `newCustomerRevenue`       | Revenue from first-time buyers                             |
| Returning Customer Revenue | `returningCustomerRevenue` | Revenue from repeat buyers                                 |
| New Customer Orders        | `newCustomerOrders`        | Orders from first-time buyers                              |
| Returning Customer Orders  | `returningCustomerOrders`  | Orders from repeat buyers                                  |
| NCPA                       | `ncpa`                     | New Customer CPA                                           |
| LTV/CPA                    | `ltvToCpa`                 | Customer Lifetime Value to Cost Per Acquisition ratio      |

### Channel-Level Metrics (per channel)

| Metric      | Key           | Description                  |
| ----------- | ------------- | ---------------------------- |
| Spend       | `spend`       | Channel ad spend             |
| Revenue     | `revenue`     | Channel attributed revenue   |
| ROAS        | `roas`        | Channel return on ad spend   |
| CPA         | `cpa`         | Channel cost per acquisition |
| Purchases   | `purchases`   | Channel attributed orders    |
| Impressions | `impressions` | Channel impression count     |
| Clicks      | `clicks`      | Channel click count          |
| CTR         | `ctr`         | Channel click-through rate   |
| CPM         | `cpm`         | Channel cost per mille       |
| CPC         | `cpc`         | Channel cost per click       |

### Available Channel Filters

- `meta` — Facebook/Instagram
- `google` — Google Ads
- `tiktok` — TikTok Ads
- `snapchat` — Snapchat Ads
- `pinterest` — Pinterest Ads
- `email` — Email (Klaviyo, etc.)
- `sms` — SMS (Attentive, etc.)
- `organic` — Organic traffic
- `direct` — Direct traffic
- `referral` — Referral traffic

---

## Rate Limits

Triple Whale uses standard rate limiting:

| Status      | Meaning      | Action                                                      |
| ----------- | ------------ | ----------------------------------------------------------- |
| 429         | Rate limited | Respect `Retry-After` header, retry after specified seconds |
| 200         | Success      | Process response                                            |
| 401         | Unauthorized | Check API key                                               |
| 403         | Forbidden    | Key lacks required scope                                    |
| 404         | Not found    | Check endpoint path                                         |
| 500/502/503 | Server error | Retry with backoff (1s, 2s, 4s)                             |

The helper script handles retries automatically (3 retries for 429/5xx with backoff).

---

## Future: OAuth Endpoints

These endpoints require OAuth app registration and are stubbed in the script for future upgrade.

### Moby AI

- **Endpoint:** `POST /orcabase/api/moby`
- **Auth:** Bearer token (OAuth)
- **Description:** Natural-language analytics queries
- **Example:** "What was our best performing ad creative last week?"

### SQL (ClickHouse)

- **Endpoint:** `POST /orcabase/api/sql`
- **Auth:** Bearer token (OAuth)
- **Description:** Direct SQL against TW's ClickHouse tables
- **Key Tables:**
  - `pixel_joined_tvf` — Pixel event data with attribution
  - `blended_stats_tvf` — Blended metrics by date/channel
  - `orders_tvf` — Order data with customer info

### Enabling OAuth

1. Register an app at `developers.triplewhale.com`
2. Implement OAuth 2.0 flow (authorization code grant)
3. Store access + refresh tokens in `.env`
4. Add token refresh logic to the helper script

---

## Error Handling

| Error                              | Cause                      | Fix                                                |
| ---------------------------------- | -------------------------- | -------------------------------------------------- |
| `TRIPLE_WHALE_API_KEY not set`     | Missing env var            | Add key to `.env`                                  |
| `TRIPLE_WHALE_SHOP_DOMAIN not set` | Missing env var            | Add domain to `.env`                               |
| `HTTP 401`                         | Invalid or expired API key | Regenerate key in TW settings                      |
| `HTTP 403`                         | Key lacks scope            | Check key permissions                              |
| `HTTP 429`                         | Rate limited               | Script auto-retries; if persistent, wait and retry |
| `Connection error`                 | Network issue              | Check connectivity, TW status page                 |
| `Invalid date format`              | Bad date string            | Use YYYY-MM-DD format                              |

---

## Script Usage Reference

```bash
# Full CLI help
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py --help

# Command-specific help
uv run ~/.openclaw-vitahustle/skills/triple-whale/scripts/triple_whale_api_helper.py summary --help

# Global options (apply to all commands)
#   --format json|table|summary   Output format (default: summary)

# summary options
#   --start YYYY-MM-DD            Start date (default: 7 days ago)
#   --end YYYY-MM-DD              End date (default: yesterday)
#   --channel CHANNEL             Filter by channel
#   --metrics METRIC1,METRIC2     Filter specific metrics
#   --save                        Save snapshot to history/

# attribution options
#   --start YYYY-MM-DD            Start date
#   --end YYYY-MM-DD              End date
#   --model MODEL                 ti|ta|ta-views|linear-all|linear-paid|first-click|last-click
#   --limit N                     Max orders (default: 50)

# compare options
#   --start YYYY-MM-DD            Start date
#   --end YYYY-MM-DD              End date
#   --model MODEL                 Attribution model for TW side

# channels options
#   --start YYYY-MM-DD            Start date
#   --end YYYY-MM-DD              End date
```

---

## Source of Truth Rules

1. **TW > Meta for all ad decisions.** Meta self-reported data is directional only.
2. **Default to Total Impact (TI)** for strategic decisions. Use TA for platform comparisons.
3. **Flag discrepancies > 15%** between TW and Meta revenue/ROAS — this indicates Meta is likely over-counting.
4. **TI needs 7+ days** for stable reads. Don't make single-day TI decisions.
5. **Blended ROAS and MER** are the ultimate KPIs — they account for ALL spend vs ALL revenue.
6. **Net Profit** is the bottom line — revenue minus COGS minus spend minus fees.
7. **NCPA** (New Customer CPA) matters more than overall CPA for growth.
8. **LTV/CPA > 3x** is healthy. Below 2x is a warning.

---

## Common Pitfalls

1. **Shop domain format:** Must be `vita-hustle.myshopify.com` (not `vitahustle.com` or `https://...`)
2. **Date range matters:** TI model needs 7+ days. Single-day data is noisy.
3. **Channel names are lowercase:** Use `meta` not `Meta` or `Facebook`
4. **Compare needs context:** The `compare` command fetches TW's view of Meta. For Meta's self-reported numbers, also run the meta-ads script.
5. **Snapshots are local:** History files are stored in the skill's `history/` directory, not synced anywhere.
6. **OAuth vs API Key:** The `moby` and `sql` commands are stubs — they'll tell you OAuth is needed.

---

## Output Formatting

### Summary Format (default, Slack-friendly)

- Human-readable labels with aligned values
- Currency formatted as `$X,XXX` or `$X.XM`
- ROAS/MER as `X.XXx`
- Percentages as `X.X%`
- Numbers with commas

### Table Format

- ASCII table with column headers and separator
- Fixed-width columns for alignment
- Same value formatting as summary

### JSON Format

- Raw API response, pretty-printed
- Useful for piping to `jq` or other tools
- Includes all fields returned by the API

---

## Cross-Skill Orchestration

This skill works alongside `meta-ads` for complete analytics:

1. **"How are ads doing?"** — Run meta-ads report + TW summary (meta channel). Present both.
2. **"What's our real ROAS?"** — Run TW summary. Present blended ROAS and MER.
3. **"Sanity check the numbers"** — Run TW compare. Flag deltas > 15%.
4. **"Budget decision"** — Run TW summary with TI model. Use TW numbers for the decision.

The agent handles orchestration automatically — see ROUTING.md for trigger mappings.
