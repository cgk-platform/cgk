# Gap Remediation: Attribution System - Complete

> **Execution**: 🟢 PARALLEL - Run with other parallel prompts (after sequential 37, 35)
> **Priority**: CRITICAL
> **Estimated Phases**: 3-4 focused phase docs
> **Note**: This replaces/enhances prompt 08 with full page-level specifications

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

## Your Task

### 1. Explore RAWDOG Attribution System

Use the Explore agent or read these source files:
```
/src/app/admin/attribution/      # Attribution admin pages
/src/lib/attribution/            # Attribution calculations
/src/app/api/admin/attribution/  # Attribution API routes
```

### 2. Update Master Documents

**PLAN.md** - Add comprehensive section for:
- All 20+ attribution admin pages
- Attribution models and calculations
- Data visualization requirements
- Multi-tenant data isolation

**PROMPT.md** - Add patterns for:
- Attribution data schema
- Model calculation patterns
- Dashboard visualization

### 3. Create Phase Docs

Create 3-4 phase docs in `/docs/MULTI-TENANT-PLATFORM-PLAN/`:
- `PHASE-XX-ATTRIBUTION-ADMIN-PAGES.md`
- `PHASE-XX-ATTRIBUTION-MODELS.md`
- `PHASE-XX-ATTRIBUTION-DATA-PIPELINE.md`

---

## Context

The attribution system is one of RAWDOG's most sophisticated features with **20+ admin pages**. The previous prompt (08) covered calculation methodology but missed the **admin UI architecture and data visualization surfaces**.

---

## Complete Attribution Admin Pages - WHAT We Need

```
/admin/attribution
├── (overview)                    # Main dashboard
├── /channels                     # Channel performance breakdown
├── /creatives                    # Creative asset tracking
├── /journeys                     # Customer journey visualization
├── /model-comparison            # Side-by-side model comparison
├── /cohorts                     # Cohort analysis and LTV
├── /mmm                         # Marketing Mix Modeling
├── /ai-insights                 # AI-generated recommendations
├── /influencers                 # Influencer/creator attribution
├── /pixels                      # Pixel management & validation
├── /data-quality                # Data quality & gap detection
├── /settings                    # Configuration & preferences
├── /dashboards                  # Custom dashboard builder
├── /exports                     # Data export interface
├── /incrementality              # Incrementality testing
├── /platforms                   # Platform integration status
├── /products                    # Product-level attribution
├── /reports                     # Custom report builder
├── /roas-index                  # ROAS tracking & indexing
└── /setup                       # Initial configuration wizard
```

---

## Page Outcomes

### Overview Dashboard (/admin/attribution)
**Outcomes:**
- Tenant sees total attributed revenue at a glance
- Key metrics (conversions, ROAS, CPA) displayed prominently
- Time range selection changes all data
- Model selector switches attribution view
- Quick links to drill-down pages

### Channels (/admin/attribution/channels)
**Outcomes:**
- Breakdown of performance by marketing channel (Meta, Google, TikTok, Email, Organic, Direct, etc.)
- Each channel shows: spend, revenue, conversions, ROAS, CPA
- Comparison across models
- Trend over time

### Creatives (/admin/attribution/creatives)
**Outcomes:**
- Performance of individual ad creatives
- Connect to DAM assets
- Identify top-performing creatives
- Creative fatigue detection

### Journeys (/admin/attribution/journeys)
**Outcomes:**
- Visualize common customer paths to conversion
- Multi-touch journey display
- Identify high-value touchpoint combinations
- Path length analysis

### Model Comparison (/admin/attribution/model-comparison)
**Outcomes:**
- Side-by-side comparison of all 8 attribution models
- Same data, different credit allocation
- Helps understand model differences
- Recommendation for best model based on business type

### Cohorts (/admin/attribution/cohorts)
**Outcomes:**
- Customer cohort analysis by acquisition date
- LTV tracking over time
- Retention curves
- Payback period calculation

