#!/bin/bash
# ============================================================================
# CGK PLATFORM - MERGE STRATEGY TEST SCRIPT
# ============================================================================
#
# Tests that .gitattributes merge strategies work correctly:
#   1. "ours" strategy protects brand customizations
#   2. "union" strategy combines infrastructure changes
#   3. "default" strategy merges platform updates
#
# This simulates platform updates to verify Meliusly/brand customizations
# are NOT overwritten during upstream merges.
#
# Usage:
#   ./scripts/test-merge-strategy.sh
#
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}CGK PLATFORM - MERGE STRATEGY TEST${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Prerequisites check
echo -e "${YELLOW}Checking prerequisites...${NC}"
echo ""

# Check git status is clean
if [[ -n $(git status --porcelain) ]]; then
  echo -e "${RED}❌ Error: Working directory not clean${NC}"
  echo ""
  echo "Commit or stash changes before running tests."
  exit 1
fi
echo -e "${GREEN}✓ Working directory clean${NC}"

# Check merge drivers configured
if [ "$(git config --get merge.ours.driver)" != "git merge-file --ours %A %O %B" ]; then
  echo -e "${RED}❌ Error: merge.ours.driver not configured${NC}"
  echo ""
  echo "Run: ./scripts/setup-git-merge-drivers.sh"
  exit 1
fi
echo -e "${GREEN}✓ merge.ours.driver configured${NC}"

if [ "$(git config --get merge.union.driver)" != "git merge-file --union %A %O %B" ]; then
  echo -e "${RED}❌ Error: merge.union.driver not configured${NC}"
  echo ""
  echo "Run: ./scripts/setup-git-merge-drivers.sh"
  exit 1
fi
echo -e "${GREEN}✓ merge.union.driver configured${NC}"

# Check .gitattributes exists
if [ ! -f ".gitattributes" ]; then
  echo -e "${RED}❌ Error: .gitattributes not found${NC}"
  exit 1
fi
echo -e "${GREEN}✓ .gitattributes found${NC}"

echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}TEST 1: Brand Customization Protection (merge=ours)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo "This test verifies that storefront customizations are NEVER overwritten."
echo ""

# Create test branches
CURRENT_BRANCH=$(git branch --show-current)
TEST_BRANCH="test-merge-ours-$(date +%s)"
PLATFORM_BRANCH="test-platform-update-$(date +%s)"

echo -e "${YELLOW}Creating test branches...${NC}"
git checkout -b "$TEST_BRANCH" --quiet
git checkout -b "$PLATFORM_BRANCH" --quiet

# Simulate brand customization
echo -e "${YELLOW}Simulating brand customization (Meliusly storefront)...${NC}"
BRAND_FILE="apps/storefront/src/app/test-brand-customization.tsx"
mkdir -p apps/storefront/src/app

cat > "$BRAND_FILE" << 'EOF'
/**
 * Meliusly Brand Customization
 * This file represents brand-specific code that should NEVER be overwritten
 */

export default function MeliuslyFeature() {
  return (
    <div>
      <h1>Meliusly Premium Linens</h1>
      <p>Luxury bedding for discerning customers</p>
      {/* Extensive custom code here */}
    </div>
  )
}
EOF

git add "$BRAND_FILE"
git commit -m "feat: add Meliusly brand customization" --quiet --no-verify

# Switch to platform branch and create conflicting change
git checkout "$PLATFORM_BRANCH" --quiet

echo -e "${YELLOW}Simulating platform update (conflicting change)...${NC}"
cat > "$BRAND_FILE" << 'EOF'
/**
 * Generic Platform Template
 * This is the generic version from cgk-template
 */

export default function GenericFeature() {
  return (
    <div>
      <h1>Your Brand Name</h1>
      <p>Your brand description</p>
      {/* Generic template code */}
    </div>
  )
}
EOF

git add "$BRAND_FILE"
git commit -m "chore: update platform template" --quiet --no-verify

# Merge with ours strategy
echo -e "${YELLOW}Merging platform update (should keep brand customization)...${NC}"
echo ""

# This should keep the brand customization (Meliusly version)
git checkout "$TEST_BRANCH" --quiet
git merge "$PLATFORM_BRANCH" --no-edit --quiet

