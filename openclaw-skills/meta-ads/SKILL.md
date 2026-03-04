---
name: meta-ads
description: Complete Meta Marketing API reference for campaign creation, insights queries, error handling, batch operations, and all Meta/Facebook advertising tasks. Read for ANY Meta Ads API work.
---

# Meta Ads API Skill

Complete reference for the Meta (Facebook) Marketing API. Use this skill for ANY task involving Meta Ads — campaign creation, insights queries, audience targeting, creative management, error handling, rate limits, batch operations, and platform-specific ad types (Instagram, Threads, Reels).

This file contains distilled core knowledge. For detailed implementation steps, consult the reference files listed in the Routing Table below.

---

## Environment Variables

| Variable             | Description                           | Example         |
| -------------------- | ------------------------------------- | --------------- |
| `META_APP_ID`        | Your Meta app ID                      | `123456789`     |
| `META_APP_SECRET`    | App secret (never expose client-side) | `abc123...`     |
| `META_ACCESS_TOKEN`  | System user or long-lived token       | `EAAx...`       |
| `META_AD_ACCOUNT_ID` | Ad account ID with `act_` prefix      | `act_123456789` |
| `META_BUSINESS_ID`   | Business Manager ID                   | `987654321`     |
| `META_PIXEL_ID`      | Meta Pixel ID for conversion tracking | `111222333`     |
| `META_API_VERSION`   | Graph API version                     | `v24.0`         |

**Critical**: Always include the `act_` prefix on ad account IDs. Omitting it is the #1 cause of "invalid parameter" errors.

---

## Ad Hierarchy Quick Reference

```
Campaign (objective, budget strategy, special_ad_categories)
  └── Ad Set (targeting, budget, schedule, optimization_goal, billing_event)
        └── Ad Creative (image/video, text, CTA, link)
              └── Ad (creative_id + ad_set_id, status)
```

### ODAX Objectives (Outcome-Driven Ad Experiences)

| Objective               | Use Case                               |
| ----------------------- | -------------------------------------- |
| `OUTCOME_AWARENESS`     | Brand awareness, reach                 |
| `OUTCOME_TRAFFIC`       | Website/app visits                     |
| `OUTCOME_ENGAGEMENT`    | Post engagement, video views, messages |
| `OUTCOME_LEADS`         | Lead generation forms                  |
| `OUTCOME_APP_PROMOTION` | App installs, app events               |
| `OUTCOME_SALES`         | Conversions, catalog sales             |

### Required Fields Per Level

- **Campaign**: `name`, `objective`, `status`, `special_ad_categories` (required even if empty `[]`)
- **Ad Set**: `name`, `campaign_id`, `targeting`, `optimization_goal`, `billing_event`, `bid_amount` or `daily_budget`/`lifetime_budget`, `start_time`
- **Ad Creative**: `name`, `object_story_spec` (with `page_id` + creative content)
- **Ad**: `name`, `adset_id`, `creative` (with `creative_id`), `status`

---

## Campaign & Ad Set Management

The agent CAN read AND write to the Meta Ads API (token has `ads_management` scope). This includes modifying budgets, pausing/resuming, and creating new objects.

### Safety Rules (ALWAYS FOLLOW)

1. **Confirm before any write operation.** Always show the user what you're about to change and get explicit approval before executing. Example: "I'll increase Ad Set 'Cold - Women 25-44' daily budget from $50 to $75. Proceed?"
2. **Never delete campaigns/ad sets/ads.** Use `PAUSED` or `ARCHIVED` status instead. Deletion is irreversible.
3. **Budget changes: show before/after.** Always read the current budget first, show the delta, and confirm.
4. **Never modify ACTIVE campaigns without confirmation** — even "safe" changes like name updates.
5. **Log every write operation.** After any successful mutation, report the object ID, what changed, and the API response.

### Ad Set Operations (Most Common)

```bash
# Read ad set details (budget, targeting, status)
GET /{ADSET_ID}?fields=name,daily_budget,lifetime_budget,status,targeting,optimization_goal,bid_amount,campaign_id,start_time,end_time

# Update ad set daily budget (value in CENTS — $50 = 5000)
POST /{ADSET_ID}
  daily_budget=7500&access_token={TOKEN}

# Update ad set lifetime budget
POST /{ADSET_ID}
  lifetime_budget=100000&access_token={TOKEN}

# Pause an ad set
POST /{ADSET_ID}
  status=PAUSED&access_token={TOKEN}

# Resume an ad set
POST /{ADSET_ID}
  status=ACTIVE&access_token={TOKEN}

# Update targeting
POST /{ADSET_ID}
  targeting={"geo_locations":{"countries":["US","CA"]},"age_min":25,"age_max":54}

# Update bid
POST /{ADSET_ID}
  bid_amount=350&access_token={TOKEN}
```

