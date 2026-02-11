-- Sender Address & DNS Configuration Tables
-- Phase 2CM-SENDER-DNS

-- Tenant email domains table
CREATE TABLE IF NOT EXISTS tenant_email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  subdomain TEXT, -- NULL for root domain, 'mail', 'help', etc.
  verification_status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, failed
  verification_token TEXT,
  resend_domain_id TEXT, -- Resend's internal domain ID
  dns_records JSONB, -- DNS records to add {mx, txt_spf, cname_dkim}
  verified_at TIMESTAMPTZ,
  last_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT tenant_email_domains_unique UNIQUE(domain, subdomain)
);

CREATE INDEX IF NOT EXISTS idx_tenant_email_domains_status ON tenant_email_domains(verification_status);
CREATE INDEX IF NOT EXISTS idx_tenant_email_domains_domain ON tenant_email_domains(domain);

-- Tenant sender addresses table
CREATE TABLE IF NOT EXISTS tenant_sender_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES tenant_email_domains(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  display_name TEXT NOT NULL, -- "ACME Orders", "ACME Support"
  purpose TEXT NOT NULL, -- transactional, creator, support, treasury, system
  is_default BOOLEAN DEFAULT false,
  is_inbound_enabled BOOLEAN DEFAULT false, -- Can receive emails?
  reply_to_address TEXT, -- Optional different reply-to
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT tenant_sender_addresses_email_unique UNIQUE(email_address)
);

CREATE INDEX IF NOT EXISTS idx_tenant_sender_addresses_purpose ON tenant_sender_addresses(purpose);
CREATE INDEX IF NOT EXISTS idx_tenant_sender_addresses_domain_id ON tenant_sender_addresses(domain_id);
CREATE INDEX IF NOT EXISTS idx_tenant_sender_addresses_is_default ON tenant_sender_addresses(is_default) WHERE is_default = true;

-- Tenant notification routing table
CREATE TABLE IF NOT EXISTS tenant_notification_routing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  sender_address_id UUID REFERENCES tenant_sender_addresses(id) ON DELETE SET NULL,
  is_enabled BOOLEAN DEFAULT true,
  channel TEXT NOT NULL DEFAULT 'email', -- email, sms, both
  delay_days INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  retry_delay_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT tenant_notification_routing_type_unique UNIQUE(notification_type)
);

CREATE INDEX IF NOT EXISTS idx_tenant_notification_routing_type ON tenant_notification_routing(notification_type);
CREATE INDEX IF NOT EXISTS idx_tenant_notification_routing_sender ON tenant_notification_routing(sender_address_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_tenant_email_domains_updated_at ON tenant_email_domains;
CREATE TRIGGER update_tenant_email_domains_updated_at
  BEFORE UPDATE ON tenant_email_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenant_sender_addresses_updated_at ON tenant_sender_addresses;
CREATE TRIGGER update_tenant_sender_addresses_updated_at
  BEFORE UPDATE ON tenant_sender_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenant_notification_routing_updated_at ON tenant_notification_routing;
CREATE TRIGGER update_tenant_notification_routing_updated_at
  BEFORE UPDATE ON tenant_notification_routing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE tenant_email_domains IS 'Email domains and subdomains configured for tenant email sending';
COMMENT ON TABLE tenant_sender_addresses IS 'Sender email addresses (from addresses) per domain';
COMMENT ON TABLE tenant_notification_routing IS 'Maps notification types to sender addresses and delivery settings';
COMMENT ON COLUMN tenant_email_domains.subdomain IS 'NULL for root domain, or subdomain prefix like mail, help, etc.';
COMMENT ON COLUMN tenant_sender_addresses.purpose IS 'Category: transactional, creator, support, treasury, system';
COMMENT ON COLUMN tenant_notification_routing.channel IS 'Delivery channel: email, sms, or both';
