# Klaviyo API: Flows

The Flows API manages automated messaging sequences triggered by events, list
membership, segment membership, date properties, or price drops. Flows contain actions
(emails, SMS, time delays, conditional splits) that execute automatically when triggered.

## Endpoints

| Method | Path                                                  | Description               | Rate Tier |
| ------ | ----------------------------------------------------- | ------------------------- | --------- |
| GET    | `/api/flows/`                                         | List flows                | L         |
| GET    | `/api/flows/{id}/`                                    | Get flow                  | M         |
| POST   | `/api/flows/`                                         | Create flow               | S         |
| PATCH  | `/api/flows/{id}/`                                    | Update flow               | M         |
| DELETE | `/api/flows/{id}/`                                    | Delete flow               | M         |
| GET    | `/api/flows/{id}/flow-actions/`                       | Get flow actions          | L         |
| GET    | `/api/flow-actions/{id}/`                             | Get flow action           | M         |
| PATCH  | `/api/flow-actions/{id}/`                             | Update flow action        | M         |
| GET    | `/api/flow-actions/{id}/flow-messages/`               | Get flow messages         | L         |
| GET    | `/api/flow-messages/{id}/`                            | Get flow message          | M         |
| PATCH  | `/api/flow-messages/{id}/`                            | Update flow message       | M         |
| GET    | `/api/flows/{id}/tags/`                               | Get flow tags             | L         |
| GET    | `/api/flows/{id}/relationships/flow-actions/`         | Get action relationships  | L         |
| GET    | `/api/flows/{id}/relationships/tags/`                 | Get tag relationships     | L         |
| GET    | `/api/flow-actions/{id}/relationships/flow-messages/` | Get message relationships | L         |
| GET    | `/api/flow-actions/{id}/relationships/flow/`          | Get parent flow           | L         |

## Flow Attributes

| Attribute      | Type   | Description                                |
| -------------- | ------ | ------------------------------------------ |
| `name`         | string | Display name of the flow                   |
| `status`       | string | `draft`, `manual`, or `live`               |
| `archived`     | bool   | Whether the flow is archived               |
| `trigger_type` | string | Type of trigger (read-only after creation) |
| `created`      | string | ISO 8601 creation datetime (read-only)     |
| `updated`      | string | ISO 8601 last updated datetime (read-only) |

### Flow Statuses

| Status   | Description                                            |
| -------- | ------------------------------------------------------ |
| `draft`  | Flow is inactive. No messages are sent.                |
| `manual` | Flow is paused. New triggers are queued but not sent.  |
| `live`   | Flow is fully active. Triggers fire and messages send. |

### Flow Trigger Types

| Type            | Description                                           |
| --------------- | ----------------------------------------------------- |
| `list`          | Triggered when a profile is added to a specific list  |
| `segment`       | Triggered when a profile enters a specific segment    |
| `metric`        | Triggered by an event/metric (e.g. Placed Order)      |
| `price_drop`    | Triggered when a viewed product's price drops         |
| `date_property` | Triggered by a date-based profile property (e.g. DOB) |

## Flow Action Attributes

| Attribute          | Type   | Description                                                            |
| ------------------ | ------ | ---------------------------------------------------------------------- |
| `action_type`      | string | `SEND_EMAIL`, `SEND_SMS`, `WEBHOOK`, `TIME_DELAY`, `CONDITIONAL_SPLIT` |
| `status`           | string | `draft`, `manual`, `live`                                              |
| `settings`         | object | Action-specific configuration                                          |
| `tracking_options` | object | UTM params (email actions only)                                        |

## Flow Message Attributes

