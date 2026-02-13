# Contributing to CGK

Thank you for your interest in contributing to CGK! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 22.x or higher (LTS)
- pnpm 10.x or higher
- PostgreSQL 17+ (for testing)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/your-org/cgk.git
cd cgk

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development
pnpm dev
```

## Project Structure

```
cgk/
├── apps/              # Applications
│   └── docs/          # Documentation site
├── packages/          # Shared packages
│   ├── config/        # Shared configurations
│   │   ├── eslint/    # ESLint config
│   │   ├── tailwind/  # Tailwind preset
│   │   └── typescript/# TypeScript configs
│   ├── core/          # Core types and config
│   ├── db/            # Database utilities
│   ├── auth/          # Authentication
│   ├── ui/            # UI components
│   ├── commerce/      # Commerce abstraction
│   ├── shopify/       # Shopify integration
│   ├── payments/      # Payment handling
│   ├── jobs/          # Background jobs
│   ├── analytics/     # Analytics tracking
│   ├── logging/       # Structured logging
│   ├── mcp/           # MCP utilities
│   └── cli/           # CLI tool
└── starters/          # Project templates
    ├── basic/         # Basic template
    ├── full/          # Full-featured template
    └── storefront-only/ # Storefront template
```

## Development Workflow

### Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes following our coding standards

3. Run checks:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   ```

4. Create a changeset (for package changes):
   ```bash
   pnpm changeset
   ```

5. Submit a pull request

### Changesets

We use [Changesets](https://github.com/changesets/changesets) for versioning. When making changes to packages:

```bash
# Create a changeset
pnpm changeset

# Follow the prompts to:
# 1. Select which packages were changed
# 2. Choose the bump type (patch/minor/major)
# 3. Write a summary of changes
```

All `@cgk-platform/*` packages use lockstep versioning - they share the same version number.

## Coding Standards

### TypeScript

- Use strict TypeScript (`"strict": true`)
- Export types explicitly
- Use branded types for IDs (TenantId, UserId, etc.)

### Tenant Isolation

**Critical**: Always use tenant context for database operations:

```typescript
// Correct
const data = await withTenant(tenantId, () =>
  sql`SELECT * FROM orders`
)

// Never do this - exposes cross-tenant data
const data = await sql`SELECT * FROM orders`
```

### File Size Limits

- Keep files under 300 lines
- Split large files into logical modules
- Use barrel exports (index.ts) for public APIs

### No TODO Comments

- Don't leave TODO/FIXME comments in code
- If something needs doing, create an issue
- Implement features completely or don't merge

### Documentation

- Every package must have a CLAUDE.md file
- Update README when adding features
- Document breaking changes in changesets

## Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @cgk-platform/core test

# Run tests in watch mode
pnpm test -- --watch
```

## Pull Request Guidelines

1. **Title**: Use conventional commit format
   - `feat: add new feature`
   - `fix: resolve bug`
   - `docs: update documentation`
   - `chore: maintenance task`

2. **Description**: Include:
   - What changes were made
   - Why the changes were needed
   - How to test the changes

3. **Checks**: Ensure all CI checks pass:
   - TypeScript compilation
   - ESLint
   - Tests
   - Build

4. **Review**: Request review from maintainers

## Release Process

Releases are automated via GitHub Actions:

1. Changesets are accumulated on `main`
2. A "Version Packages" PR is automatically created
3. Merging that PR publishes to npm

### Canary Releases

Every push to `main` publishes a canary release:
```bash
npm install @cgk-platform/core@canary
```

## Getting Help

- **Questions**: Open a [Discussion](https://github.com/your-org/cgk/discussions)
- **Bugs**: Open an [Issue](https://github.com/your-org/cgk/issues)
- **Security**: Email security@cgk.dev

## Code of Conduct

Be respectful and constructive. We're all here to build great software together.
