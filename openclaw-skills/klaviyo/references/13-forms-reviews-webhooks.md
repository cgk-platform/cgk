# Klaviyo API Reference: Forms, Reviews, Webhooks, and Tracking Settings

Manage forms (read-only), reviews (read-only), webhooks (full CRUD), and tracking settings. Forms and reviews data is created in the Klaviyo UI or via integrations; the API provides read access. Webhooks let you receive real-time notifications when events occur in Klaviyo.

**API Revision:** `2024-10-15`

---

## Forms (Read-Only)

Forms (popups, flyouts, embedded forms, full-page) are created and edited in the Klaviyo UI. The API provides read-only access for listing, retrieving, and inspecting form versions.

### GET /api/forms/

List all forms in the account.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `fields[form]` | string | `name`, `status`, `form_type`, `created`, `updated` |
| `filter` | string | Filter by `name`, `status` (`live`, `draft`, `disabled`), `form_type` |
| `page[cursor]` | string | Cursor for pagination |
| `sort` | string | `name`, `-name`, `created`, `-created` |

```bash
curl -G 'https://a.klaviyo.com/api/forms/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --data-urlencode 'filter=equals(status,"live")'
```

**Response:**

```json
{
  "data": [
    {
      "type": "form",
      "id": "FORM_ID",
      "attributes": {
        "name": "Welcome Popup - 15% Off",
        "status": "live",
        "form_type": "popup",
        "created": "2024-01-01T00:00:00Z",
        "updated": "2024-01-15T00:00:00Z"
      },
      "relationships": {
        "form-versions": {
          "links": {
            "self": "https://a.klaviyo.com/api/forms/FORM_ID/relationships/form-versions/",
            "related": "https://a.klaviyo.com/api/forms/FORM_ID/form-versions/"
          }
        }
      },
      "links": { "self": "https://a.klaviyo.com/api/forms/FORM_ID/" }
    }
  ],
  "links": { "self": "https://a.klaviyo.com/api/forms/" }
}
```

**Form types:** `popup`, `flyout`, `embed`, `full_page`

**Form statuses:** `live`, `draft`, `disabled`

---

### GET /api/forms/{id}/

Retrieve a single form.

```bash
curl 'https://a.klaviyo.com/api/forms/FORM_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

---

### GET /api/forms/{id}/form-versions/

List all versions of a form.

```bash
curl -G 'https://a.klaviyo.com/api/forms/FORM_ID/form-versions/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

**Response:**

```json
{
  "data": [
    {
      "type": "form-version",
      "id": "FORM_VERSION_ID",
      "attributes": {
        "name": "Version 3 - Updated CTA",
        "status": "live",
        "form_type": "popup",
        "created": "2024-01-10T00:00:00Z",
        "updated": "2024-01-15T00:00:00Z"
      },
      "relationships": {
        "form": {
          "data": { "type": "form", "id": "FORM_ID" }
        }
      },
      "links": { "self": "https://a.klaviyo.com/api/form-versions/FORM_VERSION_ID/" }
    }
  ]
}
```

---

### GET /api/form-versions/{id}/

Retrieve a single form version.

```bash
curl 'https://a.klaviyo.com/api/form-versions/FORM_VERSION_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

---

### GET /api/forms/{id}/relationships/form-versions/

Get form-version relationship identifiers for a form.

```bash
curl 'https://a.klaviyo.com/api/forms/FORM_ID/relationships/form-versions/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

**Response:**

```json
{
  "data": [
    { "type": "form-version", "id": "FORM_VERSION_ID_1" },
    { "type": "form-version", "id": "FORM_VERSION_ID_2" }
  ]
}
```

---

## Reviews (Read-Only)

Product reviews collected via Klaviyo Reviews or integrated review platforms. The API provides read-only access.

### GET /api/reviews/

List all reviews.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `fields[review]` | string | `title`, `body`, `rating`, `author`, `status`, `product_external_id`, `created`, `updated` |
| `filter` | string | Filter by `rating`, `status` (`published`, `unpublished`), `product_external_id` |
| `page[cursor]` | string | Cursor for pagination |
| `sort` | string | `rating`, `-rating`, `created`, `-created` |

```bash
curl -G 'https://a.klaviyo.com/api/reviews/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --data-urlencode 'filter=equals(status,"published")' \
  --data-urlencode 'filter=greater-or-equal(rating,4)' \
  --data-urlencode 'sort=-created'
```

**Response:**

