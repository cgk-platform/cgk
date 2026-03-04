#!/usr/bin/env python3
"""
migrate_media.py -- Migrate flat media/ directory to structured layout.

New structure:
  media/
    renders/                    # Final output videos (vid-*-final.mp4)
    sessions/{session_id}/      # Per-session intermediates
    catalog/
      social/                   # Social source clips
      stock/                    # Stock footage
      gdrive/                   # Google Drive clips
      veo/                      # Veo-generated clips
      inbound/                  # Inbound/uploaded clips

Usage:
  python3 migrate_media.py [--dry-run]   # Preview only (default)
  python3 migrate_media.py --execute     # Actually move files + create symlinks

Env vars (all optional — derived from script location if unset):
  PROFILE_ROOT   Root of the openCLAW profile (e.g. ~/.openclaw)
  MEDIA_DIR      media/ directory path
"""

import argparse
import json
import logging
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# === Path Derivation (never hardcoded) ===
SCRIPT_DIR = Path(__file__).resolve().parent
# scripts/ -> video-editor/ -> skills/ -> profile root
PROFILE_ROOT = Path(os.environ.get("PROFILE_ROOT", str(SCRIPT_DIR.parents[2])))
MEDIA_DIR = Path(os.environ.get("MEDIA_DIR", str(PROFILE_ROOT / "media")))

LOG_PATH = MEDIA_DIR / "migrate_media.log"

# ── Regex patterns for file classification ───────────────────────────────────
# Session ID pattern: vid-YYYYMMDD-HHMMSS-NNNNN
_SESSION_RE = re.compile(r"^(vid-\d{8}-\d{6}-\d+)")

# Final renders
_FINAL_RE = re.compile(r"^vid-\S+-final(?:-compressed)?\.mp4$")

# Per-session intermediate file suffixes
_SESSION_SUFFIX_RES = [
    re.compile(r"^(vid-\d{8}-\d{6}-\d+)-norm-\d+\.mp4$"),
    re.compile(r"^(vid-\d{8}-\d{6}-\d+)-audio-mix\.aac$"),
    re.compile(r"^(vid-\d{8}-\d{6}-\d+)-captions\.ass$"),
    re.compile(r"^(vid-\d{8}-\d{6}-\d+)-voice-preview\.mp3$"),
    re.compile(r"^(vid-\d{8}-\d{6}-\d+)-timestamps\.json$"),
    re.compile(r"^(vid-\d{8}-\d{6}-\d+)-voiceover\.mp3$"),
]


def _setup_logging(log_path: Path, dry_run: bool) -> logging.Logger:
    logger = logging.getLogger("migrate_media")
    logger.setLevel(logging.DEBUG)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", "%Y-%m-%dT%H:%M:%SZ")
    fmt.converter = lambda *_: datetime.now(timezone.utc).timetuple()

    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    if not dry_run:
        fh = logging.FileHandler(str(log_path), encoding="utf-8")
        fh.setLevel(logging.DEBUG)
        fh.setFormatter(fmt)
        logger.addHandler(fh)

    return logger


def _lookup_source_type(filename: str, profile_root: Path) -> str:
    """Look up source_type from catalog_store for a given filename.

    Returns one of: social, stock, gdrive, veo, inbound.
    Defaults to 'inbound' if not found or on any error.
    """
    try:
        sys.path.insert(0, str(SCRIPT_DIR))
        from lib.catalog_store import CatalogStore
        store = CatalogStore(str(profile_root))
        clip = store.get_clip_by_filename(filename)
        if clip:
            source_type = clip.get("source_type", "")
            if source_type in ("social", "stock", "gdrive", "veo", "inbound"):
                return source_type
    except Exception:
        pass
    return "inbound"


def _classify_file(name: str) -> tuple[str, str | None]:
    """Classify a filename into (category, session_id).

    Returns:
      ("render",  None)          -- final render
      ("session", session_id)    -- per-session intermediate
      ("catalog", None)          -- other video (needs source_type lookup)
      ("skip",    None)          -- not a vid- file, leave in place
    """
    if not name.startswith("vid-"):
        return ("skip", None)

    # Final renders
    if _FINAL_RE.match(name):
        return ("render", None)

    # Per-session intermediates
    for pattern in _SESSION_SUFFIX_RES:
        m = pattern.match(name)
        if m:
            return ("session", m.group(1))

    # Everything else that starts with vid- and is a video/audio file
    ext = Path(name).suffix.lower()
    if ext in (".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v", ".aac", ".mp3"):
        return ("catalog", None)

    return ("skip", None)


def _ensure_dirs(media_dir: Path, dry_run: bool, logger: logging.Logger):
    dirs = [
        media_dir / "renders",
        media_dir / "catalog" / "social",
        media_dir / "catalog" / "stock",
        media_dir / "catalog" / "gdrive",
        media_dir / "catalog" / "veo",
        media_dir / "catalog" / "inbound",
    ]
    for d in dirs:
        if not d.exists():
            if dry_run:
                logger.info("[DRY-RUN] Would create: %s", d)
            else:
                d.mkdir(parents=True, exist_ok=True)
                logger.info("Created: %s", d)


