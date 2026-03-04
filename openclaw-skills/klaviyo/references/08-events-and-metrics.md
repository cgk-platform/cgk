# Klaviyo API Reference: Events and Metrics

Track customer activity, query event data, and analyze metric aggregates. Events represent discrete customer actions (e.g., "Placed Order", "Viewed Product"). Metrics are the named event types that group events together. The metric aggregates endpoint provides powerful analytics for reporting on event data over time.

**API Revision:** `2024-10-15`

---

## Events Endpoints

### GET /api/events/

List events with filtering by metric, profile, and datetime range.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `filter` | string | Filter by `metric_id`, `profile_id`, `datetime`, `timestamp` using operators `equals`, `greater-than`, `less-than`, `greater-or-equal`, `less-or-equal` |
| `fields[event]` | string | Sparse fieldset: `metric_id`, `profile_id`, `timestamp`, `event_properties`, `datetime`, `uuid` |
| `fields[metric]` | string | Include metric fields |
| `fields[profile]` | string | Include profile fields |
| `include` | string | `metric`, `profile` |
| `page[cursor]` | string | Cursor for pagination |
| `sort` | string | `datetime`, `-datetime`, `timestamp`, `-timestamp` |

```bash
curl -G 'https://a.]klaviyo.com/api/events/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --data-urlencode 'filter=greater-than(datetime,2024-01-01T00:00:00Z)' \
  --data-urlencode 'filter=equals(metric_id,"METRIC_ID")' \
  --data-urlencode 'include=metric,profile' \
  --data-urlencode 'sort=-datetime'
```

**Response:**

```json
{
  "data": [
    {
      "type": "event",
      "id": "EVENT_ID",
      "attributes": {
        "metric_id": "METRIC_ID",
        "profile_id": "PROFILE_ID",
        "timestamp": 1704067200,
        "datetime": "2024-01-01T00:00:00+00:00",
        "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "event_properties": {
          "ProductName": "Featured Product",
          "ProductID": "SKU-001",
          "Value": 39.99,
          "Quantity": 1
        }
      },
      "relationships": {
        "metric": { "data": { "type": "metric", "id": "METRIC_ID" } },
        "profile": { "data": { "type": "profile", "id": "PROFILE_ID" } }
      },
      "links": { "self": "https://a.klaviyo.com/api/events/EVENT_ID/" }
    }
  ],
  "included": [],
  "links": {
    "self": "https://a.klaviyo.com/api/events/",
    "next": "https://a.klaviyo.com/api/events/?page[cursor]=CURSOR_TOKEN"
  }
}
```

---

### GET /api/events/{id}/

Retrieve a single event by ID.

```bash
curl 'https://a.klaviyo.com/api/events/EVENT_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

---

### POST /api/events/

Create (track) a custom event. This is the primary endpoint for recording customer activity from server-side integrations.

**Request Body:**

```json
{
  "data": {
    "type": "event",
    "attributes": {
      "metric": {
        "data": {
          "type": "metric",
          "attributes": {
            "name": "Placed Order"
          }
        }
      },
      "profile": {
        "data": {
          "type": "profile",
          "attributes": {
            "email": "customer@example.com",
            "phone_number": "+15551234567",
            "first_name": "Jane",
            "last_name": "Doe",
            "properties": {
              "LTV": 299.95
            }
          }
        }
      },
      "properties": {
        "OrderId": "ORD-12345",
        "Value": 79.98,
        "Currency": "USD",
        "Items": [
          {
            "ProductID": "SKU-001",
            "ProductName": "Featured Product",
            "Quantity": 2,
            "ItemPrice": 39.99,
            "ImageURL": "https://example.com/product.jpg",
            "ProductURL": "https://example.com/products/featured-product"
          }
        ]
      },
      "time": "2024-01-15T10:30:00Z",
      "value": 79.98,
      "unique_id": "ORD-12345"
    }
  }
}
```

```bash
curl -X POST 'https://a.klaviyo.com/api/events/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "event",
      "attributes": {
        "metric": {
          "data": {
            "type": "metric",
            "attributes": { "name": "Placed Order" }
          }
        },
        "profile": {
          "data": {
            "type": "profile",
            "attributes": { "email": "customer@example.com" }
          }
        },
        "properties": {
          "OrderId": "ORD-12345",
          "Value": 79.98
        },
        "value": 79.98,
        "unique_id": "ORD-12345"
      }
    }
  }'
