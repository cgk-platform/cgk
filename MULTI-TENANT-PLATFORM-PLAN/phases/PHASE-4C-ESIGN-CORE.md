# PHASE-4C-ESIGN-CORE: E-Signature System Core

> **STATUS**: ✅ COMPLETE (2026-02-11)
> **Completed By**: Wave 2 Agents

**Duration**: 1.5 weeks (Week 17)
**Depends On**: PHASE-4A (creator portal), PHASE-4B (payments)
**Parallel With**: PHASE-4C-ESIGN-PDF (can start mid-phase)
**Blocks**: PHASE-4C-ESIGN-WORKFLOWS, PHASE-4C-ESIGN-OPERATIONS

---

## Goal

Implement the core e-signature system including contract template library with variable substitution, signer configuration, document lifecycle management, and field types. This phase establishes the foundation for the complete e-sign workflow.

---

## Success Criteria

- [x] Contract template CRUD (`createTemplate`, `getTemplate`, `listTemplates`)
- [x] Template field management (`createTemplateField`, `updateTemplateField`)
- [x] Variable system (`replaceVariables`, `extractVariables`, `validateVariables`)
- [x] Document creation from templates (`createDocument`)
- [x] Signer management (`createSigner`, `getDocumentSigners`)
- [x] Document field copying from templates
- [x] Document lifecycle states working (draft → pending → completed)
- [x] Signing session token generation
- [x] Field types: signature, initial, text, date, checkbox, dropdown, etc.
- [x] Tenant isolation for all e-sign entities

---

## Deliverables

### 1. Database Schema

**Tables** (all in tenant schema):

```sql
-- Contract templates (reusable documents with field placeholders)
CREATE TABLE esign_templates (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  page_count INTEGER,
  thumbnail_url TEXT,
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, archived
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template fields (form fields placed on template)
CREATE TABLE esign_template_fields (
  id VARCHAR(64) PRIMARY KEY,
  template_id VARCHAR(64) NOT NULL REFERENCES esign_templates(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- signature, initial, text, date, etc.
  page INTEGER NOT NULL,
  x DECIMAL(6,2) NOT NULL, -- Percentage 0-100 from left
  y DECIMAL(6,2) NOT NULL, -- Percentage 0-100 from top (CSS-style)
  width DECIMAL(6,2) NOT NULL,
  height DECIMAL(6,2) NOT NULL,
  required BOOLEAN DEFAULT true,
  placeholder TEXT,
  default_value TEXT,
  options JSONB, -- For dropdown/checkbox options
  validation JSONB DEFAULT '{}',
  group_id VARCHAR(64), -- For grouping related fields
  formula TEXT, -- For computed fields
  read_only BOOLEAN DEFAULT false,
  signer_order INTEGER DEFAULT 1, -- Which signer fills this (1=primary, 2=counter-signer)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document instances (created from templates)
CREATE TABLE esign_documents (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id VARCHAR(64) REFERENCES esign_templates(id) ON DELETE SET NULL,
  creator_id VARCHAR(64), -- Optional link to creator
  name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  signed_file_url TEXT,
  status VARCHAR(20) DEFAULT 'draft', -- draft, pending, in_progress, completed, declined, voided, expired
  expires_at TIMESTAMPTZ,
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_days INTEGER DEFAULT 3,
  last_reminder_at TIMESTAMPTZ,
  message TEXT, -- Custom message for signers
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Signers on documents
CREATE TABLE esign_signers (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL REFERENCES esign_documents(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'signer', -- signer, cc, viewer, approver
  signing_order INTEGER DEFAULT 1, -- Order in which to sign (for sequential)
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, viewed, signed, declined
  access_token VARCHAR(64), -- Secure token for signing link
  is_internal BOOLEAN DEFAULT false, -- True for counter-signers (sign from admin)
  ip_address VARCHAR(45),
  user_agent TEXT,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document fields (instances of template fields per document)
CREATE TABLE esign_fields (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL REFERENCES esign_documents(id) ON DELETE CASCADE,
  signer_id VARCHAR(64) REFERENCES esign_signers(id) ON DELETE SET NULL,
  template_field_id VARCHAR(64), -- Link back to template field if from template
  type VARCHAR(20) NOT NULL,
  page INTEGER NOT NULL,
  x DECIMAL(6,2) NOT NULL,
  y DECIMAL(6,2) NOT NULL,
  width DECIMAL(6,2) NOT NULL,
  height DECIMAL(6,2) NOT NULL,
  required BOOLEAN DEFAULT true,
  placeholder TEXT,
  default_value TEXT,
  options JSONB,
  validation JSONB DEFAULT '{}',
  group_id VARCHAR(64),
  formula TEXT,
  read_only BOOLEAN DEFAULT false,
  value TEXT, -- Filled value
  filled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_esign_templates_tenant ON esign_templates(tenant_id);
CREATE INDEX idx_esign_templates_status ON esign_templates(tenant_id, status);
CREATE INDEX idx_esign_documents_tenant ON esign_documents(tenant_id);
CREATE INDEX idx_esign_documents_status ON esign_documents(tenant_id, status);
CREATE INDEX idx_esign_documents_creator ON esign_documents(creator_id);
CREATE INDEX idx_esign_signers_document ON esign_signers(document_id);
CREATE INDEX idx_esign_signers_token ON esign_signers(access_token);
CREATE INDEX idx_esign_fields_document ON esign_fields(document_id);
CREATE INDEX idx_esign_fields_signer ON esign_fields(signer_id);
```

