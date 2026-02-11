# PHASE-4A: Creator Portal Foundation

**Status**: ✅ COMPLETE (2026-02-11)

**Duration**: 2 weeks (Week 15-16)
**Depends On**: PHASE-1D (packages), PHASE-2A (admin shell)
**Parallel With**: None (first Phase 4 task)
**Blocks**: PHASE-4B, PHASE-4C, PHASE-4D

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Creator Portal is UNIQUE: Creators access MULTIPLE tenants. Key requirements:
- Creator JWT contains array of `brandMemberships` (see PHASE-1C multi-tenant model)
- Each brand's data is isolated - creator sees aggregated view but data stays separated
- Payout balances are per-brand, never cross-tenant
- When viewing brand-specific data, enforce tenant context
- Dashboard aggregates cross-brand stats but each query is tenant-scoped

---

## Goal

Build the creator portal foundation with multi-brand support, authentication, dashboard, messaging, profile/settings management, security features, and notification preferences. Unlike admin users (single-brand), creators can work with multiple brands simultaneously.

---

## Success Criteria

- [x] Creator interface with multi-brand relationships defined
- [x] BrandMembership interface captures commission, discount code, balance
- [x] creator_brand_memberships table created in public schema
- [x] Creator authentication flow working (email/password + magic link)
- [x] Creator JWT signing with brand membership claims
- [x] Creator dashboard displays cross-brand statistics
- [x] BrandEarningsCard component renders per-brand earnings
- [x] **Messaging inbox with thread list and real-time polling**
- [x] **Profile settings UI (name, bio, phone, address)**
- [x] **Security settings (password change, session management)**
- [x] **Notification preferences (email/SMS toggles per type)**
- [x] **Forgot/reset password flow**
- [x] **Help/FAQ system for creators**

---

## Deliverables

### Data Model

- `Creator` interface: id, email, name, phone, bio, brandMemberships[], paymentMethods[], taxInfo, shippingAddress
- `BrandMembership` interface: brandId, brandName, status, commissionPercent, discountCode, balanceCents, pendingCents
- Database table: `public.creators` (core creator data with profile fields)
- Database table: `public.creator_brand_memberships` (many-to-many with orgs)
- Database table: `public.creator_sessions` (session tracking for security)
- Database table: `public.creator_notification_settings` (per-creator preferences)

### Authentication

- `authenticateCreator(email, password)` function
- Password hash comparison with bcrypt (Argon2 recommended)
- Magic link authentication alternative
- Brand membership loading on login
- `signCreatorJWT(creatorId, memberships)` for session tokens
- JWT payload includes all active brand memberships
- **Password reset flow with secure tokens (1-hour expiry)**
- **Rate limiting on auth endpoints (10 req/min per IP)**

### Dashboard Components

- Creator dashboard page at `/dashboard`
- Cross-brand stats aggregation (parallel per-brand queries)
- `BrandEarningsCard` component showing per-brand:
  - Balance (available)
  - Pending balance
  - Active projects count
- `ProjectsList` component (preview for Phase 4C)
- `WithdrawalStatus` component (preview for Phase 4B)
- **Quick actions grid (View Projects, Upload Files, Teleprompter, View Earnings, Messages)**
- **Tax info alert for W-9 requirements**
- **Pending contracts alert for unsigned documents**
- **Guided tour for new users (first login onboarding)**

### Messaging/Inbox System

Full-featured messaging between creators and admin team.

**Database Tables:**
- `public.creator_conversations`: id, creator_id, project_id (optional), coordinator_name, last_message_at, last_message_preview, unread_creator, unread_admin
- `public.creator_messages`: id, conversation_id, content, sender_type (creator|admin), sender_name, status, ai_generated, created_at

**Features:**
- Thread list with unread counts (badge indicator)
- Conversation selection and message display
- Real-time message polling (5-second interval)
- Typing indicators from admin
- File attachment support (via Vercel Blob)
- Mobile-responsive with dedicated thread view on mobile

**API Routes:**
- `GET /api/creator/messages` - List conversations with totalUnread
- `GET /api/creator/messages/[id]` - Get messages for conversation
- `POST /api/creator/messages/[id]` - Send message
- `GET /api/creator/messages/[id]/poll` - Poll for new messages (includes isTyping)

**UI Components:**
- `MessagesPage` - Split view (conversation list + thread)
- `MessageBubble` - Individual message with timestamp and status
- `TypingIndicator` - Shows when admin is typing
- Mobile thread view at `/creator/messages/[id]`

