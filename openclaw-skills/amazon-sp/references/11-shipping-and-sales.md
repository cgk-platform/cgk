# 11 — Shipping v2 & Sales v1

## Shipping API (v2)

### Overview

The Shipping API v2 provides access to Amazon's shipping services for merchant-fulfilled orders. Use it to purchase shipping labels, track packages, and manage shipments.

**Base path:** `/shipping/v2`

---

### Purchase Shipment

```
POST /shipping/v2/shipments
```

```json
{
  "clientReferenceDetails": {
    "clientReferenceId": "order-12345"
  },
  "shipTo": {
    "name": "John Doe",
    "addressLine1": "123 Main St",
    "city": "Seattle",
    "stateOrRegion": "WA",
    "postalCode": "98101",
    "countryCode": "US"
  },
  "shipFrom": {
    "name": "My Warehouse",
    "addressLine1": "456 Shipping Lane",
    "city": "Portland",
    "stateOrRegion": "OR",
    "postalCode": "97201",
    "countryCode": "US"
  },
  "packages": [
    {
      "dimensions": {
        "length": 12,
        "width": 8,
        "height": 6,
        "unit": "IN"
      },
      "weight": {
        "value": 2.5,
        "unit": "LB"
      },
      "insuredValue": {
        "value": 29.99,
        "unit": "USD"
      },
      "packageClientReferenceId": "pkg-001",
      "items": [
        {
          "itemValue": {
            "value": 29.99,
            "unit": "USD"
          },
          "description": "Memory Foam Pillow",
          "quantity": 1
        }
      ]
    }
  ],
  "channelDetails": {
    "channelType": "AMAZON"
  },
  "requestedDocumentSpecification": {
    "format": "PDF",
    "size": {
      "width": 4,
      "length": 6,
      "unit": "IN"
    },
    "dpi": 300,
    "needFileJoining": false
  }
}
```

### Get Rates

```
POST /shipping/v2/rates
```

Get available shipping rates before purchasing:

```json
{
  "shipTo": {
    "postalCode": "98101",
    "countryCode": "US"
  },
  "shipFrom": {
    "postalCode": "97201",
    "countryCode": "US"
  },
  "packages": [
    {
      "dimensions": { "length": 12, "width": 8, "height": 6, "unit": "IN" },
      "weight": { "value": 2.5, "unit": "LB" }
    }
  ],
  "channelDetails": { "channelType": "AMAZON" }
}
```

Response includes available carriers, services, rates, and estimated delivery dates.

### Get Tracking

```
GET /shipping/v2/tracking?trackingId={trackingId}&carrierId={carrierId}
```

Response:

```json
{
  "payload": {
    "trackingId": "1Z999AA10123456784",
    "carrierId": "UPS",
    "trackingEvents": [
      {
        "eventCode": "IN_TRANSIT",
        "location": { "city": "Portland", "stateOrRegion": "OR", "countryCode": "US" },
        "eventTime": "2026-02-19T14:00:00Z"
      }
    ],
    "promisedDeliveryDate": "2026-02-21T23:59:00Z",
    "summary": {
      "status": "IN_TRANSIT"
    }
  }
}
```

### Tracking Statuses

| Status             | Description                      |
| ------------------ | -------------------------------- |
| `PRE_TRANSIT`      | Label created, not yet picked up |
| `IN_TRANSIT`       | Package in transit               |
| `OUT_FOR_DELIVERY` | Out for delivery                 |
| `DELIVERED`        | Successfully delivered           |
| `RETURNING`        | Being returned                   |
| `RETURNED`         | Returned to sender               |
| `UNDELIVERABLE`    | Could not be delivered           |

### Rate Limits

| Operation        | Burst | Restore |
| ---------------- | ----- | ------- |
| purchaseShipment | 5     | 1/sec   |
| getRates         | 5     | 1/sec   |
| getTracking      | 10    | 1/sec   |
| cancelShipment   | 5     | 1/sec   |

---

## Sales API (v1)

### Overview

The Sales API provides aggregated sales metrics by date, ASIN, or granularity. Useful for calculating sales velocity, revenue trends, and conversion rates.

**Base path:** `/sales/v1`

---

### getOrderMetrics

```
GET /sales/v1/orderMetrics
```

### Parameters

