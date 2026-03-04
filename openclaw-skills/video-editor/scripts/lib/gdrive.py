"""
gdrive.py — Google Drive integration for video-editor skill.

Downloads video files from Google Drive, lists folder contents.
Reuses OAuth credentials from the google-workspace skill.

Credential resolution:
  1. <profile_root>/credentials/google-workspace-oauth.json (OAuth)
  2. yt-dlp fallback for public Drive links
"""

import json
import os
import subprocess
import sys
from pathlib import Path


# Video MIME types we accept
VIDEO_MIMES = frozenset({
    "video/mp4",
    "video/quicktime",
    "video/x-matroska",
    "video/webm",
    "video/avi",
    "video/x-msvideo",
    "video/x-m4v",
    "video/3gpp",
    "video/mpeg",
})


def _find_google_creds(profile_root: str) -> Path | None:
    """Find Google OAuth credentials for this profile.

    Returns path to credentials JSON, or None if not found.
    """
    creds_path = Path(profile_root) / "credentials" / "google-workspace-oauth.json"
    if creds_path.exists():
        return creds_path
    return None


def _build_drive_service(profile_root: str):
    """Build authenticated Google Drive v3 client.

    Returns service object, or None on any auth failure.
    """
    creds_path = _find_google_creds(profile_root)
    if not creds_path:
        return None

    try:
        import google.auth.transport.requests
        import google.oauth2.credentials
        from googleapiclient.discovery import build
    except ImportError:
        print("WARNING: google-api-python-client or google-auth not installed.")
        return None

    try:
        creds_data = json.loads(creds_path.read_text())
        scopes = creds_data.get("scopes", ["https://www.googleapis.com/auth/drive"])
        creds = google.oauth2.credentials.Credentials.from_authorized_user_info(
            creds_data, scopes=scopes
        )

        # Auto-refresh expired tokens
        if creds.expired and creds.refresh_token:
            creds.refresh(google.auth.transport.requests.Request())
            updated = {
                "type": "authorized_user",
                "client_id": creds.client_id,
                "client_secret": creds.client_secret,
                "refresh_token": creds.refresh_token,
                "scopes": list(scopes),
                "account": creds_data.get("account", ""),
                "created_at": creds_data.get("created_at", ""),
            }
            creds_path.write_text(json.dumps(updated, indent=2))
            creds_path.chmod(0o600)

        return build("drive", "v3", credentials=creds)
    except Exception as e:
        print(f"WARNING: Google Drive auth failed: {e}")
        return None


def _extract_file_id(url_or_id: str) -> str:
    """Extract a Google Drive file/folder ID from various URL formats.

    Handles:
      - /file/d/<ID>/view
      - /open?id=<ID>
      - /drive/folders/<ID>
      - Raw ID string
    """
    s = url_or_id.strip()

    # /file/d/<ID>/
    if "/file/d/" in s:
        parts = s.split("/file/d/")[1].split("/")
        return parts[0].split("?")[0]

    # /drive/folders/<ID>
    if "/drive/folders/" in s:
        parts = s.split("/drive/folders/")[1].split("/")
        return parts[0].split("?")[0]

    # /open?id=<ID>
    if "id=" in s:
        for param in s.split("?")[-1].split("&"):
            if param.startswith("id="):
                return param[3:]

    # Assume raw ID if no URL patterns matched
    return s


def _is_video_mime(mime_type: str) -> bool:
    """Check if MIME type is a video format we support."""
    return mime_type in VIDEO_MIMES


