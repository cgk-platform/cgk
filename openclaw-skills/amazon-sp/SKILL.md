---
name: amazon-sp
description: >
  Complete Amazon Selling Partner API reference for inventory management,
  FBA reports, order tracking, pricing, listings, fulfillment, and all
  SP-API operations. Read for ANY Amazon seller API work.
triggers:
  - 'amazon inventory'
  - 'fba inventory'
  - 'amazon orders'
  - 'seller central'
  - 'amazon sp-api'
  - 'amazon seller'
  - 'amazon listing'
  - 'amazon pricing'
  - 'buy box'
  - 'fba shipment'
  - 'amazon fulfillment'
  - 'amazon feed'
  - 'amazon finance'
  - 'merchant fulfilled'
  - 'amazon report'
  - 'restock'
  - 'refund tracker'
  - 'profit dashboard'
  - 'order velocity'
  - 'sales velocity'
  - 'fee comparison'
  - 'returns report'
  - 'bulk pricing'
metadata:
  openclaw:
    emoji: '📦'
    requires:
      env:
        - SP_LWA_CLIENT_ID
        - SP_LWA_CLIENT_SECRET
        - SP_LWA_REFRESH_TOKEN
        - SP_MARKETPLACE_ID
        - SP_SELLER_ID
---

# Amazon Selling Partner API Skill

Complete reference for the Amazon Selling Partner API (SP-API). Use this skill for **ANY** task involving Amazon seller operations — inventory management, FBA reports, order tracking, pricing analysis, listing management, fulfillment, feeds, finances, and all SP-API operations.

**Primary focus:** Inventory level reports (FBA + merchant fulfilled).

This file contains distilled core knowledge. For detailed implementation steps, consult the reference files listed in the Routing Table below.

---

## When to Use This Skill

Activate when the user mentions ANY of these:

- Amazon inventory, FBA inventory, stock levels, low stock, out of stock
- Amazon orders, order status, order details, order tracking
- Amazon listings, product listings, listing health, suppressed listings
- Buy Box, competitive pricing, fee estimates, profitability
- FBA shipments, inbound shipments, fulfillment
- Amazon reports, seller reports, inventory reports
- Financial events, settlements, payouts
- Seller Central, SP-API, Amazon seller account
- SKU, ASIN, FNSKU in an Amazon context
- Merchant fulfilled vs FBA comparison

---

## Environment Variables

| Variable               | Description                     | Example                               |
| ---------------------- | ------------------------------- | ------------------------------------- |
| `SP_LWA_CLIENT_ID`     | Login With Amazon client ID     | `amzn1.application-oa2-client.abc123` |
| `SP_LWA_CLIENT_SECRET` | LWA client secret               | `abc123def456...`                     |
| `SP_LWA_REFRESH_TOKEN` | Long-lived refresh token        | `Atzr\|abc123...`                     |
| `SP_REGION`            | API region: `NA`, `EU`, or `FE` | `NA`                                  |
| `SP_MARKETPLACE_ID`    | Primary marketplace ID          | `ATVPDKIKX0DER` (US)                  |
| `SP_SELLER_ID`         | Amazon seller/merchant ID       | `A1B2C3D4E5F6G7`                      |

**Setup:**

1. Go to Seller Central > Apps & Services > Develop Apps
2. Create a private SP-API application
3. Self-authorize to get the refresh token
4. Set variables in `.env` file in the skill directory

**IMPORTANT:** AWS IAM credentials (access key, secret key, role ARN) are **NOT needed**. Amazon removed SigV4 signing from SP-API on Oct 2, 2023. Authentication is purely LWA access token in the `x-amz-access-token` header.

**Per-workspace credentials:** Each workspace (CGK, rawdog) has its own `.env` with different seller accounts. The `.env` file is never synced between workspaces.

---

## Read-Only Mode

The skill defaults to **read-only mode**. All state-changing commands are blocked unless explicitly unlocked.

| Variable       | Default       | Description                         |
| -------------- | ------------- | ----------------------------------- |
| `SP_READ_ONLY` | `1` (enabled) | Set to `0` to unlock write commands |

**Blocked commands (read-only mode):**

- `create-feed` — Creates a JSON_LISTINGS_FEED (mutates listing data)
- `confirm-shipment` — Confirms shipment for MFN orders (mutates order state)

When blocked, these commands exit with an error message directing the operator to set `SP_READ_ONLY=0` in the skill `.env`.

All read operations (inventory queries, order lookups, pricing, catalog, reports, finances) work normally regardless of this setting.

---

## SP-API Architecture

### Authentication Flow

```
Refresh Token (long-lived, stored in .env)
    │
    ▼
POST https://api.amazon.com/auth/o2/token
    grant_type=refresh_token
    refresh_token=...
    client_id=...
    client_secret=...
    │
    ▼
Access Token (1-hour TTL, cached in .token.json)
    │
    ▼
SP-API Request with header: x-amz-access-token: {access_token}
```

