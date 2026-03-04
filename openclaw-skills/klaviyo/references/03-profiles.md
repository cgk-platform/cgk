# Klaviyo API: Profiles

The Profiles API manages contact records in Klaviyo. Profiles store email addresses,
phone numbers, names, custom properties, and location data. This is the core resource
for subscriber and customer management.

## Endpoints

| Method | Path                                           | Description                   | Rate Tier |
| ------ | ---------------------------------------------- | ----------------------------- | --------- |
| GET    | `/api/profiles/`                               | List profiles                 | L         |
| GET    | `/api/profiles/{id}/`                          | Get profile                   | M         |
| POST   | `/api/profiles/`                               | Create profile                | S         |
| PATCH  | `/api/profiles/{id}/`                          | Update profile                | M         |
| POST   | `/api/profile-import-jobs/`                    | Bulk import profiles          | XS        |
| GET    | `/api/profile-import-jobs/{id}/`               | Get import job status         | L         |
| GET    | `/api/profile-import-jobs/`                    | List import jobs              | L         |
| GET    | `/api/profile-import-jobs/{id}/import-errors/` | Get import errors             | L         |
| POST   | `/api/profiles/{id}/push-tokens/`              | Create push token             | S         |
| GET    | `/api/profiles/{id}/lists/`                    | Get profile's lists           | L         |
| GET    | `/api/profiles/{id}/segments/`                 | Get profile's segments        | L         |
| GET    | `/api/profiles/{id}/relationships/lists/`      | Get profile-list relationship | L         |
| GET    | `/api/profiles/{id}/relationships/segments/`   | Get profile-segment rel.      | L         |
| POST   | `/api/profile-subscription-bulk-create-jobs/`  | Bulk subscribe profiles       | XS        |
| POST   | `/api/profile-subscription-bulk-delete-jobs/`  | Bulk unsubscribe profiles     | XS        |
| POST   | `/api/profile-suppression-bulk-create-jobs/`   | Suppress profiles             | XS        |
| POST   | `/api/profile-suppression-bulk-delete-jobs/`   | Unsuppress profiles           | XS        |
| POST   | `/api/profile-merge/`                          | Merge duplicate profiles      | S         |

## Profile Attributes

| Attribute      | Type   | Description                                |
| -------------- | ------ | ------------------------------------------ |
| `email`        | string | Email address (unique identifier)          |
| `phone_number` | string | E.164 phone number (e.g. `+15551234567`)   |
| `external_id`  | string | External system identifier                 |
| `first_name`   | string | First name                                 |
| `last_name`    | string | Last name                                  |
| `organization` | string | Company or organization name               |
| `title`        | string | Job title                                  |
| `image`        | string | URL to profile image                       |
| `location`     | object | Address and geo data (see below)           |
| `properties`   | object | Custom key-value properties                |
| `created`      | string | ISO 8601 creation datetime (read-only)     |
| `updated`      | string | ISO 8601 last updated datetime (read-only) |

### Location Object

| Field       | Type   | Description             |
| ----------- | ------ | ----------------------- |
| `address1`  | string | Street address line 1   |
| `address2`  | string | Street address line 2   |
| `city`      | string | City                    |
| `region`    | string | State/province          |
| `zip`       | string | Postal code             |
| `country`   | string | ISO 3166-1 country code |
| `latitude`  | number | Latitude coordinate     |
| `longitude` | number | Longitude coordinate    |
| `timezone`  | string | IANA timezone           |

---

## GET /api/profiles/

List profiles with optional filtering, sparse fieldsets, and pagination.

### Request

```bash
curl -G "https://a.klaviyo.com/api/profiles/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -d "page[size]=20" \
  -d "fields[profile]=email,first_name,last_name,properties" \
  -d "filter=greater-than(created,2024-01-01T00:00:00Z)"
```

### Filter Examples

```
filter=equals(email,"user@example.com")
filter=contains(email,"example.com")
filter=has(properties,"vip_tier")
filter=and(equals(properties.vip_tier,"gold"),greater-than(created,2024-06-01T00:00:00Z))
```

### Response (200 OK)