### Profile Settings

Comprehensive profile management UI.

**Settings Layout:**
- Settings page redirects to `/creator/settings/profile`
- Tab-based navigation: Profile, Security, Notifications, Payout Methods, Tax

**Profile Fields:**
- Display Name (editable)
- Email (read-only, contact support to change)
- Bio (160 character limit)
- Phone Number (for SMS notifications)
- **Shipping Address** (for product samples):
  - Address Line 1
  - Address Line 2
  - City
  - State/Province
  - Postal Code
  - Country Code

**API Routes:**
- `GET /api/creator/settings` - Fetch profile data
- `PATCH /api/creator/settings` - Update profile fields

### Security Settings

Account security management.

**Password Change:**
- Current password verification
- New password with 8+ character minimum
- Confirmation field with match validation
- Secure server-side verification

**Session Management:**
- Active sessions list with device info
- Current session indicator ("This device")
- "Sign out all other devices" action
- Session details: device type, last active, IP (masked)

**Database:**
- `public.creator_sessions`: id, creator_id, token_hash, device_info, ip_address, last_active_at, created_at, revoked_at

**API Routes:**
- `POST /api/creator/settings/password` - Change password
- `GET /api/creator/sessions` - List active sessions
- `DELETE /api/creator/sessions` - Revoke all other sessions
- `DELETE /api/creator/sessions/[id]` - Revoke specific session

### Notification Preferences

Per-type notification settings.

**Notification Types:**
- `project_assigned` - New Project Assigned
- `project_updated` - Project Updates
- `message_received` - New Messages
- `payment_received` - Payment Notifications
- `deadline_reminder` - Deadline Reminders
- `revision_requested` - Revision Requests

**Channels:**
- Email (default enabled)
- SMS (optional, requires phone number)

**UI:**
- Grid layout with Email/SMS toggle columns
- Toggle switches for each notification type
- Save preferences button with feedback

**API Routes:**
- `GET /api/creator/settings/notifications` - Fetch preferences
- `PATCH /api/creator/settings/notifications` - Update preferences

### Forgot/Reset Password Flow

Complete password recovery system.

**Forgot Password Page (`/creator/forgot-password`):**
- Email input form
- Rate limiting (prevents abuse)
- Generic success message (prevents email enumeration)
- "Try again" option after submission

**Reset Password Page (`/creator/reset-password`):**
- Token validation from URL
- New password with confirmation
- Token expiry (1 hour)
- Single-use tokens (invalidated after use)

**API Routes:**
- `POST /api/creator/auth/forgot-password` - Request reset email
- `POST /api/creator/auth/reset-password` - Complete reset with token

**Email Template:**
- Subject: "Reset your Creator Portal password"
- Secure reset link with token
- Expiry notice
- Support contact info

### Help/FAQ System

Self-service help for creators.

**Features:**
- FAQ accordion with common questions
- Contact support link (email)
- Getting started guide in dashboard
- Link to coordinator contact

**FAQ Categories:**
- Getting Started
- Payments & Withdrawals
- Projects & Deliverables
- Account & Security
- Tax Information

**Implementation:**
- Static FAQ content (markdown or JSON)
- Expandable accordion UI
- Search/filter (optional enhancement)
- Help icon in navigation with quick links

---

## Constraints

- Creators are stored in `public.creators` (not per-tenant)
- Brand relationships stored in `public.creator_brand_memberships`
- Auth is separate from admin auth (different JWT issuer)
- Must support creators with 1-N brand relationships
- Commission percent and discount code are per-brand-membership
- **Messages are stored per-creator (not per-tenant) but tagged with project/brand**
- **Session tokens use secure random generation (32 bytes)**
- **Password reset tokens expire in 1 hour**

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - REQUIRED for all creator portal UI

**MCPs to consult:**
- Context7 MCP: "JWT multi-claim token signing"
- Context7 MCP: "Next.js authentication patterns"
- Context7 MCP: "React polling patterns"

