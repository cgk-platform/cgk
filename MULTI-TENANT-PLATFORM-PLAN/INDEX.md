# Multi-Tenant Platform Plan - Document Index

> **Last Updated**: 2025-02-10
> **Architecture**: Portable, installable, open-source ready
> **Structure**: Restructured for multi-agent parallel execution

---

## Key Principle: Portable by Design

This platform is designed to be:
- **Clone and Deploy**: `npx @cgk/cli create my-brand` -> working site in < 1 hour
- **Updateable**: Platform updates don't break customizations
- **AI-First**: Documentation optimized for Claude, Cursor, and AI coding tools
- **Scalable**: Same codebase for 1 or 1000+ tenants

---

## Source Codebase Paths

**You are building a NEW project.** All planning docs and the RAWDOG reference codebase are external to your workspace.

### Planning Documentation (These Files)

```
/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/
├── MASTER-EXECUTION-GUIDE.md  <- KICKOFF PROMPT - paste into fresh agent to start
├── QUICKSTART.md              <- 5-minute read, critical rules only
├── PLAN.md                    <- Master plan, goals, architecture decisions
├── INDEX.md                   <- This file (navigation)
├── ARCHITECTURE.md            <- Technical architecture
├── TENANT-ISOLATION.md        <- MANDATORY isolation rules
├── PHASE-EXECUTION-ORDER.md   <- Visual execution map, parallel tracks
├── PHASE-DOD-TEMPLATE.md      <- Definition of Done template for phases
├── PLAN-AUDIT-REPORT-*.md     <- Audit findings and recommendations
├── UNDERSCORE-VARS-TRACKING.md <- Tech debt: variables needing implementation
├── phases/                    <- All phase implementation docs
├── reference-docs/            <- Pattern references (admin, ads, etc.)
├── CODEBASE-ANALYSIS/         <- RAWDOG codebase analysis
└── *-SPEC-*.md                <- Feature specifications
```

**CRITICAL**: To start building the platform, paste `MASTER-EXECUTION-GUIDE.md` into a fresh Claude Code agent.

### RAWDOG Reference Codebase

```
/Users/holdenthemic/Documents/rawdog-web/
├── src/trigger/         <- 199 background tasks (reference for rebuild)
├── src/app/api/         <- 1,032 API routes
├── src/app/admin/       <- 60+ admin sections
├── src/components/      <- 465 React components
└── src/lib/             <- Business logic patterns
```

### How Agents Access These

When working in the NEW project, use `Read` tool with full paths:
```
# First read the kickoff guide
Read file_path="/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/MASTER-EXECUTION-GUIDE.md"

# Then read your assigned phase
Read file_path="/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-0-PORTABILITY.md"

# Reference RAWDOG code as needed
Read file_path="/Users/holdenthemic/Documents/rawdog-web/src/trigger/payment-automation.ts"
```

---

## Phase Directory Structure

