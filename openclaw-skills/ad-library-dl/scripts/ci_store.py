# /// script
# requires-python = ">=3.10"
# dependencies = ["chromadb>=0.6.0", "google-genai>=1.0.0"]
# ///
"""Competitive Intelligence Storage Adapter.

Unified storage layer for the CI pipeline (competitor_monitor.py, clone_competitor.py).
Provides structured queryable storage with SQLite (local) + optional PostgreSQL
(cgk-platform / rawdog-web) + ChromaDB semantic search.

Backend auto-detection:
  ~/.openclaw/          -> PostgreSQL via cgk-platform API + SQLite cache
  ~/.openclaw-rawdog/   -> PostgreSQL via rawdog-web API + SQLite cache
  ~/.openclaw-vitahustle/ -> SQLite + ChromaDB only (no platform)

Usage:
    from ci_store import CIStore
    store = CIStore()
    store.save_scan(brand_dir, assets, changes, analyses, session_ts, ...)
    store.list_brands()
    store.get_brand("BrandDir")
    store.get_scaling("BrandDir", threshold=3)
    store.search_analyses("UGC hooks with social proof")
    store.get_rank_history("abc123hash")
"""

from __future__ import annotations

import datetime
import json
import os
import pathlib
import sqlite3
import sys
import urllib.parse
import urllib.request

# IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks
_script_dir = pathlib.Path(__file__).parent

# ---------------------------------------------------------------------------
# Profile detection
# ---------------------------------------------------------------------------

def _detect_profile_root() -> pathlib.Path:
    """Derive profile root from script location.

    Layout: ~/.openclaw[-profile]/skills/ad-library-dl/scripts/ci_store.py
    Returns: ~/.openclaw[-profile]/
    """
    return _script_dir.parent.parent.parent


def _detect_profile_name() -> str:
    """Return profile name: 'cgk', 'rawdog', or 'vitahustle'."""
    root = _detect_profile_root()
    name = root.name  # .openclaw, .openclaw-rawdog, .openclaw-vitahustle
    if name == ".openclaw":
        return "cgk"
    elif name == ".openclaw-rawdog":
        return "rawdog"
    elif name == ".openclaw-vitahustle":
        return "vitahustle"
    return "unknown"


# ---------------------------------------------------------------------------
# SQLite schema + migrations
# ---------------------------------------------------------------------------

_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS brands (
    dir_name TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    ad_library_url TEXT,
    first_analyzed_at TEXT,
    last_analyzed_at TEXT,
    drive_root_folder_id TEXT,
    drive_statics_folder_id TEXT,
    drive_videos_folder_id TEXT,
    drive_clones_folder_id TEXT
);

CREATE TABLE IF NOT EXISTS assets (
    url_hash TEXT PRIMARY KEY,
    brand_dir TEXT NOT NULL REFERENCES brands(dir_name),
    type TEXT NOT NULL,
    current_rank INTEGER,
    first_seen_at TEXT,
    last_seen_at TEXT,
    drive_file_id TEXT,
    source_url_prefix TEXT,
    filename TEXT
);

CREATE TABLE IF NOT EXISTS rank_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_hash TEXT NOT NULL REFERENCES assets(url_hash),
    rank INTEGER NOT NULL,
    session TEXT NOT NULL,
    recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_hash TEXT NOT NULL REFERENCES assets(url_hash),
    session TEXT NOT NULL,
    analysis_json TEXT NOT NULL,
    analysis_summary TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_dir TEXT NOT NULL REFERENCES brands(dir_name),
    session_ts TEXT NOT NULL,
    total_ads INTEGER,
    new_ads INTEGER,
    deduped INTEGER,
    doc_url TEXT,
    drive_url TEXT,
    scaling_alerts INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_hash TEXT NOT NULL REFERENCES assets(url_hash),
    clone_type TEXT NOT NULL,
    brief_json TEXT NOT NULL,
    batch_name TEXT,
    agent TEXT,
    doc_url TEXT,
    drive_file_id TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_brand ON assets(brand_dir);
CREATE INDEX IF NOT EXISTS idx_rank_history_hash ON rank_history(asset_hash);
CREATE INDEX IF NOT EXISTS idx_analyses_hash ON analyses(asset_hash);
CREATE INDEX IF NOT EXISTS idx_scans_brand ON scans(brand_dir);
CREATE INDEX IF NOT EXISTS idx_clones_hash ON clones(asset_hash);
"""

_FTS_SQL = """
CREATE VIRTUAL TABLE IF NOT EXISTS analyses_fts USING fts5(
    asset_hash, analysis_summary, content=analyses, content_rowid=id
);
"""

# Triggers to keep FTS in sync with analyses table
_FTS_TRIGGERS_SQL = """
CREATE TRIGGER IF NOT EXISTS analyses_ai AFTER INSERT ON analyses BEGIN
    INSERT INTO analyses_fts(rowid, asset_hash, analysis_summary)
    VALUES (new.id, new.asset_hash, new.analysis_summary);
