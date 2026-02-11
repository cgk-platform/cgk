# PHASE-2AI-CORE: AI Assistant Core

**Status**: COMPLETE
**Completed**: 2026-02-10

> **Goal**: Implement the foundational AI assistant system with agent configuration, personality traits, autonomy settings, and action logging
> **Duration**: 1.5 weeks
> **Dependencies**: PHASE-1C-AUTH (authentication), PHASE-1B-DATABASE (schema-per-tenant)
> **Parallelizable**: Yes (can run alongside PHASE-2PO-* after admin shell is complete)

---

## Success Criteria

- [ ] AI agents table with full configuration (model, temperature, capabilities)
- [ ] Agent personality system with 6 configurable traits
- [ ] Autonomy settings with 3 levels (autonomous, suggest_and_confirm, human_required)
- [ ] Action logging with approval workflow
- [ ] Per-agent approval request queue
- [ ] Admin UI for agent configuration
- [ ] Tenant isolation enforced on all agent data

---

## Architecture Overview

The AI Assistant system (BRII - Business Relationships & Interaction Intelligence) provides:

1. **AI Agents**: Configurable AI employees with distinct personalities
2. **Personality System**: 6 traits that control response style
3. **Autonomy Levels**: What actions require human approval
4. **Action Logging**: Complete audit trail of agent actions
5. **Approval Workflow**: Queue for high-stakes actions needing human review

---

## Database Schema

### Core Agent Tables

```sql
-- AI Agents (one per tenant, or multiple for AI teams)
CREATE TABLE ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,                    -- e.g., 'bri'
  display_name TEXT NOT NULL,            -- e.g., 'Bri Wilder'
  email TEXT,                            -- e.g., 'bri@tenant.com'
  role TEXT NOT NULL,                    -- e.g., 'Creator Pipeline Operations Agent'
  avatar_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, training, retired
  is_primary BOOLEAN DEFAULT false,      -- Primary agent for tenant

  -- AI Configuration
  ai_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  ai_temperature DECIMAL(3,2) DEFAULT 0.7,
  ai_max_tokens INTEGER DEFAULT 4096,

  -- Capabilities
  capabilities TEXT[] DEFAULT ARRAY['slack', 'email'],
  tool_access TEXT[] DEFAULT ARRAY[]::TEXT[],  -- Which MCP tools can this agent use

  -- Relationships
  manager_agent_id UUID REFERENCES ai_agents(id),
  human_manager_id TEXT,                 -- Reference to team member

  -- Connected accounts (encrypted)
  connected_accounts JSONB DEFAULT '{}', -- OAuth tokens for various services

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, name),
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_ai_agents_tenant ON ai_agents(tenant_id);
CREATE INDEX idx_ai_agents_status ON ai_agents(tenant_id, status);
CREATE INDEX idx_ai_agents_primary ON ai_agents(tenant_id, is_primary) WHERE is_primary = true;
```

### Personality System

```sql
-- Agent personality configuration
CREATE TABLE agent_personality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- 6 Core Traits (0.0 to 1.0 scale)
  trait_formality DECIMAL(3,2) DEFAULT 0.5,      -- Casual ↔ Formal
  trait_verbosity DECIMAL(3,2) DEFAULT 0.5,      -- Concise ↔ Detailed
  trait_proactivity DECIMAL(3,2) DEFAULT 0.7,    -- Reactive ↔ Proactive
  trait_humor DECIMAL(3,2) DEFAULT 0.3,          -- Serious ↔ Playful
  trait_emoji_usage DECIMAL(3,2) DEFAULT 0.2,    -- None ↔ Frequent
  trait_assertiveness DECIMAL(3,2) DEFAULT 0.5,  -- Deferential ↔ Assertive

  -- Customization
  preferred_greeting TEXT,                        -- e.g., 'Hey there!'
  signature TEXT,                                 -- e.g., '- Bri 💪'
  go_to_emojis TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Behavioral controls
  always_confirm_actions BOOLEAN DEFAULT false,
  offer_alternatives BOOLEAN DEFAULT true,
  explain_reasoning BOOLEAN DEFAULT true,

  -- Templates
  custom_greeting_templates JSONB DEFAULT '[]',   -- Array of greeting variations
  custom_error_templates JSONB DEFAULT '[]',      -- How to handle errors
  forbidden_topics TEXT[] DEFAULT ARRAY[]::TEXT[], -- Topics to avoid

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(agent_id)
);
```