**NO SigV4 signing.** Auth is purely the LWA access token header. Amazon removed SigV4 from SP-API on Oct 2, 2023.

### Regional Endpoints

| Region | Endpoint                          | Marketplaces                                       |
| ------ | --------------------------------- | -------------------------------------------------- |
| NA     | `sellingpartnerapi-na.amazon.com` | US, CA, MX, BR                                     |
| EU     | `sellingpartnerapi-eu.amazon.com` | UK, DE, FR, IT, ES, NL, SE, PL, TR, AE, IN, SA, EG |
| FE     | `sellingpartnerapi-fe.amazon.com` | JP, AU, SG                                         |

### Report Lifecycle

```
createReport (POST /reports/2021-06-30/reports)
    │
    ▼
Poll getReport until processingStatus = DONE
    │
    ▼
Get reportDocumentId from response
    │
    ▼
getReportDocument → returns pre-signed download URL
    │
    ▼
Download from URL (handle GZIP gracefully — see bug note)
    │
    ▼
Parse TSV content
```

**GZIP Bug:** The `compressionAlgorithm` field may say `GZIP` but the content might not actually be compressed. Always try gzip.decompress first, then fall back to raw decode.

---

## Inventory Management (PRIMARY FOCUS)

### Real-Time FBA Inventory API

**Endpoint:** `GET /fba/inventory/v1/summaries`

Returns near-real-time FBA inventory for all SKUs. Paginated (max 50 items/page).

**Key fields per item:**

- `sellerSku` — Your SKU
- `asin` — Amazon ASIN
- `productName` — Product title
- `inventoryDetails.fulfillableQuantity` — Available to sell
- `inventoryDetails.reservedQuantity.totalReservedQuantity` — Customer orders + FC transfers + processing
- `inventoryDetails.inboundWorkingQuantity` — Shipments being created
- `inventoryDetails.inboundShippedQuantity` — Shipments in transit
- `inventoryDetails.inboundReceivingQuantity` — At FC, being checked in
- `inventoryDetails.unfulfillableQuantity.totalUnfulfillableQuantity` — Damaged, expired, etc.

**Script command:** `uv run scripts/sp_api_helper.py fba-inventory`

### Inventory Report Types (Batch)

| Report Type                               | Description                 | Update Frequency |
| ----------------------------------------- | --------------------------- | ---------------- |
| `GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA` | Active FBA inventory        | Near real-time   |
| `GET_FBA_MYI_ALL_INVENTORY_DATA`          | All FBA including archived  | Near real-time   |
| `GET_AFN_INVENTORY_DATA`                  | FBA by warehouse/FC         | Daily            |
| `GET_AFN_INVENTORY_DATA_BY_COUNTRY`       | Per-country FBA (EU)        | Daily            |
| `GET_MERCHANT_LISTINGS_ALL_DATA`          | All merchant listings       | ~15 min          |
| `GET_MERCHANT_LISTINGS_DATA`              | Active listings only        | ~15 min          |
| `GET_RESERVED_INVENTORY_DATA`             | Reserved breakdown          | Near real-time   |
| `GET_LEDGER_SUMMARY_VIEW_DATA`            | Inventory reconciliation    | Daily            |
| `GET_LEDGER_DETAIL_VIEW_DATA`             | Movement details (18-month) | Daily            |

**REMOVED reports (DO NOT use):**

- ~~`GET_FBA_FULFILLMENT_CURRENT_INVENTORY_DATA`~~ (removed Jan 2023)
- ~~`GET_FBA_FULFILLMENT_MONTHLY_INVENTORY_DATA`~~ (removed Jan 2023)
- ~~`GET_FBA_FULFILLMENT_INVENTORY_ADJUSTMENTS_DATA`~~ (removed Jan 2023)
- Use Ledger reports instead for inventory reconciliation.

**Script command:** `uv run scripts/sp_api_helper.py inventory-report --report-type GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA`

### Inventory Reconciliation

For inventory discrepancies, use the Ledger reports:

- `GET_LEDGER_SUMMARY_VIEW_DATA` — Net changes by SKU over a date range (starting qty, receipts, shipments, adjustments, ending qty)
- `GET_LEDGER_DETAIL_VIEW_DATA` — Individual movement events with reasons (received, shipped, adjustment, damaged, etc.)

These replaced the removed `GET_FBA_FULFILLMENT_INVENTORY_ADJUSTMENTS_DATA` report.

### Reserved Inventory Breakdown

Use `GET_RESERVED_INVENTORY_DATA` to understand why units are reserved:

- **Customer orders** — Allocated to pending orders
- **FC transfers** — Moving between fulfillment centers
- **FC processing** — Being processed for various reasons

### Low Stock Detection

```bash
uv run scripts/sp_api_helper.py low-stock --threshold 20
```

