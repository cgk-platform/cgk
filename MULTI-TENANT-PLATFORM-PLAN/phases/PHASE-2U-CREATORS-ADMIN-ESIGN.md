# PHASE-2U-CREATORS-ADMIN-ESIGN: E-Signature Admin System

**Status**: MOSTLY COMPLETE (Template Editor deferred to PHASE-4C-ESIGN-PDF)
**Duration**: 1.5 weeks (Week 21-22)
**Depends On**: PHASE-4C-ESIGN-CORE, PHASE-4C-ESIGN-PDF, PHASE-4C-ESIGN-WORKFLOWS
**Parallel With**: PHASE-2U-CREATORS-ADMIN-OPS
**Blocks**: None

---

## Goal

Implement comprehensive admin-side e-signature management including document management, template library, bulk send operations, counter-signing workflow, in-person signing, and reporting/analytics.

---

## Success Criteria

- [x] Document list with search, filter, and status tracking
- [x] Document detail page with signer status and audit log
- [x] Template library with CRUD operations
- [ ] Visual template builder/editor - *Deferred: Requires PHASE-4C-ESIGN-PDF*
- [x] Bulk send to multiple recipients
- [x] Counter-signing queue for internal signers
- [x] In-person signing mode for same-device signing
- [x] Reports dashboard with signature analytics
- [x] Webhook configuration UI
- [x] Reminder configuration and sending

---

## Deliverables

### 1. E-Sign Dashboard

**Location**: `/admin/esign`

**Dashboard Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ E-SIGNATURES                                     [+ New Document] [Settings]│
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │ Pending      │ │ In Progress  │ │ Completed    │ │ Counter-Sign │        │
│ │ Signatures   │ │              │ │ This Month   │ │ Queue        │        │
│ │     12       │ │      5       │ │     34       │ │      3       │        │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────────────────────┤
│ QUICK ACTIONS                                                               │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ Templates   │ │ Documents   │ │ Bulk Send   │ │ Reports     │            │
│ │ 8 templates │ │ View all    │ │ Send to many│ │ Analytics   │            │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
├─────────────────────────────────────────────────────────────────────────────┤
│ RECENT DOCUMENTS                                              [View All →] │
│ ┌───────────────────────────────────────────────────────────────────────┐  │
│ │ Document              │ Signers     │ Status      │ Sent      │ Action│  │
│ ├───────────────────────┼─────────────┼─────────────┼───────────┼───────│  │
│ │ Creator Agreement     │ Jane D. (1) │ ⏳ Pending   │ 2h ago    │ [View]│  │
│ │ NDA - Project X       │ John S. (2) │ ✓ Completed │ Yesterday │ [View]│  │
│ │ Contractor Terms      │ Alice M.(1) │ ⏳ Pending   │ 3d ago    │ [View]│  │
│ └───────────────────────┴─────────────┴─────────────┴───────────┴───────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Document List

**Location**: `/admin/esign/documents`

**Table Columns**:
| Column | Description | Sortable |
|--------|-------------|----------|
| Document | Name + template used | Yes |
| Creator | Linked creator if any | Yes |
| Signers | Count + names | No |
| Status | Status badge | Yes |
| Sent | When sent | Yes |
| Expires | Expiration date | Yes |
| Completed | When completed | Yes |
| Actions | View, Resend, Void | No |

**Filters**:
| Filter | Options |
|--------|---------|
| Status | All, Draft, Pending, In Progress, Completed, Declined, Voided, Expired |
| Template | Select from templates |
| Creator | Select creator |
| Date Range | Sent date from/to |
| Expires Soon | Within 3, 7, 14 days |

**Document Statuses**:
| Status | Description | Badge Color |
|--------|-------------|-------------|
| `draft` | Not yet sent | Gray |
| `pending` | Waiting for first signature | Yellow |
| `in_progress` | Partially signed | Blue |
| `completed` | All signatures collected | Green |
| `declined` | Signer declined | Red |
| `voided` | Cancelled by admin | Gray |
| `expired` | Passed expiration date | Orange |

### 3. Document Detail Page

