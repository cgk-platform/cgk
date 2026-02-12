-- Portal Theme Configuration
-- Stores per-tenant theming settings for the customer portal.
-- Each tenant can customize colors, typography, layout, and branding.

CREATE TABLE IF NOT EXISTS portal_theme_config (
  tenant_id UUID PRIMARY KEY,

  -- Colors - Core palette
  primary_color VARCHAR(7) NOT NULL DEFAULT '#374d42',
  secondary_color VARCHAR(7) NOT NULL DEFAULT '#828282',
  background_color VARCHAR(7) NOT NULL DEFAULT '#f5f5f4',
  card_background_color VARCHAR(7) NOT NULL DEFAULT '#ffffff',
  border_color VARCHAR(7) NOT NULL DEFAULT '#e5e5e5',
  accent_color VARCHAR(7) NOT NULL DEFAULT '#374d42',
  error_color VARCHAR(7) NOT NULL DEFAULT '#dc2626',
  success_color VARCHAR(7) NOT NULL DEFAULT '#16a34a',
  warning_color VARCHAR(7) NOT NULL DEFAULT '#ca8a04',

  -- Colors - Text
  foreground_color VARCHAR(7) NOT NULL DEFAULT '#171717',
  muted_foreground_color VARCHAR(7) NOT NULL DEFAULT '#737373',

  -- Typography
  font_family VARCHAR(255) NOT NULL DEFAULT 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  heading_font_family VARCHAR(255),
  base_font_size INTEGER NOT NULL DEFAULT 16,
  line_height DECIMAL(3,2) NOT NULL DEFAULT 1.50,
  heading_line_height DECIMAL(3,2) NOT NULL DEFAULT 1.20,
  font_weight_normal INTEGER NOT NULL DEFAULT 400,
  font_weight_medium INTEGER NOT NULL DEFAULT 500,
  font_weight_bold INTEGER NOT NULL DEFAULT 700,

  -- Layout
  max_content_width VARCHAR(20) NOT NULL DEFAULT '1200px',
  card_border_radius VARCHAR(20) NOT NULL DEFAULT '8px',
  button_border_radius VARCHAR(20) NOT NULL DEFAULT '6px',
  input_border_radius VARCHAR(20) NOT NULL DEFAULT '6px',
  spacing VARCHAR(20) NOT NULL DEFAULT 'normal',

  -- Branding
  logo_url TEXT,
  logo_height INTEGER NOT NULL DEFAULT 40,
  logo_dark_url TEXT,
  favicon_url TEXT,

  -- Dark mode
  dark_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  dark_mode_default BOOLEAN NOT NULL DEFAULT false,

  -- Dark mode color overrides (null = derive from light mode)
  dark_primary_color VARCHAR(7),
  dark_secondary_color VARCHAR(7),
  dark_background_color VARCHAR(7),
  dark_card_background_color VARCHAR(7),
  dark_border_color VARCHAR(7),
  dark_foreground_color VARCHAR(7),
  dark_muted_foreground_color VARCHAR(7),

  -- Advanced
  custom_css TEXT,
  custom_fonts_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_spacing CHECK (spacing IN ('compact', 'normal', 'relaxed')),
  CONSTRAINT chk_base_font_size CHECK (base_font_size >= 12 AND base_font_size <= 24),
  CONSTRAINT chk_logo_height CHECK (logo_height >= 20 AND logo_height <= 120),
  CONSTRAINT chk_line_height CHECK (line_height >= 1.0 AND line_height <= 2.5),
  CONSTRAINT chk_heading_line_height CHECK (heading_line_height >= 1.0 AND heading_line_height <= 2.0)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_portal_theme_config_updated_at ON portal_theme_config;
CREATE TRIGGER update_portal_theme_config_updated_at
  BEFORE UPDATE ON portal_theme_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE portal_theme_config IS 'Per-tenant theme configuration for customer portal';
COMMENT ON COLUMN portal_theme_config.spacing IS 'Spacing density: compact, normal, or relaxed';
COMMENT ON COLUMN portal_theme_config.custom_css IS 'Additional CSS to inject after theme variables';
COMMENT ON COLUMN portal_theme_config.custom_fonts_url IS 'URL to import custom fonts (e.g., Google Fonts URL)';
