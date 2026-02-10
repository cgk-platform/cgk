# PHASE-2U-CREATORS-ADMIN-DIRECTORY: Creator Directory & Detail Pages

**Duration**: 1 week (Week 20)
**Depends On**: PHASE-4A (creator portal), PHASE-4B (payments), PHASE-4G (creator analytics)
**Parallel With**: PHASE-2U-CREATORS-ADMIN-PIPELINE, PHASE-2U-CREATORS-ADMIN-COMMUNICATIONS
**Blocks**: None

---

## Goal

Implement comprehensive admin-side creator directory management including the main creator list, individual detail pages, per-creator inbox, search/filtering, bulk operations, and export capabilities.

---

## Success Criteria

- [ ] Creator directory list page with grid/list view toggle
- [ ] Advanced search and filtering (status, tier, tags, date range)
- [ ] Creator detail page with full profile and stats
- [ ] Per-creator inbox for direct messaging
- [ ] Bulk actions (status change, tag assignment, export)
- [ ] Creator CRUD operations (create, edit, deactivate, delete)
- [ ] Export to CSV/Excel functionality
- [ ] Application queue linked from directory

---

## Deliverables

### 1. Creator Directory Page

**Location**: `/admin/creators`

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│ [Create Creator]  [Export CSV]  [Bulk Actions ▼]           │
├─────────────────────────────────────────────────────────────┤
│ Search: [________________________] [🔍]                     │
│ Status: [All ▼] Tier: [All ▼] Tags: [Select...]           │
│ Date: [From] - [To]  [Apply Filters] [Clear]               │
├─────────────────────────────────────────────────────────────┤
│ ☐ │ Creator          │ Status  │ Tier │ Earnings │ Projects│
├───┼──────────────────┼─────────┼──────┼──────────┼─────────│
│ ☐ │ [Avatar] Jane D. │ Active  │ Gold │ $2,450   │ 12      │
│ ☐ │ [Avatar] John S. │ Pending │ -    │ $0       │ 0       │
│ ☐ │ [Avatar] Alice   │ Active  │ Silver│ $890    │ 5       │
└───┴──────────────────┴─────────┴──────┴──────────┴─────────┘
│ < 1 2 3 ... 10 > │ Showing 1-20 of 198 creators            │
└─────────────────────────────────────────────────────────────┘
```

**Filters**:
| Filter | Type | Options |
|--------|------|---------|
| Status | Multi-select | All, Active, Pending, Inactive, Archived |
| Tier | Multi-select | All tiers + Unassigned |
| Tags | Multi-select | All available tags |
| Date Range | Date picker | Applied, Last Active, Created |
| Search | Text | Name, Email, Discount Code |

**Columns (Configurable)**:
| Column | Description | Sortable |
|--------|-------------|----------|
| Select | Checkbox for bulk actions | No |
| Creator | Avatar + Name + Email | Yes (name) |
| Status | Status badge | Yes |
| Tier | Tier badge | Yes |
| Discount Code | Primary promo code | No |
| Lifetime Earnings | Total earnings (cents) | Yes |
| Projects | Total completed | Yes |
| Last Active | Last portal activity | Yes |
| Actions | Quick action menu | No |

**Quick Actions Menu**:
- View Profile → `/admin/creators/[id]`
- Edit Creator → Opens modal
- Send Message → Opens quick composer
- View Inbox → `/admin/creators/[id]/inbox`
- Deactivate / Reactivate
- Delete (soft/hard)

### 2. Creator Detail Page

**Location**: `/admin/creators/[id]`

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Creators   [Edit] [Message] [Deactivate] [⋮]     │
├─────────────────────────────────────────────────────────────┤
│ [Avatar]  Jane Doe                                          │
│           jane@example.com | @janecreates                   │
│           Active since Jan 15, 2024                         │
│           Tags: [skincare] [video] [top-performer]          │
├─────────────────────────────────────────────────────────────┤
│ [Overview] [Projects] [Payments] [Inbox] [Contracts] [Tax] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  OVERVIEW TAB:                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Lifetime     │ │ This Month   │ │ Pending      │        │
│  │ Earnings     │ │ Earnings     │ │ Balance      │        │
│  │ $2,450.00    │ │ $380.00      │ │ $125.00      │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Projects     │ │ On-Time %    │ │ Avg Response │        │
│  │ Completed    │ │ Delivery     │ │ Time         │        │
│  │ 12           │ │ 92%          │ │ 4.2 hours    │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  PROFILE SECTION:                                           │
│  Bio: Skincare enthusiast creating authentic content...     │
│  Commission: 15%        Discount Code: JANE15              │
│  Phone: +1 555-123-4567                                     │
│  Address: 123 Main St, New York, NY 10001                   │
│  Social: IG @janecreates | TikTok @janedoe                 │
│                                                             │
│  RECENT ACTIVITY:                                           │
│  • Submitted "Summer Glow Tutorial" - 2 hours ago           │
│  • Payment received: $180.00 - Yesterday                    │
│  • Contract signed: Creator Agreement - 3 days ago          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Tabs**:

| Tab | Content |
|-----|---------|
| Overview | Stats cards, profile info, recent activity |
| Projects | Project history table with status, dates, earnings |
| Payments | Payment history, pending payouts, withdrawal requests |
| Inbox | Message thread with admin team |
| Contracts | E-signed documents, pending signatures |
| Tax | W-9 status, 1099 forms, TIN masked display |

**Profile Fields**:
```typescript
interface CreatorProfile {
  // Identity
  id: string
  name: string
  email: string
  phone?: string
  bio?: string
  profileImageUrl?: string