```json
{
  "data": [
    {
      "type": "review",
      "id": "REVIEW_ID",
      "attributes": {
        "title": "Amazing product!",
        "body": "Best quality I have tried. Exceeded expectations in every way.",
        "rating": 5,
        "author": "Jane D.",
        "status": "published",
        "product_external_id": "SKU-001",
        "created": "2024-01-10T14:30:00Z",
        "updated": "2024-01-10T14:30:00Z"
      },
      "links": { "self": "https://a.klaviyo.com/api/reviews/REVIEW_ID/" }
    }
  ],
  "links": { "self": "https://a.klaviyo.com/api/reviews/" }
}
```

---

### GET /api/reviews/{id}/

Retrieve a single review.

```bash
curl 'https://a.klaviyo.com/api/reviews/REVIEW_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

---

## Webhooks

Receive real-time HTTP notifications when events occur in Klaviyo. Webhooks support full CRUD operations.

### GET /api/webhooks/

List all configured webhooks.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `fields[webhook]` | string | `endpoint_url`, `name`, `description`, `enabled`, `created_at`, `updated_at` |

```bash
curl -G 'https://a.klaviyo.com/api/webhooks/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

**Response:**

```json
{
  "data": [
    {
      "type": "webhook",
      "id": "WEBHOOK_ID",
      "attributes": {
        "name": "Order Event Webhook",
        "description": "Sends Placed Order events to our fulfillment system",
        "endpoint_url": "https://api.example.com/webhooks/klaviyo",
        "enabled": true,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-15T00:00:00Z"
      },
      "relationships": {
        "webhook-topics": {
          "data": [
            { "type": "webhook-topic", "id": "TOPIC_ID_1" },
            { "type": "webhook-topic", "id": "TOPIC_ID_2" }
          ]
        }
      },
      "links": { "self": "https://a.klaviyo.com/api/webhooks/WEBHOOK_ID/" }
    }
  ],
  "links": { "self": "https://a.klaviyo.com/api/webhooks/" }
}
```

---

### GET /api/webhooks/{id}/

Retrieve a single webhook.

```bash
curl 'https://a.klaviyo.com/api/webhooks/WEBHOOK_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

---

### POST /api/webhooks/

Create a webhook subscription.

**Request Body:**

```json
{
  "data": {
    "type": "webhook",
    "attributes": {
      "name": "Profile & Order Events",
      "description": "Webhook for tracking profile updates and order events",
      "endpoint_url": "https://api.example.com/webhooks/klaviyo",
      "enabled": true
    },
    "relationships": {
      "webhook-topics": {
        "data": [
          { "type": "webhook-topic", "id": "profile.created" },
          { "type": "webhook-topic", "id": "profile.updated" },
          { "type": "webhook-topic", "id": "event.created" },
          { "type": "webhook-topic", "id": "campaign.sent" },
          { "type": "webhook-topic", "id": "flow.message.sent" }
        ]
      }
    }
  }
}
```

```bash
curl -X POST 'https://a.klaviyo.com/api/webhooks/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "webhook",
      "attributes": {
        "name": "Profile & Order Events",
        "description": "Webhook for tracking profile updates and order events",
        "endpoint_url": "https://api.example.com/webhooks/klaviyo",
        "enabled": true
      },
      "relationships": {
        "webhook-topics": {
          "data": [
            {"type": "webhook-topic", "id": "profile.created"},
            {"type": "webhook-topic", "id": "profile.updated"},
            {"type": "webhook-topic", "id": "event.created"}
          ]
        }
      }
    }
  }'
```

**Required Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `endpoint_url` | string | The HTTPS URL to receive webhook payloads |
| `name` | string | Display name for the webhook |

**Optional Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `description` | string | Human-readable description |
| `enabled` | boolean | Whether the webhook is active (default `true`) |

---

### PATCH /api/webhooks/{id}/

Update a webhook (change URL, name, enabled status, or topics).

**Request Body:**

```json
{
  "data": {
    "type": "webhook",
    "id": "WEBHOOK_ID",
    "attributes": {
      "enabled": false,
      "description": "Temporarily disabled for maintenance"
    }
  }
}
```

---

### DELETE /api/webhooks/{id}/

Delete a webhook. Returns `204 No Content`.

```bash
curl -X DELETE 'https://a.klaviyo.com/api/webhooks/WEBHOOK_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

---

### GET /api/webhook-topics/

List all available webhook topics (event types) you can subscribe to.

