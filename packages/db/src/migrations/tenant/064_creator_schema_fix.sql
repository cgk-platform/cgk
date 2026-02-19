-- Migration: 064_creator_schema_fix
-- Description: Add first_login_at to tenant creators, create onboarding + agreements tables
-- Phase: REMEDIATION (P0 Schema Fix)
-- Refs: AGENT-16-CREATOR-PORTAL.md
--
-- The public.creators table (016_creators.sql) already has first_login_at.
-- The tenant-schema creators table (004_creators.sql) does NOT — but admin
-- lifecycle code (lifecycle-db.ts) runs inside withTenant() and queries
-- first_login_at on the tenant creators table.

-- ============================================================
-- 1. tenant creators — Add missing lifecycle columns
-- ============================================================

ALTER TABLE creators ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS guided_tour_completed BOOLEAN DEFAULT false;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS welcome_call_reminder_count INTEGER DEFAULT 0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS welcome_call_scheduled_at TIMESTAMPTZ;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS welcome_call_dismissed BOOLEAN DEFAULT false;

-- Columns the onboarding wizard completion writes back
ALTER TABLE creators ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS pronouns TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS social_connections JSONB DEFAULT '[]';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS primary_platform TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS tax_form_type TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS tax_form_signed BOOLEAN DEFAULT false;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_creators_first_login ON creators(first_login_at);
CREATE INDEX IF NOT EXISTS idx_creators_last_login ON creators(last_login_at);
CREATE INDEX IF NOT EXISTS idx_creators_onboarding ON creators(onboarding_completed);

-- ============================================================
-- 2. CREATE TABLE creator_onboarding_wizard_progress
-- ============================================================

CREATE TABLE IF NOT EXISTS creator_onboarding_wizard_progress (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  creator_id TEXT NOT NULL UNIQUE,
  wizard_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_onboard_wizard_creator
  ON creator_onboarding_wizard_progress(creator_id);

DROP TRIGGER IF EXISTS update_creator_onboard_wizard_updated_at ON creator_onboarding_wizard_progress;
CREATE TRIGGER update_creator_onboard_wizard_updated_at
  BEFORE UPDATE ON creator_onboarding_wizard_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE creator_onboarding_wizard_progress IS 'Persistent state for multi-step creator onboarding wizard';
COMMENT ON COLUMN creator_onboarding_wizard_progress.wizard_data IS 'Full OnboardingWizardData JSON blob';

-- ============================================================
-- 3. CREATE TABLE creator_agreement_signatures
-- ============================================================

CREATE TABLE IF NOT EXISTS creator_agreement_signatures (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  creator_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  signed_at TIMESTAMPTZ,
  signature_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (creator_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_agreements_creator
  ON creator_agreement_signatures(creator_id);

COMMENT ON TABLE creator_agreement_signatures IS 'Creator agreement/contract signatures from onboarding';
