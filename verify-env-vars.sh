#!/bin/bash
# Script to verify environment variables across all CGK apps
# Run this from the project root: bash verify-env-vars.sh

set -e

SCOPE="cgk-linens-88e79683"

echo "=== CGK Platform - Environment Variable Verification ==="
echo ""
echo "Checking critical URL environment variables across all apps..."
echo ""

# Array of app directories and their Vercel project names
declare -A APPS=(
  ["apps/admin"]="cgk-admin"
  ["apps/storefront"]="cgk-storefront"
  ["apps/orchestrator"]="cgk-orchestrator"
  ["apps/creator-portal"]="cgk-creator-portal"
  ["apps/contractor-portal"]="cgk-contractor-portal"
  ["apps/mcp-server"]="cgk-mcp-server"
)

# Critical env vars to check
CRITICAL_VARS=(
  "NEXT_PUBLIC_ADMIN_URL"
  "NEXT_PUBLIC_STOREFRONT_URL"
  "NEXT_PUBLIC_ORCHESTRATOR_URL"
  "DATABASE_URL"
  "JWT_SECRET"
)

for app_dir in "${!APPS[@]}"; do
  project_name="${APPS[$app_dir]}"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 $project_name (${app_dir})"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  cd "$app_dir"

  # Pull env vars to temp file
  temp_file=$(mktemp)
  if vercel env pull "$temp_file" --scope "$SCOPE" 2>/dev/null; then
    echo "✅ Successfully pulled environment variables"
    echo ""

    # Check each critical var
    for var in "${CRITICAL_VARS[@]}"; do
      value=$(grep "^${var}=" "$temp_file" 2>/dev/null | cut -d'=' -f2- | tr -d '"')
      if [ -n "$value" ]; then
        # Truncate long values
        if [ ${#value} -gt 60 ]; then
          display_value="${value:0:60}..."
        else
          display_value="$value"
        fi
        echo "  ✓ $var = $display_value"
      else
        echo "  ✗ $var = [NOT SET]"
      fi
    done

    rm "$temp_file"
  else
    echo "❌ Failed to pull environment variables"
    echo "   Run 'vercel link' in $app_dir first"
  fi

  echo ""
  cd - > /dev/null 2>&1
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Verification complete!"
echo ""
echo "Expected values:"
echo "  NEXT_PUBLIC_ADMIN_URL=https://cgk-admin.vercel.app"
echo "  NEXT_PUBLIC_STOREFRONT_URL=https://cgk-storefront.vercel.app"
echo "  NEXT_PUBLIC_ORCHESTRATOR_URL=https://cgk-orchestrator.vercel.app"
echo ""
echo "If any values are incorrect, update them with:"
echo "  vercel env add VAR_NAME production --scope $SCOPE"
echo "  vercel env add VAR_NAME preview --scope $SCOPE"
echo "  vercel env add VAR_NAME development --scope $SCOPE"
