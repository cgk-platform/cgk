# PHASE-9B: DNS and Domain Configuration

**Status**: NOT STARTED
**Duration**: 1-2 hours (plus DNS propagation time)
**Depends On**: PHASE-9A (Credentials configured)
**Blocks**: Production deployment

---

## Goal

Configure custom domains for all platform applications and set up proper DNS routing.

---

## Domain Architecture

```
Platform Domains:
├── platform.yourdomain.com      → orchestrator (super admin)
├── admin.yourdomain.com         → admin (tenant admin)
├── store.yourdomain.com         → storefront (customer-facing)
├── creators.yourdomain.com      → creator-portal
├── contractors.yourdomain.com   → contractor-portal
└── mcp.yourdomain.com           → mcp-server (optional)

Tenant Custom Domains (per-tenant):
├── admin.tenant1.com            → admin (with tenant context)
├── www.tenant1.com              → storefront (with tenant context)
└── creators.tenant1.com         → creator-portal (with tenant context)
```

---

## Step 1: Add Domains in Vercel

### Orchestrator (Super Admin)

```bash
cd apps/orchestrator
vercel domains add platform.yourdomain.com
```

### Admin Portal

```bash
cd apps/admin
vercel domains add admin.yourdomain.com
```

### Storefront

```bash
cd apps/storefront
vercel domains add store.yourdomain.com
```

### Creator Portal

```bash
cd apps/creator-portal
vercel domains add creators.yourdomain.com
```

### Contractor Portal

```bash
cd apps/contractor-portal
vercel domains add contractors.yourdomain.com
```

---

## Step 2: Configure DNS Records

Add these records at your DNS provider (Cloudflare, Route53, etc.):

### CNAME Records (Recommended)

| Subdomain | Type | Value |
|-----------|------|-------|
| platform | CNAME | cname.vercel-dns.com |
| admin | CNAME | cname.vercel-dns.com |
| store | CNAME | cname.vercel-dns.com |
| creators | CNAME | cname.vercel-dns.com |
| contractors | CNAME | cname.vercel-dns.com |

### A Records (Alternative)

| Subdomain | Type | Value |
|-----------|------|-------|
| platform | A | 76.76.21.21 |
| admin | A | 76.76.21.21 |
| store | A | 76.76.21.21 |
| creators | A | 76.76.21.21 |
| contractors | A | 76.76.21.21 |

---

## Step 3: SSL Certificates

Vercel automatically provisions SSL certificates when domains are verified.

### Verification

```bash
# Check domain status
vercel domains ls

# Verify specific domain
vercel domains inspect platform.yourdomain.com
```

---

## Step 4: Environment Variables for Domains

Add domain-specific env vars to each project:

```bash
# Orchestrator
NEXT_PUBLIC_URL=https://platform.yourdomain.com
NEXT_PUBLIC_ADMIN_URL=https://admin.yourdomain.com

# Admin
NEXT_PUBLIC_URL=https://admin.yourdomain.com
NEXT_PUBLIC_STOREFRONT_URL=https://store.yourdomain.com
NEXT_PUBLIC_CREATOR_PORTAL_URL=https://creators.yourdomain.com

# Storefront
NEXT_PUBLIC_URL=https://store.yourdomain.com
NEXT_PUBLIC_ADMIN_URL=https://admin.yourdomain.com

# Creator Portal
NEXT_PUBLIC_URL=https://creators.yourdomain.com
NEXT_PUBLIC_ADMIN_URL=https://admin.yourdomain.com

# Contractor Portal
NEXT_PUBLIC_URL=https://contractors.yourdomain.com
NEXT_PUBLIC_ADMIN_URL=https://admin.yourdomain.com
```

---

## Step 5: Wildcard Domains for Tenants (Optional)

If tenants will have custom subdomains:

### DNS Setup

```
*.tenants.yourdomain.com → CNAME → cname.vercel-dns.com
```

### Vercel Wildcard

```bash
cd apps/admin
vercel domains add "*.tenants.yourdomain.com"
```

### Middleware for Tenant Routing

The platform already supports tenant routing via:
- `x-tenant-id` header
- Subdomain extraction in middleware
- Domain-to-tenant mapping in database

---

## Step 6: Tenant Custom Domains

For tenants with their own domains (e.g., `admin.acme.com`):

### Database Table

```sql
-- Already exists in public.organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS
  custom_domains JSONB DEFAULT '[]';

-- Example:
-- {
--   "admin": "admin.acme.com",
--   "storefront": "shop.acme.com",
--   "creatorPortal": "creators.acme.com"
-- }
```

### Tenant Adds Domain in Vercel

1. Tenant goes to Admin → Settings → Domains
2. Enters their custom domain
3. Platform provides DNS instructions
4. Platform verifies ownership
5. Domain is added to Vercel project

### API Route for Domain Management

```typescript
// POST /api/admin/settings/domains
// - Validates domain ownership (TXT record check)
// - Adds domain to Vercel via API
// - Updates organization.custom_domains
```

---

## Verification Checklist

### Platform Domains

- [ ] `platform.yourdomain.com` → orchestrator (SSL green)
- [ ] `admin.yourdomain.com` → admin (SSL green)
- [ ] `store.yourdomain.com` → storefront (SSL green)
- [ ] `creators.yourdomain.com` → creator-portal (SSL green)
- [ ] `contractors.yourdomain.com` → contractor-portal (SSL green)

### DNS Propagation

- [ ] All CNAME/A records propagated (check with `dig` or online tool)
- [ ] SSL certificates issued by Vercel

### Environment Variables

- [ ] `NEXT_PUBLIC_URL` set for each app
- [ ] Cross-app URLs configured (admin URL in storefront, etc.)

### Tenant Domain Support

- [ ] Wildcard domain configured (if using)
- [ ] Custom domain API routes working
- [ ] Domain verification flow tested

---

## Troubleshooting

### Domain Not Verifying

```bash
# Check DNS propagation
dig +short platform.yourdomain.com

# Check Vercel status
vercel domains inspect platform.yourdomain.com
```

### SSL Certificate Issues

- Wait up to 24 hours for propagation
- Ensure no conflicting CAA records
- Check domain isn't proxied (Cloudflare orange cloud)

### Redirect Loops

- Ensure `NEXT_PUBLIC_URL` matches actual domain
- Check middleware isn't redirecting incorrectly
- Verify tenant context is being set

---

*Last Updated: 2026-02-13*
