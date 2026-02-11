-- Team scheduling tables for tenant schema
-- Migration: 014_scheduling_teams.sql
-- Adds team-based scheduling: round-robin, collective, and individual host selection

-- Scheduling teams
CREATE TABLE scheduling_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,

  -- Settings: {roundRobin: true, showMemberProfiles: true}
  settings JSONB NOT NULL DEFAULT '{"roundRobin": true, "showMemberProfiles": true}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, slug)
);

-- Team members (many-to-many relationship)
CREATE TABLE scheduling_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  team_id UUID NOT NULL REFERENCES scheduling_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES scheduling_users(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(team_id, user_id)
);

-- Team event types (shared event types for teams)
CREATE TABLE scheduling_team_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  team_id UUID NOT NULL REFERENCES scheduling_teams(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue',
  location JSONB NOT NULL DEFAULT '{"type": "google_meet"}',
  custom_questions JSONB NOT NULL DEFAULT '[]',
  reminder_settings JSONB NOT NULL DEFAULT '{"enabled": true, "reminders": [{"timing": "24h", "sendToHost": true, "sendToInvitee": true}]}',

  -- Scheduling type: 'round_robin' | 'collective' | 'individual'
  scheduling_type TEXT NOT NULL DEFAULT 'round_robin',

  -- Host user IDs for this event type (subset of team members)
  host_user_ids UUID[] NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, team_id, slug)
);

-- Round-robin counter (tracks next host index)
CREATE TABLE scheduling_round_robin_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  team_event_type_id UUID NOT NULL REFERENCES scheduling_team_event_types(id) ON DELETE CASCADE,

  current_index INTEGER NOT NULL DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(team_event_type_id)
);

-- Add team_event_type_id to scheduling_bookings
-- This allows bookings to be linked to team event types
ALTER TABLE scheduling_bookings
ADD COLUMN team_event_type_id UUID REFERENCES scheduling_team_event_types(id) ON DELETE SET NULL;

-- Make event_type_id nullable for team bookings
ALTER TABLE scheduling_bookings
ALTER COLUMN event_type_id DROP NOT NULL;

-- Add constraint: must have either event_type_id or team_event_type_id
ALTER TABLE scheduling_bookings
ADD CONSTRAINT chk_booking_event_type
CHECK (event_type_id IS NOT NULL OR team_event_type_id IS NOT NULL);

-- Indexes for scheduling_teams
CREATE INDEX idx_scheduling_teams_tenant ON scheduling_teams(tenant_id);
CREATE INDEX idx_scheduling_teams_slug ON scheduling_teams(slug);

-- Indexes for scheduling_team_members
CREATE INDEX idx_scheduling_team_members_team ON scheduling_team_members(team_id);
CREATE INDEX idx_scheduling_team_members_user ON scheduling_team_members(user_id);
CREATE INDEX idx_scheduling_team_members_tenant ON scheduling_team_members(tenant_id);

-- Indexes for scheduling_team_event_types
CREATE INDEX idx_scheduling_team_event_types_team ON scheduling_team_event_types(team_id);
CREATE INDEX idx_scheduling_team_event_types_tenant ON scheduling_team_event_types(tenant_id);
CREATE INDEX idx_scheduling_team_event_types_slug ON scheduling_team_event_types(slug);
CREATE INDEX idx_scheduling_team_event_types_active ON scheduling_team_event_types(is_active) WHERE is_active = true;

-- Indexes for scheduling_round_robin_counters
CREATE INDEX idx_scheduling_round_robin_event ON scheduling_round_robin_counters(team_event_type_id);

-- Index for team bookings
CREATE INDEX idx_scheduling_bookings_team_event ON scheduling_bookings(team_event_type_id) WHERE team_event_type_id IS NOT NULL;
