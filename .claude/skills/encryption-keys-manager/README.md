# Encryption Keys Manager

> **Purpose**: Automated workflow for generating, rotating, and managing encryption keys used for tenant credentials (Stripe, Resend, Wise, etc.) with Vercel environment variable integration.

**Version**: 1.0.0
**Type**: Workflow
**Invocation**: `/encryption-keys-manager [action] [options]`

---

## Overview

The Encryption Keys Manager is a security workflow skill that handles encryption key lifecycle management for CGK's tenant-managed integrations. It generates cryptographically secure keys, rotates them on schedule, updates Vercel environment variables, and maintains audit trails.

**CRITICAL**: CGK uses **AES-256-GCM encryption** for tenant credentials (Stripe keys, Resend tokens, etc.). Keys must be securely generated, regularly rotated, and properly stored in Vercel. This skill automates the entire process to prevent human error.

---

## Usage

### Basic Usage

```bash
# Generate new encryption key
/encryption-keys-manager generate

# Rotate encryption key (decrypt with old, re-encrypt with new)
/encryption-keys-manager rotate

# Verify encryption key configuration
/encryption-keys-manager verify

# View key rotation history
/encryption-keys-manager history
```

### Scheduled Rotation (CI/CD)

```yaml
# .github/workflows/rotate-encryption-keys.yml
name: Rotate Encryption Keys

on:
  schedule:
    # Run quarterly (every 3 months)
    - cron: '0 0 1 */3 *'
  workflow_dispatch:  # Allow manual trigger

jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install

      - name: Rotate Encryption Keys
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: /encryption-keys-manager rotate --auto-verify

      - name: Notify Team
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "✅ Encryption keys rotated successfully"
            }
```

---

## Actions

### 1. Generate

**Purpose**: Create a new 256-bit encryption key

**Usage**:
```bash
/encryption-keys-manager generate [options]
```

**Options**:
| Option | Description | Default |
|--------|-------------|---------|
| `--type <algorithm>` | Encryption algorithm (aes-256-gcm) | `aes-256-gcm` |
| `--output <format>` | Output format (hex, base64) | `hex` |
| `--save-to-vercel` | Automatically save to Vercel env vars | `false` |
| `--apps <list>` | Apps to update (comma-separated) | All apps |

**Example**:
```bash
# Generate and display key
/encryption-keys-manager generate

# Generate and save to Vercel for all apps
/encryption-keys-manager generate --save-to-vercel

# Generate for specific apps
/encryption-keys-manager generate --save-to-vercel --apps admin,storefront,orchestrator
```

**Output**:
```
🔑 Encryption Key Generator
===========================

Generated: 256-bit AES-GCM key
Format: Hex (64 characters)
Key: 5a7d9e3f8c1b6a2d4e7f9c8b5a3d2e1f8c9b6a5d4e3f2a1d9c8b7a6e5f4d3c2b1a

⚠️  CRITICAL - Save this key immediately!

To save to Vercel:
  /encryption-keys-manager generate --save-to-vercel

To save manually:
  vercel env add INTEGRATION_ENCRYPTION_KEY production
  (paste key when prompted)

To update .env.local:
  echo "INTEGRATION_ENCRYPTION_KEY=5a7d9e..." >> apps/admin/.env.local
```

---

### 2. Rotate

**Purpose**: Rotate encryption key (decrypt existing credentials with old key, re-encrypt with new key)

**Usage**:
```bash
/encryption-keys-manager rotate [options]
```

**Options**:
| Option | Description | Default |
|--------|-------------|---------|
| `--dry-run` | Preview rotation without applying | `false` |
| `--auto-verify` | Verify rotation succeeded | `true` |
| `--backup` | Create backup before rotation | `true` |
| `--apps <list>` | Apps to rotate (comma-separated) | All apps |

**Example**:
```bash
# Dry-run (preview rotation)
/encryption-keys-manager rotate --dry-run

# Rotate with automatic verification
/encryption-keys-manager rotate --auto-verify

# Rotate for specific apps
/encryption-keys-manager rotate --apps admin,orchestrator
```

