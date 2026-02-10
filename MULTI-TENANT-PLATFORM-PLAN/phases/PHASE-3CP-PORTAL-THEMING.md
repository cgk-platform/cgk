# PHASE-3CP-B: Customer Portal Theming & Customization

**Duration**: 1 week
**Depends On**: PHASE-3A-STOREFRONT-FOUNDATION
**Parallel With**: PHASE-3CP-A, PHASE-3CP-C, PHASE-3CP-D
**Blocks**: None (Customer Portal phases are parallel)

---

## Goal

Implement the complete theming and customization system for the customer portal, enabling tenants to fully white-label the portal experience with custom colors, typography, icons, content strings, and branding.

---

## Success Criteria

- [ ] Theme config applies to all portal components via CSS variables
- [ ] `generateThemeCss()` produces valid CSS from config
- [ ] Icons load from tenant icon system with fallback chain
- [ ] Content strings load from tenant config with variable substitution
- [ ] Custom domains route correctly to tenant portals
- [ ] SSL provisioning works for custom domains
- [ ] Theme changes apply without page reload (client-side)
- [ ] `npx tsc --noEmit` passes

---

## Reference Implementation

**RAWDOG Design Patterns (read for style reference):**
- `/src/app/account/page.tsx` - Card styling, spacing, colors
- `/src/components/ui/AccountIcons.tsx` - Stroke-based SVG icons
- `/tailwind.config.ts` - Color palette, fonts

**Platform Pattern Docs:**
- `/docs/MULTI-TENANT-PLATFORM-PLAN/PROMPT.md` - Customer Portal Patterns section

---

## Deliverables

### 1. Theme Configuration Schema

**Database Table:**
```sql
CREATE TABLE portal_theme_config (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),

  -- Colors
  primary_color VARCHAR(7) DEFAULT '#374d42',
  secondary_color VARCHAR(7) DEFAULT '#828282',
  background_color VARCHAR(7) DEFAULT '#f1f1f0',
  card_background_color VARCHAR(7) DEFAULT '#ffffff',
  border_color VARCHAR(7) DEFAULT '#3d3d3d',
  accent_color VARCHAR(7) DEFAULT '#374d42',
  error_color VARCHAR(7) DEFAULT '#dc2626',
  success_color VARCHAR(7) DEFAULT '#16a34a',

  -- Typography
  font_family VARCHAR(255) DEFAULT 'Space Grotesk, sans-serif',
  heading_font_family VARCHAR(255),
  base_font_size INTEGER DEFAULT 16,
  line_height DECIMAL(3,2) DEFAULT 1.15,

  -- Layout
  max_content_width VARCHAR(20) DEFAULT '1440px',
  card_border_radius VARCHAR(20) DEFAULT '0px',
  button_border_radius VARCHAR(20) DEFAULT '0px',
  spacing VARCHAR(20) DEFAULT 'normal', -- compact, normal, relaxed

  -- Branding
  logo_url TEXT,
  logo_height INTEGER DEFAULT 40,
  favicon_url TEXT,

  -- Advanced
  custom_css TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**TypeScript Interface:**
```typescript
interface PortalThemeConfig {
  tenantId: string

  // Colors
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  cardBackgroundColor: string
  borderColor: string
  accentColor: string
  errorColor: string
  successColor: string

  // Typography
  fontFamily: string
  headingFontFamily?: string
  baseFontSize: number
  lineHeight: number

  // Layout
  maxContentWidth: string
  cardBorderRadius: string
  buttonBorderRadius: string
  spacing: 'compact' | 'normal' | 'relaxed'

  // Branding
  logoUrl?: string
  logoHeight?: number
  faviconUrl?: string

