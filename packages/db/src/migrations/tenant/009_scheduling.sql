-- Scheduling system tables for tenant schema
-- Migration: 009_scheduling.sql

-- Scheduling users (per-tenant scheduling profiles)
CREATE TABLE IF NOT EXISTS scheduling_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- User settings
  minimum_notice_hours INTEGER NOT NULL DEFAULT 24,
  booking_window_days INTEGER NOT NULL DEFAULT 60,
  buffer_before_mins INTEGER NOT NULL DEFAULT 0,
  buffer_after_mins INTEGER NOT NULL DEFAULT 15,
  daily_limit INTEGER,
  default_duration INTEGER NOT NULL DEFAULT 30,

  -- Google Calendar OAuth tokens (encrypted)
  google_tokens_encrypted BYTEA,
  google_calendar_id TEXT DEFAULT 'primary',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, username),
  UNIQUE(tenant_id, user_id)
);

-- Event types (meeting templates)
CREATE TABLE IF NOT EXISTS scheduling_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES scheduling_users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue',

  -- Location settings
  location JSONB NOT NULL DEFAULT '{"type": "google_meet"}',

  -- Custom form questions
  custom_questions JSONB NOT NULL DEFAULT '[]',

  -- Reminder settings
  reminder_settings JSONB NOT NULL DEFAULT '{"enabled": true, "reminders": [{"timing": "24h", "sendToHost": true, "sendToInvitee": true}]}',

  -- Override user settings for this event type
  setting_overrides JSONB,

  is_active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, user_id, slug)
);

-- Availability schedules (weekly)
CREATE TABLE IF NOT EXISTS scheduling_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES scheduling_users(id) ON DELETE CASCADE,

  timezone TEXT NOT NULL,

  -- Weekly schedule
  weekly_schedule JSONB NOT NULL DEFAULT '{
    "monday": [{"start": "09:00", "end": "17:00"}],
    "tuesday": [{"start": "09:00", "end": "17:00"}],
    "wednesday": [{"start": "09:00", "end": "17:00"}],
    "thursday": [{"start": "09:00", "end": "17:00"}],
    "friday": [{"start": "09:00", "end": "17:00"}],
    "saturday": [],
    "sunday": []
  }',

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, user_id)
);

-- Blocked dates (PTO, holidays, conferences)
CREATE TABLE IF NOT EXISTS scheduling_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES scheduling_users(id) ON DELETE CASCADE,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  is_all_day BOOLEAN NOT NULL DEFAULT true,
  start_time TIME,
  end_time TIME,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bookings (confirmed meetings)
CREATE TABLE IF NOT EXISTS scheduling_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_type_id UUID NOT NULL REFERENCES scheduling_event_types(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES scheduling_users(id) ON DELETE CASCADE,

  -- Denormalized for display
  event_type_name TEXT NOT NULL,
  host_name TEXT NOT NULL,
  host_email TEXT NOT NULL,

  -- Invitee details
  invitee JSONB NOT NULL,

  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'confirmed',

  -- Location info
  location JSONB NOT NULL,

  -- Google Calendar sync
  google_event_id TEXT,
  meet_link TEXT,

  -- Cancellation details
  cancelled_by TEXT,
  cancel_reason TEXT,

  -- Rescheduling
  rescheduled_from UUID REFERENCES scheduling_bookings(id),

  -- Reminder tracking
  reminders_sent JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Changelog for audit/analytics
CREATE TABLE IF NOT EXISTS scheduling_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for scheduling_users
CREATE INDEX IF NOT EXISTS idx_scheduling_users_tenant ON scheduling_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_users_user_id ON scheduling_users(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_users_username ON scheduling_users(username);

-- Indexes for scheduling_event_types
CREATE INDEX IF NOT EXISTS idx_scheduling_event_types_tenant ON scheduling_event_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_event_types_user ON scheduling_event_types(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_event_types_slug ON scheduling_event_types(slug);
CREATE INDEX IF NOT EXISTS idx_scheduling_event_types_active ON scheduling_event_types(is_active) WHERE is_active = true;

-- Indexes for scheduling_availability
CREATE INDEX IF NOT EXISTS idx_scheduling_availability_user ON scheduling_availability(user_id);

-- Indexes for scheduling_blocked_dates
CREATE INDEX IF NOT EXISTS idx_scheduling_blocked_dates_user ON scheduling_blocked_dates(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_blocked_dates_dates ON scheduling_blocked_dates(start_date, end_date);

-- Indexes for scheduling_bookings
CREATE INDEX IF NOT EXISTS idx_scheduling_bookings_tenant ON scheduling_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_bookings_host ON scheduling_bookings(host_user_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_bookings_event_type ON scheduling_bookings(event_type_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_bookings_start ON scheduling_bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_scheduling_bookings_status ON scheduling_bookings(status);
CREATE INDEX IF NOT EXISTS idx_scheduling_bookings_invitee_email ON scheduling_bookings((invitee->>'email'));

-- Indexes for scheduling_changelog
CREATE INDEX IF NOT EXISTS idx_scheduling_changelog_entity ON scheduling_changelog(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_changelog_created ON scheduling_changelog(created_at DESC);
