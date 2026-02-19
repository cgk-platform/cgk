# AGENT-18: E-Sign, Tax Compliance & Vendor Management Audit

**Date:** 2026-02-19  
**Auditor:** Agent-18 (Subagent)  
**Scope:** `packages/esign/src/`, `packages/tax/src/`  
**Phase Docs:** PHASE-4C-ESIGN-CORE, PHASE-4C-ESIGN-OPERATIONS, PHASE-4C-ESIGN-PDF, PHASE-4C-ESIGN-WORKFLOWS, PHASE-4D-CREATOR-TAX, PHASE-4E-VENDOR-MANAGEMENT

---

## Executive Summary

| Domain | Status | Completion |
|---|---|---|
| **E-Sign Core** (templates, documents, signers) | ✅ Complete | ~95% |
| **E-Sign PDF Engine** | ✅ Complete (with gap) | ~85% |
| **E-Sign Signing Session Flow** | ⚠️ Nearly complete | ~90% |
| **E-Sign Workflows** | ⚠️ Partial — conditions unimplemented | ~70% |
| **E-Sign Notifications/Email** | ✅ Complete | ~95% |
| **Tax W-9 Collection** | ✅ Complete | ~95% |
| **Tax 1099 Generation** | ✅ Complete (PDF missing) | ~85% |
| **Tax IRS IRIS Filing** | ✅ Complete | ~95% |
| **Tax Corrections** | ✅ Complete | ~95% |
| **Tax Delivery** | ✅ Complete | ~95% |
| **Vendor Management — Types/DB** | ✅ Partially (as stated in phase) | ~40% |
| **Vendor Portal App** | ❌ Not built | 0% |
| **Vendor Invoice Workflow** | ❌ Not built | 0% |
| **Admin Vendor Pages** | ❌ Not built | 0% |

---

## SECTION 1: E-Sign Package (`packages/esign/src/`)

### 1.1 Type System (`types.ts`)

**Status: ✅ COMPLETE**

All types from PHASE-4C specs are implemented:

| Type | Status | Notes |
|---|---|---|
| `TemplateStatus` | ✅ | draft, active, archived |
| `DocumentStatus` | ✅ | draft, pending, in_progress, completed, declined, voided, expired |
| `SignerStatus` | ✅ | pending, sent, viewed, signed, declined |
| `SignerRole` | ✅ | signer, cc, viewer, approver |
| `FieldType` | ✅ | 17 field types including formula, attachment, note |
| `SignatureType` | ✅ | drawn, typed, uploaded |
| `WorkflowStatus` | ✅ | draft, active, archived |
| `WorkflowTriggerType` | ✅ | creator_onboarding, manual, api, scheduled |
| `EsignWorkflow` | ✅ | Full workflow with steps, conditions, timeout |
| `WorkflowExecution` | ✅ | Full execution tracking |
| `CounterSignPending` | ✅ | Admin counter-sign queue type |
| `CompleteSigningResult` | ✅ | Signing completion result |

---

### 1.2 Templates (`lib/templates.ts`)

**Status: ✅ COMPLETE — ⚠️ SQL Injection Risk**

| Feature | Status | Notes |
|---|---|---|
| `createTemplate()` | ✅ | Parameterized query |
| `getTemplate()` | ✅ | By ID, tenant-scoped |
| `getTemplateWithFields()` | ✅ | Returns template + all fields |
| `listTemplates()` | ⚠️ | **SQL injection risk** — filter conditions built via string concatenation (`conditions.push("status = '${status}'"`) |
| `updateTemplate()` | ✅ | Dynamic update with parameterized values |
| `deleteTemplate()` | ✅ | Hard delete |
| `archiveTemplate()` | ✅ | Soft delete via status update |
| `activateTemplate()` | ✅ | Reverse of archive |
| `duplicateTemplate()` | ✅ | Deep copy with all fields |
| `createTemplateField()` | ✅ | All 17 field types |
| `updateTemplateField()` | ✅ | COALESCE-based partial update |
| `deleteTemplateField()` | ✅ | |
| `getTemplateFields()` | ✅ | Ordered by page/y/x |
| `replaceTemplateFields()` | ✅ | Atomic bulk replace |
| `isTemplateActive()` | ✅ | Status check helper |
| `getTemplateCounts()` | ✅ | Stats by status |

