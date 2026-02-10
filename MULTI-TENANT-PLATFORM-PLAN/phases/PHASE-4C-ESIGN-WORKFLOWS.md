# PHASE-4C-ESIGN-WORKFLOWS: Multi-Signer Workflows

**Duration**: 1 week (Week 18)
**Depends On**: PHASE-4C-ESIGN-CORE, PHASE-4C-ESIGN-PDF
**Parallel With**: PHASE-4C-ESIGN-OPERATIONS (partial)
**Blocks**: PHASE-4D

---

## Goal

Implement multi-signer workflows including sequential signing order, parallel signing, counter-signature support for internal signers, reminder automation, and the complete signing flow from email to completed document.

---

## Success Criteria

- [ ] Sequential signing order enforced (signer 2 can't sign until signer 1 completes)
- [ ] Parallel signing working (multiple signers at same order can sign simultaneously)
- [ ] Counter-signature flow for internal signers (admin signs from portal)
- [ ] Signing page loads with document preview
- [ ] Signature capture (drawn, typed, uploaded)
- [ ] Form field completion
- [ ] Document completion detection (all signers signed)
- [ ] Email notifications at each step
- [ ] Reminder automation for unsigned documents
- [ ] Expiration handling
- [ ] Document decline flow with reason capture

---

## Deliverables

### 1. Signing Order Logic

**Sequential vs Parallel:**
- `signing_order` field determines when a signer can sign
- Order 1 signers can sign immediately
- Order 2 signers can sign after ALL order 1 signers complete
- Multiple signers at same order can sign in parallel

```typescript
// Get next signers who can sign
export async function getNextSigners(documentId: string): Promise<EsignSigner[]> {
  // Find minimum incomplete order
  const nextOrder = await sql`
    SELECT MIN(signing_order) as next_order
    FROM esign_signers
    WHERE document_id = ${documentId}
      AND role = 'signer'
      AND status NOT IN ('signed', 'declined')
  `

  // Return all signers at that order who haven't been sent
  return sql`
    SELECT * FROM esign_signers
    WHERE document_id = ${documentId}
      AND signing_order = ${nextOrder}
      AND role = 'signer'
      AND status = 'pending'
  `
}

// Check if order is complete
export async function hasOrderCompleted(documentId: string, order: number): Promise<boolean> {
  const result = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed
    FROM esign_signers
    WHERE document_id = ${documentId}
      AND signing_order = ${order}
      AND role = 'signer'
  `
  return result.total === result.signed
}
```

### 2. Counter-Signature Support

**Internal Signers:**
- `is_internal = true` marks counter-signers (e.g., company representative)
- Internal signers don't receive email - they sign from admin portal
- Can be at any signing order (typically last)
- Admin sees pending counter-signatures in dedicated queue

```typescript
// Get pending counter-signatures (internal signers ready to sign)
export async function getPendingCounterSignatures(tenantId: string): Promise<CounterSignPending[]> {
  return sql`
    WITH external_status AS (
      SELECT document_id,
        COUNT(*) as total_external,
        COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed_external,
        MAX(CASE WHEN status = 'signed' THEN signing_order ELSE 0 END) as max_signed_order
      FROM esign_signers
      WHERE is_internal = false AND role = 'signer'
      GROUP BY document_id
    )
    SELECT
      s.id as signer_id,
      s.name as signer_name,
      d.id as document_id,
      d.name as document_name,
      e.signed_external as external_completed,
      e.total_external as external_total,
      CASE
        WHEN e.total_external = e.signed_external THEN true
        WHEN s.signing_order <= e.max_signed_order + 1 THEN true
        ELSE false
      END as ready_to_sign
    FROM esign_signers s
    JOIN esign_documents d ON s.document_id = d.id
    LEFT JOIN external_status e ON s.document_id = e.document_id
    WHERE d.tenant_id = ${tenantId}
      AND s.is_internal = true
      AND s.role = 'signer'
      AND s.status NOT IN ('signed', 'declined')
      AND d.status NOT IN ('completed', 'voided', 'expired')
    ORDER BY ready_to_sign DESC, s.created_at ASC
  `
}
```

### 3. Signing Page Flow

**Public signing page** at `/sign/[token]`:

1. **Token validation** - Verify access token, check document status
2. **Mark as viewed** - Update signer status, log audit event
3. **Display document** - Show PDF with field overlays
4. **Field completion** - User fills required fields
5. **Signature capture** - Draw, type, or upload signature
6. **Review & submit** - Preview before submitting
7. **Finalization** - Mark signed, check if document complete

```typescript
// Signing session data
interface SigningSession {
  document: EsignDocument
  signer: EsignSigner
  fields: EsignField[]  // Only this signer's fields
  template: EsignTemplate | null
}

