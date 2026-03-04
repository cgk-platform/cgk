# Klaviyo API Reference: Data Privacy and Client-Side API

Handle GDPR/CCPA data deletion requests and use the client-side (public key) API for browser and mobile integrations. The data privacy endpoint permanently deletes profile data. The client-side API uses the public company ID instead of a private API key, making it safe for frontend use.

**API Revision:** `2024-10-15`

---

## Data Privacy (GDPR/CCPA)

### POST /api/data-privacy-deletion-jobs/

Request permanent deletion of all data associated with a profile. This fulfills GDPR right-to-erasure and CCPA deletion requests.

**WARNING: This action is IRREVERSIBLE. All profile data, event history, consent records, and associated data will be permanently deleted. Always confirm with the requesting user before executing.**

**Request Body (by email):**

```json
{
  "data": {
    "type": "data-privacy-deletion-job",
    "attributes": {
      "profile": {
        "data": {
          "type": "profile",
          "attributes": {
            "email": "customer@example.com"
          }
        }
      }
    }
  }
}
```

**Request Body (by phone number):**

```json
{
  "data": {
    "type": "data-privacy-deletion-job",
    "attributes": {
      "profile": {
        "data": {
          "type": "profile",
          "attributes": {
            "phone_number": "+15551234567"
          }
        }
      }
    }
  }
}
```

**Request Body (by profile ID):**

```json
{
  "data": {
    "type": "data-privacy-deletion-job",
    "attributes": {
      "profile": {
        "data": {
          "type": "profile",
          "id": "PROFILE_ID"
        }
      }
    }
  }
}
```

```bash
curl -X POST 'https://a.klaviyo.com/api/data-privacy-deletion-jobs/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "data-privacy-deletion-job",
      "attributes": {
        "profile": {
          "data": {
            "type": "profile",
            "attributes": {
              "email": "customer@example.com"
            }
          }
        }
      }
    }
  }'
```

**Identifier Options (use one):**

| Identifier     | Location                  | Description                         |
| -------------- | ------------------------- | ----------------------------------- |
| `email`        | `attributes.email`        | Profile email address               |
| `phone_number` | `attributes.phone_number` | Profile phone number (E.164 format) |
| `id`           | `data.id`                 | Klaviyo profile ID                  |

**Response:** `202 Accepted` - The deletion job is queued for processing.

```json
{
  "data": {
    "type": "data-privacy-deletion-job",
    "id": "DELETION_JOB_ID",
    "attributes": {
      "status": "queued",
      "created_at": "2024-01-15T10:00:00Z"
    }
  }
}
```

**What gets deleted:**

- Profile attributes (name, email, phone, address, custom properties)
- All event/activity history for the profile
- Consent and subscription records
- Segment and list memberships
- Campaign and flow message history
- Any associated metrics data

**Important considerations:**

- Deletion is processed asynchronously and may take up to 30 days to fully propagate.
- Once deleted, data cannot be recovered.
- If the profile re-engages (e.g., places a new order), a new profile will be created.
- You should maintain your own records of deletion requests for compliance auditing.
- This endpoint requires the private API key; it cannot be called from client-side code.

---

## Client-Side API (Public Key)

The client-side API uses your **company ID (public API key)** instead of a private API key. This makes it safe to call from browsers, mobile apps, and other client environments. The company ID is passed in the request body, not in an Authorization header.

**Base URL:** `https://a.klaviyo.com`

**Authentication:** No `Authorization` header. Instead, include `company_id` in the request body.

**Rate limits:** More restrictive than server-side API. Designed for individual user actions, not bulk operations.

---

### POST /client/events/

Track an event from the client side (browser or mobile app).

**Request Body:**

```json
{
  "data": {
    "type": "event",
    "attributes": {
      "metric": {
        "data": {
          "type": "metric",
          "attributes": {
            "name": "Viewed Product"
          }
        }
      },
      "profile": {
        "data": {
          "type": "profile",
          "attributes": {
            "email": "customer@example.com",
            "properties": {
              "first_name": "Jane"
            }
          }
        }
      },
      "properties": {
        "ProductName": "Featured Product",
        "ProductID": "SKU-001",
        "Price": 39.99,
        "ImageURL": "https://example.com/images/product.jpg",
        "ProductURL": "https://example.com/products/featured-product",
        "Categories": ["Featured", "Best Sellers"]
      },
      "value": 39.99,
      "time": "2024-01-15T14:30:00Z"
    }
  }
}
```

