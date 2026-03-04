"""
catalog_store.py — Persistent catalog store with indexing and search.

Provides:
  - CatalogStore: manages catalog CRUD, indexing, search
  - Master catalog: one per profile, accumulates all footage
  - TTL-based local file caching with pinning for non-re-downloadable sources
  - Auto-migrates legacy catalog files from .video-sessions/ and media/

Storage layout:
  <profile_root>/workspace/.video-catalogs/
    _index.json                           # Master index (v2)
    _index.lock/                          # mkdir-based exclusive lock
    _pending/                             # Deferred catalog entries
    master/
      catalog.json                        # Master catalog
      meta.json
    <catalog_id>/
      catalog.json                        # Full catalog data (clips + segments)
      meta.json                           # Lightweight metadata
"""

import hashlib
import json
import os
import re
import shutil
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

# Lock constants
LOCK_TIMEOUT = 10   # seconds
LOCK_STALE = 60     # seconds — auto-break stale locks

# Source types that are pinned (no TTL expiration)
PINNED_SOURCE_TYPES = frozenset({"social", "inbound", "veo"})

# Source types that are always re-downloadable from remote storage
REDOWNLOADABLE_SOURCE_TYPES = frozenset({"gdrive", "stock", "local", "dam"})

# Default TTL: 30 days
DEFAULT_TTL_SECONDS = 30 * 24 * 3600

# Valid video extensions for sanitization
_VIDEO_EXTENSIONS = frozenset({".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"})


def sanitize_filename(name: str, max_length: int = 60) -> str:
    """Sanitize a filename for safe catalog storage and shell usage.

    - Replaces special characters (apostrophes, !, ?, etc.) with hyphens
    - Collapses repeated separators
    - Truncates to max_length (preserving extension + hash suffix for uniqueness)
    - Preserves original extension if it's a known video format

    Examples:
        "our bedskirt is going like wildfire- it's THAT simple!!!.mp4"
        → "our-bedskirt-is-going-like-wildfire-it-s-THAT-simple-a1b2c3.mp4"

        "product-pour.mp4" → "product-pour.mp4" (already clean, unchanged)
    """
    stem = Path(name).stem
    ext = Path(name).suffix.lower()
    if ext not in _VIDEO_EXTENSIONS:
        ext = ".mp4"

    # Replace non-safe chars with hyphens (keep alphanum, hyphens, underscores)
    clean = re.sub(r'[^a-zA-Z0-9_-]', '-', stem)
    # Collapse repeated hyphens/underscores
    clean = re.sub(r'[-_]{2,}', '-', clean)
    # Strip leading/trailing separators
    clean = clean.strip('-_')

    if not clean:
        clean = "clip"

    # Truncate if needed, preserving uniqueness via hash of original
    max_stem = max_length - len(ext)
    if len(clean) > max_stem:
        hash_suffix = hashlib.sha256(stem.encode()).hexdigest()[:6]
        clean = clean[:max_stem - 7] + '-' + hash_suffix

    return clean + ext


