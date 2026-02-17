# @cgk-platform/esign

E-Signature system for the CGK platform - document templates, field management, signature capture, and compliance tracking.

## Installation

```bash
pnpm add @cgk-platform/esign
```

## Features

- **Document Templates** - Reusable templates with field positioning
- **Multi-Signer Support** - Multiple signers per document
- **Field Types** - Signature, initials, text, date, checkbox
- **Signature Capture** - Canvas-based signature drawing
- **Audit Trail** - Complete signing history and compliance tracking
- **Workflow Engine** - Automated document routing
- **Email Notifications** - Auto-send signing requests

## Quick Start

### Create a Template

```typescript
import { createTemplate } from '@cgk-platform/esign'

const template = await createTemplate({
  tenantId: 'tenant_123',
  name: 'Creator Agreement',
  description: 'Standard creator partnership agreement',
  documentUrl: 'https://cdn.example.com/agreements/creator.pdf',
  fields: [
    {
      type: 'signature',
      signerRole: 'creator',
      page: 1,
      x: 100,
      y: 500,
      width: 200,
      height: 60,
      required: true,
    },
    {
      type: 'date',
      signerRole: 'creator',
      page: 1,
      x: 320,
      y: 500,
      width: 100,
      height: 40,
      required: true,
    },
  ],
})
```

### Send Document for Signing

```typescript
import { createDocument, sendSigningRequest } from '@cgk-platform/esign'

const document = await createDocument({
  tenantId: 'tenant_123',
  templateId: template.id,
  signers: [
    {
      role: 'creator',
      name: 'John Doe',
      email: 'john@example.com',
    },
    {
      role: 'company',
      name: 'My Brand LLC',
      email: 'legal@my-brand.com',
    },
  ],
})

// Send email with signing link
await sendSigningRequest(document.id, 'john@example.com')
```

### Capture Signature

```typescript
import { addSignature, completeDocument } from '@cgk-platform/esign'

// Add signature to field
await addSignature({
  documentId: document.id,
  fieldId: 'field_123',
  signerId: 'signer_456',
  signatureType: 'drawn',
  signatureData: 'data:image/png;base64,...', // Canvas image data
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
})

// Complete document when all signatures collected
await completeDocument(document.id)
```

### Check Document Status

```typescript
import { getDocument, getSigningProgress } from '@cgk-platform/esign'

const doc = await getDocument(documentId)
console.log(doc.status) // 'draft', 'pending', 'signed', 'completed'

const progress = await getSigningProgress(documentId)
console.log(progress)
// {
//   totalSigners: 2,
//   signedCount: 1,
//   pendingSigners: ['john@example.com'],
//   isComplete: false
// }
```

## Key Exports

### Templates
- `createTemplate()`, `updateTemplate()`, `deleteTemplate()`
- `getTemplate()`, `listTemplates()`, `cloneTemplate()`

### Documents
- `createDocument()`, `updateDocument()`, `deleteDocument()`
- `getDocument()`, `listDocuments()`, `completeDocument()`

### Signers
- `addSigner()`, `removeSigner()`, `updateSignerStatus()`
- `sendSigningRequest()`, `resendSigningRequest()`

### Signatures
- `addSignature()`, `addInitials()`, `fillField()`
- `validateSignature()`, `getSignatureImage()`

### Workflow
- `createWorkflow()`, `updateWorkflow()`, `triggerWorkflow()`
- `getWorkflowStatus()`, `cancelWorkflow()`

### Audit
- `getAuditTrail()`, `recordAuditEvent()`
- `generateComplianceReport()`

### Types
- `EsignTemplate`, `TemplateStatus`, `TemplateField`
- `EsignDocument`, `DocumentStatus`
- `Signer`, `SignerRole`, `SignerStatus`
- `FieldType`, `SignatureType`

## Field Types

Supported field types:
- `signature` - Full signature field
- `initials` - Initial field
- `text` - Text input
- `date` - Date picker
- `checkbox` - Checkbox
- `email` - Email input
- `phone` - Phone number input

## Document Lifecycle

1. **Draft** - Document created from template
2. **Pending** - Sent to signers
3. **Partially Signed** - Some signers completed
4. **Signed** - All signatures collected
5. **Completed** - Document finalized and stored
6. **Voided** - Document cancelled

## License

MIT