```
phases/
├── PHASE-0-PORTABILITY.md           # Week -2 to 0: Repo setup, CLI, templates
│
├── PHASE-1A-MONOREPO.md             # Week 1: Turborepo + pnpm workspace
├── PHASE-1B-DATABASE.md             # Week 2: Schema-per-tenant design
├── PHASE-1C-AUTH.md                 # Week 3: JWT, sessions, MFA
├── PHASE-1D-PACKAGES.md             # Week 4: Core packages (ui, db, commerce)
│
├── PHASE-2A-ADMIN-SHELL.md          # Week 5: Navigation, layout, theming
├── PHASE-2B-ADMIN-COMMERCE.md       # Week 5-6: Orders, customers, subscriptions
├── PHASE-2C-ADMIN-CONTENT.md        # Week 6: Blog, landing pages, reviews
├── PHASE-2D-ADMIN-FINANCE.md        # Week 7: Payouts, treasury, expenses
│
├── PHASE-2SA-ACCESS.md              # Week 5: Super admin auth, MFA, roles
├── PHASE-2SA-DASHBOARD.md           # Week 6: Platform KPIs, brands grid
├── PHASE-2SA-ADVANCED.md            # Week 7: Impersonation, cross-tenant ops
├── PHASE-2SA-USERS.md               # Week 7: Platform-wide user management
│
├── PHASE-2E-TEAM-MANAGEMENT.md      # Week 7-8: Team invitations, member mgmt
├── PHASE-2F-RBAC.md                 # Week 8-9: Role-based access control
├── PHASE-2G-CONTEXT-SWITCHING.md    # Week 9: Multi-tenant context switching
│
├── PHASE-2PO-HEALTH.md              # Week 8: 15+ monitors, alert system
├── PHASE-2PO-LOGGING.md             # Week 8: PlatformLogger, error aggregation
├── PHASE-2PO-FLAGS.md               # Week 9: 6 flag types, caching
├── PHASE-2PO-ONBOARDING.md          # Week 10: 9-step brand wizard
├── PHASE-2PO-OAUTH-INTEGRATIONS.md  # Week 11-12: OAuth flows, token encryption
├── PHASE-2P-INTEGRATIONS-ADMIN.md   # Week 11-12: Integration hub, admin pages
│
├── PHASE-2TS-TENANT-SETTINGS.md     # Week 10: AI, Payout, Site Config settings
│
├── PHASE-2CM-SENDER-DNS.md          # Week 9-10: Sender addresses, DNS config
├── PHASE-2CM-EMAIL-QUEUE.md         # Week 9-10: Queue architecture
├── PHASE-2CM-INBOUND-EMAIL.md       # Week 10-11: Inbound email handling
├── PHASE-2CM-TEMPLATES.md           # Week 10: Template management
├── PHASE-2CM-RESEND-ONBOARDING.md   # Week 11: Email tenant onboarding
├── PHASE-2CM-SMS.md                 # Week 11-12: SMS notifications (optional)
│
├── PHASE-2AI-CORE.md                # Week 10-11: AI agents, personality, autonomy, actions
├── PHASE-2AI-ADMIN.md               # Week 11-12: AI agent admin UI (14 BRI pages)
├── PHASE-2AI-MEMORY.md              # Week 11-12: RAG, embeddings, training, learning
├── PHASE-2AI-VOICE.md               # Week 12: TTS, STT, voice calls
├── PHASE-2AI-INTEGRATIONS.md        # Week 12-13: Slack, Calendar, Email, SMS
├── PHASE-2AI-TEAMS.md               # Week 13-14: Multi-agent teams, org chart, handoffs
│
├── PHASE-2SC-SCHEDULING-CORE.md     # Week 9-10: Event types, availability, bookings
├── PHASE-2SC-SCHEDULING-TEAM.md     # Week 10-11: Team scheduling, round-robin
│
├── PHASE-2SP-SUPPORT-TICKETS.md     # Week 11-12: Ticket management, agents, SLA
├── PHASE-2SP-SUPPORT-KB.md          # Week 11-12: Knowledge base articles, search
├── PHASE-2SP-SUPPORT-CHANNELS.md    # Week 12-13: Live chat, CSAT, privacy
│
├── PHASE-2AT-ATTRIBUTION-CORE.md    # Week 9-10: Dashboard, settings, data quality, setup
├── PHASE-2AT-ATTRIBUTION-ANALYTICS.md # Week 10-11: Channels, products, creatives, cohorts
├── PHASE-2AT-ATTRIBUTION-ADVANCED.md # Week 11-12: Journeys, MMM, incrementality, AI insights
├── PHASE-2AT-ATTRIBUTION-INTEGRATIONS.md # Week 11-12: Pixels, platforms, reports, exports
│
├── PHASE-2AT-ABTESTING-CORE.md      # Week 12-13: Assignment, tracking, targeting, MAB
├── PHASE-2AT-ABTESTING-STATS.md     # Week 12-13: Statistical methods, CUPED, SRM, guardrails
├── PHASE-2AT-ABTESTING-SHIPPING.md  # Week 13-14: Shopify Functions, shipping tests
├── PHASE-2AT-ABTESTING-ADMIN.md     # Week 13-14: Admin UI, wizard, results dashboard
│
├── PHASE-2H-PRODUCTIVITY.md         # Week 11-12: Tasks, projects, saved items
├── PHASE-2H-WORKFLOWS.md            # Week 12-13: Workflow engine, smart inbox
│
├── PHASE-2SV-SURVEYS.md             # Week 13-14: Post-purchase surveys, attribution, Shopify App
│
├── PHASE-2SH-SHOPIFY-DEPLOYMENT.md  # Pre-requisite: App creation, CLI setup, env vars, CI/CD
├── PHASE-2SH-SHOPIFY-APP-CORE.md    # Week 10-11: OAuth flow, credential encryption, admin UI
├── PHASE-2SH-SHOPIFY-EXTENSIONS.md  # Week 11-12: Delivery Functions, Web Pixel, Post-Purchase UI
├── PHASE-2SH-SHOPIFY-WEBHOOKS.md    # Week 11-12: Webhook routing, HMAC verification, background jobs
│
├── PHASE-2I-CONTENT-BLOG-ADVANCED.md # Week 11-12: Topic clusters, quality scoring, E-E-A-T
├── PHASE-2I-CONTENT-SEO.md          # Week 11-12: Keywords, redirects, schema validation
├── PHASE-2I-CONTENT-UGC.md          # Week 12: Photo submissions, moderation, gallery
│
├── PHASE-3A-STOREFRONT-FOUNDATION.md # Week 11: Commerce provider, products
├── PHASE-3B-STOREFRONT-CART.md       # Week 12: Cart, checkout, attributes
├── PHASE-3C-STOREFRONT-FEATURES.md   # Week 13: Reviews, bundles, A/B tests
├── PHASE-3D-STOREFRONT-THEMING.md    # Week 14: Per-tenant themes, LPs
├── PHASE-3E-VIDEO-CORE.md            # Week 14-15: Mux video hosting, uploads, playback
├── PHASE-3E-VIDEO-TRANSCRIPTION.md   # Week 15-16: AssemblyAI transcription, AI content
├── PHASE-3E-VIDEO-CREATOR-TOOLS.md   # Week 16: Teleprompter, trimming, CTA, comments
├── PHASE-3F-DAM-CORE.md              # Week 14-15: Asset library, Google Drive, search
├── PHASE-3F-DAM-WORKFLOWS.md         # Week 16-17: Versions, review, rights, exports
├── PHASE-3G-ECOMMERCE-RECOVERY.md    # Week 17: Abandoned checkouts, draft orders
├── PHASE-3H-ECOMMERCE-PROMOS.md      # Week 17-18: Promo codes, promotions, selling plans
├── PHASE-3I-ECOMMERCE-SEGMENTS.md    # Week 18-19: Customer segments, samples, Klaviyo
│
├── PHASE-4A-CREATOR-PORTAL.md        # Week 15: Multi-brand portal, auth
├── PHASE-4A-CREATOR-ONBOARDING-FLOW.md # Week 15: Application form, teleprompter, welcome call
├── PHASE-4B-CREATOR-PAYMENTS.md      # Week 16: Stripe Connect, Wise
├── PHASE-4C-CREATOR-PROJECTS.md      # Week 17: Projects, files, e-sign
├── PHASE-4D-CREATOR-TAX.md           # Week 18: W-9, 1099 generation
├── PHASE-4E-VENDOR-MANAGEMENT.md     # Week 18-19: Vendor portal, invoices, admin
│
├── PHASE-5A-JOBS-SETUP.md            # Week 19: Job provider, event types
├── PHASE-5B-JOBS-COMMERCE.md         # Week 19-20: Order sync, reviews
├── PHASE-5C-JOBS-CREATORS.md         # Week 20: Payouts, applications
├── PHASE-5D-JOBS-ANALYTICS.md        # Week 20-21: Attribution, metrics
├── PHASE-5E-JOBS-SCHEDULED.md        # Week 21: All 40+ cron jobs
│
├── PHASE-6A-MCP-TRANSPORT.md         # Week 22: Streamable HTTP handler
├── PHASE-6B-MCP-TOOLS.md             # Week 23: 70+ tools, rate limiting
│
├── PHASE-7A-MIGRATION-DATA.md        # Week 24: RAWDOG data migration
├── PHASE-7B-MIGRATION-TESTING.md     # Week 25: E2E, performance, security
├── PHASE-7C-MIGRATION-CUTOVER.md     # Week 26: Zero-downtime cutover
│
└── PHASE-8-AUDIT.md                  # Week 27: 15-agent final verification
```

---

## Parallelization Map

### What Can Run Together

