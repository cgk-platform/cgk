# Gap Remediation: AI Assistant System (BRII)

> **Execution**: 🟢 PARALLEL - Run with other parallel prompts
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

The RAWDOG codebase has a sophisticated AI assistant system called "BRII" (Business Relationships & Interaction Intelligence) that is **completely missing** from the current multi-tenant platform plan.

### Current RAWDOG Implementation

**Source files to reference:**
```
/Users/holdenthemic/Documents/rawdog-web/src/lib/bri/
/Users/holdenthemic/Documents/rawdog-web/src/lib/ai-agents/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/bri/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/ai-team/
/Users/holdenthemic/Documents/rawdog-web/src/app/api/bri/
/Users/holdenthemic/Documents/rawdog-web/src/app/api/ai-team/
```

**Features that must be documented:**
- Voice capabilities (11Labs TTS, Google TTS, AssemblyAI STT)
- RAG (Retrieval Augmented Generation) for knowledge base queries
- Persistent memory system with embeddings and semantic search
- Multi-channel communication (Slack, Email, Voice calls)
- Google Calendar/Meet integration for scheduling
- Agent personality and autonomy configuration
- Correction detection and learning loop
- Action logging and follow-up management
- Multi-agent orchestration with teams
- Agent relationships and org chart

---

## Your Task

### 1. Explore the RAWDOG Implementation

Use the Explore agent or read the source files directly to understand:
- How BRII works end-to-end
- Database schema for agent memory
- Voice processing pipeline
- RAG implementation details
- Integration points with other systems

### 2. Update Master Documents

**PLAN.md updates:**
- Add AI Assistant to the Architecture Overview section
- Add new phase(s) to the Timeline Overview
- Update the Document Index with new phase docs

**PROMPT.md updates:**
- Add patterns for AI agent development
- Add constraints for voice processing
- Add memory/embedding patterns

### 3. Create New Phase Documents

Create focused phase docs. Suggested structure (but use your judgment):

```
PHASE-2C-AI-ASSISTANT-CORE.md
- Agent configuration and personality
- Action logging
- Autonomy levels
- Multi-agent teams

PHASE-2C-AI-ASSISTANT-VOICE.md
- TTS providers (11Labs, Google)
- STT providers (AssemblyAI)
- Voice call handling (Retell)
- Real-time transcription

PHASE-2C-AI-ASSISTANT-MEMORY.md
- Embedding generation
- Vector storage (pgvector)
- Semantic search
- Memory retrieval and confidence scoring
- Learning and correction detection

PHASE-2C-AI-ASSISTANT-INTEGRATIONS.md
- Google Calendar/Meet
- Slack messaging
- Email automation
- Follow-up scheduling
```

---

## Open-Ended Areas (Your Discretion)

You have flexibility on:
- **Phase organization**: Split into more or fewer docs if it makes sense
- **Architecture patterns**: Use Context7 MCP to find best practices for RAG, voice, embeddings
- **Provider choices**: Recommend alternatives if better options exist
- **Multi-tenant approach**: Determine how agent memory isolates between tenants

---

## Non-Negotiable Requirements

You MUST preserve:
- All voice capabilities (TTS/STT)
- RAG and knowledge base functionality
- Persistent memory with semantic search
- Multi-channel communication
- Calendar integration
- Agent personality configuration
- Learning/improvement loop
- Multi-agent teams and relationships

---

## Validation

Before completing, verify:
- [ ] All BRII features from RAWDOG are documented
- [ ] Phase docs are focused (< 300 lines each)
- [ ] Multi-tenant isolation is addressed
- [ ] Database schema is specified
- [ ] API endpoints are listed
- [ ] Admin UI pages are specified
- [ ] Inngest jobs for async processing are identified

---

## Skills & Tools to Use

- **Context7 MCP**: Look up best practices for RAG, embeddings, voice AI
- **Explore agent**: Navigate the RAWDOG source code
- **frontend-design skill**: When specifying admin UI components

---

## Output Checklist

- [ ] PLAN.md updated with AI Assistant section
- [ ] PROMPT.md updated with AI patterns
- [ ] 2-4 new phase docs created (PHASE-2C-*)
- [ ] Specification doc created if needed (AI-ASSISTANT-SPEC-*.md)