// Get signing session from token
export async function getSigningSession(token: string): Promise<SigningSession | null> {
  const signer = await getSignerByToken(token)
  if (!signer) return null

  const document = await getDocument(signer.document_id)
  if (!document) return null

  // Validate document is signable
  if (!['pending', 'in_progress'].includes(document.status)) return null

  // Check if this signer's turn (sequential signing)
  const nextSigners = await getNextSigners(document.id)
  if (!nextSigners.some(s => s.id === signer.id)) {
    // Not this signer's turn yet
    return null
  }

  const fields = await getSignerFields(signer.id)
  const template = document.template_id
    ? await getTemplate(document.template_id)
    : null

  return { document, signer, fields, template }
}
```

### 4. Signature Capture Methods

```typescript
type SignatureType = 'drawn' | 'typed' | 'uploaded'

interface SignatureData {
  type: SignatureType
  data: string  // Base64 image or typed text
  font_name?: string  // For typed signatures
}

// Save signature and apply to signer
export async function submitSignature(
  signerId: string,
  signature: SignatureData
): Promise<string> {
  // Convert signature to image URL
  let imageUrl: string

  if (signature.type === 'typed') {
    // Generate image from text using canvas
    imageUrl = await generateTypedSignatureImage(signature.data, signature.font_name)
  } else if (signature.type === 'uploaded') {
    // Save uploaded image
    imageUrl = await saveSignatureImage(signerId, signature.data)
  } else {
    // Save drawn signature
    imageUrl = await saveSignatureImage(signerId, signature.data)
  }

  // Store signature record
  await sql`
    INSERT INTO esign_signatures (signer_id, type, image_url, font_name)
    VALUES (${signerId}, ${signature.type}, ${imageUrl}, ${signature.font_name || null})
  `

  return imageUrl
}
```

**Available signature fonts:**
- Dancing Script
- Great Vibes
- Alex Brush
- Pacifico

### 5. Document Completion Flow

```typescript
// Submit signing (after all fields filled and signature captured)
export async function completeSignerSigning(
  signerId: string,
  fields: { id: string; value: string }[],
  signature: SignatureData,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; documentCompleted: boolean }> {
  const signer = await getSigner(signerId)
  const document = await getDocument(signer.document_id)

  // Save field values
  for (const field of fields) {
    await setFieldValue(field.id, field.value)
  }

  // Save signature
  const signatureUrl = await submitSignature(signerId, signature)

  // Update signature field with image URL
  const sigField = await getSignerFields(signerId)
    .then(fields => fields.find(f => f.type === 'signature'))
  if (sigField) {
    await setFieldValue(sigField.id, signatureUrl)
  }

  // Mark signer as signed
  await markSignerSigned(signerId, ipAddress, userAgent)

  // Check if all signers complete
  const allSigned = await checkAllSignersSigned(document.id)

  if (allSigned) {
    // Finalize document (generate final PDF)
    const signedUrl = await finalizeSignedDocument(document.id)
    await markDocumentCompleted(document.id, signedUrl)

    // Send completion emails
    await sendCompletionEmails(document.id)
  } else {
    // Send to next signers if sequential
    await sendToNextSigners(document.id)
  }

  return { success: true, documentCompleted: allSigned }
}
```

### 6. Email Notifications

**Email Types:**
- **Signing Request** - Sent when signer's turn to sign
- **Signing Complete** - Sent to signer after they sign
- **Document Complete** - Sent to all parties when fully signed
- **Reminder** - Sent to pending signers
- **Void Notification** - Sent when document voided

```typescript
// packages/esign/src/lib/email.ts

