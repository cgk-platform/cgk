# PHASE-2AI-ADMIN: AI Agent Admin UI

> **STATUS**: ✅ COMPLETE (2026-02-13)

> **Status**: COMPLETE
> **Completed**: 2026-02-10
> **Goal**: Implement all BRI (AI Agent) admin pages for configuring, monitoring, and managing AI agents
> **Duration**: 1.5 weeks
> **Dependencies**: PHASE-2AI-CORE (agent tables, autonomy, actions), PHASE-2A-ADMIN-SHELL (admin layout)
> **Parallelizable**: Yes (can run alongside PHASE-2AI-MEMORY, PHASE-2AI-VOICE after CORE is complete)

---

## Success Criteria

- [x] 14 BRI admin pages fully implemented with tenant isolation
- [x] Dashboard with KPIs (conversations, actions, tools used)
- [x] Conversation viewer with message history
- [x] Action log with approval workflow
- [x] Creative ideas management (scripts, hooks, concepts)
- [x] Autonomy configuration UI (3 levels + per-action overrides)
- [x] Voice configuration (TTS provider, model, STT settings)
- [x] Integrations management (Slack, Google, SMS, Email)
- [x] Team memories with confidence levels
- [x] Team defaults for project assignments
- [x] Slack user linking
- [x] Notification event configuration
- [x] Follow-up timing and escalation rules
- [x] All pages use tenant-scoped API routes

---

## Page Architecture Overview

```
/admin/bri/
├── (dashboard)              # Main dashboard with stats, settings, quick links
├── /conversations           # Conversation list with detail view
├── /action-log              # Action history with approval workflow
├── /creative-ideas          # Scripts, hooks, concepts management
├── /autonomy                # Autonomy levels and per-action settings
├── /voice                   # Voice/TTS/STT configuration
├── /integrations            # Channel integrations hub
│   ├── /email               # Resend email configuration
│   └── /sms                 # Retell.ai SMS configuration
├── /team-memories           # Knowledge about team members
├── /team-defaults           # Default project assignments
├── /slack-users             # Slack-to-Clerk user mapping
├── /notifications           # Notification event configuration
└── /followups               # Timing and escalation rules
```

---

## Page Specifications

### 1. Dashboard (/admin/bri)

**Purpose**: Central hub for AI agent configuration and monitoring

**Data Displayed**:
- Active/Disabled status toggle
- Stats cards: Total Conversations, Active (24h), Messages (24h), Most Used Tool
- Top 10 tools used with usage counts
- Recent actions (last 8) with status badges
- Integration status (Slack, Google, SMS, Email)
- Automated outreach channel toggles (SMS, Email)

**Configuration Options**:
- Enable/Disable Bri globally
- Respond to all DMs toggle
- Require approval for actions toggle
- Messages per user per hour limit
- Daily standup channel
- Creator ops channel
- Escalation channel
- AI model selection (from Anthropic models list)
- Temperature slider (0.0 - 1.0)
- Max tokens selection (512/1024/2048/4096)
- Response style (concise/detailed/friendly)
- Automated outreach channels (SMS/Email toggles)

**Quick Links Grid**:
All 10 sub-pages accessible from dashboard

**API Endpoints**:
- `GET /api/admin/bri/settings` - Fetch settings, stats, integrations
- `POST /api/admin/bri/settings` - Save settings
- `GET /api/admin/config/models` - Fetch available AI models

---

### 2. Conversations (/admin/bri/conversations)

**Purpose**: View and analyze conversation history

**Data Displayed**:
- Conversation list with user ID, message count, last message preview, timestamp
- Selected conversation detail:
  - User ID and channel ID
  - Tools used (as tags)
  - Full message history with timestamps
  - User vs Bri message differentiation

**User Actions**:
- Select conversation to view details
- Scroll through message history
- View tools used in conversation

**API Endpoints**:
- `GET /api/admin/bri/conversations` - List all conversations