```

**Notes:**

- The `metric.name` is matched or auto-created if it does not exist.
- The `profile` is matched by email, phone_number, or external_id; created if not found.
- `unique_id` prevents duplicate events for the same action.
- `value` is used for revenue reporting in aggregates.
- `time` defaults to now if omitted. Must be ISO 8601.

---

### POST /api/event-bulk-create-jobs/

Bulk create events in a single request. Supports up to 1,000 events per job.

**Request Body:**

```json
{
  "data": {
    "type": "event-bulk-create-job",
    "attributes": {
      "events-bulk-create": {
        "data": [
          {
            "type": "event-bulk-create",
            "attributes": {
              "metric": {
                "data": {
                  "type": "metric",
                  "attributes": { "name": "Viewed Product" }
                }
              },
              "profile": {
                "data": {
                  "type": "profile",
                  "attributes": { "email": "user1@example.com" }
                }
              },
              "properties": { "ProductName": "Best Seller", "ProductID": "SKU-002" },
              "time": "2024-01-15T08:00:00Z"
            }
          },
          {
            "type": "event-bulk-create",
            "attributes": {
              "metric": {
                "data": {
                  "type": "metric",
                  "attributes": { "name": "Viewed Product" }
                }
              },
              "profile": {
                "data": {
                  "type": "profile",
                  "attributes": { "email": "user2@example.com" }
                }
              },
              "properties": { "ProductName": "Featured Product", "ProductID": "SKU-001" },
              "time": "2024-01-15T09:15:00Z"
            }
          }
        ]
      }
    }
  }
}
```

---

### GET /api/event-bulk-create-jobs/{id}/

Check the status of a bulk event creation job.

**Response:**

```json
{
  "data": {
    "type": "event-bulk-create-job",
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

**Job statuses:** `queued`, `processing`, `complete`, `cancelled`, `failed`

---

## Metrics Endpoints

### GET /api/metrics/

List all metrics (event types) in the account.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `fields[metric]` | string | `name`, `created`, `updated`, `integration` |
| `filter` | string | Filter by `integration.name` or `integration.category` |
| `page[cursor]` | string | Cursor for pagination |

```bash
curl -G 'https://a.klaviyo.com/api/metrics/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

**Response:**

```json
{
  "data": [
    {
      "type": "metric",
      "id": "METRIC_ID",
      "attributes": {
        "name": "Placed Order",
        "created": "2023-06-01T00:00:00Z",
        "updated": "2024-01-15T00:00:00Z",
        "integration": {
          "id": "INTEGRATION_ID",
          "name": "Shopify",
          "category": "ecommerce"
        }
      },
      "links": { "self": "https://a.klaviyo.com/api/metrics/METRIC_ID/" }
    }
  ],
  "links": { "self": "https://a.klaviyo.com/api/metrics/" }
}
```

---

### GET /api/metrics/{id}/

Retrieve a single metric by ID.

```bash
curl 'https://a.klaviyo.com/api/metrics/METRIC_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

---

### POST /api/metric-aggregates/

Query aggregated metric data. This is the primary analytics endpoint for building reports, dashboards, and data exports.

**Request Body:**

```json
{
  "data": {
    "type": "metric-aggregate",
    "attributes": {
      "metric_id": "METRIC_ID",
      "measurements": ["count", "sum_value", "unique"],
      "interval": "day",
      "filter": [
        "greater-or-equal(datetime,2024-01-01T00:00:00Z)",
        "less-than(datetime,2024-02-01T00:00:00Z)"
      ],
      "by": ["$flow", "$message"],
      "page_size": 500,
      "timezone": "America/New_York",
      "sort": "-count"
    }
  }
}
```

**Attribute Details:**

| Attribute      | Type    | Required | Description                                                                                                                                |
| -------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `metric_id`    | string  | Yes      | The metric to aggregate                                                                                                                    |
| `measurements` | array   | Yes      | One or more of: `count`, `sum_value`, `unique`, `value`                                                                                    |
| `interval`     | string  | No       | `hour`, `day`, `week`, `month` (omit for total)                                                                                            |
| `filter`       | array   | Yes      | Date range filters using `greater-or-equal(datetime,...)` and `less-than(datetime,...)`                                                    |
| `by`           | array   | No       | Group-by dimensions: `$flow`, `$message`, `$campaign`, `$attributed_flow`, `$attributed_message`, or any event property like `ProductName` |
| `page_size`    | integer | No       | Results per page (default 500)                                                                                                             |
| `timezone`     | string  | No       | IANA timezone (default `UTC`)                                                                                                              |
| `sort`         | string  | No       | Sort field prefixed with `-` for descending                                                                                                |

**Measurement types:**

- `count` - Number of events
- `sum_value` - Sum of the event `value` field (revenue)
- `unique` - Number of unique profiles
- `value` - Individual event values

```bash
curl -X POST 'https://a.klaviyo.com/api/metric-aggregates/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "metric-aggregate",
      "attributes": {
        "metric_id": "PLACED_ORDER_METRIC_ID",
        "measurements": ["count", "sum_value", "unique"],
        "interval": "day",
        "filter": [
          "greater-or-equal(datetime,2024-01-01T00:00:00Z)",
          "less-than(datetime,2024-02-01T00:00:00Z)"
        ],
        "timezone": "America/New_York"
      }
    }
  }'
```

**Response:**

```json
{
  "data": {
    "type": "metric-aggregate",
    "id": "METRIC_ID",
    "attributes": {
      "dates": [
        "2024-01-01T00:00:00+00:00",
        "2024-01-02T00:00:00+00:00",
        "2024-01-03T00:00:00+00:00"
      ],
      "data": [
        {
          "dimensions": [],
          "measurements": {
            "count": [15, 22, 18],
            "sum_value": [599.85, 879.56, 719.82],
            "unique": [12, 19, 16]
          }
        }
      ]
    },
    "links": { "self": "https://a.klaviyo.com/api/metric-aggregates/" }
  }
}
```

**Response with `by` dimensions:**

```json
{
  "data": {
    "type": "metric-aggregate",
    "id": "METRIC_ID",
    "attributes": {
      "dates": ["2024-01-01T00:00:00+00:00"],
      "data": [
        {
          "dimensions": ["Welcome Series", "Email 1"],
          "measurements": {
            "count": [150],
            "sum_value": [5997.5]
          }
        },
        {
          "dimensions": ["Welcome Series", "Email 2"],
          "measurements": {
            "count": [98],
            "sum_value": [3920.02]
          }
        }
      ]
    }
  }
}
```

---

## Custom Metrics Endpoints

### GET /api/custom-metrics/

List all custom-defined metrics.

```bash
curl -G 'https://a.klaviyo.com/api/custom-metrics/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

---

### POST /api/custom-metrics/

Create a custom metric definition.

**Request Body:**

```json
{
  "data": {
    "type": "custom-metric",
    "attributes": {
      "name": "Product Reorder",
      "description": "Tracks when a customer reorders a product"
    }
  }
}
```

---

### PATCH /api/custom-metrics/{id}/

Update a custom metric.

**Request Body:**

```json
{
  "data": {
    "type": "custom-metric",
    "id": "CUSTOM_METRIC_ID",
    "attributes": {
      "name": "Product Reorder",
      "description": "Updated description for reorder tracking"
    }
  }
}
```

---

### DELETE /api/custom-metrics/{id}/

Delete a custom metric. Returns `204 No Content` on success.

```bash
curl -X DELETE 'https://a.klaviyo.com/api/custom-metrics/CUSTOM_METRIC_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

---

## Rate Limits

| Endpoint                          | Burst | Steady |
| --------------------------------- | ----- | ------ |
| GET /api/events/                  | 10/s  | 150/m  |
| POST /api/events/                 | 350/s | 3500/m |
| POST /api/event-bulk-create-jobs/ | 10/s  | 150/m  |
| GET /api/metrics/                 | 10/s  | 150/m  |
| POST /api/metric-aggregates/      | 3/s   | 60/m   |
| Custom Metrics (all)              | 10/s  | 150/m  |

## Key Notes

- Events are **write-once** and cannot be updated or deleted after creation.
- The `unique_id` field on event creation is critical for idempotency; duplicate `unique_id` values for the same metric are ignored.
- Metric aggregates is the most powerful analytics endpoint but has tight rate limits; cache results where possible.
- The `by` parameter in aggregates supports custom event property keys in addition to built-in dimensions.
- Events list endpoint returns results in reverse chronological order by default.
- All GET endpoints are read-only. POST /api/events/ and POST /api/event-bulk-create-jobs/ are action endpoints that create data.
