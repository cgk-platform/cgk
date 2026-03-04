# Klaviyo API: Authentication and Overview

The Klaviyo API follows the JSON:API specification and provides programmatic access to
accounts, profiles, lists, segments, campaigns, flows, templates, and more.

## Base URL

All API requests are made to:

```
https://a.klaviyo.com/api/
```

## Authentication

Every request must include a private API key in the `Authorization` header using the
`Klaviyo-API-Key` scheme.

```
Authorization: Klaviyo-API-Key pk_abc123def456
```

**Private keys** (`pk_` prefix) are used for server-side requests and grant full API
access. Never expose private keys in client-side code.

**Public keys** (6-character site ID, e.g. `AbCdEf`) are used only for client-side
JavaScript SDK calls (identify, track) and have extremely limited scope.

## Required Revision Header

Every request must include the `revision` header specifying the API version date:

```
revision: 2024-10-15
```

Omitting this header returns a `400` error. Klaviyo releases new revisions periodically;
pin your integration to a specific revision for stability.

## Content-Type

- **Read requests** (GET): No Content-Type required.
- **Write requests** (POST, PATCH, DELETE with body): Must use:

```
Content-Type: application/vnd.api+json
```

Using `application/json` on write endpoints returns a `415 Unsupported Media Type` error.

## JSON:API Structure

All request and response bodies follow the JSON:API specification.

### Response Structure

```json
{
  "data": {
    "type": "profile",
    "id": "01ABCDEF",
    "attributes": {
      "email": "user@example.com",
      "first_name": "Jane"
    },
    "relationships": {
      "lists": {
        "links": {
          "self": "https://a.klaviyo.com/api/profiles/01ABCDEF/relationships/lists/",
          "related": "https://a.klaviyo.com/api/profiles/01ABCDEF/lists/"
        }
      }
    },
    "links": {
      "self": "https://a.klaviyo.com/api/profiles/01ABCDEF/"
    }
  }
}
```

### Collection Response

```json
{
  "data": [
    { "type": "profile", "id": "01ABCDEF", "attributes": { ... } },
    { "type": "profile", "id": "02GHIJKL", "attributes": { ... } }
  ],
  "links": {
    "self": "https://a.klaviyo.com/api/profiles/",
    "next": "https://a.klaviyo.com/api/profiles/?page%5Bcursor%5D=aBcDeFgH",
    "prev": null
  }
}
```

### Write Request Body

```json
{
  "data": {
    "type": "profile",
    "attributes": {
      "email": "new@example.com",
      "first_name": "Jane"
    }
  }
}
```

For PATCH requests, include the `id` field inside `data`.

## Cursor-Based Pagination

List endpoints return paginated results. Control pagination with:

| Parameter      | Description                          | Default |
| -------------- | ------------------------------------ | ------- |
| `page[size]`   | Number of results per page (max 100) | 20      |
| `page[cursor]` | Opaque cursor from `links.next`      | —       |

Follow `links.next` to retrieve subsequent pages. When `links.next` is `null`, you have
reached the last page.

```bash
# First page
curl -G "https://a.klaviyo.com/api/profiles/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123" \
  -H "revision: 2024-10-15" \
  -d "page[size]=50"

# Next page (use the full URL from links.next)
curl "https://a.klaviyo.com/api/profiles/?page%5Bcursor%5D=aBcDeFgH&page%5Bsize%5D=50" \
  -H "Authorization: Klaviyo-API-Key pk_abc123" \
  -H "revision: 2024-10-15"
```

## Filtering

List endpoints support a `filter` query parameter with the following operators:

| Operator         | Example                                                       |
| ---------------- | ------------------------------------------------------------- |
| `equals()`       | `filter=equals(email,"user@example.com")`                     |
| `contains()`     | `filter=contains(email,"example")`                            |
| `greater-than()` | `filter=greater-than(created,2024-01-01T00:00:00Z)`           |
| `less-than()`    | `filter=less-than(created,2024-06-01T00:00:00Z)`              |
| `any()`          | `filter=any(email,["a@b.com","c@d.com"])`                     |
| `has()`          | `filter=has(properties,"vip_tier")`                           |
| `and()`          | `filter=and(equals(first_name,"Jane"),has(properties,"vip"))` |

Filters are passed as a single string value on the `filter` query parameter.

## Sparse Fieldsets

Reduce response payload by requesting only specific fields:

```
GET /api/profiles/?fields[profile]=email,first_name
```

Multiple types can be specified when using `include`:

```
GET /api/profiles/?include=lists&fields[profile]=email&fields[list]=name
```

## Including Related Resources

Sideload related resources in a single request using the `include` parameter:

```
GET /api/profiles/{id}/?include=lists,segments
```

Included resources appear in a top-level `included` array:

```json
{
  "data": { "type": "profile", "id": "01ABCDEF", ... },
  "included": [
    { "type": "list", "id": "LIST01", "attributes": { "name": "Newsletter" } }
  ]
}
```

## Rate Limits

Klaviyo enforces rate limits per API key using a token-bucket model with burst and
steady-state rates. Limits vary by endpoint tier:

| Tier | Burst (requests) | Steady (requests/sec) | Typical Endpoints                       |
| ---- | ---------------- | --------------------- | --------------------------------------- |
| XS   | 1                | 1/15s                 | Campaign send, bulk jobs                |
| S    | 10               | 3/s                   | Create/update single resources          |
| M    | 10               | 10/s                  | Single-resource GET, updates            |
| L    | 100              | 75/s                  | List GETs, relationship reads           |
| XL   | 700              | 700/s                 | Client-side track/identify (public key) |

When rate-limited, the API returns `429 Too Many Requests` with a `Retry-After` header
(in seconds). Always implement exponential backoff.

Response headers on every request:

```
X-RateLimit-Limit: 75
X-RateLimit-Remaining: 74
X-RateLimit-Reset: 1700000000
```

## Error Format

Errors follow the JSON:API errors specification:

```json
{
  "errors": [
    {
      "id": "unique-error-id",
      "status": 400,
      "code": "invalid",
      "title": "Invalid field",
      "detail": "The 'email' field is not a valid email address.",
      "source": {
        "pointer": "/data/attributes/email"
      },
      "meta": {}
    }
  ]
}
```

Common HTTP status codes:

| Status | Meaning                                        |
| ------ | ---------------------------------------------- |
| 200    | Success (GET, PATCH)                           |
| 201    | Created (POST)                                 |
| 202    | Accepted (async job queued)                    |
| 204    | No Content (DELETE, relationship updates)      |
| 400    | Bad Request (malformed body, missing revision) |
| 401    | Unauthorized (missing or invalid API key)      |
| 403    | Forbidden (key lacks permission)               |
| 404    | Not Found                                      |
| 409    | Conflict (duplicate resource)                  |
| 415    | Unsupported Media Type (wrong Content-Type)    |
| 429    | Too Many Requests (rate limited)               |
| 500    | Internal Server Error                          |

## Minimal Curl Example

```bash
curl -G "https://a.klaviyo.com/api/profiles/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -d "page[size]=5" \
  -d "fields[profile]=email,first_name,last_name"
```
