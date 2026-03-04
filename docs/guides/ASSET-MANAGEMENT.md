# Asset Management Guide

This guide explains how to set up and manage assets (images, videos, fonts, documents) on your own Vercel Blob Storage. Following the WordPress-style self-hosted architecture, each tenant manages their own asset infrastructure.

## Table of Contents

- [Overview](#overview)
- [Setting Up Vercel Blob Storage](#setting-up-vercel-blob-storage)
- [Environment Configuration](#environment-configuration)
- [Uploading Assets](#uploading-assets)
- [Asset Organization](#asset-organization)
- [Using Assets in Code](#using-assets-in-code)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

## Overview

The CGK Platform uses a self-hosted asset architecture where:

- **Each tenant owns their Vercel Blob Storage** - You bring your own storage account
- **Assets are managed independently** - No shared storage across tenants
- **Full control and isolation** - Your assets, your infrastructure, your security
- **CDN-optimized delivery** - Vercel Blob Storage includes global CDN

This approach ensures:

- Data isolation between tenants
- Scalable asset storage per tenant
- No cross-tenant data leaks
- Predictable pricing (you pay for what you use)

## Setting Up Vercel Blob Storage

### Step 1: Create a Vercel Blob Storage

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Storage** tab
3. Click **Create Database** → **Blob**
4. Name your storage (e.g., "meliusly-assets")
5. Select a region (choose closest to your users)
6. Click **Create**

### Step 2: Get Your Blob Storage Token

After creating your Blob Storage:

1. Click on your newly created Blob Storage
2. Navigate to the **.env.local** tab
3. Copy the `BLOB_READ_WRITE_TOKEN` value
4. Save this token securely - you'll need it for uploads

### Step 3: Get Your Blob Storage URL

1. In the Blob Storage dashboard, click **Browse**
2. Upload a test file (any small image)
3. Copy the URL of the uploaded file
4. The base URL is everything before the filename
   - Example: `https://abc123xyz.public.blob.vercel-storage.com/`
   - From URL: `https://abc123xyz.public.blob.vercel-storage.com/test.png`

## Environment Configuration

### Local Development

Add to `apps/storefront/.env.local`:

```bash
# Asset Management
NEXT_PUBLIC_ASSET_BASE_URL=https://[your-blob-url].public.blob.vercel-storage.com
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_[your-token]
```

### Production (Vercel)

Add environment variables via Vercel CLI or Dashboard:

#### Via Vercel CLI

```bash
cd apps/storefront

# Add production environment variable
vercel env add NEXT_PUBLIC_ASSET_BASE_URL production --scope cgk-linens-88e79683
# Enter: https://[your-blob-url].public.blob.vercel-storage.com

# Add preview environment variable
vercel env add NEXT_PUBLIC_ASSET_BASE_URL preview --scope cgk-linens-88e79683
# Enter: https://[your-blob-url].public.blob.vercel-storage.com

# Add development environment variable
vercel env add NEXT_PUBLIC_ASSET_BASE_URL development --scope cgk-linens-88e79683
# Enter: https://[your-blob-url].public.blob.vercel-storage.com

# Add blob token for server-side uploads (optional, production only)
vercel env add BLOB_READ_WRITE_TOKEN production --scope cgk-linens-88e79683
# Enter: vercel_blob_rw_[your-token]
```

#### Via Vercel Dashboard

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add `NEXT_PUBLIC_ASSET_BASE_URL`:
   - Name: `NEXT_PUBLIC_ASSET_BASE_URL`
   - Value: `https://[your-blob-url].public.blob.vercel-storage.com`
   - Environments: Production, Preview, Development
4. Add `BLOB_READ_WRITE_TOKEN` (for server-side uploads):
   - Name: `BLOB_READ_WRITE_TOKEN`
   - Value: `vercel_blob_rw_[your-token]`
   - Environment: Production only

### Validation

Verify your configuration:

```bash
# From storefront app directory
cd apps/storefront

# Check environment variables are set
node -e "require('dotenv').config({path:'.env.local'}); console.log('Asset URL:', process.env.NEXT_PUBLIC_ASSET_BASE_URL)"
```

Expected output:

```
Asset URL: https://[your-blob-url].public.blob.vercel-storage.com
```

## Uploading Assets

### One-Time Migration

For initial asset upload, use the migration script:

```bash
# Prepare your assets in a directory structure
mkdir -p assets/meliusly/images
mkdir -p assets/meliusly/videos
mkdir -p assets/meliusly/fonts

# Copy your assets to the directory
# ... (copy your files) ...

# Dry run (preview what will be uploaded)
npx tsx scripts/migrate-tenant-assets.ts ./assets/meliusly --dry-run

# Upload assets
npx tsx scripts/migrate-tenant-assets.ts ./assets/meliusly [YOUR_BLOB_TOKEN]

# Or use environment variable
export BLOB_READ_WRITE_TOKEN=vercel_blob_rw_[your-token]
npx tsx scripts/migrate-tenant-assets.ts ./assets/meliusly
```

### Manual Upload via Vercel CLI

For individual files or small batches:

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Upload a single file
vercel blob put path/to/image.png --token vercel_blob_rw_[your-token]

# Upload all files from a directory
vercel blob put path/to/images/* --token vercel_blob_rw_[your-token]
```

### Upload via Vercel Dashboard

1. Go to your Blob Storage in Vercel Dashboard
2. Click **Browse**
3. Click **Upload** button
4. Select files to upload
5. Files are immediately available

## Asset Organization

Recommended directory structure for tenant assets:

```
assets/
└── [tenant-slug]/
    ├── images/
    │   ├── logo.png              # Brand logo
    │   ├── logo-dark.png         # Dark mode logo variant
    │   ├── favicon.ico           # Favicon
    │   ├── hero/
    │   │   ├── home-hero.jpg     # Homepage hero images
    │   │   └── about-hero.jpg
    │   ├── products/
    │   │   ├── product-1.jpg     # Product images
    │   │   ├── product-2.jpg
    │   │   └── ...
    │   ├── categories/
    │   │   ├── bedding.jpg       # Category images
    │   │   └── towels.jpg
    │   └── content/
    │       ├── about-team.jpg    # CMS/content images
    │       └── blog-featured.jpg
    ├── videos/
    │   ├── product-demo.mp4      # Product videos
    │   └── brand-story.mp4
    ├── fonts/
    │   ├── custom-font.woff2     # Custom fonts
    │   └── custom-font.woff
    └── documents/
        ├── size-guide.pdf        # Downloadable documents
        └── care-instructions.pdf
```

### Naming Conventions

- Use lowercase filenames: `logo.png` not `Logo.PNG`
- Use hyphens for spaces: `about-hero.jpg` not `about hero.jpg`
- Use descriptive names: `bedding-hero-1920x1080.jpg` not `img1.jpg`
- Include dimensions in filename for large images: `hero-1920x1080.jpg`
- Use modern formats: `.webp` for images, `.woff2` for fonts

## Using Assets in Code

### React Server Components

```typescript
import { getAssetUrl } from '@/lib/assets'
import { getTenantSlug } from '@/lib/tenant'
import Image from 'next/image'

export default async function HeroSection() {
  const tenantSlug = await getTenantSlug()

  if (!tenantSlug) {
    return null
  }

  const heroImageUrl = await getAssetUrl(tenantSlug, 'images/hero/home-hero.jpg')
  const logoUrl = await getAssetUrl(tenantSlug, 'images/logo.png')

  return (
    <div className="relative">
      <Image
        src={heroImageUrl}
        alt="Hero"
        width={1920}
        height={1080}
        priority
      />
      <Image
        src={logoUrl}
        alt="Logo"
        width={200}
        height={60}
      />
    </div>
  )
}
```

### Client Components

For client components, you'll need to pass the asset URL from server:

```typescript
// app/page.tsx (Server Component)
import { getAssetUrl } from '@/lib/assets'
import { getTenantSlug } from '@/lib/tenant'
import { HeroClient } from './HeroClient'

export default async function HomePage() {
  const tenantSlug = await getTenantSlug()

  if (!tenantSlug) {
    return null
  }

  const heroImageUrl = await getAssetUrl(tenantSlug, 'images/hero/home-hero.jpg')

  return <HeroClient imageUrl={heroImageUrl} />
}

// ./HeroClient.tsx (Client Component)
'use client'

import Image from 'next/image'

interface HeroClientProps {
  imageUrl: string
}

export function HeroClient({ imageUrl }: HeroClientProps) {
  return (
    <Image
      src={imageUrl}
      alt="Hero"
      width={1920}
      height={1080}
    />
  )
}
```

### Background Images (CSS)

```typescript
import { getAssetUrl } from '@/lib/assets'
import { getTenantSlug } from '@/lib/tenant'

export default async function HeroSection() {
  const tenantSlug = await getTenantSlug()

  if (!tenantSlug) {
    return null
  }

  const bgImageUrl = await getAssetUrl(tenantSlug, 'images/hero/home-hero.jpg')

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url("${bgImageUrl}")` }}
    >
      {/* Content */}
    </div>
  )
}
```

### Multiple Assets

```typescript
import { getAssetUrl } from '@/lib/assets'
import { getTenantSlug } from '@/lib/tenant'

export default async function ProductGallery() {
  const tenantSlug = await getTenantSlug()

  if (!tenantSlug) {
    return null
  }

  const imagePaths = [
    'products/bedding-1.jpg',
    'products/bedding-2.jpg',
    'products/bedding-3.jpg',
  ]

  // Get all URLs in parallel
  const imageUrls = await Promise.all(
    imagePaths.map(path => getAssetUrl(tenantSlug, path))
  )

  return (
    <div className="grid grid-cols-3 gap-4">
      {imageUrls.map((url, index) => (
        <Image
          key={index}
          src={url}
          alt={`Product ${index + 1}`}
          width={400}
          height={400}
        />
      ))}
    </div>
  )
}
```

### Downloadable Files

```typescript
import { getAssetUrl } from '@/lib/assets'
import { getTenantSlug } from '@/lib/tenant'

export default async function DownloadSection() {
  const tenantSlug = await getTenantSlug()

  if (!tenantSlug) {
    return null
  }

  const sizeGuideUrl = await getAssetUrl(tenantSlug, 'documents/size-guide.pdf')
  const careGuideUrl = await getAssetUrl(tenantSlug, 'documents/care-instructions.pdf')

  return (
    <div className="space-y-4">
      <a
        href={sizeGuideUrl}
        download
        className="btn btn-primary"
      >
        Download Size Guide (PDF)
      </a>
      <a
        href={careGuideUrl}
        download
        className="btn btn-secondary"
      >
        Download Care Instructions (PDF)
      </a>
    </div>
  )
}
```

### Video Assets

```typescript
import { getAssetUrl } from '@/lib/assets'
import { getTenantSlug } from '@/lib/tenant'

export default async function ProductVideo() {
  const tenantSlug = await getTenantSlug()

  if (!tenantSlug) {
    return null
  }

  const videoUrl = await getAssetUrl(tenantSlug, 'videos/product-demo.mp4')
  const posterUrl = await getAssetUrl(tenantSlug, 'images/video-poster.jpg')

  return (
    <video
      controls
      poster={posterUrl}
      className="w-full rounded-lg"
    >
      <source src={videoUrl} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  )
}
```

## Troubleshooting

### Error: "Asset base URL not configured"

**Cause**: Missing `NEXT_PUBLIC_ASSET_BASE_URL` environment variable.

**Solution**:

1. Check `.env.local` file exists: `ls apps/storefront/.env.local`
2. Verify variable is set: `cat apps/storefront/.env.local | grep NEXT_PUBLIC_ASSET_BASE_URL`
3. Add if missing:
   ```bash
   echo "NEXT_PUBLIC_ASSET_BASE_URL=https://[your-blob-url].public.blob.vercel-storage.com" >> apps/storefront/.env.local
   ```
4. Restart dev server: `pnpm dev`

### Error: "Tenant configuration not found"

**Cause**: Tenant slug not found in request headers or database.

**Solution**:

1. Verify middleware is setting tenant headers correctly
2. Check tenant exists in database:
   ```sql
   SELECT slug, name, status FROM public.organizations WHERE slug = 'meliusly';
   ```
3. Ensure tenant status is 'active'

### Assets not loading (404 errors)

**Cause**: Asset path mismatch or incorrect base URL.

**Solution**:

1. Verify base URL is correct:
   - Go to Vercel Dashboard → Blob Storage
   - Upload test file and check URL format
2. Check asset path matches uploaded file:
   ```bash
   # List all files in blob storage
   vercel blob list --token [YOUR_BLOB_TOKEN]
   ```
3. Verify path in code matches uploaded path exactly (case-sensitive)

### Images loading slowly

**Cause**: Large unoptimized images.

**Solution**:

1. Use Next.js Image component (automatic optimization):

   ```typescript
   import Image from 'next/image'

   <Image src={url} alt="..." width={800} height={600} />
   ```

2. Use modern formats (WebP, AVIF)
3. Implement responsive images:
   ```typescript
   <Image
     src={url}
     alt="..."
     width={800}
     height={600}
     sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
   />
   ```

### Upload fails with "Token invalid"

**Cause**: Invalid or expired Blob Storage token.

**Solution**:

1. Regenerate token in Vercel Dashboard
2. Update environment variable
3. Restart upload script

### Migration script fails on large files

**Cause**: Network timeout or file size limits.

**Solution**:

1. Split large files into smaller batches
2. Upload large video files separately:
   ```bash
   vercel blob put large-video.mp4 --token [TOKEN]
   ```
3. Consider using Mux for video hosting instead of Blob Storage

## Advanced Topics

### Custom CDN Domain

To use your own CDN domain (e.g., `cdn.yourdomain.com`):

1. Set up CNAME in your DNS:

   ```
   cdn.yourdomain.com → [your-blob-url].public.blob.vercel-storage.com
   ```

2. Update tenant settings in database:

   ```sql
   UPDATE public.organizations
   SET settings = jsonb_set(
     settings,
     '{assets}',
     '{"baseUrl": "https://cdn.yourdomain.com", "cdnDomain": "cdn.yourdomain.com"}'
   )
   WHERE slug = 'meliusly';
   ```

3. Assets will now be served from your custom domain

### Image Optimization

For better performance:

1. **Use WebP format**: Smaller file sizes, better quality

   ```bash
   # Convert images to WebP
   cwebp input.jpg -o output.webp -q 80
   ```

2. **Implement responsive images**:

   ```typescript
   <Image
     src={url}
     alt="..."
     width={1920}
     height={1080}
     sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
   />
   ```

3. **Use blur placeholders**:
   ```typescript
   <Image
     src={url}
     alt="..."
     width={800}
     height={600}
     placeholder="blur"
     blurDataURL="data:image/svg+xml;base64,..."
   />
   ```

### Programmatic Uploads

For dynamic asset uploads (user-generated content):

```typescript
// app/api/upload/route.ts
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@cgk-platform/auth'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const blob = await put(`uploads/${auth.tenantId}/${file.name}`, file, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  return NextResponse.json({ url: blob.url })
}
```

### Multi-Tenant Asset Isolation

Ensure assets are properly isolated between tenants:

```typescript
// Good: Tenant-scoped path
await getAssetUrl(tenantSlug, 'images/logo.png')
// → https://blob-url/images/logo.png (isolated by tenant config)

// Bad: Hardcoded URLs (no tenant isolation)
const url = 'https://hardcoded-url.com/logo.png'
```

### Monitoring and Analytics

Track asset usage:

1. Enable Vercel Blob Storage analytics in dashboard
2. Monitor bandwidth and storage costs
3. Set up alerts for unusual usage patterns
4. Review access logs for security

### Backup Strategy

Recommended backup approach:

1. **Version control for source assets**: Keep original assets in git or cloud storage
2. **Periodic exports**: Download all blob assets monthly:
   ```bash
   # List and download all assets
   vercel blob list --token [TOKEN] > asset-list.json
   # Download each asset programmatically
   ```
3. **Disaster recovery**: Document blob token regeneration process
4. **Multi-region redundancy**: Vercel Blob Storage is automatically replicated

## Additional Resources

- [Vercel Blob Storage Docs](https://vercel.com/docs/storage/vercel-blob)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [CGK Multi-Tenancy Guide](./multi-tenancy.md)
- [Environment Variables Reference](../environment-variables-reference.md)

## Support

If you encounter issues not covered in this guide:

1. Check Vercel Blob Storage status: https://www.vercel-status.com/
2. Review Vercel Blob Storage logs in dashboard
3. Contact Vercel support for infrastructure issues
4. Open a GitHub issue for CGK platform-specific problems