```json
{
  "data": [
    {
      "type": "profile",
      "id": "01HX1ABC",
      "attributes": {
        "email": "jane@example.com",
        "first_name": "Jane",
        "last_name": "Doe",
        "properties": {
          "vip_tier": "gold",
          "lifetime_value": 450.0
        }
      },
      "links": {
        "self": "https://a.klaviyo.com/api/profiles/01HX1ABC/"
      }
    }
  ],
  "links": {
    "self": "https://a.klaviyo.com/api/profiles/",
    "next": "https://a.klaviyo.com/api/profiles/?page%5Bcursor%5D=bmV4dC1jdXJzb3I%3D",
    "prev": null
  }
}
```

---

## POST /api/profiles/

Create a new profile. If a profile with the same email or phone_number already exists,
this returns a `409 Conflict`.

### Request

```bash
curl -X POST "https://a.klaviyo.com/api/profiles/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "profile",
      "attributes": {
        "email": "newcustomer@example.com",
        "phone_number": "+15551234567",
        "first_name": "Alex",
        "last_name": "Rivera",
        "organization": "Rivera Fitness",
        "title": "Founder",
        "location": {
          "address1": "456 Commerce Blvd",
          "city": "Your City",
          "region": "ST",
          "zip": "00000",
          "country": "US"
        },
        "properties": {
          "source": "website_signup",
          "preferred_product": "featured_item",
          "lifetime_value": 0
        }
      }
    }
  }'
```

### Response (201 Created)

```json
{
  "data": {
    "type": "profile",
    "id": "01HX2DEF",
    "attributes": {
      "email": "newcustomer@example.com",
      "phone_number": "+15551234567",
      "first_name": "Alex",
      "last_name": "Rivera",
      "organization": "Rivera Fitness",
      "title": "Founder",
      "image": null,
      "location": {
        "address1": "456 Commerce Blvd",
        "address2": "",
        "city": "Your City",
        "region": "ST",
        "zip": "00000",
        "country": "US",
        "latitude": null,
        "longitude": null,
        "timezone": null
      },
      "properties": {
        "source": "website_signup",
        "preferred_product": "featured_item",
        "lifetime_value": 0
      },
      "created": "2024-10-20T14:30:00+00:00",
      "updated": "2024-10-20T14:30:00+00:00"
    },
    "links": {
      "self": "https://a.klaviyo.com/api/profiles/01HX2DEF/"
    }
  }
}
```

---

## PATCH /api/profiles/{id}/

Update an existing profile. Only provided attributes are changed; omitted fields are
not modified. Custom `properties` are merged (not replaced).

### Request

```bash
curl -X PATCH "https://a.klaviyo.com/api/profiles/01HX2DEF/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "profile",
      "id": "01HX2DEF",
      "attributes": {
        "first_name": "Alexander",
        "properties": {
          "vip_tier": "silver",
          "lifetime_value": 89.99
        }
      }
    }
  }'
```

### Response (200 OK)

Returns the full updated profile object (same structure as GET).

---

## POST /api/profile-import-jobs/

Bulk import/upsert up to 10,000 profiles per job. Profiles are matched on `email`,
`phone_number`, or `external_id`. Existing profiles are updated; new ones are created.

### Request

```bash
curl -X POST "https://a.klaviyo.com/api/profile-import-jobs/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "profile-import-job",
      "attributes": {
        "profiles": {
          "data": [
            {
              "type": "profile",
              "attributes": {
                "email": "batch1@example.com",
                "first_name": "Batch",
                "last_name": "One",
                "properties": { "import_source": "crm_sync" }
              }
            },
            {
              "type": "profile",
              "attributes": {
                "email": "batch2@example.com",
                "first_name": "Batch",
                "last_name": "Two"
              }
            }
          ]
        }
      },
      "relationships": {
        "lists": {
          "data": [
            { "type": "list", "id": "LIST_abc123" }
          ]
        }
      }
    }
  }'
```

### Response (202 Accepted)

```json
{
  "data": {
    "type": "profile-import-job",
    "id": "JOB_import_001",
    "attributes": {
      "status": "queued",
      "created_at": "2024-10-20T15:00:00+00:00",
      "total_count": 2,
      "completed_count": 0,
      "failed_count": 0
    }
  }
}
```

### Check Import Status

