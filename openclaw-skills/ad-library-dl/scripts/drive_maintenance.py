#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["google-api-python-client>=2.100.0", "google-auth>=2.23.0"]
# ///
"""Drive Maintenance -- audit, dedup, reorganize, and sync Google Drive folders.

Standalone maintenance tool for the ad-library-dl CI pipeline.
Operates on Drive folders and local catalog/creatives data per profile.

Subcommands:
    audit          Non-destructive scan and report
    dedup          Remove duplicate files from Drive (uses trash)
    clean-small    Remove logo/branding files under size threshold
    move-clones    Restructure clone outputs into brand Clones/ folders
    sync-missing   Upload assets without drive_file_id
    clean-local    Local filesystem cleanup (downloads, orphans, stubs)

Usage:
    uv run drive_maintenance.py audit [--brand <name>] [--output <path>]
    uv run drive_maintenance.py dedup [--brand <name>] [--dry-run]
    uv run drive_maintenance.py clean-small [--brand <name>] [--max-size 15000] [--dry-run]
    uv run drive_maintenance.py move-clones [--dry-run]
    uv run drive_maintenance.py sync-missing [--brand <name>]
    uv run drive_maintenance.py clean-local [--dry-run] [--force]
"""

from __future__ import annotations

import argparse
import collections
import datetime
import hashlib
import json
import os
import pathlib
import re
import shutil
import sys

# ---------------------------------------------------------------------------
# Path setup -- profile-agnostic via script location
# ---------------------------------------------------------------------------

_script_dir = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(_script_dir))

PROFILE_ROOT = _script_dir.parent.parent.parent
COMPETITORS_DIR = PROFILE_ROOT / "workspace" / "brand" / "competitors"
CATALOG_PATH = COMPETITORS_DIR / "catalog.json"
CREATIVES_DIR = PROFILE_ROOT / "workspace" / "brand" / "creatives"
CREATIVES_INDEX_PATH = CREATIVES_DIR / "index.json"
DOWNLOADS_DIR = pathlib.Path.home() / "Downloads" / "ad-library"
CI_DB_PATH = COMPETITORS_DIR / "ci.db"

# Reuse existing helpers from sibling scripts
from competitor_monitor import (
    _drive_service,
    _drive_find_or_create_folder,
    _drive_upload_file,
    ensure_drive_structure,
)
from analyze_competitor import load_catalog, save_catalog

# NOTE: sync_drive.py has a pre-existing indentation error that prevents
# importing from it. The small helpers we need are inlined below.

# ---------------------------------------------------------------------------
# Constants and helpers inlined from sync_drive.py (avoids broken import)
# ---------------------------------------------------------------------------

MEDIA_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".mp4", ".webm", ".mov"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}