**Data Structure**:
```typescript
interface Conversation {
  id: string
  channelId: string
  threadTs: string
  userId: string
  messages: { role: string; content: string; timestamp: string }[]
  toolsUsed: string[]
  createdAt: string
  updatedAt: string
}
```

---

### 3. Action Log (/admin/bri/action-log)

**Purpose**: Monitor and approve Bri's automated actions

**Data Displayed**:
- Stats cards: Total Actions (7d), Successful, Failed, Pending Approval, Success Rate
- Filter tabs: All Actions / Pending Approval
- Action list with category badge, trigger type, description, timestamp, status
- Action detail panel:
  - Description, type, category
  - Triggered by (team_request/creator_request/automated/workflow/scheduled)
  - Status (success/failed)
  - Creator ID, Project ID (if applicable)
  - Tools used
  - Error message (if failed)
  - Input/Output data (JSON)
  - Approval controls (approve/reject buttons)
- Actions by Type breakdown chart

**User Actions**:
- Filter by all/pending
- Select action for details
- Approve or reject pending actions

**Category Colors**:
- communication: blue
- lookup: purple
- modification: orange
- escalation: red
- creative: green

**API Endpoints**:
- `GET /api/admin/bri/action-log` - List actions (supports `pendingOnly` filter)
- `POST /api/admin/bri/action-log` - Approve/reject action

---

### 4. Creative Ideas (/admin/bri/creative-ideas)

**Purpose**: Manage content hooks, scripts, and creative concepts

**Data Displayed**:
- Ideas list with title, type, status, times used, performance score, tags
- Filter controls: search, type, status, platform, tag
- Edit/create form with all fields

**Idea Types**:
- ad_concept, script, hook, angle, cta, testimonial, trend, inspiration

**Status Options**:
- draft, ready, in_use, proven, archived, rejected

**Form Fields**:
- Title (required)
- Type (dropdown)
- Status (dropdown)
- Description (textarea)
- Content (textarea)
- Products (comma-separated)
- Platforms (comma-separated)
- Formats (comma-separated)
- Tags (comma-separated)
- Times Used (readonly)
- Performance Score (number)
- Best Example (textarea)
- Notes (textarea)

**Linked Projects Section**:
- Shows projects using this idea
- Usage type and performance notes

**API Endpoints**:
- `GET /api/admin/bri/creative-ideas` - List with filters
- `POST /api/admin/bri/creative-ideas` - Create idea
- `GET /api/admin/bri/creative-ideas/[id]` - Get idea with links
- `PATCH /api/admin/bri/creative-ideas/[id]` - Update idea

---

### 5. Autonomy (/admin/bri/autonomy)

**Purpose**: Control Bri's autonomy levels and action permissions

**Autonomy Levels**:
- **Conservative**: More approvals, lower risk
- **Balanced**: Default balance of autonomy
- **Proactive**: More autonomy, faster execution

**Learning Settings**:
- Adapt to Feedback (toggle)
- Track Success Patterns (toggle)
- Adjust to User Preferences (toggle)

**Safety Rails**:
- Max Actions Per Hour (number)
- Max Cost Per Day in $ (number)
- Require Human for High Value (toggle)
- High Value Threshold in $ (number)

**Per-Action Overrides Table**:
Actions grouped into 3 categories:

**Autonomous** (default no approval):
- lookup_information, send_routine_checkins, generate_reports
- answer_questions, log_communications, schedule_reminders
- search_creative_ideas, query_knowledge_base

**Suggest and Confirm** (default approval required):
- send_first_message_to_creator, change_project_status
- extend_deadlines, escalate_to_team
- create_creative_idea, generate_script

**Human Required** (always requires approval):
- process_payments, approve_submissions, decline_projects
- modify_rates, delete_data, send_bulk_messages

**Per-Action Controls**:
- Enabled (toggle)
- Requires Approval (toggle)
- Max Per Day (number input)
- Cooldown Hours (number input)

