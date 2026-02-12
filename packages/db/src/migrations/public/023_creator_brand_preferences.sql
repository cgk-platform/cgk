-- Creator Brand Preferences table
-- Stores creator's general preferences for brand partnerships
-- NOT per-brand specific - this is what KIND of brands they want to work with

CREATE TABLE IF NOT EXISTS creator_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to creator
  creator_id UUID NOT NULL UNIQUE REFERENCES creators(id) ON DELETE CASCADE,

  -- Preferred Categories (JSONB array of strings)
  -- e.g., ["fashion", "beauty", "tech", "lifestyle"]
  preferred_categories JSONB NOT NULL DEFAULT '[]',

  -- Content Types (JSONB array of strings)
  -- e.g., ["product_reviews", "tutorials", "lifestyle", "unboxing"]
  content_types JSONB NOT NULL DEFAULT '[]',

  -- Pricing Range Preferences (JSONB)
  -- e.g., {"budget": true, "midrange": true, "premium": false, "luxury": false}
  pricing_ranges JSONB NOT NULL DEFAULT '{"budget": true, "midrange": true, "premium": true, "luxury": true}',

  -- Partnership Types (JSONB array of strings)
  -- e.g., ["affiliate", "sponsored", "ambassador", "ugc"]
  partnership_types JSONB NOT NULL DEFAULT '[]',

  -- Content Format Preferences (JSONB object with proficiency)
  -- e.g., {"video": "expert", "photo": "intermediate", "written": "beginner", "audio": null}
  content_formats JSONB NOT NULL DEFAULT '{}',

  -- Platform Preferences (JSONB object with follower counts)
  -- e.g., {"instagram": 15000, "tiktok": 50000, "youtube": 2000}
  platform_preferences JSONB NOT NULL DEFAULT '{}',

  -- Rate Card (JSONB object with rates per platform/content type)
  -- e.g., {"instagram_post": {"minimum": 200, "preferred": 350}, "tiktok_video": {"minimum": 300, "preferred": 500}}
  rate_card JSONB NOT NULL DEFAULT '{}',

  -- Minimum Rate (in cents) - global minimum the creator will accept
  minimum_rate_cents INTEGER,

  -- Availability
  is_available_for_work BOOLEAN NOT NULL DEFAULT TRUE,
  availability_notes TEXT,

  -- Profile completeness tracking
  profile_completeness_percent INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Brand Exclusion List table
-- Brands the creator explicitly won't work with
CREATE TABLE IF NOT EXISTS creator_brand_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to creator
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  -- Brand identification (can be org_id or just brand name if not in system)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,  -- Store name even if org exists for display

  -- Reason (optional)
  reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one exclusion per creator-brand pair
  UNIQUE(creator_id, COALESCE(organization_id, gen_random_uuid()::UUID), brand_name)
);

-- Trigger for updated_at on creator_preferences
DROP TRIGGER IF EXISTS update_creator_preferences_updated_at ON creator_preferences;
CREATE TRIGGER update_creator_preferences_updated_at
  BEFORE UPDATE ON creator_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for creator_preferences
CREATE INDEX IF NOT EXISTS idx_creator_preferences_creator_id ON creator_preferences(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_preferences_available ON creator_preferences(is_available_for_work) WHERE is_available_for_work = TRUE;
CREATE INDEX IF NOT EXISTS idx_creator_preferences_categories ON creator_preferences USING GIN(preferred_categories);
CREATE INDEX IF NOT EXISTS idx_creator_preferences_platforms ON creator_preferences USING GIN(platform_preferences);

-- Indexes for creator_brand_exclusions
CREATE INDEX IF NOT EXISTS idx_creator_exclusions_creator_id ON creator_brand_exclusions(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_exclusions_org_id ON creator_brand_exclusions(organization_id);

-- Comments
COMMENT ON TABLE creator_preferences IS 'Creator general preferences for brand partnerships - categories, content types, rates, etc.';
COMMENT ON COLUMN creator_preferences.preferred_categories IS 'JSON array of category strings like fashion, beauty, tech';
COMMENT ON COLUMN creator_preferences.content_types IS 'JSON array of content type strings like product_reviews, tutorials';
COMMENT ON COLUMN creator_preferences.pricing_ranges IS 'JSON object with boolean flags for budget, midrange, premium, luxury';
COMMENT ON COLUMN creator_preferences.partnership_types IS 'JSON array of partnership types like affiliate, sponsored, ambassador, ugc';
COMMENT ON COLUMN creator_preferences.content_formats IS 'JSON object mapping format to proficiency level';
COMMENT ON COLUMN creator_preferences.platform_preferences IS 'JSON object mapping platform to follower count';
COMMENT ON COLUMN creator_preferences.rate_card IS 'JSON object with rate configurations per platform/content type';

COMMENT ON TABLE creator_brand_exclusions IS 'Brands a creator explicitly will not work with';
COMMENT ON COLUMN creator_brand_exclusions.brand_name IS 'Brand name for display, stored even if org exists';
COMMENT ON COLUMN creator_brand_exclusions.reason IS 'Optional reason for exclusion';
