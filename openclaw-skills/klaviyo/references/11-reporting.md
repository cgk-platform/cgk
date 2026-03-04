# Klaviyo API Reference: Reporting

Query performance data for campaigns, flows, forms, and segments. The reporting API provides both aggregate values (totals for a time period) and time-series data (values over intervals). All reporting endpoints use POST with a query body specifying which statistics to retrieve.

**API Revision:** `2024-10-15`

**IMPORTANT: Rate Limit** - Each report type is limited to **225 requests per day**. Plan queries carefully and cache results aggressively.

---

## Available Statistics

All reporting endpoints accept the same set of statistics in the `statistics` array:

| Statistic          | Description                          |
| ------------------ | ------------------------------------ |
| `opens`            | Total email opens                    |
| `unique_opens`     | Unique email opens (one per profile) |
| `open_rate`        | Unique opens / deliveries            |
| `clicks`           | Total email clicks                   |
| `unique_clicks`    | Unique clicks (one per profile)      |
| `click_rate`       | Unique clicks / deliveries           |
| `recipients`       | Number of profiles targeted          |
| `deliveries`       | Successfully delivered emails        |
| `delivery_rate`    | Deliveries / recipients              |
| `bounce_rate`      | Bounces / recipients                 |
| `unsubscribes`     | Number of unsubscribes triggered     |
| `spam_complaints`  | Spam complaint count                 |
| `revenue`          | Total attributed revenue             |
| `conversion_rate`  | Conversions / deliveries             |
| `conversion_value` | Total conversion value               |

---

## Campaign Values Reports

### POST /api/campaign-values-reports/

Get aggregate performance values for campaigns over a time period.

**Request Body:**

```json
{
  "data": {
    "type": "campaign-values-report",
    "attributes": {
      "statistics": [
        "recipients",
        "deliveries",
        "delivery_rate",
        "opens",
        "unique_opens",
        "open_rate",
        "clicks",
        "unique_clicks",
        "click_rate",
        "unsubscribes",
        "spam_complaints",
        "bounce_rate",
        "revenue",
        "conversion_rate",
        "conversion_value"
      ],
      "timeframe": {
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-02-01T00:00:00Z"
      },
      "filter": "equals(campaign_id,\"CAMPAIGN_ID\")",
      "conversion_metric_id": "PLACED_ORDER_METRIC_ID"
    }
  }
}
```

```bash
curl -X POST 'https://a.klaviyo.com/api/campaign-values-reports/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "campaign-values-report",
      "attributes": {
        "statistics": ["recipients", "deliveries", "open_rate", "click_rate", "revenue"],
        "timeframe": {
          "start": "2024-01-01T00:00:00Z",
          "end": "2024-02-01T00:00:00Z"
        },
        "conversion_metric_id": "PLACED_ORDER_METRIC_ID"
      }
    }
  }'
```

**Request Attributes:**

| Attribute              | Type   | Required | Description                                                                                    |
| ---------------------- | ------ | -------- | ---------------------------------------------------------------------------------------------- |
| `statistics`           | array  | Yes      | List of statistics to query (see table above)                                                  |
| `timeframe`            | object | Yes      | `{start, end}` in ISO 8601 format                                                              |
| `filter`               | string | No       | Filter to specific campaign(s): `equals(campaign_id,"ID")` or `any(campaign_id,["ID1","ID2"])` |
| `conversion_metric_id` | string | No       | Metric ID for conversion-based stats (e.g., Placed Order metric)                               |

**Response:**