**CRITICAL: Budgets are in CENTS.** `daily_budget=5000` means $50.00. Always convert dollars to cents before sending and display in dollars to the user.

### Campaign Operations

```bash
# Update campaign budget (CBO — Campaign Budget Optimization)
POST /{CAMPAIGN_ID}
  daily_budget=10000&access_token={TOKEN}

# Pause/resume campaign (affects all child ad sets and ads)
POST /{CAMPAIGN_ID}
  status=PAUSED&access_token={TOKEN}

# Update campaign name
POST /{CAMPAIGN_ID}
  name=New+Campaign+Name&access_token={TOKEN}
```

### Ad Operations

```bash
# Pause a specific ad
POST /{AD_ID}
  status=PAUSED&access_token={TOKEN}

# Update ad creative
POST /{AD_ID}
  creative={"creative_id":"NEW_CREATIVE_ID"}&access_token={TOKEN}
```

### Ad Set Level Insights (for breakdowns)

```bash
# Ad set breakdown for a specific campaign
GET /{CAMPAIGN_ID}/insights?
  level=adset
  &fields=adset_name,adset_id,spend,impressions,clicks,actions,action_values,purchase_roas,outbound_clicks,cost_per_outbound_click,cost_per_action_type
  &date_preset=today
  &access_token={TOKEN}

# Ad set breakdown for entire account
GET /{AD_ACCOUNT_ID}/insights?
  level=adset
  &fields=adset_name,adset_id,campaign_name,spend,impressions,clicks,actions,action_values,purchase_roas,outbound_clicks,cost_per_outbound_click,cost_per_action_type
  &date_preset=today
  &access_token={TOKEN}
```

### Typical Workflow: Review Then Adjust

1. User asks: "Show me ad set performance for the Shopify TOF campaign"
2. Agent pulls ad set-level insights for that campaign
3. User says: "Increase budget on the top performer by 20%"
4. Agent reads current budget: `GET /{ADSET_ID}?fields=name,daily_budget`
5. Agent calculates new budget and confirms: "Ad Set 'Lookalike 1%' daily budget: $50 → $60. Confirm?"
6. User confirms
7. Agent executes: `POST /{ADSET_ID} daily_budget=6000`
8. Agent verifies: re-reads the ad set to confirm the change took effect

---

## Common API Patterns

**Base URL**: `https://graph.facebook.com/{API_VERSION}/`

**Authentication**: Append `access_token` as query param or use `Authorization: Bearer {token}` header.

### CRUD Operations

```bash
# Create campaign
POST /act_{AD_ACCOUNT_ID}/campaigns
  name, objective, status, special_ad_categories

# Read campaign
GET /{CAMPAIGN_ID}?fields=name,status,objective

# Update campaign
POST /{CAMPAIGN_ID}
  name=Updated+Name&status=PAUSED

# Delete (archive)
POST /{CAMPAIGN_ID}  status=ARCHIVED
# or
DELETE /{CAMPAIGN_ID}
```

### Batch Requests (max 50 per batch)

```bash
POST /
  batch=[
    {"method":"GET","relative_url":"<CAMPAIGN_ID>?fields=name,status"},
    {"method":"GET","relative_url":"<ADSET_ID>?fields=name,daily_budget"}
  ]
  &access_token={TOKEN}
```

### Pagination (Cursor-Based)

Responses with multiple results return `paging.cursors.after` and `paging.next`. Loop until `paging.next` is absent:

```
GET /act_{ID}/campaigns?fields=name,status&limit=25&after={CURSOR}
```

### Field Expansion

Request nested fields in a single call:

```
GET /act_{ID}/campaigns?fields=name,adsets{name,daily_budget,targeting}
```

---

## Insights API Cheat Sheet

### Endpoints

| Endpoint                            | Scope          |
| ----------------------------------- | -------------- |
| `GET /act_{AD_ACCOUNT_ID}/insights` | Account-level  |
| `GET /{CAMPAIGN_ID}/insights`       | Campaign-level |
| `GET /{ADSET_ID}/insights`          | Ad set-level   |
| `GET /{AD_ID}/insights`             | Ad-level       |

### Key Parameters

| Parameter           | Values / Notes                                                          |
| ------------------- | ----------------------------------------------------------------------- |
| `fields`            | `impressions,clicks,spend,ctr,cpc,cpm,actions,conversions`              |
| `level`             | `account`, `campaign`, `adset`, `ad` (aggregation level)                |
| `date_preset`       | `today`, `yesterday`, `last_7d`, `last_30d`, `this_month`, `last_month` |
| `time_range`        | `{"since":"2025-01-01","until":"2025-01-31"}`                           |
| `time_increment`    | `1` (daily), `7` (weekly), `monthly`, `all_days`                        |
| `breakdowns`        | `age`, `gender`, `country`, `publisher_platform`, `device_platform`     |
| `action_breakdowns` | `action_type`, `action_device`                                          |
| `filtering`         | `[{"field":"impressions","operator":"GREATER_THAN","value":"100"}]`     |

