# Architecture Decisions - Finalized

> **Last Updated**: 2025-02-10
> **Status**: APPROVED - These decisions are final

---

## Decision 1: Background Jobs Provider

**Choice**: **Trigger.dev v4**

**Rationale**:
- Already proven in RAWDOG codebase (199 tasks running)
- Team familiarity with the SDK
- Step-based execution with retry
- Good developer experience
- Tenant isolation via payload

**SDK Pattern**:
```typescript
import { task } from "@trigger.dev/sdk"

export const syncOrder = task({
  id: "sync-shopify-order",
  retry: { maxAttempts: 3 },
  run: async (payload: { tenantId: string; orderId: string }) => {
    const { tenantId, orderId } = payload

    return await withTenant(tenantId, async () => {
      // Implementation
      return { success: true }
    })
  }
})
```

**CRITICAL**: Always use `@trigger.dev/sdk` v4, NEVER `client.defineJob` (v2 deprecated)

---

## Decision 2: Environment Variables vs Database Config

**Choice**: **Hybrid - WordPress Style**

### Initial Platform Setup (Environment Variables)
These are set once during platform installation:

```bash
# Core infrastructure (set during install wizard)
DATABASE_URL=postgresql://...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Platform encryption (generated during install)
PLATFORM_ENCRYPTION_KEY=...  # AES-256 key for tenant secrets

# Auth secrets (generated during install)
JWT_SECRET=...
SESSION_SECRET=...

# Background jobs
TRIGGER_DEV_API_KEY=...
TRIGGER_DEV_API_URL=...
```

### Per-Tenant Configuration (Database with Encryption)
All tenant-specific config stored in database, sensitive values encrypted:

```sql
-- Tenant configuration table
CREATE TABLE tenant_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES organizations(id),

  -- Non-sensitive settings (plaintext)
  settings JSONB NOT NULL DEFAULT '{}',

  -- Sensitive settings (AES-256-GCM encrypted)
  encrypted_secrets BYTEA,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example settings structure
{
  "shopify": {
    "store_domain": "mystore.myshopify.com",  -- plaintext
    "api_version": "2024-01"                   -- plaintext
  },
  "features": {
    "creators_enabled": true,
    "subscriptions_enabled": true
  }
}

-- Example encrypted_secrets (decrypted)
{
  "shopify_access_token": "shpat_...",
  "stripe_secret_key": "sk_live_...",
  "wise_api_key": "...",
  "meta_access_token": "...",
  "google_ads_refresh_token": "..."
}
```

### Security Pattern (WordPress-inspired)
```typescript
// packages/config/src/tenant-config.ts
import { encrypt, decrypt } from '@cgk-platform/crypto'

export class TenantConfig {
  private encryptionKey: string

  constructor() {
    this.encryptionKey = process.env.PLATFORM_ENCRYPTION_KEY!
    if (!this.encryptionKey) {
      throw new Error('PLATFORM_ENCRYPTION_KEY not set')
    }
  }

  async getSecret(tenantId: string, key: string): Promise<string | null> {
    const row = await withTenant(tenantId, () =>
      sql`SELECT encrypted_secrets FROM tenant_config WHERE tenant_id = ${tenantId}`
    )

    if (!row?.encrypted_secrets) return null

    const decrypted = decrypt(row.encrypted_secrets, this.encryptionKey)
    const secrets = JSON.parse(decrypted)
    return secrets[key] ?? null
  }

  async setSecret(tenantId: string, key: string, value: string): Promise<void> {
    // Get existing secrets
    const existing = await this.getAllSecrets(tenantId)
    existing[key] = value

    // Encrypt and save
    const encrypted = encrypt(JSON.stringify(existing), this.encryptionKey)
    await withTenant(tenantId, () =>
      sql`UPDATE tenant_config SET encrypted_secrets = ${encrypted} WHERE tenant_id = ${tenantId}`
    )
  }
}
```

---

## Decision 3: Update Distribution Strategy

**Choice**: **Hybrid NPM + Git (WordPress-inspired)**

