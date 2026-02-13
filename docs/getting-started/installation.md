# Installation

## Prerequisites

- Node.js >= 22.0.0
- pnpm >= 10.0.0
- PostgreSQL 17+ (via Neon recommended)
- Redis (via Upstash recommended)

## Quick Start

### Option 1: Create New Project

```bash
# Create a new CGK brand site
npx @cgk-platform/cli create my-brand

# Navigate to project
cd my-brand

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Option 2: Clone from Repository

```bash
# Clone the repository
git clone https://github.com/cgk-platform/cgk.git
cd cgk

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local

# Start development
pnpm dev
```

## Verify Installation

```bash
# Check system requirements
npx @cgk-platform/cli doctor

# Expected output:
# ✓ Node.js: 22.x.x
# ✓ pnpm: 10.x.x
# ✓ Database: Connected
# ✓ Cache: Connected
```

## Next Steps

- [Configuration](./configuration.md) - Configure your environment
- [Deployment](./deployment.md) - Deploy to production
