-- Email Queue Tables
-- Multi-tenant email queue architecture with atomic claim patterns
-- PHASE-2CM-EMAIL-QUEUE: Email Queue Architecture

-- Review Email Queue
-- Used for review request and reminder emails
CREATE TABLE IF NOT EXISTS review_email_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Order/customer context
  order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  product_title TEXT,

  -- Fulfillment tracking
  fulfilled_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  tracking_number TEXT,

  -- Queue status
  -- pending: waiting for trigger event
  -- awaiting_delivery: fulfilled, waiting for delivery confirmation
  -- scheduled: ready to send at scheduled_at
  -- processing: currently being sent (claimed by worker)
  -- sent: successfully sent
  -- skipped: manually skipped or auto-skipped (review submitted)
  -- failed: all retries exhausted
  status TEXT NOT NULL DEFAULT 'pending',

  -- Scheduling
  trigger_event TEXT NOT NULL DEFAULT 'fulfilled', -- fulfilled, delivered, immediate, manual
  scheduled_at TIMESTAMPTZ,
  delay_days INTEGER DEFAULT 3,

  -- Sequence tracking
  sequence_number INTEGER NOT NULL DEFAULT 1,
  sequence_id TEXT, -- Groups related emails

  -- Execution tracking
  trigger_run_id TEXT, -- Current processor run (for claim)
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  resend_message_id TEXT,

  -- Incentive tracking (review-specific)
  incentive_offered BOOLEAN DEFAULT false,
  force_incentive BOOLEAN DEFAULT false,
  incentive_code TEXT,

  -- Skip tracking
  skip_reason TEXT,
  skipped_by TEXT,
  skipped_at TIMESTAMPTZ,

  -- Template tracking
  template_type TEXT, -- reviewRequest, incentiveRequest, reminder, etc.

  -- Metadata
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate entries per order per sequence
  CONSTRAINT review_email_queue_unique_order_sequence UNIQUE(tenant_id, order_id, sequence_number)
);

-- Indexes for review email queue
CREATE INDEX IF NOT EXISTS idx_review_email_queue_tenant ON review_email_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_review_email_queue_status ON review_email_queue(status);
CREATE INDEX IF NOT EXISTS idx_review_email_queue_scheduled
  ON review_email_queue(status, scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_review_email_queue_processing
  ON review_email_queue(status, trigger_run_id)
  WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS idx_review_email_queue_email ON review_email_queue(customer_email);
CREATE INDEX IF NOT EXISTS idx_review_email_queue_order ON review_email_queue(order_id);
CREATE INDEX IF NOT EXISTS idx_review_email_queue_sequence ON review_email_queue(sequence_id);
CREATE INDEX IF NOT EXISTS idx_review_email_queue_awaiting
  ON review_email_queue(status, fulfilled_at)
  WHERE status = 'awaiting_delivery';

-- Creator Email Queue
-- Used for creator communications (approval, onboarding, reminders)
CREATE TABLE IF NOT EXISTS creator_email_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Creator context
  creator_id TEXT NOT NULL,
  creator_email TEXT NOT NULL,
  creator_name TEXT,

  -- Project context
  project_id TEXT,
  project_title TEXT,

  -- Communication type
  communication_type TEXT NOT NULL, -- approval, onboarding, reminder, project_update, payout_notification

  -- Queue status (same as review)
  status TEXT NOT NULL DEFAULT 'pending',

  -- Scheduling
  trigger_event TEXT NOT NULL DEFAULT 'immediate',
  scheduled_at TIMESTAMPTZ,
  delay_days INTEGER DEFAULT 0,

  -- Sequence tracking
  sequence_number INTEGER NOT NULL DEFAULT 1,
  sequence_id TEXT,

  -- Execution tracking
  trigger_run_id TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  resend_message_id TEXT,

  -- Skip tracking
  skip_reason TEXT,
  skipped_by TEXT,
  skipped_at TIMESTAMPTZ,

  -- Template tracking
  template_type TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT creator_email_queue_unique_sequence UNIQUE(tenant_id, creator_id, sequence_number)
);

