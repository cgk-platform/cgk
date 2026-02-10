# RAWDOG Database Schema Analysis
**Generated**: 2025-02-10
**Coverage**: 28+ PostgreSQL schema modules, 100+ tables, Redis patterns

---

## Source Codebase Path

**RAWDOG Root**: `/Users/holdenthemic/Documents/rawdog-web/`
**Schema Files**: `/Users/holdenthemic/Documents/rawdog-web/src/lib/*/db/schema.ts`

All file paths in this document are relative to the RAWDOG root. Use full paths when referencing from the new project.

---

## Executive Summary

The RAWDOG application uses **Neon PostgreSQL** (via `@vercel/postgres`) as the primary database with **Redis** for caching, queuing, and session storage. The database is highly modularized with 20+ feature-specific schema modules, each managing their own tables with auto-initialization (idempotent `CREATE TABLE IF NOT EXISTS` patterns).

**Database Infrastructure:**
- **Primary DB**: Neon PostgreSQL with `@vercel/postgres` wrapper
- **Connection Pattern**: Pooled connections (Vercel default) with fallback to raw `pg` for Trigger.dev
- **Connection File**: `/Users/holdenthemic/Documents/rawdog-web/src/lib/video/db/connection.ts` (shared across all modules)
- **Retry Logic**: `/Users/holdenthemic/Documents/rawdog-web/src/lib/postgres.ts` provides exponential backoff for transient errors
- **Redis**: Upstash Redis for caching, queues, and real-time data

---

## Table Inventory by Feature

### 1. Reviews & Feedback System
**Schema File**: `/src/lib/reviews/db/schema.ts`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `reviews` | Core review data | id (UUID), product_id, author_email, rating (1-5), status, verification_token, helpful_votes |
| `review_media` | Review photos/videos | id, review_id (FK), mux_asset_id, mux_playback_id, duration_seconds |
| `review_votes` | Helpful/unhelpful tracking | id, review_id (FK), voter_id, vote_type, ip_address |
| `review_responses` | Store responses to reviews | id, review_id (FK), author_name, content |
| `review_email_requests` | Email requests tracking | id, order_id, customer_email, product_ids[], sent_at, opened_at |
| `review_email_queue` | Queued review request emails | order_id, order_number, customer_email, status, trigger_event |

### 2. Attribution & Customer Journey
**Schema File**: `/src/lib/attribution/db/schema.ts`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `customer_identities` | Customer identity graph | id (UUID), email_hash (UNIQUE), phone_hash, shopify_customer_id, total_revenue_cents |
| `customer_devices` | Linked devices per customer | id, customer_identity_id (FK), device_fingerprint, device_type, browser |
| `visitor_devices` | Anonymous devices (pre-login) | visitor_id (text), device_fingerprint, device_type, ip_hash |
| `attribution_touchpoints` | Marketing touchpoints | id, visitor_id, customer_identity_id, channel, source, utm_*, click_id |
| `attribution_conversions` | Conversion events | id, customer_identity_id (FK), touchpoint_id, order_id, revenue_cents |

### 3. A/B Testing Framework
**Schema Files**: `/src/lib/ab-testing/db/schema.ts` + phases

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `ab_tests` | Test definitions | id (ULID), name, status, goal_event, optimization_metric, shipping_config (JSONB) |
| `ab_variants` | Test variants | id, test_id (FK), name, url, traffic_allocation, is_control |
| `ab_targeting_rules` | Audience rules | id, test_id (FK), name, conditions (JSONB), logic |
| `ab_visitors` | Visitor assignments | id, test_id (FK), variant_id (FK), visitor_id, assigned_at |
| `ab_events` | Tracked events | id (BIGSERIAL), test_id, variant_id, visitor_id, event_type, event_value_cents |
| `ab_daily_metrics` | Aggregated daily data | test_id, variant_id, date, visitors, purchases, revenue_cents |
| `ab_purchase_attribution` | Purchase details | order_id, test_id, variant_id, total_cents, attribution_method |

### 4. Meta Ads Integration
**Schema File**: `/src/lib/meta-ads/db/schema.ts`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `meta_ad_connections` | OAuth tokens (encrypted) | id, ad_account_id (UNIQUE), access_token_encrypted, is_active |
| `meta_campaigns` | Campaign hierarchy | id (PK), ad_account_id, name, objective, status, daily_budget_cents |
| `meta_adsets` | Ad set hierarchy | id (PK), campaign_id, ad_account_id, name, targeting (JSONB) |
| `meta_ads` | Ad-level data | id (PK), adset_id, campaign_id, name, status, creative_id |
| `meta_daily_spend` | Daily insights (MAIN) | ad_account_id, date, level, object_id, spend_cents, impressions, roas_pct |

