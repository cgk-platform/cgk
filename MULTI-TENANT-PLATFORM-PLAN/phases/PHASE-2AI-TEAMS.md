# PHASE-2AI-TEAMS: Multi-Agent Teams & Org Chart

> **Goal**: Implement multi-agent teams, human-AI org chart, relationships, and agent-to-agent communication
> **Duration**: 1 week
> **Dependencies**: PHASE-2AI-CORE (agent registry), PHASE-2E-TEAM-MANAGEMENT (human teams)
> **Parallelizable**: Yes (can run after PHASE-2AI-CORE)

---

## Success Criteria

- [ ] AI teams with multiple agents
- [ ] Unified org chart (humans + AI agents)
- [ ] Agent-to-agent relationships and handoffs
- [ ] Familiarity scoring between agents and people
- [ ] Agent-to-agent messaging (Slack inter-agent)
- [ ] Team-based task routing
- [ ] Admin UI for org chart and team management

---

## Architecture Overview

The teams system provides:

1. **AI Teams**: Group agents by function (e.g., Creator Ops, Support)
2. **Unified Org Chart**: Visual hierarchy of humans and AI agents
3. **Relationships**: Track familiarity and trust between entities
4. **Task Routing**: Route work to appropriate agent based on expertise
5. **Handoffs**: Clean transfer of conversations between agents

---

## Database Schema

### AI Teams

```sql
-- AI teams (groups of agents)
CREATE TABLE ai_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Team identity
  name TEXT NOT NULL,
  description TEXT,
  domain TEXT,                           -- What area this team handles

  -- Slack integration
  slack_channel_id TEXT,
  slack_channel_name TEXT,

  -- Leadership
  supervisor_type TEXT,                  -- 'ai' or 'human'
  supervisor_id TEXT,                    -- Agent ID or user ID
  supervisor_slack_id TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_ai_teams_tenant ON ai_teams(tenant_id);
```

### Team Membership

```sql
-- Team roster
CREATE TABLE ai_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES ai_teams(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Role in team
  role TEXT NOT NULL DEFAULT 'member',   -- lead, member, specialist
  slack_user_id TEXT,                    -- Agent's Slack bot user ID

  -- Specializations
  specializations TEXT[] DEFAULT ARRAY[]::TEXT[],

  joined_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(team_id, agent_id)
);

CREATE INDEX idx_team_members_team ON ai_team_members(team_id);
CREATE INDEX idx_team_members_agent ON ai_team_members(agent_id);
```

### Unified Org Chart

```sql
-- Combined org chart (humans + AI)
CREATE TABLE org_chart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Entity reference
  employee_type TEXT NOT NULL,           -- 'ai' or 'human'
  employee_id TEXT NOT NULL,             -- Agent ID or user ID

  -- Reporting relationship
  reports_to_type TEXT,                  -- 'ai' or 'human'
  reports_to_id TEXT,                    -- Manager's ID

  -- Organizational info
  level INTEGER DEFAULT 0,               -- Depth in hierarchy (0 = top)
  department TEXT,
  team TEXT,

  -- Display
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, employee_type, employee_id)
);

CREATE INDEX idx_org_chart_tenant ON org_chart(tenant_id);
CREATE INDEX idx_org_chart_reports_to ON org_chart(tenant_id, reports_to_type, reports_to_id);
```

### Agent Relationships

```sql
-- Familiarity between agents and people
CREATE TABLE agent_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Who the relationship is with
  person_type TEXT NOT NULL,             -- 'team_member', 'creator', 'contact'
  person_id TEXT NOT NULL,

  -- Relationship metrics
  familiarity_score DECIMAL(3,2) DEFAULT 0.0,  -- 0 to 1
  trust_level DECIMAL(3,2) DEFAULT 0.5,        -- 0 to 1
  interaction_count INTEGER DEFAULT 0,
  total_conversation_minutes INTEGER DEFAULT 0,

  -- Context
  last_interaction_at TIMESTAMPTZ,
  communication_preferences JSONB DEFAULT '{}',
  /*
  {
    "preferred_channel": "slack",
    "response_style": "concise",
    "topics_discussed": ["projects", "deadlines"]
  }
  */
  relationship_summary TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(agent_id, person_type, person_id)
);

CREATE INDEX idx_relationships_agent ON agent_relationships(agent_id);
CREATE INDEX idx_relationships_person ON agent_relationships(tenant_id, person_type, person_id);
```

