# CGK Platform - Local Development Setup

> **Last Updated**: 2026-03-03
> **Time Required**: 5-10 minutes (cloud-first) or 30 minutes (manual)
> **Difficulty**: Beginner

This guide helps you run the CGK Commerce Platform on your local machine for development.

---

## Three Setup Options

Choose the setup path that fits your workflow:

1. **Cloud-First Quick Start (5-10 minutes)** - Recommended for most developers
2. **Docker Local Setup (10-15 minutes)** - If you prefer local Docker containers
3. **Manual Setup (30 minutes)** - If you want full control

---

## 🚀 Cloud-First Quick Start (5-10 minutes) - RECOMMENDED

**Why cloud-first?** Matches production environment (Neon + Upstash), ensures 12-factor app compliance, and avoids dev/prod mismatches.

### Step 1: Run Architecture Wizard (Optional)

Configure your platform architecture with non-technical questions:

```bash
# Clone repository
git clone https://github.com/your-org/cgk.git
cd cgk

# Run architecture wizard
npx @cgk-platform/cli wizard
```

The wizard will ask:

- What are you building? (E-commerce, Creator marketplace, B2B, etc.)
- How do you want to manage products? (Shopify, Custom)
- What type of website? (Modern React, Shopify theme)
- Checkout provider? (Shopify, Stripe)
- Cache products? (Yes/No)
- Multi-tenant? (Yes/No)

**Output**: `platform.config.ts` and database settings configured.

### Step 2: Run Cloud-First Quick Start

```bash
# Run automated setup (cloud-first)
npx @cgk-platform/cli quick-start
```

This command will:

- ✅ Check prerequisites (Node 22+, pnpm 10+)
- ✅ Prompt for **Neon PostgreSQL** connection string (free tier)
- ✅ Prompt for **Upstash Redis** credentials (free tier)
- ✅ Auto-generate all secrets (JWT, encryption keys, etc.)
- ✅ Create all .env.local files automatically
- ✅ Install dependencies (pnpm install)
- ✅ Run database migrations
- ✅ Start dev server
- ✅ Open browser to http://localhost:3200

**Done!** Platform ready in 5-10 minutes.

### Getting Cloud Database URLs

**Neon PostgreSQL** (free tier):

1. Sign up at https://neon.tech
2. Create a new project
3. Copy connection string from "Connection Details"
4. Paste when prompted by quick-start

**Upstash Redis** (free tier):

1. Sign up at https://upstash.com
2. Create a new Redis database
3. Click "REST API" tab
4. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
5. Paste when prompted by quick-start

---

## 🐳 Docker Local Setup (10-15 minutes)

**Warning**: This creates a dev/prod mismatch (Docker locally, cloud in production). Use only if you have a specific need for local Docker containers.

```bash
# Clone repository
git clone https://github.com/your-org/cgk.git
cd cgk

# Run quick-start with Docker option
npx @cgk-platform/cli quick-start --use-docker
```

This will:

- Start PostgreSQL and Redis in Docker containers
- Auto-generate secrets
- Create .env.local files
- Install dependencies
- Run migrations
- Start dev server

**Why not recommended?** Violates 12-factor app principle of dev/prod parity. Your local Docker environment won't match Vercel production (Neon + Upstash).

---

## Manual Setup (30 minutes)

Prefer to set up manually? Follow these steps.

### Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 22.0.0 (LTS)

  ```bash
  node --version  # Should be v22.x.x or higher
  ```

- **pnpm** >= 10.0.0

  ```bash
  pnpm --version  # Should be 10.x.x or higher
  # Install: npm install -g pnpm
  ```

- **Git** (any recent version)
  ```bash
  git --version
  ```

---

## Quick Start (5 Manual Steps)

```bash
# 1. Clone repository
git clone https://github.com/your-org/cgk.git
cd cgk

# 2. Install dependencies
pnpm install

# 3. Set up environment variables (see below)
cp docs/templates/.env.local.example apps/admin/.env.local
# Edit apps/admin/.env.local with your values

# 4. Run database migrations
npx @cgk-platform/cli migrate

# 5. Start development server
pnpm dev
```

**Expected Result**: Platform running at:

- Admin: http://localhost:3200
- Storefront: http://localhost:3300
- Creator Portal: http://localhost:3400
- Contractor Portal: http://localhost:3500

---

## Detailed Setup

### Step 1: Database Setup

You have **two options** for local database:

#### Option A: Docker (Recommended for Beginners)

**Easiest** - Everything configured automatically.

