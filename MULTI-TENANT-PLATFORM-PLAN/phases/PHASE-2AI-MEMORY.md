# PHASE-2AI-MEMORY: AI Memory & RAG System

> **Goal**: Implement persistent memory, vector embeddings, semantic search, and learning system for AI agents
> **Duration**: 1.5 weeks
> **Dependencies**: PHASE-2AI-CORE (agent registry), PHASE-1B-DATABASE (pgvector extension)
> **Parallelizable**: Yes (can run alongside PHASE-2AI-VOICE after core is complete)

---

## Success Criteria

- [ ] pgvector extension enabled for embedding storage
- [ ] Agent memories table with 3072-dimension embeddings
- [ ] Memory types: team_member, creator, project_pattern, policy, preference
- [ ] Semantic search with cosine similarity
- [ ] Confidence scoring with decay over time
- [ ] Training sessions for explicit knowledge import
- [ ] Failure learnings for correction detection
- [ ] Memory consolidation and cleanup jobs
- [ ] Admin UI for memory management and training

---

## Architecture Overview

The memory system provides:

1. **Persistent Memory**: Long-term storage of agent learnings
2. **Vector Embeddings**: Semantic representation for similarity search
3. **RAG (Retrieval Augmented Generation)**: Context injection into prompts
4. **Confidence Scoring**: Decay and reinforcement of memories
5. **Training Interface**: Explicit knowledge import
6. **Correction Detection**: Learn from mistakes automatically

---

## Database Schema

### Enable pgvector

```sql
-- Enable vector extension (run once per database)
CREATE EXTENSION IF NOT EXISTS vector;
```

### Agent Memories

```sql
-- Long-term agent memories with vector embeddings
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Memory classification
  memory_type TEXT NOT NULL,              -- team_member, creator, project_pattern, policy, preference, procedure, fact
  subject_type TEXT,                      -- What entity this is about (creator, team_member, project, etc.)
  subject_id TEXT,                        -- ID of that entity

  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,                  -- Full text of the memory

  -- Confidence scoring
  confidence DECIMAL(3,2) DEFAULT 0.5,    -- 0.0 to 1.0
  importance DECIMAL(3,2) DEFAULT 0.5,    -- Used for retrieval ranking

  -- Vector embedding (3072 dimensions for text-embedding-3-large)
  embedding vector(3072),

  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  times_reinforced INTEGER DEFAULT 0,
  times_contradicted INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Source tracking
  source TEXT NOT NULL,                   -- observed, told, inferred, corrected, trained, imported
  source_context TEXT,                    -- Additional context about source
  source_conversation_id TEXT,

  -- Lifecycle
  is_active BOOLEAN DEFAULT true,
  superseded_by UUID REFERENCES agent_memories(id),
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_memories_tenant ON agent_memories(tenant_id);
CREATE INDEX idx_memories_agent ON agent_memories(agent_id);
CREATE INDEX idx_memories_type ON agent_memories(tenant_id, memory_type);
CREATE INDEX idx_memories_subject ON agent_memories(tenant_id, subject_type, subject_id);
CREATE INDEX idx_memories_active ON agent_memories(agent_id, is_active) WHERE is_active = true;

-- HNSW index for vector similarity search (fast approximate nearest neighbor)
CREATE INDEX idx_memories_embedding ON agent_memories
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### Training Sessions

```sql
-- Explicit training sessions for knowledge import
CREATE TABLE agent_training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Training details
  training_type TEXT NOT NULL,            -- correction, new_knowledge, personality, procedure, policy, feedback, example
  title TEXT NOT NULL,
  instruction TEXT NOT NULL,              -- What to learn
  context TEXT,                           -- Additional context
  examples JSONB DEFAULT '[]',            -- Array of {input, output} pairs

  -- Result
  memories_created UUID[] DEFAULT ARRAY[]::UUID[],
  acknowledged BOOLEAN DEFAULT false,
  agent_response TEXT,                    -- Agent's acknowledgment response

  -- Trainer info
  trainer_user_id TEXT,
  trainer_name TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_training_tenant ON agent_training_sessions(tenant_id);
