# Custom Domains & Subdomains (Optional Upgrade)

Your platform works immediately with path-based URLs after deployment:

```
https://mystore.vercel.app              → Storefront
https://mystore.vercel.app/admin        → Admin Portal
https://mystore.vercel.app/creator      → Creator Portal
https://mystore.vercel.app/contractor   → Contractor Portal
https://mystore.vercel.app/orchestrator → Orchestrator
https://mystore.vercel.app/shopify-app  → Shopify App
https://mystore.vercel.app/command-center → Command Center
https://mystore.vercel.app/mcp          → MCP Server
```

**This is production-ready!** Many businesses run successfully on path-based routing.

---

## When to Add Custom Domains

Consider custom domains when:

- ✅ You want professional branding (`mybrand.com` vs `mybrand.vercel.app`)
- ✅ You're ready for public launch
- ✅ You need SEO benefits from owning your domain
- ✅ You want subdomain separation (`admin.mybrand.com`, `shop.mybrand.com`)

**Not needed for**:

- ❌ Testing and development
- ❌ Internal tools
- ❌ MVP/prototype validation

---

## Adding Your Custom Domain (Optional)

### Step 1: Add Primary Domain

1. **Vercel Dashboard** → Your Project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain: `mybrand.com`
4. Follow Vercel's DNS configuration instructions

**DNS Configuration** (varies by provider):

```
# Option A: CNAME (recommended for subdomains)
shop.mybrand.com  CNAME  cname.vercel-dns.com

# Option B: A Record (for root domains)
mybrand.com       A      76.76.21.21
```

### Step 2: Configure Subdomains (Optional)

**Popular subdomain patterns**:

| Subdomain             | Purpose             | Example         |
| --------------------- | ------------------- | --------------- |
| `shop.mybrand.com`    | Customer storefront | Shop products   |
| `admin.mybrand.com`   | Admin portal        | Manage orders   |
| `creator.mybrand.com` | Creator portal      | Creator content |
| `ops.mybrand.com`     | Orchestrator        | Super admin     |
| `app.mybrand.com`     | Shopify app         | Embedded app    |

**Add each subdomain** in Vercel Dashboard:

1. **Settings** → **Domains** → **Add Domain**
2. Enter: `admin.mybrand.com`
3. Update DNS with CNAME record
4. Repeat for each subdomain

### Step 3: Update Vercel Configuration

Add rewrites to `vercel.json` to map subdomains to apps:

```json
{
  "rewrites": [
    {
      "source": "admin.mybrand.com/:path*",
      "destination": "/apps/admin/:path*"
    },
    {
      "source": "creator.mybrand.com/:path*",
      "destination": "/apps/creator-portal/:path*"
    },
    {
      "source": "shop.mybrand.com/:path*",
      "destination": "/apps/storefront/:path*"
    },
    {
      "source": "ops.mybrand.com/:path*",
      "destination": "/apps/orchestrator/:path*"
    }
  ]
}
```

**Note**: Path-based routing continues to work even after adding subdomains.

---

## SSL Certificates (Automatic)

Vercel automatically provisions SSL certificates for all domains:

- ✅ Free Let's Encrypt certificates
- ✅ Auto-renewal every 90 days
- ✅ HTTPS enforced by default
- ✅ No configuration required

---

## DNS Propagation

**Time to live**: 5 minutes to 48 hours (varies by DNS provider)

**Check propagation**:

```bash
# Check DNS resolution
nslookup mybrand.com

# Check SSL certificate
curl -I https://mybrand.com
```

**Faster propagation** (use Cloudflare DNS):

- Cloudflare: ~5 minutes
- GoDaddy: ~1 hour
- Namecheap: ~30 minutes
- Route 53: ~60 seconds

---

## Common Issues

### Issue: "Domain not verified"

**Cause**: DNS records not propagated yet

**Fix**:

1. Wait 5-10 minutes
2. Check DNS with `nslookup mybrand.com`
3. Verify you added correct CNAME/A record

### Issue: "Invalid configuration"

**Cause**: Conflicting domain settings

**Fix**:

1. Remove domain from Vercel
2. Clear DNS cache: `sudo dscacheutil -flushcache` (macOS)
3. Re-add domain with correct settings

### Issue: "SSL certificate pending"

**Cause**: Vercel provisioning certificate

**Fix**: Wait 5-10 minutes. Vercel auto-provisions SSL.

---

## Environment Variables Per Domain

**Different config per subdomain** (advanced):

```typescript
// apps/admin/src/middleware.ts
import { NextResponse } from 'next/server'

export function middleware(request: Request) {
  const url = new URL(request.url)

  // Detect subdomain
  const subdomain = url.hostname.split('.')[0]

  // Apply subdomain-specific logic
  if (subdomain === 'admin') {
    // Admin-specific middleware
  }

  return NextResponse.next()
}
```

---

## Cost

**Vercel domains**:

- First domain: Free (included in all plans)
- Additional domains: Free (unlimited on Pro/Enterprise)
- DNS hosting: Free

**Domain registration** (external):

- Namecheap: ~$10-15/year
- Cloudflare: At-cost (~$8-10/year)
- GoDaddy: ~$12-20/year

---

## Summary

| Aspect                | Path-Based Routing            | Custom Domains                  |
| --------------------- | ----------------------------- | ------------------------------- |
| **Setup time**        | 0 minutes (works immediately) | 5-30 minutes                    |
| **Cost**              | Free                          | ~$10/year (domain registration) |
| **Production-ready?** | ✅ Yes                        | ✅ Yes                          |
| **SEO**               | ⚠️ Vercel subdomain           | ✅ Your domain                  |
| **Branding**          | ⚠️ Generic                    | ✅ Professional                 |
| **When to use**       | Testing, MVPs, internal tools | Public launch, marketing        |

**Recommendation**: Start with path-based routing. Add custom domains when you're ready for public launch.

---

## Next Steps

Once custom domains are configured:

1. **Update platform.config.ts**:

   ```typescript
   domain: 'mybrand.com'
   ```

2. **Update social auth redirects** (Shopify, Stripe):
   - Old: `https://mystore.vercel.app/admin/auth/callback`
   - New: `https://admin.mybrand.com/auth/callback`

3. **Update email links**:
   - Order confirmations
   - Password resets
   - Creator invites

4. **Test all flows**:
   - Admin login
   - Checkout process
   - OAuth integrations

---

**Questions?** See [Vercel Domains Documentation](https://vercel.com/docs/concepts/projects/custom-domains) or ask in [GitHub Discussions](https://github.com/cgk-platform/cgk/discussions).