### Autonomy Settings

```sql
-- Agent autonomy levels and per-action configuration
CREATE TABLE agent_autonomy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Global limits
  max_actions_per_hour INTEGER DEFAULT 100,
  max_cost_per_day DECIMAL(10,2) DEFAULT 50.00,  -- API spend limit
  require_human_for_high_value DECIMAL(10,2) DEFAULT 1000.00,

  -- Learning settings
  adapt_to_feedback BOOLEAN DEFAULT true,
  track_success_patterns BOOLEAN DEFAULT true,
  adjust_to_user_preferences BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(agent_id)
);

-- Per-action autonomy configuration
CREATE TABLE agent_action_autonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  action_type TEXT NOT NULL,              -- e.g., 'send_message', 'approve_payout'
  autonomy_level TEXT NOT NULL,           -- autonomous, suggest_and_confirm, human_required

  -- Limits
  enabled BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  max_per_day INTEGER,
  cooldown_hours DECIMAL(5,2),

  UNIQUE(agent_id, action_type)
);

-- Default autonomy levels per action type (tenant-wide defaults)
-- These are seeded during tenant onboarding
INSERT INTO agent_action_autonomy (agent_id, action_type, autonomy_level) VALUES
-- Autonomous (no approval needed)
(agent_id, 'lookup_data', 'autonomous'),
(agent_id, 'send_check_in', 'autonomous'),
(agent_id, 'generate_report', 'autonomous'),
(agent_id, 'answer_question', 'autonomous'),
(agent_id, 'log_action', 'autonomous'),
(agent_id, 'schedule_task', 'autonomous'),

-- Suggest and confirm
(agent_id, 'send_first_message', 'suggest_and_confirm'),
(agent_id, 'change_status', 'suggest_and_confirm'),
(agent_id, 'extend_deadline', 'suggest_and_confirm'),
(agent_id, 'escalate_issue', 'suggest_and_confirm'),

-- Human required
(agent_id, 'process_payment', 'human_required'),
(agent_id, 'approve_content', 'human_required'),
(agent_id, 'decline_application', 'human_required'),
(agent_id, 'change_rate', 'human_required'),
(agent_id, 'send_bulk_message', 'human_required');
```

### Action Logging

```sql
-- Complete audit trail of agent actions
CREATE TABLE agent_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Action details
  action_type TEXT NOT NULL,
  action_category TEXT,                   -- messaging, content, finance, etc.
  action_description TEXT NOT NULL,

  -- Data
  input_data JSONB,
  output_data JSONB,
  tools_used TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Related entities
  creator_id TEXT,
  project_id TEXT,
  conversation_id TEXT,

  -- Approval workflow
  required_approval BOOLEAN DEFAULT false,
  approval_status TEXT,                   -- pending, approved, rejected
  approved_by TEXT,                       -- User ID who approved
  approved_at TIMESTAMPTZ,

  -- Result
  success BOOLEAN DEFAULT true,
  error_message TEXT,

  -- Visibility
  visible_to_creator BOOLEAN DEFAULT false,
  visible_in_dashboard BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),

  -- Indexes for querying
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_action_log_tenant ON agent_action_log(tenant_id);
CREATE INDEX idx_action_log_agent ON agent_action_log(agent_id);
CREATE INDEX idx_action_log_type ON agent_action_log(tenant_id, action_type);
CREATE INDEX idx_action_log_created ON agent_action_log(tenant_id, created_at DESC);
CREATE INDEX idx_action_log_creator ON agent_action_log(tenant_id, creator_id) WHERE creator_id IS NOT NULL;
CREATE INDEX idx_action_log_project ON agent_action_log(tenant_id, project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_action_log_pending ON agent_action_log(tenant_id, approval_status) WHERE approval_status = 'pending';
```

### Approval Requests

