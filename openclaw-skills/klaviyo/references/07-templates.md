# Klaviyo API: Templates

The Templates API manages email templates and universal content blocks. Templates define
the HTML/text content used in campaigns and flow messages. Universal content blocks are
reusable content snippets shared across multiple templates.

## Template Endpoints

| Method | Path                          | Description             | Rate Tier |
| ------ | ----------------------------- | ----------------------- | --------- |
| GET    | `/api/templates/`             | List templates          | L         |
| GET    | `/api/templates/{id}/`        | Get template            | M         |
| POST   | `/api/templates/`             | Create template         | S         |
| PATCH  | `/api/templates/{id}/`        | Update template         | M         |
| DELETE | `/api/templates/{id}/`        | Delete template         | M         |
| POST   | `/api/templates/{id}/clone/`  | Clone template          | S         |
| POST   | `/api/templates/{id}/render/` | Render template preview | S         |

## Universal Content Endpoints

| Method | Path                                    | Description                   | Rate Tier |
| ------ | --------------------------------------- | ----------------------------- | --------- |
| GET    | `/api/template-universal-content/`      | List universal content blocks | L         |
| GET    | `/api/template-universal-content/{id}/` | Get universal content         | M         |
| POST   | `/api/template-universal-content/`      | Create universal content      | S         |
| PATCH  | `/api/template-universal-content/{id}/` | Update universal content      | M         |
| DELETE | `/api/template-universal-content/{id}/` | Delete universal content      | M         |

## Template Attributes

| Attribute     | Type   | Description                                             |
| ------------- | ------ | ------------------------------------------------------- |
| `name`        | string | Template display name                                   |
| `editor_type` | string | `CODE` (HTML editor) or `DRAG_AND_DROP` (visual editor) |
| `html`        | string | Full HTML content of the template                       |
| `text`        | string | Plain text version of the template                      |
| `created`     | string | ISO 8601 creation datetime (read-only)                  |
| `updated`     | string | ISO 8601 last updated datetime (read-only)              |

### Editor Types

| Type            | Description                                                |
| --------------- | ---------------------------------------------------------- |
| `CODE`          | Raw HTML template. Full control over markup.               |
| `DRAG_AND_DROP` | Visual editor template. HTML structure managed by Klaviyo. |

**Note:** `DRAG_AND_DROP` templates can be read and cloned via the API, but updating
their HTML directly may break the visual editor structure. Prefer editing drag-and-drop
templates through the Klaviyo UI.

## Universal Content Attributes

| Attribute    | Type   | Description                                |
| ------------ | ------ | ------------------------------------------ |
| `name`       | string | Block name                                 |
| `definition` | object | Content block definition and configuration |
| `html`       | string | HTML content of the block                  |
| `created`    | string | ISO 8601 creation datetime (read-only)     |
| `updated`    | string | ISO 8601 last updated datetime (read-only) |

---

## GET /api/templates/

List all templates with optional filtering and pagination.

### Request

```bash
curl -G "https://a.klaviyo.com/api/templates/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -d "fields[template]=name,editor_type,created,updated" \
  -d "filter=equals(editor_type,\"CODE\")" \
  -d "page[size]=25" \
  -d "sort=-updated"
```

### Filter Examples

```
filter=equals(editor_type,"CODE")
filter=equals(editor_type,"DRAG_AND_DROP")
filter=equals(name,"Welcome Email")
filter=greater-than(updated,2024-06-01T00:00:00Z)
```

### Response (200 OK)

```json
{
  "data": [
    {
      "type": "template",
      "id": "TMPL_welcome01",
      "attributes": {
        "name": "Welcome Email - New Subscriber",
        "editor_type": "CODE",
        "created": "2024-03-15T10:00:00+00:00",
        "updated": "2024-10-10T14:30:00+00:00"
      },
      "links": {
        "self": "https://a.klaviyo.com/api/templates/TMPL_welcome01/"
      }
    },
    {
      "type": "template",
      "id": "TMPL_promo02",
      "attributes": {
        "name": "Product Promo - Featured Product",
        "editor_type": "DRAG_AND_DROP",
        "created": "2024-05-20T08:00:00+00:00",
        "updated": "2024-09-28T16:00:00+00:00"
      },
      "links": {
        "self": "https://a.klaviyo.com/api/templates/TMPL_promo02/"
      }
    }
  ],
  "links": {
    "self": "https://a.klaviyo.com/api/templates/",
    "next": null,
    "prev": null
  }
}
```

---

