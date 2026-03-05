#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""openCLAW Persistent Memory — CLI interface.

All commands output JSON to stdout. Diagnostics go to stderr.

Usage:
    memory_cli.py user get <user_id>
    memory_cli.py user upsert <user_id> --name "..." [--timezone "..."] [--notes "..."]
    memory_cli.py user touch <user_id>
    memory_cli.py user list [--since YYYY-MM-DD]
    memory_cli.py user search <query>
    memory_cli.py channel add <channel_id> --topic "..." [--category ...] [--channel-name ...]
    memory_cli.py channel list <channel_id> [--category ...] [--limit N]
    memory_cli.py channel search <query> [--channel-id ...]
    memory_cli.py longterm add --category ... --content "..." [--tags '["t"]'] [--confidence N] [--source ...]
    memory_cli.py longterm list [--category ...] [--tag ...] [--limit N]
    memory_cli.py longterm search <query>
    memory_cli.py longterm supersede <id> --content "..."
    memory_cli.py plan create --title "..." [--description ...] [--priority ...] [--owner ...]
    memory_cli.py plan update <id> [--status ...] [--add-milestone '{"name":"...","status":"done"}']
    memory_cli.py plan list [--status ...]
    memory_cli.py plan get <id>
    memory_cli.py thought add --agent ... --topic "..." --reasoning "..." [--category ...]
    memory_cli.py thought list [--agent ...] [--unresolved] [--limit N]
    memory_cli.py thought resolve <id> --resolution "..."
    memory_cli.py dream add --topic "..." --category ... --content "..." [--inspiration ...]
    memory_cli.py dream list [--category ...] [--limit N]
    memory_cli.py dream rate <id> --rating N
    memory_cli.py search <query>
    memory_cli.py stats
    memory_cli.py export [--type ...] [--format markdown]
