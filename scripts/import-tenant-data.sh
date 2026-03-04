#!/bin/bash
#
# Import tenant data to new database
#
# Usage:
#   ./scripts/import-tenant-data.sh <export-file-1> [export-file-2] ...
#
# Environment variables required:
#   - NEW_DATABASE_URL: Target database connection string (from Neon integration)
#
# Example:
#   export NEW_DATABASE_URL=postgres://...
#   ./scripts/import-tenant-data.sh exports/meliusly-export.sql exports/cgk-linens-export.sql

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validate environment
if [ -z "$NEW_DATABASE_URL" ]; then
  echo -e "${RED}❌ NEW_DATABASE_URL environment variable is required${NC}"
  echo ""
  echo "Get the database URL from Vercel:"
  echo "  vercel env pull .env.local"
  echo "  export NEW_DATABASE_URL=\$(grep POSTGRES_URL .env.local | cut -d '=' -f2)"
  exit 1
fi

# Validate arguments
if [ $# -eq 0 ]; then
  echo -e "${RED}❌ At least one export file is required${NC}"
  echo ""
  echo "Usage: $0 <export-file-1> [export-file-2] ..."
  echo ""
  echo "Example:"
  echo "  $0 exports/meliusly-export.sql exports/cgk-linens-export.sql"
  exit 1
fi

# Validate export files exist
for file in "$@"; do
  if [ ! -f "$file" ]; then
    echo -e "${RED}❌ Export file not found: $file${NC}"
    exit 1
  fi
done

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Tenant Data Import                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Test database connection
echo -e "${YELLOW}🔍 Testing database connection...${NC}"
if ! psql "$NEW_DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
  echo -e "${RED}❌ Failed to connect to database${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Database connection successful${NC}"
echo ""

# Import each tenant
for file in "$@"; do
  tenant_name=$(basename "$file" -export.sql)

  echo -e "${BLUE}────────────────────────────────────────${NC}"
  echo -e "${YELLOW}📥 Importing tenant: ${tenant_name}${NC}"
  echo -e "${BLUE}────────────────────────────────────────${NC}"

  # Import data
  if psql "$NEW_DATABASE_URL" -f "$file"; then
    echo -e "${GREEN}✅ Successfully imported ${tenant_name}${NC}"
  else
    echo -e "${RED}❌ Failed to import ${tenant_name}${NC}"
    exit 1
  fi

  echo ""
done

# Verify import
echo -e "${BLUE}────────────────────────────────────────${NC}"
echo -e "${YELLOW}🔍 Verifying import...${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"

# Check organizations table
echo -e "${YELLOW}Organizations:${NC}"
psql "$NEW_DATABASE_URL" -c "SELECT slug, name FROM public.organizations ORDER BY slug;"

echo ""

# Check tenant schemas
echo -e "${YELLOW}Tenant schemas:${NC}"
psql "$NEW_DATABASE_URL" -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name;"

echo ""
echo -e "${GREEN}✅ Import complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Verify tenant data in database"
echo "  2. Deploy to Vercel: git push origin main"
echo "  3. Test deployment: https://your-project.vercel.app"
