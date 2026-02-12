# PHASE-2SP-CHANNELS: Multi-Channel Support & CSAT

**Status**: COMPLETE

**Duration**: 1.5 weeks (Week 12-13)
**Depends On**: PHASE-2SP-TICKETS (Ticket System), PHASE-2CM (Communications)
**Parallel With**: None
**Blocks**: None

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Chat sessions, CSAT surveys, and privacy requests are tenant-scoped. Each tenant has their own chat widget configuration, and customer data must remain isolated.

```typescript
// ✅ CORRECT - Chat sessions for specific tenant
const sessions = await withTenant(tenantId, () =>
  sql`SELECT * FROM chat_sessions WHERE status = 'waiting'`
)

// ✅ CORRECT - CSAT surveys scoped to tenant
const metrics = await withTenant(tenantId, () =>
  getCSATMetrics(tenantId, { days: 30 })
)
```

---

## Goal

Build multi-channel customer support capabilities including live chat widget, CSAT (Customer Satisfaction) surveys, and GDPR/CCPA privacy compliance tools. This enables tenants to engage customers in real-time, measure support quality, and comply with data privacy regulations.

---

## Success Criteria

- [x] Embeddable live chat widget for tenant storefronts
- [x] Real-time chat sessions with agent assignment
- [x] Chat queue management with wait time display
- [x] Chat widget fully customizable (colors, position, messages)
- [x] CSAT surveys sent automatically after ticket resolution
- [x] CSAT metrics dashboard with trends and per-agent scores
- [x] Privacy request portal (data export, deletion, opt-out)
- [x] Privacy request tracking with compliance deadlines
- [x] Consent record management
- [x] All channels integrated with ticket system

---

## Deliverables

### Database Schema (tenant schema)