```bash
curl -X POST 'https://a.klaviyo.com/client/events/' \
  --header 'Content-Type: application/json' \
  --header 'revision: 2024-10-15' \
  --data '{
    "data": {
      "type": "event",
      "attributes": {
        "metric": {
          "data": {
            "type": "metric",
            "attributes": {"name": "Viewed Product"}
          }
        },
        "profile": {
          "data": {
            "type": "profile",
            "attributes": {"email": "customer@example.com"}
          }
        },
        "properties": {
          "ProductName": "Featured Product",
          "ProductID": "SKU-001",
          "Price": 39.99
        }
      },
      "meta": {
        "company_id": "YOUR_PUBLIC_API_KEY"
      }
    }
  }'
```

**Note:** The `company_id` is passed in `data.meta.company_id` (not as a header).

---

### POST /client/profiles/

Create or update a profile from the client side. Matches on email, phone_number, or external_id.

**Request Body:**

```json
{
  "data": {
    "type": "profile",
    "attributes": {
      "email": "customer@example.com",
      "phone_number": "+15551234567",
      "first_name": "Jane",
      "last_name": "Doe",
      "properties": {
        "quiz_result": "energy_boost",
        "preferred_flavor": "chocolate"
      }
    },
    "meta": {
      "company_id": "YOUR_PUBLIC_API_KEY"
    }
  }
}
```

```bash
curl -X POST 'https://a.klaviyo.com/client/profiles/' \
  --header 'Content-Type: application/json' \
  --header 'revision: 2024-10-15' \
  --data '{
    "data": {
      "type": "profile",
      "attributes": {
        "email": "customer@example.com",
        "first_name": "Jane",
        "last_name": "Doe",
        "properties": {"quiz_result": "energy_boost"}
      },
      "meta": {
        "company_id": "YOUR_PUBLIC_API_KEY"
      }
    }
  }'
```

---

### POST /client/subscriptions/

Subscribe a profile to email or SMS from the client side. Typically used with form submissions.

**Request Body:**

```json
{
  "data": {
    "type": "subscription",
    "attributes": {
      "profile": {
        "data": {
          "type": "profile",
          "attributes": {
            "email": "customer@example.com",
            "phone_number": "+15551234567"
          }
        }
      },
      "channels": {
        "email": ["MARKETING"],
        "sms": ["MARKETING"]
      }
    },
    "relationships": {
      "list": {
        "data": {
          "type": "list",
          "id": "LIST_ID"
        }
      }
    },
    "meta": {
      "company_id": "YOUR_PUBLIC_API_KEY"
    }
  }
}
```

```bash
curl -X POST 'https://a.klaviyo.com/client/subscriptions/' \
  --header 'Content-Type: application/json' \
  --header 'revision: 2024-10-15' \
  --data '{
    "data": {
      "type": "subscription",
      "attributes": {
        "profile": {
          "data": {
            "type": "profile",
            "attributes": {"email": "customer@example.com"}
          }
        },
        "channels": {"email": ["MARKETING"]}
      },
      "relationships": {
        "list": {"data": {"type": "list", "id": "LIST_ID"}}
      },
      "meta": {
        "company_id": "YOUR_PUBLIC_API_KEY"
      }
    }
  }'
```

**Channel types:**

- `email`: `["MARKETING"]` or `["MARKETING", "TRANSACTIONAL"]`
- `sms`: `["MARKETING"]`

---

### POST /client/push-tokens/

Register a push notification token for a profile (mobile app integration).

**Request Body:**

```json
{
  "data": {
    "type": "push-token",
    "attributes": {
      "token": "DEVICE_PUSH_TOKEN_STRING",
      "platform": "ios",
      "vendor": "apns",
      "profile": {
        "data": {
          "type": "profile",
          "attributes": {
            "email": "customer@example.com"
          }
        }
      },
      "enablement_status": "AUTHORIZED"
    },
    "meta": {
      "company_id": "YOUR_PUBLIC_API_KEY"
    }
  }
}
```

**Platform values:** `ios`, `android`