### Agent-to-Agent Communication

```sql
-- Inter-agent Slack messages
CREATE TABLE agent_slack_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Slack identifiers
  slack_message_ts TEXT NOT NULL,
  slack_channel_id TEXT NOT NULL,

  -- Sender/Receiver
  from_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  to_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,  -- NULL = broadcast

  -- Message details
  message_type TEXT NOT NULL,            -- status, question, handoff, task, response
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}',            -- Additional context

  -- For handoffs
  handoff_conversation_id TEXT,
  handoff_accepted BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_messages_tenant ON agent_slack_messages(tenant_id);
CREATE INDEX idx_agent_messages_from ON agent_slack_messages(from_agent_id);
CREATE INDEX idx_agent_messages_to ON agent_slack_messages(to_agent_id);
```

### Handoffs

```sql
-- Conversation handoffs between agents
CREATE TABLE agent_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Participants
  from_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  to_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Conversation context
  conversation_id TEXT NOT NULL,
  channel TEXT NOT NULL,                 -- slack, email, sms
  channel_id TEXT,                       -- Slack channel, email thread, etc.

  -- Reason and context
  reason TEXT NOT NULL,
  context_summary TEXT,
  key_points JSONB DEFAULT '[]',

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, completed
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_handoffs_tenant ON agent_handoffs(tenant_id);
CREATE INDEX idx_handoffs_from ON agent_handoffs(from_agent_id);
CREATE INDEX idx_handoffs_to ON agent_handoffs(to_agent_id);
```

---

## Package Structure

```
packages/ai-agents/
├── src/
│   ├── teams/
│   │   ├── index.ts             # Public exports
│   │   ├── registry.ts          # Team CRUD
│   │   ├── members.ts           # Team membership
│   │   └── routing.ts           # Task routing logic
│   │
│   ├── org-chart/
│   │   ├── builder.ts           # Build org chart structure
│   │   ├── sync.ts              # Sync with team_members
│   │   └── renderer.ts          # Generate visual representation
│   │
│   ├── relationships/
│   │   ├── tracker.ts           # Track interactions
│   │   ├── familiarity.ts       # Calculate familiarity scores
│   │   └── preferences.ts       # Communication preferences
│   │
│   └── handoffs/
│       ├── initiate.ts          # Start a handoff
│       ├── accept.ts            # Accept/decline handoffs
│       └── context.ts           # Build handoff context
```

---

## Team Operations

### Create Team

```typescript
// packages/ai-agents/src/teams/registry.ts

export async function createTeam(params: CreateTeamParams): Promise<AITeam> {
  const result = await sql`
    INSERT INTO ai_teams (
      tenant_id, name, description, domain,
      slack_channel_id, slack_channel_name,
      supervisor_type, supervisor_id
    )
    VALUES (
      current_setting('app.tenant_id')::uuid,
      ${params.name},
      ${params.description},
      ${params.domain},
      ${params.slackChannelId},
      ${params.slackChannelName},
      ${params.supervisorType},
      ${params.supervisorId}
    )
    RETURNING *
  `

  return result.rows[0]
}

export async function addTeamMember(params: {
  teamId: string
  agentId: string
  role: 'lead' | 'member' | 'specialist'
  specializations?: string[]
}): Promise<TeamMember> {
  // Get agent's Slack user ID
  const agent = await getAgent(params.agentId)
  const slackApp = await getAgentSlackApp(params.agentId)

  const result = await sql`
    INSERT INTO ai_team_members (
      tenant_id, team_id, agent_id, role, specializations, slack_user_id
    )
    VALUES (
      current_setting('app.tenant_id')::uuid,
      ${params.teamId},
      ${params.agentId},
      ${params.role},
      ${params.specializations || []},
      ${slackApp?.slack_bot_user_id}
    )
    RETURNING *
  `

  return result.rows[0]
}
```

### Task Routing