### 5. Google Ads Integration
**Schema File**: `/src/lib/google-ads/db/schema.ts`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `google_ad_connections` | OAuth tokens (encrypted) | id (UUID), customer_id (UNIQUE), access_token_encrypted, refresh_token_encrypted |
| `google_daily_spend` | Daily performance | customer_id, date, level, object_id, spend_cents, conversions |
| `google_campaigns` | Campaign data | id (PK), customer_id, name, status, advertising_channel_type |
| `google_ad_groups` | Ad group data | id (PK), campaign_id, customer_id, name, cpc_bid_micros |

### 6. Shopify Integration
**Schema File**: `/src/lib/shopify/db/schema.ts`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `shopify_schema_version` | Migration tracking | version (PK), applied_at |
| `shopify_connections` | OAuth credentials (encrypted) | id, shop (UNIQUE), access_token_encrypted, webhook_secret_encrypted, scopes[] |
| `shopify_oauth_states` | OAuth state validation | state (PK), shop, redirect_uri, expires_at |

### 7. Operations & Monitoring
**Schema File**: `/src/lib/ops/db/schema.ts`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `ops_errors` | Error tracking | id (UUID), fingerprint, type, severity, message, occurrence_count, status |
| `ops_health_checks` | Service health monitoring | id (UUID), service_name (UNIQUE), status, response_time_ms |
| `ops_alerts` | Alert aggregation | id (UUID), alert_type, severity, title, slack_message_ts, status |
| `ops_logs` | Structured logs | id (BIGSERIAL), timestamp, level, source, message, metadata (JSONB) |
| `ops_incidents` | Incident tracking | id (UUID), alert_id (FK), title, severity, status, resolved_at |

### 8. AI Agents & Team Management
**Schema File**: `/src/lib/ai-agents/db/schema.ts`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `ai_agents` | Agent definitions | id (TEXT PK), name, role, email, status, capabilities[], aiModel |
| `agent_personalities` | Agent personality config | agentId (PK, FK), traitFormality, traitVerbosity, preferredGreeting |
| `agent_memories` | Agent knowledge/training | id, agentId (FK), memoryType, content, embedding (vector) |
| `agent_training_examples` | Training data | id, agentId (FK), trainingType, input, expectedOutput, wasCorrect |
| `team_members` | Team member mapping | id, name, email, role, status |

### 9. Slack Integration
**Schema File**: `/src/lib/slack/db/schema.ts`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `slack_users` | Cached user profiles | id (TEXT PK), team_id, name, email, is_admin, is_bot |
| `slack_channels` | Channel/DM/MPIM cache | id (TEXT PK), team_id, name, is_private, is_im |
| `slack_messages` | 30-day message history | id (TEXT PK), channel_id (FK), user_id (FK), text, thread_ts |
| `slack_threads` | Thread aggregation | id, channel_id (FK), thread_ts, reply_count, preserved |

### 10. Video Management
**Schema File**: `/src/lib/video/db/schema.ts`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `video_organizations` | Multi-tenant orgs | id (TEXT PK), name, slug (UNIQUE), plan, storage_limit_gb |
| `videos` | Video metadata | id (TEXT PK), user_id, org_id (FK), mux_asset_id, status, transcription_text |
| `video_folders` | Folder hierarchy | id (TEXT PK), user_id, parent_id (FK), name |
| `video_permissions` | Sharing permissions | id, video_id (FK), user_id, permission_level |
| `video_comments` | Video comments | id, video_id (FK), user_id, text, timestamp_seconds |

### 11. Gift Cards
**Schema File**: `/src/lib/gift-card/db/schema.ts`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `gift_card_transactions` | Transaction records | id (TEXT PK), shopify_order_id, amount_cents, source, status |
| `gift_card_emails` | Email delivery tracking | id, transaction_id (FK), to_email, status, resend_message_id |
| `gift_card_products` | Product cache | id (TEXT PK), variant_id, amount_cents, min_order_subtotal_cents |

### 12. Pixels & Tracking
**Schema File**: `/src/lib/pixels/db/schema.ts`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `pixel_events` | Event delivery tracking | id (UUID PK), event_id, event_name, ga4_status, meta_status, tiktok_status |
| `pixel_accuracy_hourly` | Hourly rollup (Elevar model) | id (UUID PK), hour, ga4_sent, meta_sent, total_orders_shopify |

### 13. Workflow Engine
**Schema File**: `/src/lib/workflow/db/schema.ts`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `workflow_rules` | Rule definitions | id (TEXT PK), name, is_active, trigger_type, conditions (JSONB[]), actions (JSONB) |
| `workflow_executions` | Execution history | id (TEXT PK), rule_id (FK), project_id, result, actions_taken (JSONB) |
| `scheduled_actions` | Scheduled execution queue | id (TEXT PK), rule_id (FK), action_type, scheduled_for, status |

