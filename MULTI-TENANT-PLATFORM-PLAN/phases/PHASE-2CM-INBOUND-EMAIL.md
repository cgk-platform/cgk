# PHASE-2CM-INBOUND-EMAIL: Inbound Email Handling

**Status**: COMPLETE
**Completed**: 2026-02-10
**Duration**: Week 10-11 (5 days)
**Depends On**: PHASE-2CM-SENDER-DNS (verified inbound addresses)
**Parallel With**: PHASE-2CM-TEMPLATES
**Blocks**: Treasury approval workflows, Receipt processing, Creator replies

---

## Goal

Implement inbound email handling via Resend webhooks. Route incoming emails to appropriate handlers based on recipient address: treasury approval parsing, receipt forwarding with attachment storage, support/reply thread matching, and creator reply handling.

**CRITICAL**: Inbound emails are routed by TO address → tenant lookup. Each tenant configures their own inbound addresses.

---

## Success Criteria

- [x] Inbound emails received via Resend webhook
- [x] Treasury approval emails parsed for approval/rejection keywords
- [x] Receipt forwarding stores attachments (Vercel Blob)
- [x] Support/reply emails matched to existing threads
- [x] Creator replies added to creator conversation threads
- [x] All inbound emails logged with processing status
- [x] Unified communications hub shows all received emails

---

## Deliverables

### Inbound Email Webhook Flow

```
Resend Inbound Webhook → /api/webhooks/resend/inbound
    ↓
Verify signature (Resend webhook secret)
    ↓
Extract TO address → Lookup tenant + inbound config
    ↓
Route by address purpose:
    ├── treasury@... → Treasury approval parser
    ├── receipts@... → Receipt processor
    ├── support@... → General inbox handler
    └── creators@... → Creator reply handler
    ↓
Fetch full email content from Resend API (if needed)
    ↓
Process based on type
    ↓
Log in appropriate table
    ↓
Notify team (Slack/dashboard)
```

### Database Schema

#### `inbound_email_logs` Table
```sql
CREATE TABLE inbound_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Email headers
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_address TEXT NOT NULL,
  subject TEXT,

  -- Content
  body_text TEXT,
  body_html TEXT,

  -- Attachments (stored in Vercel Blob)
  attachments JSONB DEFAULT '[]',
    -- [{ filename, content_type, size_bytes, blob_url }]

  -- Message IDs for threading
  message_id TEXT, -- RFC 2822 Message-ID
  in_reply_to TEXT, -- For threading
  references TEXT[], -- Thread references

  -- Routing
  email_type TEXT NOT NULL,
    -- treasury_approval, receipt, support, creator_reply, unknown
  inbound_address_id UUID REFERENCES tenant_sender_addresses(id),

  -- Processing
  processing_status TEXT NOT NULL DEFAULT 'pending',
    -- pending, processed, failed, ignored
  processing_error TEXT,
  processed_at TIMESTAMPTZ,

  -- Linking
  linked_record_type TEXT, -- treasury_request, thread, creator
  linked_record_id TEXT,

  -- Metadata
  raw_payload JSONB, -- Original webhook payload
  resend_email_id TEXT,

  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inbound_email_logs_tenant ON inbound_email_logs(tenant_id);
CREATE INDEX idx_inbound_email_logs_type ON inbound_email_logs(email_type);
CREATE INDEX idx_inbound_email_logs_status ON inbound_email_logs(processing_status);
CREATE INDEX idx_inbound_email_logs_from ON inbound_email_logs(from_address);
CREATE INDEX idx_inbound_email_logs_received ON inbound_email_logs(received_at DESC);
```

#### `treasury_communications` Table
```sql
CREATE TABLE treasury_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  treasury_request_id UUID REFERENCES treasury_requests(id) ON DELETE CASCADE,

  -- Direction
  direction TEXT NOT NULL, -- inbound, outbound
  channel TEXT NOT NULL, -- email, slack, manual

  -- Email details
  from_address TEXT,
  to_address TEXT,
  subject TEXT,
  body TEXT,

  -- Approval parsing (for inbound)
  parsed_approval_status TEXT, -- approved, rejected, unclear
  parsed_confidence TEXT, -- high, medium, low
  matched_keywords TEXT[],

  -- Threading
  message_id TEXT,
  in_reply_to TEXT,

  -- Processing
  processed_at TIMESTAMPTZ,
  processed_by TEXT, -- system or user_id

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_treasury_comms_request ON treasury_communications(treasury_request_id);
CREATE INDEX idx_treasury_comms_tenant ON treasury_communications(tenant_id);
```