### 2. Field Types

```typescript
const FIELD_TYPES = [
  'signature',      // Signature capture (drawn/typed/uploaded)
  'initial',        // Initials
  'date_signed',    // Auto-filled date when signed
  'text',           // Single line text
  'textarea',       // Multi-line text
  'number',         // Numeric input
  'date',           // Date picker
  'checkbox',       // Single checkbox
  'checkbox_group', // Multiple checkboxes
  'radio_group',    // Radio button group
  'dropdown',       // Select dropdown
  'name',           // Full name (auto-styled)
  'email',          // Email address
  'company',        // Company name
  'title',          // Job title
  'attachment',     // File upload
  'formula',        // Computed field
  'note',           // Read-only label
] as const
```

### 3. Variable System

**Available Variables by Category:**

```typescript
// Signer variables
'{{signer_name}}'     // Current signer's name
'{{signer_email}}'    // Current signer's email

// Creator variables (when linked to creator)
'{{creator_name}}'           // Creator's name
'{{creator_email}}'          // Creator's email
'{{commission_percent}}'     // Creator's commission %

// Document variables
'{{document_name}}'   // Document title
'{{expiry_date}}'     // Expiration date (formatted)

// System variables
'{{current_date}}'    // Today's date (formatted)
'{{company_name}}'    // Tenant's company name
```

**Functions:**
- `replaceVariables(text, context)` - Replace all variables
- `hasVariables(text)` - Check if text contains variables
- `extractVariables(text)` - Get list of variables in text
- `validateVariables(text)` - Check if all variables are supported
- `getVariablesByCategory()` - Get variables grouped by category

### 4. Core API Functions

