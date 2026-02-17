-- Add vector embeddings to kb_articles for semantic search
-- Enables hybrid search (full-text + vector similarity) on knowledge base articles
-- Also adds design-specific KB categories for brand knowledge ingestion

-- Add embedding column to kb_articles (1536d for text-embedding-3-small)
ALTER TABLE kb_articles ADD COLUMN IF NOT EXISTS embedding public.vector(1536);

-- HNSW index for approximate nearest-neighbor vector search
CREATE INDEX IF NOT EXISTS idx_kb_articles_embedding ON kb_articles
  USING hnsw (embedding public.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Insert design knowledge categories (idempotent via ON CONFLICT)
INSERT INTO kb_categories (slug, name, description, icon, sort_order)
VALUES
  ('brand-colors', 'Brand Colors', 'Color palette definitions, usage rules, and combinations', '🎨', 10),
  ('typography', 'Typography', 'Font families, sizing scales, and text styling rules', '🔤', 11),
  ('ad-layouts', 'Ad Layouts', 'Layout patterns and templates by format (1x1, 9x16, 4x5, 16x9)', '📐', 12),
  ('imagery-style', 'Imagery Style', 'Photography direction, image treatment, and visual tone', '📸', 13),
  ('video-style', 'Video Style', 'Video editing patterns, motion graphics, and pacing rules', '🎬', 14),
  ('ad-analysis', 'Ad Analysis', 'Extracted patterns and learnings from analyzed reference ads', '🔍', 15),
  ('design-rules', 'Design Rules', 'Consolidated do''s and don''ts for creative production', '📏', 16)
ON CONFLICT (slug) DO NOTHING;
