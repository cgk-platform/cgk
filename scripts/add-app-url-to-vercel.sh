#!/bin/bash
# Add NEXT_PUBLIC_APP_URL to Vercel for admin app
# Run from project root: bash scripts/add-app-url-to-vercel.sh

set -e

echo "🔧 Adding NEXT_PUBLIC_APP_URL to Vercel for cgk-admin..."

cd apps/admin

# Production
echo "📦 Adding to Production..."
echo "https://cgk-admin-cgk-linens-88e79683.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production --scope cgk-linens-88e79683

# Preview
echo "🔍 Adding to Preview..."
echo "https://cgk-admin-cgk-linens-88e79683.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL preview --scope cgk-linens-88e79683

# Development
echo "💻 Adding to Development..."
echo "http://localhost:3200" | vercel env add NEXT_PUBLIC_APP_URL development --scope cgk-linens-88e79683

echo ""
echo "✅ NEXT_PUBLIC_APP_URL added to all environments!"
echo ""
echo "⚠️  You need to REDEPLOY for changes to take effect:"
echo "   Option 1: Vercel Dashboard → Deployments → Redeploy"
echo "   Option 2: git commit --allow-empty -m 'redeploy' && git push"
