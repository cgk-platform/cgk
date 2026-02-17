# @cgk-platform/ai-agents

AI Agent system (BRII) for the CGK platform with personality, autonomy, memory, RAG, and multi-channel integrations.

## Installation

```bash
pnpm add @cgk-platform/ai-agents
```

## Features

- **Agent Management** - Create, configure, and manage AI agents
- **Personality System** - 6 configurable personality traits
- **Autonomy Levels** - 3 levels with approval workflows
- **Action Logging** - Complete audit trail of agent actions
- **Memory System** - Vector embeddings and semantic search
- **RAG** - Retrieval Augmented Generation for context injection
- **Learning** - Training, corrections, feedback processing
- **Voice Capabilities** - TTS, STT, and voice calls
- **Multi-Agent Teams** - Team coordination and task routing
- **Org Chart** - Hierarchical agent organization
- **Multi-Channel** - Slack, email, SMS, Google Calendar integration

## Quick Start

### Create an Agent

```typescript
import { createAgent } from '@cgk-platform/ai-agents'

const agent = await createAgent({
  tenantId: 'tenant_123',
  name: 'BRII',
  description: 'Customer service AI agent',
  isPrimary: true,
  status: 'active',
})
```

### Check Autonomy

```typescript
import { checkAutonomy } from '@cgk-platform/ai-agents'

const result = await checkAutonomy({
  agentId: agent.id,
  tenantId: 'tenant_123',
  actionCategory: 'send_email',
  context: {
    risk: 'medium',
    recipient: 'customer@example.com',
  },
})

if (result.allowed) {
  // Execute action
} else {
  // Request approval
}
```

### Log Actions

```typescript
import { logAction, logSuccess, logFailure } from '@cgk-platform/ai-agents'

const actionLog = await logAction({
  agentId: agent.id,
  tenantId: 'tenant_123',
  category: 'send_email',
  description: 'Sent order confirmation',
  payload: { orderId: 'order_456' },
})

await logSuccess(actionLog.id, { emailId: 'email_789' })
// or
await logFailure(actionLog.id, 'Email service unavailable')
```

### Memory & RAG

```typescript
import {
  createMemory,
  searchMemories,
  buildMemoryContext,
} from '@cgk-platform/ai-agents'

// Store a memory
await createMemory({
  agentId: agent.id,
  tenantId: 'tenant_123',
  type: 'fact',
  content: 'Customer prefers SMS for order updates',
  subject: 'customer_preferences',
  source: 'conversation',
})

// Search memories
const memories = await searchMemories({
  agentId: agent.id,
  tenantId: 'tenant_123',
  query: 'customer communication preferences',
  limit: 5,
})

// Build RAG context
const context = await buildMemoryContext({
  agentId: agent.id,
  tenantId: 'tenant_123',
  query: 'How should I contact this customer?',
  maxTokens: 2000,
})
```

### Teams & Routing

```typescript
import {
  createTeam,
  addTeamMember,
  routeToAgent,
} from '@cgk-platform/ai-agents'

// Create a team
const team = await createTeam({
  tenantId: 'tenant_123',
  name: 'Customer Support',
  domain: 'support',
})

// Add member
await addTeamMember({
  teamId: team.id,
  agentId: agent.id,
  role: 'member',
  specializations: ['order_issues', 'returns'],
})

// Route task to best agent
const routing = await routeToAgent({
  tenantId: 'tenant_123',
  task: 'Customer wants to return an item',
  context: { channel: 'slack' },
})
```

## Key Exports

### Agent Registry
- `createAgent()`, `updateAgent()`, `getAgent()`, `listAgents()`
- `getPrimaryAgent()`, `setAsPrimaryAgent()`, `retireAgent()`

### Personality
- `buildPersonalityPromptSection()` - Generate personality prompt
- `generatePersonalityPreview()` - Preview personality traits
- `getTraitDescription()` - Get trait description

### Autonomy
- `checkAutonomy()` - Check if action is allowed
- `checkAutonomyWithApproval()` - Check with approval fallback
- `wouldRequireApproval()` - Check without executing

### Actions
- `logAction()`, `logSuccess()`, `logFailure()`
- `getAction()`, `listActions()`, `getAgentActions()`
- `getPendingActions()`, `approveAction()`, `rejectAction()`

### Memory
- `createMemory()`, `updateMemory()`, `deleteMemory()`
- `searchMemories()`, `searchMemoriesByText()`
- `consolidateMemories()`, `findSimilarMemories()`

### RAG
- `buildMemoryContext()` - Build context for prompt injection
- `buildQuickContext()` - Fast context for simple queries
- `buildSubjectContext()` - Context for specific subject

### Learning
- `submitFeedback()`, `processFeedback()`
- `detectCorrection()`, `createFailureLearning()`
- `startTrainingSession()`, `addTrainingMemory()`
- `createPattern()`, `recordPatternUsage()`

### Voice
- Voice capabilities exported from `./voice/index.js`

### Teams
- `createTeam()`, `updateTeam()`, `listTeams()`
- `addTeamMember()`, `removeMember()`, `listTeamMembers()`
- `routeToAgent()`, `matchAgentByTopic()`, `getRoutingSuggestions()`

### Org Chart
- `buildOrgChart()`, `renderOrgChartAsText()`
- `addAgentToOrgChart()`, `updateReportingRelationship()`
- `syncOrgChart()`, `validateOrgChart()`

### Relationships
- `ensureRelationship()`, `getAgentRelationship()`
- `recordInteraction()`, `adjustTrustLevel()`
- `updateRelationship()`, `listRelationships()`

### Handoffs
- `initiateHandoff()`, `acceptHandoff()`, `declineHandoff()`
- `completeHandoff()`, `getPendingHandoffs()`
- `buildHandoffContext()`, `suggestHandoffAgents()`

### Integrations
- Multi-channel integrations exported from `./integrations/index.js`

## License

MIT