### MMM (/admin/attribution/mmm)
**Outcomes:**
- Marketing Mix Modeling dashboard
- Channel saturation curves
- Optimal budget allocation recommendations
- Seasonality adjustments

### AI Insights (/admin/attribution/ai-insights)
**Outcomes:**
- AI-generated recommendations
- Anomaly detection alerts
- Optimization suggestions
- Natural language insights

### Influencers (/admin/attribution/influencers)
**Outcomes:**
- Creator/influencer contribution tracking
- Attributed sales per creator
- Discount code performance
- Commission calculation integration

### Pixels (/admin/attribution/pixels)
**Outcomes:**
- Pixel health monitoring
- Event firing validation
- Data quality indicators
- Setup troubleshooting

### Data Quality (/admin/attribution/data-quality)
**Outcomes:**
- Data gap detection
- Missing touchpoint alerts
- Cross-device tracking status
- Data freshness indicators

### Settings (/admin/attribution/settings)
**Outcomes:**
- Attribution window configuration
- Model weights customization
- Conversion definition
- Channel mapping rules

### Dashboards (/admin/attribution/dashboards)
**Outcomes:**
- Custom dashboard builder
- Save multiple views
- Widget library
- Sharing with team

### Exports (/admin/attribution/exports)
**Outcomes:**
- Export data to CSV/Excel/JSON
- Scheduled export configuration
- API access for external tools

### Incrementality (/admin/attribution/incrementality)
**Outcomes:**
- Geo-holdout test configuration
- Lift measurement
- Statistical significance display
- Test history

### Platforms (/admin/attribution/platforms)
**Outcomes:**
- Integration status per ad platform
- Data sync health
- Last sync timestamps
- Connection troubleshooting

### Products (/admin/attribution/products)
**Outcomes:**
- Product-level attribution
- Which products driven by which channels
- Product performance by source

### Reports (/admin/attribution/reports)
**Outcomes:**
- Custom report builder
- Save report configurations
- Schedule automated reports
- Email delivery

### ROAS Index (/admin/attribution/roas-index)
**Outcomes:**
- ROAS tracking over time
- Benchmark comparisons
- Trend analysis

### Setup (/admin/attribution/setup)
**Outcomes:**
- Guided setup wizard for new tenants
- Integration configuration
- Pixel installation verification
- Conversion tracking setup

---

## Attribution Models - WHAT They Accomplish

**All 8 models calculate credit allocation differently:**

1. **First Touch** - 100% credit to first touchpoint (acquisition focus)
2. **Last Touch** - 100% credit to last touchpoint (conversion focus)
3. **Linear** - Equal credit to all touchpoints
4. **Time Decay** - More credit to touchpoints closer to conversion
5. **Position-Based** - 40% first, 40% last, 20% middle
6. **Data-Driven** - ML-based credit allocation from actual data
7. **Shapley Value** - Game theory based fair allocation
8. **Markov Chains** - Probability-based transition modeling

---

## Non-Negotiable Requirements

**All 20 admin pages must exist with:**
- Working data visualization
- Time range filtering
- Model selection
- Multi-tenant data isolation
- Export capability

**All 8 attribution models must:**
- Calculate correctly
- Be selectable in UI
- Show comparative results

---

## Definition of Done

- [ ] All 20 attribution pages render with data
- [ ] Model selector works across all pages
- [ ] Time range selector works across all pages
- [ ] Channel breakdown shows all connected platforms
- [ ] Journey visualization displays customer paths
- [ ] MMM provides budget recommendations
- [ ] Data quality page identifies gaps
- [ ] Exports generate downloadable files
- [ ] Settings save and apply correctly
- [ ] Multi-tenant isolation verified (tenant A cannot see tenant B's data)

---

## Output Checklist

- [ ] PLAN.md updated with attribution phases
- [ ] 4-5 focused phase docs created
- [ ] Each page has outcome specification
- [ ] Replaces/enhances prompt 08 coverage
