# Klaviyo API Reference: Catalogs

Manage product catalog data for personalized recommendations, back-in-stock alerts, and dynamic email content. Catalogs consist of three resource types: items (products), variants (SKU-level entries), and categories. Each supports full CRUD and bulk operations.

**API Revision:** `2024-10-15`

---

## Catalog Items

### GET /api/catalog-items/

List catalog items with filtering and sparse fieldsets.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `fields[catalog-item]` | string | `external_id`, `title`, `description`, `url`, `image_full_url`, `image_thumbnail_url`, `price`, `custom_metadata`, `published`, `created`, `updated` |
| `filter` | string | Filter by `ids`, `external_id`, `title`, `published` |
| `include` | string | `variants`, `categories` |
| `page[cursor]` | string | Cursor for pagination |
| `sort` | string | `created`, `-created` |

```bash
curl -G 'https://a.klaviyo.com/api/catalog-items/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --data-urlencode 'filter=equals(published,true)' \
  --data-urlencode 'include=variants'
```

**Response:**

```json
{
  "data": [
    {
      "type": "catalog-item",
      "id": "$custom:::$default:::SKU-001",
      "attributes": {
        "external_id": "SKU-001",
        "title": "Featured Product",
        "description": "Premium quality product with expert craftsmanship",
        "url": "https://example.com/products/featured-product",
        "image_full_url": "https://cdn.example.com/product-full.jpg",
        "image_thumbnail_url": "https://cdn.example.com/product-thumb.jpg",
        "price": 39.99,
        "custom_metadata": {
          "category": "Featured",
          "units": 1
        },
        "published": true,
        "created": "2024-01-01T00:00:00Z",
        "updated": "2024-01-15T00:00:00Z"
      },
      "relationships": {
        "variants": {
          "data": [{ "type": "catalog-variant", "id": "$custom:::$default:::SKU-001-30" }],
          "links": {
            "self": "https://a.klaviyo.com/api/catalog-items/$custom:::$default:::SKU-001/relationships/variants/",
            "related": "https://a.klaviyo.com/api/catalog-items/$custom:::$default:::SKU-001/variants/"
          }
        },
        "categories": {
          "data": [],
          "links": {
            "self": "https://a.klaviyo.com/api/catalog-items/$custom:::$default:::SKU-001/relationships/categories/",
            "related": "https://a.klaviyo.com/api/catalog-items/$custom:::$default:::SKU-001/categories/"
          }
        }
      },
      "links": { "self": "https://a.klaviyo.com/api/catalog-items/$custom:::$default:::SKU-001/" }
    }
  ],
  "links": { "self": "https://a.klaviyo.com/api/catalog-items/" }
}
```

**Note:** Catalog item IDs follow the format `$custom:::$default:::EXTERNAL_ID`.

---

### GET /api/catalog-items/{id}/

Retrieve a single catalog item.

```bash
curl 'https://a.klaviyo.com/api/catalog-items/$custom:::$default:::SKU-001/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --data-urlencode 'include=variants,categories'
```

---

### POST /api/catalog-items/

Create a catalog item.

**Request Body:**

```json
{
  "data": {
    "type": "catalog-item",
    "attributes": {
      "external_id": "SKU-002",
      "title": "New Arrival",
      "description": "Premium product, available in multiple variants",
      "url": "https://example.com/products/new-arrival",
      "image_full_url": "https://cdn.example.com/newarr-full.jpg",
      "image_thumbnail_url": "https://cdn.example.com/newarr-thumb.jpg",
      "price": 44.99,
      "custom_metadata": {
        "category": "New Arrivals",
        "variant_count": 2,
        "servings": 30
      },
      "published": true
    },
    "relationships": {
      "categories": {
        "data": [{ "type": "catalog-category", "id": "$custom:::$default:::featured-collection" }]
      }
    }
  }
}
```

```bash
curl -X POST 'https://a.klaviyo.com/api/catalog-items/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{"data":{"type":"catalog-item","attributes":{"external_id":"SKU-002","title":"New Arrival","description":"Premium product","url":"https://example.com/products/new-arrival","image_full_url":"https://cdn.example.com/newarr-full.jpg","price":44.99,"published":true}}}'
```

---

### PATCH /api/catalog-items/{id}/

Update a catalog item. Only include fields that need to change.

**Request Body:**

```json
{
  "data": {
    "type": "catalog-item",
    "id": "$custom:::$default:::SKU-002",
    "attributes": {
      "price": 49.99,
      "description": "Updated description with new formulation details"
    }
  }
}
```

---

### DELETE /api/catalog-items/{id}/

Delete a catalog item. Returns `204 No Content`.