  // Status
  status: 'pending' | 'active' | 'inactive' | 'archived'
  tier?: string
  tags: string[]

  // Commerce
  commissionPercent: number
  discountCode?: string

  // Address
  shippingAddress?: {
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }

  // Social
  instagram?: string
  tiktok?: string
  youtube?: string
  portfolioUrl?: string

  // Dates
  appliedAt?: Date
  approvedAt?: Date
  lastActiveAt?: Date
  createdAt: Date

  // Notes (admin-only)
  internalNotes?: string
}
```

### 3. Per-Creator Inbox

**Location**: `/admin/creators/[id]/inbox`

**Features**:
- Thread view for conversations with this specific creator
- Message composition with rich text
- File attachment support (via Vercel Blob)
- Read receipts tracking
- AI-generated response suggestions (optional)
- Template insertion for common messages
- Message scheduling
- Internal notes (hidden from creator)

**Database Tables**:
```sql
-- Conversations (already in PHASE-4A)
CREATE TABLE creator_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  subject VARCHAR(255),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  unread_creator INTEGER DEFAULT 0,
  unread_admin INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active', -- active, archived, spam
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE creator_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES creator_conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL, -- creator, admin, system
  sender_id UUID, -- User ID if admin, Creator ID if creator
  sender_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT, -- Rich text HTML
  attachments JSONB DEFAULT '[]', -- [{name, url, size, type}]
  is_internal BOOLEAN DEFAULT false, -- Hidden from creator
  ai_generated BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_creator_conversations_tenant ON creator_conversations(tenant_id);
CREATE INDEX idx_creator_conversations_creator ON creator_conversations(creator_id);
CREATE INDEX idx_creator_messages_conversation ON creator_messages(conversation_id);
CREATE INDEX idx_creator_messages_scheduled ON creator_messages(scheduled_for) WHERE sent_at IS NULL;
```

### 4. Bulk Operations

**Available Bulk Actions**:

| Action | Description | Confirmation Required |
|--------|-------------|----------------------|
| Change Status | Set status for multiple creators | Yes |
| Assign Tags | Add/remove tags in bulk | No |
| Update Tier | Change tier for selected | Yes |
| Send Message | Compose message to selected | Yes |
| Export Selected | Download CSV of selected | No |
| Deactivate | Deactivate selected creators | Yes |
| Delete | Soft delete selected | Yes (double confirm) |

**Bulk Action Modal**:
```typescript
interface BulkAction {
  type: 'status' | 'tags' | 'tier' | 'message' | 'export' | 'deactivate' | 'delete'
  creatorIds: string[]
  payload?: {
    status?: CreatorStatus
    tags?: { add?: string[], remove?: string[] }
    tier?: string
    message?: { subject: string, content: string }
    exportFormat?: 'csv' | 'xlsx'
  }
}
```

### 5. Creator Modal (Create/Edit)

**Create Modal Fields**:
- Name* (required)
- Email*
- Phone
- Bio (160 char limit)
- Status (default: pending)
- Commission % (default: 10)
- Discount Code (auto-generate option)
- Tier (dropdown)
- Tags (multi-select)
- Shipping Address (collapsible section)
- Social Links (collapsible section)
- Internal Notes

**Edit Modal**:
- Same fields as create
- Shows creation date, last updated
- Delete button (with confirmation)
- View in Portal link
- Impersonate button (for debugging)

### 6. Export Functionality

**Export Formats**:
- CSV (standard)
- Excel (.xlsx with formatting)

**Export Fields (Configurable)**:
| Field | Included by Default |
|-------|---------------------|
| ID | No |
| Name | Yes |
| Email | Yes |
| Phone | No |
| Status | Yes |
| Tier | Yes |
| Commission % | Yes |
| Discount Code | Yes |
| Lifetime Earnings | Yes |
| Projects Completed | Yes |
| Last Active | Yes |
| Created At | No |
| Tags | No |
| Address | No |

**Export Options**:
- All creators (filtered by current filters)
- Selected only
- Include archived (toggle)

---

## API Routes

### Directory & CRUD

```
GET /api/admin/creators
  Query: status, tier, tags[], search, dateFrom, dateTo, sort, order, page, limit
  Returns: { creators: Creator[], total: number, pagination: {...} }

