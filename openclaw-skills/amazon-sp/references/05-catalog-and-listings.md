# 05 — Catalog Items & Listings Items APIs

## Catalog Items API (v2022-04-01)

### Overview

The Catalog Items API lets you search Amazon's catalog and retrieve detailed product information by ASIN.

**Base path:** `/catalog/2022-04-01`

### searchCatalogItems

```
GET /catalog/2022-04-01/items
```

#### Parameters

| Parameter           | Type    | Required | Description                            |
| ------------------- | ------- | -------- | -------------------------------------- |
| `keywords`          | string  | Yes\*    | Search keywords                        |
| `marketplaceIds`    | string  | Yes      | Marketplace ID(s), comma-separated     |
| `includedData`      | string  | No       | Data sets to include (comma-separated) |
| `brandNames`        | string  | No       | Filter by brand(s)                     |
| `classificationIds` | string  | No       | Filter by browse node(s)               |
| `pageSize`          | integer | No       | 1-20 (default 10)                      |
| `pageToken`         | string  | No       | Pagination token                       |
| `identifiers`       | string  | Yes\*    | UPC, EAN, ISBN, or ASIN(s)             |
| `identifiersType`   | string  | Yes\*    | `ASIN`, `UPC`, `EAN`, `ISBN`           |

\*Either `keywords` or `identifiers` + `identifiersType` is required.

#### Included Data Options

| Value           | Description                                         |
| --------------- | --------------------------------------------------- |
| `summaries`     | Title, brand, manufacturer, product type, image URL |
| `attributes`    | All product attributes in JSON format               |
| `dimensions`    | Package and item dimensions                         |
| `identifiers`   | UPC, EAN, ISBN identifiers                          |
| `images`        | All product images with variants                    |
| `productTypes`  | Product type classification                         |
| `relationships` | Variation relationships (parent/child)              |
| `salesRanks`    | Best Sellers Rank data                              |
| `vendorDetails` | Vendor-specific data                                |

#### Response

```json
{
  "numberOfResults": 150,
  "items": [
    {
      "asin": "B07ABCDEFG",
      "summaries": [
        {
          "marketplaceId": "ATVPDKIKX0DER",
          "brandName": "MyBrand",
          "itemName": "Premium Memory Foam Pillow - King Size",
          "manufacturer": "MyBrand Inc",
          "productType": "PILLOW",
          "mainImage": {
            "link": "https://images-na.ssl-images-amazon.com/images/I/41xxxx.jpg",
            "height": 500,
            "width": 500
          }
        }
      ],
      "salesRanks": [
        {
          "marketplaceId": "ATVPDKIKX0DER",
          "ranks": [
            {
              "title": "Home & Kitchen",
              "link": "https://www.amazon.com/gp/bestsellers/home-garden",
              "value": 1234
            },
            {
              "title": "Bed Pillows",
              "value": 23
            }
          ]
        }
      ]
    }
  ],
  "pagination": {
    "nextToken": "abc123..."
  }
}
```

### getCatalogItem

```
GET /catalog/2022-04-01/items/{asin}
```

#### Parameters

| Parameter        | Type   | Required | Description                    |
| ---------------- | ------ | -------- | ------------------------------ |
| `marketplaceIds` | string | Yes      | Marketplace ID(s)              |
| `includedData`   | string | No       | Data sets to include           |
| `locale`         | string | No       | Language/locale for attributes |

Returns the same structure as a single item from `searchCatalogItems`.

### Rate Limits

| Operation          | Burst | Restore |
| ------------------ | ----- | ------- |
| searchCatalogItems | 2     | 2/sec   |
| getCatalogItem     | 2     | 2/sec   |

---

## Listings Items API (v2021-08-01)

### Overview

The Listings Items API manages your product listings. It supports get, put (create/update), patch (partial update), and delete operations.

**Base path:** `/listings/2021-08-01`

### getListingsItem

```
GET /listings/2021-08-01/items/{sellerId}/{sku}
```

#### Parameters

| Parameter        | Type   | Required | Description               |
| ---------------- | ------ | -------- | ------------------------- |
| `marketplaceIds` | string | Yes      | Marketplace ID(s)         |
| `includedData`   | string | No       | Data sets to include      |
| `issueLocale`    | string | No       | Locale for issue messages |

#### Included Data Options

| Value                     | Description                           |
| ------------------------- | ------------------------------------- |
| `summaries`               | ASIN, product type, status, condition |
| `attributes`              | All listing attributes                |
| `issues`                  | Current listing issues/warnings       |
| `offers`                  | Active offers (price, condition)      |
| `fulfillmentAvailability` | Inventory by fulfillment channel      |
| `procurement`             | Procurement/sourcing info             |

#### Response

```json
{
  "sku": "MY-SKU-001",
  "summaries": [
    {
      "marketplaceId": "ATVPDKIKX0DER",
      "asin": "B07ABCDEFG",
      "productType": "PILLOW",
      "conditionType": "new_new",
      "status": ["BUYABLE"],
      "itemName": "Premium Memory Foam Pillow",
      "createdDate": "2024-01-15T10:00:00Z",
      "lastUpdatedDate": "2026-02-18T14:30:00Z",
      "mainImage": {
        "link": "https://images-na.ssl-images-amazon.com/images/I/41xxxx.jpg",
        "height": 500,
        "width": 500
      }
    }
  ],
  "issues": [
    {
      "code": "MISSING_RECOMMENDED_ATTRIBUTE",
      "message": "The bullet_point attribute is recommended for this product type.",
      "severity": "WARNING",
      "attributeNames": ["bullet_point"]
    }
  ],
  "offers": [
    {
      "marketplaceId": "ATVPDKIKX0DER",
      "offerType": "B2C",
      "price": {
        "currencyCode": "USD",
        "amount": "29.99"
      }
    }
  ],
  "fulfillmentAvailability": [
    {
      "fulfillmentChannelCode": "AMAZON_NA",
      "quantity": 234
    }
  ]
}
```

