# CGK Gap Resolution Plan
**Created**: February 16, 2026
**Based on**: Comprehensive Audit 2026-02-16

---

## Priority Matrix

| Priority | Count | Description |
|----------|-------|-------------|
| **P0 - Critical** | 4 | Job handler stubs blocking features |
| **P1 - High** | 4 | Integration stubs affecting functionality |
| **P2 - Medium** | 4 | Maintenance and polish items |
| **P3 - Low** | 7 | Code quality and documentation |

---

## Phase 1: Critical Job Handler Stubs (P0)

### 1.1 Voice Job Handlers
**Location**: `packages/jobs/src/handlers/voice.ts`
**Blocked**: AI voice/call features

**Tasks**:
1. Create `packages/ai-agents/` package OR wire to existing Retell integration
2. Implement `generateCallSummariesJob` - Use Claude to summarize call transcripts
3. Implement `cleanupOldRecordingsJob` - Delete recordings older than retention period
4. Implement `syncRetellAgentJob` - Sync agent configs to Retell API
5. Implement `retellWebhookJob` - Process Retell webhooks (call.ended, etc.)

**Dependencies**: Retell API credentials, Claude API for summaries

**Effort**: 4-6 hours

---

### 1.2 Treasury Job Handlers
**Location**: `packages/jobs/src/handlers/treasury.ts`
**Blocked**: Stripe topup automation, treasury management

**Tasks**:
1. Implement `treasurySendApprovalEmailJob` - Send approval request emails
2. Implement `treasuryProcessInboundEmailJob` - Parse email replies for approvals
3. Implement `treasuryAutoSendApprovedJob` - Auto-process approved treasury actions
4. Implement `treasurySyncTopupStatusesJob` - Sync Stripe topup statuses
5. Implement `treasuryLowBalanceAlertJob` - Alert when balance below threshold

**Dependencies**: Resend for emails, Stripe API for topups

**Effort**: 3-4 hours

---

### 1.3 Workflow Job Handlers
**Location**: `packages/jobs/src/handlers/workflow.ts`
**Blocked**: Automated workflow execution

**Tasks**:
1. Import workflow module from `@cgk-platform/admin-core/workflow`
2. Implement `workflowAutoTriggerJob` - Trigger workflows on events
3. Implement `workflowCheckScheduledJob` - Check for scheduled workflows
4. Implement `workflowApproveExecutionJob` - Process workflow approvals
5. Implement `workflowExecuteScheduledJob` - Execute scheduled workflows

**Dependencies**: admin-core workflow module (exists)

**Effort**: 2-3 hours

---

### 1.4 Video Transcription Handlers
**Location**: `packages/jobs/src/handlers/video-transcription.ts`
**Blocked**: Video AI features

**Tasks**:
1. Wire to `@cgk-platform/video` transcription module
2. Implement `transcribeVideoJob` - Send to AssemblyAI, store result
3. Implement `generateVideoContentJob` - Generate titles/summaries with Claude
4. Implement `syncTranscriptionJob` - Sync transcription status

**Dependencies**: AssemblyAI credentials, Claude API

**Effort**: 2-3 hours

---

## Phase 2: High Priority Integrations (P1)

### 2.1 Slack Integration
**Location**: `packages/admin-core/src/workflow/actions.ts:256`
**Impact**: Workflow Slack notifications don't send

**Tasks**:
1. Add Slack credentials to tenant integrations
2. Implement `sendSlackNotification()` function using Slack Web API
3. Process pending notifications from `workflow_slack_notifications` table
4. Add retry logic for failed sends

**Code Pattern**:
```typescript
import { WebClient } from '@slack/web-api'

async function sendSlackNotification(tenantId: string, channel: string, message: string) {
  const slack = await getTenantSlackClient(tenantId)
  if (!slack) {
    console.warn(`Slack not configured for tenant ${tenantId}`)
    return { sent: false, reason: 'not_configured' }
  }

  await slack.chat.postMessage({ channel, text: message })
  return { sent: true }
}
```