export interface SigningRequestParams {
  to: string
  signerName: string
  documentName: string
  message: string
  signingUrl: string
  expiresAt: Date | null
  senderName?: string
  creatorId?: string  // If provided, log to creator queue
}

export async function sendSigningRequestEmail(params: SigningRequestParams): Promise<boolean>

export async function sendSigningCompleteEmail(params: {
  to: string
  signerName: string
  documentName: string
  signedAt: Date
  downloadUrl?: string
  signedPdfUrl?: string  // Attach PDF if provided
  creatorId?: string
}): Promise<boolean>

export async function sendDocumentCompleteEmail(params: {
  to: string
  recipientName: string
  documentName: string
  completedAt: Date
  downloadUrl: string
  signerCount: number
  attachPdf?: boolean
  creatorId?: string
}): Promise<boolean>

export async function sendReminderEmail(params: {
  to: string
  signerName: string
  documentName: string
  signingUrl: string
  expiresAt: Date | null
  daysRemaining?: number
  creatorId?: string
}): Promise<boolean>

export async function sendVoidNotificationEmail(params: {
  to: string
  signerName: string
  documentName: string
  reason?: string
  voidedBy: string
  creatorId?: string
}): Promise<boolean>
```

### 7. Reminder Automation

**Background Job:** Process reminders for pending documents

```typescript
// packages/esign/src/jobs/send-reminders.ts

export const esignRemindersJob = jobProvider.createJob({
  id: 'esign/send-reminders',
  cron: '0 9 * * *',  // Daily at 9 AM
  async run({ tenantId }) {
    const documents = await getDocumentsNeedingReminders(tenantId)

    for (const doc of documents) {
      const signers = await getDocumentSigners(doc.id)
      const pendingSigners = signers.filter(s =>
        s.role === 'signer' &&
        s.status !== 'signed' &&
        s.status !== 'declined' &&
        !s.is_internal
      )

      for (const signer of pendingSigners) {
        await sendReminderEmail({
          to: signer.email,
          signerName: signer.name,
          documentName: doc.name,
          signingUrl: `${BASE_URL}/sign/${signer.access_token}`,
          expiresAt: doc.expires_at,
          daysRemaining: calculateDaysRemaining(doc.expires_at),
        })

        await logReminderSent(doc.id, 'system', signer.email)
      }

      await updateLastReminder(doc.id)
    }
  }
})
```

### 8. Expiration Handling

```typescript
// Background job to expire documents
export const esignExpirationJob = jobProvider.createJob({
  id: 'esign/expire-documents',
  cron: '0 0 * * *',  // Daily at midnight
  async run({ tenantId }) {
    const expired = await getExpiredDocuments(tenantId)

    for (const doc of expired) {
      await expireDocument(doc.id)
      await logDocumentExpired(doc.id)

      // Notify signers
      const signers = await getDocumentSigners(doc.id)
      for (const signer of signers) {
        // Send expiration notification
      }
    }
  }
})
```

### 9. API Routes

```
# Signing (public)
GET    /api/esign/sign/[token]        - Get signing session
POST   /api/esign/sign/[token]/submit - Submit signature
POST   /api/esign/sign/[token]/decline - Decline document

# Admin - Counter-signature
GET    /api/admin/esign/counter-sign            - List pending counter-sigs
GET    /api/admin/esign/counter-sign/[signerId] - Get counter-sig session
POST   /api/admin/esign/counter-sign/[signerId] - Submit counter-signature

# Admin - Document actions
POST   /api/admin/esign/documents/[id]/send     - Send to signers
POST   /api/admin/esign/documents/[id]/remind   - Send reminders
POST   /api/admin/esign/documents/[id]/void     - Void document