```typescript
// packages/ai-agents/src/teams/routing.ts

export async function routeToAgent(params: {
  tenantId: string
  message: string
  channel: string
  context?: Record<string, unknown>
}): Promise<{ agentId: string; reason: string }> {
  // Get all active agents with their specializations
  const agents = await listAgentsWithSpecializations(params.tenantId)

  // If only one agent, route to them
  if (agents.length === 1) {
    return { agentId: agents[0].id, reason: 'Only available agent' }
  }

  // Check for explicit mentions
  const mentionedAgent = extractAgentMention(params.message, agents)
  if (mentionedAgent) {
    return { agentId: mentionedAgent.id, reason: 'Explicitly mentioned' }
  }

  // Route based on channel configuration
  const channelAgent = await getAgentForChannel(params.tenantId, params.channel)
  if (channelAgent) {
    return { agentId: channelAgent.id, reason: 'Channel default agent' }
  }

  // Route based on topic/specialization
  const topicMatch = await matchAgentByTopic(params.message, agents)
  if (topicMatch) {
    return { agentId: topicMatch.agentId, reason: `Specializes in: ${topicMatch.topic}` }
  }

  // Fall back to primary agent
  const primary = agents.find(a => a.is_primary) || agents[0]
  return { agentId: primary.id, reason: 'Primary agent fallback' }
}

async function matchAgentByTopic(
  message: string,
  agents: Agent[]
): Promise<{ agentId: string; topic: string } | null> {
  // Build embedding for message
  const messageEmbedding = await generateEmbedding(message)

  // Find agent with most relevant specialization
  let bestMatch: { agentId: string; topic: string; score: number } | null = null

  for (const agent of agents) {
    const teamMemberships = await getAgentTeamMemberships(agent.id)

    for (const membership of teamMemberships) {
      for (const specialization of membership.specializations) {
        // Check if specialization is relevant
        const specEmbedding = await getCachedEmbedding(`spec:${specialization}`)
        const score = cosineSimilarity(messageEmbedding, specEmbedding)

        if (score > 0.7 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { agentId: agent.id, topic: specialization, score }
        }
      }
    }
  }

  return bestMatch
}
```

---

## Org Chart

### Build Org Chart

```typescript
// packages/ai-agents/src/org-chart/builder.ts

export interface OrgChartNode {
  id: string
  type: 'ai' | 'human'
  name: string
  title: string
  avatarUrl?: string
  department?: string
  level: number
  children: OrgChartNode[]
}

export async function buildOrgChart(tenantId: string): Promise<OrgChartNode[]> {
  // Get all org chart entries
  const entries = await sql`
    SELECT
      oc.*,
      CASE
        WHEN oc.employee_type = 'ai' THEN a.display_name
        ELSE tm.name
      END as name,
      CASE
        WHEN oc.employee_type = 'ai' THEN a.role
        ELSE tm.title
      END as title,
      CASE
        WHEN oc.employee_type = 'ai' THEN a.avatar_url
        ELSE tm.avatar_url
      END as avatar_url
    FROM org_chart oc
    LEFT JOIN ai_agents a ON oc.employee_type = 'ai' AND oc.employee_id = a.id::text
    LEFT JOIN team_members tm ON oc.employee_type = 'human' AND oc.employee_id = tm.user_id
    WHERE oc.tenant_id = ${tenantId}
    ORDER BY oc.level, oc.display_order
  `

  // Build tree structure
  const nodeMap = new Map<string, OrgChartNode>()
  const roots: OrgChartNode[] = []

  for (const entry of entries.rows) {
    const node: OrgChartNode = {
      id: `${entry.employee_type}:${entry.employee_id}`,
      type: entry.employee_type,
      name: entry.name,
      title: entry.title,
      avatarUrl: entry.avatar_url,
      department: entry.department,
      level: entry.level,
      children: []
    }
    nodeMap.set(node.id, node)

    if (entry.reports_to_id) {
      const parentId = `${entry.reports_to_type}:${entry.reports_to_id}`
      const parent = nodeMap.get(parentId)
      if (parent) {
        parent.children.push(node)
      }
    } else {
      roots.push(node)
    }
  }

  return roots
}
```

### Sync Org Chart