**Effort**: 1-2 hours

---

### 2.2 AI Draft Generation
**Location**: `packages/admin-core/src/inbox/messages.ts:277`
**Impact**: AI drafts return placeholder text

**Tasks**:
1. Add `getTenantAnthropicClient()` to integrations
2. Implement `generateDraft()` using Claude API
3. Use message context for better drafts
4. Handle rate limits and errors

**Code Pattern**:
```typescript
import Anthropic from '@anthropic-ai/sdk'

async function generateDraft(tenantId: string, context: MessageContext): Promise<string> {
  const anthropic = await getTenantAnthropicClient(tenantId)
  if (!anthropic) {
    return '[AI drafts require Anthropic API key configuration]'
  }

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: buildDraftPrompt(context) }
    ]
  })

  return response.content[0].text
}
```

**Effort**: 1-2 hours

---

### 2.3 MCP Resources
**Location**: `packages/mcp/src/resources.ts`
**Impact**: MCP shows hardcoded demo data

**Tasks**:
1. Replace `cgk://config/platform` with real config lookup
2. Replace `cgk://tenant/current` with real tenant info
3. Add proper tenant context to resource handlers

**Code Pattern**:
```typescript
async function getPlatformConfig(tenantId: string): Promise<Resource> {
  const config = await withTenant(tenantId, async () => {
    return sql`SELECT * FROM tenant_settings WHERE key = 'platform_config'`
  })

  return {
    uri: 'cgk://config/platform',
    mimeType: 'application/json',
    text: JSON.stringify(config || {})
  }
}
```

**Effort**: 1 hour

---

### 2.4 Carrier API Integration
**Location**: `apps/admin/src/lib/creators-admin-ops/jobs.ts:324`
**Impact**: Shipment tracking not real-time

**Tasks**:
1. Add EasyPost or ShipEngine credentials
2. Implement `checkShipmentStatus()` using carrier API
3. Update shipment records with tracking events
4. Add webhook handler for push updates

**Effort**: 3-4 hours

---

## Phase 3: Medium Priority (P2)

### 3.1 Migration Renumbering
**Location**: `packages/db/src/migrations/tenant/`
**Impact**: Maintenance debt

**Tasks**:
1. List all duplicate version numbers
2. Create renumbering map (015_a → 015, 015_b → 016, etc.)
3. Rename files with new numbers
4. Update any references in code
5. Test migration runs clean

**Effort**: 2-3 hours

---

### 3.2 Projects Table Schema Fix
**Location**: Migrations 012 vs 015
**Impact**: Potential FK type mismatch

**Tasks**:
1. Audit all `projects` table references
2. Determine canonical ID type (UUID preferred)
3. Update conflicting migration to match
4. Add migration to fix existing data if needed

**Effort**: 1-2 hours

---

### 3.3 Archive Feature
**Location**: `packages/communications/src/queue/bulk-actions.ts`
**Impact**: Old email queue entries not cleaned

**Tasks**:
1. Create `email_queue_archive` table migration
2. Implement `archiveOldEntries()` function
3. Add scheduled job to run archive weekly
4. Add admin UI to view/restore archived entries

**Effort**: 2-3 hours

---

### 3.4 SMS Channel
**Location**: `packages/admin-core/src/inbox/messages.ts:510`
**Impact**: SMS messages not sent

**Tasks**:
1. Add Twilio credentials to tenant integrations
2. Implement `queueSmsMessage()` function
3. Add SMS queue processor job
4. Handle delivery status webhooks

**Effort**: 3-4 hours

---

## Phase 4: Low Priority (P3)

### 4.1 Round Robin Assignment
**File**: `packages/admin-core/src/workflow/actions.ts:530`
**Task**: Implement proper round-robin vs random assignment
**Effort**: 1 hour

### 4.2 Report Generation
**File**: `packages/admin-core/src/workflow/actions.ts:628`
**Task**: Build report templates and PDF generation
**Effort**: 2-3 hours

