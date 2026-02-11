-- Creator Conversations and Messages
-- Per-creator inbox for direct messaging between admin and creators

-- Conversation status enum
DO $$ BEGIN
  CREATE TYPE conversation_status AS ENUM ('active', 'archived', 'spam');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Message sender type enum
DO $$ BEGIN
  CREATE TYPE message_sender_type AS ENUM ('creator', 'admin', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Creator conversations table
CREATE TABLE IF NOT EXISTS creator_conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,

  -- Conversation metadata
  subject TEXT,
  status conversation_status NOT NULL DEFAULT 'active',

  -- Last message tracking
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,

  -- Unread counts
  unread_creator INTEGER NOT NULL DEFAULT 0,
  unread_admin INTEGER NOT NULL DEFAULT 0,

  -- Assignment
  assigned_to TEXT REFERENCES public.users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Creator messages table
CREATE TABLE IF NOT EXISTS creator_conversation_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  conversation_id TEXT NOT NULL REFERENCES creator_conversations(id) ON DELETE CASCADE,

  -- Sender info
  sender_type message_sender_type NOT NULL,
  sender_id TEXT, -- User ID if admin, Creator ID if creator
  sender_name TEXT NOT NULL,

  -- Content
  content TEXT NOT NULL,
  content_html TEXT, -- Rich text HTML version
  attachments JSONB NOT NULL DEFAULT '[]', -- [{name, url, size, type}]

  -- Flags
  is_internal BOOLEAN NOT NULL DEFAULT false, -- Hidden from creator (admin notes)
  ai_generated BOOLEAN NOT NULL DEFAULT false,

  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  -- Read tracking
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_creator_conversations_creator_id ON creator_conversations(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_conversations_status ON creator_conversations(status);
CREATE INDEX IF NOT EXISTS idx_creator_conversations_assigned_to ON creator_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_creator_conversations_last_message ON creator_conversations(last_message_at DESC);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_creator_conv_messages_conversation ON creator_conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_creator_conv_messages_scheduled ON creator_conversation_messages(scheduled_for)
  WHERE sent_at IS NULL AND scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_creator_conv_messages_sender ON creator_conversation_messages(sender_type, sender_id);

-- Trigger for conversations updated_at
DROP TRIGGER IF EXISTS update_creator_conversations_updated_at ON creator_conversations;
CREATE TRIGGER update_creator_conversations_updated_at
  BEFORE UPDATE ON creator_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE creator_conversations IS 'Conversation threads between admin and creators';
COMMENT ON TABLE creator_conversation_messages IS 'Individual messages within creator conversations';
COMMENT ON COLUMN creator_conversation_messages.is_internal IS 'Internal notes hidden from creator';
COMMENT ON COLUMN creator_conversation_messages.scheduled_for IS 'Future date for scheduled message delivery';
