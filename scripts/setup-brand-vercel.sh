#!/bin/bash
# Setup Vercel projects and domains for a new brand
#
# Prerequisites:
#   - Vercel CLI installed: npm i -g vercel
#   - Logged in: vercel login
#   - Domain DNS configured to point to Vercel
#
# Usage:
#   ./scripts/setup-brand-vercel.sh <brand-name> <domain> <vercel-team>
#
# Example:
#   ./scripts/setup-brand-vercel.sh meliusly meliusly.com cgk-linens-88e79683
#
# What this does:
#   1. Creates Vercel projects for each app (admin, storefront, creator-portal, contractor-portal)
#   2. Configures custom domains for each app
#   3. Links projects to the specified Vercel team
#

set -e

# Trap handler for cleanup on error
cleanup() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo -e "${RED}❌ Setup failed with exit code: $exit_code${NC}" >&2
    echo -e "${YELLOW}Partial setup may have occurred. Check Vercel dashboard.${NC}" >&2
  fi
  # Return to original directory
  cd "$ORIGINAL_DIR" 2>/dev/null || true
}
trap cleanup EXIT

# Store original directory
ORIGINAL_DIR=$(pwd)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Dependency checks
command -v vercel >/dev/null 2>&1 || {
  echo -e "${RED}❌ Error: Vercel CLI is required but not installed${NC}" >&2
  echo "" >&2
  echo "Install Vercel CLI:" >&2
  echo "  npm i -g vercel" >&2
  echo "" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || {
  echo -e "${RED}❌ Error: git is required but not installed${NC}" >&2
  exit 1
}

# Check arguments
if [ $# -ne 3 ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo ""
    echo "Usage: $0 <brand-name> <domain> <vercel-team>"
    echo ""
    echo "Example:"
    echo "  $0 meliusly meliusly.com cgk-linens-88e79683"
    echo ""
    exit 1
fi

BRAND_NAME="$1"
DOMAIN="$2"
VERCEL_TEAM="$3"

echo -e "${BLUE}=== CGK Brand Vercel Setup ===${NC}"
echo ""
echo "Brand: ${BRAND_NAME}"
echo "Domain: ${DOMAIN}"
echo "Vercel Team: ${VERCEL_TEAM}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}Error: Vercel CLI not found${NC}"
    echo "Install with: npm i -g vercel"
    exit 1
fi

# Verify Vercel authentication
echo "Verifying Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Vercel${NC}"
    echo "Run: vercel login"
    exit 1
fi

echo -e "${GREEN}Authenticated successfully${NC}"
echo ""

# Define apps and their subdomain mappings
declare -A APPS=(
    ["admin"]="admin.${DOMAIN}"
    ["storefront"]="shop.${DOMAIN}"
    ["creator-portal"]="creators.${DOMAIN}"
    ["contractor-portal"]="contractors.${DOMAIN}"
)

# Track results
CREATED_PROJECTS=()
FAILED_PROJECTS=()

# Process each app
for app in "admin" "storefront" "creator-portal" "contractor-portal"; do
    APP_DIR="apps/$app"
    PROJECT_NAME="${BRAND_NAME}-${app}"
    SUBDOMAIN="${APPS[$app]}"

    echo -e "${YELLOW}Setting up ${app}...${NC}"

    if [ ! -d "$APP_DIR" ]; then
        echo -e "${RED}  Error: Directory $APP_DIR not found${NC}"
        FAILED_PROJECTS+=("$app (directory not found)")
        echo ""
        continue
    fi

    # Use subshell for error isolation
    (
        cd "$APP_DIR" || exit 1

        # Create Vercel project
        echo "  Creating Vercel project: ${PROJECT_NAME}"
        if vercel project add "$PROJECT_NAME" --scope "$VERCEL_TEAM" 2>/dev/null; then
            echo -e "  ${GREEN}Project created successfully${NC}"
        else
            echo -e "  ${YELLOW}Project may already exist${NC}"
        fi

        # Link project to directory
        echo "  Linking project to directory..."
        if vercel link --project "$PROJECT_NAME" --scope "$VERCEL_TEAM" --yes 2>/dev/null; then
            echo -e "  ${GREEN}Project linked successfully${NC}"
        else
            echo -e "  ${YELLOW}Project link may already exist${NC}"
        fi

        # Add custom domain
        echo "  Adding domain: ${SUBDOMAIN}"
        if vercel domains add "$SUBDOMAIN" "$PROJECT_NAME" --scope "$VERCEL_TEAM" 2>/dev/null; then
            echo -e "  ${GREEN}Domain added successfully${NC}"
        else
            echo -e "  ${YELLOW}Domain may already exist${NC}"
        fi
    ) && {
        CREATED_PROJECTS+=("$app → $SUBDOMAIN")
        echo -e "  ${GREEN}✓ ${app} setup complete${NC}"
    } || {
        FAILED_PROJECTS+=("$app (setup error)")
        echo -e "  ${RED}✗ ${app} setup failed${NC}"
    }

    echo ""
done

# Summary
echo -e "${BLUE}=== Setup Summary ===${NC}"
echo ""

if [ ${#CREATED_PROJECTS[@]} -gt 0 ]; then
    echo -e "${GREEN}Successfully configured:${NC}"
    for project in "${CREATED_PROJECTS[@]}"; do
        echo "  ✓ $project"
    done
    echo ""
fi

if [ ${#FAILED_PROJECTS[@]} -gt 0 ]; then
    echo -e "${RED}Failed to configure:${NC}"
    for project in "${FAILED_PROJECTS[@]}"; do
        echo "  ✗ $project"
    done
    echo ""
fi

# Next steps
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Configure DNS records for your domain:"
echo "   Add CNAME records pointing to cname.vercel-dns.com:"
for app in "admin" "storefront" "creator-portal" "contractor-portal"; do
    echo "     ${APPS[$app]} → cname.vercel-dns.com"
done
echo ""
echo "2. Add environment variables to each project:"
echo "   cd apps/<app>"
echo "   vercel env add VARIABLE_NAME production --scope ${VERCEL_TEAM}"
echo ""
echo "3. Deploy the projects:"
echo "   git push origin main"
echo "   (Vercel will auto-deploy from GitHub)"
echo ""
echo "4. Verify deployments:"
echo "   vercel project ls --scope ${VERCEL_TEAM}"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
