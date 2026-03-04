# 04 — Orders API (v2026-01-01)

## Overview

The Orders API v2026-01-01 replaced the deprecated v0 API on **January 28, 2026**. It consolidates multiple v0 endpoints into two main operations: `searchOrders` and `getOrder`.

**Base path:** `/orders/2026-01-01`

**IMPORTANT:** Do NOT use Orders API v0 for reading orders. It is deprecated and will be removed. However, `confirmShipment` only exists in v0 (`/orders/v0/orders/{orderId}/shipment/confirm`).

---

## Migration from v0

### What Changed

| v0                                                     | v2026-01-01                                     | Notes                                                  |
| ------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------ |
| `getOrders` (10+ query params)                         | `searchOrders` (GET, camelCase params)          | Cleaner parameter names                                |
| `getOrder` + `getOrderItems` + `getOrderAddress` + ... | `getOrder` (single call, consolidated response) | No separate call needed                                |
| PascalCase params (`MarketplaceIds`)                   | camelCase params (`marketplaceIds`)             | ALL params are camelCase                               |
| `OrderStatuses` (PascalCase values)                    | `fulfillmentStatuses` (SCREAMING_SNAKE_CASE)    | Different param name AND values                        |
| `FulfillmentChannels` (`AFN`/`MFN`)                    | `fulfilledBy` (`AMAZON`/`MERCHANT`)             | Different param name AND values                        |
| `NextToken`                                            | `paginationToken`                               | Different pagination token name                        |
| `amazonOrderId`                                        | `orderId`                                       | Response field renamed                                 |
| `purchaseDate`                                         | `createdTime`                                   | Response field renamed                                 |
| `lastUpdateDate`                                       | `lastUpdatedTime`                               | Response field renamed                                 |
| `orderStatus` (top-level)                              | `fulfillment.status`                            | Nested in fulfillment object                           |
| `fulfillmentChannel`                                   | `fulfillment.fulfilledBy`                       | Nested in fulfillment object                           |
| `orderTotal`                                           | `proceeds`                                      | Different structure                                    |
| `salesChannel` (string)                                | `salesChannel` (object)                         | Now `{channelName, marketplaceId}`                     |
| `isPrime` / `isBusinessOrder`                          | `programs.isPrime` / `programs.isBusinessOrder` | Nested in programs object                              |
| `confirmShipment` (POST)                               | **NOT AVAILABLE**                               | Use v0: `/orders/v0/orders/{orderId}/shipment/confirm` |

### Key Benefits of v2026-01-01

1. **Fewer API calls** — One `getOrder` returns everything (items, address, buyer info)
2. **Cleaner parameters** — All camelCase, rationalized names
3. **Consolidated responses** — Single getOrder call replaces multiple v0 endpoints
4. **Consistent response format** — Unified JSON schema

---

## searchOrders

```
GET /orders/2026-01-01/orders
```

### Query Parameters (ALL camelCase)

```
?marketplaceIds=ATVPDKIKX0DER
&lastUpdatedAfter=2026-02-01T00:00:00Z
&lastUpdatedBefore=2026-02-19T23:59:59Z
&fulfillmentStatuses=UNSHIPPED,SHIPPED
&fulfilledBy=AMAZON
&maxResultsPerPage=50
```

### Search Parameters

| Parameter             | Type             | Description                                    |
| --------------------- | ---------------- | ---------------------------------------------- |
| `marketplaceIds`      | array of strings | **Required.** Marketplace ID(s)                |
| `lastUpdatedAfter`    | string           | ISO 8601. Orders updated after this time       |
| `lastUpdatedBefore`   | string           | ISO 8601. Orders updated before this time      |
| `createdAfter`        | string           | ISO 8601. Orders created after this time       |
| `createdBefore`       | string           | ISO 8601. Orders created before this time      |
| `fulfillmentStatuses` | array of strings | SCREAMING_SNAKE_CASE status values (see below) |
| `fulfilledBy`         | string           | `AMAZON` (FBA) or `MERCHANT` (MFN)             |
| `maxResultsPerPage`   | string           | 1-100 (default 100)                            |
| `paginationToken`     | string           | Pagination token from previous response        |

### Fulfillment Statuses (SCREAMING_SNAKE_CASE)

| Status                 | Description                         |
| ---------------------- | ----------------------------------- |
| `PENDING`              | Order placed, payment not confirmed |
| `UNSHIPPED`            | Payment confirmed, not yet shipped  |
| `PARTIALLY_SHIPPED`    | Some items shipped                  |
| `SHIPPED`              | All items shipped                   |
| `CANCELLED`            | Order cancelled                     |
| `UNFULFILLABLE`        | Cannot be fulfilled (FBA)           |
| `PENDING_AVAILABILITY` | Pre-order, not yet available        |

### Response

```json
{
  "orders": [
    {
      "orderId": "123-4567890-1234567",
      "createdTime": "2026-02-15T14:30:00Z",
      "lastUpdatedTime": "2026-02-16T09:00:00Z",
      "fulfillment": {
        "status": "SHIPPED",
        "fulfilledBy": "AMAZON",
        "shipServiceLevel": "Expedited"
      },
      "salesChannel": {
        "channelName": "Amazon.com",
        "marketplaceId": "ATVPDKIKX0DER"
      },
      "proceeds": {
        "total": {
          "currencyCode": "USD",
          "amount": "45.99"
        }
      },
      "programs": {
        "isPrime": true,
        "isBusinessOrder": false
      }
    }
  ],
  "pagination": {
    "paginationToken": "abc123..."
  },
  "lastUpdatedBefore": "2026-02-19T23:59:59Z"
}
```

