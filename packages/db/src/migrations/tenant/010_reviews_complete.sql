-- Complete Reviews System
-- Email queue, templates, bulk campaigns, incentives, Q&A, and settings

-- Review email status enum
DO $$ BEGIN
  CREATE TYPE review_email_status AS ENUM ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Bulk campaign status enum
DO $$ BEGIN
  CREATE TYPE bulk_campaign_status AS ENUM ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Incentive code status enum
DO $$ BEGIN
  CREATE TYPE incentive_code_status AS ENUM ('active', 'redeemed', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Question status enum
DO $$ BEGIN
  CREATE TYPE question_status AS ENUM ('pending', 'answered', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Review email templates
CREATE TABLE IF NOT EXISTS review_email_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Template type
  type TEXT NOT NULL, -- request, reminder_1, reminder_2, photo_request, thank_you, incentive
  name TEXT NOT NULL,

  -- Content
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,

  -- Configuration
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  delay_days INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_review_email_templates_updated_at ON review_email_templates;
CREATE TRIGGER update_review_email_templates_updated_at
  BEFORE UPDATE ON review_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Review email queue
CREATE TABLE IF NOT EXISTS review_email_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Customer info
  customer_email TEXT NOT NULL,
  customer_name TEXT,

  -- Order/product reference
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,

  -- Template reference
  template_id TEXT REFERENCES review_email_templates(id) ON DELETE SET NULL,

  -- Status tracking
  status review_email_status NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,

  -- External provider ID (Resend, etc.)
  provider_message_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Review email logs (detailed history)
CREATE TABLE IF NOT EXISTS review_email_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Reference to queue item
  queue_id TEXT REFERENCES review_email_queue(id) ON DELETE CASCADE,

  -- Event info
  event_type TEXT NOT NULL, -- sent, delivered, opened, clicked, bounced, failed
  event_data JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bulk send templates (separate from regular templates)
CREATE TABLE IF NOT EXISTS review_bulk_send_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Template info
  name TEXT NOT NULL,
  description TEXT,

  -- Content
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,

  -- Incentive integration
  include_incentive BOOLEAN NOT NULL DEFAULT false,

  -- Performance tracking
  times_used INTEGER NOT NULL DEFAULT 0,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_reviewed INTEGER NOT NULL DEFAULT 0,

  -- Status
  is_archived BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_review_bulk_send_templates_updated_at ON review_bulk_send_templates;
CREATE TRIGGER update_review_bulk_send_templates_updated_at
  BEFORE UPDATE ON review_bulk_send_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Bulk send campaigns
CREATE TABLE IF NOT EXISTS review_bulk_campaigns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Campaign info
  name TEXT NOT NULL,
  template_id TEXT REFERENCES review_bulk_send_templates(id) ON DELETE SET NULL,

  -- Filters (JSON: dateFrom, dateTo, productIds, minOrderValue, etc.)
  filters JSONB NOT NULL DEFAULT '{}',

  -- Status and progress
  status bulk_campaign_status NOT NULL DEFAULT 'draft',
  total_recipients INTEGER,
  sent_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,

  -- Scheduling
  send_rate INTEGER, -- emails per hour, null means immediate
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_review_bulk_campaigns_updated_at ON review_bulk_campaigns;
CREATE TRIGGER update_review_bulk_campaigns_updated_at
  BEFORE UPDATE ON review_bulk_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Bulk campaign recipients
CREATE TABLE IF NOT EXISTS review_bulk_campaign_recipients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Campaign reference
  campaign_id TEXT NOT NULL REFERENCES review_bulk_campaigns(id) ON DELETE CASCADE,

  -- Customer info
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,

  -- Status
  status review_email_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Incentive codes
CREATE TABLE IF NOT EXISTS review_incentive_codes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Code
  code TEXT UNIQUE NOT NULL,

  -- Review reference (null until issued)
  review_id TEXT REFERENCES reviews(id) ON DELETE SET NULL,
  customer_email TEXT,

  -- Discount configuration
  discount_type TEXT NOT NULL, -- percentage, fixed
  discount_value NUMERIC(10,2) NOT NULL,

  -- Status
  status incentive_code_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  redeemed_order_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product questions
CREATE TABLE IF NOT EXISTS product_questions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Product reference
  product_id TEXT NOT NULL,

  -- Customer info
  customer_email TEXT,
  customer_name TEXT,

  -- Question content
  question TEXT NOT NULL,

  -- Status
  status question_status NOT NULL DEFAULT 'pending',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product answers
CREATE TABLE IF NOT EXISTS product_answers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Question reference
  question_id TEXT NOT NULL REFERENCES product_questions(id) ON DELETE CASCADE,

  -- Answer content
  answer TEXT NOT NULL,
  answered_by TEXT, -- admin user name

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Q&A answer templates
CREATE TABLE IF NOT EXISTS qa_answer_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Template info
  name TEXT NOT NULL,
  answer_text TEXT NOT NULL,

  -- Usage tracking
  times_used INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_qa_answer_templates_updated_at ON qa_answer_templates;
CREATE TRIGGER update_qa_answer_templates_updated_at
  BEFORE UPDATE ON qa_answer_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Review settings
CREATE TABLE IF NOT EXISTS review_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',

  -- Provider configuration
  provider TEXT NOT NULL DEFAULT 'internal', -- internal, yotpo
  provider_credentials JSONB,

  -- Collection settings
  request_delay_days INTEGER NOT NULL DEFAULT 7,
  reminder_count INTEGER NOT NULL DEFAULT 2,
  reminder_interval_days INTEGER NOT NULL DEFAULT 3,
  order_status_trigger TEXT NOT NULL DEFAULT 'delivered', -- delivered, fulfilled

  -- Moderation settings
  auto_approve BOOLEAN NOT NULL DEFAULT false,
  auto_approve_min_rating INTEGER,
  auto_approve_verified_only BOOLEAN NOT NULL DEFAULT false,
  profanity_filter BOOLEAN NOT NULL DEFAULT true,
  spam_detection BOOLEAN NOT NULL DEFAULT true,

  -- Display settings
  show_verified_badge BOOLEAN NOT NULL DEFAULT true,
  allow_media BOOLEAN NOT NULL DEFAULT true,
  max_media_count INTEGER NOT NULL DEFAULT 5,
  allow_rating_only BOOLEAN NOT NULL DEFAULT false,
  min_review_length INTEGER NOT NULL DEFAULT 0,

  -- Incentive settings
  incentive_enabled BOOLEAN NOT NULL DEFAULT false,
  incentive_discount_type TEXT, -- percentage, fixed
  incentive_discount_value NUMERIC(10,2),
  incentive_expiry_days INTEGER NOT NULL DEFAULT 30,
  incentive_min_rating INTEGER,
  incentive_min_word_count INTEGER,
  incentive_require_photo BOOLEAN NOT NULL DEFAULT false,

  -- Integration settings
  shopify_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  klaviyo_sync_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_review_settings_updated_at ON review_settings;
CREATE TRIGGER update_review_settings_updated_at
  BEFORE UPDATE ON review_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Review migrations history
CREATE TABLE IF NOT EXISTS review_migrations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Migration info
  migration_type TEXT NOT NULL, -- import, export, provider_switch
  source TEXT, -- yotpo, judge.me, stamped, loox, csv
  destination TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, failed

  -- Counts
  total_records INTEGER,
  processed_records INTEGER NOT NULL DEFAULT 0,
  success_records INTEGER NOT NULL DEFAULT 0,
  error_records INTEGER NOT NULL DEFAULT 0,

  -- Error details
  error_log JSONB,

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for review_email_queue
CREATE INDEX IF NOT EXISTS idx_review_email_queue_status ON review_email_queue(status);
CREATE INDEX IF NOT EXISTS idx_review_email_queue_scheduled_at ON review_email_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_review_email_queue_customer_email ON review_email_queue(customer_email);
CREATE INDEX IF NOT EXISTS idx_review_email_queue_order_id ON review_email_queue(order_id);

-- Indexes for review_email_logs
CREATE INDEX IF NOT EXISTS idx_review_email_logs_queue_id ON review_email_logs(queue_id);
CREATE INDEX IF NOT EXISTS idx_review_email_logs_event_type ON review_email_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_review_email_logs_created_at ON review_email_logs(created_at);

-- Indexes for review_bulk_campaigns
CREATE INDEX IF NOT EXISTS idx_review_bulk_campaigns_status ON review_bulk_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_review_bulk_campaigns_scheduled_at ON review_bulk_campaigns(scheduled_at);

-- Indexes for review_bulk_campaign_recipients
CREATE INDEX IF NOT EXISTS idx_review_bulk_campaign_recipients_campaign_id ON review_bulk_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_review_bulk_campaign_recipients_status ON review_bulk_campaign_recipients(status);

-- Indexes for review_incentive_codes
CREATE INDEX IF NOT EXISTS idx_review_incentive_codes_code ON review_incentive_codes(code);
CREATE INDEX IF NOT EXISTS idx_review_incentive_codes_status ON review_incentive_codes(status);
CREATE INDEX IF NOT EXISTS idx_review_incentive_codes_review_id ON review_incentive_codes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_incentive_codes_customer_email ON review_incentive_codes(customer_email);

-- Indexes for product_questions
CREATE INDEX IF NOT EXISTS idx_product_questions_product_id ON product_questions(product_id);
CREATE INDEX IF NOT EXISTS idx_product_questions_status ON product_questions(status);
CREATE INDEX IF NOT EXISTS idx_product_questions_created_at ON product_questions(created_at);

-- Indexes for product_answers
CREATE INDEX IF NOT EXISTS idx_product_answers_question_id ON product_answers(question_id);

-- Insert default review settings
INSERT INTO review_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- Insert default email templates
INSERT INTO review_email_templates (id, type, name, subject, body_html, delay_days) VALUES
  ('default_request', 'request', 'Initial Review Request',
   'How was your {{product_name}}?',
   '<p>Hi {{customer_name}},</p><p>We hope you are enjoying your {{product_name}}!</p><p>Would you take a moment to share your experience?</p><p><a href="{{review_link}}">Leave a Review</a></p><p>Thanks,<br>The {{brand_name}} Team</p>',
   7),
  ('default_reminder_1', 'reminder_1', 'First Reminder',
   'Still loving your {{product_name}}?',
   '<p>Hi {{customer_name}},</p><p>We noticed you have not left a review for your {{product_name}} yet.</p><p>Your feedback helps other customers make informed decisions.</p><p><a href="{{review_link}}">Leave a Review</a></p><p>Thanks,<br>The {{brand_name}} Team</p>',
   3),
  ('default_thank_you', 'thank_you', 'Thank You',
   'Thank you for your review!',
   '<p>Hi {{customer_name}},</p><p>Thank you for taking the time to review your {{product_name}}!</p><p>Your feedback is invaluable to us and helps other customers.</p><p>Thanks,<br>The {{brand_name}} Team</p>',
   0)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE review_email_templates IS 'Email templates for review requests and reminders';
COMMENT ON TABLE review_email_queue IS 'Queue of review request emails to be sent';
COMMENT ON TABLE review_email_logs IS 'Detailed delivery logs for review emails';
COMMENT ON TABLE review_bulk_send_templates IS 'Templates for bulk review request campaigns';
COMMENT ON TABLE review_bulk_campaigns IS 'Bulk review request campaigns';
COMMENT ON TABLE review_bulk_campaign_recipients IS 'Recipients for bulk campaigns';
COMMENT ON TABLE review_incentive_codes IS 'Discount codes offered as incentives for reviews';
COMMENT ON TABLE product_questions IS 'Product Q&A questions from customers';
COMMENT ON TABLE product_answers IS 'Answers to product questions';
COMMENT ON TABLE qa_answer_templates IS 'Reusable answer templates for Q&A';
COMMENT ON TABLE review_settings IS 'Review system configuration per tenant';
COMMENT ON TABLE review_migrations IS 'History of review data migrations';