```sql
-- Chat sessions
CREATE TABLE {tenant_schema}.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,  -- Links to unified conversation

  visitor_id VARCHAR(100) NOT NULL,  -- Anonymous visitor tracking
  visitor_name VARCHAR(255),
  visitor_email VARCHAR(255),

  page_url TEXT,
  referrer_url TEXT,

  status VARCHAR(20) DEFAULT 'waiting',
    -- waiting, active, ended, transferred

  assigned_agent_id UUID REFERENCES {tenant_schema}.support_agents(id),
  queue_position INTEGER,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  wait_time_seconds INTEGER,  -- Time until first agent response
  duration_seconds INTEGER,   -- Total session length

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_status ON {tenant_schema}.chat_sessions(status);
CREATE INDEX idx_chat_sessions_agent ON {tenant_schema}.chat_sessions(assigned_agent_id);

-- Chat messages
CREATE TABLE {tenant_schema}.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES {tenant_schema}.chat_sessions(id) ON DELETE CASCADE,

  sender_id VARCHAR(100) NOT NULL,  -- Visitor ID or agent user ID
  sender_type VARCHAR(20) NOT NULL,  -- visitor, agent, bot

  content TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',

  is_read BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON {tenant_schema}.chat_messages(session_id);

-- Chat widget configuration
CREATE TABLE {tenant_schema}.chat_widget_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- Single row per tenant

  primary_color VARCHAR(7) DEFAULT '#374d42',
  secondary_color VARCHAR(7) DEFAULT '#3d3d3d',
  header_text VARCHAR(255) DEFAULT 'Chat with us',
  greeting_message TEXT DEFAULT 'Hi! How can we help you today?',

  position VARCHAR(20) DEFAULT 'bottom-right',  -- bottom-right, bottom-left
  offset_x INTEGER DEFAULT 20,
  offset_y INTEGER DEFAULT 20,

  auto_open_delay_seconds INTEGER,  -- null = don't auto-open

  show_agent_typing BOOLEAN DEFAULT TRUE,
  show_read_receipts BOOLEAN DEFAULT TRUE,

  business_hours_enabled BOOLEAN DEFAULT FALSE,
  business_hours JSONB,  -- { "mon": { "start": "09:00", "end": "17:00" }, ... }
  offline_message TEXT DEFAULT 'We''re currently offline. Leave a message!',

  file_upload_enabled BOOLEAN DEFAULT TRUE,
  max_file_size_mb INTEGER DEFAULT 10,
  allowed_file_types TEXT[] DEFAULT ARRAY['image/*', 'application/pdf'],

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CSAT surveys
CREATE TABLE {tenant_schema}.csat_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  ticket_id UUID REFERENCES {tenant_schema}.support_tickets(id),
  conversation_id UUID,

  customer_id VARCHAR(100),
  customer_email VARCHAR(255) NOT NULL,

  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,

  agent_id UUID REFERENCES {tenant_schema}.support_agents(id),

  channel VARCHAR(20) DEFAULT 'email',  -- email, sms, in_app

  sent_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_csat_ticket ON {tenant_schema}.csat_surveys(ticket_id);
CREATE INDEX idx_csat_agent ON {tenant_schema}.csat_surveys(agent_id);

-- Daily CSAT metrics (aggregated)
CREATE TABLE {tenant_schema}.csat_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,

  surveys_sent INTEGER DEFAULT 0,
  surveys_responded INTEGER DEFAULT 0,
  total_rating INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2),

  rating_1_count INTEGER DEFAULT 0,
  rating_2_count INTEGER DEFAULT 0,
  rating_3_count INTEGER DEFAULT 0,
  rating_4_count INTEGER DEFAULT 0,
  rating_5_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Privacy requests (GDPR/CCPA)
CREATE TABLE {tenant_schema}.privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  customer_id VARCHAR(100),
  customer_email VARCHAR(255) NOT NULL,

  request_type VARCHAR(20) NOT NULL,
    -- export, delete, do_not_sell, disclosure

  status VARCHAR(20) DEFAULT 'pending',
    -- pending, processing, completed, rejected

  verified_at TIMESTAMPTZ,
  verification_method VARCHAR(20),  -- email, phone, identity

  processed_by UUID REFERENCES public.users(id),
  processed_at TIMESTAMPTZ,

  result_url TEXT,  -- Link to exported data (for export requests)
  rejection_reason TEXT,
  notes TEXT,

  deadline_at TIMESTAMPTZ NOT NULL,  -- GDPR: 30 days, CCPA: 45 days

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_privacy_status ON {tenant_schema}.privacy_requests(status);
CREATE INDEX idx_privacy_deadline ON {tenant_schema}.privacy_requests(deadline_at);

-- Consent records
CREATE TABLE {tenant_schema}.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  customer_id VARCHAR(100),
  customer_email VARCHAR(255) NOT NULL,

  consent_type VARCHAR(50) NOT NULL,
    -- marketing, analytics, third_party, data_processing

  granted BOOLEAN NOT NULL,
  source VARCHAR(100),  -- Where consent was recorded
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_consent_customer ON {tenant_schema}.consent_records(customer_email);
```

### Chat Service (`packages/support/src/chat.ts`)

```typescript
// Session management
export async function createChatSession(tenantId: string, data: CreateSessionInput): Promise<ChatSession>
export async function getChatSession(tenantId: string, sessionId: string): Promise<ChatSession | null>
export async function getActiveSessions(tenantId: string): Promise<ChatSession[]>
export async function getQueuedSessions(tenantId: string): Promise<ChatSession[]>
export async function assignChatSession(tenantId: string, sessionId: string, agentId: string): Promise<void>
export async function endChatSession(tenantId: string, sessionId: string): Promise<void>

// Messages
export async function sendMessage(tenantId: string, sessionId: string, data: MessageInput): Promise<ChatMessage>
export async function getMessages(tenantId: string, sessionId: string): Promise<ChatMessage[]>
export async function markMessagesRead(tenantId: string, sessionId: string, readBy: string): Promise<void>

// Widget config
export async function getWidgetConfig(tenantId: string): Promise<ChatWidgetConfig>
export async function updateWidgetConfig(tenantId: string, data: UpdateWidgetConfigInput): Promise<void>
export async function isWithinBusinessHours(tenantId: string): Promise<boolean>
```

