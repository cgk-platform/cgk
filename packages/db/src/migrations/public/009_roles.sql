-- Roles and Permissions tables
-- RBAC system for granular access control

-- Roles table (predefined + custom per-tenant)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL for predefined (platform-wide) roles, set for custom (tenant-scoped) roles
  tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Role name (unique per tenant or per predefined)
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Array of permission strings (e.g., ["creators.*", "orders.view"])
  permissions JSONB NOT NULL DEFAULT '[]',

  -- Role metadata
  is_predefined BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT TRUE,

  -- Optional parent role for inheritance (single-level only)
  parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique role name per tenant (or globally for predefined)
  CONSTRAINT unique_role_name_per_tenant UNIQUE NULLS NOT DISTINCT (tenant_id, name)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_predefined ON roles(is_predefined) WHERE is_predefined = true;
CREATE INDEX IF NOT EXISTS idx_roles_parent ON roles(parent_role_id);

-- Add role_id to user_organizations to link to the new RBAC roles
ALTER TABLE user_organizations
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_org_role_id ON user_organizations(role_id);

-- Seed predefined roles with well-known UUIDs
INSERT INTO roles (id, name, description, permissions, is_predefined, can_delete)
VALUES
  -- Tenant Admin: Full access
  (
    '00000000-0000-0000-0000-000000000001',
    'Tenant Admin',
    'Full access to all tenant features',
    '["*"]',
    TRUE,
    FALSE
  ),
  -- Manager: Operations without billing
  (
    '00000000-0000-0000-0000-000000000002',
    'Manager',
    'Manage operations without billing access',
    '["tenant.settings.view", "team.*", "creators.*", "orders.*", "subscriptions.*", "reviews.*", "products.*", "content.*", "dam.*", "integrations.*", "analytics.*", "reports.export"]',
    TRUE,
    FALSE
  ),
  -- Finance: Financial operations
  (
    '00000000-0000-0000-0000-000000000003',
    'Finance',
    'Financial operations and reporting',
    '["orders.view", "subscriptions.view", "creators.payments.view", "creators.payments.approve", "payouts.*", "treasury.*", "expenses.*", "analytics.view", "reports.export"]',
    TRUE,
    FALSE
  ),
  -- Creator Manager: Creator relationships
  (
    '00000000-0000-0000-0000-000000000004',
    'Creator Manager',
    'Manage creator relationships and projects',
    '["creators.*", "content.view", "dam.*", "analytics.view"]',
    TRUE,
    FALSE
  ),
  -- Content Manager: Content and reviews
  (
    '00000000-0000-0000-0000-000000000005',
    'Content Manager',
    'Manage content and reviews',
    '["reviews.*", "content.*", "dam.*", "products.view"]',
    TRUE,
    FALSE
  ),
  -- Support: View-only with support tools
  (
    '00000000-0000-0000-0000-000000000006',
    'Support',
    'View-only access with support tools',
    '["orders.view", "subscriptions.view", "creators.view", "reviews.view", "content.view", "products.view"]',
    TRUE,
    FALSE
  ),
  -- Viewer: Read-only dashboards
  (
    '00000000-0000-0000-0000-000000000007',
    'Viewer',
    'Read-only access to dashboards',
    '["*.view"]',
    TRUE,
    FALSE
  )
ON CONFLICT (tenant_id, name) DO NOTHING;

COMMENT ON TABLE roles IS 'RBAC roles - predefined (tenant_id NULL) and custom (per-tenant)';
COMMENT ON COLUMN roles.permissions IS 'JSON array of permission strings. Supports wildcards: "*" (all), "category.*" (all in category), "*.action" (action across categories)';
COMMENT ON COLUMN roles.parent_role_id IS 'Inherit permissions from parent role. Single-level only.';
COMMENT ON COLUMN user_organizations.role_id IS 'Reference to RBAC role. If NULL, falls back to legacy role column.';