| Attribute      | Type   | Description                                |
| -------------- | ------ | ------------------------------------------ |
| `name`         | string | Message name                               |
| `channel`      | string | `email` or `sms`                           |
| `subject`      | string | Email subject line                         |
| `from_email`   | string | Sender email address                       |
| `from_label`   | string | Sender display name                        |
| `preview_text` | string | Email preview text                         |
| `body`         | string | SMS body (SMS only)                        |
| `created`      | string | ISO 8601 creation datetime (read-only)     |
| `updated`      | string | ISO 8601 last updated datetime (read-only) |

---

## GET /api/flows/

List all flows with filtering.

### Request

```bash
curl -G "https://a.klaviyo.com/api/flows/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -d "fields[flow]=name,status,trigger_type,archived,created,updated" \
  -d "filter=equals(status,\"live\")" \
  -d "page[size]=50" \
  -d "sort=-created"
```

### Filter Examples

```
filter=equals(status,"live")
filter=equals(status,"draft")
filter=equals(trigger_type,"metric")
filter=equals(archived,false)
filter=and(equals(status,"live"),equals(archived,false))
```

### Response (200 OK)

```json
{
  "data": [
    {
      "type": "flow",
      "id": "FLOW_welcome01",
      "attributes": {
        "name": "Welcome Series",
        "status": "live",
        "trigger_type": "list",
        "archived": false,
        "created": "2024-02-01T10:00:00+00:00",
        "updated": "2024-10-15T08:30:00+00:00"
      },
      "relationships": {
        "flow-actions": {
          "links": {
            "related": "https://a.klaviyo.com/api/flows/FLOW_welcome01/flow-actions/"
          }
        },
        "tags": {
          "links": {
            "related": "https://a.klaviyo.com/api/flows/FLOW_welcome01/tags/"
          }
        }
      },
      "links": {
        "self": "https://a.klaviyo.com/api/flows/FLOW_welcome01/"
      }
    },
    {
      "type": "flow",
      "id": "FLOW_abandon01",
      "attributes": {
        "name": "Abandoned Cart",
        "status": "live",
        "trigger_type": "metric",
        "archived": false,
        "created": "2024-03-10T12:00:00+00:00",
        "updated": "2024-10-01T09:00:00+00:00"
      },
      "links": {
        "self": "https://a.klaviyo.com/api/flows/FLOW_abandon01/"
      }
    }
  ],
  "links": {
    "self": "https://a.klaviyo.com/api/flows/",
    "next": null,
    "prev": null
  }
}
```

---

## GET /api/flows/{id}/

Get a single flow with optional includes.

```bash
curl -G "https://a.klaviyo.com/api/flows/FLOW_welcome01/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -d "include=flow-actions" \
  -d "fields[flow-action]=action_type,status,settings"
```

---

## POST /api/flows/

Create a new flow. The flow is created in `draft` status by default.

### Create a List-Triggered Flow

```bash
curl -X POST "https://a.klaviyo.com/api/flows/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "flow",
      "attributes": {
        "name": "New Subscriber Welcome",
        "trigger_type": "list",
        "status": "draft"
      },
      "relationships": {
        "trigger-resource": {
          "data": {
            "type": "list",
            "id": "LIST_newsletter01"
          }
        }
      }
    }
  }'
```

### Create a Metric-Triggered Flow

```bash
curl -X POST "https://a.klaviyo.com/api/flows/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "flow",
      "attributes": {
        "name": "Post-Purchase Follow-Up",
        "trigger_type": "metric",
        "status": "draft"
      },
      "relationships": {
        "trigger-resource": {
          "data": {
            "type": "metric",
            "id": "METRIC_placed_order"
          }
        }
      }
    }
  }'
```

### Response (201 Created)

```json
{
  "data": {
    "type": "flow",
    "id": "FLOW_new_welcome02",
    "attributes": {
      "name": "New Subscriber Welcome",
      "status": "draft",
      "trigger_type": "list",
      "archived": false,
      "created": "2024-10-20T18:30:00+00:00",
      "updated": "2024-10-20T18:30:00+00:00"
    }
  }
}
```

---

## PATCH /api/flows/{id}/