```sql
-- Queue for actions awaiting human approval
CREATE TABLE agent_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  action_log_id UUID REFERENCES agent_action_log(id),

  -- Request details
  action_type TEXT NOT NULL,
  action_payload JSONB NOT NULL,
  reason TEXT,                            -- Why agent wants to do this

  -- Approval routing
  requested_at TIMESTAMPTZ DEFAULT now(),
  approver_type TEXT,                     -- human, ai (for escalation)
  approver_id TEXT,                       -- Who should approve

  -- Response
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, timeout, cancelled
  responded_at TIMESTAMPTZ,
  response_note TEXT,

  -- Slack integration
  slack_message_ts TEXT,
  slack_channel_id TEXT,

  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_approval_requests_tenant ON agent_approval_requests(tenant_id);
CREATE INDEX idx_approval_requests_pending ON agent_approval_requests(tenant_id, status) WHERE status = 'pending';
CREATE INDEX idx_approval_requests_approver ON agent_approval_requests(tenant_id, approver_id);
```

---

## Package Structure

```
packages/ai-agents/
├── src/
│   ├── index.ts                 # Public exports
│   ├── types.ts                 # Type definitions
│   │
│   ├── agents/
│   │   ├── registry.ts          # CRUD for agents
│   │   ├── config.ts            # Agent configuration
│   │   └── status.ts            # Status management
│   │
│   ├── personality/
│   │   ├── traits.ts            # Trait definitions and calculations
│   │   ├── prompt-builder.ts    # Build personality section for prompts
│   │   └── preview.ts           # Generate personality preview
│   │
│   ├── autonomy/
│   │   ├── settings.ts          # Global autonomy settings
│   │   ├── action-config.ts     # Per-action configuration
│   │   └── check.ts             # Check if action is allowed
│   │
│   ├── actions/
│   │   ├── logger.ts            # Log agent actions
│   │   ├── approval.ts          # Approval request handling
│   │   └── patterns.ts          # Success pattern recording
│   │
│   └── db/
│       ├── schema.ts            # Table definitions
│       └── queries.ts           # Database operations
│
├── package.json
└── tsconfig.json
```

---

## API Endpoints

### Agent Management

```typescript
// GET /api/admin/ai-agents
// List all agents for tenant
export async function GET(req: Request) {
  const { tenantId, permissions } = await getTenantContext(req)
  await requirePermission(req, 'ai.agents.view')

  const agents = await withTenant(tenantId, () => listAgents())
  return Response.json({ agents })
}

// POST /api/admin/ai-agents
// Create new agent
export async function POST(req: Request) {
  const { tenantId, permissions } = await getTenantContext(req)
  await requirePermission(req, 'ai.agents.manage')

  const data = await req.json()
  const agent = await withTenant(tenantId, () => createAgent(data))
  return Response.json({ agent })
}

// GET /api/admin/ai-agents/[agentId]
// Get agent details
// PATCH /api/admin/ai-agents/[agentId]
// Update agent
// DELETE /api/admin/ai-agents/[agentId]
// Retire agent
```

### Personality Configuration

```typescript
// GET /api/admin/ai-agents/[agentId]/personality
// Get personality config

// PATCH /api/admin/ai-agents/[agentId]/personality
// Update personality traits
export async function PATCH(req: Request, { params }: { params: { agentId: string } }) {
  const { tenantId } = await getTenantContext(req)
  await requirePermission(req, 'ai.agents.manage')

  const updates = await req.json()
  const personality = await withTenant(tenantId, () =>
    updateAgentPersonality(params.agentId, updates)
  )
  return Response.json({ personality })
}

// POST /api/admin/ai-agents/[agentId]/personality/preview
// Generate preview of personality in action
```

### Autonomy Settings

```typescript
// GET /api/admin/ai-agents/[agentId]/autonomy
// Get autonomy configuration

// PATCH /api/admin/ai-agents/[agentId]/autonomy
// Update global autonomy settings

// GET /api/admin/ai-agents/[agentId]/autonomy/actions
// List per-action autonomy settings

// PATCH /api/admin/ai-agents/[agentId]/autonomy/actions/[actionType]
// Update specific action autonomy
```

### Action Log

