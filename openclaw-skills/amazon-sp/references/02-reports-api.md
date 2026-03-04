# 02 — Reports API (v2021-06-30)

## Overview

The Reports API lets you request, poll, and download Amazon seller reports. Reports are generated asynchronously — you request them, wait for processing, then download the result.

**Base path:** `/reports/2021-06-30`

---

## Report Lifecycle

```
1. POST /reports              → Create report request → reportId
2. GET /reports/{reportId}    → Poll until processingStatus = DONE → reportDocumentId
3. GET /documents/{docId}     → Get pre-signed download URL
4. Download from URL          → TSV/CSV content (handle GZIP)
5. Parse content              → Tab-separated or CSV rows
```

### Step 1: Create Report

```
POST /reports/2021-06-30/reports
```

```json
{
  "reportType": "GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA",
  "marketplaceIds": ["ATVPDKIKX0DER"],
  "dataStartTime": "2026-02-01T00:00:00Z",
  "dataEndTime": "2026-02-19T23:59:59Z"
}
```

**Notes:**

- `dataStartTime`/`dataEndTime` are optional and only used by some report types
- `marketplaceIds` is required (array of marketplace IDs)
- Response: `{"reportId": "12345"}`

### Step 2: Poll Status

```
GET /reports/2021-06-30/reports/{reportId}
```

**Processing statuses:**

| Status        | Meaning                       |
| ------------- | ----------------------------- |
| `IN_QUEUE`    | Waiting to be processed       |
| `IN_PROGRESS` | Currently being generated     |
| `DONE`        | Ready for download            |
| `FATAL`       | Failed — cannot be retrieved  |
| `CANCELLED`   | Cancelled by seller or system |

**Polling strategy:**

- Poll every 15 seconds for inventory reports
- Poll every 30 seconds for large reports (orders, financial)
- Timeout after 5 minutes (300 seconds) for most reports
- Some large reports may take 10-15 minutes

### Step 3: Get Document

```
GET /reports/2021-06-30/documents/{reportDocumentId}
```

Response:

```json
{
  "reportDocumentId": "amzn1.tortuga.3.abc123",
  "url": "https://tortuga-prod-na.s3.amazonaws.com/...",
  "compressionAlgorithm": "GZIP"
}
```

### Step 4: Download

The `url` is a pre-signed S3 URL. Download directly (no auth headers needed).

**GZIP Bug:** The `compressionAlgorithm` may say `GZIP` but the content might not actually be compressed. Always handle gracefully:

```python
import gzip

if compression == "GZIP":
    try:
        content = gzip.decompress(raw_bytes).decode("utf-8")
    except (gzip.BadGzipFile, OSError):
        content = raw_bytes.decode("utf-8")
else:
    content = raw_bytes.decode("utf-8")
```

### Step 5: Parse

Most reports are tab-separated (TSV). Use `csv.DictReader` with `delimiter="\t"`.

---

## List Reports

```
GET /reports/2021-06-30/reports
```

Query parameters:

- `reportTypes` — Filter by type(s), comma-separated
- `processingStatuses` — Filter by status(es)
- `marketplaceIds` — Filter by marketplace(s)
- `pageSize` — Max results per page (default 10, max 100)
- `createdSince` / `createdUntil` — Date range filter
- `nextToken` — Pagination token

---

## Inventory Report Types

### GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA

**Active FBA inventory.** Most commonly used for real-time inventory status.

