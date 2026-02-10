-- Blog posts table
-- Content management for brand blog

-- Blog post status enum
DO $$ BEGIN
  CREATE TYPE blog_post_status AS ENUM ('draft', 'scheduled', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- URL slug
  slug TEXT UNIQUE NOT NULL,

  -- Content
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL,
  body_html TEXT,

  -- Author
  author_name TEXT,
  author_email TEXT,

  -- Status
  status blog_post_status NOT NULL DEFAULT 'draft',

  -- Featured image
  featured_image_url TEXT,
  featured_image_alt TEXT,

  -- SEO
  seo_title TEXT,
  seo_description TEXT,
  canonical_url TEXT,

  -- Categorization
  category TEXT,
  tags TEXT[],

  -- Related products (for shoppable content)
  related_product_ids TEXT[],

  -- Scheduling
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,

  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_email ON blog_posts(author_email);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled_for ON blog_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at);

-- GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN (tags);

-- GIN index for related products
CREATE INDEX IF NOT EXISTS idx_blog_posts_products ON blog_posts USING GIN (related_product_ids);

COMMENT ON TABLE blog_posts IS 'Brand blog content';
COMMENT ON COLUMN blog_posts.body IS 'Markdown content';
COMMENT ON COLUMN blog_posts.body_html IS 'Pre-rendered HTML from Markdown';
COMMENT ON COLUMN blog_posts.related_product_ids IS 'Product IDs for shoppable content blocks';