```typescript
// packages/ai-agents/src/org-chart/sync.ts

export async function syncOrgChart(tenantId: string): Promise<void> {
  // Sync human employees from team_members
  const humans = await sql`
    SELECT user_id, name, title, manager_id, department
    FROM team_members
    WHERE tenant_id = ${tenantId}
  `

  for (const human of humans.rows) {
    await sql`
      INSERT INTO org_chart (
        tenant_id, employee_type, employee_id,
        reports_to_type, reports_to_id, department
      )
      VALUES (
        ${tenantId}, 'human', ${human.user_id},
        ${human.manager_id ? 'human' : null},
        ${human.manager_id},
        ${human.department}
      )
      ON CONFLICT (tenant_id, employee_type, employee_id)
      DO UPDATE SET
        reports_to_type = EXCLUDED.reports_to_type,
        reports_to_id = EXCLUDED.reports_to_id,
        department = EXCLUDED.department,
        updated_at = now()
    `
  }

  // Sync AI agents
  const agents = await sql`
    SELECT
      a.id, a.display_name, a.role,
      a.manager_agent_id, a.human_manager_id
    FROM ai_agents a
    WHERE a.tenant_id = ${tenantId} AND a.status = 'active'
  `

  for (const agent of agents.rows) {
    const reportsToType = agent.manager_agent_id ? 'ai' :
                          agent.human_manager_id ? 'human' : null
    const reportsToId = agent.manager_agent_id || agent.human_manager_id

    await sql`
      INSERT INTO org_chart (
        tenant_id, employee_type, employee_id,
        reports_to_type, reports_to_id
      )
      VALUES (
        ${tenantId}, 'ai', ${agent.id},
        ${reportsToType}, ${reportsToId}
      )
      ON CONFLICT (tenant_id, employee_type, employee_id)
      DO UPDATE SET
        reports_to_type = EXCLUDED.reports_to_type,
        reports_to_id = EXCLUDED.reports_to_id,
        updated_at = now()
    `
  }

  // Calculate levels
  await calculateOrgLevels(tenantId)
}

async function calculateOrgLevels(tenantId: string): Promise<void> {
  // Set roots to level 0
  await sql`
    UPDATE org_chart
    SET level = 0
    WHERE tenant_id = ${tenantId} AND reports_to_id IS NULL
  `

  // Recursively set levels
  for (let level = 1; level <= 10; level++) {
    const updated = await sql`
      UPDATE org_chart oc
      SET level = ${level}
      FROM org_chart parent
      WHERE oc.tenant_id = ${tenantId}
        AND oc.reports_to_id = parent.employee_id
        AND oc.reports_to_type = parent.employee_type
        AND parent.level = ${level - 1}
        AND oc.level IS DISTINCT FROM ${level}
    `
    if (updated.rowCount === 0) break
  }
}
```

---

## Relationships

### Track Interaction

```typescript
// packages/ai-agents/src/relationships/tracker.ts

export async function recordInteraction(params: {
  agentId: string
  personType: 'team_member' | 'creator' | 'contact'
  personId: string
  durationMinutes?: number
  channel?: string
}): Promise<void> {
  // Upsert relationship
  await sql`
    INSERT INTO agent_relationships (
      tenant_id, agent_id, person_type, person_id,
      interaction_count, total_conversation_minutes, last_interaction_at
    )
    VALUES (
      current_setting('app.tenant_id')::uuid,
      ${params.agentId},
      ${params.personType},
      ${params.personId},
      1,
      ${params.durationMinutes || 0},
      now()
    )
    ON CONFLICT (agent_id, person_type, person_id)
    DO UPDATE SET
      interaction_count = agent_relationships.interaction_count + 1,
      total_conversation_minutes = agent_relationships.total_conversation_minutes + ${params.durationMinutes || 0},
      last_interaction_at = now(),
      updated_at = now()
  `

  // Recalculate familiarity
  await updateFamiliarity(params.agentId, params.personType, params.personId)
}

async function updateFamiliarity(
  agentId: string,
  personType: string,
  personId: string
): Promise<void> {
  // Familiarity based on:
  // - Number of interactions (log scale)
  // - Total time spent (log scale)
  // - Recency (decay over time)
  await sql`
    UPDATE agent_relationships
    SET familiarity_score = LEAST(1.0,
      -- Base from interaction count (max 0.4)
      LEAST(0.4, LOG(interaction_count + 1) / 4) +
      -- Bonus from conversation time (max 0.3)
      LEAST(0.3, LOG(total_conversation_minutes + 1) / 5) +
      -- Recency bonus (max 0.3, decays over 30 days)
      GREATEST(0, 0.3 * (1 - EXTRACT(EPOCH FROM (now() - last_interaction_at)) / (30 * 24 * 60 * 60)))
    )
    WHERE agent_id = ${agentId}
      AND person_type = ${personType}
      AND person_id = ${personId}
  `
}
```

