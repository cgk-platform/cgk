# Vercel Environment Variables Setup Guide

**Created**: 2026-02-13
**Purpose**: Quick reference for setting up environment variables in Vercel for all CGK projects

---

## Required Environment Variables for All 5 Projects

The following variables need to be added to all Vercel projects:
- `cgk-admin`
- `cgk-storefront`
- `cgk-orchestrator`
- `cgk-creator-portal`
- `cgk-contractor-portal`

### Cross-App URL Variables

These URLs enable navigation and API callbacks between the different portals.

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_ADMIN_URL` | `https://cgk-admin.vercel.app` | Admin portal URL (team invitations, treasury links) |
| `NEXT_PUBLIC_STOREFRONT_URL` | `https://cgk-storefront.vercel.app` | Storefront URL (product feeds, SEO analysis) |
| `NEXT_PUBLIC_ORCHESTRATOR_URL` | `https://cgk-orchestrator.vercel.app` | Super admin dashboard URL |
| `NEXT_PUBLIC_APP_URL` | (varies by project) | Current app's public URL |
| `APP_URL` | (varies by project) | Server-side app URL for magic links, webhooks |
| `CREATOR_PORTAL_URL` | `https://cgk-creator-portal.vercel.app` | Creator portal (magic links, password reset) |
| `CONTRACTOR_PORTAL_URL` | `https://cgk-contractor-portal.vercel.app` | Contractor portal (magic links, password reset) |
| `STOREFRONT_URL` | `https://cgk-storefront.vercel.app` | Storefront for feeds and discount links |

**Note**: `NEXT_PUBLIC_APP_URL` and `APP_URL` should be set to the current project's URL:
- For `cgk-admin`: `https://cgk-admin.vercel.app`
- For `cgk-storefront`: `https://cgk-storefront.vercel.app`
- For `cgk-orchestrator`: `https://cgk-orchestrator.vercel.app`
- For `cgk-creator-portal`: `https://cgk-creator-portal.vercel.app`
- For `cgk-contractor-portal`: `https://cgk-contractor-portal.vercel.app`

### PDF Generation (Optional)

For treasury draw request PDF generation:

| Variable | Value | Description |
|----------|-------|-------------|
| `PDF_API_KEY` | (your API key) | API key for external PDF generation service |
| `PDF_API_URL` | (service URL) | URL of the PDF generation service |

These are optional - the system falls back to HTML preview if not configured.

### Vercel Blob Storage

| Variable | Value | Description |
|----------|-------|-------------|
| `BLOB_READ_WRITE_TOKEN` | (from Vercel) | Token for Vercel Blob storage |

Get from: Vercel Dashboard > Storage > Blob

### Google Search Console Integration

| Variable | Value | Description |
|----------|-------|-------------|
| `GSC_CLIENT_ID` | (from Google Cloud) | OAuth client ID for GSC |
| `GSC_CLIENT_SECRET` | (from Google Cloud) | OAuth client secret |
| `GSC_REDIRECT_URI` | (callback URL) | OAuth redirect URI |
| `GSC_ENCRYPTION_KEY` | (32-byte key) | Encryption key for token storage |

---

## Quick Setup Commands

### Add a variable to all 5 projects at once:

```bash
VALUE="your-value-here"
VARNAME="VARIABLE_NAME"

for app in admin storefront orchestrator creator-portal contractor-portal; do
  echo "Adding $VARNAME to cgk-$app..."
  (cd apps/$app && \
    printf "$VALUE" | vercel env add $VARNAME production && \
    printf "$VALUE" | vercel env add $VARNAME preview && \
    printf "$VALUE" | vercel env add $VARNAME development)
done
```

### Add cross-app URLs to all projects:

```bash
# Run these commands to set up cross-app URLs

# NEXT_PUBLIC_ADMIN_URL
for app in admin storefront orchestrator creator-portal contractor-portal; do
  (cd apps/$app && \
    printf "https://cgk-admin.vercel.app" | vercel env add NEXT_PUBLIC_ADMIN_URL production && \
    printf "https://cgk-admin.vercel.app" | vercel env add NEXT_PUBLIC_ADMIN_URL preview)
done

# NEXT_PUBLIC_STOREFRONT_URL
for app in admin storefront orchestrator creator-portal contractor-portal; do
  (cd apps/$app && \
    printf "https://cgk-storefront.vercel.app" | vercel env add NEXT_PUBLIC_STOREFRONT_URL production && \
    printf "https://cgk-storefront.vercel.app" | vercel env add NEXT_PUBLIC_STOREFRONT_URL preview)
done

# NEXT_PUBLIC_ORCHESTRATOR_URL
for app in admin storefront orchestrator creator-portal contractor-portal; do
  (cd apps/$app && \
    printf "https://cgk-orchestrator.vercel.app" | vercel env add NEXT_PUBLIC_ORCHESTRATOR_URL production && \
    printf "https://cgk-orchestrator.vercel.app" | vercel env add NEXT_PUBLIC_ORCHESTRATOR_URL preview)
done

# CREATOR_PORTAL_URL
for app in admin storefront orchestrator creator-portal contractor-portal; do
  (cd apps/$app && \
    printf "https://cgk-creator-portal.vercel.app" | vercel env add CREATOR_PORTAL_URL production && \
    printf "https://cgk-creator-portal.vercel.app" | vercel env add CREATOR_PORTAL_URL preview)
done

# CONTRACTOR_PORTAL_URL
for app in admin storefront orchestrator creator-portal contractor-portal; do
  (cd apps/$app && \
    printf "https://cgk-contractor-portal.vercel.app" | vercel env add CONTRACTOR_PORTAL_URL production && \
    printf "https://cgk-contractor-portal.vercel.app" | vercel env add CONTRACTOR_PORTAL_URL preview)
done

# STOREFRONT_URL
for app in admin storefront orchestrator creator-portal contractor-portal; do
  (cd apps/$app && \
    printf "https://cgk-storefront.vercel.app" | vercel env add STOREFRONT_URL production && \
    printf "https://cgk-storefront.vercel.app" | vercel env add STOREFRONT_URL preview)
done
```

### Pull updated env vars to local:

```bash
pnpm env:pull
```

---

## Per-Project APP_URL Setup

Each project needs its own `APP_URL` and `NEXT_PUBLIC_APP_URL`:

```bash
# Admin
cd apps/admin
printf "https://cgk-admin.vercel.app" | vercel env add APP_URL production
printf "https://cgk-admin.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production

# Storefront
cd apps/storefront
printf "https://cgk-storefront.vercel.app" | vercel env add APP_URL production
printf "https://cgk-storefront.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production

# Orchestrator
cd apps/orchestrator
printf "https://cgk-orchestrator.vercel.app" | vercel env add APP_URL production
printf "https://cgk-orchestrator.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production

# Creator Portal
cd apps/creator-portal
printf "https://cgk-creator-portal.vercel.app" | vercel env add APP_URL production
printf "https://cgk-creator-portal.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production

# Contractor Portal
cd apps/contractor-portal
printf "https://cgk-contractor-portal.vercel.app" | vercel env add APP_URL production
printf "https://cgk-contractor-portal.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production
```

---

## Reference: Full .env.example

Each app has a comprehensive `.env.example` file with all variables and documentation:
- `/Users/holdenthemic/Documents/cgk/apps/admin/.env.example`
- `/Users/holdenthemic/Documents/cgk/apps/storefront/.env.example`
- `/Users/holdenthemic/Documents/cgk/apps/orchestrator/.env.example`
- `/Users/holdenthemic/Documents/cgk/apps/creator-portal/.env.example`
- `/Users/holdenthemic/Documents/cgk/apps/contractor-portal/.env.example`
