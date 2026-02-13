# PHASE-4C-ESIGN-OPERATIONS: Bulk Operations, Archive & Analytics

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Status**: ✅ COMPLETE
**Duration**: 1 week (Week 18-19)
**Depends On**: PHASE-4C-ESIGN-WORKFLOWS
**Parallel With**: PHASE-4D (partial)
**Blocks**: PHASE-5 (Jobs)

---

## Goal

Implement operational features for e-signature at scale including bulk send campaigns, webhook integrations, complete audit trail, document archive, reporting, and analytics dashboards.

---

## Success Criteria

- [x] Bulk send working (up to 100 recipients per batch)
- [x] Webhook configuration working
- [x] Webhook delivery with HMAC signatures
- [x] Complete audit trail for all document events
- [x] Audit report generation
- [x] Document archive with search
- [x] E-sign statistics and reporting
- [x] Integration with creator communications queue

---

## Deliverables

### 1. Bulk Send System

**Bulk send from template to multiple recipients:**

```typescript
// POST /api/admin/esign/documents/bulk-send
interface BulkSendRequest {
  templateId: string
  recipients: BulkRecipient[]
  message?: string
  reminderEnabled?: boolean
  reminderDays?: number
}

interface BulkRecipient {
  name: string
  email: string
  creatorId?: string  // Optional link to creator
}

interface BulkSendResult {
  recipient: BulkRecipient
  documentId?: string
  success: boolean
  error?: string
}

export async function bulkSendDocuments(
  tenantId: string,
  userId: string,
  request: BulkSendRequest
): Promise<{
  success: boolean
  message: string
  results: BulkSendResult[]
  summary: { total: number; success: number; failed: number }
}> {
  const { templateId, recipients, message, reminderEnabled = true, reminderDays = 3 } = request

  // Validation
  if (recipients.length > 100) {
    throw new Error('Maximum 100 recipients per bulk send')
  }

  const template = await getTemplate(tenantId, templateId)
  if (!template || template.status !== 'active') {
    throw new Error('Template not found or not active')
  }

  // Fetch template PDF once
  const templatePdf = await fetch(template.file_url).then(r => r.arrayBuffer())
  const templateFields = await getTemplateFields(templateId)

  const results: BulkSendResult[] = []

  for (const recipient of recipients) {
    try {
      // Create working copy of PDF
      const workingCopyUrl = await uploadWorkingCopy(tenantId, template, templatePdf)

      // Create document
      const document = await createDocument({
        tenant_id: tenantId,
        template_id: templateId,
        creator_id: recipient.creatorId,
        name: `${template.name} - ${recipient.name}`,
        file_url: workingCopyUrl,
        reminder_enabled: reminderEnabled,
        reminder_days: reminderDays,
        message: message,
        created_by: userId,
      })

      // Create signer
      const signer = await createSigner({
        document_id: document.id,
        name: recipient.name,
        email: recipient.email,
        role: 'signer',
        signing_order: 1,
      })

      // Copy fields
      if (templateFields.length > 0) {
        await copyFieldsFromTemplate(templateId, document.id, signer.id)
      }

      // Mark pending and send
      await markDocumentPending(tenantId, document.id)

      const signingUrl = `${BASE_URL}/sign/${signer.access_token}`
      await sendSigningRequestEmail({
        to: recipient.email,
        signerName: recipient.name,
        documentName: document.name,
        message: message || 'Please review and sign.',
        signingUrl,
        expiresAt: null,
        creatorId: recipient.creatorId,
      })

      await markSignerSent(signer.id)
      await logDocumentSent(document.id, userId, [recipient.email])

      results.push({ recipient, documentId: document.id, success: true })

    } catch (error) {
      results.push({
        recipient,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return {
    success: true,
    message: `Sent to ${results.filter(r => r.success).length} of ${recipients.length}`,
    results,
    summary: {
      total: recipients.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    }
  }
}
```

### 2. Webhook System

**Database tables:**