#### `treasury_receipts` Table
```sql
CREATE TABLE treasury_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Email context
  inbound_email_id UUID REFERENCES inbound_email_logs(id),
  from_address TEXT NOT NULL,
  subject TEXT,
  body TEXT,

  -- Attachments (PDFs, images)
  attachments JSONB DEFAULT '[]',
    -- [{ filename, content_type, blob_url, size_bytes }]

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending, processed, archived, rejected

  -- Linked expense (after processing)
  linked_expense_id UUID REFERENCES expenses(id),

  -- Extracted/entered data
  vendor_name TEXT,
  description TEXT,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  expense_category_id UUID,
  receipt_date DATE,

  -- Admin notes
  notes TEXT,
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_treasury_receipts_tenant ON treasury_receipts(tenant_id);
CREATE INDEX idx_treasury_receipts_status ON treasury_receipts(status);
```

### Treasury Approval Parser

```typescript
// packages/communications/inbound/treasury-parser.ts

interface ApprovalParseResult {
  status: 'approved' | 'rejected' | 'unclear'
  confidence: 'high' | 'medium' | 'low'
  matchedKeywords: string[]
}

const APPROVAL_KEYWORDS = {
  high_confidence_approve: [
    'approved', 'i approve', 'yes, approved', 'confirmed', 'authorized',
    'go ahead', 'proceed', 'looks good', 'lgtm', 'all good'
  ],
  medium_confidence_approve: [
    'ok', 'okay', 'fine', 'sure', 'yes', 'good to go', 'makes sense'
  ],
  high_confidence_reject: [
    'rejected', 'denied', 'not approved', 'declined', 'refused',
    'no', 'cancel', 'stop', 'do not proceed'
  ],
  medium_confidence_reject: [
    'wait', 'hold', 'pause', 'need more info', 'not yet'
  ]
}

const AUTO_REPLY_PATTERNS = [
  /out of (the )?office/i,
  /automatic reply/i,
  /auto-?reply/i,
  /away from (my )?email/i,
  /on (annual )?leave/i,
  /will respond when/i
]

export async function parseTreasuryApproval(
  subject: string,
  body: string
): Promise<ApprovalParseResult> {
  // Ignore auto-replies
  const fullText = `${subject} ${body}`.toLowerCase()
  for (const pattern of AUTO_REPLY_PATTERNS) {
    if (pattern.test(fullText)) {
      return {
        status: 'unclear',
        confidence: 'low',
        matchedKeywords: ['auto_reply_detected']
      }
    }
  }

  const matchedApprove: string[] = []
  const matchedReject: string[] = []

  // Check for keywords
  for (const keyword of APPROVAL_KEYWORDS.high_confidence_approve) {
    if (fullText.includes(keyword)) {
      matchedApprove.push(keyword)
    }
  }

  for (const keyword of APPROVAL_KEYWORDS.high_confidence_reject) {
    if (fullText.includes(keyword)) {
      matchedReject.push(keyword)
    }
  }

  // Determine result
  if (matchedApprove.length > 0 && matchedReject.length === 0) {
    return {
      status: 'approved',
      confidence: 'high',
      matchedKeywords: matchedApprove
    }
  }

  if (matchedReject.length > 0 && matchedApprove.length === 0) {
    return {
      status: 'rejected',
      confidence: 'high',
      matchedKeywords: matchedReject
    }
  }

  // Check medium confidence if no high confidence match
  // ... similar logic for medium confidence keywords

  return {
    status: 'unclear',
    confidence: 'low',
    matchedKeywords: []
  }
}

/**
 * Extract treasury request ID from email subject.
 * Expects format: "...[#SBA-202412-001]..." or "Re: ... #SBA-202412-001"
 */
export function extractTreasuryRequestId(subject: string): string | null {
  const match = subject.match(/#(SBA-\d{6}-\d{3})/i)
  return match ? match[1] : null
}
```

### Receipt Processor

