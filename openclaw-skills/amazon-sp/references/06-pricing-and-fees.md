# 06 — Product Pricing & Fees

## Product Pricing API (v2022-05-01)

### Overview

Get competitive pricing data including Buy Box information, competitive prices, and offer counts.

**Base path:** `/products/pricing/2022-05-01`

---

## getCompetitiveSummary (Batch)

```
POST /batches/products/pricing/2022-05-01/items/competitiveSummary
```

This is a **batch endpoint** — send a POST with an array of requests.

### Request Body

```json
{
  "requests": [
    {
      "asin": "B07ABCDEFG",
      "marketplaceId": "ATVPDKIKX0DER",
      "includedData": ["featuredBuyingOptions"],
      "method": "GET",
      "uri": "/products/pricing/2022-05-01/items/B07ABCDEFG/competitiveSummary"
    }
  ]
}
```

**Required fields per request:** `asin`, `marketplaceId`, `includedData`, `method`, `uri`

**`includedData` options:** `featuredBuyingOptions`, `competitivePricing`, `salesRankings`, `refinements`

**Max 20 ASINs per batch request.**

### Response

```json
{
  "asinCompetitivePricing": [
    {
      "asin": "B07ABCDEFG",
      "marketplaceId": "ATVPDKIKX0DER",
      "featuredBuyingOptions": [
        {
          "condition": "New",
          "buyingOptionType": "NEW",
          "price": {
            "listingPrice": {
              "amount": 29.99,
              "currencyCode": "USD"
            },
            "shippingPrice": {
              "amount": 0.0,
              "currencyCode": "USD"
            },
            "landedPrice": {
              "amount": 29.99,
              "currencyCode": "USD"
            }
          },
          "merchantId": "A1B2C3D4E5",
          "segmentedFeaturedOffers": []
        }
      ],
      "competitivePrices": [
        {
          "competitivePriceId": "1",
          "price": {
            "listingPrice": {
              "amount": 29.99,
              "currencyCode": "USD"
            },
            "shippingPrice": {
              "amount": 0.0,
              "currencyCode": "USD"
            },
            "landedPrice": {
              "amount": 29.99,
              "currencyCode": "USD"
            }
          },
          "condition": "New",
          "belongsToRequester": true
        },
        {
          "competitivePriceId": "2",
          "price": {
            "listingPrice": {
              "amount": 31.99,
              "currencyCode": "USD"
            }
          },
          "condition": "New",
          "belongsToRequester": false
        }
      ],
      "numberOfOfferListings": [
        {
          "condition": "New",
          "count": 5
        },
        {
          "condition": "Used",
          "count": 2
        }
      ]
    }
  ]
}
```

### Understanding the Response

- **`featuredBuyingOptions`** — The Buy Box winner(s). If your `merchantId` matches, you're winning the Buy Box.
- **`competitivePrices`** — Lowest prices by condition. `belongsToRequester: true` = your offer.
- **`numberOfOfferListings`** — Total competing offers by condition.

---

## Buy Box Analysis

### Am I Winning the Buy Box?

```python
for pricing in result["asinCompetitivePricing"]:
    featured = pricing.get("featuredBuyingOptions", [])
    for opt in featured:
        if opt.get("merchantId") == my_seller_id:
            print(f"WINNING Buy Box at ${opt['price']['listingPrice']['amount']}")
        else:
            print(f"LOSING Buy Box to merchant {opt['merchantId']} at ${opt['price']['listingPrice']['amount']}")
```

### Buy Box Eligibility Factors

1. **Price** — Competitive landed price (listing + shipping)
2. **Fulfillment method** — FBA has an advantage
3. **Seller metrics** — ODR, shipping performance, feedback
4. **Stock availability** — Must have inventory
5. **Account health** — No policy violations

---

## Product Fees API (v0)

### Overview

Estimate Amazon fees for a product at a given price point.

**Base path:** `/products/fees/v0`

### getMyFeesEstimateForASIN

```
POST /products/fees/v0/items/{asin}/feesEstimate
```

### Request Body

```json
{
  "FeesEstimateRequest": {
    "MarketplaceId": "ATVPDKIKX0DER",
    "IsAmazonFulfilled": true,
    "PriceToEstimateFees": {
      "ListingPrice": {
        "CurrencyCode": "USD",
        "Amount": 29.99
      },
      "Shipping": {
        "CurrencyCode": "USD",
        "Amount": 0.0
      }
    },
    "Identifier": "fee-est-B07ABCDEFG"
  }
}
```

