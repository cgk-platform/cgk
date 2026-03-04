# 10 — Finances API (v2024-06-19)

## Overview

The Finances API v2024-06-19 provides access to financial events for your seller account. It replaces both the deprecated Finances v0 API and the deprecated settlement reports.

**Base path:** `/finances/2024-06-19`

**IMPORTANT:**

- Finances API v0 was deprecated **July 21, 2025** — do NOT use it
- Settlement reports (`GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE`) are also deprecated — use this API instead

---

## listTransactions

```
GET /finances/2024-06-19/transactions
```

### Parameters

| Parameter           | Type    | Required | Description           |
| ------------------- | ------- | -------- | --------------------- |
| `postedAfter`       | string  | Yes      | ISO 8601 start date   |
| `postedBefore`      | string  | No       | ISO 8601 end date     |
| `marketplaceId`     | string  | No       | Filter by marketplace |
| `maxResultsPerPage` | integer | No       | 1-100 (default 100)   |
| `nextToken`         | string  | No       | Pagination token      |

### Response

```json
{
  "transactions": [
    {
      "sellingPartnerMetadata": {
        "sellingPartnerId": "A1B2C3D4E5",
        "marketplaceId": "ATVPDKIKX0DER",
        "accountType": "STANDARD"
      },
      "transactionType": "Shipment",
      "transactionId": "txn-123456",
      "transactionStatus": "Released",
      "description": "Order 123-4567890-1234567",
      "postedDate": "2026-02-15T10:00:00Z",
      "totalAmount": {
        "currencyCode": "USD",
        "amount": 25.49
      },
      "relatedIdentifiers": [
        {
          "relatedIdentifierName": "ORDER_ID",
          "relatedIdentifierValue": "123-4567890-1234567"
        }
      ],
      "items": [
        {
          "description": "Premium Memory Foam Pillow",
          "totalAmount": {
            "currencyCode": "USD",
            "amount": 29.99
          },
          "breakdowns": [
            {
              "breakdownType": "PRODUCT_CHARGES",
              "breakdownAmount": {
                "currencyCode": "USD",
                "amount": 29.99
              }
            },
            {
              "breakdownType": "AMAZON_FEES",
              "breakdownAmount": {
                "currencyCode": "USD",
                "amount": -4.5
              }
            }
          ],
          "contexts": [
            {
              "contextType": "ASIN",
              "asin": "B07ABCDEFG"
            },
            {
              "contextType": "SKU",
              "sku": "MY-SKU-001"
            },
            {
              "contextType": "QUANTITY_SHIPPED",
              "quantityShipped": 1
            }
          ]
        }
      ]
    }
  ],
  "nextToken": "abc123..."
}
```

---

## Transaction Types

| Type                  | Description                                           |
| --------------------- | ----------------------------------------------------- |
| `Shipment`            | Order shipment — includes product charges and fees    |
| `Refund`              | Order refund — negative amounts                       |
| `Adjustment`          | Account adjustment (reimbursement, correction)        |
| `ServiceFee`          | Amazon service fees (subscription, FBA storage, etc.) |
| `Transfer`            | Disbursement to your bank account                     |
| `LiquidationProceeds` | FBA liquidation proceeds                              |
| `CouponRedemption`    | Coupon discount reimbursement                         |
| `RetroCharge`         | Retroactive charge/credit                             |
| `Other`               | Other transaction types                               |

---

## Breakdown Types

Each transaction item can have multiple breakdowns:

| Type                   | Description                               |
| ---------------------- | ----------------------------------------- |
| `PRODUCT_CHARGES`      | Item selling price                        |
| `PRODUCT_CHARGES_TAX`  | Tax on product charges                    |
| `SHIPPING_CHARGES`     | Shipping fees charged to buyer            |
| `SHIPPING_CHARGES_TAX` | Tax on shipping                           |
| `GIFTWRAP_CHARGES`     | Gift wrap fees                            |
| `GIFTWRAP_CHARGES_TAX` | Tax on gift wrap                          |
| `AMAZON_FEES`          | Amazon referral and other fees (negative) |
| `FBA_FEES`             | FBA fulfillment fees (negative)           |
| `PROMOTION_AMOUNT`     | Promotional discounts (negative)          |
| `OTHER_FEES`           | Other fees and charges                    |

