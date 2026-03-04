"""
footage.py — Footage sourcing: Pexels API, yt-dlp, local file validation,
Google Drive, clip ranges.

Footage source types (from storyboard):
  - file:<path>       — Local file, validate + probe
  - stock:<query>     — Search Pexels API, download top match
  - social:<url>      — Download via yt-dlp (TikTok, Instagram, YouTube, X)
  - veo:<prompt>      — Flag for Veo generation (agent handles externally)
  - gdrive:<id_or_url> — Download from Google Drive (OAuth + yt-dlp fallback)
  - clip:<ref>@<start>-<end> — Time range from any clip
"""

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def _ffprobe(path: str) -> dict:
    """Probe a media file with ffprobe. Returns metadata dict."""
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                path,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            return {"error": f"ffprobe failed: {result.stderr[:200]}"}
        return json.loads(result.stdout)
    except FileNotFoundError:
        return {"error": "ffprobe not found. Install ffmpeg."}
    except subprocess.TimeoutExpired:
        return {"error": "ffprobe timed out"}
    except json.JSONDecodeError:
        return {"error": "ffprobe output parse error"}


def _get_video_info(path: str) -> dict:
    """Extract video metadata from ffprobe output."""
    probe = _ffprobe(path)
    if "error" in probe:
        return probe

    info = {
        "path": path,
        "duration": 0,
        "width": 0,
        "height": 0,
        "resolution": "unknown",
        "fps": 0,
        "codec": "unknown",
    }

    # Duration from format
    fmt = probe.get("format", {})
    info["duration"] = float(fmt.get("duration", 0))

    # Video stream info
    for stream in probe.get("streams", []):
        if stream.get("codec_type") == "video":
            info["width"] = int(stream.get("width", 0))
            info["height"] = int(stream.get("height", 0))
            info["resolution"] = f"{info['width']}x{info['height']}"
            info["codec"] = stream.get("codec_name", "unknown")

            # FPS from r_frame_rate
            fps_str = stream.get("r_frame_rate", "0/1")
            if "/" in fps_str:
                num, den = fps_str.split("/")
                info["fps"] = round(int(num) / max(int(den), 1), 2)
            else:
                info["fps"] = float(fps_str)
            break

    return info


