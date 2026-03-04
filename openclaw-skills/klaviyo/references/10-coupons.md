# Klaviyo API Reference: Coupons

Manage coupons and unique coupon codes for campaigns and flows. Coupons are the parent container (representing a discount type), while coupon codes are the individual unique codes distributed to customers. This two-tier model lets you create a single coupon definition and generate many unique codes under it.

**API Revision:** `2024-10-15`

---

## Coupons

### GET /api/coupons/

List all coupons in the account.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `fields[coupon]` | string | `external_id`, `description`, `created`, `updated` |
| `page[cursor]` | string | Cursor for pagination |

```bash
curl -G 'https://a.klaviyo.com/api/coupons/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

**Response:**

```json
{
  "data": [
    {
      "type": "coupon",
      "id": "COUPON_ID",
      "attributes": {
        "external_id": "WELCOME20",
        "description": "20% off first order for new subscribers",
        "created": "2024-01-01T00:00:00Z",
        "updated": "2024-01-15T00:00:00Z"
      },
      "relationships": {
        "coupon-codes": {
          "links": {
            "self": "https://a.klaviyo.com/api/coupons/COUPON_ID/relationships/coupon-codes/",
            "related": "https://a.klaviyo.com/api/coupons/COUPON_ID/coupon-codes/"
          }
        }
      },
      "links": { "self": "https://a.klaviyo.com/api/coupons/COUPON_ID/" }
    }
  ],
  "links": { "self": "https://a.klaviyo.com/api/coupons/" }
}
```

---

### GET /api/coupons/{id}/

Retrieve a single coupon.

```bash
curl 'https://a.klaviyo.com/api/coupons/COUPON_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

---

### POST /api/coupons/

Create a coupon container.

**Request Body:**

```json
{
  "data": {
    "type": "coupon",
    "attributes": {
      "external_id": "SUMMER25",
      "description": "25% off summer sale - all products"
    }
  }
}
```

```bash
curl -X POST 'https://a.klaviyo.com/api/coupons/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "coupon",
      "attributes": {
        "external_id": "SUMMER25",
        "description": "25% off summer sale - all products"
      }
    }
  }'
```

**Required Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `external_id` | string | Unique identifier for the coupon (used as reference name) |

**Optional Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `description` | string | Human-readable description of the coupon |

---

### PATCH /api/coupons/{id}/

Update a coupon.

**Request Body:**

```json
{
  "data": {
    "type": "coupon",
    "id": "COUPON_ID",
    "attributes": {
      "description": "Updated: 25% off summer sale - ends August 31"
    }
  }
}
```

---

### DELETE /api/coupons/{id}/

Delete a coupon and all associated coupon codes. Returns `204 No Content`.

```bash
curl -X DELETE 'https://a.klaviyo.com/api/coupons/COUPON_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

**Warning:** Deleting a coupon permanently removes all coupon codes under it. Codes already distributed to customers will become invalid.

---

## Coupon Codes

### GET /api/coupon-codes/

List all coupon codes across all coupons.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `fields[coupon-code]` | string | `unique_code`, `expires_at`, `status`, `created_at`, `updated_at` |
| `filter` | string | Filter by `coupon.id`, `status` (`available`, `assigned`, `used`) |
| `include` | string | `coupon` |
| `page[cursor]` | string | Cursor for pagination |

```bash
curl -G 'https://a.klaviyo.com/api/coupon-codes/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --data-urlencode 'filter=equals(coupon.id,"COUPON_ID")' \
  --data-urlencode 'filter=equals(status,"available")'
```

**Response:**

```json
{
  "data": [
    {
      "type": "coupon-code",
      "id": "COUPON_CODE_ID",
      "attributes": {
        "unique_code": "SUMMER25-A1B2C3",
        "expires_at": "2024-08-31T23:59:59Z",
        "status": "available",
        "created_at": "2024-06-01T00:00:00Z",
        "updated_at": "2024-06-01T00:00:00Z"
      },
      "relationships": {
        "coupon": {
          "data": { "type": "coupon", "id": "COUPON_ID" },
          "links": {
            "self": "https://a.klaviyo.com/api/coupon-codes/COUPON_CODE_ID/relationships/coupon/",
            "related": "https://a.klaviyo.com/api/coupon-codes/COUPON_CODE_ID/coupon/"
          }
        }
      },
      "links": { "self": "https://a.klaviyo.com/api/coupon-codes/COUPON_CODE_ID/" }
    }
  ],
  "links": { "self": "https://a.klaviyo.com/api/coupon-codes/" }
}
```

**Coupon code statuses:**

- `available` - Not yet assigned to a profile
- `assigned` - Reserved for a specific profile (used in email/flow)
- `used` - Redeemed by customer

---

### GET /api/coupon-codes/{id}/

Retrieve a single coupon code.

```bash
curl 'https://a.klaviyo.com/api/coupon-codes/COUPON_CODE_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --data-urlencode 'include=coupon'
```

---

### POST /api/coupon-codes/

Create a single coupon code.

**Request Body:**

```json
{
  "data": {
    "type": "coupon-code",
    "attributes": {
      "unique_code": "SUMMER25-EXCLUSIVE1",
      "expires_at": "2024-08-31T23:59:59Z"
    },
    "relationships": {
      "coupon": {
        "data": {
          "type": "coupon",
          "id": "COUPON_ID"
        }
      }
    }
  }
}
```

```bash
curl -X POST 'https://a.klaviyo.com/api/coupon-codes/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "coupon-code",
      "attributes": {
        "unique_code": "SUMMER25-EXCLUSIVE1",
        "expires_at": "2024-08-31T23:59:59Z"
      },
      "relationships": {
        "coupon": {
          "data": { "type": "coupon", "id": "COUPON_ID" }
        }
      }
    }
  }'