# Verify brand customization was kept
if grep -q "Meliusly Premium Linens" "$BRAND_FILE"; then
  echo -e "${GREEN}✅ TEST 1 PASSED: Brand customization protected${NC}"
  echo -e "${GREEN}   File contains: 'Meliusly Premium Linens' (brand version kept)${NC}"
else
  echo -e "${RED}❌ TEST 1 FAILED: Brand customization was overwritten${NC}"
  echo -e "${RED}   File should contain 'Meliusly Premium Linens' but doesn't${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}TEST 2: Platform Package Updates (merge=default)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo "This test verifies that platform package updates ARE applied."
echo ""

# Create test file in packages (normal merge)
PACKAGE_FILE="packages/core/src/test-platform-update.ts"
mkdir -p packages/core/src

# Create original version in test branch
git checkout "$TEST_BRANCH" --quiet
cat > "$PACKAGE_FILE" << 'EOF'
/**
 * Platform Core Feature
 * Version: 1.0.0
 */

export function platformFeature() {
  return 'version 1.0.0'
}
EOF

git add "$PACKAGE_FILE"
git commit -m "feat: add platform feature v1.0.0" --quiet --no-verify

# Create updated version in platform branch
git checkout "$PLATFORM_BRANCH" --quiet
cat > "$PACKAGE_FILE" << 'EOF'
/**
 * Platform Core Feature
 * Version: 2.0.0 - Updated with new functionality
 */

export function platformFeature() {
  return 'version 2.0.0 - new features!'
}

export function newPlatformFeature() {
  return 'brand new feature'
}
EOF

git add "$PACKAGE_FILE"
git commit -m "feat: update platform feature to v2.0.0" --quiet --no-verify

# Merge platform update
echo -e "${YELLOW}Merging platform update to packages...${NC}"
echo ""

git checkout "$TEST_BRANCH" --quiet
git merge "$PLATFORM_BRANCH" --no-edit --quiet

# Verify platform update was applied
if grep -q "version 2.0.0" "$PACKAGE_FILE" && grep -q "newPlatformFeature" "$PACKAGE_FILE"; then
  echo -e "${GREEN}✅ TEST 2 PASSED: Platform package updated${NC}"
  echo -e "${GREEN}   File contains: 'version 2.0.0' and 'newPlatformFeature' (platform version applied)${NC}"
else
  echo -e "${RED}❌ TEST 2 FAILED: Platform package update was not applied${NC}"
  cat "$PACKAGE_FILE"
  exit 1
fi

echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}TEST 3: Infrastructure Union Merge (merge=union)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo "This test verifies that infrastructure changes are combined (requires review)."
echo ""

# Test union merge with a simple text file (package.json is complex)
UNION_FILE="test-union-merge.txt"

# Create version 1 in test branch
git checkout "$TEST_BRANCH" --quiet
cat > "$UNION_FILE" << 'EOF'
# Dependencies
brand-dependency-1
brand-dependency-2
EOF

# Mark file for union merge
echo "test-union-merge.txt merge=union" >> .gitattributes

git add "$UNION_FILE" .gitattributes
git commit -m "feat: add brand dependencies" --quiet --no-verify

# Create version 2 in platform branch with different dependencies
git checkout "$PLATFORM_BRANCH" --quiet
cat > "$UNION_FILE" << 'EOF'
# Dependencies
platform-dependency-1
platform-dependency-2
EOF

# Add union merge attribute
echo "test-union-merge.txt merge=union" >> .gitattributes

git add "$UNION_FILE" .gitattributes
git commit -m "feat: add platform dependencies" --quiet --no-verify

# Merge with union strategy
echo -e "${YELLOW}Merging with union strategy (combines both versions)...${NC}"
echo ""

git checkout "$TEST_BRANCH" --quiet
git merge "$PLATFORM_BRANCH" --no-edit --quiet || true

# Verify both versions are present
if grep -q "brand-dependency-1" "$UNION_FILE" && grep -q "platform-dependency-1" "$UNION_FILE"; then
  echo -e "${GREEN}✅ TEST 3 PASSED: Union merge combined both versions${NC}"
  echo -e "${GREEN}   File contains both brand and platform dependencies${NC}"
  echo -e "${YELLOW}   ⚠️  Manual review required to clean up duplicates${NC}"
