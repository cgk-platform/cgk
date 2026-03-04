# 07 — Fulfillment (FBA Inbound v2024-03-20 + Outbound v2020-07-01)

## FBA Inbound API (v2024-03-20)

### Overview

Create inbound shipments to send inventory to Amazon FBA fulfillment centers. The v2024-03-20 API replaced earlier versions with a multi-step workflow.

**Base path:** `/inbound/fba/2024-03-20`

---

### Inbound Shipment Workflow

```
1. createInboundPlan          → inboundPlanId
2. setPackingInformation      → Set box contents
3. generatePlacementOptions   → Get FC destination options
4. confirmPlacementOption     → Choose where to ship
5. generateTransportation     → Get carrier options
6. confirmTransportation      → Confirm shipping method
7. getLabels                  → Download box/pallet labels
8. Ship to FC
```

### Step 1: Create Inbound Plan

```
POST /inbound/fba/2024-03-20/inboundPlans
```

```json
{
  "destinationMarketplaces": ["ATVPDKIKX0DER"],
  "items": [
    {
      "msku": "MY-SKU-001",
      "quantity": 500,
      "prepOwner": "SELLER",
      "labelOwner": "SELLER"
    }
  ],
  "sourceAddress": {
    "name": "My Warehouse",
    "addressLine1": "123 Shipping Lane",
    "city": "Portland",
    "stateOrRegion": "OR",
    "postalCode": "97201",
    "countryCode": "US"
  },
  "name": "Feb 2026 Restock - Pillows"
}
```

Response: `{"inboundPlanId": "wf12345..."}`

### Step 2: Set Packing Information

```
POST /inbound/fba/2024-03-20/inboundPlans/{inboundPlanId}/packingInformation
```

```json
{
  "packageGroupings": [
    {
      "packingGroupId": "pg-001",
      "boxes": [
        {
          "weight": { "unit": "LB", "value": 25.0 },
          "dimensions": {
            "unitOfMeasurement": "IN",
            "length": 24,
            "width": 18,
            "height": 12
          },
          "quantity": 10,
          "items": [{ "msku": "MY-SKU-001", "quantity": 50 }]
        }
      ]
    }
  ]
}
```

### Step 3: Generate Placement Options

```
POST /inbound/fba/2024-03-20/inboundPlans/{inboundPlanId}/placementOptions
```

Returns placement options with different FC destinations and associated fees. Options may include:

- **Single FC** (higher placement fee)
- **Multiple FCs** (lower/no placement fee, you ship to multiple locations)

### Step 4: Confirm Placement

```
POST /inbound/fba/2024-03-20/inboundPlans/{inboundPlanId}/placementOptions/{placementOptionId}/confirmation
```

### Step 5: Generate Transportation

```
POST /inbound/fba/2024-03-20/inboundPlans/{inboundPlanId}/shipments/{shipmentId}/transportationOptions
```

### Step 6: Confirm Transportation

```
POST /inbound/fba/2024-03-20/inboundPlans/{inboundPlanId}/shipments/{shipmentId}/transportationOptions/{transportationOptionId}/confirmation
```

### Step 7: Get Labels

```
GET /inbound/fba/2024-03-20/inboundPlans/{inboundPlanId}/shipments/{shipmentId}/labels
```

Returns downloadable PDF labels for boxes/pallets.

---

### Monitoring Shipments

#### List Inbound Plans

```
GET /inbound/fba/2024-03-20/inboundPlans
  ?status=ACTIVE
  &pageSize=10
```

#### Get Shipment Details

```
GET /inbound/fba/2024-03-20/inboundPlans/{inboundPlanId}/shipments/{shipmentId}
```

#### Shipment Statuses

| Status          | Description                     |
| --------------- | ------------------------------- |
| `WORKING`       | Plan being created              |
| `READY_TO_SHIP` | Labels generated, ready to ship |
| `SHIPPED`       | In transit to FC                |
| `RECEIVING`     | Being checked in at FC          |
| `CLOSED`        | Fully received                  |
| `CANCELLED`     | Cancelled                       |
| `DELETED`       | Deleted                         |
| `ERROR`         | Processing error                |

### Rate Limits

| Operation                | Burst | Restore |
| ------------------------ | ----- | ------- |
| createInboundPlan        | 2     | 1/sec   |
| setPackingInformation    | 2     | 1/sec   |
| generatePlacementOptions | 2     | 1/sec   |
| confirmPlacementOption   | 2     | 1/sec   |
| getLabels                | 2     | 1/sec   |

---