```
Week 1-4: Foundation (Sequential)
├── 1A -> 1B -> 1C -> 1D

Week 5-7: Admin + Super Admin (Parallel)
├── 2A -> 2B -> 2C -> 2D (Brand Admin)
├── 2SA-ACCESS -> 2SA-DASHBOARD -> 2SA-ADVANCED (Super Admin)
└── 2SA-ACCESS -> 2SA-USERS (Super Admin Users)

Week 7-9: User Provisioning & RBAC (After Admin Shell)
├── 2E (Team Management) -> 2F (RBAC) -> 2G (Context Switching)
└── 2F can run || with 2PO-HEALTH

Week 8-10: Platform Ops & Settings (Partially Parallel)
├── 2PO-HEALTH || 2PO-LOGGING
├── 2PO-FLAGS -> 2PO-ONBOARDING
└── 2TS-TENANT-SETTINGS (|| with 2PO-FLAGS)

Week 9-12: Communications (Partially Parallel)
├── 2CM-SENDER-DNS || 2CM-EMAIL-QUEUE || 2CM-TEMPLATES
├── 2CM-INBOUND-EMAIL (after 2CM-SENDER-DNS)
├── 2CM-RESEND-ONBOARDING (after all above, integrates with 2PO-ONBOARDING)
└── 2CM-SMS (after 2CM-EMAIL-QUEUE, 2CM-TEMPLATES - uses same patterns)

Week 9-11: Scheduling (Parallel with Communications)
├── 2SC-SCHEDULING-CORE (Week 9-10) - Event types, availability, bookings
└── 2SC-SCHEDULING-TEAM (Week 10-11) - Team scheduling, round-robin (after CORE)

Week 10-14: AI Assistant (After Platform Ops, Parallel with Communications)
├── 2AI-CORE (Week 10-11) - Agents, personality, autonomy, actions
├── 2AI-ADMIN || 2AI-MEMORY || 2AI-VOICE (Week 11-12) - Can run in parallel after CORE
├── 2AI-INTEGRATIONS (Week 12-13) - Slack, Calendar, Email, SMS
└── 2AI-TEAMS (Week 13-14) - Multi-agent teams, org chart (after INTEGRATIONS)

Week 11-13: Support & Help Desk (After Communications)
├── 2SP-SUPPORT-TICKETS (Week 11-12) || 2SP-SUPPORT-KB (Week 11-12)
└── 2SP-SUPPORT-CHANNELS (Week 12-13) - Chat, CSAT, privacy (after TICKETS)

Week 11-13: Productivity & Workflows (After Team Management)
├── 2H-PRODUCTIVITY (Week 11-12) - Tasks, projects, saved items
└── 2H-WORKFLOWS (Week 12-13) - Workflow engine, smart inbox (after 2H-PRODUCTIVITY)

Week 13-14: Surveys (After Communications & Workflows)
└── 2SV-SURVEYS (Week 13-14) - Post-purchase surveys, attribution, Shopify App Extension

Week 11-12: Content Enhancement (All Parallel - after 2C)
├── 2I-A (Blog Advanced) - Topic clusters, quality scoring, link health
├── 2I-B (SEO Suite) - Keywords, redirects, schema validation, audits
└── 2I-C (UGC Gallery) - Photo submissions, moderation, public gallery

Week 9-12: Attribution System (After Admin Shell, Parallel with Support)
├── 2AT-ATTRIBUTION-CORE (Week 9-10) - Dashboard, settings, data quality, setup
├── 2AT-ATTRIBUTION-ANALYTICS || 2AT-ATTRIBUTION-ADVANCED (Week 10-12) - Can run in parallel
└── 2AT-ATTRIBUTION-INTEGRATIONS (Week 11-12) - Pixels, platforms, reports (after CORE)

Week 12-14: A/B Testing System (After Attribution Core, Parallel with Storefront)
├── 2AT-ABTESTING-CORE || 2AT-ABTESTING-STATS (Week 12-13) - Can run in parallel
├── 2AT-ABTESTING-SHIPPING || 2AT-ABTESTING-ADMIN (Week 13-14) - Can run in parallel after CORE
└── Depends on: 3C for storefront integration, 2SH (Shopify App) for Functions

Week 10-12: Shopify App (After Platform Ops, Parallel with Communications)
├── 2SH-SHOPIFY-APP-CORE (Week 10-11) - OAuth, credentials, admin UI
├── 2SH-SHOPIFY-EXTENSIONS || 2SH-SHOPIFY-WEBHOOKS (Week 11-12) - Can run in parallel after CORE
└── Required by: 2AT-ABTESTING-SHIPPING (Shopify Functions), 2SV-SURVEYS (checkout extension)

Week 13-17: Storefront + Video/DAM (Partially Parallel)
├── 3A -> 3B -> 3C -> 3D (Storefront core)
├── 3E-VIDEO (after 3A, parallel with 3F-DAM)
│   ├── 3E-VIDEO-CORE -> 3E-VIDEO-TRANSCRIPTION -> 3E-VIDEO-CREATOR-TOOLS
│   └── Depends on: 5A (Jobs Setup) for background tasks
├── 3F-DAM (after 3A, parallel with 3E-VIDEO)
│   ├── 3F-DAM-CORE -> 3F-DAM-WORKFLOWS
│   └── Depends on: 5A (Jobs Setup) for background tasks
└── 3G-3I (E-Commerce Ops, after 3D)

Week 17-21: Creator + Vendor (Mostly Sequential)
├── 4A -> 4B -> 4C -> 4D
└── 4E (can overlap with 4D tail - shares payee infra)

Week 19-21: Jobs (Partially Parallel)
├── 5A -> 5B || 5C || 5D (after 5A)
└── 5E (after all above)

Week 22-23: MCP (Sequential)
├── 6A -> 6B

Week 24-26: Migration (Sequential)
├── 7A -> 7B -> 7C

Week 27: Audit (All Parallel Agents)
└── PHASE-8-AUDIT (15 agents simultaneously)
```

### Dependency Graph

```
Phase 1 (Foundation)
    └──> Phase 2 (Admin) + Phase 2SA (Super Admin)
             ├──> Phase 2E/2F/2G (User Provisioning & RBAC)
             ├──> Phase 2PO (Platform Ops)
             ├──> Phase 2CM (Communications) || Phase 2SC (Scheduling) || Phase 2AT (Attribution)
             ├──> Phase 2SP (Support & Help Desk - after 2CM)
             └──> Phase 2I (Content Enhancement - after 2C)
                      └──> Phase 3 (Storefront)
                               └──> Phase 4A-4D (Creator) + Phase 4E (Vendor)
                                        └──> Phase 5 (Jobs)
                                                 └──> Phase 6 (MCP)
                                                          └──> Phase 7 (Migration)
                                                                   └──> Phase 8 (Audit)
```

---

## Agent-Specific Reading Lists

### Phase 0 Agents (Portability & Setup)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `PLAN.md` | Understand goals |
| 2 | `PROMPT.md` | Understand patterns |
| 3 | `phases/PHASE-0-PORTABILITY.md` | Monorepo, CLI, templates |
| 4 | `PORTABILITY-ARCHITECTURE.md` | CLI architecture design |
| 5 | **`PLATFORM-SETUP-SPEC-*.md`** | **First-run wizard, Vercel integrations** |
| 6 | `CLAUDE-MD-TEMPLATE.md` | AI documentation patterns |

### Phase 1 Agents (Foundation)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `PLAN.md` | Understand goals |
| 2 | `PROMPT.md` | Understand patterns |
| 3 | `phases/PHASE-1*.md` | Specific tasks |
| 4 | `CODEBASE-ANALYSIS/DATABASE-SCHEMA-*.md` | Current DB structure |
| 5 | `CODEBASE-ANALYSIS/ENV-VARS-*.md` | Environment setup |
| 6 | **`PLATFORM-SETUP-SPEC-*.md`** | **Database schema for platform_config** |

