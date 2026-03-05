# /// script
# requires-python = ">=3.10"
# dependencies = ["google-genai>=1.0.0"]
# ///
"""Brand Asset Library — SQLite Catalog + Search.

Stores and searches brand product images, lifestyle photos, and other assets
for use as reference images in clone brief generation. Each profile gets its
own isolated SQLite database + local image directory.

Storage layout:
    ~/.openclaw[-profile]/workspace/brand/assets/
        brand_assets.db          <- SQLite (catalog + FTS5)
        images/
            crawled/             <- From website crawler
            uploaded/            <- Manually added
            generated/           <- AI-generated brand assets

Usage:
    from brand_asset_store import BrandAssetStore
    store = BrandAssetStore()
    store.add_asset("/path/to/image.jpg", "product-shot", "uploaded", product_name="Chocolate Shake")
    store.search("chocolate shake jar")
    store.find_for_clone(analysis_dict)

CLI:
    uv run brand_asset_store.py add --type product-shot --product "Chocolate Shake" /path/to/image.jpg
    uv run brand_asset_store.py search "chocolate shake"
    uv run brand_asset_store.py list --type product-shot
    uv run brand_asset_store.py stats
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import mimetypes
import os
import pathlib
import shutil
import sqlite3
import struct
import sys

# IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks
_script_dir = pathlib.Path(__file__).parent

# ---------------------------------------------------------------------------
# Profile detection (mirrors ci_store.py)
# ---------------------------------------------------------------------------

def _detect_profile_root() -> pathlib.Path:
    """Derive profile root from script location.

    Layout: ~/.openclaw[-profile]/skills/ad-library-dl/scripts/brand_asset_store.py
    Returns: ~/.openclaw[-profile]/
    """
    return _script_dir.parent.parent.parent


def _detect_profile_name() -> str:
    """Return profile name: 'cgk', 'rawdog', or 'vitahustle'."""
    root = _detect_profile_root()
    name = root.name
    if name == ".openclaw":
        return "cgk"
    elif name == ".openclaw-rawdog":
        return "rawdog"
    elif name == ".openclaw-vitahustle":
        return "vitahustle"
    return "unknown"


# ---------------------------------------------------------------------------
# SQLite schema
# ---------------------------------------------------------------------------

_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS brand_assets (
    asset_id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER,
    width INTEGER,
    height INTEGER,

    -- Classification
    asset_type TEXT NOT NULL,
    ownership TEXT NOT NULL DEFAULT 'ours',
    source TEXT NOT NULL,

    -- Crawl metadata
    source_url TEXT,
    source_page_url TEXT,
    source_page_title TEXT,

    -- Product metadata
    product_name TEXT,
    product_sku TEXT,
    collection TEXT,

    -- AI analysis
    analysis_json TEXT,
    analysis_summary TEXT,
    dominant_colors TEXT,
    subjects TEXT,

    -- Drive
    drive_file_id TEXT,

    -- Timestamps
    created_at TEXT NOT NULL,
    analyzed_at TEXT
);

CREATE TABLE IF NOT EXISTS asset_tags (
    asset_id TEXT NOT NULL REFERENCES brand_assets(asset_id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (asset_id, tag)
);

CREATE TABLE IF NOT EXISTS crawl_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    website_url TEXT NOT NULL,
    depth INTEGER,
    pages_visited INTEGER,
    images_found INTEGER,
    images_new INTEGER,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    product_id TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    product_url TEXT NOT NULL,
    price TEXT,
    price_cents INTEGER,
    description TEXT,
    hero_image_url TEXT,
    variants_json TEXT,
    collections TEXT,
    brand TEXT NOT NULL DEFAULT 'ours',
    source_url TEXT,
    scraped_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_type ON brand_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_product ON brand_assets(product_name);
CREATE INDEX IF NOT EXISTS idx_assets_ownership ON brand_assets(ownership);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON asset_tags(tag);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
"""

_FTS_SQL = """
CREATE VIRTUAL TABLE IF NOT EXISTS brand_assets_fts USING fts5(
    asset_id, analysis_summary, product_name,
    content=brand_assets, content_rowid=rowid
);
"""

_FTS_TRIGGERS = """
CREATE TRIGGER IF NOT EXISTS brand_assets_ai AFTER INSERT ON brand_assets BEGIN
    INSERT INTO brand_assets_fts(rowid, asset_id, analysis_summary, product_name)
    VALUES (new.rowid, new.asset_id, new.analysis_summary, new.product_name);
END;

CREATE TRIGGER IF NOT EXISTS brand_assets_ad AFTER DELETE ON brand_assets BEGIN
    INSERT INTO brand_assets_fts(brand_assets_fts, rowid, asset_id, analysis_summary, product_name)
    VALUES ('delete', old.rowid, old.asset_id, old.analysis_summary, old.product_name);
END;

CREATE TRIGGER IF NOT EXISTS brand_assets_au AFTER UPDATE ON brand_assets BEGIN
    INSERT INTO brand_assets_fts(brand_assets_fts, rowid, asset_id, analysis_summary, product_name)
    VALUES ('delete', old.rowid, old.asset_id, old.analysis_summary, old.product_name);
    INSERT INTO brand_assets_fts(rowid, asset_id, analysis_summary, product_name)
    VALUES (new.rowid, new.asset_id, new.analysis_summary, new.product_name);
END;
"""

# ---------------------------------------------------------------------------
# Valid asset types
# ---------------------------------------------------------------------------

ASSET_TYPES = {
    "product-shot", "lifestyle", "packaging", "logo-variant",
    "ugc", "texture", "model", "ingredient", "before-after",
    "hero", "flat-lay", "other",
}

# ---------------------------------------------------------------------------
# Gemini Flash analysis prompt
# ---------------------------------------------------------------------------

