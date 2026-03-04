# /// script
# requires-python = ">=3.10"
# dependencies = ["google-api-python-client>=2.100.0", "google-auth>=2.20.0"]
# ///
"""Upload a creative concept folder to Google Drive and update index.json.

Called by generate_ads_safe.sh after image generation completes.

Usage:
    uv run upload_creatives_to_drive.py \
        --concept-dir /path/to/creatives/net-new/2026-02-27-cooling-sheet/ \
        --category net-new \
        --concept-name cooling-sheet-promo \
        --prompt "the generation prompt"

Outputs the Drive folder URL to stdout (for the caller to capture).
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys
import time

_script_dir = pathlib.Path(__file__).resolve().parent
_profile_root = _script_dir.parent.parent.parent


# ---------------------------------------------------------------------------
# Google Drive helpers (adapted from competitor_monitor.py)
# ---------------------------------------------------------------------------

def _load_google_creds():
    """Load Google OAuth credentials from profile's google-workspace-oauth.json."""
    import google.auth.transport.requests
    import google.oauth2.credentials

    creds_path = _profile_root / "credentials" / "google-workspace-oauth.json"
    if not creds_path.exists():
        print(f"[drive] OAuth credentials not found at: {creds_path}", file=sys.stderr)
        return None

    creds_data = json.loads(creds_path.read_text())
    scopes = [
        "https://www.googleapis.com/auth/drive",
    ]
    creds = google.oauth2.credentials.Credentials.from_authorized_user_info(creds_data, scopes=scopes)

    if creds.expired and creds.refresh_token:
        creds.refresh(google.auth.transport.requests.Request())
        updated = {
            "type": "authorized_user",
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "refresh_token": creds.refresh_token,
            "scopes": [s.rsplit("/", 1)[-1] for s in scopes],
            "account": creds_data.get("account", ""),
            "created_at": creds_data.get("created_at", ""),
        }
        creds_path.write_text(json.dumps(updated, indent=2))
        creds_path.chmod(0o600)

    return creds


def _drive_service():
    """Build Drive API service client."""
    from googleapiclient.discovery import build
    creds = _load_google_creds()
    if not creds:
        return None
    return build("drive", "v3", credentials=creds)


def _drive_search_folder(drive_svc, name: str, parent_id: str | None = None) -> str | None:
    """Find a folder by exact name, optionally within a parent."""
    q_parts = [
        "trashed = false",
        "mimeType = 'application/vnd.google-apps.folder'",
        f"name = '{name}'",
    ]
    if parent_id:
        q_parts.append(f"'{parent_id}' in parents")

    results = drive_svc.files().list(
        q=" and ".join(q_parts),
        pageSize=1,
        fields="files(id, name)",
    ).execute()

    files = results.get("files", [])
    return files[0]["id"] if files else None


def _drive_share_with_org(drive_svc, file_id: str) -> None:
    """Make a file/folder accessible to anyone with the link (viewer)."""
    try:
        drive_svc.permissions().create(
            fileId=file_id,
            body={"type": "anyone", "role": "reader"},
            fields="id",
        ).execute()
    except Exception as e:
        print(f"  [drive] Sharing warning for {file_id}: {e}", file=sys.stderr)


def _drive_create_folder(drive_svc, name: str, parent_id: str | None = None) -> str:
    """Create a Drive folder, returning its ID. Shared with anyone-with-link."""
    metadata: dict = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    if parent_id:
        metadata["parents"] = [parent_id]

    folder = drive_svc.files().create(body=metadata, fields="id, name, webViewLink").execute()
    folder_id = folder["id"]
    _drive_share_with_org(drive_svc, folder_id)
    return folder_id


def _drive_find_or_create_folder(drive_svc, name: str, parent_id: str | None = None) -> str:
    """Idempotent: find existing folder or create new one."""
    existing = _drive_search_folder(drive_svc, name, parent_id)
    if existing:
        return existing
    return _drive_create_folder(drive_svc, name, parent_id)


def _drive_upload_file(drive_svc, local_path: pathlib.Path, folder_id: str, name: str | None = None) -> str:
    """Upload a file to Drive, returning its file ID."""
    from googleapiclient.http import MediaFileUpload

    file_name = name or local_path.name
    metadata = {"name": file_name, "parents": [folder_id]}
    media = MediaFileUpload(str(local_path), resumable=True)
    uploaded = drive_svc.files().create(
        body=metadata, media_body=media, fields="id, name",
    ).execute()
    return uploaded["id"]


def _drive_folder_url(folder_id: str) -> str:
    return f"https://drive.google.com/drive/folders/{folder_id}"


# ---------------------------------------------------------------------------
# Category name mapping
# ---------------------------------------------------------------------------

_CATEGORY_DRIVE_NAMES = {
    "net-new": "Net New",
    "iteration": "Iterations",
    "clone": "Competitor Clones",
}


# ---------------------------------------------------------------------------
# Index management
# ---------------------------------------------------------------------------

