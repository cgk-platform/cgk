# PHASE-2SP-TICKETS: Support Ticket System

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Status**: COMPLETE (2026-02-11)
**Duration**: 1.5 weeks (Week 11-12)
**Depends On**: PHASE-2A (Admin Shell), PHASE-2CM (Communications)
**Parallel With**: PHASE-2SP-KB (Knowledge Base)
**Blocks**: PHASE-2SP-CHANNELS (Multi-Channel Support)

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Support tickets are tenant-scoped. Tickets from Tenant A must NEVER be visible to Tenant B. Support agents are also tenant-scoped.

```typescript
// ✅ CORRECT - Always scope tickets to tenant
const tickets = await withTenant(tenantId, () =>
  sql`SELECT * FROM support_tickets WHERE status = ${status}`
)

// ❌ WRONG - Cross-tenant data leak
const tickets = await sql`SELECT * FROM support_tickets`
```

---

## Goal

Build a complete ticket management system for customer support, including ticket lifecycle management, support agent assignment, SLA tracking, escalation workflows, and sentiment analysis. This enables tenants to manage customer inquiries efficiently with full visibility into response times and team performance.

---

## Success Criteria

- [x] Tickets can be created from multiple channels (form, email, chat, API)
- [x] Tickets have unique sequential numbering per tenant (TKT-000001)
- [x] Support agents can be assigned to tickets manually or automatically
- [x] SLA deadlines are calculated based on priority and tracked automatically
- [x] SLA breaches are flagged with visual indicators
- [x] Ticket status workflow: open → pending → resolved → closed
- [x] Internal comments visible only to agents (not customers)
- [x] Sentiment analysis scores tickets and triggers escalations
- [x] Full audit trail of ticket actions
- [x] All ticket operations tenant-isolated

---

## Deliverables

### Database Schema (tenant schema)

```sql
-- Support tickets
CREATE TABLE {tenant_schema}.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(20) NOT NULL UNIQUE,  -- TKT-000001 format

  subject VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'open',
    -- open, pending, resolved, closed
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    -- low, normal, high, urgent

  channel VARCHAR(20) NOT NULL DEFAULT 'form',
    -- email, chat, phone, form, sms

  customer_id VARCHAR(100),
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),

  assigned_to UUID REFERENCES {tenant_schema}.support_agents(id),

  tags TEXT[] DEFAULT '{}',

  -- SLA tracking
  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT FALSE,
  first_response_at TIMESTAMPTZ,

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- AI analysis
  sentiment_score DECIMAL(3,2),  -- -1.00 to 1.00

  -- Conversation link (for chat-originated tickets)
  conversation_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_status ON {tenant_schema}.support_tickets(status);
CREATE INDEX idx_tickets_priority ON {tenant_schema}.support_tickets(priority);
CREATE INDEX idx_tickets_assigned ON {tenant_schema}.support_tickets(assigned_to);
CREATE INDEX idx_tickets_sla ON {tenant_schema}.support_tickets(sla_breached, sla_deadline);

-- Ticket number counter
CREATE TABLE {tenant_schema}.support_ticket_counter (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_number INTEGER DEFAULT 0
);

-- Support agents (tenant team members with support role)
CREATE TABLE {tenant_schema}.support_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),

  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,

  role VARCHAR(20) DEFAULT 'agent',  -- agent, lead, admin

  is_active BOOLEAN DEFAULT TRUE,
  is_online BOOLEAN DEFAULT FALSE,

  max_tickets INTEGER DEFAULT 20,
  current_ticket_count INTEGER DEFAULT 0,

  skills TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket comments (agent/customer/system messages)
CREATE TABLE {tenant_schema}.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES {tenant_schema}.support_tickets(id) ON DELETE CASCADE,

  author_id UUID REFERENCES public.users(id),
  author_name VARCHAR(255) NOT NULL,
  author_type VARCHAR(20) NOT NULL,  -- agent, customer, system

  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,  -- Hidden from customers

  attachments TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_ticket ON {tenant_schema}.ticket_comments(ticket_id);

-- Sentiment alerts (auto-generated for negative sentiment)
CREATE TABLE {tenant_schema}.sentiment_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES {tenant_schema}.support_tickets(id) ON DELETE CASCADE,

  sentiment_score DECIMAL(3,2) NOT NULL,
  trigger_reason TEXT,

  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES public.users(id),
  acknowledged_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket audit log
CREATE TABLE {tenant_schema}.ticket_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES {tenant_schema}.support_tickets(id) ON DELETE CASCADE,

  actor_id UUID REFERENCES public.users(id),
  actor_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,
    -- created, status_changed, priority_changed, assigned, commented, resolved, closed

  old_value JSONB,
  new_value JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_ticket ON {tenant_schema}.ticket_audit_log(ticket_id);
```