Shows items with fewer than N fulfillable units plus all out-of-stock items.

### FBA vs Merchant Comparison

```bash
uv run scripts/sp_api_helper.py inventory-summary
```

Combines real-time FBA API data with merchant listings report to show:

- FBA-only SKUs, merchant-only SKUs, both-channel SKUs
- Unit counts for each channel

---

## Orders API (v2026-01-01)

**IMPORTANT:** Orders API v0 was deprecated Jan 28, 2026. Use **v2026-01-01** exclusively.

### Key Changes from v0

| v0 Operation                                           | v2026-01-01 Replacement                         |
| ------------------------------------------------------ | ----------------------------------------------- |
| `getOrders` (10+ params)                               | `searchOrders` (GET, cleaner query params)      |
| `getOrder` + `getOrderItems` + `getOrderAddress` + ... | `getOrder` (single call, consolidated response) |
| Multiple separate endpoints                            | Two main endpoints: `searchOrders` + `getOrder` |

### searchOrders

```
GET /orders/2026-01-01/orders
  ?marketplaceIds=ATVPDKIKX0DER
  &lastUpdatedAfter=2026-02-01T00:00:00Z
  &fulfillmentStatuses=UNSHIPPED,SHIPPED
  &fulfilledBy=MERCHANT
  &maxResultsPerPage=50
```

**IMPORTANT:** All query params are **camelCase**. Status values are **SCREAMING_SNAKE_CASE** (`UNSHIPPED`, `PARTIALLY_SHIPPED`, `CANCELLED`, etc.). Fulfilled by uses `AMAZON`/`MERCHANT` (not `AFN`/`MFN`). Pagination uses `paginationToken` (not `nextToken`).

### getOrder

```
GET /orders/2026-01-01/orders/{orderId}
```

Returns consolidated order data including items (no separate getOrderItems call needed). Response field names differ from v0: `orderId` (not `amazonOrderId`), `createdTime` (not `purchaseDate`), `fulfillment.status` (not `orderStatus`), `proceeds` (not `orderTotal`).

### confirmShipment (v0 only)

```
POST /orders/v0/orders/{orderId}/shipment/confirm
```

**NOTE:** `confirmShipment` does NOT exist in v2026-01-01. Uses the deprecated v0 endpoint which still works. Critical for MFN sellers.

### PII and Restricted Data Tokens (RDT)

Buyer PII (name, address, email) requires a Restricted Data Token. See `references/01-auth-and-credentials.md` for RDT creation.

**Script commands:**

```bash
uv run scripts/sp_api_helper.py orders --since 2026-02-01 --status UNSHIPPED
uv run scripts/sp_api_helper.py order --order-id 123-4567890-1234567
uv run scripts/sp_api_helper.py confirm-shipment --order-id 123-4567890-1234567 --tracking 1Z999AA10123456784 --carrier UPS
```

---

## Catalog & Listings

### Catalog Items API (v2022-04-01)

**Search:** `GET /catalog/2022-04-01/items?keywords=...&marketplaceIds=...`

**Get item:** `GET /catalog/2022-04-01/items/{asin}?includedData=summaries,attributes,images,salesRanks`

Included data options: `summaries`, `attributes`, `dimensions`, `identifiers`, `images`, `productTypes`, `relationships`, `salesRanks`, `vendorDetails`

### Listings Items API (v2021-08-01)

**Get listing:** `GET /listings/2021-08-01/items/{sellerId}/{sku}`

**Create/update listing:** `PUT /listings/2021-08-01/items/{sellerId}/{sku}`

Body requires `productType` and `attributes` in JSON format matching the Product Type Definition schema.

**Script commands:**

```bash
uv run scripts/sp_api_helper.py catalog-search --keywords "memory foam pillow"
uv run scripts/sp_api_helper.py catalog-item --asin B0XXXXXXXX
uv run scripts/sp_api_helper.py listing --sku YOUR-SKU-123
```

---

## Pricing & Fees

### Product Pricing API (v2022-05-01)

Get competitive pricing including Buy Box data:

```
POST /batches/products/pricing/2022-05-01/items/competitiveSummary
Body: { "requests": [{ "asin": "B07ABCDEFG",
                        "marketplaceId": "ATVPDKIKX0DER",
                        "includedData": ["featuredBuyingOptions"],
                        "method": "GET",
                        "uri": "/products/pricing/2022-05-01/items/B07ABCDEFG/competitiveSummary" }] }
```

Required fields per request: `asin`, `marketplaceId`, `includedData`, `method`, `uri`

Response includes:

- Featured buying options (Buy Box winners)
- Competitive prices by condition
- Number of offers

### Fee Estimates (Product Fees v0)

```
POST /products/fees/v0/items/{asin}/feesEstimate
Body: {
  "FeesEstimateRequest": {
    "MarketplaceId": "ATVPDKIKX0DER",
    "IsAmazonFulfilled": true,
    "PriceToEstimateFees": {
      "ListingPrice": {"CurrencyCode": "USD", "Amount": 29.99}
    }
  }
}
```

