# Duplicate Migration Number Audit

> **Created**: 2026-02-19 (Remediation Wave)
> **Status**: Documented — DO NOT rename files until a reconciliation strategy is agreed upon.

## Problem

Multiple migration files share the same numeric prefix within a directory.
The migration system processes all SQL files in alphanumeric order, so duplicates
still run but the ordering between same-numbered files is non-deterministic (depends
on alphabetical tiebreaker of the suffix).

**This is safe to leave as-is** because:
1. All migrations use `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN IF NOT EXISTS`
2. The alphanumeric sort of full filenames (e.g., `009_attribution.sql` < `009_email_queues.sql`) provides deterministic ordering
3. Renaming applied migrations would break the `_migrations_applied` tracking table

## Public Schema Duplicates (3 prefixes, 7 files)

| Prefix | Files |
|--------|-------|
| **008** | `008_super_admin.sql`, `008_team_management.sql` |
| **009** | `009_platform_alerts.sql`, `009_platform_logs.sql`, `009_roles.sql`, `009_user_management.sql` |
| **012** | `012_context_switching.sql`, `012_feature_flags.sql` |

## Tenant Schema Duplicates (13 prefixes, 72 files)

| Prefix | Count | Files |
|--------|-------|-------|
| **009** | 5 | `009_attribution.sql`, `009_email_queues.sql`, `009_email_sender.sql`, `009_email_templates.sql`, `009_scheduling.sql` |
| **010** | 7 | `010_ai_agents.sql`, `010_analytics.sql`, `010_blog_clusters.sql`, `010_pl_configuration.sql`, `010_reviews_complete.sql`, `010_seo_management.sql`, `010_subscriptions.sql` |
| **012** | 2 | `012_knowledge_base.sql`, `012_productivity.sql` |
| **015** | 10 | `015_ai_memory.sql`, `015_bri_admin.sql`, `015_commission_config.sql`, `015_creator_conversations.sql`, `015_pipeline_config.sql`, `015_shopify_webhooks.sql`, `015_support_tickets.sql`, `015_surveys.sql`, `015_treasury.sql`, `015_workflows.sql` |
| **016** | 9 | `016_commissions.sql`, `016_creator_communications.sql`, `016_esign_admin.sql`, `016_google_feed.sql`, `016_stripe_topups.sql`, `016_support_channels.sql`, `016_surveys.sql`, `016_sync_operations.sql`, `016_ugc_submissions.sql` |
| **018** | 2 | `018_integrations.sql`, `018_onboarding_config.sql` |
| **024** | 2 | `024_agent_voice.sql`, `024_ai_teams.sql` |
| **026** | 2 | `026_creator_application_drafts.sql`, `026_products_search.sql` |
| **027** | 3 | `027_contractors.sql`, `027_onboarding_settings.sql`, `027_portal_theme_config.sql` |
| **031** | 2 | `031_creator_product_shipments.sql`, `031_dam_core.sql` |
| **034** | 4 | `034_abandoned_checkouts.sql`, `034_creator_projects.sql`, `034_customer_segments.sql`, `034_promo_codes_promos.sql` |
| **039** | 2 | `039_customer_loyalty.sql`, `039_schema_fixes.sql` |
| **048** | 2 | `048_contractor_projects.sql`, `048_template_ab_tests.sql` |

## Recommendation

When preparing for production deployment:

1. **Freeze current migration state** — snapshot the `_migrations_applied` table
2. **Assign unique sequential numbers** starting after the current max (059 tenant, 026 public)
3. **Update the tracking table** to map old filenames to new
4. **Test on staging** before deploying

Until then, the duplicate numbers are harmless because all migrations are idempotent.
New migrations from the remediation wave start at 060+ (tenant) to avoid any conflicts.