### SLA Configuration

| Priority | First Response | Resolution |
|----------|----------------|------------|
| Urgent | 1 hour | 4 hours |
| High | 4 hours | 24 hours |
| Normal | 24 hours | 72 hours |
| Low | 72 hours | 1 week |

SLA deadlines are configurable per tenant via settings.

### Ticket Service (`packages/support/src/tickets.ts`)

```typescript
// Ticket CRUD
export async function createTicket(tenantId: string, data: CreateTicketInput): Promise<Ticket>
export async function getTickets(tenantId: string, filters: TicketFilters): Promise<PaginatedTickets>
export async function getTicket(tenantId: string, ticketId: string): Promise<Ticket | null>
export async function updateTicket(tenantId: string, ticketId: string, data: UpdateTicketInput): Promise<Ticket>

// Assignment
export async function assignTicket(tenantId: string, ticketId: string, agentId: string): Promise<void>
export async function autoAssignTicket(tenantId: string, ticketId: string): Promise<string | null>
export async function getAvailableAgents(tenantId: string): Promise<Agent[]>

// Comments
export async function addComment(tenantId: string, ticketId: string, data: CommentInput): Promise<Comment>
export async function getComments(tenantId: string, ticketId: string, includeInternal?: boolean): Promise<Comment[]>

// SLA
export async function calculateSLADeadline(priority: TicketPriority, createdAt: Date): Date
export async function checkSLABreach(tenantId: string): Promise<void>  // Background job

// Agent management
export async function createAgent(tenantId: string, data: CreateAgentInput): Promise<Agent>
export async function getAgents(tenantId: string): Promise<Agent[]>
export async function updateAgentStatus(tenantId: string, agentId: string, isOnline: boolean): Promise<void>
```

### API Routes

```
/api/admin/support/tickets/
  route.ts                     # GET list (with filters), POST create
  [id]/route.ts                # GET detail, PATCH update
  [id]/assign/route.ts         # POST assign to agent
  [id]/comments/route.ts       # GET, POST comments
  [id]/close/route.ts          # POST close ticket

/api/admin/support/agents/
  route.ts                     # GET list, POST create
  [id]/route.ts                # GET, PATCH, DELETE agent
  [id]/status/route.ts         # PATCH online status

/api/admin/support/analytics/
  route.ts                     # GET ticket metrics

/api/support/tickets/
  route.ts                     # POST create (public - from forms)
```

### Admin Pages

```
/admin/support                 # Support dashboard
/admin/support/tickets         # Ticket list with filters
/admin/support/tickets/[id]    # Ticket detail + conversation
/admin/support/agents          # Agent management
/admin/support/settings        # SLA config, auto-assign rules
```

### UI Components

- `TicketList` - Filterable, sortable ticket table
- `TicketDetail` - Full ticket view with comments thread
- `TicketStatusBadge` - Status indicator with colors
- `TicketPriorityBadge` - Priority indicator (urgent=red, high=orange, etc.)
- `SLAIndicator` - Visual SLA status (green/yellow/red)
- `AgentSelector` - Dropdown to assign tickets
- `AgentList` - Agent management table
- `CommentThread` - Timeline of comments/actions
- `InternalNoteBadge` - Indicator for internal-only comments

---

## Constraints

- Ticket numbers MUST be unique and sequential per tenant
- SLA calculations MUST respect tenant timezone
- Auto-assignment uses round-robin with capacity limits
- Internal comments NEVER visible to customers via any API
- Sentiment analysis only runs if AI is enabled for tenant
- Max 50 tickets per agent by default (configurable)

---

## Sentiment Analysis

**AI-Powered Escalation:**
- Uses Claude API for sentiment analysis on ticket content
- Score range: -1.0 (very negative) to +1.0 (very positive)
- Thresholds:
  - ≤ -0.7 with 80%+ confidence → Auto-escalate to HIGH priority
  - ≤ -0.5 with 80%+ confidence → Create sentiment alert
- Fallback: Keyword-based analysis if AI unavailable

**Pattern Reference:**
- RAWDOG: `src/lib/support/sentiment.ts`

---

## Auto-Assignment Algorithm

```typescript
async function autoAssignTicket(tenantId: string, ticketId: string): Promise<string | null> {
  // 1. Get available agents (active, online, under capacity)
  // 2. Sort by current_ticket_count ascending (least busy first)
  // 3. Optional: Filter by skills matching ticket tags
  // 4. Assign to first available agent
  // 5. Increment agent's current_ticket_count
  // 6. Log assignment in audit trail
}
```

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For TicketList, TicketDetail, dashboard components