**⚠️ Security Issue:** `listTemplates()` and `listDocuments()` build WHERE clauses via string interpolation for `status`, `creatorId`, `createdBy`, and `search` filters. This is SQL injection vulnerable. The search parameter partially escapes single quotes but is incomplete. Tenant context mitigates impact but should still be fixed.

---

### 1.3 Documents (`lib/documents.ts`)

**Status: ✅ COMPLETE — ⚠️ Performance & SQL Issues**

| Feature | Status | Notes |
|---|---|---|
| `createDocument()` | ✅ | Parameterized |
| `getDocument()` | ✅ | |
| `getDocumentWithSigners()` | ✅ | Fetches document + signers + fields + template |
| `listDocuments()` | ⚠️ | SQL injection risk same as templates; **N+1 query issue** — calls `getDocumentWithSigners()` per row |
| `updateDocument()` | ✅ | Dynamic parameterized update |
| `deleteDocument()` | ✅ | Cascades to signers, fields |
| `markDocumentPending()` | ✅ | |
| `markDocumentInProgress()` | ✅ | |
| `markDocumentCompleted()` | ✅ | Sets `signed_file_url` + `completed_at` |
| `markDocumentDeclined()` | ✅ | |
| `voidDocument()` | ✅ | |
| `expireDocument()` | ✅ | |
| `updateLastReminder()` | ✅ | |
| `getDocumentsNeedingReminders()` | ✅ | Interval-based query |
| `getExpiredDocuments()` | ✅ | |
| `getCreatorDocuments()` | ✅ | |
| `getDocumentCounts()` | ✅ | All 7 statuses |
| `checkAllSignersSigned()` | ✅ | Only checks `role='signer'` |
| `getEsignStats()` | ✅ | Dashboard stats with avg completion time |

---

### 1.4 Signers (`lib/signers.ts`)

**Status: ✅ COMPLETE**

| Feature | Status | Notes |
|---|---|---|
| `createSigner()` | ✅ | Auto-generates access token |
| `getSigner()` | ✅ | |
| `getSignerByToken()` | ✅ | For signing flow |
| `getDocumentSigners()` | ✅ | Ordered by signing_order |
| `updateSigner()` | ✅ | Dynamic parameterized |
| `deleteSigner()` | ✅ | |
| `markSignerSent()` | ✅ | |
| `markSignerViewed()` | ✅ | Idempotent — only updates if not already viewed |
| `markSignerSigned()` | ✅ | |
| `markSignerDeclined()` | ✅ | |
| `getNextSigner()` | ✅ | Sequential signing |
| `hasOrderCompleted()` | ✅ | Parallel signing check |
| `getSignersPendingNotification()` | ✅ | |
| `getCCRecipients()` | ✅ | |
| `regenerateAccessToken()` | ✅ | |
| `getSignerStats()` | ✅ | All status counts |
| `getPendingCounterSignatures()` | ✅ | Complex CTE query for admin queue |
| `isInternalSigner()` | ✅ | |
| `generateSigningUrl()` | ✅ | |

---

### 1.5 PDF Engine (`lib/pdf.ts`)

**Status: ✅ COMPLETE — ⚠️ PDF Finalization Gap in Signing Session**

| Feature | Status | Notes |
|---|---|---|
| `embedFieldsInPDF()` | ✅ | Handles all field types |
| Signature embedding | ✅ | PNG/JPEG, data URL + URL, with caching |
| Text embedding | ✅ | Auto font-size, bold for names |
| Date embedding | ✅ | Formatted locale date |
| Number embedding | ✅ | Locale-formatted |
| Checkbox embedding | ✅ | Checkmark (also X variant) |
| `forceFlattenPdf()` | ✅ | Removes AcroForm and annotations |
| `verifyPdfFlattened()` | ✅ | Reports widget/FreeText annotations |
| `getPdfPageInfo()` | ✅ | |
| `getPdfPageCount()` | ✅ | |
| `mergePdfs()` | ✅ | |
| `extractPages()` | ✅ | |
| `addWatermark()` | ✅ | |
| `createSignaturePreview()` | ✅ | Preview with optional border indicators |
| `generateCertificateOfCompletion()` | ✅ | Letter-size page with signer table |
| `appendCertificateOfCompletion()` | ✅ | Merges cert into signed doc |
| `detectSignatureFields()` | ✅ | Detects existing PDF form fields |
| SVG signature support | ❌ | SVG skipped ("must be rasterized first") — drawn signatures using canvas produce PNG so this is acceptable for now |

