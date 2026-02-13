# PHASE-2CM-TEMPLATES: Email Template Management

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Status**: COMPLETE
**Completed**: 2026-02-10
**Duration**: Week 10 (4 days)
**Depends On**: PHASE-2CM-SENDER-DNS (sender addresses), PHASE-2CM-EMAIL-QUEUE (queue types)
**Parallel With**: PHASE-2CM-INBOUND-EMAIL
**Blocks**: All email sending (templates required for sends)

---

## Goal

Implement a per-tenant email template management system where ALL email content is customizable in admin. Each notification type has editable templates with variable substitution, preview, test send, and sender address selection.

**CRITICAL**: This is a **PORTABLE platform** - NO hardcoded email content. Every email template MUST be editable per tenant in admin UI.

---

## Success Criteria

- [x] Every notification type has a customizable template
- [x] Templates support variable insertion ({{customerName}}, {{orderNumber}}, etc.)
- [x] Templates have WYSIWYG editor with preview
- [x] Templates can select sender address from verified addresses
- [x] Test send functionality sends preview to admin email
- [x] Version history available for templates
- [x] Reset to default option available
- [x] Zero hardcoded email content in codebase

---

## Deliverables

### Database Schema

#### `tenant_email_templates` Table
```sql
CREATE TABLE tenant_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Template identification
  notification_type TEXT NOT NULL, -- review_request, creator_approved, etc.
  template_key TEXT NOT NULL, -- For variants: review_request_incentive

  -- Content
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT, -- Auto-generated if not provided

  -- Sender
  sender_address_id UUID REFERENCES tenant_sender_addresses(id),
  reply_to_override TEXT, -- Optional different reply-to

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Versioning
  version INTEGER DEFAULT 1,
  is_default BOOLEAN DEFAULT false, -- True if using system default

  -- Metadata
  last_edited_by UUID REFERENCES users(id),
  last_edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, notification_type, template_key)
);

CREATE INDEX idx_tenant_email_templates_tenant ON tenant_email_templates(tenant_id);
CREATE INDEX idx_tenant_email_templates_type ON tenant_email_templates(notification_type);
```

#### `tenant_email_template_versions` Table
```sql
CREATE TABLE tenant_email_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES tenant_email_templates(id) ON DELETE CASCADE,

  -- Versioned content
  version INTEGER NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,

  -- Metadata
  changed_by UUID REFERENCES users(id),
  change_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(template_id, version)
);

CREATE INDEX idx_template_versions_template ON tenant_email_template_versions(template_id);
```

### Template Variables Registry

