# 09 — Notifications API (v1)

## Overview

The Notifications API lets you subscribe to events that Amazon publishes when certain actions occur (order created, inventory changed, price changed, etc.). Events are delivered to an SQS queue or EventBridge event bus.

**Base path:** `/notifications/v1`

---

## Notification Types

### Order & Fulfillment

| Type                           | Description                             |
| ------------------------------ | --------------------------------------- |
| `ANY_OFFER_CHANGED`            | Buy Box or offer changed for your ASINs |
| `ORDER_STATUS_CHANGE`          | Order status changed                    |
| `ORDER_CHANGE`                 | Comprehensive order data change         |
| `FULFILLMENT_ORDER_STATUS`     | MCF order status changed                |
| `FBA_OUTBOUND_SHIPMENT_STATUS` | FBA outbound shipment status            |

### Inventory

| Type                                 | Description                        |
| ------------------------------------ | ---------------------------------- |
| `FBA_INVENTORY_AVAILABILITY_CHANGES` | FBA inventory availability changed |
| `FEE_PROMOTION_NOTIFICATION`         | Fee or promotion change            |

### Listings & Catalog

| Type                                | Description                                      |
| ----------------------------------- | ------------------------------------------------ |
| `LISTINGS_ITEM_STATUS_CHANGE`       | Listing status changed (active/inactive/deleted) |
| `LISTINGS_ITEM_ISSUES_CHANGE`       | Listing issues changed                           |
| `LISTINGS_ITEM_MFN_QUANTITY_CHANGE` | MFN quantity changed                             |
| `PRODUCT_TYPE_DEFINITIONS_CHANGE`   | Product type definition updated                  |
| `BRANDED_ITEM_CONTENT_CHANGE`       | A+ Content changed                               |

### Pricing

| Type                       | Description                         |
| -------------------------- | ----------------------------------- |
| `PRICING_HEALTH`           | Pricing health notification         |
| `B2B_ANY_OFFER_CHANGED`    | B2B offer changed                   |
| `ITEM_PRODUCT_TYPE_CHANGE` | Product type classification changed |

### Reports

| Type                         | Description                |
| ---------------------------- | -------------------------- |
| `REPORT_PROCESSING_FINISHED` | Report finished processing |

---

## Destinations

### Amazon SQS

Subscribe to notifications via an SQS queue.

#### Create SQS Destination

```
POST /notifications/v1/destinations
```

```json
{
  "resourceSpecification": {
    "sqs": {
      "arn": "arn:aws:sqs:us-east-1:123456789012:sp-api-notifications"
    }
  },
  "name": "my-sp-api-queue"
}
```

Response:

```json
{
  "payload": {
    "destinationId": "dest-123",
    "name": "my-sp-api-queue",
    "resourceSpecification": {
      "sqs": {
        "arn": "arn:aws:sqs:us-east-1:123456789012:sp-api-notifications"
      }
    }
  }
}
```

**SQS Queue Policy Required:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "sellingpartnerapi.amazon.com" },
      "Action": "SQS:SendMessage",
      "Resource": "arn:aws:sqs:us-east-1:123456789012:sp-api-notifications",
      "Condition": {
        "StringEquals": {
          "aws:SourceAccount": "437568002678"
        }
      }
    }
  ]
}
```

### Amazon EventBridge

Subscribe via EventBridge for more complex event routing.

#### Create EventBridge Destination

```
POST /notifications/v1/destinations
```

```json
{
  "resourceSpecification": {
    "eventBridge": {
      "region": "us-east-1",
      "accountId": "123456789012"
    }
  },
  "name": "my-eventbridge-dest"
}
```

---

## Subscriptions

### Create Subscription

```
POST /notifications/v1/subscriptions/{notificationType}
```

```json
{
  "payloadVersion": "1.0",
  "destinationId": "dest-123"
}
```

Some notification types require additional processing directives:

```json
{
  "payloadVersion": "1.0",
  "destinationId": "dest-123",
  "processingDirective": {
    "eventFilter": {
      "eventFilterType": "ANY_OFFER_CHANGED",
      "marketplaceIds": ["ATVPDKIKX0DER"],
      "aggregationSettings": {
        "aggregationTimePeriod": "FiveMinutes"
      }
    }
  }
}
```

### Get Subscription

```
GET /notifications/v1/subscriptions/{notificationType}
```

### Delete Subscription

```
DELETE /notifications/v1/subscriptions/{notificationType}/{subscriptionId}
```

### List Destinations

```
GET /notifications/v1/destinations
```

---

## Event Message Format

### SQS Message Body

```json
{
  "notificationVersion": "1.0",
  "notificationType": "ANY_OFFER_CHANGED",
  "payloadVersion": "1.0",
  "eventTime": "2026-02-19T12:00:00Z",
  "payload": {
    "anyOfferChangedNotification": {
      "sellerId": "A1B2C3D4E5",
      "offerChangeTrigger": {
        "marketplaceId": "ATVPDKIKX0DER",
        "asin": "B07ABCDEFG",
        "itemCondition": "New",
        "timeOfOfferChange": "2026-02-19T12:00:00Z"
      },
      "summary": {
        "numberOfOffers": [
          { "condition": "New", "fulfillmentChannel": "Amazon", "count": 3 },
          { "condition": "New", "fulfillmentChannel": "Merchant", "count": 2 }
        ],
        "buyBoxEligibleOffers": [
          { "condition": "New", "fulfillmentChannel": "Amazon", "count": 2 }
        ],
        "lowestPrices": [
          {
            "condition": "New",
            "fulfillmentChannel": "Amazon",
            "listingPrice": { "amount": 29.99, "currencyCode": "USD" },
            "landedPrice": { "amount": 29.99, "currencyCode": "USD" }
          }
        ],
        "buyBoxPrices": [
          {
            "condition": "New",
            "listingPrice": { "amount": 29.99, "currencyCode": "USD" },
            "landedPrice": { "amount": 29.99, "currencyCode": "USD" }
          }
        ]
      },
      "offers": []
    }
  },
  "notificationMetadata": {
    "applicationId": "amzn1.sellerapps.app.abc123",
    "subscriptionId": "sub-123",
    "publishTime": "2026-02-19T12:00:01Z",
    "notificationId": "not-abc123"
  }
}
```

---

## Rate Limits

| Operation          | Burst | Restore |
| ------------------ | ----- | ------- |
| createDestination  | 5     | 1/sec   |
| getDestination     | 5     | 1/sec   |
| getDestinations    | 5     | 1/sec   |
| deleteDestination  | 5     | 1/sec   |
| getSubscription    | 5     | 1/sec   |
| createSubscription | 5     | 1/sec   |
| deleteSubscription | 5     | 1/sec   |

---

## Best Practices

1. **Use EventBridge for complex routing** — Fan out to multiple targets (Lambda, SQS, SNS)
2. **Use SQS for simple processing** — Direct queue consumption
3. **Handle duplicates** — Notifications may be delivered more than once (use `notificationId` for dedup)
4. **Set up dead-letter queues** — Catch failed message processing
5. **Monitor queue depth** — Ensure messages are being consumed
6. **Use aggregation** — For `ANY_OFFER_CHANGED`, use 5-minute aggregation to reduce volume