```typescript
// GET /api/admin/ai-agents/actions
// List all agent actions (with filters)
export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)
  await requirePermission(req, 'ai.actions.view')

  const url = new URL(req.url)
  const filters = {
    agentId: url.searchParams.get('agentId'),
    actionType: url.searchParams.get('actionType'),
    creatorId: url.searchParams.get('creatorId'),
    startDate: url.searchParams.get('startDate'),
    endDate: url.searchParams.get('endDate'),
    limit: parseInt(url.searchParams.get('limit') || '50'),
  }

  const actions = await withTenant(tenantId, () => listActions(filters))
  return Response.json({ actions })
}

// GET /api/admin/ai-agents/actions/[actionId]
// Get action details
```

### Approval Queue

```typescript
// GET /api/admin/ai-agents/approvals
// List pending approvals

// POST /api/admin/ai-agents/approvals/[requestId]/approve
// Approve action

// POST /api/admin/ai-agents/approvals/[requestId]/reject
// Reject action with reason
```

---

## Admin UI Pages

### Agent List (`/admin/ai-team`)

```
┌─────────────────────────────────────────────────────────────────┐
│ AI Team                                            [+ New Agent] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🤖 Bri Wilder                                    [Active] ◉ ││
│  │ Creator Pipeline Operations Agent                           ││
│  │ Model: claude-sonnet-4 │ Temp: 0.7 │ Capabilities: 5       ││
│  │                                                              ││
│  │ Personality         Actions Today    Memories               ││
│  │ ████░ Formal       ░░░░░░░░░░  12   ████████ 847           ││
│  │ ██░░░ Verbose      ▓▓▓▓░░░░░░        Confidence: 0.82       ││
│  │ ███░░ Proactive                                              ││
│  │ █░░░░ Humor        [Configure] [Train] [View Actions]       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🤖 Support Bot                                  [Paused] ○  ││
│  │ Customer Support Agent                                       ││
│  │ Model: claude-haiku │ Temp: 0.3 │ Capabilities: 2           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Configuration (`/admin/ai-team/[agentId]`)

Tabs:
1. **General** - Name, role, model settings
2. **Personality** - 6 trait sliders with preview
3. **Autonomy** - Action-level permissions
4. **Integrations** - Connected accounts (Slack, Email, etc.)
5. **Actions** - Recent action log

### Action Log (`/admin/ai-team/actions`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Agent Actions                                                    │
├─────────────────────────────────────────────────────────────────┤
│ Agent: [All ▼]  Type: [All ▼]  Status: [All ▼]  📅 Last 7 days │
├─────────────────────────────────────────────────────────────────┤
│ ● 2 min ago   Bri    sent_message    Checked in with @sarah    │
│   ✓ Success   Tools: get_creator_status, send_slack_dm          │
│                                                                  │
│ ● 15 min ago  Bri    generate_report  Weekly creator summary   │
│   ✓ Success   Tools: query_database, format_report              │
│                                                                  │
│ ● 1 hour ago  Bri    process_payment  [Awaiting Approval]      │
│   ⏳ Pending   Amount: $1,250.00  Creator: @mike                │
│               [Approve] [Reject]                                 │
│                                                                  │
│ ● 2 hours ago Bri    send_first_msg   Welcomed new creator     │
│   ✓ Approved  Approved by: holden@...                           │
└─────────────────────────────────────────────────────────────────┘
```

### Approval Queue (`/admin/ai-team/approvals`)

Filtered view of pending approval requests with quick approve/reject actions.

---

## Key Functions

### Agent Registry