**Location**: `/admin/esign/documents/[id]`

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Back    Creator Agreement - Jane Doe               [Resend] [Void] [⋮]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Status: ⏳ Pending Signature                                               │
│ Template: Creator Agreement v2                                              │
│ Sent: Feb 8, 2024 at 2:30 PM                                               │
│ Expires: Feb 15, 2024 (7 days)                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Overview] [Signers] [Fields] [Audit Log]                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ SIGNERS (2)                                                                │
│ ┌─────────────────────────────────────────────────────────────────────┐    │
│ │ 1. Jane Doe (jane@example.com)                       Order: 1       │    │
│ │    Role: Signer                                                     │    │
│ │    Status: ⏳ Pending (Sent 2h ago)                                 │    │
│ │    [Resend Reminder] [Copy Signing Link]                           │    │
│ ├─────────────────────────────────────────────────────────────────────│    │
│ │ 2. Internal Admin (admin@company.com)                Order: 2       │    │
│ │    Role: Counter-signer (Internal)                                  │    │
│ │    Status: ⏸️ Waiting for previous signer                          │    │
│ └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│ DOCUMENT PREVIEW                                                            │
│ ┌─────────────────────────────────────────────────────────────────────┐    │
│ │                                                                     │    │
│ │                    [PDF Preview Thumbnail]                          │    │
│ │                       Page 1 of 3                                   │    │
│ │                                                                     │    │
│ │                    [Download PDF] [View Full]                       │    │
│ └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│ AUDIT LOG                                                                   │
│ ─────────────────────────────────────────────────────────────────────────  │
│ Feb 8, 2:30 PM - Document sent to jane@example.com                         │
│ Feb 8, 2:45 PM - Document viewed by jane@example.com (IP: 192.168.x.x)    │
│ Feb 8, 2:46 PM - Field "Full Name" filled                                  │
│ ...                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Actions Available**:
| Action | When Available | Effect |
|--------|----------------|--------|
| Resend | Not completed/voided | Resend to pending signers |
| Resend Reminder | Signer pending | Send reminder email |
| Copy Link | Signer pending | Copy unique signing URL |
| Void | Not completed | Cancel document, notify signers |
| Download | Always | Download current/signed PDF |
| View Full | Always | Open PDF viewer |

### 4. Pending Documents

**Location**: `/admin/esign/pending`

**Purpose**: Quick access to documents needing attention.

**Sections**:
1. **Awaiting Your Signature** - Counter-sign documents
2. **Overdue** - Past expiration date
3. **Expiring Soon** - Within 3 days
4. **Stale** - No activity in 7+ days

**Quick Actions**:
- Bulk resend reminders
- Bulk extend expiration
- Bulk void

### 5. Counter-Sign Queue

**Location**: `/admin/esign/counter-sign`

**Purpose**: Queue for documents requiring internal (admin) signatures.

**Workflow**:
1. Creator signs document (Order 1)
2. Document moves to counter-sign queue (Order 2)
3. Admin signs from portal (no email needed)
4. Document marked complete

**Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ COUNTER-SIGN QUEUE                                           [Sign All ▼]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────┐    │
│ │ Creator Agreement - Jane Doe                                        │    │
│ │ Completed by creator: Feb 8 at 3:15 PM                             │    │
│ │ Your turn to sign                                    [Sign Now →]   │    │
│ └─────────────────────────────────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────────────────────────────────┐    │
│ │ NDA - Project Mercury                                               │    │
│ │ Completed by creator: Feb 7 at 11:00 AM                            │    │
│ │ Your turn to sign                                    [Sign Now →]   │    │
│ └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Counter-Sign Flow**:
1. Click "Sign Now"
2. Opens signing interface (same as external, but inline)
3. Complete required fields (signature, date, etc.)
4. Submit → Document marked complete
5. Signed PDF generated and sent to all parties

### 6. In-Person Signing

**Location**: `/admin/esign/documents/[id]/in-person`

**Purpose**: Allow signer to sign on same device as admin (tablet mode).

