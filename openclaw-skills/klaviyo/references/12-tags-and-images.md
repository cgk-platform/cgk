# Klaviyo API Reference: Tags and Images

Organize resources with tags and tag groups, and manage image assets for email templates. Tags provide a flexible labeling system for campaigns, flows, lists, and segments. Images are uploaded assets available for use in email content.

**API Revision:** `2024-10-15`

---

## Tags

### GET /api/tags/

List all tags in the account.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `fields[tag]` | string | `name`, `created`, `updated` |
| `filter` | string | Filter by `name`, `tag_group_id` |
| `include` | string | `tag-group` |
| `page[cursor]` | string | Cursor for pagination |
| `sort` | string | `name`, `-name`, `created`, `-created` |

```bash
curl -G 'https://a.klaviyo.com/api/tags/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --data-urlencode 'include=tag-group'
```

**Response:**

```json
{
  "data": [
    {
      "type": "tag",
      "id": "TAG_ID",
      "attributes": {
        "name": "Q1-2024",
        "created": "2024-01-01T00:00:00Z",
        "updated": "2024-01-01T00:00:00Z"
      },
      "relationships": {
        "tag-group": {
          "data": { "type": "tag-group", "id": "TAG_GROUP_ID" },
          "links": {
            "self": "https://a.klaviyo.com/api/tags/TAG_ID/relationships/tag-group/",
            "related": "https://a.klaviyo.com/api/tags/TAG_ID/tag-group/"
          }
        }
      },
      "links": { "self": "https://a.klaviyo.com/api/tags/TAG_ID/" }
    }
  ],
  "links": { "self": "https://a.klaviyo.com/api/tags/" }
}
```

---

### GET /api/tags/{id}/

Retrieve a single tag.

```bash
curl 'https://a.klaviyo.com/api/tags/TAG_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

---

### POST /api/tags/

Create a tag.

**Request Body:**

```json
{
  "data": {
    "type": "tag",
    "attributes": {
      "name": "Summer-Sale-2024"
    },
    "relationships": {
      "tag-group": {
        "data": {
          "type": "tag-group",
          "id": "TAG_GROUP_ID"
        }
      }
    }
  }
}
```

```bash
curl -X POST 'https://a.klaviyo.com/api/tags/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "tag",
      "attributes": { "name": "Summer-Sale-2024" },
      "relationships": {
        "tag-group": {
          "data": { "type": "tag-group", "id": "TAG_GROUP_ID" }
        }
      }
    }
  }'
```

**Required Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | string | Tag name (must be unique within its tag group) |

**Required Relationships:**
| Relationship | Description |
|--------------|-------------|
| `tag-group` | The tag group this tag belongs to |

---

### PATCH /api/tags/{id}/

Update a tag name.

**Request Body:**

```json
{
  "data": {
    "type": "tag",
    "id": "TAG_ID",
    "attributes": {
      "name": "Summer-Sale-2024-Updated"
    }
  }
}
```

---

### DELETE /api/tags/{id}/

Delete a tag. Removes all associations. Returns `204 No Content`.

```bash
curl -X DELETE 'https://a.klaviyo.com/api/tags/TAG_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

---

## Tag Groups

Tag groups organize tags into logical collections. Groups can be exclusive (resource gets at most one tag from the group) or non-exclusive (resource can have multiple tags from the group).

### GET /api/tag-groups/

List all tag groups.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `fields[tag-group]` | string | `name`, `exclusive`, `default`, `created`, `updated` |
| `filter` | string | Filter by `name`, `exclusive`, `default` |
| `include` | string | `tags` |
| `page[cursor]` | string | Cursor for pagination |
| `sort` | string | `name`, `-name`, `created`, `-created` |

```bash
curl -G 'https://a.klaviyo.com/api/tag-groups/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --data-urlencode 'include=tags'
```

**Response:**

