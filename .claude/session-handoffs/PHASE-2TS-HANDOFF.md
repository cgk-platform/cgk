# Phase 2TS Handoff: Tenant Settings

## Status: COMPLETE

## Summary

Built the Tenant Settings system in `apps/admin/`. This provides tenant-scoped AI settings, payout configuration, and site configuration pages that allow tenant admins to manage their own settings.

## Completed Tasks

### Database Migration (1 file)
- `packages/db/src/migrations/tenant/008_tenant_settings.sql` - Creates:
  - `ai_settings` table - AI features, model prefs, usage limits, memory settings
  - `payout_settings` table - Payment methods, schedules, thresholds, fees
  - `site_config` table - Pricing, promotions, banners, branding, navigation, analytics
  - `settings_audit_log` table - Audit trail for all settings changes
  - All tables have unique constraints per tenant, indexes, and update triggers

### Types & Database Layer (3 files)
- `apps/admin/src/lib/settings/types.ts` - Complete type definitions for:
  - AISettings, AISettingsUpdate, AIModelPreference
  - PayoutSettings, PayoutSettingsUpdate, PaymentMethod, PayoutSchedule, PayoutFeeType
  - SiteConfig, SiteConfigUpdate, PricingConfig, BrandColors, BrandFonts, NavItem, etc.
  - SettingsAuditLog, SettingType
- `apps/admin/src/lib/settings/db.ts` - Database operations:
  - `getAISettings`, `upsertAISettings`, `getAIUsage`, `resetAIUsage`
  - `getPayoutSettings`, `upsertPayoutSettings`, `getEnabledPaymentMethods`
  - `getSiteConfig`, `upsertSiteConfig`
  - `logSettingsChange` for audit logging
- `apps/admin/src/lib/settings/index.ts` - Module exports

### API Routes (8 files)

**AI Settings:**
- `apps/admin/src/app/api/admin/settings/ai/route.ts` - GET/PATCH for AI settings
- `apps/admin/src/app/api/admin/settings/ai/usage/route.ts` - GET AI usage stats
- `apps/admin/src/app/api/admin/settings/ai/reset-usage/route.ts` - POST reset usage (super admin only)

**Payout Settings:**
- `apps/admin/src/app/api/admin/settings/payouts/route.ts` - GET/PATCH for payout settings
- `apps/admin/src/app/api/admin/settings/payouts/methods/route.ts` - GET enabled payment methods

**Site Config:**
- `apps/admin/src/app/api/admin/config/route.ts` - GET/PATCH for full site config
- `apps/admin/src/app/api/admin/config/pricing/route.ts` - GET/PATCH for pricing only
- `apps/admin/src/app/api/admin/config/branding/route.ts` - GET/PATCH for branding only

### UI Components (5 files)

- `apps/admin/src/components/settings/form-elements.tsx` - Reusable form components:
  - SettingsSection, ToggleField, SelectField, NumberField, TextField, ColorField
  - UsageBar, SaveButton, ErrorAlert, UnsavedChangesBanner
- `apps/admin/src/components/settings/ai-settings-form.tsx` - AI settings form with:
  - Feature toggles (AI, BRII, Content, Insights)
  - Model preferences
  - Usage limits with progress bar
  - Memory settings
- `apps/admin/src/components/settings/payout-settings-form.tsx` - Payout settings form with:
  - Payment method toggles with icons
  - Schedule configuration with preview
  - Thresholds and limits
  - Fee configuration
  - Compliance settings
- `apps/admin/src/components/settings/site-config-form.tsx` - Site config form with tabs:
  - Pricing, Promotions, Banners, Branding, Navigation, Analytics
- `apps/admin/src/components/settings/index.ts` - Module exports

### Pages (3 files)
- `apps/admin/src/app/admin/settings/ai/page.tsx` - AI Settings page
- `apps/admin/src/app/admin/settings/payouts/page.tsx` - Payout Settings page
- `apps/admin/src/app/admin/config/page.tsx` - Site Configuration page

### UI Package Addition (1 file)
- `packages/ui/src/components/switch.tsx` - Switch toggle component
- Updated `packages/ui/src/index.ts` to export Switch

### Layout Updates
- Updated `apps/admin/src/app/admin/settings/layout.tsx` to add AI and Payouts tabs

## Bug Fixes (Pre-existing Issues Fixed)

- Fixed `packages/ui/src/context/permission-context.tsx` line 257 - Type guard for undefined permission
- Fixed `packages/auth/src/permissions/roles.ts` lines 221, 290, 380 - Type assertions for mapRowToRole

## Verification

- Settings-related type errors: **PASS** (0 errors in new code)
- Lint for new files: **PASS** (0 errors in new files)
- Pre-existing errors remain in `@cgk/logging` (not related to this phase)

## Key Patterns Used

- **Tenant isolation**: All queries use `withTenant()` wrapper
- **Caching**: `createTenantCache()` for tenant-scoped caching with 5-minute TTL
- **Audit logging**: All write operations log changes via `logSettingsChange()`
- **UPSERT pattern**: Default values applied on first access via ON CONFLICT DO UPDATE
- **Optimistic updates**: Forms track isDirty state and show unsaved changes banner

## Files Created/Modified

### New Files (18 total)
```
packages/db/src/migrations/tenant/008_tenant_settings.sql
apps/admin/src/lib/settings/types.ts
apps/admin/src/lib/settings/db.ts
apps/admin/src/lib/settings/index.ts
apps/admin/src/app/api/admin/settings/ai/route.ts
apps/admin/src/app/api/admin/settings/ai/usage/route.ts
apps/admin/src/app/api/admin/settings/ai/reset-usage/route.ts
apps/admin/src/app/api/admin/settings/payouts/route.ts
apps/admin/src/app/api/admin/settings/payouts/methods/route.ts
apps/admin/src/app/api/admin/config/route.ts
apps/admin/src/app/api/admin/config/pricing/route.ts
apps/admin/src/app/api/admin/config/branding/route.ts
apps/admin/src/components/settings/form-elements.tsx
apps/admin/src/components/settings/ai-settings-form.tsx
apps/admin/src/components/settings/payout-settings-form.tsx
apps/admin/src/components/settings/site-config-form.tsx
apps/admin/src/components/settings/index.ts
apps/admin/src/app/admin/settings/ai/page.tsx
apps/admin/src/app/admin/settings/payouts/page.tsx
apps/admin/src/app/admin/config/page.tsx
packages/ui/src/components/switch.tsx
```

### Modified Files
```
packages/ui/src/index.ts (added Switch export)
packages/ui/src/context/permission-context.tsx (type fix)
packages/auth/src/permissions/roles.ts (type fixes)
apps/admin/src/app/admin/settings/layout.tsx (added AI and Payouts tabs)
MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-2TS-TENANT-SETTINGS.md (status update)
```

## Deferred Items

1. **Preview panel components** - Advanced real-time preview for site config changes
2. **Webhook for pricing changes** - Requires jobs package integration
3. **Integration tests** - Requires test setup and fixtures
4. **Permission enforcement tests** - Requires test setup

## Next Steps

The settings infrastructure is complete. Subsequent phases can:
1. Add more granular permission checks (e.g., `tenant.settings.ai.edit`)
2. Implement webhooks when pricing config changes
3. Add settings import/export functionality
4. Implement approval workflows for sensitive settings