### 14. Integrations (Klaviyo/Yotpo)
**Schema File**: `/src/lib/integrations/db/schema.ts`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `klaviyo_connections` | Klaviyo OAuth | id (UUID PK), company_name, private_api_key_encrypted, sms_list_id |
| `yotpo_connections` | Yotpo OAuth | id (UUID PK), app_key, api_secret_encrypted, product_mappings (JSONB) |

### 15. Bri AI Agent
**Schema File**: `/src/lib/bri/db/schema.ts`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `bri_agent_settings` | Bri's config | id (TEXT PK), setting_key, setting_value (JSONB) |
| `bri_slack_poll_state` | Poll interaction state | id (TEXT PK), poll_id, thread_ts, user_responses (JSONB) |
| `bri_meeting_transcripts` | Meeting recordings | id (TEXT PK), creator_id, transcript_text, key_insights, action_items |

---

## Database Design Patterns

### 1. Schema Versioning
Tables like `shopify_schema_version`, `ops_schema_version` use version tracking for migrations.

### 2. Idempotent Initialization
All schemas use `CREATE TABLE IF NOT EXISTS` - safe to call at app startup.

### 3. Encrypted Secrets Storage
Columns like `access_token_encrypted` indicate secrets encrypted at rest.

### 4. JSONB for Flexibility
Extensively used for: `conditions`, `actions`, `targeting`, `embedding` (vectors).

### 5. Vector Embeddings
AI Agents module uses PostgreSQL vectors for semantic search (dimension max 2000).

### 6. Soft Deletes
- `videos.deleted_at` (instead of hard delete)
- `slack_users.is_deleted`, `slack_channels.is_archived`

### 7. Time-Series Aggregation
- `ab_daily_metrics`, `meta_daily_spend`, `google_daily_spend`, `pixel_accuracy_hourly`

### 8. Unique Constraints for Deduplication
- `reviews`: `UNIQUE (imported_from, original_id)`
- `ab_daily_metrics`: `UNIQUE(test_id, variant_id, date)`
- `meta_daily_spend`: `UNIQUE(ad_account_id, date, level, object_id)`

---

## Critical Query Patterns

### Using @vercel/postgres
```typescript
// CORRECT - Use sql template tag
import { sql } from '@vercel/postgres'
const result = await sql`SELECT * FROM users WHERE id = ${userId}`

// CORRECT - Use sql.query() for dynamic SQL
const result = await sql.query(`SELECT * FROM users WHERE status = $1`, [status])

// NEVER use db.connect() or db.query() - breaks in production
```

### Transaction Warning
Transactions DO NOT WORK with Neon's pooled connections. Each `sql` call can go to a different connection. Rely on individual atomic SQL statements with ON CONFLICT instead.

### Retry Logic
```typescript
import { withRetry } from '@/lib/postgres'
await withRetry(async () => {
  return await sql`SELECT * FROM table WHERE id = ${id}`
}, { maxAttempts: 3, initialDelayMs: 100 })
```

---

## Redis-Based Systems

### Fairing Survey Data
All data stored in Redis as JSON:
- `fairing:questions` - Hash of question IDs
- `fairing:responses:all` - Sorted Set by timestamp
- `fairing:responses:q:{questionId}` - Set per question
- `fairing:sync:state` - Hash with sync metadata

---

## Multi-Tenant Migration Considerations

1. **Schema-per-tenant**: Each brand gets isolated database schema
2. **Encrypted Credentials**: Already in place for OAuth tokens
3. **Tenant Context**: Add `tenant_id` to all tables
4. **Data Isolation**: Foreign keys within tenant schema only
5. **Connection Pooling**: Need separate pools per tenant

---

## Key File Locations

**Core DB Utilities:**
- `/src/lib/postgres.ts` - Retry logic
- `/src/lib/video/db/connection.ts` - SQL wrapper
- `/src/lib/redis.ts` - Redis client

**Schema Files (28 modules):**
- `/src/lib/reviews/db/schema.ts`
- `/src/lib/attribution/db/schema.ts`
- `/src/lib/ab-testing/db/schema*.ts`
- `/src/lib/meta-ads/db/schema.ts`
- `/src/lib/google-ads/db/schema.ts`
- `/src/lib/shopify/db/schema.ts`
- `/src/lib/ops/db/schema.ts`
- `/src/lib/ai-agents/db/schema.ts`
- `/src/lib/slack/db/schema.ts`
- `/src/lib/workflow/db/schema.ts`
- `/src/lib/video/db/schema.ts`
- `/src/lib/gift-card/db/schema.ts`
- `/src/lib/pixels/db/schema.ts`
- `/src/lib/bri/db/schema.ts`
- `/src/lib/integrations/db/schema.ts`
