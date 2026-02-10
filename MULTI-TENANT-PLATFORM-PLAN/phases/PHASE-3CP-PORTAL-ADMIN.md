# PHASE-3CP-C: Customer Portal Admin Configuration

**Duration**: 1 week
**Depends On**: PHASE-2A-ADMIN-SHELL
**Parallel With**: PHASE-3CP-A, PHASE-3CP-B, PHASE-3CP-D
**Blocks**: None (Customer Portal phases are parallel)

---

## Goal

Create the admin interface for configuring the customer portal. This includes theme customization, icon management, content string editing, feature flag toggles, and custom domain setup.

---

## Success Criteria

- [ ] Theme editor allows customizing all theme properties
- [ ] Color pickers work for all color fields
- [ ] Font selector allows choosing from Google Fonts or custom fonts
- [ ] Logo upload and preview works
- [ ] Icon manager allows selecting icon set or uploading custom icons
- [ ] Content editor allows editing all portal text strings
- [ ] Feature toggles can enable/disable portal features
- [ ] Custom domain setup with DNS verification flow
- [ ] Preview mode shows changes before saving
- [ ] All changes are tenant-isolated
- [ ] `npx tsc --noEmit` passes

---

## Deliverables

### 1. Portal Settings Dashboard

**Route:** `/admin/portal`

**Layout:**
```
+---------------------------+
|     Portal Settings       |
+---------------------------+
| [Theme] [Icons] [Content] |
| [Features] [Domain]       |
+---------------------------+
|                           |
|   Active Tab Content      |
|                           |
+---------------------------+
```

**Tabs:**
1. **Theme** - Colors, typography, layout, branding
2. **Icons** - Icon set selection, custom icon upload
3. **Content** - Text string customization
4. **Features** - Feature flag toggles
5. **Domain** - Custom domain configuration

### 2. Theme Editor

**Route:** `/admin/portal/theme`

**Sections:**

**Colors Section:**
- Primary Color (color picker)
- Secondary Color (color picker)
- Background Color (color picker)
- Card Background Color (color picker)
- Border Color (color picker)
- Accent Color (color picker)
- Error Color (color picker)
- Success Color (color picker)

**Typography Section:**
- Font Family (Google Fonts dropdown + custom input)
- Heading Font Family (optional, Google Fonts dropdown)
- Base Font Size (number input, 12-24px)
- Line Height (number input, 1.0-2.0)

**Layout Section:**
- Max Content Width (input, e.g., "1440px")
- Card Border Radius (input, e.g., "0px", "8px")
- Button Border Radius (input, e.g., "0px", "4px")
- Spacing (select: compact, normal, relaxed)

**Branding Section:**
- Logo Upload (file upload with preview)
- Logo Height (number input)
- Favicon Upload (file upload with preview)

**Advanced Section:**
- Custom CSS (code editor textarea)

**Preview Panel:**
- Live preview of portal with current theme
- Toggle between dashboard, orders, subscriptions views

### 3. Icon Manager

**Route:** `/admin/portal/icons`

**Icon Set Selection:**
- Radio buttons: RAWDOG (default), Lucide, Heroicons, Custom
- Preview of selected icon set

**Custom Icons Section:**
(Visible when "Custom" or individual override)
- Grid of all icon keys (orders, subscriptions, addresses, etc.)
- Each icon shows:
  - Current icon preview
  - Upload button for custom SVG
  - Reset to default button
  - Size preview (48px)

**Icon Keys:**
| Key | Description | Default (RAWDOG) |
|-----|-------------|------------------|
| `orders` | Orders/package icon | PackageIcon |
| `subscriptions` | Subscriptions/refresh icon | RefreshIcon |
| `addresses` | Addresses/map pin icon | MapPinIcon |
| `profile` | Profile/user icon | UserIcon |
| `store_credit` | Store credit/wallet icon | WalletIcon |
| `rewards` | Rewards/star icon | StarIcon |
| `referrals` | Referrals/users icon | UsersIcon |
| `empty_state` | Empty state/box icon | EmptyBoxIcon |

### 4. Content Editor

**Route:** `/admin/portal/content`

**Sections (grouped by page):**

**Dashboard Section:**
| Key | Default | Description |
|-----|---------|-------------|
| `dashboard.title` | My Account | Page title |
| `dashboard.welcome` | Welcome back, {{firstName}} | Welcome message (supports variables) |
| `dashboard.signout` | Sign Out | Sign out button text |

