# PHASE-2I-C: User-Generated Content & Gallery

**Duration**: 1 week (Week 12)
**Depends On**: Phase 2C (Admin Content)
**Parallel With**: Phase 2I-A (Blog Advanced), Phase 2I-B (SEO Suite)
**Blocks**: Phase 3C (Storefront Features - UGC display)

---

## Goal

Implement user-generated content management including a public photo submission portal, admin moderation workflow, approved gallery display, and rights management for marketing use.

---

## Success Criteria

- [ ] Public photo submission form (3-step wizard)
- [ ] Before/after image upload with validation
- [ ] Admin moderation dashboard with filters
- [ ] Approve/reject workflow with notes
- [ ] Public gallery page (approved only)
- [ ] Lightbox viewer with navigation
- [ ] Marketing consent tracking
- [ ] Submission deduplication (tokens)

---

## Feature Overview

### Photo Submission Portal (Public)

**URL**: `/submit-photos` (tenant-specific domain)

**3-Step Wizard Flow**:

**Step 1 - Photo Upload**:
- Before image upload with preview
- After image upload with preview
- File validation (JPEG, PNG, WebP only)
- Max 10MB per image
- Drag-and-drop or click to select

**Step 2 - Product Details**:
- Product selection (multi-select from catalog)
- Duration of use (days/weeks/months)
- Optional testimonial textarea

**Step 3 - Contact Info**:
- Name (required)
- Email (required)
- Phone (optional)
- Marketing consent checkbox (required for gallery use)

**Submission Token**:
- Optional URL parameter for campaign tracking
- Prevents duplicate submissions from same token
- Format: `/submit-photos?token=summer2025-email`

---

### Database Schema

```sql
CREATE TABLE photo_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  before_image_url TEXT NOT NULL,
  after_image_url TEXT NOT NULL,
  duration_days INTEGER,
  products_used TEXT[], -- PostgreSQL array of product handles
  testimonial TEXT,
  consent_marketing BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  submission_token VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photo_submissions_tenant_status
  ON photo_submissions(tenant_id, status);
CREATE INDEX idx_photo_submissions_token
  ON photo_submissions(tenant_id, submission_token);
```

---

### Admin Moderation Dashboard

**URL**: `/admin/gallery`

**Features**:
- Stats cards: Total, Pending, Approved, Rejected
- Filter by status (all, pending, approved, rejected)
- Grid view with submission cards
- Each card shows:
  - Before/after thumbnail (hover to switch)
  - Customer name
  - Duration badge
  - Product tags
  - Submission date
  - Quick approve/reject buttons

**Detail Modal**:
- Full-size before/after images (side-by-side or toggle)
- Customer info (name, email, phone)
- Products used
- Duration
- Testimonial
- Marketing consent indicator
- Review history (who approved/rejected, when, notes)
- Notes input field
- Approve / Reject buttons

**Moderation Actions**:
```typescript
async function approveSubmission(
  tenantId: string,
  submissionId: string,
  reviewedBy: string,
  notes?: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE photo_submissions
      SET status = 'approved',
          reviewed_by = ${reviewedBy},
          reviewed_at = NOW(),
          review_notes = ${notes || null}
      WHERE id = ${submissionId}
        AND tenant_id = ${tenantId}
    `
  })
}

