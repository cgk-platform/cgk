#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""openCLAW Memory Export — Generate daily markdown for memory_search indexing.

Exports key memories to a markdown file at <PROFILE_ROOT>/memory/daily-export.md
so the built-in memory_search can index structured memory alongside workspace files.

Usage:
    export_daily.py [--output PATH]
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import memory_db as db


def _err(msg):
    print(msg, file=sys.stderr)


def generate_export(conn) -> str:
    """Generate a markdown export of all key memories."""
    sections = []
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    sections.append(f"# openCLAW Memory Export\n\nGenerated: {now}\n")

    # Users
    users = db.user_list(conn)
    if users:
        lines = ["## Known Users\n"]
        for u in users:
            prefs = u.get("preferences", {})
            pref_str = f" | Prefs: {json.dumps(prefs)}" if prefs and prefs != {} else ""
            lines.append(
                f"- **{u['display_name']}** ({u['id']}) -- "
                f"{u['interaction_count']} interactions, last seen {u['last_seen']}{pref_str}"
            )
        sections.append("\n".join(lines))

    # Long-term memories
    entries = db.longterm_list(conn, limit=200)
    if entries:
        by_cat = {}
        for e in entries:
            by_cat.setdefault(e["category"], []).append(e)
        lines = ["## Long-term Memories\n"]
        for cat, items in sorted(by_cat.items()):
            lines.append(f"### {cat.title()}\n")
            for e in items:
                tags_str = f" [{', '.join(e['tags'])}]" if e.get("tags") else ""
                lines.append(f"- {e['content']}{tags_str}")
            lines.append("")
        sections.append("\n".join(lines))

    # Active plans
    plans = db.plan_list(conn, status="active", limit=50)
    if plans:
        lines = ["## Active Plans\n"]
        for p in plans:
            ms = p.get("milestones", [])
            done = sum(1 for m in ms if m.get("status") == "done")
            total = len(ms)
            progress = f" -- {done}/{total} milestones" if total > 0 else ""
            lines.append(f"- **{p['title']}** [{p['priority']}]{progress}")
            if p.get("description"):
                lines.append(f"  {p['description']}")
        sections.append("\n".join(lines))

    # Unresolved thoughts
    thoughts = db.thought_list(conn, unresolved=True, limit=50)
    if thoughts:
        lines = ["## Unresolved Thoughts\n"]
        for t in thoughts:
            lines.append(f"- **[{t['agent_id']}/{t['category']}]** {t['topic']}")
            lines.append(f"  {t['reasoning']}")
        sections.append("\n".join(lines))

    # Top-rated dreams
    dreams = db.dream_list(conn, limit=30)
    rated = [d for d in dreams if d.get("rating") and d["rating"] >= 3]
    if rated:
        lines = ["## Top Ideas & Dreams\n"]
        for d in sorted(rated, key=lambda x: x.get("rating", 0), reverse=True):
            lines.append(f"- **[{d['category']}]** {d['topic']} (rated {d['rating']}/5)")
            lines.append(f"  {d['content']}")
        sections.append("\n".join(lines))

    return "\n\n".join(sections)


def main():
    args = sys.argv[1:]
    output_path = None
    for i, a in enumerate(args):
        if a == "--output" and i + 1 < len(args):
            output_path = args[i + 1]

    _err(f"[memory] profile={db.PROFILE_ROOT}")

    conn = db.get_db()
    export_md = generate_export(conn)
    conn.close()

    if output_path is None:
        output_path = str(db.DB_DIR / "daily-export.md")

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    Path(output_path).write_text(export_md)
    _err(f"[memory] Exported to {output_path} ({len(export_md)} chars)")

    result = {"output": output_path, "size_chars": len(export_md)}
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
