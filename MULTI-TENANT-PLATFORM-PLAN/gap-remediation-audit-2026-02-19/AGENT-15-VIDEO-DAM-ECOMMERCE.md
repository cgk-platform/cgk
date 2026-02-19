# AGENT-15: Video, DAM & E-Commerce Audit Report
> **Audit Date**: 2026-02-19  
> **Agent**: agent-15-video-dam-ecommerce  
> **Scope**: packages/video/src, packages/dam/src, packages/commerce/src + admin app routes/UI  
> **Phase Specs Audited**: PHASE-3E-VIDEO-CORE, PHASE-3E-VIDEO-CREATOR-TOOLS, PHASE-3E-VIDEO-TRANSCRIPTION, PHASE-3E-ECOMMERCE-RECOVERY, PHASE-3F-DAM-CORE, PHASE-3F-DAM-WORKFLOWS, PHASE-3F-ECOMMERCE-PROMOS, PHASE-3G-ECOMMERCE-SEGMENTS, PHASE-3G-GIFT-CARDS

---

## Executive Summary

This audit covers 9 feature areas across three phase groups (3E, 3F, 3G). Of the areas claimed "COMPLETE" in phase docs, **most have significant implementation gaps** — particularly around background job execution, missing admin UI pages, and entire workflow subsystems.

| Feature Area | Status | Gap Severity |
|---|---|---|
| Video Upload/Transcoding | ⚠️ Partial | Medium — missing permissions API, analytics UI |
| Creator Video Tools | ⚠️ Partial | Medium — no annotations, limited creator video portal |
| Transcription | ⚠️ Partial | Low-Medium — single provider, no caption export UI |
| Abandoned Cart Recovery | ⚠️ Partial | **CRITICAL** — all job handlers are stubs |
| DAM Asset Management | ⚠️ Partial | High — missing pages, routes, AI modules |
| DAM Approval Workflows | ❌ Not Implemented | **CRITICAL** — entire subsystem absent |
| Promo Codes/Discounts | ⚠️ Partial | Low — missing sync jobs and 1 route |
| Customer Segments | ⚠️ Partial | Medium — no background jobs, schema missing |
| Gift Cards | ⚠️ Mostly Done | Low — background jobs deferred |

**Total: 0 fully implemented, 7 partially implemented, 1 not implemented, 1 mostly done.**

---

## Feature-by-Feature Classification

---

### 1. Video Upload/Transcoding
**Status: ⚠️ Partially Implemented**

#### What Exists
| File/Directory | Description |
|---|---|
| `packages/video/src/mux/uploads.ts` | Mux direct upload URL generation |
| `packages/video/src/mux/assets.ts` | Mux asset management |
| `packages/video/src/mux/playback.ts` | Playback URL helpers |
| `packages/video/src/mux/webhooks.ts` | Webhook payload parsing |
| `packages/video/src/mux/client.ts` | Mux API client |
| `packages/video/src/db.ts` | Full CRUD with tenant isolation (getVideo, createVideo, updateVideo, etc.) |
| `packages/video/src/schema.ts` | DB schema: videos, video_folders, video_permissions, video_views tables |
| `packages/video/src/analytics/views.ts` | View tracking (trackView, updateView, getVideoViews) |
| `packages/video/src/analytics/aggregates.ts` | Aggregate analytics (getVideoAnalytics) |
| `apps/admin/src/app/api/webhooks/mux/route.ts` | Mux webhook handler with signature verification + idempotency |
| `apps/admin/src/app/api/admin/videos/route.ts` | Videos list API |
| `apps/admin/src/app/api/admin/videos/[id]/route.ts` | Video detail API |
| `apps/admin/src/app/admin/videos/page.tsx` | Admin videos list page |
| `apps/admin/src/app/admin/videos/[id]/page.tsx` | Admin video detail page (player + metadata) |
| `apps/admin/src/components/admin/video/upload-modal.tsx` | Upload modal with drag-drop |
| `apps/admin/src/components/admin/video/video-player.tsx` | HLS player |
| `apps/admin/src/components/admin/video/video-card.tsx` | Video card component |
| `apps/admin/src/components/admin/video/video-library.tsx` | Library grid/list view |
| `apps/admin/src/components/admin/video/folder-sidebar.tsx` | Folder navigation |
| `apps/admin/src/components/admin/video/video-status-badge.tsx` | Status badge |

#### What's Missing
- ❌ **Video-level permissions API route** — `packages/video/src/permissions/` module exists (check.ts, db.ts, index.ts, types.ts) but there is **no `/api/admin/videos/[id]/permissions` route** in the admin app. Permissions system is implemented in the package but not exposed via API.
- ❌ **Video analytics UI panel** — `getVideoAnalytics()` exists in `packages/video/src/analytics/aggregates.ts` and the detail page imports it, but there is no dedicated **analytics dashboard component** (e.g., views chart, watch-time graph, completion funnel). The detail page shows metadata only.
- ❌ **Video permissions panel UI component** — No `permissions-panel.tsx` in `apps/admin/src/components/admin/video/` or `apps/admin/src/components/admin/videos/`. The video detail page has no way to manage who can view a video.

---

### 2. Creator Video Tools
**Status: ⚠️ Partially Implemented**