-- Indexes for creator email queue
CREATE INDEX IF NOT EXISTS idx_creator_email_queue_tenant ON creator_email_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_creator_email_queue_status ON creator_email_queue(status);
CREATE INDEX IF NOT EXISTS idx_creator_email_queue_scheduled
  ON creator_email_queue(status, scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_creator_email_queue_creator ON creator_email_queue(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_email_queue_email ON creator_email_queue(creator_email);

-- Subscription Email Queue
-- Used for subscription lifecycle emails
CREATE TABLE IF NOT EXISTS subscription_email_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Customer context
  customer_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,

  -- Subscription context
  subscription_id TEXT NOT NULL,
  subscription_status TEXT NOT NULL,

  -- Communication type
  communication_type TEXT NOT NULL, -- welcome, renewal_reminder, payment_failed, cancelled, reactivated

  -- Queue status
  status TEXT NOT NULL DEFAULT 'pending',

  -- Scheduling
  trigger_event TEXT NOT NULL DEFAULT 'immediate',
  scheduled_at TIMESTAMPTZ,
  delay_days INTEGER DEFAULT 0,

  -- Sequence tracking
  sequence_number INTEGER NOT NULL DEFAULT 1,
  sequence_id TEXT,

  -- Execution tracking
  trigger_run_id TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  resend_message_id TEXT,

  -- Skip tracking
  skip_reason TEXT,
  skipped_by TEXT,
  skipped_at TIMESTAMPTZ,

  -- Template tracking
  template_type TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT subscription_email_queue_unique_sequence UNIQUE(tenant_id, subscription_id, sequence_number)
);

-- Indexes for subscription email queue
CREATE INDEX IF NOT EXISTS idx_subscription_email_queue_tenant ON subscription_email_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_email_queue_status ON subscription_email_queue(status);
CREATE INDEX IF NOT EXISTS idx_subscription_email_queue_scheduled
  ON subscription_email_queue(status, scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_subscription_email_queue_customer ON subscription_email_queue(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscription_email_queue_subscription ON subscription_email_queue(subscription_id);

-- E-sign Email Queue
-- Used for document signing notifications
CREATE TABLE IF NOT EXISTS esign_email_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Recipient context
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,

  -- Document context
  document_id TEXT NOT NULL,
  document_title TEXT NOT NULL,

  -- Communication type
  communication_type TEXT NOT NULL, -- signing_request, reminder, completed, expired

  -- Queue status
  status TEXT NOT NULL DEFAULT 'pending',

  -- Scheduling
  trigger_event TEXT NOT NULL DEFAULT 'immediate',
  scheduled_at TIMESTAMPTZ,
  delay_days INTEGER DEFAULT 0,

  -- Sequence tracking
  sequence_number INTEGER NOT NULL DEFAULT 1,
  sequence_id TEXT,

  -- Execution tracking
  trigger_run_id TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  resend_message_id TEXT,

  -- Skip tracking
  skip_reason TEXT,
  skipped_by TEXT,
  skipped_at TIMESTAMPTZ,

  -- Template tracking
  template_type TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT esign_email_queue_unique_sequence UNIQUE(tenant_id, document_id, sequence_number)
);

-- Indexes for esign email queue
CREATE INDEX IF NOT EXISTS idx_esign_email_queue_tenant ON esign_email_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_esign_email_queue_status ON esign_email_queue(status);
CREATE INDEX IF NOT EXISTS idx_esign_email_queue_scheduled
  ON esign_email_queue(status, scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_esign_email_queue_document ON esign_email_queue(document_id);
CREATE INDEX IF NOT EXISTS idx_esign_email_queue_email ON esign_email_queue(recipient_email);

-- Treasury Email Queue
-- Used for treasury approval requests
CREATE TABLE IF NOT EXISTS treasury_email_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Requester context
  requester_id TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_name TEXT,

  -- Approver context
  approver_email TEXT NOT NULL,
  approver_name TEXT,

  -- Request context
  request_id TEXT NOT NULL,
  request_amount DECIMAL(10,2) NOT NULL,
  request_currency TEXT NOT NULL DEFAULT 'USD',
  request_description TEXT,

  -- Communication type
  communication_type TEXT NOT NULL, -- approval_request, reminder, approved, rejected

  -- Queue status
  status TEXT NOT NULL DEFAULT 'pending',

  -- Scheduling
  trigger_event TEXT NOT NULL DEFAULT 'immediate',
  scheduled_at TIMESTAMPTZ,
  delay_days INTEGER DEFAULT 0,

  -- Sequence tracking
  sequence_number INTEGER NOT NULL DEFAULT 1,
  sequence_id TEXT,

  -- Execution tracking
  trigger_run_id TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  resend_message_id TEXT,

  -- Skip tracking
  skip_reason TEXT,
  skipped_by TEXT,
  skipped_at TIMESTAMPTZ,

  -- Template tracking
  template_type TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT treasury_email_queue_unique_sequence UNIQUE(tenant_id, request_id, sequence_number)
);

-- Indexes for treasury email queue
CREATE INDEX IF NOT EXISTS idx_treasury_email_queue_tenant ON treasury_email_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_treasury_email_queue_status ON treasury_email_queue(status);
CREATE INDEX IF NOT EXISTS idx_treasury_email_queue_scheduled
  ON treasury_email_queue(status, scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_treasury_email_queue_request ON treasury_email_queue(request_id);
CREATE INDEX IF NOT EXISTS idx_treasury_email_queue_approver ON treasury_email_queue(approver_email);

-- Team Invitation Queue
-- Used for team member invitations
CREATE TABLE IF NOT EXISTS team_invitation_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Invitee context
  invitee_email TEXT NOT NULL,
  invitee_name TEXT,

  -- Inviter context
  inviter_id TEXT NOT NULL,
  inviter_name TEXT,

  -- Invitation context
  invitation_id TEXT NOT NULL,
  invited_role TEXT NOT NULL,

  -- Communication type
  communication_type TEXT NOT NULL, -- invite, reminder

  -- Queue status
  status TEXT NOT NULL DEFAULT 'pending',

  -- Scheduling
  trigger_event TEXT NOT NULL DEFAULT 'immediate',
  scheduled_at TIMESTAMPTZ,
  delay_days INTEGER DEFAULT 0,

  -- Sequence tracking
  sequence_number INTEGER NOT NULL DEFAULT 1,
  sequence_id TEXT,

  -- Execution tracking
  trigger_run_id TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  resend_message_id TEXT,

  -- Skip tracking
  skip_reason TEXT,
  skipped_by TEXT,
  skipped_at TIMESTAMPTZ,

  -- Template tracking
  template_type TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT team_invitation_queue_unique_sequence UNIQUE(tenant_id, invitation_id, sequence_number)
);

-- Indexes for team invitation queue
CREATE INDEX IF NOT EXISTS idx_team_invitation_queue_tenant ON team_invitation_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_invitation_queue_status ON team_invitation_queue(status);
CREATE INDEX IF NOT EXISTS idx_team_invitation_queue_scheduled
  ON team_invitation_queue(status, scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_team_invitation_queue_invitation ON team_invitation_queue(invitation_id);
CREATE INDEX IF NOT EXISTS idx_team_invitation_queue_email ON team_invitation_queue(invitee_email);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_review_email_queue_updated_at ON review_email_queue;
CREATE TRIGGER update_review_email_queue_updated_at
  BEFORE UPDATE ON review_email_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_creator_email_queue_updated_at ON creator_email_queue;
CREATE TRIGGER update_creator_email_queue_updated_at
  BEFORE UPDATE ON creator_email_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_email_queue_updated_at ON subscription_email_queue;
CREATE TRIGGER update_subscription_email_queue_updated_at
  BEFORE UPDATE ON subscription_email_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_esign_email_queue_updated_at ON esign_email_queue;
CREATE TRIGGER update_esign_email_queue_updated_at
  BEFORE UPDATE ON esign_email_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_treasury_email_queue_updated_at ON treasury_email_queue;
CREATE TRIGGER update_treasury_email_queue_updated_at
  BEFORE UPDATE ON treasury_email_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_invitation_queue_updated_at ON team_invitation_queue;
CREATE TRIGGER update_team_invitation_queue_updated_at
  BEFORE UPDATE ON team_invitation_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE review_email_queue IS 'Review request and reminder email queue with sequence support';
COMMENT ON TABLE creator_email_queue IS 'Creator communication email queue (approval, onboarding, reminders)';
COMMENT ON TABLE subscription_email_queue IS 'Subscription lifecycle email queue';
COMMENT ON TABLE esign_email_queue IS 'Document e-signature notification queue';
COMMENT ON TABLE treasury_email_queue IS 'Treasury approval request email queue';
COMMENT ON TABLE team_invitation_queue IS 'Team member invitation email queue';