### Phase 2 Agents (Brand Admin)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-2A-ADMIN-SHELL.md` | Shell/navigation |
| 2 | `phases/PHASE-2B-ADMIN-COMMERCE.md` | Commerce features |
| 3 | `phases/PHASE-2C-ADMIN-CONTENT.md` | Content features |
| 4 | `phases/PHASE-2D-ADMIN-FINANCE.md` | Finance features |
| 5 | `CODEBASE-ANALYSIS/ADMIN-FEATURES-*.md` | Feature inventory |
| 6 | `CODEBASE-ANALYSIS/UI-PREVIEW-*.md` | Target UI |

### Phase 2SA Agents (Super Admin)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-2SA-*.md` | Super admin tasks |
| 2 | `SUPER-ADMIN-ARCHITECTURE-*.md` | Full orchestrator spec |
| 3 | `phases/PHASE-2A-ADMIN-SHELL.md` | Shared patterns |

### Phase 2E/2F/2G Agents (User Provisioning & RBAC)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-2E-TEAM-MANAGEMENT.md` | Team invitations, member management |
| 2 | `phases/PHASE-2F-RBAC.md` | Role-based access control |
| 3 | `phases/PHASE-2G-CONTEXT-SWITCHING.md` | Multi-tenant context switching |
| 4 | `phases/PHASE-2SA-USERS.md` | Super admin user management |
| 5 | `phases/PHASE-1C-AUTH.md` | Auth patterns to extend |
| 6 | `TENANT-ISOLATION.md` | Isolation rules |
| 7 | `RAWDOG: src/lib/auth/permissions.ts` | Reference permission patterns |

### Phase 2PO Agents (Platform Ops)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-2PO-*.md` | Platform ops tasks |
| 2 | `specs/HEALTH-MONITORING-SPEC-*.md` | 15+ monitors |
| 3 | `specs/LOGGING-SPEC-*.md` | PlatformLogger |
| 4 | `specs/FEATURE-FLAGS-SPEC-*.md` | 6 flag types |
| 5 | `specs/BRAND-ONBOARDING-SPEC-*.md` | 9-step wizard |
| 6 | **`DOMAIN-SHOPIFY-CONFIG-SPEC-*.md`** | **Domains, Shopify headless, product sync** |
| 7 | **`INTEGRATIONS-CONFIG-SPEC-*.md`** | **24+ integrations, OAuth/API key patterns** |

### Phase 2CM Agents (Communications)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-2CM-*.md` | Communications tasks |
| 2 | `PLAN.md → Unified Communications` | Architecture overview |
| 3 | `PROMPT.md → Email Queue Patterns` | Queue patterns, atomic claim |
| 4 | `phases/PHASE-2PO-ONBOARDING.md` | Onboarding integration |
| 5 | `RAWDOG: src/lib/reviews/email-queue/` | **Reference email queue patterns** |
| 6 | `RAWDOG: src/lib/creator-portal/email-queue/` | Creator queue patterns |
| 7 | `RAWDOG: src/trigger/review-email-queue.ts` | Queue processor patterns |
| 8 | `RAWDOG: src/app/api/webhooks/resend/` | Resend webhook handling |
| 9 | `RAWDOG: src/lib/sms/` | **SMS provider, settings, compliance patterns** |
| 10 | `RAWDOG: src/lib/notifications/channels/sms.ts` | SMS channel integration |

### Phase 2AI Agents (AI Assistant System)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-2AI-CORE.md` | Agent registry, personality, autonomy, actions |
| 2 | `phases/PHASE-2AI-ADMIN.md` | **14 BRI admin pages - settings, autonomy, integrations** |
| 3 | `phases/PHASE-2AI-MEMORY.md` | RAG, embeddings, training, learning |
| 4 | `phases/PHASE-2AI-VOICE.md` | TTS, STT, voice calls |
| 5 | `phases/PHASE-2AI-INTEGRATIONS.md` | Slack, Calendar, Email, SMS integrations |
| 6 | `phases/PHASE-2AI-TEAMS.md` | Multi-agent teams, org chart, handoffs |
| 7 | `PLAN.md → AI Assistant System (BRII)` | Architecture overview |
| 8 | `PROMPT.md → AI Assistant Patterns` | Memory, autonomy, processing patterns |
| 9 | `RAWDOG: src/lib/bri/` | **Core BRII implementation** |
| 10 | `RAWDOG: src/lib/ai-agents/` | **Multi-agent framework** |
| 11 | `RAWDOG: src/lib/bri/memory.ts` | **Memory and RAG patterns** |
| 12 | `RAWDOG: src/lib/ai-agents/personality/` | **Personality trait system** |
| 13 | `RAWDOG: src/lib/bri/voice/` | **Voice integration patterns** |
| 14 | `RAWDOG: src/app/admin/bri/` | Admin UI patterns (14 pages) |
| 15 | `RAWDOG: src/app/admin/ai-team/` | Multi-agent admin UI |

### Phase 2SC Agents (Scheduling & Booking)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-2SC-SCHEDULING-CORE.md` | Event types, availability, bookings |
| 2 | `phases/PHASE-2SC-SCHEDULING-TEAM.md` | Team scheduling, round-robin |
| 3 | `PLAN.md → Scheduling & Booking System` | Architecture overview |
| 4 | `PROMPT.md → Scheduling Patterns` | Timezone, calendar, locking patterns |
| 5 | `RAWDOG: src/lib/scheduling/types.ts` | **Complete type definitions (371 lines)** |
| 6 | `RAWDOG: src/lib/scheduling/availability.ts` | **Slot calculation algorithm** |
| 7 | `RAWDOG: src/lib/scheduling/google-calendar.ts` | **OAuth + Calendar API** |
| 8 | `RAWDOG: src/lib/scheduling/rate-limit.ts` | Sliding window rate limiting |
| 9 | `RAWDOG: src/lib/scheduling/redis/teams.ts` | **Team & round-robin patterns** |
| 10 | `RAWDOG: src/app/admin/scheduling/` | Admin UI patterns |
| 11 | `RAWDOG: src/app/book/` | Public booking flow |

### Phase 2SP Agents (Support & Help Desk)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-2SP-SUPPORT-TICKETS.md` | Ticket management, agents, SLA |
| 2 | `phases/PHASE-2SP-SUPPORT-KB.md` | Knowledge base articles, search |
| 3 | `phases/PHASE-2SP-SUPPORT-CHANNELS.md` | Live chat, CSAT, privacy compliance |
| 4 | `PLAN.md → Support & Help Desk System` | Architecture overview |
| 5 | `PROMPT.md → Support & Help Desk Patterns` | Ticket, SLA, sentiment patterns |
| 6 | `RAWDOG: src/lib/support/tickets.ts` | **Ticket CRUD, SLA calculation** |
| 7 | `RAWDOG: src/lib/support/knowledge-base.ts` | **Article CRUD, full-text search** |
| 8 | `RAWDOG: src/lib/support/chat.ts` | **Live chat sessions, messaging** |
| 9 | `RAWDOG: src/lib/support/csat.ts` | **CSAT surveys, metrics** |
| 10 | `RAWDOG: src/lib/support/privacy.ts` | **GDPR/CCPA request handling** |
| 11 | `RAWDOG: src/lib/support/sentiment.ts` | **AI sentiment analysis** |
| 12 | `RAWDOG: src/app/admin/support/` | Admin UI patterns |
| 13 | `RAWDOG: src/components/support/ChatWidget.tsx` | Embeddable chat widget |

