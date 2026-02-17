# Phase 5: Mock Data Cleanup & Feature Pages

> **Priority**: P2 - Medium
> **Impact**: Polish and completeness
> **Estimated Time**: 4-5 hours

---

## Tasks in This Phase

1. Fix mock data issues (admin, creator portal)
2. Create missing customer portal feature pages
3. Create creator teleprompter page
4. Fix hardcoded orchestrator overview metrics

---

## Task 1: Fix Admin Inbox Stats

**Problem**: `/apps/admin/src/app/admin/inbox/page.tsx` lines 41-49 have hardcoded stats.

**Fix**: Update `getStats()` to query real data:

```typescript
async function getStats(tenantId: string) {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') as open_threads,
        COUNT(*) FILTER (WHERE status = 'snoozed') as snoozed_threads,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_threads,
        COUNT(*) FILTER (WHERE unread = true) as unread_count
      FROM inbox_threads
    `
    const row = result.rows[0]
    return {
      openThreads: Number(row?.open_threads || 0),
      snoozedThreads: Number(row?.snoozed_threads || 0),
      closedThreads: Number(row?.closed_threads || 0),
      unreadCount: Number(row?.unread_count || 0),
    }
  })
}
```

---

## Task 2: Fix Creator Agreements

**Problem**: `/apps/creator-portal/src/components/onboarding-wizard/steps/AgreementStep.tsx` uses `MOCK_DOCUMENTS`.

**Fix**:
1. Remove `MOCK_DOCUMENTS` constant
2. Fetch real documents from API:

```typescript
const [documents, setDocuments] = useState<Document[]>([])

useEffect(() => {
  fetch('/api/creator/onboarding/agreements')
    .then(res => res.json())
    .then(data => setDocuments(data.documents))
}, [])
```

3. Create API route `/api/creator/onboarding/agreements/route.ts`:

```typescript
// Query esign_documents for this creator's pending documents
```

---

## Task 3: Fix Tax Document Download

**Problem**: `/apps/creator-portal/src/app/api/creator/tax/documents/[id]/route.ts` returns mock data.

**Fix**: Query real tax documents:

```typescript
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const creatorId = request.headers.get('x-creator-id')
  const tenantSlug = request.headers.get('x-tenant-slug')

  const doc = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT * FROM creator_tax_documents
      WHERE id = ${params.id} AND creator_id = ${creatorId}
    `
  })

  if (!doc.rows[0]) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Return file URL or stream
  return NextResponse.json({ document: doc.rows[0] })
}
```

---

## Task 4: Create Teleprompter Page

**Problem**: Creator portal nav links to `/teleprompter` but page doesn't exist.

**Location**: `/apps/creator-portal/src/app/(portal)/teleprompter/page.tsx`

**Features**:
- Script input/paste area
- Teleprompter display with scrolling text
- Speed control (WPM slider)
- Font size control
- Play/pause/reset buttons
- Mirror mode toggle
- Fullscreen mode
- Countdown before start

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button, Slider, Switch, Label } from '@cgk-platform/ui'
import { Play, Pause, RotateCcw, Maximize, FlipHorizontal } from 'lucide-react'

export default function TeleprompterPage() {
  const [script, setScript] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(150) // words per minute
  const [fontSize, setFontSize] = useState(32)
  const [isMirrored, setIsMirrored] = useState(false)
  // ... implementation
}
```

---

## Task 5: Customer Portal - Referrals Page

**Location**: `/apps/storefront/src/app/account/referrals/page.tsx`

**Features**:
- Unique referral code/link
- Copy to clipboard
- Share buttons
- Referral stats (sent, signed up, converted)
- Rewards earned
- Terms and conditions

**API Routes**:
- `api/account/referrals/route.ts` - GET code and stats
- `api/account/referrals/invite/route.ts` - POST send invite

---

## Task 6: Customer Portal - Rewards Page

**Location**: `/apps/storefront/src/app/account/rewards/page.tsx`

**Features**:
- Points balance
- Tier status
- Points history
- Available rewards
- Redeem functionality
- How to earn explainer

**API Routes**:
- `api/account/loyalty/route.ts` - GET account
- `api/account/loyalty/points/route.ts` - GET history
- `api/account/loyalty/redeem/route.ts` - POST redeem

---

## Task 7: Customer Portal - Support Page

**Location**: `/apps/storefront/src/app/account/support/`

**Pages**:
- `page.tsx` - Ticket list + FAQ
- `[id]/page.tsx` - Ticket detail with replies
- `new/page.tsx` - Create ticket form

**API Routes**:
- `api/account/support/tickets/route.ts` - GET list, POST create
- `api/account/support/tickets/[id]/route.ts` - GET detail, POST reply

---

## Task 8: Customer Portal - Reviews Page

**Location**: `/apps/storefront/src/app/account/reviews/`

**Pages**:
- `page.tsx` - Customer's reviews + eligible products
- `write/[productId]/page.tsx` - Write review form

**API Routes**:
- `api/account/reviews/route.ts` - GET reviews
- `api/account/reviews/eligible/route.ts` - GET products to review
- `api/account/reviews/[id]/route.ts` - POST create, PATCH update

---

## Task 9: Fix Orchestrator Overview Metrics

**Problem**: `/apps/orchestrator/src/app/api/platform/overview/route.ts` lines 123-127 have hardcoded values.

**Fix**:

```typescript
// Replace hardcoded values with real queries:

// avgLatency - from health check data
const latencyResult = await sql`
  SELECT AVG(response_time_ms) as avg_latency
  FROM platform_health_matrix
  WHERE checked_at > NOW() - INTERVAL '1 hour'
`

// uptimePercent - from health check history
const uptimeResult = await sql`
  SELECT
    COUNT(*) FILTER (WHERE status = 'healthy') * 100.0 / COUNT(*) as uptime
  FROM platform_health_matrix
  WHERE checked_at > NOW() - INTERVAL '24 hours'
`

// pendingJobs and failedJobs24h - from job tables
const jobsResult = await sql`
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours') as failed_24h
  FROM background_jobs
`
```

---

## Verification

```bash
cd /Users/holdenthemic/Documents/cgk/apps/admin
npx tsc --noEmit

cd /Users/holdenthemic/Documents/cgk/apps/creator-portal
npx tsc --noEmit

cd /Users/holdenthemic/Documents/cgk/apps/storefront
npx tsc --noEmit

cd /Users/holdenthemic/Documents/cgk/apps/orchestrator
npx tsc --noEmit
```

---

## Completion Checklist

### Mock Data Fixes
- [x] Admin inbox stats using real queries
- [x] Creator agreements using real e-sign data
- [x] Tax document download using real documents
- [x] Orchestrator overview metrics using real data

### Creator Portal
- [x] Teleprompter page created with full functionality

### Customer Portal Feature Pages
- [x] Referrals page and API created
- [x] Rewards/loyalty page and API created
- [x] Support tickets pages and API created
- [x] Reviews pages and API created

### Verification
- [x] All four apps pass TypeScript check

**Status**: ✅ COMPLETE (2026-02-16)
