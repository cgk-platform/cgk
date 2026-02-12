-- AI Memory & RAG System for BRII (Business Relationships & Interaction Intelligence)
-- Phase: PHASE-2AI-MEMORY
-- Enables persistent memory, vector embeddings, semantic search, and learning

-- Enable pgvector extension (must be done in public schema, but works across all schemas)
-- Note: This needs superuser privileges and should be run once at DB setup
-- For Neon/Vercel Postgres, pgvector is pre-installed
CREATE EXTENSION IF NOT EXISTS vector;

-- Memory type enum
DO $$ BEGIN
  CREATE TYPE memory_type AS ENUM (
    'team_member',     -- Info about team members
    'creator',         -- Info about creators
    'project_pattern', -- Patterns from projects
    'policy',          -- Business policies
    'preference',      -- User/team preferences
    'procedure',       -- How to do things
    'fact'             -- General facts/knowledge
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Memory source enum
DO $$ BEGIN
  CREATE TYPE memory_source AS ENUM (
    'observed',   -- Learned from watching behavior
    'told',       -- Explicitly told by user
    'inferred',   -- Inferred from context
    'corrected',  -- Learned from correction
    'trained',    -- Explicit training session
    'imported'    -- Bulk imported
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Training type enum
DO $$ BEGIN
  CREATE TYPE training_type AS ENUM (
    'correction',     -- Correcting previous behavior
    'new_knowledge',  -- New information
    'personality',    -- Personality adjustments
    'procedure',      -- How to handle situations
    'policy',         -- Business rules
    'feedback',       -- General feedback
    'example'         -- Example interactions
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Failure type enum
DO $$ BEGIN
  CREATE TYPE failure_type AS ENUM (
    'wrong_answer',     -- Gave incorrect information
    'misunderstood',    -- Misunderstood the request
    'wrong_action',     -- Took incorrect action
    'over_escalated',   -- Escalated unnecessarily
    'under_escalated',  -- Failed to escalate when needed
    'poor_timing',      -- Bad timing on action
    'tone_mismatch'     -- Inappropriate tone/style
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Feedback type enum
DO $$ BEGIN
  CREATE TYPE feedback_type AS ENUM (
    'positive',    -- Good response
    'negative',    -- Bad response
    'correction'   -- Response needs correction
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Long-term agent memories with vector embeddings
CREATE TABLE IF NOT EXISTS agent_memories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Memory classification
  memory_type memory_type NOT NULL,
  subject_type TEXT,                      -- What entity this is about (creator, team_member, project, etc.)
  subject_id TEXT,                        -- ID of that entity

  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,                  -- Full text of the memory

  -- Confidence scoring
  confidence NUMERIC(3,2) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  importance NUMERIC(3,2) DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),

  -- Vector embedding (1536 dimensions for text-embedding-3-small)
  -- Note: HNSW indexes have a 2000 dimension limit, so we use the small model
  embedding vector(1536),

  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  times_reinforced INTEGER DEFAULT 0,
  times_contradicted INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Source tracking
  source memory_source NOT NULL,
  source_context TEXT,                    -- Additional context about source
  source_conversation_id TEXT,

  -- Lifecycle
  is_active BOOLEAN DEFAULT true,
  superseded_by TEXT REFERENCES agent_memories(id),
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for agent_memories
CREATE INDEX IF NOT EXISTS idx_memories_agent ON agent_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON agent_memories(agent_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_memories_subject ON agent_memories(subject_type, subject_id) WHERE subject_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memories_active ON agent_memories(agent_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_memories_confidence ON agent_memories(agent_id, confidence) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_memories_created ON agent_memories(created_at DESC);

-- HNSW index for vector similarity search (fast approximate nearest neighbor)
-- Using cosine distance for semantic similarity
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON agent_memories
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_agent_memories_updated_at ON agent_memories;
CREATE TRIGGER update_agent_memories_updated_at
  BEFORE UPDATE ON agent_memories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE agent_memories IS 'Long-term agent memories with vector embeddings for RAG';
COMMENT ON COLUMN agent_memories.embedding IS '1536-dimension vector for text-embedding-3-small';
COMMENT ON COLUMN agent_memories.confidence IS 'Confidence score 0.0-1.0, decays over time';

-- Explicit training sessions for knowledge import
CREATE TABLE IF NOT EXISTS agent_training_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Training details
  training_type training_type NOT NULL,
  title TEXT NOT NULL,
  instruction TEXT NOT NULL,              -- What to learn
  context TEXT,                           -- Additional context
  examples JSONB DEFAULT '[]',            -- Array of {input, output} pairs

  -- Result
  memories_created TEXT[] DEFAULT ARRAY[]::TEXT[],
  acknowledged BOOLEAN DEFAULT false,
  agent_response TEXT,                    -- Agent's acknowledgment response

  -- Trainer info
  trainer_user_id TEXT,
  trainer_name TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for training sessions
CREATE INDEX IF NOT EXISTS idx_training_agent ON agent_training_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_training_type ON agent_training_sessions(training_type);
CREATE INDEX IF NOT EXISTS idx_training_created ON agent_training_sessions(created_at DESC);

COMMENT ON TABLE agent_training_sessions IS 'Explicit training sessions for knowledge import';

-- Learning from mistakes and corrections
CREATE TABLE IF NOT EXISTS agent_failure_learnings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Failure classification
  failure_type failure_type NOT NULL,

  -- Context
  conversation_id TEXT,
  trigger_message TEXT,                   -- What user said
  agent_response TEXT,                    -- What agent did wrong

  -- Learning
  what_went_wrong TEXT NOT NULL,
  correct_approach TEXT NOT NULL,
  pattern_to_avoid TEXT,

  -- Scoring
  confidence NUMERIC(3,2) DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT NOT NULL,                   -- correction, negative_reaction, escalation, self_detected

  -- Attribution
  corrected_by TEXT,                      -- User ID
  acknowledged BOOLEAN DEFAULT false,
  applied_to_behavior BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for failure learnings
CREATE INDEX IF NOT EXISTS idx_failures_agent ON agent_failure_learnings(agent_id);
CREATE INDEX IF NOT EXISTS idx_failures_type ON agent_failure_learnings(failure_type);
CREATE INDEX IF NOT EXISTS idx_failures_created ON agent_failure_learnings(created_at DESC);

COMMENT ON TABLE agent_failure_learnings IS 'Learning from mistakes and corrections';

-- User feedback on agent responses
CREATE TABLE IF NOT EXISTS agent_feedback (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Feedback details
  message_id TEXT,                        -- Slack/channel message ID
  conversation_id TEXT,
  feedback_type feedback_type NOT NULL,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),

  -- Content
  original_response TEXT,
  reason TEXT,                            -- Why feedback was given
  correction TEXT,                        -- What should have been said

  -- Attribution
  user_id TEXT NOT NULL,
  user_name TEXT,

  -- Processing
  processed BOOLEAN DEFAULT false,
  learning_created TEXT REFERENCES agent_failure_learnings(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for feedback
CREATE INDEX IF NOT EXISTS idx_feedback_agent ON agent_feedback(agent_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON agent_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_unprocessed ON agent_feedback(agent_id) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_feedback_created ON agent_feedback(created_at DESC);

COMMENT ON TABLE agent_feedback IS 'User feedback on agent responses';

-- Successful patterns to replicate
CREATE TABLE IF NOT EXISTS agent_patterns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Pattern content
  query_pattern TEXT NOT NULL,            -- Example input that worked
  response_pattern TEXT NOT NULL,         -- Successful response
  tools_used TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Performance
  times_used INTEGER DEFAULT 1,
  success_rate NUMERIC(3,2) DEFAULT 1.0 CHECK (success_rate >= 0 AND success_rate <= 1),
  avg_feedback_score NUMERIC(3,2) CHECK (avg_feedback_score IS NULL OR (avg_feedback_score >= 0 AND avg_feedback_score <= 5)),

  -- Metadata
  feedback_id TEXT,
  category TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for patterns
CREATE INDEX IF NOT EXISTS idx_patterns_agent ON agent_patterns(agent_id);
CREATE INDEX IF NOT EXISTS idx_patterns_category ON agent_patterns(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patterns_success ON agent_patterns(agent_id, success_rate DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_agent_patterns_updated_at ON agent_patterns;
CREATE TRIGGER update_agent_patterns_updated_at
  BEFORE UPDATE ON agent_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE agent_patterns IS 'Successful response patterns to replicate';