```bash
curl -X DELETE 'https://a.klaviyo.com/api/catalog-items/$custom:::$default:::SKU-002/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

---

## Catalog Items - Bulk Operations

### POST /api/catalog-item-bulk-create-jobs/

Bulk create up to 100 items per job.

**Request Body:**

```json
{
  "data": {
    "type": "catalog-item-bulk-create-job",
    "attributes": {
      "items": {
        "data": [
          {
            "type": "catalog-item",
            "attributes": {
              "external_id": "SKU-003",
              "title": "Best Seller",
              "description": "Popular best-selling product",
              "url": "https://example.com/products/best-seller",
              "image_full_url": "https://cdn.example.com/bestseller-full.jpg",
              "price": 24.99,
              "published": true
            }
          },
          {
            "type": "catalog-item",
            "attributes": {
              "external_id": "SKU-004",
              "title": "Premium Add-On",
              "description": "Premium quality add-on product",
              "url": "https://example.com/products/addon-product",
              "image_full_url": "https://cdn.example.com/addon-product-full.jpg",
              "price": 29.99,
              "published": true
            }
          }
        ]
      }
    }
  }
}
```

---

### POST /api/catalog-item-bulk-update-jobs/

Bulk update existing items. Same structure as bulk create but with `id` fields on each item.

**Request Body:**

```json
{
  "data": {
    "type": "catalog-item-bulk-update-job",
    "attributes": {
      "items": {
        "data": [
          {
            "type": "catalog-item",
            "id": "$custom:::$default:::SKU-003",
            "attributes": {
              "price": 22.99
            }
          },
          {
            "type": "catalog-item",
            "id": "$custom:::$default:::SKU-004",
            "attributes": {
              "price": 27.99
            }
          }
        ]
      }
    }
  }
}
```

---

### POST /api/catalog-item-bulk-delete-jobs/

Bulk delete items by ID.

**Request Body:**

```json
{
  "data": {
    "type": "catalog-item-bulk-delete-job",
    "attributes": {
      "items": {
        "data": [
          { "type": "catalog-item", "id": "$custom:::$default:::SKU-003" },
          { "type": "catalog-item", "id": "$custom:::$default:::SKU-004" }
        ]
      }
    }
  }
}
```

---

### GET /api/catalog-item-bulk-create-jobs/{id}/

Check status of a bulk item job. Same pattern for update and delete jobs at their respective paths.

**Response:**

```json
{
  "data": {
    "type": "catalog-item-bulk-create-job",
    "id": "JOB_ID",
    "attributes": {
      "status": "complete",
      "created_at": "2024-01-15T10:00:00Z",
      "total_count": 2,
      "completed_count": 2,
      "failed_count": 0,
      "errors": []
    }
  }
}
```

---

## Catalog Items - Relationships

### GET /api/catalog-items/{id}/relationships/variants/

Get variant relationships for an item.

### POST /api/catalog-items/{id}/relationships/variants/

Associate variants with an item.

### DELETE /api/catalog-items/{id}/relationships/variants/

Remove variant associations from an item.

### GET /api/catalog-items/{id}/relationships/categories/

Get category relationships for an item.

### POST /api/catalog-items/{id}/relationships/categories/

Associate categories with an item.

### DELETE /api/catalog-items/{id}/relationships/categories/

Remove category associations from an item.

**Relationship Body (POST/DELETE):**

```json
{
  "data": [
    { "type": "catalog-variant", "id": "$custom:::$default:::SKU-001-CHOC" },
    { "type": "catalog-variant", "id": "$custom:::$default:::SKU-001-VAN" }
  ]
}
```

---

## Catalog Variants

Variants represent SKU-level entries under a catalog item (e.g., size, flavor, color).

### GET /api/catalog-variants/

List all catalog variants.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `fields[catalog-variant]` | string | `external_id`, `title`, `description`, `sku`, `price`, `url`, `image_full_url`, `image_thumbnail_url`, `inventory_quantity`, `inventory_policy`, `custom_metadata`, `published`, `created`, `updated` |
| `filter` | string | Filter by `ids`, `external_id`, `published` |
| `include` | string | `item` |
| `page[cursor]` | string | Pagination cursor |
| `sort` | string | `created`, `-created` |

---

### GET /api/catalog-variants/{id}/

Retrieve a single variant.

---

### POST /api/catalog-variants/

Create a catalog variant.

**Request Body:**

```json
{
  "data": {
    "type": "catalog-variant",
    "attributes": {
      "external_id": "SKU-002-CHOC",
      "title": "New Arrival - Variant A",
      "description": "Variant A of the new arrival product",
      "sku": "NEWARR-VARA-01",
      "price": 44.99,
      "url": "https://example.com/products/new-arrival?variant=chocolate",
      "image_full_url": "https://cdn.example.com/newarr-vara-full.jpg",
      "inventory_quantity": 500,
      "inventory_policy": 1,
      "custom_metadata": {
        "variant": "A",
        "size": "Standard"
      },
      "published": true
    },
    "relationships": {
      "item": {
        "data": {
          "type": "catalog-item",
          "id": "$custom:::$default:::SKU-002"
        }
      }
    }
  }
}
```

**`inventory_policy` values:**

- `0` - Deny orders when out of stock (default)
- `1` - Allow orders when out of stock (backorder)
- `2` - Use Klaviyo default behavior

---

### PATCH /api/catalog-variants/{id}/

Update a variant. Only include fields that need to change.

**Request Body:**

```json
{
  "data": {
    "type": "catalog-variant",
    "id": "$custom:::$default:::SKU-002-CHOC",
    "attributes": {
      "inventory_quantity": 250,
      "price": 42.99
    }
  }
}
```

---

### DELETE /api/catalog-variants/{id}/

Delete a variant. Returns `204 No Content`.

---

### POST /api/catalog-variant-bulk-create-jobs/

Bulk create variants (up to 100 per job).

### POST /api/catalog-variant-bulk-update-jobs/

Bulk update variants.

### POST /api/catalog-variant-bulk-delete-jobs/

Bulk delete variants.

### GET /api/catalog-variant-bulk-create-jobs/{id}/

Check bulk variant job status. Same pattern for update and delete.

**All bulk variant bodies follow the same pattern as bulk item bodies**, substituting `catalog-variant` for `catalog-item`.

---

## Catalog Categories

Categories group items for organization and filtered recommendations.

### GET /api/catalog-categories/

List catalog categories.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `fields[catalog-category]` | string | `external_id`, `name`, `created`, `updated` |
| `filter` | string | Filter by `ids`, `external_id`, `name` |
| `include` | string | `items` |
| `page[cursor]` | string | Pagination cursor |
| `sort` | string | `created`, `-created` |

---

### GET /api/catalog-categories/{id}/

Retrieve a single category.

---

### POST /api/catalog-categories/

Create a category.

**Request Body:**

```json
{
  "data": {
    "type": "catalog-category",
    "attributes": {
      "external_id": "featured-collection",
      "name": "Featured Collection"
    },
    "relationships": {
      "items": {
        "data": [{ "type": "catalog-item", "id": "$custom:::$default:::SKU-002" }]
      }
    }
  }
}
```

---

### PATCH /api/catalog-categories/{id}/

Update a category.

**Request Body:**

```json
{
  "data": {
    "type": "catalog-category",
    "id": "$custom:::$default:::featured-collection",
    "attributes": {
      "name": "Featured & Trending"
    }
  }
}
```

---

### DELETE /api/catalog-categories/{id}/

Delete a category. Returns `204 No Content`.

---

### POST /api/catalog-category-bulk-create-jobs/

Bulk create categories.

### POST /api/catalog-category-bulk-update-jobs/

Bulk update categories.

### POST /api/catalog-category-bulk-delete-jobs/

Bulk delete categories.

### GET /api/catalog-category-bulk-create-jobs/{id}/

Check bulk category job status.

---

## Catalog Categories - Relationships

### GET /api/catalog-categories/{id}/relationships/items/

Get item relationships for a category.

### POST /api/catalog-categories/{id}/relationships/items/

Associate items with a category.

### DELETE /api/catalog-categories/{id}/relationships/items/

Remove item associations from a category.

---

## Rate Limits

| Endpoint Pattern                      | Burst | Steady |
| ------------------------------------- | ----- | ------ |
| GET catalog-items/variants/categories | 10/s  | 150/m  |
| POST/PATCH/DELETE single resource     | 10/s  | 150/m  |
| Bulk create/update/delete jobs        | 10/s  | 150/m  |
| GET bulk job status                   | 10/s  | 150/m  |

## Key Notes

- Catalog IDs use the format `$custom:::$default:::EXTERNAL_ID` where `EXTERNAL_ID` is the value you set.
- Items, variants, and categories are all independently addressable resources connected via relationships.
- Bulk operations support up to 100 resources per job.
- Catalog data powers dynamic product blocks in emails, back-in-stock flows, price-drop alerts, and product recommendations.
- All single-resource GET, POST, PATCH, DELETE endpoints operate synchronously. Bulk operations are asynchronous (poll job status).
- All GET endpoints are read-only. POST, PATCH, DELETE are action endpoints that modify data.
