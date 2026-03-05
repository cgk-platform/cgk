#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""openCLAW Persistent Memory — Database schema and helpers.

Profile-aware SQLite database with 6 memory types and FTS5 full-text search.
Path derivation uses Path(__file__).parent (NO .resolve()) to preserve symlink
isolation across CGK / RAWDOG / VitaHustle profiles.
"""

import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Profile-aware path derivation (CRITICAL: NO .resolve())
# ---------------------------------------------------------------------------

SKILL_DIR = Path(__file__).parent.parent          # openclaw-memory/
PROFILE_ROOT = Path(os.environ["OPENCLAW_PROFILE_ROOT"]) if "OPENCLAW_PROFILE_ROOT" in os.environ else SKILL_DIR.parent.parent
DB_DIR = PROFILE_ROOT / "memory"
DB_PATH = DB_DIR / "openclaw-memory.db"

# Startup assertion
assert "openclaw" in str(PROFILE_ROOT).lower(), (
    f"Invalid profile root: {PROFILE_ROOT} — expected an openclaw profile directory"
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def get_db() -> sqlite3.Connection:
    """Open (or create) the profile-scoped memory database."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    _ensure_schema(conn)
    return conn


def _ensure_schema(conn: sqlite3.Connection) -> None:
    """Create tables and FTS index if they don't exist."""
    conn.executescript(SCHEMA_SQL)


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    real_name TEXT,
    timezone TEXT,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    interaction_count INTEGER DEFAULT 0,
    preferences TEXT DEFAULT '{}',
    context TEXT DEFAULT '{}',
    notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS channel_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    channel_name TEXT,
    topic TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    created_at TEXT NOT NULL,
    created_by TEXT,
    expires_at TEXT,
    metadata TEXT DEFAULT '{}',
    summarized_into INTEGER
);
CREATE INDEX IF NOT EXISTS idx_channel_memory_channel ON channel_memory(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_memory_category ON channel_memory(category);

CREATE TABLE IF NOT EXISTS longterm (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT,
    confidence REAL DEFAULT 1.0,
    tags TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    expires_at TEXT,
    superseded_by INTEGER,
    created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_longterm_category ON longterm(category);

CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    priority TEXT DEFAULT 'medium',
    milestones TEXT DEFAULT '[]',
    owner TEXT,
    channel_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    tags TEXT DEFAULT '[]',
    metadata TEXT DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);

CREATE TABLE IF NOT EXISTS thoughts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    category TEXT DEFAULT 'observation',
    confidence REAL DEFAULT 0.5,
    related_to TEXT,
    session_id TEXT,
    created_at TEXT NOT NULL,
    resolved BOOLEAN DEFAULT 0,
    resolution TEXT,
    archived BOOLEAN DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_thoughts_agent ON thoughts(agent_id);
CREATE INDEX IF NOT EXISTS idx_thoughts_resolved ON thoughts(resolved);

CREATE TABLE IF NOT EXISTS dreams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    agent_id TEXT DEFAULT 'main',
    inspiration TEXT,
    rating INTEGER,
    tags TEXT DEFAULT '[]',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dreams_category ON dreams(category);

-- Unified FTS5 index across all types
CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
    content, memory_type, memory_id UNINDEXED,
    tokenize='porter unicode61'
);
"""


# ---------------------------------------------------------------------------
# FTS helpers
# ---------------------------------------------------------------------------

def fts_insert(conn: sqlite3.Connection, memory_type: str, memory_id: int, content: str) -> None:
    conn.execute(
        "INSERT INTO memory_fts(content, memory_type, memory_id) VALUES (?, ?, ?)",
        (content, memory_type, str(memory_id)),
    )


def fts_delete(conn: sqlite3.Connection, memory_type: str, memory_id: int) -> None:
    conn.execute(
        "DELETE FROM memory_fts WHERE memory_type = ? AND memory_id = ?",
        (memory_type, str(memory_id)),
    )


def _sanitize_fts_query(query: str) -> str:
    """Wrap query in double quotes to prevent FTS5 syntax errors from special chars."""
    # Remove existing double quotes and wrap the whole thing
    cleaned = query.replace('"', ' ').strip()
    if not cleaned:
        return '""'
    return f'"{cleaned}"'


def fts_search(conn: sqlite3.Connection, query: str, limit: int = 20) -> list:
    safe_query = _sanitize_fts_query(query)
    rows = conn.execute(
        "SELECT memory_type, memory_id, snippet(memory_fts, 0, '>>>', '<<<', '...', 40) as snippet, "
        "rank FROM memory_fts WHERE content MATCH ? ORDER BY rank LIMIT ?",
        (safe_query, limit),
    ).fetchall()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# User helpers
# ---------------------------------------------------------------------------

def user_get(conn: sqlite3.Connection, user_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        return None
    d = dict(row)
    d["preferences"] = json.loads(d["preferences"])
    d["context"] = json.loads(d["context"])
    return d


def user_upsert(conn: sqlite3.Connection, user_id: str, **kwargs) -> dict:
    now = _now_iso()
    existing = user_get(conn, user_id)
    if existing:
        updates = []
        params = []
        for key in ("display_name", "real_name", "timezone", "notes"):
            if key in kwargs and kwargs[key] is not None:
                updates.append(f"{key} = ?")
                params.append(kwargs[key])
        if "preferences" in kwargs:
            updates.append("preferences = ?")
            params.append(json.dumps(kwargs["preferences"]))
        if "context" in kwargs:
            updates.append("context = ?")
            params.append(json.dumps(kwargs["context"]))
        updates.append("last_seen = ?")
        params.append(now)
        params.append(user_id)
        conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
    else:
        display_name = kwargs.get("display_name", user_id)
        conn.execute(
            "INSERT INTO users (id, display_name, real_name, timezone, first_seen, last_seen, "
            "interaction_count, preferences, context, notes) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)",
            (
                user_id,
                display_name,
                kwargs.get("real_name"),
                kwargs.get("timezone"),
                now,
                now,
                json.dumps(kwargs.get("preferences", {})),
                json.dumps(kwargs.get("context", {})),
                kwargs.get("notes", ""),
            ),
        )
        conn.commit()
        # Index in FTS
        fts_insert(conn, "user", 0, f"{display_name} {kwargs.get('notes', '')}")
    return user_get(conn, user_id)


def user_touch(conn: sqlite3.Connection, user_id: str) -> dict | None:
    now = _now_iso()
    existing = user_get(conn, user_id)
    if existing is None:
        return None
    conn.execute(
        "UPDATE users SET last_seen = ?, interaction_count = interaction_count + 1 WHERE id = ?",
        (now, user_id),
    )
    conn.commit()
    return user_get(conn, user_id)


def user_list(conn: sqlite3.Connection, since: str | None = None) -> list:
    if since:
        rows = conn.execute(
            "SELECT * FROM users WHERE last_seen >= ? ORDER BY last_seen DESC", (since,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM users ORDER BY last_seen DESC").fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["preferences"] = json.loads(d["preferences"])
        d["context"] = json.loads(d["context"])
        result.append(d)
    return result


def user_search(conn: sqlite3.Connection, query: str) -> list:
    rows = conn.execute(
        "SELECT * FROM users WHERE display_name LIKE ? OR real_name LIKE ? OR notes LIKE ? "
        "ORDER BY last_seen DESC",
        (f"%{query}%", f"%{query}%", f"%{query}%"),
    ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["preferences"] = json.loads(d["preferences"])
        d["context"] = json.loads(d["context"])
        result.append(d)
    return result


# ---------------------------------------------------------------------------
# Channel memory helpers
# ---------------------------------------------------------------------------

def channel_add(conn: sqlite3.Connection, channel_id: str, topic: str, **kwargs) -> dict:
    now = _now_iso()
    cur = conn.execute(
        "INSERT INTO channel_memory (channel_id, channel_name, topic, category, created_at, "
        "created_by, expires_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (
            channel_id,
            kwargs.get("channel_name"),
            topic,
            kwargs.get("category", "general"),
            now,
            kwargs.get("created_by"),
            kwargs.get("expires_at"),
            json.dumps(kwargs.get("metadata", {})),
        ),
    )
    conn.commit()
    row_id = cur.lastrowid
    fts_insert(conn, "channel", row_id, topic)
    conn.commit()
    return {"id": row_id, "channel_id": channel_id, "topic": topic, "created_at": now}


def channel_list(conn: sqlite3.Connection, channel_id: str, category: str | None = None,
                 limit: int = 20) -> list:
    if category:
        rows = conn.execute(
            "SELECT * FROM channel_memory WHERE channel_id = ? AND category = ? "
            "ORDER BY created_at DESC LIMIT ?",
            (channel_id, category, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM channel_memory WHERE channel_id = ? ORDER BY created_at DESC LIMIT ?",
            (channel_id, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def channel_search(conn: sqlite3.Connection, query: str, channel_id: str | None = None,
                   limit: int = 20) -> list:
    fts_results = fts_search(conn, query, limit=limit * 2)
    ids = [int(r["memory_id"]) for r in fts_results if r["memory_type"] == "channel"]
    if not ids:
        return []
    placeholders = ",".join("?" * len(ids))
    if channel_id:
        rows = conn.execute(
            f"SELECT * FROM channel_memory WHERE id IN ({placeholders}) AND channel_id = ? "
            "ORDER BY created_at DESC LIMIT ?",
            ids + [channel_id, limit],
        ).fetchall()
    else:
        rows = conn.execute(
            f"SELECT * FROM channel_memory WHERE id IN ({placeholders}) "
            "ORDER BY created_at DESC LIMIT ?",
            ids + [limit],
        ).fetchall()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Long-term memory helpers
# ---------------------------------------------------------------------------

def longterm_add(conn: sqlite3.Connection, category: str, content: str, **kwargs) -> dict:
    now = _now_iso()
    tags = kwargs.get("tags", [])
    if isinstance(tags, str):
        tags = json.loads(tags)
    cur = conn.execute(
        "INSERT INTO longterm (category, content, source, confidence, tags, created_at, "
        "updated_at, expires_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            category,
            content,
            kwargs.get("source"),
            kwargs.get("confidence", 1.0),
            json.dumps(tags),
            now,
            now,
            kwargs.get("expires_at"),
            kwargs.get("created_by"),
        ),
    )
    conn.commit()
    row_id = cur.lastrowid
    fts_insert(conn, "longterm", row_id, content)
    conn.commit()
    return {"id": row_id, "category": category, "content": content, "created_at": now}


def longterm_list(conn: sqlite3.Connection, category: str | None = None, tag: str | None = None,
                  limit: int = 20) -> list:
    query = "SELECT * FROM longterm WHERE superseded_by IS NULL"
    params = []
    if category:
        query += " AND category = ?"
        params.append(category)
    if tag:
        query += " AND tags LIKE ?"
        params.append(f'%"{tag}"%')
    query += " ORDER BY updated_at DESC LIMIT ?"
    params.append(limit)
    rows = conn.execute(query, params).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["tags"] = json.loads(d["tags"])
        result.append(d)
    return result


def longterm_search(conn: sqlite3.Connection, query: str, limit: int = 20) -> list:
    fts_results = fts_search(conn, query, limit=limit * 2)
    ids = [int(r["memory_id"]) for r in fts_results if r["memory_type"] == "longterm"]
    if not ids:
        return []
    placeholders = ",".join("?" * len(ids))
    rows = conn.execute(
        f"SELECT * FROM longterm WHERE id IN ({placeholders}) AND superseded_by IS NULL "
        "ORDER BY updated_at DESC LIMIT ?",
        ids + [limit],
    ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["tags"] = json.loads(d["tags"])
        result.append(d)
    return result


def longterm_supersede(conn: sqlite3.Connection, old_id: int, content: str, **kwargs) -> dict:
    now = _now_iso()
    old = conn.execute("SELECT * FROM longterm WHERE id = ?", (old_id,)).fetchone()
    if old is None:
        raise ValueError(f"No longterm memory with id={old_id}")
    old = dict(old)
    tags = kwargs.get("tags")
    if tags is None:
        tags = old["tags"]
    elif isinstance(tags, str):
        tags = json.loads(tags)
    else:
        tags = json.dumps(tags) if isinstance(tags, list) else tags
    if isinstance(tags, list):
        tags = json.dumps(tags)
    cur = conn.execute(
        "INSERT INTO longterm (category, content, source, confidence, tags, created_at, "
        "updated_at, expires_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            old["category"],
            content,
            kwargs.get("source", old["source"]),
            kwargs.get("confidence", old["confidence"]),
            tags,
            old["created_at"],
            now,
            kwargs.get("expires_at", old["expires_at"]),
            kwargs.get("created_by", old["created_by"]),
        ),
    )
    new_id = cur.lastrowid
    conn.execute("UPDATE longterm SET superseded_by = ? WHERE id = ?", (new_id, old_id))
    conn.commit()
    fts_delete(conn, "longterm", old_id)
    fts_insert(conn, "longterm", new_id, content)
    conn.commit()
    return {"id": new_id, "supersedes": old_id, "content": content, "updated_at": now}


# ---------------------------------------------------------------------------
# Plan helpers
# ---------------------------------------------------------------------------

def plan_create(conn: sqlite3.Connection, title: str, **kwargs) -> dict:
    now = _now_iso()
    milestones = kwargs.get("milestones", [])
    if isinstance(milestones, str):
        milestones = json.loads(milestones)
    tags = kwargs.get("tags", [])
    if isinstance(tags, str):
        tags = json.loads(tags)
    cur = conn.execute(
        "INSERT INTO plans (title, description, status, priority, milestones, owner, channel_id, "
        "created_at, updated_at, tags, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            title,
            kwargs.get("description"),
            kwargs.get("status", "active"),
            kwargs.get("priority", "medium"),
            json.dumps(milestones),
            kwargs.get("owner"),
            kwargs.get("channel_id"),
            now,
            now,
            json.dumps(tags),
            json.dumps(kwargs.get("metadata", {})),
        ),
    )
    conn.commit()
    row_id = cur.lastrowid
    fts_insert(conn, "plan", row_id, f"{title} {kwargs.get('description', '')}")
    conn.commit()
    return {"id": row_id, "title": title, "status": "active", "created_at": now}


def plan_update(conn: sqlite3.Connection, plan_id: int, **kwargs) -> dict:
    now = _now_iso()
    plan = conn.execute("SELECT * FROM plans WHERE id = ?", (plan_id,)).fetchone()
    if plan is None:
        raise ValueError(f"No plan with id={plan_id}")
    plan = dict(plan)

    updates = ["updated_at = ?"]
    params = [now]

    for key in ("status", "priority", "description", "owner", "channel_id"):
        if key in kwargs and kwargs[key] is not None:
            updates.append(f"{key} = ?")
            params.append(kwargs[key])

    if kwargs.get("status") == "completed":
        updates.append("completed_at = ?")
        params.append(now)

    if "add_milestone" in kwargs:
        milestones = json.loads(plan["milestones"])
        new_ms = kwargs["add_milestone"]
        if isinstance(new_ms, str):
            new_ms = json.loads(new_ms)
        milestones.append(new_ms)
        updates.append("milestones = ?")
        params.append(json.dumps(milestones))

    if "tags" in kwargs:
        tags = kwargs["tags"]
        if isinstance(tags, str):
            tags = json.loads(tags)
        updates.append("tags = ?")
        params.append(json.dumps(tags))

    params.append(plan_id)
    conn.execute(f"UPDATE plans SET {', '.join(updates)} WHERE id = ?", params)
    conn.commit()

    updated = conn.execute("SELECT * FROM plans WHERE id = ?", (plan_id,)).fetchone()
    d = dict(updated)
    d["milestones"] = json.loads(d["milestones"])
    d["tags"] = json.loads(d["tags"])
    d["metadata"] = json.loads(d["metadata"])
    return d


def plan_list(conn: sqlite3.Connection, status: str | None = None, limit: int = 20) -> list:
    if status:
        rows = conn.execute(
            "SELECT * FROM plans WHERE status = ? ORDER BY updated_at DESC LIMIT ?",
            (status, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM plans ORDER BY updated_at DESC LIMIT ?", (limit,)
        ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["milestones"] = json.loads(d["milestones"])
        d["tags"] = json.loads(d["tags"])
        d["metadata"] = json.loads(d["metadata"])
        result.append(d)
    return result


def plan_get(conn: sqlite3.Connection, plan_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM plans WHERE id = ?", (plan_id,)).fetchone()
    if row is None:
        return None
    d = dict(row)
    d["milestones"] = json.loads(d["milestones"])
    d["tags"] = json.loads(d["tags"])
    d["metadata"] = json.loads(d["metadata"])
    return d


# ---------------------------------------------------------------------------
# Thought helpers
# ---------------------------------------------------------------------------

def thought_add(conn: sqlite3.Connection, agent_id: str, topic: str, reasoning: str,
                **kwargs) -> dict:
    now = _now_iso()
    cur = conn.execute(
        "INSERT INTO thoughts (agent_id, topic, reasoning, category, confidence, related_to, "
        "session_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (
            agent_id,
            topic,
            reasoning,
            kwargs.get("category", "observation"),
            kwargs.get("confidence", 0.5),
            kwargs.get("related_to"),
            kwargs.get("session_id"),
            now,
        ),
    )
    conn.commit()
    row_id = cur.lastrowid
    fts_insert(conn, "thought", row_id, f"{topic} {reasoning}")
    conn.commit()
    return {"id": row_id, "agent_id": agent_id, "topic": topic, "created_at": now}


def thought_list(conn: sqlite3.Connection, agent_id: str | None = None,
                 unresolved: bool = False, limit: int = 20) -> list:
    query = "SELECT * FROM thoughts WHERE archived = 0"
    params = []
    if agent_id:
        query += " AND agent_id = ?"
        params.append(agent_id)
    if unresolved:
        query += " AND resolved = 0"
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


def thought_resolve(conn: sqlite3.Connection, thought_id: int, resolution: str) -> dict:
    thought = conn.execute("SELECT * FROM thoughts WHERE id = ?", (thought_id,)).fetchone()
    if thought is None:
        raise ValueError(f"No thought with id={thought_id}")
    conn.execute(
        "UPDATE thoughts SET resolved = 1, resolution = ? WHERE id = ?",
        (resolution, thought_id),
    )
    conn.commit()
    return dict(conn.execute("SELECT * FROM thoughts WHERE id = ?", (thought_id,)).fetchone())


# ---------------------------------------------------------------------------
# Dream helpers
# ---------------------------------------------------------------------------

def dream_add(conn: sqlite3.Connection, topic: str, category: str, content: str,
              **kwargs) -> dict:
    now = _now_iso()
    tags = kwargs.get("tags", [])
    if isinstance(tags, str):
        tags = json.loads(tags)
    cur = conn.execute(
        "INSERT INTO dreams (topic, category, content, agent_id, inspiration, tags, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            topic,
            category,
            content,
            kwargs.get("agent_id", "main"),
            kwargs.get("inspiration"),
            json.dumps(tags),
            now,
        ),
    )
    conn.commit()
    row_id = cur.lastrowid
    fts_insert(conn, "dream", row_id, f"{topic} {content}")
    conn.commit()
    return {"id": row_id, "topic": topic, "category": category, "created_at": now}


def dream_list(conn: sqlite3.Connection, category: str | None = None, limit: int = 10) -> list:
    if category:
        rows = conn.execute(
            "SELECT * FROM dreams WHERE category = ? ORDER BY created_at DESC LIMIT ?",
            (category, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM dreams ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["tags"] = json.loads(d["tags"])
        result.append(d)
    return result


def dream_rate(conn: sqlite3.Connection, dream_id: int, rating: int) -> dict:
    dream = conn.execute("SELECT * FROM dreams WHERE id = ?", (dream_id,)).fetchone()
    if dream is None:
        raise ValueError(f"No dream with id={dream_id}")
    conn.execute("UPDATE dreams SET rating = ? WHERE id = ?", (rating, dream_id))
    conn.commit()
    d = dict(conn.execute("SELECT * FROM dreams WHERE id = ?", (dream_id,)).fetchone())
    d["tags"] = json.loads(d["tags"])
    return d


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

def get_stats(conn: sqlite3.Connection) -> dict:
    stats = {"db_path": str(DB_PATH), "profile_root": str(PROFILE_ROOT)}
    for table in ("users", "channel_memory", "longterm", "plans", "thoughts", "dreams"):
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        stats[table] = {"count": count}
        if table == "users" and count > 0:
            oldest = conn.execute("SELECT MIN(first_seen) FROM users").fetchone()[0]
            newest = conn.execute("SELECT MAX(last_seen) FROM users").fetchone()[0]
            stats[table]["oldest"] = oldest
            stats[table]["newest"] = newest
        elif count > 0:
            oldest = conn.execute(f"SELECT MIN(created_at) FROM {table}").fetchone()[0]
            newest = conn.execute(f"SELECT MAX(created_at) FROM {table}").fetchone()[0]
            stats[table]["oldest"] = oldest
            stats[table]["newest"] = newest
    # DB file size
    if DB_PATH.exists():
        stats["db_size_bytes"] = DB_PATH.stat().st_size
        stats["db_size_mb"] = round(DB_PATH.stat().st_size / (1024 * 1024), 2)
    return stats