CREATE INDEX idx_training_agent ON agent_training_sessions(agent_id);
CREATE INDEX idx_training_type ON agent_training_sessions(tenant_id, training_type);
```

### Failure Learnings

```sql
-- Learning from mistakes and corrections
CREATE TABLE agent_failure_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Failure classification
  failure_type TEXT NOT NULL,             -- wrong_answer, misunderstood, wrong_action, over_escalated, under_escalated, poor_timing, tone_mismatch

  -- Context
  conversation_id TEXT,
  trigger_message TEXT,                   -- What user said
  agent_response TEXT,                    -- What agent did wrong

  -- Learning
  what_went_wrong TEXT NOT NULL,
  correct_approach TEXT NOT NULL,
  pattern_to_avoid TEXT,

  -- Scoring
  confidence DECIMAL(3,2) DEFAULT 0.7,
  source TEXT NOT NULL,                   -- correction, negative_reaction, escalation, self_detected

  -- Attribution
  corrected_by TEXT,                      -- User ID
  acknowledged BOOLEAN DEFAULT false,
  applied_to_behavior BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_failures_tenant ON agent_failure_learnings(tenant_id);
CREATE INDEX idx_failures_agent ON agent_failure_learnings(agent_id);
CREATE INDEX idx_failures_type ON agent_failure_learnings(tenant_id, failure_type);
```

### Feedback System

```sql
-- User feedback on agent responses
CREATE TABLE agent_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Feedback details
  message_id TEXT,                        -- Slack/channel message ID
  conversation_id TEXT,
  feedback_type TEXT NOT NULL,            -- positive, negative, correction
  rating INTEGER,                         -- 1-5 scale

  -- Content
  original_response TEXT,
  reason TEXT,                            -- Why feedback was given
  correction TEXT,                        -- What should have been said

  -- Attribution
  user_id TEXT NOT NULL,
  user_name TEXT,

  -- Processing
  processed BOOLEAN DEFAULT false,
  learning_created UUID REFERENCES agent_failure_learnings(id),

  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_feedback_tenant ON agent_feedback(tenant_id);
CREATE INDEX idx_feedback_agent ON agent_feedback(agent_id);
CREATE INDEX idx_feedback_type ON agent_feedback(tenant_id, feedback_type);
CREATE INDEX idx_feedback_unprocessed ON agent_feedback(tenant_id) WHERE processed = false;
```

### Pattern Tracking

```sql
-- Successful patterns to replicate
CREATE TABLE agent_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Pattern content
  query_pattern TEXT NOT NULL,            -- Example input that worked
  response_pattern TEXT NOT NULL,         -- Successful response
  tools_used TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Performance
  times_used INTEGER DEFAULT 1,
  success_rate DECIMAL(3,2) DEFAULT 1.0,
  avg_feedback_score DECIMAL(3,2),

  -- Metadata
  feedback_id UUID,
  category TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_patterns_tenant ON agent_patterns(tenant_id);
CREATE INDEX idx_patterns_agent ON agent_patterns(agent_id);
```

---

## Package Structure

```
packages/ai-agents/
├── src/
│   ├── memory/
│   │   ├── storage.ts           # CRUD for memories
│   │   ├── embeddings.ts        # Generate embeddings via API
│   │   ├── retrieval.ts         # RAG retrieval functions
│   │   ├── confidence.ts        # Confidence scoring and decay
│   │   └── consolidation.ts     # Merge similar memories
│   │
│   ├── learning/
│   │   ├── trainer.ts           # Training session handling
│   │   ├── correction-detector.ts # Auto-detect corrections
│   │   ├── feedback.ts          # Feedback processing
│   │   └── patterns.ts          # Pattern extraction
│   │
│   ├── rag/
│   │   ├── context-builder.ts   # Build context for prompts
│   │   ├── search.ts            # Semantic search
│   │   └── ranking.ts           # Result ranking
│   │
│   └── db/
│       └── memory-schema.ts     # Memory table definitions
```

---

## Embedding Generation

```typescript
// packages/ai-agents/src/memory/embeddings.ts

import OpenAI from 'openai'

const openai = new OpenAI()

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 3072  // Max for text-embedding-3-large
  })

  return response.data[0].embedding
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: texts,
    dimensions: 3072
  })

  return response.data.map(d => d.embedding)
}
```

---

## Memory Operations

### Create Memory

```typescript
// packages/ai-agents/src/memory/storage.ts

