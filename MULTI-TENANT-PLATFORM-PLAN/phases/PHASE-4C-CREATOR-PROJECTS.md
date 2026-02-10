# PHASE-4C: Creator Projects & E-Signatures

**Duration**: 1 week (Week 17)
**Depends On**: PHASE-4A (creator portal), PHASE-4B (payments)
**Parallel With**: None
**Blocks**: PHASE-4D

---

## Goal

Implement project management for creator deliverables, file upload system using Vercel Blob, and e-signature workflow for contracts and agreements.

---

## Success Criteria

- [ ] Project management functions working (`getProjects`, `submitProject`)
- [ ] `creator_projects` table created with status workflow
- [ ] File uploads working with Vercel Blob
- [ ] `project_files` table tracks uploaded files
- [ ] E-signature system functional (`createSigningRequest`, `signDocument`)
- [ ] `esign_documents` table stores document instances
- [ ] `esign_signers` table tracks signer status
- [ ] Access token for secure signing links
- [ ] PDF signature application working
- [ ] Audit logging for e-sign events

---

## Deliverables

### Project Management

- `getProjects(creatorId, filters)` function
- Filters: status, brandId
- Returns: projects with brand_name, file_count
- Database table: `public.creator_projects`
- Fields: id, creator_id, brand_id, status, title, description, due_date, payment_cents

- `submitProject(projectId, creatorId)` function
- Ownership validation
- File requirement check (at least one file)
- Status update to 'submitted'
- Inngest event: `project/submitted`

### File Upload System

- `uploadProjectFile(projectId, file, creatorId)` function
- Vercel Blob storage at `projects/{projectId}/{filename}`
- Database table: `public.project_files`
- Fields: id, project_id, creator_id, name, url, size_bytes, content_type

### E-Signature System

- `createSigningRequest(templateId, creatorId, brandId)` function
- Creates document instance from template
- Generates access token (nanoid 32 chars)
- Creates signer record
- Sends signing request email

- `signDocument(documentId, accessToken, signatureData)` function
- Access token validation
- PDF signature application
- Document status update to 'completed'
- Signer status update to 'signed'
- Audit log entry

### Database Tables

- `public.esign_documents`: template_id, creator_id, brand_id, status, pdf_url, signed_pdf_url, signed_at
- `public.esign_signers`: document_id, creator_id, access_token, status, signed_at

### Audit Logging

- `logEsignAudit(documentId, action, userId)` function
- Actions: created, viewed, signed, declined
- Stored with timestamp and IP address

---

## Constraints

- Files stored in Vercel Blob (not S3)
- Access tokens are single-use for signing
- PDF manipulation for signatures (pdf-lib or similar)
- E-sign templates are per-brand (stored by admin)
- Project status workflow: draft -> submitted -> in_review -> approved/rejected
- At least one file required for submission

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Project list, file upload UI, signature capture component

**MCPs to consult:**
- Context7 MCP: "Vercel Blob upload patterns"
- Context7 MCP: "pdf-lib signature overlay"
- Context7 MCP: "Inngest event patterns"

**RAWDOG code to reference:**
- `src/lib/uploads/` - Existing upload patterns
- `docs/ai-reference/FILE-UPLOADS.md` - Vercel Blob guide
- `src/app/api/contractor/` - Existing contractor API routes

**Spec documents:**
- `ARCHITECTURE.md` - Event-driven patterns

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Signature capture method (canvas draw vs typed name vs upload image)
2. PDF signature placement (fixed position vs field detection)
3. File type validation (allowlist vs blocklist)
4. Large file handling (chunked upload vs direct)

---

## Tasks

### [PARALLEL] Database tables
- [ ] Create migration for `public.creator_projects`
- [ ] Create migration for `public.project_files`
- [ ] Create migration for `public.esign_documents`
- [ ] Create migration for `public.esign_signers`
- [ ] Add appropriate indexes (creator_id, project_id, status)

### [PARALLEL with tables] Project management
- [ ] Create `apps/creator-portal/src/lib/projects/index.ts`
- [ ] Implement `getProjects(creatorId, filters)`
- [ ] Implement project filtering by status and brand

### [SEQUENTIAL after tables] Project submission
- [ ] Implement `submitProject(projectId, creatorId)`
- [ ] Add ownership validation
- [ ] Add file requirement check
- [ ] Implement Inngest event for `project/submitted`

### [PARALLEL with project management] File upload
- [ ] Create `apps/creator-portal/src/lib/files/upload.ts`
- [ ] Implement `uploadProjectFile(projectId, file, creatorId)`
- [ ] Configure Vercel Blob storage path pattern
- [ ] Create file record in database

### [SEQUENTIAL after tables] E-signature creation
- [ ] Create `apps/creator-portal/src/lib/esign/index.ts`
- [ ] Implement `getEsignTemplate(templateId, brandId)`
- [ ] Implement `createSigningRequest(templateId, creatorId, brandId)`
- [ ] Generate access token with nanoid
- [ ] Create signer record
- [ ] Implement `sendSigningRequestEmail(creatorId, documentId, accessToken)`

### [SEQUENTIAL after e-sign creation] Signing flow
- [ ] Implement `signDocument(documentId, accessToken, signatureData)`
- [ ] Implement access token validation
- [ ] Implement `applySignatureToPdf(documentId, signatureData)` using pdf-lib
- [ ] Update document and signer status
- [ ] Implement `logEsignAudit(documentId, action, userId)`

### [SEQUENTIAL after all] UI components
- [ ] Build project list component
- [ ] Build project detail page
- [ ] Build file upload dropzone
- [ ] Build signature capture component
- [ ] Build signing page (accessed via token link)

---

## Definition of Done

- [ ] Projects can be listed with filters
- [ ] Files upload to Vercel Blob successfully
- [ ] Project submission validates file requirement
- [ ] E-signature request creates document and signer
- [ ] Signing with valid token applies signature to PDF
- [ ] Audit log captures all e-sign events
- [ ] `npx tsc --noEmit` passes
- [ ] Manual testing: full e-sign flow works end-to-end