Returns referral fee, FBA fulfillment fee, variable closing fee, etc.

**Script commands:**

```bash
uv run scripts/sp_api_helper.py pricing --asin B0XXXXXXXX
uv run scripts/sp_api_helper.py fees --asin B0XXXXXXXX --price 29.99
```

---

## Feeds API (v2021-06-30)

### JSON_LISTINGS_FEED (Only Supported Feed Type)

**IMPORTANT:** All legacy flat-file and XML feeds were removed on Jul 31, 2025. Use `JSON_LISTINGS_FEED` exclusively.

### Feed Lifecycle

```
1. createFeedDocument → get feedDocumentId + pre-signed upload URL
2. Upload JSON content to pre-signed URL (PUT)
3. createFeed with feedDocumentId → get feedId
4. Poll getFeed until processingStatus = DONE
5. Download result document for errors/warnings
```

**Max items per feed:** 25,000

**Script commands:**

```bash
uv run scripts/sp_api_helper.py create-feed --file feed.json
uv run scripts/sp_api_helper.py feed-status --feed-id 12345
```

---

## Fulfillment

### FBA Inbound (v2024-03-20)

Create inbound shipments to send inventory to FBA. Multi-step workflow:

1. Create inbound plan
2. Set packing information
3. Generate placement options
4. Confirm placement
5. Generate transportation options
6. Confirm transportation
7. Generate labels

See `references/07-fulfillment.md` for detailed workflow.

### Multi-Channel Fulfillment (v2020-07-01)

Fulfill non-Amazon orders (Shopify, website, etc.) through FBA:

```
POST /fba/outbound/2020-07-01/fulfillmentOrders
```

See `references/07-fulfillment.md` for details.

---

## Finances (v2024-06-19)

**IMPORTANT:** Finances API v0 was deprecated Jul 21, 2025. Use **v2024-06-19** exclusively.

**Settlement reports** (`GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE`) are also deprecated. Use the Finances API instead.

```
GET /finances/2024-06-19/transactions?postedAfter=2026-02-01T00:00:00Z
```

Returns financial events including order charges, refunds, fees, adjustments, etc.

**Script command:**

```bash
uv run scripts/sp_api_helper.py financial-events --since 2026-02-01
```

---

## Safety Rules (ALWAYS FOLLOW)

0. **Read-only mode is active by default.** The `SP_READ_ONLY` env var blocks `create-feed` and `confirm-shipment`. All other commands are read-only and safe to run freely.

1. **Confirm before ANY write operation.** Always show the user what will be changed and get explicit confirmation before:
   - Creating/updating listings (Feeds API, Listings API)
   - Creating FBA inbound shipments
   - Creating fulfillment orders
   - Any PUT/POST/PATCH/DELETE operation

2. **Never delete listings or cancel orders** without explicit user instruction and double confirmation.

3. **Budget/price changes: show before and after.** When updating prices via feeds, always display the current price and proposed new price.

4. **Log all write operations.** Save a record to `logs/` for audit trail.

5. **Rate limit awareness.** Check `x-amzn-RateLimit-Limit` response header. If rate drops below 50% of burst, slow down. See rate limit table below.

6. **PII handling.** Buyer information (name, address, email) requires RDT tokens and should never be logged or cached unnecessarily.

7. **Report downloads.** Always cache downloaded reports in `cache/` directory. Clean up files older than 7 days.

8. **Test with sandbox first** when available. Use sandbox endpoints for development/testing.

---

## Common API Patterns

### Authentication Header

Every SP-API request requires:

```
x-amz-access-token: {LWA_access_token}
```

No SigV4. No AWS credentials. Just the LWA token.

### Pagination

Most list endpoints use `nextToken`:

```json
{
  "payload": { ... },
  "pagination": { "nextToken": "abc123" }
}
```

Pass `nextToken` as query parameter or in request body for next page.

**Exception:** Orders API v2026-01-01 uses `paginationToken` (in `pagination.paginationToken` response and `paginationToken` query param).

### Date Formats

- Most endpoints: ISO 8601 — `2026-02-19T00:00:00Z`
- Reports: Some accept date range in `dataStartTime`/`dataEndTime`
- Orders: `lastUpdatedAfter`/`lastUpdatedBefore` in ISO 8601

### Error Response Format

```json
{
  "errors": [
    {
      "code": "InvalidInput",
      "message": "The marketplace ID is invalid.",
      "details": ""
    }
  ]
}
```

Common error codes: `InvalidInput`, `Unauthorized`, `Forbidden`, `NotFound`, `TooManyRequests`, `InternalFailure`, `ServiceUnavailable`

---

## Rate Limits & Errors

### Token Bucket Algorithm

