"""
dam_client.py -- Client for CGK Platform DAM API.

Provides lookup, search, download, upload, and ingest operations
against the remote DAM. Used by the video editor for:
  - Clip resolution (DAM tier in _resolve_clip_reference)
  - Migration (upload + ingest with real Blob URLs)
  - Dual-write (push new footage to DAM after local catalog)
  - Search (augment local results with DAM-only clips)

All methods are non-fatal: they return None on error and never crash
the calling pipeline. This allows graceful degradation when the DAM
is unreachable or unconfigured.

Configuration via environment variables:
  CGK_PLATFORM_API_URL  -- Base URL (e.g. https://admin.cgklinens.com)
  CGK_PLATFORM_API_KEY  -- Tenant API key (cgk_... format)
"""

import hashlib
import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class DAMClient:
    """Client for CGK Platform DAM clip API."""

    def __init__(
        self,
        api_url: str | None = None,
        api_key: str | None = None,
    ):
        self.api_url = (api_url or os.environ.get("CGK_PLATFORM_API_URL", "")).rstrip("/")
        self.api_key = api_key or os.environ.get("CGK_PLATFORM_API_KEY", "")

    @property
    def configured(self) -> bool:
        """True if both API URL and key are set."""
        return bool(self.api_url and self.api_key)

    # ------------------------------------------------------------------
    # Lookup
    # ------------------------------------------------------------------

    def lookup_clip(self, catalog_id: str) -> dict | None:
        """Look up a clip by its openCLAW catalog filename.

        Returns dict with asset_id, file_url, title, segments, etc.
        Returns None if not found or on error.
        """
        if not self.configured:
            return None
        try:
            from urllib.parse import quote
            url = f"{self.api_url}/api/admin/dam/clips/lookup?catalogId={quote(catalog_id)}"
            req = Request(url, headers={"x-api-key": self.api_key})
            with urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
                return data if data.get("asset_id") else None
        except HTTPError as e:
            if e.code == 404:
                return None
            print(f"    DAM lookup error: HTTP {e.code}", file=sys.stderr)
            return None
        except (URLError, OSError, json.JSONDecodeError) as e:
            print(f"    DAM lookup error: {e}", file=sys.stderr)
            return None

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def search_clips(
        self,
        query: str,
        limit: int = 30,
        offset: int = 0,
        min_quality: int = 0,
        exclude_burned: bool = False,
        source_type: str = "",
    ) -> list[dict]:
        """Search DAM clips by text query.

        Returns list of segment result dicts, or empty list on error.
        """
        if not self.configured or not query:
            return []
        try:
            from urllib.parse import urlencode
            params = {"q": query, "limit": str(limit), "offset": str(offset)}
            if min_quality > 0:
                params["minQuality"] = str(min_quality)
            if exclude_burned:
                params["clean"] = "true"
            if source_type:
                params["source"] = source_type
            url = f"{self.api_url}/api/admin/dam/clips/search?{urlencode(params)}"
            req = Request(url, headers={
                "x-api-key": self.api_key,
                "x-tenant-slug": self._tenant_slug(),
            })
            with urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
                return data if isinstance(data, list) else data.get("results", [])
        except (HTTPError, URLError, OSError, json.JSONDecodeError) as e:
            print(f"    DAM search error: {e}", file=sys.stderr)
            return []

    # ------------------------------------------------------------------
    # Download
    # ------------------------------------------------------------------

    def download_clip(self, url: str, dest_path: str) -> bool:
        """Download a clip from a Blob URL to a local path.

        Uses urllib (stdlib, sandbox-safe). Returns True on success.
        """
        if not url or not url.startswith("https://"):
            return False
        try:
            req = Request(url)
            tmp_path = dest_path + ".download"
            with urlopen(req, timeout=300) as resp:
                with open(tmp_path, "wb") as f:
                    while True:
                        chunk = resp.read(65536)
                        if not chunk:
                            break
                        f.write(chunk)
            os.replace(tmp_path, dest_path)
            return True
        except (HTTPError, URLError, OSError) as e:
            print(f"    DAM download error: {e}", file=sys.stderr)
            # Clean up partial download
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            return False

    # ------------------------------------------------------------------
    # Upload (uses requests for multipart — migration/analyze only)
    # ------------------------------------------------------------------

    def upload_clip(self, file_path: str) -> dict | None:
        """Upload a clip file to DAM Blob storage.

        Returns dict with url, pathname, size, contentType on success.
        Returns None on error.
        """
        if not self.configured:
            return None
        try:
            import requests
        except ImportError:
            print("    DAM upload requires 'requests' package", file=sys.stderr)
            return None

        try:
            filename = Path(file_path).name
            url = f"{self.api_url}/api/admin/dam/clips/upload"
            with open(file_path, "rb") as f:
                resp = requests.post(
                    url,
                    files={"file": (filename, f, _guess_mime(file_path))},
                    data={"filename": filename},
                    headers={"x-api-key": self.api_key},
                    timeout=600,
                )
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response is not None else "unknown"
            print(f"    DAM upload error: HTTP {status}", file=sys.stderr)
            return None
        except Exception as e:
            print(f"    DAM upload error: {type(e).__name__}", file=sys.stderr)
            return None

    # ------------------------------------------------------------------
    # Ingest
    # ------------------------------------------------------------------

    def ingest_clip(self, payload: dict) -> dict | None:
        """Ingest a clip's metadata and segments into the DAM.

        Returns dict with id, duplicate, segmentCount on success.
        Returns None on error.
        """
        if not self.configured:
            return None
        try:
            import requests
        except ImportError:
            print("    DAM ingest requires 'requests' package", file=sys.stderr)
            return None

        try:
            url = f"{self.api_url}/api/admin/dam/clips/ingest"
            resp = requests.post(
                url,
                json=payload,
                headers={
                    "x-api-key": self.api_key,
                    "Content-Type": "application/json",
                },
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response is not None else "unknown"
            print(f"    DAM ingest error: HTTP {status}", file=sys.stderr)
            return None
        except Exception as e:
            print(f"    DAM ingest error: {type(e).__name__}", file=sys.stderr)
            return None

    # ------------------------------------------------------------------
    # URL Update (backfill)
    # ------------------------------------------------------------------

    def update_clip_url(
        self,
        asset_id: str,
        file_url: str,
        file_size_bytes: int | None = None,
        file_hash: str | None = None,
    ) -> bool:
        """Update the file_url on an existing DAM asset.

        Used to backfill clips ingested with local paths as fileUrl.
        Returns True on success.
        """
        if not self.configured:
            return False
        try:
            body: dict = {"assetId": asset_id, "fileUrl": file_url}
            if file_size_bytes is not None:
                body["fileSizeBytes"] = file_size_bytes
            if file_hash is not None:
                body["fileHash"] = file_hash

            data = json.dumps(body).encode("utf-8")
            req = Request(
                f"{self.api_url}/api/admin/dam/clips/update-url",
                data=data,
                headers={
                    "x-api-key": self.api_key,
                    "Content-Type": "application/json",
                },
                method="PATCH",
            )
            with urlopen(req, timeout=15) as resp:
                result = json.loads(resp.read())
                return result.get("updated", False)
        except (HTTPError, URLError, OSError, json.JSONDecodeError) as e:
            print(f"    DAM URL update error: {e}", file=sys.stderr)
            return False

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    def _tenant_slug(self) -> str:
        """Extract tenant slug from API key prefix (cgk_<slug>_...)."""
        if self.api_key and self.api_key.startswith("cgk_"):
            parts = self.api_key.split("_")
            if len(parts) >= 3:
                return parts[1]
        return ""


def build_clip_payload(clip: dict, media_dir, file_url: str | None = None, file_hash: str | None = None) -> dict:
    """Build the DAM ingest API payload for a single catalog clip entry.

    Args:
        clip: Catalog clip dict (filename, path, segments, etc.)
        media_dir: Path to media directory for file resolution
        file_url: If provided, use as fileUrl (Blob URL from upload)
        file_hash: SHA-256 hash for deduplication
    """
    filename = clip.get('filename', '')
    path_str = clip.get('path', '')

    if file_url:
        resolved_url = file_url
    elif path_str and Path(path_str).exists():
        resolved_url = path_str
    else:
        candidate = Path(media_dir) / filename
        if candidate.exists():
            resolved_url = str(candidate)
        else:
            found = None
            for sub in ('social', 'stock', 'gdrive', 'veo', 'inbound', 'recorded'):
                alt = Path(media_dir) / 'catalog' / sub / filename
                if alt.exists():
                    found = str(alt)
                    break
            resolved_url = found or str(candidate)

    segments_raw = clip.get('segments', [])
    segments = []
    for seg in segments_raw:
        start = seg.get('start', 0)
        end = seg.get('end', 0)
        if start is None:
            start = 0
        if end is None:
            end = 0
        subjects_raw = seg.get('subjects')
        if not subjects_raw:
            subjects = []
        elif isinstance(subjects_raw, list):
            subjects = [s.strip() for s in subjects_raw if s]
        else:
            subjects = [s.strip() for s in str(subjects_raw).split(',') if s.strip()]

        segments.append({
            'startTime': float(start),
            'endTime': float(end),
            'description': seg.get('description') or '',
            'subjects': subjects,
            'camera': seg.get('camera') or '',
            'mood': seg.get('mood') or '',
            'motion': seg.get('motion') or '',
            'textOverlay': seg.get('text_overlay') or '',
            'textOverlaySeverity': seg.get('text_overlay_severity') or 'none',
            'qualityScore': None,
            'qualityNotes': '',
        })

    has_burned = any(seg.get('text_overlay') for seg in segments_raw)
    gdrive_url = clip.get('gdrive_url') or ''
    duration = clip.get('duration')
    width = clip.get('width')
    height = clip.get('height')
    title = Path(filename).stem if filename else filename

    source_type = clip.get('source_type', '')
    if not source_type:
        source_type = 'gdrive' if gdrive_url else 'social'

    mime = _guess_mime(filename) if filename else 'video/mp4'

    payload = {
        'title': title,
        'fileUrl': resolved_url,
        'mimeType': mime,
        'description': '',
        'durationSeconds': float(duration) if duration is not None else None,
        'width': int(width) if width is not None else None,
        'height': int(height) if height is not None else None,
        'clipSourceType': source_type,
        'clipSourceUrl': clip.get('source_url') or gdrive_url,
        'hasBurnedCaptions': has_burned,
        'openclawCatalogId': filename,
        'tags': [],
        'segments': segments,
    }
    if file_hash:
        payload['fileHash'] = file_hash
    return payload


def compute_file_hash(file_path: str) -> str:
    """Compute SHA-256 hash of a file for deduplication."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def _guess_mime(file_path: str) -> str:
    """Guess MIME type from file extension."""
    ext = Path(file_path).suffix.lower()
    return {
        ".mp4": "video/mp4",
        ".mov": "video/quicktime",
        ".mkv": "video/x-matroska",
        ".webm": "video/webm",
        ".m4v": "video/x-m4v",
        ".avi": "video/x-msvideo",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
        ".ogg": "audio/ogg",
    }.get(ext, "video/mp4")
