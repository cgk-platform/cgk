# PHASE-7A: Data Migration

> **STATUS**: ✅ COMPLETE (2026-02-13)
> **Completed By**: 2 parallel agents (Infrastructure, Validation)

**Duration**: 1 week (Week 24)
**Depends On**: PHASE-6B (MCP Tools complete)
**Parallel With**: None
**Blocks**: PHASE-7B (Migration Testing)

---

## Goal

Migrate all RAWDOG production data to the new multi-tenant schema with batch processing, data transformation, and comprehensive validation. Ensure zero data loss and maintain referential integrity.

---

## Success Criteria

- [x] Tenant schema created for RAWDOG (tenant_rawdog)
- [x] Organization record created in public.organizations
- [x] All 14 tables migrated with batch processing (1000 rows per batch)
- [x] Data transformations applied (type normalization, missing columns)
- [x] Count validation: old count == new count for all tables
- [x] Sum validation: financial totals match exactly
- [x] Sample data validation: random row comparisons pass
- [x] Foreign key integrity validated across all relationships

---

## Deliverables

### Migration Scripts
- `tooling/migrations/migrate-rawdog.ts` - Main migration orchestrator
- `tooling/migrations/lib/migrate-table.ts` - Batch migration with progress logging
- `tooling/migrations/lib/transform-row.ts` - Per-table transformation logic
- `tooling/migrations/lib/insert-row.ts` - Tenant-scoped insert helper

### Validation Scripts
- `tooling/migrations/validate-migration.ts` - Main validation runner
- `tooling/migrations/lib/validate-count.ts` - Row count comparison
- `tooling/migrations/lib/validate-sum.ts` - Financial sum comparison
- `tooling/migrations/lib/validate-sample.ts` - Random sample comparison
- `tooling/migrations/lib/validate-fk.ts` - Foreign key integrity checks

### Configuration
- `tooling/migrations/config.ts` - Table order, batch size, connection strings

---

## Constraints

- MUST migrate tables in foreign key order (parents before children)
- MUST use batch processing (1000 rows) to avoid memory issues
- MUST log progress for each batch (table: N rows migrated)
- MUST encrypt sensitive data (access tokens, PII)
- MUST NOT modify source data
- MUST support resumable migration (track last offset per table)

---

## Pattern References

**Skills to invoke:**
- `obra/superpowers@test-driven-development` - TDD for validation queries

**RAWDOG code to reference:**
- `src/lib/db/` - Database query patterns
- `scripts/` - Script structure with dotenv loading

**Spec documents:**
- `CODEBASE-ANALYSIS/DATABASE-SCHEMA-2025-02-10.md` - Complete table inventory
- `ARCHITECTURE.md` - Schema-per-tenant design

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Encryption method for sensitive tokens (AES-256-GCM vs libsodium)
2. Resumable migration state storage (file vs database)
3. Parallel vs sequential table migration strategy
4. Sample size for data validation (100 recommended)
5. Error handling for individual row failures (skip vs abort)

---

## Tasks

### [PARALLEL] Migration Infrastructure
- [ ] Create `tooling/migrations/` directory structure
- [ ] Set up database connections (old: POSTGRES_URL, new: NEW_POSTGRES_URL)
- [ ] Create encryption utility for sensitive fields
- [ ] Define table migration order respecting foreign keys:
  ```
  customers, products, orders, line_items, reviews,
  creators, creator_projects, balance_transactions, withdrawal_requests,
  landing_pages, blog_posts, ab_tests, attribution_touchpoints, esign_documents
  ```

### [SEQUENTIAL after Infrastructure] Core Migration
- [ ] Implement migrateRawdog() orchestrator function
- [ ] Create tenant schema: `CREATE SCHEMA IF NOT EXISTS tenant_rawdog`
- [ ] Insert organization record with encrypted tokens
- [ ] Implement migrateTable() with batch fetching and progress logging
- [ ] Implement transformRow() with per-table transformations:
  - orders: normalize gross_sales_cents to integer, add migrated_at
  - creators: normalize commission_percent to float
  - Handle null/undefined fields gracefully

### [SEQUENTIAL after Core Migration] Validation Implementation
- [ ] Implement validateMigration() orchestrator
- [ ] Implement validateCount() for all tables
- [ ] Implement validateSum() for financial columns:
  - orders.total_cents
  - balance_transactions.amount_cents
- [ ] Implement validateSampleData() with random row comparison
- [ ] Implement validateForeignKeys() for referential integrity:
  - line_items.order_id -> orders.id
  - creator_projects.creator_id -> creators.id
  - balance_transactions.creator_id -> creators.id
  - withdrawal_requests.creator_id -> creators.id

### [SEQUENTIAL after Validation] Execution & Reporting
- [ ] Add CLI interface with progress display
- [ ] Generate migration report (rows per table, time elapsed, errors)
- [ ] Add dry-run mode for pre-validation
- [ ] Create rollback script (drop tenant schema)

---

## Definition of Done

- [ ] All 14 tables migrated to tenant_rawdog schema
- [ ] Organization record exists in public.organizations
- [ ] validateMigration() returns all success (no failures)
- [ ] Migration report shows zero errors
- [ ] Rollback script tested and functional
- [ ] `npx tsc --noEmit` passes
- [ ] Migration can be re-run safely (idempotent with ON CONFLICT handling)
