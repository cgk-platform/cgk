-- Creator Conversations table
-- Messaging threads between creators and admin/coordinators

CREATE TABLE IF NOT EXISTS creator_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Creator reference
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  -- Optional project reference (conversation may be about a specific project)
  project_id UUID,  -- Reference to tenant-specific project if applicable
  brand_id UUID REFERENCES organizations(id) ON DELETE SET NULL,  -- Which brand this conversation is with

  -- Coordinator/admin info
  coordinator_name TEXT,
  coordinator_id UUID,  -- Admin user ID if applicable

  -- Conversation state
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open',  -- open, closed, archived

  -- Message previews for list view
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,  -- First 100 chars of last message
  last_message_sender TEXT,   -- 'creator' or 'admin'

  -- Unread counts
  unread_creator INTEGER NOT NULL DEFAULT 0,   -- Messages creator hasn't read
  unread_admin INTEGER NOT NULL DEFAULT 0,     -- Messages admin hasn't read

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_creator_conversations_updated_at ON creator_conversations;
CREATE TRIGGER update_creator_conversations_updated_at
  BEFORE UPDATE ON creator_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_conversations_creator_id ON creator_conversations(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_conversations_brand_id ON creator_conversations(brand_id);
CREATE INDEX IF NOT EXISTS idx_creator_conversations_last_message ON creator_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_conversations_unread_creator ON creator_conversations(creator_id, unread_creator)
  WHERE unread_creator > 0;

COMMENT ON TABLE creator_conversations IS 'Messaging threads between creators and admin team.';
COMMENT ON COLUMN creator_conversations.unread_creator IS 'Count of messages the creator has not read yet.';