**RAWDOG code to reference:**
- `src/lib/auth/debug.ts` - Auth wrapper pattern
- `src/app/creator/` - **Complete creator portal implementation**
- `src/app/creator/messages/` - **Messaging implementation with polling**
- `src/app/creator/settings/` - **Settings pages (profile, security, notifications, payout-methods, tax)**
- `src/app/creator/forgot-password/` - **Forgot password flow**
- `src/app/creator/reset-password/` - **Reset password flow**
- `src/components/creator-portal/` - **Layout, mobile, notifications, feedback components**
- `src/components/creator-portal/layout/CreatorPortalNav.tsx` - Navigation component
- `src/components/creator-portal/layout/CreatorPortalFooter.tsx` - Footer component
- `src/components/creator-portal/layout/ResponsiveLayout.tsx` - Mobile-responsive wrapper
- `src/components/creator-portal/mobile/` - PullToRefresh, SwipeableCard, TouchButton
- `src/components/creator-portal/notifications/` - NotificationCenter, NotificationBadge
- `src/components/creator-portal/onboarding/GuidedTour.tsx` - New user tour

**Spec documents:**
- `ARCHITECTURE.md` - Public schema design
- `FRONTEND-DESIGN-SKILL-GUIDE.md` - Skill invocation patterns

---

## Frontend Design Skill Integration

**MANDATORY**: Creator portal is a distinct user experience from admin. Invoke `/frontend-design` for all components.

### Creator Portal Design Principles

- **Multi-brand awareness**: Creators work with multiple brands simultaneously
- **Clear earnings visibility**: Money is the primary concern - make balances obvious
- **Simple actions**: Creators aren't power users - streamlined workflows
- **Trust and transparency**: Show pending amounts, payout history, clear status

### Component-Specific Skill Prompts

**1. Creator Dashboard:**
```
/frontend-design

Building Creator Dashboard for PHASE-4A-CREATOR-PORTAL.

Requirements:
- Header section:
  - Welcome message with creator name
  - Total balance across all brands (large, prominent)
  - "Request Withdrawal" primary button
  - Quick stats: total earned (all time), pending review, active projects

- Brand Earnings Grid:
  - Grid of BrandEarningsCard components (see below)
  - Sorted by balance descending (highest balance first)
  - Empty state if no brand relationships

- Recent Activity section:
  - Last 5-10 activity items
  - Types: payment received, project submitted, review approved
  - Each item: icon, description, timestamp, amount if applicable

Layout:
- Desktop: sidebar with brand list, main content with dashboard
- Mobile: single column, brand cards stackable

User context:
- Creators logging in to check earnings and project status
- May work with 1-10+ different brands
- Primary questions: "How much can I withdraw?" and "What's pending?"
```

**2. Brand Earnings Card:**
```
/frontend-design

Building BrandEarningsCard for creator portal (PHASE-4A-CREATOR-PORTAL).

Requirements:
- Card header:
  - Brand logo (with fallback to colored initials)
  - Brand name
  - Status indicator (active, paused)

- Balance section:
  - "Available Balance" label + amount (large, green if > 0)
  - "Pending" label + amount (secondary, muted)
  - Pending tooltip: "Earnings waiting for approval or processing"

- Metrics row:
  - Commission rate: "15% commission"
  - Active projects count
  - Discount code (copyable, e.g., "CREATOR15")

- Actions:
  - "View Details" link to brand-specific detail page
  - Quick withdraw button if balance > minimum threshold

Design:
- Card with subtle brand color accent (if available)
- Compact but not cramped
- Click anywhere to go to brand detail
```

**3. Brand Switcher:**
```
/frontend-design

Building brand switcher for creator portal (PHASE-4A-CREATOR-PORTAL).

Requirements:
- Current view: "All Brands" or specific brand name
- Dropdown/popover with:
  - "All Brands" option (shows aggregated dashboard)
  - List of brand memberships with logos + names
  - Balance shown next to each brand
- Current brand highlighted
- Keyboard navigable

Placement:
- Desktop: in sidebar or header
- Mobile: in header (compact dropdown)

Design:
- Quick switching without page reload (client-side state)
- Clear indication of current context
```

**4. Creator Login Page:**
```
/frontend-design

Building creator login page for PHASE-4A-CREATOR-PORTAL.

Requirements:
- Clean, centered login form:
  - Email input
  - Password input
  - "Remember me" checkbox
  - "Forgot password?" link
  - Submit button
- Social login options if supported (Google, etc.)
- "New creator? Apply here" link to application
- Trust elements:
  - Platform logo
  - Brief tagline: "Manage your creator earnings across brands"

Design:
- Simple, professional, trustworthy
- Mobile-friendly (full-width form on small screens)
- Clear error messages for invalid credentials
```

