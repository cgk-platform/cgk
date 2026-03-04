#!/usr/bin/env bash
# clone_preflight.sh -- Pre-flight check for ad clone workflow.
#
# Validates that brand assets, product images, logo, and design system
# are in place before running clone_competitor.py. Outputs a checklist
# with [OK]/[WARN] statuses. Exits 1 on critical issues.
#
# Usage:
#   bash clone_preflight.sh
#   bash clone_preflight.sh --quiet   # exit code only, no output
#
# Derives profile root from script location (4 dirs up):
#   ~/.openclaw[-profile]/skills/ad-library-dl/scripts/clone_preflight.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROFILE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
WORKSPACE="$PROFILE_ROOT/workspace"
BRAND_DIR="$WORKSPACE/brand"
ASSETS_DB="$BRAND_DIR/assets/brand_assets.db"

QUIET=false
[[ "${1:-}" == "--quiet" ]] && QUIET=true

WARNINGS=0
CRITICALS=0

ok() {
    $QUIET || echo "  [OK]   $1"
}

warn() {
    $QUIET || echo "  [WARN] $1"
    WARNINGS=$((WARNINGS + 1))
}

crit() {
    $QUIET || echo "  [CRIT] $1"
    CRITICALS=$((CRITICALS + 1))
}

# Detect profile name
PROFILE_NAME="unknown"
case "$(basename "$PROFILE_ROOT")" in
    .openclaw)           PROFILE_NAME="cgk" ;;
    .openclaw-rawdog)    PROFILE_NAME="rawdog" ;;
    .openclaw-vitahustle) PROFILE_NAME="vitahustle" ;;
esac

$QUIET || echo "=== Clone Pre-Flight Check ($PROFILE_NAME) ==="
$QUIET || echo ""

# ---------- 1. Brand Assets DB ----------
if [[ -f "$ASSETS_DB" ]]; then
    ASSET_COUNT=$(sqlite3 "$ASSETS_DB" "SELECT COUNT(*) FROM brand_assets;" 2>/dev/null || echo "0")
    PRODUCT_COUNT=$(sqlite3 "$ASSETS_DB" "SELECT COUNT(*) FROM products;" 2>/dev/null || echo "0")

    if [[ "$ASSET_COUNT" -gt 0 ]]; then
        ok "Brand assets: $ASSET_COUNT assets in catalog"
    else
        crit "Brand assets: 0 assets -- clone briefs will lack product images"
    fi

    if [[ "$PRODUCT_COUNT" -gt 0 ]]; then
        ok "Products: $PRODUCT_COUNT products in catalog"
    else
        warn "Products: 0 products -- no product metadata for clone prompts"
    fi
else
    crit "Brand assets DB not found at $ASSETS_DB"
    ASSET_COUNT=0
fi

# ---------- 2. Unimported product-images.json ----------
PRODUCT_IMAGES_JSON="$BRAND_DIR/product-images.json"
if [[ -f "$PRODUCT_IMAGES_JSON" ]]; then
    if [[ "${ASSET_COUNT:-0}" -eq 0 ]]; then
        crit "product-images.json exists but catalog is empty -- run: uv run brand_asset_store.py import-json $PRODUCT_IMAGES_JSON"
    else
        ok "product-images.json present (catalog populated)"
    fi
fi