| Column                           | Description                         |
| -------------------------------- | ----------------------------------- |
| `sku`                            | Seller SKU                          |
| `fnsku`                          | Fulfillment Network SKU             |
| `asin`                           | Amazon ASIN                         |
| `product-name`                   | Product title                       |
| `condition`                      | Item condition (New, Used, etc.)    |
| `your-price`                     | Current listing price               |
| `mfn-listing-exists`             | Whether MFN listing exists (Yes/No) |
| `mfn-fulfillable-quantity`       | MFN available quantity              |
| `afn-listing-exists`             | Whether AFN listing exists (Yes/No) |
| `afn-warehouse-quantity`         | Total FBA warehouse quantity        |
| `afn-fulfillable-quantity`       | FBA available to sell               |
| `afn-unsellable-quantity`        | FBA unfulfillable quantity          |
| `afn-reserved-quantity`          | FBA reserved quantity               |
| `afn-total-quantity`             | Total FBA quantity                  |
| `per-unit-volume`                | Volume per unit                     |
| `afn-inbound-working-quantity`   | Shipments being created             |
| `afn-inbound-shipped-quantity`   | Shipments in transit                |
| `afn-inbound-receiving-quantity` | At FC, being checked in             |
| `afn-researching-quantity`       | Under investigation                 |
| `afn-reserved-future-supply`     | Reserved future supply              |
| `afn-future-supply-buyable`      | Future supply available             |

### GET_FBA_MYI_ALL_INVENTORY_DATA

Same columns as above but includes **archived** inventory (closed listings that still have stock at FBA).

### GET_AFN_INVENTORY_DATA

**FBA inventory by fulfillment center.**

| Column                     | Description                |
| -------------------------- | -------------------------- |
| `seller-sku`               | Seller SKU                 |
| `fulfillment-channel-sku`  | FNSKU                      |
| `asin`                     | ASIN                       |
| `condition-type`           | Item condition             |
| `Warehouse-Condition-code` | FC condition code          |
| `Quantity Available`       | Available units at this FC |

### GET_AFN_INVENTORY_DATA_BY_COUNTRY

Same as above but grouped by **country** instead of individual FC. Useful for EU sellers with Pan-European or EFN programs.

### GET_MERCHANT_LISTINGS_ALL_DATA

**All merchant listings** including inactive.

| Column                        | Description                  |
| ----------------------------- | ---------------------------- |
| `item-name`                   | Product title                |
| `item-description`            | Product description          |
| `listing-id`                  | Amazon listing ID            |
| `seller-sku`                  | Seller SKU                   |
| `price`                       | Current price                |
| `quantity`                    | Available quantity           |
| `open-date`                   | Listing creation date        |
| `image-url`                   | Main image URL               |
| `item-is-marketplace`         | Is marketplace listing (y/n) |
| `product-id-type`             | ASIN, UPC, etc.              |
| `zshop-shipping-fee`          | Shipping fee                 |
| `item-note`                   | Seller note                  |
| `item-condition`              | Condition code               |
| `zshop-category1`             | Category                     |
| `zshop-browse-path`           | Browse path                  |
| `zshop-storefront-feature`    | Storefront feature           |
| `asin1`                       | ASIN                         |
| `asin2`                       | Secondary ASIN               |
| `asin3`                       | Tertiary ASIN                |
| `will-ship-internationally`   | International shipping       |
| `expedited-shipping`          | Expedited available          |
| `zshop-boldface`              | Boldface listing             |
| `product-id`                  | Product identifier           |
| `bid-for-featured-placement`  | Featured placement bid       |
| `add-delete`                  | Add or delete flag           |
| `pending-quantity`            | Pending quantity             |
| `fulfillment-channel`         | DEFAULT or AMAZON_NA         |
| `Business Price`              | B2B price                    |
| `Quantity Price Type`         | Quantity discount type       |
| `Quantity Lower Bound 1-5`    | Quantity discount tiers      |
| `Quantity Price 1-5`          | Quantity discount prices     |
| `Progressive Price Type`      | Progressive discount type    |
| `Progressive Lower Bound 1-3` | Progressive tiers            |
| `Progressive Price 1-3`       | Progressive prices           |

### GET_MERCHANT_LISTINGS_DATA

Same as above but **active listings only** (quantity > 0).

### GET_RESERVED_INVENTORY_DATA