```json
{
  "data": {
    "type": "campaign-values-report",
    "attributes": {
      "results": [
        {
          "groupings": {
            "campaign_id": "CAMPAIGN_ID",
            "campaign_name": "January Newsletter",
            "send_channel": "email",
            "campaign_send_date": "2024-01-15T14:00:00Z"
          },
          "statistics": {
            "recipients": 15000,
            "deliveries": 14850,
            "delivery_rate": 0.99,
            "opens": 5940,
            "unique_opens": 4455,
            "open_rate": 0.3,
            "clicks": 1485,
            "unique_clicks": 1188,
            "click_rate": 0.08,
            "unsubscribes": 30,
            "spam_complaints": 2,
            "bounce_rate": 0.01,
            "revenue": 12450.0,
            "conversion_rate": 0.025,
            "conversion_value": 12450.0
          }
        }
      ]
    }
  }
}
```

---

## Flow Values Reports

### POST /api/flow-values-reports/

Get aggregate performance values for flows.

**Request Body:**

```json
{
  "data": {
    "type": "flow-values-report",
    "attributes": {
      "statistics": [
        "recipients",
        "deliveries",
        "open_rate",
        "click_rate",
        "revenue",
        "unsubscribes"
      ],
      "timeframe": {
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-02-01T00:00:00Z"
      },
      "filter": "equals(flow_id,\"FLOW_ID\")",
      "conversion_metric_id": "PLACED_ORDER_METRIC_ID"
    }
  }
}
```

```bash
curl -X POST 'https://a.klaviyo.com/api/flow-values-reports/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "flow-values-report",
      "attributes": {
        "statistics": ["recipients", "deliveries", "open_rate", "click_rate", "revenue"],
        "timeframe": {"start": "2024-01-01T00:00:00Z", "end": "2024-02-01T00:00:00Z"},
        "conversion_metric_id": "PLACED_ORDER_METRIC_ID"
      }
    }
  }'
```

**Response:** Same structure as campaign values report, with `flow_id`, `flow_name`, and `flow_message_id` in the `groupings` object.

---

## Form Values Reports

### POST /api/form-values-reports/

Get aggregate performance values for forms (popups, flyouts, embeds).

**Request Body:**

```json
{
  "data": {
    "type": "form-values-report",
    "attributes": {
      "statistics": ["submit_rate", "views", "submits", "unique_views", "unique_submits"],
      "timeframe": {
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-02-01T00:00:00Z"
      },
      "filter": "equals(form_id,\"FORM_ID\")"
    }
  }
}
```

**Form-specific statistics:**

| Statistic        | Description                   |
| ---------------- | ----------------------------- |
| `views`          | Total form views/impressions  |
| `unique_views`   | Unique form views             |
| `submits`        | Total form submissions        |
| `unique_submits` | Unique form submissions       |
| `submit_rate`    | Unique submits / unique views |

---

## Segment Values Reports

### POST /api/segment-values-reports/

Get aggregate metric values for profiles within a segment.

**Request Body:**

```json
{
  "data": {
    "type": "segment-values-report",
    "attributes": {
      "statistics": ["opens", "clicks", "revenue", "conversion_rate"],
      "timeframe": {
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-02-01T00:00:00Z"
      },
      "filter": "equals(segment_id,\"SEGMENT_ID\")",
      "conversion_metric_id": "PLACED_ORDER_METRIC_ID"
    }
  }
}
```

---

## Campaign Series Reports

### POST /api/campaign-series-reports/

Get time-series performance data for campaigns, broken down by interval.

**Request Body:**

```json
{
  "data": {
    "type": "campaign-series-report",
    "attributes": {
      "statistics": ["opens", "clicks", "revenue"],
      "timeframe": {
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-01-31T00:00:00Z"
      },
      "interval": "day",
      "filter": "equals(campaign_id,\"CAMPAIGN_ID\")",
      "conversion_metric_id": "PLACED_ORDER_METRIC_ID"
    }
  }
}
```

**Additional Attributes for Series Reports:**

| Attribute  | Type   | Required | Description                                      |
| ---------- | ------ | -------- | ------------------------------------------------ |
| `interval` | string | Yes      | Time granularity: `hour`, `day`, `week`, `month` |

