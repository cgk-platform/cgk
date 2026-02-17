# @cgk-platform/cli

CLI tool for the CGK platform - create, setup, and manage brand sites.

## Installation

```bash
npm install -g @cgk-platform/cli
```

## Commands

### Create a New Brand Site

```bash
cgk create my-brand
```

Creates a new CGK brand site with:
- Next.js 14+ project structure
- CGK platform packages pre-configured
- Database schema and migrations
- Environment template
- Basic brand customization

Options:
- `--template <name>` - Use specific template (default, minimal, full)
- `--no-install` - Skip package installation
- `--package-manager <pm>` - Use specific package manager (npm, pnpm, yarn)

### Initialize Existing Project

```bash
cgk init
```

Add CGK platform to an existing Next.js project:
- Installs CGK dependencies
- Creates configuration files
- Sets up database migrations
- Adds example code

### System Check

```bash
cgk doctor
```

Checks system requirements:
- Node.js version (18+)
- Package manager (npm/pnpm/yarn)
- Database connectivity
- Environment variables
- Package versions

### Platform Setup

```bash
cgk setup
```

Interactive setup wizard:
- Configure database connection
- Set up authentication
- Configure background jobs
- Create initial tenant
- Set up payment providers

Focused setup commands:
```bash
cgk setup:database    # Database setup only
cgk setup:jobs        # Background jobs provider setup
```

### Database Migrations

```bash
cgk migrate                    # Run pending migrations
cgk migrate:create "add users" # Create new migration file
```

### Tenant Management

```bash
cgk tenant:create              # Create new tenant (interactive)
cgk tenant:list                # List all tenants
cgk tenant:export <slug>       # Export tenant data to SQL
cgk tenant:import <file>       # Import tenant data from SQL
```

### Package Updates

```bash
cgk check-updates              # Check for available updates
cgk update                     # Update all CGK packages
cgk changelog <version>        # View changelog for version
```

## Usage Examples

### Create New Site

```bash
# Create with defaults
cgk create my-luxury-brand

# Create with full template
cgk create my-brand --template full

# Create with pnpm
cgk create my-brand --package-manager pnpm
```

### Setup New Installation

```bash
cd my-brand
cgk setup
```

The wizard will prompt for:
1. Database URL
2. Job provider (Trigger.dev, Inngest, or local)
3. Stripe API keys
4. Initial tenant slug and name
5. Admin email

### Create Tenant

```bash
cgk tenant:create

# Prompts:
# Tenant slug: acme-corp
# Tenant name: Acme Corporation
# Admin email: admin@acme.com
```

### Export/Import Tenant

```bash
# Export tenant data
cgk tenant:export acme-corp --output backup.sql

# Import to new environment
cgk tenant:import backup.sql
```

### Check and Update Packages

```bash
# Check for updates
cgk check-updates

# Output:
# @cgk-platform/core: 0.1.0 → 0.2.0
# @cgk-platform/commerce: 0.1.5 → 0.1.8

# Update all packages
cgk update

# View changelog
cgk changelog 0.2.0
```

## Configuration

The CLI reads from:
- `.cgkrc` - CLI configuration
- `.env.local` - Environment variables
- `cgk.config.js` - Platform configuration

Example `.cgkrc`:
```json
{
  "packageManager": "pnpm",
  "template": "default",
  "autoMigrate": true
}
```

## Debugging

Run with `DEBUG` environment variable:

```bash
DEBUG=cgk:* cgk create my-brand
```

## License

MIT
