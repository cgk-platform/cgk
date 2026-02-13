#!/bin/bash
# Add encryption keys to all Vercel projects
#
# Prerequisites:
#   - Vercel CLI installed: npm i -g vercel
#   - Logged in: vercel login
#   - Projects linked in each apps/ directory
#
# Usage:
#   ./scripts/add-encryption-keys-to-vercel.sh
#
# After running:
#   pnpm env:pull

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== CGK Encryption Keys Setup ===${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}Error: Vercel CLI not found${NC}"
    echo "Install with: npm i -g vercel"
    exit 1
fi

# Generate keys
echo "Generating encryption keys..."
INTEGRATION_KEY=$(openssl rand -base64 32)
SHOPIFY_KEY=$(openssl rand -hex 32)

echo -e "${GREEN}Keys generated successfully${NC}"
echo ""

# List of apps to update
APPS=("admin" "storefront" "orchestrator" "creator-portal" "contractor-portal")

# Track if any app failed
FAILED_APPS=()

for app in "${APPS[@]}"; do
    APP_DIR="apps/$app"

    if [ ! -d "$APP_DIR" ]; then
        echo -e "${YELLOW}Skipping $app (directory not found)${NC}"
        continue
    fi

    echo -e "${YELLOW}Adding keys to $app...${NC}"

    cd "$APP_DIR"

    # Check if project is linked
    if [ ! -f ".vercel/project.json" ]; then
        echo -e "${YELLOW}  Warning: Project not linked to Vercel, skipping${NC}"
        cd ../..
        FAILED_APPS+=("$app")
        continue
    fi

    # Add INTEGRATION_ENCRYPTION_KEY
    for env in production preview development; do
        if printf "%s" "$INTEGRATION_KEY" | vercel env add INTEGRATION_ENCRYPTION_KEY "$env" --force 2>/dev/null; then
            echo -e "  ${GREEN}Added INTEGRATION_ENCRYPTION_KEY to $env${NC}"
        else
            echo -e "  ${YELLOW}INTEGRATION_ENCRYPTION_KEY may already exist in $env${NC}"
        fi
    done

    # Add SHOPIFY_TOKEN_ENCRYPTION_KEY
    for env in production preview development; do
        if printf "%s" "$SHOPIFY_KEY" | vercel env add SHOPIFY_TOKEN_ENCRYPTION_KEY "$env" --force 2>/dev/null; then
            echo -e "  ${GREEN}Added SHOPIFY_TOKEN_ENCRYPTION_KEY to $env${NC}"
        else
            echo -e "  ${YELLOW}SHOPIFY_TOKEN_ENCRYPTION_KEY may already exist in $env${NC}"
        fi
    done

    cd ../..
    echo ""
done

echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""

if [ ${#FAILED_APPS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Warning: The following apps were skipped:${NC}"
    for app in "${FAILED_APPS[@]}"; do
        echo "  - $app"
    done
    echo ""
    echo "Link them with: cd apps/<app> && vercel link"
    echo ""
fi

echo "Next steps:"
echo "  1. Run 'pnpm env:pull' to sync keys to local .env.local files"
echo "  2. Verify keys with 'grep INTEGRATION_ENCRYPTION_KEY apps/*/.env.local'"
echo ""
echo -e "${YELLOW}Keys generated (save these if needed):${NC}"
echo "  INTEGRATION_ENCRYPTION_KEY=${INTEGRATION_KEY:0:20}..."
echo "  SHOPIFY_TOKEN_ENCRYPTION_KEY=${SHOPIFY_KEY:0:20}..."