### 4.3 Response Time Calculation
**File**: `apps/admin/src/lib/creators/db.ts:579`
**Task**: Calculate avg_response_hours from actual message data
**Effort**: 30 mins

### 4.4 Chat Agent ID
**File**: `apps/admin/src/app/admin/support/chat/components/chat-queue.tsx:55`
**Task**: Get actual agent ID from session context
**Effort**: 15 mins

### 4.5 ESLint Import Ordering
**Files**: `apps/*/eslint.config.mjs`
**Task**: Fix imports and re-enable rule
**Effort**: 1-2 hours

### 4.6 Static Storefront Pages
**Location**: `apps/storefront/`
**Task**: Create /privacy, /terms, /contact, /faq pages
**Effort**: 2-3 hours

### 4.7 Token Refresh Notification
**File**: `packages/integrations/src/jobs/token-refresh.ts:89`
**Task**: Send email/push when OAuth token refresh fails
**Effort**: 30 mins

---

## Implementation Order

```
Week 1: Critical Stubs (P0)
├── Day 1-2: Voice Handlers + AI Agents package
├── Day 3: Treasury Handlers
├── Day 4: Workflow Handlers
└── Day 5: Video Transcription Handlers

Week 2: High Priority (P1)
├── Day 1: Slack Integration
├── Day 2: AI Draft Generation
├── Day 3: MCP Resources
└── Day 4-5: Carrier API Integration

Week 3: Medium Priority (P2)
├── Day 1-2: Migration Renumbering
├── Day 3: Projects Schema Fix
├── Day 4: Archive Feature
└── Day 5: SMS Channel

Week 4: Low Priority (P3)
├── Day 1: Round Robin + Report Generation
├── Day 2: Small fixes (response time, agent ID, token notification)
├── Day 3-4: Static Storefront Pages
└── Day 5: ESLint cleanup + Final testing
```

---

## Effort Summary

| Phase | Items | Total Effort |
|-------|-------|--------------|
| Phase 1 (P0) | 4 | 11-16 hours |
| Phase 2 (P1) | 4 | 6-9 hours |
| Phase 3 (P2) | 4 | 8-12 hours |
| Phase 4 (P3) | 7 | 7-10 hours |
| **Total** | **19** | **32-47 hours** |

---

## Success Criteria

After completing all phases:

- [ ] All job handlers execute without "not implemented" errors
- [ ] Slack notifications actually send to channels
- [ ] AI drafts use Claude API (not placeholder)
- [ ] MCP resources return real tenant data
- [ ] Carrier tracking updates automatically
- [ ] No duplicate migration version numbers
- [ ] Email queue has archive functionality
- [ ] SMS messages can be sent
- [ ] All TODO comments addressed or documented
- [ ] Storefront has static policy pages

---

## Files to Modify

### Phase 1 (P0)
- `packages/jobs/src/handlers/voice.ts` - Implement 4 handlers
- `packages/jobs/src/handlers/treasury.ts` - Implement 5 handlers
- `packages/jobs/src/handlers/workflow.ts` - Implement 4 handlers
- `packages/jobs/src/handlers/video-transcription.ts` - Implement 3 handlers

### Phase 2 (P1)
- `packages/admin-core/src/workflow/actions.ts` - Wire Slack API
- `packages/admin-core/src/inbox/messages.ts` - Wire Claude API
- `packages/mcp/src/resources.ts` - Real data lookups
- `apps/admin/src/lib/creators-admin-ops/jobs.ts` - Carrier API

### Phase 3 (P2)
- `packages/db/src/migrations/tenant/*.sql` - Renumber files
- `packages/communications/src/queue/bulk-actions.ts` - Archive impl
- `packages/admin-core/src/inbox/messages.ts` - SMS impl

### Phase 4 (P3)
- Multiple small fixes across codebase
- New pages in `apps/storefront/src/app/`

---

**Plan Created**: February 16, 2026
**Estimated Duration**: 4 weeks
**Total Effort**: 32-47 hours