| Parameter             | Type   | Required | Description                                                            |
| --------------------- | ------ | -------- | ---------------------------------------------------------------------- |
| `marketplaceIds`      | string | Yes      | Marketplace ID(s)                                                      |
| `interval`            | string | Yes      | ISO 8601 interval (e.g., `2026-02-01T00:00:00Z--2026-02-19T23:59:59Z`) |
| `granularity`         | string | Yes      | `Hour`, `Day`, `Week`, `Month`, `Year`, `Total`                        |
| `granularityTimeZone` | string | No       | Timezone for granularity (e.g., `America/Los_Angeles`)                 |
| `buyerType`           | string | No       | `B2C`, `B2B`, `All` (default `All`)                                    |
| `fulfillmentNetwork`  | string | No       | `MFN`, `AFN`, `All` (default `All`)                                    |
| `firstDayOfWeek`      | string | No       | `Monday` or `Sunday` (for weekly granularity)                          |
| `asin`                | string | No       | Filter by ASIN                                                         |
| `sku`                 | string | No       | Filter by SKU                                                          |

### Response

```json
{
  "payload": [
    {
      "interval": "2026-02-15T00:00:00-08:00--2026-02-16T00:00:00-08:00",
      "unitCount": 47,
      "orderItemCount": 42,
      "orderCount": 38,
      "averageUnitPrice": {
        "currencyCode": "USD",
        "amount": "32.50"
      },
      "totalSales": {
        "currencyCode": "USD",
        "amount": "1527.50"
      }
    },
    {
      "interval": "2026-02-16T00:00:00-08:00--2026-02-17T00:00:00-08:00",
      "unitCount": 52,
      "orderItemCount": 48,
      "orderCount": 43,
      "averageUnitPrice": {
        "currencyCode": "USD",
        "amount": "31.75"
      },
      "totalSales": {
        "currencyCode": "USD",
        "amount": "1651.00"
      }
    }
  ]
}
```

### Metrics Explained

| Metric             | Description                        |
| ------------------ | ---------------------------------- |
| `unitCount`        | Total units sold                   |
| `orderItemCount`   | Number of order items (line items) |
| `orderCount`       | Number of unique orders            |
| `averageUnitPrice` | Average selling price per unit     |
| `totalSales`       | Total revenue                      |

---

## Common Patterns

### Daily Sales Velocity

```python
from datetime import date, timedelta

end = date.today()
start = end - timedelta(days=30)

params = {
    "marketplaceIds": marketplace_id,
    "interval": f"{start}T00:00:00Z--{end}T23:59:59Z",
    "granularity": "Day",
}

result = sp_api_request("GET", "/sales/v1/orderMetrics", params=params)
metrics = result.get("payload", [])

total_units = sum(m.get("unitCount", 0) for m in metrics)
total_sales = sum(float(m.get("totalSales", {}).get("amount", 0)) for m in metrics)
days = len(metrics) or 1

print(f"30-Day Sales Velocity:")
print(f"  Total Units:     {total_units}")
print(f"  Total Revenue:   ${total_sales:,.2f}")
print(f"  Avg Units/Day:   {total_units / days:.1f}")
print(f"  Avg Revenue/Day: ${total_sales / days:,.2f}")
```

### Sales by ASIN

```python
# For each ASIN, get 30-day sales
for asin in top_asins:
    params = {
        "marketplaceIds": marketplace_id,
        "interval": f"{start}T00:00:00Z--{end}T23:59:59Z",
        "granularity": "Total",
        "asin": asin,
    }
    result = sp_api_request("GET", "/sales/v1/orderMetrics", params=params)
    metrics = result.get("payload", [{}])
    if metrics:
        m = metrics[0]
        print(f"  {asin}: {m.get('unitCount', 0)} units, ${float(m.get('totalSales', {}).get('amount', 0)):,.2f}")
```

### Days of Supply Calculation

Combine FBA Inventory API with Sales API:

```python
# Get current FBA inventory
inventory = get_fba_inventory()

# Get 30-day sales velocity
velocity = get_30_day_velocity()

# Calculate days of supply per SKU
for sku in inventory:
    available = sku["fulfillableQuantity"]
    daily_velocity = velocity.get(sku["asin"], 0) / 30
    if daily_velocity > 0:
        days_supply = available / daily_velocity
        print(f"  {sku['sellerSku']}: {days_supply:.0f} days of supply")
    else:
        print(f"  {sku['sellerSku']}: No sales (infinite supply)")
```

### Rate Limits

| Operation       | Burst | Restore |
| --------------- | ----- | ------- |
| getOrderMetrics | 15    | 1/sec   |

---

## Best Practices

### Shipping

1. **Compare rates** — Always call getRates before purchasing to find the best option
2. **Track shipments** — Monitor tracking status for delivery issues
3. **Handle exceptions** — Set up alerts for UNDELIVERABLE or RETURNING status
4. **Save labels** — Cache shipping labels locally for reprinting

### Sales

1. **Use Total granularity** for simple summaries
2. **Use Day granularity** for trend analysis
3. **Compare periods** — Pull current vs previous period for growth metrics
4. **Combine with inventory** — Calculate days of supply for restock planning
5. **Filter by fulfillment** — Compare AFN (FBA) vs MFN (merchant) performance