**RAWDOG code to reference:**
- `src/lib/support/tickets.ts` - Ticket CRUD patterns
- `src/lib/support/sentiment.ts` - Sentiment analysis
- `src/app/admin/support/tickets/page.tsx` - Ticket list UI

**Spec documents:**
- `PHASE-2CM-EMAIL-QUEUE.md` - Queue pattern for ticket notifications
- `ARCHITECTURE.md` - Multi-tenant data model

---

## AI Discretion Areas

The implementing agent should determine:
1. Whether to integrate with third-party helpdesk (Zendesk, Intercom) or build fully in-platform
2. Escalation rules beyond sentiment (e.g., VIP customers, order value thresholds)
3. Ticket templates/canned responses implementation
4. Ticket merging/splitting functionality
5. Customer-facing ticket portal vs email-only updates

---

## Tasks

### [PARALLEL] Database & Core Service
- [x] Create support ticket schema with indexes
- [x] Create agent schema
- [x] Create comment and audit log schemas
- [x] Implement ticket number generation (atomic counter)
- [x] Implement `createTicket()` with SLA calculation
- [x] Implement `getTickets()` with filtering and pagination
- [x] Implement `updateTicket()` with status workflow validation
- [x] Implement comment CRUD functions

### [PARALLEL] Agent Management
- [x] Implement agent CRUD functions
- [x] Implement online status tracking
- [x] Implement capacity tracking (current ticket count)
- [x] Implement auto-assignment algorithm
- [x] Build agent management admin page

### [SEQUENTIAL after Core Service] Sentiment & SLA
- [x] Implement sentiment analysis with Claude API
- [x] Implement fallback keyword-based sentiment
- [x] Implement SLA deadline calculation
- [x] Build background job for SLA breach detection
- [x] Implement auto-escalation on negative sentiment

### [SEQUENTIAL after Core] API Routes
- [x] Create ticket CRUD routes with tenant context
- [x] Create agent management routes
- [x] Create public ticket creation route
- [x] Create analytics endpoint
- [x] Add audit logging to all mutations

### [SEQUENTIAL after API] UI Components
- [x] Invoke `/frontend-design` for TicketList
- [x] Invoke `/frontend-design` for TicketDetail
- [x] Build all ticket UI components
- [x] Build agent management UI
- [x] Build support dashboard with metrics

### [SEQUENTIAL after All] Testing
- [x] Unit tests for ticket service
- [x] Unit tests for SLA calculations
- [x] Tenant isolation tests
- [x] Integration tests for ticket workflow

---

## Interfaces

### Ticket

```typescript
type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'
type TicketChannel = 'email' | 'chat' | 'phone' | 'form' | 'sms'

interface SupportTicket {
  id: string
  ticketNumber: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  channel: TicketChannel
  customerId?: string
  customerEmail: string
  customerName?: string
  assignedTo?: SupportAgent
  tags: string[]
  slaDeadline?: Date
  slaBreached: boolean
  firstResponseAt?: Date
  resolvedAt?: Date
  resolutionNotes?: string
  sentimentScore?: number
  conversationId?: string
  createdAt: Date
  updatedAt: Date
}
```

### SupportAgent

```typescript
interface SupportAgent {
  id: string
  userId: string
  name: string
  email: string
  role: 'agent' | 'lead' | 'admin'
  isActive: boolean
  isOnline: boolean
  maxTickets: number
  currentTicketCount: number
  skills: string[]
  createdAt: Date
}
```

### TicketComment

```typescript
interface TicketComment {
  id: string
  ticketId: string
  authorId?: string
  authorName: string
  authorType: 'agent' | 'customer' | 'system'
  content: string
  isInternal: boolean
  attachments: string[]
  createdAt: Date
}
```

---

## Definition of Done

- [x] Tickets can be created from admin and public API
- [x] Ticket numbers are unique and sequential
- [x] Status workflow enforced (can't skip states)
- [x] SLA deadlines calculated and breaches flagged
- [x] Agents can be assigned manually and automatically
- [x] Internal comments hidden from customer-facing APIs
- [x] Sentiment analysis runs on new tickets
- [x] Negative sentiment triggers alerts/escalations
- [x] Full audit trail for all ticket changes
- [x] Tenant A cannot see Tenant B's tickets
- [x] `npx tsc --noEmit` passes (support package compiles cleanly)
- [x] Unit and integration tests pass (39 tests passing)