```bash
curl "https://a.klaviyo.com/api/profile-import-jobs/JOB_import_001/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15"
```

---

## POST /api/profile-subscription-bulk-create-jobs/

Subscribe profiles to email and/or SMS marketing. This creates consent records.

### Request

```bash
curl -X POST "https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "profile-subscription-bulk-create-job",
      "attributes": {
        "custom_source": "Website Footer Form",
        "profiles": {
          "data": [
            {
              "type": "profile",
              "attributes": {
                "email": "subscriber@example.com",
                "phone_number": "+15551234567",
                "subscriptions": {
                  "email": {
                    "marketing": {
                      "consent": "SUBSCRIBED"
                    }
                  },
                  "sms": {
                    "marketing": {
                      "consent": "SUBSCRIBED"
                    }
                  }
                }
              }
            }
          ]
        }
      },
      "relationships": {
        "list": {
          "data": {
            "type": "list",
            "id": "LIST_abc123"
          }
        }
      }
    }
  }'
```

### Response (202 Accepted)

Returns a job resource with status tracking.

---

## POST /api/profile-subscription-bulk-delete-jobs/

Unsubscribe profiles from email and/or SMS marketing.

### Request

```bash
curl -X POST "https://a.klaviyo.com/api/profile-subscription-bulk-delete-jobs/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "profile-subscription-bulk-delete-job",
      "attributes": {
        "profiles": {
          "data": [
            {
              "type": "profile",
              "attributes": {
                "email": "unsubscribe@example.com"
              }
            }
          ]
        }
      }
    }
  }'
```

---

## POST /api/profile-suppression-bulk-create-jobs/

Suppress profiles so they cannot receive any messages. This is stronger than
unsubscribing -- suppressed profiles are excluded from all sends.

### Request

```bash
curl -X POST "https://a.klaviyo.com/api/profile-suppression-bulk-create-jobs/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "profile-suppression-bulk-create-job",
      "attributes": {
        "profiles": {
          "data": [
            {
              "type": "profile",
              "attributes": {
                "email": "suppress@example.com"
              }
            }
          ]
        }
      }
    }
  }'
```

---

## POST /api/profile-suppression-bulk-delete-jobs/

Remove suppression from profiles, allowing them to receive messages again.

Request body structure mirrors the suppression create job but uses type
`profile-suppression-bulk-delete-job`.

---

## POST /api/profile-merge/

Merge two duplicate profiles into one. The winning profile retains its ID; the losing
profile is deleted and its data is merged in.

### Request

```bash
curl -X POST "https://a.klaviyo.com/api/profile-merge/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "profile-merge",
      "relationships": {
        "profiles": {
          "data": [
            { "type": "profile", "id": "01HX1ABC" },
            { "type": "profile", "id": "01HX2DEF" }
          ]
        }
      }
    }
  }'
```

### Response (201 Created)

Returns the merged profile. The first profile ID in the array is the winner by default.

---

## GET /api/profiles/{id}/lists/

Retrieve all lists a profile belongs to.

```bash
curl "https://a.klaviyo.com/api/profiles/01HX1ABC/lists/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15"
```

---

## GET /api/profiles/{id}/segments/

Retrieve all segments a profile belongs to.

```bash
curl "https://a.klaviyo.com/api/profiles/01HX1ABC/segments/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15"
```

---

## POST /api/profiles/{id}/push-tokens/

Register a mobile push token for a profile.

### Request

```bash
curl -X POST "https://a.klaviyo.com/api/profiles/01HX1ABC/push-tokens/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "push-token",
      "attributes": {
        "token": "abc123def456pushtoken",
        "platform": "ios",
        "vendor": "apns"
      }
    }
  }'
```

---

## Usage Notes

- **Identifiers:** Profiles are uniquely identified by `email`, `phone_number`, or
  `external_id`. At least one is required on create.
- **Properties merge:** PATCH merges custom `properties` -- it does not replace the
  entire object. Set a property to `null` to remove it.
- **Bulk limits:** Import jobs accept up to 10,000 profiles per request. For larger
  imports, split into multiple jobs.
- **Subscription vs Suppression:** Unsubscribing removes marketing consent for a
  specific channel. Suppressing blocks all communication across all channels.
