-- Migration: 054_mmm_models
-- Description: Marketing Mix Models for attribution and channel optimization
-- Phase: INFRASTRUCTURE-FIX

-- Model status enum
DO $$ BEGIN
  CREATE TYPE mmm_model_status AS ENUM ('training', 'ready', 'failed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS mmm_models (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  status mmm_model_status NOT NULL DEFAULT 'training',
  model_type TEXT DEFAULT 'bayesian' CHECK (model_type IN ('bayesian', 'ridge', 'lasso', 'elasticnet')),
  channels JSONB DEFAULT '[]',
  date_range_start DATE,
  date_range_end DATE,
  metrics JSONB DEFAULT '{}',
  coefficients JSONB DEFAULT '{}',
  contribution_by_channel JSONB DEFAULT '{}',
  adstock_params JSONB DEFAULT '{}',
  saturation_params JSONB DEFAULT '{}',
  model_r_squared DECIMAL(5,4),
  model_mape DECIMAL(5,4),
  training_started_at TIMESTAMPTZ,
  training_completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mmm_models_status ON mmm_models(status);
CREATE INDEX IF NOT EXISTS idx_mmm_models_date_range ON mmm_models(date_range_start, date_range_end);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_mmm_models_updated_at ON mmm_models;
CREATE TRIGGER update_mmm_models_updated_at
  BEFORE UPDATE ON mmm_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE mmm_models IS 'Marketing Mix Models for channel attribution and budget optimization';
COMMENT ON COLUMN mmm_models.channels IS 'JSON array of marketing channels included in the model';
COMMENT ON COLUMN mmm_models.coefficients IS 'Model coefficients for each channel';
COMMENT ON COLUMN mmm_models.contribution_by_channel IS 'Attributed revenue contribution by channel';
COMMENT ON COLUMN mmm_models.adstock_params IS 'Adstock decay parameters per channel';
COMMENT ON COLUMN mmm_models.saturation_params IS 'Saturation curve parameters per channel';
