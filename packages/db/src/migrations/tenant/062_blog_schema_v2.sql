-- Migration: 062_blog_schema_v2
-- Description: Upgrade blog schema to match normalized v2 code
-- Phase: REMEDIATION (P0 Schema Fix)
-- Refs: AGENT-05-CONTENT-SEO.md
--
-- The blog code (apps/admin/src/lib/blog/db.ts) expects:
--   - blog_authors table (JOINed via author_id FK)
--   - blog_categories table (JOINed via category_id FK)
--   - "content" column instead of "body"
--   - "scheduled_at" instead of "scheduled_for"
--   - "meta_title"/"meta_description" instead of "seo_title"/"seo_description"
--   - "og_image_url" column
--   - "post_status" enum (code casts to ::post_status)
--
-- This migration is ADDITIVE ONLY — existing columns are preserved.

-- ============================================================
-- 1. Create post_status enum (code casts to ::post_status)
--    Existing blog_post_status enum is preserved.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. CREATE TABLE blog_authors
-- ============================================================

CREATE TABLE IF NOT EXISTS blog_authors (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  email TEXT,
  social_links JSONB DEFAULT '{}',
  credentials TEXT[],
  expertise_areas TEXT[],
  is_team_account BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_authors_email ON blog_authors(email);

DROP TRIGGER IF EXISTS update_blog_authors_updated_at ON blog_authors;
CREATE TRIGGER update_blog_authors_updated_at
  BEFORE UPDATE ON blog_authors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE blog_authors IS 'Blog post authors with bios and social links';

-- ============================================================
-- 3. CREATE TABLE blog_categories
-- ============================================================

CREATE TABLE IF NOT EXISTS blog_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_categories_parent ON blog_categories(parent_id);

DROP TRIGGER IF EXISTS update_blog_categories_updated_at ON blog_categories;
CREATE TRIGGER update_blog_categories_updated_at
  BEFORE UPDATE ON blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE blog_categories IS 'Blog post categories with parent hierarchy support';

-- ============================================================
-- 4. blog_posts — Add columns the v2 code expects
--    Existing columns (body, seo_title, etc.) are preserved.
-- ============================================================

-- "content" column — code reads/writes this instead of "body"
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS content TEXT;
-- Backfill content from body for existing rows
UPDATE blog_posts SET content = body WHERE content IS NULL AND body IS NOT NULL;

-- "scheduled_at" — code uses this instead of "scheduled_for"
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
-- Backfill from scheduled_for
UPDATE blog_posts SET scheduled_at = scheduled_for WHERE scheduled_at IS NULL AND scheduled_for IS NOT NULL;

-- "author_id" FK to blog_authors
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS author_id TEXT;

-- "category_id" FK to blog_categories
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS category_id TEXT;

-- "meta_title" and "meta_description" — code uses these instead of seo_*
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_description TEXT;
-- Backfill from seo columns
UPDATE blog_posts SET meta_title = seo_title WHERE meta_title IS NULL AND seo_title IS NOT NULL;
UPDATE blog_posts SET meta_description = seo_description WHERE meta_description IS NULL AND seo_description IS NOT NULL;

-- "og_image_url" — Open Graph image
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- Indexes for new FK columns
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled_at ON blog_posts(scheduled_at);

COMMENT ON COLUMN blog_posts.content IS 'Post content (v2 alias for body column)';
COMMENT ON COLUMN blog_posts.author_id IS 'FK to blog_authors.id';
COMMENT ON COLUMN blog_posts.category_id IS 'FK to blog_categories.id';