### CSAT Service (`packages/support/src/csat.ts`)

```typescript
// Survey management
export async function createSurvey(tenantId: string, data: CreateSurveyInput): Promise<CSATSurvey>
export async function getSurvey(tenantId: string, surveyId: string): Promise<CSATSurvey | null>
export async function submitSurveyResponse(tenantId: string, surveyId: string, rating: number, feedback?: string): Promise<void>

// Metrics
export async function getCSATMetrics(tenantId: string, options: MetricsOptions): Promise<CSATMetrics>
export async function getAgentCSATScores(tenantId: string, days: number): Promise<AgentCSATScore[]>

// Auto-send
export async function triggerCSATSurvey(tenantId: string, ticketId: string): Promise<void>
```

### Privacy Service (`packages/support/src/privacy.ts`)

```typescript
// Request management
export async function createPrivacyRequest(tenantId: string, data: CreatePrivacyRequestInput): Promise<PrivacyRequest>
export async function getPrivacyRequests(tenantId: string, filters: PrivacyFilters): Promise<PrivacyRequest[]>
export async function getPrivacyRequest(tenantId: string, requestId: string): Promise<PrivacyRequest | null>
export async function updateRequestStatus(tenantId: string, requestId: string, status: RequestStatus): Promise<void>

// Processing
export async function verifyRequest(tenantId: string, requestId: string, method: VerificationMethod): Promise<void>
export async function processDataExport(tenantId: string, requestId: string): Promise<string>  // Returns download URL
export async function processDataDeletion(tenantId: string, requestId: string): Promise<void>

// Consent
export async function recordConsent(tenantId: string, data: ConsentInput): Promise<void>
export async function getConsentRecords(tenantId: string, customerEmail: string): Promise<ConsentRecord[]>
export async function revokeConsent(tenantId: string, consentId: string): Promise<void>

// Compliance
export async function getOverdueRequests(tenantId: string): Promise<PrivacyRequest[]>
export async function calculateDeadline(requestType: RequestType): Date  // GDPR: 30d, CCPA: 45d
```

### API Routes

```
# Chat (public + admin)
/api/support/chat/
  route.ts                     # POST start session, GET config
  [sessionId]/route.ts         # GET session, POST message
  [sessionId]/read/route.ts    # POST mark as read
  [sessionId]/end/route.ts     # POST end session
  widget-config/route.ts       # GET public widget config

/api/admin/support/chat/
  route.ts                     # GET active sessions
  queue/route.ts               # GET queued sessions
  [sessionId]/assign/route.ts  # POST assign agent
  config/route.ts              # GET, PATCH widget config

# CSAT
/api/support/csat/
  route.ts                     # GET survey, POST response
  [surveyId]/route.ts          # GET survey status

/api/admin/support/csat/
  route.ts                     # GET metrics
  agents/route.ts              # GET per-agent scores
  surveys/route.ts             # GET recent surveys

# Privacy
/api/support/privacy/
  route.ts                     # POST create request, GET status
  [requestId]/route.ts         # GET request status

/api/admin/support/privacy/
  route.ts                     # GET requests list
  [requestId]/route.ts         # PATCH update status
  [requestId]/verify/route.ts  # POST verify request
  [requestId]/process/route.ts # POST process request
  consent/route.ts             # GET consent records
```

### Admin Pages

```
/admin/support/chat            # Live chat queue and active sessions
/admin/support/chat/config     # Widget configuration
/admin/support/csat            # CSAT dashboard and trends
/admin/support/privacy         # Privacy request management
/admin/support/privacy/consent # Consent record browser
```

### UI Components

**Chat:**
- `ChatWidget` - Embeddable customer-facing chat bubble
- `ChatWindow` - Full chat interface with message thread
- `ChatQueue` - Admin view of waiting customers
- `AgentChatPanel` - Agent interface for responding
- `ChatConfigEditor` - Widget customization form
- `TypingIndicator` - "Agent is typing..." display
- `BusinessHoursEditor` - Business hours configuration

