# CGK Platform Gap Audit — Master Synthesis

**Date:** 2026-02-19 | **Model:** Gemini 3 Pro | **Reports read:** 27/27

## Overall Health Score

**45%** — The platform has a high-quality "shell" (UI layouts, type definitions, package structures) but is hollow in the middle. The data pipelines, background jobs, and critical wiring (Auth → DB → UI) are frequently stubbed or broken.

- **Foundation & Auth:** 85% (Strongest area, but `PermissionProvider` not mounted rendering client RBAC dead)
- **Admin UI:** 70% (Looks complete, but many pages mock data or lack API integration)
- **Commerce & Finance:** 40% (Calculators built, but attribution/P&L jobs are stubs)
- **Creator & Contractor:** 30% (Portals look good but Auth/DB layers are fundamentally broken)
- **Storefront:** 50% (Rendering works, but no Auth, no ISR, API headers broken)
- **Infrastructure (Shopify/MCP):** 60% (Solid core, but critical config/credential gaps)

## Critical Security & Isolation Gaps (P0 — Fix Immediately)

1.  **Tenant Isolation Breach (P&L):** `pnl-calculator.ts` uses `LIMIT 1` on variable cost config without `WHERE tenant_id`.
2.  **Public Route Exposure:** `PUBLIC_PATHS` in middleware missing webhooks/public APIs; blocked by auth redirect.
3.  **GSC OAuth Vulnerability:** CSRF state not signed/verified.
4.  **Stripe Connect OAuth Vulnerability:** State parameter base64 encoded, not HMAC signed.
5.  **SQL Injection Risks:** E-Sign/Tax/Templates `list*` queries use string interpolation for filters.
6.  **Shopify Credential Schism:** New OAuth flow writes to `shopify_connections` (tenant), but app reads from `organizations` (public). Webhooks fail for new installs.
7.  **MCP Auth Bypass:** Admin tools (e.g. `initiate_payout`) have `requiresAdmin: true` metadata but **no runtime enforcement**.
8.  **Creator Portal Access:** No server-side auth gate on portal pages; `onboarding-wizard/complete` allows `creatorId` injection from body.

## Critical Functionality Gaps (P0 — Blocks Other Features)

1.  **Broken Auth Flows:**
    - **Storefront:** No login/register pages exist.
    - **Contractor Portal:** No `/api/auth/*` routes exist.
    - **Creator Portal:** Admin approval creates account but no password/magic-link setup; creators cannot log in.
2.  **Schema Mismatches (Runtime Crashes):**
    - **A/B Testing:** Migration missing ~18 columns; app code queries non-existent fields.
    - **Attribution:** 8+ tables missing migrations; app code queries them.
    - **Contractor:** `contractor_projects` migration does not match code schema.
    - **Blog:** `blog_posts` migration matches legacy schema, not current code.
3.  **Stubbed Background Jobs:**
    - **A/B Testing:** All 14 job handlers are stubs.
    - **Attribution:** All data aggregation jobs are stubs.
    - **Creator Lifecycle:** All automation jobs are stubs.
    - **Commerce Recovery:** Abandoned cart emails are never sent (stubs).
4.  **Subscription API Mismatch:** Client calls `/api/subscriptions`, routes are at `/api/account/subscriptions`. All actions 404.

## Major Gaps by Domain

- **Foundation (Agent 01):** Duplicate migration numbers (P0 risk). `withPlatformContext` missing.
- **Super Admin (Agent 02):** Impersonation emails missing. `impersonation_sessions` migration conflict.
- **Admin AI (Agent 03):** `aiAgents` feature flag bug hides UI. Multi-agent management UI missing.
- **Commerce/Finance (Agent 04):** P&L isolation bug. COGS/P&L config UIs missing.
- **Content/SEO (Agent 05):** Blog schema mismatch. Storefront cannot render blog. Phase 2I-A UI missing.
- **Team/RBAC (Agent 06):** `PermissionProvider` not mounted (client RBAC dead).
- **Communications (Agent 07):** Queue UI pages missing. Inbound email list missing.
- **Platform Ops (Agent 08):** Onboarding wizard localStorage-only (no DB sync). Shopify OAuth endpoint missing.
- **A/B Testing (Agent 09):** Schema critical failure. Cart attribute key mismatch. Jobs are stubs.
- **Attribution (Agent 10):** Tables missing. Pixel monitoring schema mismatch. Jobs are stubs.
- **Settings (Agent 11):** Yotpo package gap. Duplicate survey migrations.
- **Commerce Ops (Agent 12):** Reviews UI missing. Subscription API routes missing.
- **Storefront (Agent 13):** Middleware API header bug (breaks all data fetching). No Login/Register.
- **Customer Portal (Agent 14):** No Login page. Subscription API URL mismatch.
- **Video/DAM (Agent 15):** DAM Workflows 100% missing (0 files). Recovery jobs are stubs.
- **Creator Portal (Agent 16):** Auth API missing. DB schema mismatches. Invitation emails dead.
- **Creator Admin (Agent 17):** Lifecycle automation jobs are stubs.
- **E-Sign/Tax (Agent 18):** PDF finalization missing. Workflow doc creation missing.
- **Contractor Portal (Agent 19):** Auth API missing. Schema mismatches.
- **Shopify App (Agent 20):** GDPR webhooks missing. Per-user token bug. Credential schism.
- **MCP Server (Agent 20):** API key table mismatch. Usage table missing. Admin enforcement missing.

## Cross-Cutting Architectural Issues

1.  **Job Stubs:** Across almost every domain (A/B, Attribution, Creator, Recovery), the background job handlers are written as "stubs" that log intent but do no work. The platform _looks_ complete but processes nothing in the background.
2.  **Schema/Code Drift:** Migrations often reflect an early spec, while application code reflects a later spec. Runtime SQL errors will be pervasive.
3.  **Auth Implementation Gaps:** While the _libraries_ (`packages/auth`) are strong, the _applications_ (Contractor, Creator, Storefront) mostly failed to wire them up to actual UI routes.
4.  **UI/API Disconnect:** Admin UIs often point to API routes that don't exist (e.g., Subscription actions, Contractor notifications).

## Recommended Execution Order

1.  **Fix Security P0s:** Tenant isolation bugs, OAuth vulnerabilities, and middleware auth bypasses.
2.  **Fix Schema P0s:** Run a "Schema Repair" sprint to align migrations with code expectations.
3.  **Fix Auth P0s:** Build the missing Login/Register pages and API routes for all portals.
4.  **Destub Jobs:** Implement the actual logic for the ~40 stubbed background jobs.
5.  **Wire UI:** Connect the UI buttons to the (now existing) API routes.

## Pass 2 Needed?

**No.** The audit was extremely exhaustive. The gaps are clear, specific, and actionable. We have enough information to build the Master Task List.