def _ffprobe_info(path: str) -> dict:
    """Get video metadata via ffprobe. Returns info dict or {error: str}."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-print_format", "json",
                "-show_format", "-show_streams",
                path,
            ],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            return {"error": f"ffprobe failed: {result.stderr[:200]}"}
        probe = json.loads(result.stdout)
    except FileNotFoundError:
        return {"error": "ffprobe not found"}
    except subprocess.TimeoutExpired:
        return {"error": "ffprobe timed out"}
    except json.JSONDecodeError:
        return {"error": "ffprobe parse error"}

    info = {
        "path": path,
        "duration": float(probe.get("format", {}).get("duration", 0)),
        "width": 0, "height": 0,
        "resolution": "unknown",
        "fps": 0, "codec": "unknown",
    }
    for stream in probe.get("streams", []):
        if stream.get("codec_type") == "video":
            info["width"] = int(stream.get("width", 0))
            info["height"] = int(stream.get("height", 0))
            info["resolution"] = f"{info['width']}x{info['height']}"
            info["codec"] = stream.get("codec_name", "unknown")
            fps_str = stream.get("r_frame_rate", "0/1")
            if "/" in fps_str:
                num, den = fps_str.split("/")
                info["fps"] = round(int(num) / max(int(den), 1), 2)
            else:
                info["fps"] = float(fps_str)
            break
    return info


def download_gdrive_file(
    file_id_or_url: str,
    output_path: str,
    media_dir: str,
    profile_root: str,
) -> dict:
    """Download a single video file from Google Drive.

    Strategy: Drive API first, yt-dlp fallback for public links.
    Returns footage info dict with path/duration/etc, or {error: str}.
    """
    file_id = _extract_file_id(file_id_or_url)

    # Try Drive API download
    service = _build_drive_service(profile_root)
    if service:
        try:
            from googleapiclient.http import MediaIoBaseDownload
            import io

            # Get file metadata first
            meta = service.files().get(
                fileId=file_id,
                fields="name,mimeType,size",
            ).execute()

            if not _is_video_mime(meta.get("mimeType", "")):
                return {"error": f"Not a video file: {meta.get('mimeType', 'unknown')}"}

            # Download
            request = service.files().get_media(fileId=file_id)
            with open(output_path, "wb") as fh:
                downloader = MediaIoBaseDownload(io.FileIO(fh.fileno(), "wb"), request)
                done = False
                while not done:
                    _, done = downloader.next_chunk()

            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                info = _ffprobe_info(output_path)
                if "error" not in info:
                    info["source"] = "gdrive"
                    info["gdrive_id"] = file_id
                    return info
                # If ffprobe fails, file might be corrupt — fall through to yt-dlp
        except Exception as e:
            print(f"  Drive API download failed: {e}")
            # Fall through to yt-dlp

    # yt-dlp fallback for public links
    print("  Trying yt-dlp fallback for Drive download...")
    drive_url = f"https://drive.google.com/file/d/{file_id}/view"
    try:
        result = subprocess.run(
            [
                "yt-dlp", "--no-warnings",
                "-f", "best[ext=mp4]/best",
                "--merge-output-format", "mp4",
                "-o", output_path,
                "--no-playlist",
                drive_url,
            ],
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode != 0:
            return {"error": f"yt-dlp failed: {result.stderr[:300]}"}
    except FileNotFoundError:
        return {"error": "yt-dlp not found and Drive API auth unavailable"}
    except subprocess.TimeoutExpired:
        return {"error": "yt-dlp download timed out (5 min)"}

    if not os.path.exists(output_path):
        # yt-dlp may append extensions
        for ext in [".mp4", ".mkv", ".webm"]:
            alt = output_path.rsplit(".", 1)[0] + ext
            if os.path.exists(alt):
                os.rename(alt, output_path)
                break

    if not os.path.exists(output_path):
        return {"error": f"Downloaded file not found at {output_path}"}

    info = _ffprobe_info(output_path)
    if "error" in info:
        return info

    info["source"] = "gdrive"
    info["gdrive_id"] = file_id
    return info


def list_gdrive_folder(
    folder_id_or_url: str,
    profile_root: str,
    max_files: int = 50,
) -> list[dict]:
    """List video files in a Google Drive folder.

    Uses server-side MIME type filtering and pagination to retrieve ALL videos,
    not just the first page.

    Returns list of file metadata dicts, or empty list on failure.
    """
    folder_id = _extract_file_id(folder_id_or_url)
    service = _build_drive_service(profile_root)
    if not service:
        print("ERROR: Google Drive authentication required for folder listing.")
        print("Run the google-workspace setup_oauth.py first.")
        return []

    try:
        videos = []
        page_token = None

        while True:
            kwargs = {
                "q": f"'{folder_id}' in parents and trashed = false and mimeType contains 'video/'",
                "fields": "nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink)",
                "pageSize": min(max_files, 100),
                "orderBy": "name",
            }
            if page_token:
                kwargs["pageToken"] = page_token

            results = service.files().list(**kwargs).execute()

            for f in results.get("files", []):
                videos.append({
                    "id": f["id"],
                    "name": f["name"],
                    "mimeType": f["mimeType"],
                    "size": int(f.get("size", 0)),
                    "modifiedTime": f.get("modifiedTime", ""),
                    "webViewLink": f.get("webViewLink", ""),
                })

            page_token = results.get("nextPageToken")
            if not page_token or len(videos) >= max_files:
                break

        return videos[:max_files]
    except Exception as e:
        print(f"ERROR: Failed to list Drive folder: {e}")
        return []


def get_gdrive_download_url(file_id: str, profile_root: str) -> str | None:
    """Get a direct download URL for a Drive file (for Gemini URL-based analysis).

    Returns URL string or None if unavailable.
    """
    service = _build_drive_service(profile_root)
    if not service:
        return None

    try:
        meta = service.files().get(
            fileId=file_id,
            fields="webContentLink",
        ).execute()
        url = meta.get("webContentLink")
        if url:
            return url
        # Construct fallback download URL
        return f"https://drive.google.com/uc?id={file_id}&export=download"
    except Exception:
        return None


def download_gdrive_folder(
    folder_id_or_url: str,
    output_dir: str,
    profile_root: str,
    max_files: int = 20,
    min_size: int = 1_000_000,
    max_size: int = 500_000_000,
) -> list[dict]:
    """Download all video files from a Drive folder.

    Sequential downloads with progress output.
    Returns list of footage info dicts.
    """
    files = list_gdrive_folder(folder_id_or_url, profile_root, max_files)
    if not files:
        print("No video files found in Drive folder.")
        return []

    os.makedirs(output_dir, exist_ok=True)
    results = []

    for i, f in enumerate(files, 1):
        name = f["name"]
        size = f["size"]

        if size < min_size:
            print(f"  [{i}/{len(files)}] Skipping {name} (too small: {size} bytes)")
            continue
        if size > max_size:
            print(f"  [{i}/{len(files)}] Skipping {name} (too large: {size / 1e6:.0f} MB)")
            continue

        # Ensure .mp4 extension for output
        stem = Path(name).stem
        out_path = os.path.join(output_dir, f"{stem}.mp4")

        print(f"  [{i}/{len(files)}] Downloading {name} ({size / 1e6:.1f} MB)...")
        info = download_gdrive_file(f["id"], out_path, output_dir, profile_root)

        if "error" in info:
            print(f"    ERROR: {info['error']}")
        else:
            info["gdrive_name"] = name
            results.append(info)
            print(f"    OK: {info.get('duration', 0):.1f}s, {info.get('resolution', '?')}")

    return results
