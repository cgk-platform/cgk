# Klaviyo API: Campaigns

The Campaigns API manages email and SMS marketing campaigns. Campaigns can be created,
scheduled, sent, cloned, and monitored through the API. This covers the full campaign
lifecycle from draft to delivery.

## Endpoints

| Method | Path                                            | Description              | Rate Tier |
| ------ | ----------------------------------------------- | ------------------------ | --------- |
| GET    | `/api/campaigns/`                               | List campaigns           | L         |
| GET    | `/api/campaigns/{id}/`                          | Get campaign             | M         |
| POST   | `/api/campaigns/`                               | Create campaign          | S         |
| PATCH  | `/api/campaigns/{id}/`                          | Update campaign          | M         |
| DELETE | `/api/campaigns/{id}/`                          | Delete campaign          | M         |
| POST   | `/api/campaigns/{id}/clone/`                    | Clone campaign           | S         |
| GET    | `/api/campaigns/{id}/campaign-messages/`        | Get campaign messages    | L         |
| GET    | `/api/campaign-messages/{id}/`                  | Get campaign message     | M         |
| PATCH  | `/api/campaign-messages/{id}/`                  | Update campaign message  | M         |
| GET    | `/api/campaigns/{id}/tags/`                     | Get campaign tags        | L         |
| POST   | `/api/campaign-send-jobs/`                      | Send campaign            | XS        |
| GET    | `/api/campaign-send-jobs/{id}/`                 | Get send job status      | L         |
| POST   | `/api/campaign-recipient-estimation-jobs/`      | Estimate recipients      | XS        |
| GET    | `/api/campaign-recipient-estimation-jobs/{id}/` | Get estimation result    | L         |
| GET    | `/api/campaign-recipient-estimations/{id}/`     | Get recipient estimation | L         |

## Campaign Attributes

| Attribute            | Type   | Description                                           |
| -------------------- | ------ | ----------------------------------------------------- |
| `name`               | string | Internal campaign name                                |
| `status`             | string | `draft`, `scheduled`, `sent`, `cancelled` (read-only) |
| `archived`           | bool   | Whether the campaign is archived                      |
| `channel`            | string | `email` or `sms`                                      |
| `audiences`          | object | Target audience configuration                         |
| `audiences.included` | array  | List/segment IDs to include                           |
| `audiences.excluded` | array  | List/segment IDs to exclude                           |
| `send_strategy`      | object | How and when to send                                  |
| `tracking_options`   | object | UTM parameters and link tracking                      |
| `send_options`       | object | Options like use_smart_sending                        |
| `created_at`         | string | ISO 8601 creation datetime (read-only)                |
| `updated_at`         | string | ISO 8601 last updated datetime (read-only)            |
| `scheduled_at`       | string | ISO 8601 scheduled send time                          |
| `send_time`          | string | ISO 8601 actual send time (read-only)                 |

### send_strategy Types

| Type              | Description                               |
| ----------------- | ----------------------------------------- |
| `immediate`       | Send as soon as the send job is created   |
| `scheduled`       | Send at a specific datetime               |
| `smart_send_time` | Klaviyo optimizes send time per recipient |
| `throttled`       | Send gradually at a specified rate        |

### Campaign Message Attributes

| Attribute      | Type   | Description                 |
| -------------- | ------ | --------------------------- |
| `channel`      | string | `email` or `sms`            |
| `subject`      | string | Email subject line          |
| `from_email`   | string | Sender email address        |
| `from_label`   | string | Sender display name         |
| `preview_text` | string | Email preview text          |
| `body`         | string | SMS message body (SMS only) |
| `template`     | object | Template relationship       |

---

## GET /api/campaigns/

List campaigns with filtering by channel and status.

### Request

```bash
curl -G "https://a.klaviyo.com/api/campaigns/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -d "filter=and(equals(channel,\"email\"),equals(status,\"draft\"))" \
  -d "fields[campaign]=name,status,channel,audiences,send_strategy,created_at" \
  -d "page[size]=25" \
  -d "sort=-created_at"
```

### Filter Examples

