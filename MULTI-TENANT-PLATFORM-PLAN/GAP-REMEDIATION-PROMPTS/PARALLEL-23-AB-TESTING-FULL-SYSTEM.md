# Gap Remediation: A/B Testing System - Complete

> **Execution**: Can run in parallel with other prompts
> **Priority**: CRITICAL
> **Estimated Phases**: 2-3 focused phase docs
> **Note**: This replaces/enhances prompt 09 with full page-level specifications

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

The A/B testing platform has sophisticated statistical capabilities. This prompt ensures complete coverage of admin pages, statistical methods, and Shopify Functions integration.

---

## Complete A/B Testing Admin Pages - WHAT We Need

```
/admin/ab-tests
├── (list)                       # Main test list with filters
├── /new                         # Create new test wizard
├── /[testId]                    # Test detail/results view
├── /[testId]/edit               # Edit test configuration
└── /data-quality                # Data quality monitoring

/admin/templates
├── /ab-tests                    # Template A/B tests
└── /ab-tests/[id]               # Template test detail
```

---

## Page Outcomes

### Test List (/admin/ab-tests)
**Outcomes:**
- Tenant sees all their A/B tests in one view
- Filter by status (active, completed, draft, archived)
- Quick stats: active test count, average lift, tests this month
- One-click to create new test
- Bulk actions (archive, delete)

### New Test Wizard (/admin/ab-tests/new)
**Outcomes:**
- Step-by-step guided test creation
- Define hypothesis and metrics
- Configure variants with traffic allocation
- Set targeting rules (audience, device, geo, time)
- Configure advanced settings (confidence level, guardrails)
- Launch immediately or schedule

### Test Detail (/admin/ab-tests/[testId])
**Outcomes:**
- See real-time test results
- Statistical significance clearly displayed
- Winner recommendation when significant
- Segment breakdown (by device, geo, etc.)
- Charts showing trends over time
- Quick actions (pause, stop, declare winner)

### Edit Test (/admin/ab-tests/[testId]/edit)
**Outcomes:**
- Modify test configuration (with warnings about invalidating data)
- Adjust traffic allocation
- Update targeting

### Data Quality (/admin/ab-tests/data-quality)
**Outcomes:**
- Monitor data integrity across all tests
- SRM (Sample Ratio Mismatch) alerts
- Novelty effect detection
- Drift detection

### Template A/B Tests (/admin/templates/ab-tests)
**Outcomes:**
- Test email templates against each other
- See which template performs better
- Statistical results on open/click rates

---

## Statistical Methods - WHAT They Accomplish

**Each method serves a specific purpose:**

1. **Bootstrap Confidence Intervals**
   - Provides confidence range around conversion rate
   - Works without normal distribution assumptions
   - Shows uncertainty in results

2. **CUPED (Controlled-experiment Using Pre-Experiment Data)**
   - Reduces variance in results
   - Faster time to significance
   - Uses pre-experiment behavior as covariate

3. **SRM (Sample Ratio Mismatch) Detection**
   - Detects if traffic split is off
   - Chi-squared test against expected ratio
   - Alerts if experiment integrity compromised

4. **Novelty Effect Detection**
   - Identifies if lift is temporary
   - Tracks effect over time
   - Warns if early results may not persist

5. **Drift Detection**
   - Monitors for population changes during test
   - Alerts if audience composition shifts
   - Helps identify external factors

---

## Test Types - WHAT Can Be Tested

**Website/Landing Page Tests:**
- Landing page variants
- CTA button variations
- Pricing display options
- Layout changes

**Checkout/Shipping Tests (via Shopify App):**
- Shipping rate visibility
- Shipping method order
- Free shipping threshold display
- Delivery date messaging

**Email Template Tests:**
- Subject lines
- Email content/layout
- Send timing
- Call-to-action variations

**Price Tests (if applicable):**
- Price point testing
- Discount display
- Bundle pricing

---

## Targeting Capabilities - WHAT Can Be Targeted

**Audience Segments:**
- New vs returning customers
- High-value customers (by LTV)
- Geographic regions
- Customer tags

**Technical:**
- Device type (mobile, desktop, tablet)
- Browser
- Operating system

**Behavioral:**
- Cart value
- Product categories viewed
- Session count

**Time-Based:**
- Day of week
- Time of day
- Specific date ranges

---

## Advanced Features - WHAT They Enable

**Multi-Armed Bandit:**
- Automatically allocates more traffic to winning variant
- Maximizes conversion during test
- Thompson Sampling implementation

**Guardrails:**
- Define metrics that must NOT decrease
- Auto-stop if guardrail violated
- Protect revenue while testing

**LTV Testing:**
- Track long-term impact beyond immediate conversion
- Cohort-based analysis
- 30/60/90 day LTV comparison

---

## Non-Negotiable Requirements

**Admin Pages:**
- Test list with filters
- New test wizard (multi-step)
- Test detail with results visualization
- Data quality monitoring

**Statistical Methods:**
- Bootstrap confidence intervals
- CUPED variance reduction
- SRM detection
- Novelty effect detection
- Drift detection

**Test Types:**
- Website/landing page tests
- Shipping A/B tests (via Shopify Functions)
- Email template tests

**Features:**
- Multi-variant tests (not just A/B)
- Audience targeting
- Multi-armed bandit option
- Guardrails
- Scheduled start/stop

---

## Definition of Done

- [ ] Test list page shows all tests with filters
- [ ] New test wizard creates working tests
- [ ] Test detail page shows live results
- [ ] Statistical significance is calculated correctly
- [ ] Winner recommendation appears when significant
- [ ] SRM detection alerts when ratio is off
- [ ] Shipping A/B tests work via Shopify Functions
- [ ] Email template tests work
- [ ] Targeting rules correctly filter visitors
- [ ] Multi-tenant isolation verified

---

## Output Checklist

- [ ] PLAN.md updated with A/B testing phases
- [ ] 3-5 focused phase docs created
- [ ] Each page has outcome specification
- [ ] Statistical methods described by purpose (not formula)
- [ ] Shopify Functions integration documented
- [ ] Replaces/enhances prompt 09 coverage
