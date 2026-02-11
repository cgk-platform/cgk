-- Subscriptions Management Tables
-- Complete subscription lifecycle management with provider abstraction

-- Subscription status enum
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled', 'expired', 'pending');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Subscription frequency enum
DO $$ BEGIN
  CREATE TYPE subscription_frequency AS ENUM ('weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'semiannually', 'annually');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Subscription provider enum
DO $$ BEGIN
  CREATE TYPE subscription_provider AS ENUM ('loop', 'custom', 'recharge', 'bold');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Save flow type enum
DO $$ BEGIN
  CREATE TYPE save_flow_type AS ENUM ('cancellation', 'winback', 'at_risk');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Save attempt outcome enum
DO $$ BEGIN
  CREATE TYPE save_attempt_outcome AS ENUM ('saved', 'cancelled', 'pending', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Validation issue severity enum
DO $$ BEGIN
  CREATE TYPE validation_severity AS ENUM ('error', 'warning', 'info');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Main subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Provider references
  provider subscription_provider NOT NULL DEFAULT 'custom',
  provider_subscription_id TEXT,
  shopify_subscription_id TEXT,

  -- Customer reference
  customer_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,

  -- Product info
  product_id TEXT NOT NULL,
  variant_id TEXT,
  product_title TEXT NOT NULL,
  variant_title TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Pricing (stored in cents)
  price_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  discount_type TEXT,  -- percentage, fixed
  discount_code TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Frequency
  frequency subscription_frequency NOT NULL DEFAULT 'monthly',
  frequency_interval INTEGER NOT NULL DEFAULT 1,  -- e.g., 2 for every 2 months

  -- Status
  status subscription_status NOT NULL DEFAULT 'active',
  pause_reason TEXT,
  cancel_reason TEXT,
  paused_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  auto_resume_at TIMESTAMPTZ,

  -- Billing
  next_billing_date TIMESTAMPTZ,
  last_billing_date TIMESTAMPTZ,
  billing_anchor_day INTEGER,  -- Day of month for billing

  -- Payment
  payment_method_id TEXT,
  payment_method_last4 TEXT,
  payment_method_brand TEXT,
  payment_method_exp_month INTEGER,
  payment_method_exp_year INTEGER,

  -- Shipping
  shipping_address JSONB,

  -- Lifecycle stats
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent_cents INTEGER NOT NULL DEFAULT 0,
  skipped_orders INTEGER NOT NULL DEFAULT 0,

  -- Selling plan (Shopify)
  selling_plan_id TEXT,
  selling_plan_name TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  tags TEXT[],

  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscription orders/charges
CREATE TABLE IF NOT EXISTS subscription_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  order_id TEXT,  -- References orders table if fulfilled

  -- Billing
  scheduled_at TIMESTAMPTZ NOT NULL,
  billed_at TIMESTAMPTZ,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled, processing, completed, failed, skipped
  failure_reason TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscription activity log
CREATE TABLE IF NOT EXISTS subscription_activity (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

  -- Activity details
  activity_type TEXT NOT NULL,  -- created, paused, resumed, cancelled, skipped, frequency_changed, etc.
  description TEXT,
  metadata JSONB DEFAULT '{}',

  -- Actor
  actor_type TEXT NOT NULL DEFAULT 'system',  -- customer, admin, system
  actor_id TEXT,
  actor_name TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscription save flows (retention)
CREATE TABLE IF NOT EXISTS subscription_save_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Flow configuration
  name TEXT NOT NULL,
  description TEXT,
  flow_type save_flow_type NOT NULL,

  -- Trigger conditions
  trigger_conditions JSONB NOT NULL DEFAULT '{}',

  -- Flow steps
  steps JSONB NOT NULL DEFAULT '[]',

  -- Offers available
  offers JSONB NOT NULL DEFAULT '[]',

  -- Status
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,

  -- Stats
  total_triggered INTEGER NOT NULL DEFAULT 0,
  total_saved INTEGER NOT NULL DEFAULT 0,
  revenue_saved_cents INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Save flow attempts
CREATE TABLE IF NOT EXISTS subscription_save_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  flow_id UUID NOT NULL REFERENCES subscription_save_flows(id) ON DELETE CASCADE,

  -- Attempt details
  outcome save_attempt_outcome NOT NULL DEFAULT 'pending',
  steps_completed JSONB DEFAULT '[]',
  offer_presented TEXT,
  offer_accepted TEXT,
  cancel_reason TEXT,

  -- Revenue impact
  revenue_saved_cents INTEGER,

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Selling plans (Shopify)
CREATE TABLE IF NOT EXISTS subscription_selling_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  shopify_selling_plan_id TEXT,
  shopify_selling_plan_group_id TEXT,

  -- Plan details
  name TEXT NOT NULL,
  description TEXT,

  -- Billing policy
  billing_frequency subscription_frequency NOT NULL,
  billing_interval INTEGER NOT NULL DEFAULT 1,

  -- Delivery policy
  delivery_frequency subscription_frequency NOT NULL,
  delivery_interval INTEGER NOT NULL DEFAULT 1,

  -- Pricing
  discount_type TEXT,  -- percentage, fixed, price
  discount_value INTEGER,  -- Percentage (0-100) or cents

  -- Trial
  trial_days INTEGER,

  -- Commitment
  min_cycles INTEGER,
  max_cycles INTEGER,

  -- Associated products
  product_ids TEXT[],

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Sync
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscription settings
CREATE TABLE IF NOT EXISTS subscription_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',

  -- Provider configuration
  primary_provider subscription_provider NOT NULL DEFAULT 'custom',
  billing_provider subscription_provider NOT NULL DEFAULT 'custom',

  -- API credentials (encrypted)
  loop_api_key TEXT,
  loop_webhook_secret TEXT,
  recharge_api_key TEXT,

  -- Default behaviors
  default_pause_days INTEGER NOT NULL DEFAULT 30,
  max_pause_days INTEGER NOT NULL DEFAULT 90,
  auto_resume_after_pause BOOLEAN NOT NULL DEFAULT true,
  max_skips_per_year INTEGER NOT NULL DEFAULT 4,
  cancellation_grace_days INTEGER NOT NULL DEFAULT 0,

  -- Notifications
  renewal_reminder_days INTEGER NOT NULL DEFAULT 3,
  payment_retry_attempts INTEGER NOT NULL DEFAULT 3,
  payment_retry_interval_hours INTEGER NOT NULL DEFAULT 24,

  -- Feature toggles
  allow_customer_cancel BOOLEAN NOT NULL DEFAULT true,
  allow_customer_pause BOOLEAN NOT NULL DEFAULT true,
  allow_frequency_changes BOOLEAN NOT NULL DEFAULT true,
  allow_quantity_changes BOOLEAN NOT NULL DEFAULT true,
  allow_skip_orders BOOLEAN NOT NULL DEFAULT true,

  -- Shopify sync
  shopify_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  shopify_webhook_url TEXT,

  -- Timestamps
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscription validations
CREATE TABLE IF NOT EXISTS subscription_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Run metadata
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_by TEXT,
  run_type TEXT NOT NULL DEFAULT 'manual',  -- manual, scheduled

  -- Results summary
  total_checked INTEGER NOT NULL DEFAULT 0,
  issues_found INTEGER NOT NULL DEFAULT 0,
  issues_fixed INTEGER NOT NULL DEFAULT 0,

  -- Detailed results
  results JSONB NOT NULL DEFAULT '[]',

  -- Status
  status TEXT NOT NULL DEFAULT 'completed',  -- running, completed, failed

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscription validation issues (for tracking individual issues)
CREATE TABLE IF NOT EXISTS subscription_validation_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id UUID NOT NULL REFERENCES subscription_validations(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Issue details
  issue_type TEXT NOT NULL,
  severity validation_severity NOT NULL DEFAULT 'warning',
  description TEXT NOT NULL,
  suggested_fix TEXT,

  -- Resolution
  is_fixed BOOLEAN NOT NULL DEFAULT false,
  fixed_at TIMESTAMPTZ,
  fixed_by TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscription email templates (extends email_templates)
-- These are specific template types for subscription notifications
INSERT INTO email_templates (notification_type, template_key, category, name, subject, body_html, is_default)
VALUES
  ('subscription', 'order_confirmation', 'transactional', 'Subscription Order Confirmation',
   'Your subscription order is confirmed!',
   '<h1>Order Confirmed</h1><p>Your subscription order #{{order_number}} has been placed.</p>', true),
  ('subscription', 'upcoming_renewal', 'transactional', 'Upcoming Renewal Reminder',
   'Your subscription renews soon',
   '<h1>Renewal Reminder</h1><p>Your subscription will renew on {{renewal_date}}.</p>', true),
  ('subscription', 'payment_failed_1', 'transactional', 'Payment Failed - First Notice',
   'Action needed: Payment failed for your subscription',
   '<h1>Payment Issue</h1><p>We were unable to process payment for your subscription.</p>', true),
  ('subscription', 'payment_failed_2', 'transactional', 'Payment Failed - Second Notice',
   'Urgent: Update your payment method',
   '<h1>Payment Still Pending</h1><p>Please update your payment method to continue your subscription.</p>', true),
  ('subscription', 'payment_failed_3', 'transactional', 'Payment Failed - Final Notice',
   'Final notice: Your subscription will be cancelled',
   '<h1>Last Chance</h1><p>Your subscription will be cancelled unless payment is updated.</p>', true),
  ('subscription', 'payment_expiring', 'transactional', 'Payment Method Expiring Soon',
   'Your payment method is expiring soon',
   '<h1>Update Payment</h1><p>Your payment method ending in {{last4}} expires on {{exp_date}}.</p>', true),
  ('subscription', 'paused', 'transactional', 'Subscription Paused',
   'Your subscription has been paused',
   '<h1>Subscription Paused</h1><p>Your subscription is now paused and will resume on {{resume_date}}.</p>', true),
  ('subscription', 'resumed', 'transactional', 'Subscription Resumed',
   'Your subscription is back!',
   '<h1>Welcome Back!</h1><p>Your subscription has been resumed.</p>', true),
  ('subscription', 'cancelled', 'transactional', 'Subscription Cancelled',
   'Your subscription has been cancelled',
   '<h1>Subscription Cancelled</h1><p>We''re sorry to see you go. Your subscription has been cancelled.</p>', true),
  ('subscription', 'skip_confirmation', 'transactional', 'Order Skip Confirmed',
   'Your next order has been skipped',
   '<h1>Order Skipped</h1><p>Your next subscription order has been skipped.</p>', true),
  ('subscription', 'frequency_changed', 'transactional', 'Subscription Frequency Updated',
   'Your subscription frequency has changed',
   '<h1>Frequency Updated</h1><p>Your subscription is now set to {{frequency}}.</p>', true)
ON CONFLICT (notification_type, template_key) DO NOTHING;

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON subscriptions(provider);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_id ON subscriptions(provider_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_email ON subscriptions(customer_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_product_id ON subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_selling_plan ON subscriptions(selling_plan_id);

-- Indexes for subscription_orders
CREATE INDEX IF NOT EXISTS idx_subscription_orders_subscription ON subscription_orders(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_order ON subscription_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_scheduled ON subscription_orders(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_status ON subscription_orders(status);

-- Indexes for subscription_activity
CREATE INDEX IF NOT EXISTS idx_subscription_activity_subscription ON subscription_activity(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_activity_type ON subscription_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_subscription_activity_created ON subscription_activity(created_at);

-- Indexes for save flows
CREATE INDEX IF NOT EXISTS idx_subscription_save_flows_type ON subscription_save_flows(flow_type);
CREATE INDEX IF NOT EXISTS idx_subscription_save_flows_enabled ON subscription_save_flows(is_enabled);
CREATE INDEX IF NOT EXISTS idx_subscription_save_attempts_subscription ON subscription_save_attempts(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_save_attempts_flow ON subscription_save_attempts(flow_id);
CREATE INDEX IF NOT EXISTS idx_subscription_save_attempts_outcome ON subscription_save_attempts(outcome);

-- Indexes for selling plans
CREATE INDEX IF NOT EXISTS idx_selling_plans_shopify ON subscription_selling_plans(shopify_selling_plan_id);
CREATE INDEX IF NOT EXISTS idx_selling_plans_active ON subscription_selling_plans(is_active);

-- Indexes for validations
CREATE INDEX IF NOT EXISTS idx_subscription_validations_run_at ON subscription_validations(run_at);
CREATE INDEX IF NOT EXISTS idx_subscription_validation_issues_validation ON subscription_validation_issues(validation_id);
CREATE INDEX IF NOT EXISTS idx_subscription_validation_issues_subscription ON subscription_validation_issues(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_validation_issues_type ON subscription_validation_issues(issue_type);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_orders_updated_at ON subscription_orders;
CREATE TRIGGER update_subscription_orders_updated_at
  BEFORE UPDATE ON subscription_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_save_flows_updated_at ON subscription_save_flows;
CREATE TRIGGER update_subscription_save_flows_updated_at
  BEFORE UPDATE ON subscription_save_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_selling_plans_updated_at ON subscription_selling_plans;
CREATE TRIGGER update_subscription_selling_plans_updated_at
  BEFORE UPDATE ON subscription_selling_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_settings_updated_at ON subscription_settings;
CREATE TRIGGER update_subscription_settings_updated_at
  BEFORE UPDATE ON subscription_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE subscriptions IS 'Customer subscription records with provider abstraction';
COMMENT ON TABLE subscription_orders IS 'Scheduled and completed subscription order charges';
COMMENT ON TABLE subscription_activity IS 'Subscription lifecycle event log';
COMMENT ON TABLE subscription_save_flows IS 'Retention flow configurations for cancellation prevention';
COMMENT ON TABLE subscription_save_attempts IS 'Individual save flow attempt records';
COMMENT ON TABLE subscription_selling_plans IS 'Shopify selling plan configurations';
COMMENT ON TABLE subscription_settings IS 'Global subscription settings for the tenant';
COMMENT ON TABLE subscription_validations IS 'Data validation run history';
COMMENT ON TABLE subscription_validation_issues IS 'Individual validation issues found';