SP-API uses token bucket rate limiting. Each API has a **burst rate** (max tokens) and **restore rate** (tokens/second).

| API                          | Burst | Restore | Notes                 |
| ---------------------------- | ----- | ------- | --------------------- |
| FBA Inventory (summaries)    | 2     | 2/sec   | Paginated — efficient |
| Reports (createReport)       | 15    | 1/min   | Per report type       |
| Reports (getReport)          | 15    | 2/sec   | Polling               |
| Reports (getReportDocument)  | 15    | 2/sec   | Download URL          |
| Orders (searchOrders)        | 20    | 2/sec   | v2026-01-01           |
| Orders (getOrder)            | 20    | 2/sec   | v2026-01-01           |
| Catalog (searchCatalogItems) | 2     | 2/sec   | 1 item/page default   |
| Catalog (getCatalogItem)     | 2     | 2/sec   |                       |
| Product Pricing              | 10    | 5/sec   | Batch up to 20 ASINs  |
| Product Fees                 | 20    | 10/sec  |                       |
| Listings (getListingsItem)   | 5     | 5/sec   |                       |
| Feeds (createFeed)           | 15    | 1/min   |                       |
| Finances (transactions)      | 6     | 0.5/sec | v2024-06-19           |

### Response Header

```
x-amzn-RateLimit-Limit: 2.0
```

This tells you the current restore rate. Monitor this to prevent throttling.

### Retry Strategy

1. **429 Too Many Requests** — Exponential backoff: 1s, 2s, 4s, 8s (max 3 retries)
2. **500/503 Server Error** — Exponential backoff: 1s, 2s, 4s (max 3 retries)
3. **403 Forbidden** — Refresh access token once, then fail
4. **4xx Client Error** — Do not retry (fix the request)

### Quota Error (QuotaExceeded)

If you get `QuotaExceeded`, you've exhausted the token bucket. Wait for tokens to restore based on the restore rate.

---

## Reference File Routing Table

| Task / Question                      | Reference File                            |
| ------------------------------------ | ----------------------------------------- |
| Auth setup, token refresh, RDT       | `references/01-auth-and-credentials.md`   |
| Report types, lifecycle, columns     | `references/02-reports-api.md`            |
| FBA Inventory API details            | `references/03-fba-inventory.md`          |
| Orders API v2026-01-01               | `references/04-orders-api.md`             |
| Catalog search, listings CRUD        | `references/05-catalog-and-listings.md`   |
| Pricing, Buy Box, fees               | `references/06-pricing-and-fees.md`       |
| FBA Inbound + MCF fulfillment        | `references/07-fulfillment.md`            |
| JSON_LISTINGS_FEED                   | `references/08-feeds-api.md`              |
| Notifications (SQS/EventBridge)      | `references/09-notifications.md`          |
| Finances v2024-06-19                 | `references/10-finances.md`               |
| Shipping v2, Sales v1                | `references/11-shipping-and-sales.md`     |
| Rate limits, error codes, retry      | `references/12-rate-limits-and-errors.md` |
| Marketplace IDs, endpoints, versions | `references/13-marketplace-reference.md`  |

---

## Script Usage

All commands use the zero-dependency Python helper script:

```bash
uv run ~/.openclaw/skills/amazon-sp/scripts/sp_api_helper.py COMMAND [OPTIONS]
```

Or from the skill directory:

```bash
uv run scripts/sp_api_helper.py COMMAND [OPTIONS]
```

### Auth & Setup Commands

```bash
# Validate credentials and show marketplace participations
uv run scripts/sp_api_helper.py validate-token

# Quick health check of all key endpoints
uv run scripts/sp_api_helper.py health-check

# Force-refresh the LWA access token
uv run scripts/sp_api_helper.py refresh-token

# Show account and marketplace info
uv run scripts/sp_api_helper.py account-info
```

### Inventory Commands (Primary)

```bash
# Real-time FBA inventory with summary stats
uv run scripts/sp_api_helper.py fba-inventory

# FBA inventory filtered by SKUs
uv run scripts/sp_api_helper.py fba-inventory --skus SKU-001,SKU-002,SKU-003

# Request and download an inventory report
uv run scripts/sp_api_helper.py inventory-report --report-type GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA

# All FBA inventory including archived
uv run scripts/sp_api_helper.py inventory-report --report-type GET_FBA_MYI_ALL_INVENTORY_DATA

# Inventory by warehouse
uv run scripts/sp_api_helper.py inventory-report --report-type GET_AFN_INVENTORY_DATA

# Reserved inventory breakdown
uv run scripts/sp_api_helper.py inventory-report --report-type GET_RESERVED_INVENTORY_DATA

# Inventory reconciliation (ledger)
uv run scripts/sp_api_helper.py inventory-report --report-type GET_LEDGER_SUMMARY_VIEW_DATA

# Combined FBA + merchant overview
uv run scripts/sp_api_helper.py inventory-summary

# Low stock alert (default threshold: 14 units)
uv run scripts/sp_api_helper.py low-stock --threshold 20

# List recent reports
uv run scripts/sp_api_helper.py list-reports --type GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA --limit 5

# Download a specific report
uv run scripts/sp_api_helper.py download-report --report-id 12345

# Check report status
uv run scripts/sp_api_helper.py get-report-status --report-id 12345
```