```sql
-- Webhook configurations
CREATE TABLE esign_webhooks (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(64) NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0
);

-- Webhook delivery logs
CREATE TABLE esign_webhook_deliveries (
  id VARCHAR(64) PRIMARY KEY,
  webhook_id VARCHAR(64) NOT NULL REFERENCES esign_webhooks(id) ON DELETE CASCADE,
  event VARCHAR(64) NOT NULL,
  payload TEXT NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivered_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_esign_webhooks_tenant ON esign_webhooks(tenant_id);
CREATE INDEX idx_esign_webhook_deliveries_webhook ON esign_webhook_deliveries(webhook_id);
```

**Webhook events:**
- `document.created`
- `document.sent`
- `document.viewed`
- `document.signed`
- `document.completed`
- `document.declined`
- `document.voided`
- `document.expired`

**Webhook payload:**

```typescript
interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: {
    document: Partial<EsignDocument>
    signer?: Partial<EsignSigner>
    metadata?: Record<string, unknown>
  }
}

// HMAC signature generation
export function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

// Send webhook
export async function sendWebhook(
  webhook: WebhookConfig,
  event: WebhookEvent,
  data: WebhookPayload['data']
): Promise<boolean> {
  const deliveryId = `del_${nanoid(12)}`
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  }

  const payloadString = JSON.stringify(payload)
  const signature = generateSignature(payloadString, webhook.secret)

  // Log delivery attempt
  await logDeliveryAttempt(deliveryId, webhook.id, event, payloadString)

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
        'X-Webhook-Delivery': deliveryId,
      },
      body: payloadString,
    })

    await logDeliveryResult(deliveryId, response.status, await response.text())
    await updateWebhookLastTriggered(webhook.id, response.ok)

    return response.ok
  } catch (error) {
    await logDeliveryError(deliveryId, error)
    await incrementWebhookFailures(webhook.id)
    return false
  }
}

// Trigger all matching webhooks for an event
export async function triggerWebhooks(
  tenantId: string,
  event: WebhookEvent,
  data: WebhookPayload['data']
): Promise<void> {
  const webhooks = await getActiveWebhooksForEvent(tenantId, event)

  await Promise.allSettled(
    webhooks.map(webhook => sendWebhook(webhook, event, data))
  )
}
```

### 3. Audit Trail

**Database table:**

```sql
CREATE TABLE esign_audit_log (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL REFERENCES esign_documents(id) ON DELETE CASCADE,
  signer_id VARCHAR(64) REFERENCES esign_signers(id) ON DELETE SET NULL,
  action VARCHAR(32) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_esign_audit_document ON esign_audit_log(document_id);
CREATE INDEX idx_esign_audit_action ON esign_audit_log(action);
CREATE INDEX idx_esign_audit_created ON esign_audit_log(created_at);
```

**Audit actions:**
- `created` - Document created
- `sent` - Sent to signers
- `viewed` - Signer viewed document
- `field_filled` - Signer filled a field
- `signed` - Signer signed
- `declined` - Signer declined
- `voided` - Document voided
- `downloaded` - Document downloaded
- `reminder_sent` - Reminder sent
- `expired` - Document expired

**Audit functions:**