**Workflow**:
```
1. ✅ Verify current key in Vercel
2. ✅ Generate new encryption key
3. ✅ Create backup of tenant_api_credentials table
4. ✅ Decrypt all credentials using old key
5. ✅ Encrypt all credentials using new key
6. ✅ Update INTEGRATION_ENCRYPTION_KEY in Vercel (all environments)
7. ✅ Verify decryption works with new key
8. ✅ Log rotation event to audit trail
9. ✅ Create rollback script (in case of issues)
```

**Output**:
```
🔄 Encryption Key Rotation
===========================

Step 1/9: Verifying current key... ✅
Step 2/9: Generating new key... ✅
Step 3/9: Creating backup... ✅
  - Backed up 47 credentials to backup/2026-02-27_encryption_backup.sql

Step 4/9: Decrypting credentials (old key)... ✅
  - Decrypted 47 credentials

Step 5/9: Encrypting credentials (new key)... ✅
  - Encrypted 47 credentials

Step 6/9: Updating Vercel environment variables... ✅
  Apps updated:
    - admin (production, preview, development)
    - storefront (production, preview, development)
    - orchestrator (production, preview, development)
    - creator-portal (production, preview, development)
    - contractor-portal (production, preview, development)

Step 7/9: Verifying decryption... ✅
  - Verified 47/47 credentials decrypt correctly

Step 8/9: Logging rotation event... ✅
  - Event ID: rot_20260227_abc123

Step 9/9: Creating rollback script... ✅
  - Rollback script: scripts/rollback_rotation_20260227.sh

===========================
✅ Rotation completed successfully

New key deployed to 5 apps (15 environments)
Old key backed up to: backup/2026-02-27_old_key.txt

Next steps:
  1. Verify apps still work: pnpm dev
  2. Test Stripe integration
  3. Test Resend integration
  4. Monitor for errors

Rollback (if needed):
  bash scripts/rollback_rotation_20260227.sh
```

---

### 3. Verify

**Purpose**: Verify encryption key configuration is correct

**Usage**:
```bash
/encryption-keys-manager verify [options]
```

**Options**:
| Option | Description | Default |
|--------|-------------|---------|
| `--apps <list>` | Apps to verify (comma-separated) | All apps |
| `--check-vercel` | Check Vercel env vars | `true` |
| `--check-credentials` | Test decrypt sample credentials | `true` |

**Example**:
```bash
# Verify all apps
/encryption-keys-manager verify

# Verify specific app
/encryption-keys-manager verify --apps admin

# Skip Vercel check (only verify local)
/encryption-keys-manager verify --check-vercel=false
```

**Output**:
```
🔍 Encryption Key Verification
===============================

Checking: 5 apps

admin:
  ✅ .env.local has INTEGRATION_ENCRYPTION_KEY
  ✅ Vercel production has INTEGRATION_ENCRYPTION_KEY
  ✅ Vercel preview has INTEGRATION_ENCRYPTION_KEY
  ✅ Vercel development has INTEGRATION_ENCRYPTION_KEY
  ✅ Key format valid (64 hex chars)
  ✅ Sample credential decrypts successfully

storefront:
  ✅ .env.local has INTEGRATION_ENCRYPTION_KEY
  ✅ Vercel production has INTEGRATION_ENCRYPTION_KEY
  ✅ Vercel preview has INTEGRATION_ENCRYPTION_KEY
  ✅ Vercel development has INTEGRATION_ENCRYPTION_KEY
  ✅ Key format valid (64 hex chars)
  ✅ Sample credential decrypts successfully

orchestrator:
  ✅ .env.local has INTEGRATION_ENCRYPTION_KEY
  ❌ Vercel production MISSING INTEGRATION_ENCRYPTION_KEY
  ❌ Vercel preview MISSING INTEGRATION_ENCRYPTION_KEY
  ❌ Vercel development MISSING INTEGRATION_ENCRYPTION_KEY

creator-portal:
  ✅ All checks passed

contractor-portal:
  ✅ All checks passed

===========================
⚠️  Issues found: 1 app

Run to fix:
  cd apps/orchestrator
  vercel env add INTEGRATION_ENCRYPTION_KEY production --scope cgk-linens-88e79683
  vercel env add INTEGRATION_ENCRYPTION_KEY preview --scope cgk-linens-88e79683
  vercel env add INTEGRATION_ENCRYPTION_KEY development --scope cgk-linens-88e79683
```