**CSAT:**
- `CSATDashboard` - Overall CSAT metrics and trends
- `CSATSurveyWidget` - In-app survey popup
- `RatingSelector` - 1-5 star rating input
- `AgentScorecard` - Per-agent CSAT performance
- `CSATTrendChart` - Line chart of CSAT over time

**Privacy:**
- `PrivacyRequestList` - Filterable request table
- `PrivacyRequestDetail` - Full request view with actions
- `DeadlineIndicator` - Visual countdown to compliance deadline
- `ConsentBrowser` - View/manage consent records
- `DataExportViewer` - Preview exportable data

---

## Chat Widget Embed

```html
<!-- Tenant adds this to their storefront -->
<script src="https://[platform-domain]/chat-widget.js"
        data-tenant-id="[tenant-id]"
        async></script>
```

The widget script:
1. Loads widget configuration from API
2. Renders chat bubble based on config
3. Manages WebSocket/SSE connection for real-time messaging
4. Handles offline mode with message queuing

---

## CSAT Auto-Send Flow

```
1. Ticket resolved (status → 'resolved')
2. Background job triggered
3. Check tenant CSAT settings:
   - CSAT enabled?
   - Delay before sending (default: 1 hour)
   - Channel preference (email, SMS, in-app)
4. Create CSAT survey record
5. Send survey via configured channel
6. Set 7-day expiration
7. Customer clicks link → rating page
8. Response recorded, metrics updated
```

---

## Privacy Compliance Deadlines

| Regulation | Response Deadline | Verification Required |
|------------|-------------------|----------------------|
| GDPR | 30 days | Identity verification |
| CCPA | 45 days | Identity verification |

**Request Types:**
- `export` - Provide all customer data in portable format (JSON)
- `delete` - Erase all customer data ("right to be forgotten")
- `do_not_sell` - Opt-out of data sharing with third parties
- `disclosure` - Explain what data is collected and how it's used

---

## Constraints

- Chat messages must be stored encrypted at rest
- CSAT surveys expire after 7 days (configurable)
- Privacy requests MUST be processed within regulatory deadlines
- Data exports MUST include all customer data across systems
- Data deletion MUST cascade to all dependent records
- Consent records are immutable (revocation creates new record)
- Chat widget must work with CSP restrictions
- File uploads in chat must be scanned for malware

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For ChatWidget, CSATDashboard, PrivacyRequestList

**RAWDOG code to reference:**
- `src/lib/support/chat.ts` - Chat session management
- `src/lib/support/csat.ts` - CSAT survey logic
- `src/lib/support/privacy.ts` - Privacy request handling
- `src/components/support/ChatWidget.tsx` - Widget implementation

**Spec documents:**
- `PHASE-2CM-EMAIL-QUEUE.md` - CSAT survey email sending
- `ARCHITECTURE.md` - Real-time messaging patterns

---

## AI Discretion Areas

The implementing agent should determine:
1. Real-time messaging: WebSockets vs SSE vs polling
2. Chat widget framework: Vanilla JS, Preact, or other lightweight option
3. AI chatbot integration (BRII) for first-line support
4. Video/screen share in chat (future consideration)
5. Chat transcript email to customers
6. CSAT survey design (stars, emojis, NPS)

---

## Tasks

### [PARALLEL] Chat Database & Service
- [x] Create chat sessions schema
- [x] Create chat messages schema
- [x] Create widget config schema
- [x] Implement session management functions
- [x] Implement message CRUD functions
- [x] Implement widget config functions
- [x] Build real-time messaging layer

### [PARALLEL] CSAT Database & Service
- [x] Create CSAT surveys schema
- [x] Create daily metrics schema
- [x] Implement survey CRUD functions
- [x] Implement metrics aggregation
- [x] Build auto-send trigger on ticket resolution

