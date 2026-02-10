# PHASE-4A-ANALYTICS: Creator Analytics & Data Export

**Duration**: 0.5 weeks (integrated with Week 16)
**Depends On**: PHASE-4A (creator portal), PHASE-4B (payments)
**Parallel With**: PHASE-4B
**Blocks**: None

---

## Goal

Provide creators with detailed analytics, performance metrics, historical trends, and data export capabilities. Enable creators to understand their earnings, track performance over time, and download their data for personal records or tax purposes.

---

## Success Criteria

- [ ] Earnings analytics dashboard with period selection
- [ ] Historical trend charts (earnings over time)
- [ ] Earnings breakdown by source (commissions, projects, bonuses)
- [ ] Performance metrics (if applicable: conversion rates, top content)
- [ ] Tax summaries with year-to-date totals
- [ ] Data export functionality (CSV, PDF)
- [ ] Transaction history export

---

## Deliverables

### Earnings Analytics Dashboard

Enhanced analytics section on the payments page or dedicated `/creator/analytics` page.

**Period Selection:**
- Preset periods: This Week, This Month, Last Month, This Year, Last Year, All Time
- Custom date range picker
- Period comparison (optional): vs Previous Period

**Earnings Charts:**
- **Line Chart**: Earnings over time (daily/weekly/monthly granularity)
- **Breakdown Donut**: Earnings by type (Commissions, Projects, Bonuses, Adjustments)
- **Bar Chart**: Monthly comparison (current vs previous year)

**Key Metrics Cards:**
- Total Earnings (period)
- Average per Month
- Best Month (all time)
- Pending to be Released

**API Routes:**
- `GET /api/creator/analytics/earnings` - Earnings with period filter
- `GET /api/creator/analytics/trends` - Time-series data for charts
- `GET /api/creator/analytics/breakdown` - Earnings by type

### Performance Metrics (If Applicable)

For creators with commission-based earnings:

**Commission Metrics:**
- Total Sales Attributed
- Conversion Rate (clicks to purchases, if tracked)
- Average Order Value
- Top Performing Products (if tracked)

**Content Metrics (if project-based):**
- Projects Completed
- On-Time Delivery Rate
- Revision Rate
- Average Rating (if applicable)

**Note**: These metrics require tracking infrastructure that may not exist for all tenants. Mark as optional/configurable.

### Tax Summaries

Year-to-date tax information for creators.

**Tax Summary Card:**
- YTD Earnings Total
- YTD 1099-Reportable Income
- W-9 Status (Submitted/Pending/Not Required)
- Expected 1099 (if earning ≥$600)

**Annual Summary:**
- List of tax years with totals
- Download 1099 copy (when available)
- Download annual earnings summary

**API Routes:**
- `GET /api/creator/tax/payments` - Year earnings data
- `GET /api/creator/tax/info` - W-9 status and tax classification
- `GET /api/creator/tax/forms` - 1099 forms (if filed)
- `GET /api/creator/tax/forms/[id]/download` - Download specific form

### Data Export

Self-service data export for creators.

**Export Types:**

**1. Transaction History Export:**
- Format: CSV
- Fields: Date, Type, Description, Amount, Balance After
- Filter options: Date range, Transaction types
- Download button in transaction history

**2. Annual Earnings Summary (PDF):**
- Period: Full calendar year
- Sections: Summary totals, Monthly breakdown, Earnings by type
- Official document format suitable for tax records
- Creator name, email, tax ID (last 4 if available)

**3. Full Data Export (GDPR-style):**
- Complete data package
- Includes: Profile, Transactions, Projects, Messages (metadata), Tax documents
- Format: ZIP containing JSON files
- Processing time: Async generation, email notification when ready

**API Routes:**
- `POST /api/creator/export/transactions` - Generate transaction CSV
- `POST /api/creator/export/annual-summary` - Generate annual PDF
- `POST /api/creator/export/full-data` - Request full data export (async)
- `GET /api/creator/export/status/[id]` - Check export status
- `GET /api/creator/export/download/[id]` - Download completed export

