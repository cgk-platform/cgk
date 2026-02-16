-- Schema and Migration Fixes
-- Phase 8: Final Audit - Fix schema issues discovered during review
--
-- This migration addresses:
-- 1. Missing 'inactive' enum value for creator_status (004_creators.sql)
-- 2. Missing FK indexes in 025_ai_integrations.sql and other tables
-- 3. Missing ON DELETE clause for pipeline_stage_history.changed_by
-- 4. General index coverage improvements for FK columns

-- ============================================================================
-- FIX 1: Add 'inactive' to creator_status enum
-- ============================================================================
-- The tenant schema creator_status enum was created with:
-- ('pending', 'approved', 'active', 'paused', 'terminated')
-- But code references 'inactive' status in multiple places.
-- Note: This also aligns it with the public schema creator_status which has:
-- ('active', 'inactive', 'suspended', 'pending')

DO $$ BEGIN
  ALTER TYPE creator_status ADD VALUE IF NOT EXISTS 'inactive';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;  -- Type might not exist yet in fresh installs
END $$;

-- ============================================================================
-- FIX 2: Missing FK indexes in 025_ai_integrations.sql
-- ============================================================================
-- Add indexes for foreign key columns that were missing indexes.
-- These improve JOIN and DELETE performance.

-- tenant_slack_config.default_agent_id (line 29)
CREATE INDEX IF NOT EXISTS idx_tenant_slack_config_default_agent
  ON tenant_slack_config(default_agent_id)
  WHERE default_agent_id IS NOT NULL;

-- agent_slack_apps.agent_id (line 54) - has unique constraint but explicit index is clearer
CREATE INDEX IF NOT EXISTS idx_agent_slack_apps_agent
  ON agent_slack_apps(agent_id);

-- agent_google_oauth.agent_id (line 179) - has unique constraint but explicit index
CREATE INDEX IF NOT EXISTS idx_agent_google_oauth_agent
  ON agent_google_oauth(agent_id);

-- agent_email_config.agent_id (line 278) - has unique constraint but explicit index
CREATE INDEX IF NOT EXISTS idx_agent_email_config_agent
  ON agent_email_config(agent_id);

-- agent_email_conversations.creator_id (line 332)
CREATE INDEX IF NOT EXISTS idx_agent_email_conversations_creator
  ON agent_email_conversations(creator_id)
  WHERE creator_id IS NOT NULL;

-- agent_email_conversations.platform_user_id (line 333)
CREATE INDEX IF NOT EXISTS idx_agent_email_conversations_user
  ON agent_email_conversations(platform_user_id)
  WHERE platform_user_id IS NOT NULL;

-- tenant_sms_config.default_agent_id (line 371)
CREATE INDEX IF NOT EXISTS idx_tenant_sms_config_default_agent
  ON tenant_sms_config(default_agent_id)
  WHERE default_agent_id IS NOT NULL;

-- channel_rate_limits.agent_id (line 504) - part of unique constraint but explicit index
CREATE INDEX IF NOT EXISTS idx_channel_rate_limits_agent
  ON channel_rate_limits(agent_id);

-- ============================================================================
-- FIX 3: Missing ON DELETE clause for pipeline_stage_history.changed_by
-- ============================================================================
-- The changed_by column references public.users(id) but lacks ON DELETE behavior.
-- We need to drop and recreate the constraint with ON DELETE SET NULL.

-- Note: We use ALTER TABLE to modify the constraint. First drop the old one
-- (if it exists), then add the new one.
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pipeline_stage_history_changed_by_fkey'
    AND table_name = 'pipeline_stage_history'
  ) THEN
    ALTER TABLE pipeline_stage_history
      DROP CONSTRAINT pipeline_stage_history_changed_by_fkey;
  END IF;

  -- Add new constraint with ON DELETE SET NULL
  -- Only if the table exists and has the changed_by column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pipeline_stage_history'
    AND column_name = 'changed_by'
  ) THEN
    ALTER TABLE pipeline_stage_history
      ADD CONSTRAINT pipeline_stage_history_changed_by_fkey
      FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;  -- Table doesn't exist yet
  WHEN undefined_column THEN NULL;  -- Column doesn't exist
END $$;

-- Add index for the changed_by FK column
CREATE INDEX IF NOT EXISTS idx_pipeline_stage_history_changed_by
  ON pipeline_stage_history(changed_by)
  WHERE changed_by IS NOT NULL;

-- ============================================================================
-- FIX 4: Additional FK indexes for better query performance
-- ============================================================================
-- These are user-referencing FK columns that should have indexes for
-- CASCADE/SET NULL performance and JOIN optimization.

-- kb_articles.author_id (012_knowledge_base.sql)
CREATE INDEX IF NOT EXISTS idx_kb_articles_author
  ON kb_articles(author_id)
  WHERE author_id IS NOT NULL;

-- kb_articles.category_id (012_knowledge_base.sql)
CREATE INDEX IF NOT EXISTS idx_kb_articles_category
  ON kb_articles(category_id)
  WHERE category_id IS NOT NULL;

-- kb_article_suggestions.created_by (012_knowledge_base.sql)
CREATE INDEX IF NOT EXISTS idx_kb_article_suggestions_created_by
  ON kb_article_suggestions(created_by)
  WHERE created_by IS NOT NULL;

-- support_agents.user_id (015_support_tickets.sql)
CREATE INDEX IF NOT EXISTS idx_support_agents_user
  ON support_agents(user_id);