### Async Reports (Required for >7 days of data)

```bash
# 1. Create async job
POST /act_{AD_ACCOUNT_ID}/insights
  date_preset=last_30d&level=ad&fields=...

# Response: {"report_run_id": "123456"}

# 2. Poll for completion
GET /123456?fields=async_status,async_percent_completion
# Wait until async_status = "Job Completed" and async_percent_completion = 100

# 3. Fetch results
GET /123456/insights
```

### Data Freshness

- Real-time metrics refresh every **15 minutes**
- Finalized data available after **28 days** (attribution window)
- 1-3 day lag for some breakdown combinations

---

## Rate Limiting & Error Handling

### Throttle Headers (check on EVERY response)

| Header                       | What It Tells You                                                        |
| ---------------------------- | ------------------------------------------------------------------------ |
| `x-fb-ads-insights-throttle` | Insights-specific: `{app_id_util_pct, cpu_id_util_pct, acc_id_util_pct}` |
| `x-ad-account-usage`         | Account-level: `{acc_id_util_pct, reset_time_duration}`                  |
| `x-business-use-case-usage`  | BUC rate limit: per-business, per-endpoint usage                         |
| `X-App-Usage`                | Platform rate limit: `{call_count, total_cputime, total_time}`           |

### Key Error Codes

| Code | Subcode | Meaning                              | Action                                  |
| ---- | ------- | ------------------------------------ | --------------------------------------- |
| 4    | —       | Application request limit reached    | Back off exponentially, check headers   |
| 17   | —       | User request limit reached           | Wait, reduce request volume             |
| 100  | 1487534 | Invalid parameter                    | Check field names, types, `act_` prefix |
| 100  | 1504022 | Missing required field               | Add the specified required field        |
| 190  | —       | Invalid/expired access token         | Refresh token, check permissions        |
| 2635 | —       | You are calling a deprecated version | Upgrade API version                     |

### Backoff Strategy

1. On error code 4 or 17: wait `2^attempt * 60` seconds (max 5 min)
2. On `acc_id_util_pct > 75`: slow requests by 50%
3. On `acc_id_util_pct > 90`: pause for `reset_time_duration` seconds
4. Always add jitter: `± random(0, 0.3 * delay)`

---

## Reference File Routing Table

For detailed implementation, read the appropriate reference file from `~/.openclaw/skills/meta-ads/references/`:

| Task / Question                                                         | Reference File                     |
| ----------------------------------------------------------------------- | ---------------------------------- |
| App setup, tokens, OAuth, permissions, business verification            | `01-auth-and-setup.md`             |
| Creating campaigns, ad sets, ad creatives, ads                          | `02-campaign-creation.md`          |
| Pausing, archiving, deleting, modifying campaigns                       | `03-campaign-management.md`        |
| Custom audiences, lookalikes, budget optimization                       | `04-optimization-and-analytics.md` |
| Conversions API, ad creative details, placements, previews              | `05-conversions-and-creative.md`   |
| Video ads, carousel ads, video upload, video metrics                    | `06-video-carousel-ads.md`         |
| Instagram ads, Threads ads, Partnership ads                             | `07-platform-specific.md`          |
| Advantage+ campaigns, shopping, cross-channel optimization              | `08-advantage-plus.md`             |
| Asset feed spec, dynamic creative, branded content, A+ catalog/creative | `09-creative-features.md`          |
| Generative AI features, collaborative ads, reels, flexible format       | `10-generative-ai-advanced.md`     |
| Insights queries, breakdowns, async jobs, split testing, MMM            | `11-insights-api.md`               |
| Pagination, rate limits, batch requests, errors, versioning, debug      | `12-api-infrastructure.md`         |
| Full API reference, endpoint specs, secure calls, status management     | `13-reference-and-status.md`       |

---

## CGK Default Reporting (ALWAYS FOLLOW)

When pulling Meta Ads performance for the CGK account (`{AD_ACCOUNT_ID}`), ALWAYS apply these defaults unless the user explicitly asks for something different.

### Default Metrics

Every report MUST include: **Spend**, **ROAS**, **Revenue**, **CPA**.

API fields to request:

```
fields=campaign_name,spend,actions,action_values,cost_per_action_type,purchase_roas,outbound_clicks,cost_per_outbound_click,impressions,clicks,ctr
```

How to extract:

- **Revenue**: `action_values` where `action_type = "purchase"` → this is the total conversion value
- **ROAS**: `purchase_roas` → or calculate as `revenue / spend`
- **CPA**: `cost_per_action_type` where `action_type = "purchase"` → or calculate as `spend / purchases`
- **Purchases**: `actions` where `action_type = "purchase"`