```

**Required Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `unique_code` | string | The actual code string customers will enter at checkout |

**Optional Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `expires_at` | string | ISO 8601 datetime when the code expires |

**Required Relationships:**
| Relationship | Description |
|--------------|-------------|
| `coupon` | The parent coupon this code belongs to |

---

### PATCH /api/coupon-codes/{id}/

Update a coupon code (e.g., extend expiration).

**Request Body:**

```json
{
  "data": {
    "type": "coupon-code",
    "id": "COUPON_CODE_ID",
    "attributes": {
      "expires_at": "2024-12-31T23:59:59Z"
    }
  }
}
```

---

### DELETE /api/coupon-codes/{id}/

Delete a coupon code. Returns `204 No Content`.

```bash
curl -X DELETE 'https://a.klaviyo.com/api/coupon-codes/COUPON_CODE_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

---

## Bulk Coupon Code Operations

### POST /api/coupon-code-bulk-create-jobs/

Bulk create coupon codes under a parent coupon. Supports up to 1,000 codes per job.

**Request Body:**

```json
{
  "data": {
    "type": "coupon-code-bulk-create-job",
    "attributes": {
      "coupon-codes": {
        "data": [
          {
            "type": "coupon-code",
            "attributes": {
              "unique_code": "SUMMER25-XK9F2A",
              "expires_at": "2024-08-31T23:59:59Z"
            }
          },
          {
            "type": "coupon-code",
            "attributes": {
              "unique_code": "SUMMER25-PL3M7B",
              "expires_at": "2024-08-31T23:59:59Z"
            }
          },
          {
            "type": "coupon-code",
            "attributes": {
              "unique_code": "SUMMER25-QR8N1C",
              "expires_at": "2024-08-31T23:59:59Z"
            }
          }
        ]
      }
    },
    "relationships": {
      "coupon": {
        "data": {
          "type": "coupon",
          "id": "COUPON_ID"
        }
      }
    }
  }
}
```

```bash
curl -X POST 'https://a.klaviyo.com/api/coupon-code-bulk-create-jobs/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "coupon-code-bulk-create-job",
      "attributes": {
        "coupon-codes": {
          "data": [
            {"type": "coupon-code", "attributes": {"unique_code": "SUMMER25-XK9F2A", "expires_at": "2024-08-31T23:59:59Z"}},
            {"type": "coupon-code", "attributes": {"unique_code": "SUMMER25-PL3M7B", "expires_at": "2024-08-31T23:59:59Z"}}
          ]
        }
      },
      "relationships": {
        "coupon": {"data": {"type": "coupon", "id": "COUPON_ID"}}
      }
    }
  }'
```

---

### GET /api/coupon-code-bulk-create-jobs/{id}/

Check the status of a bulk coupon code creation job.

**Response:**

```json
{
  "data": {
    "type": "coupon-code-bulk-create-job",
    "id": "JOB_ID",
    "attributes": {
      "status": "complete",
      "created_at": "2024-06-01T10:00:00Z",
      "total_count": 3,
      "completed_count": 3,
      "failed_count": 0,
      "errors": []
    },
    "relationships": {
      "coupon": {
        "data": { "type": "coupon", "id": "COUPON_ID" }
      }
    }
  }
}
```

**Job statuses:** `queued`, `processing`, `complete`, `cancelled`, `failed`

---

## Coupon-to-Codes Relationships

### GET /api/coupons/{id}/coupon-codes/

List all coupon codes for a specific coupon.

```bash
curl -G 'https://a.klaviyo.com/api/coupons/COUPON_ID/coupon-codes/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

### GET /api/coupons/{id}/relationships/coupon-codes/

Get coupon-code relationship identifiers for a coupon.

---

## Rate Limits

| Endpoint                       | Burst | Steady |
| ------------------------------ | ----- | ------ |
| GET /api/coupons/              | 10/s  | 150/m  |
| POST/PATCH/DELETE coupons      | 10/s  | 150/m  |
| GET /api/coupon-codes/         | 10/s  | 150/m  |
| POST/PATCH/DELETE coupon-codes | 10/s  | 150/m  |
| POST bulk create jobs          | 10/s  | 150/m  |
| GET bulk job status            | 10/s  | 150/m  |

## Key Notes

- Coupons are parent containers; coupon codes are the individual unique strings given to customers.
- Each coupon code must be globally unique across your entire Klaviyo account.
- Coupon codes have three lifecycle statuses: `available`, `assigned`, `used`.
- When Klaviyo renders a coupon block in an email, it assigns the next available code to that profile, changing the code status from `available` to `assigned`.
- Ensure you maintain a buffer of available codes. If codes run out, emails with coupon blocks will fail to render the code.
- Bulk create supports up to 1,000 codes per job. For large volumes, submit multiple jobs sequentially.
- Deleting a parent coupon cascades to delete all child coupon codes.
- The `external_id` on a coupon is a human-friendly identifier (e.g., the discount name), not the actual code string.
- All GET endpoints are read-only. POST, PATCH, DELETE are action endpoints.
