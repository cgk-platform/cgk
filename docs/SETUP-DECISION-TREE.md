# CGK Platform Setup - Which Guide Should I Follow?

> **Last Updated**: 2026-03-03
> **Purpose**: Help you quickly find the right setup guide for your needs

---

## 🎯 Quick Decision Tree

```
┌─────────────────────────────────────────────────────────┐
│  What do you want to do?                                │
└─────────────────────────────────────────────────────────┘
         │
         ├─ "Run platform locally for development"
         │  └─> [Local Development Setup](getting-started/LOCAL-DEVELOPMENT-SETUP.md)
         │      ⏱️  Time: 30 minutes
         │      📋 Need: Node 22, pnpm 10, Git
         │
         ├─ "Deploy my own brand (fork the platform)"
         │  └─> [Brand Deployment Guide](brand-deployment-guide.md)
         │      ⏱️  Time: 2-3 hours
         │      📋 Need: Vercel account, domain, Shopify/Stripe accounts
         │
         ├─ "Set up Meliusly on existing CGK deployment"
         │  └─> [Meliusly Setup Guide](MELIUSLY-SETUP.md)
         │      ⏱️  Time: 1 hour
         │      📋 Need: Shopify Partners account
         │
         ├─ "Add new tenant/brand to existing deployment"
         │  └─> [Multi-Tenant Deployment Guide](multi-tenant-deployment-guide.md)
         │      ⏱️  Time: 1-2 hours
         │      📋 Need: Existing deployment, new brand info
         │
         ├─ "Migrate from single-tenant to multi-tenant"
         │  └─> [Single-to-Multi Tenant Migration](migration-guides/single-to-multi-tenant.md)
         │      ⏱️  Time: 2-4 hours
         │      📋 Need: Existing single-tenant deployment
         │
         ├─ "Update platform from upstream (WordPress-style)"
         │  └─> [Platform Update Guide](platform-update-guide.md)
         │      ⏱️  Time: 30 minutes
         │      📋 Need: Existing fork, git configured
         │
         └─ "Troubleshoot issues"
            └─> [Troubleshooting Guide](TROUBLESHOOTING.md)
                ⏱️  Time: Varies
                📋 Need: Error messages, logs
```

---

## 📖 Detailed Scenarios

### Scenario 1: First-Time Local Development

**You are**: New developer joining the project

**You want**: To run the platform on your machine

**Follow**: [Local Development Setup](getting-started/LOCAL-DEVELOPMENT-SETUP.md)

**Steps**:

1. Install prerequisites (Node 22, pnpm 10)
2. Clone repository
3. Set up database (Docker or Neon)
4. Configure environment variables
5. Run migrations
6. Start dev server

**Expected outcome**: Platform running on `localhost:3200` (admin), `localhost:3300` (storefront)

---

### Scenario 2: Deploy Your Own Brand

**You are**: Brand owner wanting to use CGK Platform

**You want**: Your own deployment with your brand

**Follow**: [Brand Deployment Guide](brand-deployment-guide.md)

**Steps**:

1. Fork `cgk-platform/cgk-template` to your GitHub
2. Customize `platform.config.ts` with your brand
3. Generate secrets: `./scripts/generate-brand-secrets.sh yourbrand`
4. Set up Vercel projects: `./scripts/setup-brand-vercel.sh`
5. Configure environment variables in Vercel
6. Push to main branch (auto-deploys)
7. Set up custom domains

**Expected outcome**: Your brand live at `shop.yourdomain.com`, `admin.yourdomain.com`

---

### Scenario 3: Add Meliusly to Existing CGK Deployment

**You are**: CGK Linens administrator

**You want**: To add Meliusly (sister brand) to the same deployment

**Follow**: [Meliusly Setup Guide](MELIUSLY-SETUP.md)

**Steps**:

1. Update `platform.config.ts` to add Meliusly tenant
2. Create Shopify app for Meliusly
3. Provision tenant: `npx @cgk-platform/cli tenant:create meliusly`
4. Configure Meliusly storefront
5. Add Vercel environment variables
6. Deploy

**Expected outcome**: Meliusly accessible at `shop.meliusly.com` alongside CGK Linens

---

### Scenario 4: Add New Tenant to Your Deployment

**You are**: Platform operator managing multiple brands

**You want**: To add a 3rd, 4th, 5th brand to your existing deployment

**Follow**: [Multi-Tenant Deployment Guide](multi-tenant-deployment-guide.md)

**Steps**:

1. Update `platform.config.ts` with new tenant
2. Provision tenant schema: `npx @cgk-platform/cli tenant:create newbrand`
3. Run migrations for new tenant
4. Configure Shopify/Stripe for new tenant
5. Update Vercel environment variables
6. Deploy

**Expected outcome**: New brand accessible at `shop.newbrand.com`