### Channel Segmentation (Amazon vs Shopify)

ALWAYS split results into two groups:

**Amazon campaigns** — any campaign with `Amz` in the name.
Report these metrics:

- Spend
- Outbound Link Clicks (`outbound_clicks` where `action_type = "outbound_click"`)
- Cost per Outbound Link Click (`cost_per_outbound_click` or `spend / outbound_clicks`)

> Why: Amazon conversions happen on Amazon, not trackable via Meta Pixel. ROAS/Revenue/CPA are not available. Outbound link clicks are the primary performance signal.

**Shopify campaigns** — all other campaigns (no `Amz` in name).
Report these metrics:

- Spend
- Revenue
- ROAS
- CPA
- Purchases (from `actions` where `action_type = "purchase"`)

### Filtering Logic

```python
# Segment campaigns by channel (case-insensitive — matches "Amz", "AMZ", "amz", etc.)
amazon_campaigns = [c for c in campaigns if "amz" in c.get("campaign_name", "").lower()]
shopify_campaigns = [c for c in campaigns if "amz" not in c.get("campaign_name", "").lower()]
```

### Example Output Format

When user asks "how are Meta ads doing today":

```
SHOPIFY CAMPAIGNS
  Total Spend:    $414.97
  Revenue:        $1,245.00
  ROAS:           3.00x
  CPA:            $18.04
  Purchases:      23

AMAZON CAMPAIGNS
  Total Spend:    $427.02
  Outbound Clicks: 2,615
  Cost/Click:     $0.16

ACCOUNT TOTAL
  Total Spend:    $841.99
```

### API Call Template

```bash
GET /{AD_ACCOUNT_ID}/insights?
  date_preset=today
  &level=campaign
  &fields=campaign_name,spend,impressions,clicks,ctr,actions,action_values,cost_per_action_type,purchase_roas,outbound_clicks,cost_per_outbound_click
  &access_token={TOKEN}
```

---

## Campaign & Ad Set Management

### Safety Rules

- **ALWAYS confirm with user before any write operation** (pause, budget change, status change)
- **Never delete** — use `PAUSED` or `ARCHIVED` instead
- **Budgets are in CENTS** — $50/day = `5000`, $100/day = `10000`
- **Log every write operation** — note what changed, old value, new value

### Ad Set Operations

**Get ad set details:**

```
GET /{ADSET_ID}?fields=name,daily_budget,lifetime_budget,status,targeting,optimization_goal,bid_amount&access_token={TOKEN}
```

**Change daily budget** (cents):

```
POST /{ADSET_ID}
  daily_budget=5000&access_token={TOKEN}
```

**Pause an ad set:**

```
POST /{ADSET_ID}
  status=PAUSED&access_token={TOKEN}
```

**Resume an ad set:**

```
POST /{ADSET_ID}
  status=ACTIVE&access_token={TOKEN}
```

### Campaign Operations

**Pause a campaign** (pauses all child ad sets/ads):

```
POST /{CAMPAIGN_ID}
  status=PAUSED&access_token={TOKEN}
```

**Archive a campaign** (soft delete, cannot be reactivated):

```
POST /{CAMPAIGN_ID}
  status=ARCHIVED&access_token={TOKEN}
```

### Ad Operations

**Pause/resume an individual ad:**

```
POST /{AD_ID}
  status=PAUSED&access_token={TOKEN}
```

### Ad Set Level Insights

```
GET /{ADSET_ID}/insights?fields=adset_name,spend,impressions,clicks,actions,action_values,purchase_roas,cost_per_action_type&date_preset=today&access_token={TOKEN}
```

### Typical Workflow

1. User asks: "Show me ad set performance for campaign X"
2. List ad sets: `GET /{CAMPAIGN_ID}/adsets?fields=name,status,daily_budget,insights.date_preset(today){spend,impressions,actions}`
3. Display results with budget and performance
4. User says: "Increase budget on ad set Y to $75/day"
5. Confirm: "I'll change ad set Y daily budget from $5000 to $7500 (cents). Proceed?"
6. Execute POST and confirm success

---

## CGK Platform Integration Notes

When implementing Meta Ads features in the CGK platform:

- **SDK**: Use `facebook-nodejs-business-sdk` (official Node.js SDK)
- **Multi-tenant**: Store per-tenant Meta credentials in `tenant_api_credentials` table, accessed via `getTenantMetaClient(tenantId)`
- **Cache**: Cache Insights responses with **15-minute TTL** (matches refresh cadence)
- **Admin routes only**: All Meta Ads API routes go under `/api/admin/*` (requires auth)
- **Webhook handling**: Meta sends webhooks for lead ads — register via App Dashboard, verify with `X-Hub-Signature-256`
- **Token refresh**: System user tokens don't expire; page tokens need refresh. Store token type alongside the token.
- **Error propagation**: Surface Meta API error messages to the admin UI — they contain actionable information

