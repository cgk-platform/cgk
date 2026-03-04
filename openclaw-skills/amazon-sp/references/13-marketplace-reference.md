# 13 — Marketplace Reference & API Versions

## Marketplace IDs

### North America (NA)

| Country       | Marketplace ID   | Domain        | Currency |
| ------------- | ---------------- | ------------- | -------- |
| United States | `ATVPDKIKX0DER`  | amazon.com    | USD      |
| Canada        | `A2EUQ1WTGCTBG2` | amazon.ca     | CAD      |
| Mexico        | `A1AM78C64UM0Y8` | amazon.com.mx | MXN      |
| Brazil        | `A2Q3Y263D00KWC` | amazon.com.br | BRL      |

### Europe (EU)

| Country        | Marketplace ID   | Domain        | Currency |
| -------------- | ---------------- | ------------- | -------- |
| United Kingdom | `A1F83G8C2ARO7P` | amazon.co.uk  | GBP      |
| Germany        | `A1PA6795UKMFR9` | amazon.de     | EUR      |
| France         | `A13V1IB3VIYZZH` | amazon.fr     | EUR      |
| Italy          | `APJ6JRA9NG5V4`  | amazon.it     | EUR      |
| Spain          | `A1RKKUPIHCS9HS` | amazon.es     | EUR      |
| Netherlands    | `A1805IZSGTT6HS` | amazon.nl     | EUR      |
| Sweden         | `A2NODRKZP88ZB9` | amazon.se     | SEK      |
| Poland         | `A1C3SOZRARQ6R3` | amazon.pl     | PLN      |
| Belgium        | `AMEN7PMS3EDWL`  | amazon.com.be | EUR      |
| Turkey         | `A33AVAJ2PDY3EV` | amazon.com.tr | TRY      |
| India          | `A21TJRUUN4KGV`  | amazon.in     | INR      |
| UAE            | `A2VIGQ35RCS4UG` | amazon.ae     | AED      |
| Saudi Arabia   | `A17E79C6D8DWNP` | amazon.sa     | SAR      |
| Egypt          | `ARBP9OOSHTCHU`  | amazon.eg     | EGP      |
| South Africa   | `AE08WJ6YKNBMC`  | amazon.co.za  | ZAR      |

### Far East (FE)

| Country   | Marketplace ID   | Domain        | Currency |
| --------- | ---------------- | ------------- | -------- |
| Japan     | `A1VC38T7YXB528` | amazon.co.jp  | JPY      |
| Australia | `A39IBJ37TRP1C6` | amazon.com.au | AUD      |
| Singapore | `A19VAU5U5O7RUS` | amazon.sg     | SGD      |

---

## Regional Endpoints

| Region             | Endpoint                                  |
| ------------------ | ----------------------------------------- |
| North America (NA) | `https://sellingpartnerapi-na.amazon.com` |
| Europe (EU)        | `https://sellingpartnerapi-eu.amazon.com` |
| Far East (FE)      | `https://sellingpartnerapi-fe.amazon.com` |

### Sandbox Endpoints (Testing)

| Region | Endpoint                                          |
| ------ | ------------------------------------------------- |
| NA     | `https://sandbox.sellingpartnerapi-na.amazon.com` |
| EU     | `https://sandbox.sellingpartnerapi-eu.amazon.com` |
| FE     | `https://sandbox.sellingpartnerapi-fe.amazon.com` |

### LWA Token Endpoint

```
https://api.amazon.com/auth/o2/token
```

(Same for all regions)

---

## Current API Versions (Verified Feb 2026)

| API                  | Base Path                      | Status                                   |
| -------------------- | ------------------------------ | ---------------------------------------- |
| Reports              | `/reports/2021-06-30`          | Current                                  |
| FBA Inventory        | `/fba/inventory/v1`            | Current                                  |
| **Orders**           | **`/orders/2026-01-01`**       | **Current** (v0 deprecated Jan 28, 2026) |
| Catalog Items        | `/catalog/2022-04-01`          | Current                                  |
| Product Pricing      | `/products/pricing/2022-05-01` | Current                                  |
| Feeds                | `/feeds/2021-06-30`            | Current                                  |
| Listings Items       | `/listings/2021-08-01`         | Current                                  |
| Fulfillment Inbound  | `/inbound/fba/2024-03-20`      | Current                                  |
| Fulfillment Outbound | `/fba/outbound/2020-07-01`     | Current                                  |
| Notifications        | `/notifications/v1`            | Current                                  |
| Product Fees         | `/products/fees/v0`            | Current                                  |
| Sales                | `/sales/v1`                    | Current                                  |
| **Finances**         | **`/finances/2024-06-19`**     | **Current** (v0 deprecated Jul 21, 2025) |
| Shipping             | `/shipping/v2`                 | Current                                  |
| Tokens (RDT)         | `/tokens/2021-03-01`           | Current                                  |
| Sellers              | `/sellers/v1`                  | Current                                  |
| Product Type Defs    | `/definitions/2020-09-01`      | Current                                  |