END;

CREATE TRIGGER IF NOT EXISTS analyses_ad AFTER DELETE ON analyses BEGIN
    INSERT INTO analyses_fts(analyses_fts, rowid, asset_hash, analysis_summary)
    VALUES ('delete', old.id, old.asset_hash, old.analysis_summary);
END;

CREATE TRIGGER IF NOT EXISTS analyses_au AFTER UPDATE ON analyses BEGIN
    INSERT INTO analyses_fts(analyses_fts, rowid, asset_hash, analysis_summary)
    VALUES ('delete', old.id, old.asset_hash, old.analysis_summary);
    INSERT INTO analyses_fts(rowid, asset_hash, analysis_summary)
    VALUES (new.id, new.asset_hash, new.analysis_summary);
END;
"""


def _extract_summary(analysis: dict) -> str:
    """Extract a searchable summary from a Gemini analysis JSON."""
    parts = []

    # Common top-level keys in analysis output
    for key in ("hook", "hook_technique", "headline", "key_message",
                "call_to_action", "cta", "strategy", "emotional_appeal",
                "target_audience", "format_type", "visual_style",
                "copy_approach", "persuasion_technique"):
        val = analysis.get(key)
        if val and isinstance(val, str):
            parts.append(val)

    # Nested structures
    for key in ("key_elements", "strengths", "techniques", "themes",
                "visual_elements", "text_elements", "tactics"):
        val = analysis.get(key)
        if isinstance(val, list):
            for item in val:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict):
                    parts.append(json.dumps(item))

    # If nothing was extracted, use a truncated dump
    if not parts:
        raw = json.dumps(analysis)
        parts.append(raw[:2000])

    return " | ".join(parts)


def _init_db(db_path: pathlib.Path) -> sqlite3.Connection:
    """Create/open SQLite database with schema."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(_SCHEMA_SQL)
    conn.executescript(_FTS_SQL)
    conn.executescript(_FTS_TRIGGERS_SQL)
    conn.commit()

    # Migration: add content_hash column if missing
    try:
        conn.execute("SELECT content_hash FROM assets LIMIT 0")
    except sqlite3.OperationalError:
        conn.execute("ALTER TABLE assets ADD COLUMN content_hash TEXT")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_assets_content_hash ON assets(content_hash)")
        conn.commit()

    # Migration: add landing_page_url column if missing
    try:
        conn.execute("SELECT landing_page_url FROM assets LIMIT 0")
    except sqlite3.OperationalError:
        conn.execute("ALTER TABLE assets ADD COLUMN landing_page_url TEXT")
        conn.commit()

    return conn


# ---------------------------------------------------------------------------
# Catalog.json migration
# ---------------------------------------------------------------------------

