-- Customer Loyalty and Referral Program Tables
-- Supports loyalty points, tiers, and referral rewards

-- ============================================================================
-- Referral Program Tables
-- ============================================================================

-- Customer referral codes
CREATE TABLE IF NOT EXISTS customer_referral_codes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Customer who owns the referral code
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- The unique referral code
  code TEXT NOT NULL UNIQUE,

  -- Share URL
  share_url TEXT,

  -- Discount offered to new customers
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value INTEGER NOT NULL DEFAULT 10, -- 10% or $10

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customer_referral_codes_customer ON customer_referral_codes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_referral_codes_code ON customer_referral_codes(code);

COMMENT ON TABLE customer_referral_codes IS 'Unique referral codes for customers';


-- Referral tracking
CREATE TABLE IF NOT EXISTS customer_referrals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Referrer (existing customer)
  referrer_customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  referral_code_id TEXT REFERENCES customer_referral_codes(id) ON DELETE SET NULL,

  -- Referred (new customer)
  referred_email TEXT NOT NULL,
  referred_customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'signed_up', 'converted', 'expired', 'cancelled'

  -- Timestamps
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signed_up_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,

  -- Conversion details
  first_order_id TEXT,
  first_order_total_cents INTEGER
);

CREATE INDEX IF NOT EXISTS idx_customer_referrals_referrer ON customer_referrals(referrer_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_referrals_referred_email ON customer_referrals(referred_email);
CREATE INDEX IF NOT EXISTS idx_customer_referrals_referred_customer ON customer_referrals(referred_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_referrals_status ON customer_referrals(status);

COMMENT ON TABLE customer_referrals IS 'Tracks referral invitations and conversions';


-- Referral rewards
CREATE TABLE IF NOT EXISTS customer_referral_rewards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Who earned the reward
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Related referral
  referral_id TEXT NOT NULL REFERENCES customer_referrals(id) ON DELETE CASCADE,

  -- Reward details
  reward_type TEXT NOT NULL DEFAULT 'store_credit', -- 'store_credit', 'discount', 'points'
  amount_cents INTEGER NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'credited', 'expired'

  -- Timestamps
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  credited_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customer_referral_rewards_customer ON customer_referral_rewards(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_referral_rewards_referral ON customer_referral_rewards(referral_id);
CREATE INDEX IF NOT EXISTS idx_customer_referral_rewards_status ON customer_referral_rewards(status);

COMMENT ON TABLE customer_referral_rewards IS 'Rewards earned from referrals';


-- ============================================================================
-- Loyalty Program Tables
-- ============================================================================

-- Loyalty tier definitions
CREATE TABLE IF NOT EXISTS loyalty_tier_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Tier details
  tier_key TEXT NOT NULL UNIQUE, -- 'bronze', 'silver', 'gold', 'platinum'
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL DEFAULT 0,
  max_points INTEGER, -- NULL for highest tier

  -- Benefits
  benefits JSONB NOT NULL DEFAULT '[]',
  points_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,

  -- Display
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon_url TEXT,
  color TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_tier_config_tier_key ON loyalty_tier_config(tier_key);
CREATE INDEX IF NOT EXISTS idx_loyalty_tier_config_sort_order ON loyalty_tier_config(sort_order);

-- Insert default tiers
INSERT INTO loyalty_tier_config (tier_key, name, min_points, max_points, benefits, points_multiplier, sort_order)
VALUES
  ('bronze', 'Bronze', 0, 999, '["Free shipping on orders over $50", "Birthday bonus points"]', 1.0, 1),
  ('silver', 'Silver', 1000, 4999, '["Free shipping on all orders", "10% bonus points", "Early access to sales"]', 1.1, 2),
  ('gold', 'Gold', 5000, 9999, '["Free express shipping", "20% bonus points", "Exclusive offers", "Priority support"]', 1.2, 3),
  ('platinum', 'Platinum', 10000, NULL, '["Free express shipping", "50% bonus points", "VIP experiences", "Dedicated support", "Exclusive gifts"]', 1.5, 4)
ON CONFLICT (tier_key) DO NOTHING;

COMMENT ON TABLE loyalty_tier_config IS 'Loyalty program tier definitions';


-- Customer loyalty accounts
CREATE TABLE IF NOT EXISTS customer_loyalty_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Customer
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE UNIQUE,

  -- Points balance
  current_points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,

  -- Current tier
  tier_key TEXT NOT NULL DEFAULT 'bronze' REFERENCES loyalty_tier_config(tier_key),

  -- Tier status
  tier_expires_at TIMESTAMPTZ,

  -- Timestamps
  member_since TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_customer_loyalty_accounts_updated_at ON customer_loyalty_accounts;
CREATE TRIGGER update_customer_loyalty_accounts_updated_at
  BEFORE UPDATE ON customer_loyalty_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_customer_loyalty_accounts_customer ON customer_loyalty_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_accounts_tier ON customer_loyalty_accounts(tier_key);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_accounts_points ON customer_loyalty_accounts(current_points);

COMMENT ON TABLE customer_loyalty_accounts IS 'Customer loyalty program accounts';


-- Points transactions
CREATE TABLE IF NOT EXISTS customer_loyalty_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Customer
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  loyalty_account_id TEXT NOT NULL REFERENCES customer_loyalty_accounts(id) ON DELETE CASCADE,

  -- Transaction type
  type TEXT NOT NULL, -- 'earned_purchase', 'earned_review', 'earned_referral', 'earned_birthday', 'earned_signup', 'redeemed', 'expired', 'adjusted'

  -- Points (positive for earned, negative for redeemed/expired)
  points INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,

  -- Description
  description TEXT NOT NULL,

  -- Related entities
  order_id TEXT,
  reward_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customer_loyalty_transactions_customer ON customer_loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_transactions_account ON customer_loyalty_transactions(loyalty_account_id);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_transactions_type ON customer_loyalty_transactions(type);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_transactions_created ON customer_loyalty_transactions(created_at);

COMMENT ON TABLE customer_loyalty_transactions IS 'Points transaction history';


-- Available rewards
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Reward details
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,

  -- Reward type
  reward_type TEXT NOT NULL, -- 'discount', 'free_product', 'free_shipping', 'exclusive_access'
  reward_value INTEGER, -- Discount amount in cents, etc.

  -- Display
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Availability
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  min_tier TEXT REFERENCES loyalty_tier_config(tier_key),
  quantity_available INTEGER, -- NULL for unlimited
  quantity_redeemed INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS update_loyalty_rewards_updated_at ON loyalty_rewards;
CREATE TRIGGER update_loyalty_rewards_updated_at
  BEFORE UPDATE ON loyalty_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_active ON loyalty_rewards(is_active);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_points_cost ON loyalty_rewards(points_cost);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_type ON loyalty_rewards(reward_type);

-- Insert some default rewards
INSERT INTO loyalty_rewards (name, description, points_cost, reward_type, reward_value, sort_order)
VALUES
  ('$5 Off', 'Get $5 off your next order', 500, 'discount', 500, 1),
  ('$10 Off', 'Get $10 off your next order', 900, 'discount', 1000, 2),
  ('$25 Off', 'Get $25 off your next order', 2000, 'discount', 2500, 3),
  ('Free Shipping', 'Free shipping on your next order', 300, 'free_shipping', NULL, 4),
  ('$50 Off', 'Get $50 off your next order', 3500, 'discount', 5000, 5)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE loyalty_rewards IS 'Available rewards to redeem with points';


-- Redeemed rewards
CREATE TABLE IF NOT EXISTS customer_redeemed_rewards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Customer
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  loyalty_account_id TEXT NOT NULL REFERENCES customer_loyalty_accounts(id) ON DELETE CASCADE,

  -- Reward
  reward_id TEXT NOT NULL REFERENCES loyalty_rewards(id) ON DELETE CASCADE,

  -- Points spent
  points_spent INTEGER NOT NULL,

  -- Redemption details
  discount_code TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'used', 'expired'

  -- Timestamps
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customer_redeemed_rewards_customer ON customer_redeemed_rewards(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_redeemed_rewards_reward ON customer_redeemed_rewards(reward_id);
CREATE INDEX IF NOT EXISTS idx_customer_redeemed_rewards_status ON customer_redeemed_rewards(status);

COMMENT ON TABLE customer_redeemed_rewards IS 'Rewards redeemed by customers';