**Reserved inventory breakdown** — why units are reserved.

| Column                    | Description                  |
| ------------------------- | ---------------------------- |
| `sku`                     | Seller SKU                   |
| `fnsku`                   | FNSKU                        |
| `asin`                    | ASIN                         |
| `product-name`            | Product title                |
| `reserved_qty`            | Total reserved               |
| `reserved_customerorders` | Reserved for customer orders |
| `reserved_fc-transfers`   | Reserved for FC transfers    |
| `reserved_fc-processing`  | Reserved for FC processing   |

### GET_LEDGER_SUMMARY_VIEW_DATA

**Inventory reconciliation** — net changes over a date range.

| Column                       | Description                |
| ---------------------------- | -------------------------- |
| `Date`                       | Date of the summary        |
| `FNSKU`                      | Fulfillment Network SKU    |
| `ASIN`                       | ASIN                       |
| `MSKU`                       | Merchant SKU               |
| `Title`                      | Product title              |
| `Disposition`                | SELLABLE or UNSELLABLE     |
| `Starting Warehouse Balance` | Beginning quantity         |
| `Ending Warehouse Balance`   | Ending quantity            |
| `Receipts`                   | Units received             |
| `Customer Shipments`         | Units shipped to customers |
| `Customer Returns`           | Units returned             |
| `Vendor Returns`             | Returns to vendor          |
| `Warehouse Transfers In/Out` | FC transfers               |
| `Found`                      | Found units                |
| `Lost`                       | Lost units                 |
| `Damaged`                    | Damaged units              |
| `Disposed`                   | Disposed units             |
| `Other Events`               | Other adjustments          |
| `Unknown Events`             | Unexplained changes        |

### GET_LEDGER_DETAIL_VIEW_DATA

**Individual inventory movement events** with reasons. Up to 18 months of history.

| Column               | Description                          |
| -------------------- | ------------------------------------ |
| `Date`               | Event date                           |
| `FNSKU`              | FNSKU                                |
| `ASIN`               | ASIN                                 |
| `MSKU`               | Merchant SKU                         |
| `Title`              | Product title                        |
| `Event Type`         | Receipt, Shipment, Adjustment, etc.  |
| `Reference ID`       | Related order/shipment ID            |
| `Quantity`           | Units changed (positive or negative) |
| `Disposition`        | SELLABLE or UNSELLABLE               |
| `Reason`             | Specific reason for the event        |
| `Country`            | Country code                         |
| `Fulfillment Center` | FC ID                                |

---

## Other Report Types

### GET_FBA_ESTIMATED_FBA_FEES_TXT_DATA

FBA fee estimates per SKU.

### GET_FBA_REIMBURSEMENTS_DATA

FBA reimbursements for lost/damaged inventory.

### GET_FBA_STORAGE_FEE_CHARGES_DATA

Monthly and long-term storage fee charges.

### GET_FBA_INVENTORY_AGED_DATA

Stranded and aged inventory report.

### GET_SALES_AND_TRAFFIC_REPORT

Sales and traffic data (Business Reports equivalent). Requires `dataStartTime` and `dataEndTime`.

---

## Rate Limits

| Operation         | Burst | Restore                 |
| ----------------- | ----- | ----------------------- |
| createReport      | 15    | 1/min (per report type) |
| getReport         | 15    | 2/sec                   |
| getReports (list) | 15    | 2/sec                   |
| getReportDocument | 15    | 2/sec                   |

---

## Best Practices

1. **Don't poll too frequently** — 15-30 seconds between polls is sufficient
2. **Cache downloaded reports** — Save in `cache/` to avoid re-downloading
3. **Handle GZIP gracefully** — Always try/except decompress
4. **Use date ranges wisely** — Some reports generate faster with narrower date ranges
5. **Check report freshness** — Some reports (like active inventory) are near-real-time while others are daily
6. **Clean up old cache** — Delete cached reports older than 7 days
