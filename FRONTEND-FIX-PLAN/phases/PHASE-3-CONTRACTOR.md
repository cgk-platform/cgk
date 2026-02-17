# Phase 3: Contractor Portal Core

> **Priority**: P0 - Critical
> **Blocking**: App is completely unusable
> **Estimated Time**: 4-5 hours

---

## Problem Statement

The Contractor Portal has payment APIs but is missing:
- Navigation layout (no sidebar)
- Dashboard page (no home)
- Projects pages (backend exists, no UI)
- Auth pages (login, password reset)
- Settings pages (profile, notifications, security)

---

## Current State

**What exists:**
- `/payments` - Full payment balance page
- `/request-payment` - Payment request form
- `/settings/payout-methods` - Payout method setup
- `/settings/tax` - Tax info and W-9
- Backend code at `src/lib/projects/index.ts` - Full project management

**What's missing:**
- Portal layout with navigation
- Dashboard
- Projects list and detail pages
- Auth pages
- Profile and other settings

---

## Files to Create

### Part A: Layout and Navigation

**`src/app/(portal)/layout.tsx`**
```typescript
// Portal layout with sidebar navigation
// Similar to creator-portal layout
```

**`src/components/nav/Sidebar.tsx`**
```typescript
// Navigation sidebar with links:
// - Dashboard (/)
// - Projects (/projects)
// - Payments (/payments)
// - Request Payment (/request-payment)
// - Settings (/settings)
```

**`src/components/nav/MobileNav.tsx`**
```typescript
// Mobile hamburger menu and drawer
```

### Part B: Dashboard

**`src/app/(portal)/page.tsx`**
```typescript
// Dashboard page using getContractorDashboardStats() from lib/projects
// Show: Available balance, pending, active projects, recent activity
```

### Part C: Projects

**`src/app/(portal)/projects/page.tsx`**
```typescript
// Projects list with Kanban view (use @hello-pangea/dnd)
// Columns: New, In Progress, Submitted, In Review, Approved, Completed
// Use getProjectsByKanbanColumn() from lib/projects
```

**`src/app/(portal)/projects/[id]/page.tsx`**
```typescript
// Project detail page
// Show: Brief, status, files, submit button, payment info
// Use getProjectById() from lib/projects
```

**API Routes:**
- `src/app/api/contractor/projects/route.ts` - GET list
- `src/app/api/contractor/projects/[id]/route.ts` - GET detail, PATCH status
- `src/app/api/contractor/projects/[id]/submit/route.ts` - POST submit work
- `src/app/api/contractor/projects/[id]/files/route.ts` - POST upload, DELETE

### Part D: Auth Pages

**`src/app/(auth)/layout.tsx`**
```typescript
// Centered auth layout (no sidebar)
```

**`src/app/(auth)/login/page.tsx`**
```typescript
// Email + password login
// Magic link option
// Forgot password link
```

**`src/app/(auth)/forgot-password/page.tsx`**
```typescript
// Email input to request password reset
```

**`src/app/(auth)/reset-password/page.tsx`**
```typescript
// New password form (with token from URL)
```

**`src/app/(auth)/magic-link/page.tsx`**
```typescript
// Magic link verification
```

### Part E: Settings Pages

**`src/app/(portal)/settings/page.tsx`**
```typescript
// Settings index with links to sub-pages
```

**`src/app/(portal)/settings/profile/page.tsx`**
```typescript
// Name, email, phone, bio, skills, availability
```

**`src/app/(portal)/settings/notifications/page.tsx`**
```typescript
// Email notification preferences
```

**`src/app/(portal)/settings/security/page.tsx`**
```typescript
// Change password, active sessions
```

---

## Existing Backend Functions

From `src/lib/projects/index.ts`:

```typescript
getContractorProjects(contractorId, tenantSlug)
getProjectsByKanbanColumn(contractorId, tenantSlug)
getProjectById(projectId, contractorId, tenantSlug)
updateProjectStatus(projectId, newStatus, contractorId, tenantSlug)
submitProjectWork(projectId, files, contractorId, tenantSlug)
requestProjectPayout(projectId, contractorId, tenantSlug)
getContractorDashboardStats(contractorId, tenantSlug)
```

From `src/lib/auth/`:

```typescript
verifyContractorJWT(token)
createContractorSession(contractorId, tenantSlug)
validateContractorSession(sessionId)
```

---

## Navigation Structure

```
/                     -> Dashboard
/projects             -> Projects list (Kanban)
/projects/[id]        -> Project detail
/payments             -> Payment balance (EXISTS)
/request-payment      -> Request payment (EXISTS)
/settings             -> Settings index
/settings/profile     -> Profile settings
/settings/payout-methods -> Payout methods (EXISTS)
/settings/tax         -> Tax info (EXISTS)
/settings/notifications -> Notification prefs
/settings/security    -> Security settings
/login                -> Login page
/forgot-password      -> Password reset request
/reset-password       -> Password reset form
```

---

## Verification

```bash
cd /Users/holdenthemic/Documents/cgk/apps/contractor-portal
npx tsc --noEmit
```

---

## Completion Checklist

- [x] `(portal)/layout.tsx` created with sidebar
- [x] `components/nav/Sidebar.tsx` created
- [x] `components/nav/MobileNav.tsx` created
- [x] `(portal)/page.tsx` (dashboard) created
- [x] `(portal)/projects/page.tsx` created with Kanban
- [x] `(portal)/projects/[id]/page.tsx` created
- [x] `api/contractor/projects/route.ts` created
- [x] `api/contractor/projects/[id]/route.ts` created
- [x] `(auth)/layout.tsx` created
- [x] `(auth)/signin/page.tsx` created (signin instead of login)
- [x] `(auth)/forgot-password/page.tsx` created
- [x] `(auth)/reset-password/page.tsx` created
- [x] `(portal)/settings/page.tsx` created
- [x] `(portal)/settings/profile/page.tsx` created
- [x] `(portal)/settings/notifications/page.tsx` created
- [x] `(portal)/settings/security/page.tsx` created
- [x] `(portal)/help/page.tsx` created (bonus)
- [x] TypeScript check passes

**Status**: ✅ COMPLETE (2026-02-16)
