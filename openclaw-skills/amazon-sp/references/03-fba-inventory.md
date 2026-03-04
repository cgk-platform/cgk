# 03 — FBA Inventory API (v1)

## Overview

The FBA Inventory API provides **near-real-time** FBA inventory data via the `getInventorySummaries` endpoint. This is the fastest way to check current FBA stock levels without waiting for a report to generate.

**Base path:** `/fba/inventory/v1`

---

## getInventorySummaries

```
GET /fba/inventory/v1/summaries
```

### Required Parameters

| Parameter         | Type   | Description                            |
| ----------------- | ------ | -------------------------------------- |
| `granularityType` | string | Always `Marketplace`                   |
| `granularityId`   | string | Marketplace ID (e.g., `ATVPDKIKX0DER`) |
| `marketplaceIds`  | string | Marketplace ID(s), comma-separated     |

### Optional Parameters

| Parameter       | Type     | Description                                          |
| --------------- | -------- | ---------------------------------------------------- |
| `sellerSkus`    | string[] | Filter by SKU(s), max 50                             |
| `startDateTime` | string   | ISO 8601, filter by last update time                 |
| `nextToken`     | string   | Pagination token                                     |
| `details`       | boolean  | Include detailed inventory breakdown (default: true) |

### Response Structure

```json
{
  "payload": {
    "granularity": {
      "granularityType": "Marketplace",
      "granularityId": "ATVPDKIKX0DER"
    },
    "inventorySummaries": [
      {
        "asin": "B07ABCDEFG",
        "fnSku": "X001ABC123",
        "sellerSku": "MY-SKU-001",
        "condition": "NewItem",
        "productName": "Premium Memory Foam Pillow - King Size",
        "lastUpdatedTime": "2026-02-19T10:30:00Z",
        "inventoryDetails": {
          "fulfillableQuantity": 234,
          "inboundWorkingQuantity": 0,
          "inboundShippedQuantity": 500,
          "inboundReceivingQuantity": 100,
          "totalReservedQuantity": 45,
          "pendingCustomerOrderQuantity": 30,
          "pendingTransshipmentQuantity": 10,
          "fcProcessingQuantity": 5,
          "totalResearchingQuantity": 0,
          "researchingQuantityBreakdown": [],
          "totalUnfulfillableQuantity": 3,
          "customerDamagedQuantity": 1,
          "warehouseDamagedQuantity": 0,
          "distributorDamagedQuantity": 0,
          "carrierDamagedQuantity": 0,
          "defectiveQuantity": 2,
          "expiredQuantity": 0
        }
      }
    ]
  },
  "pagination": {
    "nextToken": "abc123..."
  }
}
```

### Inventory Breakdown

#### Available (sellable)

- **`fulfillableQuantity`** — Units available for customer orders

#### Reserved

- **`totalReservedQuantity`** — Total reserved units, broken down into:
  - `pendingCustomerOrderQuantity` — Allocated to pending orders
  - `pendingTransshipmentQuantity` — Being transferred between FCs
  - `fcProcessingQuantity` — Being processed at FC

#### Inbound (coming to FBA)

- **`inboundWorkingQuantity`** — Shipments being created (not yet shipped)
- **`inboundShippedQuantity`** — Shipments in transit to FC
- **`inboundReceivingQuantity`** — At FC, being checked in

#### Researching (under investigation)

- **`totalResearchingQuantity`** — Units being investigated
- `researchingQuantityBreakdown` — Array of reasons and quantities

#### Unfulfillable (not sellable)

- **`totalUnfulfillableQuantity`** — Total unfulfillable, broken down into:
  - `customerDamagedQuantity` — Damaged by customer return
  - `warehouseDamagedQuantity` — Damaged in warehouse
  - `distributorDamagedQuantity` — Damaged by distributor
  - `carrierDamagedQuantity` — Damaged in transit
  - `defectiveQuantity` — Defective units
  - `expiredQuantity` — Expired units