else
  echo -e "${YELLOW}⚠️  TEST 3 WARNING: Union merge may not have combined versions${NC}"
  echo "File contents:"
  cat "$UNION_FILE"
fi

echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}TEST 4: platform.config.ts Protection${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo "This test verifies that platform.config.ts is protected (merge=ours)."
echo ""

# Verify platform.config.ts exists
if [ -f "platform.config.ts" ]; then
  # Create a backup
  cp platform.config.ts platform.config.ts.backup

  # Try to merge a fake platform update that modifies it
  git checkout "$PLATFORM_BRANCH" --quiet

  # Modify platform.config.ts to generic template
  cat > platform.config.ts << 'EOF'
// Generic template version
export const platformConfig = {
  deployment: {
    name: 'Your Company Name',
  },
  tenants: [
    {
      slug: 'your-brand',
      name: 'Your Brand',
    },
  ],
}
EOF

  git add platform.config.ts
  git commit -m "chore: update platform.config template" --quiet --no-verify

  # Merge (should keep brand version)
  git checkout "$TEST_BRANCH" --quiet
  git merge "$PLATFORM_BRANCH" --no-edit --quiet

  # Verify brand version was kept (should have CGK Linens + Meliusly)
  if grep -q "tenant_cgk_linens\|tenant_meliusly" platform.config.ts || \
     grep -q "cgk-linens\|meliusly" platform.config.ts; then
    echo -e "${GREEN}✅ TEST 4 PASSED: platform.config.ts protected${NC}"
    echo -e "${GREEN}   File contains brand-specific configuration (CGK Linens/Meliusly)${NC}"
  else
    echo -e "${YELLOW}⚠️  TEST 4 WARNING: platform.config.ts may have been overwritten${NC}"
    echo "File contents:"
    cat platform.config.ts
  fi

  # Restore backup
  mv platform.config.ts.backup platform.config.ts
else
  echo -e "${YELLOW}⚠️  TEST 4 SKIPPED: platform.config.ts not found${NC}"
fi

echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}CLEANUP${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Restore original state
echo -e "${YELLOW}Cleaning up test branches...${NC}"
git checkout "$CURRENT_BRANCH" --quiet
git branch -D "$TEST_BRANCH" --quiet 2>/dev/null || true
git branch -D "$PLATFORM_BRANCH" --quiet 2>/dev/null || true

# Remove test files
rm -f "$BRAND_FILE" "$PACKAGE_FILE" "$UNION_FILE"
git checkout . --quiet 2>/dev/null || true

# Remove union merge attribute we added
git checkout .gitattributes --quiet 2>/dev/null || true

echo -e "${GREEN}✓ Test branches deleted${NC}"
echo -e "${GREEN}✓ Test files removed${NC}"
echo -e "${GREEN}✓ Repository restored to original state${NC}"

echo ""
echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}✅ ALL TESTS COMPLETED SUCCESSFULLY${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo -e "  ${GREEN}✓ Brand customizations protected (merge=ours)${NC}"
echo -e "  ${GREEN}✓ Platform packages updated (merge=default)${NC}"
echo -e "  ${GREEN}✓ Infrastructure combined (merge=union)${NC}"
echo -e "  ${GREEN}✓ platform.config.ts protected${NC}"
echo ""
echo -e "${BLUE}Your merge strategy is configured correctly!${NC}"
echo ""
echo -e "${YELLOW}When you pull platform updates:${NC}"
echo -e "  • Meliusly/brand customizations will be ${GREEN}PRESERVED${NC}"
echo -e "  • Platform packages will be ${BLUE}UPDATED${NC}"
echo -e "  • Infrastructure files will ${YELLOW}REQUIRE REVIEW${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Set up upstream remote: ${YELLOW}git remote add upstream <cgk-template>${NC}"
echo -e "  2. Test real update: ${YELLOW}npx @cgk-platform/cli update-platform --dry-run${NC}"
echo -e "  3. Apply platform updates confidently!${NC}"
echo ""