### Order Commands

```bash
# List recent orders (default: last 7 days)
uv run scripts/sp_api_helper.py orders --since 2026-02-12

# Filter by status (accepts both "Unshipped" and "UNSHIPPED" — converted automatically)
uv run scripts/sp_api_helper.py orders --since 2026-02-01 --status UNSHIPPED

# Get single order details
uv run scripts/sp_api_helper.py order --order-id 123-4567890-1234567
```

### Catalog & Listing Commands

```bash
# Search catalog
uv run scripts/sp_api_helper.py catalog-search --keywords "memory foam pillow" --limit 10

# Get catalog item details
uv run scripts/sp_api_helper.py catalog-item --asin B0XXXXXXXX

# Get listing details by SKU
uv run scripts/sp_api_helper.py listing --sku YOUR-SKU-123
```

### Pricing & Fee Commands

```bash
# Get competitive pricing and Buy Box info
uv run scripts/sp_api_helper.py pricing --asin B0XXXXXXXX

# Estimate fees at a given price
uv run scripts/sp_api_helper.py fees --asin B0XXXXXXXX --price 29.99
```

### Feed Commands

```bash
# BLOCKED (read-only mode) — Create a JSON_LISTINGS_FEED
# uv run scripts/sp_api_helper.py create-feed --file feed.json

# Check feed processing status (read-only — always allowed)
uv run scripts/sp_api_helper.py feed-status --feed-id 12345
```

### Inventory Health Commands

```bash
# Stranded inventory (FBA items not linked to active listings)
uv run scripts/sp_api_helper.py stranded-inventory

# Restock recommendations ("what should I reorder?")
uv run scripts/sp_api_helper.py restock

# Aged inventory — items approaching 181/365-day storage fee thresholds
uv run scripts/sp_api_helper.py aged-inventory

# FBA storage fee charges breakdown
uv run scripts/sp_api_helper.py storage-fees
```

### Shipment Commands

```bash
# BLOCKED (read-only mode) — Confirm shipment for merchant-fulfilled order
# uv run scripts/sp_api_helper.py confirm-shipment --order-id 123-4567890-1234567 --tracking 1Z999AA10123456784 --carrier UPS
```

### Analytics & Planning Commands

```bash
# Batch competitive pricing for up to 20 ASINs at once
uv run scripts/sp_api_helper.py bulk-pricing --asins B0XXXXXXXX,B0YYYYYYYY,B0ZZZZZZZZ

# Refund analytics — groups refunds by ASIN with counts and amounts
uv run scripts/sp_api_helper.py refund-tracker --since 2026-01-01
uv run scripts/sp_api_helper.py refund-tracker --since 2026-01-01 --until 2026-01-31

# Compare FBA vs MFN (merchant) fees side-by-side for one or more ASINs
uv run scripts/sp_api_helper.py fee-comparison --asins B0XXXXXXXX,B0YYYYYYYY --price 29.99

# FBA customer returns with reason codes grouped by ASIN
uv run scripts/sp_api_helper.py returns-report
uv run scripts/sp_api_helper.py returns-report --csv returns.csv

# Sales velocity — 7/14/30-day units per day per ASIN (uses Sales & Traffic report)
uv run scripts/sp_api_helper.py order-velocity

# Restock calculator — days-of-supply + recommended reorder quantities
# Combines real-time FBA inventory + 30-day sales velocity
uv run scripts/sp_api_helper.py restock-calculator
uv run scripts/sp_api_helper.py restock-calculator --target-days 90 --csv restock-plan.csv

# Profit dashboard — per-ASIN P&L (price, fees, COGS, margin, ROI)
# Optionally reads COGS from cogs.csv in the skill directory (columns: asin,cost)
uv run scripts/sp_api_helper.py profit-dashboard --asins B0XXXXXXXX,B0YYYYYYYY
```

### CSV Export

Add `--csv PATH` to any tabular command to export data:

```bash
uv run scripts/sp_api_helper.py fba-inventory --csv inventory.csv
uv run scripts/sp_api_helper.py orders --since 2026-02-01 --csv orders.csv
uv run scripts/sp_api_helper.py restock --csv restock.csv
uv run scripts/sp_api_helper.py aged-inventory --csv aged.csv
uv run scripts/sp_api_helper.py storage-fees --csv fees.csv
```

### Finance Commands

