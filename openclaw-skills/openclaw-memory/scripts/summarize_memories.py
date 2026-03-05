#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""openCLAW Memory Summarization — Daily cron for memory consolidation.

Three operations:
1. Thought Compression: Resolved thoughts older than 30 days -> longterm entries
2. Channel Memory Consolidation: Weekly digest per channel -> longterm entries
3. Stale Memory Cleanup: Delete expired channel_memory, archive old resolved thoughts

Usage:
    summarize_memories.py [--dry-run]
"""

import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import memory_db as db


def _err(msg):
    print(msg, file=sys.stderr)


def _now():
    return datetime.now(timezone.utc)


def _iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# 1. Thought Compression
# ---------------------------------------------------------------------------

def compress_thoughts(conn, dry_run: bool = False) -> dict:
    """Group resolved thoughts older than 30 days by topic, create longterm entries."""
    cutoff = _iso(_now() - timedelta(days=30))
    rows = conn.execute(
        "SELECT * FROM thoughts WHERE resolved = 1 AND archived = 0 AND created_at < ?",
        (cutoff,),
    ).fetchall()
    thoughts = [dict(r) for r in rows]

    if not thoughts:
        return {"thoughts_processed": 0, "longterm_created": 0}

    # Group by topic (simple substring matching)
    by_topic = defaultdict(list)
    for t in thoughts:
        by_topic[t["topic"]].append(t)

    stats = {"thoughts_processed": 0, "longterm_created": 0}

    for topic, group in by_topic.items():
        # Build consolidated content
        resolutions = [t["resolution"] for t in group if t.get("resolution")]
        reasoning = [t["reasoning"] for t in group]

        if resolutions:
            content = f"Topic: {topic}. "
            content += "Conclusions: " + "; ".join(resolutions[:5])
        else:
            content = f"Topic: {topic}. "
            content += "Observations: " + "; ".join(r[:100] for r in reasoning[:5])

        # Trim to reasonable length
        if len(content) > 500:
            content = content[:497] + "..."

        agent_ids = list(set(t["agent_id"] for t in group))
        source = f"thought-compression ({len(group)} thoughts from {', '.join(agent_ids)})"

        if dry_run:
            _err(f"  [compress] {topic}: {len(group)} thoughts -> 1 longterm")
        else:
            result = db.longterm_add(
                conn,
                category="learning",
                content=content,
                source=source,
                confidence=0.9,
            )
            # Archive the source thoughts
            ids = [t["id"] for t in group]
            placeholders = ",".join("?" * len(ids))
            conn.execute(f"UPDATE thoughts SET archived = 1 WHERE id IN ({placeholders})", ids)
            conn.commit()

        stats["thoughts_processed"] += len(group)
        stats["longterm_created"] += 1

    return stats


# ---------------------------------------------------------------------------
# 2. Channel Memory Consolidation
# ---------------------------------------------------------------------------

def consolidate_channels(conn, dry_run: bool = False) -> dict:
    """Group channel memories from past 7 days by channel+category, create longterm entries."""
    cutoff = _iso(_now() - timedelta(days=7))
    rows = conn.execute(
        "SELECT * FROM channel_memory WHERE created_at >= ? AND summarized_into IS NULL "
        "ORDER BY channel_id, category, created_at",
        (cutoff,),
    ).fetchall()
    memories = [dict(r) for r in rows]

    if not memories:
        return {"channel_memories_processed": 0, "longterm_created": 0}

    # Group by channel_id + category
    by_group = defaultdict(list)
    for m in memories:
        key = (m["channel_id"], m["category"])
        by_group[key].append(m)

    stats = {"channel_memories_processed": 0, "longterm_created": 0}

    for (channel_id, category), group in by_group.items():
        # Only consolidate if there are enough entries to be worth it
        if len(group) < 3:
            continue

        channel_name = group[0].get("channel_name") or channel_id
        topics = [m["topic"] for m in group]
        content = f"Channel {channel_name} ({category}): " + "; ".join(topics[:10])

        if len(content) > 500:
            content = content[:497] + "..."

        source = f"channel-consolidation ({len(group)} entries from {channel_name})"

        # Map channel memory category to longterm category
        lt_category = "decision" if category == "decision" else "fact"

        if dry_run:
            _err(f"  [consolidate] {channel_name}/{category}: {len(group)} -> 1 longterm")
        else:
            result = db.longterm_add(
                conn,
                category=lt_category,
                content=content,
                source=source,
                confidence=0.85,
            )
            # Mark originals as summarized
            ids = [m["id"] for m in group]
            placeholders = ",".join("?" * len(ids))
            conn.execute(
                f"UPDATE channel_memory SET summarized_into = ? WHERE id IN ({placeholders})",
                [result["id"]] + ids,
            )
            conn.commit()

        stats["channel_memories_processed"] += len(group)
        stats["longterm_created"] += 1

    return stats


# ---------------------------------------------------------------------------
# 3. Stale Memory Cleanup
# ---------------------------------------------------------------------------

def cleanup_stale(conn, dry_run: bool = False) -> dict:
    """Delete expired channel memories and archive old resolved thoughts."""
    now = _iso(_now())
    stats = {"expired_deleted": 0, "thoughts_archived": 0}

    # Delete expired channel memories
    if dry_run:
        count = conn.execute(
            "SELECT COUNT(*) FROM channel_memory WHERE expires_at IS NOT NULL AND expires_at < ?",
            (now,),
        ).fetchone()[0]
        stats["expired_deleted"] = count
        _err(f"  [cleanup] Would delete {count} expired channel memories")
    else:
        # Delete from FTS first
        expired = conn.execute(
            "SELECT id FROM channel_memory WHERE expires_at IS NOT NULL AND expires_at < ?",
            (now,),
        ).fetchall()
        for row in expired:
            db.fts_delete(conn, "channel", row["id"])
        cur = conn.execute(
            "DELETE FROM channel_memory WHERE expires_at IS NOT NULL AND expires_at < ?",
            (now,),
        )
        stats["expired_deleted"] = cur.rowcount
        conn.commit()

    # Archive resolved thoughts older than 90 days
    cutoff_90d = _iso(_now() - timedelta(days=90))
    if dry_run:
        count = conn.execute(
            "SELECT COUNT(*) FROM thoughts WHERE resolved = 1 AND archived = 0 AND created_at < ?",
            (cutoff_90d,),
        ).fetchone()[0]
        stats["thoughts_archived"] = count
        _err(f"  [cleanup] Would archive {count} old resolved thoughts")
    else:
        cur = conn.execute(
            "UPDATE thoughts SET archived = 1 WHERE resolved = 1 AND archived = 0 AND created_at < ?",
            (cutoff_90d,),
        )
        stats["thoughts_archived"] = cur.rowcount
        conn.commit()

    return stats


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args

    _err(f"[memory] profile={db.PROFILE_ROOT}")
    _err(f"[memory] summarization started (dry_run={dry_run})")

    conn = db.get_db()

    thought_stats = compress_thoughts(conn, dry_run=dry_run)
    channel_stats = consolidate_channels(conn, dry_run=dry_run)
    cleanup_stats = cleanup_stale(conn, dry_run=dry_run)

    conn.close()

    result = {**thought_stats, **channel_stats, **cleanup_stats}
    _err(
        f"[memory] Summarized {thought_stats['thoughts_processed']} thoughts into "
        f"{thought_stats['longterm_created']} longterm entries, "
        f"consolidated {channel_stats['channel_memories_processed']} channel memories, "
        f"cleaned {cleanup_stats['expired_deleted']} expired, "
        f"archived {cleanup_stats['thoughts_archived']} old thoughts"
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
