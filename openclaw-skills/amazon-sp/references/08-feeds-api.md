# 08 — Feeds API (v2021-06-30)

## Overview

The Feeds API lets you submit bulk updates to listings, prices, inventory, and more. As of **July 31, 2025**, all legacy flat-file and XML feed types have been removed. Only `JSON_LISTINGS_FEED` is supported.

**Base path:** `/feeds/2021-06-30`

**IMPORTANT:** Do NOT use legacy feed types:

- ~~`POST_FLAT_FILE_INVLOADER_DATA`~~ (removed)
- ~~`POST_FLAT_FILE_LISTINGS_DATA`~~ (removed)
- ~~`POST_FLAT_FILE_PRICEANDQUANTITYONLY_UPDATE_DATA`~~ (removed)
- ~~`POST_PRODUCT_DATA`~~ (XML, removed)
- ~~`POST_INVENTORY_AVAILABILITY_DATA`~~ (XML, removed)
- ~~`POST_PRODUCT_PRICING_DATA`~~ (XML, removed)

Use `JSON_LISTINGS_FEED` for all listing updates.

---

## Feed Lifecycle

```
1. createFeedDocument      → feedDocumentId + pre-signed upload URL
2. Upload content to URL   → PUT request with JSON body
3. createFeed              → feedId
4. Poll getFeed            → Until processingStatus = DONE
5. Get result document     → Download processing results
```

### Step 1: Create Feed Document

```
POST /feeds/2021-06-30/documents
```

```json
{
  "contentType": "application/json; charset=UTF-8"
}
```

Response:

```json
{
  "feedDocumentId": "amzn1.tortuga.3.abc123...",
  "url": "https://tortuga-prod-na.s3.amazonaws.com/..."
}
```

### Step 2: Upload Content

Upload your JSON content to the pre-signed URL:

```python
req = urllib.request.Request(upload_url, data=json_bytes, method="PUT")
req.add_header("Content-Type", "application/json; charset=UTF-8")
urllib.request.urlopen(req)
```

**No auth headers needed** — the URL is pre-signed with temporary S3 credentials.

### Step 3: Create Feed

```
POST /feeds/2021-06-30/feeds
```

```json
{
  "feedType": "JSON_LISTINGS_FEED",
  "marketplaceIds": ["ATVPDKIKX0DER"],
  "inputFeedDocumentId": "amzn1.tortuga.3.abc123..."
}
```

Response:

```json
{
  "feedId": "50001018889"
}
```

### Step 4: Poll Status

```
GET /feeds/2021-06-30/feeds/{feedId}
```

Response:

```json
{
  "feedId": "50001018889",
  "feedType": "JSON_LISTINGS_FEED",
  "marketplaceIds": ["ATVPDKIKX0DER"],
  "createdTime": "2026-02-19T10:00:00Z",
  "processingStatus": "DONE",
  "processingStartTime": "2026-02-19T10:01:00Z",
  "processingEndTime": "2026-02-19T10:05:00Z",
  "inputFeedDocumentId": "amzn1.tortuga.3.abc123...",
  "resultFeedDocumentId": "amzn1.tortuga.3.def456..."
}
```

Processing statuses: `IN_QUEUE`, `IN_PROGRESS`, `DONE`, `FATAL`, `CANCELLED`

### Step 5: Download Results

Use the Reports API `getReportDocument` endpoint with the `resultFeedDocumentId`:

```
GET /feeds/2021-06-30/documents/{resultFeedDocumentId}
```

Returns a pre-signed URL to download the processing results JSON.

---

## JSON_LISTINGS_FEED Format

### Structure

```json
{
  "header": {
    "sellerId": "A1B2C3D4E5",
    "version": "2.0",
    "issueLocale": "en_US"
  },
  "messages": [
    {
      "messageId": 1,
      "sku": "MY-SKU-001",
      "operationType": "PARTIAL_UPDATE",
      "productType": "PILLOW",
      "attributes": {
        "purchasable_offer": [
          {
            "currency": "USD",
            "our_price": [
              {
                "schedule": [
                  {
                    "value_with_tax": 34.99
                  }
                ]
              }
            ],
            "marketplace_id": "ATVPDKIKX0DER"
          }
        ]
      }
    }
  ]
}
```

### Operation Types

| Type             | Description                                        |
| ---------------- | -------------------------------------------------- |
| `UPDATE`         | Full update — replaces all attributes              |
| `PARTIAL_UPDATE` | Partial update — only updates specified attributes |
| `DELETE`         | Delete the listing                                 |
| `PATCH`          | JSON Patch operations                              |

### Common Use Cases

#### Bulk Price Update

