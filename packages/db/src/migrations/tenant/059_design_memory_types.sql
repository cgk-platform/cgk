-- Add design-related memory types for brand knowledge RAG
-- Extends the memory_type enum with types for design patterns, brand rules, and ad analysis

DO $$ BEGIN
  ALTER TYPE memory_type ADD VALUE IF NOT EXISTS 'design_pattern';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE memory_type ADD VALUE IF NOT EXISTS 'brand_rule';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE memory_type ADD VALUE IF NOT EXISTS 'ad_analysis';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
