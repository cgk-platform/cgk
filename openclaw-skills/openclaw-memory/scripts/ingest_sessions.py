#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""openCLAW Session Log Ingestion — Extract users and interactions from JSONL session logs.

Reads session JSONL files from <PROFILE_ROOT>/agents/*/sessions/*.jsonl and extracts:
- User IDs and display names (from Slack message metadata)
- Interaction counts per user
- Channel activity

Usage:
    ingest_sessions.py [--dry-run] [--since YYYY-MM-DD] [--agent main]
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import memory_db as db


def _err(msg):
    print(msg, file=sys.stderr)


def _find_session_files(agents_dir: Path, agent_filter: str | None = None,
                        since: str | None = None) -> list:
    """Find all JSONL session log files under agents/<id>/sessions/."""
    files = []
    if not agents_dir.exists():
        return files

    for agent_dir in agents_dir.iterdir():
        if not agent_dir.is_dir():
            continue
        if agent_filter and agent_dir.name != agent_filter:
            continue
        sessions_dir = agent_dir / "sessions"
        if not sessions_dir.exists():
            continue
        for f in sessions_dir.glob("*.jsonl"):
            if since:
                # Filter by file modification time
                mtime = datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc)
                since_dt = datetime.fromisoformat(since + "T00:00:00+00:00")
                if mtime < since_dt:
                    continue
            files.append(f)
    return sorted(files)


def _extract_user_mentions(line_data: dict) -> list:
    """Extract Slack user IDs from a session log entry."""
    users = []
    # Look for user IDs in message metadata
    content = line_data.get("content", "")
    if isinstance(content, str):
        # Match Slack user ID patterns: U followed by alphanumeric
        user_ids = re.findall(r'\bU[A-Z0-9]{8,12}\b', content)
        users.extend(user_ids)
    # Check for explicit user fields
    for key in ("userId", "user_id", "sender", "from"):
        val = line_data.get(key)
        if val and isinstance(val, str) and re.match(r'^U[A-Z0-9]{8,12}$', val):
            users.append(val)
    return list(set(users))


def _extract_channel_id(line_data: dict) -> str | None:
    """Extract channel ID from a session log entry."""
    for key in ("channelId", "channel_id", "channel"):
        val = line_data.get(key)
        if val and isinstance(val, str) and re.match(r'^C[A-Z0-9]{8,12}$', val):
            return val
    content = str(line_data.get("content", ""))
    channels = re.findall(r'\bC[A-Z0-9]{8,12}\b', content)
    return channels[0] if channels else None


def ingest_file(conn: db.sqlite3.Connection, filepath: Path, dry_run: bool = False) -> dict:
    """Ingest a single JSONL session file. Returns stats."""
    stats = {"users_found": 0, "interactions": 0, "errors": 0}
    seen_users = set()

    try:
        with open(filepath, "r") as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    stats["errors"] += 1
                    continue

                user_ids = _extract_user_mentions(data)
                for uid in user_ids:
                    if uid not in seen_users:
                        seen_users.add(uid)
                        stats["users_found"] += 1
                        if not dry_run:
                            existing = db.user_get(conn, uid)
                            if existing is None:
                                db.user_upsert(conn, uid, display_name=uid)
                            else:
                                db.user_touch(conn, uid)
                    stats["interactions"] += 1

    except Exception as e:
        _err(f"Error reading {filepath}: {e}")
        stats["errors"] += 1

    return stats


def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    since = None
    agent_filter = None

    for i, a in enumerate(args):
        if a == "--since" and i + 1 < len(args):
            since = args[i + 1]
        elif a == "--agent" and i + 1 < len(args):
            agent_filter = args[i + 1]

    _err(f"[memory] profile={db.PROFILE_ROOT}")
    _err(f"[memory] ingesting sessions (dry_run={dry_run}, since={since}, agent={agent_filter})")

    agents_dir = db.PROFILE_ROOT / "agents"
    files = _find_session_files(agents_dir, agent_filter=agent_filter, since=since)

    if not files:
        _err("No session files found")
        result = {"files_processed": 0, "total_users": 0, "total_interactions": 0}
        print(json.dumps(result, indent=2))
        return

    conn = db.get_db() if not dry_run else None
    total_stats = {"files_processed": 0, "total_users": 0, "total_interactions": 0, "errors": 0}

    for filepath in files:
        _err(f"  Processing: {filepath.name}")
        if dry_run:
            # Still parse but don't write
            temp_conn = db.get_db()
            stats = ingest_file(temp_conn, filepath, dry_run=True)
            temp_conn.close()
        else:
            stats = ingest_file(conn, filepath)
        total_stats["files_processed"] += 1
        total_stats["total_users"] += stats["users_found"]
        total_stats["total_interactions"] += stats["interactions"]
        total_stats["errors"] += stats["errors"]

    if conn:
        conn.close()

    _err(f"[memory] Done: {total_stats['files_processed']} files, "
         f"{total_stats['total_users']} users, {total_stats['total_interactions']} interactions")
    print(json.dumps(total_stats, indent=2))


if __name__ == "__main__":
    main()
