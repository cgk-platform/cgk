-- Migration: 028_esign_core.sql
-- Description: Core E-Signature tables for templates, documents, signers, and fields
-- Phase: PHASE-4C-ESIGN-CORE

-- Contract templates (reusable documents with field placeholders)
CREATE TABLE IF NOT EXISTS esign_templates (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  page_count INTEGER,
  thumbnail_url TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template fields (form fields placed on template)
CREATE TABLE IF NOT EXISTS esign_template_fields (
  id VARCHAR(64) PRIMARY KEY,
  template_id VARCHAR(64) NOT NULL REFERENCES esign_templates(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN (
    'signature', 'initial', 'date_signed', 'text', 'textarea', 'number',
    'date', 'checkbox', 'checkbox_group', 'radio_group', 'dropdown',
    'name', 'email', 'company', 'title', 'attachment', 'formula', 'note'
  )),
  page INTEGER NOT NULL,
  x DECIMAL(6,2) NOT NULL,
  y DECIMAL(6,2) NOT NULL,
  width DECIMAL(6,2) NOT NULL,
  height DECIMAL(6,2) NOT NULL,
  required BOOLEAN DEFAULT true,
  placeholder TEXT,
  default_value TEXT,
  options JSONB,
  validation JSONB DEFAULT '{}',
  group_id VARCHAR(64),
  formula TEXT,
  read_only BOOLEAN DEFAULT false,
  signer_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document instances (created from templates)
CREATE TABLE IF NOT EXISTS esign_documents (
  id VARCHAR(64) PRIMARY KEY,
  template_id VARCHAR(64) REFERENCES esign_templates(id) ON DELETE SET NULL,
  creator_id VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  signed_file_url TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending', 'in_progress', 'completed', 'declined', 'voided', 'expired'
  )),
  expires_at TIMESTAMPTZ,
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_days INTEGER DEFAULT 3,
  last_reminder_at TIMESTAMPTZ,
  message TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Signers on documents
CREATE TABLE IF NOT EXISTS esign_signers (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL REFERENCES esign_documents(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'signer' CHECK (role IN ('signer', 'cc', 'viewer', 'approver')),
  signing_order INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'declined')),
  access_token VARCHAR(64),
  is_internal BOOLEAN DEFAULT false,
  ip_address VARCHAR(45),
  user_agent TEXT,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document fields (instances of template fields per document)
CREATE TABLE IF NOT EXISTS esign_fields (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL REFERENCES esign_documents(id) ON DELETE CASCADE,
  signer_id VARCHAR(64) REFERENCES esign_signers(id) ON DELETE SET NULL,
  template_field_id VARCHAR(64),
  type VARCHAR(20) NOT NULL CHECK (type IN (
    'signature', 'initial', 'date_signed', 'text', 'textarea', 'number',
    'date', 'checkbox', 'checkbox_group', 'radio_group', 'dropdown',
    'name', 'email', 'company', 'title', 'attachment', 'formula', 'note'
  )),
  page INTEGER NOT NULL,
  x DECIMAL(6,2) NOT NULL,
  y DECIMAL(6,2) NOT NULL,
  width DECIMAL(6,2) NOT NULL,
  height DECIMAL(6,2) NOT NULL,
  required BOOLEAN DEFAULT true,
  placeholder TEXT,
  default_value TEXT,
  options JSONB,
  validation JSONB DEFAULT '{}',
  group_id VARCHAR(64),
  formula TEXT,
  read_only BOOLEAN DEFAULT false,
  value TEXT,
  filled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signatures (stored signature images)
CREATE TABLE IF NOT EXISTS esign_signatures (
  id VARCHAR(64) PRIMARY KEY,
  signer_id VARCHAR(64) NOT NULL REFERENCES esign_signers(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('drawn', 'typed', 'uploaded')),
  image_url TEXT NOT NULL,
  font_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for esign_templates
CREATE INDEX IF NOT EXISTS idx_esign_templates_status ON esign_templates(status);
CREATE INDEX IF NOT EXISTS idx_esign_templates_created ON esign_templates(created_at DESC);

-- Indexes for esign_template_fields
CREATE INDEX IF NOT EXISTS idx_esign_template_fields_template ON esign_template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_esign_template_fields_order ON esign_template_fields(template_id, page, y, x);

-- Indexes for esign_documents
CREATE INDEX IF NOT EXISTS idx_esign_documents_status ON esign_documents(status);
CREATE INDEX IF NOT EXISTS idx_esign_documents_template ON esign_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_esign_documents_creator ON esign_documents(creator_id);
CREATE INDEX IF NOT EXISTS idx_esign_documents_created ON esign_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_esign_documents_expires ON esign_documents(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_esign_documents_reminder ON esign_documents(last_reminder_at)
  WHERE reminder_enabled = true AND status IN ('pending', 'in_progress');

-- Indexes for esign_signers
CREATE INDEX IF NOT EXISTS idx_esign_signers_document ON esign_signers(document_id);
CREATE INDEX IF NOT EXISTS idx_esign_signers_token ON esign_signers(access_token) WHERE access_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_esign_signers_email ON esign_signers(email);
CREATE INDEX IF NOT EXISTS idx_esign_signers_status ON esign_signers(document_id, status);

-- Indexes for esign_fields
CREATE INDEX IF NOT EXISTS idx_esign_fields_document ON esign_fields(document_id);
CREATE INDEX IF NOT EXISTS idx_esign_fields_signer ON esign_fields(signer_id) WHERE signer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_esign_fields_order ON esign_fields(document_id, page, y, x);

-- Indexes for esign_signatures
CREATE INDEX IF NOT EXISTS idx_esign_signatures_signer ON esign_signatures(signer_id);

-- Trigger for updated_at on esign_templates
CREATE OR REPLACE FUNCTION update_esign_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS esign_templates_updated_at ON esign_templates;
CREATE TRIGGER esign_templates_updated_at
  BEFORE UPDATE ON esign_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_esign_templates_updated_at();

-- Trigger for updated_at on esign_documents
CREATE OR REPLACE FUNCTION update_esign_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS esign_documents_updated_at ON esign_documents;
CREATE TRIGGER esign_documents_updated_at
  BEFORE UPDATE ON esign_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_esign_documents_updated_at();
