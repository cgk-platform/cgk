#!/usr/bin/env python3
"""Migrate openCLAW video catalog clips to CGK Platform DAM.

Reads catalog.json from the openCLAW catalog store and uploads
each clip's file to Vercel Blob, then ingests metadata to the DAM.
Supports resume, backfill, verify, and concurrent uploads.

Usage:
    python migrate_to_dam.py --dry-run                    # Report what would migrate
    python migrate_to_dam.py --batch-size 5               # Test with 5 clips
    python migrate_to_dam.py --resume                     # Continue interrupted migration
    python migrate_to_dam.py --backfill-urls              # Fix metadata-only clips
    python migrate_to_dam.py --verify                     # Parity check
    python migrate_to_dam.py --concurrency 3              # Parallel uploads
"""

import argparse
import json
import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Ensure lib/ is importable
sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.dam_client import DAMClient, compute_file_hash, build_clip_payload


def detect_has_burned_captions(segments):
    """Infer burned-caption status from segment text_overlay fields."""
    return any(seg.get('text_overlay') for seg in segments)


# ---------------------------------------------------------------------------
# Progress tracking
# ---------------------------------------------------------------------------

def _progress_path(catalog_dir):
    """Path to the migration progress file."""
    return catalog_dir / '_dam_migration_progress.json'