```bash
# Financial events for the last 30 days
uv run scripts/sp_api_helper.py financial-events --since 2026-01-20

# Financial events for a specific date range
uv run scripts/sp_api_helper.py financial-events --since 2026-02-01 --until 2026-02-15
```

### JSON Output

Add `--json` to most commands for raw JSON output:

```bash
uv run scripts/sp_api_helper.py fba-inventory --json
uv run scripts/sp_api_helper.py order --order-id 123-4567890-1234567 --json
uv run scripts/sp_api_helper.py catalog-item --asin B0XXXXXXXX --json
```

---

## Default Inventory Reporting (ALWAYS FOLLOW)

When the user asks about inventory, ALWAYS include:

- Total active SKU count
- FBA: units available, reserved, inbound (working/shipped/receiving), unfulfillable
- Low stock items (< 14 days supply based on 30-day velocity if available, otherwise < 20 units)
- Out of stock items (0 fulfillable quantity)
- Top 10 SKUs by units available

Example output format:

```
FBA INVENTORY SUMMARY
  Active SKUs:        142
  Total Units:        12,847
  Available:          9,231
  Reserved:           1,456
  Inbound:            2,160
    Working:          340
    Shipped:          1,200
    Receiving:        620
  Unfulfillable:      89

LOW STOCK (< 20 units available)
  SKU-123  B07ABCDEFG  "Memory Foam Pillow"    12 units
  SKU-456  B08HIJKLMN  "Bamboo Sheet Set"       8 units
  SKU-789  B09OPQRSTU  "Pillow Protector"       3 units

OUT OF STOCK
  SKU-AAA  B06VWXYZ01  "Mattress Topper"        0 units
  SKU-BBB  B05CDEFGH2  "Bed Frame Bracket"      0 units

TOP 10 BY AVAILABLE QUANTITY
  SKU                       ASIN          Available   Reserved   Product
  ---                       ----          ---------   --------   -------
  SKU-100                   B0XXXXXXXX        1,234        156   Premium Memory Foam Pillow - King
  SKU-101                   B0YYYYYYYY          987         89   Organic Cotton Sheet Set - Queen
  ...
```

### Default Order Reporting (ALWAYS FOLLOW)

When the user asks about orders, ALWAYS include:

- Date range being queried
- Total order count
- Breakdown by status (Unshipped, Shipped, Cancelled)
- Breakdown by fulfillment channel (FBA vs MFN)
- Recent orders table with: order ID, date, status, items, total, channel

### Default Pricing Reporting (ALWAYS FOLLOW)

When the user asks about pricing/Buy Box, ALWAYS include:

- Current Buy Box price and winner
- Your price vs Buy Box price
- Number of competing offers
- Fee estimate at current price
- Estimated margin

---

## Use Cases

### Inventory Management (Primary)

1. **Daily FBA Inventory Snapshot** — "Show my current FBA inventory levels"
   → Run `fba-inventory` command, present formatted summary

2. **Low Stock Alert** — "Which items are running low on FBA stock?"
   → Run `low-stock --threshold 20`, highlight critical items

3. **Inventory Reconciliation** — "Why does my inventory count look off?"
   → Request `GET_LEDGER_SUMMARY_VIEW_DATA` report, compare starting vs ending quantities

4. **Reserved Inventory Breakdown** — "What inventory is reserved and why?"
   → Request `GET_RESERVED_INVENTORY_DATA` report, show by reservation type

5. **Merchant vs FBA Comparison** — "Compare FBA and merchant fulfilled inventory"
   → Run `inventory-summary` for combined view

6. **Stranded/Aged Inventory** — "Show stranded or aging FBA inventory"
   → Request `GET_FBA_INVENTORY_AGED_DATA` report

### Orders & Sales

7. **Today's Orders Summary** — "How are orders looking today?"
   → Run `orders --since TODAY --status UNSHIPPED,SHIPPED`

8. **Order Detail Lookup** — "Show me order 123-4567890-1234567"
   → Run `order --order-id 123-4567890-1234567`

9. **Unfulfilled Order Monitor** — "How many orders are waiting to ship?"
   → Run `orders --since WEEK_AGO --status UNSHIPPED`

10. **Sales Velocity Report** — "What's my 30-day sales velocity by ASIN?"
    → Request `GET_SALES_AND_TRAFFIC_REPORT`, calculate units/day

### Pricing & Competition

11. **Buy Box Status Check** — "Am I winning the Buy Box on my top products?"
    → Run `pricing --asin ASIN` for each top product

12. **Profitability Analysis** — "What's my margin on ASIN B0XXXXXXXX?"
    → Run `pricing` + `fees` for price and fee breakdown

### Listing Management

13. **Listing Health Audit** — "Are any listings suppressed or having issues?"
    → Run `listing --sku SKU` for each SKU, check issues array

14. **Bulk Price Update** — "Update prices for these 15 SKUs"
    → Build JSON_LISTINGS_FEED, run `create-feed --file feed.json`

