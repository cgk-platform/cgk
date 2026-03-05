#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""openCLAW Memory Migration — Import existing daily memory markdown files.

Reads daily memory files from <PROFILE_ROOT>/agents/*/memory/YYYY-MM-DD.md and
imports them as long-term memories. Handles both structured (key-value) and
freeform (paragraph) entries.

Usage:
    migrate_existing.py [--dry-run] [--agent main]
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import memory_db as db


def _err(msg):
    print(msg, file=sys.stderr)


def _find_memory_files(agents_dir: Path, agent_filter: str | None = None) -> list:
    """Find all daily memory markdown files.

    Searches both <PROFILE_ROOT>/agents/*/memory/ and <PROFILE_ROOT>/workspace/memory/.
    """
    files = []
    if agents_dir.exists():
        for agent_dir in agents_dir.iterdir():
            if not agent_dir.is_dir():
                continue
            if agent_filter and agent_dir.name != agent_filter:
                continue
            memory_dir = agent_dir / "memory"
            if not memory_dir.exists():
                continue
            for f in sorted(memory_dir.glob("????-??-??.md")):
                files.append((agent_dir.name, f))

    # Also search workspace/memory/ for daily files
    workspace_memory = db.PROFILE_ROOT / "workspace" / "memory"
    if workspace_memory.exists() and not agent_filter:
        for f in sorted(workspace_memory.glob("????-??-??.md")):
            files.append(("workspace", f))

    return files


def _parse_memory_file(filepath: Path) -> list:
    """Parse a daily memory file into extractable entries."""
    entries = []
    try:
        content = filepath.read_text()
    except Exception as e:
        _err(f"  Error reading {filepath}: {e}")
        return entries

    # Extract date from filename
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filepath.name)
    date_str = date_match.group(1) if date_match else None

    current_section = None
    current_lines = []

    for line in content.split("\n"):
        stripped = line.strip()

        # Section headers
        if stripped.startswith("## "):
            if current_section and current_lines:
                text = "\n".join(current_lines).strip()
                if text:
                    entries.append({
                        "section": current_section,
                        "content": text,
                        "date": date_str,
                    })
            current_section = stripped[3:].strip()
            current_lines = []
        elif stripped.startswith("- ") or stripped.startswith("* "):
            # Bullet points are individual entries
            bullet_text = stripped[2:].strip()
            if bullet_text and len(bullet_text) > 10:
                entries.append({
                    "section": current_section or "General",
                    "content": bullet_text,
                    "date": date_str,
                })
        elif stripped:
            current_lines.append(stripped)

    # Flush last section
    if current_section and current_lines:
        text = "\n".join(current_lines).strip()
        if text:
            entries.append({
                "section": current_section,
                "content": text,
                "date": date_str,
            })

    return entries


def _section_to_category(section: str) -> str:
    """Map memory file section names to longterm categories."""
    section_lower = section.lower()
    if any(w in section_lower for w in ("decision", "decided", "chose", "choice")):
        return "decision"
    if any(w in section_lower for w in ("learn", "insight", "takeaway", "lesson")):
        return "learning"
    if any(w in section_lower for w in ("preference", "prefer", "like", "dislike")):
        return "preference"
    if any(w in section_lower for w in ("process", "workflow", "procedure", "how to")):
        return "process"
    return "fact"


def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    agent_filter = None
    for i, a in enumerate(args):
        if a == "--agent" and i + 1 < len(args):
            agent_filter = args[i + 1]

    _err(f"[memory] profile={db.PROFILE_ROOT}")
    _err(f"[memory] migrating existing memories (dry_run={dry_run})")

    agents_dir = db.PROFILE_ROOT / "agents"
    files = _find_memory_files(agents_dir, agent_filter=agent_filter)

    if not files:
        _err("No daily memory files found")
        result = {"files_processed": 0, "entries_imported": 0}
        print(json.dumps(result, indent=2))
        return

    conn = db.get_db() if not dry_run else None
    total = {"files_processed": 0, "entries_imported": 0, "entries_skipped": 0}

    for agent_id, filepath in files:
        _err(f"  Processing: {agent_id}/memory/{filepath.name}")
        entries = _parse_memory_file(filepath)
        total["files_processed"] += 1

        for entry in entries:
            content = entry["content"]
            # Skip very short entries
            if len(content) < 15:
                total["entries_skipped"] += 1
                continue

            category = _section_to_category(entry.get("section", ""))
            source = f"{agent_id}/memory/{filepath.name}"
            date_str = entry.get("date")

            if dry_run:
                _err(f"    [{category}] {content[:80]}...")
                total["entries_imported"] += 1
            else:
                # Check for duplicate content
                existing = db.longterm_search(conn, content[:50])
                is_dup = any(e.get("content", "").strip() == content.strip() for e in existing)
                if is_dup:
                    total["entries_skipped"] += 1
                    continue

                db.longterm_add(
                    conn,
                    category=category,
                    content=content,
                    source=source,
                    confidence=0.8,
                    created_by=agent_id,
                )
                total["entries_imported"] += 1

    if conn:
        conn.close()

    _err(f"[memory] Done: {total['files_processed']} files, "
         f"{total['entries_imported']} imported, {total['entries_skipped']} skipped")
    print(json.dumps(total, indent=2))


if __name__ == "__main__":
    main()