**API Endpoints**:
- `GET /api/admin/bri/autonomy` - Fetch autonomy settings
- `PUT /api/admin/bri/autonomy` - Save autonomy settings

---

### 6. Voice (/admin/bri/voice)

**Purpose**: Configure AI voice, TTS, STT, and meeting integration

**Voice Configuration Sections**:

**AI Model Settings**:
- Model selection (claude-sonnet-4, claude-opus-4, etc.)
- Temperature slider
- Max tokens

**TTS (Text-to-Speech)**:
- Provider selection (ElevenLabs, OpenAI, etc.)
- Voice ID selection with voice browser
- Model selection (eleven_turbo_v2_5, etc.)
- Stability, similarity boost, speed controls

**STT (Speech-to-Text)**:
- Provider selection (AssemblyAI, Deepgram, Whisper)
- Model selection
- Language configuration

**Personality Settings**:
- Acknowledgments list (phrases Bri uses)
- Thinking phrases list
- Speech speed adjustment

**Voice Testing**:
- Test text input
- Preview button to hear voice
- Audio playback

**Voice Cloning**:
- Clone name input
- File upload for voice samples

**Google Meet Integration**:
- Connection status
- Meeting ID input
- Join meeting button
- Join queue display
- Meeting summary retrieval
- AI response generation from transcript

**Voice Call Transcripts**:
- Call SID input
- Transcript retrieval

**API Endpoints**:
- `GET /api/admin/bri/voice` - Fetch voice config
- `PUT /api/admin/bri/voice` - Save voice config
- `GET /api/admin/bri/models` - AI models list
- `GET /api/admin/bri/voices` - Voice options
- `GET /api/admin/bri/voices/models` - TTS models
- `GET /api/admin/bri/stt-providers` - STT providers
- `GET /api/admin/bri/meet/status` - Google Meet status
- `POST /api/admin/bri/meet/join` - Queue meet join
- `GET /api/admin/bri/meet/join/queue` - Get join queue
- `GET /api/admin/bri/meet/summary/latest` - Get meeting summary
- `POST /api/admin/bri/meet/respond` - Generate response
- `GET /api/admin/bri/voice/transcripts` - Get call transcripts

---

### 7. Integrations Hub (/admin/bri/integrations)

**Purpose**: Central management for all BRI communication channels

**Integration Cards**:

**Slack**:
- Status: Connected/Not Connected/Env Vars
- Team name display
- Connect button (OAuth flow)
- Reconnect/Disconnect buttons
- Manage Users link

**Google**:
- Status: Connected/Not Connected
- Email display
- Connect button (OAuth flow)
- Scopes granted display

**SMS (Retell.ai)**:
- Status: Configured/Not Configured
- Source: Database/Env Vars
- Phone number display
- Configure button

**Email (Resend)**:
- Status: Configured/Not Configured
- Source: Database/Env Vars
- From email display
- Configure button

**Info Section**:
Explains how each integration is used

**API Endpoints**:
- `GET /api/admin/bri/integrations` - Fetch all integration status
- `POST /api/admin/bri/slack/disconnect` - Disconnect Slack

---

### 7a. SMS Configuration (/admin/bri/integrations/sms)

**Purpose**: Configure Retell.ai for SMS messaging

**Current Status Display**:
- Configured status
- Source (Database/Environment Variables)
- Phone Number ID
- Voice
- Model

**Environment Variables Option**:
- Detect if env vars available
- One-click switch to use env vars

**Configuration Form**:
- API Key (password field)
- Phone Number ID
- Webhook URL
- Voice selection (nat, josh, rachel, maya)
- Model selection (base, turbo, enhanced)

**Test SMS Section**:
- Phone number input
- Send test button

**Help Section**:
Links to Retell.ai dashboard

**API Endpoints**:
- `GET /api/admin/bri/integrations/sms` - Get SMS config
- `POST /api/admin/bri/integrations/sms` - Save SMS config
- `POST /api/admin/bri/integrations/sms/test` - Send test SMS

---