# ---------- 3. Unimported product-images/ directory ----------
PRODUCT_IMAGES_DIR="$BRAND_DIR/product-images"
if [[ -d "$PRODUCT_IMAGES_DIR" ]]; then
    DIR_COUNT=$(find "$PRODUCT_IMAGES_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
    IMG_COUNT=$(find "$PRODUCT_IMAGES_DIR" -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.webp" -o -name "*.jpeg" \) 2>/dev/null | wc -l | tr -d ' ')

    if [[ "$DIR_COUNT" -gt 0 && "${ASSET_COUNT:-0}" -eq 0 ]]; then
        warn "product-images/ has $DIR_COUNT product dirs ($IMG_COUNT images) but catalog is empty"
    elif [[ "$DIR_COUNT" -gt 0 ]]; then
        ok "product-images/: $DIR_COUNT product dirs, $IMG_COUNT images"
    fi
fi

# ---------- 4. Logo ----------
LOGO_FOUND=false
for LOGO_PATH in "$BRAND_DIR/logo.png" "$BRAND_DIR/logo-primary.png" "$BRAND_DIR/logo.svg" "$BRAND_DIR/logo.jpg" "$BRAND_DIR/logo-primary.svg" "$BRAND_DIR/logo-primary.jpg" "$BRAND_DIR/assets/images/uploaded/logo.png"; do
    if [[ -f "$LOGO_PATH" ]]; then
        ok "Logo: $(basename "$LOGO_PATH")"
        LOGO_FOUND=true
        break
    fi
done

if ! $LOGO_FOUND; then
    # Check DB for logo-variant assets
    if [[ -f "$ASSETS_DB" ]]; then
        LOGO_DB=$(sqlite3 "$ASSETS_DB" "SELECT COUNT(*) FROM brand_assets WHERE asset_type='logo-variant';" 2>/dev/null || echo "0")
        if [[ "$LOGO_DB" -gt 0 ]]; then
            ok "Logo: $LOGO_DB logo-variant asset(s) in catalog"
            LOGO_FOUND=true
        fi
    fi
fi

if ! $LOGO_FOUND; then
    warn "No logo found -- clone ads will lack brand identity"
fi

# ---------- 5. DESIGN-SYSTEM.md ----------
DS_PATH="$WORKSPACE/DESIGN-SYSTEM.md"
if [[ -f "$DS_PATH" ]]; then
    DS_SIZE=$(wc -c < "$DS_PATH" | tr -d ' ')
    DS_HEAD=$(head -c 200 "$DS_PATH")
    if [[ "$DS_SIZE" -gt 100 ]] && ! echo "$DS_HEAD" | grep -q '{{'; then
        ok "DESIGN-SYSTEM.md: ${DS_SIZE} bytes"
    else
        warn "DESIGN-SYSTEM.md exists but appears to be a template placeholder"
    fi
else
    warn "No DESIGN-SYSTEM.md found"
fi

# ---------- 6. colors.md ----------
COLORS_PATH="$BRAND_DIR/colors.md"
if [[ -f "$COLORS_PATH" ]]; then
    COLORS_SIZE=$(wc -c < "$COLORS_PATH" | tr -d ' ')
    COLORS_HEAD=$(head -c 200 "$COLORS_PATH")
    if [[ "$COLORS_SIZE" -gt 50 ]] && ! echo "$COLORS_HEAD" | grep -q '{{'; then
        ok "colors.md: ${COLORS_SIZE} bytes"
    else
        warn "colors.md exists but appears to be a template placeholder"
    fi
else
    warn "No colors.md found"
fi

# ---------- 7. design-rules.md ----------
RULES_PATH="$BRAND_DIR/design-rules.md"
if [[ -f "$RULES_PATH" ]]; then
    RULES_SIZE=$(wc -c < "$RULES_PATH" | tr -d ' ')
    RULES_HEAD=$(head -c 200 "$RULES_PATH")
    if [[ "$RULES_SIZE" -gt 50 ]] && ! echo "$RULES_HEAD" | grep -q '{{'; then
        ok "design-rules.md: ${RULES_SIZE} bytes"
    else
        warn "design-rules.md exists but appears to be a template placeholder"
    fi
else
    warn "No design-rules.md found"
fi

# ---------- Summary ----------
$QUIET || echo ""
if [[ "$CRITICALS" -gt 0 ]]; then
    $QUIET || echo "  RESULT: FAIL -- $CRITICALS critical issue(s), $WARNINGS warning(s)"
    exit 1
elif [[ "$WARNINGS" -gt 0 ]]; then
    $QUIET || echo "  RESULT: PASS with $WARNINGS warning(s)"
    exit 0
else
    $QUIET || echo "  RESULT: ALL CLEAR"
    exit 0
fi