```json
{
  "data": [
    {
      "type": "tag-group",
      "id": "TAG_GROUP_ID",
      "attributes": {
        "name": "Campaign Seasons",
        "exclusive": true,
        "default": false,
        "created": "2024-01-01T00:00:00Z",
        "updated": "2024-01-01T00:00:00Z"
      },
      "relationships": {
        "tags": {
          "data": [
            { "type": "tag", "id": "TAG_ID_1" },
            { "type": "tag", "id": "TAG_ID_2" }
          ],
          "links": {
            "self": "https://a.klaviyo.com/api/tag-groups/TAG_GROUP_ID/relationships/tags/",
            "related": "https://a.klaviyo.com/api/tag-groups/TAG_GROUP_ID/tags/"
          }
        }
      },
      "links": { "self": "https://a.klaviyo.com/api/tag-groups/TAG_GROUP_ID/" }
    }
  ],
  "links": { "self": "https://a.klaviyo.com/api/tag-groups/" }
}
```

---

### GET /api/tag-groups/{id}/

Retrieve a single tag group.

---

### POST /api/tag-groups/

Create a tag group.

**Request Body:**

```json
{
  "data": {
    "type": "tag-group",
    "attributes": {
      "name": "Campaign Seasons",
      "exclusive": true
    }
  }
}
```

```bash
curl -X POST 'https://a.klaviyo.com/api/tag-groups/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "tag-group",
      "attributes": {
        "name": "Campaign Seasons",
        "exclusive": true
      }
    }
  }'
```

**Attributes:**
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Unique name for the tag group |
| `exclusive` | boolean | No | If `true`, resources can only have one tag from this group (default `false`) |

---

### PATCH /api/tag-groups/{id}/

Update a tag group.

**Request Body:**

```json
{
  "data": {
    "type": "tag-group",
    "id": "TAG_GROUP_ID",
    "attributes": {
      "name": "Seasonal Campaigns",
      "exclusive": false
    }
  }
}
```

---

### DELETE /api/tag-groups/{id}/

Delete a tag group and all tags within it. Returns `204 No Content`.

```bash
curl -X DELETE 'https://a.klaviyo.com/api/tag-groups/TAG_GROUP_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

**Warning:** Deleting a tag group removes all tags in the group and all their associations with resources.

---

## Tag Associations

Apply or remove tags on campaigns, flows, lists, and segments.

### Supported Resource Types

| Resource Type | Relationship Endpoint              |
| ------------- | ---------------------------------- |
| Campaigns     | `/api/tag-campaign-relationships/` |
| Flows         | `/api/tag-flow-relationships/`     |
| Lists         | `/api/tag-list-relationships/`     |
| Segments      | `/api/tag-segment-relationships/`  |

### POST /api/tag-{resource-type}-relationships/

Associate a tag with one or more resources.

**Request Body (tag a campaign):**

```json
{
  "data": {
    "type": "tag",
    "id": "TAG_ID",
    "relationships": {
      "campaigns": {
        "data": [
          { "type": "campaign", "id": "CAMPAIGN_ID_1" },
          { "type": "campaign", "id": "CAMPAIGN_ID_2" }
        ]
      }
    }
  }
}
```

```bash
# Tag campaigns
curl -X POST 'https://a.klaviyo.com/api/tag-campaign-relationships/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "tag",
      "id": "TAG_ID",
      "relationships": {
        "campaigns": {
          "data": [
            {"type": "campaign", "id": "CAMPAIGN_ID_1"},
            {"type": "campaign", "id": "CAMPAIGN_ID_2"}
          ]
        }
      }
    }
  }'
```

```bash
# Tag flows
curl -X POST 'https://a.klaviyo.com/api/tag-flow-relationships/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "tag",
      "id": "TAG_ID",
      "relationships": {
        "flows": {
          "data": [{"type": "flow", "id": "FLOW_ID"}]
        }
      }
    }
  }'
```

---

### DELETE /api/tag-{resource-type}-relationships/

Remove a tag from resources. Same request body structure as POST.

```bash
curl -X DELETE 'https://a.klaviyo.com/api/tag-campaign-relationships/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "tag",
      "id": "TAG_ID",
      "relationships": {
        "campaigns": {
          "data": [{"type": "campaign", "id": "CAMPAIGN_ID_1"}]
        }
      }
    }
  }'