export async function createMemory(params: {
  agentId: string
  memoryType: MemoryType
  title: string
  content: string
  subjectType?: string
  subjectId?: string
  source: MemorySource
  sourceContext?: string
  sourceConversationId?: string
  importance?: number
}): Promise<AgentMemory> {
  // Generate embedding for semantic search
  const embedding = await generateEmbedding(`${params.title}\n\n${params.content}`)

  // Calculate initial confidence based on source
  const sourceWeights: Record<MemorySource, number> = {
    trained: 1.0,
    told: 0.9,
    corrected: 0.85,
    observed: 0.7,
    inferred: 0.5,
    imported: 0.6
  }
  const confidence = sourceWeights[params.source] || 0.5

  const result = await sql`
    INSERT INTO agent_memories (
      tenant_id, agent_id, memory_type, subject_type, subject_id,
      title, content, embedding, confidence, importance,
      source, source_context, source_conversation_id
    )
    VALUES (
      current_setting('app.tenant_id')::uuid,
      ${params.agentId},
      ${params.memoryType},
      ${params.subjectType},
      ${params.subjectId},
      ${params.title},
      ${params.content},
      ${JSON.stringify(embedding)}::vector,
      ${confidence},
      ${params.importance || 0.5},
      ${params.source},
      ${params.sourceContext},
      ${params.sourceConversationId}
    )
    RETURNING *
  `

  return result.rows[0]
}
```

### Semantic Search

```typescript
// packages/ai-agents/src/rag/search.ts

export async function searchMemories(params: {
  agentId: string
  query: string
  limit?: number
  memoryTypes?: MemoryType[]
  subjectType?: string
  subjectId?: string
  minConfidence?: number
}): Promise<MemorySearchResult[]> {
  const queryEmbedding = await generateEmbedding(params.query)

  const typeFilter = params.memoryTypes?.length
    ? sql`AND memory_type = ANY(${params.memoryTypes})`
    : sql``

  const subjectFilter = params.subjectType
    ? sql`AND subject_type = ${params.subjectType}`
    : sql``

  const subjectIdFilter = params.subjectId
    ? sql`AND subject_id = ${params.subjectId}`
    : sql``

  const result = await sql`
    SELECT
      id, memory_type, subject_type, subject_id, title, content,
      confidence, importance, times_used, source,
      1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
    FROM agent_memories
    WHERE agent_id = ${params.agentId}
      AND is_active = true
      AND confidence >= ${params.minConfidence || 0.3}
      ${typeFilter}
      ${subjectFilter}
      ${subjectIdFilter}
    ORDER BY
      -- Rank by combined score: similarity * confidence * importance
      (1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector)) * confidence * importance DESC
    LIMIT ${params.limit || 10}
  `

  return result.rows
}
```

### Build RAG Context

```typescript
// packages/ai-agents/src/rag/context-builder.ts

export async function buildMemoryContext(params: {
  agentId: string
  query: string
  conversationContext?: string
  maxTokens?: number
}): Promise<string> {
  const maxTokens = params.maxTokens || 2000

  // Search for relevant memories
  const memories = await searchMemories({
    agentId: params.agentId,
    query: params.query,
    limit: 20,
    minConfidence: 0.4
  })

  if (memories.length === 0) {
    return ''
  }

  // Build context section
  let context = '## Relevant Context (from memory)\n\n'
  let tokenCount = 0

  for (const memory of memories) {
    const memoryText = `### ${memory.title} (${memory.memory_type}, confidence: ${(memory.confidence * 100).toFixed(0)}%)\n${memory.content}\n\n`

    // Rough token estimate (4 chars = 1 token)
    const tokens = Math.ceil(memoryText.length / 4)
    if (tokenCount + tokens > maxTokens) break

    context += memoryText
    tokenCount += tokens

    // Record memory access
    await recordMemoryAccess(memory.id)
  }

  return context
}

async function recordMemoryAccess(memoryId: string): Promise<void> {
  await sql`
    UPDATE agent_memories
    SET times_used = times_used + 1, last_used_at = now()
    WHERE id = ${memoryId}
  `
}
```

---

## Confidence Scoring

```typescript
// packages/ai-agents/src/memory/confidence.ts