def _migrate_from_catalog(conn: sqlite3.Connection, catalog_path: pathlib.Path) -> int:
    """Import existing catalog.json data into SQLite. Returns count of assets migrated."""
    if not catalog_path.exists():
        return 0

    # Check if we already migrated
    row = conn.execute("SELECT COUNT(*) as cnt FROM assets").fetchone()
    if row["cnt"] > 0:
        return 0  # Already has data, skip

    try:
        with open(catalog_path) as f:
            catalog = json.load(f)
    except (json.JSONDecodeError, OSError):
        return 0

    brands = catalog.get("brands", {})
    assets = catalog.get("assets", {})

    if not brands and not assets:
        return 0

    now_iso = datetime.datetime.utcnow().isoformat() + "Z"

    # Migrate brands
    for dir_name, brand in brands.items():
        conn.execute(
            """INSERT OR IGNORE INTO brands
               (dir_name, display_name, ad_library_url, first_analyzed_at, last_analyzed_at,
                drive_root_folder_id, drive_statics_folder_id, drive_videos_folder_id, drive_clones_folder_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                dir_name,
                brand.get("display_name", dir_name),
                brand.get("ad_library_url"),
                brand.get("first_analyzed", now_iso),
                brand.get("last_analyzed", now_iso),
                brand.get("drive_root_folder_id"),
                brand.get("drive_statics_folder_id"),
                brand.get("drive_videos_folder_id"),
                brand.get("drive_clones_folder_id"),
            ),
        )

        # Migrate scan sessions
        for session in brand.get("sessions", []):
            conn.execute(
                """INSERT INTO scans
                   (brand_dir, session_ts, total_ads, new_ads, deduped, doc_url, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    dir_name,
                    session.get("timestamp", ""),
                    session.get("ads_analyzed", 0),
                    session.get("new_assets", 0),
                    session.get("deduped", 0),
                    session.get("doc_url"),
                    now_iso,
                ),
            )

    # Migrate assets
    migrated = 0
    for url_hash, asset in assets.items():
        brand_dir = asset.get("brand", "")
        if not brand_dir:
            continue

        # Ensure brand exists (might be referenced but not in brands dict)
        conn.execute(
            "INSERT OR IGNORE INTO brands (dir_name, display_name) VALUES (?, ?)",
            (brand_dir, brand_dir),
        )

        conn.execute(
            """INSERT OR IGNORE INTO assets
               (url_hash, brand_dir, type, current_rank, first_seen_at, last_seen_at,
                drive_file_id, source_url_prefix, filename)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                url_hash,
                brand_dir,
                asset.get("type", "image"),
                asset.get("current_rank", asset.get("rank")),
                asset.get("first_seen", asset.get("analyzed_at", now_iso)),
                asset.get("analyzed_at", now_iso),
                asset.get("drive_file_id"),
                asset.get("source_url_prefix"),
                asset.get("filename"),
            ),
        )

        # Migrate rank history
        rank_history = asset.get("rank_history", [])
        if rank_history:
            for rh in rank_history:
                conn.execute(
                    """INSERT INTO rank_history (asset_hash, rank, session, recorded_at)
                       VALUES (?, ?, ?, ?)""",
                    (url_hash, rh.get("rank"), rh.get("session", ""), rh.get("timestamp", now_iso)),
                )
        elif asset.get("rank") is not None:
            # v1 catalog: create initial rank entry from current data
            conn.execute(
                """INSERT INTO rank_history (asset_hash, rank, session, recorded_at)
                   VALUES (?, ?, ?, ?)""",
                (url_hash, asset["rank"], asset.get("session", ""), asset.get("analyzed_at", now_iso)),
            )

        # Migrate clones
        for clone in asset.get("clones", []):
            conn.execute(
                """INSERT INTO clones
                   (asset_hash, clone_type, brief_json, batch_name, agent, drive_file_id, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    url_hash,
                    clone.get("type", "statics"),
                    json.dumps(clone),
                    clone.get("batch"),
                    clone.get("agent"),
                    clone.get("drive_file_id"),
                    clone.get("created_at", now_iso),
                ),
            )

        migrated += 1

    conn.commit()
    print(f"[ci_store] Migrated {migrated} assets, {len(brands)} brands from catalog.json")
    return migrated


# ---------------------------------------------------------------------------
# PostgreSQL backend (API-based)
# ---------------------------------------------------------------------------

class _PostgresBackend:
    """POST data to cgk-platform or rawdog-web API."""

    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key

    def _request(self, method: str, path: str, data: dict | None = None) -> dict | None:
        url = f"{self.api_url}{path}"
        body = json.dumps(data).encode() if data else None
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read())
        except Exception as e:
            print(f"[ci_store] PostgreSQL API error ({method} {path}): {e}")
            return None

    def ingest(self, payload: dict) -> bool:
        result = self._request("POST", "/api/admin/competitor-intelligence", payload)
        return result is not None and result.get("success", False)

    def search(self, query: str, brand: str | None = None, limit: int = 10) -> list[dict]:
        params = f"?action=search&q={urllib.parse.quote(query)}&limit={limit}"
        if brand:
            params += f"&brand={urllib.parse.quote(brand)}"
        result = self._request("GET", f"/api/admin/competitor-intelligence{params}")
        return result.get("results", []) if result else []


# ---------------------------------------------------------------------------
# ChromaDB semantic search
# ---------------------------------------------------------------------------