**⚠️ Gap:** `completeSignerSigning()` in `signing-session.ts` calls `markDocumentCompleted(tenantSlug, document.id, document.file_url)` — passing the **original** (unsigned) file URL, not the finalized signed PDF. The comment says "For now, mark as completed with placeholder URL." Actual PDF finalization via `storage.ts` is not wired into the signing completion path.

---

### 1.6 Signing Session (`lib/signing-session.ts`)

**Status: ⚠️ NEARLY COMPLETE — PDF finalization gap**

| Feature | Status | Notes |
|---|---|---|
| `getSigningSession()` | ✅ | Validates token, doc state, signing order, fields |
| `canSignerSign()` | ✅ | Order-based check |
| `getNextSigners()` | ✅ | Parallel signing support |
| `markDocumentViewed()` | ✅ | Also transitions doc to in_progress |
| `processSignature()` | ✅ | Typed (SVG→dataURL), drawn, uploaded |
| `completeSignerSigning()` | ⚠️ | **Does not finalize PDF** — placeholder URL used |
| `sendToNextSigners()` | ✅ | Updates status to 'sent' |
| `validateSigningToken()` | ✅ | Full validation chain |
| `getSigningProgress()` | ✅ | Progress stats |

---

### 1.7 Workflows (`lib/workflows.ts`)

**Status: ⚠️ PARTIAL — Condition evaluation not implemented**

| Feature | Status | Notes |
|---|---|---|
| `createWorkflow()` | ✅ | |
| `getWorkflow()` | ✅ | |
| `listWorkflows()` | ⚠️ | SQL injection risk (same pattern as templates) |
| `updateWorkflow()` | ✅ | |
| `deleteWorkflow()` | ✅ | Soft delete via archive |
| `activateWorkflow()` | ✅ | |
| `archiveWorkflow()` | ✅ | |
| `createWorkflowExecution()` | ✅ | |
| `getWorkflowExecution()` | ✅ | |
| `updateWorkflowExecution()` | ✅ | |
| `listWorkflowExecutions()` | ✅ | |
| `getPendingExecutions()` | ✅ | |
| `getCurrentStep()` | ✅ | |
| `advanceToNextStep()` | ✅ | |
| `checkStepCondition()` | ❌ | **All cases return `true` — not implemented.** `all_signed`, `any_signed`, `field_value`, `custom` are all stub returns |
| `validateWorkflow()` | ✅ | Name, unique orders, step requirements |
| `getWorkflowsByTrigger()` | ✅ | |
| Workflow → Document creation | ❌ | `advanceToNextStep` advances step tracker but does NOT create documents for the new step. The execution loop that creates documents per step is missing. |
| Workflow execution processor | ❌ | No background job that drives workflow through steps end-to-end |

---

### 1.8 Email Notifications (`lib/email.ts`)

**Status: ✅ COMPLETE**

| Template | Status |
|---|---|
| `buildSigningRequestEmail()` | ✅ |
| `buildSigningCompleteEmail()` | ✅ |
| `buildDocumentCompleteEmail()` | ✅ |
| `buildReminderEmail()` | ✅ (with urgent flag for ≤2 days) |
| `buildVoidNotificationEmail()` | ✅ |
| `buildDeclineNotificationEmail()` | ✅ |
| `buildExpirationWarningEmail()` | ✅ |
| Job payload builders | ✅ (signing request, reminder, completion) |
| `getCompletionRecipients()` | ✅ |
| `getCCRecipients()` | ✅ |
| `getSignersPendingReminder()` | ✅ (with max-reminders guard) |

---

### 1.9 Other E-Sign Files

| File | Status | Notes |
|---|---|---|
| `lib/fields.ts` | ✅ | Field CRUD, value setting, validation, formula eval |
| `lib/signatures.ts` | ✅ | SVG generation, typed signature fonts, validation |
| `lib/audit.ts` | ✅ | Audit log for views, signs, fields, reminders, expires |
| `lib/storage.ts` | ✅ | Vercel Blob for signatures and signed docs |
| `lib/jobs.ts` | ✅ | Reminder processing, expiration handler |
| `lib/notifications.ts` | ✅ | Subject lines, URL generators |
| `lib/variables.ts` | ✅ | Template variable substitution |
| `lib/decline.ts` | ✅ | Decline handling |
| `lib/send.ts` | ✅ | Send document orchestration |
| `lib/coordinates.ts` | ✅ | PDF coordinate conversion (percentage ↔ absolute) |
| `constants.ts` | ✅ | Defaults, error messages, storage paths |
| `index.ts` | ✅ | Package exports |