# Admin - Pending queue
GET    /api/admin/esign/pending                 - Get pending documents
```

### 10. Admin UI Pages

```
/admin/esign/pending         - Documents awaiting action
/admin/esign/counter-sign    - Counter-signature queue
/admin/esign/counter-sign/[signerId] - In-person signing UI
/admin/esign/documents/[id]/in-person - In-person signing mode
```

---

## Constraints

- Sequential signing must be enforced server-side
- Access tokens are single-use and validated on each request
- Counter-signature requires admin authentication
- Reminder frequency configurable per document (default 3 days)
- Maximum 5 reminders per document
- All emails use tenant email templates from communications system

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Signing page, signature capture, counter-sign UI

**MCPs to consult:**
- Context7 MCP: "Resend email patterns"
- Context7 MCP: "Canvas signature capture"

**RAWDOG code to reference:**
- `src/lib/esign/db/signers.ts` - Signer workflow logic
- `src/lib/esign/email.ts` - Email notification patterns
- `src/components/esign/SignatureCapture.tsx` - Signature component
- `src/app/api/esign/sign/[token]/route.ts` - Signing API
- `src/app/api/esign/sign/[token]/submit/route.ts` - Submit flow
- `src/app/admin/esign/counter-sign/page.tsx` - Counter-sign queue

---

## Tasks

### [PARALLEL] Signing order logic
- [ ] Implement `getNextSigners(documentId)`
- [ ] Implement `hasOrderCompleted(documentId, order)`
- [ ] Implement `getSignersPendingNotification(documentId)`

### [PARALLEL with order logic] Counter-signature support
- [ ] Implement `getPendingCounterSignatures(tenantId)`
- [ ] Implement `isInternalSigner(signerId)`
- [ ] Create admin counter-signature queue page
- [ ] Create in-person signing UI

### [SEQUENTIAL after ESIGN-CORE] Signing session
- [ ] Implement `getSigningSession(token)`
- [ ] Create `/sign/[token]` public page
- [ ] Implement token validation middleware

### [PARALLEL with session] Signature capture
- [ ] Create signature pad component (canvas drawing)
- [ ] Create typed signature component with fonts
- [ ] Create signature upload component
- [ ] Implement `submitSignature`
- [ ] Implement `generateTypedSignatureImage`

### [SEQUENTIAL after signature] Field completion UI
- [ ] Build field input components for each type
- [ ] Implement field validation
- [ ] Build form completion state tracking
- [ ] Build preview before submit modal

### [SEQUENTIAL after UI] Submit flow
- [ ] Implement `completeSignerSigning`
- [ ] Implement document completion detection
- [ ] Implement next signer notification

### [PARALLEL with submit] Email notifications
- [ ] Implement `sendSigningRequestEmail`
- [ ] Implement `sendSigningCompleteEmail`
- [ ] Implement `sendDocumentCompleteEmail`
- [ ] Implement `sendReminderEmail`
- [ ] Implement `sendVoidNotificationEmail`
- [ ] Integrate with communications system templates

### [SEQUENTIAL after email] Automation jobs
- [ ] Create reminder job with cron schedule
- [ ] Create expiration job
- [ ] Implement `getDocumentsNeedingReminders`

### [SEQUENTIAL after all] Decline flow
- [ ] Implement decline API
- [ ] Add decline reason capture
- [ ] Update document status on decline

---

## Definition of Done

- [ ] Sequential signing enforced (can't skip order)
- [ ] Parallel signing works (same order = simultaneous)
- [ ] Counter-signature queue visible in admin
- [ ] Signing page loads and displays document
- [ ] All three signature methods working
- [ ] Fields can be completed
- [ ] Submit creates signed document
- [ ] Completion detected when all sign
- [ ] Emails sent at each step
- [ ] Reminders sent automatically
- [ ] Expired documents handled
- [ ] `npx tsc --noEmit` passes
- [ ] Manual testing: multi-signer flow works end-to-end