```typescript
// packages/esign/src/lib/templates.ts
export async function createTemplate(input: CreateTemplateInput): Promise<EsignTemplate>
export async function getTemplate(tenantId: string, id: string): Promise<EsignTemplate | null>
export async function getTemplateWithFields(tenantId: string, id: string): Promise<TemplateWithFields | null>
export async function listTemplates(tenantId: string, options?: ListOptions): Promise<{ templates: EsignTemplate[]; total: number }>
export async function updateTemplate(tenantId: string, id: string, input: UpdateTemplateInput): Promise<EsignTemplate | null>
export async function deleteTemplate(tenantId: string, id: string): Promise<boolean>
export async function archiveTemplate(tenantId: string, id: string): Promise<EsignTemplate | null>
export async function activateTemplate(tenantId: string, id: string): Promise<EsignTemplate | null>
export async function duplicateTemplate(tenantId: string, id: string, newName: string, createdBy: string): Promise<EsignTemplate | null>

// Field operations
export async function createTemplateField(input: CreateTemplateFieldInput): Promise<EsignTemplateField>
export async function updateTemplateField(id: string, input: Partial<CreateTemplateFieldInput>): Promise<EsignTemplateField | null>
export async function deleteTemplateField(id: string): Promise<boolean>
export async function getTemplateFields(templateId: string): Promise<EsignTemplateField[]>
export async function replaceTemplateFields(templateId: string, fields: CreateTemplateFieldInput[]): Promise<EsignTemplateField[]>

// packages/esign/src/lib/documents.ts
export async function createDocument(input: CreateDocumentInput): Promise<EsignDocument>
export async function getDocument(tenantId: string, id: string): Promise<EsignDocument | null>
export async function getDocumentWithSigners(tenantId: string, id: string): Promise<DocumentWithSigners | null>
export async function listDocuments(tenantId: string, options?: ListOptions): Promise<{ documents: DocumentWithSigners[]; total: number }>
export async function updateDocument(tenantId: string, id: string, input: UpdateDocumentInput): Promise<EsignDocument | null>

// Status management
export async function markDocumentPending(tenantId: string, id: string): Promise<EsignDocument | null>
export async function markDocumentInProgress(tenantId: string, id: string): Promise<EsignDocument | null>
export async function markDocumentCompleted(tenantId: string, id: string, signedFileUrl: string): Promise<EsignDocument | null>
export async function markDocumentDeclined(tenantId: string, id: string): Promise<EsignDocument | null>
export async function voidDocument(tenantId: string, id: string): Promise<EsignDocument | null>
export async function checkAllSignersSigned(documentId: string): Promise<boolean>

// packages/esign/src/lib/signers.ts
export async function createSigner(input: CreateSignerInput): Promise<EsignSigner>
export async function getSigner(id: string): Promise<EsignSigner | null>
export async function getSignerByToken(accessToken: string): Promise<EsignSigner | null>
export async function getDocumentSigners(documentId: string): Promise<EsignSigner[]>
export async function updateSigner(id: string, input: UpdateSignerInput): Promise<EsignSigner | null>
export async function markSignerSent(id: string): Promise<EsignSigner | null>
export async function markSignerViewed(id: string, ipAddress?: string, userAgent?: string): Promise<EsignSigner | null>
export async function markSignerSigned(id: string, ipAddress?: string, userAgent?: string): Promise<EsignSigner | null>
export async function markSignerDeclined(id: string, reason?: string, ipAddress?: string, userAgent?: string): Promise<EsignSigner | null>
export async function regenerateAccessToken(id: string): Promise<EsignSigner | null>

// packages/esign/src/lib/fields.ts
export async function createField(input: CreateFieldInput): Promise<EsignField>
export async function getDocumentFields(documentId: string): Promise<EsignField[]>
export async function getSignerFields(signerId: string): Promise<EsignField[]>
export async function updateField(id: string, input: UpdateFieldInput): Promise<EsignField | null>
export async function setFieldValue(id: string, value: string): Promise<EsignField | null>
export async function copyFieldsFromTemplate(templateId: string, documentId: string, signerId: string): Promise<EsignField[]>
export async function areRequiredFieldsFilled(signerId: string): Promise<boolean>
```

### 5. Admin API Routes

```
POST   /api/admin/esign/templates           - Create template
GET    /api/admin/esign/templates           - List templates
GET    /api/admin/esign/templates/[id]      - Get template
PUT    /api/admin/esign/templates/[id]      - Update template
DELETE /api/admin/esign/templates/[id]      - Delete template
POST   /api/admin/esign/templates/[id]/fields - Save template fields
POST   /api/admin/esign/templates/[id]/duplicate - Duplicate template
POST   /api/admin/esign/templates/[id]/reupload - Re-upload PDF

POST   /api/admin/esign/documents           - Create document
GET    /api/admin/esign/documents           - List documents
GET    /api/admin/esign/documents/[id]      - Get document with signers
PUT    /api/admin/esign/documents/[id]      - Update document
DELETE /api/admin/esign/documents/[id]      - Delete document
POST   /api/admin/esign/documents/[id]/send - Send document for signing
POST   /api/admin/esign/documents/[id]/void - Void document

GET    /api/admin/esign/stats               - E-sign statistics
```

### 6. Admin UI Pages

```
/admin/esign                  - Dashboard (stats, recent documents)
/admin/esign/templates        - Template list with status filtering
/admin/esign/templates/new    - Create new template
/admin/esign/templates/[id]/edit    - Edit template metadata
/admin/esign/templates/[id]/editor  - Visual field editor
/admin/esign/documents        - Document list with status filtering
/admin/esign/documents/new    - Create document from template
/admin/esign/documents/[id]   - Document detail with signer status
```