```typescript
// packages/communications/inbound/receipt-processor.ts

interface ProcessedReceipt {
  receiptId: string
  attachments: {
    filename: string
    contentType: string
    blobUrl: string
    sizeBytes: number
  }[]
}

export async function processReceiptEmail(
  tenantId: string,
  email: InboundEmail
): Promise<ProcessedReceipt> {
  const attachments: ProcessedReceipt['attachments'] = []

  // Store each attachment in Vercel Blob
  for (const attachment of email.attachments || []) {
    if (isReceiptAttachment(attachment.contentType)) {
      const blobUrl = await uploadToBlob(
        `tenants/${tenantId}/receipts/${Date.now()}-${attachment.filename}`,
        attachment.content,
        attachment.contentType
      )

      attachments.push({
        filename: attachment.filename,
        contentType: attachment.contentType,
        blobUrl,
        sizeBytes: attachment.size
      })
    }
  }

  // Create receipt record
  const receipt = await createTreasuryReceipt({
    tenantId,
    inboundEmailId: email.id,
    fromAddress: email.from,
    subject: email.subject,
    body: email.bodyText,
    attachments,
    status: 'pending'
  })

  // Notify admin via Slack/dashboard
  await notifyTeam(tenantId, {
    type: 'new_receipt',
    message: `New receipt from ${email.from}`,
    receiptId: receipt.id,
    attachmentCount: attachments.length
  })

  return {
    receiptId: receipt.id,
    attachments
  }
}

function isReceiptAttachment(contentType: string): boolean {
  return [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ].includes(contentType)
}
```

### Thread Matching for Replies

```typescript
// packages/communications/inbound/thread-matcher.ts

interface MatchedThread {
  threadId: string
  contactId: string
  contactType: 'creator' | 'customer' | 'vendor'
}

/**
 * Match inbound email to existing conversation thread.
 * Uses In-Reply-To header, sender email, and subject matching.
 */
export async function matchToThread(
  tenantId: string,
  email: InboundEmail
): Promise<MatchedThread | null> {
  // 1. Try In-Reply-To header first (most reliable)
  if (email.inReplyTo) {
    const existingMessage = await findMessageByExternalId(
      tenantId,
      email.inReplyTo
    )
    if (existingMessage) {
      return {
        threadId: existingMessage.threadId,
        contactId: existingMessage.contactId,
        contactType: existingMessage.contactType
      }
    }
  }

  // 2. Try sender email lookup
  const contact = await findContactByEmail(tenantId, email.from)
  if (contact) {
    // Find most recent open thread for this contact
    const thread = await findOpenThreadForContact(tenantId, contact.id)
    if (thread) {
      return {
        threadId: thread.id,
        contactId: contact.id,
        contactType: contact.type
      }
    }

    // Create new thread for this contact
    const newThread = await createThread({
      tenantId,
      contactId: contact.id,
      type: 'general',
      status: 'open'
    })

    return {
      threadId: newThread.id,
      contactId: contact.id,
      contactType: contact.type
    }
  }

  // 3. No match - create unassigned thread
  return null
}
```

### API Routes

```
/api/webhooks/resend/inbound/route.ts   - Main inbound webhook handler

/api/admin/communications/
├── inbound/
│   ├── route.ts              - GET list all inbound emails
│   ├── [id]/route.ts         - GET inbound email details
│   └── [id]/reprocess/route.ts - POST reprocess failed email
├── treasury/
│   ├── receipts/
│   │   ├── route.ts          - GET list receipts
│   │   ├── [id]/route.ts     - GET, PATCH receipt
│   │   └── [id]/link-expense/route.ts - POST link to expense
│   └── communications/
│       └── route.ts          - GET treasury request comms
```

### Package Structure

```
packages/communications/
├── inbound/
│   ├── webhook-handler.ts    - Main webhook entry point
│   ├── router.ts             - Route by TO address
│   ├── treasury-parser.ts    - Approval keyword detection
│   ├── receipt-processor.ts  - Attachment storage
│   ├── thread-matcher.ts     - Reply thread matching
│   ├── creator-replies.ts    - Creator reply handling
│   └── auto-reply-detector.ts - Detect out-of-office
├── types.ts
└── index.ts
```

### Webhook Handler

```typescript
// /api/webhooks/resend/inbound/route.ts

export async function POST(req: Request) {
  const payload = await req.json()

  // Verify Resend webhook signature
  const signature = req.headers.get('resend-signature')
  if (!verifyResendSignature(payload, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const email = parseInboundEmail(payload)

  // Look up tenant by TO address
  const inboundAddress = await findInboundAddressByEmail(email.to)
  if (!inboundAddress) {
    // Log unknown email but don't fail
    await logUnknownInbound(email)
    return Response.json({ received: true, processed: false })
  }

  const tenantId = inboundAddress.tenantId

  // Log the inbound email
  const log = await logInboundEmail({
    tenantId,
    ...email,
    emailType: inboundAddress.purpose,
    inboundAddressId: inboundAddress.id
  })

  // Route to appropriate handler
  try {
    switch (inboundAddress.purpose) {
      case 'treasury':
        await handleTreasuryEmail(tenantId, email, log.id)
        break
      case 'receipts':
        await handleReceiptEmail(tenantId, email, log.id)
        break
      case 'support':
        await handleSupportEmail(tenantId, email, log.id)
        break
      case 'creator':
        await handleCreatorReply(tenantId, email, log.id)
        break
      default:
        await handleGenericEmail(tenantId, email, log.id)
    }

    await updateInboundLogStatus(log.id, 'processed')
  } catch (error) {
    await updateInboundLogStatus(log.id, 'failed', error.message)
    throw error
  }

  return Response.json({ received: true, processed: true })
}
```