```bash
curl -X POST 'https://a.klaviyo.com/api/campaign-series-reports/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "campaign-series-report",
      "attributes": {
        "statistics": ["opens", "clicks", "revenue"],
        "timeframe": {"start": "2024-01-01T00:00:00Z", "end": "2024-01-31T00:00:00Z"},
        "interval": "day",
        "conversion_metric_id": "PLACED_ORDER_METRIC_ID"
      }
    }
  }'
```

**Response:**

```json
{
  "data": {
    "type": "campaign-series-report",
    "attributes": {
      "results": [
        {
          "groupings": {
            "campaign_id": "CAMPAIGN_ID",
            "campaign_name": "January Newsletter"
          },
          "statistics": {
            "opens": {
              "2024-01-15T00:00:00Z": 3200,
              "2024-01-16T00:00:00Z": 1540,
              "2024-01-17T00:00:00Z": 680,
              "2024-01-18T00:00:00Z": 320,
              "2024-01-19T00:00:00Z": 200
            },
            "clicks": {
              "2024-01-15T00:00:00Z": 890,
              "2024-01-16T00:00:00Z": 320,
              "2024-01-17T00:00:00Z": 145,
              "2024-01-18T00:00:00Z": 78,
              "2024-01-19T00:00:00Z": 52
            },
            "revenue": {
              "2024-01-15T00:00:00Z": 6500.0,
              "2024-01-16T00:00:00Z": 3200.0,
              "2024-01-17T00:00:00Z": 1500.0,
              "2024-01-18T00:00:00Z": 750.0,
              "2024-01-19T00:00:00Z": 500.0
            }
          }
        }
      ]
    }
  }
}
```

---

## Flow Series Reports

### POST /api/flow-series-reports/

Get time-series performance data for flows.

**Request Body:**

```json
{
  "data": {
    "type": "flow-series-report",
    "attributes": {
      "statistics": ["deliveries", "opens", "clicks", "revenue"],
      "timeframe": {
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-01-31T00:00:00Z"
      },
      "interval": "week",
      "filter": "equals(flow_id,\"FLOW_ID\")",
      "conversion_metric_id": "PLACED_ORDER_METRIC_ID"
    }
  }
}
```

**Response:** Same structure as campaign series report, with `flow_id` and `flow_name` in groupings, and statistics as date-keyed objects.

---

## Form Series Reports

### POST /api/form-series-reports/

Get time-series performance data for forms.

**Request Body:**

```json
{
  "data": {
    "type": "form-series-report",
    "attributes": {
      "statistics": ["views", "submits", "submit_rate"],
      "timeframe": {
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-01-31T00:00:00Z"
      },
      "interval": "day",
      "filter": "equals(form_id,\"FORM_ID\")"
    }
  }
}
```

---

## Rate Limits

| Endpoint                                           | Limit                                |
| -------------------------------------------------- | ------------------------------------ |
| All values reports (campaign, flow, form, segment) | **225 requests/day per report type** |
| All series reports (campaign, flow, form)          | **225 requests/day per report type** |

These are daily limits, not per-second or per-minute burst limits. The 225/day limit applies independently to each of the 7 report types.

## Key Notes

- All reporting endpoints are **POST** (action mode) because they execute queries, but they do not create or modify data.
- The `timeframe` object requires both `start` and `end` in ISO 8601 format.
- The `filter` parameter narrows results to specific resources. Omit it to get data across all resources of that type.
- `conversion_metric_id` is required for conversion-based statistics (`conversion_rate`, `conversion_value`, `revenue`). Typically set to the "Placed Order" metric ID.
- Values reports return a single aggregate number per statistic. Series reports return values keyed by timestamp for the specified interval.
- Results are grouped by resource (campaign, flow, form, or segment). Each resource appears as a separate entry in the `results` array.
- The `groupings` object in the response contains the resource identifier and name for each result row.
- Series report `interval` options: `hour` (max 7 days), `day` (max 1 year), `week` (max 1 year), `month` (max 3 years).
- Due to the strict daily rate limit, batch your reporting needs and cache results for dashboards.