---

## Handoffs

### Initiate Handoff

```typescript
// packages/ai-agents/src/handoffs/initiate.ts

export async function initiateHandoff(params: {
  fromAgentId: string
  toAgentId: string
  conversationId: string
  channel: string
  channelId?: string
  reason: string
  contextSummary?: string
}): Promise<Handoff> {
  // Build context from conversation
  const keyPoints = await extractKeyPoints(params.conversationId)

  // Create handoff record
  const handoff = await sql`
    INSERT INTO agent_handoffs (
      tenant_id, from_agent_id, to_agent_id,
      conversation_id, channel, channel_id,
      reason, context_summary, key_points
    )
    VALUES (
      current_setting('app.tenant_id')::uuid,
      ${params.fromAgentId},
      ${params.toAgentId},
      ${params.conversationId},
      ${params.channel},
      ${params.channelId},
      ${params.reason},
      ${params.contextSummary},
      ${JSON.stringify(keyPoints)}
    )
    RETURNING *
  `

  const handoffRecord = handoff.rows[0]

  // Notify receiving agent
  await notifyHandoff(handoffRecord)

  // Log action
  await logAgentAction({
    tenantId: handoffRecord.tenant_id,
    agentId: params.fromAgentId,
    actionType: 'initiate_handoff',
    description: `Handed off conversation to ${await getAgentName(params.toAgentId)}`,
    inputData: { reason: params.reason },
    outputData: { handoffId: handoffRecord.id }
  })

  return handoffRecord
}

async function notifyHandoff(handoff: Handoff): Promise<void> {
  const fromAgent = await getAgent(handoff.from_agent_id)
  const toAgent = await getAgent(handoff.to_agent_id)

  // Send Slack message to receiving agent
  const toAgentSlack = await getAgentSlackApp(handoff.to_agent_id)
  if (toAgentSlack) {
    await sendAgentMessage({
      fromAgentId: handoff.from_agent_id,
      toAgentId: handoff.to_agent_id,
      messageType: 'handoff',
      content: `Handoff from ${fromAgent.display_name}: ${handoff.reason}`,
      context: {
        handoffId: handoff.id,
        conversationId: handoff.conversation_id,
        keyPoints: handoff.key_points
      }
    })
  }
}
```

### Accept Handoff

```typescript
// packages/ai-agents/src/handoffs/accept.ts

export async function acceptHandoff(
  handoffId: string,
  agentId: string
): Promise<void> {
  const handoff = await getHandoff(handoffId)

  if (handoff.to_agent_id !== agentId) {
    throw new Error('Only the receiving agent can accept this handoff')
  }

  await sql`
    UPDATE agent_handoffs
    SET status = 'accepted', accepted_at = now()
    WHERE id = ${handoffId}
  `

  // Build context for receiving agent
  const context = await buildHandoffContext(handoff)

  // Notify the conversation that the agent has changed
  if (handoff.channel === 'slack' && handoff.channel_id) {
    await sendSlackMessage(handoff.tenant_id, {
      channel: handoff.channel_id,
      text: `*${(await getAgent(agentId)).display_name}* has taken over this conversation.`,
      thread_ts: handoff.conversation_id
    })
  }

  // Log action
  await logAgentAction({
    tenantId: handoff.tenant_id,
    agentId,
    actionType: 'accept_handoff',
    description: `Accepted handoff from ${(await getAgent(handoff.from_agent_id)).display_name}`,
    inputData: { handoffId }
  })
}
```

---

## API Endpoints

### Teams

```typescript
// GET /api/admin/ai-teams
// List AI teams

// POST /api/admin/ai-teams
// Create team

// GET /api/admin/ai-teams/[teamId]
// Get team details with members

// POST /api/admin/ai-teams/[teamId]/members
// Add agent to team

// DELETE /api/admin/ai-teams/[teamId]/members/[agentId]
// Remove agent from team
```

### Org Chart

```typescript
// GET /api/admin/org-chart
// Get full org chart
export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)
  await requirePermission(req, 'team.view')

  const chart = await withTenant(tenantId, () => buildOrgChart(tenantId))
  return Response.json({ chart })
}

// POST /api/admin/org-chart/sync
// Sync org chart with team_members and ai_agents
```