## Multi-Channel Fulfillment API (v2020-07-01)

### Overview

Fulfill non-Amazon orders (Shopify, website, eBay, etc.) using FBA inventory. Also known as MCF (Multi-Channel Fulfillment).

**Base path:** `/fba/outbound/2020-07-01`

### createFulfillmentOrder

```
POST /fba/outbound/2020-07-01/fulfillmentOrders
```

```json
{
  "sellerFulfillmentOrderId": "SHOPIFY-ORD-12345",
  "displayableOrderId": "ORD-12345",
  "displayableOrderDate": "2026-02-19T10:00:00Z",
  "displayableOrderComment": "Thank you for your order!",
  "shippingSpeedCategory": "Standard",
  "destinationAddress": {
    "name": "John Doe",
    "addressLine1": "123 Main Street",
    "city": "Seattle",
    "stateOrRegion": "WA",
    "postalCode": "98101",
    "countryCode": "US"
  },
  "items": [
    {
      "sellerSku": "MY-SKU-001",
      "sellerFulfillmentOrderItemId": "item-001",
      "quantity": 2
    }
  ],
  "marketplaceId": "ATVPDKIKX0DER"
}
```

### Shipping Speed Categories

| Speed       | Description        | Typical Delivery  |
| ----------- | ------------------ | ----------------- |
| `Standard`  | Standard shipping  | 3-5 business days |
| `Expedited` | Expedited shipping | 2 business days   |
| `Priority`  | Priority/next-day  | 1 business day    |

### getFulfillmentOrder

```
GET /fba/outbound/2020-07-01/fulfillmentOrders/{sellerFulfillmentOrderId}
```

### listAllFulfillmentOrders

```
GET /fba/outbound/2020-07-01/fulfillmentOrders
  ?queryStartDate=2026-02-01T00:00:00Z
```

### cancelFulfillmentOrder

```
PUT /fba/outbound/2020-07-01/fulfillmentOrders/{sellerFulfillmentOrderId}/cancel
```

### Fulfillment Order Statuses

| Status                | Description                   |
| --------------------- | ----------------------------- |
| `NEW`                 | Received, not yet processing  |
| `RECEIVED`            | Acknowledged by FC            |
| `PLANNING`            | Being planned for fulfillment |
| `PROCESSING`          | Being picked/packed           |
| `COMPLETE`            | Shipped                       |
| `COMPLETE_PARTIALLED` | Partially shipped             |
| `UNFULFILLABLE`       | Cannot be fulfilled           |
| `INVALID`             | Invalid order                 |

### getFulfillmentPreview

Check if items can be fulfilled and get delivery estimates before creating an order:

```
POST /fba/outbound/2020-07-01/fulfillmentOrders/preview
```

```json
{
  "address": {
    "name": "John Doe",
    "addressLine1": "123 Main St",
    "city": "Seattle",
    "stateOrRegion": "WA",
    "postalCode": "98101",
    "countryCode": "US"
  },
  "items": [
    {
      "sellerSku": "MY-SKU-001",
      "quantity": 2,
      "sellerFulfillmentOrderItemId": "preview-001"
    }
  ],
  "marketplaceId": "ATVPDKIKX0DER",
  "shippingSpeedCategories": ["Standard", "Expedited", "Priority"]
}
```

Returns estimated delivery dates and fees for each shipping speed.

### Rate Limits

| Operation                | Burst | Restore |
| ------------------------ | ----- | ------- |
| createFulfillmentOrder   | 30    | 2/sec   |
| getFulfillmentOrder      | 30    | 2/sec   |
| listAllFulfillmentOrders | 30    | 2/sec   |
| cancelFulfillmentOrder   | 30    | 2/sec   |
| getFulfillmentPreview    | 30    | 2/sec   |

---

## Best Practices

### FBA Inbound

1. **Plan shipments in advance** — FC assignment can vary; allow lead time
2. **Use Amazon partnered carriers** when available for discounted rates
3. **Label boxes correctly** — Missing/incorrect labels cause receiving delays
4. **Monitor receiving** — Check in daily until all units are received
5. **Reconcile** — Compare shipped vs received quantities after CLOSED status

### Multi-Channel Fulfillment

1. **Check inventory first** — Use FBA Inventory API before creating MCF orders
2. **Use preview endpoint** — Get delivery estimates before promising to customers
3. **Set realistic expectations** — MCF may be slower than same-day Amazon fulfillment
4. **Handle unfulfillable** — Have fallback shipping for items MCF can't fulfill
5. **Track separately** — MCF tracking is separate from Amazon order tracking