**Flow**:
1. Admin opens in-person signing mode
2. Hands device to signer
3. Signer sees simplified signing UI
4. Signer completes fields and signs
5. Device returned to admin
6. Admin sees completion confirmation

**In-Person UI**:
- Full-screen signing experience
- Large touch-friendly buttons
- Clear field highlighting
- Signature pad optimized for touch
- "Hand to Signer" / "Return to Admin" prompts
- Optional PIN to exit in-person mode

### 7. Template Library

**Location**: `/admin/esign/templates`

**Template List**:
| Column | Description |
|--------|-------------|
| Template | Name + thumbnail |
| Status | Active, Draft, Archived |
| Fields | Field count |
| Documents | Documents created from template |
| Last Modified | Update timestamp |
| Actions | Edit, Duplicate, Archive |

**Template Actions**:
- Create from scratch
- Upload PDF
- Duplicate existing
- Archive (soft delete)
- Set as default for category

### 8. Template Builder/Editor

**Location**: `/admin/esign/templates/[id]/editor` or `/admin/esign/templates/builder`

**Editor Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Template: Creator Agreement                          [Save Draft] [Publish] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌───────────────────────────────────────────────────┐   │
│ │ FIELD PALETTE   │ │ DOCUMENT PREVIEW                                 │   │
│ │                 │ │ ┌─────────────────────────────────────────────┐  │   │
│ │ Signature       │ │ │                                             │  │   │
│ │ [Drag to add]   │ │ │           [PDF PAGE 1]                      │  │   │
│ │                 │ │ │                                             │  │   │
│ │ Initial         │ │ │     [Signature Field]  [Date Field]        │  │   │
│ │ [Drag to add]   │ │ │                                             │  │   │
│ │                 │ │ │     [Text Field: Name]                      │  │   │
│ │ Date            │ │ │                                             │  │   │
│ │ [Drag to add]   │ │ └─────────────────────────────────────────────┘  │   │
│ │                 │ │                                                   │   │
│ │ Text            │ │ Pages: [1] [2] [3]                               │   │
│ │ [Drag to add]   │ │                                                   │   │
│ │                 │ │ ─────────────────────────────────────────────────│   │
│ │ Checkbox        │ │ SELECTED FIELD PROPERTIES                        │   │
│ │ [Drag to add]   │ │ Field: Signature                                 │   │
│ │                 │ │ Signer: [Primary Signer ▼]                       │   │
│ │ Dropdown        │ │ Required: [✓]                                    │   │
│ │ [Drag to add]   │ │ Size: [150px] x [50px]                          │   │
│ │                 │ │ Position: X: 45% Y: 72%                          │   │
│ └─────────────────┘ └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Field Types**:
| Field | Icon | Description |
|-------|------|-------------|
| Signature | ✍️ | Signature capture (draw/type/upload) |
| Initial | 🔤 | Initials |
| Date Signed | 📅 | Auto-filled on signing |
| Text | Aa | Single line text |
| Text Area | 📝 | Multi-line text |
| Checkbox | ☑️ | Single checkbox |
| Radio Group | ⚪ | Radio button group |
| Dropdown | 🔽 | Select dropdown |
| Date | 📆 | Date picker |
| Email | 📧 | Email with validation |
| Company | 🏢 | Company name |
| Title | 👤 | Job title |

**Editor Features**:
- Drag fields onto PDF
- Resize and reposition fields
- Assign fields to signers
- Set required/optional
- Configure validation
- Field grouping
- Copy/paste fields
- Undo/redo
- Page navigation
- Zoom control
- Grid snap option

### 9. Bulk Send

**Location**: `/admin/esign/bulk-send`

**Workflow**:
1. Select template
2. Upload recipient list (CSV) or select creators
3. Configure personalization
4. Preview sample
5. Schedule or send immediately

**CSV Format**:
```csv
name,email,custom_field_1,custom_field_2
"Jane Doe",jane@example.com,"Value 1","Value 2"
"John Smith",john@example.com,"Value 3","Value 4"
```

**Bulk Send Limits**:
- Max 100 recipients per batch
- Rate limit: 10 documents/minute
- Required: scheduling for 20+ recipients