-- ticket_comments.author_id (015_support_tickets.sql)
CREATE INDEX IF NOT EXISTS idx_ticket_comments_author
  ON ticket_comments(author_id)
  WHERE author_id IS NOT NULL;

-- ticket_escalations.acknowledged_by (015_support_tickets.sql)
CREATE INDEX IF NOT EXISTS idx_ticket_escalations_acknowledged
  ON ticket_escalations(acknowledged_by)
  WHERE acknowledged_by IS NOT NULL;

-- ticket_audit_log.actor_id (015_support_tickets.sql)
CREATE INDEX IF NOT EXISTS idx_ticket_audit_log_actor
  ON ticket_audit_log(actor_id)
  WHERE actor_id IS NOT NULL;

-- surveys.created_by (016_surveys.sql)
CREATE INDEX IF NOT EXISTS idx_surveys_created_by
  ON surveys(created_by)
  WHERE created_by IS NOT NULL;

-- analytics_dashboards.created_by (010_analytics.sql)
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_created_by
  ON analytics_dashboards(created_by)
  WHERE created_by IS NOT NULL;

-- projects.owner_id and coordinator_id (012_productivity.sql)
CREATE INDEX IF NOT EXISTS idx_projects_owner
  ON projects(owner_id)
  WHERE owner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_coordinator
  ON projects(coordinator_id)
  WHERE coordinator_id IS NOT NULL;

-- project_phases.created_by (012_productivity.sql)
CREATE INDEX IF NOT EXISTS idx_project_phases_created_by
  ON project_phases(created_by)
  WHERE created_by IS NOT NULL;

-- project_tasks.assigned_to (012_productivity.sql)
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to
  ON project_tasks(assigned_to)
  WHERE assigned_to IS NOT NULL;

-- project_tasks.assigned_by (012_productivity.sql)
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_by
  ON project_tasks(assigned_by)
  WHERE assigned_by IS NOT NULL;

-- project_tasks.completed_by (012_productivity.sql)
CREATE INDEX IF NOT EXISTS idx_project_tasks_completed_by
  ON project_tasks(completed_by)
  WHERE completed_by IS NOT NULL;

-- project_milestones.created_by (012_productivity.sql)
CREATE INDEX IF NOT EXISTS idx_project_milestones_created_by
  ON project_milestones(created_by)
  WHERE created_by IS NOT NULL;

-- project_time_entries.user_id (012_productivity.sql)
CREATE INDEX IF NOT EXISTS idx_project_time_entries_user
  ON project_time_entries(user_id);

-- project_comments.author_id (012_productivity.sql)
CREATE INDEX IF NOT EXISTS idx_project_comments_author
  ON project_comments(author_id);

-- project_activity_log.actor_id (012_productivity.sql)
CREATE INDEX IF NOT EXISTS idx_project_activity_log_actor
  ON project_activity_log(actor_id);

-- workflows.created_by, updated_by (015_workflows.sql)
CREATE INDEX IF NOT EXISTS idx_workflows_created_by
  ON workflows(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflows_updated_by
  ON workflows(updated_by)
  WHERE updated_by IS NOT NULL;

-- workflow_approvals.approved_by, rejected_by (015_workflows.sql)
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_approved_by
  ON workflow_approvals(approved_by)
  WHERE approved_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_approvals_rejected_by
  ON workflow_approvals(rejected_by)
  WHERE rejected_by IS NOT NULL;

-- workflow_alerts.assigned_to (015_workflows.sql)
CREATE INDEX IF NOT EXISTS idx_workflow_alerts_assigned_to
  ON workflow_alerts(assigned_to)
  WHERE assigned_to IS NOT NULL;

-- workflow_alerts.resolved_by (015_workflows.sql)
CREATE INDEX IF NOT EXISTS idx_workflow_alerts_resolved_by
  ON workflow_alerts(resolved_by)
  WHERE resolved_by IS NOT NULL;

-- workflow_history.actioned_by (015_workflows.sql)
CREATE INDEX IF NOT EXISTS idx_workflow_history_actioned_by
  ON workflow_history(actioned_by)
  WHERE actioned_by IS NOT NULL;

-- creator_conversations.assigned_to (015_creator_conversations.sql)
CREATE INDEX IF NOT EXISTS idx_creator_conversations_assigned
  ON creator_conversations(assigned_to)
  WHERE assigned_to IS NOT NULL;

-- pipeline_saved_filters.user_id (015_pipeline_config.sql) - already has index at line 114
-- idx_pipeline_saved_filters_user

-- channel_feedback.processed_by (016_support_channels.sql)
CREATE INDEX IF NOT EXISTS idx_channel_feedback_processed_by
  ON channel_feedback(processed_by)
  WHERE processed_by IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_tenant_slack_config_default_agent IS 'FK index for default_agent_id lookup';
COMMENT ON INDEX idx_agent_slack_apps_agent IS 'FK index for agent_id lookup';
COMMENT ON INDEX idx_agent_google_oauth_agent IS 'FK index for agent_id lookup';
COMMENT ON INDEX idx_agent_email_config_agent IS 'FK index for agent_id lookup';
COMMENT ON INDEX idx_agent_email_conversations_creator IS 'FK index for creator_id lookup';
COMMENT ON INDEX idx_agent_email_conversations_user IS 'FK index for platform_user_id lookup';
COMMENT ON INDEX idx_tenant_sms_config_default_agent IS 'FK index for default_agent_id lookup';
COMMENT ON INDEX idx_channel_rate_limits_agent IS 'FK index for agent_id lookup';
COMMENT ON INDEX idx_pipeline_stage_history_changed_by IS 'FK index for changed_by user lookup';
