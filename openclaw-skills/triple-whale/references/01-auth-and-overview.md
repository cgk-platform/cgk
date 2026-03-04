# Triple Whale API — Authentication & Overview

## Base URL

```
https://api.triplewhale.com/api/v2
```

All endpoints are relative to this base URL.

## Authentication Methods

### API Key (Current)

Used for summary page, attribution, and key validation endpoints.

**Header:**

```
x-api-key: <your-api-key>
```

**Obtaining an API key:**

1. Log in to Triple Whale dashboard
2. Navigate to Settings > API Keys
3. Create a new API key with appropriate scopes
4. Copy the key — it will only be shown once

**Key scopes:**

- `read` — Read access to summary and attribution data
- `write` — Not currently used by this skill

### OAuth 2.0 (Future)

Required for Moby AI and SQL endpoints. Uses authorization code flow.

**Flow:**

1. Register app at `developers.triplewhale.com`
2. Redirect user to TW authorization URL
3. Exchange authorization code for access + refresh tokens
4. Use Bearer token for API calls
5. Refresh token when expired

**Header (OAuth):**

```
Authorization: Bearer <access-token>
```

## Request Format

All POST requests use JSON body:

```
Content-Type: application/json
Accept: application/json
```

GET requests use query parameters.

## Shop Domain

The `shopDomain` field is required for most endpoints. It must be the Shopify `.myshopify.com` domain:

```
vita-hustle.myshopify.com
```

**Not:**

- `vitahustle.com` (custom domain)
- `https://vita-hustle.myshopify.com` (no protocol)
- `Vita-Hustle.myshopify.com` (must be lowercase)

## Rate Limits

Triple Whale enforces rate limits per API key:

| Scenario     | Behavior                                                |
| ------------ | ------------------------------------------------------- |
| Normal       | 200 OK with JSON response                               |
| Rate limited | 429 Too Many Requests with `Retry-After` header         |
| Burst        | Some endpoints may return 429 on rapid successive calls |

**Best practices:**

- Respect `Retry-After` header value (seconds)
- Implement exponential backoff for retries
- Cache responses when possible (summary data changes at most hourly)
- Avoid polling more than once per minute

## Error Codes

| Code | Meaning               | Resolution                                                  |
| ---- | --------------------- | ----------------------------------------------------------- |
| 200  | Success               | Process response normally                                   |
| 400  | Bad Request           | Check request body format, required fields                  |
| 401  | Unauthorized          | API key is invalid or expired — regenerate                  |
| 403  | Forbidden             | API key lacks required scope                                |
| 404  | Not Found             | Endpoint path is wrong or shop not found                    |
| 422  | Unprocessable Entity  | Valid JSON but invalid field values (e.g., bad date format) |
| 429  | Too Many Requests     | Rate limited — wait `Retry-After` seconds                   |
| 500  | Internal Server Error | TW server issue — retry with backoff                        |
| 502  | Bad Gateway           | TW infrastructure issue — retry                             |
| 503  | Service Unavailable   | TW maintenance — retry later                                |

## Error Response Format

```json
{
  "error": "Unauthorized",
  "message": "Invalid API key",
  "statusCode": 401
}
```

## Pagination

Summary and attribution endpoints return all data in a single response (no pagination needed for standard use). The attribution endpoint supports a `limit` parameter to control result count.

## Date Format

All dates must be `YYYY-MM-DD` format:

- `2026-02-20` (correct)
- `02/20/2026` (incorrect)
- `Feb 20, 2026` (incorrect)

Date ranges are inclusive on both ends.

## Currency

All monetary values are in USD (dollars, not cents). No conversion needed.

## Timezone

Dates are interpreted in the shop's timezone (configured in Triple Whale). VitaHustle's TW account uses Eastern Time (ET).
