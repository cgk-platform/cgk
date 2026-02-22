-- Migration: 066_brand_context_documents
-- Description: Create brand_context_documents table for MCP content tools
-- Phase: MCP Knowledge Pipeline
-- Refs: packages/mcp/src/tools/content.ts

DO $$ BEGIN
  CREATE TYPE document_category AS ENUM (
    'brand_voice', 'product_info', 'faq', 'policies', 'guidelines', 'templates'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS brand_context_documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category document_category NOT NULL DEFAULT 'guidelines',
  tags JSONB DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_context_docs_category ON brand_context_documents(category);
CREATE INDEX IF NOT EXISTS idx_brand_context_docs_slug ON brand_context_documents(slug);
CREATE INDEX IF NOT EXISTS idx_brand_context_docs_active ON brand_context_documents(is_active);
CREATE INDEX IF NOT EXISTS idx_brand_context_docs_created_at ON brand_context_documents(created_at);

DROP TRIGGER IF EXISTS set_brand_context_documents_updated_at ON brand_context_documents;
CREATE TRIGGER set_brand_context_documents_updated_at
  BEFORE UPDATE ON brand_context_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE brand_context_documents IS 'Brand context documents for MCP content tools (knowledge base)';
COMMENT ON COLUMN brand_context_documents.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN brand_context_documents.category IS 'Document category: brand_voice, product_info, faq, policies, guidelines, templates';
COMMENT ON COLUMN brand_context_documents.tags IS 'JSON array of string tags for filtering';
COMMENT ON COLUMN brand_context_documents.version IS 'Document version, incremented on updates';