1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/

2. Start PostgreSQL and Redis:

   ```bash
   docker-compose up -d
   ```

3. Verify containers are running:
   ```bash
   docker ps
   # Should show: postgres:16 and redis:7
   ```

**Database will be available at**:

- PostgreSQL: `postgresql://postgres:postgres@localhost:5432/cgk`
- Redis: `redis://localhost:6379`

#### Option B: Cloud Services (Recommended for Production-like Setup)

Use free tier cloud services.

**PostgreSQL - Neon (Free tier: 3GB storage)**

1. Visit https://neon.tech
2. Sign up (free, no credit card)
3. Create project: `cgk-dev`
4. Copy connection string:
   ```
   postgresql://username:password@ep-cool-voice-123456.us-east-2.aws.neon.tech/neondb
   ```
5. Save as `DATABASE_URL` in `.env.local`

**Redis - Upstash (Free tier: 10K commands/day)**

1. Visit https://upstash.com
2. Sign up (free, no credit card)
3. Create database: `cgk-dev-cache`
4. Copy REST URL:
   ```
   https://your-redis-12345.upstash.io
   ```
5. Save as `REDIS_URL` in `.env.local`

---

### Step 2: Environment Variables

1. Copy the template:

   ```bash
   cp docs/templates/.env.local.example apps/admin/.env.local
   ```

2. Edit `apps/admin/.env.local` with your database URLs:

   ```bash
   # For Docker (Option A)
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cgk
   REDIS_URL=redis://localhost:6379

   # OR for Cloud (Option B)
   DATABASE_URL=postgresql://user:pass@host/db  # From Neon
   REDIS_URL=https://your-redis.upstash.io      # From Upstash
   ```

3. Generate secrets:

   ```bash
   # Generate cryptographically secure secrets
   ./scripts/generate-brand-secrets.sh local-dev > local-secrets.txt

   # Copy JWT_SECRET, SESSION_SECRET, ENCRYPTION_KEY to .env.local
   ```

4. Set tenant:
   ```bash
   # Add to .env.local
   DEFAULT_TENANT_SLUG=local-dev
   ```

**Full `.env.local` example** - see [docs/templates/.env.local.example](../templates/.env.local.example)

---

### Step 3: Database Migrations

Run migrations to create database schema:

```bash
# Create public schema and first tenant
npx @cgk-platform/cli migrate

# If you see "No migrations to run", that's okay!
# It means migrations already ran.
```

**What this does**:

- Creates `public` schema (users, organizations, permissions)
- Creates `tenant_local_dev` schema (orders, products, customers)
- Sets up tables, indexes, triggers

**Verify** migrations worked:

```bash
# Should list schemas: public, tenant_local_dev
npx @cgk-platform/cli doctor
```

---

### Step 4: Start Development Server

```bash
# Start all apps
pnpm dev

# OR start individual apps
pnpm --filter cgk-admin dev                # Port 3200
pnpm --filter cgk-storefront dev           # Port 3300
pnpm --filter cgk-creator-portal dev       # Port 3400
pnpm --filter cgk-contractor-portal dev    # Port 3500
```

**First startup** takes 30-60 seconds as packages compile.

**Subsequent startups** are much faster (5-10 seconds).

---

### Step 5: Verify Everything Works

1. **Visit Admin Portal**: http://localhost:3200
   - You should see login page or dashboard

2. **Check Health Endpoint**: http://localhost:3200/api/health
   - Should return: `{"ok": true, "timestamp": "..."}`

3. **Visit Storefront**: http://localhost:3300
   - You should see product listing (empty if no products)

4. **Check Environment Variables Validation**:
   - Look for log: `[ADMIN] Environment variables validated successfully`
   - If missing env vars, you'll see clear error messages

---

## Troubleshooting

### Issue: "Missing required environment variable: DATABASE_URL"

**Cause**: `.env.local` not configured

**Fix**:

```bash
# Make sure .env.local exists
ls apps/admin/.env.local

# If not, copy template
cp docs/templates/.env.local.example apps/admin/.env.local

# Edit with your database URL
nano apps/admin/.env.local
```

---

### Issue: "Port 3200 already in use"

**Cause**: Another process is using the port

**Fix**:

```bash
# Find what's using the port
lsof -i :3200

# Kill the process
kill -9 <PID>

# OR change the port in package.json
# admin: "dev": "next dev --port 3201"
```

---

### Issue: "Database connection failed"

**Cause**: Database not running or wrong URL

**Fix (Docker)**:

```bash
# Check if containers are running
docker ps

# If not, start them
docker-compose up -d

# Check logs
docker-compose logs postgres
```

**Fix (Neon)**:

```bash
# Test connection
psql "postgresql://user:pass@host/db"

# If connection fails, check:
# 1. Is URL correct? (copy from Neon dashboard)
# 2. Is database suspended? (wake it up in Neon)
# 3. Is IP whitelisted? (Neon allows all IPs by default)
```

---

### Issue: "pnpm install fails"

**Cause**: Node version too old or corrupted cache

**Fix**:

```bash
# Check Node version
node --version  # Must be 22+

# Clear pnpm cache
pnpm store prune

# Try again
pnpm install
```

---

### Issue: "Migration failed: schema already exists"

**Cause**: Migrations already ran before

**Fix**: This is usually harmless. The migrations are idempotent.

```bash
# Check database state
npx @cgk-platform/cli doctor

# If you want to reset everything (⚠️ DELETES ALL DATA)
npx @cgk-platform/cli reset-db
npx @cgk-platform/cli migrate
```

---

## Docker Compose Configuration

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: cgk-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: cgk
    ports:
      - '5432:5432'
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: cgk-redis
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
  redis-data:
```

**Usage**:

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Reset database (⚠️ DELETES ALL DATA)
docker-compose down -v
docker-compose up -d
```

---

## Optional: Shopify & Stripe Setup

**For full e-commerce testing**, you'll need Shopify and Stripe accounts.

### Shopify (Optional)

1. Create Shopify Partners account: https://partners.shopify.com
2. Create development store: "CGK Dev Store"
3. Create Shopify App in Partners dashboard
4. Add credentials to `.env.local`:
   ```bash
   SHOPIFY_CLIENT_ID=your-client-id
   SHOPIFY_CLIENT_SECRET=your-client-secret
   ```

**See**: [Credential Acquisition Guide](CREDENTIAL-ACQUISITION.md) for detailed steps

### Stripe (Optional)

1. Sign up: https://dashboard.stripe.com/register
2. Get test API keys (starts with `pk_test_` and `sk_test_`)
3. Add to `.env.local`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

**Note**: Stripe test mode doesn't process real money.

---

## Next Steps

Once local development is working:

1. **Explore the codebase**:
   - `apps/` - Individual applications
   - `packages/` - Shared packages
   - `CLAUDE.md` - AI development guide

2. **Make a change**:
   - Edit a component in `apps/admin/src/app/`
   - See it hot-reload in browser

3. **Run tests** (when available):

   ```bash
   pnpm test
   ```

4. **Type check**:

   ```bash
   pnpm turbo typecheck
   ```

5. **Deploy** (when ready):
   - Follow [Brand Deployment Guide](../brand-deployment-guide.md)

---

## VS Code Setup (Recommended)

Install recommended extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "unifiedjs.vscode-mdx"
  ]
}
```

---

## Common Development Commands

```bash
# Development
pnpm dev                          # Start all apps
pnpm --filter cgk-admin dev       # Start admin only

# Type checking (FAST - recommended)
pnpm turbo typecheck              # Type check all packages
npx tsc --noEmit                  # Type check current package

# Building (SLOW - only for deployment)
pnpm turbo build                  # Build all apps

# Database
npx @cgk-platform/cli migrate              # Run migrations
npx @cgk-platform/cli migrate:auto         # Auto-migrate existing tenants
npx @cgk-platform/cli doctor               # Check config
npx @cgk-platform/cli tenant:create <slug> # Create new tenant

# Linting
pnpm lint                         # Lint all packages
pnpm lint --fix                   # Auto-fix issues
```

---

## Performance Tips

### Faster Startup

1. **Don't start all apps** - only start what you need:

   ```bash
   pnpm --filter cgk-admin dev  # Just admin
   ```

2. **Use Turbo cache**:

   ```bash
   # First build is slow, subsequent builds are fast
   pnpm turbo typecheck
   ```

3. **Close unused browser tabs** - Next.js dev server memory usage grows with open tabs

### Faster Type Checking

```bash
# Type check only changed files
pnpm turbo typecheck --filter='...[HEAD^1]'
```

---

## Getting Help

- **Documentation**: Browse `docs/` folder
- **Troubleshooting**: [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
- **GitHub Issues**: https://github.com/cgk-platform/cgk/issues
- **CLAUDE.md**: Comprehensive platform guide

---

**You're now ready to develop on CGK Platform locally, Mr. Tinkleberry!**
