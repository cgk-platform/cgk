---
name: openclaw-memory
description: Persistent memory system with 6 memory types (users, channels, long-term, plans, thoughts, dreams). SQLite-backed, profile-isolated, FTS5 searchable. Use for ANY memory storage or recall task.
---

# Persistent Memory Skill

Unified memory system for all agents. Stores structured memories in a local SQLite database per profile. Supports 6 memory types with full-text search across all of them.

---

## Memory Types

| Type | Purpose | Key Use Cases |
|------|---------|---------------|
| **Users** | Per-user profiles, interaction tracking | Know who you're talking to, their preferences, history |
| **Channel Memory** | Per-channel knowledge, decisions | What was decided in #growth, channel-specific context |
| **Long-term** | Persistent facts, decisions, learnings | Durable knowledge that survives session boundaries |
| **Plans** | Strategic goals, milestones | Track campaigns, launches, roadmaps |
| **Thoughts** | Agent reasoning, hypotheses | Working memory for observations and questions |
| **Dreams** | Creative ideas, future possibilities | Ideas to revisit later |

---

## Usage

All commands run via `exec` and output JSON:

```
uv run <PROFILE_ROOT>/skills/openclaw-memory/scripts/memory_cli.py <subcommand> [args]
```

Where `<PROFILE_ROOT>` is derived from your workspace (e.g., `~/.openclaw` for CGK).

---

## Quick Reference

### User Commands
```
user get <user_id>
user upsert <user_id> --name "Display Name" [--timezone "America/Los_Angeles"] [--notes "..."]
user touch <user_id>
user list [--since "2026-03-01"]
user search <query>
```

### Channel Commands
```
channel add <channel_id> --topic "..." [--category decision] [--channel-name "#growth"]
channel list <channel_id> [--category decision] [--limit 20]
channel search <query> [--channel-id C0AG...]
```

### Long-term Commands
```
longterm add --category fact --content "..." [--tags '["meta","ads"]'] [--confidence 0.9] [--source "..."]
longterm list [--category fact] [--tag meta] [--limit 20]
longterm search <query>
longterm supersede <id> --content "Updated content"
```

### Plan Commands
```
plan create --title "Spring Launch" [--description "..."] [--priority high] [--owner U0ACL7UV3RV]
plan update <id> [--status completed] [--add-milestone '{"name":"Design done","status":"done"}']
plan list [--status active]
plan get <id>
```

### Thought Commands
```
thought add --agent main --topic "CTR decay" --reasoning "..." [--category hypothesis]
thought list [--agent main] [--unresolved] [--limit 20]
thought resolve <id> --resolution "Confirmed: CTR drops after 14 days"
```

### Dream Commands
```
dream add --topic "Auto A/B testing" --category future --content "..." [--inspiration "..."]
dream list [--category future] [--limit 10]
dream rate <id> --rating 4
```

### Global Commands
```
search <query>          # FTS5 across all memory types
stats                   # Counts, DB size, oldest/newest per type
export [--type longterm] [--format markdown]
```

---

## Auto-Recall Protocol

When a user sends a message, follow this flow:

1. `user touch <user_id>` -- update last_seen, bump interaction count
2. `user get <user_id>` -- load user context and preferences
3. `channel list <channel_id> --limit 5` -- load recent channel context
4. If strategic topic: `plan list --status active`
5. If recalling past discussion: `search "<topic>"`

---

## Database Location

Each profile has its own isolated database:
- CGK: `~/.openclaw/memory/openclaw-memory.db`
- RAWDOG: `~/.openclaw-rawdog/memory/openclaw-memory.db`
- VitaHustle: `~/.openclaw-vitahustle/memory/openclaw-memory.db`

---

## Retention

| Type | Retention | Notes |
|------|-----------|-------|
| Users | Permanent | `last_seen` tracks staleness |
| Channel Memory | 1 year default (configurable `expires_at`) | Daily cron deletes expired |
| Long-term | Permanent | Use `supersede` for updates |
| Plans | Permanent | Status lifecycle tracking |
| Thoughts | 90 days if resolved, permanent if unresolved | Daily cron archives old resolved |
| Dreams | Permanent | Human rating for curation |