## GET /api/templates/{id}/

Retrieve a single template including its full HTML and text content.

### Request

```bash
curl "https://a.klaviyo.com/api/templates/TMPL_welcome01/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15"
```

### Response (200 OK)

```json
{
  "data": {
    "type": "template",
    "id": "TMPL_welcome01",
    "attributes": {
      "name": "Welcome Email - New Subscriber",
      "editor_type": "CODE",
      "html": "<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body><h1>Welcome, {{ first_name|default:'Friend' }}!</h1><p>Thanks for joining us. Here is your 15% welcome discount:</p><p><strong>WELCOME15</strong></p><p><a href=\"{{ organization.url }}\">Shop Now</a></p></body></html>",
      "text": "Welcome, {{ first_name|default:'Friend' }}!\n\nThanks for joining us. Here is your 15% welcome discount: WELCOME15\n\nShop now: {{ organization.url }}",
      "created": "2024-03-15T10:00:00+00:00",
      "updated": "2024-10-10T14:30:00+00:00"
    },
    "links": {
      "self": "https://a.klaviyo.com/api/templates/TMPL_welcome01/"
    }
  }
}
```

---

## POST /api/templates/

Create a new template.

### Create a CODE Template

```bash
curl -X POST "https://a.klaviyo.com/api/templates/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "template",
      "attributes": {
        "name": "Flash Sale Announcement",
        "editor_type": "CODE",
        "html": "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>body{font-family:Arial,sans-serif;margin:0;padding:0;}.header{background-color:#2d5016;color:white;padding:20px;text-align:center;}.content{padding:30px;}.cta{display:inline-block;background-color:#4caf50;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;}</style></head><body><div class=\"header\"><h1>Flash Sale: {{ sale_percent }}% Off!</h1></div><div class=\"content\"><p>Hi {{ first_name|default:\"there\" }},</p><p>For the next 24 hours, enjoy {{ sale_percent }}% off our best-selling {{ product_name }}.</p><p><a href=\"{{ sale_url }}\" class=\"cta\">Shop the Sale</a></p></div></body></html>",
        "text": "Flash Sale: {{ sale_percent }}% Off!\n\nHi {{ first_name|default:\"there\" }},\n\nFor the next 24 hours, enjoy {{ sale_percent }}% off our best-selling {{ product_name }}.\n\nShop the sale: {{ sale_url }}"
      }
    }
  }'
```

### Response (201 Created)

```json
{
  "data": {
    "type": "template",
    "id": "TMPL_flash_sale03",
    "attributes": {
      "name": "Flash Sale Announcement",
      "editor_type": "CODE",
      "html": "<!DOCTYPE html>...",
      "text": "Flash Sale: {{ sale_percent }}% Off!...",
      "created": "2024-10-20T19:00:00+00:00",
      "updated": "2024-10-20T19:00:00+00:00"
    },
    "links": {
      "self": "https://a.klaviyo.com/api/templates/TMPL_flash_sale03/"
    }
  }
}
```

---

## PATCH /api/templates/{id}/

Update a template's name, HTML, or text content.

### Request

```bash
curl -X PATCH "https://a.klaviyo.com/api/templates/TMPL_flash_sale03/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "template",
      "id": "TMPL_flash_sale03",
      "attributes": {
        "name": "Flash Sale Announcement v2",
        "html": "<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body><h1>FLASH SALE</h1><p>{{ sale_percent }}% off {{ product_name }} - 24 hours only!</p><p><a href=\"{{ sale_url }}\">Shop Now</a></p></body></html>"
      }
    }
  }'
```

### Response (200 OK)

Returns the full updated template object.

---

## DELETE /api/templates/{id}/

Delete a template. Templates in use by active campaigns or flows cannot be deleted.

```bash
curl -X DELETE "https://a.klaviyo.com/api/templates/TMPL_flash_sale03/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15"
```

### Response (204 No Content)

---

## POST /api/templates/{id}/clone/

Clone a template to create a copy. Useful for creating variants.

### Request

```bash
curl -X POST "https://a.klaviyo.com/api/templates/TMPL_welcome01/clone/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "template",
      "id": "TMPL_welcome01",
      "attributes": {
        "name": "Welcome Email - A/B Test Variant B"
      }
    }
  }'
```

### Response (201 Created)

Returns a new template with a new ID and the specified name.

---

## POST /api/templates/{id}/render/

Render a template with sample data to preview how it will look. This is a read-only
preview and does not send any email.

### Request

