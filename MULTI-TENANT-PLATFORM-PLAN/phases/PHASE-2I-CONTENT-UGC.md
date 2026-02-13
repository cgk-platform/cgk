# PHASE-2I-C: User-Generated Content & Gallery

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Status**: REMOVED
**Reason**: Feature not used in RAWDOG production. Before/after photo submission was a campaign-triggered feature via Trigger.dev automation (post-purchase email/SMS with submission link), not a visible admin navigation item. User decision to exclude from CGK platform.
**Removed**: 2026-02-10

---

## Original Purpose (Archived for Reference)

This phase was intended to implement user-generated content management including:
- Public photo submission portal (before/after images)
- Admin moderation workflow
- Approved gallery display
- Rights management for marketing use

## Related Features Still Planned

The following UGC-related features remain in scope:

1. **Reviews System** (PHASE-2O-COMMERCE-REVIEWS)
   - Product reviews with photos
   - Email request campaigns
   - Moderation workflow
   - Yotpo/Internal provider abstraction

2. **Digital Asset Management** (PHASE-3F-DAM-CORE)
   - Centralized media library
   - Google Drive integration
   - AI tagging and categorization
   - Creator content management

3. **Creator Portal** (PHASE-4A-CREATOR-PORTAL)
   - Creator content submissions
   - Project deliverables
   - Brand-creator collaboration

---

## Files Removed

The following files were created and then removed:

### Admin App
- `apps/admin/src/lib/ugc/` (types.ts, db.ts, tokens.ts, upload.ts, index.ts)
- `apps/admin/src/app/admin/gallery/` (page.tsx, gallery-grid.tsx)
- `apps/admin/src/app/api/admin/gallery/` (route.ts, [id]/route.ts)
- `apps/admin/src/components/admin/gallery/` (SubmissionCard.tsx, SubmissionModal.tsx, ModerationStats.tsx)

### Storefront App
- `apps/storefront/src/app/submit-photos/` (page.tsx)
- `apps/storefront/src/app/api/submit-photos/` (route.ts)
- `apps/storefront/src/app/api/gallery/` (route.ts)
- `apps/storefront/src/app/results/` (page.tsx)
- `apps/storefront/src/components/gallery/` (BeforeAfterGallery.tsx, ImageUploader.tsx, SubmissionWizard.tsx, Lightbox.tsx, index.ts)
- `apps/storefront/src/lib/gallery.ts`

### Database
- `packages/db/src/migrations/tenant/011_photo_submissions.sql`