#### What Exists
| File/Directory | Description |
|---|---|
| `packages/video/src/creator-tools/teleprompter/` | Teleprompter DB + types + index |
| `packages/video/src/creator-tools/cta/` | CTA overlay DB + types + index |
| `packages/video/src/creator-tools/trim/` | Trim (Mux clip) logic + types |
| `packages/video/src/creator-tools/sse/` | SSE event streaming |
| `apps/admin/src/app/api/admin/videos/[id]/trim/route.ts` | Trim API (Mux clip) |
| `apps/admin/src/app/api/admin/videos/[id]/cta/route.ts` | CTA API |
| `apps/admin/src/app/api/admin/videos/scripts/route.ts` | Teleprompter scripts API |
| `apps/admin/src/app/api/admin/videos/scripts/[id]/route.ts` | Script detail API |
| `apps/admin/src/components/admin/videos/trim-modal.tsx` | Trim timeline UI |
| `apps/admin/src/components/admin/videos/cta-editor.tsx` | CTA overlay editor |
| `apps/admin/src/components/admin/videos/teleprompter/` | Admin teleprompter editor |
| `apps/admin/src/components/admin/videos/chapters-timeline.tsx` | AI chapters display |
| `apps/admin/src/components/admin/videos/reactions/reactions-bar.tsx` | Video reactions |
| `apps/admin/src/components/admin/videos/comments/comments-section.tsx` | Video comments |
| `apps/creator-portal/src/components/video/recording-interface.tsx` | Full recording (camera/screen/PIP) |
| `apps/creator-portal/src/components/video/teleprompter-overlay.tsx` | Teleprompter overlay for recording |
| `apps/creator-portal/src/app/(portal)/teleprompter/page.tsx` | Creator teleprompter page |

#### What's Missing
- ❌ **Video annotations module** — No `packages/video/src/creator-tools/annotations/` directory. The phase spec explicitly calls for drawing/annotation tools on video frames. No annotation types, DB ops, or UI components exist.
- ❌ **Creator portal video library/management page** — Creator portal has teleprompter and project-based uploads (`/projects/[id]`) but no standalone video library page at `/videos/` for creators to manage their recordings.
- ❌ **Video reactions API route** — `apps/admin/src/app/api/admin/videos/[id]/reactions/route.ts` exists but no matching reactions route for storefront (public viewers).
- ❌ **Video-level permissions panel** (UI for granting/revoking view access) — see also item 1 above.

---

### 3. Transcription
**Status: ⚠️ Partially Implemented**

#### What Exists
| File/Directory | Description |
|---|---|
| `packages/video/src/transcription/providers/assemblyai.ts` | AssemblyAI provider (sole provider) |
| `packages/video/src/transcription/providers/factory.ts` | Provider factory |
| `packages/video/src/transcription/captions.ts` | VTT + SRT caption generation from word timestamps |
| `packages/video/src/transcription/db.ts` | Full DB ops: startTranscription, saveTranscriptionResult, failTranscription, resetTranscription, saveAIContent, searchVideosByTranscript, getVideosReadyForTranscription |
| `packages/video/src/transcription/types.ts` | TranscriptionWord, TranscriptionChapter, TranscribeOptions, etc. |
| `packages/video/src/ai/chapters.ts` | AI chapter generation |
| `packages/video/src/ai/summary.ts` | AI summary generation |
| `packages/video/src/ai/title.ts` | AI title suggestion |
| `packages/video/src/ai/tasks.ts` | AI task list generation |
| `packages/jobs/src/handlers/video-transcription.ts` | Job handler: videoTranscriptionJob + AIContentGenerationPayload + TranscriptionSyncPayload |
| `apps/admin/src/app/api/v1/webhooks/assemblyai/route.ts` | AssemblyAI webhook (with signature verification) |
| `apps/admin/src/app/api/v1/videos/[id]/transcribe/route.ts` | Trigger transcription API |
| `apps/admin/src/app/api/v1/videos/[id]/transcript/route.ts` | Get transcript API |
| `apps/admin/src/app/admin/videos/[id]/transcript/page.tsx` | Transcript viewer page |
| `apps/admin/src/components/admin/videos/transcript-viewer.tsx` | Transcript display |
| `apps/admin/src/components/admin/videos/transcript-search.tsx` | Searchable transcript |
| `apps/admin/src/components/admin/videos/transcription-status.tsx` | Status indicator |
| `apps/admin/src/components/admin/videos/ai-summary-card.tsx` | AI summary display |
| `apps/admin/src/components/admin/videos/ai-tasks-list.tsx` | AI tasks display |

