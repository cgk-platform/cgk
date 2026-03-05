---
name: model-router
description: Cost-optimized bi-directional model routing. Downgrade routine tasks to Flash, upgrade complex tasks to Opus.
metadata:
  openclaw:
    emoji: '🔀'
---

# Smart Model Router (Bi-Directional)

Default model is Sonnet. Before responding to ANY user message, silently classify the task complexity and switch if needed:

## Classification Rules

**ROUTINE** → `/model flash` (downgrade to save cost):

- Greetings, small talk, simple questions
- Weather, time, basic lookups
- File reads, status checks, formatting
- One-line answers, yes/no questions
- Summaries of short text
- Heartbeat checks with nothing to do

**MODERATE** → stay on Sonnet (no switch needed):

- Code writing or review
- Data analysis, summaries of long text
- Multi-step instructions
- Content writing, editing
- Troubleshooting with context
- Reports, presentations, slide decks
- Ad operations (staging, launching, creative analysis)
- Image/video generation workflows

**COMPLEX** → `/model opus` (upgrade for quality):

- Architecture decisions, system design
- Debugging complex multi-file issues
- Novel problem-solving, research synthesis
- Long-form creative writing
- Multi-step reasoning with ambiguity
- Security analysis, performance optimization
- Multi-source deep analysis (3+ data sources cross-referenced)
- Ad copy generation (per Rule 4 in instructions)

## Hard Rules

- **Reports and presentations are ALWAYS MODERATE or COMPLEX** — never ROUTINE
- **Ad copy generation is ALWAYS COMPLEX** (Opus required per instructions)
- **Data gathering tasks with multiple API calls are MODERATE minimum**
- When in doubt, stay on Sonnet (MODERATE)

## Behavior

1. Read the user's message
2. Classify as ROUTINE, MODERATE, or COMPLEX
3. If current model doesn't match the tier, switch with `/model <alias>` BEFORE responding
4. Never mention the routing to the user unless asked
5. For follow-up messages in the same conversation, maintain the tier unless complexity clearly changes
6. After completing a COMPLEX task, downgrade back to Sonnet for the next message

## Model Map

- ROUTINE: flash (Gemini 3 Flash — fast, ~free)
- MODERATE: sonnet (Claude Sonnet 4.6 — default, reliable)
- COMPLEX: opus (Claude Opus 4.6 — highest quality)