  // Advanced
  customCss?: string
}
```

### 2. Theme CSS Generator

**File:** `packages/portal/src/theme/generator.ts`

```typescript
export function generateThemeCss(theme: PortalThemeConfig): string {
  const spacingValues = {
    compact: { card: '16px', section: '24px', gap: '12px' },
    normal: { card: '24px', section: '32px', gap: '16px' },
    relaxed: { card: '32px', section: '48px', gap: '24px' },
  }

  const spacing = spacingValues[theme.spacing]

  return `
    :root {
      /* Colors */
      --portal-primary: ${theme.primaryColor};
      --portal-secondary: ${theme.secondaryColor};
      --portal-background: ${theme.backgroundColor};
      --portal-card-bg: ${theme.cardBackgroundColor};
      --portal-border: ${theme.borderColor};
      --portal-accent: ${theme.accentColor};
      --portal-error: ${theme.errorColor};
      --portal-success: ${theme.successColor};

      /* Typography */
      --portal-font-family: ${theme.fontFamily};
      --portal-heading-font: ${theme.headingFontFamily || theme.fontFamily};
      --portal-font-size: ${theme.baseFontSize}px;
      --portal-line-height: ${theme.lineHeight};

      /* Layout */
      --portal-max-width: ${theme.maxContentWidth};
      --portal-card-radius: ${theme.cardBorderRadius};
      --portal-button-radius: ${theme.buttonBorderRadius};
      --portal-card-padding: ${spacing.card};
      --portal-section-gap: ${spacing.section};
      --portal-gap: ${spacing.gap};
    }

    ${theme.customCss || ''}
  `
}
```

### 3. Theme Provider Component

**File:** `apps/portal/src/components/providers/ThemeProvider.tsx`

```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { generateThemeCss } from '@cgk/portal/theme'
import type { PortalThemeConfig } from '@cgk/portal/types'

interface ThemeContextValue {
  theme: PortalThemeConfig | null
  isLoading: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: null,
  isLoading: true,
})

export function ThemeProvider({
  tenantId,
  children
}: {
  tenantId: string
  children: React.ReactNode
}) {
  const [theme, setTheme] = useState<PortalThemeConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadTheme() {
      const response = await fetch(`/api/portal/theme?tenantId=${tenantId}`)
      const data = await response.json()
      setTheme(data.theme)
      setIsLoading(false)
    }
    loadTheme()
  }, [tenantId])

  if (isLoading) {
    return <div className="portal-loading">Loading...</div>
  }

  return (
    <ThemeContext.Provider value={{ theme, isLoading }}>
      <style dangerouslySetInnerHTML={{ __html: generateThemeCss(theme!) }} />
      {theme?.logoUrl && (
        <link rel="icon" href={theme.faviconUrl || '/favicon.ico'} />
      )}
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

### 4. Icon System

**Database Tables:**
```sql
CREATE TABLE portal_icon_config (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  icon_set VARCHAR(50) DEFAULT 'rawdog', -- rawdog, lucide, heroicons, custom
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE portal_custom_icons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  icon_key VARCHAR(50) NOT NULL,
  icon_type VARCHAR(20) NOT NULL, -- svg_url, svg_inline
  icon_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, icon_key)
);
```

**Icon Keys:**
- `orders` - Package/box icon
- `subscriptions` - Refresh/repeat icon
- `addresses` - Map pin icon
- `profile` - User icon
- `store_credit` - Wallet icon
- `rewards` - Star/gift icon
- `referrals` - Users/share icon
- `empty_state` - Empty box icon

**Icon Component:**
```typescript
// apps/portal/src/components/icons/PortalIcon.tsx
'use client'

import { useEffect, useState } from 'react'

interface PortalIconProps {
  iconKey: string
  size?: number
  color?: string
  className?: string
}

export function PortalIcon({ iconKey, size = 48, color, className }: PortalIconProps) {
  const [svg, setSvg] = useState<string | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    async function loadIcon() {
      const response = await fetch(`/api/portal/icon/${iconKey}`)
      const data = await response.json()
      setSvg(data.svg)
    }
    loadIcon()
  }, [iconKey])

  if (!svg) return null

  // Replace size and color in SVG
  const processedSvg = svg
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`)
    .replace(/stroke="[^"]*"/g, `stroke="${color || theme?.primaryColor || '#374d42'}"`)

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: processedSvg }}
    />
  )
}
```

### 5. Content Customization System

**Database Table:**
```sql
CREATE TABLE portal_content_strings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  content_key VARCHAR(100) NOT NULL,
  content_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, content_key)
);
```

**Default Content Strings:**
```typescript
export const DEFAULT_CONTENT: Record<string, string> = {
  // Dashboard
  'dashboard.title': 'My Account',
  'dashboard.welcome': 'Welcome back, {{firstName}}',
  'dashboard.signout': 'Sign Out',

  // Orders
  'orders.title': 'Orders',
  'orders.description': 'View order history and track shipments',
  'orders.empty': 'No orders yet',
  'orders.track_shipment': 'Track Shipment',
  'orders.view_details': 'View Details',

  // Subscriptions
  'subscriptions.title': 'Subscriptions',
  'subscriptions.description': 'Manage your recurring orders',
  'subscriptions.empty': 'No active subscriptions',
  'subscriptions.next_order': 'Next order',
  'subscriptions.pause': 'Pause',
  'subscriptions.resume': 'Resume',
  'subscriptions.skip': 'Skip Next Order',
  'subscriptions.cancel': 'Cancel Subscription',
  'subscriptions.reschedule': 'Reschedule',
  'subscriptions.update_payment': 'Update Payment',
  'subscriptions.update_address': 'Update Address',

  // Addresses
  'addresses.title': 'Shipping Addresses',
  'addresses.description': 'Manage delivery addresses for subscriptions',
  'addresses.add': 'Add Address',
  'addresses.edit': 'Edit',
  'addresses.delete': 'Delete',
  'addresses.set_default': 'Set as Default',
  'addresses.default_badge': 'Default',

  // Profile
  'profile.title': 'Profile',
  'profile.description': 'Update your account information',
  'profile.save': 'Save Changes',
  'profile.saved': 'Profile updated successfully',

  // Store Credit
  'store_credit.title': 'Store Credit',
  'store_credit.description': 'View your store credit balance',
  'store_credit.balance': 'Available Balance',
  'store_credit.available_at_checkout': 'Available to use at checkout',

  // Common
  'common.loading': 'Loading...',
  'common.error': 'Something went wrong',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.back': 'Back',
}
```

**Content Hook:**
```typescript
// apps/portal/src/lib/hooks/useContent.ts
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface ContentContextValue {
  content: Record<string, string>
  getContent: (key: string, variables?: Record<string, string>) => string
  isLoading: boolean
}