**Export Generation:**
- CSV: Direct generation, immediate download
- PDF: Server-side generation (react-pdf or puppeteer)
- Full Export: Inngest job, email notification with download link

---

## Database

**Tables:**
- No new tables required
- Uses existing: `creator_balance_transactions`, `withdrawal_requests`, tax tables

**Queries:**
- Aggregate queries on `creator_balance_transactions` with date grouping
- Cache heavy analytics queries in Redis (5-minute TTL)

---

## Constraints

- Analytics queries must be performant (<500ms for most requests)
- Cache frequently accessed analytics data
- Full data export is async to avoid timeout
- PDF generation may require external service or Puppeteer
- Export downloads expire after 7 days
- GDPR full export limited to 1 request per 30 days

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Analytics charts, export UI

**MCPs to consult:**
- Context7 MCP: "React charting libraries (recharts, visx)"
- Context7 MCP: "PDF generation in Next.js"

**RAWDOG code to reference:**
- `src/app/creator/payments/page.tsx` - Existing earnings breakdown
- `src/app/creator/settings/tax/` - Tax info pages

---

## Frontend Design Skill Integration

**1. Analytics Dashboard:**
```
/frontend-design

Building creator analytics dashboard for PHASE-4A-ANALYTICS.

Requirements:
- Period selector:
  - Preset buttons: Week, Month, Year, All Time
  - Custom date range picker
- Metrics cards (grid):
  - Total Earnings, Average/Month, Best Month, Pending
- Earnings trend chart:
  - Line chart showing earnings over time
  - Responsive, tooltip on hover
- Breakdown visualization:
  - Donut or pie chart by earnings type
  - Legend with amounts
- Export buttons:
  - "Download CSV" for transactions
  - "Download Annual Summary" for PDF

Design:
- Clean, data-focused layout
- Charts use brand colors
- Cards with clear hierarchy
- Responsive grid
```

**2. Tax Summary Section:**
```
/frontend-design

Building tax summary for creator portal PHASE-4A-ANALYTICS.

Requirements:
- YTD Summary card:
  - Total earnings this year
  - 1099 threshold status ($600)
  - W-9 status with link to update
- Annual summaries list:
  - Year, Total Earned, 1099 Status
  - Download button for each
- Download actions:
  - Annual summary PDF
  - 1099 copy (if filed)

Design:
- Card-based layout
- Year selector for historical
- Clear 1099 status indicators
- Download icons prominent
```

---

## Tasks

### [PARALLEL] Analytics API
- [ ] Create `GET /api/creator/analytics/earnings` with period filter
- [ ] Create `GET /api/creator/analytics/trends` for time-series
- [ ] Create `GET /api/creator/analytics/breakdown` for type breakdown
- [ ] Implement Redis caching for analytics queries
- [ ] Add date aggregation queries (daily, weekly, monthly)

### [PARALLEL] Analytics UI
- [ ] Add period selector component
- [ ] Build metrics cards grid
- [ ] Integrate charting library (recharts or visx)
- [ ] Build earnings trend line chart
- [ ] Build breakdown donut/pie chart
- [ ] Add analytics section to payments page (or new /analytics route)

### [PARALLEL] Tax Summary
- [ ] Create tax summary card component
- [ ] Build annual summaries list
- [ ] Add download buttons for 1099 copies
- [ ] Link W-9 status to settings

### [PARALLEL] Data Export
- [ ] Create `POST /api/creator/export/transactions` for CSV
- [ ] Create `POST /api/creator/export/annual-summary` for PDF
- [ ] Implement CSV generation utility
- [ ] Implement PDF generation (react-pdf or puppeteer)
- [ ] Create download buttons in UI
- [ ] (Optional) Create full data export with Inngest job

---

## Definition of Done

- [ ] Period selection filters analytics data correctly
- [ ] Trend chart displays earnings over time
- [ ] Breakdown shows earnings by type
- [ ] Metrics cards show accurate totals
- [ ] Transaction CSV export downloads correctly
- [ ] Annual summary PDF generates and downloads
- [ ] Tax summary shows YTD and 1099 status
- [ ] `npx tsc --noEmit` passes