---

## Utility Script Usage

The helper script at `~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py` provides quick diagnostics:

```bash
# Validate access token (check permissions, expiry)
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py validate-token

# Get ad account info (name, status, currency, timezone)
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py account-info

# Check rate limit utilization
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py health-check

# List recent campaigns
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py list-campaigns --limit 10

# Account-level insights summary
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py insights-summary --date-preset last_7d

# Full token debug info
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py debug-token
```

Credentials auto-load from `~/.openclaw/skills/meta-ads/.env` — no env vars needed. The script works in clean shell environments without any environment setup.

---

## Common Pitfalls

1. **Missing `act_` prefix**: Ad account IDs MUST start with `act_`. API returns generic "invalid parameter" without it.
2. **Sync Insights for >7 days**: Use async reports. Sync calls with large date ranges timeout or return incomplete data.
3. **Batch limit**: Max **50** requests per batch call. Exceeding silently drops extras.
4. **`special_ad_categories`**: Required on campaign creation even when empty — pass `[]`.
5. **Deprecated objectives**: Use ODAX objectives (`OUTCOME_*`). Legacy objectives like `LINK_CLICKS` still work but may be removed.
6. **Field expansion depth**: Max 2 levels of nesting in field expansion queries.
7. **Token type mismatch**: Page tokens can't access ad accounts. Use system user tokens for API automation.
8. **Rate limit per account, not per token**: Multiple tokens hitting the same ad account share rate limits.
9. **Attribution window**: Conversion data can change for up to 28 days. Don't treat recent data as final.
10. **API versioning**: Meta deprecates versions ~2 years after release. Pin to a version and plan upgrades.

---

## Unified Ad Pipeline

Stage or launch ad creatives via a single 10-step session workflow using `stage_ad_safe.sh`. Supports both staging (PAUSED creative testing campaign) and production launch (any campaign). The wrapper enforces step ordering — you cannot skip ahead.

**Do NOT call `meta_api_helper.py stage-ad` or `launch-ad` directly — both are env-gated and will reject direct calls. Use `stage_ad_safe.sh` exclusively.**

### One-Time Setup

```bash
# 1. Discover your Facebook Page and Instagram account
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py discover-page

# 2. Create the PAUSED staging campaign
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py setup-staging --yes
```

Both commands save results to `.staging.json`. Only needs to be run once.

### 10-Step Workflow

| Step | Command                                                             | Description                      | Gate            |
| ---- | ------------------------------------------------------------------- | -------------------------------- | --------------- |
| 1    | `start --media <path>[,<path2>,<path3>]`                            | Check media, create session      | —               |
| 2    | `confirm-media --session <ID> --description "..."`                  | Record vision analysis           | media_checked   |
| 3    | `set-product --session <ID> --product "..."`                        | Record user-confirmed product    | vision          |
| 4    | `get-copy-options --session <ID> [--top 5]`                         | Show copy options with ROAS      | product         |
| 5    | `set-copy --session <ID> --copy-from <ad_id>`                       | Record user's copy choice        | product         |
| 6    | `set-destination --session <ID> --campaign-id <ID> --adset-id <ID>` | Campaign/adset selection         | copy            |
| 7    | `set-budget --session <ID> --budget 50 --budget-type daily`         | Budget + bid strategy            | destination     |
| 8    | `set-status --session <ID> --status PAUSED\|ACTIVE`                 | Ad status                        | budget          |
| 9    | `plan --session <ID> [--name "Ad Name"]`                            | Create plan (requires steps 1-8) | ALL steps       |
| 10   | `execute --plan <plan_file>`                                        | Route to stage-ad or launch-ad   | valid plan file |

Each step validates that its prerequisite is complete. The `plan` command refuses to run unless ALL steps 1-8 are done.

**Routing:** The destination set in Step 6 determines the route:

- `--campaign-id staging --adset-id staging` → routes to `stage-ad` (creative testing)
- Any other campaign/adset → routes to `launch-ad` (production)

### Multi-File Media Support

`--media` accepts comma-separated paths for multiple sizes of the same creative:

```bash
stage_ad_safe.sh start \
  --media /path/to/1x1.png,/path/to/9x16.png,/path/to/16x9.png
```

- Each file is validated for existence and readiness (size stability polling)
- Each file is ffprobed for type and dimensions
- All files must be the same media type (all images or all videos)
- Single-file calls work as before (no comma = single path)
- Vision analysis is only needed on ONE file when multiple sizes are provided

### Utility Commands

```bash
# Check session progress
stage_ad_safe.sh session-status --session <ID>

# List active sessions
stage_ad_safe.sh list-sessions

# Standalone media check (no session)
stage_ad_safe.sh check-media --path /path/to/file.mp4
```

### Ad Set Naming Convention

