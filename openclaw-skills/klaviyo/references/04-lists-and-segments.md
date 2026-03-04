# Klaviyo API: Lists and Segments

Lists are manually curated collections of profiles (e.g., newsletter subscribers).
Segments are dynamically computed groups based on conditions (e.g., "purchased in the
last 30 days"). Both are used for campaign targeting and flow triggers.

## List Endpoints

| Method | Path                                      | Description               | Rate Tier |
| ------ | ----------------------------------------- | ------------------------- | --------- |
| GET    | `/api/lists/`                             | List all lists            | L         |
| GET    | `/api/lists/{id}/`                        | Get list                  | M         |
| POST   | `/api/lists/`                             | Create list               | S         |
| PATCH  | `/api/lists/{id}/`                        | Update list               | M         |
| DELETE | `/api/lists/{id}/`                        | Delete list               | M         |
| GET    | `/api/lists/{id}/profiles/`               | Get list profiles         | L         |
| GET    | `/api/lists/{id}/tags/`                   | Get list tags             | L         |
| GET    | `/api/lists/{id}/flow-triggers/`          | Get list flow triggers    | L         |
| GET    | `/api/lists/{id}/relationships/profiles/` | Get profile relationships | L         |
| GET    | `/api/lists/{id}/relationships/tags/`     | Get tag relationships     | L         |
| POST   | `/api/lists/{id}/relationships/profiles/` | Add profiles to list      | S         |
| DELETE | `/api/lists/{id}/relationships/profiles/` | Remove profiles from list | S         |

## Segment Endpoints

| Method | Path                                         | Description               | Rate Tier |
| ------ | -------------------------------------------- | ------------------------- | --------- |
| GET    | `/api/segments/`                             | List all segments         | L         |
| GET    | `/api/segments/{id}/`                        | Get segment               | M         |
| PATCH  | `/api/segments/{id}/`                        | Update segment            | M         |
| DELETE | `/api/segments/{id}/`                        | Delete segment            | M         |
| GET    | `/api/segments/{id}/profiles/`               | Get segment profiles      | L         |
| GET    | `/api/segments/{id}/tags/`                   | Get segment tags          | L         |
| GET    | `/api/segments/{id}/flow-triggers/`          | Get segment flow triggers | L         |
| GET    | `/api/segments/{id}/relationships/profiles/` | Get profile relationships | L         |
| GET    | `/api/segments/{id}/relationships/tags/`     | Get tag relationships     | L         |

## List Attributes

| Attribute        | Type    | Description                                                |
| ---------------- | ------- | ---------------------------------------------------------- |
| `name`           | string  | Display name of the list                                   |
| `opt_in_process` | string  | `single_opt_in` or `double_opt_in`                         |
| `created`        | string  | ISO 8601 creation datetime (read-only)                     |
| `updated`        | string  | ISO 8601 last updated datetime (read-only)                 |
| `profile_count`  | integer | Number of profiles in the list (read-only, may be delayed) |

## Segment Attributes

| Attribute       | Type    | Description                                      |
| --------------- | ------- | ------------------------------------------------ |
| `name`          | string  | Display name of the segment                      |
| `definition`    | object  | Segment condition definition (read-only via API) |
| `is_active`     | boolean | Whether the segment is actively computed         |
| `is_starred`    | boolean | Whether the segment is starred in the UI         |
| `created`       | string  | ISO 8601 creation datetime (read-only)           |
| `updated`       | string  | ISO 8601 last updated datetime (read-only)       |
| `profile_count` | integer | Number of profiles in the segment (read-only)    |

---

## GET /api/lists/

List all lists with optional filtering and pagination.

### Request

```bash
curl -G "https://a.klaviyo.com/api/lists/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -d "fields[list]=name,opt_in_process,created,profile_count" \
  -d "page[size]=50"
```

### Filter Examples

```
filter=equals(name,"Newsletter Subscribers")
filter=greater-than(created,2024-01-01T00:00:00Z)
```

### Response (200 OK)

```json
{
  "data": [
    {
      "type": "list",
      "id": "LIST_newsletter01",
      "attributes": {
        "name": "Newsletter Subscribers",
        "opt_in_process": "single_opt_in",
        "created": "2024-01-15T10:00:00+00:00",
        "profile_count": 24530
      },
      "links": {
        "self": "https://a.klaviyo.com/api/lists/LIST_newsletter01/"
      }
    },
    {
      "type": "list",
      "id": "LIST_vip02",
      "attributes": {
        "name": "VIP Customers",
        "opt_in_process": "single_opt_in",
        "created": "2024-03-20T08:30:00+00:00",
        "profile_count": 1250
      },
      "links": {
        "self": "https://a.klaviyo.com/api/lists/LIST_vip02/"
      }
    }
  ],
  "links": {
    "self": "https://a.klaviyo.com/api/lists/",
    "next": null,
    "prev": null
  }
}
```

---

## POST /api/lists/

Create a new list.

### Request

```bash
curl -X POST "https://a.klaviyo.com/api/lists/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "list",
      "attributes": {
        "name": "Product Launch Waitlist",
        "opt_in_process": "double_opt_in"
      }
    }
  }'
```

### Response (201 Created)

```json
{
  "data": {
    "type": "list",
    "id": "LIST_waitlist03",
    "attributes": {
      "name": "Product Launch Waitlist",
      "opt_in_process": "double_opt_in",
      "created": "2024-10-20T16:00:00+00:00",
      "updated": "2024-10-20T16:00:00+00:00",
      "profile_count": 0
    },
    "links": {
      "self": "https://a.klaviyo.com/api/lists/LIST_waitlist03/"
    }
  }
}
```

---

## PATCH /api/lists/{id}/

Update an existing list's name or opt-in process.

### Request

```bash
curl -X PATCH "https://a.klaviyo.com/api/lists/LIST_waitlist03/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "list",
      "id": "LIST_waitlist03",
      "attributes": {
        "name": "Greens Powder Waitlist"
      }
    }
  }'
```

---

## DELETE /api/lists/{id}/

Delete a list. This does **not** delete the profiles in the list.

**Warning:** Check `/api/lists/{id}/flow-triggers/` before deleting. If a flow uses this
list as a trigger, deleting the list will break that flow.

```bash
curl -X DELETE "https://a.klaviyo.com/api/lists/LIST_waitlist03/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15"
```

### Response (204 No Content)

No response body.

---

## POST /api/lists/{id}/relationships/profiles/

Add one or more profiles to a list. Profiles must already exist in Klaviyo.

### Request

```bash
curl -X POST "https://a.klaviyo.com/api/lists/LIST_newsletter01/relationships/profiles/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": [
      { "type": "profile", "id": "01HX1ABC" },
      { "type": "profile", "id": "01HX2DEF" },
      { "type": "profile", "id": "01HX3GHI" }
    ]
  }'
```

### Response (204 No Content)

No response body. Profiles are added idempotently (re-adding existing members is safe).

---

## DELETE /api/lists/{id}/relationships/profiles/

Remove profiles from a list. This does not delete the profiles themselves.

### Request

```bash
curl -X DELETE "https://a.klaviyo.com/api/lists/LIST_newsletter01/relationships/profiles/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": [
      { "type": "profile", "id": "01HX3GHI" }
    ]
  }'
```

### Response (204 No Content)

---

## GET /api/lists/{id}/profiles/

Retrieve all profiles belonging to a list with pagination.

```bash
curl -G "https://a.klaviyo.com/api/lists/LIST_newsletter01/profiles/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -d "fields[profile]=email,first_name,last_name" \
  -d "page[size]=100"
```

---

## GET /api/segments/

List all segments.

### Request

```bash
curl -G "https://a.klaviyo.com/api/segments/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -d "fields[segment]=name,is_active,profile_count,created"
```

### Response (200 OK)

```json
{
  "data": [
    {
      "type": "segment",
      "id": "SEG_active01",
      "attributes": {
        "name": "Active Subscribers (30 days)",
        "is_active": true,
        "profile_count": 8420,
        "created": "2024-02-10T12:00:00+00:00"
      },
      "links": {
        "self": "https://a.klaviyo.com/api/segments/SEG_active01/"
      }
    }
  ],
  "links": {
    "self": "https://a.klaviyo.com/api/segments/",
    "next": null,
    "prev": null
  }
}
```

---

## PATCH /api/segments/{id}/

Update a segment's name or starred status. Segment definitions (conditions) cannot
be modified through the API.

### Request

```bash
curl -X PATCH "https://a.klaviyo.com/api/segments/SEG_active01/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "segment",
      "id": "SEG_active01",
      "attributes": {
        "name": "Engaged Subscribers (30d)",
        "is_starred": true
      }
    }
  }'
```

---

## DELETE /api/segments/{id}/

Delete a segment. This does not delete the profiles.

**Warning:** Always check `/api/segments/{id}/flow-triggers/` before deleting. If a flow
uses this segment as a trigger, deleting the segment will break the flow.

### Check Flow Triggers First

```bash
curl "https://a.klaviyo.com/api/segments/SEG_active01/flow-triggers/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15"
```

If the response `data` array is non-empty, the segment is used as a flow trigger.

### Delete Segment

```bash
curl -X DELETE "https://a.klaviyo.com/api/segments/SEG_active01/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15"
```

### Response (204 No Content)

---

## GET /api/segments/{id}/profiles/

Retrieve all profiles in a segment, with pagination and sparse fieldsets.

```bash
curl -G "https://a.klaviyo.com/api/segments/SEG_active01/profiles/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -d "fields[profile]=email,first_name,properties" \
  -d "page[size]=100"
```

---

## Usage Notes

- **Lists vs Segments:** Lists are static membership (add/remove manually). Segments
  are dynamic (membership computed from conditions). You cannot add profiles to a
  segment via the API.
- **Segment definitions:** Segment conditions are read-only via the API. Create and
  edit segment conditions in the Klaviyo UI.
- **opt_in_process:** `single_opt_in` adds profiles immediately. `double_opt_in`
  requires the subscriber to confirm via a confirmation email.
- **Flow trigger safety:** Before deleting a list or segment, always check the
  `/flow-triggers/` sub-endpoint to avoid breaking active flows.
- **Profile count:** The `profile_count` attribute may be slightly delayed (cached).
  For exact counts, paginate through the profiles sub-endpoint.
- **Adding profiles to lists** is idempotent. Re-adding a profile that is already a
  member has no effect and does not return an error.