#### What's Missing
- ❌ **Deepgram provider** — Only AssemblyAI is implemented in `packages/video/src/transcription/providers/`. Phase spec mentions provider abstraction but no second provider exists (Deepgram was the spec's fallback).
- ❌ **Caption export UI** — `captions.ts` can generate VTT/SRT content, but there is no download button or export endpoint exposed in the admin UI. Captions are generated in code but not user-accessible.
- ❌ **Mux subtitle track upload** — Phase spec mentions uploading captions to Mux as subtitle tracks for in-player caption display. This is not present anywhere.
- ❌ **AI content trigger on completion** — The `video-transcription.ts` job handler references `AIContentGenerationPayload` but there's no trigger/ task file in `packages/jobs/src/trigger/` for video transcription or AI content generation.

---

### 4. Abandoned Cart Recovery
**Status: ⚠️ Partially Implemented — CRITICAL GAPS**

> ⚠️ Phase spec is marked COMPLETE but core job execution is entirely **unimplemented** (stubs).

#### What Exists
| File/Directory | Description |
|---|---|
| `apps/admin/src/app/admin/commerce/abandoned-checkouts/page.tsx` | Abandoned checkouts list |
| `apps/admin/src/app/admin/commerce/abandoned-checkouts/expandable-row.tsx` | Row detail with cart items |
| `apps/admin/src/app/admin/commerce/abandoned-checkouts/checkout-actions.tsx` | Manual action buttons |
| `apps/admin/src/app/admin/commerce/abandoned-checkouts/recovery-settings-button.tsx` | Settings modal trigger |
| `apps/admin/src/app/api/admin/abandoned-checkouts/route.ts` | List API |
| `apps/admin/src/app/api/admin/abandoned-checkouts/[id]/route.ts` | Detail API |
| `apps/admin/src/app/api/admin/abandoned-checkouts/[id]/recover/route.ts` | Manual recover API |
| `apps/admin/src/app/api/admin/abandoned-checkouts/settings/route.ts` | Recovery settings API |
| `apps/admin/src/lib/abandoned-checkouts/db.ts` | DB operations |
| `apps/admin/src/lib/abandoned-checkouts/types.ts` | Type definitions |
| `apps/storefront/src/app/api/webhooks/shopify/checkouts/route.ts` | Shopify checkout webhook |
| `packages/jobs/src/handlers/recovery.ts` | Job handler definitions (with schedules) |

#### What's Missing (CRITICAL)
- ❌ **`processRecoveryEmailJob` handler** — Body is a stub returning `processed: 0`. Contains `// Implementation would:` comments but **no actual email rendering or sending code**.
- ❌ **`checkAbandonedCheckoutsJob` handler** — Stub. Does not query abandoned checkouts or schedule recovery emails.
- ❌ **`processRecoveryQueueJob` handler** — Stub. Does not fetch or send queued emails.
- ❌ **`expireOldCheckoutsJob` handler** — Stub. Does not update any checkout records.
- ❌ **Trigger.dev task files** — No recovery tasks in `packages/jobs/src/trigger/`. No Trigger.dev wiring for the recovery job handlers.
- ❌ **SMS recovery** — Phase spec calls for SMS as an alternative/supplement to email. No SMS recovery option exists anywhere.
- ❌ **Recovery email templates** — No email template for abandoned cart (check `packages/email/src/` or similar).
- ❌ **Recovery analytics** — No conversion tracking (which email/sequence converted the checkout), no sequence performance dashboard.

---

### 5. DAM Asset Management
**Status: ⚠️ Partially Implemented**

#### What Exists
| File/Directory | Description |
|---|---|
| `packages/dam/src/assets/crud.ts` | Asset CRUD with tenant isolation |
| `packages/dam/src/assets/metadata.ts` | Metadata extraction |
| `packages/dam/src/assets/thumbnails.ts` | Thumbnail generation |
| `packages/dam/src/audit.ts` | Audit logging |
| `packages/dam/src/collections/db.ts` | Collection CRUD |
| `packages/dam/src/gdrive/api.ts` | Google Drive API client |
| `packages/dam/src/gdrive/oauth.ts` | OAuth flow |
| `packages/dam/src/gdrive/sync.ts` | Sync logic (initial + incremental) |
| `packages/dam/src/gdrive/tokens.ts` | Token encryption/refresh |
| `packages/dam/src/gdrive/db.ts` | GDrive DB operations |
| `packages/dam/src/import-queue/db.ts` | Import queue DB ops |
| `packages/dam/src/search/full-text.ts` | PostgreSQL FTS |
| `packages/dam/src/search/tags.ts` | Tag-based search |
| `packages/dam/src/storage/interface.ts` | IStorageProvider interface |
| `packages/dam/src/storage/vercel-blob.ts` | Vercel Blob storage |
| `packages/dam/src/types.ts` | Core type definitions |
| `apps/admin/src/app/admin/dam/page.tsx` | Asset library main page |
| `apps/admin/src/app/admin/dam/upload/page.tsx` | Upload interface |
| `apps/admin/src/app/admin/dam/asset-library-client.tsx` | Client-side library grid |
| `apps/admin/src/app/api/admin/dam/assets/route.ts` | Assets list + upload API |
| `apps/admin/src/app/api/admin/dam/assets/[id]/route.ts` | Asset detail API |
| `apps/admin/src/app/api/admin/dam/assets/bulk/route.ts` | Bulk operations API |
| `apps/admin/src/app/api/admin/dam/collections/route.ts` | Collections list API |
| `apps/admin/src/app/api/admin/dam/collections/[id]/route.ts` | Collection detail API |
| `apps/admin/src/app/api/admin/dam/collections/[id]/assets/route.ts` | Collection assets API |
| `apps/admin/src/app/api/admin/dam/gdrive/connect/route.ts` | GDrive OAuth initiation |
| `apps/admin/src/app/api/admin/dam/gdrive/callback/route.ts` | GDrive OAuth callback |
| `apps/admin/src/app/api/admin/dam/gdrive/connections/route.ts` | Connections list API |
| `apps/admin/src/app/api/admin/dam/gdrive/connections/[id]/route.ts` | Connection GET/PATCH/DELETE |
| `apps/admin/src/app/api/admin/dam/import-queue/route.ts` | Import queue list + stats API |
| `apps/admin/src/app/api/admin/dam/search/route.ts` | Search API |
| `apps/admin/src/app/api/admin/dam/tags/suggestions/route.ts` | Tag autocomplete |
| `apps/admin/src/components/admin/dam/asset-card.tsx` | Asset thumbnail card |
| `apps/admin/src/components/admin/dam/asset-detail-modal.tsx` | Full asset detail modal |
| `apps/admin/src/components/admin/dam/asset-uploader.tsx` | Drag-drop upload |
| `apps/admin/src/components/admin/dam/bulk-actions-bar.tsx` | Multi-select actions |
| `apps/admin/src/components/admin/dam/collection-sidebar.tsx` | Collection navigation |
| `apps/admin/src/components/admin/dam/search-bar.tsx` | Search with filters |

#### What's Missing
- ❌ **Admin UI pages**: No `dam/collections/page.tsx`, no `dam/import-queue/page.tsx`, no `dam/gdrive/page.tsx`, no `dam/settings/page.tsx` — all 4 sub-pages are absent from the admin app.
- ❌ **Import queue approve/skip routes** — `/api/admin/dam/import-queue/[id]/approve` and `/api/admin/dam/import-queue/[id]/skip` do not exist. Bulk queue approval is also absent.
- ❌ **GDrive manual sync route** — `/api/admin/dam/gdrive/connections/[id]/sync` (POST) is not implemented.
- ❌ **GDrive webhook route** — `/api/admin/dam/gdrive/webhook` (POST) for push notifications is not implemented.
- ❌ **`packages/dam/src/gdrive/webhooks.ts`** — The webhook handling logic file is absent from the package.
- ❌ **`packages/dam/src/storage/gdrive.ts`** — Google Drive as a storage provider (spec'd in deliverables) is absent.
- ❌ **`packages/dam/src/search/suggestions.ts`** — Autocomplete suggestions logic file is absent (tag suggestion route exists in admin but no backing logic file).
- ❌ **`packages/dam/src/collections/types.ts` + `smart.ts`** — Smart collection rules engine is absent.
- ❌ **`packages/dam/src/ai/` module** — Entire AI tagging, description generation, and face detection module is absent.
- ❌ **UI components**: `tag-editor.tsx`, `metadata-panel.tsx`, `import-queue-table.tsx`, `gdrive-connection-card.tsx` are all absent from `apps/admin/src/components/admin/dam/`.

---

### 6. DAM Approval Workflows
**Status: ❌ Not Implemented**

> The entire PHASE-3F-DAM-WORKFLOWS subsystem is absent. Despite the phase doc being marked COMPLETE (2026-02-12), **zero files** from the spec exist in the codebase.

#### What's Missing (Everything)
**Package modules:**
- ❌ `packages/dam/src/versions/` — Version control (snapshot, restore, prune)
- ❌ `packages/dam/src/ad-review/` — Ad review workflow (projects, versions, review decisions, frame comments)
- ❌ `packages/dam/src/collaboration/` — Asset comments, annotations, @mention parsing
- ❌ `packages/dam/src/rights/` — Rights management, expiry tracking
- ❌ `packages/dam/src/exports/` — TikTok Marketing API export, Meta export, ZIP download

**Database tables (none migrated):**
- ❌ `dam_asset_versions`
- ❌ `dam_ad_projects`
- ❌ `dam_ad_versions`
- ❌ `dam_review_decisions`
- ❌ `dam_frame_comments`
- ❌ `dam_asset_comments`
- ❌ `dam_annotations`
- ❌ `dam_user_mentions`
- ❌ `dam_notification_settings`
- ❌ `dam_notifications`
- ❌ `dam_ad_exports`
- ❌ `tiktok_connected_accounts`

**API routes (none exist):**
- ❌ `/api/admin/dam/assets/[id]/versions` (GET, POST)
- ❌ `/api/admin/dam/assets/[id]/versions/[versionId]/restore`
- ❌ `/api/admin/dam/ad-projects` (GET, POST)
- ❌ `/api/admin/dam/ad-projects/[id]` (GET, PATCH, DELETE)
- ❌ `/api/admin/dam/ad-projects/[id]/submit`
- ❌ `/api/admin/dam/ad-projects/[id]/versions`
- ❌ `/api/admin/dam/ad-projects/[id]/decisions`
- ❌ `/api/admin/dam/ad-versions/[id]/comments` (GET, POST)
- ❌ `/api/admin/dam/assets/[id]/comments` (GET, POST)
- ❌ `/api/admin/dam/comments/[id]` (PATCH, DELETE)
- ❌ `/api/admin/dam/notifications` (GET)
- ❌ `/api/admin/dam/notifications/settings` (GET, PUT)
- ❌ `/api/admin/dam/export/tiktok`
- ❌ `/api/admin/dam/export/meta`
- ❌ `/api/admin/dam/export/zip`

**Admin UI pages (none exist):**
- ❌ `apps/admin/src/app/admin/dam/ad-review/`
- ❌ `apps/admin/src/app/admin/dam/assets/[id]/versions/`

**Admin UI components (none exist):**
- ❌ `version-history.tsx`
- ❌ `ad-review-board.tsx`
- ❌ `review-panel.tsx`
- ❌ `frame-comment-overlay.tsx`
- ❌ `annotation-tools.tsx`
- ❌ `notification-feed.tsx`
- ❌ `rights-status-badge.tsx`
- ❌ `expiry-calendar.tsx`
- ❌ `export-modal.tsx`
- ❌ `tiktok-account-manager.tsx`

**Background jobs:**
- ❌ Rights expiry check job (`dam-rights-expiry-check`)

---

### 7. Promo Codes/Discounts
**Status: ⚠️ Partially Implemented**

> Phase doc marked COMPLETE. Core admin UI and API is implemented. Key gaps are missing background jobs and one route.

#### What Exists
| File/Directory | Description |
|---|---|
| `apps/admin/src/app/admin/commerce/promo-codes/page.tsx` | Promo codes list |
| `apps/admin/src/app/admin/commerce/promotions/page.tsx` | Promotions calendar |
| `apps/admin/src/app/admin/commerce/selling-plans/page.tsx` | Selling plans editor |
| `apps/admin/src/app/api/admin/promo-codes/route.ts` | List + create API |
| `apps/admin/src/app/api/admin/promo-codes/[code]/route.ts` | Detail API |
| `apps/admin/src/app/api/admin/promo-codes/bulk/route.ts` | Bulk generate API |
| `apps/admin/src/app/api/admin/promotions/route.ts` | Promotions list + create |
| `apps/admin/src/app/api/admin/promotions/[id]/route.ts` | Promotion detail |
| `apps/admin/src/app/api/admin/promotions/active/route.ts` | Active promotions |
| `apps/admin/src/app/api/admin/selling-plans/route.ts` | Selling plans list + create |
| `apps/admin/src/app/api/admin/selling-plans/[id]/route.ts` | Selling plan detail |
| `apps/admin/src/lib/selling-plans/db.ts` | Selling plan DB ops |
| `apps/admin/src/lib/selling-plans/types.ts` | Selling plan types |
| `apps/storefront/src/app/d/[code]/route.ts` | Shareable discount link (/d/CODE) with OG + redirect |

#### What's Missing
- ❌ **Selling plans sync route** — `/api/admin/selling-plans/sync` (POST for Shopify sync) is absent. Only `route.ts` and `[id]/route.ts` exist; no `sync/` subdirectory.
- ❌ **Promotion status background job** — No job to auto-transition `scheduled → active → ended` based on `starts_at`/`ends_at`.
- ❌ **Promo code usage sync job** — No background job to sync `uses_count` / `revenue_generated` from Shopify back to `promo_code_metadata`.
- ❌ **Selling plan Shopify sync job** — No job to push selling plan changes to Shopify Storefront/Admin API.
- ❌ **`/api/admin/promo-codes/[code]/metadata` route** — Separate metadata endpoint from the spec is absent (though basic code detail may cover this).

---

### 8. Customer Segments
**Status: ⚠️ Partially Implemented**

> Phase doc marked COMPLETE. UI and API routes exist, but background jobs and schema files are absent.

#### What Exists
| File/Directory | Description |
|---|---|
| `apps/admin/src/app/admin/segments/page.tsx` | Segments overview (Shopify + RFM tabs) |
| `apps/admin/src/app/admin/segments/[id]/page.tsx` | Segment detail with customer list |
| `apps/admin/src/app/api/admin/segments/route.ts` | Combined segments list |
| `apps/admin/src/app/api/admin/segments/shopify/route.ts` | Shopify segments (GET + sync) |
| `apps/admin/src/app/api/admin/segments/rfm/route.ts` | RFM calculation API |
| `apps/admin/src/app/api/admin/segments/[id]/customers/route.ts` | Customers in segment |
| `apps/admin/src/app/admin/samples/page.tsx` | Samples tracking (UGC + TikTok) |
| `apps/admin/src/app/admin/samples/new/page.tsx` | New sample form |
| `apps/admin/src/app/admin/samples/sample-status-badge.tsx` | Status badge |
| `apps/admin/src/app/admin/samples/sample-actions.tsx` | Sample action buttons |
| `apps/admin/src/app/api/admin/samples/route.ts` | Samples API |
| `apps/admin/src/app/api/admin/samples/settings/route.ts` | Sample tag settings |
| `apps/admin/src/app/api/admin/samples/bulk-status/route.ts` | Bulk status update |
| `apps/admin/src/app/api/admin/samples/orders/route.ts` | Sample orders |
| `apps/admin/src/app/api/admin/samples/orders/stats/route.ts` | Sample order stats |
| `apps/admin/src/app/api/admin/integrations/klaviyo/` | Full Klaviyo integration (connect, lists, sync, config, status, test, disconnect) |
| `packages/integrations/src/klaviyo/` | Klaviyo integration package (config, connect, index) |

#### What's Missing
- ❌ **Database schema files** — `packages/db/src/schema/cached-segments.ts`, `packages/db/src/schema/customer-rfm-segments.ts`, `packages/db/src/schema/samples-config.ts`, `packages/db/src/schema/klaviyo-sync-config.ts` not found. Schema definitions appear to be inline or absent.
- ❌ **Background job: Shopify segment sync** — No `packages/jobs/src/trigger/` task for syncing Shopify segments every 6 hours.
- ❌ **Background job: RFM calculation** — No trigger task for daily RFM recalculation (3 AM). RFM route may calculate on-demand but no scheduled job exists.
- ❌ **Background job: Klaviyo list sync** — Referenced in jobs events.ts but no trigger task file found for pushing/pulling Klaviyo list changes every 30 min.
- ❌ **RFM distribution chart** — Spec calls for a pie/bar chart showing segment size distribution. No chart component found in the segments UI.
- ❌ **Segment selector for promo codes** — Spec says segments should be selectable when creating promo codes. This cross-feature link is not wired in the promo code creation flow.

---

### 9. Gift Cards
**Status: ⚠️ Mostly Implemented (Background jobs deferred)**

> Phase doc marked COMPLETE. Core system is substantially implemented. Gaps are deferred background jobs.

#### What Exists
| File/Directory | Description |
|---|---|
| `apps/admin/src/app/admin/gift-cards/page.tsx` | Dashboard with stats |
| `apps/admin/src/app/admin/gift-cards/products/page.tsx` | Product management |
| `apps/admin/src/app/admin/gift-cards/transactions/page.tsx` | Transaction list |
| `apps/admin/src/app/admin/gift-cards/emails/page.tsx` | Email queue |
| `apps/admin/src/app/admin/gift-cards/settings/page.tsx` | Settings + template |
| `apps/admin/src/app/api/admin/gift-cards/route.ts` | Stats API |
| `apps/admin/src/app/api/admin/gift-cards/products/route.ts` | Products API |
| `apps/admin/src/app/api/admin/gift-cards/products/sync/route.ts` | Shopify sync |
| `apps/admin/src/app/api/admin/gift-cards/transactions/route.ts` | Transactions list |
| `apps/admin/src/app/api/admin/gift-cards/transactions/[id]/retry/route.ts` | Retry failed credit |
| `apps/admin/src/app/api/admin/gift-cards/emails/route.ts` | Email queue list |
| `apps/admin/src/app/api/admin/gift-cards/emails/[id]/send/route.ts` | Manual email send |
| `apps/admin/src/app/api/admin/gift-cards/settings/route.ts` | Settings GET/PUT |
| `apps/admin/src/lib/gift-card/types.ts` | Type definitions |
| `apps/admin/src/lib/gift-card/db/` | DB: products, transactions, emails, index |
| `apps/admin/src/lib/gift-card/settings.ts` | Settings management |
| `apps/admin/src/lib/gift-card/shopify-products.ts` | Shopify product sync |
| `apps/admin/src/lib/gift-card/process-reward.ts` | Order credit issuance |
| `apps/admin/src/lib/gift-card/emails/` | Email send + index |
| `apps/admin/src/components/admin/gift-cards/StatCard.tsx` | Stat card component |
| `apps/admin/src/components/admin/gift-cards/status-badge.tsx` | Status badge |

#### What's Missing
- ⚠️ **Background job: `gift-card/process-order`** — Core logic exists in `process-reward.ts` but no trigger.dev task wires this to run automatically on order events.
- ⚠️ **Background job: `gift-card/send-email-queue`** — No scheduled job to process queued notification emails. Manual send only.
- ⚠️ **Background job: `gift-card/retry-failed-credits`** — No scheduled retry job; manual retry endpoint exists.
- ⚠️ **Background job: `gift-card/sync-products`** — No scheduled product sync; manual sync endpoint exists.
- ❌ **`ProductForm.tsx` component** — Noted as deferred in phase doc; inline editing used instead.
- ❌ **`EmailTemplateEditor.tsx` component** — Noted as deferred; inline in settings page instead.
- ❌ **Shopify Customer API integration** — `process-reward.ts` has placeholder for Shopify credit issuance but the actual Shopify Customer Credit/Gift Card API call is noted as "placeholder for Shopify API integration" in phase docs.

---

## Prioritized TODO List

### 🔴 P0 — Critical (Blocking production use)

#### P0-1: Implement Recovery Job Handlers
**Files**: `packages/jobs/src/handlers/recovery.ts`, new trigger tasks
```
TODO: Implement processRecoveryEmailJob
  - Fetch recovery email record from DB
  - Fetch abandoned checkout details
  - Get tenant email template and recovery settings
  - Render email with cart items + incentive (promo code if configured)
  - Send via Resend/tenant email provider
  - Update email status to 'sent', increment checkout recovery_email_count

TODO: Implement checkAbandonedCheckoutsJob
  - Query checkouts past abandonment_timeout_hours with 0 recovery emails
  - For each: schedule first recovery email, mark checkout as 'processing'
  - Respect tenant recovery settings (enabled flag, sequence config)

TODO: Implement processRecoveryQueueJob
  - Fetch scheduled emails where scheduled_at <= now() AND status = 'pending'
  - Send each, update status, schedule next in sequence if applicable
  - Check if checkout was recovered before sending (skip if so)

TODO: Implement expireOldCheckoutsJob
  - Query abandoned_checkouts older than daysOld
  - UPDATE status = 'expired', cancel pending emails

TODO: Create Trigger.dev task wrappers in packages/jobs/src/trigger/
  - recovery/process-email.ts
  - recovery/check-abandoned.ts
  - recovery/process-queue.ts
  - recovery/expire-old.ts
```

#### P0-2: Implement DAM Workflows (PHASE-3F-DAM-WORKFLOWS)
**Scope**: Entire subsystem — ~40+ files to create
```
TODO: Database migrations
  - Create dam_asset_versions table
  - Create dam_ad_projects table
  - Create dam_ad_versions table
  - Create dam_review_decisions table
  - Create dam_frame_comments table
  - Create dam_asset_comments table
  - Create dam_annotations table
  - Create dam_user_mentions table
  - Create dam_notification_settings + dam_notifications tables
  - Create dam_ad_exports + tiktok_connected_accounts tables

TODO: Package modules (packages/dam/src/)
  - Create versions/types.ts, versions/db.ts, versions/restore.ts
  - Create ad-review/types.ts, ad-review/projects.ts, ad-review/versions.ts, ad-review/review.ts, ad-review/comments.ts
  - Create collaboration/comments.ts, collaboration/annotations.ts, collaboration/mentions.ts
  - Create collaboration/notifications/index.ts, email.ts, slack.ts
  - Create rights/types.ts, rights/db.ts, rights/expiry.ts
  - Create exports/tiktok.ts, exports/meta.ts, exports/zip.ts

TODO: API routes (apps/admin/src/app/api/admin/dam/)
  - assets/[id]/versions/route.ts (GET, POST)
  - assets/[id]/versions/[versionId]/restore/route.ts (POST)
  - ad-projects/route.ts (GET, POST)
  - ad-projects/[id]/route.ts (GET, PATCH, DELETE)
  - ad-projects/[id]/submit/route.ts (POST)
  - ad-projects/[id]/versions/route.ts (POST)
  - ad-projects/[id]/decisions/route.ts (POST)
  - ad-versions/[id]/comments/route.ts (GET, POST)
  - assets/[id]/comments/route.ts (GET, POST)
  - comments/[id]/route.ts (PATCH, DELETE)
  - notifications/route.ts (GET)
  - notifications/settings/route.ts (GET, PUT)
  - notifications/[id]/read/route.ts (POST)
  - export/tiktok/route.ts (POST)
  - export/meta/route.ts (POST)
  - export/zip/route.ts (POST)

TODO: Admin UI pages
  - apps/admin/src/app/admin/dam/ad-review/page.tsx
  - apps/admin/src/app/admin/dam/ad-review/[id]/page.tsx
  - apps/admin/src/app/admin/dam/assets/[id]/versions/page.tsx

TODO: Admin UI components
  - version-history.tsx
  - ad-review-board.tsx
  - review-panel.tsx
  - frame-comment-overlay.tsx
  - annotation-tools.tsx
  - notification-feed.tsx
  - rights-status-badge.tsx
  - expiry-calendar.tsx
  - export-modal.tsx
  - tiktok-account-manager.tsx

TODO: Background jobs
  - Create rights expiry check task (daily at 9 AM)
  - Wire to packages/jobs/src/trigger/
```

#### P0-3: Complete Gift Card Shopify API Integration
```
TODO: In apps/admin/src/lib/gift-card/process-reward.ts
  - Replace placeholder with actual Shopify Customer Credit API call
  - OR use Shopify Gift Card API (giftCardCreate mutation) 
  - Test end-to-end: order → credit issued → customer balance updated
```

---

### 🟠 P1 — High (Core feature incomplete)

#### P1-1: DAM Missing UI Pages
```
TODO: Create apps/admin/src/app/admin/dam/collections/page.tsx
  - List collections with asset counts
  - Create/edit/delete collection UI
  - Drag-drop asset assignment

TODO: Create apps/admin/src/app/admin/dam/import-queue/page.tsx
  - Queue review table with preview images
  - Approve / Skip / Bulk approve actions
  - Metadata pre-fill on approval

TODO: Create apps/admin/src/app/admin/dam/gdrive/page.tsx
  - List Drive connections with sync status
  - Connect new Drive folder (OAuth flow)
  - Manual sync button per connection
  - Disconnect button

TODO: Create apps/admin/src/app/admin/dam/settings/page.tsx
  - AI tagging toggle
  - Deduplication settings
  - Trash retention period
  - Storage provider config
```

#### P1-2: DAM Missing API Routes
```
TODO: POST /api/admin/dam/import-queue/[id]/approve
TODO: POST /api/admin/dam/import-queue/[id]/skip
TODO: POST /api/admin/dam/import-queue/bulk (approve/skip multiple)
TODO: POST /api/admin/dam/gdrive/connections/[id]/sync
TODO: POST /api/admin/dam/gdrive/webhook (push notification handler)
```

#### P1-3: DAM Missing Package Files
```
TODO: Create packages/dam/src/gdrive/webhooks.ts
  - handleGdriveWebhook() 
  - Parse X-Goog-Resource-State header
  - Trigger incremental sync on 'change'
  - Renew expiring watch channels

TODO: Create packages/dam/src/storage/gdrive.ts
  - GDriveStorageProvider implementing IStorageProvider

TODO: Create packages/dam/src/search/suggestions.ts
  - Tag autocomplete with prefix matching
  - Recent search history

TODO: Create packages/dam/src/collections/types.ts + smart.ts
  - SmartCollection type
  - Smart collection rule evaluation

TODO: Create packages/dam/src/ai/ module
  - tagging.ts — AI tag generation via OpenAI Vision
  - description.ts — AI visual description
  - faces.ts — Face detection (optional)
```

#### P1-4: DAM Missing UI Components
```
TODO: Create apps/admin/src/components/admin/dam/tag-editor.tsx
TODO: Create apps/admin/src/components/admin/dam/metadata-panel.tsx
TODO: Create apps/admin/src/components/admin/dam/import-queue-table.tsx
TODO: Create apps/admin/src/components/admin/dam/gdrive-connection-card.tsx
```

#### P1-5: Video Permissions API & UI
```
TODO: Create apps/admin/src/app/api/admin/videos/[id]/permissions/route.ts
  - GET — list permissions for video
  - POST — add permission (user, email, public, team)
  - DELETE — revoke permission

TODO: Create apps/admin/src/components/admin/videos/permissions-panel.tsx
  - List current permissions
  - Add by email / user / make public
  - Set expiry date
  - Password protection toggle
  - Wire to video detail page
```

---

### 🟡 P2 — Medium (Quality gaps)

#### P2-1: Video Analytics UI Component
```
TODO: Create apps/admin/src/components/admin/videos/video-analytics-panel.tsx
  - Total views, unique viewers, avg watch time, completion rate
  - Views-over-time line chart
  - Watch-time heatmap (which parts of video retain viewers)
  - Wire to video [id] detail page
  - Use getVideoAnalytics() + getVideoViews() from packages/video
```

#### P2-2: Caption Export UI
```
TODO: Add caption download to transcript page
  - Add "Download .vtt" / "Download .srt" buttons to
    apps/admin/src/app/admin/videos/[id]/transcript/page.tsx
  - Create GET /api/admin/videos/[id]/captions?format=vtt|srt route
  - Use captions.ts from packages/video/src/transcription/

TODO: Upload captions to Mux as subtitle track
  - After transcription complete, call Mux subtitle track API
  - Enables in-player captioning for viewers
```

#### P2-3: Selling Plans Sync
```
TODO: Create /api/admin/selling-plans/sync/route.ts (POST)
  - Push selling plan changes to Shopify Storefront API
  - Store returned shopify_selling_plan_id

TODO: Create background job for selling plan Shopify sync
  - packages/jobs/src/trigger/commerce/selling-plan-sync.ts
```

#### P2-4: Promo Code Background Jobs
```
TODO: Create background job: Promotion status updater
  - Every 5 min: check scheduled_promotions where starts_at <= now → set active
  - Every 5 min: check active promotions where ends_at <= now → set ended

TODO: Create background job: Promo code usage sync
  - Periodic: sync uses_count from Shopify API to promo_code_metadata

TODO: Wire jobs to packages/jobs/src/trigger/commerce/
```

#### P2-5: Customer Segments Background Jobs
```
TODO: Create packages/jobs/src/trigger/segments/sync-shopify-segments.ts
  - Run every 6 hours per tenant
  - Upsert to cached_segments table

TODO: Create packages/jobs/src/trigger/segments/calculate-rfm.ts
  - Run daily at 3 AM
  - Calculate RFM scores from last 365 days of orders
  - Upsert to customer_rfm_segments

TODO: Create packages/jobs/src/trigger/segments/sync-klaviyo-lists.ts
  - Run every 30 min for tenants with klaviyo_sync_config
  - Push/pull list membership changes
```

#### P2-6: DB Schema Files for Segments
```
TODO: Create packages/db/src/schema/cached-segments.ts (or migration file)
TODO: Create packages/db/src/schema/customer-rfm-segments.ts
TODO: Create packages/db/src/schema/samples-config.ts
TODO: Create packages/db/src/schema/klaviyo-sync-config.ts
```

#### P2-7: RFM Distribution Chart
```
TODO: Add RFM distribution chart to apps/admin/src/app/admin/segments/page.tsx
  - Pie or bar chart showing segment sizes
  - Segment colors: champions=gold, loyal=green, at_risk=red
  - Use recharts or similar
```

---

### 🟢 P3 — Low (Enhancements)

#### P3-1: Video Annotations
```
TODO: Create packages/video/src/creator-tools/annotations/ module
  - types.ts — Annotation type (rectangle, circle, arrow, freehand, text)
  - db.ts — Save/retrieve annotations per video + timestamp
  - index.ts — Export

TODO: Create admin UI annotation tool
  - Canvas overlay on video player for drawing annotations at timestamps
  - Attached to video detail page
```

#### P3-2: Second Transcription Provider
```
TODO: Create packages/video/src/transcription/providers/deepgram.ts
  - Implement ITranscriptionProvider for Deepgram Nova-2
  - Update factory.ts to select by config
```

#### P3-3: Gift Card Background Jobs
```
TODO: Create packages/jobs/src/trigger/gift-cards/process-order.ts
  - Triggered by order webhook containing gift card variant
  - Call process-reward.ts

TODO: Create packages/jobs/src/trigger/gift-cards/send-email-queue.ts
  - Run every 15 min to process pending gift card emails

TODO: Create packages/jobs/src/trigger/gift-cards/retry-failed-credits.ts
  - Daily: retry credits with status=failed

TODO: Create packages/jobs/src/trigger/gift-cards/sync-products.ts
  - Daily: sync gift card products from Shopify
```

#### P3-4: Recovery SMS
```
TODO: Add SMS recovery option to abandoned checkout settings
TODO: Integrate with SMS provider (Postscript or Klaviyo SMS)
TODO: Create SMS template for recovery message
TODO: Add sequence_sms_delay_hours to recovery settings
```

#### P3-5: Recovery Analytics Dashboard
```
TODO: Add analytics tab to abandoned checkouts admin page
  - Recovery rate per sequence step
  - Revenue recovered
  - Email open/click rates (if provider supports)
  - A/B comparison if multiple sequences tested
```

#### P3-6: Promo Code Segment Targeting
```
TODO: Wire segment selector to promo code creation modal
  - Allow selecting a Shopify or RFM segment for eligibility
  - Store segment_id in promo_code_metadata
  - Enforce at checkout (Shopify discount conditions or client-side check)
```

---

## File Reference Index

### Packages Audited
- `packages/video/src/` — 51 files ✅ Exists
- `packages/dam/src/` — 17 files ⚠️ Partial
- `packages/commerce/src/` — 10 files (Google Feed + Shopify client only; no cart recovery/segments/gift cards here — those are in admin app)
- `packages/jobs/src/handlers/recovery.ts` — ⚠️ Stub implementations
- `packages/jobs/src/handlers/video-transcription.ts` — ✅ Implemented
- `packages/jobs/src/trigger/` — ❌ Missing video, recovery, segments, gift-cards trigger tasks

### Admin App — Implemented
- `apps/admin/src/app/admin/videos/` — ✅
- `apps/admin/src/app/admin/dam/page.tsx` + `upload/` — ⚠️ Partial
- `apps/admin/src/app/admin/commerce/` — ✅ (promo, promotions, selling-plans, abandoned-checkouts)
- `apps/admin/src/app/admin/segments/` — ✅
- `apps/admin/src/app/admin/samples/` — ✅
- `apps/admin/src/app/admin/gift-cards/` — ✅

### Admin App — Missing
- `apps/admin/src/app/admin/dam/collections/` — ❌
- `apps/admin/src/app/admin/dam/import-queue/` — ❌
- `apps/admin/src/app/admin/dam/gdrive/` — ❌
- `apps/admin/src/app/admin/dam/settings/` — ❌
- `apps/admin/src/app/admin/dam/ad-review/` — ❌
- `apps/admin/src/app/api/admin/videos/[id]/permissions/` — ❌
- `apps/admin/src/app/api/admin/dam/import-queue/[id]/approve` — ❌
- `apps/admin/src/app/api/admin/dam/gdrive/connections/[id]/sync` — ❌
- `apps/admin/src/app/api/admin/dam/gdrive/webhook` — ❌
- `apps/admin/src/app/api/admin/dam/ad-projects/` — ❌
- `apps/admin/src/app/api/admin/dam/assets/[id]/versions/` — ❌
- `apps/admin/src/app/api/admin/dam/export/` — ❌
- `apps/admin/src/app/api/admin/dam/notifications/` — ❌
- `apps/admin/src/app/api/admin/selling-plans/sync/` — ❌

---

## Notes & Observations

1. **Phase Status Inflation**: Several phases are marked `✅ COMPLETE` in their spec headers but have critical unimplemented gaps. Most notably: PHASE-3E-ECOMMERCE-RECOVERY (job stubs), PHASE-3F-DAM-WORKFLOWS (0% implemented), PHASE-3G-ECOMMERCE-SEGMENTS (no background jobs).

2. **packages/commerce/src is thin**: The `packages/commerce/src/` directory only contains a Google Product Feed generator and a Shopify commerce provider client. Cart recovery, promo codes, segments, and gift cards are all implemented in `apps/admin/src/lib/` rather than as platform packages. This may cause portability issues if other apps need these features.

3. **Trigger.dev gap**: Many job handlers exist in `packages/jobs/src/handlers/` but corresponding `packages/jobs/src/trigger/` task wrappers are absent for: video transcription AI content, recovery emails, segments sync, Klaviyo sync, gift card processing. The handlers are defined but not wired to Trigger.dev.

4. **DAM Workflow completeness illusion**: The `packages/dam/src/` core package is well-structured but PHASE-3F-DAM-WORKFLOWS is 100% absent. This is the largest gap in the entire audit — ~40 files across package modules, API routes, DB migrations, and admin UI components.

5. **Creator portal video gap**: The creator portal has recording, teleprompter, and project file uploads but lacks a standalone video library/management page. Creators can't browse or manage all their videos in one place.