### Phase 2H Agents (Productivity & Workflows)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-2H-PRODUCTIVITY.md` | Tasks, projects, saved items |
| 2 | `phases/PHASE-2H-WORKFLOWS.md` | Workflow engine, smart inbox |
| 3 | `phases/PHASE-2E-TEAM-MANAGEMENT.md` | Team member patterns (for assignment) |
| 4 | `phases/PHASE-2D-ADMIN-FINANCE.md` | Kanban patterns |
| 5 | `RAWDOG: src/lib/workflow/` | **Complete workflow engine** |
| 6 | `RAWDOG: src/lib/workflow/rules/` | Rule evaluator, built-in rules |
| 7 | `RAWDOG: src/lib/workflow/actions/` | Action executor |
| 8 | `RAWDOG: src/lib/smart-inbox/` | Inbox and copilot |
| 9 | `RAWDOG: src/lib/communications/` | Thread and message schema |
| 10 | `RAWDOG: src/app/admin/productivity/` | Dashboard, tasks UI |
| 11 | `RAWDOG: src/app/admin/projects/` | Project management pages |
| 12 | `RAWDOG: src/app/admin/workflows/` | Workflow admin UI |
| 13 | `RAWDOG: src/lib/creator-portal/projects.ts` | Project data model |
| 14 | `RAWDOG: src/lib/slack/db/schema.ts` | Task schema pattern |

### Phase 2SV Agents (Surveys & Attribution)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-2SV-SURVEYS.md` | Survey builder, Shopify extension, analytics |
| 2 | `PLAN.md → Surveys & Post-Purchase Attribution` | Architecture overview |
| 3 | `phases/PHASE-2H-WORKFLOWS.md` | Slack notification patterns |
| 4 | `phases/PHASE-2CM-EMAIL-QUEUE.md` | Queue patterns for notifications |
| 5 | Shopify Dev MCP: Customer Account Extensions | Extension implementation |
| 6 | `RAWDOG: src/app/admin/surveys/` | **Survey admin UI patterns (if exists)** |
| 7 | `RAWDOG: shopify-app/extensions/` | Shopify App Extension patterns |
| 8 | `phases/PHASE-2AT-ATTRIBUTION-CORE.md` | Attribution system integration |

### Phase 2SH Agents (Shopify App & Extensions)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-2SH-SHOPIFY-DEPLOYMENT.md` | **START HERE**: App creation, CLI setup, env vars, CI/CD |
| 2 | `phases/PHASE-2SH-SHOPIFY-APP-CORE.md` | OAuth flow, credential encryption, admin UI |
| 3 | `phases/PHASE-2SH-SHOPIFY-EXTENSIONS.md` | Delivery Functions, Web Pixel, Post-Purchase |
| 4 | `phases/PHASE-2SH-SHOPIFY-WEBHOOKS.md` | Webhook routing, HMAC verification, jobs |
| 5 | `PLAN.md → Shopify App & Extensions` | Architecture overview |
| 6 | `PROMPT.md → Shopify Integration Patterns` | OAuth, webhook, encryption patterns |
| 7 | `RAWDOG: shopify-app/shopify.app.toml` | **App configuration, 40 scopes** |
| 8 | `RAWDOG: shopify-app/extensions/` | **Existing extension implementations** |
| 9 | `RAWDOG: src/lib/shopify/credentials.ts` | **Credential encryption patterns (562 lines)** |
| 10 | `RAWDOG: src/lib/shopify-app/oauth.ts` | **OAuth utilities (598 lines)** |
| 11 | `RAWDOG: src/lib/shopify/encryption.ts` | **AES-256-GCM encryption (180 lines)** |
| 12 | `RAWDOG: shopify-app/extensions/shipping-ab-test-rust/` | **Working Rust function with DeprecatedOperation** |
| 9 | `RAWDOG: src/app/api/webhooks/shopify/` | **Webhook handler patterns** |
| 10 | `RAWDOG: shopify-app/extensions/shipping-ab-test-rust/` | **Rust Shopify Function reference** |
| 11 | `RAWDOG: shopify-app/extensions/ga4-session-stitching/` | **Web Pixel implementation (415 lines)** |
| 12 | Shopify Dev MCP: Admin API | GraphQL API schema introspection |
| 13 | Shopify Dev MCP: Checkout Extensions | Post-purchase UI extension types |
| 14 | Shopify Dev MCP: Functions | Delivery customization function types |

### Phase 2I Agents (Content Enhancement)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-2I-CONTENT-BLOG-ADVANCED.md` | Topic clusters, quality scoring, E-E-A-T |
| 2 | `phases/PHASE-2I-CONTENT-SEO.md` | Keywords, redirects, schema validation |
| 3 | `phases/PHASE-2I-CONTENT-UGC.md` | Photo submissions, moderation, gallery |
| 4 | `phases/PHASE-2C-ADMIN-CONTENT.md` | Basic blog/LP patterns (prerequisite) |
| 5 | `RAWDOG: src/app/admin/blog/` | Blog management patterns |
| 6 | `RAWDOG: src/app/admin/blog/clusters/` | Topic clustering UI |
| 7 | `RAWDOG: src/app/admin/blog/link-health/` | Link health dashboard |
| 8 | `RAWDOG: src/lib/blog/quality-analyzer.ts` | 100-point scoring system |
| 9 | `RAWDOG: src/lib/seo/` | Keyword tracking, redirects, schema |
| 10 | `RAWDOG: src/app/admin/gallery/` | UGC moderation patterns |
| 11 | `RAWDOG: src/app/submit-photos/` | Public submission wizard |

