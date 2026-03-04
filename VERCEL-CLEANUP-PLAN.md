# Vercel Projects Cleanup Plan

## Current Vercel Projects (cgk-linens team)

| Project Name              | App Directory               | Status      | Action                                 |
| ------------------------- | --------------------------- | ----------- | -------------------------------------- |
| `cgk-admin`               | `apps/admin/`               | Active      | ⏸️ DELETE after migration              |
| `cgk-storefront`          | `apps/storefront/`          | Active      | ⏸️ DELETE after migration              |
| `cgk-meliusly-storefront` | `apps/meliusly-storefront/` | **DELETED** | ❌ DELETE NOW (app removed in Phase 6) |
| `cgk-shopify-app`         | `apps/shopify-app/`         | Active      | ⏸️ DELETE after migration              |
| `cgk-orchestrator`        | `apps/orchestrator/`        | Active      | ⏸️ DELETE after migration              |
| `cgk-creator-portal`      | `apps/creator-portal/`      | Active      | ⏸️ DELETE after migration              |
| `cgk-contractor-portal`   | `apps/contractor-portal/`   | Active      | ⏸️ DELETE after migration              |
| `cgk-command-center`      | `apps/command-center/`      | Active      | ⏸️ DELETE after migration              |
| `cgk-mcp-server`          | `apps/mcp-server/`          | Active      | ⏸️ DELETE after migration              |

---

## Immediate Actions (Safe to Delete Now)

### 1. Delete `cgk-meliusly-storefront` NOW

**Reason**: The `apps/meliusly-storefront/` directory was deleted in Phase 6. This Vercel project has no corresponding app in the repository.

**How to delete:**

```bash
# Via Vercel CLI
vercel project rm cgk-meliusly-storefront --scope cgk-linens-88e79683

# Or via dashboard:
# https://vercel.com/cgk-linens-88e79683/cgk-meliusly-storefront/settings
# Scroll to bottom → Delete Project
```

**⚠️ Verify first**: Ensure no custom domain is pointing to this project that's still in use.

---

## Post-Migration Actions (After ALL 4 Tenants Migrated)

### Current Architecture (Multi-Tenant SaaS)

```
cgk-linens Vercel Team
├── cgk-admin           → Serves all 4 tenants
├── cgk-storefront      → Generic storefront (all tenants)
├── cgk-shopify-app     → Shared Shopify app
├── cgk-orchestrator    → Multi-tenant orchestrator
├── cgk-creator-portal  → Serves all tenants
├── cgk-contractor-portal → Serves all tenants
├── cgk-command-center  → Multi-tenant ops
└── cgk-mcp-server      → Shared MCP server
```

### Target Architecture (WordPress-Style Self-Hosted)

```
Template Repository (cgk-platform/cgk-template)
└── No Vercel projects (users deploy their own)

Meliusly (meliusly org)
└── meliusly-commerce (ONE Vercel project, all 8 apps)

CGK Linens (cgk-linens org)
└── cgk-commerce (ONE Vercel project, all 8 apps)

VitaHustle (vitahustle org)
└── vitahustle-platform (ONE Vercel project, all 8 apps)

Rawdog (rawdog org)
└── rawdog-commerce (ONE Vercel project, all 8 apps)
```

### Projects to Delete (After Migration Complete)

**Delete ALL 8 remaining projects** once:

- All 4 tenants have new Vercel projects deployed
- DNS has been updated to point to new deployments
- 48-hour monitoring shows zero errors
- Old projects show zero traffic

```bash
# After verification period, delete all:
vercel project rm cgk-admin --scope cgk-linens-88e79683
vercel project rm cgk-storefront --scope cgk-linens-88e79683
vercel project rm cgk-shopify-app --scope cgk-linens-88e79683
vercel project rm cgk-orchestrator --scope cgk-linens-88e79683
vercel project rm cgk-creator-portal --scope cgk-linens-88e79683
vercel project rm cgk-contractor-portal --scope cgk-linens-88e79683
vercel project rm cgk-command-center --scope cgk-linens-88e79683
vercel project rm cgk-mcp-server --scope cgk-linens-88e79683
```

---

## Migration Safety Checklist

Before deleting ANY project:

1. **Traffic Check**

   ```bash
   # Verify zero traffic to old projects
   # Check Vercel analytics for last 7 days
   ```

2. **DNS Verification**

   ```bash
   # Ensure no domains point to old projects
   vercel domains ls --scope cgk-linens-88e79683
   ```

3. **Custom Domain Check**

   ```bash
   # List all domains on each project
   # Example:
   curl https://api.vercel.com/v9/projects/cgk-admin/domains \
     -H "Authorization: Bearer $VERCEL_TOKEN"
   ```

4. **Webhook Verification**
   - Check Shopify webhooks don't point to old URLs
   - Check Stripe webhooks don't point to old URLs
   - Check any third-party integrations

5. **Environment Variables Backup**
   ```bash
   # Export env vars from each project BEFORE deleting
   vercel env pull .env.cgk-admin.backup --scope cgk-linens-88e79683
   vercel env pull .env.cgk-storefront.backup --scope cgk-linens-88e79683
   # ... (repeat for all projects)
   ```

---

## Recommended Deletion Order

1. **Week 1**: Delete `cgk-meliusly-storefront` (already removed from codebase)
2. **Week 2**: Migrate Meliusly to separate fork
3. **Week 3**: Verify Meliusly deployment, migrate CGK Linens
4. **Week 4**: Verify CGK Linens, migrate VitaHustle
5. **Week 5**: Verify VitaHustle, migrate Rawdog
6. **Week 6**: Verify Rawdog, monitor all 4 tenants
7. **Week 7**: Delete all old Vercel projects if zero issues

---

## What to Keep

**DO NOT DELETE**:

- Neon PostgreSQL database (until after data migration verified)
- Upstash Redis cache (until after migration verified)
- Environment variable backups
- Git commit history

**KEEP**:

- Template repository: `cgk-platform/cgk-template`
- This stays active for future users to fork

---

## Emergency Rollback

If you need to quickly restore service:

1. **Redeploy from GitHub**:

   ```bash
   # Trigger redeploy of old projects
   vercel --prod --scope cgk-linens-88e79683
   ```

2. **Restore DNS**:
   - Revert CNAME records to old deployment
   - Vercel projects are not truly deleted for 7 days (can be restored)

3. **Contact Vercel Support**:
   - Within 7 days of deletion, projects can be restored
   - support@vercel.com

---

## Summary

**Delete NOW**:

- ❌ `cgk-meliusly-storefront` (app doesn't exist anymore)

**Delete LATER** (after migration + 48hr verification):

- ⏸️ All other 8 projects

**Timeline**:

- Immediate: 1 project deleted
- 6-8 weeks: All tenants migrated, all old projects deleted
- Final state: Template repo only, no production deployments on cgk-linens team

**Safety**: Staged migration with 48-hour verification periods ensures zero downtime.