### [PARALLEL] Privacy Database & Service
- [x] Create privacy requests schema
- [x] Create consent records schema
- [x] Implement request management functions
- [x] Implement data export generator
- [x] Implement data deletion cascade
- [x] Build consent recording system

### [SEQUENTIAL after Services] API Routes
- [x] Create chat public routes
- [x] Create chat admin routes
- [x] Create CSAT routes
- [x] Create privacy routes
- [x] Add deadline checking to privacy routes

### [SEQUENTIAL after API] UI Components
- [x] Invoke `/frontend-design` for ChatWidget
- [x] Invoke `/frontend-design` for CSATDashboard
- [x] Invoke `/frontend-design` for PrivacyRequestList
- [x] Build embeddable chat widget
- [x] Build agent chat interface
- [x] Build CSAT survey widget
- [x] Build privacy request management UI

### [SEQUENTIAL after Components] Admin Pages
- [x] Create chat management page
- [x] Create widget config page
- [x] Create CSAT dashboard page
- [x] Create privacy requests page
- [x] Create consent browser page

### [SEQUENTIAL after All] Testing
- [x] Unit tests for chat sessions
- [x] Unit tests for CSAT metrics
- [x] Unit tests for privacy compliance deadlines
- [x] Tenant isolation tests
- [x] Integration tests for chat flow

---

## Interfaces

### ChatSession

```typescript
interface ChatSession {
  id: string
  conversationId?: string
  visitorId: string
  visitorName?: string
  visitorEmail?: string
  pageUrl?: string
  referrerUrl?: string
  status: 'waiting' | 'active' | 'ended' | 'transferred'
  assignedAgent?: SupportAgent
  queuePosition?: number
  startedAt: Date
  endedAt?: Date
  waitTimeSeconds?: number
  durationSeconds?: number
}
```

### CSATSurvey

```typescript
interface CSATSurvey {
  id: string
  ticketId?: string
  conversationId?: string
  customerId?: string
  customerEmail: string
  rating?: 1 | 2 | 3 | 4 | 5
  feedback?: string
  agent?: SupportAgent
  channel: 'email' | 'sms' | 'in_app'
  sentAt: Date
  respondedAt?: Date
  expiresAt: Date
}
```

### PrivacyRequest

```typescript
interface PrivacyRequest {
  id: string
  customerId?: string
  customerEmail: string
  requestType: 'export' | 'delete' | 'do_not_sell' | 'disclosure'
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  verifiedAt?: Date
  verificationMethod?: 'email' | 'phone' | 'identity'
  processedBy?: string
  processedAt?: Date
  resultUrl?: string
  rejectionReason?: string
  notes?: string
  deadlineAt: Date
  createdAt: Date
}
```

### ChatWidgetConfig

```typescript
interface ChatWidgetConfig {
  primaryColor: string
  secondaryColor: string
  headerText: string
  greetingMessage: string
  position: 'bottom-right' | 'bottom-left'
  offsetX: number
  offsetY: number
  autoOpenDelaySeconds?: number
  showAgentTyping: boolean
  showReadReceipts: boolean
  businessHoursEnabled: boolean
  businessHours?: Record<string, { start: string; end: string }>
  offlineMessage: string
  fileUploadEnabled: boolean
  maxFileSizeMb: number
  allowedFileTypes: string[]
}
```

---

## Definition of Done

- [x] Chat widget can be embedded on tenant storefronts
- [x] Customers can start chat and exchange messages
- [x] Agents can view queue and respond to chats
- [x] Widget appearance fully customizable
- [x] Business hours work correctly (online/offline modes)
- [x] CSAT surveys auto-sent after ticket resolution
- [x] CSAT metrics calculated and displayed
- [x] Per-agent CSAT scores tracked
- [x] Privacy requests can be created and tracked
- [x] Compliance deadlines enforced with warnings
- [x] Data export generates valid JSON
- [x] Data deletion cascades correctly
- [x] Consent records properly tracked
- [x] Tenant A cannot see Tenant B's data
- [x] `npx tsc --noEmit` passes
- [x] Unit and integration tests pass