---

### 1.10 E-Sign Admin UI (apps/admin)

**Status: ✅ COMPLETE** (pages exist)

| Page | Status |
|---|---|
| `/admin/esign` | ✅ Dashboard |
| `/admin/esign/templates` | ✅ Template management |
| `/admin/esign/documents` | ✅ Document list |
| `/admin/esign/documents/[id]/audit` | ✅ Audit trail |
| `/admin/esign/counter-sign` | ✅ Counter-signature queue |
| `/admin/esign/pending` | ✅ Pending documents |
| `/admin/esign/bulk-send` | ✅ Bulk sending |
| `/admin/esign/reports` | ✅ Analytics |
| `/admin/esign/webhooks` | ✅ Webhook config |

---

### 1.11 E-Sign Creator Portal

**Status: ✅ COMPLETE**

| Feature | Status |
|---|---|
| Public signing page `/sign/[token]` | ✅ |
| `SignatureCanvas.tsx` component | ✅ |
| Creator esign API routes | ✅ |
| In-person signing | ✅ (admin-side session management) |

---

## SECTION 2: Tax Package (`packages/tax/src/`)

### 2.1 Type System (`types.ts`)

**Status: ✅ COMPLETE — More comprehensive than spec**

All types from PHASE-4D are implemented and extended:

| Type | Status | Notes |
|---|---|---|
| `PayeeType` | ✅ | creator, contractor, merchant, vendor |
| `TinType` | ✅ | ssn, ein |
| `FormType` | ✅ | 1099-NEC, 1099-MISC, 1099-K |
| `FormStatus` | ✅ | draft, pending_review, approved, filed, corrected, voided |
| `TaxClassification` | ✅ | 13 classifications |
| `TaxAction` | ✅ | 16 audit actions |
| `DeliveryMethod` | ✅ | email, portal, mail |
| `CorrectionType` | ✅ | type1, type2 |
| `W9Status` | ✅ | not_submitted, pending_review, approved, rejected, expired |
| `ReminderLevel` | ✅ | 4-level escalation |
| `W9Data` | ✅ | Full W-9 fields |
| `TaxPayee` | ✅ | With encrypted TIN |
| `TaxForm` | ✅ | Full form lifecycle |
| `TaxFormAuditLog` | ✅ | Audit trail |
| `W9ComplianceTracking` | ✅ | 4-step reminder tracking |
| `TaxReminder` | ✅ | Deadline reminders |
| `TaxYearStats` | ✅ | Dashboard stats |
| `PayeePaymentSummary` | ✅ | Per-payee view |
| `ValidationResult` | ✅ | Pre-filing checks |
| `BulkGenerationResult` | ✅ | Bulk job output |
| `PAYEE_TYPE_FORM_MAP` | ✅ | Creator/Contractor→NEC, Merchant→K, Vendor→MISC |

---

### 2.2 Encryption (`encryption.ts`)

**Status: ✅ COMPLETE — Production quality**

| Feature | Status | Notes |
|---|---|---|
| `encryptTIN()` | ✅ | AES-256-GCM, random IV per call |
| `decryptTIN()` | ✅ | Auth tag verification |
| `getEncryptionKey()` | ✅ | 64-char hex env var, throws if missing/invalid |
| `getLastFour()` | ✅ | Digits-only extraction |
| `maskTIN()` | ✅ | `***-**-1234` or `**-***1234` |
| `formatTIN()` | ✅ | Formatted display |
| `isValidSSN()` | ✅ | Area/group/serial rules + known fakes (13 entries incl. Woolworth) |
| `isValidEIN()` | ✅ | Campus code prefix validation (full list) |
| `isValidTIN()` | ✅ | Dispatcher |
| `detectTINType()` | ✅ | Heuristic SSN/EIN detection |
| `cleanTIN()` | ✅ | Strip non-digits |
| Length check before decrypt | ✅ | Prevents invalid buffer crash |

---

### 2.3 W-9 Storage (`w9.ts`)