### Phase 2AT Agents (Attribution System)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-2AT-ATTRIBUTION-CORE.md` | Dashboard, settings, data quality, setup wizard |
| 2 | `phases/PHASE-2AT-ATTRIBUTION-ANALYTICS.md` | Channels, products, creatives, cohorts, ROAS |
| 3 | `phases/PHASE-2AT-ATTRIBUTION-ADVANCED.md` | Journeys, MMM, incrementality, AI insights |
| 4 | `phases/PHASE-2AT-ATTRIBUTION-INTEGRATIONS.md` | Pixels, platforms, influencers, reports, exports |
| 5 | `PLAN.md → Attribution System` | Architecture overview |
| 6 | `phases/PHASE-5D-JOBS-ANALYTICS.md` | Background jobs (builds on UI) |
| 7 | `RAWDOG: src/lib/attribution/types.ts` | **Complete type definitions** |
| 8 | `RAWDOG: src/lib/attribution/calculator.ts` | **Attribution calculation logic** |
| 9 | `RAWDOG: src/lib/attribution/models/` | **All 7 attribution models** |
| 10 | `RAWDOG: src/lib/attribution/db/schema.ts` | **Database schema (655 lines)** |
| 11 | `RAWDOG: src/lib/attribution/db/` | Touchpoints, conversions, results queries |
| 12 | `RAWDOG: src/lib/attribution/ml/` | MMM, Shapley, insights engine |
| 13 | `RAWDOG: src/lib/attribution/tracking/` | Channel parsing, identity resolution |
| 14 | `RAWDOG: src/app/admin/attribution/` | **21 admin page patterns** |
| 15 | `RAWDOG: src/app/api/admin/attribution/` | **43+ API routes** |
| 16 | `reference-docs/META-ADS-INTEGRATION.md` | Meta CAPI patterns |
| 17 | `reference-docs/TIKTOK-ADS-INTEGRATION.md` | TikTok Events API |

### Phase 2AT Agents (A/B Testing System)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-2AT-ABTESTING-CORE.md` | Assignment, tracking, targeting, MAB |
| 2 | `phases/PHASE-2AT-ABTESTING-STATS.md` | Statistical methods, CUPED, SRM, guardrails |
| 3 | `phases/PHASE-2AT-ABTESTING-SHIPPING.md` | Shopify Functions, shipping rate tests |
| 4 | `phases/PHASE-2AT-ABTESTING-ADMIN.md` | Admin UI, wizard, results dashboard |
| 5 | `PLAN.md → A/B Testing System` | Architecture overview |
| 6 | `phases/PHASE-3C-STOREFRONT-FEATURES.md` | Storefront A/B testing hooks |
| 7 | `RAWDOG: src/lib/ab-testing/types.ts` | **Complete type definitions** |
| 8 | `RAWDOG: src/lib/ab-testing/assignment.ts` | **Visitor assignment logic** |
| 9 | `RAWDOG: src/lib/ab-testing/cookies.ts` | **Cookie management** |
| 10 | `RAWDOG: src/lib/ab-testing/stats/core.ts` | **Significance calculations** |
| 11 | `RAWDOG: src/lib/ab-testing/statistics/cuped.ts` | **CUPED implementation** |
| 12 | `RAWDOG: src/lib/ab-testing/quality-control/srm-detection.ts` | **SRM detection** |
| 13 | `RAWDOG: src/lib/ab-testing/guardrails/` | **Guardrail evaluation** |
| 14 | `RAWDOG: src/lib/ab-testing/algorithms/allocation.ts` | **MAB Thompson Sampling** |
| 15 | `RAWDOG: src/app/admin/ab-tests/` | **Admin UI patterns** |
| 16 | `RAWDOG: src/components/admin/ab-tests/` | **Components library** |
| 17 | `shopify-app/extensions/shipping-ab-test/` | **Rust Shopify Function** |

### Phase 3 Agents (Storefront)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-3*.md` | Storefront tasks |
| 2 | `specs/COMMERCE-PROVIDER-SPEC-*.md` | Dual checkout |
| 3 | **`DOMAIN-SHOPIFY-CONFIG-SPEC-*.md`** | **Local product DB, sync strategy** |
| 4 | `CODEBASE-ANALYSIS/INTEGRATIONS-*.md` | Shopify patterns |

### Phase 3E Agents (Video Processing)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-3E-VIDEO-CORE.md` | Mux integration, uploads, playback |
| 2 | `phases/PHASE-3E-VIDEO-TRANSCRIPTION.md` | AssemblyAI, AI content generation |
| 3 | `phases/PHASE-3E-VIDEO-CREATOR-TOOLS.md` | Teleprompter, trimming, CTA, comments |
| 4 | `PLAN.md → Video Processing` | Architecture overview |
| 5 | `PROMPT.md → Video Processing Patterns` | Mux, transcription, SSE patterns |
| 6 | `RAWDOG: src/lib/video/` | **Complete video library implementation** |
| 7 | `RAWDOG: src/lib/video/services/mux/` | Mux client, uploads, webhooks |
| 8 | `RAWDOG: src/lib/video/services/transcription/` | AssemblyAI provider |
| 9 | `RAWDOG: src/lib/video/services/ai/` | Claude content generation |
| 10 | `RAWDOG: src/trigger/video-transcription.ts` | Background task patterns |
| 11 | `RAWDOG: src/app/api/v1/videos/` | API route patterns |
| 12 | `RAWDOG: src/app/api/v1/webhooks/mux/` | Webhook handling |
| 13 | `RAWDOG: src/app/admin/videos/` | Admin UI patterns |
| 14 | `RAWDOG: src/components/video/VideoPlayer.tsx` | HLS.js player |

### Phase 3F Agents (Digital Asset Management)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-3F-DAM-CORE.md` | Assets, Drive sync, search, collections |
| 2 | `phases/PHASE-3F-DAM-WORKFLOWS.md` | Versions, review, rights, exports |
| 3 | `PLAN.md → Digital Asset Management` | Architecture overview |
| 4 | `PROMPT.md → Digital Asset Management Patterns` | Upload, sync, review patterns |
| 5 | `RAWDOG: src/lib/dam/` | **Complete DAM implementation** |
| 6 | `RAWDOG: src/lib/dam/types.ts` | Asset, collection, tag types |
| 7 | `RAWDOG: src/lib/dam/gdrive/` | Google Drive OAuth and sync |
| 8 | `RAWDOG: src/lib/dam/import-queue/` | Import queue processing |
| 9 | `RAWDOG: src/lib/dam/versions.ts` | Version control |
| 10 | `RAWDOG: src/lib/dam/ad-review/` | Ad review workflow |
| 11 | `RAWDOG: src/lib/dam/rights.ts` | Rights management |
| 12 | `RAWDOG: src/lib/dam/export-tiktok.ts` | TikTok export |
| 13 | `RAWDOG: src/lib/dam/comments.ts` | Comments and annotations |
| 14 | `RAWDOG: src/lib/dam/search.ts` | Full-text search |
| 15 | `RAWDOG: src/app/admin/dam/` | Admin UI patterns |
| 16 | `RAWDOG: src/app/api/admin/dam/` | API route patterns |