Ad sets are named `{Format} | {Product} | {MM.DD.YY}` to group creatives by media type, product, and date. Format is auto-detected (`Static` for images, `Video` for videos). Same format + product + date reuses the existing ad set.

### Product Detection

The product name is determined dynamically — no hardcoded list. Priority:

1. **Conversation context** — user mentioned the product
2. **MCP tool discovery** — `search_tools("products")` or brand knowledge tools
3. **Account discovery** — `list-ad-copy` or `insights-summary` for existing names
4. **Vision analysis** — Gemini vision on the creative file
5. **Ask the user** — if still uncertain

### Placement Mapping

Media files are auto-detected by filename pattern (`1x1`, `4x5`, `9x16`, `16x9`) and mapped to Meta placements using PAC:

| Priority | Ratio            | Placements                                                           |
| -------- | ---------------- | -------------------------------------------------------------------- |
| 1        | 9:16             | FB/IG Stories, Reels, IG Search, IG Profile Reels, Messenger Stories |
| 2        | 16:9             | FB Right Column, Search, Video Feeds, In-stream, Audience Network    |
| 3        | 4:5              | IG Feed, Explore, Profile Feed                                       |
| 4        | 1:1              | FB Feed, Marketplace (if not catch-all)                              |
| Last     | _best available_ | Catch-all — all unclaimed placements                                 |

Catch-all priority: 1x1 > 4x5 > 16x9 > 9x16. Single-file uploads use simple `link_data`/`video_data` (no PAC).

### Ad Management (Edit, Duplicate, Inspect)

Meta creatives are **immutable** after creation. "Editing" creates a new creative and swaps it in. "Duplicating" to a different ad set creates a new ad.

```bash
# View full ad details
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py get-ad --ad-id <AD_ID>

# Edit ad copy (creates new creative, swaps)
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py edit-ad --ad-id <AD_ID> \
  --body "New body text" --headline "New Headline" --yes

# Add/change URL tracking tags
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py edit-ad --ad-id <AD_ID> \
  --url-tags "utm_source=meta&utm_medium=paid" --yes

# Duplicate ad to a different ad set
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py duplicate-ad \
  --ad-id <AD_ID> --to-adset <ADSET_ID> --yes

# Duplicate with copy overrides
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py duplicate-ad \
  --ad-id <AD_ID> --to-adset <ADSET_ID> \
  --body "Override text" --name "New Ad Name" --status PAUSED --yes
```

### Budget Updates

```bash
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py update-budget \
  --id <CAMPAIGN_OR_ADSET_ID> --budget 100 [--type daily|lifetime] [--yes]
```

Auto-detects CBO vs ABO. For ABO campaigns without campaign-level budget, lists ad sets and exits with instructions.

### Bid Strategies Reference

| Strategy        | CLI Value                   | Required Flags | When to Use                                |
| --------------- | --------------------------- | -------------- | ------------------------------------------ |
| **Lowest Cost** | `LOWEST_COST_WITHOUT_CAP`   | none           | Default. Max conversions, no cost control. |
| **Cost Cap**    | `COST_CAP`                  | `--bid-amount` | Control average CPA.                       |
| **Bid Cap**     | `LOWEST_COST_WITH_BID_CAP`  | `--bid-amount` | Hard ceiling per bid.                      |
| **Min ROAS**    | `LOWEST_COST_WITH_MIN_ROAS` | `--roas-floor` | Maintain minimum ROAS.                     |

### Copy Generation Rules (MANDATORY)

1. **Always search brand context first** — `search_brand_knowledge`, `get_brand_context_overview`
2. **Reference top-performing ads** — `get_creative_performance`, `list-ad-copy --top 5`
3. **Model: Claude Opus 4.6 required** for all ad copy generation. Never use Flash/Haiku.
4. **Ground copy in data** — real product attributes, proven patterns, brand voice
5. **No hallucinated claims** — never invent benefits or stats not in brand knowledge

### Safety Rules

- NEVER skip copy verification — user must see and approve exact copy
- NEVER launch ACTIVE without explicit user confirmation
- Warn if budget exceeds $500/day
- All operations logged to `logs/staging.log`

### Ad Set Management (update-adset, duplicate-adset)

```bash
# Change bid strategy on existing ad set
uv run meta_api_helper.py update-adset --adset-id <ID> --bid-strategy COST_CAP --bid-amount 25 --yes

# Duplicate ad set to another campaign (with ads)
uv run meta_api_helper.py duplicate-adset --adset-id <ID> --to-campaign <ID> --include-ads --yes
```

### Config Files

- **`.staging.json`**: Persists `staging_campaign_id`, `page_id`, `instagram_user_id`
- **`logs/staging.log`**: Timestamped log of all write operations

---

## Report Threading & Subscriptions

Reports support threaded delivery — a short header in the channel with the full report + trends as a thread reply.