### 7b. Email Configuration (/admin/bri/integrations/email)

**Purpose**: Configure Resend for email messaging

**Current Status Display**:
- Configured status
- Source (Database/Environment Variables)
- From Email
- API Key preview

**Environment Variables Option**:
- Detect if env vars available
- One-click switch to use env vars

**Configuration Form**:
- API Key (password field)
- From Email (Display Name <email@domain.com>)

**Test Email Section**:
- Email input (optional, defaults to self)
- Send test button

**Help Section**:
Links to Resend dashboard

**API Endpoints**:
- `GET /api/admin/bri/integrations/email` - Get email config
- `POST /api/admin/bri/integrations/email` - Save email config
- `POST /api/admin/bri/integrations/email/test` - Send test email

---

### 8. Team Memories (/admin/bri/team-memories)

**Purpose**: Manage knowledge Bri has about team members

**Team Member List**:
- Photo/avatar
- Name and email
- Memory count badge
- Click to select

**Memory Types** (with emoji):
- role_pattern: Role Pattern 🎯
- response_style: Response Style 💬
- availability: Availability 🕐
- preference: Preference ⭐
- special_consideration: Special Consideration ⚠️
- interaction_note: Interaction Note 📝
- expertise: Expertise 🧠

**Memory Sources**:
- told: Explicit instruction (blue badge)
- observed: From interactions (green badge)
- inferred: AI concluded (purple badge)

**Add Memory Form**:
- Type dropdown
- Source dropdown
- Content textarea
- Confidence slider (0-100%)

**Memory List Display**:
- Type emoji and badge
- Source badge
- Confidence percentage
- Content text
- Created date
- Delete button

**Tabs**:
- Team Memories (structured per-user)
- User Memory (semantic search)

**User Memory Tab**:
- Search input
- Content type badge
- Importance score
- Archive button

**API Endpoints**:
- `GET /api/admin/bri/team-memories` - Get team with memories
- `POST /api/admin/bri/team-memories` - Add memory
- `DELETE /api/admin/bri/team-memories` - Delete memory
- `GET /api/admin/bri/user-memories` - Search user memories
- `POST /api/admin/bri/user-memories` - Add user memory
- `DELETE /api/admin/bri/user-memories` - Archive user memory

---

### 9. Team Defaults (/admin/bri/team-defaults)

**Purpose**: Set default team assignments for new projects

**Assignment Fields**:

**Primary Contact** (single select):
- Main point of contact for creators
- Mentioned first in Slack notifications

**Secondary Contacts** (multi-select checkboxes):
- CC'd on most notifications
- Serves as backup
- Shows Slack linked status

**Default Reviewers** (multi-select checkboxes):
- Notified when content is submitted
- Shows Slack linked status

**Finance Contact** (single select):
- Notified for payment-related actions

**Help Section**:
Explains each assignment role

**API Endpoints**:
- `GET /api/admin/bri/team-defaults` - Get defaults and team list
- `PUT /api/admin/bri/team-defaults` - Save defaults

---

### 10. Slack Users (/admin/bri/slack-users)

**Purpose**: Map Slack users to internal team members

**Slack Not Connected State**:
- Warning message
- Link to Bri settings

**Team Member List**:
- Name and email
- Linked status badge
- Slack username if linked
- Dropdown to select Slack user

**Search Slack Users**:
- Search input
- Results list with @username, real name, email, ID
- Limited to 10 results with count

**Help Section**:
- Auto-linking by email
- Manual override capability
- @mention behavior

**API Endpoints**:
- `GET /api/admin/bri/slack-users` - Get team and Slack users
- `POST /api/admin/bri/slack-users` - Link/unlink user

---

### 11. Notifications (/admin/bri/notifications)

**Purpose**: Configure notification events and channels

**Channel Status Cards**:
- Slack: Connected/Source
- SMS: Configured/Source
- Email: Configured/Source

**Event Configuration Table**:

**Events**:
- project_created, project_assigned, project_accepted
- project_declined, project_started, project_submitted
- project_approved, project_revision
- payment_pending, payment_sent, payment_failed
- topup_initiated, topup_succeeded, topup_failed
- reminder, escalation

**Per-Event Config**:
- Slack toggle
- SMS toggle
- Email toggle
- Recipients checkboxes (creator, primary, secondary, reviewer, finance, channel)
- Priority dropdown (low, normal, high, urgent)
- Test button
- Templates (expandable)

**Template Editor** (per event):
- Slack template textarea
- SMS template textarea
- Email subject input
- Email HTML textarea
- Available variables display

**Slack Configuration**:
- Default channel input

**Quiet Hours**:
- Start time
- End time
- Timezone dropdown

**API Endpoints**:
- `GET /api/admin/bri/notifications` - Get settings and channel status
- `PUT /api/admin/bri/notifications` - Save settings
- `POST /api/admin/bri/notifications/test` - Send test notification

---

### 12. Follow-ups (/admin/bri/followups)

**Purpose**: Configure automated follow-up timing and escalation

**Delivery Follow-ups Section**:
- Enable delivery reminders toggle
- Days after delivery (number)

**Script Trafficking Section**:
- Traffic scripts on production start toggle
- Optional delay hours (number)

**Deadlines & Escalations Section**:
- Days before deadline to remind (comma-separated, e.g., "1, 0")
- Days after deadline to remind (comma-separated, e.g., "1, 2, 3")
- Escalate after X days overdue (number)
- Escalation Slack channel

**Quiet Hours Section**:
- Start time
- End time
- Timezone

**Templates Section**:
- JSON editor for template overrides

**API Endpoints**:
- `GET /api/admin/bri/followups` - Get follow-up config
- `PUT /api/admin/bri/followups` - Save follow-up config

---

## Multi-Tenant Considerations

### Tenant Isolation

All pages MUST use tenant-scoped queries:

```typescript
// API Route Pattern
import { getTenantContext } from '@cgk-platform/auth'
import { withTenant } from '@cgk-platform/db'

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  const agents = await withTenant(tenantId, () =>
    sql`SELECT * FROM ai_agents WHERE tenant_id = ${tenantId}`
  )

  return Response.json({ agents })
}
```

### Per-Tenant Agent Configuration

Each tenant has their own:
- AI agent(s) with custom name, personality
- Autonomy settings
- Integration credentials
- Team memories
- Notification preferences
- Follow-up rules

### Default Configuration on Tenant Onboarding

When a new tenant is created:
1. Create default AI agent (configurable name, defaults to "Bri")
2. Seed default autonomy levels
3. Create empty team memories
4. Set default notification preferences
5. Set default follow-up timing

---

## Component Patterns

### Settings Toggle Component

```typescript
function SettingToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
          value ? 'bg-primary' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
```

### Integration Card Component

```typescript
function IntegrationCard({
  name,
  description,
  icon,
  connected,
  source,
  details,
  actionHref,
  actionLabel,
}: IntegrationCardProps) {
  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={iconColor}>{icon}</div>
          <div>
            <h3 className="font-semibold">{name}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <StatusBadge connected={connected} source={source} />
      </div>
      {details && <p className="mt-4 text-sm">{details}</p>}
      <ActionButton href={actionHref} label={actionLabel} />
    </div>
  )
}
```

---

## API Route Structure

All BRI admin routes follow this structure:

```
/api/admin/bri/
├── settings                    # GET/POST - Main settings
├── conversations              # GET - List conversations
├── action-log                 # GET/POST - Actions and approval
├── creative-ideas             # GET/POST - List/create
│   └── [id]                   # GET/PATCH - Get/update
├── autonomy                   # GET/PUT - Autonomy settings
├── voice                      # GET/PUT - Voice config
├── models                     # GET - AI models
├── voices                     # GET - Voice options
│   └── models                 # GET - TTS models
├── stt-providers              # GET - STT providers
├── meet/
│   ├── status                 # GET - Meet connection status
│   ├── join                   # POST - Queue join
│   ├── join/queue            # GET - Join queue
│   ├── summary/latest        # GET - Meeting summary
│   └── respond               # POST - Generate response
├── integrations               # GET - All integrations status
│   ├── sms                    # GET/POST - SMS config
│   │   └── test              # POST - Test SMS
│   └── email                  # GET/POST - Email config
│       └── test              # POST - Test email
├── slack/disconnect          # POST - Disconnect Slack
├── team-memories             # GET/POST/DELETE
├── user-memories             # GET/POST/DELETE
├── team-defaults             # GET/PUT
├── slack-users               # GET/POST
├── notifications             # GET/PUT
│   └── test                  # POST - Test notification
└── followups                 # GET/PUT
```

---

## OAuth Flows

### Slack OAuth

1. User clicks "Connect Slack"
2. Redirect to `/api/bri/slack/oauth`
3. Slack OAuth flow
4. Callback stores tokens (encrypted) in `bri_integrations` table
5. Redirect back to `/admin/bri` with success message

### Google OAuth

1. User clicks "Connect Google"
2. Redirect to `/api/bri/google/oauth`
3. Google OAuth flow (Gmail + Calendar + Meet scopes)
4. Callback stores tokens (encrypted) in `bri_integrations` table
5. Redirect back to `/admin/bri/integrations` with success message

---

## Database Tables Referenced

From PHASE-2AI-CORE:
- `ai_agents` - Agent configuration
- `agent_personality` - Personality traits
- `agent_autonomy_settings` - Global autonomy limits
- `agent_action_autonomy` - Per-action settings
- `agent_action_log` - Action history

From PHASE-2AI-MEMORY:
- `team_member_memories` - Per-user knowledge
- `user_memories` - Semantic memory store

From PHASE-2AI-INTEGRATIONS:
- `bri_integrations` - OAuth tokens, API keys
- `bri_notifications` - Event configuration
- `bri_followups` - Follow-up timing

Additional Tables:
- `bri_conversations` - Conversation history
- `creative_ideas` - Scripts, hooks, concepts
- `creative_idea_links` - Ideas linked to projects
- `bri_team_defaults` - Default project assignments
- `slack_user_links` - Slack-Clerk mapping

---

## Implementation Order

### Week 1
1. Dashboard page (settings, stats, integrations display)
2. Conversations page
3. Action log page with approval workflow
4. Autonomy settings page

### Week 1.5
5. Creative ideas page
6. Voice configuration page
7. Integrations hub + SMS + Email sub-pages
8. Team memories page

### Week 2 (polish)
9. Team defaults page
10. Slack users page
11. Notifications page
12. Follow-ups page
13. Integration testing
14. Mobile responsiveness

---

## Reference Files (RAWDOG)

| Page | Source File |
|------|-------------|
| Dashboard | `/src/app/admin/bri/page.tsx` |
| Conversations | `/src/app/admin/bri/conversations/page.tsx` |
| Action Log | `/src/app/admin/bri/action-log/page.tsx` |
| Creative Ideas | `/src/app/admin/bri/creative-ideas/page.tsx` |
| Autonomy | `/src/app/admin/bri/autonomy/page.tsx` |
| Voice | `/src/app/admin/bri/voice/page.tsx` |
| Integrations | `/src/app/admin/bri/integrations/page.tsx` |
| SMS Config | `/src/app/admin/bri/integrations/sms/page.tsx` |
| Email Config | `/src/app/admin/bri/integrations/email/page.tsx` |
| Team Memories | `/src/app/admin/bri/team-memories/page.tsx` |
| Team Defaults | `/src/app/admin/bri/team-defaults/page.tsx` |
| Slack Users | `/src/app/admin/bri/slack-users/page.tsx` |
| Notifications | `/src/app/admin/bri/notifications/page.tsx` |
| Follow-ups | `/src/app/admin/bri/followups/page.tsx` |