export async function calculateConfidence(memory: AgentMemory): Promise<number> {
  // Source weight
  const sourceWeights: Record<string, number> = {
    trained: 1.0,
    told: 0.9,
    corrected: 0.85,
    observed: 0.7,
    inferred: 0.5,
    imported: 0.6
  }
  let confidence = sourceWeights[memory.source] || 0.5

  // Reinforcement bonus (up to +0.2)
  const reinforcementBonus = Math.min(0.2, memory.times_reinforced * 0.05)
  confidence += reinforcementBonus

  // Contradiction penalty (up to -0.3)
  const contradictionPenalty = Math.min(0.3, memory.times_contradicted * 0.1)
  confidence -= contradictionPenalty

  // Age decay (lose 0.01 per week unused, max -0.2)
  if (memory.last_used_at) {
    const weeksUnused = (Date.now() - new Date(memory.last_used_at).getTime()) / (1000 * 60 * 60 * 24 * 7)
    const ageDecay = Math.min(0.2, weeksUnused * 0.01)
    confidence -= ageDecay
  }

  return Math.max(0, Math.min(1, confidence))
}

export async function reinforceMemory(memoryId: string): Promise<void> {
  await sql`
    UPDATE agent_memories
    SET
      times_reinforced = times_reinforced + 1,
      confidence = LEAST(1.0, confidence + 0.05),
      updated_at = now()
    WHERE id = ${memoryId}
  `
}

export async function contradictMemory(memoryId: string): Promise<void> {
  await sql`
    UPDATE agent_memories
    SET
      times_contradicted = times_contradicted + 1,
      confidence = GREATEST(0.1, confidence - 0.1),
      updated_at = now()
    WHERE id = ${memoryId}
  `
}
```

---

## Training System

```typescript
// packages/ai-agents/src/learning/trainer.ts

export async function startTrainingSession(params: {
  agentId: string
  trainingType: TrainingType
  title: string
  instruction: string
  context?: string
  examples?: Array<{ input: string; output: string }>
  trainerUserId: string
  trainerName: string
}): Promise<TrainingSession> {
  // Create training session record
  const session = await sql`
    INSERT INTO agent_training_sessions (
      tenant_id, agent_id, training_type, title, instruction,
      context, examples, trainer_user_id, trainer_name
    )
    VALUES (
      current_setting('app.tenant_id')::uuid,
      ${params.agentId},
      ${params.trainingType},
      ${params.title},
      ${params.instruction},
      ${params.context},
      ${JSON.stringify(params.examples || [])},
      ${params.trainerUserId},
      ${params.trainerName}
    )
    RETURNING *
  `

  const sessionRecord = session.rows[0]

  // Create memory from training
  const memory = await createMemory({
    agentId: params.agentId,
    memoryType: trainingTypeToMemoryType(params.trainingType),
    title: params.title,
    content: buildTrainingContent(params),
    source: 'trained',
    sourceContext: `Training session by ${params.trainerName}`
  })

  // Update session with created memory
  await sql`
    UPDATE agent_training_sessions
    SET memories_created = ARRAY[${memory.id}]::uuid[]
    WHERE id = ${sessionRecord.id}
  `

  return { ...sessionRecord, memoriesCreated: [memory.id] }
}

function trainingTypeToMemoryType(trainingType: TrainingType): MemoryType {
  const mapping: Record<TrainingType, MemoryType> = {
    correction: 'policy',
    new_knowledge: 'fact',
    personality: 'preference',
    procedure: 'procedure',
    policy: 'policy',
    feedback: 'preference',
    example: 'project_pattern'
  }
  return mapping[trainingType] || 'fact'
}

function buildTrainingContent(params: {
  instruction: string
  context?: string
  examples?: Array<{ input: string; output: string }>
}): string {
  let content = params.instruction

  if (params.context) {
    content += `\n\nContext: ${params.context}`
  }

  if (params.examples?.length) {
    content += '\n\nExamples:'
    for (const example of params.examples) {
      content += `\n- Input: "${example.input}"\n  Output: "${example.output}"`
    }
  }

  return content
}
```

---

## Correction Detection

```typescript
// packages/ai-agents/src/learning/correction-detector.ts

