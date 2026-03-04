# /// script
# requires-python = ">=3.10"
# dependencies = ["google-api-python-client>=2.100.0", "google-auth>=2.20.0"]
# ///
"""Sync local competitor assets with Google Drive.

Phase 1 — Catalog → DB: Copies drive_file_id from catalog.json into ci.db
          for assets that were uploaded but never synced.

Phase 2 — Upload missing: Uploads local media files that lack a drive_file_id
          in catalog to their brand's Drive folder, then updates catalog + ci.db.

Phase 3 — Reconcile (--reconcile): Lists files already in Drive folders, matches
          them to catalog assets by filename hash, and updates IDs without uploading.

Usage:
    uv run sync_drive.py                    # All brands, Phase 1 + 2
    uv run sync_drive.py --brand Ka_Chava   # Specific brand
    uv run sync_drive.py --dry-run          # Preview only
    uv run sync_drive.py --sync-only        # Phase 1 only (no uploads)
    uv run sync_drive.py --reconcile        # Phase 1 + 3 (match Drive files, no uploads)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import sys

# ---------------------------------------------------------------------------
# Sibling imports
# ---------------------------------------------------------------------------

_script_dir = pathlib.Path(__file__).resolve().parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))

from analyze_competitor import load_catalog, save_catalog
from ci_store import CIStore
from competitor_monitor import (
    _drive_service,
    _drive_upload_file,
    _drive_find_or_create_folder,
)
from ad_library_dl import _url_hash, _guess_extension

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MEDIA_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".mp4", ".webm", ".mov"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}

# Local filename: rank-003-img-a1b2c3d4ef.jpg  (from ad_library_dl download)
LOCAL_RANK_RE = re.compile(r"^rank-\d{3}-(?:img|vid)-([a-f0-9]{10})\.\w+$")
# Drive filename: 003_a1b2c3d4ef.jpg  (from competitor_monitor upload)
DRIVE_RANK_RE = re.compile(r"^\d{3}_([a-f0-9]{10})\.\w+$")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _competitors_dir() -> pathlib.Path:
    """Derive competitors directory from script location."""
    profile_root = _script_dir.parent.parent.parent
    d = profile_root / "workspace" / "brand" / "competitors"
    if not d.exists():
        sys.exit(f"[error] Competitors directory not found: {d}")
    return d


def _extract_hash(filename: str) -> str | None:
    """Extract url_hash from either local or Drive filename conventions."""
    m = LOCAL_RANK_RE.match(filename)
    if m:
        return m.group(1)
    m = DRIVE_RANK_RE.match(filename)
    if m:
        return m.group(1)
    return None


def _find_local_files(competitors_dir: pathlib.Path, brand_dir: str) -> dict[str, pathlib.Path]:
    """Find all media files for a brand, keyed by url_hash extracted from filename.

    Keeps the latest file per hash (sorted by session dir, so newest wins).
    """
    brand_path = competitors_dir / brand_dir
    if not brand_path.exists():
        return {}
    files: dict[str, pathlib.Path] = {}
    for session_dir in sorted(brand_path.iterdir()):
        if not session_dir.is_dir():
            continue
        for f in session_dir.iterdir():
            if f.suffix.lower() not in MEDIA_EXTENSIONS:
                continue
            h = _extract_hash(f.name)
            if h:
                files[h] = f
    return files


def _content_sha256(path: pathlib.Path) -> str:
    """SHA256 of file contents for dedup."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def _drive_list_files(drive_svc, folder_id: str) -> list[dict]:
    """List all non-trashed files in a Drive folder. Returns [{id, name}]."""
    results = []
    page_token = None
    while True:
        resp = drive_svc.files().list(
            q=f"'{folder_id}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'",
            pageSize=100,
            fields="nextPageToken, files(id, name)",
            pageToken=page_token,
        ).execute()
        results.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return results


# ---------------------------------------------------------------------------
# Phase 1: Catalog → DB sync
# ---------------------------------------------------------------------------

def phase1_sync(catalog: dict, competitors_dir: pathlib.Path, brand_filter: str | None, dry_run: bool) -> int:
    """Sync drive_file_id from catalog.json → ci.db."""
    ci = CIStore()
    try:
        synced = 0
        for h, asset in catalog.get("assets", {}).items():
            if brand_filter and asset.get("brand") != brand_filter:
                continue
            fid = asset.get("drive_file_id")
            if not fid:
                continue
            if dry_run:
                print(f"  [dry-run] Would sync {h} → ci.db (drive_file_id={fid[:20]}...)")
                synced += 1
            else:
                cur = ci._conn.execute(
                    "UPDATE assets SET drive_file_id = ? WHERE url_hash = ? AND (drive_file_id IS NULL OR drive_file_id = '')",
                    (fid, h),
                )
                synced += cur.rowcount
        if not dry_run:
            ci._conn.commit()
        return synced
    finally:
        ci.close()


