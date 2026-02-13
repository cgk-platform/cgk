#!/bin/bash
# Generate encryption keys for CGK platform tenant integrations
#
# Usage:
#   ./scripts/generate-encryption-keys.sh
#   ./scripts/generate-encryption-keys.sh > .env.generated
#
# Keys generated:
#   INTEGRATION_ENCRYPTION_KEY - Master key for all tenant API credentials
#   SHOPIFY_TOKEN_ENCRYPTION_KEY - Shopify OAuth token encryption

set -e

echo "# CGK Platform Encryption Keys"
echo "# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "#"
echo "# IMPORTANT: Add these to Vercel and pull to local"
echo "# Run: ./scripts/add-encryption-keys-to-vercel.sh"
echo ""
echo "# Master encryption key for all tenant credentials (Stripe, Resend, Wise, etc.)"
echo "# Format: Base64-encoded 32 bytes"
echo "INTEGRATION_ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo ""
echo "# Shopify OAuth token encryption (64 hex chars = 32 bytes)"
echo "SHOPIFY_TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)"