```typescript
// packages/communications/templates/variables.ts

export interface TemplateVariable {
  key: string
  description: string
  example: string
  type: 'string' | 'number' | 'date' | 'currency' | 'url'
}

export const TEMPLATE_VARIABLES: Record<string, TemplateVariable[]> = {
  // Common variables (all templates)
  common: [
    { key: 'brandName', description: 'Your brand name', example: 'RAWDOG', type: 'string' },
    { key: 'supportEmail', description: 'Support email address', example: 'support@rawdog.com', type: 'string' },
    { key: 'websiteUrl', description: 'Your website URL', example: 'https://rawdog.com', type: 'url' },
    { key: 'unsubscribeUrl', description: 'Unsubscribe link', example: 'https://...', type: 'url' },
  ],

  // Review request variables
  review_request: [
    { key: 'customerName', description: 'Customer first name', example: 'John', type: 'string' },
    { key: 'customerEmail', description: 'Customer email', example: 'john@example.com', type: 'string' },
    { key: 'orderNumber', description: 'Order number', example: 'ORD-12345', type: 'string' },
    { key: 'productTitle', description: 'Product purchased', example: 'Moisturizer', type: 'string' },
    { key: 'reviewUrl', description: 'Link to leave review', example: 'https://...', type: 'url' },
    { key: 'incentiveText', description: 'Incentive offer text', example: '10% off your next order', type: 'string' },
    { key: 'incentiveCode', description: 'Discount code', example: 'THANKS10', type: 'string' },
  ],

  // Creator variables
  creator_application_approved: [
    { key: 'creatorName', description: 'Creator name', example: 'Jane Smith', type: 'string' },
    { key: 'dashboardUrl', description: 'Creator dashboard link', example: 'https://...', type: 'url' },
    { key: 'onboardingUrl', description: 'Onboarding link', example: 'https://...', type: 'url' },
  ],

  creator_payment_available: [
    { key: 'creatorName', description: 'Creator name', example: 'Jane Smith', type: 'string' },
    { key: 'amount', description: 'Payment amount', example: '$150.00', type: 'currency' },
    { key: 'payoutUrl', description: 'Payout settings link', example: 'https://...', type: 'url' },
  ],

  // E-sign variables
  esign_signing_request: [
    { key: 'signerName', description: 'Signer name', example: 'John Doe', type: 'string' },
    { key: 'documentTitle', description: 'Document name', example: 'Creator Agreement', type: 'string' },
    { key: 'signingUrl', description: 'Link to sign', example: 'https://...', type: 'url' },
    { key: 'expiresAt', description: 'Expiration date', example: 'January 15, 2025', type: 'date' },
    { key: 'requestorName', description: 'Who requested', example: 'RAWDOG Team', type: 'string' },
  ],

  // Subscription variables
  subscription_payment_failed: [
    { key: 'customerName', description: 'Customer name', example: 'John', type: 'string' },
    { key: 'subscriptionName', description: 'Subscription name', example: 'Monthly Bundle', type: 'string' },
    { key: 'amount', description: 'Payment amount', example: '$59.99', type: 'currency' },
    { key: 'updatePaymentUrl', description: 'Update payment link', example: 'https://...', type: 'url' },
    { key: 'retryDate', description: 'Next retry date', example: 'January 10, 2025', type: 'date' },
  ],

  // Treasury variables
  treasury_approval_request: [
    { key: 'approverName', description: 'Approver name', example: 'Finance Team', type: 'string' },
    { key: 'requestId', description: 'Request ID', example: '#SBA-202412-001', type: 'string' },
    { key: 'amount', description: 'Requested amount', example: '$5,000.00', type: 'currency' },
    { key: 'description', description: 'Request description', example: 'Q1 Marketing Budget', type: 'string' },
    { key: 'requestorName', description: 'Who requested', example: 'Marketing Team', type: 'string' },
    { key: 'approvalUrl', description: 'Approval dashboard link', example: 'https://...', type: 'url' },
  ],

  // Team invitation variables
  team_invitation: [
    { key: 'inviteeName', description: 'Invitee name', example: 'New User', type: 'string' },
    { key: 'inviterName', description: 'Who invited', example: 'Admin User', type: 'string' },
    { key: 'roleName', description: 'Assigned role', example: 'Content Manager', type: 'string' },
    { key: 'acceptUrl', description: 'Accept invitation link', example: 'https://...', type: 'url' },
    { key: 'expiresAt', description: 'Invitation expires', example: 'January 20, 2025', type: 'date' },
  ],
}

// Get variables for a notification type
export function getVariablesForType(type: string): TemplateVariable[] {
  const typeVars = TEMPLATE_VARIABLES[type] || []
  return [...TEMPLATE_VARIABLES.common, ...typeVars]
}
```

### Default Templates

```typescript
// packages/communications/templates/defaults.ts

export interface DefaultTemplate {
  notificationType: string
  templateKey: string
  subject: string
  bodyHtml: string
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  // Review Request
  {
    notificationType: 'review_request',
    templateKey: 'review_request',
    subject: 'How are you enjoying your {{productTitle}}?',
    bodyHtml: `
      <h2>Hi {{customerName}},</h2>
      <p>We hope you're loving your {{productTitle}}!</p>
      <p>We'd really appreciate if you could take a moment to share your experience.</p>
      <p><a href="{{reviewUrl}}" style="...">Leave a Review</a></p>
      <p>Thanks for being a {{brandName}} customer!</p>
    `
  },

  // Review Request with Incentive
  {
    notificationType: 'review_request',
    templateKey: 'review_request_incentive',
    subject: 'Share your thoughts & get {{incentiveText}}',
    bodyHtml: `
      <h2>Hi {{customerName}},</h2>
      <p>We hope you're loving your {{productTitle}}!</p>
      <p>As a thank you for your feedback, we'll send you {{incentiveText}} when you leave a review.</p>
      <p><a href="{{reviewUrl}}" style="...">Leave a Review</a></p>
      <p>Use code <strong>{{incentiveCode}}</strong> after submitting!</p>
    `
  },

  // Creator Application Approved
  {
    notificationType: 'creator_application_approved',
    templateKey: 'creator_application_approved',
    subject: 'Welcome to the {{brandName}} Creator Program! 🎉',
    bodyHtml: `
      <h2>Congratulations, {{creatorName}}!</h2>
      <p>Your application to the {{brandName}} Creator Program has been approved.</p>
      <p>Here's what happens next:</p>
      <ol>
        <li>Complete your profile setup</li>
        <li>Set up your payout method</li>
        <li>Browse available projects</li>
      </ol>
      <p><a href="{{dashboardUrl}}" style="...">Go to Your Dashboard</a></p>
    `
  },

  // E-Sign Signing Request
  {
    notificationType: 'esign_signing_request',
    templateKey: 'esign_signing_request',
    subject: '{{requestorName}} has requested your signature',
    bodyHtml: `
      <h2>Hi {{signerName}},</h2>
      <p>{{requestorName}} has sent you a document to sign:</p>
      <p><strong>{{documentTitle}}</strong></p>
      <p>Please review and sign the document by {{expiresAt}}.</p>
      <p><a href="{{signingUrl}}" style="...">Review & Sign</a></p>
    `
  },

  // Treasury Approval Request
  {
    notificationType: 'treasury_approval_request',
    templateKey: 'treasury_approval_request',
    subject: '[Action Required] Approve {{requestId}}: {{amount}}',
    bodyHtml: `
      <h2>Approval Request {{requestId}}</h2>
      <p><strong>Amount:</strong> {{amount}}</p>
      <p><strong>Description:</strong> {{description}}</p>
      <p><strong>Requested by:</strong> {{requestorName}}</p>
      <p>To approve this request, simply reply to this email with "Approved" or click the link below:</p>
      <p><a href="{{approvalUrl}}" style="...">View in Dashboard</a></p>
      <p>To reject, reply with "Rejected" and your reason.</p>
    `
  },

  // Team Invitation
  {
    notificationType: 'team_invitation',
    templateKey: 'team_invitation',
    subject: '{{inviterName}} invited you to {{brandName}}',
    bodyHtml: `
      <h2>You're Invited!</h2>
      <p>{{inviterName}} has invited you to join {{brandName}} as a <strong>{{roleName}}</strong>.</p>
      <p>This invitation expires on {{expiresAt}}.</p>
      <p><a href="{{acceptUrl}}" style="...">Accept Invitation</a></p>
    `
  },

  // ... more default templates for all notification types
]
```