# ---------------------------------------------------------------------------
# Phase 2: Upload missing to Drive
# ---------------------------------------------------------------------------

def phase2_upload(
    catalog: dict,
    competitors_dir: pathlib.Path,
    brand_filter: str | None,
    dry_run: bool,
) -> tuple[int, int, int]:
    """Upload local files missing drive_file_id to Drive with content dedup.

    Returns (uploaded, deduped, skipped_brands).
    """
    drive_svc = _drive_service()
    if not drive_svc:
        print("[error] Cannot initialize Drive service — check OAuth credentials")
        return 0, 0, 0

    ci = CIStore()
    try:
        uploaded = 0
        deduped = 0
        skipped_brands = 0

        brands = catalog.get("brands", {})
        for brand_dir, brand_entry in brands.items():
        if brand_filter and brand_dir != brand_filter:
            continue

        statics_id = brand_entry.get("drive_statics_folder_id")
        videos_id = brand_entry.get("drive_videos_folder_id")
        if not statics_id and not videos_id:
            print(f"[skip] {brand_dir}: no Drive folder IDs configured")
            skipped_brands += 1
            continue

        print(f"\n[brand] {brand_dir}")
        local_files = _find_local_files(competitors_dir, brand_dir)
        if not local_files:
            print(f"  No local media files found")
            continue

        # Filter to assets missing drive_file_id
        assets = catalog.get("assets", {})
        to_upload = []
        for h, local_path in local_files.items():
            asset = assets.get(h)
            if not asset:
                continue
            if asset.get("brand") != brand_dir:
                continue
            if asset.get("drive_file_id"):
                continue
            to_upload.append((h, asset, local_path))

        if not to_upload:
            print(f"  All {len(local_files)} files already have Drive IDs")
            continue

        # Content-hash dedup: group by SHA256, pick lowest-rank as canonical
        print(f"  {len(to_upload)} candidates, hashing for dedup...")
        content_groups: dict[str, list[tuple[str, dict, pathlib.Path]]] = {}
        for h, asset, local_path in to_upload:
            sha = _content_sha256(local_path)
            content_groups.setdefault(sha, []).append((h, asset, local_path))

        # Also check if any already-uploaded asset shares content with a pending one
        # (i.e., same content already has a drive_file_id under a different url_hash)
        existing_content_ids: dict[str, str] = {}
        for h, asset in assets.items():
            if asset.get("brand") != brand_dir or not asset.get("drive_file_id"):
                continue
            ch = asset.get("content_hash")
            if ch:
                existing_content_ids[ch] = asset["drive_file_id"]

        unique_count = len(content_groups)
        dupe_count = len(to_upload) - unique_count
        print(f"  {unique_count} unique, {dupe_count} content duplicates")

        upload_idx = 0
        for sha, group in content_groups.items():
            # Sort by rank so the best-ranked version is the canonical upload
            group.sort(key=lambda x: x[1].get("current_rank", x[1].get("rank", 999)))
            canonical_h, canonical_asset, canonical_path = group[0]

            ext = canonical_path.suffix
            rank = canonical_asset.get("current_rank", canonical_asset.get("rank", 0))
            rank_name = f"{rank:03d}_{canonical_h}{ext}"
            is_video = ext.lower() in VIDEO_EXTENSIONS
            target_folder = videos_id if is_video else statics_id

            if not target_folder:
                upload_idx += 1
                print(f"  [{upload_idx}/{unique_count}] Skip {rank_name}: no {'videos' if is_video else 'statics'} folder")
                continue

            # Check if this content already exists in Drive (from a previous upload)
            reuse_id = existing_content_ids.get(sha)

            upload_idx += 1
            if dry_run:
                folder_type = "Videos" if is_video else "Statics"
                if reuse_id:
                    print(f"  [dry-run] [{upload_idx}/{unique_count}] Would reuse existing Drive ID for {rank_name} (+{len(group)-1} dupes)")
                else:
                    print(f"  [dry-run] [{upload_idx}/{unique_count}] Would upload {rank_name} → {folder_type}/ (+{len(group)-1} dupes)")
                uploaded += 1
                deduped += len(group) - 1
                continue

            try:
                if reuse_id:
                    file_id = reuse_id
                    print(f"  [{upload_idx}/{unique_count}] Reused existing Drive ID for {rank_name}")
                else:
                    file_id = _drive_upload_file(drive_svc, canonical_path, target_folder, rank_name)
                    print(f"  [{upload_idx}/{unique_count}] Uploaded {rank_name}")
                uploaded += 1

                # Apply Drive ID to canonical + all duplicates
                for h, asset, _ in group:
                    asset["drive_file_id"] = file_id
                    asset["content_hash"] = sha
                    ci.update_asset_drive_id(h, file_id)
                deduped += len(group) - 1

            except Exception as e:
                print(f"  [{upload_idx}/{unique_count}] Failed {rank_name}: {e}")

        return uploaded, deduped, skipped_brands
    finally:
        ci.close()