def _download_pexels(query: str, output_path: str) -> dict:
    """Search Pexels API and download the top video result."""
    import requests

    api_key = os.environ.get("PEXELS_API_KEY", "")
    if not api_key:
        return {"error": "PEXELS_API_KEY not set"}

    headers = {"Authorization": api_key}
    params = {
        "query": query,
        "per_page": 5,
        "orientation": "portrait",  # Default to vertical
    }

    try:
        resp = requests.get(
            "https://api.pexels.com/videos/search",
            headers=headers,
            params=params,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        return {"error": f"Pexels API error: {e}"}

    videos = data.get("videos", [])
    if not videos:
        return {"error": f"No Pexels results for query: {query}"}

    # Pick best quality file from first result
    video = videos[0]
    files = video.get("video_files", [])

    # Prefer HD quality
    best = None
    for f in files:
        if f.get("quality") == "hd" and f.get("file_type") == "video/mp4":
            best = f
            break
    if not best:
        best = files[0] if files else None

    if not best:
        return {"error": "No downloadable file in Pexels result"}

    download_url = best.get("link", "")
    if not download_url:
        return {"error": "No download URL in Pexels file"}

    # Download
    try:
        resp = requests.get(download_url, stream=True, timeout=120)
        resp.raise_for_status()
        with open(output_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
    except Exception as e:
        return {"error": f"Download failed: {e}"}

    info = _get_video_info(output_path)
    if "error" in info:
        return info

    info["source"] = "pexels"
    info["pexels_query"] = query
    info["pexels_id"] = video.get("id")
    return info


def _download_social(url: str, output_path: str) -> dict:
    """Download video from social media via yt-dlp."""
    try:
        result = subprocess.run(
            [
                "yt-dlp",
                "--no-warnings",
                "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                "--merge-output-format", "mp4",
                "-o", output_path,
                "--no-playlist",
                "--no-check-certificates",
                url,
            ],
            capture_output=True,
            text=True,
            timeout=180,
        )
        if result.returncode != 0:
            return {"error": f"yt-dlp failed: {result.stderr[:300]}"}
    except FileNotFoundError:
        return {"error": "yt-dlp not found. Install: pip install yt-dlp"}
    except subprocess.TimeoutExpired:
        return {"error": "yt-dlp download timed out (3 min)"}

    # yt-dlp may append extensions — find the actual file
    if not os.path.exists(output_path):
        # Check for common alternatives
        for ext in [".mp4", ".mkv", ".webm"]:
            alt = output_path.rsplit(".", 1)[0] + ext
            if os.path.exists(alt):
                os.rename(alt, output_path)
                break

    if not os.path.exists(output_path):
        return {"error": f"Downloaded file not found at {output_path}"}

    info = _get_video_info(output_path)
    if "error" in info:
        return info

    info["source"] = "social"
    info["source_url"] = url
    return info


def _validate_local_file(path: str) -> dict:
    """Validate a local video file."""
    # Handle sandbox path resolution
    profile_root = os.environ.get("PROFILE_ROOT", "")
    if path.startswith("/workspace/") and profile_root:
        path = profile_root + path[len("/workspace"):]

    if not os.path.exists(path):
        return {"error": f"File not found: {path}"}

    info = _get_video_info(path)
    if "error" in info:
        return info

    info["source"] = "local"
    return info


def _redownload_clip(clip_data: dict, media_dir: str, profile_root: str) -> str | None:
    """Attempt to re-download a clip from stored source metadata.

    Returns local path on success, None on failure.
    """
    source_type = clip_data.get("source_type", "")
    source_id = clip_data.get("source_id", "") or clip_data.get("gdrive_id", "")
    source_url = clip_data.get("source_url", "") or clip_data.get("gdrive_url", "")
    filename = clip_data.get("filename", "")
    stem = Path(filename).stem if filename else "redownload"

    if source_type == "gdrive" and source_id:
        try:
            from lib.gdrive import download_gdrive_file
            dl_path = os.path.join(media_dir, f"{stem}.mp4")
            info = download_gdrive_file(source_id, dl_path, media_dir, profile_root)
            if "error" not in info:
                print(f"    Re-downloaded from GDrive: {filename}")
                return info.get("path", dl_path)
        except Exception as e:
            print(f"    WARNING: GDrive re-download failed: {e}")
        return None

    if source_type == "stock" and source_id:
        try:
            import requests
            api_key = os.environ.get("PEXELS_API_KEY", "")
            if not api_key:
                return None
            headers = {"Authorization": api_key}
            resp = requests.get(
                f"https://api.pexels.com/videos/videos/{source_id}",
                headers=headers,
                timeout=30,
            )
            resp.raise_for_status()
            video = resp.json()
            files = video.get("video_files", [])
            best = None
            for f in files:
                if f.get("quality") == "hd" and f.get("file_type") == "video/mp4":
                    best = f
                    break
            if not best and files:
                best = files[0]
            if best and best.get("link"):
                dl_path = os.path.join(media_dir, f"{stem}.mp4")
                resp = requests.get(best["link"], stream=True, timeout=120)
                resp.raise_for_status()
                with open(dl_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)
                print(f"    Re-downloaded from Pexels: {filename}")
                return dl_path
        except Exception as e:
            print(f"    WARNING: Pexels re-download failed: {e}")
        return None

    if source_type == "social" and source_url:
        try:
            dl_path = os.path.join(media_dir, f"{stem}.mp4")
            result = subprocess.run(
                [
                    "yt-dlp", "--no-warnings",
                    "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                    "--merge-output-format", "mp4",
                    "-o", dl_path, "--no-playlist",
                    "--no-check-certificates", source_url,
                ],
                capture_output=True, text=True, timeout=180,
            )
            if result.returncode == 0 and os.path.exists(dl_path):
                print(f"    Re-downloaded from social: {filename}")
                return dl_path
            else:
                print(f"    WARNING: Social re-download failed (URL may have expired)")
        except Exception as e:
            print(f"    WARNING: Social re-download failed: {e}")
        return None

    if source_type == "local" and source_url and os.path.exists(source_url):
        return source_url

    # inbound, veo — no re-download path (these are pinned, shouldn't be cleaned)
    return None


def _queue_catalog_pending(file_path: str, video_info: dict, source_meta: dict, media_dir: str):
    """Write a pending catalog entry for deferred Gemini analysis."""
    profile_root = os.environ.get("PROFILE_ROOT", "")
    if not profile_root:
        return

    pending_dir = Path(profile_root) / "workspace" / ".video-catalogs" / "_pending"
    pending_dir.mkdir(parents=True, exist_ok=True)

    entry = {
        "file_path": file_path,
        "filename": Path(file_path).name,
        "video_info": {
            "duration": video_info.get("duration", 0),
            "width": video_info.get("width", 0),
            "height": video_info.get("height", 0),
            "resolution": video_info.get("resolution", "unknown"),
            "fps": video_info.get("fps", 0),
            "codec": video_info.get("codec", "unknown"),
        },
        "source_meta": source_meta,
        "queued": datetime.now(timezone.utc).isoformat(),
    }

    fname = Path(file_path).stem
    pending_file = pending_dir / f"{fname}.json"
    tmp = pending_file.with_suffix(".tmp")
    with open(tmp, "w") as f:
        json.dump(entry, f, indent=2)
    os.replace(str(tmp), str(pending_file))


def _resolve_clip_reference(
    file_ref: str,
    session_id: str,
    media_dir: str,
) -> str | None:
    """Resolve a clip reference from a clip: source to a local file path.

    Resolution order:
      1. Absolute path — use directly if exists
      2. Check media_dir for matching filename
      3. Check catalog store index (O(1) lookup) — auto re-downloads if needed
      4. Legacy: Check session catalog sidecars (migration fallback)
      5. None
    """
    profile_root = os.environ.get("PROFILE_ROOT", "")

    # 1. Absolute path
    if os.path.isabs(file_ref) and os.path.exists(file_ref):
        _touch_clip_if_possible(file_ref, profile_root)
        return file_ref

    # 2. Match filename in media_dir
    media_path = os.path.join(media_dir, file_ref)
    if os.path.exists(media_path):
        _touch_clip_if_possible(file_ref, profile_root)
        return media_path

    # Also try without extension variations
    base = Path(file_ref).stem
    for ext in [".mp4", ".mov", ".mkv", ".webm", ".m4v"]:
        candidate = os.path.join(media_dir, base + ext)
        if os.path.exists(candidate):
            _touch_clip_if_possible(file_ref, profile_root)
            return candidate

    # 3. Check catalog store index (O(1) lookup)
    if profile_root:
        try:
            from lib.catalog_store import CatalogStore
            store = CatalogStore(profile_root)
            result = store.resolve_clip(file_ref)
            if result:
                _catalog_id, clip_data = result
                clip_path = clip_data.get("path")
                if clip_path and os.path.exists(clip_path):
                    store.touch_clip(file_ref)
                    return clip_path

                # File missing locally — try auto re-download
                print(f"    Clip '{file_ref}' not cached locally, attempting re-download...")
                redownloaded = _redownload_clip(clip_data, media_dir, profile_root)
                if redownloaded:
                    store.touch_clip(file_ref)
                    return redownloaded

                # Legacy fallback: try gdrive_id directly
                if clip_data.get("gdrive_id"):
                    from lib.gdrive import download_gdrive_file
                    stem = Path(clip_data["filename"]).stem
                    dl_path = os.path.join(media_dir, f"{stem}.mp4")
                    info = download_gdrive_file(
                        clip_data["gdrive_id"], dl_path, media_dir, profile_root,
                    )
                    if "error" not in info:
                        store.touch_clip(file_ref)
                        return info.get("path", dl_path)

                # 3c. DAM download: fetch from Vercel Blob via platform API
                dam_path = _download_from_dam(file_ref, media_dir, profile_root, store)
                if dam_path:
                    return dam_path
        except Exception:
            pass

    # 4. Standalone DAM lookup (no catalog entry at all)
    if profile_root:
        try:
            from lib.catalog_store import CatalogStore
            _dam_store = CatalogStore(profile_root)
            dam_path = _download_from_dam(file_ref, media_dir, profile_root, _dam_store)
            if dam_path:
                return dam_path
        except Exception:
            pass

    # 5. Legacy fallback: scan .video-sessions/*.catalog.json
    if profile_root:
        sessions_dir = os.path.join(profile_root, "workspace", ".video-sessions")
        if os.path.isdir(sessions_dir):
            for cat_file in Path(sessions_dir).glob("*.catalog.json"):
                try:
                    cat = json.loads(cat_file.read_text())
                    for clip in cat.get("clips", []):
                        if clip.get("filename") == file_ref or clip.get("filename") == Path(file_ref).name:
                            if clip.get("path") and os.path.exists(clip["path"]):
                                return clip["path"]
                            if clip.get("gdrive_id") and not clip.get("downloaded"):
                                from lib.gdrive import download_gdrive_file
                                stem = Path(clip["filename"]).stem
                                dl_path = os.path.join(media_dir, f"{stem}.mp4")
                                info = download_gdrive_file(
                                    clip["gdrive_id"], dl_path, media_dir, profile_root,
                                )
                                if "error" not in info:
                                    return info.get("path", dl_path)
                except (json.JSONDecodeError, OSError):
                    continue

    return None


def _download_from_dam(
    file_ref: str,
    media_dir: str,
    profile_root: str,
    store=None,
) -> str | None:
    """Download a clip from the remote DAM (Vercel Blob) to local media.

    Looks up the clip by filename in the DAM, downloads if a valid Blob
    URL exists, and touches the catalog store TTL. Returns local path
    on success, None on failure. Non-fatal.
    """
    try:
        from lib.dam_client import DAMClient
        client = DAMClient()
        if not client.configured:
            return None

        dam_entry = client.lookup_clip(file_ref)
        if not dam_entry:
            return None

        file_url = dam_entry.get("file_url", "")
        if not file_url.startswith("https://"):
            # Metadata-only entry (local path as URL) — not yet uploaded
            return None

        # Download to media directory
        stem = Path(file_ref).stem
        ext = Path(file_ref).suffix or ".mp4"
        dest = os.path.join(media_dir, f"{stem}{ext}")

        print(f"    Downloading from DAM: {file_ref}...")
        ok = client.download_clip(file_url, dest)
        if not ok or not os.path.exists(dest):
            return None

        print(f"    Downloaded from DAM: {dest}")

        # Touch TTL in catalog store (30-day, refreshed on use, NOT pinned)
        if store is None:
            try:
                from lib.catalog_store import CatalogStore
                store = CatalogStore(profile_root)
            except Exception:
                pass
        if store:
            store.touch_clip(file_ref)
            store.set_clip_source(file_ref, {
                "source_type": "dam",
                "source_url": file_url,
                "source_id": dam_entry.get("asset_id", ""),
            })

        return dest
    except Exception as e:
        print(f"    DAM download failed: {e}")
        return None


def _touch_clip_if_possible(file_ref: str, profile_root: str):
    """Touch a clip's TTL entry if catalog store is available. Non-fatal."""
    if not profile_root:
        return
    try:
        from lib.catalog_store import CatalogStore
        store = CatalogStore(profile_root)
        store.touch_clip(file_ref)
    except Exception:
        pass


def source_scene_footage(
    scene: dict,
    session_id: str,
    scene_num: int,
    media_dir: str,
    catalog_done: bool = False,
) -> dict:
    """Source footage for a single scene based on footage_source type.

    Returns dict with status ("ready", "waiting_veo", "error"), path, metadata.

    Defense-in-depth: file: paths and raw paths are blocked when catalog_done
    is False, even if set-storyboard already validated. This catches cases where
    source-footage is called directly or session state was modified.
    """
    src = scene.get("footage_source", "")
    result = {"scene_num": scene_num, "status": "error"}

    if src.startswith("file:"):
        # Defense-in-depth: block file: without catalog
        if not catalog_done:
            result["error"] = (
                f"file: source blocked — no footage catalog attached. "
                f"Run analyze-footage first, then use clip: references. "
                f"Or re-run set-storyboard with --force-uncataloged."
            )
            return result
        path = src[5:].strip()
        info = _validate_local_file(path)
        if "error" in info:
            result["error"] = info["error"]
        else:
            result.update(info)
            result["status"] = "ready"
            # Queue for deferred cataloging if not already in master
            try:
                _queue_catalog_pending(
                    info["path"], info,
                    {"source_type": "inbound", "source_url": path},
                    media_dir,
                )
            except Exception:
                pass

    elif src.startswith("stock:"):
        query = src[6:].strip()
        output_path = os.path.join(media_dir, f"{session_id}-scene-{scene_num}-stock.mp4")
        info = _download_pexels(query, output_path)
        if "error" in info:
            result["error"] = info["error"]
        else:
            result.update(info)
            result["status"] = "ready"
            # Queue for deferred cataloging
            try:
                _queue_catalog_pending(
                    output_path, info,
                    {
                        "source_type": "stock",
                        "source_id": str(info.get("pexels_id", "")),
                        "source_url": "",
                        "pexels_query": query,
                    },
                    media_dir,
                )
            except Exception:
                pass

    elif src.startswith("social:"):
        url = src[7:].strip()
        output_path = os.path.join(media_dir, f"{session_id}-scene-{scene_num}-social.mp4")
        info = _download_social(url, output_path)
        if "error" in info:
            result["error"] = info["error"]
        else:
            result.update(info)
            result["status"] = "ready"
            # Queue for deferred cataloging
            try:
                _queue_catalog_pending(
                    output_path, info,
                    {"source_type": "social", "source_url": url},
                    media_dir,
                )
            except Exception:
                pass

    elif src.startswith("gdrive:"):
        ref = src[7:].strip()
        output_path = os.path.join(media_dir, f"{session_id}-scene-{scene_num}-gdrive.mp4")
        from lib.gdrive import download_gdrive_file
        info = download_gdrive_file(
            ref, output_path, media_dir,
            os.environ.get("PROFILE_ROOT", ""),
        )
        if "error" in info:
            result["error"] = info["error"]
        else:
            result.update(info)
            result["status"] = "ready"

    elif src.startswith("clip:"):
        # Format: clip:<filename_or_path>@<start>-<end>
        ref = src[5:].strip()
        if "@" not in ref:
            result["error"] = (
                "clip: source requires @start-end range. "
                "Example: clip:product-pour.mp4@3.2-7.8"
            )
        else:
            file_ref, time_range = ref.rsplit("@", 1)
            parts = time_range.split("-")
            if len(parts) != 2:
                result["error"] = f"Invalid time range format: {time_range}. Use start-end (e.g., 3.2-7.8)"
            else:
                try:
                    clip_start = float(parts[0])
                    clip_end = float(parts[1])
                except ValueError:
                    clip_start, clip_end = 0, 0
                    result["error"] = f"Invalid time values in range: {time_range}"

                if clip_end <= clip_start and "error" not in result:
                    result["error"] = f"clip end ({clip_end}) must be after start ({clip_start})"

                if "error" not in result:
                    resolved = _resolve_clip_reference(file_ref.strip(), session_id, media_dir)
                    if resolved is None:
                        result["error"] = f"Could not find clip: {file_ref}"
                    else:
                        info = _get_video_info(resolved)
                        if "error" in info:
                            result["error"] = info["error"]
                        else:
                            result.update(info)
                            result["clip_start"] = clip_start
                            result["clip_end"] = clip_end
                            result["status"] = "ready"

    elif src.startswith("veo:"):
        prompt = src[4:].strip()
        result["status"] = "waiting_veo"
        result["veo_prompt"] = prompt
        result["path"] = os.path.join(media_dir, f"{session_id}-scene-{scene_num}-veo.mp4")

    else:
        # Try as raw path — defense-in-depth: block without catalog
        if not catalog_done:
            result["error"] = (
                f"Raw path blocked — no footage catalog attached. "
                f"Use a prefix (file:, stock:, clip:, veo:, gdrive:, social:) "
                f"or run analyze-footage first."
            )
        elif os.path.exists(src):
            info = _validate_local_file(src)
            if "error" not in info:
                result.update(info)
                result["status"] = "ready"
            else:
                result["error"] = info["error"]
        else:
            result["error"] = (
                f"Unknown footage source format: '{src}'. "
                "Use file:<path>, stock:<query>, social:<url>, veo:<prompt>, "
                "gdrive:<id_or_url>, or clip:<file>@<start>-<end>"
            )

    return result