export function ContentProvider({ tenantId, children }) {
  const [content, setContent] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadContent() {
      const response = await fetch(`/api/portal/content?tenantId=${tenantId}`)
      const data = await response.json()
      setContent({ ...DEFAULT_CONTENT, ...data.content })
      setIsLoading(false)
    }
    loadContent()
  }, [tenantId])

  const getContent = (key: string, variables?: Record<string, string>) => {
    let value = content[key] || key
    if (variables) {
      Object.entries(variables).forEach(([varKey, varValue]) => {
        value = value.replace(new RegExp(`{{${varKey}}}`, 'g'), varValue)
      })
    }
    return value
  }

  return (
    <ContentContext.Provider value={{ content, getContent, isLoading }}>
      {children}
    </ContentContext.Provider>
  )
}

export const useContent = () => useContext(ContentContext)
```

### 6. Custom Domain Routing

**Database Table:**
```sql
CREATE TABLE portal_custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  domain VARCHAR(255) NOT NULL UNIQUE,
  subdomain VARCHAR(100),
  ssl_status VARCHAR(20) DEFAULT 'pending', -- pending, active, failed
  ssl_issued_at TIMESTAMP,
  verified_at TIMESTAMP,
  verification_token VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_portal_domains_domain ON portal_custom_domains(domain);
```

**Middleware:**
```typescript
// apps/portal/src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''

  // Skip for known platform domains
  if (hostname.includes('localhost') || hostname.includes('vercel.app')) {
    return NextResponse.next()
  }

  // Resolve tenant from custom domain
  const tenantId = await resolveTenantFromDomain(hostname)

  if (!tenantId) {
    return NextResponse.redirect(new URL('/404', request.url))
  }

  // Add tenant ID to headers for downstream use
  const response = NextResponse.next()
  response.headers.set('x-tenant-id', tenantId)
  return response
}