```
filter=equals(channel,"email")
filter=equals(status,"sent")
filter=and(equals(channel,"sms"),equals(status,"draft"))
filter=greater-than(created_at,2024-06-01T00:00:00Z)
```

### Response (200 OK)

```json
{
  "data": [
    {
      "type": "campaign",
      "id": "CAMP_oct_promo01",
      "attributes": {
        "name": "October Featured Product Sale",
        "status": "draft",
        "channel": "email",
        "audiences": {
          "included": [{ "type": "list", "id": "LIST_newsletter01" }],
          "excluded": [{ "type": "segment", "id": "SEG_purchased_recently" }]
        },
        "send_strategy": {
          "method": "immediate"
        },
        "created_at": "2024-10-18T09:00:00+00:00"
      },
      "links": {
        "self": "https://a.klaviyo.com/api/campaigns/CAMP_oct_promo01/"
      }
    }
  ],
  "links": {
    "self": "https://a.klaviyo.com/api/campaigns/",
    "next": null,
    "prev": null
  }
}
```

---

## POST /api/campaigns/

Create a new campaign.

### Create Email Campaign

```bash
curl -X POST "https://a.klaviyo.com/api/campaigns/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "campaign",
      "attributes": {
        "name": "November Flash Sale",
        "channel": "email",
        "audiences": {
          "included": [
            { "type": "list", "id": "LIST_newsletter01" }
          ],
          "excluded": [
            { "type": "segment", "id": "SEG_unengaged90" }
          ]
        },
        "send_strategy": {
          "method": "scheduled",
          "options_scheduled": {
            "datetime": "2024-11-15T14:00:00+00:00",
            "is_local": false
          }
        },
        "send_options": {
          "use_smart_sending": true
        },
        "tracking_options": {
          "is_tracking_clicks": true,
          "is_tracking_opens": true,
          "utm_params": [
            { "name": "utm_source", "value": "klaviyo" },
            { "name": "utm_medium", "value": "email" },
            { "name": "utm_campaign", "value": "nov_flash_sale" }
          ]
        },
        "campaign-messages": {
          "data": [
            {
              "type": "campaign-message",
              "attributes": {
                "channel": "email",
                "subject": "Flash Sale: 30% Off Featured Products!",
                "from_email": "hello@example.com",
                "from_label": "CGK Linens",
                "preview_text": "Limited time offer on our best-selling products."
              },
              "relationships": {
                "template": {
                  "data": {
                    "type": "template",
                    "id": "TMPL_flash_sale01"
                  }
                }
              }
            }
          ]
        }
      }
    }
  }'
```

### Create SMS Campaign

```bash
curl -X POST "https://a.klaviyo.com/api/campaigns/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "campaign",
      "attributes": {
        "name": "SMS Flash Sale Alert",
        "channel": "sms",
        "audiences": {
          "included": [
            { "type": "list", "id": "LIST_sms_subscribers" }
          ],
          "excluded": []
        },
        "send_strategy": {
          "method": "immediate"
        },
        "campaign-messages": {
          "data": [
            {
              "type": "campaign-message",
              "attributes": {
                "channel": "sms",
                "body": "Your Brand: Flash sale! 30% off featured products for 24hrs. Shop: https://example.com/sale Reply STOP to opt out"
              }
            }
          ]
        }
      }
    }
  }'
```

### Response (201 Created)

```json
{
  "data": {
    "type": "campaign",
    "id": "CAMP_nov_flash01",
    "attributes": {
      "name": "November Flash Sale",
      "status": "draft",
      "channel": "email",
      "audiences": { ... },
      "send_strategy": { ... },
      "created_at": "2024-10-20T17:00:00+00:00",
      "updated_at": "2024-10-20T17:00:00+00:00"
    }
  }
}
```

---

## PATCH /api/campaigns/{id}/

Update a draft campaign. Only `draft` campaigns can be updated.

### Request

```bash
curl -X PATCH "https://a.klaviyo.com/api/campaigns/CAMP_nov_flash01/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "campaign",
      "id": "CAMP_nov_flash01",
      "attributes": {
        "name": "November Flash Sale - Updated",
        "send_strategy": {
          "method": "smart_send_time"
        }
      }
    }
  }'
```

---

