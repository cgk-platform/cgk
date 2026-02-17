# CGK Documentation

Welcome to the CGK (Commerce Growth Kit) documentation.

## Getting Started

- [Installation](./getting-started/installation.md)
- [Configuration](./getting-started/configuration.md)
- [Deployment](./getting-started/deployment.md)

## Guides

- [Multi-Tenancy](./guides/multi-tenancy.md) - Schema-per-tenant architecture and patterns
- [Adding Features](./guides/adding-features.md) - Extending the platform with new packages and APIs
- [Customization](./guides/customization.md) - Theming, configuration, and component extension
- [Deployment](./guides/deployment.md) - Production deployment guide

## API Reference

- [CLI](./api-reference/cli.md) - Command-line interface
- [Commerce Hooks](./api-reference/commerce-hooks.md) - React hooks for commerce
- [Commerce Primitives](./api-reference/commerce-primitives.md) - Formatters, utilities, validators

## Setup

- [Database](./setup/DATABASE.md) - Database configuration
- [Background Jobs](./setup/BACKGROUND-JOBS.md) - Job processing setup

## CLI Quick Start

```bash
# Create a new brand site
npx @cgk-platform/cli create my-brand

# Check system requirements
npx @cgk-platform/cli doctor

# Run setup wizard
npx @cgk-platform/cli setup

# Database migrations
npx @cgk-platform/cli migrate --status
npx @cgk-platform/cli migrate

# Tenant management
npx @cgk-platform/cli tenant:create my_brand
npx @cgk-platform/cli tenant:list
```