def _collect_moves(media_dir: Path, profile_root: Path, logger: logging.Logger) -> list[dict]:
    """Scan media_dir and build list of move operations.

    Returns list of dicts: {src, dst, category, session_id}
    """
    moves = []
    seen_sessions: set[str] = set()

    entries = sorted(media_dir.iterdir())
    for entry in entries:
        if not entry.is_file():
            continue
        # Skip files already in subdirectories (this iterdir is flat)
        name = entry.name

        category, session_id = _classify_file(name)

        if category == "skip":
            logger.debug("Skipping (not vid-): %s", name)
            continue

        if entry.is_symlink():
            logger.debug("Skipping existing symlink: %s", name)
            continue

        if category == "render":
            dst = media_dir / "renders" / name
            moves.append({
                "src": entry,
                "dst": dst,
                "category": "render",
                "session_id": None,
            })

        elif category == "session":
            if session_id not in seen_sessions:
                seen_sessions.add(session_id)
                logger.debug("Discovered session: %s", session_id)
            session_dir = media_dir / "sessions" / session_id
            dst = session_dir / name
            moves.append({
                "src": entry,
                "dst": dst,
                "category": "session",
                "session_id": session_id,
            })

        elif category == "catalog":
            source_type = _lookup_source_type(name, profile_root)
            dst = media_dir / "catalog" / source_type / name
            moves.append({
                "src": entry,
                "dst": dst,
                "category": f"catalog/{source_type}",
                "session_id": None,
            })

    return moves


def _execute_moves(moves: list[dict], media_dir: Path, dry_run: bool, logger: logging.Logger):
    """Execute (or preview) the move + symlink operations."""
    if not moves:
        logger.info("No files to migrate.")
        return

    # Collect session dirs that need creation
    session_ids = {m["session_id"] for m in moves if m["session_id"]}
    for sid in sorted(session_ids):
        session_dir = media_dir / "sessions" / sid
        if not session_dir.exists():
            if dry_run:
                logger.info("[DRY-RUN] Would create session dir: %s", session_dir)
            else:
                session_dir.mkdir(parents=True, exist_ok=True)
                logger.info("Created session dir: %s", session_dir)

    moved = 0
    symlinked = 0
    skipped = 0

    for op in moves:
        src: Path = op["src"]
        dst: Path = op["dst"]

        if dst.exists():
            logger.warning("Destination exists, skipping: %s -> %s", src.name, dst)
            skipped += 1
            continue

        if dry_run:
            logger.info("[DRY-RUN] Would move:    %s -> %s", src, dst)
            logger.info("[DRY-RUN] Would symlink: %s -> %s", src, dst)
        else:
            # Move file
            src.rename(dst)
            logger.info("Moved: %s -> %s", src, dst)
            moved += 1

            # Create backward-compat symlink at old location
            # dst is absolute; symlink target needs to be relative to src location
            try:
                rel = os.path.relpath(str(dst), str(src.parent))
                src.symlink_to(rel)
                logger.info("Symlinked: %s -> %s", src, rel)
                symlinked += 1
            except Exception as exc:
                logger.warning("Could not create symlink at %s: %s", src, exc)

    if dry_run:
        logger.info(
            "[DRY-RUN] Would move %d file(s) (skipped %d existing destinations).",
            len(moves), skipped,
        )
        logger.info("Run with --execute to perform the migration.")
    else:
        logger.info(
            "Migration complete: %d moved, %d symlinked, %d skipped.",
            moved, symlinked, skipped,
        )


def _print_summary(moves: list[dict]):
    """Print a human-readable summary grouped by category."""
    by_cat: dict[str, list[str]] = {}
    for op in moves:
        cat = op["category"]
        by_cat.setdefault(cat, []).append(op["src"].name)

    print()
    print("=== Migration Plan ===")
    print(f"Media dir: {MEDIA_DIR}")
    print()
    for cat in sorted(by_cat):
        files = by_cat[cat]
        print(f"  [{cat}]  ({len(files)} file(s))")
        for f in sorted(files):
            print(f"    {f}")
    print()
    print(f"Total: {len(moves)} file(s) to migrate.")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Migrate flat media/ directory to structured layout.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 migrate_media.py              # Preview (dry-run, default)
  python3 migrate_media.py --dry-run   # Explicit dry-run
  python3 migrate_media.py --execute   # Actually migrate files
        """,
    )
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Preview moves without making changes (default)",
    )
    mode_group.add_argument(
        "--execute",
        action="store_true",
        default=False,
        help="Actually move files and create backward-compat symlinks",
    )
    args = parser.parse_args()

    dry_run = not args.execute

    if not MEDIA_DIR.exists():
        print(f"ERROR: MEDIA_DIR does not exist: {MEDIA_DIR}", file=sys.stderr)
        sys.exit(1)

    logger = _setup_logging(LOG_PATH, dry_run)

    mode_label = "DRY-RUN (preview only)" if dry_run else "EXECUTE (files will be moved)"
    logger.info("migrate_media.py starting -- mode: %s", mode_label)
    logger.info("PROFILE_ROOT: %s", PROFILE_ROOT)
    logger.info("MEDIA_DIR:    %s", MEDIA_DIR)

    _ensure_dirs(MEDIA_DIR, dry_run, logger)

    logger.info("Scanning %s ...", MEDIA_DIR)
    moves = _collect_moves(MEDIA_DIR, PROFILE_ROOT, logger)

    _print_summary(moves)
    _execute_moves(moves, MEDIA_DIR, dry_run, logger)


if __name__ == "__main__":
    main()