def _load_index(index_path: pathlib.Path) -> list[dict]:
    if index_path.exists():
        try:
            return json.loads(index_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return []


def _save_index(index_path: pathlib.Path, entries: list[dict]) -> None:
    index_path.parent.mkdir(parents=True, exist_ok=True)
    index_path.write_text(
        json.dumps(entries, indent=2, default=str, ensure_ascii=False),
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Main upload + index logic
# ---------------------------------------------------------------------------

def upload_concept_to_drive(
    concept_dir: pathlib.Path,
    category: str,
    concept_name: str,
    prompt: str = "",
    iteration_of: str | None = None,
    competitor_ref: dict | None = None,
) -> dict:
    """Upload concept folder to Drive and update index.json.

    Returns the new index entry dict (includes drive_url, drive_folder_id).
    """
    workspace_brand = _profile_root / "workspace" / "brand"
    creatives_dir = workspace_brand / "creatives"
    index_path = creatives_dir / "index.json"

    # Derive concept ID from folder name (e.g. "2026-02-27-cooling-sheet-promo")
    concept_id = concept_dir.name

    # Discover generated files by ratio
    files_map: dict[str, str] = {}
    for ratio_key in ("1x1", "9x16", "16x9"):
        candidates = list(concept_dir.glob(f"*-{ratio_key}.png"))
        if candidates:
            files_map[ratio_key] = candidates[0].name

    # Build Drive folder structure: Creatives/<Category>/<concept>/
    drive_folder_id = None
    drive_url = ""

    drive_svc = _drive_service()
    if drive_svc:
        try:
            root_id = _drive_find_or_create_folder(drive_svc, "Creatives")
            category_drive = _CATEGORY_DRIVE_NAMES.get(category, category.title())
            cat_id = _drive_find_or_create_folder(drive_svc, category_drive, root_id)
            concept_folder_id = _drive_find_or_create_folder(drive_svc, concept_id, cat_id)
            drive_folder_id = concept_folder_id
            drive_url = _drive_folder_url(concept_folder_id)

            # Upload all files in concept dir
            for f in sorted(concept_dir.iterdir()):
                if f.is_file() and f.suffix in (".png", ".jpg", ".jpeg", ".webp", ".json", ".txt"):
                    try:
                        _drive_upload_file(drive_svc, f, concept_folder_id)
                        print(f"  [drive] Uploaded: {f.name}", file=sys.stderr)
                    except Exception as e:
                        print(f"  [drive] Upload failed for {f.name}: {e}", file=sys.stderr)

            # Also upload prompt.txt
            prompt_file = concept_dir / "prompt.txt"
            if not prompt_file.exists() and prompt:
                prompt_file.write_text(prompt, encoding="utf-8")
                try:
                    _drive_upload_file(drive_svc, prompt_file, concept_folder_id)
                except Exception:
                    pass

            print(f"  [drive] Folder: {drive_url}", file=sys.stderr)
        except Exception as e:
            print(f"  [drive] Upload failed: {e}", file=sys.stderr)
    else:
        print("  [drive] No Drive credentials — skipping upload", file=sys.stderr)

    # Build index entry
    local_dir_rel = str(concept_dir.relative_to(workspace_brand))
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    entry = {
        "id": concept_id,
        "category": category,
        "concept_name": concept_name,
        "created_at": now_iso,
        "local_dir": local_dir_rel + "/",
        "drive_folder_id": drive_folder_id,
        "drive_url": drive_url,
        "files": files_map,
        "prompt": prompt,
        "staged": False,
        "iteration_of": iteration_of,
        "competitor_ref": competitor_ref,
    }

    # Update index.json (append, dedup by id)
    entries = _load_index(index_path)
    entries = [e for e in entries if e.get("id") != concept_id]
    entries.append(entry)
    _save_index(index_path, entries)
    print(f"  [index] Updated: {index_path} ({len(entries)} entries)", file=sys.stderr)

    return entry


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Upload creative concept to Drive and update index")
    parser.add_argument("--concept-dir", required=True, help="Path to concept folder")
    parser.add_argument("--category", required=True, choices=["net-new", "iteration", "clone"],
                        help="Creative category")
    parser.add_argument("--concept-name", required=True, help="Concept name (slug)")
    parser.add_argument("--prompt", default="", help="Generation prompt")
    parser.add_argument("--iteration-of", default=None, help="Original concept ID (for iterations)")
    parser.add_argument("--competitor-ref-json", default=None,
                        help="JSON string with competitor reference data (for clones)")
    args = parser.parse_args()

    concept_dir = pathlib.Path(args.concept_dir).resolve()
    if not concept_dir.is_dir():
        print(f"ERROR: Concept directory not found: {concept_dir}", file=sys.stderr)
        sys.exit(1)

    competitor_ref = None
    if args.competitor_ref_json:
        try:
            competitor_ref = json.loads(args.competitor_ref_json)
        except json.JSONDecodeError:
            print(f"WARNING: Invalid competitor-ref-json, ignoring", file=sys.stderr)

    entry = upload_concept_to_drive(
        concept_dir=concept_dir,
        category=args.category,
        concept_name=args.concept_name,
        prompt=args.prompt,
        iteration_of=args.iteration_of,
        competitor_ref=competitor_ref,
    )

    # Print Drive URL to stdout (for caller to capture)
    print(entry.get("drive_url", ""))


if __name__ == "__main__":
    main()