```

---

## Images

### GET /api/images/

List all uploaded images.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `fields[image]` | string | `name`, `image_url`, `format`, `size`, `hidden`, `created`, `updated` |
| `filter` | string | Filter by `name`, `format`, `hidden`, `size` |
| `page[cursor]` | string | Cursor for pagination |
| `sort` | string | `name`, `-name`, `created`, `-created`, `size`, `-size` |

```bash
curl -G 'https://a.klaviyo.com/api/images/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --data-urlencode 'filter=equals(hidden,false)'
```

**Response:**

```json
{
  "data": [
    {
      "type": "image",
      "id": "IMAGE_ID",
      "attributes": {
        "name": "summer-banner.jpg",
        "image_url": "https://d3k81ch9hvuctc.cloudfront.net/company/abc123/images/summer-banner.jpg",
        "format": "jpeg",
        "size": 245000,
        "hidden": false,
        "created": "2024-06-01T00:00:00Z",
        "updated": "2024-06-01T00:00:00Z"
      },
      "links": { "self": "https://a.klaviyo.com/api/images/IMAGE_ID/" }
    }
  ],
  "links": { "self": "https://a.klaviyo.com/api/images/" }
}
```

---

### GET /api/images/{id}/

Retrieve a single image.

```bash
curl 'https://a.klaviyo.com/api/images/IMAGE_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15'
```

---

### POST /api/images/

Upload a new image. Supports two methods: import from URL or direct file upload.

**Method 1: Import from URL**

**Request Body:**

```json
{
  "data": {
    "type": "image",
    "attributes": {
      "import_from_url": "https://cdn.example.com/email-assets/hero-banner.jpg",
      "name": "hero-banner-jan2024",
      "hidden": false
    }
  }
}
```

```bash
curl -X POST 'https://a.klaviyo.com/api/images/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "image",
      "attributes": {
        "import_from_url": "https://cdn.example.com/email-assets/hero-banner.jpg",
        "name": "hero-banner-jan2024"
      }
    }
  }'
```

**Method 2: Direct file upload (multipart/form-data)**

```bash
curl -X POST 'https://a.klaviyo.com/api/images/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --form 'file=@/path/to/image.jpg' \
  --form 'name=product-shot-featured' \
  --form 'hidden=false'
```

**Attributes:**
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `import_from_url` | string | Conditional | URL to import image from (use this OR file upload, not both) |
| `name` | string | No | Display name for the image |
| `hidden` | boolean | No | If `true`, image is hidden from the image library UI (default `false`) |

**Supported formats:** JPEG, PNG, GIF (including animated)

---

### PATCH /api/images/{id}/

Update image metadata (name, hidden status). Cannot replace the image file itself.

**Request Body:**

```json
{
  "data": {
    "type": "image",
    "id": "IMAGE_ID",
    "attributes": {
      "name": "updated-banner-name",
      "hidden": true
    }
  }
}
```

```bash
curl -X PATCH 'https://a.klaviyo.com/api/images/IMAGE_ID/' \
  --header 'Authorization: Klaviyo-API-Key pk_abc123' \
  --header 'revision: 2024-10-15' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": {
      "type": "image",
      "id": "IMAGE_ID",
      "attributes": { "name": "updated-banner-name", "hidden": true }
    }
  }'
```

---

## Rate Limits

| Endpoint Pattern                  | Burst | Steady |
| --------------------------------- | ----- | ------ |
| GET tags/tag-groups               | 10/s  | 150/m  |
| POST/PATCH/DELETE tags/tag-groups | 10/s  | 150/m  |
| Tag association POST/DELETE       | 10/s  | 150/m  |
| GET images                        | 10/s  | 150/m  |
| POST images (upload)              | 10/s  | 150/m  |
| PATCH images                      | 10/s  | 150/m  |

## Key Notes

- Tags must belong to a tag group. Every account has a default tag group.
- Exclusive tag groups enforce single-tag-per-resource: adding a new tag from an exclusive group automatically removes the previous tag from that group.
- Deleting a tag group cascades to delete all tags within it and all their resource associations.
- Tag names must be unique within their tag group but can be duplicated across different groups.
- Images uploaded via the API are available in the Klaviyo email template editor image library.
- The `image_url` returned in image responses is a CDN URL that can be used directly in email HTML.
- Images cannot be deleted via the API; set `hidden: true` to remove them from the library view.
- All GET endpoints are read-only. POST, PATCH, DELETE endpoints are action mode.