**Status: ✅ COMPLETE**

| Feature | Status | Notes |
|---|---|---|
| `validateW9Data()` | ✅ | Required fields, address, ZIP, TIN, certification |
| `saveW9()` | ✅ | Encrypts TIN, logs action, marks compliance complete |
| `updateW9()` | ✅ | Diff-based audit trail |
| `hasCompleteTaxInfo()` | ✅ | |
| `getDecryptedTIN()` | ✅ | Logs every decryption with reason |
| `getW9Status()` | ✅ | Includes 3-year expiry logic |

---

### 2.4 Payment Aggregation (`payments.ts`)

**Status: ✅ COMPLETE**

| Feature | Status | Notes |
|---|---|---|
| `PAYMENT_SOURCES` config | ✅ | All 4 payee types configured |
| `getAnnualPayments()` | ✅ | Per payee, per year |
| `getMonthlyPayments()` | ✅ | Monthly breakdown |
| `getPayeesRequiring1099()` | ✅ | ≥$600 threshold filter |
| `getPayeesApproachingThreshold()` | ✅ | 50-99% range with W-9 join |
| `getPayeesMissingW9()` | ✅ | Anti-join on tax_payees |
| `getTaxYearStats()` | ✅ | Dashboard stats aggregation |
| `getAllPayeeSummaries()` | ✅ | Paginated with sort |
| `exportAnnualPaymentsCSV()` | ✅ | Up to 10k rows |
| Tenant isolation | ✅ | All use `withTenant()` |

---

### 2.5 Form Generation (`form-generation.ts`)

**Status: ✅ COMPLETE — ⚠️ PDF rendering not implemented**

| Feature | Status | Notes |
|---|---|---|
| `getPayerInfo()` | ✅ | Env var config with validation |
| `getFormType()` | ✅ | Uses PAYEE_TYPE_FORM_MAP |
| `generate1099()` | ✅ | Single payee, checks W-9 + threshold |
| `bulkGenerate1099s()` | ✅ | Skips existing non-voided forms |
| `approve1099()` | ✅ | draft/pending_review → approved |
| `bulkApprove1099s()` | ✅ | Bulk approval |
| `void1099()` | ✅ | Blocks voiding filed forms |
| `submitForReview()` | ✅ | draft → pending_review |
| `getFormGenerationStats()` | ✅ | Dashboard counts |
| `getFormsReadyForFiling()` | ✅ | |
| 1099-NEC box amounts | ✅ | box1 |
| 1099-MISC box amounts | ✅ | box3 (⚠️ spec says box7 for services) |
| 1099-K box amounts | ✅ | box1a |
| **1099 PDF rendering** | ❌ | No `pdf-generation.ts` — forms are data records only, no actual IRS-formatted PDF |

---

### 2.6 IRS IRIS Filing (`iris-filing.ts`)

**Status: ✅ COMPLETE**

| Feature | Status | Notes |
|---|---|---|
| `validateForFiling()` | ✅ | W-9, amount, address, TIN checks |
| IRIS CSV format | ✅ | `IRISRecord` structure with all required fields |
| `generateIRISCSV()` | ✅ | Decrypts TIN with audit log for each record |
| `markFormsAsFiled()` | ✅ | Records IRS confirmation number |
| `markFormsAsStateFiled()` | ✅ | State confirmation tracking |
| `getFilingStats()` | ✅ | Filing dashboard |
| TIN decryption audit | ✅ | Logged as "IRIS CSV generation" |

---

### 2.7 Corrections (`corrections.ts`)

**Status: ✅ COMPLETE**

| Feature | Status | Notes |
|---|---|---|
| `createAmountCorrection()` | ✅ | Type 1 — amount only, original stays 'filed' |
| `createInfoCorrection()` | ✅ | Type 2 — voids original, new form with corrected info |
| `getCorrections()` | ✅ | List corrections for a form |
| `hasPendingCorrections()` | ✅ | Guard check |
| Filed-only enforcement | ✅ | Throws if original not 'filed' |

---

### 2.8 Delivery (`delivery.ts`)

**Status: ✅ COMPLETE**

