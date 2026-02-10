# Gap Remediation: Integrations Admin Pages - Complete System

> **Execution**: Can run in parallel with other prompts
> **Priority**: HIGH
> **Estimated Phases**: 1-2 focused phase docs

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

RAWDOG has a comprehensive Integrations section with admin pages for each integration. This prompt documents ALL integration admin pages.

---

## Complete Integrations Admin Pages

```
/admin/integrations
├── (overview)                   # Integration hub
├── /sms                         # SMS/Voice (Retell)
│   ├── /audit-log               # SMS audit log
│   └── /notifications           # SMS notifications
├── /slack                       # Slack integration
├── /shopify-app                 # Shopify app config
├── /klaviyo                     # Klaviyo email
├── /yotpo                       # Yotpo reviews
└── /tiktok-ads                  # TikTok ads

/admin/mcp
├── (dashboard)                  # MCP server status
├── /analytics                   # MCP usage analytics
└── /oauth-callback              # OAuth callback handler

/admin/meta-ads                  # Meta Ads configuration

/admin/google-ads                # Google Ads configuration
```

**Source files:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/integrations/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/mcp/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/meta-ads/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/google-ads/
```

---

## Integration Overview Page (/admin/integrations)

**Purpose**: Central hub for all third-party integrations

**Display**:
- Integration cards with status (connected, disconnected, error)
- Quick connect buttons
- Health indicators
- Last sync timestamps

**Integrations shown**:
- Shopify (connection status, scopes)
- Slack (workspace connected)
- Meta Ads (account connected)
- Google Ads (account connected)
- TikTok Ads (pixel status)
- Klaviyo (API key status)
- Yotpo (connection status)
- SMS/Retell (configuration status)
- MCP Server (server status)

---

## Individual Integration Pages

### SMS/Voice (/admin/integrations/sms)
- Retell voice AI configuration
- Phone number management
- Audit log of calls
- Notification settings

### Slack (/admin/integrations/slack)
- Workspace connection
- Channel configuration
- Bot permissions
- Notification routing

### Shopify App (/admin/integrations/shopify-app)
- App installation status
- Scope verification
- Webhook configuration
- App embed status

### Klaviyo (/admin/integrations/klaviyo)
- API key configuration
- List management
- Segment sync status
- Product mapping

### Yotpo (/admin/integrations/yotpo)
- API credentials
- Review sync status
- Widget configuration
- Product mapping

### TikTok Ads (/admin/integrations/tiktok-ads)
- Pixel configuration
- Events API setup
- Conversion tracking
- Account connection

### MCP Server (/admin/mcp)
- Server status dashboard
- Tool availability
- Usage analytics
- OAuth client management

### Meta Ads (/admin/meta-ads)
- Account connection
- Pixel configuration
- CAPI setup
- Spend sync status

### Google Ads (/admin/google-ads)
- Account connection
- Conversion tracking
- Spend sync status
- GAQL query tools

---

## Your Task

### 1. Explore All Integration Pages

Document each integration's:
- Configuration options
- Connection flow
- Status indicators
- Admin actions

### 2. Create Phase Document

```
PHASE-2P-INTEGRATIONS-ADMIN.md

## Integration Hub
- Central status dashboard
- Quick connect flows
- Health monitoring

## Communication Integrations
- Slack configuration
- SMS/Retell setup
- Notification routing

## E-Commerce Integrations
- Shopify App management
- Klaviyo email sync
- Yotpo reviews

## Advertising Integrations
- Meta Ads connection
- Google Ads connection
- TikTok Ads setup

## Platform Integrations
- MCP Server management
- OAuth client configuration
- Usage analytics
```

---

## Cross-Reference with Prompt 17 (OAuth)

Prompt 17 covers OAuth flows. This prompt covers the **admin UI for managing those integrations** after they're connected.

---

## Non-Negotiable Requirements

- Integration hub/overview page
- Individual page for each integration
- Connection status indicators
- Configuration management
- Multi-tenant credential isolation

---

## Output Checklist

- [ ] All integration pages documented
- [ ] Connection flows specified
- [ ] Configuration options listed
- [ ] Health monitoring included
- [ ] Multi-tenant isolation addressed