```typescript
// packages/ai-agents/src/agents/registry.ts

export async function createAgent(params: CreateAgentParams): Promise<AIAgent> {
  const result = await sql`
    INSERT INTO ai_agents (
      tenant_id, name, display_name, email, role, status,
      ai_model, ai_temperature, ai_max_tokens, capabilities, tool_access
    )
    VALUES (
      current_setting('app.tenant_id')::uuid,
      ${params.name},
      ${params.displayName},
      ${params.email},
      ${params.role},
      'active',
      ${params.model || 'claude-sonnet-4-20250514'},
      ${params.temperature || 0.7},
      ${params.maxTokens || 4096},
      ${params.capabilities || ['slack', 'email']},
      ${params.toolAccess || []}
    )
    RETURNING *
  `

  const agent = result.rows[0]

  // Create default personality
  await createDefaultPersonality(agent.id)

  // Create default autonomy settings
  await createDefaultAutonomySettings(agent.id)

  return agent
}

export async function listAgents(): Promise<AIAgent[]> {
  const result = await sql`
    SELECT
      a.*,
      p.trait_formality,
      p.trait_verbosity,
      p.trait_proactivity,
      p.trait_humor,
      p.trait_emoji_usage,
      p.trait_assertiveness,
      (SELECT COUNT(*) FROM agent_action_log WHERE agent_id = a.id AND created_at > now() - INTERVAL '24 hours') as actions_today,
      (SELECT COUNT(*) FROM agent_memories WHERE agent_id = a.id AND is_active = true) as memory_count,
      (SELECT AVG(confidence) FROM agent_memories WHERE agent_id = a.id AND is_active = true) as avg_confidence
    FROM ai_agents a
    LEFT JOIN agent_personality p ON p.agent_id = a.id
    WHERE a.tenant_id = current_setting('app.tenant_id')::uuid
    ORDER BY a.is_primary DESC, a.created_at ASC
  `
  return result.rows
}

export async function getPrimaryAgent(): Promise<AIAgent | null> {
  const result = await sql`
    SELECT * FROM ai_agents
    WHERE tenant_id = current_setting('app.tenant_id')::uuid
      AND is_primary = true
      AND status = 'active'
    LIMIT 1
  `
  return result.rows[0] || null
}
```

### Personality Prompt Builder

```typescript
// packages/ai-agents/src/personality/prompt-builder.ts

const TRAIT_DESCRIPTIONS = {
  formality: {
    low: 'casual and conversational',
    mid: 'professional but approachable',
    high: 'formal and business-like'
  },
  verbosity: {
    low: 'brief and to the point',
    mid: 'balanced detail',
    high: 'thorough and comprehensive'
  },
  proactivity: {
    low: 'responds when asked',
    mid: 'offers suggestions occasionally',
    high: 'proactively suggests improvements'
  },
  humor: {
    low: 'serious and focused',
    mid: 'occasional light touches',
    high: 'playful and witty'
  },
  emoji_usage: {
    low: 'no emojis',
    mid: 'occasional emojis',
    high: 'expressive with emojis'
  },
  assertiveness: {
    low: 'deferential, asks for guidance',
    mid: 'confident but open',
    high: 'direct and decisive'
  }
}

export function buildPersonalityPromptSection(personality: AgentPersonality): string {
  const traits: string[] = []

  for (const [trait, value] of Object.entries(personality)) {
    if (trait.startsWith('trait_')) {
      const name = trait.replace('trait_', '')
      const level = value < 0.33 ? 'low' : value > 0.66 ? 'high' : 'mid'
      traits.push(`- ${TRAIT_DESCRIPTIONS[name][level]}`)
    }
  }

  let section = `## Your Personality\n\n${traits.join('\n')}`

  if (personality.preferred_greeting) {
    section += `\n\nYour preferred greeting: "${personality.preferred_greeting}"`
  }

  if (personality.signature) {
    section += `\nYour signature: "${personality.signature}"`
  }

  if (personality.forbidden_topics?.length > 0) {
    section += `\n\nAvoid discussing: ${personality.forbidden_topics.join(', ')}`
  }

  return section
}
```

### Autonomy Check

```typescript
// packages/ai-agents/src/autonomy/check.ts

export interface AutonomyCheckResult {
  allowed: boolean
  level: 'autonomous' | 'suggest_and_confirm' | 'human_required'
  reason?: string
  requiresApproval: boolean
  approvalId?: string
}