POST /api/admin/creators
  Body: CreateCreatorPayload
  Returns: { success: boolean, creator: Creator }

GET /api/admin/creators/[id]
  Returns: CreatorWithStats (includes earnings, projects, activity)

PATCH /api/admin/creators/[id]
  Body: UpdateCreatorPayload
  Returns: { success: boolean, creator: Creator }

DELETE /api/admin/creators/[id]
  Query: hard=true (permanent delete)
  Returns: { success: boolean }

GET /api/admin/creators/[id]/stats
  Query: period (7d, 30d, 90d, all)
  Returns: { earnings, projects, responseTime, deliveryRate }

GET /api/admin/creators/[id]/activity
  Query: limit
  Returns: { activities: Activity[] }
```

### Inbox

```
GET /api/admin/creators/[id]/conversations
  Returns: { conversations: Conversation[] }

GET /api/admin/creators/[id]/conversations/[conversationId]
  Returns: { conversation: Conversation, messages: Message[] }

POST /api/admin/creators/[id]/conversations
  Body: { subject?: string, content: string, attachments?: [] }
  Returns: { success: boolean, conversation: Conversation, message: Message }

POST /api/admin/creators/[id]/conversations/[conversationId]/messages
  Body: { content: string, attachments?: [], isInternal?: boolean }
  Returns: { success: boolean, message: Message }
```

### Bulk Operations

```
POST /api/admin/creators/bulk
  Body: { action: BulkAction, creatorIds: string[], payload: {...} }
  Returns: { success: boolean, affected: number, errors?: [] }

POST /api/admin/creators/export
  Body: { format: 'csv' | 'xlsx', filters: {...}, fields: string[], selectedIds?: [] }
  Returns: File download (or { success: true, downloadUrl: string })
