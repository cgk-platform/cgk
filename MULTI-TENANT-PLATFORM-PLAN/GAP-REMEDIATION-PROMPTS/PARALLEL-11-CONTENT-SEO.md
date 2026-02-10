# Gap Remediation: Content & SEO Enhancement

> **Execution**: Can run in parallel with all other prompts
> **Priority**: Medium
> **Estimated Phases**: 1-2 new phase docs or updates

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

The plan mentions blog and content features but RAWDOG has **more sophisticated** content management and SEO tools that are **not fully specified**.

### Current RAWDOG Implementation

**Source files to reference:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/blog/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/seo/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/gallery/
/Users/holdenthemic/Documents/rawdog-web/src/app/submit-photos/
/Users/holdenthemic/Documents/rawdog-web/src/lib/seo/
```

**Blog features beyond basic CMS:**
- Topic clustering tools
- Link health analysis (backlinks)
- Best practices guides
- Rich text editor with markdown
- Category and author management
- Featured posts

**SEO features:**
- Keyword tracking
- Content gap analysis
- URL redirect management
- Schema/structured data management
- Page SEO analysis scores
- Meta tag management

**Gallery/UGC features:**
- User-generated content gallery
- Photo submission portal
- UGC moderation
- Gallery display on site

---

## Your Task

### 1. Explore the RAWDOG Implementation

Understand:
- Topic clustering approach
- Link health checking
- SEO analysis scoring
- UGC submission flow
- Gallery management

### 2. Update Master Documents

**PLAN.md updates:**
- Expand Blog section with advanced features
- Add SEO Management section
- Add UGC/Gallery section

**PROMPT.md updates:**
- Add content management patterns
- Add SEO patterns

### 3. Create/Update Phase Documents

```
PHASE-2I-CONTENT-BLOG-ADVANCED.md (enhance existing)
- Topic clustering
- Link health monitoring
- Internal linking suggestions
- Content calendar
- Best practices integration

PHASE-2I-CONTENT-SEO.md (new)
- Keyword tracking
- Rank monitoring
- Content gap analysis
- SEO score calculation
- Redirect management
- Schema markup management

PHASE-2I-CONTENT-UGC.md (new)
- Photo submission portal
- UGC moderation workflow
- Gallery management
- UGC display components
- Rights management for UGC
```

---

## Open-Ended Areas (Your Discretion)

- **SEO tools**: Third-party integration vs custom
- **Clustering algorithm**: How to group topics
- **UGC moderation**: Manual vs AI-assisted
- **Keyword tracking source**: Where rank data comes from

---

## Non-Negotiable Requirements

You MUST preserve:
- Topic clustering
- Link health analysis
- Keyword tracking
- Content gap analysis
- Redirect management
- Schema management
- UGC submission portal
- Gallery management

---

## Validation

- [ ] All content features documented
- [ ] SEO tools specified
- [ ] UGC workflow specified
- [ ] Database schemas specified
- [ ] Admin UI pages specified

---

## Output Checklist

- [ ] PLAN.md updated
- [ ] PROMPT.md updated
- [ ] 2-3 phase docs created/updated