# ---------------------------------------------------------------------------
# Phase 3: Reconcile from Drive (match existing files without uploading)
# ---------------------------------------------------------------------------

def phase3_reconcile(
    catalog: dict,
    competitors_dir: pathlib.Path,
    brand_filter: str | None,
    dry_run: bool,
) -> int:
    """List files already in Drive folders, match to catalog by hash in filename."""
    drive_svc = _drive_service()
    if not drive_svc:
        print("[error] Cannot initialize Drive service — check OAuth credentials")
        return 0

    ci = CIStore()
    try:
        reconciled = 0

        brands = catalog.get("brands", {})
        assets = catalog.get("assets", {})

        for brand_dir, brand_entry in brands.items():
            if brand_filter and brand_dir != brand_filter:
                continue

            folder_ids = []
            for key in ("drive_statics_folder_id", "drive_videos_folder_id"):
                fid = brand_entry.get(key)
                if fid:
                    folder_ids.append((key.replace("drive_", "").replace("_folder_id", ""), fid))

            if not folder_ids:
                continue

            print(f"\n[reconcile] {brand_dir}")

            for folder_type, folder_id in folder_ids:
                drive_files = _drive_list_files(drive_svc, folder_id)
                print(f"  {folder_type}: {len(drive_files)} files in Drive")

                for df in drive_files:
                    h = _extract_hash(df["name"])
                    if not h:
                        continue
                    asset = assets.get(h)
                    if not asset or asset.get("brand") != brand_dir:
                        continue
                    if asset.get("drive_file_id"):
                        continue

                    if dry_run:
                        print(f"    [dry-run] Would link {df['name']} → {df['id']}")
                    else:
                        asset["drive_file_id"] = df["id"]
                        ci.update_asset_drive_id(h, df["id"])
                        print(f"    Linked {df['name']} → {df['id']}")
                    reconciled += 1

        return reconciled
    finally:
        ci.close()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Sync competitor assets with Google Drive")
    parser.add_argument("--brand", help="Filter to specific brand directory name")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without applying")
    parser.add_argument("--sync-only", action="store_true", help="Phase 1 only: catalog → ci.db")
    parser.add_argument("--reconcile", action="store_true", help="Phase 1 + 3: match existing Drive files")
    args = parser.parse_args()

    competitors_dir = _competitors_dir()
    catalog = load_catalog(competitors_dir)

    # Phase 1: catalog → ci.db
    print("=" * 50)
    print("PHASE 1: Sync catalog drive_file_id → ci.db")
    print("=" * 50)
    synced = phase1_sync(catalog, competitors_dir, args.brand, args.dry_run)
    print(f"\n  {synced} drive_file_ids synced to ci.db")

    if args.sync_only:
        print("\n[done] --sync-only: Phase 1 complete")
        return

    if args.reconcile:
        # Phase 3: reconcile from Drive
        print("\n" + "=" * 50)
        print("PHASE 3: Reconcile existing Drive files")
        print("=" * 50)
        reconciled = phase3_reconcile(catalog, competitors_dir, args.brand, args.dry_run)
        print(f"\n  {reconciled} assets reconciled from Drive")

        if not args.dry_run and reconciled > 0:
            save_catalog(catalog, competitors_dir)
            print(f"  Catalog saved")
        print("\n[done] Reconcile complete")
        return

    # Phase 2: upload missing
    print("\n" + "=" * 50)
    print("PHASE 2: Upload missing assets to Drive")
    print("=" * 50)
    uploaded, deduped, skipped = phase2_upload(catalog, competitors_dir, args.brand, args.dry_run)
    print(f"\n  {uploaded} unique files uploaded, {deduped} content duplicates linked, {skipped} brands skipped")

    if not args.dry_run and uploaded > 0:
        save_catalog(catalog, competitors_dir)
        print(f"  Catalog saved")

    print("\n[done] Sync complete")


if __name__ == "__main__":
    main()