```typescript
// Convenience logging functions
export async function logDocumentCreated(documentId: string, createdBy: string): Promise<EsignAuditLog>
export async function logDocumentSent(documentId: string, sentBy: string, signerEmails: string[]): Promise<EsignAuditLog>
export async function logDocumentViewed(documentId: string, signerId: string, ip?: string, ua?: string): Promise<EsignAuditLog>
export async function logFieldFilled(documentId: string, signerId: string, fieldId: string, fieldType: string): Promise<EsignAuditLog>
export async function logDocumentSigned(documentId: string, signerId: string, ip?: string, ua?: string): Promise<EsignAuditLog>
export async function logDocumentDeclined(documentId: string, signerId: string, reason?: string): Promise<EsignAuditLog>
export async function logDocumentVoided(documentId: string, voidedBy: string, reason?: string): Promise<EsignAuditLog>
export async function logReminderSent(documentId: string, sentBy: string, signerEmail: string): Promise<EsignAuditLog>
export async function logDocumentDownloaded(documentId: string, downloadedBy: string): Promise<EsignAuditLog>
export async function logDocumentExpired(documentId: string): Promise<EsignAuditLog>

// Audit report generation
export async function generateAuditReport(documentId: string): Promise<{
  entries: AuditReportEntry[]
  summary: AuditSummary
}> {
  const logs = await getDocumentAuditLogs(documentId)

  const entries = logs.map(log => ({
    timestamp: log.created_at,
    action: log.action,
    description: formatAuditAction(log),
    ipAddress: log.ip_address,
    userAgent: log.user_agent,
    metadata: log.metadata,
  }))

  const summary = {
    totalEvents: logs.length,
    created: logs.find(l => l.action === 'created')?.created_at,
    sent: logs.find(l => l.action === 'sent')?.created_at,
    firstViewed: logs.find(l => l.action === 'viewed')?.created_at,
    signed: logs.find(l => l.action === 'signed')?.created_at,
    remindersSent: logs.filter(l => l.action === 'reminder_sent').length,
  }

  return { entries, summary }
}
```

### 4. Document Archive & Search

**Archive listing with filters:**

```typescript
interface ArchiveFilters {
  status?: DocumentStatus | 'all'
  creatorId?: string
  templateId?: string
  dateFrom?: Date
  dateTo?: Date
  search?: string
  limit?: number
  offset?: number
}

export async function listArchivedDocuments(
  tenantId: string,
  filters: ArchiveFilters
): Promise<{ documents: DocumentWithSigners[]; total: number }> {
  // Build query with filters
  let conditions = [`d.tenant_id = '${tenantId}'`]

  if (filters.status && filters.status !== 'all') {
    conditions.push(`d.status = '${filters.status}'`)
  }
  if (filters.creatorId) {
    conditions.push(`d.creator_id = '${filters.creatorId}'`)
  }
  if (filters.templateId) {
    conditions.push(`d.template_id = '${filters.templateId}'`)
  }
  if (filters.dateFrom) {
    conditions.push(`d.created_at >= '${filters.dateFrom.toISOString()}'`)
  }
  if (filters.dateTo) {
    conditions.push(`d.created_at <= '${filters.dateTo.toISOString()}'`)
  }
  if (filters.search) {
    conditions.push(`d.name ILIKE '%${filters.search}%'`)
  }

  // Execute query with pagination
}

// Download signed document
export async function getSignedDocumentUrl(
  tenantId: string,
  documentId: string,
  userId: string
): Promise<string | null> {
  const document = await getDocument(tenantId, documentId)
  if (!document || !document.signed_file_url) return null

  // Log download
  await logDocumentDownloaded(documentId, userId)

  return document.signed_file_url
}
```

### 5. Statistics & Reporting

```typescript
// E-sign statistics
export async function getEsignStats(
  tenantId: string,
  dateRange?: { from: Date; to: Date }
): Promise<EsignStats> {
  const documents = await getDocumentCounts(tenantId, dateRange)
  const signers = await getSignerStats(tenantId, dateRange)

  return {
    documents: {
      total: documents.total,
      byStatus: documents.byStatus,
      completedThisPeriod: documents.completedThisPeriod,
      averageCompletionTime: documents.avgCompletionTime,
    },
    signers: {
      total: signers.total,
      signed: signers.signed,
      declined: signers.declined,
      pending: signers.pending,
      avgTimeToSign: signers.avgTimeToSign,
    },
    templates: {
      total: await getTemplateCount(tenantId),
      active: await getActiveTemplateCount(tenantId),
      mostUsed: await getMostUsedTemplates(tenantId, 5),
    },
    metrics: {
      completionRate: (documents.completed / documents.total) * 100,
      declineRate: (documents.declined / documents.total) * 100,
      avgSignersPerDoc: signers.total / documents.total,
    },
  }
}

// Reports endpoint
export async function generateReport(
  tenantId: string,
  reportType: 'summary' | 'detailed' | 'audit',
  dateRange: { from: Date; to: Date },
  format: 'json' | 'csv'
): Promise<ReportData> {
  // Generate report based on type
}
```