async function resolveTenantFromDomain(hostname: string): Promise<string | null> {
  // 1. Check custom domain table
  const custom = await sql`
    SELECT tenant_id FROM portal_custom_domains
    WHERE domain = ${hostname}
      AND ssl_status = 'active'
      AND verified_at IS NOT NULL
  `
  if (custom.rows[0]) {
    return custom.rows[0].tenant_id
  }

  // 2. Check subdomain pattern (acme.portal.platform.com)
  const subdomainMatch = hostname.match(/^([a-z0-9-]+)\.portal\./)
  if (subdomainMatch) {
    const tenant = await sql`
      SELECT id FROM tenants WHERE slug = ${subdomainMatch[1]} AND is_active = true
    `
    return tenant.rows[0]?.id || null
  }

  return null
}
```

**Domain Verification API:**
```typescript
// apps/portal/src/app/api/admin/domains/verify/route.ts
export async function POST(req: Request) {
  const { tenantId, domain } = await req.json()

  // Generate verification token
  const token = crypto.randomUUID()
  const expectedValue = `platform-verify=${token}`

  await sql`
    INSERT INTO portal_custom_domains (tenant_id, domain, verification_token)
    VALUES (${tenantId}, ${domain}, ${token})
    ON CONFLICT (domain) DO UPDATE SET verification_token = ${token}
  `

  return Response.json({
    verification: {
      type: 'TXT',
      name: '_platform-verification',
      value: expectedValue
    }
  })
}
```

---

## File Structure

```
packages/portal/
├── src/
│   ├── theme/
│   │   ├── generator.ts          # generateThemeCss()
│   │   ├── defaults.ts           # Default theme values
│   │   └── types.ts              # PortalThemeConfig
│   ├── icons/
│   │   ├── getIcon.ts            # Icon retrieval with fallback
│   │   ├── sets/
│   │   │   ├── rawdog.ts         # RAWDOG icon set (from AccountIcons.tsx)
│   │   │   ├── lucide.ts         # Lucide icon set
│   │   │   └── heroicons.ts      # Heroicons set
│   │   └── types.ts
│   ├── content/
│   │   ├── getContent.ts         # Content string retrieval
│   │   └── defaults.ts           # Default content strings
│   └── domains/
│       ├── resolve.ts            # Domain -> tenant resolution
│       ├── verify.ts             # DNS verification
│       └── ssl.ts                # SSL provisioning

apps/portal/
├── src/
│   ├── components/
│   │   ├── providers/
│   │   │   ├── ThemeProvider.tsx
│   │   │   └── ContentProvider.tsx
│   │   └── icons/
│   │       └── PortalIcon.tsx
│   └── middleware.ts             # Domain routing middleware
```

---

## Anti-Patterns

```typescript
// ❌ NEVER - Hardcode colors
<div style={{ backgroundColor: '#f1f1f0' }}>

// ✅ ALWAYS - Use CSS variables
<div style={{ backgroundColor: 'var(--portal-background)' }}>

// ❌ NEVER - Hardcode text
<h1>My Account</h1>

// ✅ ALWAYS - Use content system
const { getContent } = useContent()
<h1>{getContent('dashboard.title')}</h1>

// ❌ NEVER - Import icons directly
import { PackageIcon } from '@/components/ui/icons'

// ✅ ALWAYS - Use icon system
<PortalIcon iconKey="orders" size={48} />

// ❌ NEVER - Skip domain verification
await sql`UPDATE ... SET ssl_status = 'active'`

// ✅ ALWAYS - Verify DNS before activating
const verified = await verifyDomainOwnership(tenantId, domain)
if (verified) await provisionSSL(tenantId, domain)
```

---

## Definition of Done

- [ ] Theme config applies via CSS variables
- [ ] Theme changes update without page reload
- [ ] Icon system loads from tenant config
- [ ] Content system supports variable substitution
- [ ] Custom domains resolve to correct tenant
- [ ] SSL provisioning works via Vercel API
- [ ] DNS verification prevents domain hijacking
- [ ] `npx tsc --noEmit` passes