**Bulk Send Status**:
| Status | Description |
|--------|-------------|
| Queued | Waiting to send |
| Sending | Currently sending |
| Completed | All sent |
| Partial | Some failed |
| Failed | All failed |

### 10. Reports

**Location**: `/admin/esign/reports`

**Metrics**:
| Metric | Description |
|--------|-------------|
| Documents Sent | Total documents sent (period) |
| Completion Rate | % completed vs sent |
| Avg Time to Complete | Mean time from send to complete |
| Decline Rate | % declined |
| Expiration Rate | % expired |
| Top Templates | Most used templates |

**Report Filters**:
- Date range
- Template
- Status
- Creator

**Visualizations**:
- Documents by status (pie chart)
- Completion trend (line chart)
- Time to complete histogram
- Template usage bar chart

### 11. Webhooks Configuration

**Location**: `/admin/esign/webhooks`

**Webhook Events**:
| Event | Trigger |
|-------|---------|
| `document.sent` | Document sent to signers |
| `document.viewed` | Signer viewed document |
| `document.signed` | Signer completed signing |
| `document.completed` | All signers complete |
| `document.declined` | Signer declined |
| `document.expired` | Document expired |
| `document.voided` | Document voided |

**Webhook Configuration**:
- Endpoint URL
- Events to subscribe
- Secret key (for HMAC signature)
- Active/Inactive toggle
- Test webhook button
- Recent deliveries log

**Webhook Payload**:
```json
{
  "event": "document.completed",
  "timestamp": "2024-02-08T15:30:00Z",
  "data": {
    "documentId": "doc_123",
    "documentName": "Creator Agreement",
    "templateId": "tmpl_456",
    "creatorId": "creator_789",
    "signers": [
      {
        "email": "jane@example.com",
        "status": "signed",
        "signedAt": "2024-02-08T15:30:00Z"
      }
    ],
    "signedPdfUrl": "https://..."
  },
  "signature": "sha256=..."
}
```

---

## Database Schema

(Extends PHASE-4C-ESIGN-CORE schema)

```sql
-- Bulk send batches
CREATE TABLE esign_bulk_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id VARCHAR(64) REFERENCES esign_templates(id),
  name VARCHAR(255),
  recipient_count INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'queued', -- queued, sending, completed, partial, failed
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  csv_data JSONB, -- Original CSV mapping
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook configurations
CREATE TABLE esign_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100),
  endpoint_url TEXT NOT NULL,
  secret_key VARCHAR(64) NOT NULL,
  events JSONB NOT NULL DEFAULT '[]', -- List of subscribed events
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook delivery log
CREATE TABLE esign_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES esign_webhooks(id) ON DELETE CASCADE,
  event VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN,
  delivered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_esign_bulk_sends_tenant ON esign_bulk_sends(tenant_id);
CREATE INDEX idx_esign_webhooks_tenant ON esign_webhooks(tenant_id);
CREATE INDEX idx_esign_webhook_deliveries_webhook ON esign_webhook_deliveries(webhook_id);
```

---

## API Routes

### Documents

```
GET /api/admin/esign/documents
  Query: status, templateId, creatorId, dateFrom, dateTo, page, limit
  Returns: { documents: Document[], total: number }

GET /api/admin/esign/documents/[id]
  Returns: { document: Document, signers: Signer[], auditLog: AuditEntry[] }

POST /api/admin/esign/documents
  Body: { templateId, creatorId?, signers: [], message?, expiresAt? }
  Returns: { success: boolean, document: Document }

POST /api/admin/esign/documents/[id]/resend
  Body: { signerId?: string } // Specific signer or all
  Returns: { success: boolean }

POST /api/admin/esign/documents/[id]/void
  Body: { reason?: string }
  Returns: { success: boolean }

GET /api/admin/esign/documents/[id]/download
  Returns: PDF file
```

### Pending & Counter-Sign