| Feature | Status | Notes |
|---|---|---|
| `markDeliveredByEmail()` | ✅ | |
| `markAvailableInPortal()` | ✅ | |
| `markDeliveryConfirmed()` | ✅ | Portal view tracking |
| `queueForMail()` | ✅ | Mail provider integration stub |
| `updateMailStatus()` | ✅ | Tracks mail status events |
| `bulkMarkAvailableInPortal()` | ✅ | Bulk portal delivery |
| `getDeliveryStatus()` | ✅ | Per-form delivery status |

---

### 2.9 Tax Admin UI (apps/admin)

**Status: ✅ COMPLETE** (all pages from phase spec exist)

| Page | Status |
|---|---|
| `/admin/tax` | ✅ Dashboard |
| `/admin/tax/1099s` | ✅ Form management |
| `/admin/tax/filing` | ✅ IRS IRIS workflow |
| `/admin/tax/w9-status` | ✅ W-9 tracking |
| `/admin/tax/annual-payments` | ✅ Payment breakdown + CSV |
| `/admin/tax/settings` | ✅ Payer config |

**Missing:** `/admin/tax/1099s/[id]` detail page was not found in source (may exist but not in .next types).

---

### 2.10 Tax Gaps

| Gap | Severity | Notes |
|---|---|---|
| **No 1099 PDF renderer** | 🔴 High | `pdf-generation.ts` referenced in phase spec does not exist. Forms are data records — no actual IRS-formatted PDF is produced for delivery. |
| **No state-filing.ts** | 🟡 Medium | State filing is tracked in DB but no state-specific logic module exists. |
| **No W-9 reminder cron task** | 🟡 Medium | Phase doc specifies a Trigger.dev task; depends on Phase 5E jobs infrastructure. `getPendingW9Reminders()` exists in DB but no scheduler calls it. |
| **1099-MISC box mapping** | 🟡 Low | Phase spec says Box 7 for vendor services; implementation uses Box 3 ("other income"). Box 7 was deprecated in 2020 for 1099-NEC but may matter for MISC specifically. |

---

## SECTION 3: Vendor Management (`PHASE-4E`)

### Phase Status: ⚠️ PARTIAL — "Types & DB layer" only

Phase doc explicitly states completion as: **"Types & DB layer"** only. The `vendors` and `vendor_invoices` tables were specified but the portal was **not built**.

### 3.1 What Exists

| Component | Status | Location |
|---|---|---|
| `PayeeType = 'vendor'` | ✅ | `packages/tax/src/types.ts` |
| Vendor payment source config | ✅ | `packages/tax/src/payments.ts` — `vendor_payments` table config |
| Vendor tax form type mapping | ✅ | `PAYEE_TYPE_FORM_MAP.vendor = '1099-MISC'` |
| W-9 for vendors | ✅ | Shared `tax_payees` table via payee_type='vendor' |
| 1099-MISC for vendors | ✅ | Form generation handles vendor type |

### 3.2 What Is Missing

| Component | Status | Notes |
|---|---|---|
| `apps/vendor-portal/` | ❌ | App directory does not exist |
| Vendor signup/authentication | ❌ | No vendor auth routes |
| Vendor dashboard | ❌ | |
| Invoice submission UI | ❌ | `/vendor/invoices/new` not built |
| Invoice list/detail UI | ❌ | |
| Vendor settings pages | ❌ | |
| `vendors` table migration | ❓ | Not confirmed in packages/db |
| `vendor_invoices` table migration | ❓ | Not confirmed in packages/db |
| `Vendor` TypeScript interface | ❓ | Not found in packages/tax or packages/db |
| `VendorInvoice` TypeScript interface | ❓ | Not found |
| `BusinessType` type | ❓ | Not found |
| Invoice submission API | ❌ | No `/api/vendor/invoices` routes |
| Invoice approval API | ❌ | No admin approval routes |
| Admin vendor directory | ❌ | No `/admin/vendors` pages |
| Admin invoice queue | ❌ | No `/admin/vendors/invoices` |
| Payment terms enforcement | ❌ | No due date calculation |
| Auto-approval logic | ❌ | |
| Overdue invoice detection | ❌ | |
| Vendor notifications | ❌ | |
| Contract upload | ❌ | |

---

## SECTION 4: Cross-Cutting Issues

### 4.1 SQL Injection Vulnerabilities

**Severity: 🔴 High (mitigated by tenant context)**

Files affected:
- `packages/esign/src/lib/templates.ts` — `listTemplates()`
- `packages/esign/src/lib/documents.ts` — `listDocuments()`
- `packages/esign/src/lib/workflows.ts` — `listWorkflows()`, `listWorkflowExecutions()`