Update a flow. Commonly used to change status (activate/deactivate) or rename.

### Activate a Flow (Set to Live)

```bash
curl -X PATCH "https://a.klaviyo.com/api/flows/FLOW_new_welcome02/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "flow",
      "id": "FLOW_new_welcome02",
      "attributes": {
        "status": "live"
      }
    }
  }'
```

### Pause a Flow (Set to Manual)

```bash
curl -X PATCH "https://a.klaviyo.com/api/flows/FLOW_new_welcome02/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "flow",
      "id": "FLOW_new_welcome02",
      "attributes": {
        "status": "manual"
      }
    }
  }'
```

### Set to Draft (Deactivate)

```bash
curl -X PATCH "https://a.klaviyo.com/api/flows/FLOW_new_welcome02/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "flow",
      "id": "FLOW_new_welcome02",
      "attributes": {
        "status": "draft"
      }
    }
  }'
```

---

## DELETE /api/flows/{id}/

Delete a flow permanently.

**Warning:** This is irreversible. Consider setting the flow to `draft` status instead.

```bash
curl -X DELETE "https://a.klaviyo.com/api/flows/FLOW_new_welcome02/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15"
```

### Response (204 No Content)

---

## GET /api/flows/{id}/flow-actions/

List all actions within a flow.

```bash
curl -G "https://a.klaviyo.com/api/flows/FLOW_welcome01/flow-actions/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -d "fields[flow-action]=action_type,status,settings"
```

### Response (200 OK)

```json
{
  "data": [
    {
      "type": "flow-action",
      "id": "ACTION_delay01",
      "attributes": {
        "action_type": "TIME_DELAY",
        "status": "live",
        "settings": {
          "delay": {
            "hours": 0,
            "minutes": 30
          }
        }
      }
    },
    {
      "type": "flow-action",
      "id": "ACTION_email01",
      "attributes": {
        "action_type": "SEND_EMAIL",
        "status": "live",
        "settings": {}
      }
    }
  ]
}
```

---

## PATCH /api/flow-actions/{id}/

Update a flow action's status or settings.

### Request

```bash
curl -X PATCH "https://a.klaviyo.com/api/flow-actions/ACTION_email01/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "flow-action",
      "id": "ACTION_email01",
      "attributes": {
        "status": "manual"
      }
    }
  }'
```

---

## GET /api/flow-actions/{id}/flow-messages/

Get messages associated with a flow action.

```bash
curl "https://a.klaviyo.com/api/flow-actions/ACTION_email01/flow-messages/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15"
```

---

## PATCH /api/flow-messages/{id}/

Update a flow message's content.

### Request

```bash
curl -X PATCH "https://a.klaviyo.com/api/flow-messages/FMSG_001/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "flow-message",
      "id": "FMSG_001",
      "attributes": {
        "subject": "Welcome!",
        "from_email": "hello@example.com",
        "from_label": "Your Brand Team",
        "preview_text": "Here is your 15% welcome discount."
      }
    }
  }'
```

---

## Usage Notes

- **Status hierarchy:** Individual flow actions can have a different status than the
  parent flow. A flow set to `live` only sends through actions also set to `live`.
  Actions set to `manual` or `draft` are skipped even if the flow is live.
- **Trigger types are immutable.** Once a flow is created with a trigger type, it
  cannot be changed. Create a new flow if you need a different trigger.
- **Flow building:** The API supports creating flows and updating actions/messages, but
  complex flow structures (branching, conditional splits) are best built in the
  Klaviyo UI and then managed via the API.
- **manual status** queues new triggers without sending. This is useful for testing or
  temporarily pausing a flow without losing queued recipients.
- **Archiving:** Set `archived: true` to hide a flow from the default list view without
  deleting it. Archived flows are inactive and do not trigger.
- **Include related resources:** Use `?include=flow-actions` when fetching a flow to
  reduce the number of API calls needed.