---

## getOrder

```
GET /orders/2026-01-01/orders/{orderId}
```

Returns comprehensive order data in a single call, including order items.

### Response (Consolidated)

```json
{
  "order": {
    "orderId": "123-4567890-1234567",
    "createdTime": "2026-02-15T14:30:00Z",
    "lastUpdatedTime": "2026-02-16T09:00:00Z",
    "fulfillment": {
      "status": "SHIPPED",
      "fulfilledBy": "AMAZON",
      "shipServiceLevel": "Expedited"
    },
    "salesChannel": {
      "channelName": "Amazon.com",
      "marketplaceId": "ATVPDKIKX0DER"
    },
    "proceeds": {
      "total": {
        "currencyCode": "USD",
        "amount": "45.99"
      }
    },
    "programs": {
      "isPrime": true,
      "isBusinessOrder": false
    },
    "items": [
      {
        "asin": "B07ABCDEFG",
        "sellerSku": "MY-SKU-001",
        "orderItemId": "12345678901234",
        "title": "Premium Memory Foam Pillow",
        "quantityOrdered": 1,
        "quantityShipped": 1,
        "itemPrice": {
          "currencyCode": "USD",
          "amount": "29.99"
        },
        "itemTax": {
          "currencyCode": "USD",
          "amount": "2.40"
        },
        "conditionId": "New"
      }
    ]
  }
}
```

### With RDT (for PII)

When you use an RDT token (see `01-auth-and-credentials.md`), the response additionally includes:

```json
{
  "order": {
    "...all above fields...",
    "buyerInfo": {
      "buyerEmail": "abc123@marketplace.amazon.com",
      "buyerName": "John Doe",
      "purchaseOrderNumber": "PO-12345"
    },
    "shippingAddress": {
      "name": "John Doe",
      "addressLine1": "123 Main St",
      "addressLine2": "Apt 4B",
      "city": "Seattle",
      "stateOrRegion": "WA",
      "postalCode": "98101",
      "countryCode": "US",
      "phone": "+1-206-555-0123"
    }
  }
}
```

---

## confirmShipment (v0 ONLY)

```
POST /orders/v0/orders/{orderId}/shipment/confirm
```

**IMPORTANT:** This endpoint does NOT exist in v2026-01-01. It only exists in the deprecated v0 API. The v0 endpoint still works but may be removed in the future. MFN sellers critically need this to confirm shipments.

---

## Order Lifecycle

```
PENDING → UNSHIPPED → (PARTIALLY_SHIPPED) → SHIPPED
  │                          │
  └→ CANCELLED               └→ CANCELLED

FBA-specific:
  PENDING → UNSHIPPED → SHIPPED (Amazon handles fulfillment)
            │
            └→ UNFULFILLABLE (out of stock at FC)
```

### Status Transitions

- **PENDING → UNSHIPPED**: Payment confirmed (~30 min for credit cards)
- **UNSHIPPED → SHIPPED**: All items shipped (FBA: automatic; MFN: seller confirms via v0 confirmShipment)
- **UNSHIPPED → CANCELLED**: Buyer cancels or payment fails
- **UNSHIPPED → UNFULFILLABLE**: FBA can't fulfill (rare)

---

## Fulfilled By

| v2026-01-01 Value | v0 Equivalent | Description                      |
| ----------------- | ------------- | -------------------------------- |
| `AMAZON`          | `AFN`         | Amazon Fulfillment Network (FBA) |
| `MERCHANT`        | `MFN`         | Merchant Fulfilled Network       |

---

## Rate Limits

| Operation    | Burst | Restore |
| ------------ | ----- | ------- |
| searchOrders | 20    | 2/sec   |
| getOrder     | 20    | 2/sec   |

---

## Common Patterns

### Get Today's Orders

```
GET /orders/2026-01-01/orders
  ?marketplaceIds=ATVPDKIKX0DER
  &createdAfter=2026-02-19T00:00:00Z
  &maxResultsPerPage=100
```

### Get Unshipped MFN Orders (Need Attention)

```
GET /orders/2026-01-01/orders
  ?marketplaceIds=ATVPDKIKX0DER
  &fulfillmentStatuses=UNSHIPPED
  &fulfilledBy=MERCHANT
```

### Paginate All Orders in Date Range

```python
all_orders = []
params = {
    "marketplaceIds": [marketplace_id],
    "createdAfter": start_date,
    "createdBefore": end_date,
    "maxResultsPerPage": "100",
}

while True:
    result = sp_api_request("GET", "/orders/2026-01-01/orders", params=params)
    orders = result.get("orders", [])
    all_orders.extend(orders)

    pagination = result.get("pagination", {})
    next_token = pagination.get("paginationToken")
    if not next_token:
        break
    params["paginationToken"] = next_token
```

---

## Error Handling

| Error                 | Cause              | Fix                                                             |
| --------------------- | ------------------ | --------------------------------------------------------------- |
| 400 `InvalidInput`    | Bad search params  | Check date format, status values (must be SCREAMING_SNAKE_CASE) |
| 403 `Unauthorized`    | Token issue        | Refresh access token                                            |
| 404 `NotFound`        | Order ID not found | Verify order ID format                                          |
| 429 `TooManyRequests` | Rate limited       | Exponential backoff                                             |
