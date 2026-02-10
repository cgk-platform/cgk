# Meta Ads API Integration Reference

> **Source**: Copied from `/docs/ai-reference/META-ADS-INTEGRATION.md`

**CRITICAL**: When working with Meta/Facebook Marketing API, ALWAYS reference `/META-ADS-API-GUIDE.md` first.

## Navigating the Documentation

The `/META-ADS-API-GUIDE.md` file is **very large** (~20,000 lines, 81 sections). To work with it efficiently:

1. **Read the Table of Contents first** (lines 1-497) - The document starts with a comprehensive TOC
2. **Identify relevant section(s)** from the TOC based on the task
3. **Read only the specific sections needed** using offset/limit parameters
4. **Content starts at line 498**

## TOC Section Reference (by TOC line number)

**Setup & Authentication (Sections 1-6):**
- Lines 2-8: Getting Started with Marketing API, Ad Account Requirements
- Lines 9-22: Authorization (App Roles, Access Levels, Permissions, Business Verification)
- Lines 23-29: Graph API Explorer, Access Tokens, Credential Management

**Basic Ad Operations (Sections 7-16):**
- Lines 30-34: Basic Ad Creation Endpoints (campaigns, adsets, ads)
- Lines 35-47: Create Campaign, Ad Set, Ad Creative, Ad
- Lines 48-72: Ad Optimization (Custom Audiences, Insights, Monitoring)
- Lines 56-72: Optimization Tips (Targeting, Budget, Creatives, Real-Time Data)

**Creative & Conversions (Sections 17-20):**
- Lines 73-77: Conversions API, Ad Creative, Limits
- Lines 78-79: Placements, Preview an Ad

**Video & Carousel Ads (Sections 21-26):**
- Lines 80-103: Video Ads (creation, metrics, remarketing, CTAs)
- Lines 96-103: Carousel Ads (inline, post, video carousel, mobile app)
- Lines 104-126: Video Publishing & Upload (session, resumable upload)
- Lines 127-137: FB Video Ads API (upload, specs, publish)

**Collection Ads (Section 26):**
- Lines 138-154: Collection Ads with Instant Experience

**Platform-Specific Ads (Sections 27-29):**
- Lines 155-162: Instagram Ads API (5-step creation flow)
- Lines 163-185: Threads Ads (Instagram-connected & backed accounts, carousel)
- Lines 186-213: Partnership Ads API (post-level, account-level, creation)

**Advantage+ Campaigns (Sections 30-34):**
- Lines 214-224: Advantage+ Campaign Experience (Sales, App, Leads)
- Lines 225-232: Advantage+ Shopping Campaigns (6-step setup)
- Lines 233-236: Cross-Channel Conversion Optimization
- Lines 237-239: Shops Ads with A+ Shopping

**Creative Features (Sections 35-45):**
- Lines 240-246: Branded Content
- Lines 247-253: Asset Feed Spec (create, read, edit, deep links)
- Lines 255-260: Dynamic Creative
- Lines 261-269: Asset Customization Rules, Placement Asset Customization
- Lines 270-277: Multi-Language Ads (auto-translation)
- Lines 278-286: Advantage+ Catalog Ads (dynamic media, aspect ratios)
- Lines 287-303: Advantage+ Creative (site links, product extensions)
- Lines 304-308: Standard Enhancements

**Generative AI & Advanced (Sections 46-54):**
- Lines 309-314: Generative AI Features (text gen, image expansion, backgrounds)
- Lines 315-319: Collaborative Ads
- Lines 320-338: Managed Partner Ads (integration, API guide)
- Lines 335-338: Multi-advertiser Ads
- Lines 339-353: Reels Ads (9-step creation, dynamic media)
- Lines 354-362: Flexible Ad Format, Format Automation

**Insights API & Analytics (Sections 55-61):**
- Lines 363-375: Insights API (calls, levels, attribution, sorting)
- Lines 376-381: Insights Breakdowns (generic, hourly, action, combining)
- Lines 382-388: **CRITICAL: Limits and Best Practices** (data limits, rate limits, async jobs)
- Lines 389-395: Tracking and Conversion Specs
- Lines 396-401: Marketing Mix Modeling Breakdown
- Lines 402-408: Split Testing (guidelines, restrictions, strategies)
- Lines 409-415: Ad Volume (view, breakdown, best practices)

**API Infrastructure (Sections 62-77):**
- Lines 416-423: User Information, Suggested Bids, Batch Requests, ETags, Archive/Delete
- Lines 424-429: Paginated Results (cursor, time-based, offset)
- Lines 430-433: **Rate Limits** (platform, business use case)
- Lines 434-437: Platform Versioning
- Lines 438-446: **Batch Requests** (complex, errors, timeouts, binary upload)
- Lines 447-450: Debug Requests
- Lines 451-455: **Error Handling** (codes, subcodes, rate limit errors)
- Lines 456-460: Field Expansion
- Lines 461-469: Secure Graph API Calls (appsecret_proof, encryption)