```

---

## UI Components

### Shared Components

```typescript
// packages/admin-core/src/components/creators/
CreatorDirectory.tsx       // Main directory page
CreatorCard.tsx            // Card view for grid layout
CreatorRow.tsx             // Row view for table layout
CreatorModal.tsx           // Create/Edit modal
CreatorDetail.tsx          // Detail page layout
CreatorDetailTabs.tsx      // Tab navigation
CreatorOverviewTab.tsx     // Overview content
CreatorProjectsTab.tsx     // Projects table
CreatorPaymentsTab.tsx     // Payments history
CreatorInboxTab.tsx        // Embedded inbox view
CreatorContractsTab.tsx    // E-sign documents
CreatorTaxTab.tsx          // Tax info display
CreatorFilters.tsx         // Filter panel
CreatorBulkActions.tsx     // Bulk action toolbar
CreatorExportModal.tsx     // Export configuration
CreatorQuickMessage.tsx    // Quick message composer
```

### Status Badge Colors

| Status | Background | Text |
|--------|------------|------|
| Active | `bg-green-100` | `text-green-800` |
| Pending | `bg-yellow-100` | `text-yellow-800` |
| Inactive | `bg-gray-100` | `text-gray-600` |
| Archived | `bg-red-100` | `text-red-800` |

### Tier Badge Colors

| Tier | Background | Border |
|------|------------|--------|
| Bronze | `bg-amber-50` | `border-amber-400` |
| Silver | `bg-gray-50` | `border-gray-400` |
| Gold | `bg-yellow-50` | `border-yellow-500` |
| Platinum | `bg-blue-50` | `border-blue-400` |
| Diamond | `bg-purple-50` | `border-purple-400` |

---

## Constraints

- All queries must be tenant-isolated (`WHERE tenant_id = $tenantId`)
- Pagination default: 20 items per page, max 100
- Search must be debounced (300ms)
- Export limited to 10,000 rows per request
- File attachments via Vercel Blob (max 50MB per file)
- Internal notes never exposed to creator-facing APIs

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Directory layout, detail page, modals

**RAWDOG code to reference:**
- `src/app/admin/creators/page.tsx` - Directory page
- `src/app/admin/creators/[id]/page.tsx` - Detail page
- `src/app/admin/creators/[id]/inbox/page.tsx` - Per-creator inbox
- `src/app/admin/creators/components/CreatorCard.tsx` - Card component
- `src/app/admin/creators/components/CreatorModal.tsx` - Modal component

---

## Tasks

### [PARALLEL] Database & Types
- [ ] Create `creator_conversations` table migration
- [ ] Create `creator_messages` table migration
- [ ] Define TypeScript interfaces in `@cgk/admin-core`
- [ ] Create Zod validation schemas

### [PARALLEL with types] Data Layer
- [ ] Implement `getCreators(tenantId, filters)` function
- [ ] Implement `getCreatorById(tenantId, creatorId)` function
- [ ] Implement `createCreator(tenantId, data)` function
- [ ] Implement `updateCreator(tenantId, creatorId, data)` function
- [ ] Implement `deleteCreator(tenantId, creatorId, hard)` function
- [ ] Implement `getCreatorStats(tenantId, creatorId)` function
- [ ] Implement `getCreatorActivity(tenantId, creatorId)` function
- [ ] Implement `exportCreators(tenantId, filters, fields)` function

### [PARALLEL with data layer] Inbox Data Layer
- [ ] Implement `getCreatorConversations(tenantId, creatorId)` function
- [ ] Implement `getConversationMessages(conversationId)` function
- [ ] Implement `sendMessage(conversationId, message)` function
- [ ] Implement `createConversation(tenantId, creatorId, message)` function

### [SEQUENTIAL after data layer] API Routes
- [ ] Create `/api/admin/creators` route (list, create)
- [ ] Create `/api/admin/creators/[id]` route (get, update, delete)
- [ ] Create `/api/admin/creators/[id]/stats` route
- [ ] Create `/api/admin/creators/[id]/activity` route
- [ ] Create `/api/admin/creators/[id]/conversations` routes
- [ ] Create `/api/admin/creators/bulk` route
- [ ] Create `/api/admin/creators/export` route

### [SEQUENTIAL after API routes] UI Components
- [ ] Build CreatorDirectory page
- [ ] Build CreatorCard component
- [ ] Build CreatorRow component
- [ ] Build CreatorModal component
- [ ] Build CreatorDetail page with tabs
- [ ] Build CreatorFilters component
- [ ] Build CreatorBulkActions toolbar
- [ ] Build CreatorExportModal
- [ ] Build CreatorInboxTab with message thread

### [SEQUENTIAL after UI] Integration
- [ ] Wire up directory page to API
- [ ] Implement search with debouncing
- [ ] Implement pagination
- [ ] Implement bulk actions
- [ ] Implement export functionality
- [ ] Add to admin navigation

---

## Definition of Done

- [ ] Directory page displays creators with pagination
- [ ] All filters work correctly
- [ ] Search returns results within 300ms
- [ ] Create/Edit modal saves successfully
- [ ] Detail page shows all tabs with data
- [ ] Per-creator inbox sends/receives messages
- [ ] Bulk actions affect selected creators
- [ ] CSV/Excel export downloads correctly
- [ ] All pages are tenant-isolated
- [ ] `npx tsc --noEmit` passes
- [ ] Manual testing complete for all CRUD operations