**Vendor values:** `apns` (Apple Push Notification Service), `fcm` (Firebase Cloud Messaging)

**Enablement statuses:** `AUTHORIZED`, `DENIED`, `NOT_DETERMINED`, `PROVISIONAL`, `UNAUTHORIZED`

---

### POST /client/back-in-stock-subscriptions/

Subscribe a profile to back-in-stock notifications for a specific catalog item or variant.

**Request Body:**

```json
{
  "data": {
    "type": "back-in-stock-subscription",
    "attributes": {
      "channels": ["EMAIL", "SMS"],
      "profile": {
        "data": {
          "type": "profile",
          "attributes": {
            "email": "customer@example.com",
            "phone_number": "+15551234567"
          }
        }
      }
    },
    "relationships": {
      "variant": {
        "data": {
          "type": "catalog-variant",
          "id": "$custom:::$default:::SKU-001-30"
        }
      }
    },
    "meta": {
      "company_id": "YOUR_PUBLIC_API_KEY"
    }
  }
}
```

```bash
curl -X POST 'https://a.klaviyo.com/client/back-in-stock-subscriptions/' \
  --header 'Content-Type: application/json' \
  --header 'revision: 2024-10-15' \
  --data '{
    "data": {
      "type": "back-in-stock-subscription",
      "attributes": {
        "channels": ["EMAIL"],
        "profile": {
          "data": {
            "type": "profile",
            "attributes": {"email": "customer@example.com"}
          }
        }
      },
      "relationships": {
        "variant": {
          "data": {"type": "catalog-variant", "id": "$custom:::$default:::SKU-001-30"}
        }
      },
      "meta": {
        "company_id": "YOUR_PUBLIC_API_KEY"
      }
    }
  }'
```

**Channel values:** `EMAIL`, `SMS`, `PUSH`

**Note:** The variant must exist in your catalog and have `inventory_quantity` set to `0` for the back-in-stock flow to trigger when inventory is replenished.

---

## Client-Side vs. Server-Side API Comparison

| Aspect              | Client-Side (`/client/`)                                                  | Server-Side (`/api/`)                                 |
| ------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| Authentication      | `company_id` (public key) in request body                                 | `Authorization: Klaviyo-API-Key` header (private key) |
| Safe for browsers   | Yes                                                                       | No (exposes private key)                              |
| Rate limits         | More restrictive                                                          | Standard limits                                       |
| Available endpoints | 5 endpoints (events, profiles, subscriptions, push tokens, back-in-stock) | All endpoints                                         |
| Read access         | No (write-only)                                                           | Full read/write                                       |
| Bulk operations     | No                                                                        | Yes                                                   |
| Use case            | Frontend tracking, form submissions, mobile apps                          | Backend integrations, data syncs, automation          |

---

## Rate Limits

| Endpoint                                  | Burst | Steady |
| ----------------------------------------- | ----- | ------ |
| POST /api/data-privacy-deletion-jobs/     | 3/s   | 60/m   |
| POST /client/events/                      | 100/s | 1500/m |
| POST /client/profiles/                    | 100/s | 1500/m |
| POST /client/subscriptions/               | 100/s | 1500/m |
| POST /client/push-tokens/                 | 100/s | 1500/m |
| POST /client/back-in-stock-subscriptions/ | 100/s | 1500/m |

## Key Notes

- **Data privacy deletion is irreversible.** Always verify the request is legitimate and confirm with the user before calling the deletion endpoint.
- The data privacy endpoint requires the **private** API key. It is a server-side-only endpoint.
- Client-side endpoints are **write-only** (POST only). You cannot read data from client-side endpoints.
- The `company_id` (public API key) is safe to expose in browser JavaScript or mobile app code. It can only be used with `/client/` endpoints.
- Client-side profile creation/update follows the same merge logic as server-side: profiles are matched by email, phone_number, or external_id.
- Back-in-stock subscriptions require a corresponding back-in-stock flow configured in Klaviyo to trigger notifications.
- Push token registration should happen on app launch and when push permissions change.
- For JavaScript browser integration, Klaviyo provides the `klaviyo.js` library which wraps these client-side endpoints. Use the raw API for non-browser environments (React Native, Flutter, etc.).
- All data privacy and client-side endpoints are action endpoints (POST only).
