#!/bin/bash
# ============================================================================
# CGK PLATFORM - GIT MERGE DRIVERS SETUP
# ============================================================================
#
# Configures custom git merge drivers for WordPress-style platform updates.
#
# This script sets up two merge drivers:
#   1. "ours" - Always keep our version (protects brand customizations)
#   2. "union" - Combine both versions (requires manual review)
#
# These drivers work with .gitattributes to protect brand customizations
# while allowing platform updates to core packages.
#
# Usage:
#   ./scripts/setup-git-merge-drivers.sh
#
# ============================================================================

set -e

# Trap handler for cleanup on error
cleanup() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo -e "${RED}❌ Setup failed with exit code: $exit_code${NC}" >&2
    echo -e "${YELLOW}Git merge drivers may be partially configured.${NC}" >&2
    echo -e "${YELLOW}Run this script again to complete setup.${NC}" >&2
  fi
}
trap cleanup EXIT

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Dependency checks
command -v git >/dev/null 2>&1 || {
  echo -e "${RED}❌ Error: git is required but not installed${NC}" >&2
  echo "" >&2
  echo "Install git:" >&2
  echo "  macOS:   brew install git" >&2
  echo "  Ubuntu:  sudo apt-get install git" >&2
  echo "  Fedora:  sudo dnf install git" >&2
  exit 1
}

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}CGK PLATFORM - GIT MERGE DRIVERS SETUP${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
  echo -e "${RED}❌ Error: Not in a git repository${NC}"
  echo ""
  echo "Run this script from the root of your cgk repository."
  exit 1
fi

# Check if .gitattributes exists
if [ ! -f ".gitattributes" ]; then
  echo -e "${YELLOW}⚠️  Warning: .gitattributes file not found${NC}"
  echo ""
  echo "The .gitattributes file defines which files use which merge strategy."
  echo "You should have this file in your repository."
  echo ""
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo -e "${YELLOW}Configuring git merge drivers...${NC}"
echo ""

# Configure "ours" merge driver
echo -e "${BLUE}1. Configuring 'ours' merge driver${NC}"
echo "   Purpose: Always keep our version (protects brand customizations)"
git config merge.ours.name "Always keep our version"
git config merge.ours.driver "git merge-file --ours %A %O %B"
echo -e "${GREEN}   ✓ Configured merge.ours.driver${NC}"
echo ""

# Configure "union" merge driver
echo -e "${BLUE}2. Configuring 'union' merge driver${NC}"
echo "   Purpose: Combine both versions (requires manual review)"
git config merge.union.name "Union merge (combine both versions)"
git config merge.union.driver "git merge-file --union %A %O %B"
echo -e "${GREEN}   ✓ Configured merge.union.driver${NC}"
echo ""

# Verify configuration
echo -e "${BLUE}3. Verifying configuration${NC}"
echo ""

OURS_DRIVER=$(git config --get merge.ours.driver)
UNION_DRIVER=$(git config --get merge.union.driver)

if [ "$OURS_DRIVER" = "git merge-file --ours %A %O %B" ]; then
  echo -e "${GREEN}   ✓ merge.ours.driver = true${NC}"
else
  echo -e "${RED}   ✗ merge.ours.driver NOT configured correctly${NC}"
  exit 1
fi

if [ "$UNION_DRIVER" = "git merge-file --union %A %O %B" ]; then
  echo -e "${GREEN}   ✓ merge.union.driver = git merge-file --union %A %O %B${NC}"
else
  echo -e "${RED}   ✗ merge.union.driver NOT configured correctly${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}4. Checking .gitattributes usage${NC}"
echo ""

if [ -f ".gitattributes" ]; then
  OURS_COUNT=$(grep -c "merge=ours" .gitattributes || true)
  UNION_COUNT=$(grep -c "merge=union" .gitattributes || true)
  DEFAULT_COUNT=$(grep -c "merge=default" .gitattributes || true)

  echo -e "   Files using ${GREEN}merge=ours${NC} (protected): $OURS_COUNT"
  echo -e "   Files using ${YELLOW}merge=union${NC} (review): $UNION_COUNT"
  echo -e "   Files using ${BLUE}merge=default${NC} (platform): $DEFAULT_COUNT"
  echo ""

  if [ $OURS_COUNT -eq 0 ]; then
    echo -e "${YELLOW}   ⚠️  No files marked with merge=ours${NC}"
    echo "   You may want to add brand customizations to .gitattributes"
  fi
else
  echo -e "${YELLOW}   ⚠️  .gitattributes not found - merge drivers won't be used${NC}"
fi

echo ""
echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}✅ Git merge drivers configured successfully!${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo -e "${BLUE}What this enables:${NC}"
echo ""
echo -e "${GREEN}Protected Files (merge=ours):${NC}"
echo "  • apps/storefront/src/**       - Your storefront code"
echo "  • apps/storefront/public/**    - Your brand assets"
echo "  • platform.config.ts           - Your brand configuration"
echo "  • .env.local                   - Your secrets"
echo "  • vercel.json                  - Your Vercel config"
echo ""
echo -e "${BLUE}Platform Files (merge=default):${NC}"
echo "  • packages/**                  - Core platform packages"
echo "  • apps/admin/src/app/**       - Admin app code"
echo "  • scripts/**                   - Platform scripts"
echo ""
echo -e "${YELLOW}Review Files (merge=union):${NC}"
echo "  • package.json                 - Dependencies (review after merge)"
echo "  • apps/*/package.json          - App dependencies"
echo "  • packages/db/src/migrations/** - Database migrations"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Set up upstream remote (if migrating):"
echo "     ${YELLOW}git remote add upstream https://github.com/cgk-platform/cgk-template.git${NC}"
echo ""
echo "  2. Test merge strategy:"
echo "     ${YELLOW}git fetch upstream${NC}"
echo "     ${YELLOW}git diff HEAD upstream/main${NC}"
echo ""
echo "  3. Apply platform updates:"
echo "     ${YELLOW}npx @cgk-platform/cli update-platform --dry-run${NC}"
echo ""
echo "  4. Read the full guide:"
echo "     ${YELLOW}docs/git-merge-drivers-setup.md${NC}"
echo ""