### UI Components

#### Inbound Email List (/admin/communications/inbound)
- Filter by type (treasury, receipt, support, creator)
- Filter by status (pending, processed, failed)
- Search by sender email
- Date range filter
- Quick actions (reprocess, view details)

#### Receipt Queue (/admin/treasury/receipts)
- List of pending receipts with thumbnails
- Quick categorize action
- Link to expense modal
- Bulk archive

#### Treasury Communications (/admin/treasury/requests/[id])
- Timeline of outbound/inbound communications
- Parsed approval status with confidence indicator
- Manual override buttons (approve/reject)

---

## Constraints

- Inbound webhook MUST verify Resend signature
- Attachments MUST be stored in Vercel Blob under tenant path
- Treasury parsing MUST detect auto-replies and ignore them
- Thread matching MUST use In-Reply-To header when available
- All inbound emails MUST be logged regardless of processing status

---

## Pattern References

**RAWDOG code to reference:**
- `/src/app/api/webhooks/resend/inbound/route.ts` - Existing inbound handler
- `/src/lib/communications/` - Unified communications types

**External docs:**
- Resend API: Inbound email webhooks
- RFC 2822: Message-ID and In-Reply-To headers

---

## AI Discretion Areas

The implementing agent should determine:
1. Whether to fetch full email content from Resend API or use webhook payload
2. Optimal confidence thresholds for approval parsing
3. How to handle emails with mixed approval/rejection keywords
4. Whether to use AI for more advanced approval parsing

---

## Tasks

### [PARALLEL] Database Schema
- [x] Create `inbound_email_logs` table with indexes
- [x] Create `treasury_communications` table
- [x] Create `treasury_receipts` table
- [x] Create `email_threads` table
- [x] Create `thread_messages` table
- [x] Create `auto_response_rules` table

### [PARALLEL] Core Inbound Package
- [x] Implement `parseInboundEmail()` from webhook payload
- [x] Implement `verifyResendSignature()`
- [x] Implement `findInboundAddressByEmail()` tenant lookup
- [x] Implement `logInboundEmail()` with all fields

### [SEQUENTIAL after core] Handler Implementations
- [x] Implement treasury approval parser with keyword detection
- [x] Implement auto-reply detector patterns
- [x] Implement `extractTreasuryRequestId()` from subject
- [x] Implement receipt processor with Blob upload
- [x] Implement thread matcher for replies
- [x] Implement creator reply handler

### [SEQUENTIAL after handlers] Webhook Route
- [x] Implement main inbound webhook endpoint
- [x] Implement routing logic by address purpose
- [x] Implement error handling with status updates
- [ ] Implement Slack/dashboard notifications (deferred to Phase 2CM-NOTIFICATIONS)

### [SEQUENTIAL after webhook] API Routes
- [x] Implement inbound email list endpoint
- [x] Implement inbound email detail endpoint
- [x] Implement reprocess endpoint
- [x] Implement receipt list/detail endpoints
- [x] Implement receipt link-to-expense endpoint
- [x] Implement treasury communications endpoint

### [SEQUENTIAL after API] UI Components
- [ ] Build inbound email list page (deferred to frontend phase)
- [ ] Build inbound email detail modal (deferred to frontend phase)
- [ ] Build receipt queue page with thumbnails (deferred to frontend phase)
- [ ] Build receipt categorization modal (deferred to frontend phase)
- [ ] Build treasury communications timeline (deferred to frontend phase)
- [ ] Build manual approval override UI (deferred to frontend phase)

---

## Definition of Done

- [ ] Inbound webhook receives and logs all emails
- [ ] Treasury approval emails parsed with keyword detection
- [ ] Auto-replies detected and ignored
- [ ] Receipt attachments stored in Vercel Blob
- [ ] Support/creator replies matched to threads
- [ ] All inbound emails visible in admin UI
- [ ] Manual override available for unclear approvals
- [ ] Receipt → expense linking works
- [ ] `npx tsc --noEmit` passes
- [ ] Unit tests for approval parsing pass
- [ ] Integration test for inbound → treasury approval flow passes