---

## Constraints

- All templates and documents are tenant-isolated
- Templates stored in Vercel Blob at `esign/templates/{tenantId}/{templateId}/`
- Documents stored in Vercel Blob at `esign/documents/{tenantId}/{documentId}/`
- Access tokens use nanoid (21 chars) for secure links
- Field positions stored as percentages (0-100) from top-left corner
- PDF coordinate conversion handled in PHASE-4C-ESIGN-PDF

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Template editor, field palette, document dashboard

**MCPs to consult:**
- Context7 MCP: "nanoid token generation"
- Context7 MCP: "Vercel Blob storage patterns"

**RAWDOG code to reference:**
- `src/lib/esign/types.ts` - Full type definitions
- `src/lib/esign/db/templates.ts` - Template CRUD patterns
- `src/lib/esign/db/documents.ts` - Document lifecycle
- `src/lib/esign/db/signers.ts` - Signer management
- `src/lib/esign/db/fields.ts` - Field operations
- `src/lib/esign/variables.ts` - Variable system
- `src/lib/esign/constants.ts` - Configuration values
- `src/app/admin/esign/` - Admin UI reference

---

## Tasks

### [PARALLEL] Database migrations
- [x] Create migration for `esign_templates`
- [x] Create migration for `esign_template_fields`
- [x] Create migration for `esign_documents`
- [x] Create migration for `esign_signers`
- [x] Create migration for `esign_fields`
- [x] Add tenant isolation indexes

### [PARALLEL with DB] Type definitions
- [x] Create `packages/esign/src/types.ts` with all interfaces
- [x] Define field types enum
- [x] Define status enums
- [x] Define signer roles

### [SEQUENTIAL after DB] Template operations
- [x] Implement `createTemplate`
- [x] Implement `getTemplate`, `getTemplateWithFields`
- [x] Implement `listTemplates` with filtering
- [x] Implement `updateTemplate`, `deleteTemplate`
- [x] Implement `duplicateTemplate`
- [x] Implement `archiveTemplate`, `activateTemplate`

### [SEQUENTIAL after DB] Template field operations
- [x] Implement `createTemplateField`
- [x] Implement `updateTemplateField`, `deleteTemplateField`
- [x] Implement `getTemplateFields`
- [x] Implement `replaceTemplateFields`

### [PARALLEL with templates] Variable system
- [x] Create `packages/esign/src/lib/variables.ts`
- [x] Implement `replaceVariables`
- [x] Implement `hasVariables`, `extractVariables`
- [x] Implement `validateVariables`
- [x] Implement `getVariablesByCategory`

### [SEQUENTIAL after templates] Document operations
- [x] Implement `createDocument` (copies template)
- [x] Implement `getDocument`, `getDocumentWithSigners`
- [x] Implement `listDocuments` with filtering
- [x] Implement document status functions
- [x] Implement `voidDocument`

### [SEQUENTIAL after documents] Signer operations
- [x] Implement `createSigner` with token generation
- [x] Implement `getSignerByToken`
- [x] Implement signer status updates
- [x] Implement `regenerateAccessToken`

### [SEQUENTIAL after signers] Field operations
- [x] Implement `createField`
- [x] Implement `copyFieldsFromTemplate`
- [x] Implement `setFieldValue`
- [x] Implement `areRequiredFieldsFilled`

### [SEQUENTIAL after all] Admin API routes
- [x] Implement template API routes
- [x] Implement document API routes
- [x] Implement stats endpoint

### [SEQUENTIAL after API] Admin UI
- [x] Build e-sign dashboard page
- [x] Build template list page
- [x] Build template editor (visual field placement)
- [x] Build document list page
- [x] Build document detail page

---

## Definition of Done

- [x] Templates can be created, edited, and archived
- [x] Template fields can be placed visually
- [x] Documents can be created from templates
- [x] Signers can be added with access tokens
- [x] Document fields copied from template
- [x] Variable replacement working
- [x] Tenant isolation verified
- [x] `npx tsc --noEmit` passes
- [x] Manual testing: template → document → signer workflow works
