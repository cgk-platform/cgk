# Gap Remediation: OAuth Integrations (Meta, Google, TikTok, Klaviyo)

> **Execution**: Can run in parallel with other prompts
> **Priority**: CRITICAL
> **Estimated Phases**: 1-2 new phase docs or major updates to existing

---
## ⚠️ CRITICAL: Read vs Write Locations

| Action | Location | Notes |
|--------|----------|-------|
| **READ FIRST** | `PLAN.md` and `PROMPT.md` in the plan folder | Understand existing architecture |
| **READ** | `/Users/holdenthemic/Documents/rawdog-web/src/` | RAWDOG source - DO NOT MODIFY |
| **WRITE** | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/` | Plan docs ONLY |

**Before writing, read existing docs to ensure your additions fit the planned architecture.**

**Files to update:**
- `PLAN.md` - Add feature section (must align with existing structure)
- `PROMPT.md` - Add implementation patterns
- `PHASE-XX-*.md` - Create new phase docs

**⛔ DO NOT modify any code files or anything outside MULTI-TENANT-PLATFORM-PLAN folder.**

---

## Context

While Shopify OAuth is fully documented with AES-256-GCM encryption and HMAC verification, the plan is **missing OAuth specifications** for Meta Ads, Google Ads, TikTok, and Klaviyo. These are critical ad platform integrations.

### Current RAWDOG Implementation

**Source files to reference:**
```
/Users/holdenthemic/Documents/rawdog-web/src/lib/meta-ads/
/Users/holdenthemic/Documents/rawdog-web/src/lib/google-ads/
/Users/holdenthemic/Documents/rawdog-web/src/lib/tiktok/
/Users/holdenthemic/Documents/rawdog-web/src/lib/klaviyo/
/Users/holdenthemic/Documents/rawdog-web/src/lib/integrations/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/integrations/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/meta-ads/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/google-ads/
```

**What exists in RAWDOG:**

**Meta Ads:**
- 40-scoped OAuth flow with token refresh
- Hourly/daily ad spend sync
- CAPI (Conversion API) for server-side tracking
- Session stitching (fbp, fbc, external_id)
- Regional spend breakdown
- Async report jobs

**Google Ads:**
- Google OAuth flow
- GAQL (Google Ads Query Language) queries
- Hourly/nightly spend sync
- Rate limiting implementation
- Regional spend tracking

**TikTok:**
- Pixel tracking
- Events API (server-side)
- Token refresh
- Spend sync

**Klaviyo:**
- Private + Public API keys
- List management
- Segment sync
- Product mappings

---

## Your Task

### 1. Explore the RAWDOG OAuth Implementations

For each platform, document:
- OAuth flow (authorization URL, callback, scopes)
- Token storage pattern
- Token refresh mechanism
- Multi-tenant credential isolation
- Admin connection UI

### 2. Update Master Documents

**PLAN.md updates:**
- Add OAuth integration specifications
- Add to Brand Onboarding wizard (Step 4+)

**PROMPT.md updates:**
- Add OAuth flow patterns
- Add token encryption patterns
- Add multi-tenant credential patterns

### 3. Update/Create Phase Documents

**Option A**: Create dedicated OAuth phase:
```
PHASE-2PO-OAUTH-INTEGRATIONS.md
- Standardized OAuth flow pattern
- Meta Ads OAuth (scopes, flow, UI)
- Google Ads OAuth (scopes, flow, UI)
- TikTok OAuth (scopes, flow, UI)
- Klaviyo connection (API key pattern)
- Token encryption and storage
- Token refresh strategy
- Admin connection UIs
- Error handling and recovery
```

**Option B**: Update existing onboarding spec with OAuth steps:
- BRAND-ONBOARDING-SPEC: Add Steps 4-7 for ad platforms
- Include admin UI mockups
- Include connection verification

---

## OAuth Flow Pattern to Document

For each OAuth provider, specify:

```markdown
### [Provider] OAuth

**Authorization Flow:**
- Authorization URL
- Required scopes
- State/HMAC verification pattern
- Callback handling

**Token Management:**
- Access token storage (encrypted)
- Refresh token storage
- Token expiration handling
- Automatic refresh strategy

**Multi-Tenant Isolation:**
- Per-tenant credential storage
- Tenant-scoped API calls
- Cross-tenant protection

**Admin UI:**
- Connection initiation button
- Connection status display
- Account selection (for multi-account)
- Disconnect/reconnect flow

**Error Handling:**
- Token revocation detection
- Rate limit handling
- Connection failure recovery
```

---

## Non-Negotiable Requirements

You MUST document:
- Meta Ads: Full OAuth with 40 scopes, CAPI integration
- Google Ads: OAuth with GAQL support
- TikTok: OAuth with Events API
- Klaviyo: API key connection pattern
- Token encryption (AES-256-GCM like Shopify)
- Admin connection UIs for all platforms
- Brand onboarding wizard integration

---

## Validation

- [ ] All 4 platforms have OAuth/connection specs
- [ ] Token encryption pattern documented
- [ ] Admin UI mockups or descriptions
- [ ] Onboarding wizard steps added
- [ ] Error handling documented
- [ ] Multi-tenant isolation addressed

---

## Output Checklist

- [ ] PLAN.md updated with OAuth section
- [ ] PROMPT.md updated with OAuth patterns
- [ ] BRAND-ONBOARDING-SPEC updated with ad platform steps
- [ ] New phase doc or existing phase updates
- [ ] Admin UI specifications added
