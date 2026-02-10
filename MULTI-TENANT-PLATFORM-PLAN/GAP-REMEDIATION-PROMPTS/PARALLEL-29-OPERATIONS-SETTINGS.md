# Gap Remediation: Operations & Settings - SUPER ADMIN ONLY

> **Status**: ✅ COMPLETE (2025-02-10)
> **Execution**: Can run in parallel with other prompts
> **Priority**: MEDIUM
> **Estimated Phases**: 1 focused phase doc
> **IMPORTANT**: Operations/Logs/Health pages are SUPER ADMIN ONLY - NOT visible to tenant admins

## Completion Summary

**Already Documented (Super Admin Operations)**:
- `SUPER-ADMIN-ARCHITECTURE-2025-02-10.md` - Complete super admin/orchestrator dashboard spec
- `HEALTH-MONITORING-SPEC-2025-02-10.md` - 15+ service monitors, alerts, thresholds
- `LOGGING-SPEC-2025-02-10.md` - Structured logging, error aggregation
- `PHASE-2PO-HEALTH.md` - Phase implementation for health monitoring
- `PHASE-2PO-LOGGING.md` - Phase implementation for logging

**Newly Created**:
- `PHASE-2TS-TENANT-SETTINGS.md` - AI Settings, Payout Settings, Site Config
- `PLAN.md` - Updated with Tenant Admin Settings section and Access Control Matrix
- `INDEX.md` - Updated with new phase and parallelization map

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

The Operations section (/admin/ops) provides system-wide monitoring, error tracking, and health dashboards. These pages are for **platform super admins only** and should NOT be visible to individual tenant admins. Tenant admins should only see their own settings pages.

---

## Super Admin Dashboard - WHAT We Need

### Operations Overview (/super-admin/ops or /admin/ops with super admin role check)

**Access Control:**
- ONLY super admin role can access
- Tenant admins cannot see these pages
- Pages show cross-tenant system health

**Dashboard Outcomes:**
- Total active tenants count
- System-wide error rate
- Service health summary (all services)
- Active alerts count
- Performance metrics (p50, p95, p99 latencies)
- Recent deployments

---

### Error Tracking (/super-admin/ops/errors)

**Outcomes:**
- All system errors across all tenants
- Error aggregation by type, service, tenant
- Stack traces with context
- Error status management (new, acknowledged, resolved, ignored)
- Error assignment to team members
- Integration with alerting system

**Filters:**
- Time range
- Tenant
- Service
- Severity
- Status

---

### System Logs (/super-admin/ops/logs)

**Outcomes:**
- Centralized log viewer across all services
- Real-time log streaming (tail -f style)
- Log level filtering (debug, info, warn, error)
- Full-text search across logs
- Tenant context in each log line
- Export functionality

**Log Sources:**
- API request/response logs
- Background job logs
- Integration sync logs
- Authentication events
- Database query logs (slow queries)

---

### Health Monitoring (/super-admin/ops/health)

**Outcomes:**
- Service health matrix (15+ services)
- Health check history with graphs
- Threshold configuration per service
- Alert trigger visualization
- Dependency graph (which services depend on which)

**Services Monitored:**
- PostgreSQL database
- Redis cache
- Shopify API connectivity
- Stripe API connectivity
- Meta Ads API
- Google Ads API
- TikTok API
- Klaviyo API
- Twilio SMS
- Resend email
- Mux video
- AssemblyAI transcription
- Background job queues
- External webhook endpoints
- SSL certificate expiration

---

### Alert Management (/super-admin/ops/alerts)

**Outcomes:**
- Active alerts list with severity
- Alert history and timeline
- Acknowledgement workflow
- Escalation configuration
- Alert routing rules (who gets notified for what)
- Integration with Slack/PagerDuty/email

**Alert Types:**
- Error rate threshold exceeded
- Service health check failed
- API latency exceeded threshold
- Queue backlog growing
- Disk/memory usage high
- SSL cert expiring soon

---

### Performance Metrics (/super-admin/ops/performance)

**Outcomes:**
- API endpoint latency metrics
- Database query performance
- Background job execution times
- Request throughput by endpoint
- Slow query log with optimization suggestions
- Memory and CPU usage trends

---

### Ops Settings (/super-admin/ops/settings)

**Outcomes:**
- Alert threshold configuration
- Notification channel configuration
- Log retention settings
- Health check frequency settings
- Performance baseline settings

---

## Tenant Admin Settings - WHAT We Need

These pages ARE visible to tenant admins (for their own tenant only):

### AI Settings (/admin/settings/ai)

**Outcomes:**
- AI feature toggles (enable/disable BRI, etc.)
- Model selection (if multiple available)
- Usage limits configuration
- AI memory settings

---

### Payout Settings (/admin/settings/payouts)

**Outcomes:**
- Default payment method configuration
- Payout fee settings
- Payout schedule (weekly, bi-weekly, monthly)
- Minimum payout threshold
- Automatic vs manual payout toggle

---

### Permissions (/admin/settings/permissions)

**Outcomes:**
- Role management (admin, editor, viewer, etc.)
- Permission assignment per role
- Team member invitation
- Access control lists for features
- Activity log per user

---

### Site Config (/admin/config)

**Outcomes:**
- Dynamic site configuration
- Sale/promotion settings
- Banner configuration
- Navigation customization
- Branding settings (logo, colors)

---

## Access Control Matrix

| Page Category | Super Admin | Tenant Admin |
|---------------|-------------|--------------|
| /admin/ops/* | Yes | NO |
| /admin/settings/ai | Yes | Yes (own tenant) |
| /admin/settings/payouts | Yes | Yes (own tenant) |
| /admin/settings/permissions | Yes | Yes (own tenant) |
| /admin/config | Yes | Yes (own tenant) |

---

## Non-Negotiable Requirements

**Super Admin Only (NOT visible to tenants):**
- Error tracking with cross-tenant visibility
- System logs with cross-tenant data
- Health monitoring for all services
- Alert management
- Performance metrics
- Ops settings

**Tenant Admin Accessible:**
- AI settings (own tenant only)
- Payout settings (own tenant only)
- Permissions (own tenant only)
- Site config (own tenant only)

---

## Definition of Done

- [x] Operations pages are restricted to super admin role (via SUPER-ADMIN-ARCHITECTURE-2025-02-10.md)
- [x] Tenant admins cannot access /admin/ops/* pages (Access Control Matrix in PLAN.md)
- [x] Error tracking shows all system errors with tenant context (LOGGING-SPEC-2025-02-10.md)
- [x] Health monitoring covers all 15+ services (HEALTH-MONITORING-SPEC-2025-02-10.md)
- [x] Alerts notify appropriate team members (HEALTH-MONITORING-SPEC-2025-02-10.md)
- [x] Tenant settings pages work for individual tenants (PHASE-2TS-TENANT-SETTINGS.md)
- [x] Audit trail logs all settings changes (PHASE-2TS-TENANT-SETTINGS.md)

---

## Output Checklist

- [x] PLAN.md updated with super admin dashboard section (added Tenant Admin Settings section)
- [x] Super admin role and access control documented (SUPER-ADMIN-ARCHITECTURE-2025-02-10.md)
- [x] All ops pages specified with super admin restriction (Access Control Matrix)
- [x] Tenant settings pages documented (PHASE-2TS-TENANT-SETTINGS.md)
- [x] Access control matrix in documentation (added to PLAN.md)