_ANALYSIS_PROMPT = """Analyze this brand image for asset cataloging. Return ONLY valid JSON, no markdown:
{
  "asset_type": "product-shot|lifestyle|packaging|logo-variant|ugc|texture|model|ingredient|before-after|hero|flat-lay|other",
  "subjects": ["list of objects/people/products in the image"],
  "dominant_colors": ["#hex1", "#hex2", "#hex3"],
  "composition": "layout and framing description",
  "product_name": "product shown (if identifiable) or null",
  "suggested_tags": ["5-10 searchable tags"],
  "ad_suitability": {"hero": 1, "product_inset": 1, "lifestyle": 1, "background": 1}
}

Score ad_suitability 1-5 for each role. Be specific about products visible."""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sha256_file(path: pathlib.Path) -> str:
    """Return SHA256 hex digest of file contents."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _image_dimensions(path: pathlib.Path) -> tuple[int | None, int | None]:
    """Read width/height from PNG/JPEG headers without extra deps."""
    try:
        with open(path, "rb") as f:
            header = f.read(32)
            # PNG
            if header[:8] == b"\x89PNG\r\n\x1a\n":
                w, h = struct.unpack(">II", header[16:24])
                return int(w), int(h)
            # JPEG
            if header[:2] == b"\xff\xd8":
                f.seek(0)
                f.read(2)
                while True:
                    marker = f.read(2)
                    if len(marker) < 2:
                        break
                    if marker[0] != 0xFF:
                        break
                    if marker[1] in (0xC0, 0xC1, 0xC2):
                        f.read(3)  # length + precision
                        h, w = struct.unpack(">HH", f.read(4))
                        return int(w), int(h)
                    else:
                        length_bytes = f.read(2)
                        if len(length_bytes) < 2:
                            break
                        length = struct.unpack(">H", length_bytes)[0]
                        f.seek(length - 2, 1)
            # WebP
            if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
                if header[12:16] == b"VP8 ":
                    # Lossy
                    f.seek(26)
                    data = f.read(4)
                    if len(data) >= 4:
                        w = struct.unpack("<H", data[0:2])[0] & 0x3FFF
                        h = struct.unpack("<H", data[2:4])[0] & 0x3FFF
                        return w, h
                elif header[12:16] == b"VP8L":
                    f.seek(21)
                    data = f.read(4)
                    if len(data) >= 4:
                        bits = struct.unpack("<I", data)[0]
                        w = (bits & 0x3FFF) + 1
                        h = ((bits >> 14) & 0x3FFF) + 1
                        return w, h
    except Exception:
        pass
    return None, None


def _retry(fn, max_retries=3, base_delay=5.0, label=""):
    """Run fn() with exponential backoff."""
    import time
    last_exc = None
    for attempt in range(1, max_retries + 1):
        try:
            return fn()
        except Exception as e:
            last_exc = e
            if attempt < max_retries:
                delay = base_delay * (2 ** (attempt - 1))
                tag = f" [{label}]" if label else ""
                print(f"    [retry{tag}] Attempt {attempt}/{max_retries} failed: {e} — retrying in {delay:.0f}s")
                time.sleep(delay)
    raise last_exc


def _analyze_image_with_gemini(file_path: pathlib.Path, model: str = "gemini-3-flash") -> dict | None:
    """Run Gemini Flash vision analysis on an image. Returns parsed JSON or None."""
    try:
        from google import genai
        from google.genai import types

        project = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0013158607")
        client = genai.Client(vertexai=True, project=project, location="global")

        mime = mimetypes.guess_type(str(file_path))[0] or "image/jpeg"
        image_bytes = file_path.read_bytes()

        response = _retry(
            lambda: client.models.generate_content(
                model=model,
                contents=[
                    types.Content(parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type=mime),
                        types.Part.from_text(text=_ANALYSIS_PROMPT),
                    ]),
                ],
            ),
            max_retries=3, base_delay=5.0, label="gemini-analyze",
        )

        text = response.text
        # Parse JSON — strip markdown fences if present
        if "```json" in text:
            start = text.find("```json") + 7
            end = text.find("```", start)
            if end > start:
                text = text[start:end].strip()
        elif "```" in text:
            start = text.find("```") + 3
            end = text.find("```", start)
            if end > start:
                text = text[start:end].strip()

        return json.loads(text)
    except Exception as e:
        print(f"    [analyze] Gemini analysis failed: {e}")
        return None


# ---------------------------------------------------------------------------
# BrandAssetStore
# ---------------------------------------------------------------------------

class BrandAssetStore:
    """SQLite-backed brand asset catalog with FTS5 search."""

    def __init__(self):
        self._profile_root = _detect_profile_root()
        self._profile_name = _detect_profile_name()

        self._assets_dir = self._profile_root / "workspace" / "brand" / "assets"
        self._images_dir = self._assets_dir / "images"
        self._db_path = self._assets_dir / "brand_assets.db"

        # Create directories on first use
        for subdir in ("crawled", "uploaded", "generated"):
            (self._images_dir / subdir).mkdir(parents=True, exist_ok=True)

        self._conn = self._init_db()

    def _init_db(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self._db_path))
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.executescript(_SCHEMA_SQL)
        conn.executescript(_FTS_SQL)
        conn.executescript(_FTS_TRIGGERS)
        conn.commit()

        # Migration: ensure products table exists (for DBs created before this column)
        try:
            conn.execute("SELECT product_id FROM products LIMIT 0")
        except sqlite3.OperationalError:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS products (
                    product_id TEXT PRIMARY KEY,
                    product_name TEXT NOT NULL,
                    product_url TEXT NOT NULL,
                    price TEXT,
                    price_cents INTEGER,
                    description TEXT,
                    hero_image_url TEXT,
                    variants_json TEXT,
                    collections TEXT,
                    brand TEXT NOT NULL DEFAULT 'ours',
                    source_url TEXT,
                    scraped_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
            """)
            conn.commit()

        return conn

    @property
    def profile_name(self) -> str:
        return self._profile_name

    @property
    def db_path(self) -> pathlib.Path:
        return self._db_path

    @property
    def images_dir(self) -> pathlib.Path:
        return self._images_dir

    # ----- Write operations -----

    def add_asset(
        self,
        file_path: str | pathlib.Path,
        asset_type: str,
        source: str,
        ownership: str = "ours",
        product_name: str | None = None,
        product_sku: str | None = None,
        collection: str | None = None,
        tags: list[str] | None = None,
        analysis: dict | None = None,
        source_url: str | None = None,
        source_page_url: str | None = None,
        source_page_title: str | None = None,
        auto_analyze: bool = True,
        copy_to_store: bool = True,
    ) -> str:
        """Add an image to the brand asset catalog.

        Returns the asset_id (SHA256 hash).
        """
        file_path = pathlib.Path(file_path).resolve()
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        if asset_type not in ASSET_TYPES:
            raise ValueError(f"Invalid asset_type '{asset_type}'. Valid: {sorted(ASSET_TYPES)}")
        if source not in ("crawled", "uploaded", "generated"):
            raise ValueError(f"Invalid source '{source}'. Valid: crawled, uploaded, generated")

        asset_id = _sha256_file(file_path)

        # Check if already cataloged
        existing = self._conn.execute(
            "SELECT asset_id FROM brand_assets WHERE asset_id = ?", (asset_id,)
        ).fetchone()
        if existing:
            print(f"    [skip] Already cataloged: {asset_id[:12]}")
            return asset_id

        # Copy file to store directory if not already there
        dest_path = file_path
        if copy_to_store:
            dest_dir = self._images_dir / source
            dest_path = dest_dir / file_path.name
            # Avoid name collision
            if dest_path.exists() and _sha256_file(dest_path) != asset_id:
                stem = file_path.stem
                suffix = file_path.suffix
                dest_path = dest_dir / f"{stem}_{asset_id[:8]}{suffix}"
            if not dest_path.exists():
                shutil.copy2(file_path, dest_path)

        # Relative path from workspace root
        try:
            rel_path = str(dest_path.relative_to(self._profile_root / "workspace"))
        except ValueError:
            rel_path = str(dest_path)

        mime_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
        file_size = file_path.stat().st_size
        width, height = _image_dimensions(file_path)
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Auto-analyze with Gemini if no analysis provided
        if analysis is None and auto_analyze:
            print(f"    [analyze] Running Gemini Flash on {file_path.name}...")
            analysis = _analyze_image_with_gemini(file_path)

        # Extract fields from analysis
        analysis_json = json.dumps(analysis) if analysis else None
        analysis_summary = None
        dominant_colors = None
        subjects = None

        if analysis:
            # Build summary from analysis fields
            parts = []
            if analysis.get("composition"):
                parts.append(analysis["composition"])
            if analysis.get("subjects"):
                parts.append(", ".join(analysis["subjects"]))
            if analysis.get("product_name"):
                parts.append(analysis["product_name"])
            analysis_summary = ". ".join(parts) if parts else None

            if analysis.get("dominant_colors"):
                dominant_colors = json.dumps(analysis["dominant_colors"])
            if analysis.get("subjects"):
                subjects = json.dumps(analysis["subjects"])

            # Use Gemini's suggested asset_type if user didn't override
            if analysis.get("asset_type") and analysis["asset_type"] in ASSET_TYPES:
                if asset_type == "other":
                    asset_type = analysis["asset_type"]

            # Use Gemini's product name if not provided
            if not product_name and analysis.get("product_name"):
                product_name = analysis["product_name"]

        self._conn.execute(
            """INSERT INTO brand_assets (
                asset_id, filename, file_path, mime_type, file_size, width, height,
                asset_type, ownership, source,
                source_url, source_page_url, source_page_title,
                product_name, product_sku, collection,
                analysis_json, analysis_summary, dominant_colors, subjects,
                created_at, analyzed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                asset_id, file_path.name, rel_path, mime_type, file_size, width, height,
                asset_type, ownership, source,
                source_url, source_page_url, source_page_title,
                product_name, product_sku, collection,
                analysis_json, analysis_summary, dominant_colors, subjects,
                now_iso, now_iso if analysis else None,
            ),
        )

        # Add tags
        all_tags = list(tags or [])
        if analysis and analysis.get("suggested_tags"):
            all_tags.extend(analysis["suggested_tags"])
        if all_tags:
            self.add_tags(asset_id, all_tags, _commit=False)

        self._conn.commit()
        print(f"    [added] {asset_id[:12]} — {asset_type} — {file_path.name}")
        return asset_id

    def add_tags(self, asset_id: str, tags: list[str], _commit: bool = True):
        """Add tags to an asset."""
        for tag in set(t.lower().strip() for t in tags if t.strip()):
            self._conn.execute(
                "INSERT OR IGNORE INTO asset_tags (asset_id, tag) VALUES (?, ?)",
                (asset_id, tag),
            )
        if _commit:
            self._conn.commit()

    def remove_tags(self, asset_id: str, tags: list[str]):
        """Remove tags from an asset."""
        for tag in tags:
            self._conn.execute(
                "DELETE FROM asset_tags WHERE asset_id = ? AND tag = ?",
                (asset_id, tag.lower().strip()),
            )
        self._conn.commit()

    def record_crawl(self, url: str, depth: int, pages: int, found: int, new: int) -> int:
        """Record a crawl session. Returns session ID."""
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        cur = self._conn.execute(
            """INSERT INTO crawl_sessions (website_url, depth, pages_visited,
               images_found, images_new, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (url, depth, pages, found, new, now_iso),
        )
        self._conn.commit()
        return cur.lastrowid

    # ----- Read operations -----

    def get_asset(self, asset_id: str) -> dict | None:
        """Get a single asset by ID."""
        row = self._conn.execute(
            "SELECT * FROM brand_assets WHERE asset_id = ?", (asset_id,)
        ).fetchone()
        if not row:
            return None
        asset = self._row_to_dict(row)
        asset["tags"] = self._get_tags(asset_id)
        return asset

    def search(self, query: str, limit: int = 20) -> list[dict]:
        """Full-text search across analysis summaries and product names.

        Falls back to LIKE-based product_name search when FTS returns no
        results (handles multi-word queries like "Face Moisturizer" where
        the DB only stores "Moisturizer").
        """
        rows = self._conn.execute(
            """SELECT ba.* FROM brand_assets ba
               JOIN brand_assets_fts fts ON ba.asset_id = fts.asset_id
               WHERE brand_assets_fts MATCH ?
               LIMIT ?""",
            (query, limit),
        ).fetchall()

        # FTS5 uses implicit AND — "Face Moisturizer" requires both tokens.
        # If zero results, try each word individually against product_name.
        if not rows:
            words = query.strip().split()
            for word in words:
                if len(word) < 3:
                    continue
                rows = self._conn.execute(
                    """SELECT * FROM brand_assets
                       WHERE product_name LIKE ?
                       LIMIT ?""",
                    (f"%{word}%", limit),
                ).fetchall()
                if rows:
                    break

        results = []
        for row in rows:
            asset = self._row_to_dict(row)
            asset["tags"] = self._get_tags(asset["asset_id"])
            results.append(asset)
        return results

    def find_by_type(
        self,
        asset_type: str,
        product_name: str | None = None,
        tags: list[str] | None = None,
        limit: int = 10,
    ) -> list[dict]:
        """Find assets by type, optionally filtered by product or tags."""
        conditions = ["asset_type = ?"]
        params: list = [asset_type]

        if product_name:
            conditions.append("product_name LIKE ?")
            params.append(f"%{product_name}%")

        query = f"SELECT * FROM brand_assets WHERE {' AND '.join(conditions)} LIMIT ?"
        params.append(limit)

        rows = self._conn.execute(query, params).fetchall()
        results = []
        for row in rows:
            asset = self._row_to_dict(row)
            asset["tags"] = self._get_tags(asset["asset_id"])
            results.append(asset)

        # Filter by tags if specified
        if tags:
            tag_set = {t.lower().strip() for t in tags}
            results = [
                a for a in results
                if tag_set & set(a.get("tags", []))
            ]

        return results

    def find_for_clone(self, analysis: dict) -> dict[str, list[dict]]:
        """Find brand assets suitable for a clone brief based on competitor analysis.

        Uses stored Gemini analysis on each brand asset (ad_suitability scores,
        subjects list) to intelligently match assets to what the competitor ad
        needs — not just keyword matching.

        Returns dict keyed by role: {"hero": [...], "product-inset": [...], ...}
        """
        # Load all our brand assets that have analysis data
        all_assets = self.list_assets(ownership="ours", limit=200)
        if not all_assets:
            return {}

        # Determine what the competitor ad needs based on its analysis
        comp_text = json.dumps(analysis).lower()
        comp_subjects = set()
        if isinstance(analysis.get("subjects"), list):
            comp_subjects = {s.lower() for s in analysis["subjects"]}
        elif isinstance(analysis.get("visual_elements"), list):
            comp_subjects = {s.lower() for s in analysis["visual_elements"]}

        # Determine which ad roles are relevant for this competitor ad
        # Roles map to the ad_suitability keys stored in brand asset analysis
        role_relevance: dict[str, float] = {}
        hero_kw = ["hero", "product", "packshot", "close-up", "center", "dominant", "jar", "bottle", "bag", "pouch"]
        inset_kw = ["inset", "corner", "small", "overlay", "badge", "secondary"]
        lifestyle_kw = ["lifestyle", "person", "model", "scene", "outdoor", "kitchen", "gym", "morning"]
        background_kw = ["background", "texture", "gradient", "pattern", "flat", "surface"]

        for kw in hero_kw:
            if kw in comp_text:
                role_relevance["hero"] = role_relevance.get("hero", 0) + 1
        for kw in inset_kw:
            if kw in comp_text:
                role_relevance["product_inset"] = role_relevance.get("product_inset", 0) + 1
        for kw in lifestyle_kw:
            if kw in comp_text:
                role_relevance["lifestyle"] = role_relevance.get("lifestyle", 0) + 1
        for kw in background_kw:
            if kw in comp_text:
                role_relevance["background"] = role_relevance.get("background", 0) + 1

        # Default: always look for hero product shots
        if not role_relevance:
            role_relevance["hero"] = 1.0

        # Score each brand asset
        scored: list[tuple[float, str, dict]] = []  # (score, best_role, asset)
        for asset in all_assets:
            asset_analysis = asset.get("analysis_json")
            if isinstance(asset_analysis, str):
                try:
                    asset_analysis = json.loads(asset_analysis)
                except (json.JSONDecodeError, TypeError):
                    asset_analysis = None

            if not asset_analysis or not isinstance(asset_analysis, dict):
                # No analysis — assign base score by asset_type heuristic
                base = 1.0 if asset.get("asset_type") == "product-shot" else 0.5
                scored.append((base, "hero", asset))
                continue

            suitability = asset_analysis.get("ad_suitability", {})
            asset_subjects = set()
            if isinstance(asset_analysis.get("subjects"), list):
                asset_subjects = {s.lower() for s in asset_analysis["subjects"]}

            # Score per role: suitability score (1-5) × role relevance weight
            best_score = 0.0
            best_role = "hero"
            for role, relevance in role_relevance.items():
                suit_score = suitability.get(role, 1)
                if not isinstance(suit_score, (int, float)):
                    suit_score = 1
                role_score = suit_score * relevance
                if role_score > best_score:
                    best_score = role_score
                    best_role = role

            # Subject overlap bonus: +2 per matching subject
            if comp_subjects and asset_subjects:
                overlap = comp_subjects & asset_subjects
                best_score += len(overlap) * 2.0

            # Product name bonus: if asset has a product name, mild boost
            if asset.get("product_name"):
                best_score += 0.5

            scored.append((best_score, best_role, asset))

        # Sort by score descending
        scored.sort(key=lambda x: x[0], reverse=True)

        # Group top results by their best role
        results: dict[str, list[dict]] = {}
        seen_ids: set[str] = set()
        for score, role, asset in scored:
            if score <= 0:
                continue
            aid = asset["asset_id"]
            if aid in seen_ids:
                continue
            seen_ids.add(aid)
            role_key = role.replace("_", "-")  # product_inset -> product-inset
            if role_key not in results:
                results[role_key] = []
            if len(results[role_key]) < 3:
                results[role_key].append(asset)
            # Stop once we have enough assets total
            if sum(len(v) for v in results.values()) >= 6:
                break

        # Always include product shots if we have them and nothing was found
        if not results:
            product_shots = self.find_by_type("product-shot", limit=3)
            if product_shots:
                results["product-shot"] = product_shots

        return results

    def list_assets(
        self,
        asset_type: str | None = None,
        source: str | None = None,
        ownership: str | None = None,
        limit: int = 50,
    ) -> list[dict]:
        """List assets with optional filters."""
        conditions = []
        params: list = []

        if asset_type:
            conditions.append("asset_type = ?")
            params.append(asset_type)
        if source:
            conditions.append("source = ?")
            params.append(source)
        if ownership:
            conditions.append("ownership = ?")
            params.append(ownership)

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        query = f"SELECT * FROM brand_assets {where} ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        rows = self._conn.execute(query, params).fetchall()
        results = []
        for row in rows:
            asset = self._row_to_dict(row)
            asset["tags"] = self._get_tags(asset["asset_id"])
            results.append(asset)
        return results

    def stats(self) -> dict:
        """Return catalog statistics."""
        total = self._conn.execute("SELECT COUNT(*) FROM brand_assets").fetchone()[0]
        by_type = dict(self._conn.execute(
            "SELECT asset_type, COUNT(*) FROM brand_assets GROUP BY asset_type"
        ).fetchall())
        by_source = dict(self._conn.execute(
            "SELECT source, COUNT(*) FROM brand_assets GROUP BY source"
        ).fetchall())
        total_tags = self._conn.execute("SELECT COUNT(DISTINCT tag) FROM asset_tags").fetchone()[0]
        crawls = self._conn.execute("SELECT COUNT(*) FROM crawl_sessions").fetchone()[0]
        last_crawl = self._conn.execute(
            "SELECT website_url, created_at FROM crawl_sessions ORDER BY id DESC LIMIT 1"
        ).fetchone()

        return {
            "profile": self._profile_name,
            "db_path": str(self._db_path),
            "total_assets": total,
            "by_type": by_type,
            "by_source": by_source,
            "unique_tags": total_tags,
            "crawl_sessions": crawls,
            "last_crawl": {
                "url": last_crawl[0],
                "at": last_crawl[1],
            } if last_crawl else None,
        }

    def list_products(self) -> list[str]:
        """Return distinct product names in the catalog."""
        rows = self._conn.execute(
            "SELECT DISTINCT product_name FROM brand_assets WHERE product_name IS NOT NULL ORDER BY product_name"
        ).fetchall()
        return [r[0] for r in rows]

    # ----- Product catalog operations -----

    def save_product(
        self,
        product_id: str,
        product_name: str,
        product_url: str,
        *,
        price: str | None = None,
        price_cents: int | None = None,
        description: str | None = None,
        hero_image_url: str | None = None,
        variants_json: str | None = None,
        collections: str | None = None,
        brand: str = "ours",
        source_url: str | None = None,
    ) -> None:
        """Insert or update a product in the products table."""
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self._conn.execute(
            """INSERT INTO products
               (product_id, product_name, product_url, price, price_cents,
                description, hero_image_url, variants_json, collections,
                brand, source_url, scraped_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(product_id) DO UPDATE SET
                   product_name = excluded.product_name,
                   product_url = excluded.product_url,
                   price = excluded.price,
                   price_cents = excluded.price_cents,
                   description = COALESCE(excluded.description, products.description),
                   hero_image_url = COALESCE(excluded.hero_image_url, products.hero_image_url),
                   variants_json = COALESCE(excluded.variants_json, products.variants_json),
                   collections = COALESCE(excluded.collections, products.collections),
                   scraped_at = excluded.scraped_at
            """,
            (
                product_id, product_name, product_url, price, price_cents,
                description, hero_image_url, variants_json, collections,
                brand, source_url, now_iso,
            ),
        )
        self._conn.commit()

    def list_products_detailed(self, brand: str | None = None) -> list[dict]:
        """Return full product dicts from the products table."""
        if brand:
            rows = self._conn.execute(
                "SELECT * FROM products WHERE brand = ? ORDER BY product_name", (brand,)
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT * FROM products ORDER BY product_name"
            ).fetchall()
        cols = [d[0] for d in self._conn.execute("SELECT * FROM products LIMIT 0").description]
        return [dict(zip(cols, r)) for r in rows]

    def get_product(self, product_id: str) -> dict | None:
        """Get a single product by ID."""
        row = self._conn.execute(
            "SELECT * FROM products WHERE product_id = ?", (product_id,)
        ).fetchone()
        if not row:
            return None
        cols = [d[0] for d in self._conn.execute("SELECT * FROM products LIMIT 0").description]
        return dict(zip(cols, row))

    # ----- Helpers -----

    def _row_to_dict(self, row) -> dict:
        """Convert a sqlite3.Row-like tuple to dict using column names."""
        cols = [d[0] for d in self._conn.execute("SELECT * FROM brand_assets LIMIT 0").description]
        d = dict(zip(cols, row))
        # Parse JSON fields
        for jf in ("analysis_json", "dominant_colors", "subjects"):
            if d.get(jf):
                try:
                    d[jf] = json.loads(d[jf])
                except (json.JSONDecodeError, TypeError):
                    pass
        return d

    def _get_tags(self, asset_id: str) -> list[str]:
        rows = self._conn.execute(
            "SELECT tag FROM asset_tags WHERE asset_id = ?", (asset_id,)
        ).fetchall()
        return [r[0] for r in rows]

    def absolute_path(self, asset: dict) -> pathlib.Path:
        """Resolve an asset's file_path to an absolute path."""
        fp = asset.get("file_path", "")
        p = pathlib.Path(fp)
        if p.is_absolute():
            return p
        return self._profile_root / "workspace" / fp

    # ----- Bulk import operations -----

    def import_from_product_images_json(
        self,
        json_path: str | pathlib.Path,
        auto_analyze: bool = True,
    ) -> dict:
        """Import images from a product-images.json file.

        Expected JSON format (array of product objects):
        [
            {
                "product": "Product Name",
                "url": "https://example.com/product",
                "images": ["relative/path/to/image1.jpg", ...]
            },
            ...
        ]

        Also supports flat format (dict mapping product name to image list):
        {
            "Product Name": ["path1.jpg", "path2.jpg"],
            ...
        }

        Image paths are resolved relative to the JSON file's parent directory.
        Deduplicates via SHA256 — already-cataloged images are skipped.

        Returns: {"imported": N, "skipped": N, "errors": N, "products_saved": N}
        """
        json_path = pathlib.Path(json_path).resolve()
        if not json_path.exists():
            raise FileNotFoundError(f"JSON file not found: {json_path}")

        base_dir = json_path.parent
        data = json.loads(json_path.read_text())

        # Normalize to list-of-dicts format
        # Handles:
        #   1. Array of objects: [{"product": "Name", "images": ["path1.jpg"]}]
        #   2. Flat dict: {"Name": ["path1.jpg"]}
        #   3. RAWDOG-style: {"slug": {"url": "...", "images": ["https://cdn..."], "count": N}}
        #   4. VitaHustle-style: {"products": {"slug": {"title": "...", "images": [{"url": "...", "filename": "..."}]}}}
        products: list[dict] = []

        # Unwrap nested "products" key if present
        if isinstance(data, dict) and "products" in data and isinstance(data["products"], dict):
            data = data["products"]

        if isinstance(data, list):
            products = data
        elif isinstance(data, dict):
            for name, value in data.items():
                if isinstance(value, list):
                    products.append({"product": name, "images": value})
                elif isinstance(value, dict):
                    # Normalize image objects to URL strings
                    raw_images = value.get("images", [])
                    normalized_images: list[str] = []
                    for img in raw_images:
                        if isinstance(img, str):
                            normalized_images.append(img)
                        elif isinstance(img, dict) and img.get("url"):
                            normalized_images.append(img["url"])
                    value = {**value, "images": normalized_images}
                    # Use title as product name if available
                    if "title" in value and "product" not in value:
                        value["product"] = value["title"]
                    products.append({**value, "product": value.get("product", name)})

        imported = 0
        skipped = 0
        errors = 0
        products_saved = 0

        for entry in products:
            product_name = entry.get("product") or entry.get("name") or entry.get("product_name")
            product_url = entry.get("url") or entry.get("product_url") or ""
            images = entry.get("images") or entry.get("image_paths") or []

            if isinstance(images, str):
                images = [images]

            # Save product to products table
            if product_name:
                product_id = hashlib.sha256(product_name.encode()).hexdigest()[:16]
                self.save_product(
                    product_id=product_id,
                    product_name=product_name,
                    product_url=product_url,
                    price=entry.get("price"),
                    description=entry.get("description"),
                    hero_image_url=entry.get("hero_image") or (images[0] if images else None),
                    brand="ours",
                )
                products_saved += 1

            # Determine local product directory (for CDN URL -> local file resolution)
            product_slug = entry.get("handle") or entry.get("product") or (name if isinstance(data, dict) else None)
            local_product_dir = base_dir / "product-images" / product_slug if product_slug else None
            # Flat product-images/ dir (VitaHustle-style: ||slug__filename.jpg)
            flat_product_dir = base_dir / "product-images"

            for img_ref in images:
                img_path: pathlib.Path | None = None

                if img_ref.startswith("http://") or img_ref.startswith("https://"):
                    # CDN URL — resolve to local file by matching filename
                    url_filename = pathlib.PurePosixPath(img_ref.split("?")[0]).name
                    if local_product_dir and local_product_dir.is_dir():
                        candidate = local_product_dir / url_filename
                        if candidate.exists():
                            img_path = candidate.resolve()
                    # Check base_dir directly
                    if img_path is None:
                        candidate = base_dir / url_filename
                        if candidate.exists():
                            img_path = candidate.resolve()
                    # Check flat ||slug__filename.jpg convention
                    if img_path is None and product_slug and flat_product_dir.is_dir():
                        candidate = flat_product_dir / f"||{product_slug}__{url_filename}"
                        if candidate.exists():
                            img_path = candidate.resolve()
                else:
                    img_path = pathlib.Path(img_ref)
                    if not img_path.is_absolute():
                        img_path = (base_dir / img_ref).resolve()

                    if not img_path.exists() and product_name:
                        # Try product-images/<product>/ convention
                        alt = base_dir / "product-images" / product_name / pathlib.Path(img_ref).name
                        if alt.exists():
                            img_path = alt.resolve()
                        else:
                            img_path = None

                if img_path is None or not img_path.exists():
                    print(f"    [skip] Image not found locally: {pathlib.Path(img_ref).name}")
                    errors += 1
                    continue

                # Check SHA256 for dedup
                sha = _sha256_file(img_path)
                existing = self._conn.execute(
                    "SELECT asset_id FROM brand_assets WHERE asset_id = ?", (sha,)
                ).fetchone()
                if existing:
                    skipped += 1
                    continue

                try:
                    self.add_asset(
                        img_path,
                        asset_type="product-shot",
                        source="uploaded",
                        ownership="ours",
                        product_name=product_name,
                        auto_analyze=auto_analyze,
                        copy_to_store=True,
                    )
                    imported += 1
                except Exception as e:
                    print(f"    [error] {img_path.name}: {e}")
                    errors += 1

        result = {
            "imported": imported,
            "skipped": skipped,
            "errors": errors,
            "products_saved": products_saved,
        }
        print(f"[import-json] Done: {imported} imported, {skipped} skipped, {errors} errors, {products_saved} products")
        return result

    def import_from_local_directory(
        self,
        dir_path: str | pathlib.Path,
        product_name: str | None = None,
        asset_type: str = "product-shot",
        auto_analyze: bool = True,
    ) -> dict:
        """Bulk-import images from a directory.

        If product_name is not provided, infers it from the directory name.
        Scans for jpg, jpeg, png, webp files. Deduplicates via SHA256.

        Returns: {"imported": N, "skipped": N, "errors": N}
        """
        dir_path = pathlib.Path(dir_path).resolve()
        if not dir_path.is_dir():
            raise NotADirectoryError(f"Not a directory: {dir_path}")

        if not product_name:
            product_name = dir_path.name.replace("-", " ").replace("_", " ").title()

        image_files: list[pathlib.Path] = []
        for ext in ("*.jpg", "*.jpeg", "*.png", "*.webp"):
            image_files.extend(sorted(dir_path.glob(ext)))
            image_files.extend(sorted(dir_path.glob(ext.upper())))
        # Deduplicate (case-insensitive systems)
        seen_paths: set[str] = set()
        unique_files: list[pathlib.Path] = []
        for f in image_files:
            key = str(f).lower()
            if key not in seen_paths:
                seen_paths.add(key)
                unique_files.append(f)
        image_files = unique_files

        if not image_files:
            print(f"[import-dir] No image files found in {dir_path}")
            return {"imported": 0, "skipped": 0, "errors": 0}

        print(f"[import-dir] Found {len(image_files)} images in {dir_path.name} (product: {product_name})")

        imported = 0
        skipped = 0
        errors = 0

        for img_path in image_files:
            sha = _sha256_file(img_path)
            existing = self._conn.execute(
                "SELECT asset_id FROM brand_assets WHERE asset_id = ?", (sha,)
            ).fetchone()
            if existing:
                skipped += 1
                continue

            try:
                self.add_asset(
                    img_path,
                    asset_type=asset_type,
                    source="uploaded",
                    ownership="ours",
                    product_name=product_name,
                    auto_analyze=auto_analyze,
                    copy_to_store=True,
                )
                imported += 1
            except Exception as e:
                print(f"    [error] {img_path.name}: {e}")
                errors += 1

        result = {"imported": imported, "skipped": skipped, "errors": errors}
        print(f"[import-dir] Done: {imported} imported, {skipped} skipped, {errors} errors")
        return result

    def catalog_health_check(self) -> dict:
        """Run a comprehensive health check on the brand asset catalog.

        Returns structured dict with:
        - counts: asset_count, product_count, by_type breakdown
        - warnings: list of issues found
        - suggestions: list of actionable recommendations
        - logo_found: bool
        - design_system_found: bool
        """
        workspace = self._profile_root / "workspace"
        brand_dir = workspace / "brand"

        # Counts
        asset_count = self._conn.execute("SELECT COUNT(*) FROM brand_assets").fetchone()[0]
        product_count = self._conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        asset_product_names = self._conn.execute(
            "SELECT COUNT(DISTINCT product_name) FROM brand_assets WHERE product_name IS NOT NULL"
        ).fetchone()[0]
        by_type = dict(self._conn.execute(
            "SELECT asset_type, COUNT(*) FROM brand_assets GROUP BY asset_type"
        ).fetchall())

        warnings: list[str] = []
        suggestions: list[str] = []

        # Check for empty catalog
        if asset_count == 0:
            warnings.append("Brand asset catalog is EMPTY — clone briefs will have no product images")
            suggestions.append("Run `brand_asset_store.py import-json <path>` or `brand_asset_store.py import-dir <dir>`")

        if product_count == 0:
            warnings.append("Products table is EMPTY — no product metadata for clone prompts")

        # Check for unimported product-images.json
        product_images_json = brand_dir / "product-images.json"
        if product_images_json.exists() and asset_count == 0:
            warnings.append(f"Found product-images.json at {product_images_json} but catalog is empty")
            suggestions.append(f"Run: uv run brand_asset_store.py import-json {product_images_json}")

        # Check for unimported product-images/ directory
        product_images_dir = brand_dir / "product-images"
        if product_images_dir.is_dir():
            subdirs = [d for d in product_images_dir.iterdir() if d.is_dir()]
            if subdirs and asset_count == 0:
                warnings.append(f"Found {len(subdirs)} product directories in product-images/ but catalog is empty")
                for sd in subdirs[:5]:
                    imgs = list(sd.glob("*.jpg")) + list(sd.glob("*.png")) + list(sd.glob("*.webp"))
                    if imgs:
                        suggestions.append(f"Run: uv run brand_asset_store.py import-dir {sd}")

        # Check logo
        logo_found = False
        logo_paths = [
            brand_dir / "logo.png",
            brand_dir / "logo.svg",
            brand_dir / "logo.jpg",
            brand_dir / "assets" / "images" / "uploaded" / "logo.png",
        ]
        for lp in logo_paths:
            if lp.exists():
                logo_found = True
                break
        # Also check DB for logo-variant assets
        logo_assets = self._conn.execute(
            "SELECT COUNT(*) FROM brand_assets WHERE asset_type = 'logo-variant'"
        ).fetchone()[0]
        if logo_assets > 0:
            logo_found = True

        if not logo_found:
            warnings.append("No logo found — clone ads will lack brand identity")
            suggestions.append("Add logo.png to workspace/brand/ or import with type 'logo-variant'")

        # Check DESIGN-SYSTEM.md
        design_system_found = False
        ds_path = workspace / "DESIGN-SYSTEM.md"
        if ds_path.exists():
            content = ds_path.read_text()
            if len(content) > 100 and "{{" not in content[:200]:
                design_system_found = True
            else:
                warnings.append("DESIGN-SYSTEM.md exists but appears to be a template placeholder")
        else:
            warnings.append("No DESIGN-SYSTEM.md found — brand context will be limited")

        # Check colors.md
        colors_path = brand_dir / "colors.md"
        if not colors_path.exists():
            suggestions.append("Create workspace/brand/colors.md with brand color palette")

        return {
            "profile": self._profile_name,
            "asset_count": asset_count,
            "product_count": product_count,
            "asset_product_names": asset_product_names,
            "by_type": by_type,
            "logo_found": logo_found,
            "design_system_found": design_system_found,
            "warnings": warnings,
            "suggestions": suggestions,
        }

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()

    def close(self):
        self._conn.close()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _cmd_add(args):
    """Add image(s) to the brand asset catalog."""
    store = BrandAssetStore()
    paths = []
    for p in args.files:
        path = pathlib.Path(p)
        if path.is_dir():
            for ext in ("*.jpg", "*.jpeg", "*.png", "*.webp", "*.gif"):
                paths.extend(sorted(path.glob(ext)))
                paths.extend(sorted(path.glob(ext.upper())))
        elif path.is_file():
            paths.append(path)
        else:
            print(f"[warn] Not found: {p}")

    if not paths:
        print("[error] No valid image files found.")
        sys.exit(1)

    tags = [t.strip() for t in args.tags.split(",")] if args.tags else None

    print(f"[add] Processing {len(paths)} file(s)...")
    added = 0
    for fp in paths:
        try:
            store.add_asset(
                fp,
                asset_type=args.type,
                source=args.source,
                ownership=args.ownership,
                product_name=args.product,
                collection=args.collection,
                tags=tags,
                auto_analyze=not args.no_analyze,
            )
            added += 1
        except Exception as e:
            print(f"  [error] {fp.name}: {e}")

    print(f"\n[done] Added {added}/{len(paths)} assets to {store.profile_name} catalog")
    store.close()


def _cmd_search(args):
    """Search the brand asset catalog."""
    store = BrandAssetStore()
    results = store.search(args.query, limit=args.limit)
    if not results:
        print(f"[search] No results for '{args.query}'")
        store.close()
        return

    print(f"[search] {len(results)} result(s) for '{args.query}':\n")
    for a in results:
        tags = ", ".join(a.get("tags", [])[:5])
        print(f"  {a['asset_id'][:12]}  {a['asset_type']:14s}  {a.get('product_name') or '—':20s}  [{tags}]")
        print(f"    {a['file_path']}")
    store.close()


def _cmd_list(args):
    """List assets with optional filters."""
    store = BrandAssetStore()
    results = store.list_assets(
        asset_type=args.type,
        source=args.source,
        ownership=args.ownership,
        limit=args.limit,
    )
    if not results:
        print("[list] No assets found with given filters.")
        store.close()
        return

    print(f"[list] {len(results)} asset(s):\n")
    for a in results:
        tags = ", ".join(a.get("tags", [])[:5])
        dims = f"{a.get('width', '?')}x{a.get('height', '?')}"
        print(f"  {a['asset_id'][:12]}  {a['asset_type']:14s}  {dims:11s}  {a.get('product_name') or '—':20s}  [{tags}]")
    store.close()


def _cmd_stats(args):
    """Show catalog statistics."""
    store = BrandAssetStore()
    s = store.stats()
    print(f"Profile:       {s['profile']}")
    print(f"DB path:       {s['db_path']}")
    print(f"Total assets:  {s['total_assets']}")
    print(f"Unique tags:   {s['unique_tags']}")
    print(f"Crawl sessions:{s['crawl_sessions']}")
    if s["by_type"]:
        print("\nBy type:")
        for t, c in sorted(s["by_type"].items()):
            print(f"  {t:16s} {c}")
    if s["by_source"]:
        print("\nBy source:")
        for src, c in sorted(s["by_source"].items()):
            print(f"  {src:16s} {c}")
    if s["last_crawl"]:
        print(f"\nLast crawl:    {s['last_crawl']['url']} ({s['last_crawl']['at']})")
    store.close()


def _cmd_import_json(args):
    """Import images from a product-images.json file."""
    store = BrandAssetStore()
    result = store.import_from_product_images_json(
        args.json_file,
        auto_analyze=not args.no_analyze,
    )
    store.close()
    if result["errors"] > 0:
        sys.exit(1)


def _cmd_import_dir(args):
    """Import images from a local directory."""
    store = BrandAssetStore()
    result = store.import_from_local_directory(
        args.directory,
        product_name=args.product,
        asset_type=args.type,
        auto_analyze=not args.no_analyze,
    )
    store.close()
    if result["errors"] > 0:
        sys.exit(1)


def _cmd_health(args):
    """Run catalog health check."""
    store = BrandAssetStore()
    health = store.catalog_health_check()
    store.close()

    print(f"=== Brand Asset Health Check ({health['profile']}) ===\n")
    print(f"  Assets:     {health['asset_count']}")
    print(f"  Products:   {health['product_count']}")
    print(f"  Logo:       {'[OK]' if health['logo_found'] else '[WARN] Not found'}")
    print(f"  Design sys: {'[OK]' if health['design_system_found'] else '[WARN] Missing/incomplete'}")

    if health["by_type"]:
        print(f"\n  By type:")
        for t, c in sorted(health["by_type"].items()):
            print(f"    {t:16s} {c}")

    if health["warnings"]:
        print(f"\n  Warnings:")
        for w in health["warnings"]:
            print(f"    [WARN] {w}")

    if health["suggestions"]:
        print(f"\n  Suggestions:")
        for s in health["suggestions"]:
            print(f"    -> {s}")

    if not health["warnings"]:
        print(f"\n  [OK] Catalog is healthy")

    # Output JSON for machine consumption if --json flag
    if args.json_output:
        print(f"\n{json.dumps(health, indent=2)}")


def main():
    parser = argparse.ArgumentParser(description="Brand Asset Library — catalog & search")
    sub = parser.add_subparsers(dest="command", required=True)

    # add
    p_add = sub.add_parser("add", help="Add images to the catalog")
    p_add.add_argument("files", nargs="+", help="Image files or directories")
    p_add.add_argument("--type", default="other",
                       choices=sorted(ASSET_TYPES),
                       help="Asset type (default: other, auto-detected by Gemini)")
    p_add.add_argument("--source", default="uploaded", choices=["crawled", "uploaded", "generated"])
    p_add.add_argument("--ownership", default="ours", choices=["ours", "competitor"])
    p_add.add_argument("--product", help="Product name")
    p_add.add_argument("--collection", help="Collection name")
    p_add.add_argument("--tags", help="Comma-separated tags")
    p_add.add_argument("--no-analyze", action="store_true", help="Skip Gemini analysis")

    # search
    p_search = sub.add_parser("search", help="Search brand assets (FTS)")
    p_search.add_argument("query", help="Search query")
    p_search.add_argument("--limit", type=int, default=20)

    # list
    p_list = sub.add_parser("list", help="List assets with filters")
    p_list.add_argument("--type", choices=sorted(ASSET_TYPES))
    p_list.add_argument("--source", choices=["crawled", "uploaded", "generated"])
    p_list.add_argument("--ownership", choices=["ours", "competitor"])
    p_list.add_argument("--limit", type=int, default=50)

    # stats
    sub.add_parser("stats", help="Show catalog statistics")

    # import-json
    p_import_json = sub.add_parser("import-json", help="Import from product-images.json")
    p_import_json.add_argument("json_file", help="Path to product-images.json")
    p_import_json.add_argument("--no-analyze", action="store_true", help="Skip Gemini analysis")

    # import-dir
    p_import_dir = sub.add_parser("import-dir", help="Import images from a directory")
    p_import_dir.add_argument("directory", help="Directory containing images")
    p_import_dir.add_argument("--product", help="Product name (default: inferred from dir name)")
    p_import_dir.add_argument("--type", default="product-shot",
                              choices=sorted(ASSET_TYPES),
                              help="Asset type (default: product-shot)")
    p_import_dir.add_argument("--no-analyze", action="store_true", help="Skip Gemini analysis")

    # health
    p_health = sub.add_parser("health", help="Run catalog health check")
    p_health.add_argument("--json", dest="json_output", action="store_true",
                          help="Also output JSON for machine consumption")

    args = parser.parse_args()

    if args.command == "add":
        _cmd_add(args)
    elif args.command == "search":
        _cmd_search(args)
    elif args.command == "list":
        _cmd_list(args)
    elif args.command == "stats":
        _cmd_stats(args)
    elif args.command == "import-json":
        _cmd_import_json(args)
    elif args.command == "import-dir":
        _cmd_import_dir(args)
    elif args.command == "health":
        _cmd_health(args)


if __name__ == "__main__":
    main()