### Deprecated APIs (DO NOT USE)

| API             | Deprecated Version          | Replacement |
| --------------- | --------------------------- | ----------- |
| Orders          | v0 (`/orders/v0`)           | v2026-01-01 |
| Finances        | v0 (`/finances/v0`)         | v2024-06-19 |
| Catalog Items   | v0 (`/catalog/v0`)          | v2022-04-01 |
| Product Pricing | v0 (`/products/pricing/v0`) | v2022-05-01 |

### Removed Features

| Feature                                               | Removed                | Replacement              |
| ----------------------------------------------------- | ---------------------- | ------------------------ |
| SigV4 signing                                         | Oct 2, 2023            | LWA access token only    |
| Flat-file feeds                                       | Jul 31, 2025           | `JSON_LISTINGS_FEED`     |
| Settlement reports                                    | Mar 2025 (deprecation) | Finances API v2024-06-19 |
| FBA fulfillment reports (current/monthly/adjustments) | Jan 2023               | Ledger reports           |

---

## RDT Reference (Restricted Data Tokens)

### When Required

| Data Type                     | Requires RDT | Data Elements     |
| ----------------------------- | ------------ | ----------------- |
| Buyer name                    | Yes          | `buyerInfo`       |
| Buyer email                   | Yes          | `buyerInfo`       |
| Shipping address              | Yes          | `shippingAddress` |
| Gift message                  | Yes          | `buyerInfo`       |
| Order items (with buyer info) | Yes          | `buyerInfo`       |
| Order status                  | No           | —                 |
| Order total                   | No           | —                 |
| ASIN/SKU                      | No           | —                 |
| Inventory data                | No           | —                 |
| Catalog data                  | No           | —                 |
| Pricing data                  | No           | —                 |
| Financial data                | No           | —                 |

### RDT Endpoint

```
POST /tokens/2021-03-01/restrictedDataToken
```

Rate limit: 1 burst, 1 per minute restore.

### RDT Request Format

```json
{
  "targetApplication": null,
  "restrictedResources": [
    {
      "method": "GET",
      "path": "/orders/2026-01-01/orders/123-4567890-1234567",
      "dataElements": ["buyerInfo", "shippingAddress"]
    }
  ]
}
```

### Using Wildcards in RDT Path

You can use `{orderId}` as a wildcard to create an RDT that works for any order:

```json
{
  "restrictedResources": [
    {
      "method": "GET",
      "path": "/orders/2026-01-01/orders",
      "dataElements": ["buyerInfo", "shippingAddress"]
    }
  ]
}
```

---

## Common Marketplace Configurations

### US Seller (Most Common)

```env
SP_REGION=NA
SP_MARKETPLACE_ID=ATVPDKIKX0DER
```

### UK Seller

```env
SP_REGION=EU
SP_MARKETPLACE_ID=A1F83G8C2ARO7P
```

### Multi-Marketplace Seller (US + CA)

```env
SP_REGION=NA
SP_MARKETPLACE_ID=ATVPDKIKX0DER
# For CA operations, pass A2EUQ1WTGCTBG2 as marketplaceIds parameter
```

### Pan-European Seller

```env
SP_REGION=EU
SP_MARKETPLACE_ID=A1PA6795UKMFR9
# Primary: Germany. Other EU marketplaces passed as marketplaceIds parameter.
```

### Japan Seller

```env
SP_REGION=FE
SP_MARKETPLACE_ID=A1VC38T7YXB528
```

---

## Seller Central URLs

| Country | Seller Central URL                    |
| ------- | ------------------------------------- |
| US      | `https://sellercentral.amazon.com`    |
| CA      | `https://sellercentral.amazon.ca`     |
| UK      | `https://sellercentral.amazon.co.uk`  |
| DE      | `https://sellercentral.amazon.de`     |
| FR      | `https://sellercentral.amazon.fr`     |
| IT      | `https://sellercentral.amazon.it`     |
| ES      | `https://sellercentral.amazon.es`     |
| JP      | `https://sellercentral.amazon.co.jp`  |
| AU      | `https://sellercentral.amazon.com.au` |
| IN      | `https://sellercentral.amazon.in`     |
| BR      | `https://sellercentral.amazon.com.br` |
| MX      | `https://sellercentral.amazon.com.mx` |

---

## Quick Reference: Authentication Header

```
x-amz-access-token: Atza|IwEBIA...
Content-Type: application/json
```

No SigV4. No AWS credentials. Just the LWA access token.