15. **New Product Listing** — "List this new product on Amazon"
    → Use Listings Items API PUT with product type definition

### Fulfillment

16. **Create FBA Inbound Shipment** — "Send 500 units of SKU-123 to FBA"
    → Use FBA Inbound v2024-03-20 workflow (see references/07-fulfillment.md)

17. **Multi-Channel Fulfillment** — "Fulfill this Shopify order through FBA"
    → Use MCF createFulfillmentOrder endpoint

### Financial

18. **Financial Events Review** — "Show my financial events this month"
    → Run `financial-events --since MONTH_START`

19. **Fee Audit** — "Show FBA fee breakdown for my top 10 products"
    → Run `fees --asin ASIN --price PRICE` for each product

### Analytics & Planning

20. **Sales Velocity Dashboard** — "What's my daily sales velocity by ASIN?"
    → Run `order-velocity` for 7/14/30-day velocity table

21. **Restock Planning** — "What do I need to reorder?"
    → Run `restock-calculator --target-days 60` for days-of-supply + reorder quantities

22. **Portfolio Profitability** — "Show me margin for my top products"
    → Run `profit-dashboard --asins A1,A2,A3` (create `cogs.csv` for full P&L)

23. **Bulk Buy Box Check** — "Am I winning the Buy Box across all my products?"
    → Run `bulk-pricing --asins A1,A2,...,A20` for up to 20 ASINs per batch

24. **Refund Analysis** — "Which products have the most refunds?"
    → Run `refund-tracker --since MONTH_START` for refund counts and rates by ASIN

25. **FBA vs MFN Decision** — "Should I switch this ASIN to merchant fulfilled?"
    → Run `fee-comparison --asins B0XXXXXXXX --price 29.99` to compare fees

26. **Returns Investigation** — "Why are customers returning this product?"
    → Run `returns-report` for return reason codes grouped by ASIN

### Monitoring

27. **Inventory Change Tracking** — "Track my inventory changes over time"
    → Run `fba-inventory` daily, compare snapshots in `history/` directory

---

## Common Pitfalls (AVOID THESE)

1. **Using SigV4 signing** — REMOVED Oct 2023. Only use LWA access token.

2. **Using Orders API v0** — DEPRECATED Jan 28, 2026. Use v2026-01-01 (`searchOrders` + `getOrder`). Exception: `confirmShipment` only exists in v0.

2b. **Using PascalCase Orders params** — v2026-01-01 uses camelCase (`marketplaceIds`, `lastUpdatedAfter`, `fulfillmentStatuses`, `paginationToken`). Status values are SCREAMING_SNAKE_CASE (`UNSHIPPED`, `PARTIALLY_SHIPPED`, etc.).

3. **Using Finances API v0** — DEPRECATED Jul 21, 2025. Use v2024-06-19.

4. **Using flat-file feeds** — REMOVED Jul 31, 2025. Use `JSON_LISTINGS_FEED` only.

5. **Using settlement reports** — DEPRECATED Mar 2025. Use Finances API v2024-06-19.

6. **Using removed FBA reports** — `GET_FBA_FULFILLMENT_CURRENT_INVENTORY_DATA` and related reports were removed Jan 2023. Use Ledger reports.

7. **Not handling GZIP bug** — Always try/except gzip decompression. Amazon sometimes says GZIP but sends plain text.

8. **Not paginating** — Most list endpoints default to small pages. Always follow `nextToken` for complete data.

9. **Ignoring rate limits** — Check `x-amzn-RateLimit-Limit` header. Implement exponential backoff on 429.

10. **Caching tokens incorrectly** — LWA tokens expire in 1 hour. Refresh 5 minutes before expiry.

11. **Hardcoding marketplace IDs** — Always use the configured `SP_MARKETPLACE_ID` from env vars.

12. **Logging PII** — Buyer name/address/email requires RDT and should never be cached unnecessarily.

---

## Current API Versions (Verified Feb 2026)

| API                  | Version         | Status                      |
| -------------------- | --------------- | --------------------------- |
| Reports              | v2021-06-30     | Current                     |
| FBA Inventory        | v1              | Current                     |
| **Orders**           | **v2026-01-01** | **Current** (v0 deprecated) |
| Catalog Items        | v2022-04-01     | Current                     |
| Product Pricing      | v2022-05-01     | Current                     |
| Feeds                | v2021-06-30     | Current                     |
| Listings Items       | v2021-08-01     | Current                     |
| Fulfillment Inbound  | v2024-03-20     | Current                     |
| Fulfillment Outbound | v2020-07-01     | Current                     |
| Notifications        | v1              | Current                     |
| Product Fees         | v0              | Current                     |
| Sales                | v1              | Current                     |
| **Finances**         | **v2024-06-19** | **Current** (v0 deprecated) |
| Shipping             | v2              | Current                     |
| Tokens (RDT)         | v2021-03-01     | Current                     |