---

## Pagination

The API returns a maximum of **50 items per page**. For sellers with more than 50 SKUs, you must follow `nextToken` pagination.

```python
all_items = []
params = {
    "granularityType": "Marketplace",
    "granularityId": marketplace_id,
    "marketplaceIds": marketplace_id,
}

while True:
    result = sp_api_request("GET", "/fba/inventory/v1/summaries", params=params)
    payload = result.get("payload", result)
    items = payload.get("inventorySummaries", [])
    all_items.extend(items)

    next_token = payload.get("pagination", {}).get("nextToken")
    if not next_token:
        break
    params["nextToken"] = next_token
```

---

## Real-Time vs Batch (Reports)

| Aspect          | FBA Inventory API               | Inventory Reports                    |
| --------------- | ------------------------------- | ------------------------------------ |
| Data freshness  | Near real-time (minutes)        | 15 min to hours                      |
| Response time   | Immediate (paginated)           | Minutes (async report)               |
| Data depth      | Per-SKU with all breakdowns     | Varies by report type                |
| Rate limit      | 2 burst, 2/sec restore          | 15 burst (create), 1/min restore     |
| Best for        | Quick status checks, dashboards | Full inventory dumps, reconciliation |
| Warehouse-level | No (marketplace aggregate)      | Yes (`GET_AFN_INVENTORY_DATA`)       |
| Historical data | No (current snapshot only)      | Yes (ledger reports, 18 months)      |

**Recommendation:**

- Use **FBA Inventory API** for quick status checks and real-time monitoring
- Use **Reports** for full inventory dumps, warehouse-level data, and historical analysis
- Combine both for comprehensive inventory management

---

## Filtering by SKU

You can filter up to **50 SKUs** per request:

```
GET /fba/inventory/v1/summaries
  ?granularityType=Marketplace
  &granularityId=ATVPDKIKX0DER
  &marketplaceIds=ATVPDKIKX0DER
  &sellerSkus=SKU-001,SKU-002,SKU-003
```

For more than 50 SKUs, make multiple requests or use reports.

---

## Rate Limits

| Operation             | Burst | Restore |
| --------------------- | ----- | ------- |
| getInventorySummaries | 2     | 2/sec   |

The rate limit applies per selling partner. With 2 burst and 2/sec restore, you can sustain 2 requests per second indefinitely.

For a seller with 500 SKUs (10 pages of 50), a full inventory pull takes ~5 seconds.

---

## Common Patterns

### Total Inventory Calculation

```
Total Units = fulfillableQuantity
            + totalReservedQuantity
            + inboundWorkingQuantity
            + inboundShippedQuantity
            + inboundReceivingQuantity
            + totalUnfulfillableQuantity
```

### Days of Supply Estimate

```python
# Using 30-day sales velocity from orders/reports
days_supply = fulfillable_quantity / daily_velocity if daily_velocity > 0 else float('inf')
```

### Inventory Health Score

```python
# Simple health metric
available_pct = fulfillable_quantity / total_units * 100
unfulfillable_pct = unfulfillable_quantity / total_units * 100

if unfulfillable_pct > 10:
    health = "POOR — high unfulfillable rate"
elif available_pct > 70:
    health = "GOOD"
elif available_pct > 30:
    health = "MODERATE — high reserved/inbound ratio"
else:
    health = "LOW — most stock is reserved/inbound/unfulfillable"
```

---

## Error Handling

| Error               | Cause                    | Fix                              |
| ------------------- | ------------------------ | -------------------------------- |
| 400 `InvalidInput`  | Bad parameter format     | Check marketplace ID, SKU format |
| 403 `Unauthorized`  | Invalid/expired token    | Refresh access token             |
| 404 `NotFound`      | SKU doesn't exist in FBA | Verify SKU is FBA-enrolled       |
| 429 `QuotaExceeded` | Rate limit hit           | Wait and retry with backoff      |