```
GET /api/admin/esign/pending
  Returns: { awaiting: Document[], overdue: Document[], expiringSoon: Document[], stale: Document[] }

GET /api/admin/esign/counter-sign
  Returns: { documents: Document[] }

POST /api/admin/esign/documents/[id]/counter-sign
  Body: { fields: FieldValue[], signature: string }
  Returns: { success: boolean, document: Document }
```

### In-Person Signing

```
POST /api/admin/esign/documents/[id]/in-person/start
  Returns: { success: boolean, sessionToken: string }

GET /api/admin/esign/documents/[id]/in-person/[sessionToken]
  Returns: { document: Document, fields: Field[], signer: Signer }

POST /api/admin/esign/documents/[id]/in-person/[sessionToken]/sign
  Body: { fields: FieldValue[], signature: string }
  Returns: { success: boolean }
```

### Templates

```
GET /api/admin/esign/templates
  Query: status
  Returns: { templates: Template[] }

GET /api/admin/esign/templates/[id]
  Returns: Template with fields

POST /api/admin/esign/templates
  Body: CreateTemplatePayload
  Returns: { success: boolean, template: Template }

PATCH /api/admin/esign/templates/[id]
  Body: UpdateTemplatePayload
  Returns: { success: boolean, template: Template }

POST /api/admin/esign/templates/[id]/duplicate
  Returns: { success: boolean, template: Template }

DELETE /api/admin/esign/templates/[id]
  Returns: { success: boolean }
```

### Bulk Send

```
POST /api/admin/esign/bulk-send
  Body: { templateId, recipients: [], scheduledFor? }
  Returns: { success: boolean, bulkSend: BulkSend }

GET /api/admin/esign/bulk-send/[id]
  Returns: BulkSend with status

POST /api/admin/esign/bulk-send/[id]/cancel
  Returns: { success: boolean }
```

### Reports

```
GET /api/admin/esign/reports
  Query: period, templateId
  Returns: ReportData

GET /api/admin/esign/reports/export
  Query: period, format (csv, xlsx)
  Returns: File download
```

### Webhooks

```
GET /api/admin/esign/webhooks
  Returns: { webhooks: Webhook[] }

POST /api/admin/esign/webhooks
  Body: CreateWebhookPayload
  Returns: { success: boolean, webhook: Webhook }

PATCH /api/admin/esign/webhooks/[id]
  Body: UpdateWebhookPayload
  Returns: { success: boolean }

DELETE /api/admin/esign/webhooks/[id]
  Returns: { success: boolean }

POST /api/admin/esign/webhooks/[id]/test
  Returns: { success: boolean, response: any }

GET /api/admin/esign/webhooks/[id]/deliveries
  Query: page, limit
  Returns: { deliveries: Delivery[] }
```

---

## UI Components

```typescript
// packages/admin-core/src/components/esign/
EsignDashboard.tsx          // Main dashboard
DocumentList.tsx            // Document table
DocumentDetail.tsx          // Document detail page
SignersList.tsx             // Signers with status
AuditLog.tsx                // Audit trail display
PendingQueue.tsx            // Pending documents
CounterSignQueue.tsx        // Counter-sign queue
CounterSignModal.tsx        // Inline counter-signing
InPersonSigning.tsx         // In-person signing UI
TemplateList.tsx            // Template library
TemplateEditor.tsx          // Visual template editor
FieldPalette.tsx            // Draggable field types
FieldProperties.tsx         // Field configuration
BulkSendWizard.tsx          // Bulk send workflow
RecipientUpload.tsx         // CSV upload/preview
ReportsPage.tsx             // Reports dashboard
WebhookConfig.tsx           // Webhook configuration
WebhookDeliveryLog.tsx      // Delivery history
```

---

## Background Jobs