### Phase 3G-3I Agents (E-Commerce Operations)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-3E-ECOMMERCE-RECOVERY.md` | Abandoned checkouts, draft orders |
| 2 | `phases/PHASE-3F-ECOMMERCE-PROMOS.md` | Promo codes, promotions, selling plans |
| 3 | `phases/PHASE-3G-ECOMMERCE-SEGMENTS.md` | Customer segments, samples, Klaviyo |
| 4 | `PLAN.md → E-Commerce Operations` | Architecture overview |
| 5 | `ECOMMERCE-OPS-PATTERNS.md` | Implementation patterns |
| 6 | `RAWDOG: src/app/admin/abandoned-checkouts/` | Abandoned checkout list pattern |
| 7 | `RAWDOG: src/app/admin/promo-codes/` | Promo code management |
| 8 | `RAWDOG: src/app/admin/promotions/` | Promotions calendar |
| 9 | `RAWDOG: src/app/api/admin/selling-plans/` | Selling plan API |
| 10 | `RAWDOG: src/app/admin/samples/` | Samples tracking |
| 11 | `RAWDOG: src/app/api/admin/customer-segments/` | Segment sync |
| 12 | `RAWDOG: src/app/api/admin/draft-orders/` | Draft order creation |

### Phase 4 Agents (Creator + Vendor)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-4*.md` | Creator and vendor tasks |
| 2 | `CODEBASE-ANALYSIS/INTEGRATIONS-*.md` | Stripe, Wise patterns |
| 3 | `CODEBASE-ANALYSIS/DATABASE-SCHEMA-*.md` | Creator/vendor/payout tables |
| 4 | `RAWDOG: src/app/vendor/` | Existing vendor portal structure |
| 5 | `RAWDOG: src/lib/payees/` | Shared payee infrastructure |

### Phase 5 Agents (Jobs)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-5*.md` | Jobs tasks |
| 2 | **`CODEBASE-ANALYSIS/AUTOMATIONS-TRIGGER-DEV-*.md`** | **199 tasks - CRITICAL** |
| 3 | `CODEBASE-ANALYSIS/API-ROUTES-*.md` | Webhook patterns |

### Phase 6 Agents (MCP)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-6*.md` | MCP tasks |
| 2 | `CODEBASE-ANALYSIS/INTEGRATIONS-*.md` | Current MCP patterns |
| 3 | `/src/app/api/mcp/` reference | Existing implementation |

### Phase 7 Agents (Migration)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-7*.md` | Migration tasks |
| 2 | ALL CODEBASE-ANALYSIS docs | Complete understanding |

### Phase 8 Agents (Audit)
| Priority | Document | Why |
|----------|----------|-----|
| 1 | `phases/PHASE-8-AUDIT.md` | Auditor assignments |
| 2 | ALL specs | Requirements verification |
| 3 | ALL CODEBASE-ANALYSIS docs | Feature parity |

---

## Key Metrics to Remember

| Metric | Count | Source Document |
|--------|-------|-----------------|
| Trigger.dev Tasks | 199 | `AUTOMATIONS-TRIGGER-DEV-*.md` |
| API Routes | 1,032 | `API-ROUTES-*.md` |
| Database Tables | 100+ | `DATABASE-SCHEMA-*.md` |
| Admin Sections | 60+ | `ADMIN-FEATURES-*.md` |
| Third-Party Integrations | 24+ | `INTEGRATIONS-*.md` |
| React Components | 465 | `ANALYSIS-SUMMARY-*.md` |
| Health Monitors | 15+ | `HEALTH-MONITORING-SPEC-*.md` |
| MCP Tools | 70+ | Reference codebase |
| Feature Flag Types | 6 | `FEATURE-FLAGS-SPEC-*.md` |
| Onboarding Steps | 9 | `BRAND-ONBOARDING-SPEC-*.md` |
| Auditor Agents | 15 | `PHASE-8-AUDIT.md` |

---

## Core Architectural Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Database | Schema-per-tenant | Data isolation, easy divorce |
| Background Jobs | Provider TBD (agent choice) | Reliable async execution, vendor-agnostic |
| Frontend | Next.js (not Hydrogen) | Multi-tenant, not Shopify-locked |
| Auth | Custom JWT (not Clerk) | Cost, flexibility |
| **Commerce** | **Dual: Shopify (default) + Custom+Stripe** | Feature flag controlled |
| MCP Transport | Streamable HTTP (not SSE) | Protocol compliant |
| Payments | Stripe + Wise hybrid | Domestic + international coverage |

---

## Document Map

```
MULTI-TENANT-PLATFORM-PLAN/
│
├── CORE PLANNING (Read First)
│   ├── PLAN.md                    <- START HERE
│   ├── TENANT-ISOLATION.md        <- **MANDATORY** isolation rules
│   ├── PROMPT.md                  <- Agent patterns, constraints
│   ├── ARCHITECTURE.md            <- Technical architecture
│   ├── PORTABILITY-ARCHITECTURE.md <- Open-source design
│   ├── RESTRUCTURE-GUIDE.md       <- Phase doc template
│   └── FRONTEND-DESIGN-SKILL-GUIDE.md <- UI development skill usage (CRITICAL)
│
├── PORTABILITY & DISTRIBUTION
│   ├── README-TEMPLATE.md         <- GitHub README
│   ├── CLAUDE-MD-TEMPLATE.md      <- New project CLAUDE.md
│   ├── CLAUDE-MD-PACKAGE-TEMPLATE.md <- Per-package AI docs
│   └── LOGGING-AI-ADDENDUM.md     <- AI-friendly logging
│
├── phases/                        <- ALL 52 PHASE DOCS
│   ├── Foundation (1A-1D)         4 docs
│   ├── Admin (2A-2D)              4 docs
│   ├── Super Admin (2SA-*)        3 docs
│   ├── User Provisioning (2E-2G)  3 docs
│   ├── Platform Ops (2PO-*)       4 docs
│   ├── Communications (2CM-*)     6 docs  <- Includes SMS
│   ├── Scheduling (2SC-*)         2 docs  <- Event types, teams, calendar
│   ├── Support (2SP-*)            3 docs  <- Tickets, KB, chat, CSAT, privacy
│   ├── Content Enhancement (2I-*) 3 docs  <- Blog advanced, SEO, UGC
│   ├── Storefront (3A-3D)         4 docs
│   ├── Video Processing (3E-*)    3 docs  <- Mux, transcription, creator tools
│   ├── DAM (3F-*)                 2 docs  <- Assets, Drive sync, review, exports
│   ├── E-Commerce Ops (3G-3I)     3 docs  <- Recovery, promos, segments
│   ├── Creator + Vendor (4A-4E)   5 docs  <- 4E is Vendor Management
│   ├── Jobs (5A-5E)               5 docs
│   ├── MCP (6A-6B)                2 docs
│   ├── Migration (7A-7C)          3 docs
│   └── Audit (8)                  1 doc
│
├── specs/                         <- FEATURE SPECIFICATIONS
│   ├── PLATFORM-SETUP-SPEC-*.md         <- First-run wizard, Vercel integrations
│   ├── COMMERCE-PROVIDER-SPEC-*.md
│   ├── DOMAIN-SHOPIFY-CONFIG-SPEC-*.md  <- Domains, headless checkout, product sync
│   ├── INTEGRATIONS-CONFIG-SPEC-*.md    <- 24+ integrations, OAuth/API key patterns
│   ├── HEALTH-MONITORING-SPEC-*.md
│   ├── LOGGING-SPEC-*.md
│   ├── FEATURE-FLAGS-SPEC-*.md
│   ├── BRAND-ONBOARDING-SPEC-*.md
│   └── SUPER-ADMIN-ARCHITECTURE-*.md
│
└── CODEBASE-ANALYSIS/             <- RAWDOG ANALYSIS
    ├── ANALYSIS-SUMMARY-*.md
    ├── DATABASE-SCHEMA-*.md
    ├── AUTOMATIONS-TRIGGER-DEV-*.md
    ├── API-ROUTES-*.md
    ├── INTEGRATIONS-*.md
    ├── ADMIN-FEATURES-*.md
    ├── ENV-VARS-*.md
    ├── UI-PREVIEW-*.md
    ├── HEALTH-MONITORING-*.md
    └── FEATURE-FLAGS-*.md
```

