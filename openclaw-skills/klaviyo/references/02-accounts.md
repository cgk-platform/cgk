# Klaviyo API: Accounts

The Accounts API provides read-only access to your Klaviyo account information,
including contact details, industry, timezone, currency, and public API key.

**Note:** There are no write (POST/PATCH/DELETE) endpoints for accounts. All account
settings must be managed through the Klaviyo UI.

## Endpoints

| Method | Path                  | Description       | Rate Tier |
| ------ | --------------------- | ----------------- | --------- |
| GET    | `/api/accounts/`      | List accounts     | L         |
| GET    | `/api/accounts/{id}/` | Get account by ID | L         |

## Account Attributes

| Attribute                                  | Type   | Description                             |
| ------------------------------------------ | ------ | --------------------------------------- |
| `contact_information.default_sender_name`  | string | Default "From" name on emails           |
| `contact_information.default_sender_email` | string | Default "From" email address            |
| `contact_information.website_url`          | string | Company website URL                     |
| `contact_information.organization_name`    | string | Legal organization name                 |
| `contact_information.street_address`       | object | Physical mailing address                |
| `industry`                                 | string | Business industry classification        |
| `timezone`                                 | string | IANA timezone (e.g. `America/New_York`) |
| `preferred_currency`                       | string | ISO 4217 currency code (e.g. `USD`)     |
| `public_api_key`                           | string | 6-character public/site ID              |
| `locale`                                   | string | Account locale (e.g. `en-US`)           |

---

## GET /api/accounts/

List all accounts associated with the API key. In practice this returns a single-item
array since each private key is scoped to one account.

### Request

```bash
curl -G "https://a.klaviyo.com/api/accounts/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15"
```

### Sparse Fieldsets

```bash
curl -G "https://a.klaviyo.com/api/accounts/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -d "fields[account]=contact_information,timezone,public_api_key"
```

### Response (200 OK)

```json
{
  "data": [
    {
      "type": "account",
      "id": "ACCT_abc123",
      "attributes": {
        "contact_information": {
          "default_sender_name": "CGK Linens",
          "default_sender_email": "hello@example.com",
          "website_url": "https://www.example.com",
          "organization_name": "Your Company Inc.",
          "street_address": {
            "address1": "123 Main St",
            "address2": "",
            "city": "Your City",
            "region": "ST",
            "country": "US",
            "zip": "00000"
          }
        },
        "industry": "Retail",
        "timezone": "America/Los_Angeles",
        "preferred_currency": "USD",
        "public_api_key": "AbCdEf",
        "locale": "en-US"
      },
      "links": {
        "self": "https://a.klaviyo.com/api/accounts/ACCT_abc123/"
      }
    }
  ],
  "links": {
    "self": "https://a.klaviyo.com/api/accounts/",
    "next": null,
    "prev": null
  }
}
```

---

## GET /api/accounts/{id}/

Retrieve a single account by its ID.

### Request

```bash
curl "https://a.klaviyo.com/api/accounts/ACCT_abc123/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15"
```

### Response (200 OK)

```json
{
  "data": {
    "type": "account",
    "id": "ACCT_abc123",
    "attributes": {
      "contact_information": {
        "default_sender_name": "CGK Linens",
        "default_sender_email": "hello@example.com",
        "website_url": "https://www.example.com",
        "organization_name": "Your Company Inc.",
        "street_address": {
          "address1": "123 Main St",
          "address2": "",
          "city": "Your City",
          "region": "ST",
          "country": "US",
          "zip": "00000"
        }
      },
      "industry": "Retail",
      "timezone": "America/Los_Angeles",
      "preferred_currency": "USD",
      "public_api_key": "AbCdEf",
      "locale": "en-US"
    },
    "links": {
      "self": "https://a.klaviyo.com/api/accounts/ACCT_abc123/"
    }
  }
}
```

---

## Error Responses

### 401 Unauthorized (invalid or missing API key)

```json
{
  "errors": [
    {
      "id": "err-401",
      "status": 401,
      "code": "not_authenticated",
      "title": "Authentication credentials were not provided.",
      "detail": "Missing or invalid Authorization header.",
      "source": {}
    }
  ]
}
```

### 404 Not Found (invalid account ID)

```json
{
  "errors": [
    {
      "id": "err-404",
      "status": 404,
      "code": "not_found",
      "title": "Not found.",
      "detail": "No account with ID 'INVALID_ID' exists.",
      "source": {}
    }
  ]
}
```

---

## Usage Notes

- The accounts endpoint is **read-only**. To update sender information, timezone, or
  other settings, use the Klaviyo dashboard.
- The `public_api_key` returned here is the same 6-character key used for client-side
  JavaScript SDK initialization.
- Only one account is returned per private API key. The list endpoint exists for
  consistency with the JSON:API specification.
- Sparse fieldsets work on all attributes. Use `fields[account]` to limit the response.