#### Listing Status Values

| Status         | Description                |
| -------------- | -------------------------- |
| `BUYABLE`      | Active and purchasable     |
| `DISCOVERABLE` | Searchable but not buyable |
| `DELETED`      | Deleted listing            |

### putListingsItem (Create/Update)

```
PUT /listings/2021-08-01/items/{sellerId}/{sku}
```

#### Request Body

```json
{
  "productType": "PILLOW",
  "requirements": "LISTING",
  "attributes": {
    "condition_type": [
      {
        "value": "new_new",
        "marketplace_id": "ATVPDKIKX0DER"
      }
    ],
    "item_name": [
      {
        "value": "Premium Memory Foam Pillow - King Size - Cooling Gel",
        "language_tag": "en_US",
        "marketplace_id": "ATVPDKIKX0DER"
      }
    ],
    "brand": [
      {
        "value": "MyBrand",
        "marketplace_id": "ATVPDKIKX0DER"
      }
    ],
    "bullet_point": [
      {
        "value": "Cooling gel-infused memory foam for temperature regulation",
        "language_tag": "en_US",
        "marketplace_id": "ATVPDKIKX0DER"
      },
      {
        "value": "CertiPUR-US certified foam, hypoallergenic",
        "language_tag": "en_US",
        "marketplace_id": "ATVPDKIKX0DER"
      }
    ],
    "externally_assigned_product_identifier": [
      {
        "type": "upc",
        "value": "012345678901",
        "marketplace_id": "ATVPDKIKX0DER"
      }
    ],
    "purchasable_offer": [
      {
        "currency": "USD",
        "our_price": [
          {
            "schedule": [
              {
                "value_with_tax": 29.99
              }
            ]
          }
        ],
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
```

#### Query Parameters

| Parameter        | Type   | Required | Description               |
| ---------------- | ------ | -------- | ------------------------- |
| `marketplaceIds` | string | Yes      | Marketplace ID(s)         |
| `issueLocale`    | string | No       | Locale for issue messages |

#### Response

```json
{
  "sku": "MY-SKU-001",
  "status": "ACCEPTED",
  "submissionId": "sub-12345",
  "issues": []
}
```

Status values: `ACCEPTED`, `INVALID`

### patchListingsItem (Partial Update)

```
PATCH /listings/2021-08-01/items/{sellerId}/{sku}
```

Use for updating specific attributes without replacing the entire listing.

#### Request Body

```json
{
  "productType": "PILLOW",
  "patches": [
    {
      "op": "replace",
      "path": "/attributes/purchasable_offer",
      "value": [
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
  ]
}
```

Supported operations: `add`, `replace`, `delete`

### deleteListingsItem

```
DELETE /listings/2021-08-01/items/{sellerId}/{sku}
```

**CAUTION:** This permanently removes the listing.

### Product Type Definitions

To create listings, you need to know the required attributes for a product type:

```
GET /definitions/2020-09-01/productTypes/{productType}
  ?marketplaceIds=ATVPDKIKX0DER
  &requirements=LISTING
  &locale=en_US
```

This returns a JSON Schema defining all required and optional attributes.

### Rate Limits

| Operation          | Burst | Restore |
| ------------------ | ----- | ------- |
| getListingsItem    | 5     | 5/sec   |
| putListingsItem    | 5     | 5/sec   |
| patchListingsItem  | 5     | 5/sec   |
| deleteListingsItem | 5     | 5/sec   |

---

## Common Patterns

### Search and Get Full Details

```python
# 1. Search by keywords
search_result = sp_api_request("GET", "/catalog/2022-04-01/items",
    params={"keywords": "memory foam pillow", "marketplaceIds": "ATVPDKIKX0DER",
            "includedData": "summaries", "pageSize": "5"})

# 2. Get full details for each ASIN
for item in search_result["items"]:
    asin = item["asin"]
    detail = sp_api_request("GET", f"/catalog/2022-04-01/items/{asin}",
        params={"marketplaceIds": "ATVPDKIKX0DER",
                "includedData": "summaries,attributes,images,salesRanks"})
```

### Check Listing Health

```python
# Get listing with issues
listing = sp_api_request("GET",
    f"/listings/2021-08-01/items/{seller_id}/{sku}",
    params={"marketplaceIds": "ATVPDKIKX0DER",
            "includedData": "summaries,issues,offers,fulfillmentAvailability"})

issues = listing.get("issues", [])
errors = [i for i in issues if i.get("severity") == "ERROR"]
warnings = [i for i in issues if i.get("severity") == "WARNING"]
```

### Update Price

```python
body = {
    "productType": "PILLOW",
    "patches": [{
        "op": "replace",
        "path": "/attributes/purchasable_offer",
        "value": [{
            "currency": "USD",
            "our_price": [{"schedule": [{"value_with_tax": 34.99}]}],
            "marketplace_id": "ATVPDKIKX0DER"
        }]
    }]
}
sp_api_request("PATCH", f"/listings/2021-08-01/items/{seller_id}/{sku}",
    params={"marketplaceIds": "ATVPDKIKX0DER"}, body=body)
```