### 6. Admin UI Pages

```
/admin/esign/bulk-send      - Bulk send wizard
/admin/esign/webhooks       - Webhook configuration
/admin/esign/webhooks/[id]  - Webhook detail with delivery logs
/admin/esign/reports        - Reports and analytics
/admin/esign/documents/[id]/audit - Audit trail view
```

### 7. API Routes

```
# Bulk operations

> **STATUS**: ✅ COMPLETE (2026-02-13)
POST   /api/admin/esign/documents/bulk-send     - Bulk send to recipients

# Webhooks
GET    /api/admin/esign/webhooks                - List webhooks
POST   /api/admin/esign/webhooks                - Create webhook
GET    /api/admin/esign/webhooks/[id]           - Get webhook with deliveries
PUT    /api/admin/esign/webhooks/[id]           - Update webhook
DELETE /api/admin/esign/webhooks/[id]           - Delete webhook
POST   /api/admin/esign/webhooks/[id]/regenerate - Regenerate secret

# Reports & Stats
GET    /api/admin/esign/stats                   - Dashboard statistics
GET    /api/admin/esign/reports                 - Generate report
GET    /api/admin/esign/documents/[id]/audit    - Get audit trail

# Archive
GET    /api/admin/esign/documents               - List with archive filters
GET    /api/admin/esign/documents/[id]/download - Download signed document
```

### 8. Creator Queue Integration

**Log e-sign emails to creator communications queue:**

```typescript
// When sending e-sign emails to creators, also log to their queue
async function logToCreatorQueue(params: {
  creatorId: string
  creatorEmail: string
  creatorName: string
  emailType: 'contract_signing_request' | 'contract_signed' | 'contract_reminder' | 'contract_voided'
  subject: string
  htmlContent: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await enqueueCreatorEmail({
      creatorId: params.creatorId,
      creatorEmail: params.creatorEmail,
      creatorName: params.creatorName,
      emailType: params.emailType,
      subject: params.subject,
      htmlContent: params.htmlContent,
      scheduledFor: new Date(),
      metadata: {
        source: 'esign',
        ...params.metadata,
      },
    })
  } catch (error) {
    // Don't throw - this is supplementary logging
    console.error('Failed to log to creator queue:', error)
  }
}
```

---

## Constraints

- Bulk send maximum 100 recipients per request
- Webhooks retry up to 3 times with exponential backoff
- Webhook secrets use `whsec_` prefix
- Audit logs are append-only (no updates or deletes)
- Reports limited to 12 months of data
- Archived documents retained per tenant policy

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Bulk send wizard, webhook configuration, reports dashboard

**MCPs to consult:**
- Context7 MCP: "HMAC webhook signatures"
- Context7 MCP: "CSV export patterns"

**RAWDOG code to reference:**
- `src/lib/esign/webhooks.ts` - Complete webhook implementation
- `src/lib/esign/db/audit.ts` - Audit logging patterns
- `src/app/api/esign/documents/bulk-send/route.ts` - Bulk send API
- `src/app/admin/esign/webhooks/page.tsx` - Webhook UI
- `src/app/admin/esign/reports/page.tsx` - Reports UI

---

## Tasks

### [PARALLEL] Bulk send
- [x] Create `bulkSendDocuments` function - `apps/admin/src/lib/esign/bulk-sends.ts`
- [x] Implement recipient validation
- [x] Implement working copy creation
- [x] Create bulk send API route - `apps/admin/src/app/api/admin/esign/bulk-send/route.ts`
- [x] Build bulk send wizard UI - `apps/admin/src/app/admin/esign/bulk-send/page.tsx`