```bash
curl -G 'https://a.klaviyo.com/api/webhook-topics/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

**Common Webhook Topics:**

| Topic ID                  | Description                  |
| ------------------------- | ---------------------------- |
| `profile.created`         | New profile created          |
| `profile.updated`         | Profile properties updated   |
| `profile.merged`          | Two profiles merged          |
| `event.created`           | Any tracked event occurs     |
| `campaign.sent`           | Campaign message sent        |
| `campaign.opened`         | Campaign email opened        |
| `campaign.clicked`        | Campaign link clicked        |
| `campaign.bounced`        | Campaign email bounced       |
| `campaign.unsubscribed`   | Unsubscribe from campaign    |
| `campaign.marked_as_spam` | Marked as spam from campaign |
| `flow.message.sent`       | Flow message sent            |
| `flow.message.opened`     | Flow email opened            |
| `flow.message.clicked`    | Flow link clicked            |
| `flow.message.bounced`    | Flow email bounced           |
| `list.created`            | New list created             |
| `list.updated`            | List updated                 |
| `list.deleted`            | List deleted                 |
| `segment.created`         | New segment created          |
| `segment.updated`         | Segment updated              |
| `segment.deleted`         | Segment deleted              |

---

## Tracking Settings

Configure global UTM tracking and custom tracking parameters for links in emails.

### GET /api/tracking-settings/

Get current tracking settings for the account.

```bash
curl -G 'https://a.klaviyo.com/api/tracking-settings/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

**Response:**

```json
{
  "data": [
    {
      "type": "tracking-setting",
      "id": "TRACKING_SETTING_ID",
      "attributes": {
        "auto_add_utm": true,
        "utm_source": "klaviyo",
        "utm_medium": "email",
        "custom_tracking_params": [
          {
            "name": "utm_campaign",
            "value": "{{campaign.name}}"
          },
          {
            "name": "ref",
            "value": "email_marketing"
          }
        ],
        "created": "2023-01-01T00:00:00Z",
        "updated": "2024-01-15T00:00:00Z"
      },
      "links": { "self": "https://a.klaviyo.com/api/tracking-settings/TRACKING_SETTING_ID/" }
    }
  ]
}
```

---

### PATCH /api/tracking-settings/{id}/

Update tracking settings.

**Request Body:**

```json
{
  "data": {
    "type": "tracking-setting",
    "id": "TRACKING_SETTING_ID",
    "attributes": {
      "auto_add_utm": true,
      "custom_tracking_params": [
        {
          "name": "utm_campaign",
          "value": "{{campaign.name}}"
        },
        {
          "name": "utm_content",
          "value": "{{message.name}}"
        },
        {
          "name": "ref",
          "value": "klaviyo_email"
        }
      ]
    }
  }
}
```

```bash
curl -X PATCH 'https://a.klaviyo.com/api/tracking-settings/TRACKING_SETTING_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "tracking-setting",
      "id": "TRACKING_SETTING_ID",
      "attributes": {
        "auto_add_utm": true,
        "custom_tracking_params": [
          {"name": "utm_campaign", "value": "{{campaign.name}}"},
          {"name": "ref", "value": "klaviyo_email"}
        ]
      }
    }
  }'
```

**Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `auto_add_utm` | boolean | Automatically add UTM parameters to all links |
| `custom_tracking_params` | array | Custom key-value pairs to append to URLs. Supports Klaviyo template variables. |

---

## Rate Limits

| Endpoint Pattern               | Burst | Steady |
| ------------------------------ | ----- | ------ |
| GET forms/form-versions        | 10/s  | 150/m  |
| GET reviews                    | 10/s  | 150/m  |
| GET/POST/PATCH/DELETE webhooks | 10/s  | 150/m  |
| GET webhook-topics             | 10/s  | 150/m  |
| GET/PATCH tracking-settings    | 10/s  | 150/m  |

## Key Notes

- **Forms are read-only** via the API. Create and edit forms in the Klaviyo UI.
- **Reviews are read-only** via the API. They are collected via Klaviyo Reviews or third-party integrations.
- Webhook `endpoint_url` must use HTTPS. Klaviyo will retry failed deliveries with exponential backoff.
- Webhook payloads include a `X-Klaviyo-Webhook-Signature` header for verifying authenticity. Validate this signature using your webhook secret.
- When creating webhooks, subscribe only to the topics you need to minimize unnecessary traffic.
- Tracking settings apply globally to all campaigns and flows. Changes take effect on future sends only.
- The `custom_tracking_params` support Klaviyo template variables like `{{campaign.name}}` and `{{message.name}}` for dynamic values.
- All GET endpoints are read-only. POST, PATCH, DELETE on webhooks and PATCH on tracking-settings are action endpoints.