**Orders Section:**
| Key | Default | Description |
|-----|---------|-------------|
| `orders.title` | Orders | Page title |
| `orders.description` | View order history and track shipments | Card description |
| `orders.empty` | No orders yet | Empty state message |
| `orders.track_shipment` | Track Shipment | Tracking button text |

**Subscriptions Section:**
| Key | Default | Description |
|-----|---------|-------------|
| `subscriptions.title` | Subscriptions | Page title |
| `subscriptions.description` | Manage your recurring orders | Card description |
| `subscriptions.empty` | No active subscriptions | Empty state message |
| `subscriptions.pause` | Pause | Pause button text |
| `subscriptions.resume` | Resume | Resume button text |
| `subscriptions.skip` | Skip Next Order | Skip button text |
| `subscriptions.cancel` | Cancel Subscription | Cancel button text |

**Interface:**
- Each string shows: Key, Default Value, Custom Value (editable)
- Markdown preview for longer strings
- Variable syntax highlighted: `{{variableName}}`
- Reset to default button per string
- Bulk reset section button

### 5. Feature Toggles

**Route:** `/admin/portal/features`

**Feature Categories:**

**Core Pages:**
| Feature | Default | Description |
|---------|---------|-------------|
| `orders` | ✅ | Show orders page |
| `subscriptions` | ✅ | Show subscriptions page |
| `addresses` | ✅ | Show addresses page |
| `profile` | ✅ | Show profile page |
| `store_credit` | ✅ | Show store credit page |
| `rewards` | ❌ | Show rewards/loyalty page |
| `referrals` | ❌ | Show referrals page |

**Subscription Actions:**
| Feature | Default | Description |
|---------|---------|-------------|
| `subscription_pause` | ✅ | Allow customers to pause subscriptions |
| `subscription_skip` | ✅ | Allow customers to skip next order |
| `subscription_cancel_self_serve` | ✅ | Allow customers to cancel without support |
| `subscription_reschedule` | ✅ | Allow customers to change delivery date |
| `subscription_payment_update` | ✅ | Allow customers to update payment method |
| `subscription_address_update` | ✅ | Allow customers to change shipping address |

**Interface:**
- Toggle switches for each feature
- Grouped by category
- Warning when disabling core features
- Save button applies all changes

### 6. Custom Domain Setup

**Route:** `/admin/portal/domain`

**Current Domain Display:**
```
Your portal is currently accessible at:
https://your-brand.portal.platform.com
```

**Custom Domain Setup Flow:**

**Step 1: Enter Domain**
- Input field for custom domain (e.g., `account.yourbrand.com`)
- Subdomain vs root domain selection
- Validate domain format

**Step 2: DNS Verification**
- Display required DNS records:
  ```
  Add the following TXT record to your DNS:

  Name: _platform-verification
  Type: TXT
  Value: platform-verify=abc123...
  ```
- "Verify DNS" button
- Status indicator (Pending, Verified, Failed)

**Step 3: SSL Provisioning**
- Automatic after DNS verification
- Status: Provisioning, Active, Failed
- Certificate details (issuer, expiry)

**Step 4: CNAME Setup**
- Display required CNAME record:
  ```
  Add the following CNAME record:

  Name: account (or @ for root)
  Type: CNAME
  Value: portal.platform.com
  ```
- "Verify CNAME" button

**Domain Management:**
- List of configured domains
- Status badges (Active, Pending, Failed)
- Remove domain button
- Refresh verification button

---

## API Routes

### Theme API
```
GET  /api/admin/portal/theme         # Get current theme
PUT  /api/admin/portal/theme         # Update theme
POST /api/admin/portal/theme/preview # Generate preview CSS
POST /api/admin/portal/logo          # Upload logo
POST /api/admin/portal/favicon       # Upload favicon
```

### Icons API
```
GET  /api/admin/portal/icons         # Get icon config
PUT  /api/admin/portal/icons/set     # Set icon set
POST /api/admin/portal/icons/custom  # Upload custom icon
DELETE /api/admin/portal/icons/custom/:key  # Remove custom icon
```

### Content API
```
GET  /api/admin/portal/content       # Get all content strings
PUT  /api/admin/portal/content       # Update content strings
PUT  /api/admin/portal/content/:key  # Update single string
DELETE /api/admin/portal/content/:key # Reset to default
```

### Features API
```
GET  /api/admin/portal/features      # Get all feature flags
PUT  /api/admin/portal/features      # Update feature flags
PUT  /api/admin/portal/features/:key # Update single flag
```

### Domain API
```
GET  /api/admin/portal/domains       # List custom domains
POST /api/admin/portal/domains       # Add custom domain
POST /api/admin/portal/domains/:id/verify  # Verify DNS
POST /api/admin/portal/domains/:id/ssl     # Provision SSL
DELETE /api/admin/portal/domains/:id       # Remove domain
```