export async function detectCorrection(params: {
  agentId: string
  conversationId: string
  userMessage: string
  agentResponse: string
  followUpMessage: string
}): Promise<FailureLearning | null> {
  // Correction indicators
  const correctionPatterns = [
    /no,?\s+(?:that's|thats|it's|its|you're|youre)\s+(?:wrong|incorrect|not right)/i,
    /actually,?\s+(?:it's|its|the|that|you)/i,
    /that's not (?:what|how|right|correct)/i,
    /you (?:misunderstood|got it wrong|made a mistake)/i,
    /let me correct/i,
    /the correct (?:answer|response|way)/i,
    /wrong[,.]?\s+(?:it's|the)/i
  ]

  const isCorrection = correctionPatterns.some(pattern =>
    pattern.test(params.followUpMessage)
  )

  if (!isCorrection) return null

  // Create failure learning
  const learning = await sql`
    INSERT INTO agent_failure_learnings (
      tenant_id, agent_id, failure_type, conversation_id,
      trigger_message, agent_response, what_went_wrong,
      correct_approach, source
    )
    VALUES (
      current_setting('app.tenant_id')::uuid,
      ${params.agentId},
      'wrong_answer',
      ${params.conversationId},
      ${params.userMessage},
      ${params.agentResponse},
      'User corrected the response',
      ${params.followUpMessage},
      'correction'
    )
    RETURNING *
  `

  // Create memory from correction
  await createMemory({
    agentId: params.agentId,
    memoryType: 'policy',
    title: 'Correction learned',
    content: `When asked about "${params.userMessage}", don't say "${params.agentResponse}". The correct approach: "${params.followUpMessage}"`,
    source: 'corrected',
    sourceConversationId: params.conversationId
  })

  return learning.rows[0]
}
```

---

## API Endpoints

### Memory Management

```typescript
// GET /api/admin/ai-agents/[agentId]/memories
// List agent memories with filters
export async function GET(req: Request, { params }: { params: { agentId: string } }) {
  const { tenantId } = await getTenantContext(req)
  await requirePermission(req, 'ai.memories.view')

  const url = new URL(req.url)
  const filters = {
    memoryType: url.searchParams.get('type'),
    subjectType: url.searchParams.get('subjectType'),
    minConfidence: parseFloat(url.searchParams.get('minConfidence') || '0'),
    search: url.searchParams.get('search'),
    limit: parseInt(url.searchParams.get('limit') || '50'),
  }

  const memories = await withTenant(tenantId, () =>
    listMemories(params.agentId, filters)
  )
  return Response.json({ memories })
}

// POST /api/admin/ai-agents/[agentId]/memories
// Create manual memory
export async function POST(req: Request, { params }: { params: { agentId: string } }) {
  const { tenantId, userId } = await getTenantContext(req)
  await requirePermission(req, 'ai.memories.manage')

  const data = await req.json()
  const memory = await withTenant(tenantId, () =>
    createMemory({
      agentId: params.agentId,
      memoryType: data.memoryType,
      title: data.title,
      content: data.content,
      subjectType: data.subjectType,
      subjectId: data.subjectId,
      source: 'told',
      sourceContext: `Manually created by user ${userId}`
    })
  )
  return Response.json({ memory })
}

// DELETE /api/admin/ai-agents/[agentId]/memories/[memoryId]
// Deactivate memory
```

### Training

```typescript
// GET /api/admin/ai-agents/[agentId]/training
// List training sessions

// POST /api/admin/ai-agents/[agentId]/training
// Start new training session
export async function POST(req: Request, { params }: { params: { agentId: string } }) {
  const { tenantId, userId, userName } = await getTenantContext(req)
  await requirePermission(req, 'ai.training.manage')

  const data = await req.json()
  const session = await withTenant(tenantId, () =>
    startTrainingSession({
      agentId: params.agentId,
      trainingType: data.trainingType,
      title: data.title,
      instruction: data.instruction,
      context: data.context,
      examples: data.examples,
      trainerUserId: userId,
      trainerName: userName
    })
  )
  return Response.json({ session })
}
```

### Search

```typescript
// POST /api/admin/ai-agents/[agentId]/memories/search
// Semantic search across memories
export async function POST(req: Request, { params }: { params: { agentId: string } }) {
  const { tenantId } = await getTenantContext(req)
  await requirePermission(req, 'ai.memories.view')

  const { query, limit, memoryTypes, minConfidence } = await req.json()

  const results = await withTenant(tenantId, () =>
    searchMemories({
      agentId: params.agentId,
      query,
      limit,
      memoryTypes,
      minConfidence
    })
  )
  return Response.json({ results })
}
```

---

## Admin UI Pages

### Memory Browser (`/admin/ai-team/[agentId]/memories`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Bri's Memories                                     [+ Add Memory]│
├─────────────────────────────────────────────────────────────────┤
│ Type: [All ▼]  Subject: [All ▼]  Confidence: [≥30% ▼]          │
│ 🔍 [Search memories semantically...]                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 📝 team_member                              [████████ 92%] │   │
│ │ Sarah prefers Slack over email                             │   │
│ │ Source: observed │ Used 47 times │ Last: 2 hours ago      │   │
│ │ [View] [Edit] [Deactivate]                                 │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 📋 policy                                   [███████░ 85%] │   │
│ │ Always confirm before sending payments over $500           │   │
│ │ Source: trained │ Used 12 times │ Last: 1 day ago         │   │
│ │ [View] [Edit] [Deactivate]                                 │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 🔄 project_pattern                          [██████░░ 71%] │   │
│ │ Creators often need deadline extensions during holidays    │   │
│ │ Source: observed │ Used 8 times │ Last: 1 week ago        │   │
│ │ [View] [Edit] [Deactivate]                                 │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│                           [Load More]                            │
└─────────────────────────────────────────────────────────────────┘
```

### Training Interface (`/admin/ai-team/[agentId]/training`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Train Bri                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Training Type: [Policy ▼]                                        │
│                                                                  │
│ Title:                                                           │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Payment confirmation threshold                             │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Instruction:                                                     │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Always ask for human confirmation before processing any    │   │
│ │ payment over $500. This applies to creator payouts,        │   │
│ │ vendor payments, and refunds.                              │   │
│ │                                                             │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Examples (optional):                                             │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Input: "Process $750 payout to @mike"                      │   │
│ │ Output: "I'll need approval to process this $750 payout.   │   │
│ │          Sending to Holden for confirmation."              │   │
│ └───────────────────────────────────────────────────────────┘   │
│ [+ Add Example]                                                  │
│                                                                  │
│                                    [Cancel] [Start Training]     │
└─────────────────────────────────────────────────────────────────┘
```

### Failure Learnings (`/admin/ai-team/[agentId]/learnings`)

List of corrections and mistakes with the learned improvements.

---

## Background Jobs

| Job | Purpose | Schedule |
|-----|---------|----------|
| `ai-agents/memory-decay` | Recalculate confidence for aging memories | Daily |
| `ai-agents/memory-consolidation` | Merge similar memories | Weekly |
| `ai-agents/cleanup-low-confidence` | Deactivate memories < 0.2 confidence | Weekly |
| `ai-agents/process-feedback` | Detect corrections from unprocessed feedback | Every 15 min |
| `ai-agents/embedding-backfill` | Generate embeddings for any memories without them | Hourly |

---

## Multi-Tenant Considerations

1. **Isolated Vector Search**: Each agent's embeddings are only searched within their tenant
2. **Separate Training**: Training sessions are per-tenant
3. **No Cross-Tenant Memory**: Memories never leak between tenants
4. **Per-Tenant Embedding Costs**: Track embedding API usage per tenant for billing

---

## Deliverables Checklist

- [ ] pgvector extension enabled
- [ ] Database schema for memories, training, feedback, patterns
- [ ] Embedding generation integration (OpenAI)
- [ ] Semantic search with cosine similarity
- [ ] Confidence scoring with decay
- [ ] Training session API and UI
- [ ] Correction detection
- [ ] Memory browser admin UI
- [ ] Background jobs for maintenance
- [ ] Integration tests

---

## Next Phase

After PHASE-2AI-MEMORY:
- **PHASE-2AI-VOICE**: TTS/STT integration
- **PHASE-2AI-INTEGRATIONS**: Slack, Calendar, Email
