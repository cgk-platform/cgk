#!/bin/bash
set -e

# Generate secrets for Vercel deployment
# This script runs during the build process when GENERATE_SECRETS=true

echo "🔐 Generating secrets for Vercel deployment..."

# Function to generate a random secret
generate_secret() {
  openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to generate a UUID
generate_uuid() {
  node -e "console.log(require('crypto').randomUUID())"
}

# Check if we're in Vercel build environment
if [ "$VERCEL" != "1" ]; then
  echo "⚠️  Not in Vercel environment, skipping secret generation"
  exit 0
fi

# Check if secrets should be generated
if [ "$GENERATE_SECRETS" != "true" ]; then
  echo "ℹ️  GENERATE_SECRETS not set, skipping"
  exit 0
fi

echo "📝 Generating secrets..."

# Generate secrets
JWT_SECRET=$(generate_secret)
ENCRYPTION_KEY=$(generate_secret)
SESSION_SECRET=$(generate_secret)
WEBHOOK_SECRET=$(generate_secret)

# Output to Vercel env (these will be picked up by the build)
echo "JWT_SECRET=$JWT_SECRET" >> .env.production
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env.production
echo "SESSION_SECRET=$SESSION_SECRET" >> .env.production
echo "WEBHOOK_SECRET=$WEBHOOK_SECRET" >> .env.production

# Add to Vercel environment variables via CLI (for future deployments)
if command -v vercel &> /dev/null; then
  echo "📤 Adding secrets to Vercel project..."

  echo "$JWT_SECRET" | vercel env add JWT_SECRET production --yes || true
  echo "$ENCRYPTION_KEY" | vercel env add ENCRYPTION_KEY production --yes || true
  echo "$SESSION_SECRET" | vercel env add SESSION_SECRET production --yes || true
  echo "$WEBHOOK_SECRET" | vercel env add WEBHOOK_SECRET production --yes || true

  echo "✅ Secrets added to Vercel project"
else
  echo "⚠️  Vercel CLI not found, secrets only available for this build"
fi

# Create apps/.env.local files for each app
APPS=("admin" "storefront" "creator-portal" "contractor-portal" "orchestrator" "shopify-app" "command-center")

for app in "${APPS[@]}"; do
  ENV_FILE="apps/$app/.env.local"

  echo "📝 Creating $ENV_FILE..."

  cat > "$ENV_FILE" <<EOF
# Auto-generated secrets (Vercel deployment)
# Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

# JWT & Encryption
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
SESSION_SECRET=$SESSION_SECRET
WEBHOOK_SECRET=$WEBHOOK_SECRET

# Database (from Neon integration)
# DATABASE_URL will be automatically set by Vercel Neon integration
# POSTGRES_URL will be automatically set by Vercel Neon integration

# Redis (from Upstash integration)
# UPSTASH_REDIS_REST_URL will be automatically set by Vercel Upstash integration
# UPSTASH_REDIS_REST_TOKEN will be automatically set by Vercel Upstash integration

# Required: Add these manually in post-deploy wizard (/setup)
# SHOPIFY_API_KEY=
# SHOPIFY_API_SECRET=
# SHOPIFY_APP_URL=
# STRIPE_SECRET_KEY=
# STRIPE_PUBLISHABLE_KEY=
# STRIPE_WEBHOOK_SECRET=

# Optional integrations
# WISE_API_KEY=
# WISE_PROFILE_ID=
# OPENAI_API_KEY=

# Next.js
NEXT_PUBLIC_APP_URL=https://${VERCEL_URL}
NODE_ENV=production
EOF

  echo "✅ Created $ENV_FILE"
done

echo ""
echo "✅ Secret generation complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Deployment will complete with auto-generated secrets"
echo "   2. Visit your app at https://\${VERCEL_URL}"
echo "   3. Go to /setup to add Shopify and Stripe credentials"
echo ""
echo "🔒 Security note: These secrets are stored in Vercel's encrypted environment variables"
echo ""
