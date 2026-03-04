---
name: klaviyo
description: >
  Complete Klaviyo API reference for email marketing, SMS campaigns, profiles,
  lists, segments, flows, templates, catalogs, coupons, metrics, reporting,
  and all Klaviyo REST API operations. Read for ANY Klaviyo marketing work.
triggers:
  - 'klaviyo'
  - 'klaviyo email'
  - 'klaviyo sms'
  - 'email campaign'
  - 'email marketing'
  - 'sms campaign'
  - 'email list'
  - 'email segment'
  - 'email flow'
  - 'email template'
  - 'subscriber list'
  - 'email subscribers'
  - 'klaviyo profile'
  - 'klaviyo metrics'
  - 'klaviyo reporting'
  - 'klaviyo catalog'
  - 'klaviyo coupon'
  - 'email automation'
  - 'email analytics'
  - 'klaviyo webhook'
  - 'klaviyo tag'
  - 'email suppression'
  - 'bulk email'
  - 'email subscribe'
  - 'klaviyo api'
metadata:
  openclaw:
    emoji: '📧'
    requires:
      env:
        - KLAVIYO_API_KEY
---

# Klaviyo API Skill

Full Klaviyo REST API access covering ~268 endpoints across 20 categories: profiles, campaigns, flows, lists, segments, templates, catalogs, coupons, metrics, reporting, events, tags, images, forms, reviews, webhooks, tracking settings, and data privacy.

---

## Mode System

### READ-ONLY Mode (Default)

The skill starts in **read-only mode**. Only GET requests are allowed (~149 endpoints).

Allowed operations:

- View profiles, lists, segments, campaigns, flows, templates
- Check campaign/flow performance via reporting endpoints
- Read metrics, events, catalogs, coupons, tags
- View account info, forms, reviews, webhooks, tracking settings

If a user requests a write operation, respond:

> "Klaviyo is in read-only mode. To unlock write operations, say **'enable klaviyo actions'**."

### ACTION Mode (User Opt-In Only)

Unlocked ONLY when user explicitly says one of:

- `"enable klaviyo actions"`
- `"klaviyo write mode"`
- `"klaviyo action mode"`

This unlocks ~119 additional write endpoints:

| Action Type               | Examples                                                                    |
| ------------------------- | --------------------------------------------------------------------------- |
| **Create**                | New profiles, campaigns, flows, lists, segments, templates, coupons, events |
| **Update**                | Edit profiles, campaigns, flow statuses, templates, tags                    |
| **Delete**                | Remove profiles, campaigns, lists, segments, templates, coupons             |
| **Send**                  | Send campaigns, manage campaign send jobs                                   |
| **Subscribe/Unsubscribe** | Bulk subscribe/unsubscribe profiles to email/SMS/push                       |
| **Suppress/Unsuppress**   | Block/unblock email delivery to profiles                                    |
| **Bulk Operations**       | Bulk import profiles, bulk create catalog items/variants/coupons            |
| **Privacy**               | GDPR/CCPA deletion requests                                                 |

On enable, respond:

> "Klaviyo action mode enabled. I can now create, update, delete, and send. I'll confirm destructive actions before executing."

Disable with: `"disable klaviyo actions"` or `"klaviyo read-only"`

### Safety Guardrails (Even in Action Mode)

Always require explicit user confirmation before:

1. **Campaign sends** — Show recipient estimation first
2. **Bulk deletes** — Show count of affected resources
3. **Profile suppression** — Warn that email delivery will be blocked
4. **Data privacy deletion** — Warn this is IRREVERSIBLE (GDPR/CCPA)
5. **List/segment deletion** — Warn about associated flow triggers that may break
6. **Bulk unsubscribes** — Show count and confirm intent

---

## Brand Context & Email Content Rules

### MANDATORY: Read Brand Context Before Creating Any Content

Before writing email subject lines, body copy, designing templates, or creating campaigns, you **MUST** read the brand files for context:

1. Read `workspace/brand/copy-guidelines.md` — brand voice, tone, language rules, dos/don'ts
2. Read `workspace/brand/colors.md` — brand color palette (hex codes for backgrounds, text, accents, CTAs)
3. Read `workspace/brand/typography.md` — font families, sizes, weights for headings/body/CTAs
4. Read `workspace/brand/design-rules.md` — layout constraints, spacing, visual hierarchy rules
5. Read `workspace/brand/imagery.md` — photography style, product image guidelines
6. Check `workspace/MEMORY.md` — recent email learnings, performance notes, strategic context

**All email copy generation MUST use Claude Opus 4.6** (`anthropic/claude-opus-4-6`). Never draft email copy with a smaller/faster model. Email copy quality directly impacts open rates, click rates, and revenue.

### Email Campaign Creation Workflow

When the user asks to create an email campaign, follow these steps:

**Step 1 — Brand Context (see above).** Read brand files before writing anything.

**Step 2 — Audit Existing Campaigns.** Before creating new content:

```bash
python3 scripts/klaviyo_api_helper.py get-campaigns --channel email
python3 scripts/klaviyo_api_helper.py get-templates
```

- Review existing campaigns for naming conventions, audience patterns, and send strategies
- Review existing templates for HTML structure and styling patterns to stay consistent

**Step 3 — Create or Select Template.** Either:

- Clone an existing high-performing template: `clone-template --id TEMPLATE_ID`
- Create a new CODE template with brand-compliant HTML (see HTML Email Styling below)
- Use an existing template by referencing its ID

**Step 4 — Write Email Content.** Using Claude Opus 4.6:

- **Subject line:** 40-60 chars, brand voice, create urgency or curiosity
- **Preview text:** Complement (don't repeat) the subject line, 40-90 chars
- **Body copy:** Follow brand copy guidelines, clear CTA hierarchy, mobile-first
- **CTA buttons:** Action-oriented text, brand accent color, sufficient padding

**Step 5 — Build Campaign.**

```bash
python3 scripts/klaviyo_api_helper.py create-campaign \
  --name "Campaign Name — YYYY-MM-DD" \
  --list-id LIST_ID \
  --subject "Subject Line" \
  --from-email FROM_EMAIL \
  --mode action
```

- Assign the template to the campaign message
- Set audience (included lists/segments, excluded segments)
- Configure send strategy (immediate, scheduled, or smart send time)

**Step 6 — Review & Confirm.** Before sending:

- Render template preview: `render-template --id TEMPLATE_ID`
- Estimate recipients: create a recipient estimation job
- Show the user: subject, preview text, audience size, send time, template preview
- Get explicit user confirmation before sending

### Flow Creation Workflow

When the user asks to create or modify an automation flow:

**Step 1 — Brand Context.** Same as campaigns — read brand files first.

**Step 2 — Audit Existing Flows.**

```bash
python3 scripts/klaviyo_api_helper.py get-flows
```

- Check for existing flows that might conflict (e.g., duplicate welcome series)
- Review flow naming conventions

**Step 3 — Design Flow Structure.** Present the user with:

- **Trigger type:** List subscription, segment entry, metric/event, price drop, or date property
- **Message sequence:** Number of emails/SMS, timing between messages
- **Conditional splits:** VIP vs. new customer, engaged vs. unengaged, etc.
- **Time delays:** Between each action

**Step 4 — Create Flow.**

```bash
python3 scripts/klaviyo_api_helper.py create-flow \
  --name "Flow Name" \
  --trigger-type list \
  --trigger-id LIST_ID \
  --mode action
```

- Create in `draft` status first (NEVER create as `live` without user approval)
- Add flow actions (emails, SMS, delays, splits) one at a time
- Write email content for each flow message using brand guidelines

**Step 5 — Review & Activate.**

- Show the complete flow structure to the user
- Get explicit confirmation before setting status to `live`

### HTML Email Template Styling

When creating HTML email templates, apply the brand design system:

**Layout principles:**

- Single-column layout for mobile-first (max-width: 600px)
- Use `<table>` elements for email-safe layout (not CSS grid/flexbox)
- Inline all CSS (email clients strip `<style>` blocks inconsistently)

**Brand styling (read from `workspace/brand/`):**

- Background colors, text colors, accent colors from `colors.md`
- Font stacks from `typography.md` (always include web-safe fallbacks)
- CTA button styling: brand accent color, rounded corners, sufficient padding (12px 24px minimum)
- Image guidelines from `imagery.md`

**Template structure:**

```html
<!-- Preheader (hidden preview text) -->
<div style="display:none;max-height:0;overflow:hidden;">Preview text here</div>

<!-- Main wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#BRAND_BG;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
        <!-- Logo header -->
        <!-- Hero image/section -->
        <!-- Body copy -->
        <!-- CTA button -->
        <!-- Footer with unsubscribe -->
      </table>
    </td>
  </tr>
</table>
```

**Required elements:**

- Logo in header (link to homepage)
- Unsubscribe link in footer (Klaviyo handles this with `{% unsubscribe %}` tag)
- Physical mailing address in footer (CAN-SPAM compliance)
- View in browser link (optional but recommended)

**Klaviyo template tags (for personalization):**

- `{{ first_name|default:"" }}` — First name with fallback
- `{{ email }}` — Recipient email
- `{% if ... %}` / `{% endif %}` — Conditional content
- `{{ event.ProductName }}` — Event property (in flow emails)
- `{% catalog item.url %}` — Catalog product link
- `{{ organization.name }}` — Brand name

### Visual Design → Email Workflow (Figma, Screenshots, Mockups)

When the user pastes a visual design (Figma export, screenshot, mockup image), follow this workflow:

**Step 1 — Analyze the visual.**

- Describe the layout structure (header, hero, sections, CTA placement, footer)
- Extract colors (map to brand palette from `workspace/brand/email-design-system.md`)
- Identify typography choices (map to brand font stack)
- Note image placement, dimensions, and content
- Identify CTA button styles, copy, and placement

**Step 2 — Load brand assets.**

- Read `workspace/brand/email-design-system.md` for:
  - Logo CDN URL (Common Assets & URLs section)
  - Color hex codes (Color Palette section)
  - Button styles (CTA Buttons section)
  - Header/footer HTML patterns
  - Social icon URLs
- Read `workspace/brand/colors.md` and `workspace/brand/typography.md` for brand alignment

**Step 3 — Build email HTML.**

- Use table-based layout (`<table>`, NOT CSS grid/flexbox)
- Max width: 600px, single-column for mobile-first
- Inline ALL CSS (email clients strip `<style>` blocks)
- Use brand logo CDN URL in header (NOT placeholder)
- Use actual brand footer HTML (unsubscribe, social icons, legal)
- For images from the design that need hosting: upload via `POST /api/images` or ask user to provide hosted URLs
- Apply Klaviyo template tags for personalization (`{{ first_name }}`, etc.)
- Include hidden preheader div for preview text

**Step 4 — Create Klaviyo template.**

```bash
python3 scripts/klaviyo_api_helper.py create-template \
  --name "Template Name — YYYY-MM-DD" \
  --html "<full HTML>" \
  --mode action
```

- Creates a CODE template (raw HTML, full control)
- Show the user a text description of the rendered result
- If the design requires images the user hasn't provided, flag them clearly

**Step 5 — Iterate.**

- Present what was built vs. the original design
- Call out any compromises (email client limitations vs. Figma design)
- Common email limitations to flag:
  - No CSS `position`, `float`, `flexbox`, `grid`
  - No `background-image` in Outlook (use VML fallback or skip)
  - No web fonts in most clients (falls back to system fonts)
  - No `border-radius` on `<td>` in Outlook
  - Max 3 columns in table layouts for mobile compatibility
- Adjust based on user feedback

### Email Copy Rules (MANDATORY)

These rules apply whenever writing email content — campaigns, flows, or templates:

1. **Ground copy in brand context.** Every subject line, body paragraph, and CTA must reflect:
   - Brand voice from `workspace/brand/copy-guidelines.md`
   - Real product details from brand files
   - Design constraints from `workspace/brand/design-rules.md`

2. **No hallucinated claims.** Never invent product benefits, discount amounts, or statistics not provided by the user or found in brand files. If unsure, ask.

3. **Subject line rules:**
   - 40-60 characters for optimal mobile display
   - No ALL CAPS (triggers spam filters)
   - Use personalization when appropriate: `{{ first_name }}`
   - A/B test variants when possible (Klaviyo supports this natively)

4. **Mobile-first design:**
   - Body text: 16px minimum
   - CTA buttons: minimum 44px tap target height
   - Single-column layout
   - Images: include alt text, use `width="100%" style="max-width:600px"`

5. **Deliverability:**
   - Text-to-image ratio: at least 60% text, 40% images
   - Always include plain text version
   - Avoid spam trigger words in subject lines (FREE!!!, Act Now, Limited Time)
   - Use Klaviyo's Smart Sending to avoid over-mailing

---

## Environment Variables

| Variable               | Required | Description                                      | Example        |
| ---------------------- | -------- | ------------------------------------------------ | -------------- |
| `KLAVIYO_API_KEY`      | Yes      | Private API key from Klaviyo Settings > API Keys | `pk_abc123...` |
| `KLAVIYO_API_REVISION` | No       | API revision date (default: `2024-10-15`)        | `2024-10-15`   |

The `.env` file is at the skill root. The helper script auto-loads it.

---

## API Overview

### Base URL

```
https://a.klaviyo.com/api/
```

### Authentication

All requests use a private API key in the header:

```
Authorization: Klaviyo-API-Key {KLAVIYO_API_KEY}
```

### Revision Header (Required)

Every request MUST include the API revision header:

```
revision: 2024-10-15
```

This pins your request to a specific API version. Without it, requests will fail.

### JSON:API Specification

Klaviyo uses the [JSON:API](https://jsonapi.org/) specification. Key concepts:

**Request format:**

```json
{
  "data": {
    "type": "resource-type",
    "attributes": { ... },
    "relationships": { ... }
  }
}
```

**Response format:**

```json
{
  "data": {
    "type": "resource-type",
    "id": "abc123",
    "attributes": { ... },
    "relationships": { ... },
    "links": { "self": "..." }
  },
  "links": { "self": "...", "next": "...", "prev": "..." }
}
```

**Collection responses** have `data` as an array. **Single resource** responses have `data` as an object.

### Content-Type

For POST/PATCH/PUT requests:

```
Content-Type: application/vnd.api+json
```

For GET requests, no Content-Type header is needed.

---

## Quick Reference Table

| #   | Category           | Read (GET) | Write (POST/PATCH/DELETE) | Reference                       |
| --- | ------------------ | ---------- | ------------------------- | ------------------------------- |
| 1   | Accounts           | 2          | 0                         | `02-accounts.md`                |
| 2   | Profiles           | 8          | 19                        | `03-profiles.md`                |
| 3   | Lists              | 8          | 7                         | `04-lists-and-segments.md`      |
| 4   | Segments           | 8          | 0                         | `04-lists-and-segments.md`      |
| 5   | Campaigns          | 8          | 10                        | `05-campaigns.md`               |
| 6   | Flows              | 10         | 9                         | `06-flows.md`                   |
| 7   | Templates          | 6          | 9                         | `07-templates.md`               |
| 8   | Events             | 5          | 3                         | `08-events-and-metrics.md`      |
| 9   | Metrics            | 8          | 8                         | `08-events-and-metrics.md`      |
| 10  | Catalog Items      | 12         | 16                        | `09-catalogs.md`                |
| 11  | Catalog Variants   | 10         | 12                        | `09-catalogs.md`                |
| 12  | Catalog Categories | 8          | 10                        | `09-catalogs.md`                |
| 13  | Coupons            | 6          | 9                         | `10-coupons.md`                 |
| 14  | Reporting          | 7          | 0                         | `11-reporting.md`               |
| 15  | Tags               | 10         | 10                        | `12-tags-and-images.md`         |
| 16  | Images             | 4          | 4                         | `12-tags-and-images.md`         |
| 17  | Forms              | 6          | 0                         | `13-forms-reviews-webhooks.md`  |
| 18  | Reviews            | 2          | 0                         | `13-forms-reviews-webhooks.md`  |
| 19  | Webhooks           | 5          | 7                         | `13-forms-reviews-webhooks.md`  |
| 20  | Data Privacy       | 0          | 2                         | `14-data-privacy-and-client.md` |
|     | **Totals**         | **~149**   | **~119**                  |                                 |

---

## Common Read Operations

### Get Account Info

```bash
curl -s "https://a.klaviyo.com/api/accounts/" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15"
```

Or via helper:

```bash
python3 scripts/klaviyo_api_helper.py get-account
```

### Search Profile by Email

```bash
curl -s "https://a.klaviyo.com/api/profiles/?filter=equals(email,\"user@example.com\")" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15"
```

Or via helper:

```bash
python3 scripts/klaviyo_api_helper.py search-profile --email user@example.com
```

### Get All Lists

```bash
curl -s "https://a.klaviyo.com/api/lists/" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15"
```

Or via helper:

```bash
python3 scripts/klaviyo_api_helper.py get-lists
```

### Get Campaigns

```bash
curl -s "https://a.klaviyo.com/api/campaigns/?filter=equals(messages.channel,\"email\")" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15"
```

Or via helper:

```bash
python3 scripts/klaviyo_api_helper.py get-campaigns --channel email
```

### Get Flows

```bash
curl -s "https://a.klaviyo.com/api/flows/" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15"
```

Or via helper:

```bash
python3 scripts/klaviyo_api_helper.py get-flows
```

### Get Segments

```bash
curl -s "https://a.klaviyo.com/api/segments/" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15"
```

Or via helper:

```bash
python3 scripts/klaviyo_api_helper.py get-segments
```

### Get Metrics

```bash
curl -s "https://a.klaviyo.com/api/metrics/" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15"
```

Or via helper:

```bash
python3 scripts/klaviyo_api_helper.py get-metrics
```

### Get Templates

```bash
curl -s "https://a.klaviyo.com/api/templates/" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15"
```

Or via helper:

```bash
python3 scripts/klaviyo_api_helper.py get-templates
```

### Get Events (Recent Activity)

```bash
curl -s "https://a.klaviyo.com/api/events/?sort=-datetime" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15"
```

Or via helper:

```bash
python3 scripts/klaviyo_api_helper.py get-events --sort -datetime
```

### Get Tags

```bash
curl -s "https://a.klaviyo.com/api/tags/" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15"
```

Or via helper:

```bash
python3 scripts/klaviyo_api_helper.py get-tags
```

---

## Common Action Operations (ACTION MODE ONLY)

> These operations require action mode. Enable with: `"enable klaviyo actions"`

### Create a Profile

```bash
curl -s -X POST "https://a.klaviyo.com/api/profiles/" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "profile",
      "attributes": {
        "email": "user@example.com",
        "first_name": "Jane",
        "last_name": "Doe",
        "phone_number": "+15551234567"
      }
    }
  }'
```

Or via helper:

```bash
python3 scripts/klaviyo_api_helper.py create-profile \
  --email user@example.com \
  --first-name Jane \
  --last-name Doe \
  --mode action
```

### Subscribe Profiles to a List

```bash
curl -s -X POST "https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "profile-subscription-bulk-create-job",
      "attributes": {
        "profiles": {
          "data": [
            { "type": "profile", "attributes": { "email": "user@example.com" } }
          ]
        }
      },
      "relationships": {
        "list": {
          "data": { "type": "list", "id": "LIST_ID" }
        }
      }
    }
  }'
```

Or via helper:

```bash
python3 scripts/klaviyo_api_helper.py subscribe-profiles \
  --list-id LIST_ID \
  --emails user@example.com \
  --mode action
```

### Create a Campaign

```bash
curl -s -X POST "https://a.klaviyo.com/api/campaigns/" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "campaign",
      "attributes": {
        "name": "Spring Sale",
        "audiences": {
          "included": [{ "type": "list", "id": "LIST_ID" }],
          "excluded": []
        },
        "campaign-messages": {
          "data": [{
            "type": "campaign-message",
            "attributes": {
              "channel": "email",
              "label": "Spring Sale Email",
              "content": {
                "subject": "Spring Sale - 20% Off!",
                "from_email": "hello@example.com",
                "from_label": "Your Brand"
              }
            }
          }]
        },
        "send_strategy": {
          "method": "immediate"
        }
      }
    }
  }'
```

Or via helper:

```bash
python3 scripts/klaviyo_api_helper.py create-campaign \
  --name "Spring Sale" \
  --list-id LIST_ID \
  --subject "Spring Sale - 20% Off!" \
  --from-email hello@example.com \
  --mode action
```

### Send a Campaign (REQUIRES CONFIRMATION)

```bash
curl -s -X POST "https://a.klaviyo.com/api/campaign-send-jobs/" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "campaign-send-job",
      "id": "CAMPAIGN_ID"
    }
  }'
```

Or via helper:

```bash
python3 scripts/klaviyo_api_helper.py send-campaign \
  --campaign-id CAMPAIGN_ID \
  --mode action
```

### Track a Custom Event

```bash
curl -s -X POST "https://a.klaviyo.com/api/events/" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "event",
      "attributes": {
        "metric": {
          "data": { "type": "metric", "attributes": { "name": "Viewed Product" } }
        },
        "profile": {
          "data": { "type": "profile", "attributes": { "email": "user@example.com" } }
        },
        "properties": {
          "ProductName": "Super Greens",
          "ProductID": "SKU-001",
          "Price": 39.99
        }
      }
    }
  }'
```

Or via helper:

```bash
python3 scripts/klaviyo_api_helper.py create-event \
  --metric "Viewed Product" \
  --email user@example.com \
  --properties '{"ProductName":"Super Greens","Price":39.99}' \
  --mode action
```

### Add Profiles to a List

```bash
curl -s -X POST "https://a.klaviyo.com/api/lists/LIST_ID/relationships/profiles/" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": [
      { "type": "profile", "id": "PROFILE_ID_1" },
      { "type": "profile", "id": "PROFILE_ID_2" }
    ]
  }'
```

Or via helper:

```bash
python3 scripts/klaviyo_api_helper.py add-to-list \
  --list-id LIST_ID \
  --profile-ids PROFILE_ID_1 PROFILE_ID_2 \
  --mode action
```

---

## Rate Limits

Klaviyo uses a tiered rate limit system. Limits are returned in response headers:

```
X-Klaviyo-RateLimit-Retry-After: <seconds>
```

### Rate Limit Tiers

| Tier   | Burst (per second) | Steady (per minute) | Endpoints                                             |
| ------ | ------------------ | ------------------- | ----------------------------------------------------- |
| **XS** | 1/s                | 15/min              | Data privacy deletion requests                        |
| **S**  | 3/s                | 60/min              | Campaign send, bulk imports, reporting                |
| **M**  | 10/s               | 150/min             | Profile CRUD, list management, event creation         |
| **L**  | 10/s               | 700/min             | Most GET endpoints (profiles, lists, campaigns, etc.) |
| **XL** | 75/s               | 700/min             | High-volume reads (events, metrics)                   |

### Reporting Daily Limits

- Campaign performance reports: **225 requests/day**
- Flow performance reports: **225 requests/day**
- Form performance reports: **225 requests/day**
- Segment performance reports: **225 requests/day**

### Rate Limit Response

When rate limited, the API returns HTTP `429`:

```json
{
  "errors": [
    {
      "id": "...",
      "status": 429,
      "code": "throttled",
      "title": "Throttled",
      "detail": "Request was throttled.",
      "meta": {}
    }
  ]
}
```

**Retry strategy:** Wait for the duration in the `Retry-After` header. The helper script handles this automatically with exponential backoff.

---

## Pagination & Filtering

### Cursor-Based Pagination

Klaviyo uses cursor-based pagination. Collection responses include a `links` object:

```json
{
  "data": [...],
  "links": {
    "self": "https://a.klaviyo.com/api/profiles/",
    "next": "https://a.klaviyo.com/api/profiles/?page[cursor]=abc123",
    "prev": null
  }
}
```

To paginate, follow the `links.next` URL. When `links.next` is `null`, you've reached the last page.

**Page size:** Use `page[size]=N` (default 20, max varies by endpoint, typically 100).

```
GET /api/profiles/?page[size]=100
```

The helper script supports `--all` flag for automatic full pagination.

### Filtering

Filter syntax: `filter=OPERATOR(FIELD,VALUE)`

**Operators:**

| Operator           | Example                                              | Description           |
| ------------------ | ---------------------------------------------------- | --------------------- |
| `equals`           | `filter=equals(email,"user@example.com")`            | Exact match           |
| `contains`         | `filter=contains(email,"@gmail.com")`                | Contains substring    |
| `greater-than`     | `filter=greater-than(datetime,2024-01-01T00:00:00Z)` | Greater than          |
| `less-than`        | `filter=less-than(datetime,2024-12-31T23:59:59Z)`    | Less than             |
| `greater-or-equal` | `filter=greater-or-equal(value,100)`                 | Greater than or equal |
| `less-or-equal`    | `filter=less-or-equal(value,50)`                     | Less than or equal    |
| `any`              | `filter=any(channel,["email","sms"])`                | Any of values         |
| `has`              | `filter=has(properties,"ProductName")`               | Has key               |

**Combining filters** with AND:

```
filter=and(greater-than(datetime,2024-01-01),less-than(datetime,2024-12-31))
```

### Sparse Fieldsets

Request only specific fields to reduce payload:

```
GET /api/profiles/?fields[profile]=email,first_name,last_name
```

### Include Related Resources

Include relationships in a single request:

```
GET /api/campaigns/CAMPAIGN_ID/?include=campaign-messages
GET /api/flows/FLOW_ID/?include=flow-actions
GET /api/lists/LIST_ID/?include=tags
```

Multiple includes:

```
GET /api/campaigns/?include=campaign-messages,tags
```

---

## Error Handling

### JSON:API Error Format

```json
{
  "errors": [
    {
      "id": "unique-error-id",
      "status": 400,
      "code": "invalid",
      "title": "Invalid input.",
      "detail": "The 'email' field is required.",
      "source": {
        "pointer": "/data/attributes/email"
      },
      "meta": {}
    }
  ]
}
```

### Common Error Codes

| HTTP Code | Meaning             | Common Cause                                             | Action                           |
| --------- | ------------------- | -------------------------------------------------------- | -------------------------------- |
| `400`     | Bad Request         | Invalid JSON, missing required fields, bad filter syntax | Fix request body/params          |
| `401`     | Unauthorized        | Invalid or missing API key                               | Check `KLAVIYO_API_KEY`          |
| `403`     | Forbidden           | API key lacks required scope                             | Check key permissions in Klaviyo |
| `404`     | Not Found           | Resource ID doesn't exist                                | Verify resource ID               |
| `405`     | Method Not Allowed  | Wrong HTTP method for endpoint                           | Check endpoint docs              |
| `409`     | Conflict            | Duplicate resource (e.g., profile with same email)       | Use update instead of create     |
| `429`     | Rate Limited        | Too many requests                                        | Wait per `Retry-After` header    |
| `500`     | Server Error        | Klaviyo internal error                                   | Retry after brief delay          |
| `503`     | Service Unavailable | Klaviyo maintenance                                      | Retry later                      |

### Retry Strategy

1. On `429`: Wait for `Retry-After` header value (seconds)
2. On `500`/`503`: Exponential backoff — 1s, 2s, 4s, max 3 retries
3. On `409` for profile creation: Search existing profile and update instead

---

## Reference File Routing Table

Use this table to find the right reference doc for any task:

| Task                                               | Reference File                  |
| -------------------------------------------------- | ------------------------------- |
| Authentication, API basics, JSON:API spec          | `01-auth-and-overview.md`       |
| Account information                                | `02-accounts.md`                |
| Profile lookup, create, update, merge, suppression | `03-profiles.md`                |
| Push tokens, profile subscriptions, bulk import    | `03-profiles.md`                |
| List CRUD, list membership                         | `04-lists-and-segments.md`      |
| Segment queries, segment membership                | `04-lists-and-segments.md`      |
| Campaign create, update, clone, send               | `05-campaigns.md`               |
| Campaign send jobs, recipient estimation           | `05-campaigns.md`               |
| Flow CRUD, flow actions, flow messages             | `06-flows.md`                   |
| Flow status management (draft/manual/live)         | `06-flows.md`                   |
| Template CRUD, render, clone                       | `07-templates.md`               |
| Universal content blocks                           | `07-templates.md`               |
| Events (track activity), custom metrics            | `08-events-and-metrics.md`      |
| Metric aggregates and queries                      | `08-events-and-metrics.md`      |
| Catalog items, variants, categories                | `09-catalogs.md`                |
| Bulk catalog jobs                                  | `09-catalogs.md`                |
| Coupons, coupon codes, bulk code creation          | `10-coupons.md`                 |
| Campaign/flow/form/segment reporting               | `11-reporting.md`               |
| Tags, tag groups, tag associations                 | `12-tags-and-images.md`         |
| Image upload and management                        | `12-tags-and-images.md`         |
| Forms, form versions                               | `13-forms-reviews-webhooks.md`  |
| Reviews                                            | `13-forms-reviews-webhooks.md`  |
| Webhooks, webhook topics                           | `13-forms-reviews-webhooks.md`  |
| Tracking settings                                  | `13-forms-reviews-webhooks.md`  |
| GDPR/CCPA data deletion                            | `14-data-privacy-and-client.md` |
| Client-side API (public key endpoints)             | `14-data-privacy-and-client.md` |

---

## Script Usage

The helper script is at `scripts/klaviyo_api_helper.py`. It auto-loads credentials from the skill `.env` file.

### General Syntax

```bash
python3 scripts/klaviyo_api_helper.py COMMAND [OPTIONS]
```

### Global Options

| Option        | Description                   | Default               |
| ------------- | ----------------------------- | --------------------- |
| `--mode`      | `read-only` or `action`       | `read-only`           |
| `--format`    | `json`, `table`, or `summary` | `summary`             |
| `--all`       | Paginate through all results  | Off (first page only) |
| `--page-size` | Results per page              | `20`                  |
| `--filter`    | Raw filter string             | None                  |

### Read Commands

```bash
# Account
python3 scripts/klaviyo_api_helper.py get-account

# Profiles
python3 scripts/klaviyo_api_helper.py get-profiles [--all] [--page-size 50]
python3 scripts/klaviyo_api_helper.py get-profile --id PROFILE_ID
python3 scripts/klaviyo_api_helper.py search-profile --email user@example.com

# Lists & Segments
python3 scripts/klaviyo_api_helper.py get-lists
python3 scripts/klaviyo_api_helper.py get-list-profiles --list-id LIST_ID [--all]
python3 scripts/klaviyo_api_helper.py get-segments
python3 scripts/klaviyo_api_helper.py get-segment-profiles --segment-id SEGMENT_ID [--all]

# Campaigns
python3 scripts/klaviyo_api_helper.py get-campaigns [--channel email|sms]
python3 scripts/klaviyo_api_helper.py get-campaign --id CAMPAIGN_ID

# Flows
python3 scripts/klaviyo_api_helper.py get-flows
python3 scripts/klaviyo_api_helper.py get-flow --id FLOW_ID

# Templates
python3 scripts/klaviyo_api_helper.py get-templates
python3 scripts/klaviyo_api_helper.py get-template --id TEMPLATE_ID

# Events & Metrics
python3 scripts/klaviyo_api_helper.py get-events [--sort -datetime] [--all]
python3 scripts/klaviyo_api_helper.py get-metrics
python3 scripts/klaviyo_api_helper.py query-metric-aggregates --metric-id METRIC_ID \
  --measurement count --interval day \
  --from 2024-01-01 --to 2024-12-31

# Catalogs
python3 scripts/klaviyo_api_helper.py get-catalogs
python3 scripts/klaviyo_api_helper.py get-catalog-items [--all]

# Coupons
python3 scripts/klaviyo_api_helper.py get-coupons

# Tags
python3 scripts/klaviyo_api_helper.py get-tags

# Reporting
python3 scripts/klaviyo_api_helper.py get-reports --type campaign \
  --statistics opens,clicks,revenue \
  --from 2024-01-01 --to 2024-12-31
```

### Action Commands (require `--mode action`)

```bash
# Profiles
python3 scripts/klaviyo_api_helper.py create-profile \
  --email user@example.com --first-name Jane --last-name Doe \
  --mode action

python3 scripts/klaviyo_api_helper.py update-profile \
  --id PROFILE_ID --first-name Janet \
  --mode action

# Subscriptions
python3 scripts/klaviyo_api_helper.py subscribe-profiles \
  --list-id LIST_ID --emails user1@example.com user2@example.com \
  --mode action

python3 scripts/klaviyo_api_helper.py unsubscribe-profiles \
  --list-id LIST_ID --emails user@example.com \
  --mode action

# List membership
python3 scripts/klaviyo_api_helper.py add-to-list \
  --list-id LIST_ID --profile-ids ID1 ID2 \
  --mode action

python3 scripts/klaviyo_api_helper.py remove-from-list \
  --list-id LIST_ID --profile-ids ID1 ID2 \
  --mode action

# Campaigns
python3 scripts/klaviyo_api_helper.py create-campaign \
  --name "My Campaign" --list-id LIST_ID \
  --subject "Subject Line" --from-email hello@example.com \
  --mode action

python3 scripts/klaviyo_api_helper.py update-campaign \
  --id CAMPAIGN_ID --name "Updated Name" \
  --mode action

python3 scripts/klaviyo_api_helper.py send-campaign \
  --campaign-id CAMPAIGN_ID \
  --mode action

# Events
python3 scripts/klaviyo_api_helper.py create-event \
  --metric "Event Name" --email user@example.com \
  --properties '{"key":"value"}' \
  --mode action

python3 scripts/klaviyo_api_helper.py bulk-create-events \
  --file events.json \
  --mode action

# Coupons
python3 scripts/klaviyo_api_helper.py create-coupon \
  --description "20% Off" --coupon-type percent --discount 20 \
  --mode action

python3 scripts/klaviyo_api_helper.py create-coupon-codes \
  --coupon-id COUPON_ID --quantity 100 --prefix "SPRING" \
  --mode action
```

---

## Common Pitfalls

### 1. Missing Revision Header

Every request must include `revision: 2024-10-15`. Without it, you'll get a `400` error. The helper script adds this automatically.

### 2. JSON:API Content-Type

Write requests must use `Content-Type: application/vnd.api+json`, NOT `application/json`. GET requests don't need a Content-Type.

### 3. Pagination Misunderstanding

Klaviyo uses **cursor-based** pagination, not page numbers. Always follow `links.next` — do not construct page URLs manually.

### 4. Filter Syntax

Filters use a function-like syntax: `equals(field,"value")`. Do NOT use query params like `?email=user@example.com`.

### 5. Rate Limit Bursts

Burst limits are per-second, steady limits are per-minute. Respect both. The helper script handles rate limiting automatically.

### 6. Profile Deduplication

Profiles are unique by email. Creating a profile with an existing email returns `409 Conflict`. Use the search-then-update pattern:

1. Search for profile by email
2. If found, update it
3. If not found, create it

### 7. Campaign Send is Irreversible

Once a campaign send job is created, it cannot be cancelled mid-delivery. Always verify the campaign, audience, and content before sending.

### 8. Reporting Daily Limits

Each reporting endpoint has a 225 requests/day limit. Plan report pulls carefully. Use date range aggregation instead of daily single-day queries when possible.

### 9. Sparse Fields Reduce Payload

For large datasets, always use `fields[type]=field1,field2` to request only needed fields. This dramatically reduces response size and improves performance.

### 10. Include Depth

The `include` parameter only goes one level deep. You cannot chain includes like `include=flow-actions.flow-messages`. Make separate requests for nested relationships.

---

## Reporting Patterns

### Campaign Performance

```bash
python3 scripts/klaviyo_api_helper.py get-reports --type campaign \
  --statistics opens,clicks,revenue,bounce_rate,unsubscribes \
  --from 2024-01-01 --to 2024-12-31 \
  --format table
```

Available campaign statistics: `opens`, `clicks`, `revenue`, `recipients`, `bounce_rate`, `unsubscribes`, `spam_complaints`, `unique_opens`, `unique_clicks`, `click_rate`, `open_rate`, `deliveries`, `delivery_rate`

### Flow Performance

```bash
python3 scripts/klaviyo_api_helper.py get-reports --type flow \
  --statistics opens,clicks,revenue \
  --from 2024-01-01 --to 2024-12-31
```

### Metric Aggregates (Custom Analytics)

For custom event tracking analytics:

```bash
python3 scripts/klaviyo_api_helper.py query-metric-aggregates \
  --metric-id METRIC_ID \
  --measurement count,sum,unique \
  --interval day \
  --from 2024-01-01 --to 2024-01-31 \
  --format table
```

**Measurements:** `count`, `sum`, `unique`, `value`
**Intervals:** `hour`, `day`, `week`, `month`

### Time Series Reporting

Use `--interval` with reporting for time series data:

```bash
# Daily campaign opens over a month
python3 scripts/klaviyo_api_helper.py get-reports --type campaign \
  --statistics opens,clicks \
  --from 2024-01-01 --to 2024-01-31 \
  --interval daily
```

---

## Default Output Formatting

When presenting Klaviyo data to users:

### Profile Display

```
Name: Jane Doe
Email: jane@example.com
Phone: +15551234567
Created: 2024-01-15
Lists: Newsletter, VIP Customers
```

### Campaign Summary

```
Campaign: Spring Sale
Status: Sent
Channel: Email
Sent: 2024-03-20 10:00 AM
Recipients: 15,432
Open Rate: 24.3%
Click Rate: 3.1%
Revenue: $4,521.00
```

### List Summary

```
List: Newsletter Subscribers
Profiles: 25,432
Created: 2023-06-15
Updated: 2024-03-20
```

### Flow Summary

```
Flow: Welcome Series
Status: Live
Trigger: List - Newsletter Subscribers
Actions: 4 emails, 1 SMS
Created: 2023-08-01
```

### Metric Summary Table

```
| Metric        | 7-Day  | 30-Day  | 90-Day   |
|---------------|--------|---------|----------|
| Emails Sent   | 5,234  | 22,100  | 68,430   |
| Opens         | 1,412  | 5,980   | 18,200   |
| Clicks        | 312    | 1,340   | 4,100    |
| Revenue       | $1,200 | $5,400  | $16,800  |
| Unsubscribes  | 23     | 98      | 310      |
```

When displaying lists of resources, use tables for 3+ items and inline for 1-2 items. Always include resource IDs for follow-up actions.

---

## PII Handling

- Never log or cache full email addresses, phone numbers, or other PII in plain text
- When displaying profiles, always include the profile ID for reference
- The helper script's `--format summary` mode truncates email addresses in output
- For bulk operations, show counts rather than listing all PII
- GDPR/CCPA deletion requests are irreversible — always confirm