---

## Common Patterns

### Get Monthly Financial Summary

```python
import datetime

# First day of current month
month_start = datetime.date.today().replace(day=1)
params = {
    "postedAfter": f"{month_start}T00:00:00Z",
    "maxResultsPerPage": "100",
}

all_transactions = []
while True:
    result = sp_api_request("GET", "/finances/2024-06-19/transactions", params=params)
    transactions = result.get("transactions", [])
    all_transactions.extend(transactions)
    next_token = result.get("nextToken")
    if not next_token:
        break
    params["nextToken"] = next_token

# Summarize
revenue = sum(t["totalAmount"]["amount"] for t in all_transactions
              if t["transactionType"] == "Shipment" and t["totalAmount"]["amount"] > 0)
refunds = sum(abs(t["totalAmount"]["amount"]) for t in all_transactions
              if t["transactionType"] == "Refund")
fees = sum(abs(t["totalAmount"]["amount"]) for t in all_transactions
           if t["transactionType"] == "ServiceFee")
transfers = sum(t["totalAmount"]["amount"] for t in all_transactions
                if t["transactionType"] == "Transfer")
```

### Get Financial Events for a Specific Order

```python
# Filter transactions by order ID
params = {
    "postedAfter": "2026-02-01T00:00:00Z",
    "maxResultsPerPage": "100",
}
result = sp_api_request("GET", "/finances/2024-06-19/transactions", params=params)

order_id = "123-4567890-1234567"
order_transactions = [
    t for t in result.get("transactions", [])
    if any(
        ri.get("relatedIdentifierValue") == order_id
        for ri in t.get("relatedIdentifiers", [])
    )
]
```

### Fee Breakdown for a Period

```python
fee_summary = {}
for txn in all_transactions:
    for item in txn.get("items", []):
        for bd in item.get("breakdowns", []):
            bd_type = bd["breakdownType"]
            amount = float(bd["breakdownAmount"]["amount"])
            fee_summary[bd_type] = fee_summary.get(bd_type, 0) + amount

# Output
for bd_type, total in sorted(fee_summary.items()):
    print(f"  {bd_type:<30} ${total:>10,.2f}")
```

---

## Migration from v0

### Key Differences

| v0                                                            | v2024-06-19                                      |
| ------------------------------------------------------------- | ------------------------------------------------ |
| `listFinancialEvents`                                         | `listTransactions`                               |
| Nested event types (ShipmentEventList, RefundEventList, etc.) | Flat `transactions` array with `transactionType` |
| `PostedDate` (PascalCase)                                     | `postedDate` (camelCase)                         |
| Complex nested fee structures                                 | Simplified `breakdowns` array                    |
| Settlement reports for payouts                                | `Transfer` transaction type                      |

### v0 Endpoint Mapping

| v0 Endpoint                                                  | v2024-06-19 Equivalent                  |
| ------------------------------------------------------------ | --------------------------------------- |
| `GET /finances/v0/financialEvents`                           | `GET /finances/2024-06-19/transactions` |
| `GET /finances/v0/financialEventGroups`                      | Filter transactions by date range       |
| `GET /finances/v0/financialEventGroups/{id}/financialEvents` | Filter by `relatedIdentifiers`          |

---

## Rate Limits

| Operation        | Burst | Restore                   |
| ---------------- | ----- | ------------------------- |
| listTransactions | 6     | 0.5/sec (1 per 2 seconds) |

**Note:** The Finances API has relatively low rate limits. For large date ranges, use wide date windows and paginate rather than making many small requests.

---

## Best Practices

1. **Use date ranges wisely** — Narrow ranges process faster
2. **Paginate completely** — Always follow `nextToken` for complete data
3. **Cache results** — Financial data doesn't change retroactively (except rare adjustments)
4. **Reconcile with orders** — Cross-reference with Orders API for complete picture
5. **Watch for transfers** — `Transfer` type transactions represent your disbursements
6. **Handle negative amounts** — Fees and refunds are negative values
7. **Group by transaction type** — Summarize by Shipment, Refund, ServiceFee, etc.