### [PARALLEL with bulk] Webhook system
- [x] Create webhook database tables (in existing esign package)
- [x] Implement `createWebhook`, `listWebhooks`, etc. - `apps/admin/src/lib/esign/webhooks.ts`
- [x] Implement `generateSignature` (HMAC-SHA256)
- [x] Implement `sendWebhook`
- [x] Implement `triggerWebhooks` - `apps/admin/src/lib/esign/webhook-triggers.ts`
- [x] Create webhook API routes - `apps/admin/src/app/api/admin/esign/webhooks/`
- [x] Build webhook configuration UI

### [PARALLEL with webhooks] Audit trail
- [x] Create audit log table (in existing esign package)
- [x] Implement all `log*` functions - `apps/admin/src/lib/esign/documents.ts`
- [x] Implement `generateAuditReport`
- [x] Create audit API route - `apps/admin/src/app/api/admin/esign/documents/[id]/audit/route.ts`
- [x] Build audit trail UI component - `apps/admin/src/app/admin/esign/documents/[id]/audit/page.tsx`

### [SEQUENTIAL after audit] Archive & search
- [x] Implement `listArchivedDocuments` with filters - `apps/admin/src/lib/esign/documents.ts`
- [x] Implement `getSignedDocumentUrl`
- [x] Add archive filters to document list UI
- [x] Add download button for signed documents - `apps/admin/src/app/api/admin/esign/documents/[id]/download/route.ts`

### [SEQUENTIAL after archive] Statistics & reporting
- [x] Implement `getEsignStats` - `apps/admin/src/lib/esign/reports.ts`
- [x] Implement `generateReport`
- [x] Create stats API route
- [x] Create reports API route
- [x] Build reports dashboard UI

### [PARALLEL with all] Creator queue integration
- [x] Implement `logToCreatorQueue` - `apps/admin/src/lib/esign/creator-queue.ts`
- [x] Update all email functions to log when creatorId provided
- [x] Test integration with creator communications queue

### [SEQUENTIAL after all] Webhook event triggers
- [x] Add `triggerWebhooks` calls to all state changes
- [x] Add to: document created, sent, completed, declined, voided, expired

---

## Definition of Done

- [x] Bulk send creates documents for all recipients
- [x] Bulk send sends emails and logs audit
- [x] Webhooks can be configured per tenant
- [x] Webhook payloads include HMAC signature
- [x] Webhook deliveries are logged
- [x] All document events create audit entries
- [x] Audit report generates correctly
- [x] Archive search works with filters
- [x] Statistics show accurate counts
- [x] E-sign emails appear in creator queue
- [x] `npx tsc --noEmit` passes (e-sign files pass, pre-existing errors in other files)
- [x] Manual testing: bulk send → webhook fires → audit logged

---

## Implementation Summary

### Files Created/Modified

**Admin Library (`apps/admin/src/lib/esign/`):**
- `creator-queue.ts` - Creator communications queue integration for e-sign emails
- `webhook-triggers.ts` - Webhook event trigger functions
- `types.ts` - Added 'downloaded' and 'forwarded' audit actions
- `index.ts` - Updated exports for new modules

**API Routes (`apps/admin/src/app/api/admin/esign/`):**
- `documents/[id]/audit/route.ts` - Document audit trail API
- `documents/[id]/download/route.ts` - Document download API

**Admin Pages (`apps/admin/src/app/admin/esign/`):**
- `bulk-send/page.tsx` - Multi-step bulk send wizard
- `documents/[id]/audit/page.tsx` - Audit trail visualization

### Key Features Implemented

1. **Bulk Send Wizard** - Multi-step wizard supporting CSV import, scheduled sends, and up to 100 recipients
2. **Audit Trail** - Complete event timeline with IP/user-agent tracking, compliance certificate download
3. **Webhook Triggers** - HMAC-signed webhook delivery for all document lifecycle events
4. **Creator Queue Integration** - E-sign emails logged to creator communications queue
5. **Document Download** - Signed document download with audit logging
