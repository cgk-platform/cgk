#!/bin/bash
# Add Shopify OAuth credentials to Vercel for cgk-admin app
# Run from project root: bash scripts/add-shopify-oauth-to-vercel.sh
#
# REQUIRED: Set these environment variables before running:
#   export SHOPIFY_CLIENT_ID="your_client_id"
#   export SHOPIFY_CLIENT_SECRET="your_client_secret"
#
# Or copy from apps/shopify-app/.env.local:
#   export $(grep SHOPIFY apps/shopify-app/.env.local | xargs)

set -e

# Check required environment variables
if [ -z "$SHOPIFY_CLIENT_ID" ]; then
  echo "❌ Error: SHOPIFY_CLIENT_ID environment variable not set"
  echo ""
  echo "Set it with:"
  echo "  export SHOPIFY_CLIENT_ID=\"your_client_id\""
  echo ""
  echo "Or load from apps/shopify-app/.env.local:"
  echo "  export \$(grep SHOPIFY apps/shopify-app/.env.local | xargs)"
  exit 1
fi

if [ -z "$SHOPIFY_CLIENT_SECRET" ]; then
  echo "❌ Error: SHOPIFY_CLIENT_SECRET environment variable not set"
  echo ""
  echo "Set it with:"
  echo "  export SHOPIFY_CLIENT_SECRET=\"your_client_secret\""
  echo ""
  echo "Or load from apps/shopify-app/.env.local:"
  echo "  export \$(grep SHOPIFY apps/shopify-app/.env.local | xargs)"
  exit 1
fi

SHOPIFY_API_VERSION="${SHOPIFY_API_VERSION:-2026-01}"

echo "🔧 Adding Shopify OAuth credentials to Vercel for cgk-admin..."
echo "   Client ID: ${SHOPIFY_CLIENT_ID:0:8}... (truncated for security)"
echo ""

cd apps/admin

# Production
echo "📦 Adding to Production..."
echo "$SHOPIFY_CLIENT_ID" | vercel env add SHOPIFY_CLIENT_ID production --scope cgk-linens-88e79683
echo "$SHOPIFY_CLIENT_SECRET" | vercel env add SHOPIFY_CLIENT_SECRET production --scope cgk-linens-88e79683
echo "$SHOPIFY_API_VERSION" | vercel env add SHOPIFY_API_VERSION production --scope cgk-linens-88e79683
echo "$SHOPIFY_CLIENT_SECRET" | vercel env add SHOPIFY_WEBHOOK_SECRET production --scope cgk-linens-88e79683

# Preview
echo "🔍 Adding to Preview..."
echo "$SHOPIFY_CLIENT_ID" | vercel env add SHOPIFY_CLIENT_ID preview --scope cgk-linens-88e79683
echo "$SHOPIFY_CLIENT_SECRET" | vercel env add SHOPIFY_CLIENT_SECRET preview --scope cgk-linens-88e79683
echo "$SHOPIFY_API_VERSION" | vercel env add SHOPIFY_API_VERSION preview --scope cgk-linens-88e79683
echo "$SHOPIFY_CLIENT_SECRET" | vercel env add SHOPIFY_WEBHOOK_SECRET preview --scope cgk-linens-88e79683

# Development
echo "💻 Adding to Development..."
echo "$SHOPIFY_CLIENT_ID" | vercel env add SHOPIFY_CLIENT_ID development --scope cgk-linens-88e79683
echo "$SHOPIFY_CLIENT_SECRET" | vercel env add SHOPIFY_CLIENT_SECRET development --scope cgk-linens-88e79683
echo "$SHOPIFY_API_VERSION" | vercel env add SHOPIFY_API_VERSION development --scope cgk-linens-88e79683
echo "$SHOPIFY_CLIENT_SECRET" | vercel env add SHOPIFY_WEBHOOK_SECRET development --scope cgk-linens-88e79683

echo ""
echo "✅ Shopify OAuth credentials added to all environments!"
echo ""
echo "⚠️  You need to REDEPLOY for changes to take effect:"
echo "   Option 1: Vercel Dashboard → Deployments → Redeploy"
echo "   Option 2: git commit --allow-empty -m 'redeploy' && git push"