**5. Messaging Inbox:**
```
/frontend-design

Building creator messaging inbox for PHASE-4A-CREATOR-PORTAL.

Requirements:
- Split layout (desktop):
  - Left: Conversation list (280-320px)
  - Right: Active thread with message input
- Conversation list item:
  - Project title or "General"
  - Last message preview (truncated)
  - Relative timestamp (e.g., "2h ago")
  - Unread count badge
- Message thread:
  - Header with project name and coordinator
  - Messages in bubble format
  - Outgoing messages aligned right (creator), incoming left
  - Typing indicator
  - Compose bar with textarea + send button
- Mobile:
  - List view navigates to separate thread page
  - Full-screen thread with back button
- Empty state for no messages

Design:
- Clean, chat-like interface
- Clear distinction between sent and received
- Unread badge prominently visible
```

**6. Profile Settings:**
```
/frontend-design

Building profile settings page for PHASE-4A-CREATOR-PORTAL.

Requirements:
- Form sections:
  - Email (read-only with "contact support" note)
  - Display Name
  - Bio (textarea with character counter, 160 max)
  - Phone Number
- Shipping Address section (collapsible or separate):
  - Address Line 1, Address Line 2
  - City, State/Province, Postal Code, Country
- Save button with loading/success/error states
- Form validation feedback inline

Design:
- Clean form layout with labels above inputs
- Section dividers between profile and address
- Consistent input styling (border, focus ring)
```

**7. Security Settings:**
```
/frontend-design

Building security settings page for PHASE-4A-CREATOR-PORTAL.

Requirements:
- Password Change section:
  - Current password input
  - New password with strength indicator
  - Confirm password
  - Submit button
  - Success/error feedback
- Active Sessions section:
  - List of sessions with device icon, name, last active
  - Current session highlighted ("This device")
  - "Sign out all other devices" button (destructive style)

Design:
- Two-column card layout (password, sessions)
- Clear separation between sections
- Destructive actions use red/warning styling
```

**8. Notification Preferences:**
```
/frontend-design

Building notification preferences page for PHASE-4A-CREATOR-PORTAL.

Requirements:
- Table/list layout:
  - Notification type label + description
  - Email toggle
  - SMS toggle
- Types: Project Assigned, Project Updates, Messages, Payments, Deadlines, Revisions
- Toggle switches (on/off visual)
- Save preferences button

Design:
- Grid with rows for each notification type
- Column headers for Email and SMS
- Toggle switches aligned in columns
- Subtle row dividers
```

### Workflow for Creator Portal UI

1. **Invoke `/frontend-design`** with specific prompts above
2. **Consider multi-brand context**: Every component should handle multiple brands
3. **Prioritize clarity**: Creators need to understand their money at a glance
4. **Test with varied data**: 1 brand, 5 brands, 0 balance, large balances
5. **Verify mobile UX**: Most creators may access on mobile
6. **Include empty states**: No messages, no projects, no balance

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. JWT library choice (jose, jsonwebtoken, or @auth/core)
2. Session storage (httpOnly cookie vs localStorage + refresh)
3. Dashboard layout grid system (1-col vs 2-col on desktop)
4. Brand switcher UX (dropdown vs tabs vs cards)
5. Message polling interval (3s vs 5s vs WebSocket upgrade path)
6. Password hashing algorithm (bcrypt vs Argon2id)
7. Session token generation (crypto.randomBytes vs nanoid)

---

## Tasks

### [PARALLEL] Data model and types
- [ ] Define Creator interface in `apps/creator-portal/src/lib/types.ts`
- [ ] Define BrandMembership interface
- [ ] Define Conversation and Message interfaces
- [ ] Define NotificationSetting interface
- [ ] Create SQL migration for `public.creators` table (include profile fields)
- [ ] Create SQL migration for `public.creator_brand_memberships` table
- [ ] Create SQL migration for `public.creator_conversations` table
- [ ] Create SQL migration for `public.creator_messages` table
- [ ] Create SQL migration for `public.creator_sessions` table
- [ ] Create SQL migration for `public.creator_notification_settings` table
- [ ] Create SQL migration for `public.creator_password_reset_tokens` table

### [PARALLEL with above] Auth scaffolding
- [ ] Create `apps/creator-portal/src/lib/auth/index.ts`
- [ ] Implement password hash comparison (bcrypt or Argon2)
- [ ] Set up JWT signing configuration
- [ ] Implement rate limiting utility for auth endpoints

