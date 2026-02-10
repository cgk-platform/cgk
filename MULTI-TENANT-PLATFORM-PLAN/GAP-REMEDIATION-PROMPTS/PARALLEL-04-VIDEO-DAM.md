# Gap Remediation: Video Processing & Digital Asset Management

> **Execution**: Can run in parallel with all other prompts
> **Priority**: Critical
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

RAWDOG has both video processing capabilities (Mux, transcription) and a full Digital Asset Management (DAM) system. The plan mentions Mux in health monitoring but **lacks specifications** for video workflows. DAM is **not mentioned at all**.

### Current RAWDOG Implementation

**Video source files:**
```
/Users/holdenthemic/Documents/rawdog-web/src/lib/video/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/videos/
/Users/holdenthemic/Documents/rawdog-web/src/app/api/v1/videos/
/Users/holdenthemic/Documents/rawdog-web/src/trigger/ (video processing tasks)
```

**DAM source files:**
```
/Users/holdenthemic/Documents/rawdog-web/src/lib/dam/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/dam/
/Users/holdenthemic/Documents/rawdog-web/src/app/api/dam/
```

**Video features:**
- Mux video hosting and streaming
- AssemblyAI transcription
- Teleprompter tool for creator recording
- Thumbnail generation
- Video analytics and playback tracking
- Background processing via Trigger.dev

**DAM features:**
- Google Drive integration for storage
- Asset versioning and version control
- Multi-version review workflows
- Comments and annotations
- Asset collections and folders
- Rights management
- TikTok export capability
- Import queue with batch processing
- Full-text search on assets
- Metadata tagging

---

## Your Task

### 1. Explore Both Systems

Video:
- How uploads flow through Mux
- Transcription pipeline
- Teleprompter implementation
- Trigger.dev tasks to migrate to Inngest

DAM:
- Google Drive sync mechanism
- Review workflow states
- Version management
- Search implementation

### 2. Update Master Documents

**PLAN.md updates:**
- Add Video Processing specification
- Add DAM system specification
- Update Phase 5 (Jobs) with video processing tasks

**PROMPT.md updates:**
- Add patterns for video/media handling
- Add DAM patterns

### 3. Create Phase Documents

Suggested structure:

```
PHASE-3E-VIDEO-CORE.md
- Mux integration
- Upload and processing
- Playback and streaming
- Video analytics

PHASE-3E-VIDEO-TRANSCRIPTION.md
- AssemblyAI integration
- Transcription storage
- Search on transcripts

PHASE-3E-VIDEO-CREATOR-TOOLS.md
- Teleprompter feature
- Recording interface
- Creator video workflow

PHASE-3F-DAM-CORE.md
- Asset storage architecture
- Google Drive sync
- Metadata and tagging
- Search functionality

PHASE-3F-DAM-WORKFLOWS.md
- Version control
- Review workflows
- Annotations
- Rights management
- Export capabilities
```

---

## Open-Ended Areas (Your Discretion)

- **Storage provider**: Google Drive is current, but could be abstracted
- **Video provider**: Mux is current, but could support alternatives
- **DAM architecture**: How assets relate across tenants
- **Review workflow**: Approval process design

---

## Non-Negotiable Requirements

**Video - MUST preserve:**
- Mux hosting and streaming
- AssemblyAI transcription
- Teleprompter functionality
- Background processing
- Video analytics

**DAM - MUST preserve:**
- Asset storage and retrieval
- Version control
- Review workflows
- Collections/folders
- Rights management
- Search functionality
- Export capabilities

---

## Validation

- [ ] All video features documented
- [ ] All DAM features documented
- [ ] Database schemas specified
- [ ] Trigger.dev → Inngest migration identified
- [ ] API endpoints listed
- [ ] Admin UI pages specified
- [ ] Multi-tenant asset isolation

---

## Output Checklist

- [ ] PLAN.md updated with Video and DAM
- [ ] PROMPT.md updated
- [ ] 3-5 phase docs created
- [ ] Inngest job specs added to Phase 5