### Template Rendering

```typescript
// packages/communications/templates/render.ts

interface RenderOptions {
  tenantId: string
  notificationType: string
  templateKey?: string
  variables: Record<string, string | number | Date>
}

interface RenderedEmail {
  subject: string
  bodyHtml: string
  bodyText: string
  senderAddress: string
  senderName: string
  replyTo?: string
}

export async function renderEmailTemplate(
  options: RenderOptions
): Promise<RenderedEmail> {
  // Get tenant's custom template or default
  const template = await getTemplateForTenant(
    options.tenantId,
    options.notificationType,
    options.templateKey
  )

  // Get sender address
  const sender = await getSenderForNotification(
    options.tenantId,
    options.notificationType
  )

  // Add brand-specific common variables
  const tenant = await getTenant(options.tenantId)
  const allVariables = {
    ...options.variables,
    brandName: tenant.name,
    supportEmail: tenant.supportEmail,
    websiteUrl: tenant.websiteUrl,
    // ... other common vars
  }

  // Render subject and body
  const subject = substituteVariables(template.subject, allVariables)
  const bodyHtml = substituteVariables(template.bodyHtml, allVariables)
  const bodyText = template.bodyText
    ? substituteVariables(template.bodyText, allVariables)
    : htmlToPlainText(bodyHtml)

  return {
    subject,
    bodyHtml,
    bodyText,
    senderAddress: sender.emailAddress,
    senderName: sender.displayName,
    replyTo: template.replyToOverride || sender.replyToAddress
  }
}

function substituteVariables(
  template: string,
  variables: Record<string, string | number | Date>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key]
    if (value === undefined) return match // Keep original if no value

    if (value instanceof Date) {
      return formatDate(value)
    }
    return String(value)
  })
}

function htmlToPlainText(html: string): string {
  // Convert HTML to plain text for multipart emails
  return html
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g, '$2 ($1)')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}
```

### API Routes

```
/api/admin/settings/email/templates/
├── route.ts                    - GET list all templates
├── [type]/route.ts             - GET, PUT template by type
├── [type]/preview/route.ts     - POST preview with variables
├── [type]/test/route.ts        - POST send test email
├── [type]/reset/route.ts       - POST reset to default
├── [type]/versions/route.ts    - GET version history
└── variables/route.ts          - GET available variables

# Per-function template editors

> **STATUS**: ✅ COMPLETE (2026-02-13)
/api/admin/reviews/settings/templates/
├── route.ts                    - GET review templates
└── [key]/route.ts              - PUT update template

/api/admin/creators/communications/templates/
├── route.ts
└── [key]/route.ts

# ... similar for esign, subscriptions, treasury
```

### Package Structure

```
packages/communications/
├── templates/
│   ├── types.ts           - Template types, variable types
│   ├── variables.ts       - Variable registry per notification type
│   ├── defaults.ts        - Default template content
│   ├── db.ts              - Template CRUD operations
│   ├── render.ts          - Variable substitution
│   ├── versions.ts        - Version history management
│   └── html-to-text.ts    - HTML to plain text conversion
└── index.ts
```

### UI Components