async function rejectSubmission(
  tenantId: string,
  submissionId: string,
  reviewedBy: string,
  notes?: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE photo_submissions
      SET status = 'rejected',
          reviewed_by = ${reviewedBy},
          reviewed_at = NOW(),
          review_notes = ${notes || null}
      WHERE id = ${submissionId}
        AND tenant_id = ${tenantId}
    `
  })
}
```

---

### Public Gallery Display

**URL**: `/results` (storefront)

**Features**:
- Only shows approved submissions
- Only shows testimonials if `consent_marketing = true`
- Privacy filter: excludes email/phone from public API

**Layout**:
- Responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
- Hover effect toggles before/after with fade
- Each card shows:
  - Customer name
  - Duration badge
  - Product tags
  - Testimonial preview (truncated)

**Lightbox Modal**:
- Full-screen dark background
- Main image with before/after toggle buttons
- Side panel with:
  - Customer name
  - Duration
  - Products used
  - Full testimonial
- Previous/Next navigation
- Keyboard support (arrows, Esc)

**API Response** (Public):
```typescript
interface PublicGallerySubmission {
  id: string
  customerName: string // First name only, or initials
  beforeImageUrl: string
  afterImageUrl: string
  durationDays: number | null
  productsUsed: string[]
  testimonial: string | null // Only if consent_marketing = true
  createdAt: string
}
```

---

### Image Upload Flow

**Client → Server Flow**:
1. User selects image file
2. Client validates type (JPEG/PNG/WebP) and size (<10MB)
3. Client shows preview via FileReader
4. On form submit, FormData sent to API
5. Server validates file again
6. Server uploads to Vercel Blob
7. Server stores URL in database

**Storage Path**:
```
tenants/{tenantId}/photos/before/{uuid}.{ext}
tenants/{tenantId}/photos/after/{uuid}.{ext}
```

**Upload Function**:
```typescript
async function uploadPhotoToBlob(
  tenantId: string,
  file: File,
  type: 'before' | 'after'
): Promise<string> {
  const filename = `tenants/${tenantId}/photos/${type}/${uuidv4()}.${getExtension(file.name)}`

  const blob = await put(filename, file, {
    access: 'public',
    contentType: file.type
  })

  return blob.url
}
```

---

### Rights Management

**Marketing Consent**:
- Checkbox required on submission form
- Labeled: "I consent to RAWDOG using my photos for marketing purposes"
- Stored as `consent_marketing` boolean

**Privacy Rules**:
- Submissions without consent: Can be approved but testimonial hidden from public
- Submissions with consent: Full public display allowed
- Email/phone NEVER exposed to public API

**Admin View**:
- Consent status shown with checkmark/x indicator
- Can search by consent status
- Export excludes non-consented submissions

---

### Submission Token System

**Purpose**: Track campaign sources and prevent duplicates.

**Token Generation**:
```typescript
function generateSubmissionToken(): string {
  return `sub_${Date.now()}_${randomBytes(8).toString('hex')}`
}
```

**Deduplication**:
```typescript
async function getSubmissionByToken(
  tenantId: string,
  token: string
): Promise<PhotoSubmission | null> {
  return await withTenant(tenantId, async () => {
    const result = await sql`
      SELECT * FROM photo_submissions
      WHERE tenant_id = ${tenantId}
        AND submission_token = ${token}
      LIMIT 1
    `
    return result.rows[0] || null
  })
}
```

**Campaign Tracking**:
- Token format: `{campaign}-{source}` (e.g., `summer2025-email`)
- Analytics: Filter submissions by token prefix
- Reports: Submission counts by campaign

---

## Deliverables

### Database Layer
- [ ] `packages/db/src/schemas/photo-submissions.ts`

### Library Functions
- [ ] `apps/admin/src/lib/ugc/photos.ts` (CRUD, upload, stats)
- [ ] `apps/admin/src/lib/ugc/tokens.ts` (token generation, dedup)
- [ ] `apps/storefront/src/lib/gallery.ts` (public fetch)

### API Routes (Admin)
- [ ] `apps/admin/src/app/api/admin/gallery/route.ts` (list + stats)
- [ ] `apps/admin/src/app/api/admin/gallery/[id]/route.ts` (get, approve, reject, delete)

### API Routes (Public)
- [ ] `apps/storefront/src/app/api/gallery/route.ts` (approved only)
- [ ] `apps/storefront/src/app/api/submit-photos/route.ts` (submission)

### Admin Pages
- [ ] `apps/admin/src/app/admin/gallery/page.tsx` (moderation dashboard)

### Storefront Pages
- [ ] `apps/storefront/src/app/submit-photos/page.tsx` (submission wizard)
- [ ] `apps/storefront/src/app/results/page.tsx` (public gallery)

### Components (Admin)
- [ ] `apps/admin/src/components/admin/gallery/SubmissionCard.tsx`
- [ ] `apps/admin/src/components/admin/gallery/SubmissionModal.tsx`
- [ ] `apps/admin/src/components/admin/gallery/ModerationStats.tsx`

### Components (Storefront)
- [ ] `apps/storefront/src/components/gallery/BeforeAfterGallery.tsx`
- [ ] `apps/storefront/src/components/gallery/ImageUploader.tsx`
- [ ] `apps/storefront/src/components/gallery/SubmissionWizard.tsx`
- [ ] `apps/storefront/src/components/gallery/Lightbox.tsx`

---

## Constraints

- Images stored in Vercel Blob (public access)
- Max 10MB per image
- Only JPEG, PNG, WebP accepted
- Public gallery API excludes email/phone
- Testimonials hidden if consent not given
- Submission tokens single-use per tenant

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For submission wizard, gallery grid, lightbox

**RAWDOG code to reference:**
- `src/app/admin/gallery/page.tsx` - Moderation dashboard
- `src/app/submit-photos/page.tsx` - Submission wizard
- `src/app/results/page.tsx` - Public gallery page
- `src/app/api/admin/gallery/route.ts` - Admin API
- `src/app/api/gallery/route.ts` - Public API
- `src/app/api/submit-photos/route.ts` - Submission API
- `src/lib/campaigns/photos.ts` - CRUD operations
- `src/components/gallery/BeforeAfterGallery.tsx` - Gallery component

---

## Tasks

### [PARALLEL] Database & Types
- [ ] Create photo_submissions table
- [ ] Create TypeScript types
- [ ] Add indexes for status and token queries

### [PARALLEL] Library Functions
- [ ] Implement photo CRUD (create, get, list, update status)
- [ ] Implement upload to Vercel Blob
- [ ] Implement stats aggregation
- [ ] Implement token generation and validation
- [ ] Implement public gallery fetch (approved only)

### [SEQUENTIAL after library] API Routes
- [ ] Admin gallery list + stats route
- [ ] Admin single submission route (CRUD)
- [ ] Public gallery route (approved, privacy-filtered)
- [ ] Public submission route (with upload handling)

### [SEQUENTIAL after API] Admin Components
- [ ] Submission card with hover preview
- [ ] Detail modal with approve/reject
- [ ] Stats cards (pending count badge)

### [SEQUENTIAL after API] Storefront Components
- [ ] Image uploader with validation and preview
- [ ] 3-step submission wizard
- [ ] Gallery grid with hover effect
- [ ] Lightbox with navigation

### [SEQUENTIAL after components] Pages
- [ ] Admin moderation dashboard
- [ ] Public submission form
- [ ] Public results gallery

---

## Background Jobs

The following background jobs should be created in Phase 5:

| Job ID | Schedule | Purpose |
|--------|----------|---------|
| `ugc/cleanup/rejected` | Weekly | Archive rejected submissions older than 30 days |
| `ugc/reminder/pending` | Daily | Notify admins of pending submissions (Slack/email) |

---

## Definition of Done

- [ ] Public submission form accepts before/after images
- [ ] Images validated (type, size) and uploaded to Blob
- [ ] 3-step wizard collects all required information
- [ ] Submission tokens prevent duplicates
- [ ] Admin dashboard shows all submissions with filters
- [ ] Approve/reject updates status with reviewer info
- [ ] Public gallery shows only approved submissions
- [ ] Testimonials hidden without marketing consent
- [ ] Email/phone never exposed in public API
- [ ] Lightbox works with keyboard navigation
- [ ] All tenant isolation patterns followed
- [ ] `npx tsc --noEmit` passes