## DELETE /api/campaigns/{id}/

Delete a campaign. Only `draft` campaigns can be deleted.

```bash
curl -X DELETE "https://a.klaviyo.com/api/campaigns/CAMP_nov_flash01/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15"
```

### Response (204 No Content)

---

## POST /api/campaigns/{id}/clone/

Clone an existing campaign. This creates a new draft copy.

### Request

```bash
curl -X POST "https://a.klaviyo.com/api/campaigns/CAMP_oct_promo01/clone/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "campaign",
      "id": "CAMP_oct_promo01",
      "attributes": {
        "name": "October Promo - Copy"
      }
    }
  }'
```

### Response (201 Created)

Returns the new campaign with a new ID and `status: "draft"`.

---

## PATCH /api/campaign-messages/{id}/

Update a campaign message (subject, from_email, template, etc.).

### Request

```bash
curl -X PATCH "https://a.klaviyo.com/api/campaign-messages/MSG_001/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "campaign-message",
      "id": "MSG_001",
      "attributes": {
        "subject": "Last Chance: Flash Sale Ends Tonight!",
        "preview_text": "Don'\''t miss 30% off our featured products."
      }
    }
  }'
```

---

## POST /api/campaign-send-jobs/

**Send a campaign.** This is an action endpoint that triggers actual delivery.

**IMPORTANT:** This endpoint sends the campaign to real recipients. Ensure the campaign
is fully configured and reviewed before calling this endpoint. There is no undo once a
send job has started.

### Request

```bash
curl -X POST "https://a.klaviyo.com/api/campaign-send-jobs/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "campaign-send-job",
      "attributes": {},
      "relationships": {
        "campaign": {
          "data": {
            "type": "campaign",
            "id": "CAMP_nov_flash01"
          }
        }
      }
    }
  }'
```

### Response (202 Accepted)

```json
{
  "data": {
    "type": "campaign-send-job",
    "id": "SEND_JOB_001",
    "attributes": {
      "status": "queued",
      "created_at": "2024-10-20T18:00:00+00:00"
    }
  }
}
```

### Check Send Status

```bash
curl "https://a.klaviyo.com/api/campaign-send-jobs/SEND_JOB_001/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15"
```

Status values: `queued`, `processing`, `complete`, `cancelled`.

---

## POST /api/campaign-recipient-estimation-jobs/

Estimate how many recipients a campaign will reach before sending.

### Request

```bash
curl -X POST "https://a.klaviyo.com/api/campaign-recipient-estimation-jobs/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "campaign-recipient-estimation-job",
      "relationships": {
        "campaign": {
          "data": {
            "type": "campaign",
            "id": "CAMP_nov_flash01"
          }
        }
      }
    }
  }'
```

### Response (202 Accepted)

```json
{
  "data": {
    "type": "campaign-recipient-estimation-job",
    "id": "EST_JOB_001",
    "attributes": {
      "status": "queued"
    }
  }
}
```

### Get Estimation Result

```bash
curl "https://a.klaviyo.com/api/campaign-recipient-estimation-jobs/EST_JOB_001/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15"
```

When status is `complete`, the estimated_recipient_count is available in the response.

---

## Usage Notes

- **Status lifecycle:** Campaigns progress from `draft` -> `scheduled` -> `sent`. Only
  `draft` campaigns can be updated or deleted.
- **send_strategy options:** Use `immediate` for instant sends, `scheduled` with a
  specific datetime, or `smart_send_time` to let Klaviyo optimize per recipient.
- **Smart sending:** When `use_smart_sending` is `true`, Klaviyo skips recipients who
  received a message recently (configurable in account settings).
- **Campaign messages** are child resources of a campaign. Each campaign has one message
  for the given channel. Update messages through the `/api/campaign-messages/{id}/`
  endpoint.
- **Recipient estimation** is asynchronous. Poll the job status until `complete` to get
  the estimated count. Use this before send to verify audience size.
- **Cancellation:** Scheduled campaigns can be cancelled by updating the send_strategy
  or by contacting support. There is no explicit cancel endpoint.
- **Sorting:** Use `sort=-created_at` for newest first, `sort=created_at` for oldest.