#### Template Editor Page
```typescript
interface TemplateEditorProps {
  notificationType: string
  templateKey: string
}

// Features:
// - WYSIWYG editor (TipTap or similar)
// - Subject line input
// - Variable insertion buttons
// - Sender address selector (from verified addresses)
// - Preview panel (live updates)
// - Test send button
// - Save / Reset to default buttons
// - Version history sidebar
```

#### Variable Insertion UI
```typescript
interface VariableButtonsProps {
  variables: TemplateVariable[]
  onInsert: (variableKey: string) => void
}

// Display as clickable chips:
// [{{customerName}}] [{{orderNumber}}] [{{productTitle}}] ...
```

#### Preview Panel
```typescript
interface TemplatePreviewProps {
  template: { subject: string; bodyHtml: string }
  sampleData: Record<string, string>
}

// Shows:
// - Rendered subject line
// - Rendered email body in iframe/sandbox
// - Switch between HTML and plain text views
// - Mobile/desktop preview toggle
```

#### Template List by Function
```
/admin/reviews/settings → Templates tab
├── Review Request
├── Review Request (with incentive)
├── Review Reminder
├── Review Thank You

/admin/creators/communications/templates
├── Application Approved
├── First Reminder (24h)
├── Second Reminder (72h)
├── Final Reminder (7d)
├── Project Assigned
├── Revision Requested
├── Payment Available
└── Monthly Summary

/admin/esign/templates → Email tab
├── Signing Request
├── Signing Complete
├── Document Complete
├── Reminder
└── Void Notification
```

---

## Constraints

- Templates MUST NOT contain hardcoded brand names or URLs
- All templates MUST use variables for dynamic content
- HTML emails MUST have plain text alternative (auto-generated if not provided)
- Template variables MUST be validated before save (no undefined vars)
- Default templates serve as fallback if tenant hasn't customized
- Version history MUST be preserved on every save

---

## Pattern References

**RAWDOG code to reference:**
- `/src/app/admin/reviews/settings/` - Review template editor
- `/src/app/admin/creators/communications/templates/` - Creator templates
- `/src/lib/reviews/emails/send.ts` - Variable substitution patterns

---

## AI Discretion Areas

The implementing agent should determine:
1. Which WYSIWYG editor to use (TipTap, Slate, Draft.js)
2. Whether to support custom HTML mode in addition to WYSIWYG
3. How to handle template migration when new variables are added
4. Whether to add template testing automation (send to test inbox)

---

## Tasks

### [PARALLEL] Database Schema
- [x] Create `tenant_email_templates` table
- [x] Create `tenant_email_template_versions` table
- [x] Create migration to seed default templates

### [PARALLEL] Core Templates Package
- [x] Implement `TemplateVariable` type and registry
- [x] Implement default templates for all notification types
- [x] Implement `getTemplateForTenant()` with fallback to default
- [x] Implement `saveTemplate()` with version creation
- [x] Implement `substituteVariables()` function
- [x] Implement `htmlToPlainText()` conversion
- [x] Implement `renderEmailTemplate()` main function

### [SEQUENTIAL after core] API Routes
- [x] Implement template list endpoint
- [x] Implement template get/update endpoints
- [x] Implement preview endpoint
- [x] Implement test send endpoint
- [x] Implement reset to default endpoint
- [x] Implement version history endpoint
- [x] Implement variables list endpoint

### [SEQUENTIAL after API] UI Components
- [x] Build WYSIWYG editor component (TipTap)
- [x] Build variable insertion buttons
- [x] Build preview panel with HTML/text toggle
- [x] Build sender address selector
- [x] Build test send modal
- [x] Build version history sidebar
- [x] Build reset confirmation modal

### [SEQUENTIAL after UI] Per-Function Editors
- [x] Build review templates editor tab
- [x] Build creator templates editor page
- [x] Build e-sign templates editor tab
- [x] Build subscription templates editor page
- [x] Build treasury templates editor tab
- [x] Build team invitation template editor

### [SEQUENTIAL after all] Integration
- [x] Update all email sending functions to use `renderEmailTemplate()`
- [x] Remove all hardcoded email content from codebase
- [x] Add template seeding to tenant onboarding

---

## Definition of Done

- [x] Every notification type has editable template in admin
- [x] Variable insertion works with clickable buttons
- [x] Preview shows rendered email with sample data
- [x] Test send works to admin email
- [x] Version history preserved on saves
- [x] Reset to default works
- [x] Sender address selectable per template
- [x] Plain text auto-generated from HTML
- [x] Zero hardcoded email content in codebase
- [x] `npx tsc --noEmit` passes (templates module; pre-existing errors in queue module)
- [x] Unit tests for variable substitution pass
- [ ] E2E test for template edit → send flow passes (deferred to integration testing)