---

### Scenario 5: Pull Platform Updates (WordPress-style)

**You are**: Brand owner with existing fork

**You want**: To get latest platform features/fixes

**Follow**: [Platform Update Guide](platform-update-guide.md)

**Steps**:

1. Fetch upstream: `git fetch upstream`
2. Review changes: `npx @cgk-platform/cli update-platform --dry-run`
3. Apply update: `npx @cgk-platform/cli update-platform`
4. Run migrations: `npx @cgk-platform/cli migrate:auto`
5. Test locally: `pnpm dev`
6. Deploy: `git push origin main`

**Expected outcome**: Platform updated, your customizations preserved

---

## 🚨 Common Confusion Points

### "Do I need to fork the repository?"

**YES** if:

- You're deploying your own brand
- You want full control over your deployment
- You're managing your own infrastructure

**NO** if:

- You're just developing locally (clone is fine)
- You're working on the core platform (contribute to main repo)
- You're setting up Meliusly on existing CGK deployment

---

### "Single-tenant vs Multi-tenant - which do I use?"

**Single-tenant** (simpler):

- You manage ONE brand
- Simpler configuration
- Set `deployment.mode: 'single-tenant'` in `platform.config.ts`
- Example: VitaHustle manages only VitaHustle

**Multi-tenant** (advanced):

- You manage MULTIPLE brands (sister companies, white-label customers)
- Shared infrastructure, isolated data
- Set `deployment.mode: 'multi-tenant'` in `platform.config.ts`
- Example: CGK Linens + Meliusly in same deployment

---

### "Do I need Shopify/Stripe accounts?"

**For local development**: No (optional)

- Platform works without them
- You'll see warnings but apps will run

**For production deployment**: Yes

- Shopify: Required for product catalog, orders
- Stripe: Required for payments
- Each tenant needs their own accounts

---

### "What's the difference between cgk-template and cgk?"

- **`cgk-template`** (NOT YET CREATED): Clean template repository with NO brand-specific code
  - Fork this when deploying your brand
  - Contains generic platform code only

- **`cgk`** (CURRENT REPO): Development repository
  - Contains CGK Linens + Meliusly configuration
  - Used for platform development
  - Not suitable for forking (has brand-specific code)

**Note**: `cgk-template` will be created as part of Phase 2 implementation (Task #7)

---

## 📚 All Available Guides

| Guide                                                                 | Purpose               | Time      | Prerequisites           |
| --------------------------------------------------------------------- | --------------------- | --------- | ----------------------- |
| [Local Development Setup](getting-started/LOCAL-DEVELOPMENT-SETUP.md) | Run platform locally  | 30 min    | Node 22, pnpm 10        |
| [Brand Deployment Guide](brand-deployment-guide.md)                   | Deploy your own brand | 2-3 hrs   | Vercel, domain, Shopify |
| [Platform Update Guide](platform-update-guide.md)                     | Pull upstream updates | 30 min    | Existing fork           |
| [Meliusly Setup Guide](MELIUSLY-SETUP.md)                             | Add Meliusly brand    | 1 hr      | Shopify Partners        |
| [Multi-Tenant Deployment](multi-tenant-deployment-guide.md)           | Add more tenants      | 1-2 hrs   | Existing deployment     |
| [Environment Variables](environment-variables-reference.md)           | Env var reference     | Reference | N/A                     |
| [Credential Acquisition](getting-started/CREDENTIAL-ACQUISITION.md)   | Get API keys          | Varies    | Accounts for services   |
| [Troubleshooting](TROUBLESHOOTING.md)                                 | Debug issues          | Varies    | Error messages          |

---

## 🆘 Still Confused?

### Check common issues first

1. Read [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Check GitHub Issues: https://github.com/cgk-platform/cgk/issues
3. Review error messages carefully

### Ask for help

- **For platform bugs**: Create GitHub issue
- **For setup help**: Check Discord (link TBD)
- **For commercial support**: Contact CGK team

---

## 🔄 What's Next After Setup?

Once you've completed initial setup:

1. **Verify** everything works:
   - Run `pnpm dev` - All apps start without errors
   - Visit `localhost:3200/api/health` - Returns `{"ok": true}`
   - Create test product, order - Full workflow works

2. **Customize** your deployment:
   - Update `platform.config.ts` with your brand colors, logo
   - Add your Shopify store products
   - Configure Stripe payment flows

3. **Deploy** to production:
   - Push to GitHub main branch
   - Vercel auto-deploys
   - Configure custom domains
   - Run smoke tests

4. **Monitor**:
   - Check Vercel deployment logs
   - Monitor error tracking (Sentry TBD)
   - Watch for webhook failures

---

**This decision tree helps you find the right path quickly, Mr. Tinkleberry.**