---

### 4. History

**Purpose**: View encryption key rotation history and audit trail

**Usage**:
```bash
/encryption-keys-manager history [options]
```

**Options**:
| Option | Description | Default |
|--------|-------------|---------|
| `--limit <n>` | Number of events to show | `10` |
| `--format <type>` | Output format (text, json, csv) | `text` |
| `--since <date>` | Show events since date (YYYY-MM-DD) | All time |

**Example**:
```bash
# Last 10 rotation events
/encryption-keys-manager history

# Last 30 days
/encryption-keys-manager history --since 2026-01-28

# JSON format for automation
/encryption-keys-manager history --format json
```

**Output**:
```
📊 Encryption Key Rotation History
===================================

Total rotations: 4
Last rotation: 2026-02-27 14:23:45 UTC

Recent Events:
  1. 2026-02-27 14:23:45 - Rotation (manual)
     - Apps: admin, storefront, orchestrator, creator-portal, contractor-portal
     - Credentials re-encrypted: 47
     - User: admin@example.com
     - Event ID: rot_20260227_abc123

  2. 2025-11-15 10:12:33 - Rotation (scheduled)
     - Apps: admin, storefront, orchestrator, creator-portal, contractor-portal
     - Credentials re-encrypted: 42
     - User: github-actions[bot]
     - Event ID: rot_20251115_def456

  3. 2025-08-10 09:45:22 - Rotation (manual)
     - Apps: admin, storefront, orchestrator
     - Credentials re-encrypted: 38
     - User: admin@example.com
     - Event ID: rot_20250810_ghi789

  4. 2025-05-20 16:30:11 - Initial key generation
     - Apps: admin, storefront
     - User: admin@example.com
     - Event ID: gen_20250520_jkl012

Average rotation interval: 91 days
Recommended interval: 90 days (quarterly)
Next rotation due: 2026-05-28
```

---

## Vercel CLI Integration

### Adding Keys to All Apps

```bash
# Generate key
key=$(/encryption-keys-manager generate --output hex | grep "Key:" | awk '{print $2}')

# Add to all apps (all environments)
for app in admin storefront orchestrator creator-portal contractor-portal; do
  echo "Adding key to $app..."
  (cd apps/$app && \
    printf "$key" | vercel env add INTEGRATION_ENCRYPTION_KEY production --scope cgk-linens-88e79683 && \
    printf "$key" | vercel env add INTEGRATION_ENCRYPTION_KEY preview --scope cgk-linens-88e79683 && \
    printf "$key" | vercel env add INTEGRATION_ENCRYPTION_KEY development --scope cgk-linens-88e79683)
done

echo "✅ Key added to all apps"
```

---

### Pulling Keys Locally

```bash
# Pull all apps' env vars (includes INTEGRATION_ENCRYPTION_KEY)
pnpm env:pull

# Or per-app
cd apps/admin
vercel env pull .env.local --scope cgk-linens-88e79683
```

---

## Security Best Practices

### Key Generation

- **Algorithm**: AES-256-GCM (industry standard, FIPS 140-2 compliant)
- **Key Size**: 256 bits (32 bytes)
- **Randomness**: Uses Node.js `crypto.randomBytes()` (cryptographically secure)
- **Encoding**: Hex (64 characters) or Base64 (44 characters)