LOCAL_RANK_RE = re.compile(r"^rank-\d{3}-(?:img|vid)-([a-f0-9]{10})\.\w+$")
DRIVE_RANK_RE = re.compile(r"^\d{3}_([a-f0-9]{10})\.\w+$")


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
    """Find all media files for a brand, keyed by url_hash from filename.

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


# ---------------------------------------------------------------------------
# Drive helpers (extensions beyond what sibling scripts provide)
# ---------------------------------------------------------------------------

def _drive_list_files_full(drive_svc, folder_id: str) -> list[dict]:
    """List files with full metadata (id, name, size, md5Checksum, createdTime, modifiedTime)."""
    results: list[dict] = []
    page_token = None
    while True:
        resp = drive_svc.files().list(
            q=f"'{folder_id}' in parents and trashed = false"
            " and mimeType != 'application/vnd.google-apps.folder'",
            pageSize=100,
            fields="nextPageToken, files(id, name, size, md5Checksum, createdTime, modifiedTime)",
            pageToken=page_token,
        ).execute()
        results.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return results


def _drive_trash(drive_svc, file_id: str) -> None:
    """Move file to Drive trash (recoverable for 30 days)."""
    drive_svc.files().update(fileId=file_id, body={"trashed": True}).execute()


def _drive_move(drive_svc, file_id: str, new_parent_id: str) -> None:
    """Move file to a different Drive folder."""
    f = drive_svc.files().get(fileId=file_id, fields="parents").execute()
    prev = ",".join(f.get("parents", []))
    drive_svc.files().update(
        fileId=file_id,
        addParents=new_parent_id,
        removeParents=prev,
        fields="id, parents",
    ).execute()


def _drive_list_folders(drive_svc, parent_id: str) -> list[dict]:
    """List subfolders in a Drive folder."""
    results: list[dict] = []
    page_token = None
    while True:
        resp = drive_svc.files().list(
            q=f"'{parent_id}' in parents and trashed = false"
            " and mimeType = 'application/vnd.google-apps.folder'",
            pageSize=100,
            fields="nextPageToken, files(id, name)",
            pageToken=page_token,
        ).execute()
        results.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return results


def _now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Subcommand: audit
# ---------------------------------------------------------------------------

def cmd_audit(args: argparse.Namespace) -> None:
    """Non-destructive scan and report."""
    catalog = load_catalog(COMPETITORS_DIR)
    brands = catalog.get("brands", {})
    assets = catalog.get("assets", {})
    drive_svc = _drive_service()
    if not drive_svc:
        print("[ERROR] Could not initialize Drive service.")
        sys.exit(1)

    report: dict = {"generated_at": _now_iso(), "profile_root": str(PROFILE_ROOT), "brands": {}}

    brand_filter = args.brand
    for brand_dir, brand_entry in brands.items():
        if brand_filter and brand_dir != brand_filter:
            continue

        display = brand_entry.get("display_name", brand_dir)
        print(f"\n{'='*60}")
        print(f"  Auditing: {display} ({brand_dir})")
        print(f"{'='*60}")

        brand_report: dict = {
            "display_name": display,
            "folders": {},
            "filename_hash_dupes": [],
            "content_dupes": [],
            "small_files": [],
            "misnamed_files": [],
            "orphaned_drive_files": [],
        }

        # Collect asset hashes for this brand
        brand_hashes = {h for h, a in assets.items() if a.get("brand") == brand_dir}

        folder_map = {
            "Statics": brand_entry.get("drive_statics_folder_id"),
            "Videos": brand_entry.get("drive_videos_folder_id"),
            "Carousels": brand_entry.get("drive_carousels_folder_id"),
        }

        for folder_name, folder_id in folder_map.items():
            if not folder_id:
                print(f"  [{folder_name}] No folder ID -- skipped")
                continue

            files = _drive_list_files_full(drive_svc, folder_id)
            print(f"  [{folder_name}] {len(files)} files")
            brand_report["folders"][folder_name] = {"file_count": len(files), "folder_id": folder_id}

            # Group by url_hash
            by_hash: dict[str, list[dict]] = collections.defaultdict(list)
            by_md5: dict[str, list[dict]] = collections.defaultdict(list)

            for f in files:
                h = _extract_hash(f["name"])
                if h:
                    by_hash[h].append(f)
                else:
                    brand_report["misnamed_files"].append({
                        "folder": folder_name,
                        "file_id": f["id"],
                        "name": f["name"],
                        "size": int(f.get("size", 0)),
                    })

                md5 = f.get("md5Checksum")
                if md5:
                    by_md5[md5].append(f)

                # Small file check
                size = int(f.get("size", 0))
                if size < 15000 and size > 0:
                    brand_report["small_files"].append({
                        "folder": folder_name,
                        "file_id": f["id"],
                        "name": f["name"],
                        "size": size,
                    })

                # Orphan check: in Drive but no catalog entry
                if h and h not in brand_hashes:
                    brand_report["orphaned_drive_files"].append({
                        "folder": folder_name,
                        "file_id": f["id"],
                        "name": f["name"],
                        "hash": h,
                    })

            # Filename-hash duplicates
            for h, group in by_hash.items():
                if len(group) > 1:
                    brand_report["filename_hash_dupes"].append({
                        "hash": h,
                        "folder": folder_name,
                        "count": len(group),
                        "files": [{"id": g["id"], "name": g["name"], "size": int(g.get("size", 0))} for g in group],
                    })

            # Content (md5) duplicates
            for md5, group in by_md5.items():
                if len(group) > 1:
                    # Only report if they have different names (same-name dupes caught above)
                    names = {g["name"] for g in group}
                    if len(names) > 1:
                        brand_report["content_dupes"].append({
                            "md5": md5,
                            "folder": folder_name,
                            "count": len(group),
                            "files": [{"id": g["id"], "name": g["name"]} for g in group],
                        })

        # Print summary
        nh = len(brand_report["filename_hash_dupes"])
        nc = len(brand_report["content_dupes"])
        ns = len(brand_report["small_files"])
        nm = len(brand_report["misnamed_files"])
        no = len(brand_report["orphaned_drive_files"])
        print(f"  Summary: {nh} hash-dupes, {nc} content-dupes, {ns} small, {nm} misnamed, {no} orphaned")

        report["brands"][brand_dir] = brand_report

    # Assets with null drive_file_id
    null_drive = [
        {"hash": h, "brand": a.get("brand"), "filename": a.get("filename")}
        for h, a in assets.items()
        if not a.get("drive_file_id") and a.get("brand") in brands
    ]
    report["assets_missing_drive_id"] = len(null_drive)
    print(f"\nAssets missing drive_file_id: {len(null_drive)}")

    if args.output:
        out = pathlib.Path(args.output)
        out.write_text(json.dumps(report, indent=2))
        print(f"\nReport written to: {out}")


# ---------------------------------------------------------------------------
# Subcommand: dedup
# ---------------------------------------------------------------------------

def cmd_dedup(args: argparse.Namespace) -> None:
    """Remove duplicate files from Drive (hash-based and content-based)."""
    catalog = load_catalog(COMPETITORS_DIR)
    brands = catalog.get("brands", {})
    assets = catalog.get("assets", {})
    drive_svc = _drive_service()
    if not drive_svc:
        print("[ERROR] Could not initialize Drive service.")
        sys.exit(1)

    total_trashed = 0
    brand_filter = args.brand

    for brand_dir, brand_entry in brands.items():
        if brand_filter and brand_dir != brand_filter:
            continue

        display = brand_entry.get("display_name", brand_dir)
        print(f"\n--- Dedup: {display} ---")

        folder_map = {
            "Statics": brand_entry.get("drive_statics_folder_id"),
            "Videos": brand_entry.get("drive_videos_folder_id"),
            "Carousels": brand_entry.get("drive_carousels_folder_id"),
        }

        for folder_name, folder_id in folder_map.items():
            if not folder_id:
                continue

            files = _drive_list_files_full(drive_svc, folder_id)
            if not files:
                continue

            # --- Phase 1: Hash-based dedup ---
            by_hash: dict[str, list[dict]] = collections.defaultdict(list)
            for f in files:
                h = _extract_hash(f["name"])
                if h:
                    by_hash[h].append(f)

            for h, group in by_hash.items():
                if len(group) <= 1:
                    continue

                # Determine which to keep: prefer the one matching current_rank in catalog
                asset = assets.get(h)
                keep: dict | None = None
                if asset:
                    current_rank = asset.get("current_rank")
                    if current_rank is not None:
                        expected_prefix = f"{current_rank:03d}_"
                        for g in group:
                            if g["name"].startswith(expected_prefix):
                                keep = g
                                break

                # Fallback: keep the most recently modified
                if not keep:
                    group_sorted = sorted(group, key=lambda g: g.get("modifiedTime", ""), reverse=True)
                    keep = group_sorted[0]

                for g in group:
                    if g["id"] == keep["id"]:
                        continue
                    print(f"  [hash-dedup] Trashing {g['name']} (keeping {keep['name']}) in {folder_name}")
                    if not args.dry_run:
                        _drive_trash(drive_svc, g["id"])
                        # Clear drive_file_id in catalog if it pointed to trashed file
                        for ah, av in assets.items():
                            if av.get("drive_file_id") == g["id"]:
                                av["drive_file_id"] = None
                    total_trashed += 1

            # --- Phase 2: Content (md5) dedup ---
            # Re-list to exclude just-trashed files (only if not dry-run)
            if not args.dry_run and total_trashed > 0:
                files = _drive_list_files_full(drive_svc, folder_id)

            by_md5: dict[str, list[dict]] = collections.defaultdict(list)
            for f in files:
                md5 = f.get("md5Checksum")
                if md5:
                    by_md5[md5].append(f)

            for md5, group in by_md5.items():
                if len(group) <= 1:
                    continue

                # Keep the one with highest-priority name (lowest rank number)
                group_sorted = sorted(group, key=lambda g: g["name"])
                keep = group_sorted[0]

                for g in group_sorted[1:]:
                    print(f"  [md5-dedup] Trashing {g['name']} (same content as {keep['name']}) in {folder_name}")
                    if not args.dry_run:
                        _drive_trash(drive_svc, g["id"])
                        for ah, av in assets.items():
                            if av.get("drive_file_id") == g["id"]:
                                av["drive_file_id"] = None
                    total_trashed += 1

    action = "Would trash" if args.dry_run else "Trashed"
    print(f"\n{action} {total_trashed} duplicate files.")

    if not args.dry_run and total_trashed > 0:
        save_catalog(catalog, COMPETITORS_DIR)
        print("Catalog updated.")


# ---------------------------------------------------------------------------
# Subcommand: clean-small
# ---------------------------------------------------------------------------

def cmd_clean_small(args: argparse.Namespace) -> None:
    """Remove logo/branding files under size threshold."""
    catalog = load_catalog(COMPETITORS_DIR)
    brands = catalog.get("brands", {})
    assets = catalog.get("assets", {})
    drive_svc = _drive_service()
    if not drive_svc:
        print("[ERROR] Could not initialize Drive service.")
        sys.exit(1)

    max_size = args.max_size
    total_trashed = 0
    brand_filter = args.brand

    for brand_dir, brand_entry in brands.items():
        if brand_filter and brand_dir != brand_filter:
            continue

        display = brand_entry.get("display_name", brand_dir)
        print(f"\n--- Clean small files: {display} (threshold: {max_size} bytes) ---")

        folder_map = {
            "Statics": brand_entry.get("drive_statics_folder_id"),
            "Videos": brand_entry.get("drive_videos_folder_id"),
        }

        for folder_name, folder_id in folder_map.items():
            if not folder_id:
                continue

            files = _drive_list_files_full(drive_svc, folder_id)
            for f in files:
                size = int(f.get("size", 0))
                if 0 < size < max_size:
                    print(f"  Trashing {f['name']} ({size} bytes) from {folder_name}")
                    if not args.dry_run:
                        _drive_trash(drive_svc, f["id"])
                        # Clear drive_file_id in catalog
                        for ah, av in assets.items():
                            if av.get("drive_file_id") == f["id"]:
                                av["drive_file_id"] = None
                    total_trashed += 1

    action = "Would trash" if args.dry_run else "Trashed"
    print(f"\n{action} {total_trashed} small files.")

    if not args.dry_run and total_trashed > 0:
        save_catalog(catalog, COMPETITORS_DIR)
        print("Catalog updated.")


# ---------------------------------------------------------------------------
# Subcommand: move-clones
# ---------------------------------------------------------------------------

def cmd_move_clones(args: argparse.Namespace) -> None:
    """Restructure clone outputs into brand Clones/ folders."""
    catalog = load_catalog(COMPETITORS_DIR)
    brands = catalog.get("brands", {})
    drive_svc = _drive_service()
    if not drive_svc:
        print("[ERROR] Could not initialize Drive service.")
        sys.exit(1)

    # Load creatives index
    if not CREATIVES_INDEX_PATH.exists():
        print("[INFO] No creatives index.json found -- nothing to move.")
        return

    index = json.loads(CREATIVES_INDEX_PATH.read_text())
    if not isinstance(index, list):
        print("[ERROR] creatives/index.json is not a list.")
        return

    # Find a shared "Creatives" parent folder in Drive (Competitor Clones subfolder)
    # We look for clone entries that have a drive_folder_id already set
    # and check if there is a "Competitor Clones" folder to migrate from.

    moved = 0
    for entry in index:
        if entry.get("category") != "clone":
            continue

        concept_id = entry.get("id", "")
        competitor_ref = entry.get("competitor_ref")
        current_drive_folder = entry.get("drive_folder_id")

        if not competitor_ref:
            print(f"  [skip] {concept_id}: no competitor_ref")
            continue

        ref_brand = competitor_ref.get("brand", "")

        # Find the matching brand in catalog by display_name
        target_brand_dir = None
        for bd, be in brands.items():
            if be.get("display_name") == ref_brand or bd == ref_brand:
                target_brand_dir = bd
                break

        if not target_brand_dir:
            print(f"  [skip] {concept_id}: competitor brand '{ref_brand}' not in catalog")
            continue

        clones_folder_id = brands[target_brand_dir].get("drive_clones_folder_id")
        if not clones_folder_id:
            print(f"  [skip] {concept_id}: brand '{target_brand_dir}' has no drive_clones_folder_id")
            continue

        if not current_drive_folder:
            print(f"  [skip] {concept_id}: not yet uploaded to Drive")
            continue

        # Check if already inside the Clones folder
        try:
            folder_info = drive_svc.files().get(
                fileId=current_drive_folder, fields="parents"
            ).execute()
            current_parents = folder_info.get("parents", [])
        except Exception as e:
            print(f"  [error] {concept_id}: cannot read folder parents: {e}")
            continue

        if clones_folder_id in current_parents:
            # Already in the right place
            continue

        print(f"  Moving {concept_id} -> {target_brand_dir}/Clones/")
        if not args.dry_run:
            try:
                _drive_move(drive_svc, current_drive_folder, clones_folder_id)
                # Update index entry
                new_url = f"https://drive.google.com/drive/folders/{current_drive_folder}"
                entry["drive_url"] = new_url
                moved += 1
            except Exception as e:
                print(f"  [error] Failed to move {concept_id}: {e}")
        else:
            moved += 1

    action = "Would move" if args.dry_run else "Moved"
    print(f"\n{action} {moved} clone concept(s) into brand Clones/ folders.")

    if not args.dry_run and moved > 0:
        CREATIVES_INDEX_PATH.write_text(json.dumps(index, indent=2) + "\n")
        print("Creatives index updated.")


# ---------------------------------------------------------------------------
# Subcommand: sync-missing
# ---------------------------------------------------------------------------

def cmd_sync_missing(args: argparse.Namespace) -> None:
    """Upload assets without drive_file_id to Drive."""
    catalog = load_catalog(COMPETITORS_DIR)
    brands = catalog.get("brands", {})
    assets = catalog.get("assets", {})
    drive_svc = _drive_service()
    if not drive_svc:
        print("[ERROR] Could not initialize Drive service.")
        sys.exit(1)

    brand_filter = args.brand
    uploaded_count = 0
    skipped_count = 0

    # Open ci.db if it exists
    ci = None
    if CI_DB_PATH.exists():
        try:
            from ci_store import CIStore
            ci = CIStore()
        except Exception as e:
            print(f"[WARN] Could not open ci.db: {e}")

    # --- Part 1: Upload catalog assets missing drive_file_id ---
    print("=== Syncing catalog assets ===")

    for brand_dir, brand_entry in brands.items():
        if brand_filter and brand_dir != brand_filter:
            continue

        display = brand_entry.get("display_name", brand_dir)
        statics_id = brand_entry.get("drive_statics_folder_id")
        videos_id = brand_entry.get("drive_videos_folder_id")

        if not statics_id and not videos_id:
            # Try to create Drive structure
            brand_entry = ensure_drive_structure(drive_svc, catalog, brand_dir, display)
            catalog["brands"][brand_dir] = brand_entry
            statics_id = brand_entry.get("drive_statics_folder_id")
            videos_id = brand_entry.get("drive_videos_folder_id")
            if not statics_id and not videos_id:
                print(f"  [{display}] Could not create Drive folders -- skipping")
                continue

        # Find local files for this brand
        local_files = _find_local_files(COMPETITORS_DIR, brand_dir)

        # Content hash dedup: track what we have already uploaded by sha256
        uploaded_sha: dict[str, str] = {}  # sha256 -> drive_file_id

        brand_assets = [(h, a) for h, a in assets.items() if a.get("brand") == brand_dir and not a.get("drive_file_id")]
        print(f"\n  [{display}] {len(brand_assets)} assets missing drive_file_id")

        for h, asset in brand_assets:
            local_path = local_files.get(h)
            if not local_path or not local_path.exists():
                skipped_count += 1
                continue

            ext = local_path.suffix.lower()
            is_video = ext in VIDEO_EXTENSIONS
            target_folder = videos_id if is_video else statics_id
            if not target_folder:
                skipped_count += 1
                continue

            # Content dedup
            sha = _content_sha256(local_path)
            if sha in uploaded_sha:
                # Same content already uploaded -- reuse drive_file_id
                asset["drive_file_id"] = uploaded_sha[sha]
                asset["content_hash"] = sha
                print(f"    {h}: content-dedup (reusing {uploaded_sha[sha][:12]}...)")
                if ci:
                    ci.update_asset_drive_id(h, uploaded_sha[sha])
                uploaded_count += 1
                continue

            # Build canonical name
            rank = asset.get("current_rank") or asset.get("rank") or 0
            rank_name = f"{rank:03d}_{h}{ext}"

            print(f"    Uploading {rank_name} -> {'Videos' if is_video else 'Statics'}")
            try:
                file_id = _drive_upload_file(drive_svc, local_path, target_folder, rank_name)
                asset["drive_file_id"] = file_id
                asset["content_hash"] = sha
                uploaded_sha[sha] = file_id
                if ci:
                    ci.update_asset_drive_id(h, file_id)
                uploaded_count += 1
            except Exception as e:
                print(f"    [error] Upload failed for {h}: {e}")
                skipped_count += 1

    # --- Part 2: Upload clone concepts missing from Drive ---
    print("\n=== Syncing clone concepts ===")

    if CREATIVES_INDEX_PATH.exists():
        index = json.loads(CREATIVES_INDEX_PATH.read_text())
        if isinstance(index, list):
            clone_uploaded = 0
            for entry in index:
                if entry.get("category") != "clone":
                    continue
                if entry.get("drive_folder_id"):
                    continue  # Already uploaded

                concept_id = entry.get("id", "")
                local_dir_rel = entry.get("local_dir", "")
                local_dir = PROFILE_ROOT / "workspace" / "brand" / local_dir_rel
                if not local_dir.exists():
                    print(f"  [skip] {concept_id}: local dir not found ({local_dir_rel})")
                    continue

                # Determine target Clones folder from competitor_ref
                competitor_ref = entry.get("competitor_ref")
                target_clones_id = None
                if competitor_ref:
                    ref_brand = competitor_ref.get("brand", "")
                    for bd, be in brands.items():
                        if be.get("display_name") == ref_brand or bd == ref_brand:
                            target_clones_id = be.get("drive_clones_folder_id")
                            break

                if not target_clones_id:
                    # Try to use a generic Creatives folder -- skip if none
                    print(f"  [skip] {concept_id}: no target Clones folder")
                    continue

                # Create concept subfolder in Clones
                concept_folder_id = _drive_find_or_create_folder(
                    drive_svc, concept_id, target_clones_id
                )

                # Upload all PNG/JPG files from the concept dir
                media_files = [
                    f for f in local_dir.iterdir()
                    if f.is_file() and f.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
                ]

                if not media_files:
                    print(f"  [skip] {concept_id}: no media files in local dir")
                    continue

                print(f"  Uploading {concept_id} ({len(media_files)} files)")
                for mf in media_files:
                    try:
                        _drive_upload_file(drive_svc, mf, concept_folder_id, mf.name)
                    except Exception as e:
                        print(f"    [error] {mf.name}: {e}")

                entry["drive_folder_id"] = concept_folder_id
                entry["drive_url"] = f"https://drive.google.com/drive/folders/{concept_folder_id}"
                clone_uploaded += 1

            if clone_uploaded > 0:
                CREATIVES_INDEX_PATH.write_text(json.dumps(index, indent=2) + "\n")
                print(f"  Uploaded {clone_uploaded} clone concept(s). Index updated.")
            else:
                print("  No clone concepts needed uploading.")

    print(f"\nTotal: {uploaded_count} assets uploaded/deduped, {skipped_count} skipped (no local file/folder).")

    if uploaded_count > 0:
        save_catalog(catalog, COMPETITORS_DIR)
        print("Catalog saved.")


# ---------------------------------------------------------------------------
# Subcommand: clean-local
# ---------------------------------------------------------------------------

def cmd_clean_local(args: argparse.Namespace) -> None:
    """Local filesystem cleanup: downloads, orphans, dupes, stubs."""
    catalog = load_catalog(COMPETITORS_DIR)
    brands = catalog.get("brands", {})
    assets = catalog.get("assets", {})
    dry_run = args.dry_run

    print("=== Part A: Downloads cleanup ===")
    _clean_downloads(catalog, dry_run, args.force)

    print("\n=== Part B: AG1 orphan removal ===")
    _clean_ag1_orphans(catalog, dry_run)

    print("\n=== Part C: Duplicate clone entries ===")
    _clean_dupe_clones(catalog, dry_run)

    print("\n=== Part D: Stub session cleanup ===")
    _clean_stub_sessions(catalog, dry_run)

    if not dry_run:
        save_catalog(catalog, COMPETITORS_DIR)
        print("\nCatalog saved.")


def _clean_downloads(catalog: dict, dry_run: bool, force: bool) -> None:
    """Cross-reference Downloads against workspace; remove duplicates."""
    if not DOWNLOADS_DIR.exists():
        print("  Downloads dir does not exist -- nothing to do.")
        return

    brands = catalog.get("brands", {})

    # Old flat-format dirs that are no longer tracked
    old_dirs = {"Bedsure_Home", "Bedsure_Home_scroll_test", "Brooklinen", "Nectar_Sleep"}

    freed_bytes = 0
    removed_dirs = 0

    for brand_dl_dir in sorted(DOWNLOADS_DIR.iterdir()):
        if not brand_dl_dir.is_dir():
            continue

        brand_name = brand_dl_dir.name

        if brand_name in old_dirs:
            size = sum(f.stat().st_size for f in brand_dl_dir.rglob("*") if f.is_file())
            print(f"  [old] {brand_name}: {size // 1024}KB -- {'removing' if not dry_run else 'would remove'}")
            if not dry_run:
                shutil.rmtree(brand_dl_dir)
            freed_bytes += size
            removed_dirs += 1
            continue

        # Check if brand has a workspace dir
        workspace_brand_dir = COMPETITORS_DIR / brand_name
        if not workspace_brand_dir.exists():
            # Brand not tracked in this profile -- check if tracked in another profile
            if brand_name not in brands:
                print(f"  [untracked] {brand_name}: not in this profile's catalog")
                if force:
                    size = sum(f.stat().st_size for f in brand_dl_dir.rglob("*") if f.is_file())
                    print(f"    --force: {'removing' if not dry_run else 'would remove'} ({size // 1024}KB)")
                    if not dry_run:
                        shutil.rmtree(brand_dl_dir)
                    freed_bytes += size
                    removed_dirs += 1
                continue

        # Cross-reference sessions
        dl_sessions = {d.name for d in brand_dl_dir.iterdir() if d.is_dir()}
        ws_sessions = {d.name for d in workspace_brand_dir.iterdir() if d.is_dir()} if workspace_brand_dir.exists() else set()

        # Sessions in both: safe to delete from Downloads
        overlap = dl_sessions & ws_sessions
        for sess in sorted(overlap):
            sess_path = brand_dl_dir / sess
            size = sum(f.stat().st_size for f in sess_path.rglob("*") if f.is_file())
            freed_bytes += size
            print(f"  [dup] {brand_name}/{sess}: {'removing' if not dry_run else 'would remove'} ({size // 1024}KB)")
            if not dry_run:
                shutil.rmtree(sess_path)
            removed_dirs += 1

        # Sessions only in Downloads: report
        dl_only = dl_sessions - ws_sessions
        for sess in sorted(dl_only):
            sess_path = brand_dl_dir / sess
            size = sum(f.stat().st_size for f in sess_path.rglob("*") if f.is_file())
            if force:
                freed_bytes += size
                print(f"  [dl-only] {brand_name}/{sess}: --force removing ({size // 1024}KB)")
                if not dry_run:
                    shutil.rmtree(sess_path)
                removed_dirs += 1
            else:
                print(f"  [dl-only] {brand_name}/{sess}: kept ({size // 1024}KB) -- use --force to remove")

        # Remove empty brand dir after cleanup
        if not dry_run and brand_dl_dir.exists() and not any(brand_dl_dir.iterdir()):
            brand_dl_dir.rmdir()
            print(f"  [empty] Removed empty dir: {brand_name}/")

    action = "Would free" if dry_run else "Freed"
    print(f"\n  {action} {freed_bytes // (1024*1024)}MB across {removed_dirs} directories.")


def _clean_ag1_orphans(catalog: dict, dry_run: bool) -> None:
    """Remove AG1 orphan assets from catalog and ci.db."""
    assets = catalog.get("assets", {})
    brands = catalog.get("brands", {})

    ag1_hashes = [h for h, a in assets.items() if a.get("brand", "").startswith("AG1")]

    if not ag1_hashes:
        print("  No AG1 assets found.")
        return

    # Verify AG1 is not a tracked brand
    ag1_brand_key = None
    for bd in brands:
        if bd.startswith("AG1"):
            ag1_brand_key = bd
            break

    if ag1_brand_key:
        print(f"  AG1 has a brands entry ({ag1_brand_key}) -- skipping orphan removal.")
        print("  Remove the brands entry manually first if these are truly orphans.")
        return

    print(f"  Found {len(ag1_hashes)} AG1 orphan assets (no brands entry)")

    if not dry_run:
        for h in ag1_hashes:
            del assets[h]

        # Also remove from ci.db if it exists
        if CI_DB_PATH.exists():
            try:
                import sqlite3
                conn = sqlite3.connect(str(CI_DB_PATH))
                deleted = 0
                for h in ag1_hashes:
                    # Delete from dependent tables first
                    conn.execute("DELETE FROM rank_history WHERE asset_hash = ?", (h,))
                    conn.execute("DELETE FROM analyses WHERE asset_hash = ?", (h,))
                    conn.execute("DELETE FROM clones WHERE asset_hash = ?", (h,))
                    cur = conn.execute("DELETE FROM assets WHERE url_hash = ?", (h,))
                    deleted += cur.rowcount
                conn.commit()
                conn.close()
                print(f"  Removed {deleted} rows from ci.db")
            except Exception as e:
                print(f"  [WARN] ci.db cleanup failed: {e}")

        print(f"  Removed {len(ag1_hashes)} AG1 orphan assets from catalog.")
    else:
        print(f"  Would remove {len(ag1_hashes)} AG1 orphan assets.")


def _clean_dupe_clones(catalog: dict, dry_run: bool) -> None:
    """Deduplicate clone entries in assets (same clone_id, keep latest)."""
    assets = catalog.get("assets", {})
    total_removed = 0

    for h, asset in assets.items():
        clones = asset.get("clones")
        if not clones or len(clones) <= 1:
            continue

        # Group by clone_id
        by_id: dict[str, list[dict]] = collections.defaultdict(list)
        for cl in clones:
            cid = cl.get("clone_id", "")
            by_id[cid].append(cl)

        deduped: list[dict] = []
        for cid, group in by_id.items():
            if len(group) > 1:
                # Keep the one with the latest created_at
                group_sorted = sorted(
                    group,
                    key=lambda c: c.get("created_at", ""),
                    reverse=True,
                )
                deduped.append(group_sorted[0])
                total_removed += len(group) - 1
            else:
                deduped.append(group[0])

        if len(deduped) < len(clones):
            if not dry_run:
                asset["clones"] = deduped

    action = "Would remove" if dry_run else "Removed"
    print(f"  {action} {total_removed} duplicate clone entries.")


def _clean_stub_sessions(catalog: dict, dry_run: bool) -> None:
    """Remove session dirs that contain only competitive-analysis.md and no media."""
    brands = catalog.get("brands", {})
    removed = 0

    for brand_dir in brands:
        brand_path = COMPETITORS_DIR / brand_dir
        if not brand_path.exists():
            continue

        for session_dir in sorted(brand_path.iterdir()):
            if not session_dir.is_dir():
                continue
            if session_dir.name in ("latest", "clones"):
                continue

            files = list(session_dir.iterdir())
            media = [f for f in files if f.suffix.lower() in MEDIA_EXTENSIONS]

            if not media and files:
                # Has files but no media -- stub session
                file_names = [f.name for f in files]
                if all(f.endswith(".md") or f.endswith(".json") for f in file_names):
                    print(f"  [stub] {brand_dir}/{session_dir.name}: {file_names}")
                    if not dry_run:
                        shutil.rmtree(session_dir)
                    removed += 1

    action = "Would remove" if dry_run else "Removed"
    print(f"  {action} {removed} stub session(s).")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Drive maintenance: audit, dedup, reorganize, and sync.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # audit
    p_audit = sub.add_parser("audit", help="Non-destructive scan and report")
    p_audit.add_argument("--brand", help="Filter to specific brand directory")
    p_audit.add_argument("--output", help="Write JSON report to file")
    p_audit.set_defaults(func=cmd_audit)

    # dedup
    p_dedup = sub.add_parser("dedup", help="Remove duplicate files from Drive")
    p_dedup.add_argument("--brand", help="Filter to specific brand directory")
    p_dedup.add_argument("--dry-run", action="store_true", help="Preview without changes")
    p_dedup.set_defaults(func=cmd_dedup)

    # clean-small
    p_small = sub.add_parser("clean-small", help="Remove small files (logos, icons)")
    p_small.add_argument("--brand", help="Filter to specific brand directory")
    p_small.add_argument("--max-size", type=int, default=15000, help="Size threshold in bytes (default: 15000)")
    p_small.add_argument("--dry-run", action="store_true", help="Preview without changes")
    p_small.set_defaults(func=cmd_clean_small)

    # move-clones
    p_move = sub.add_parser("move-clones", help="Move clone concepts into brand Clones/ folders")
    p_move.add_argument("--dry-run", action="store_true", help="Preview without changes")
    p_move.set_defaults(func=cmd_move_clones)

    # sync-missing
    p_sync = sub.add_parser("sync-missing", help="Upload assets without drive_file_id")
    p_sync.add_argument("--brand", help="Filter to specific brand directory")
    p_sync.set_defaults(func=cmd_sync_missing)

    # clean-local
    p_local = sub.add_parser("clean-local", help="Local filesystem cleanup")
    p_local.add_argument("--dry-run", action="store_true", help="Preview without changes")
    p_local.add_argument("--force", action="store_true", help="Remove untracked Downloads dirs too")
    p_local.set_defaults(func=cmd_clean_local)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