### Relationships

```typescript
// GET /api/admin/ai-agents/[agentId]/relationships
// List agent relationships

// GET /api/admin/ai-agents/[agentId]/relationships/[personType]/[personId]
// Get specific relationship details
```

### Handoffs

```typescript
// GET /api/admin/ai-agents/handoffs
// List all handoffs

// POST /api/admin/ai-agents/[agentId]/handoffs
// Initiate handoff from agent

// POST /api/admin/ai-agents/handoffs/[handoffId]/accept
// Accept handoff

// POST /api/admin/ai-agents/handoffs/[handoffId]/decline
// Decline handoff
```

---

## Admin UI Pages

### Org Chart (`/admin/org-chart`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Organization Chart                             [Sync] [Expand] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                        ┌─────────────┐                          │
│                        │   Holden    │                          │
│                        │    CEO      │                          │
│                        └──────┬──────┘                          │
│                               │                                  │
│               ┌───────────────┼───────────────┐                  │
│               │               │               │                  │
│        ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐          │
│        │   Sarah     │ │   🤖 Bri    │ │    Mike     │          │
│        │  Marketing  │ │  Creator Ops│ │   Finance   │          │
│        └─────────────┘ └──────┬──────┘ └─────────────┘          │
│                               │                                  │
│                        ┌──────┴──────┐                          │
│                        │ 🤖 Support  │                          │
│                        │    Bot      │                          │
│                        └─────────────┘                          │
│                                                                  │
│ Legend: 🤖 AI Agent   👤 Human                                  │
└─────────────────────────────────────────────────────────────────┘
```

### AI Teams (`/admin/ai-team/teams`)

```
┌─────────────────────────────────────────────────────────────────┐
│ AI Teams                                          [+ New Team]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ CREATOR OPS                                                │   │
│ │ Handles creator communications, projects, and payments    │   │
│ │                                                            │   │
│ │ Members:                                                   │   │
│ │ • 🤖 Bri Wilder (Lead)                                    │   │
│ │ • 🤖 Support Bot (Member)                                 │   │
│ │                                                            │   │
│ │ Supervisor: Holden (Human)                                 │   │
│ │ Slack: #creator-ops                                        │   │
│ │                                                            │   │
│ │ [Configure] [View Activity]                                │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ CUSTOMER SUPPORT                                           │   │
│ │ Handles customer inquiries and issues                      │   │
│ │                                                            │   │
│ │ Members:                                                   │   │
│ │ • 🤖 Support Bot (Lead)                                   │   │
│ │                                                            │   │
│ │ Supervisor: Sarah (Human)                                  │   │
│ │ Slack: #support                                            │   │
│ │                                                            │   │
│ │ [Configure] [View Activity]                                │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Relationship Explorer (`/admin/ai-team/[agentId]/relationships`)

Shows familiarity scores and interaction history with team members and creators.

---

## Background Jobs

| Job | Purpose | Schedule |
|-----|---------|----------|
| `ai-agents/sync-org-chart` | Sync org chart with team changes | Hourly |
| `ai-agents/decay-familiarity` | Apply time decay to familiarity scores | Daily |
| `ai-agents/cleanup-old-handoffs` | Archive completed handoffs | Weekly |

---

## Deliverables Checklist

- [ ] Database schema for teams, org chart, relationships, handoffs
- [ ] Team CRUD operations
- [ ] Org chart builder and sync
- [ ] Task routing based on specialization
- [ ] Relationship tracking and familiarity scoring
- [ ] Handoff initiation and acceptance
- [ ] Agent-to-agent messaging
- [ ] Org chart visualization UI
- [ ] Teams management UI
- [ ] Integration tests

---

## Multi-Tenant Considerations

1. **Isolated Teams**: Each tenant has their own teams
2. **Separate Org Charts**: Org charts are per-tenant
3. **Relationships within Tenant**: No cross-tenant relationships
4. **Handoffs within Tenant**: Handoffs only between agents in same tenant

---

## Integration with Phase 2E

This phase integrates with PHASE-2E-TEAM-MANAGEMENT:
- Human team members from `team_members` table appear in org chart
- Team reporting structure flows into unified org chart
- Human managers can supervise AI agents
