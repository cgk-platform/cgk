#!/bin/bash
# ============================================================================
# CGK PLATFORM - BRAND SECRET GENERATION SCRIPT
# ============================================================================
#
# Generates all cryptographically secure secrets needed for a new brand
# deployment using the WordPress-style fork model.
#
# Usage:
#   ./scripts/generate-brand-secrets.sh <brand-name>
#   ./scripts/generate-brand-secrets.sh <brand-name> > brand-secrets.txt
#
# Example:
#   ./scripts/generate-brand-secrets.sh meliusly > meliusly-secrets.txt
#   ./scripts/generate-brand-secrets.sh vitahustle > vitahustle-secrets.txt
#
# Output:
#   - Environment variable format ready to copy to .env.local or Vercel
#   - All secrets are cryptographically secure (openssl rand)
#   - 64-character hex strings (32 bytes) for all sensitive keys
#
# Security:
#   - NEVER commit the output file to git
#   - Store securely (1Password, Vault, etc.)
#   - Add to Vercel immediately after generation
#   - Delete the output file after use
#
# ============================================================================

set -e

BRAND_NAME=$1

if [ -z "$BRAND_NAME" ]; then
  echo "❌ Error: Brand name required"
  echo ""
  echo "Usage: ./scripts/generate-brand-secrets.sh <brand-name>"
  echo ""
  echo "Examples:"
  echo "  ./scripts/generate-brand-secrets.sh meliusly"
  echo "  ./scripts/generate-brand-secrets.sh vitahustle"
  echo "  ./scripts/generate-brand-secrets.sh your-brand > secrets.txt"
  exit 1
fi

# Header
echo "# ============================================================================"
echo "# CGK PLATFORM - BRAND SECRETS FOR: $BRAND_NAME"
echo "# ============================================================================"
echo "#"
echo "# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "# Brand: $BRAND_NAME"
echo "#"
echo "# SECURITY WARNING:"
echo "#   - DO NOT commit this file to git"
echo "#   - Store in secure vault (1Password, Vault, etc.)"
echo "#   - Add to Vercel immediately"
echo "#   - Delete after adding to Vercel"
echo "#"
echo "# Add to Vercel:"
echo "#   cd apps/admin"
echo "#   vercel env add JWT_SECRET production --scope your-team"
echo "#   vercel env add JWT_SECRET preview --scope your-team"
echo "#   vercel env add JWT_SECRET development --scope your-team"
echo "#   (repeat for all variables below)"
echo "#"
echo "# ============================================================================"
echo ""

# Authentication Secrets
echo "# ============================================================================"
echo "# AUTHENTICATION SECRETS"
echo "# ============================================================================"
echo "# These are used to sign JWTs and sessions"
echo "# Format: 64-character hex string (32 bytes)"
echo ""
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "SESSION_SECRET=$(openssl rand -hex 32)"
echo "CREATOR_JWT_SECRET=$(openssl rand -hex 32)"
echo "CONTRACTOR_JWT_SECRET=$(openssl rand -hex 32)"
echo ""

# Encryption Keys
echo "# ============================================================================"
echo "# ENCRYPTION KEYS"
echo "# ============================================================================"
echo "# These are used to encrypt sensitive data in the database"
echo "# Format: 64-character hex string (32 bytes)"
echo ""
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "INTEGRATION_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "SHOPIFY_TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "DAM_TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "TAX_TIN_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "TAX_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "SLACK_TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "GSC_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "GOOGLE_ADS_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "META_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "TIKTOK_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo ""

# Platform API Keys
echo "# ============================================================================"
echo "# PLATFORM API KEYS"
echo "# ============================================================================"
echo "# These are used for inter-app communication and platform access"
echo "# Format: Base64-encoded 32 bytes (44 characters)"
echo ""
echo "CGK_PLATFORM_API_KEY=$(openssl rand -base64 32)"
echo "INTERNAL_API_KEY=$(openssl rand -base64 32)"
echo "PLATFORM_API_KEY=$(openssl rand -base64 32)"
echo ""

# Footer
echo "# ============================================================================"
echo "# NEXT STEPS"
echo "# ============================================================================"
echo "#"
echo "# 1. Add these to Vercel for each app:"
echo "#    cd apps/admin && vercel env add JWT_SECRET production --scope your-team"
echo "#    cd apps/storefront && vercel env add JWT_SECRET production --scope your-team"
echo "#    cd apps/creator-portal && vercel env add JWT_SECRET production --scope your-team"
echo "#    cd apps/contractor-portal && vercel env add JWT_SECRET production --scope your-team"
echo "#"
echo "# 2. Pull to local .env.local:"
echo "#    cd apps/admin && vercel env pull .env.local --scope your-team"
echo "#"
echo "# 3. Add CGK Platform Hub credentials (provided by CGK):"
echo "#    - DATABASE_URL"
echo "#    - REDIS_URL"
echo "#    - KV_REST_API_URL"
echo "#    - KV_REST_API_TOKEN"
echo "#"
echo "# 4. Add your integration credentials:"
echo "#    - SHOPIFY_CLIENT_ID"
echo "#    - SHOPIFY_CLIENT_SECRET"
echo "#    - STRIPE_SECRET_KEY"
echo "#    - RESEND_API_KEY"
echo "#    - etc."
echo "#"
echo "# 5. Delete this file securely:"
echo "#    rm brand-secrets.txt"
echo "#    (after adding to Vercel and storing in vault)"
echo "#"
echo "# ============================================================================"
echo ""
echo "✅ Secrets generated successfully for: $BRAND_NAME"
echo ""
echo "⚠️  SECURITY REMINDER:"
echo "   - Add to Vercel immediately"
echo "   - Store in secure vault"
echo "   - DELETE this file after use"
echo ""