class _ChromaBackend:
    """Semantic search over analysis summaries using ChromaDB + Gemini embeddings."""

    def __init__(self, chroma_dir: pathlib.Path):
        self._dir = chroma_dir
        self._client = None
        self._collection = None
        self._embed_model = None

    def _ensure_client(self):
        if self._client is not None:
            return

        try:
            import chromadb
        except ImportError:
            print("[ci_store] chromadb not installed — semantic search disabled")
            print("  Install: uv pip install chromadb")
            self._client = False  # Mark as unavailable
            return

        self._dir.mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(path=str(self._dir))
        self._collection = self._client.get_or_create_collection(
            name="ci_analyses",
            metadata={"hnsw:space": "cosine"},
        )

    def _embed(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings via Gemini text-embedding-004."""
        if self._embed_model is None:
            try:
                from google import genai
                project = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0013158607")
                client = genai.Client(vertexai=True, project=project, location="global")
                self._embed_model = client
            except Exception as e:
                print(f"[ci_store] Gemini embedding init failed: {e}")
                return []

        try:
            result = self._embed_model.models.embed_content(
                model="text-embedding-004",
                contents=texts,
            )
            return [e.values for e in result.embeddings]
        except Exception as e:
            print(f"[ci_store] Embedding failed: {e}")
            return []

    def add(self, doc_id: str, text: str, metadata: dict | None = None):
        """Add or update a document in the collection."""
        self._ensure_client()
        if self._client is False or not self._collection:
            return

        embeddings = self._embed([text])
        if not embeddings:
            return

        self._collection.upsert(
            ids=[doc_id],
            embeddings=embeddings,
            documents=[text],
            metadatas=[metadata or {}],
        )

    def search(self, query: str, n_results: int = 10, where: dict | None = None) -> list[dict]:
        """Semantic search. Returns list of {id, document, metadata, distance}."""
        self._ensure_client()
        if self._client is False or not self._collection:
            return []

        embeddings = self._embed([query])
        if not embeddings:
            return []

        kwargs = {
            "query_embeddings": embeddings,
            "n_results": min(n_results, self._collection.count() or 1),
        }
        if where:
            kwargs["where"] = where

        try:
            results = self._collection.query(**kwargs)
        except Exception as e:
            print(f"[ci_store] ChromaDB query error: {e}")
            return []

        items = []
        ids = results.get("ids", [[]])[0]
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        dists = results.get("distances", [[]])[0]

        for i, doc_id in enumerate(ids):
            items.append({
                "id": doc_id,
                "document": docs[i] if i < len(docs) else "",
                "metadata": metas[i] if i < len(metas) else {},
                "distance": dists[i] if i < len(dists) else 1.0,
            })

        return items

    def backfill(self, conn: sqlite3.Connection):
        """Backfill ChromaDB from existing analyses in SQLite."""
        self._ensure_client()
        if self._client is False or not self._collection:
            return

        existing_count = self._collection.count()
        rows = conn.execute(
            "SELECT a.id, a.asset_hash, a.session, a.analysis_summary, "
            "       s.brand_dir, s.type "
            "FROM analyses a "
            "JOIN assets s ON a.asset_hash = s.url_hash "
            "WHERE a.analysis_summary IS NOT NULL AND a.analysis_summary != ''"
        ).fetchall()

        if not rows:
            return

        # Skip if already backfilled (rough check)
        if existing_count >= len(rows):
            return

        print(f"[ci_store] Backfilling ChromaDB: {len(rows)} analyses...")
        batch_size = 50
        for i in range(0, len(rows), batch_size):
            batch = rows[i : i + batch_size]
            ids = [f"{r['asset_hash']}_{r['session']}" for r in batch]
            texts = [r["analysis_summary"] for r in batch]
            metas = [
                {"asset_hash": r["asset_hash"], "brand": r["brand_dir"], "type": r["type"]}
                for r in batch
            ]

            embeddings = self._embed(texts)
            if not embeddings or len(embeddings) != len(texts):
                continue

            self._collection.upsert(ids=ids, embeddings=embeddings, documents=texts, metadatas=metas)

        print(f"[ci_store] Backfill complete: {len(rows)} documents indexed")


# ---------------------------------------------------------------------------
# CIStore — main public interface
# ---------------------------------------------------------------------------

class CIStore:
    """Unified CI storage adapter.

    Auto-detects profile, initializes SQLite, optionally connects to PostgreSQL
    backend and ChromaDB for semantic search.
    """

    def __init__(self, *, profile_root: pathlib.Path | None = None, enable_chroma: bool = True):
        self._profile_root = profile_root or _detect_profile_root()
        self._profile = _detect_profile_name()
        self._workspace = self._profile_root / "workspace"
        self._competitors_dir = self._workspace / "brand" / "competitors"
        self._db_path = self._competitors_dir / "ci.db"

        # Initialize SQLite
        self._conn = _init_db(self._db_path)

        # Auto-migrate from catalog.json
        catalog_path = self._competitors_dir / "catalog.json"
        _migrate_from_catalog(self._conn, catalog_path)

        # PostgreSQL backend (optional)
        self._pg: _PostgresBackend | None = None
        self._init_postgres()

        # ChromaDB (optional)
        self._chroma: _ChromaBackend | None = None
        if enable_chroma:
            chroma_dir = self._competitors_dir / "chroma"
            self._chroma = _ChromaBackend(chroma_dir)

    def _init_postgres(self):
        """Initialize PostgreSQL backend if environment vars are set."""
        if self._profile == "cgk":
            url = os.environ.get("CGK_PLATFORM_API_URL")
            key = os.environ.get("CGK_PLATFORM_API_KEY")
        elif self._profile == "rawdog":
            url = os.environ.get("RAWDOG_PLATFORM_API_URL")
            key = os.environ.get("RAWDOG_PLATFORM_API_KEY")
        else:
            return  # VitaHustle — no platform

        if url and key:
            self._pg = _PostgresBackend(url, key)
            print(f"[ci_store] PostgreSQL backend: {url}")
        else:
            print(f"[ci_store] No PostgreSQL API configured for {self._profile} — SQLite only")

    # ----- Write operations -----

    def save_scan(
        self,
        brand_dir: str,
        brand_display: str,
        assets: list[dict],
        changes: dict,
        analyses: list[dict],
        session_ts: str,
        *,
        ad_library_url: str | None = None,
        doc_url: str | None = None,
        drive_url: str | None = None,
        scaling_alerts: int = 0,
        deduped: int = 0,
        drive_folder_ids: dict | None = None,
    ):
        """Save a complete monitoring scan to SQLite (and optionally PostgreSQL).

        Args:
            brand_dir: Brand directory name (e.g., "VitaHustle")
            brand_display: Display name
            assets: List of asset dicts with url_hash, rank, type, url
            changes: Rank change dict from compute_rank_changes()
            analyses: List of Gemini analysis dicts
            session_ts: Session timestamp string
        """
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        conn = self._conn

        # Upsert brand
        drive_ids = drive_folder_ids or {}
        conn.execute(
            """INSERT INTO brands (dir_name, display_name, ad_library_url,
                                   first_analyzed_at, last_analyzed_at,
                                   drive_root_folder_id, drive_statics_folder_id,
                                   drive_videos_folder_id, drive_clones_folder_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(dir_name) DO UPDATE SET
                   display_name = excluded.display_name,
                   last_analyzed_at = excluded.last_analyzed_at,
                   ad_library_url = COALESCE(excluded.ad_library_url, brands.ad_library_url),
                   drive_root_folder_id = COALESCE(excluded.drive_root_folder_id, brands.drive_root_folder_id),
                   drive_statics_folder_id = COALESCE(excluded.drive_statics_folder_id, brands.drive_statics_folder_id),
                   drive_videos_folder_id = COALESCE(excluded.drive_videos_folder_id, brands.drive_videos_folder_id),
                   drive_clones_folder_id = COALESCE(excluded.drive_clones_folder_id, brands.drive_clones_folder_id)
            """,
            (
                brand_dir, brand_display, ad_library_url,
                now_iso, now_iso,
                drive_ids.get("root"), drive_ids.get("statics"),
                drive_ids.get("videos"), drive_ids.get("clones"),
            ),
        )

        # Record scan
        conn.execute(
            """INSERT INTO scans (brand_dir, session_ts, total_ads, new_ads, deduped,
                                  doc_url, drive_url, scaling_alerts, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                brand_dir, session_ts, len(assets),
                len(changes.get("new_ads", [])), deduped,
                doc_url, drive_url, scaling_alerts, now_iso,
            ),
        )

        # Upsert assets + rank history
        for asset in assets:
            h = asset["url_hash"]
            conn.execute(
                """INSERT INTO assets (url_hash, brand_dir, type, current_rank,
                                       first_seen_at, last_seen_at, source_url_prefix, filename,
                                       content_hash, landing_page_url)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(url_hash) DO UPDATE SET
                       current_rank = excluded.current_rank,
                       last_seen_at = excluded.last_seen_at,
                       filename = COALESCE(excluded.filename, assets.filename),
                       source_url_prefix = COALESCE(excluded.source_url_prefix, assets.source_url_prefix),
                       content_hash = COALESCE(excluded.content_hash, assets.content_hash),
                       landing_page_url = COALESCE(excluded.landing_page_url, assets.landing_page_url)
                """,
                (
                    h, brand_dir, asset.get("type", "image"), asset.get("rank"),
                    now_iso, now_iso,
                    asset.get("url", "")[:60] if asset.get("url") else None,
                    asset.get("filename"),
                    asset.get("content_hash"),
                    asset.get("landing_page_url"),
                ),
            )

            # Append rank history
            conn.execute(
                "INSERT INTO rank_history (asset_hash, rank, session, recorded_at) VALUES (?, ?, ?, ?)",
                (h, asset.get("rank"), session_ts, now_iso),
            )

        # Save analyses
        for analysis in analyses:
            h = analysis.get("_url_hash") or analysis.get("url_hash")
            if not h:
                # Try to match by filename/rank
                fname = analysis.get("_filename", "")
                # Extract hash from filename like "rank-001-img-ca220b44af.jpg"
                parts = fname.replace(".analysis.json", "").split("-")
                h = parts[-1] if parts else None

            if not h:
                continue

            summary = _extract_summary(analysis)
            analysis_json = json.dumps(analysis)

            conn.execute(
                """INSERT INTO analyses (asset_hash, session, analysis_json, analysis_summary, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (h, session_ts, analysis_json, summary, now_iso),
            )

            # Index in ChromaDB
            if self._chroma:
                self._chroma.add(
                    doc_id=f"{h}_{session_ts}",
                    text=summary,
                    metadata={"asset_hash": h, "brand": brand_dir, "type": analysis.get("_type", "")},
                )

        conn.commit()
        print(f"[ci_store] Saved scan: {brand_dir} — {len(assets)} assets, {len(analyses)} analyses")

        # Sync to PostgreSQL (best-effort)
        if self._pg:
            payload = {
                "brand_dir": brand_dir,
                "brand_display": brand_display,
                "ad_library_url": ad_library_url,
                "session_ts": session_ts,
                "assets": assets,
                "changes": changes,
                "analyses": [
                    {
                        "asset_hash": a.get("_url_hash") or a.get("url_hash", ""),
                        "analysis_json": a,
                        "analysis_summary": _extract_summary(a),
                    }
                    for a in analyses
                    if a.get("_url_hash") or a.get("url_hash")
                ],
                "doc_url": doc_url,
                "scaling_alerts": scaling_alerts,
                "deduped": deduped,
            }
            self._pg.ingest(payload)

    def save_clone(
        self,
        asset_hash: str,
        clone_type: str,
        brief: dict,
        batch_name: str,
        agent: str,
        *,
        doc_url: str | None = None,
        drive_file_id: str | None = None,
        brand_dir: str | None = None,
    ):
        """Save a clone brief.

        If the referenced asset_hash doesn't exist in the assets table yet,
        inserts a minimal stub so the FK constraint is satisfied.
        """
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        # Ensure the asset exists (FK constraint: clones.asset_hash -> assets.url_hash)
        exists = self._conn.execute(
            "SELECT 1 FROM assets WHERE url_hash = ?", (asset_hash,)
        ).fetchone()
        if not exists:
            brand = brand_dir or brief.get("brand", brief.get("competitor_brand", ""))
            asset_type = "image" if clone_type == "statics" else "video"
            self._conn.execute(
                """INSERT OR IGNORE INTO assets (url_hash, brand_dir, type, first_seen_at)
                   VALUES (?, ?, ?, ?)""",
                (asset_hash, brand, asset_type, now_iso),
            )
        self._conn.execute(
            """INSERT INTO clones (asset_hash, clone_type, brief_json, batch_name, agent,
                                   doc_url, drive_file_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (asset_hash, clone_type, json.dumps(brief), batch_name, agent, doc_url, drive_file_id, now_iso),
        )
        self._conn.commit()

    def update_asset_drive_id(self, url_hash: str, drive_file_id: str):
        """Set Drive file ID on an asset."""
        self._conn.execute(
            "UPDATE assets SET drive_file_id = ? WHERE url_hash = ?",
            (drive_file_id, url_hash),
        )
        self._conn.commit()

    def backfill_drive_ids_from_catalog(self, catalog: dict) -> int:
        """Bulk-sync drive_file_id values from catalog dict into SQLite."""
        count = 0
        for h, asset in catalog.get("assets", {}).items():
            fid = asset.get("drive_file_id")
            if fid:
                cur = self._conn.execute(
                    "UPDATE assets SET drive_file_id = ? WHERE url_hash = ? AND (drive_file_id IS NULL OR drive_file_id = '')",
                    (fid, h),
                )
                count += cur.rowcount
        self._conn.commit()
        return count

    # ----- Read operations -----

    def list_brands(self) -> list[dict]:
        """List all monitored brands with stats."""
        rows = self._conn.execute(
            """SELECT b.*,
                      (SELECT COUNT(*) FROM assets WHERE brand_dir = b.dir_name) as asset_count,
                      (SELECT COUNT(*) FROM scans WHERE brand_dir = b.dir_name) as scan_count
               FROM brands b ORDER BY b.display_name"""
        ).fetchall()
        return [dict(r) for r in rows]

    def get_brand(self, brand_dir: str) -> dict | None:
        """Get brand details with stats."""
        row = self._conn.execute(
            """SELECT b.*,
                      (SELECT COUNT(*) FROM assets WHERE brand_dir = b.dir_name) as asset_count,
                      (SELECT COUNT(*) FROM scans WHERE brand_dir = b.dir_name) as scan_count,
                      (SELECT COUNT(*) FROM assets WHERE brand_dir = b.dir_name AND type = 'image') as image_count,
                      (SELECT COUNT(*) FROM assets WHERE brand_dir = b.dir_name AND type = 'video') as video_count
               FROM brands b WHERE b.dir_name = ?""",
            (brand_dir,),
        ).fetchone()
        return dict(row) if row else None

    def get_scaling(self, brand_dir: str, threshold: int = 3) -> list[dict]:
        """Find assets that climbed >= threshold positions between last two scans."""
        rows = self._conn.execute(
            """WITH recent_ranks AS (
                   SELECT asset_hash, rank, session, recorded_at,
                          ROW_NUMBER() OVER (PARTITION BY asset_hash ORDER BY recorded_at DESC) as rn
                   FROM rank_history
                   WHERE asset_hash IN (SELECT url_hash FROM assets WHERE brand_dir = ?)
               )
               SELECT r1.asset_hash, r1.rank as current_rank, r2.rank as previous_rank,
                      (r2.rank - r1.rank) as delta,
                      a.type, a.filename, a.first_seen_at
               FROM recent_ranks r1
               JOIN recent_ranks r2 ON r1.asset_hash = r2.asset_hash AND r2.rn = 2
               JOIN assets a ON a.url_hash = r1.asset_hash
               WHERE r1.rn = 1 AND (r2.rank - r1.rank) >= ?
               ORDER BY delta DESC""",
            (brand_dir, threshold),
        ).fetchall()
        return [dict(r) for r in rows]

    def get_rank_history(self, asset_hash: str) -> list[dict]:
        """Get full rank history for an asset."""
        rows = self._conn.execute(
            "SELECT * FROM rank_history WHERE asset_hash = ? ORDER BY recorded_at",
            (asset_hash,),
        ).fetchall()
        return [dict(r) for r in rows]

    def get_brand_assets(self, brand_dir: str, *, asset_type: str | None = None,
                          limit: int = 50) -> list[dict]:
        """Get assets for a brand, sorted by current rank."""
        if asset_type:
            rows = self._conn.execute(
                "SELECT * FROM assets WHERE brand_dir = ? AND type = ? ORDER BY current_rank LIMIT ?",
                (brand_dir, asset_type, limit),
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT * FROM assets WHERE brand_dir = ? ORDER BY current_rank LIMIT ?",
                (brand_dir, limit),
            ).fetchall()
        return [dict(r) for r in rows]

    def get_asset_analyses(self, asset_hash: str) -> list[dict]:
        """Get all analyses for an asset."""
        rows = self._conn.execute(
            "SELECT * FROM analyses WHERE asset_hash = ? ORDER BY created_at DESC",
            (asset_hash,),
        ).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            try:
                d["analysis_json"] = json.loads(d["analysis_json"])
            except (json.JSONDecodeError, TypeError):
                pass
            results.append(d)
        return results

    def get_asset_clones(self, asset_hash: str) -> list[dict]:
        """Get all clone briefs for an asset."""
        rows = self._conn.execute(
            "SELECT * FROM clones WHERE asset_hash = ? ORDER BY created_at DESC",
            (asset_hash,),
        ).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            try:
                d["brief_json"] = json.loads(d["brief_json"])
            except (json.JSONDecodeError, TypeError):
                pass
            results.append(d)
        return results

    def get_recent_scans(self, brand_dir: str | None = None, limit: int = 10) -> list[dict]:
        """Get recent scans, optionally filtered by brand."""
        if brand_dir:
            rows = self._conn.execute(
                "SELECT * FROM scans WHERE brand_dir = ? ORDER BY created_at DESC LIMIT ?",
                (brand_dir, limit),
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT * FROM scans ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]

    # ----- Search operations -----

    def search_analyses(self, query: str, *, brand: str | None = None,
                         limit: int = 10) -> list[dict]:
        """Search analyses — uses ChromaDB (semantic) if available, falls back to FTS5."""
        # Try semantic search first
        if self._chroma:
            where = {"brand": brand} if brand else None
            results = self._chroma.search(query, n_results=limit, where=where)
            if results:
                # Enrich with SQLite data
                enriched = []
                for r in results:
                    asset_hash = r["metadata"].get("asset_hash", r["id"].split("_")[0])
                    asset = self._conn.execute(
                        "SELECT * FROM assets WHERE url_hash = ?", (asset_hash,)
                    ).fetchone()
                    enriched.append({
                        "asset_hash": asset_hash,
                        "brand": r["metadata"].get("brand", ""),
                        "type": r["metadata"].get("type", ""),
                        "summary": r["document"],
                        "relevance": round(1.0 - r["distance"], 3),
                        "current_rank": dict(asset).get("current_rank") if asset else None,
                    })
                return enriched

        # Fallback: FTS5 text search
        if brand:
            rows = self._conn.execute(
                """SELECT af.asset_hash, af.analysis_summary, a.brand_dir, a.type, a.current_rank
                   FROM analyses_fts af
                   JOIN assets a ON a.url_hash = af.asset_hash
                   WHERE analyses_fts MATCH ? AND a.brand_dir = ?
                   ORDER BY rank LIMIT ?""",
                (query, brand, limit),
            ).fetchall()
        else:
            rows = self._conn.execute(
                """SELECT af.asset_hash, af.analysis_summary, a.brand_dir, a.type, a.current_rank
                   FROM analyses_fts af
                   JOIN assets a ON a.url_hash = af.asset_hash
                   WHERE analyses_fts MATCH ?
                   ORDER BY rank LIMIT ?""",
                (query, limit),
            ).fetchall()

        return [
            {
                "asset_hash": r["asset_hash"],
                "brand": r["brand_dir"],
                "type": r["type"],
                "summary": r["analysis_summary"],
                "relevance": None,
                "current_rank": r["current_rank"],
            }
            for r in rows
        ]

    def backfill_chroma(self):
        """Backfill ChromaDB from existing analyses."""
        if self._chroma:
            self._chroma.backfill(self._conn)

    # ----- Cleanup -----

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()

    def close(self):
        """Close database connection."""
        if self._conn:
            self._conn.close()


# ---------------------------------------------------------------------------
# CLI interface (for testing/verification)
# ---------------------------------------------------------------------------

def main():
    import argparse

    parser = argparse.ArgumentParser(description="CI Store — query competitive intelligence data")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("brands", help="List monitored brands")

    status_p = sub.add_parser("status", help="Brand status")
    status_p.add_argument("brand", help="Brand directory name")

    scaling_p = sub.add_parser("scaling", help="Scaling report")
    scaling_p.add_argument("brand", help="Brand directory name")
    scaling_p.add_argument("--threshold", type=int, default=3)

    search_p = sub.add_parser("search", help="Search analyses")
    search_p.add_argument("query", help="Search query")
    search_p.add_argument("--brand", help="Filter by brand")
    search_p.add_argument("--limit", type=int, default=10)

    history_p = sub.add_parser("history", help="Rank history for an asset")
    history_p.add_argument("hash", help="Asset URL hash")

    sub.add_parser("backfill", help="Backfill ChromaDB from existing analyses")

    sub.add_parser("migrate", help="Force re-migration from catalog.json")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    store = CIStore()

    try:
        if args.command == "brands":
            brands = store.list_brands()
            if not brands:
                print("No monitored brands.")
                return
            print(f"Monitored Brands ({len(brands)}):\n")
            for b in brands:
                print(f"  {b['display_name']}")
                print(f"    Dir: {b['dir_name']} | Scans: {b['scan_count']} | "
                      f"Assets: {b['asset_count']} | Last: {(b.get('last_analyzed_at') or 'never')[:10]}")
                print()

        elif args.command == "status":
            b = store.get_brand(args.brand)
            if not b:
                print(f"Brand '{args.brand}' not found.")
                sys.exit(1)
            print(f"Brand: {b['display_name']}")
            print(f"  Dir: {b['dir_name']}")
            print(f"  First analyzed: {(b.get('first_analyzed_at') or 'unknown')[:10]}")
            print(f"  Last analyzed: {(b.get('last_analyzed_at') or 'unknown')[:10]}")
            print(f"  Scans: {b['scan_count']}")
            print(f"  Assets: {b['asset_count']} ({b['image_count']} images, {b['video_count']} videos)")
            print(f"  Drive: {'configured' if b.get('drive_statics_folder_id') else 'not configured'}")

        elif args.command == "scaling":
            alerts = store.get_scaling(args.brand, args.threshold)
            if not alerts:
                print(f"No scaling detected (threshold: {args.threshold})")
                return
            print(f"Scaling Alerts ({len(alerts)}):\n")
            for a in alerts:
                print(f"  #{a['current_rank']} ({a['type']}) — climbed {a['delta']} positions "
                      f"(#{a['previous_rank']} -> #{a['current_rank']})")

        elif args.command == "search":
            results = store.search_analyses(args.query, brand=args.brand, limit=args.limit)
            if not results:
                print("No results found.")
                return
            print(f"Search Results ({len(results)}):\n")
            for r in results:
                rel = f" (relevance: {r['relevance']})" if r.get("relevance") is not None else ""
                print(f"  [{r['brand']}] #{r.get('current_rank', '?')} ({r['type']}){rel}")
                summary = r.get("summary", "")
                if len(summary) > 120:
                    summary = summary[:120] + "..."
                print(f"    {summary}")
                print()

        elif args.command == "history":
            history = store.get_rank_history(args.hash)
            if not history:
                print(f"No rank history for {args.hash}")
                return
            print(f"Rank History for {args.hash} ({len(history)} entries):\n")
            for h in history:
                print(f"  #{h['rank']} — session: {h['session']} ({h['recorded_at'][:10]})")

        elif args.command == "backfill":
            store.backfill_chroma()

        elif args.command == "migrate":
            catalog_path = store._competitors_dir / "catalog.json"
            # Force re-migration by clearing data
            store._conn.execute("DELETE FROM rank_history")
            store._conn.execute("DELETE FROM analyses")
            store._conn.execute("DELETE FROM clones")
            store._conn.execute("DELETE FROM scans")
            store._conn.execute("DELETE FROM assets")
            store._conn.execute("DELETE FROM brands")
            store._conn.commit()
            count = _migrate_from_catalog(store._conn, catalog_path)
            print(f"Re-migrated {count} assets from catalog.json")

    finally:
        store.close()


if __name__ == "__main__":
    main()
