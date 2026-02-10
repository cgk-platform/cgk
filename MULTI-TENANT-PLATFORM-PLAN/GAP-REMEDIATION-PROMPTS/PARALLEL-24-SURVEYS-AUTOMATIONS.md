# Gap Remediation: Surveys & Automations

> **Execution**: Can run in parallel with other prompts
> **Priority**: MEDIUM
> **Estimated Phases**: 1-2 focused phase docs
> **IMPORTANT**: Build our OWN post-purchase survey via Shopify App - DO NOT use Fairing

---
## ⚠️ CRITICAL: Read vs Write Locations

| Action | Location | Notes |
|--------|----------|-------|
| **READ FIRST** | `PLAN.md` and `PROMPT.md` in the plan folder | Understand existing architecture |
| **READ** | `/Users/holdenthemic/Documents/rawdog-web/src/` | RAWDOG source - DO NOT MODIFY |
| **WRITE** | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/` | Plan docs ONLY |

**Before writing, read existing docs to ensure your additions fit the planned architecture.**

**Files to update:**
- `PLAN.md` - Add feature section (must align with existing structure)
- `PROMPT.md` - Add implementation patterns
- `PHASE-XX-*.md` - Create new phase docs

**⛔ DO NOT modify any code files or anything outside MULTI-TENANT-PLATFORM-PLAN folder.**

---

## Context

RAWDOG has **Surveys** (/admin/surveys) and **Automations** (/admin/automations) systems. For the multi-tenant platform, we will build our own post-purchase survey system using the Shopify App (see prompt 34) instead of integrating with Fairing.

---

## Survey System - WHAT We Need

### Admin Survey Management (/admin/surveys)

**Core Outcomes:**
- Tenant admins can create, edit, and delete surveys
- Each survey has configurable questions with question types (single-select, multi-select, text, rating)
- Surveys can be triggered at different points (post-purchase, post-delivery, etc.)
- Survey responses are stored per-tenant with full isolation
- Slack integration sends real-time response notifications to configured channels

**Survey Configuration:**
- Survey title and description
- Question builder with drag-and-drop ordering
- Conditional logic (show question B if answer to A is X)
- Multi-language support
- Thank you message customization
- Redirect URL after completion

**Post-Purchase Survey (Shopify App Extension):**
- Survey appears on order confirmation page (order status page)
- Attribution questions ("How did you hear about us?") with predefined + custom options
- Product feedback questions
- NPS score collection
- Custom branding per tenant
- Mobile-optimized display

**Survey Response Analytics:**
- Response rate metrics
- Answer distribution charts
- Time-series trends
- Attribution source breakdown
- Export to CSV/Excel
- Integration with attribution system (prompt 22)

**Slack Integration (/admin/surveys/slack):**
- Connect Slack workspace
- Configure channel for survey responses
- Real-time notification of new responses
- Daily/weekly digest options

---

## Automations System - WHAT We Need

### Admin Automation Rules (/admin/automations)

**Core Outcomes:**
- Visual rule builder for no-code automation creation
- Rules execute automatically based on triggers
- Execution history with full audit trail
- Error handling with retry logic and notifications

**Trigger Types:**
- Event-based: Order placed, subscription created, review submitted, survey completed
- Schedule-based: Daily/weekly/monthly at specified time
- Condition-based: When metric exceeds threshold
- Webhook-based: External service triggers

**Action Types:**
- Send email (using template system)
- Send SMS (via Twilio integration)
- Post to Slack channel
- Update record in database
- Call external API/webhook
- Create task/reminder
- Add tag to customer/order
- Trigger another workflow

**Rule Configuration:**
- If/then/else logic
- AND/OR condition groups
- Delay actions (wait X hours/days)
- Rate limiting per rule
- Enable/disable toggle
- Test mode (dry run)

**Execution Monitoring:**
- Execution history log
- Success/failure counts
- Error details with stack traces
- Performance metrics (execution time)
- Retry history

---

## Integration Points

- **Prompt 22 (Attribution)**: Survey responses feed into attribution data
- **Prompt 34 (Shopify App)**: Post-purchase survey is a Shopify App Extension
- **Prompt 31 (Campaigns)**: Automations can trigger campaign enrollments
- **Prompt 05 (SMS)**: SMS actions use Twilio integration

---

## Non-Negotiable Requirements

**Surveys:**
- Own post-purchase survey system (NOT Fairing)
- Shopify App Extension for order confirmation page
- Attribution question support
- Response analytics with charts
- Slack notification integration
- Multi-tenant data isolation

**Automations:**
- Visual rule builder (no-code)
- Multiple trigger types (event, schedule, condition, webhook)
- Multiple action types (email, SMS, Slack, API, data updates)
- Full execution logging and audit trail
- Error handling with retries

---

## Definition of Done

- [ ] Tenant can create and configure surveys with multiple question types
- [ ] Post-purchase survey appears on Shopify order confirmation page
- [ ] Survey responses are captured and stored per-tenant
- [ ] Attribution data from surveys flows to attribution system
- [ ] Slack receives real-time survey response notifications
- [ ] Tenant can create automation rules without code
- [ ] Automations execute on triggers and log results
- [ ] Failed automations retry and notify admins

---

## Output Checklist

- [ ] PLAN.md updated with survey and automation sections
- [ ] Survey phase doc created with all features
- [ ] Automations phase doc created with rule builder spec
- [ ] Integration with Shopify App extension documented
- [ ] Multi-tenant isolation addressed