### Package Updates via NPM
Core platform packages published to npm:
```
@cgk-platform/core       - Core utilities
@cgk-platform/db         - Database client
@cgk-platform/auth       - Authentication
@cgk-platform/ui         - UI components
@cgk-platform/commerce   - Commerce abstraction
@cgk-platform/jobs       - Background jobs
@cgk-platform/mcp        - MCP server utilities
@cgk-platform/cli        - CLI tool
```

**Update command**:
```bash
# Update all CGK packages
pnpm update "@cgk-platform/*"

# Update to specific version
pnpm update "@cgk-platform/*@1.2.0"

# Check for updates
npx @cgk-platform/cli doctor --check-updates
```

### App Customizations via Git
Apps (admin, storefront, creator-portal) are cloned/forked:
```bash
# Initial setup
npx @cgk-platform/cli create my-brand --template=full

# Updates: merge from upstream
git remote add cgk-upstream https://github.com/cgk/platform.git
git fetch cgk-upstream
git merge cgk-upstream/main --no-commit

# Or: selective cherry-pick
git cherry-pick <commit-hash>
```

### Version Channels
```
stable   - Production ready, fully tested
beta     - Feature complete, testing phase
canary   - Latest features, may have bugs
```

### CLI Update Commands
```bash
# Check current versions
npx @cgk-platform/cli version

# Check for updates
npx @cgk-platform/cli doctor --check-updates

# Update packages
npx @cgk-platform/cli update

# Update to specific channel
npx @cgk-platform/cli update --channel=beta
```

---

## Decision 4: Encryption Standard

**Choice**: **AES-256-GCM** (Industry Standard)

**Rationale**:
- Industry standard for data-at-rest encryption
- Built into Node.js crypto module (no external deps)
- Authenticated encryption (prevents tampering)
- Already used in RAWDOG for Shopify tokens

**Implementation**:
```typescript
// packages/crypto/src/aes.ts
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

export function encrypt(plaintext: string, key: string): Buffer {
  const iv = randomBytes(IV_LENGTH)
  const keyBuffer = Buffer.from(key, 'hex')

  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ])
  const authTag = cipher.getAuthTag()

  // Format: IV (16) + AuthTag (16) + Ciphertext
  return Buffer.concat([iv, authTag, encrypted])
}

export function decrypt(encrypted: Buffer, key: string): string {
  const iv = encrypted.subarray(0, IV_LENGTH)
  const authTag = encrypted.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = encrypted.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const keyBuffer = Buffer.from(key, 'hex')
  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv)
  decipher.setAuthTag(authTag)

  return decipher.update(ciphertext) + decipher.final('utf8')
}

// Key generation (run once during platform setup)
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex')
}
```

**What Gets Encrypted**:
- OAuth access tokens (Shopify, Meta, Google, etc.)
- API keys (Stripe, Wise, Klaviyo, etc.)
- Webhook secrets
- W-9 tax information (SSN/EIN fields)
- Any PII stored in tenant config

---

## Decision 5: CGK Linens Conversion Timing

**Choice**: **After Phase 3 (Storefront) as separate track**

**Rationale**:
- Phase 3 establishes headless storefront patterns
- CGK Linens conversion uses those patterns immediately
- Provides real-world validation of storefront architecture
- Can run in parallel with Phase 4 (Portals)

**Timeline**:
```
Phase 3D (Theming) completes
    ↓
CGK Linens Conversion starts (parallel with Phase 4)
    ↓
Uses storefront patterns established in 3A-3D
    ↓
Validates headless approach with real store
```

---

## Summary Table

| Decision | Choice | Confidence |
|----------|--------|------------|
| Background Jobs | Trigger.dev v4 | HIGH |
| Env Vars | Hybrid (WordPress-style) | HIGH |
| Update Distribution | NPM packages + Git apps | HIGH |
| Encryption | AES-256-GCM | HIGH |
| CGK Linens Timing | After Phase 3, parallel with 4 | MEDIUM |