---

## Timeline Overview

| Phase | Weeks | Focus | Agents |
|-------|-------|-------|--------|
| 0 | -2 to 0 | Portability Setup | 1 |
| 1 | 1-4 | Foundation | 2-3 |
| 2 | 5-7 | Brand Admin | 2-4 |
| 2SA | 5-7 | Super Admin | 2 (parallel) |
| 2PO | 8-10 | Platform Ops | 2-3 |
| 2CM | 9-11 | Communications & Notifications | 2 (parallel) |
| **2SC** | 9-11 | **Scheduling & Booking** | 2 (parallel with 2CM) |
| **2SP** | 11-13 | **Support & Help Desk** | 2-3 (parallel with 2I) |
| 2I | 11-12 | Content Enhancement (Blog, SEO, UGC) | 3 (all parallel) |
| 3 | 13-16 | Storefront (core) | 2-3 |
| **3E-G** | 15-17 | **E-Commerce Ops (recovery, promos, segments)** | 2 (parallel with 3D) |
| 4 | 17-21 | Creator Portal + Vendor Management | 2-3 |
| 5 | 21-23 | Background Jobs | 3-4 |
| 6 | 24-25 | MCP Server | 1-2 |
| 7 | 26-28 | Migration | 2-3 |
| 8 | 29 | Final Audit | 15 (all parallel) |

**Total**: ~31 weeks (7.75 months)

---

---

## Frontend Design Skill Requirements

**CRITICAL**: The `/frontend-design` skill is MANDATORY for all UI work. See `FRONTEND-DESIGN-SKILL-GUIDE.md` for detailed usage.

### Phases Requiring Frontend Design Skill

| Phase | UI Intensity | Key Components |
|-------|--------------|----------------|
| **2A** | HIGH | Admin shell, sidebar, header, dashboard |
| **2B** | HIGH | DataTables, filters, detail pages, reviews |
| **2C** | HIGH | Blog editor, landing page builder |
| **2D** | MEDIUM | Payout tables, treasury views |
| **2SA-DASHBOARD** | HIGH | KPI cards, brands grid, alert feed |
| **2SA-ADVANCED** | MEDIUM | Impersonation UI, error explorer |
| **2PO-HEALTH** | MEDIUM | Health matrix, status indicators |
| **2PO-LOGGING** | MEDIUM | Log viewer, filters |
| **2PO-FLAGS** | MEDIUM | Flag list, editor |
| **2PO-ONBOARDING** | HIGH | 9-step wizard, OAuth flows |
| **2SP-TICKETS** | HIGH | Ticket list, detail view, agent panel |
| **2SP-KB** | HIGH | Article editor, category manager, search |
| **2SP-CHANNELS** | HIGH | Chat widget, CSAT dashboard, privacy UI |
| **2I-A** | HIGH | Quality modal, cluster graph, link health dashboard |
| **2I-B** | HIGH | Keyword charts, audit results, redirect manager |
| **2I-C** | HIGH | Submission wizard, gallery grid, lightbox |
| **3A** | **CRITICAL** | Product card, PDP (customer-facing!) |
| **3B** | **CRITICAL** | Cart, checkout (conversion-critical!) |
| **3C** | HIGH | Reviews display, bundle builder |
| **3D** | HIGH | Theme configurator |
| **3E-VIDEO** | HIGH | Video library, player, upload modal, transcript viewer |
| **3F-DAM** | HIGH | Asset library, import queue, review board, annotation tools |
| **3G** | HIGH | Abandoned checkout list, recovery settings |
| **3H** | HIGH | Promo codes list, calendar, selling plans |
| **3I** | MEDIUM | Segments explorer, samples tracking |
| **4A** | HIGH | Creator dashboard, earnings cards |
| **4B** | MEDIUM | Payout settings |
| **4C** | HIGH | Projects UI, file uploads |
| **4D** | MEDIUM | Tax forms |

### How to Use the Skill

Before creating ANY UI component:

```
/frontend-design

[Component context and requirements]
```

See `FRONTEND-DESIGN-SKILL-GUIDE.md` for:
- Detailed prompts for each phase
- Component-specific guidance
- Anti-patterns to avoid
- Verification checklist

---

## Anti-Patterns to Avoid

### Tenant Isolation (CRITICAL)
1. **DON'T** query without `withTenant()` wrapper - data leaks between tenants
2. **DON'T** cache without tenant prefix - use `createTenantCache(tenantId)`
3. **DON'T** fire job events without `tenantId` in payload
4. **DON'T** store files without tenant path prefix

### Database & Performance
5. **DON'T** use `db.connect()` - use `sql` template tag
6. **DON'T** use transactions with Neon pooled connections
7. **DON'T** use `npm run build` for validation - use `tsc --noEmit`

### Code Quality
8. **DON'T** create files > 700 lines - split them
9. **DON'T** skip cache-busting exports on admin API routes
10. **DON'T** create UI components without invoking `/frontend-design` first

**READ**: [TENANT-ISOLATION.md](./TENANT-ISOLATION.md) for complete rules.

---

## Quick Start for Agents

### Starting a New Session?

1. **Read PLAN.md** - Master plan, goals, why we're doing this
2. **Read TENANT-ISOLATION.md** - **MANDATORY** tenant isolation rules
3. **Read PROMPT.md** - Implementation patterns, constraints, anti-patterns
4. **Read your assigned phase doc** - Specific deliverables
5. **Reference CODEBASE-ANALYSIS/** - Understand current implementation

### Already Working on a Phase?

Jump directly to your phase document and reference the analysis docs as needed.

---

## Questions?

If anything is unclear:
1. Check the relevant CODEBASE-ANALYSIS doc for current state
2. Check the relevant SPEC doc for target state
3. Ask in the conversation (don't guess)