```json
{
  "header": {
    "sellerId": "A1B2C3D4E5",
    "version": "2.0",
    "issueLocale": "en_US"
  },
  "messages": [
    {
      "messageId": 1,
      "sku": "SKU-001",
      "operationType": "PARTIAL_UPDATE",
      "productType": "PILLOW",
      "attributes": {
        "purchasable_offer": [
          {
            "currency": "USD",
            "our_price": [{ "schedule": [{ "value_with_tax": 29.99 }] }],
            "marketplace_id": "ATVPDKIKX0DER"
          }
        ]
      }
    },
    {
      "messageId": 2,
      "sku": "SKU-002",
      "operationType": "PARTIAL_UPDATE",
      "productType": "SHEET",
      "attributes": {
        "purchasable_offer": [
          {
            "currency": "USD",
            "our_price": [{ "schedule": [{ "value_with_tax": 49.99 }] }],
            "marketplace_id": "ATVPDKIKX0DER"
          }
        ]
      }
    }
  ]
}
```

#### Bulk Quantity Update (Merchant Fulfilled)

```json
{
  "header": {
    "sellerId": "A1B2C3D4E5",
    "version": "2.0",
    "issueLocale": "en_US"
  },
  "messages": [
    {
      "messageId": 1,
      "sku": "SKU-001",
      "operationType": "PARTIAL_UPDATE",
      "productType": "PILLOW",
      "attributes": {
        "fulfillment_availability": [
          {
            "fulfillment_channel_code": "DEFAULT",
            "quantity": 150,
            "marketplace_id": "ATVPDKIKX0DER"
          }
        ]
      }
    }
  ]
}
```

#### New Listing

```json
{
  "header": {
    "sellerId": "A1B2C3D4E5",
    "version": "2.0",
    "issueLocale": "en_US"
  },
  "messages": [
    {
      "messageId": 1,
      "sku": "NEW-SKU-001",
      "operationType": "UPDATE",
      "productType": "PILLOW",
      "requirements": "LISTING",
      "attributes": {
        "condition_type": [{ "value": "new_new", "marketplace_id": "ATVPDKIKX0DER" }],
        "item_name": [
          {
            "value": "Ultra Comfort Memory Foam Pillow",
            "language_tag": "en_US",
            "marketplace_id": "ATVPDKIKX0DER"
          }
        ],
        "brand": [{ "value": "MyBrand", "marketplace_id": "ATVPDKIKX0DER" }],
        "externally_assigned_product_identifier": [
          { "type": "upc", "value": "012345678901", "marketplace_id": "ATVPDKIKX0DER" }
        ],
        "purchasable_offer": [
          {
            "currency": "USD",
            "our_price": [{ "schedule": [{ "value_with_tax": 39.99 }] }],
            "marketplace_id": "ATVPDKIKX0DER"
          }
        ],
        "fulfillment_availability": [
          {
            "fulfillment_channel_code": "DEFAULT",
            "quantity": 100,
            "marketplace_id": "ATVPDKIKX0DER"
          }
        ]
      }
    }
  ]
}
```

---

## Processing Results

### Result Document Format

```json
{
  "header": {
    "sellerId": "A1B2C3D4E5",
    "version": "2.0"
  },
  "summary": {
    "messagesProcessed": 15,
    "messagesAccepted": 13,
    "messagesInvalid": 2
  },
  "issues": [
    {
      "messageId": 3,
      "code": "INVALID_ATTRIBUTE_VALUE",
      "severity": "ERROR",
      "message": "The value for attribute 'purchasable_offer' is invalid.",
      "attributeName": "purchasable_offer"
    },
    {
      "messageId": 7,
      "code": "MISSING_REQUIRED_ATTRIBUTE",
      "severity": "ERROR",
      "message": "The attribute 'brand' is required for product type 'PILLOW'.",
      "attributeName": "brand"
    }
  ]
}
```

### Issue Severities

| Severity  | Description                        |
| --------- | ---------------------------------- |
| `ERROR`   | Message rejected, item not updated |
| `WARNING` | Message accepted with warnings     |
| `INFO`    | Informational, no action needed    |

---

## Limits

| Limit                  | Value                |
| ---------------------- | -------------------- |
| Max messages per feed  | 25,000               |
| Max feed document size | 10 MB (uncompressed) |
| Max concurrent feeds   | 30 per marketplace   |
| Processing time        | 5-30 minutes typical |

---

## Rate Limits

| Operation          | Burst | Restore |
| ------------------ | ----- | ------- |
| createFeedDocument | 15    | 1/min   |
| createFeed         | 15    | 1/min   |
| getFeed            | 15    | 2/sec   |
| getFeeds (list)    | 15    | 2/sec   |
| getFeedDocument    | 15    | 2/sec   |

---

## Best Practices

1. **Validate JSON before submitting** — Invalid JSON causes FATAL status
2. **Use PARTIAL_UPDATE for changes** — Don't replace entire listings when updating prices
3. **Batch changes** — One feed with 100 messages is better than 100 feeds with 1 message
4. **Check results** — Always download and review the result document
5. **Retry only failed messages** — Don't resubmit the entire feed for partial failures
6. **Keep messageId unique** — Use sequential integers starting from 1
7. **productType must match** — Use the correct product type for each SKU