### Response

```json
{
  "payload": {
    "FeesEstimateResult": {
      "MarketplaceId": "ATVPDKIKX0DER",
      "IdType": "ASIN",
      "IdValue": "B07ABCDEFG",
      "IsAmazonFulfilled": true,
      "FeesEstimate": {
        "TimeOfFeesEstimation": "2026-02-19T12:00:00Z",
        "TotalFeesEstimate": {
          "CurrencyCode": "USD",
          "Amount": 8.77
        },
        "FeeDetailList": [
          {
            "FeeType": "ReferralFee",
            "FeeAmount": {
              "CurrencyCode": "USD",
              "Amount": 4.5
            },
            "FeePromotion": null,
            "FinalFee": {
              "CurrencyCode": "USD",
              "Amount": 4.5
            },
            "IncludedFeeDetailList": []
          },
          {
            "FeeType": "FBAFees",
            "FeeAmount": {
              "CurrencyCode": "USD",
              "Amount": 3.22
            },
            "FinalFee": {
              "CurrencyCode": "USD",
              "Amount": 3.22
            },
            "IncludedFeeDetailList": [
              {
                "FeeType": "FBAPickAndPack",
                "FeeAmount": {
                  "CurrencyCode": "USD",
                  "Amount": 3.22
                }
              }
            ]
          },
          {
            "FeeType": "VariableClosingFee",
            "FeeAmount": {
              "CurrencyCode": "USD",
              "Amount": 1.05
            },
            "FinalFee": {
              "CurrencyCode": "USD",
              "Amount": 1.05
            }
          }
        ]
      },
      "Status": "Success"
    }
  }
}
```

### Fee Types

| Fee Type                               | Description                                       |
| -------------------------------------- | ------------------------------------------------- |
| `ReferralFee`                          | Amazon's commission (typically 8-15% by category) |
| `FBAFees`                              | FBA fulfillment fee (pick, pack, ship)            |
| `FBAPickAndPack`                       | Component of FBA fee                              |
| `FBAWeightHandling`                    | Weight-based component                            |
| `VariableClosingFee`                   | Media items only                                  |
| `PerItemFee`                           | Individual seller per-item fee                    |
| `DigitalServicesAndElectronicWasteFee` | Regional electronic waste fees                    |

### FBA vs MFN Fee Comparison

Request fees with both `IsAmazonFulfilled: true` and `false` to compare:

```python
# FBA fees
fba_body = {"FeesEstimateRequest": {
    "MarketplaceId": marketplace_id,
    "IsAmazonFulfilled": True,
    "PriceToEstimateFees": {"ListingPrice": {"CurrencyCode": "USD", "Amount": price}},
    "Identifier": "fba"
}}

# MFN fees
mfn_body = {"FeesEstimateRequest": {
    "MarketplaceId": marketplace_id,
    "IsAmazonFulfilled": False,
    "PriceToEstimateFees": {
        "ListingPrice": {"CurrencyCode": "USD", "Amount": price},
        "Shipping": {"CurrencyCode": "USD", "Amount": shipping_cost}
    },
    "Identifier": "mfn"
}}
```

---

## Profitability Analysis Pattern

```python
selling_price = 29.99
cogs = 8.00  # Cost of goods sold
total_fees = 8.77  # From fee estimate

gross_profit = selling_price - total_fees - cogs
margin_pct = gross_profit / selling_price * 100
roi = gross_profit / cogs * 100

print(f"Selling Price:   ${selling_price:.2f}")
print(f"Amazon Fees:     ${total_fees:.2f}")
print(f"COGS:            ${cogs:.2f}")
print(f"Gross Profit:    ${gross_profit:.2f}")
print(f"Margin:          {margin_pct:.1f}%")
print(f"ROI:             {roi:.1f}%")
```

---

## Rate Limits

| Operation                | Burst | Restore |
| ------------------------ | ----- | ------- |
| getCompetitiveSummary    | 10    | 5/sec   |
| getMyFeesEstimateForASIN | 20    | 10/sec  |

### Batching

For competitive pricing, you can query up to **20 ASINs** in a single batch POST request by including multiple entries in the `requests` array.

For fee estimates, you must make individual requests per ASIN. With 20 burst and 10/sec restore, you can process ~10 ASINs per second.