class CatalogStore:
    """Manages the catalog store at <profile_root>/workspace/.video-catalogs/"""

    def __init__(self, profile_root: str):
        self.root = Path(profile_root) / "workspace" / ".video-catalogs"
        self._index = None  # lazy-loaded

    @property
    def index_path(self) -> Path:
        return self.root / "_index.json"

    # --- Locking (mkdir-based, works across Docker/host boundary) ---

    def _lock_path(self) -> Path:
        return self.root / "_index.lock"

    def _acquire_lock(self):
        """Acquire exclusive lock via atomic mkdir. Blocks up to LOCK_TIMEOUT."""
        lock = self._lock_path()
        self.root.mkdir(parents=True, exist_ok=True)
        deadline = time.monotonic() + LOCK_TIMEOUT
        while True:
            try:
                os.mkdir(lock)
                # Write PID for stale lock detection
                try:
                    (lock / "pid").write_text(str(os.getpid()))
                except OSError:
                    pass
                return
            except FileExistsError:
                # Check for stale lock
                try:
                    mtime = lock.stat().st_mtime
                    if time.time() - mtime > LOCK_STALE:
                        shutil.rmtree(str(lock), ignore_errors=True)
                        continue
                except OSError:
                    pass
                if time.monotonic() > deadline:
                    raise TimeoutError(f"Catalog lock held >10s: {lock}")
                time.sleep(0.05)

    def _release_lock(self):
        """Release lock by removing the lock directory."""
        shutil.rmtree(str(self._lock_path()), ignore_errors=True)
        self._index = None  # Invalidate cache after release

    @contextmanager
    def _locked(self):
        """Context manager for exclusive catalog access."""
        self._acquire_lock()
        try:
            self._index = None  # Force re-read inside lock
            yield
        finally:
            self._release_lock()

    # --- Index Management ---

    def _load_index(self) -> dict:
        """Load or initialize the master index. Auto-migrates v1 to v2."""
        if self._index is not None:
            return self._index

        self.root.mkdir(parents=True, exist_ok=True)

        if self.index_path.exists():
            try:
                self._index = json.loads(self.index_path.read_text())
            except (json.JSONDecodeError, OSError):
                self._index = self._empty_index()
        else:
            self._index = self._empty_index()

        # Auto-migrate v1 -> v2
        if self._index.get("version", 1) < 2:
            self._migrate_v1_to_v2()

        return self._index

    def _empty_index(self) -> dict:
        return {
            "version": 2,
            "updated": datetime.now(timezone.utc).isoformat(),
            "master_catalog_id": None,
            "catalog_count": 0,
            "total_clips": 0,
            "total_segments": 0,
            "catalogs": {},
            "clip_lookup": {},
            "clip_ttl": {},
            "search_index": {
                "subjects": {},
                "mood": {},
                "camera": {},
                "text_overlay_severity": {},
            },
            "clip_captions": {},
        }

    def _migrate_v1_to_v2(self):
        """Migrate v1 index to v2: rebuild clean index, initialize clip_ttl, detect master."""
        # Look for CGK legacy master catalog
        for cat_dir in sorted(self.root.iterdir()):
            if not cat_dir.is_dir() or cat_dir.name.startswith("_"):
                continue
            if "master" in cat_dir.name.lower():
                # Migrate to deterministic "master" ID
                master_dir = self.root / "master"
                if not master_dir.exists() and cat_dir.name != "master":
                    # Copy catalog, update ID, delete original
                    shutil.copytree(str(cat_dir), str(master_dir))
                    catalog_file = master_dir / "catalog.json"
                    if catalog_file.exists():
                        try:
                            cat = json.loads(catalog_file.read_text())
                            cat["catalog_id"] = "master"
                            tmp = catalog_file.with_suffix(".tmp")
                            with open(tmp, "w") as f:
                                json.dump(cat, f, indent=2)
                            os.replace(str(tmp), str(catalog_file))
                        except (json.JSONDecodeError, OSError):
                            pass
                    # Remove original
                    shutil.rmtree(str(cat_dir), ignore_errors=True)
                break

        # Full rebuild from disk
        self._rebuild_index()

        # Initialize clip_ttl from existing clip entries
        idx = self._index
        for cat_id, _meta in list(idx.get("catalogs", {}).items()):
            catalog = self._load_catalog_from_disk(cat_id)
            if not catalog:
                continue
            for clip in catalog.get("clips", []):
                fname = clip.get("filename", "")
                if not fname:
                    continue
                if fname not in idx["clip_ttl"]:
                    source_meta = _extract_source_meta(clip)
                    idx["clip_ttl"][fname] = {
                        "last_used": catalog.get("updated", datetime.now(timezone.utc).isoformat()),
                        "pinned": source_meta.get("source_type") in PINNED_SOURCE_TYPES,
                        "source": source_meta,
                    }

        # Set master_catalog_id if master exists
        if (self.root / "master" / "catalog.json").exists():
            idx["master_catalog_id"] = "master"

        idx["version"] = 2
        self._save_index()

    def _load_catalog_from_disk(self, catalog_id: str) -> dict | None:
        """Load catalog.json directly from disk (no index needed)."""
        catalog_file = self.root / catalog_id / "catalog.json"
        if not catalog_file.exists():
            return None
        try:
            return json.loads(catalog_file.read_text())
        except (json.JSONDecodeError, OSError):
            return None

    def _save_index(self):
        """Atomic write of index to disk (tempfile + os.replace)."""
        if self._index is None:
            return

        self._index["updated"] = datetime.now(timezone.utc).isoformat()
        self._index["catalog_count"] = len(self._index.get("catalogs", {}))

        total_clips = 0
        total_segments = 0
        for meta in self._index.get("catalogs", {}).values():
            total_clips += meta.get("clip_count", 0)
            total_segments += meta.get("segment_count", 0)
        self._index["total_clips"] = total_clips
        self._index["total_segments"] = total_segments

        self.root.mkdir(parents=True, exist_ok=True)
        tmp = self.index_path.with_suffix(".tmp")
        with open(tmp, "w") as f:
            json.dump(self._index, f, indent=2)
        os.replace(str(tmp), str(self.index_path))

    def _rebuild_index(self):
        """Full index rebuild from all catalog.json files on disk."""
        self._index = self._empty_index()

        if not self.root.exists():
            self._save_index()
            return

        for cat_dir in sorted(self.root.iterdir()):
            if not cat_dir.is_dir() or cat_dir.name.startswith("_"):
                continue
            catalog_file = cat_dir / "catalog.json"
            if not catalog_file.exists():
                continue
            try:
                catalog = json.loads(catalog_file.read_text())
                catalog_id = catalog.get("catalog_id", cat_dir.name)
                self._index_catalog(catalog_id, catalog)
            except (json.JSONDecodeError, OSError):
                continue

        self._save_index()

    # --- Catalog CRUD ---

    def create_catalog(
        self,
        source: str,
        name: str = "",
        tags: list[str] | None = None,
        catalog_id: str | None = None,
    ) -> str:
        """Create a new empty catalog. Returns catalog_id."""
        now = datetime.now(timezone.utc)

        if not catalog_id:
            import random
            import string
            suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
            catalog_id = f"cat-{now.strftime('%Y%m%d-%H%M%S')}-{suffix}"

        if not name:
            name = self._auto_name(source)

        catalog = {
            "catalog_id": catalog_id,
            "version": 2,
            "name": name,
            "source": source,
            "created": now.isoformat(),
            "updated": now.isoformat(),
            "clip_count": 0,
            "total_duration": 0,
            "tags": tags or [],
            "clips": [],
        }

        self.save_catalog(catalog)
        return catalog_id

    def get_or_create_master(
        self,
        name: str = "Master Catalog",
        tags: list[str] | None = None,
    ) -> dict:
        """Get or create the master catalog. Returns the catalog dict."""
        with self._locked():
            idx = self._load_index()
            master_id = idx.get("master_catalog_id")

            if master_id:
                catalog = self._load_catalog_from_disk(master_id)
                if catalog:
                    return catalog

            # Create master catalog with deterministic ID
            now = datetime.now(timezone.utc)
            catalog = {
                "catalog_id": "master",
                "version": 2,
                "name": name,
                "source": "master",
                "created": now.isoformat(),
                "updated": now.isoformat(),
                "clip_count": 0,
                "total_duration": 0,
                "tags": tags or ["master"],
                "clips": [],
            }

            # Write catalog.json directly (avoid re-acquiring lock via save_catalog)
            cat_dir = self.root / "master"
            cat_dir.mkdir(parents=True, exist_ok=True)

            catalog_file = cat_dir / "catalog.json"
            tmp = catalog_file.with_suffix(".tmp")
            with open(tmp, "w") as f:
                json.dump(catalog, f, indent=2)
            os.replace(str(tmp), str(catalog_file))

            # Write meta.json
            meta = {
                "catalog_id": "master",
                "name": name,
                "source": "master",
                "created": catalog["created"],
                "clip_count": 0,
                "segment_count": 0,
                "total_duration": 0,
                "tags": catalog["tags"],
            }
            meta_file = cat_dir / "meta.json"
            tmp = meta_file.with_suffix(".tmp")
            with open(tmp, "w") as f:
                json.dump(meta, f, indent=2)
            os.replace(str(tmp), str(meta_file))

            # Update index
            idx["master_catalog_id"] = "master"
            self._index_catalog("master", catalog)
            self._save_index()

            return catalog

    def get_catalog(self, catalog_id: str) -> dict | None:
        """Load full catalog data from disk. Returns None if not found."""
        return self._load_catalog_from_disk(catalog_id)

    def get_catalog_meta(self, catalog_id: str) -> dict | None:
        """Load lightweight metadata only."""
        idx = self._load_index()
        return idx.get("catalogs", {}).get(catalog_id)

    def save_catalog(self, catalog: dict):
        """Save catalog data + meta + update index atomically."""
        with self._locked():
            self._save_catalog_unlocked(catalog)

    def _save_catalog_unlocked(self, catalog: dict):
        """Save catalog without acquiring lock (caller must hold lock)."""
        catalog_id = catalog["catalog_id"]
        catalog["updated"] = datetime.now(timezone.utc).isoformat()
        catalog["clip_count"] = len(catalog.get("clips", []))
        catalog["total_duration"] = sum(
            c.get("duration", 0) for c in catalog.get("clips", [])
        )

        # Count segments
        seg_count = sum(
            len(c.get("segments", [])) for c in catalog.get("clips", [])
        )

        # Write catalog.json
        cat_dir = self.root / catalog_id
        cat_dir.mkdir(parents=True, exist_ok=True)

        catalog_file = cat_dir / "catalog.json"
        tmp = catalog_file.with_suffix(".tmp")
        with open(tmp, "w") as f:
            json.dump(catalog, f, indent=2)
        os.replace(str(tmp), str(catalog_file))

        # Write meta.json
        meta = {
            "catalog_id": catalog_id,
            "name": catalog.get("name", ""),
            "source": catalog.get("source", ""),
            "created": catalog.get("created", ""),
            "clip_count": catalog["clip_count"],
            "segment_count": seg_count,
            "total_duration": catalog["total_duration"],
            "tags": catalog.get("tags", []),
        }
        meta_file = cat_dir / "meta.json"
        tmp = meta_file.with_suffix(".tmp")
        with open(tmp, "w") as f:
            json.dump(meta, f, indent=2)
        os.replace(str(tmp), str(meta_file))

        # Update index
        idx = self._load_index()
        self._remove_catalog_from_index(catalog_id)
        self._index_catalog(catalog_id, catalog)
        self._save_index()

        return str(catalog_file)

    def delete_catalog(self, catalog_id: str) -> bool:
        """Remove catalog directory and all index entries."""
        with self._locked():
            cat_dir = self.root / catalog_id
            if not cat_dir.exists():
                return False

            shutil.rmtree(str(cat_dir), ignore_errors=True)

            idx = self._load_index()
            self._remove_catalog_from_index(catalog_id)

            # Clean clip_ttl entries for deleted catalog
            lookup = idx.get("clip_lookup", {})
            ttl = idx.get("clip_ttl", {})
            to_remove = [k for k, v in lookup.items() if v == catalog_id]
            for k in to_remove:
                ttl.pop(k, None)

            if idx.get("master_catalog_id") == catalog_id:
                idx["master_catalog_id"] = None

            self._save_index()
            return True

    def rename_catalog(self, catalog_id: str, new_name: str) -> bool:
        """Update catalog name in catalog.json, meta.json, and index."""
        with self._locked():
            catalog = self._load_catalog_from_disk(catalog_id)
            if catalog is None:
                return False
            catalog["name"] = new_name
            self._save_catalog_unlocked(catalog)
            return True

    def tag_catalog(self, catalog_id: str, tags: list[str]) -> bool:
        """Set/replace tags on a catalog."""
        with self._locked():
            catalog = self._load_catalog_from_disk(catalog_id)
            if catalog is None:
                return False
            catalog["tags"] = tags
            self._save_catalog_unlocked(catalog)
            return True

    # --- Clip Management ---

    def add_clips_to_catalog(
        self,
        catalog_id: str,
        new_clips: list[dict],
    ) -> int:
        """Add new clips to an existing catalog. Skips duplicates by filename.
        Returns count of clips actually added."""
        with self._locked():
            catalog = self._load_catalog_from_disk(catalog_id)
            if catalog is None:
                return 0

            existing = {c["filename"] for c in catalog.get("clips", [])}
            added = 0
            for clip in new_clips:
                if clip.get("filename") not in existing:
                    catalog["clips"].append(clip)
                    existing.add(clip["filename"])
                    added += 1

            if added > 0:
                self._save_catalog_unlocked(catalog)

            return added

    def resolve_clip(self, filename: str) -> tuple[str, dict] | None:
        """Resolve a clip filename to (catalog_id, clip_dict).
        O(1) via clip_lookup in index, with sanitized-name fallback.
        Returns None if not found."""
        idx = self._load_index()
        clip_lookup = idx.get("clip_lookup", {})

        catalog_id = clip_lookup.get(filename)
        if not catalog_id:
            # Try just the basename
            basename = Path(filename).name
            catalog_id = clip_lookup.get(basename)
        if not catalog_id:
            # Fallback: try sanitized form
            clean = sanitize_filename(filename)
            catalog_id = clip_lookup.get(clean)
        if not catalog_id:
            # Reverse fallback: key is raw but we're searching with sanitized
            clean = sanitize_filename(filename)
            for raw_key, cat_id in clip_lookup.items():
                if sanitize_filename(raw_key) == clean:
                    catalog_id = cat_id
                    filename = raw_key
                    break
        if not catalog_id:
            return None

        catalog = self._load_catalog_from_disk(catalog_id)
        if not catalog:
            return None

        clean_filename = sanitize_filename(filename)
        for clip in catalog.get("clips", []):
            cf = clip.get("filename", "")
            if cf == filename or cf == Path(filename).name or sanitize_filename(cf) == clean_filename:
                return (catalog_id, clip)

        return None

    # --- TTL Tracking ---

    def touch_clip(self, filename: str):
        """Update last_used timestamp for a clip."""
        with self._locked():
            idx = self._load_index()
            ttl = idx.setdefault("clip_ttl", {})
            entry = ttl.setdefault(filename, {})
            entry["last_used"] = datetime.now(timezone.utc).isoformat()
            self._save_index()

    def touch_clips_batch(self, filenames: list[str]):
        """Update last_used for multiple clips in one lock cycle."""
        if not filenames:
            return
        with self._locked():
            idx = self._load_index()
            ttl = idx.setdefault("clip_ttl", {})
            now = datetime.now(timezone.utc).isoformat()
            for fname in filenames:
                entry = ttl.setdefault(fname, {})
                entry["last_used"] = now
            self._save_index()

    def set_clip_source(self, filename: str, source_meta: dict):
        """Store source metadata in clip_ttl. Auto-pins social/inbound/veo."""
        with self._locked():
            idx = self._load_index()
            ttl = idx.setdefault("clip_ttl", {})
            entry = ttl.setdefault(filename, {})
            entry["source"] = source_meta
            entry["last_used"] = datetime.now(timezone.utc).isoformat()
            entry["pinned"] = source_meta.get("source_type") in PINNED_SOURCE_TYPES

            # Also update the catalog entry if it exists
            catalog_id = idx.get("clip_lookup", {}).get(filename)
            if catalog_id:
                catalog = self._load_catalog_from_disk(catalog_id)
                if catalog:
                    for clip in catalog.get("clips", []):
                        if clip.get("filename") == filename:
                            clip["source_type"] = source_meta.get("source_type", "")
                            clip["source_url"] = source_meta.get("source_url", "")
                            clip["source_id"] = source_meta.get("source_id", "")
                            break
                    self._save_catalog_unlocked(catalog)
                    return  # _save_catalog_unlocked already saves index

            self._save_index()

    def get_expired_clips(self, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> list[dict]:
        """Get clips whose local files have expired TTL. Skips pinned entries.
        Read-only — no lock needed. Returns list of dicts with clip info."""
        idx = self._load_index()
        ttl_data = idx.get("clip_ttl", {})
        clip_lookup = idx.get("clip_lookup", {})
        now = time.time()
        expired = []

        for fname, entry in ttl_data.items():
            # Skip pinned
            if entry.get("pinned", False):
                continue

            last_used = entry.get("last_used", "")
            if not last_used:
                continue

            try:
                lu_dt = datetime.fromisoformat(last_used)
                lu_ts = lu_dt.timestamp()
            except (ValueError, TypeError):
                continue

            age = now - lu_ts
            if age > ttl_seconds:
                # Check if local file exists (only report if there's something to clean)
                catalog_id = clip_lookup.get(fname)
                if catalog_id:
                    catalog = self._load_catalog_from_disk(catalog_id)
                    if catalog:
                        for clip in catalog.get("clips", []):
                            if clip.get("filename") == fname:
                                clip_path = clip.get("path", "")
                                if clip_path and os.path.exists(clip_path):
                                    source = entry.get("source", {})
                                    expired.append({
                                        "filename": fname,
                                        "path": clip_path,
                                        "catalog_id": catalog_id,
                                        "age_days": age / 86400,
                                        "size": os.path.getsize(clip_path),
                                        "source_type": source.get("source_type", "unknown"),
                                        "redownloadable": source.get("source_type") in REDOWNLOADABLE_SOURCE_TYPES,
                                    })
                                break

        return expired

    def cleanup_expired_files(
        self,
        ttl_seconds: int = DEFAULT_TTL_SECONDS,
        dry_run: bool = False,
        force: bool = False,
    ) -> list[dict]:
        """Clean up expired local files. Batched by catalog_id.

        Args:
            ttl_seconds: TTL threshold in seconds.
            dry_run: If True, report what would be cleaned without deleting.
            force: If True, also clean pinned clips (for manual disk reclaim).

        Returns list of cleaned/would-clean clip dicts.
        """
        with self._locked():
            idx = self._load_index()
            ttl_data = idx.get("clip_ttl", {})
            clip_lookup = idx.get("clip_lookup", {})
            now = time.time()

            # Collect expired clips
            to_clean = []
            for fname, entry in ttl_data.items():
                if not force and entry.get("pinned", False):
                    continue

                last_used = entry.get("last_used", "")
                if not last_used:
                    continue

                try:
                    lu_dt = datetime.fromisoformat(last_used)
                    lu_ts = lu_dt.timestamp()
                except (ValueError, TypeError):
                    continue

                if (now - lu_ts) > ttl_seconds:
                    catalog_id = clip_lookup.get(fname)
                    source = entry.get("source", {})
                    to_clean.append({
                        "filename": fname,
                        "catalog_id": catalog_id,
                        "age_days": (now - lu_ts) / 86400,
                        "source_type": source.get("source_type", "unknown"),
                        "pinned": entry.get("pinned", False),
                    })

            if dry_run:
                # Add file sizes for reporting
                for item in to_clean:
                    cat_id = item.get("catalog_id")
                    if cat_id:
                        catalog = self._load_catalog_from_disk(cat_id)
                        if catalog:
                            for clip in catalog.get("clips", []):
                                if clip.get("filename") == item["filename"]:
                                    clip_path = clip.get("path", "")
                                    if clip_path and os.path.exists(clip_path):
                                        item["path"] = clip_path
                                        item["size"] = os.path.getsize(clip_path)
                                    else:
                                        item["path"] = clip_path
                                        item["size"] = 0
                                    break
                return to_clean

            # Group by catalog_id for batched updates
            by_catalog: dict[str, list[str]] = {}
            for item in to_clean:
                cat_id = item.get("catalog_id") or "__none__"
                by_catalog.setdefault(cat_id, []).append(item["filename"])

            cleaned = []
            for cat_id, filenames in by_catalog.items():
                if cat_id == "__none__":
                    continue

                catalog = self._load_catalog_from_disk(cat_id)
                if not catalog:
                    continue

                for clip in catalog.get("clips", []):
                    if clip.get("filename") in filenames:
                        clip_path = clip.get("path", "")
                        size = 0
                        if clip_path and os.path.exists(clip_path):
                            size = os.path.getsize(clip_path)
                            os.remove(clip_path)
                        clip["downloaded"] = False
                        cleaned.append({
                            "filename": clip["filename"],
                            "path": clip_path,
                            "catalog_id": cat_id,
                            "size": size,
                            "source_type": next(
                                (i["source_type"] for i in to_clean if i["filename"] == clip["filename"]),
                                "unknown",
                            ),
                            "pinned": next(
                                (i["pinned"] for i in to_clean if i["filename"] == clip["filename"]),
                                False,
                            ),
                        })

                self._save_catalog_unlocked(catalog)

            return cleaned

    def get_disk_report(self) -> dict:
        """Get disk usage breakdown by source type (pinned vs TTL-managed).
        Read-only — no lock needed."""
        idx = self._load_index()
        ttl_data = idx.get("clip_ttl", {})
        clip_lookup = idx.get("clip_lookup", {})

        report = {
            "pinned": {"count": 0, "size": 0, "by_type": {}},
            "ttl_managed": {"count": 0, "size": 0, "by_type": {}},
            "expired": {"count": 0, "size": 0},
            "total": {"count": 0, "size": 0},
        }

        now = time.time()
        # Cache catalogs to avoid re-reading
        catalog_cache: dict[str, dict | None] = {}

        for fname, entry in ttl_data.items():
            cat_id = clip_lookup.get(fname)
            if not cat_id:
                continue

            if cat_id not in catalog_cache:
                catalog_cache[cat_id] = self._load_catalog_from_disk(cat_id)
            catalog = catalog_cache[cat_id]
            if not catalog:
                continue

            clip_path = None
            for clip in catalog.get("clips", []):
                if clip.get("filename") == fname:
                    clip_path = clip.get("path", "")
                    break

            if not clip_path or not os.path.exists(clip_path):
                continue

            size = os.path.getsize(clip_path)
            source_type = entry.get("source", {}).get("source_type", "unknown")
            pinned = entry.get("pinned", False)

            report["total"]["count"] += 1
            report["total"]["size"] += size

            if pinned:
                report["pinned"]["count"] += 1
                report["pinned"]["size"] += size
                report["pinned"]["by_type"].setdefault(source_type, {"count": 0, "size": 0})
                report["pinned"]["by_type"][source_type]["count"] += 1
                report["pinned"]["by_type"][source_type]["size"] += size
            else:
                report["ttl_managed"]["count"] += 1
                report["ttl_managed"]["size"] += size
                report["ttl_managed"]["by_type"].setdefault(source_type, {"count": 0, "size": 0})
                report["ttl_managed"]["by_type"][source_type]["count"] += 1
                report["ttl_managed"]["by_type"][source_type]["size"] += size

                # Check if expired
                last_used = entry.get("last_used", "")
                if last_used:
                    try:
                        lu_ts = datetime.fromisoformat(last_used).timestamp()
                        if (now - lu_ts) > DEFAULT_TTL_SECONDS:
                            report["expired"]["count"] += 1
                            report["expired"]["size"] += size
                    except (ValueError, TypeError):
                        pass

        return report

    # --- Listing ---

    def list_catalogs(
        self,
        sort_by: str = "created",
        reverse: bool = True,
        tag_filter: str | None = None,
        source_filter: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[dict], int]:
        """List catalog metadata with filtering and pagination.
        Returns (list_of_meta_dicts, total_count)."""
        idx = self._load_index()
        catalogs = list(idx.get("catalogs", {}).values())

        # Filter
        if tag_filter:
            tag_lower = tag_filter.lower()
            catalogs = [
                c for c in catalogs
                if any(tag_lower in t.lower() for t in c.get("tags", []))
            ]
        if source_filter:
            sf = source_filter.lower()
            catalogs = [
                c for c in catalogs
                if sf in c.get("source", "").lower()
            ]

        total = len(catalogs)

        # Sort
        sort_keys = {
            "created": lambda c: c.get("created", ""),
            "name": lambda c: c.get("name", "").lower(),
            "clips": lambda c: c.get("clip_count", 0),
            "duration": lambda c: c.get("total_duration", 0),
        }
        key_fn = sort_keys.get(sort_by, sort_keys["created"])
        catalogs.sort(key=key_fn, reverse=reverse)

        # Paginate
        catalogs = catalogs[offset:offset + limit]

        return catalogs, total

    # --- Search ---

    def search_clips(
        self,
        query: str,
        fields: list[str] | None = None,
        catalog_id: str | None = None,
        limit: int = 20,
        offset: int = 0,
        exclude_heavy_text: bool = False,
        min_quality: int | None = None,
    ) -> tuple[list[dict], int]:
        """Search segments across all catalogs.

        Two-tier:
        1. Index lookup for subjects/mood/camera (O(1) per term)
        2. Description scan (O(N) — only for tokens with zero Tier 1 hits)

        Args:
            exclude_heavy_text: If True, exclude clips with has_burned_captions=True
                (clips with heavy burned-in text overlays that contaminate new captions).
            min_quality: If set, exclude clips with clip_quality_score below this threshold (1-5).

        Returns (list_of_result_dicts, total_count).
        """
        idx = self._load_index()
        search_idx = idx.get("search_index", {})
        results = {}  # keyed by (catalog_id, filename, seg_idx)

        query_lower = query.lower().strip()
        tokens = [t.strip() for t in query_lower.replace(",", " ").split() if t.strip()]

        # Track which tokens got Tier 1 hits
        tokens_with_hits = set()

        # Tier 1: Index lookup
        for token in tokens:
            token_hit = False

            # Subjects (score 1.0)
            for term, refs in search_idx.get("subjects", {}).items():
                if token in term.lower():
                    token_hit = True
                    for ref in refs:
                        cat_id, fname, seg_idx = ref[0], ref[1], ref[2]
                        if catalog_id and cat_id != catalog_id:
                            continue
                        key = (cat_id, fname, seg_idx)
                        if key not in results:
                            results[key] = {"score": 0}
                        results[key]["score"] = max(results[key]["score"], 1.0)

            # Mood (score 0.8)
            for term, refs in search_idx.get("mood", {}).items():
                if token in term.lower():
                    token_hit = True
                    for ref in refs:
                        cat_id, fname, seg_idx = ref[0], ref[1], ref[2]
                        if catalog_id and cat_id != catalog_id:
                            continue
                        key = (cat_id, fname, seg_idx)
                        if key not in results:
                            results[key] = {"score": 0}
                        results[key]["score"] = max(results[key]["score"], 0.8)

            # Camera (score 0.7)
            for term, refs in search_idx.get("camera", {}).items():
                if token in term.lower():
                    token_hit = True
                    for ref in refs:
                        cat_id, fname, seg_idx = ref[0], ref[1], ref[2]
                        if catalog_id and cat_id != catalog_id:
                            continue
                        key = (cat_id, fname, seg_idx)
                        if key not in results:
                            results[key] = {"score": 0}
                        results[key]["score"] = max(results[key]["score"], 0.7)

            if token_hit:
                tokens_with_hits.add(token)

        # Tier 2: Description scan — only if some tokens had zero Tier 1 hits
        missed_tokens = [t for t in tokens if t not in tokens_with_hits]
        if missed_tokens:
            catalog_ids_to_scan = [catalog_id] if catalog_id else list(idx.get("catalogs", {}).keys())
            catalog_cache: dict[str, dict | None] = {}
            for cat_id in catalog_ids_to_scan:
                if cat_id not in catalog_cache:
                    catalog_cache[cat_id] = self._load_catalog_from_disk(cat_id)
                cat = catalog_cache[cat_id]
                if not cat:
                    continue
                for clip in cat.get("clips", []):
                    fname = sanitize_filename(clip.get("filename", ""))
                    for seg_idx, seg in enumerate(clip.get("segments", [])):
                        desc = seg.get("description", "").lower()
                        if any(t in desc for t in missed_tokens):
                            key = (cat_id, fname, seg_idx)
                            if key not in results:
                                results[key] = {"score": 0}
                            results[key]["score"] = max(results[key]["score"], 0.5)

        # Build result list (with catalog caching)
        clip_captions = idx.get("clip_captions", {})
        clip_quality_index = idx.get("clip_quality", {})
        catalog_cache_build: dict[str, dict | None] = {}
        result_list = []
        for (cat_id, fname, seg_idx), info in results.items():
            # Filter out clips with heavy burned-in captions
            if exclude_heavy_text and clip_captions.get(fname, False):
                continue

            # Filter by minimum quality score (index-level fast path)
            if min_quality is not None:
                indexed_quality = clip_quality_index.get(fname)
                if indexed_quality is not None and indexed_quality < min_quality:
                    continue

            if cat_id not in catalog_cache_build:
                catalog_cache_build[cat_id] = self._load_catalog_from_disk(cat_id)
            cat = catalog_cache_build[cat_id]
            if not cat:
                continue
            cat_name = cat.get("name", cat_id)
            for clip in cat.get("clips", []):
                cf = clip.get("filename", "")
                if cf != fname and sanitize_filename(cf) != fname:
                    continue
                segs = clip.get("segments", [])
                if seg_idx >= len(segs):
                    continue
                seg = segs[seg_idx]
                display_fname = sanitize_filename(cf) if cf else fname
                has_captions = clip_captions.get(display_fname, clip.get("has_burned_captions", False))
                clip_quality = clip.get("clip_quality_score")

                # Apply min_quality filter at clip level (fallback when index is stale)
                if min_quality is not None and clip_quality is not None:
                    if clip_quality < min_quality:
                        break

                result_list.append({
                    "catalog_id": cat_id,
                    "catalog_name": cat_name,
                    "filename": display_fname,
                    "segment_index": seg_idx,
                    "segment": seg,
                    "clip_ref": f"clip:{display_fname}@{seg['start']}-{seg['end']}",
                    "score": info["score"],
                    "has_burned_captions": has_captions,
                    "clip_quality_score": clip_quality,
                })
                break

        # Sort by score descending
        result_list.sort(key=lambda r: r["score"], reverse=True)

        total = len(result_list)
        result_list = result_list[offset:offset + limit]

        return result_list, total

    # --- Caption/Text Overlay Queries ---

    def has_burned_captions(self, filename: str) -> bool:
        """Check if a clip has heavy burned-in captions.

        Returns True if the clip was flagged with has_burned_captions during catalog analysis.
        """
        idx = self._load_index()
        clean = sanitize_filename(filename)
        return idx.get("clip_captions", {}).get(clean, False)

    def audit_text_overlays(self) -> dict:
        """Audit all cataloged clips for text overlay status.

        Returns summary dict with counts and lists of affected clips:
        {
            "total_clips": int,
            "heavy_count": int,
            "light_count": int,
            "clean_count": int,
            "unknown_count": int,
            "heavy_clips": [{"filename": str, "catalog_id": str, "segments_heavy": int, "segments_total": int}],
            "light_clips": [{"filename": str, "catalog_id": str}],
        }
        """
        idx = self._load_index()
        clip_captions = idx.get("clip_captions", {})
        catalog_ids = list(idx.get("catalogs", {}).keys())

        heavy_clips = []
        light_clips = []
        clean_count = 0
        unknown_count = 0

        for cat_id in catalog_ids:
            cat = self._load_catalog_from_disk(cat_id)
            if not cat:
                continue
            for clip in cat.get("clips", []):
                fname = sanitize_filename(clip.get("filename", ""))
                if not fname:
                    continue
                segments = clip.get("segments", [])
                heavy_segs = sum(1 for s in segments if s.get("text_overlay_severity") == "heavy")
                light_segs = sum(1 for s in segments if s.get("text_overlay_severity") == "light")
                has_severity = any(s.get("text_overlay_severity") for s in segments)

                if not has_severity:
                    unknown_count += 1
                elif heavy_segs > 0:
                    heavy_clips.append({
                        "filename": fname,
                        "catalog_id": cat_id,
                        "segments_heavy": heavy_segs,
                        "segments_total": len(segments),
                    })
                elif light_segs > 0:
                    light_clips.append({
                        "filename": fname,
                        "catalog_id": cat_id,
                    })
                else:
                    clean_count += 1

        return {
            "total_clips": len(heavy_clips) + len(light_clips) + clean_count + unknown_count,
            "heavy_count": len(heavy_clips),
            "light_count": len(light_clips),
            "clean_count": clean_count,
            "unknown_count": unknown_count,
            "heavy_clips": heavy_clips,
            "light_clips": light_clips,
        }

    # --- Index Building ---

    def _index_catalog(self, catalog_id: str, catalog: dict):
        """Add a catalog's metadata, clips, and segments to the index."""
        idx = self._load_index()
        clips = catalog.get("clips", [])
        seg_count = sum(len(c.get("segments", [])) for c in clips)

        # Catalog metadata
        idx["catalogs"][catalog_id] = {
            "catalog_id": catalog_id,
            "name": catalog.get("name", ""),
            "source": catalog.get("source", ""),
            "created": catalog.get("created", ""),
            "clip_count": len(clips),
            "segment_count": seg_count,
            "total_duration": sum(c.get("duration", 0) for c in clips),
            "tags": catalog.get("tags", []),
        }

        # Clip lookup + search index (clip_lookup stores string catalog_id only)
        # Ensure clip_captions dict exists (for v2 indexes created before this field)
        if "clip_captions" not in idx:
            idx["clip_captions"] = {}
        if "clip_quality" not in idx:
            idx["clip_quality"] = {}
        if "text_overlay_severity" not in idx.get("search_index", {}):
            idx["search_index"]["text_overlay_severity"] = {}
        if "quality_bucket" not in idx.get("search_index", {}):
            idx["search_index"]["quality_bucket"] = {}

        for clip in clips:
            fname = clip.get("filename", "")
            if fname:
                idx["clip_lookup"][sanitize_filename(fname)] = catalog_id

            clean_fname = sanitize_filename(fname) if fname else fname

            # Track burned captions at clip level
            clip_has_burned = clip.get("has_burned_captions", False)
            if not clip_has_burned:
                # Derive from segments if not set on clip directly
                for seg in clip.get("segments", []):
                    if seg.get("text_overlay_severity", "") == "heavy":
                        clip_has_burned = True
                        break
            if clean_fname:
                idx["clip_captions"][clean_fname] = clip_has_burned

            # Track clip quality score in the index for fast min_quality filtering
            clip_qs = clip.get("clip_quality_score")
            if clip_qs is not None and clean_fname:
                idx["clip_quality"][clean_fname] = clip_qs
                # Index by score bucket (floor to int, 1-5) for bucket-based queries
                bucket = str(max(1, min(5, int(clip_qs))))
                idx["search_index"]["quality_bucket"].setdefault(bucket, []).append(
                    [catalog_id, clean_fname]
                )

            for seg_idx, seg in enumerate(clip.get("segments", [])):
                ref = [catalog_id, clean_fname, seg_idx]

                # Index subjects
                subjects_str = seg.get("subjects", "")
                for subj in [s.strip().lower() for s in subjects_str.split(",") if s.strip()]:
                    idx["search_index"]["subjects"].setdefault(subj, []).append(ref)

                # Index mood
                mood = seg.get("mood", "").strip().lower()
                if mood:
                    idx["search_index"]["mood"].setdefault(mood, []).append(ref)

                # Index camera
                camera = seg.get("camera", "").strip().lower()
                if camera:
                    idx["search_index"]["camera"].setdefault(camera, []).append(ref)

                # Index text overlay severity
                severity = seg.get("text_overlay_severity", "").strip().lower()
                if severity and severity != "none":
                    idx["search_index"]["text_overlay_severity"].setdefault(severity, []).append(ref)

    def _remove_catalog_from_index(self, catalog_id: str):
        """Remove all index entries for a catalog."""
        idx = self._load_index()

        idx["catalogs"].pop(catalog_id, None)

        # Remove from clip_lookup
        to_remove = [k for k, v in idx.get("clip_lookup", {}).items() if v == catalog_id]
        for k in to_remove:
            del idx["clip_lookup"][k]

        # Remove from clip_captions
        clip_captions = idx.get("clip_captions", {})
        caption_remove = [k for k in clip_captions
                          if idx.get("clip_lookup", {}).get(k) == catalog_id
                          or k not in idx.get("clip_lookup", {})]
        for k in caption_remove:
            clip_captions.pop(k, None)

        # Remove from clip_quality
        clip_quality = idx.get("clip_quality", {})
        quality_remove = [k for k in clip_quality
                          if idx.get("clip_lookup", {}).get(k) == catalog_id
                          or k not in idx.get("clip_lookup", {})]
        for k in quality_remove:
            clip_quality.pop(k, None)

        # Remove from search_index
        for field in ["subjects", "mood", "camera", "text_overlay_severity", "quality_bucket"]:
            field_idx = idx.get("search_index", {}).get(field, {})
            empty_keys = []
            for term, refs in field_idx.items():
                field_idx[term] = [r for r in refs if r[0] != catalog_id]
                if not field_idx[term]:
                    empty_keys.append(term)
            for k in empty_keys:
                del field_idx[k]

    # --- Migration ---

    def migrate_legacy_catalogs(self, sessions_dir: str, media_dir: str) -> int:
        """Scan for *.catalog.json in sessions_dir and media_dir.
        Import each into the new store. Returns count migrated.
        Non-destructive: leaves originals in place."""
        count = 0
        for search_dir in [sessions_dir, media_dir]:
            if not search_dir or not os.path.isdir(search_dir):
                continue
            for cat_file in Path(search_dir).glob("*.catalog.json"):
                try:
                    catalog = json.loads(cat_file.read_text())
                    catalog_id = catalog.get("catalog_id", "")
                    if not catalog_id:
                        continue
                    # Skip if already in store
                    if self.get_catalog(catalog_id) is not None:
                        continue
                    # Add version and name if missing
                    if "version" not in catalog:
                        catalog["version"] = 2
                    if "name" not in catalog:
                        catalog["name"] = self._auto_name(catalog.get("source", ""))
                    if "tags" not in catalog:
                        catalog["tags"] = []
                    self.save_catalog(catalog)
                    count += 1
                except (json.JSONDecodeError, OSError):
                    continue
        return count

    def migrate_filenames(self) -> dict:
        """Migrate all clip filenames to sanitized form.

        Renames files on disk, updates catalog entries, rebuilds index.
        Returns {renamed, already_clean, missing, errors}.
        """
        stats = {"renamed": 0, "already_clean": 0, "missing": 0, "errors": 0}

        with self._locked():
            idx = self._load_index()

            for cat_id in list(idx.get("catalogs", {}).keys()):
                catalog = self._load_catalog_from_disk(cat_id)
                if not catalog:
                    continue

                changed = False
                for clip in catalog.get("clips", []):
                    raw = clip.get("filename", "")
                    if not raw:
                        continue
                    clean = sanitize_filename(raw)
                    if clean == raw:
                        stats["already_clean"] += 1
                        continue

                    # Rename file on disk
                    old_path = clip.get("path", "")
                    if old_path and os.path.exists(old_path):
                        new_path = str(Path(old_path).parent / clean)
                        if not os.path.exists(new_path):
                            try:
                                os.rename(old_path, new_path)
                                clip["path"] = new_path
                            except OSError as e:
                                print(f"  ERROR renaming {old_path}: {e}")
                                stats["errors"] += 1
                                continue
                        else:
                            clip["path"] = new_path  # Already renamed
                    else:
                        stats["missing"] += 1

                    clip["original_filename"] = raw
                    clip["filename"] = clean
                    changed = True
                    stats["renamed"] += 1

                if changed:
                    self._save_catalog_unlocked(catalog)

            # Migrate clip_ttl keys
            idx = self._load_index()
            old_ttl = idx.get("clip_ttl", {})
            new_ttl = {}
            for key, val in old_ttl.items():
                new_ttl[sanitize_filename(key)] = val
            idx["clip_ttl"] = new_ttl
            self._save_index()

        return stats

    # --- Helpers ---

    @staticmethod
    def _auto_name(source: str) -> str:
        """Generate a human-readable name from a source path/URL."""
        now = datetime.now(timezone.utc)
        date_str = now.strftime("%b %d")

        if source.startswith("gdrive:"):
            ref = source[7:].strip()
            if "/" in ref or "drive.google.com" in ref:
                # Extract folder ID and use prefix
                parts = ref.split("/")
                for p in reversed(parts):
                    clean = p.split("?")[0]
                    if len(clean) > 4:
                        return f"GDrive {clean[:8]} ({date_str})"
                return f"GDrive ({date_str})"
            short = ref[:12] if len(ref) > 12 else ref
            return f"GDrive {short} ({date_str})"
        elif source == "master":
            return "Master Catalog"
        else:
            folder_name = Path(source).name or "footage"
            return f"{folder_name} ({date_str})"


def _extract_source_meta(clip: dict) -> dict:
    """Infer source metadata from existing clip fields."""
    if clip.get("gdrive_id"):
        return {
            "source_type": "gdrive",
            "source_url": clip.get("gdrive_url", ""),
            "source_id": clip.get("gdrive_id", ""),
        }
    if clip.get("pexels_id"):
        return {
            "source_type": "stock",
            "source_url": "",
            "source_id": str(clip.get("pexels_id", "")),
        }
    source = clip.get("source", "")
    if source == "social":
        return {
            "source_type": "social",
            "source_url": clip.get("source_url", ""),
            "source_id": "",
        }
    if source == "veo":
        return {
            "source_type": "veo",
            "source_url": "",
            "source_id": "",
        }
    if source == "inbound":
        return {
            "source_type": "inbound",
            "source_url": clip.get("source_url", clip.get("path", "")),
            "source_id": "",
        }
    if source == "pexels":
        return {
            "source_type": "stock",
            "source_url": "",
            "source_id": str(clip.get("pexels_id", "")),
            "pexels_query": clip.get("pexels_query", ""),
        }
    return {
        "source_type": "local",
        "source_url": clip.get("path", ""),
        "source_id": "",
    }