"""

import json
import sys
from pathlib import Path

# Ensure sibling module is importable
sys.path.insert(0, str(Path(__file__).parent))

import memory_db as db


def _out(data):
    """Print JSON to stdout."""
    print(json.dumps(data, indent=2, default=str))


def _err(msg):
    """Print diagnostic to stderr."""
    print(msg, file=sys.stderr)


def _require(args, index, name):
    """Get a positional arg or exit with error."""
    if index >= len(args):
        _err(f"Missing required argument: {name}")
        sys.exit(1)
    return args[index]


def _flag(args, name, default=None):
    """Get a --flag value from args list."""
    for i, a in enumerate(args):
        if a == name and i + 1 < len(args):
            return args[i + 1]
    return default


def _has_flag(args, name):
    """Check if a boolean flag is present."""
    return name in args


# ---------------------------------------------------------------------------
# Subcommand handlers
# ---------------------------------------------------------------------------

def cmd_user(args):
    action = _require(args, 0, "user action (get/upsert/touch/list/search)")
    conn = db.get_db()

    if action == "get":
        user_id = _require(args, 1, "user_id")
        result = db.user_get(conn, user_id)
        if result is None:
            _out({"error": "User not found", "user_id": user_id})
            sys.exit(1)
        _out(result)

    elif action == "upsert":
        user_id = _require(args, 1, "user_id")
        kwargs = {}
        name = _flag(args, "--name")
        if name:
            kwargs["display_name"] = name
        real_name = _flag(args, "--real-name")
        if real_name:
            kwargs["real_name"] = real_name
        tz = _flag(args, "--timezone")
        if tz:
            kwargs["timezone"] = tz
        notes = _flag(args, "--notes")
        if notes:
            kwargs["notes"] = notes
        prefs = _flag(args, "--preferences")
        if prefs:
            kwargs["preferences"] = json.loads(prefs)
        ctx = _flag(args, "--context")
        if ctx:
            kwargs["context"] = json.loads(ctx)
        result = db.user_upsert(conn, user_id, **kwargs)
        _out(result)

    elif action == "touch":
        user_id = _require(args, 1, "user_id")
        result = db.user_touch(conn, user_id)
        if result is None:
            _out({"error": "User not found", "user_id": user_id})
            sys.exit(1)
        _out(result)

    elif action == "list":
        since = _flag(args, "--since")
        result = db.user_list(conn, since=since)
        _out(result)

    elif action == "search":
        query = _require(args, 1, "query")
        result = db.user_search(conn, query)
        _out(result)

    else:
        _err(f"Unknown user action: {action}")
        sys.exit(1)
    conn.close()


def cmd_channel(args):
    action = _require(args, 0, "channel action (add/list/search)")
    conn = db.get_db()

    if action == "add":
        channel_id = _require(args, 1, "channel_id")
        topic = _flag(args, "--topic")
        if not topic:
            _err("--topic is required for channel add")
            sys.exit(1)
        kwargs = {}
        cat = _flag(args, "--category")
        if cat:
            kwargs["category"] = cat
        cn = _flag(args, "--channel-name")
        if cn:
            kwargs["channel_name"] = cn
        cb = _flag(args, "--created-by")
        if cb:
            kwargs["created_by"] = cb
        exp = _flag(args, "--expires-at")
        if exp:
            kwargs["expires_at"] = exp
        result = db.channel_add(conn, channel_id, topic, **kwargs)
        _out(result)

    elif action == "list":
        channel_id = _require(args, 1, "channel_id")
        cat = _flag(args, "--category")
        limit = int(_flag(args, "--limit", "20"))
        result = db.channel_list(conn, channel_id, category=cat, limit=limit)
        _out(result)

    elif action == "search":
        query = _require(args, 1, "query")
        cid = _flag(args, "--channel-id")
        limit = int(_flag(args, "--limit", "20"))
        result = db.channel_search(conn, query, channel_id=cid, limit=limit)
        _out(result)

    else:
        _err(f"Unknown channel action: {action}")
        sys.exit(1)
    conn.close()


def cmd_longterm(args):
    action = _require(args, 0, "longterm action (add/list/search/supersede)")
    conn = db.get_db()

    if action == "add":
        category = _flag(args, "--category")
        content = _flag(args, "--content")
        if not category or not content:
            _err("--category and --content are required for longterm add")
            sys.exit(1)
        kwargs = {}
        tags = _flag(args, "--tags")
        if tags:
            kwargs["tags"] = tags
        conf = _flag(args, "--confidence")
        if conf:
            kwargs["confidence"] = float(conf)
        source = _flag(args, "--source")
        if source:
            kwargs["source"] = source
        cb = _flag(args, "--created-by")
        if cb:
            kwargs["created_by"] = cb
        result = db.longterm_add(conn, category, content, **kwargs)
        _out(result)

    elif action == "list":
        cat = _flag(args, "--category")
        tag = _flag(args, "--tag")
        limit = int(_flag(args, "--limit", "20"))
        result = db.longterm_list(conn, category=cat, tag=tag, limit=limit)
        _out(result)

    elif action == "search":
        query = _require(args, 1, "query")
        limit = int(_flag(args, "--limit", "20"))
        result = db.longterm_search(conn, query, limit=limit)
        _out(result)

    elif action == "supersede":
        old_id = int(_require(args, 1, "old_id"))
        content = _flag(args, "--content")
        if not content:
            _err("--content is required for longterm supersede")
            sys.exit(1)
        kwargs = {}
        tags = _flag(args, "--tags")
        if tags:
            kwargs["tags"] = tags
        source = _flag(args, "--source")
        if source:
            kwargs["source"] = source
        result = db.longterm_supersede(conn, old_id, content, **kwargs)
        _out(result)

    else:
        _err(f"Unknown longterm action: {action}")
        sys.exit(1)
    conn.close()


def cmd_plan(args):
    action = _require(args, 0, "plan action (create/update/list/get)")
    conn = db.get_db()

    if action == "create":
        title = _flag(args, "--title")
        if not title:
            _err("--title is required for plan create")
            sys.exit(1)
        kwargs = {}
        for key, flag in [("description", "--description"), ("priority", "--priority"),
                          ("owner", "--owner"), ("channel_id", "--channel-id"),
                          ("status", "--status")]:
            val = _flag(args, flag)
            if val:
                kwargs[key] = val
        tags = _flag(args, "--tags")
        if tags:
            kwargs["tags"] = tags
        result = db.plan_create(conn, title, **kwargs)
        _out(result)

    elif action == "update":
        plan_id = int(_require(args, 1, "plan_id"))
        kwargs = {}
        for key, flag in [("status", "--status"), ("priority", "--priority"),
                          ("description", "--description"), ("owner", "--owner"),
                          ("channel_id", "--channel-id")]:
            val = _flag(args, flag)
            if val:
                kwargs[key] = val
        ms = _flag(args, "--add-milestone")
        if ms:
            kwargs["add_milestone"] = ms
        tags = _flag(args, "--tags")
        if tags:
            kwargs["tags"] = tags
        result = db.plan_update(conn, plan_id, **kwargs)
        _out(result)

    elif action == "list":
        status = _flag(args, "--status")
        limit = int(_flag(args, "--limit", "20"))
        result = db.plan_list(conn, status=status, limit=limit)
        _out(result)

    elif action == "get":
        plan_id = int(_require(args, 1, "plan_id"))
        result = db.plan_get(conn, plan_id)
        if result is None:
            _out({"error": "Plan not found", "id": plan_id})
            sys.exit(1)
        _out(result)

    else:
        _err(f"Unknown plan action: {action}")
        sys.exit(1)
    conn.close()


def cmd_thought(args):
    action = _require(args, 0, "thought action (add/list/resolve)")
    conn = db.get_db()

    if action == "add":
        agent = _flag(args, "--agent")
        topic = _flag(args, "--topic")
        reasoning = _flag(args, "--reasoning")
        if not agent or not topic or not reasoning:
            _err("--agent, --topic, and --reasoning are required for thought add")
            sys.exit(1)
        kwargs = {}
        cat = _flag(args, "--category")
        if cat:
            kwargs["category"] = cat
        conf = _flag(args, "--confidence")
        if conf:
            kwargs["confidence"] = float(conf)
        rel = _flag(args, "--related-to")
        if rel:
            kwargs["related_to"] = rel
        sid = _flag(args, "--session-id")
        if sid:
            kwargs["session_id"] = sid
        result = db.thought_add(conn, agent, topic, reasoning, **kwargs)
        _out(result)

    elif action == "list":
        agent = _flag(args, "--agent")
        unresolved = _has_flag(args, "--unresolved")
        limit = int(_flag(args, "--limit", "20"))
        result = db.thought_list(conn, agent_id=agent, unresolved=unresolved, limit=limit)
        _out(result)

    elif action == "resolve":
        thought_id = int(_require(args, 1, "thought_id"))
        resolution = _flag(args, "--resolution")
        if not resolution:
            _err("--resolution is required for thought resolve")
            sys.exit(1)
        result = db.thought_resolve(conn, thought_id, resolution)
        _out(result)

    else:
        _err(f"Unknown thought action: {action}")
        sys.exit(1)
    conn.close()


def cmd_dream(args):
    action = _require(args, 0, "dream action (add/list/rate)")
    conn = db.get_db()

    if action == "add":
        topic = _flag(args, "--topic")
        category = _flag(args, "--category")
        content = _flag(args, "--content")
        if not topic or not category or not content:
            _err("--topic, --category, and --content are required for dream add")
            sys.exit(1)
        kwargs = {}
        insp = _flag(args, "--inspiration")
        if insp:
            kwargs["inspiration"] = insp
        agent = _flag(args, "--agent-id")
        if agent:
            kwargs["agent_id"] = agent
        tags = _flag(args, "--tags")
        if tags:
            kwargs["tags"] = tags
        result = db.dream_add(conn, topic, category, content, **kwargs)
        _out(result)

    elif action == "list":
        cat = _flag(args, "--category")
        limit = int(_flag(args, "--limit", "10"))
        result = db.dream_list(conn, category=cat, limit=limit)
        _out(result)

    elif action == "rate":
        dream_id = int(_require(args, 1, "dream_id"))
        rating = _flag(args, "--rating")
        if not rating:
            _err("--rating is required for dream rate")
            sys.exit(1)
        result = db.dream_rate(conn, dream_id, int(rating))
        _out(result)

    else:
        _err(f"Unknown dream action: {action}")
        sys.exit(1)
    conn.close()


def cmd_search(args):
    query = _require(args, 0, "search query")
    limit = int(_flag(args, "--limit", "20"))
    conn = db.get_db()
    results = db.fts_search(conn, query, limit=limit)
    _out(results)
    conn.close()


def cmd_stats(args):
    conn = db.get_db()
    stats = db.get_stats(conn)
    _out(stats)
    conn.close()


def cmd_export(args):
    export_type = _flag(args, "--type")
    fmt = _flag(args, "--format", "markdown")
    conn = db.get_db()

    sections = []

    if not export_type or export_type == "longterm":
        entries = db.longterm_list(conn, limit=100)
        if entries:
            lines = ["## Long-term Memories", ""]
            for e in entries:
                lines.append(f"- **[{e['category']}]** {e['content']}")
                if e.get("source"):
                    lines.append(f"  Source: {e['source']}")
            sections.append("\n".join(lines))

    if not export_type or export_type == "plans":
        plans = db.plan_list(conn, status="active", limit=50)
        if plans:
            lines = ["## Active Plans", ""]
            for p in plans:
                ms = p.get("milestones", [])
                done = sum(1 for m in ms if m.get("status") == "done")
                lines.append(f"- **{p['title']}** ({p['priority']}) — {done}/{len(ms)} milestones")
            sections.append("\n".join(lines))

    if not export_type or export_type == "users":
        users = db.user_list(conn)
        if users:
            lines = ["## Known Users", ""]
            for u in users:
                lines.append(
                    f"- **{u['display_name']}** ({u['id']}) — "
                    f"{u['interaction_count']} interactions, last seen {u['last_seen']}"
                )
            sections.append("\n".join(lines))

    if not export_type or export_type == "thoughts":
        thoughts = db.thought_list(conn, unresolved=True, limit=50)
        if thoughts:
            lines = ["## Unresolved Thoughts", ""]
            for t in thoughts:
                lines.append(f"- **[{t['category']}]** {t['topic']}: {t['reasoning']}")
            sections.append("\n".join(lines))

    if not export_type or export_type == "dreams":
        dreams = db.dream_list(conn, limit=50)
        if dreams:
            lines = ["## Dreams & Ideas", ""]
            for d in dreams:
                rating = f" (rated {d['rating']}/5)" if d.get("rating") else ""
                lines.append(f"- **[{d['category']}]** {d['topic']}{rating}: {d['content']}")
            sections.append("\n".join(lines))

    output = "# openCLAW Memory Export\n\n" + "\n\n".join(sections) if sections else "# openCLAW Memory Export\n\nNo memories found."

    if fmt == "json":
        _out({"format": "markdown", "content": output})
    else:
        print(output)

    conn.close()


# ---------------------------------------------------------------------------
# Main dispatch
# ---------------------------------------------------------------------------

COMMANDS = {
    "user": cmd_user,
    "channel": cmd_channel,
    "longterm": cmd_longterm,
    "plan": cmd_plan,
    "thought": cmd_thought,
    "dream": cmd_dream,
    "search": cmd_search,
    "stats": cmd_stats,
    "export": cmd_export,
}


def main():
    _err(f"[memory] profile={db.PROFILE_ROOT}")

    args = sys.argv[1:]
    if not args:
        _err("Usage: memory_cli.py <command> [subcommand] [args]")
        _err(f"Commands: {', '.join(COMMANDS.keys())}")
        sys.exit(1)

    cmd = args[0]
    if cmd in ("-h", "--help"):
        _err("Usage: memory_cli.py <command> [subcommand] [args]")
        _err(f"Commands: {', '.join(COMMANDS.keys())}")
        sys.exit(0)

    if cmd not in COMMANDS:
        _err(f"Unknown command: {cmd}")
        _err(f"Available: {', '.join(COMMANDS.keys())}")
        sys.exit(1)

    COMMANDS[cmd](args[1:])


if __name__ == "__main__":
    main()