Pattern: Dynamic WHERE clauses built via string concatenation instead of parameterized queries:
```typescript
// VULNERABLE pattern:
conditions.push(`status = '${status}'`)
const whereClause = `WHERE ${conditions.join(' AND ')}`
await sql.query(`SELECT ... ${whereClause} LIMIT ${limit} OFFSET ${offset}`)
```

**Mitigation:** Tenant context limits blast radius. However, `status` values come from API input and should be validated against an allowlist at minimum.

---

### 4.2 N+1 Query in `listDocuments()`

**Severity: 🟡 Medium**

`listDocuments()` calls `getDocumentWithSigners()` for every returned row, causing N+1 database queries. For a page of 50 documents, this means 51+ queries. Should be replaced with a JOIN-based query.

---

### 4.3 Workflow Execution — Documents Not Created Per Step

**Severity: 🔴 High**

`advanceToNextStep()` updates the `current_step` counter but does **not** create the signing documents for the next step. There is no execution processor that:
1. Reads the new step's template and signer configs
2. Creates `EsignDocument` + `EsignSigner` records
3. Sends signing requests to the new signers

This means workflows can be defined and tracked, but they won't actually drive documents through multi-step processes automatically.

---

### 4.4 PDF Finalization Not Wired to Signing Completion

**Severity: 🔴 High**

`completeSignerSigning()` in `signing-session.ts` marks documents complete with the original PDF URL:
```typescript
// BUG: passes original URL, not finalized signed PDF
await markDocumentCompleted(tenantSlug, document.id, document.file_url)
```

The `storage.ts` module has `finalizeDocument()` which embeds fields, flattens, and uploads to Vercel Blob — but it is never called in the signing flow. This means "completed" documents don't actually have their signatures embedded in the stored PDF.

---

## TODO Lists

### 🔴 Critical (Blockers)

- [ ] **Wire PDF finalization into signing completion** — Call `finalizeDocument()` from `storage.ts` when all signers have signed; update `signed_file_url` with the actual finalized PDF URL
- [ ] **Implement workflow step document creation** — When `advanceToNextStep()` fires, create `EsignDocument` + `EsignSigner` records from the next `WorkflowStep`'s template and signer config; send signing requests
- [ ] **Implement `checkStepCondition()`** — Actually evaluate `all_signed`, `any_signed`, `field_value` conditions against execution document state (currently all return `true`)
- [ ] **Create 1099 PDF renderer** — Build `pdf-generation.ts` in `packages/tax/src/` using pdf-lib to render IRS-formatted 1099-NEC, 1099-MISC, 1099-K forms for delivery

### 🟡 High Priority

- [ ] **Fix SQL injection in list queries** — Replace string-interpolated WHERE clauses with parameterized queries in `listTemplates()`, `listDocuments()`, `listWorkflows()`, `listWorkflowExecutions()`
- [ ] **Fix N+1 in `listDocuments()`** — Replace per-document `getDocumentWithSigners()` calls with a JOIN-based batch query
- [ ] **Build W-9 reminder cron task** — Implement Trigger.dev scheduled task that calls `getPendingW9Reminders()` and sends escalating reminders per `W9ComplianceTracking`
- [ ] **Verify/create vendor DB migrations** — Confirm `vendors` and `vendor_invoices` tables exist in `packages/db`; create migrations if missing
- [ ] **Review 1099-MISC box mapping** — Confirm whether Box 3 (other income) or another box should be used for vendor service payments; Box 7 was moved to 1099-NEC in 2020

### 🟢 Lower Priority (Phase 4E - Vendor Portal)

