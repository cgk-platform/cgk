# Gap Remediation: E-Commerce Operations

> **Execution**: Can run in parallel with all other prompts
> **Priority**: Medium
> **Estimated Phases**: 1-2 new phase docs

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

RAWDOG has several e-commerce operational features that are **not mentioned** or **underspecified** in the plan: abandoned checkout recovery, promo code management, selling plans, samples, and customer segmentation.

### Current RAWDOG Implementation

**Source files to reference:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/abandoned-checkouts/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/promo-codes/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/promotions/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/selling-plans/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/samples/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/customer-segments/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/draft-orders/
```

**Abandoned Checkout features:**
- Abandoned checkout tracking
- Recovery campaigns
- Draft order creation for recovery
- Email sequences for recovery

**Promo Code features:**
- Promo code creation UI
- Bulk code generation
- Code performance tracking
- Incentive codes for reviews
- Code validation rules

**Selling Plans features:**
- Shopify selling plan configuration
- Subscription interval management
- Pricing tier configuration

**Samples features:**
- Sample product management
- Free trial tracking
- Sample order detection

**Customer Segmentation features:**
- Segment builder
- Rule-based segmentation
- Segment-based targeting
- Klaviyo sync

---

## Your Task

### 1. Explore the RAWDOG Implementation

Understand:
- Abandoned checkout flow and recovery
- Promo code generation logic
- Selling plan configuration
- Sample detection logic
- Segmentation rule engine

### 2. Update Master Documents

**PLAN.md updates:**
- Add Abandoned Checkout Recovery
- Add Promo Code Management
- Expand Selling Plans coverage
- Add Samples/Trials
- Add Customer Segmentation

**PROMPT.md updates:**
- Add e-commerce operations patterns

### 3. Create Phase Documents

```
PHASE-3H-ECOMMERCE-RECOVERY.md
- Abandoned checkout detection
- Recovery workflows
- Draft order creation
- Email sequences
- SMS recovery option

PHASE-3H-ECOMMERCE-PROMOS.md
- Promo code CRUD
- Bulk generation
- Validation rules
- Performance tracking
- Review incentive codes

PHASE-3H-ECOMMERCE-SEGMENTS.md
- Segment builder UI
- Rule engine
- RFM segmentation
- Behavioral segments
- Klaviyo sync

PHASE-3H-ECOMMERCE-SELLING-PLANS.md (may merge with subscriptions)
- Selling plan configuration
- Interval management
- Pricing tiers
- Sample/trial products
```

---

## Open-Ended Areas (Your Discretion)

- **Recovery timing**: Optimal email/SMS timing
- **Segmentation complexity**: How sophisticated the rule engine
- **Promo code types**: What discount types to support
- **Integration with Shopify**: How much is Shopify-native vs custom

---

## Non-Negotiable Requirements

You MUST preserve:
- Abandoned checkout tracking and recovery
- Promo code generation and management
- Bulk code generation
- Performance tracking
- Selling plan configuration
- Sample/trial management
- Customer segmentation
- Klaviyo sync

---

## Validation

- [ ] All e-commerce ops features documented
- [ ] Recovery workflows specified
- [ ] Segmentation engine specified
- [ ] Database schemas specified
- [ ] Admin UI pages specified

---

## Output Checklist

- [ ] PLAN.md updated
- [ ] PROMPT.md updated
- [ ] 2-4 phase docs created
