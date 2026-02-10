# Gap Remediation: Financial Operations

> **Execution**: Can run in parallel with all other prompts
> **Priority**: High
> **Estimated Phases**: 2-3 new phase docs

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

RAWDOG has comprehensive financial operations tools that are **partially mentioned** but **not fully specified** in the plan. This includes expense tracking, P&L management, treasury, and gift cards.

### Current RAWDOG Implementation

**Source files to reference:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/expenses/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/treasury/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/gift-cards/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/stripe-topups/
/Users/holdenthemic/Documents/rawdog-web/src/lib/gift-card/
```

**Expense features:**
- Expense tracking and categorization
- Budget management
- Expense categories configuration
- P&L statements generation
- Cost allocation

**Treasury features:**
- Treasury management dashboard
- Auto-send automation for payments
- Balance tracking
- Stripe top-ups

**Gift Card features:**
- Gift card generation and issuance
- Balance tracking
- Expiration management
- Redemption processing
- Email delivery of gift cards
- Transaction logs
- Gift card product configuration

---

## Your Task

### 1. Explore the RAWDOG Implementation

Understand:
- Expense categorization schema
- P&L calculation logic
- Treasury workflow
- Gift card lifecycle
- Redemption flow

### 2. Update Master Documents

**PLAN.md updates:**
- Add Financial Operations section
- Add Gift Cards to commerce features
- Update Treasury specification

**PROMPT.md updates:**
- Add financial data patterns
- Add gift card patterns

### 3. Create Phase Documents

Suggested structure:

```
PHASE-2H-FINANCIAL-EXPENSES.md
- Expense CRUD
- Category management
- Budget tracking
- Expense approval workflows
- Receipt uploads

PHASE-2H-FINANCIAL-PNL.md
- P&L statement generation
- Cost allocation
- Revenue vs expense mapping
- Financial reporting

PHASE-2H-FINANCIAL-TREASURY.md
- Treasury dashboard
- Balance management
- Stripe top-ups
- Auto-send automation
- Payment scheduling

PHASE-3G-GIFT-CARDS.md
- Gift card products
- Generation and issuance
- Balance management
- Redemption at checkout
- Email delivery
- Transaction history
```

---

## Open-Ended Areas (Your Discretion)

- **Accounting integration**: Whether to integrate with QuickBooks, Xero, etc.
- **P&L automation**: How much of P&L is calculated vs manual
- **Gift card architecture**: Shopify gift cards vs custom system
- **Treasury automation**: Rules for auto-send

---

## Non-Negotiable Requirements

You MUST preserve:
- Expense tracking
- Budget management
- P&L statements
- Treasury management
- Gift card generation and redemption
- Balance tracking
- Email delivery

---

## Validation

- [ ] All financial features documented
- [ ] Gift card system fully specified
- [ ] Database schemas specified
- [ ] API endpoints listed
- [ ] Admin UI specified
- [ ] Multi-tenant financial isolation

---

## Output Checklist

- [ ] PLAN.md updated
- [ ] PROMPT.md updated
- [ ] 3-4 phase docs created