---

## File Structure

```
apps/admin/
├── src/
│   ├── app/
│   │   └── admin/
│   │       └── portal/
│   │           ├── page.tsx              # Portal settings dashboard
│   │           ├── theme/
│   │           │   └── page.tsx          # Theme editor
│   │           ├── icons/
│   │           │   └── page.tsx          # Icon manager
│   │           ├── content/
│   │           │   └── page.tsx          # Content editor
│   │           ├── features/
│   │           │   └── page.tsx          # Feature toggles
│   │           └── domain/
│   │               └── page.tsx          # Custom domain setup
│   ├── components/
│   │   └── portal/
│   │       ├── ThemeEditor.tsx
│   │       ├── ColorPicker.tsx
│   │       ├── FontSelector.tsx
│   │       ├── IconManager.tsx
│   │       ├── IconUploader.tsx
│   │       ├── ContentEditor.tsx
│   │       ├── ContentStringRow.tsx
│   │       ├── FeatureToggles.tsx
│   │       ├── DomainSetup.tsx
│   │       ├── DnsVerification.tsx
│   │       └── PortalPreview.tsx
│   └── api/
│       └── admin/
│           └── portal/
│               ├── theme/
│               │   ├── route.ts
│               │   └── preview/route.ts
│               ├── icons/
│               │   ├── route.ts
│               │   └── custom/route.ts
│               ├── content/
│               │   ├── route.ts
│               │   └── [key]/route.ts
│               ├── features/
│               │   └── route.ts
│               └── domains/
│                   ├── route.ts
│                   └── [id]/
│                       ├── verify/route.ts
│                       └── ssl/route.ts
```

---

## Component Examples

### Color Picker Component
```typescript
// apps/admin/src/components/portal/ColorPicker.tsx
interface ColorPickerProps {
  label: string
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-40 text-sm">{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-10 cursor-pointer border rounded"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 px-2 py-1 border rounded font-mono text-sm"
        pattern="^#[0-9A-Fa-f]{6}$"
      />
    </div>
  )
}
```

### Feature Toggle Component
```typescript
// apps/admin/src/components/portal/FeatureToggles.tsx
interface FeatureToggleProps {
  feature: string
  label: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  warning?: string
}

export function FeatureToggle({
  feature, label, description, enabled, onChange, warning
}: FeatureToggleProps) {
  return (
    <div className="flex items-start gap-4 p-4 border rounded">
      <Switch
        checked={enabled}
        onCheckedChange={onChange}
      />
      <div className="flex-1">
        <label className="font-medium">{label}</label>
        <p className="text-sm text-gray-600">{description}</p>
        {warning && !enabled && (
          <p className="text-sm text-amber-600 mt-1">⚠️ {warning}</p>
        )}
      </div>
    </div>
  )
}
```

---

## Anti-Patterns

```typescript
// ❌ NEVER - Allow saving without tenant context
await sql`UPDATE portal_theme_config SET ...`

// ✅ ALWAYS - Include tenant isolation
await withTenant(tenantId, () =>
  sql`UPDATE portal_theme_config SET ... WHERE tenant_id = ${tenantId}`
)

// ❌ NEVER - Skip validation on color input
const color = req.body.primaryColor
await saveTheme({ primaryColor: color })

// ✅ ALWAYS - Validate hex color format
const color = req.body.primaryColor
if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
  return Response.json({ error: 'Invalid color format' }, { status: 400 })
}

// ❌ NEVER - Allow arbitrary CSS without sanitization
const customCss = req.body.customCss
await saveTheme({ customCss })

// ✅ ALWAYS - Sanitize or restrict custom CSS
const sanitizedCss = sanitizeCss(req.body.customCss)
await saveTheme({ customCss: sanitizedCss })

// ❌ NEVER - Skip domain ownership verification
await sql`UPDATE ... SET ssl_status = 'active'`

// ✅ ALWAYS - Verify DNS before SSL
const verified = await verifyDns(domain)
if (!verified) throw new Error('DNS verification failed')
```

---

## Definition of Done

- [ ] Theme editor saves all properties
- [ ] Color pickers work correctly
- [ ] Logo/favicon upload works
- [ ] Icon manager allows set selection and custom upload
- [ ] Content editor allows editing all strings
- [ ] Feature toggles enable/disable features
- [ ] Custom domain flow works end-to-end
- [ ] Preview mode shows changes
- [ ] All changes are tenant-isolated
- [ ] `npx tsc --noEmit` passes