**NEVER**:
- ❌ Use weak keys (e.g., passwords, UUIDs, timestamps)
- ❌ Reuse keys across environments
- ❌ Store keys in git
- ❌ Share keys in plaintext (Slack, email, etc.)

---

### Key Rotation Schedule

**Recommended**: Quarterly (every 90 days)

**Why rotate**:
- Limits blast radius if key is compromised
- Meets compliance requirements (PCI DSS, SOC 2)
- Best practice for long-lived encryption keys

**When to rotate immediately**:
- Key suspected to be compromised
- Employee with access leaves company
- Security incident or breach
- Compliance audit requirement

---

### Key Storage

**DO**:
- ✅ Store in Vercel environment variables (encrypted at rest)
- ✅ Store in `.env.local` for development (gitignored)
- ✅ Back up old keys securely (encrypted backup location)

**DON'T**:
- ❌ Commit to git (even in private repos)
- ❌ Share via Slack, email, or messaging apps
- ❌ Store in plaintext files
- ❌ Log keys in application logs

---

## Troubleshooting

### Issue: "Rotation failed - some credentials couldn't be decrypted"

**Cause**: Old key doesn't match key used to encrypt credentials

**Fix**: Use rollback script to restore old key

```bash
# Rollback rotation
bash scripts/rollback_rotation_20260227.sh

# Verify old key in Vercel matches backup
cat backup/2026-02-27_old_key.txt
vercel env ls --scope cgk-linens-88e79683

# Try rotation again with correct old key
/encryption-keys-manager rotate
```

---

### Issue: "Vercel API error - unauthorized"

**Cause**: Missing or invalid VERCEL_TOKEN

**Fix**: Set VERCEL_TOKEN environment variable

```bash
# Get token from https://vercel.com/account/tokens
export VERCEL_TOKEN=your_token_here

# Or add to .env
echo "VERCEL_TOKEN=your_token_here" >> .env

# Try again
/encryption-keys-manager rotate
```

---

### Issue: "Apps still using old key after rotation"

**Cause**: Vercel environment variables not updated or cached

**Fix**: Force redeploy apps

```bash
# Trigger redeployment for all apps
for app in admin storefront orchestrator creator-portal contractor-portal; do
  (cd apps/$app && vercel deploy --force --scope cgk-linens-88e79683)
done
```

---

## Related Documentation

- **CLAUDE.md**: [Tenant-Managed Integrations](/CLAUDE.md#tenant-managed-integrations-critical)
- **Encryption Patterns**: `.claude/knowledge-bases/encryption-patterns/README.md`
- **@cgk-platform/integrations**: `packages/integrations/README.md` - Client factory functions
- **Related Skills**:
  - [deployment-readiness-checker](../deployment-readiness-checker/README.md) - Pre-deployment validation
  - [vercel-config-auditor](../vercel-config-auditor/README.md) - Vercel config validation
  - [tenant-provisioner](../tenant-provisioner/README.md) - New tenant setup

---

## Implementation Details

### Encryption Algorithm (AES-256-GCM)

```typescript
// Encrypt credential
function encryptCredential(plaintext: string, key: string): string {
  const algorithm = 'aes-256-gcm'
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

// Decrypt credential
function decryptCredential(ciphertext: string, key: string): string {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':')

  const algorithm = 'aes-256-gcm'
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
```

**Why AES-256-GCM**:
- **AES-256**: Strongest symmetric encryption (approved by NSA for TOP SECRET data)
- **GCM mode**: Authenticated encryption (prevents tampering)
- **IV**: Random initialization vector (prevents pattern detection)
- **Auth tag**: Verifies data integrity (detects modifications)

---

## Changelog

### Version 1.0.0 (2026-02-27)
- Initial release
- Generate cryptographically secure 256-bit keys
- Rotate keys with automatic credential re-encryption
- Verify key configuration across all apps
- View rotation history and audit trail
- Vercel CLI integration for environment variable management
- Automatic backup and rollback scripts
- Quarterly rotation scheduling via GitHub Actions