```bash
curl -X POST "https://a.klaviyo.com/api/templates/TMPL_flash_sale03/render/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "template",
      "id": "TMPL_flash_sale03",
      "attributes": {
        "context": {
          "first_name": "Jane",
          "sale_percent": "30",
          "product_name": "Featured Collection",
          "sale_url": "https://example.com/sale"
        },
        "return_fields": ["html", "text"]
      }
    }
  }'
```

### Response (200 OK)

```json
{
  "data": {
    "type": "template",
    "id": "TMPL_flash_sale03",
    "attributes": {
      "html": "<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body><h1>FLASH SALE</h1><p>30% off Featured Collection - 24 hours only!</p><p><a href=\"https://example.com/sale\">Shop Now</a></p></body></html>",
      "text": "Flash Sale: 30% Off!\n\nHi Jane,\n\nFor the next 24 hours, enjoy 30% off our best-selling Featured Collection.\n\nShop the sale: https://example.com/sale"
    }
  }
}
```

---

## Universal Content Blocks

Universal content blocks are reusable snippets that can be inserted into multiple
templates. When a universal content block is updated, all templates using it reflect the
change automatically.

### GET /api/template-universal-content/

```bash
curl -G "https://a.klaviyo.com/api/template-universal-content/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -d "fields[template-universal-content]=name,html,created,updated"
```

### POST /api/template-universal-content/

Create a new universal content block.

```bash
curl -X POST "https://a.klaviyo.com/api/template-universal-content/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "template-universal-content",
      "attributes": {
        "name": "Email Footer - Standard",
        "definition": {
          "content_type": "html"
        },
        "html": "<div style=\"text-align:center;padding:20px;font-size:12px;color:#999;\"><p>Your Company Inc. | 123 Main St, Your City, ST 00000</p><p><a href=\"{{ manage_preferences_url }}\">Manage Preferences</a> | <a href=\"{{ unsubscribe_url }}\">Unsubscribe</a></p></div>"
      }
    }
  }'
```

### Response (201 Created)

```json
{
  "data": {
    "type": "template-universal-content",
    "id": "UC_footer01",
    "attributes": {
      "name": "Email Footer - Standard",
      "definition": { "content_type": "html" },
      "html": "<div style=\"text-align:center;padding:20px;font-size:12px;color:#999;\">...</div>",
      "created": "2024-10-20T20:00:00+00:00",
      "updated": "2024-10-20T20:00:00+00:00"
    }
  }
}
```

### PATCH /api/template-universal-content/{id}/

Update a universal content block. Changes propagate to all templates using it.

```bash
curl -X PATCH "https://a.klaviyo.com/api/template-universal-content/UC_footer01/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "template-universal-content",
      "id": "UC_footer01",
      "attributes": {
        "html": "<div style=\"text-align:center;padding:20px;font-size:12px;color:#999;\"><p>Your Company Inc. | 456 Commerce Blvd, Your City, ST 00000</p><p><a href=\"{{ manage_preferences_url }}\">Manage Preferences</a> | <a href=\"{{ unsubscribe_url }}\">Unsubscribe</a></p></div>"
      }
    }
  }'
```

### DELETE /api/template-universal-content/{id}/

Delete a universal content block. Templates currently using the block will retain their
last rendered version of the content.

```bash
curl -X DELETE "https://a.klaviyo.com/api/template-universal-content/UC_footer01/" \
  -H "Authorization: Klaviyo-API-Key pk_abc123def456" \
  -H "revision: 2024-10-15"
```

### Response (204 No Content)

---

## Usage Notes

- **Editor type is immutable.** Once a template is created as `CODE` or
  `DRAG_AND_DROP`, the editor type cannot be changed.
- **DRAG_AND_DROP caution:** Modifying the HTML of drag-and-drop templates via the API
  may corrupt the visual editor structure. Use the Klaviyo UI for visual templates.
- **Template variables:** Use Django-style template syntax: `{{ variable_name }}` for
  personalization. Filters are supported: `{{ first_name|default:"there" }}`.
- **Render endpoint** is read-only. It returns the rendered HTML/text with the provided
  context data substituted into template variables. No email is sent.
- **Universal content propagation:** Updates to universal content blocks take effect
  across all templates that reference them. Test changes carefully before updating
  production blocks.
- **Templates in use:** Attempting to delete a template that is actively referenced by
  a campaign or flow message will return an error. Remove the reference first.
- **Cloning** preserves the entire template structure including HTML, text, and editor
  type. Only the name is changed.
