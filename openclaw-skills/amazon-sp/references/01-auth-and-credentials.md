# 01 — Authentication & Credentials

## Overview

Amazon SP-API uses **Login With Amazon (LWA)** OAuth 2.0 for authentication. As of **Oct 2, 2023**, AWS SigV4 signing has been completely removed. Auth is purely the LWA access token sent via the `x-amz-access-token` HTTP header.

**NO AWS IAM credentials needed.** No access key, secret key, or role ARN.

---

## LWA OAuth Refresh Flow

### Token Endpoint

```
POST https://api.amazon.com/auth/o2/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={SP_LWA_REFRESH_TOKEN}
&client_id={SP_LWA_CLIENT_ID}
&client_secret={SP_LWA_CLIENT_SECRET}
```

### Response

```json
{
  "access_token": "Atza|IwEBIA...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "Atzr|IwEBIA..."
}
```

### Token Properties

| Property        | Value                                      |
| --------------- | ------------------------------------------ |
| `access_token`  | Short-lived bearer token                   |
| `expires_in`    | 3600 seconds (1 hour)                      |
| `refresh_token` | Long-lived (doesn't expire unless revoked) |
| `token_type`    | Always "bearer"                            |

### Token Caching Strategy

1. Cache access token in `.token.json` with expiry timestamp
2. Refresh **5 minutes before expiry** (at 55 min mark)
3. On 403 response, force-refresh once then retry
4. Never cache refresh token separately — it's in `.env`

### .token.json Format

```json
{
  "access_token": "Atza|IwEBIA...",
  "expires_at": 1708300000.0,
  "refreshed_at": "2026-02-19T12:00:00+00:00"
}
```

---

## Making Authenticated SP-API Requests

### Required Headers

```
x-amz-access-token: Atza|IwEBIA...
Content-Type: application/json
User-Agent: OpenClaw-AmazonSP/1.0 (Python stdlib)
```

### Example Request

```python
import urllib.request, json

url = "https://sellingpartnerapi-na.amazon.com/fba/inventory/v1/summaries"
url += "?granularityType=Marketplace&granularityId=ATVPDKIKX0DER&marketplaceIds=ATVPDKIKX0DER"

req = urllib.request.Request(url)
req.add_header("x-amz-access-token", access_token)
req.add_header("Content-Type", "application/json")

with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read())
```

---

## Restricted Data Tokens (RDT)

### When RDTs Are Needed

Buyer Personally Identifiable Information (PII) is restricted. You need an RDT to access:

- Buyer name
- Shipping address
- Email/phone
- Gift message

### Creating an RDT

```
POST /tokens/2021-03-01/restrictedDataToken
```

**Request body:**

```json
{
  "restrictedResources": [
    {
      "method": "GET",
      "path": "/orders/v2026-01-01/orders/{orderId}",
      "dataElements": ["buyerInfo", "shippingAddress"]
    }
  ]
}
```

**Response:**

```json
{
  "restrictedDataToken": "Atz.sprdt|IwEBIA...",
  "expiresIn": 3600
}
```

### Using an RDT

Replace the normal `x-amz-access-token` header with the RDT:

```
x-amz-access-token: Atz.sprdt|IwEBIA...
```

### RDT Scope

- RDTs are scoped to specific paths and data elements
- They expire in 1 hour
- You can request multiple restricted resources in one RDT call
- Rate limit: 1 burst, 0.0167 restore (1 per minute)

### Data Elements by API

| API                  | Data Elements                  |
| -------------------- | ------------------------------ |
| Orders v2026-01-01   | `buyerInfo`, `shippingAddress` |
| Shipping v2          | `shippingAddress`, `buyerInfo` |
| Fulfillment Outbound | `shippingAddress`              |

---

## Getting Your Credentials

### Step 1: Register as Developer

1. Go to Seller Central > Apps & Services > Develop Apps
2. Register as a developer (if not already)
3. Accept the Developer Agreement

### Step 2: Create SP-API Application

1. In Develop Apps, click "Add new app client"
2. Choose "SP API" as the API type
3. Select roles: typically all that apply to your use case
4. For private apps, choose "Self authorization" option

### Step 3: Get Client ID and Secret

After creating the app:

- **Client ID** (`SP_LWA_CLIENT_ID`): Shown on the app page, starts with `amzn1.application-oa2-client.`
- **Client Secret** (`SP_LWA_CLIENT_SECRET`): Shown once at creation. Copy immediately.

### Step 4: Self-Authorize for Refresh Token

For private apps (your own seller account):

1. In the app page, click "Authorize" (self-authorization)
2. A refresh token is generated: starts with `Atzr|`
3. Copy to `SP_LWA_REFRESH_TOKEN`

### Step 5: Find Marketplace ID and Seller ID

- **Marketplace ID** (`SP_MARKETPLACE_ID`): See marketplace reference table
  - US: `ATVPDKIKX0DER`
  - CA: `A2EUQ1WTGCTBG2`
  - UK: `A1F83G8C2ARO7P`
- **Seller ID** (`SP_SELLER_ID`): Seller Central > Settings > Account Info > Your Merchant Token

---

## Error Handling

### Common Auth Errors

| Error                              | Cause                          | Fix                                 |
| ---------------------------------- | ------------------------------ | ----------------------------------- |
| `invalid_grant`                    | Refresh token expired/revoked  | Re-authorize in Seller Central      |
| `unauthorized_client`              | Wrong client ID/secret         | Check `.env` credentials            |
| `invalid_client`                   | Client ID not found            | Verify app exists in Seller Central |
| 403 `Access denied`                | Token expired or wrong scope   | Refresh token, check app roles      |
| 403 `Missing authentication token` | No `x-amz-access-token` header | Add header to request               |

### Refresh Token Revocation

Refresh tokens can be revoked by:

- Seller removing app authorization in Seller Central
- Amazon revoking for policy violations
- Developer deleting the app

If revoked, you must re-authorize to get a new refresh token.

---

## Security Best Practices

1. **Never log access tokens** — They grant full API access
2. **Store refresh tokens securely** — In `.env` files, not in code
3. **Rotate client secrets** if compromised — Regenerate in Seller Central
4. **Use minimal scopes** — Only request roles/data you need
5. **RDT for PII only** — Don't request RDTs unless you need buyer info
6. **Cache tokens locally** — Don't make unnecessary token refresh calls
7. **Per-workspace isolation** — Each workspace has its own `.env` and `.token.json`