### [SEQUENTIAL after data model] Authentication implementation
- [ ] Implement `authenticateCreator(email, password)` function
- [ ] Load brand memberships on successful auth
- [ ] Implement `signCreatorJWT(creatorId, memberships)`
- [ ] Create login API route
- [ ] Create auth middleware for protected routes
- [ ] Implement magic link authentication
- [ ] Create session tracking on login

### [SEQUENTIAL after auth] Dashboard
- [ ] Create dashboard page at `apps/creator-portal/src/app/dashboard/page.tsx`
- [ ] Implement `getCurrentCreator()` helper
- [ ] Implement parallel stats fetching per brand
- [ ] Build `BrandEarningsCard` component
- [ ] Build `ProjectsList` component (stub for Phase 4C)
- [ ] Build `WithdrawalStatus` component (stub for Phase 4B)
- [ ] Build quick actions grid
- [ ] Integrate `TaxInfoAlert` component
- [ ] Integrate `PendingContractsAlert` component
- [ ] Implement guided tour for new users

### [PARALLEL with dashboard] Messaging system
- [ ] Create `GET /api/creator/messages` - List conversations
- [ ] Create `GET /api/creator/messages/[id]` - Get messages
- [ ] Create `POST /api/creator/messages/[id]` - Send message
- [ ] Create `GET /api/creator/messages/[id]/poll` - Poll for new messages
- [ ] Build `MessagesPage` component with split view
- [ ] Build `MessageBubble` component
- [ ] Build `TypingIndicator` component
- [ ] Build mobile thread view at `/creator/messages/[id]`
- [ ] Implement 5-second polling for new messages

### [PARALLEL with dashboard] Profile settings
- [ ] Create `GET /api/creator/settings` - Fetch profile
- [ ] Create `PATCH /api/creator/settings` - Update profile
- [ ] Build profile settings page at `/creator/settings/profile`
- [ ] Implement form with name, bio, phone, shipping address
- [ ] Add character counter for bio field
- [ ] Implement save with loading/success/error states

### [PARALLEL with dashboard] Security settings
- [ ] Create `POST /api/creator/settings/password` - Change password
- [ ] Create `GET /api/creator/sessions` - List sessions
- [ ] Create `DELETE /api/creator/sessions` - Revoke all other sessions
- [ ] Build security settings page at `/creator/settings/security`
- [ ] Implement password change form with validation
- [ ] Build active sessions list with revocation

### [PARALLEL with dashboard] Notification settings
- [ ] Create `GET /api/creator/settings/notifications` - Fetch preferences
- [ ] Create `PATCH /api/creator/settings/notifications` - Update preferences
- [ ] Build notification settings page at `/creator/settings/notifications`
- [ ] Implement toggle grid for email/SMS per notification type
- [ ] Add save preferences button with feedback

### [PARALLEL with dashboard] Forgot/reset password
- [ ] Create `POST /api/creator/auth/forgot-password` - Request reset
- [ ] Create `POST /api/creator/auth/reset-password` - Complete reset
- [ ] Build forgot password page at `/creator/forgot-password`
- [ ] Build reset password page at `/creator/reset-password`
- [ ] Implement rate limiting (3 requests per hour per email)
- [ ] Create password reset email template
- [ ] Implement secure token generation with 1-hour expiry

### [SEQUENTIAL after all settings] Settings layout
- [ ] Create settings layout with tab navigation
- [ ] Implement settings index redirect to /profile
- [ ] Add settings tabs: Profile, Security, Notifications, Payout Methods, Tax

### [PARALLEL] Help/FAQ system
- [ ] Create FAQ content (JSON or markdown)
- [ ] Build FAQ accordion component
- [ ] Add getting started guide to dashboard
- [ ] Add help link in navigation
- [ ] Create support contact information display

---

## Definition of Done

- [ ] Creator can log in with email/password
- [ ] Creator can reset forgotten password
- [ ] Dashboard shows earnings for all associated brands
- [ ] JWT contains brand membership claims
- [ ] Database tables created with proper indexes
- [ ] Auth middleware protects dashboard routes
- [ ] **Messaging inbox displays conversations with polling**
- [ ] **Profile settings update correctly**
- [ ] **Password change works with proper validation**
- [ ] **Session list shows with revocation working**
- [ ] **Notification preferences save and persist**
- [ ] `npx tsc --noEmit` passes
- [ ] Manual testing: full portal flow works end-to-end