def load_progress(catalog_dir):
    """Load migration progress state."""
    p = _progress_path(catalog_dir)
    if p.exists():
        try:
            with open(p, encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    return {"completed": {}, "errors": {}}


def save_progress(catalog_dir, progress):
    """Save migration progress atomically."""
    p = _progress_path(catalog_dir)
    tmp = p.with_suffix('.tmp')
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(progress, f, indent=2)
    os.replace(str(tmp), str(p))


# ---------------------------------------------------------------------------
# Resolve local file path for a clip
# ---------------------------------------------------------------------------

def resolve_local_path(clip, media_dir):
    """Find the local file for a catalog clip. Returns path str or None."""
    filename = clip.get('filename', '')
    path_str = clip.get('path', '')

    if path_str and os.path.exists(path_str):
        return path_str

    candidate = media_dir / filename
    if candidate.exists():
        return str(candidate)

    for sub in ('social', 'stock', 'gdrive', 'veo', 'inbound', 'recorded'):
        alt = media_dir / 'catalog' / sub / filename
        if alt.exists():
            return str(alt)

    return None


# ---------------------------------------------------------------------------
# Single clip migration (upload + ingest)
# ---------------------------------------------------------------------------

# Module-level lock for thread-safe progress dict access
_progress_lock = threading.Lock()


def migrate_single_clip(client, clip, media_dir, progress, catalog_dir):
    """Upload and ingest a single clip. Returns (filename, status, detail)."""
    filename = clip.get('filename', '<unknown>')

    # Skip if already completed
    with _progress_lock:
        if filename in progress.get('completed', {}):
            return filename, 'skip', 'already migrated'

    local_path = resolve_local_path(clip, media_dir)
    if not local_path:
        return filename, 'error', 'local file not found'

    # Step 1: Compute file hash for deduplication
    try:
        file_hash = compute_file_hash(local_path)
    except OSError as e:
        return filename, 'error', f'hash error: {e}'

    # Step 2: Upload file to Blob
    upload_result = client.upload_clip(local_path)
    if not upload_result or not upload_result.get('url'):
        return filename, 'error', 'upload failed'

    blob_url = upload_result['url']

    # Step 3: Ingest metadata with real Blob URL
    payload = build_clip_payload(clip, media_dir, file_url=blob_url, file_hash=file_hash)
    ingest_result = client.ingest_clip(payload)

    if not ingest_result:
        return filename, 'error', 'ingest failed (file uploaded OK)'

    # Record success (thread-safe)
    with _progress_lock:
        progress.setdefault('completed', {})[filename] = {
            'asset_id': ingest_result.get('id'),
            'blob_url': blob_url,
            'duplicate': ingest_result.get('duplicate', False),
            'file_hash': file_hash,
            'file_size': os.path.getsize(local_path),
        }
        save_progress(catalog_dir, progress)

    status = 'duplicate' if ingest_result.get('duplicate') else 'ok'
    return filename, status, ingest_result.get('id', '')


# ---------------------------------------------------------------------------
# Backfill: update URLs for metadata-only clips
# ---------------------------------------------------------------------------

def backfill_clip(client, clip, media_dir, progress, catalog_dir):
    """Upload file and update URL for a clip already in DAM with local path."""
    filename = clip.get('filename', '<unknown>')

    # Look up existing DAM entry
    dam_entry = client.lookup_clip(filename)
    if not dam_entry:
        return filename, 'skip', 'not in DAM'

    file_url = dam_entry.get('file_url', '')

    # Skip if already has a real Blob URL
    if file_url.startswith('https://'):
        return filename, 'skip', 'already has Blob URL'

    # Find local file
    local_path = resolve_local_path(clip, media_dir)
    if not local_path:
        return filename, 'error', 'local file not found'

    # Upload
    upload_result = client.upload_clip(local_path)
    if not upload_result or not upload_result.get('url'):
        return filename, 'error', 'upload failed'

    blob_url = upload_result['url']
    file_hash = compute_file_hash(local_path)
    file_size = os.path.getsize(local_path)

    # Update URL on existing asset
    asset_id = dam_entry['asset_id']
    ok = client.update_clip_url(asset_id, blob_url, file_size, file_hash)
    if not ok:
        return filename, 'error', 'URL update failed (file uploaded OK)'

    with _progress_lock:
        progress.setdefault('completed', {})[filename] = {
            'asset_id': asset_id,
            'blob_url': blob_url,
            'backfilled': True,
            'file_hash': file_hash,
            'file_size': file_size,
        }
        save_progress(catalog_dir, progress)

    return filename, 'ok', asset_id


# ---------------------------------------------------------------------------
# Verify: parity check between local catalog and DAM
# ---------------------------------------------------------------------------

def verify_clip(client, clip, media_dir):
    """Check if a clip exists in DAM with a valid Blob URL."""
    filename = clip.get('filename', '<unknown>')
    dam_entry = client.lookup_clip(filename)

    if not dam_entry:
        return filename, 'missing', 'not found in DAM'

    file_url = dam_entry.get('file_url', '')
    if not file_url.startswith('https://'):
        return filename, 'metadata-only', 'URL is a local path (not yet uploaded)'

    # Optional: compare file sizes
    local_path = resolve_local_path(clip, media_dir)
    if local_path:
        local_size = os.path.getsize(local_path)
        dam_size = dam_entry.get('file_size_bytes')
        if dam_size and abs(local_size - dam_size) > 1024:
            return filename, 'size-mismatch', f'local={local_size}, dam={dam_size}'

    return filename, 'ok', dam_entry.get('asset_id', '')


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Migrate openCLAW catalog to CGK Platform DAM (with file upload)'
    )
    parser.add_argument(
        '--api-url',
        help='CGK Platform API base URL (e.g. https://admin.cgklinens.com)',
    )
    parser.add_argument(
        '--api-key',
        help='Tenant API key (cgk_... format) for authentication',
    )
    parser.add_argument(
        '--profile-root',
        help='openCLAW profile root directory (derived from script location if omitted)',
    )
    parser.add_argument(
        '--catalog-path',
        help='Explicit path to catalog.json (overrides default discovery)',
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Report what would be migrated without uploading',
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=0,
        help='Limit to N clips (0 = all)',
    )
    parser.add_argument(
        '--resume',
        action='store_true',
        help='Continue interrupted migration (skips already-completed clips)',
    )
    parser.add_argument(
        '--backfill-urls',
        action='store_true',
        help='Upload files and update URLs for clips already ingested with local paths',
    )
    parser.add_argument(
        '--verify',
        action='store_true',
        help='Compare local catalog vs DAM without uploading',
    )
    parser.add_argument(
        '--concurrency',
        type=int,
        default=1,
        help='Number of concurrent uploads (default: 1)',
    )
    args = parser.parse_args()

    # Derive profile root
    if args.profile_root:
        profile_root = Path(args.profile_root).resolve()
    else:
        script_dir = Path(__file__).resolve().parent
        profile_root = script_dir.parents[2]

    # Resolve catalog path
    catalog_dir = profile_root / 'workspace' / '.video-catalogs'
    if args.catalog_path:
        catalog_file = Path(args.catalog_path).resolve()
    else:
        catalog_file = catalog_dir / 'master' / 'catalog.json'

    if not catalog_file.exists():
        print(f"ERROR: Catalog not found at {catalog_file}", file=sys.stderr)
        sys.exit(1)

    with open(catalog_file, encoding='utf-8') as f:
        catalog_data = json.load(f)

    clips = catalog_data.get('clips', [])
    if not isinstance(clips, list):
        print("ERROR: catalog.json 'clips' must be an array", file=sys.stderr)
        sys.exit(1)

    media_dir = profile_root / 'media'
    total = len(clips)
    print(f"Catalog: {catalog_file}")
    print(f"Clips found: {total}")

    # -- Dry run --
    if args.dry_run:
        progress = load_progress(catalog_dir)
        already_done = len(progress.get('completed', {}))
        print(f"\n--- DRY RUN (no data uploaded) ---")
        if already_done:
            print(f"Already migrated: {already_done}")
        missing_local = 0
        would_migrate = 0
        would_skip = 0
        for clip in clips:
            filename = clip.get('filename', '<unknown>')
            if filename in progress.get('completed', {}):
                would_skip += 1
                continue
            segments = clip.get('segments', [])
            has_burned = detect_has_burned_captions(segments)
            source = clip.get('source_type', 'gdrive' if clip.get('gdrive_url') else 'social')
            local = resolve_local_path(clip, media_dir)
            status = 'OK' if local else 'NO LOCAL FILE'
            if not local:
                missing_local += 1
            else:
                would_migrate += 1
            print(f"  {filename}: {len(segments)} segments, source={source}, burned={has_burned}, {status}")
        print(f"\nSummary: {would_migrate} would upload, {would_skip} already done, {missing_local} missing locally")
        return

    # -- Verify mode --
    if args.verify:
        client = DAMClient(args.api_url, args.api_key)
        if not client.configured:
            print("ERROR: --api-url and --api-key required for verify", file=sys.stderr)
            sys.exit(1)

        ok_count = 0
        missing = 0
        metadata_only = 0
        size_mismatch = 0
        for clip in clips:
            filename, status, detail = verify_clip(client, clip, media_dir)
            if status == 'ok':
                ok_count += 1
            elif status == 'missing':
                missing += 1
                print(f"  MISSING: {filename}")
            elif status == 'metadata-only':
                metadata_only += 1
                print(f"  METADATA-ONLY: {filename} ({detail})")
            elif status == 'size-mismatch':
                size_mismatch += 1
                print(f"  SIZE MISMATCH: {filename} ({detail})")

        print(f"\nVerify: {ok_count} OK, {missing} missing, {metadata_only} metadata-only, {size_mismatch} size-mismatch")
        if missing == 0 and metadata_only == 0:
            print("DAM is at full parity with local catalog.")
        return

    # -- Migration / backfill --
    client = DAMClient(args.api_url, args.api_key)
    if not client.configured:
        print("ERROR: --api-url and --api-key required for migration", file=sys.stderr)
        sys.exit(1)

    progress = load_progress(catalog_dir) if args.resume else {"completed": {}, "errors": {}}

    # Apply batch-size limit
    work_clips = clips
    if args.batch_size > 0:
        # Filter to unfinished clips, then limit
        if args.resume:
            work_clips = [c for c in clips if c.get('filename', '') not in progress.get('completed', {})]
        work_clips = work_clips[:args.batch_size]
        print(f"Batch limited to {len(work_clips)} clips")

    succeeded = 0
    duplicates = 0
    errors = 0
    skipped = 0

    handler = backfill_clip if args.backfill_urls else migrate_single_clip
    concurrency = max(1, args.concurrency)

    if concurrency == 1:
        # Sequential processing
        for i, clip in enumerate(work_clips, 1):
            filename, status, detail = handler(client, clip, media_dir, progress, catalog_dir)
            _print_status(i, len(work_clips), filename, status, detail)
            if status == 'ok':
                succeeded += 1
            elif status == 'duplicate':
                duplicates += 1
            elif status == 'skip':
                skipped += 1
            else:
                errors += 1
                with _progress_lock:
                    progress.setdefault('errors', {})[filename] = detail
                    save_progress(catalog_dir, progress)
    else:
        # Concurrent processing
        with ThreadPoolExecutor(max_workers=concurrency) as pool:
            futures = {
                pool.submit(handler, client, clip, media_dir, progress, catalog_dir): clip
                for clip in work_clips
            }
            done_count = 0
            for future in as_completed(futures):
                done_count += 1
                try:
                    filename, status, detail = future.result()
                    _print_status(done_count, len(work_clips), filename, status, detail)
                    if status == 'ok':
                        succeeded += 1
                    elif status == 'duplicate':
                        duplicates += 1
                    elif status == 'skip':
                        skipped += 1
                    else:
                        errors += 1
                except Exception as e:
                    errors += 1
                    clip = futures[future]
                    print(f"  [{done_count}/{len(work_clips)}] ERROR: {clip.get('filename', '?')} -> {e}")

    mode = "Backfill" if args.backfill_urls else "Migration"
    print(f"\n{mode} complete: {succeeded} uploaded, {duplicates} duplicates, {skipped} skipped, {errors} errors")
    if errors > 0:
        print(f"Progress saved. Re-run with --resume to retry failed clips.")


def _print_status(i, total, filename, status, detail):
    """Print per-clip status line."""
    prefix = f"  [{i}/{total}]"
    if status == 'ok':
        print(f"{prefix} OK: {filename} -> {detail}")
    elif status == 'duplicate':
        print(f"{prefix} SKIP (duplicate): {filename}")
    elif status == 'skip':
        print(f"{prefix} SKIP: {filename} ({detail})")
    else:
        print(f"{prefix} ERROR: {filename} -> {detail}")


if __name__ == '__main__':
    main()