- [ ] Create `apps/vendor-portal/` Next.js app (or add vendor routes to contractor-portal)
- [ ] Define `Vendor`, `VendorInvoice`, `BusinessType`, `PaymentTerms` TypeScript interfaces (suggest: `packages/tax/src/vendor-types.ts`)
- [ ] Implement vendor self-registration (`POST /api/vendor/onboarding`)
- [ ] Implement vendor authentication (magic link + password, reuse payee auth pattern from creator-portal)
- [ ] Build vendor dashboard (balance, recent payouts, submit invoice CTA)
- [ ] Build invoice submission form with file upload
- [ ] Build invoice list and detail pages
- [ ] Build vendor settings (profile, payout methods, notifications, tax/W-9)
- [ ] Implement invoice workflow API (submit, review, approve, reject, resubmit)
- [ ] Implement due date calculation from `PaymentTerms`
- [ ] Implement auto-approval logic for trusted vendors
- [ ] Implement overdue invoice detection and alerting
- [ ] Build admin vendor directory (`/admin/vendors`)
- [ ] Build admin vendor detail page with payment terms config
- [ ] Build admin invoice queue (`/admin/vendors/invoices`)
- [ ] Build admin invoice approval/rejection workflow
- [ ] Build admin overdue invoice alert view
- [ ] Implement vendor invoice and approval notifications
- [ ] Add contract upload/link management
- [ ] Implement state-filing module (`packages/tax/src/state-filing.ts`)
- [ ] Add `state_filing` support in form-generation and admin UI

---

## Summary Table

| Feature | Spec Phase | Status | Gap |
|---|---|---|---|
| Esign template CRUD | PHASE-4C-ESIGN-CORE | ✅ | SQL injection in list |
| Esign document CRUD | PHASE-4C-ESIGN-CORE | ✅ | N+1 in listDocuments |
| Signer management | PHASE-4C-ESIGN-CORE | ✅ | — |
| Signature capture (drawn/typed/uploaded) | PHASE-4C-ESIGN-CORE | ✅ | SVG needs rasterization |
| Field types (17) | PHASE-4C-ESIGN-CORE | ✅ | — |
| Audit logging | PHASE-4C-ESIGN-CORE | ✅ | — |
| Email notifications | PHASE-4C-ESIGN-OPERATIONS | ✅ | — |
| Reminder jobs | PHASE-4C-ESIGN-OPERATIONS | ✅ | — |
| Expiration handling | PHASE-4C-ESIGN-OPERATIONS | ✅ | — |
| Counter-signature queue | PHASE-4C-ESIGN-OPERATIONS | ✅ | — |
| In-person signing | PHASE-4C-ESIGN-OPERATIONS | ✅ | — |
| PDF field embedding | PHASE-4C-ESIGN-PDF | ✅ | — |
| PDF flattening | PHASE-4C-ESIGN-PDF | ✅ | — |
| Certificate of completion | PHASE-4C-ESIGN-PDF | ✅ | — |
| **PDF finalization in signing flow** | PHASE-4C-ESIGN-PDF | ❌ | Placeholder URL bug |
| Multi-step workflows | PHASE-4C-ESIGN-WORKFLOWS | ⚠️ | Document creation missing |
| Workflow conditions | PHASE-4C-ESIGN-WORKFLOWS | ❌ | All return true |
| Sequential/parallel signing | PHASE-4C-ESIGN-WORKFLOWS | ✅ | — |
| W-9 collection with encryption | PHASE-4D-CREATOR-TAX | ✅ | — |
| AES-256-GCM TIN storage | PHASE-4D-CREATOR-TAX | ✅ | — |
| Payment threshold tracking | PHASE-4D-CREATOR-TAX | ✅ | — |
| 1099 generation (data) | PHASE-4D-CREATOR-TAX | ✅ | — |
| **1099 PDF rendering** | PHASE-4D-CREATOR-TAX | ❌ | pdf-generation.ts missing |
| IRS IRIS CSV export | PHASE-4D-CREATOR-TAX | ✅ | — |
| Type 1/2 corrections | PHASE-4D-CREATOR-TAX | ✅ | — |
| Delivery tracking | PHASE-4D-CREATOR-TAX | ✅ | — |
| W-9 reminder automation | PHASE-4D-CREATOR-TAX | ❌ | No scheduled task |
| State filing | PHASE-4D-CREATOR-TAX | ❌ | state-filing.ts missing |
| Vendor types (DB layer) | PHASE-4E-VENDOR-MANAGEMENT | ⚠️ | Tax types only; no Vendor interface |
| **Vendor portal app** | PHASE-4E-VENDOR-MANAGEMENT | ❌ | Not built |
| **Invoice workflow** | PHASE-4E-VENDOR-MANAGEMENT | ❌ | Not built |
| **Admin vendor pages** | PHASE-4E-VENDOR-MANAGEMENT | ❌ | Not built |

---

*Audit complete. 20 source files read across packages/esign/src/ and packages/tax/src/. Admin app routes verified via .next type stubs and src/ scan.*