```typescript
// Process bulk sends
export const processEsignBulkSend = inngest.createFunction(
  { id: 'process-esign-bulk-send' },
  { event: 'esign.bulk-send.started' },
  async ({ event, step }) => {
    const { bulkSendId } = event.data
    // Process in batches, send documents
  }
)

// Send webhook notifications
export const sendEsignWebhook = inngest.createFunction(
  { id: 'send-esign-webhook' },
  { event: 'esign.document.*' },
  async ({ event, step }) => {
    // Find matching webhooks, deliver payloads
  }
)

// Send reminders for pending signatures
export const sendEsignReminders = inngest.createFunction(
  { id: 'send-esign-reminders' },
  { cron: '0 9 * * *' }, // Daily at 9 AM
  async ({ step }) => {
    // Find documents due for reminders, send
  }
)

// Check for expired documents
export const checkExpiredDocuments = inngest.createFunction(
  { id: 'check-expired-esign-documents' },
  { cron: '0 * * * *' }, // Hourly
  async ({ step }) => {
    // Mark expired documents, notify if configured
  }
)
```

---

## Constraints

- Templates limited to 20 pages
- Bulk send max 100 recipients per batch
- Signed PDFs stored for 7 years (compliance)
- Webhook deliveries logged for 30 days
- In-person sessions timeout after 30 minutes
- All operations tenant-isolated

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Template editor, signing UI

**RAWDOG code to reference:**
- `src/app/admin/esign/page.tsx` - Dashboard
- `src/app/admin/esign/documents/page.tsx` - Document list
- `src/app/admin/esign/documents/[id]/page.tsx` - Document detail
- `src/app/admin/esign/documents/[id]/in-person/page.tsx` - In-person
- `src/app/admin/esign/pending/page.tsx` - Pending queue
- `src/app/admin/esign/counter-sign/page.tsx` - Counter-sign
- `src/app/admin/esign/templates/page.tsx` - Templates
- `src/app/admin/esign/templates/[id]/editor/page.tsx` - Editor
- `src/app/admin/esign/templates/builder/page.tsx` - Builder
- `src/app/admin/esign/bulk-send/page.tsx` - Bulk send
- `src/app/admin/esign/reports/page.tsx` - Reports
- `src/app/admin/esign/webhooks/page.tsx` - Webhooks

---

## Tasks

### [PARALLEL] Database
- [x] Create `esign_bulk_sends` migration
- [x] Create `esign_webhooks` migration
- [x] Create `esign_webhook_deliveries` migration

### [PARALLEL with DB] Data Layer
- [x] Implement document list/filter functions
- [x] Implement counter-sign functions
- [x] Implement in-person signing functions
- [x] Implement bulk send functions
- [x] Implement webhook CRUD functions
- [x] Implement reports/analytics functions

### [SEQUENTIAL after data layer] API Routes
- [x] Create document management routes
- [x] Create counter-sign routes
- [x] Create in-person signing routes
- [x] Create template routes (extends PHASE-4C)
- [x] Create bulk send routes
- [x] Create reports routes
- [x] Create webhook routes

### [PARALLEL with API] Background Jobs
- [x] Implement `processEsignBulkSend`
- [x] Implement `sendEsignWebhook`
- [x] Implement `sendEsignReminders`
- [x] Implement `checkExpiredDocuments`

### [SEQUENTIAL after API/Jobs] UI Components
- [x] Build EsignDashboard
- [x] Build DocumentList with filters
- [x] Build DocumentDetail with tabs
- [x] Build PendingQueue
- [x] Build CounterSignQueue and modal
- [x] Build InPersonSigning UI
- [ ] Build TemplateEditor (drag-and-drop) - *Deferred: Requires PHASE-4C-ESIGN-PDF for PDF rendering*
- [x] Build BulkSendWizard
- [x] Build ReportsPage with charts
- [x] Build WebhookConfig

---

## Definition of Done

- [x] Dashboard shows accurate stats
- [x] Document list filters and sorts correctly
- [x] Document detail shows all signers and audit log
- [x] Counter-sign queue works for internal signers
- [x] In-person signing completes successfully
- [ ] Template editor creates valid templates - *Deferred: Requires PHASE-4C-ESIGN-PDF*
- [x] Bulk send delivers to all recipients
- [x] Reports display accurate metrics
- [x] Webhooks fire and log deliveries
- [x] All pages are tenant-isolated
- [x] `npx tsc --noEmit` passes (esign-specific files)