**Recommendations & Reference (Sections 78-81):**
- Lines 470-472: Opportunity Score and Recommendations
- Lines 473-480: Omni Optimal Technical Setup (events, EMQ, deduplication)
- Lines 481-487: Manage Ad Object Status (live, archived, deleted)
- Lines 488-497: Marketing API Reference (root nodes, objects)

## Quick Reference

**Ad Creation Hierarchy** (always follow this order):
1. **Campaign** -> Sets objective (OUTCOME_SALES, OUTCOME_TRAFFIC, etc.)
2. **Ad Set** -> Targeting, budget, schedule, optimization_goal, billing_event
3. **Ad Creative** -> Visual assets, copy, CTA
4. **Ad** -> Links creative to ad set

**Key Objectives** (ODAX - Outcome-Driven):
- `OUTCOME_AWARENESS` - Brand awareness, reach
- `OUTCOME_TRAFFIC` - Website visits, link clicks
- `OUTCOME_ENGAGEMENT` - Post engagement, video views, messages
- `OUTCOME_LEADS` - Lead generation forms
- `OUTCOME_SALES` - Conversions, catalog sales
- `OUTCOME_APP_PROMOTION` - App installs, app events

**Insights API Critical Info:**
- Endpoints: `act_<ID>/insights`, `<CAMPAIGN_ID>/insights`, `<ADSET_ID>/insights`, `<AD_ID>/insights`
- Use `level` param to aggregate (campaign, adset, ad)
- Use `breakdowns` for segmentation (age, gender, placement, device)
- **Async required** for: date ranges >7 days, complex breakdowns, large accounts
- Data refreshes every **15 minutes**, finalizes after **28 days**

**Rate Limit Headers to Monitor:**
- `x-fb-ads-insights-throttle`: `{"app_id_util_pct": N, "acc_id_util_pct": N}`
- `x-ad-account-usage`: General account limits
- `x-business-use-case-usage`: Business Use Case limits
- When `util_pct` approaches 100%, implement backoff

**Common Error Codes:**
- `error_code=4`: Rate limiting - back off and retry
- `error_code=100, subcode=1487534`: Data per call limit exceeded - reduce scope
- `error_code=100, subcode=1504022`: Global rate limit - wait and retry

## Mandatory Requirements

1. **Scalability First**: Always assume thousands of ads, ad sets, campaigns, AND ad accounts:
   - Asynchronous jobs for large queries (REQUIRED for Insights)
   - Pagination for ALL list operations (cursor-based preferred)
   - Batch requests when fetching/creating multiple objects
   - Redis caching with appropriate TTLs

2. **Insights API for Large Datasets** (see TOC lines 363-401):
   - ALWAYS use async reports for date ranges > 7 days
   - Use `/insights` endpoint with `async=true` parameter
   - Limit breakdowns to avoid query timeouts
   - Monitor `x-fb-ads-insights-throttle` header

3. **Bulk Ad Publishing** (see TOC lines 438-446 for Batch Requests):
   - Use batch API for creating/updating hundreds of ads
   - Max 50 requests per batch call
   - Implement exponential backoff on rate limits
   - Stagger large bulk operations over time

4. **Rate Limit Handling**:
   - Monitor throttle headers and implement exponential backoff
   - Business Use Case limits: ~300 calls/hour for standard access

5. **Front-End Protection**: Meta API code must NEVER impact front-end performance:
   - Only call Meta API from `/api/admin/*` routes or background jobs
   - Use background sync jobs for data fetching
   - Never make Meta API calls from client components

## Multi-Tenant Considerations

When integrating Meta Ads in a multi-tenant platform:

1. **Credentials per Tenant**: Each tenant has their own Meta ad account(s)
   - Store encrypted access tokens in `public.organizations` table
   - Refresh tokens via tenant-specific OAuth flows

2. **Tenant-Scoped Caching**:
   - Cache keys must include tenant ID: `meta:insights:${tenantId}:${accountId}:${date}`
   - Don't share cached data across tenants

3. **Rate Limiting per Account**:
   - Rate limits are per-ad-account, not per-app
   - Track usage per tenant to avoid one tenant blocking others

## File Locations (Platform)
```
packages/integrations/src/meta/          # Meta Ads SDK client
apps/admin/src/lib/meta-ads/             # Tenant-scoped utilities
apps/admin/src/app/api/admin/meta-ads/   # API routes
```

## Key Patterns
- Use `facebook-nodejs-business-sdk` for API calls
- Cache insights with 15-minute TTL (API refresh rate)
- Use async reports for date ranges > 7 days
- Store tokens securely, encrypted at rest