### Threaded Delivery

```bash
# Post header to channel, full report as thread reply (uses SLACK_CHANNEL_ID + SLACK_THREAD_TS env vars)
SLACK_CHANNEL_ID="$SLACK_CHANNEL_ID" SLACK_THREAD_TS="$SLACK_THREAD_TS" \
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py snapshot \
  --date-preset today --report-type heartbeat
```

The script prints `THREAD_TS=<ts>` so the agent can post follow-up analysis in the same thread.

### Report Types

| Type           | Emoji                      | When                       |
| -------------- | -------------------------- | -------------------------- |
| `heartbeat`    | :chart_with_upwards_trend: | Intraday snapshots (today) |
| `daily_recap`  | :sunrise:                  | End-of-day (yesterday)     |
| `weekly_recap` | :calendar:                 | Weekly summary (last_7d)   |

If `--report-type` is omitted, it's auto-inferred from `--date-preset`.

### Report Trends

Each threaded report automatically includes a 7-day trend section computed from snapshot history:

- ROAS trend (direction + delta)
- Avg daily spend trend
- Avg daily revenue trend
- Notable ad movers (biggest ROAS gainers/losers)

### CC Subscriptions

Auto-tag Slack users on specific report types:

```bash
# Subscribe a user to heartbeat reports
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py subscribe --report-type heartbeat --user-id U12345

# Unsubscribe
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py unsubscribe --report-type heartbeat --user-id U12345

# List all subscriptions
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py list-subscriptions
```

Subscribed users are automatically CC'd at the bottom of threaded report replies.

### Report Learnings

The file `~/.openclaw/skills/meta-ads/report-learnings.md` is an agent-maintained log of key decisions, observations, and action items from report discussions. The agent reads it before generating analysis bullets and appends new learnings after significant discussions.

### History Auto-Prune

Snapshot history is automatically pruned after each save:

- **Last 7 days**: All snapshots kept
- **8-30 days**: 1 per day per preset
- **30+ days**: Deleted

---

## Creative Analysis (AI-Powered)

**NEVER call `meta_api_helper.py creative-analysis` directly -- it is BLOCKED. Use `creative_analysis_safe.sh` instead.**

The `creative-analysis` command pulls top-performing ads, downloads their creative media (images/videos), analyzes them with Gemini vision models, detects fatigue, and generates actionable creative intelligence.

### Usage

```bash
# Analyze top 5 ads (today vs last 30d), terminal output only
/Users/novarussell/.openclaw/skills/meta-ads/scripts/creative_analysis_safe.sh --date-preset today

# Full analysis with Slack threading
SLACK_CHANNEL_ID="$SLACK_CHANNEL_ID" SLACK_THREAD_TS="$SLACK_THREAD_TS" \
/Users/novarussell/.openclaw/skills/meta-ads/scripts/creative_analysis_safe.sh \
  --date-preset last_7d --compare-preset last_30d --top 10

# Use higher quality model
/Users/novarussell/.openclaw/skills/meta-ads/scripts/creative_analysis_safe.sh \
  --date-preset today --model gemini-3-flash-preview
```

### Flags

| Flag               | Default                        | Description                                           |
| ------------------ | ------------------------------ | ----------------------------------------------------- |
| `--date-preset`    | `today`                        | Primary analysis window                               |
| `--compare-preset` | `last_30d`                     | Comparison window for fatigue detection               |
| `--top`            | `5`                            | Number of top ads to analyze                          |
| `--slack`          | `$SLACK_CHANNEL_ID`            | Slack channel target. Prefer env vars over this flag  |
| `--threaded`       | auto if `$SLACK_THREAD_TS` set | Post header in channel, per-ad cards + recs in thread |
| `--model`          | `gemini-3-flash-preview`       | Gemini model for vision analysis                      |

### Metrics Analyzed

**Core**: Spend, Revenue, ROAS, CPA, Purchases, CTR, Link CTR, Cost per Link Click

**Video** (when applicable): Hook Rate (3s views / impressions), Hold Rate (ThruPlays / 3s views), Thumbstop Ratio (video plays / impressions), Completion Rate (100% views / plays), plus percentile watch metrics (P25, P50, P75, P95, P100)

### Vision Analysis

Uses Gemini multimodal models to analyze the actual creative media:

- **Videos**: Hook analysis (first 3 seconds), visual style, pacing, product presentation, emotional tone
- **Images**: Visual hierarchy, color palette, product presentation, copy integration, emotional tone
- Both include: performance drivers (contextualized with metrics), iteration suggestions, format flip ideas

Requires `GEMINI_API_KEY` environment variable (loaded from `.env`).

### Fatigue Detection

Compares primary window vs comparison window per ad:

- **ROAS decline**: 7d ROAS < 80% of 30d ROAS
- **CTR decline**: 7d CTR < 80% of 30d CTR
- **CPA increase**: 7d CPA > 120% of 30d CPA
- **Hook rate decline** (video): 7d hook rate < 80% of 30d

Fatigue levels: `none` (0 flags), `early` (1), `moderate` (2), `severe` (3+)

### Format Flip Suggestions

For each analyzed creative, suggests a format conversion:

- Top video → static image concept
- Top image → video concept

### Media Cache

Downloaded media is stored in `~/.openclaw/skills/meta-ads/cache/` and auto-cleaned (files older than 24 hours removed on each run).

### Weekly Cron

The `cgk-creative-intelligence` cron runs **Monday 7am PST** (1 hour after weekly recap). Analyzes top 10 ads for last 7d vs last 30d, posts to #growth with threading.

---

## Creative Library (Bulk Analysis + Brand System)

The `creative-library` command is a comprehensive creative intelligence pipeline that bulk-downloads top creatives, runs deep vision AND copy analysis, ranks copy performance by product, generates new copy suggestions, and stores everything to local brand files.

### Usage

```bash
# Build creative library from top 15 ads (last 30 days)
SLACK_CHANNEL_ID="$SLACK_CHANNEL_ID" SLACK_THREAD_TS="$SLACK_THREAD_TS" \
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py creative-library \
  --date-preset last_30d --top 15

# Quick test with 3 ads
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py creative-library \
  --date-preset last_7d --top 3

# Full run with platform push
uv run ~/.openclaw/skills/meta-ads/scripts/meta_api_helper.py creative-library \
  --date-preset last_30d --top 15 --push-to-platform
```

### Flags

| Flag                 | Default                  | Description                           |
| -------------------- | ------------------------ | ------------------------------------- |
| `--date-preset`      | `last_30d`               | Time window for metrics               |
| `--top`              | `15`                     | Number of top ads to analyze          |
| `--model`            | `gemini-3-flash-preview` | Gemini model for vision+copy analysis |
| `--slack`            | —                        | Slack channel target                  |
| `--threaded`         | —                        | Thread Slack output                   |
| `--skip-synthesis`   | —                        | Skip pattern synthesis step           |
| `--push-to-platform` | —                        | Push to CGK platform MCP              |

### What It Does

1. **Fetch & Rank**: Pulls top N ads by spend, fetches full metrics + ad copy (body, headline, description, CTA, landing page URL, url_tags)
2. **Download Media**: Persistently stores media to `~/.openclaw/workspace/brand/reference-ads/media/` (cached — skips re-downloads)
3. **Deep Analysis**: Each ad analyzed by Gemini for BOTH visual AND copy:
   - Visual: hook technique, pacing, color palette, typography, layout, product presentation, trust signals
   - Copy: body structure, headline technique, emotional triggers, readability, CTA strength
   - Synergy: how well copy and visual pair together + alternative copy suggestions
4. **Copy Performance**: Ranks all copy across ads by ROAS, identifies patterns, generates new suggestions
5. **Reference Files**: Per-ad markdown in `workspace/brand/reference-ads/YYYY-MM-DD-{slug}.md`
6. **Brand Synthesis**: Appends patterns to `brand/DESIGN-SYSTEM.md` and `brand/copy-guidelines.md`
7. **Platform Push** (optional): Sends to CGK platform MCP as brand documents + creative ideas

### Output Files

| Path                                     | Content                                              |
| ---------------------------------------- | ---------------------------------------------------- |
| `workspace/brand/reference-ads/*.md`     | Per-ad analysis (metrics, copy, visual, suggestions) |
| `workspace/brand/reference-ads/index.md` | Table of all analyzed ads + copy rankings            |
| `workspace/brand/reference-ads/media/`   | Downloaded creative assets                           |
| `workspace/brand/copy-guidelines.md`     | Copy patterns, headline formulas, CTA rankings       |
| `workspace/brand/DESIGN-SYSTEM.md`       | Consolidated visual + copy patterns                  |

### PAC Video Downloads

Partnership Ad (PAC) videos are owned by the partner's Page, so the Meta API blocks direct download. The script uses an 8-layer fallback:

1. Direct video node API
2. Account-scoped advideos endpoint
3. **yt-dlp from Facebook post URL** (constructs URL from effective_object_story_id, uses Chrome cookies)
4. yt-dlp from preview_shareable_link
5. Story attachments API
6. Story full_picture API
7. AdCreative image_url
8. Thumbnail (last resort)

**Requirement**: yt-dlp must be installed (`brew install yt-dlp`) and you must be logged into facebook.com on Chrome for PAC video downloads to work.

### Agent Integration

The command outputs `--- CREATIVE_LIBRARY_JSON ---` followed by structured JSON for agent consumption, enabling automated storage via MCP brand knowledge tools (use `search_tools("brand")` to discover available storage tools).
