-- Knowledge Base tables for customer support self-service
-- Supports articles with categories, full-text search, feedback, and view tracking

-- Knowledge base categories
CREATE TABLE IF NOT EXISTS kb_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),  -- Emoji or icon name (e.g., 'rocket', 'user')
  sort_order INTEGER DEFAULT 0,
  article_count INTEGER DEFAULT 0,  -- Denormalized for performance
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_kb_categories_updated_at ON kb_categories;
CREATE TRIGGER update_kb_categories_updated_at
  BEFORE UPDATE ON kb_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for categories
CREATE INDEX IF NOT EXISTS idx_kb_categories_slug ON kb_categories(slug);
CREATE INDEX IF NOT EXISTS idx_kb_categories_sort ON kb_categories(sort_order);

-- Knowledge base articles
CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) NOT NULL UNIQUE,

  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,  -- HTML content (sanitized)
  excerpt VARCHAR(500),   -- Preview text for search results

  category_id UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',

  is_published BOOLEAN DEFAULT FALSE,
  is_internal BOOLEAN DEFAULT FALSE,  -- Internal docs for agents only

  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,

  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- SEO metadata
  meta_title VARCHAR(70),
  meta_description VARCHAR(160),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_kb_articles_updated_at ON kb_articles;
CREATE TRIGGER update_kb_articles_updated_at
  BEFORE UPDATE ON kb_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for articles
CREATE INDEX IF NOT EXISTS idx_kb_articles_slug ON kb_articles(slug);
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON kb_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_published ON kb_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_kb_articles_internal ON kb_articles(is_internal);
CREATE INDEX IF NOT EXISTS idx_kb_articles_author ON kb_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_published_at ON kb_articles(published_at);
CREATE INDEX IF NOT EXISTS idx_kb_articles_created_at ON kb_articles(created_at);

-- GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_kb_articles_tags ON kb_articles USING GIN (tags);

-- Full-text search index combining title, content, tags
CREATE INDEX IF NOT EXISTS idx_kb_articles_search ON kb_articles
  USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '') || ' ' || COALESCE(array_to_string(tags, ' '), '')));

-- Article feedback (helpful/not helpful)
CREATE TABLE IF NOT EXISTS kb_article_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  comment TEXT,
  visitor_id VARCHAR(100),  -- Anonymous visitor tracking
  ip_hash VARCHAR(64),      -- Hashed IP for rate limiting
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for feedback
CREATE INDEX IF NOT EXISTS idx_kb_feedback_article ON kb_article_feedback(article_id);
CREATE INDEX IF NOT EXISTS idx_kb_feedback_visitor ON kb_article_feedback(visitor_id);
CREATE INDEX IF NOT EXISTS idx_kb_feedback_created_at ON kb_article_feedback(created_at);
-- Partial index for rate limiting (one feedback per visitor per article per day)
CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_feedback_unique_daily
  ON kb_article_feedback(article_id, visitor_id, DATE(created_at))
  WHERE visitor_id IS NOT NULL;

-- Article versions for draft/history tracking
CREATE TABLE IF NOT EXISTS kb_article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  excerpt VARCHAR(500),
  version_number INTEGER NOT NULL,
  is_draft BOOLEAN DEFAULT FALSE,  -- Draft versions vs published history
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for versions
CREATE INDEX IF NOT EXISTS idx_kb_versions_article ON kb_article_versions(article_id);
CREATE INDEX IF NOT EXISTS idx_kb_versions_number ON kb_article_versions(article_id, version_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_versions_unique ON kb_article_versions(article_id, version_number);

-- Function to update article_count in categories
CREATE OR REPLACE FUNCTION update_kb_category_article_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update old category count if category changed
  IF TG_OP = 'UPDATE' AND OLD.category_id IS DISTINCT FROM NEW.category_id THEN
    IF OLD.category_id IS NOT NULL THEN
      UPDATE kb_categories SET article_count = (
        SELECT COUNT(*) FROM kb_articles WHERE category_id = OLD.category_id AND is_published = true
      ) WHERE id = OLD.category_id;
    END IF;
  END IF;

  -- Update new category count
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.category_id IS NOT NULL THEN
    UPDATE kb_categories SET article_count = (
      SELECT COUNT(*) FROM kb_articles WHERE category_id = NEW.category_id AND is_published = true
    ) WHERE id = NEW.category_id;
  END IF;

  -- Handle delete
  IF TG_OP = 'DELETE' AND OLD.category_id IS NOT NULL THEN
    UPDATE kb_categories SET article_count = (
      SELECT COUNT(*) FROM kb_articles WHERE category_id = OLD.category_id AND is_published = true
    ) WHERE id = OLD.category_id;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for article count updates
DROP TRIGGER IF EXISTS update_kb_category_count ON kb_articles;
CREATE TRIGGER update_kb_category_count
  AFTER INSERT OR UPDATE OF category_id, is_published OR DELETE ON kb_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_kb_category_article_count();

-- Function to update helpful/not helpful counts on articles
CREATE OR REPLACE FUNCTION update_kb_article_feedback_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_helpful THEN
      UPDATE kb_articles SET helpful_count = helpful_count + 1 WHERE id = NEW.article_id;
    ELSE
      UPDATE kb_articles SET not_helpful_count = not_helpful_count + 1 WHERE id = NEW.article_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_helpful THEN
      UPDATE kb_articles SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = OLD.article_id;
    ELSE
      UPDATE kb_articles SET not_helpful_count = GREATEST(0, not_helpful_count - 1) WHERE id = OLD.article_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for feedback counts
DROP TRIGGER IF EXISTS update_article_feedback_counts ON kb_article_feedback;
CREATE TRIGGER update_article_feedback_counts
  AFTER INSERT OR DELETE ON kb_article_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_kb_article_feedback_counts();

-- Comments on tables
COMMENT ON TABLE kb_categories IS 'Knowledge base article categories for organizing help content';
COMMENT ON TABLE kb_articles IS 'Knowledge base articles for customer self-service support';
COMMENT ON TABLE kb_article_feedback IS 'Was this helpful? feedback from customers on KB articles';
COMMENT ON TABLE kb_article_versions IS 'Version history for KB articles including drafts';
COMMENT ON COLUMN kb_articles.is_internal IS 'Internal articles visible only to team members, not public customers';
COMMENT ON COLUMN kb_articles.view_count IS 'Number of times this article has been viewed';
COMMENT ON COLUMN kb_article_feedback.visitor_id IS 'Anonymous visitor ID for tracking feedback without authentication';