export async function checkAutonomy(
  agentId: string,
  actionType: string,
  context?: { amount?: number }
): Promise<AutonomyCheckResult> {
  // Get agent's autonomy settings
  const settings = await getAutonomySettings(agentId)
  const actionConfig = await getActionAutonomy(agentId, actionType)

  // Check global limits
  if (!actionConfig.enabled) {
    return { allowed: false, level: 'human_required', reason: 'Action disabled', requiresApproval: false }
  }

  // Check rate limits
  const actionsToday = await countActionsToday(agentId, actionType)
  if (actionConfig.max_per_day && actionsToday >= actionConfig.max_per_day) {
    return { allowed: false, level: 'human_required', reason: 'Daily limit reached', requiresApproval: false }
  }

  // Check high-value threshold
  if (context?.amount && context.amount >= settings.require_human_for_high_value) {
    return {
      allowed: false,
      level: 'human_required',
      reason: `Amount exceeds threshold of $${settings.require_human_for_high_value}`,
      requiresApproval: true
    }
  }

  // Return autonomy level
  return {
    allowed: actionConfig.autonomy_level === 'autonomous',
    level: actionConfig.autonomy_level,
    requiresApproval: actionConfig.autonomy_level !== 'autonomous'
  }
}
```

### Action Logger

```typescript
// packages/ai-agents/src/actions/logger.ts

export async function logAction(params: {
  agentId: string
  actionType: string
  actionCategory?: string
  description: string
  inputData?: unknown
  outputData?: unknown
  toolsUsed?: string[]
  creatorId?: string
  projectId?: string
  conversationId?: string
  requiresApproval?: boolean
  success?: boolean
  errorMessage?: string
}): Promise<ActionLogEntry> {
  const result = await sql`
    INSERT INTO agent_action_log (
      tenant_id, agent_id, action_type, action_category, action_description,
      input_data, output_data, tools_used, creator_id, project_id,
      conversation_id, required_approval, approval_status, success, error_message
    )
    VALUES (
      current_setting('app.tenant_id')::uuid,
      ${params.agentId},
      ${params.actionType},
      ${params.actionCategory},
      ${params.description},
      ${JSON.stringify(params.inputData)},
      ${JSON.stringify(params.outputData)},
      ${params.toolsUsed || []},
      ${params.creatorId},
      ${params.projectId},
      ${params.conversationId},
      ${params.requiresApproval || false},
      ${params.requiresApproval ? 'pending' : null},
      ${params.success ?? true},
      ${params.errorMessage}
    )
    RETURNING *
  `

  return result.rows[0]
}
```

---

## Tenant Isolation

All agent data is tenant-scoped:

```typescript
// Always use withTenant wrapper
const agents = await withTenant(tenantId, () => listAgents())

// All queries use tenant context
const result = await sql`
  SELECT * FROM ai_agents
  WHERE tenant_id = current_setting('app.tenant_id')::uuid
`
```

---

## Multi-Tenant Considerations

1. **Agent per Tenant**: Each tenant has their own AI agents
2. **Separate Personality**: Personality fully customizable per tenant
3. **Isolated Actions**: Action logs never cross tenants
4. **Per-Tenant Limits**: Rate limits and autonomy settings per tenant
5. **Separate Integrations**: Each tenant connects their own Slack, email, etc.

---

## Background Jobs

| Job | Purpose | Schedule |
|-----|---------|----------|
| `ai-agents/expire-approvals` | Expire pending approvals after 24h | Hourly |
| `ai-agents/cleanup-old-actions` | Archive old action logs | Daily |
| `ai-agents/sync-agent-stats` | Update agent statistics | Every 15 min |

---

## Deliverables Checklist

- [ ] Database schema for all core tables
- [ ] `@cgk/ai-agents` package with registry, personality, autonomy modules
- [ ] API routes for agent CRUD, personality, autonomy, actions
- [ ] Admin UI: Agent list, configuration, action log, approval queue
- [ ] Background jobs for cleanup and stats
- [ ] Integration tests for tenant isolation
- [ ] Documentation in package README

---

## Tech Debt: Underscore Variables

**IMPORTANT**: Before marking this phase complete, address the underscore-prefixed variables documented in:
`/MULTI-TENANT-PLATFORM-PLAN/UNDERSCORE-VARS-TRACKING.md`

Relevant items for this phase:
- `_agentId` in `src/autonomy/check.ts` - implement actual DB query
- `_humor` in `src/personality/prompt-builder.ts` - use humor trait in greeting

---

## Next Phase

After PHASE-2AI-CORE, proceed to:
- **PHASE-2AI-MEMORY**: RAG, embeddings, and learning system
- **PHASE-2AI-VOICE**: Voice capabilities (TTS/STT)
- **PHASE-2AI-INTEGRATIONS**: Slack, Calendar, Email integrations
