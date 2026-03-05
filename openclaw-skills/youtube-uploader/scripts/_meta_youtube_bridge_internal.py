# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "requests>=2.31.0",
# ]
# ///
"""
Meta-to-YouTube bridge — downloads top performing Meta video ads and uploads
them to YouTube as unlisted for Google Ads use.

DO NOT call this script directly. Use meta_youtube_bridge_safe.sh instead.
Env gate: exits unless META_YT_BRIDGE_SAFE=1.
"""

import argparse
import importlib.util
import json
import os
import signal
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# SIGPIPE safety
# ---------------------------------------------------------------------------
signal.signal(signal.SIGPIPE, signal.SIG_DFL)

# ---------------------------------------------------------------------------
# Path derivation (no hardcoded paths)
# ---------------------------------------------------------------------------
# IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks
SCRIPT_DIR = Path(__file__).parent
SKILL_ROOT = SCRIPT_DIR.parent                  # skills/youtube-uploader
PROFILE_ROOT = SKILL_ROOT.parent.parent         # profile root

META_SKILL_ROOT = PROFILE_ROOT / "skills" / "meta-ads"
META_HELPER = META_SKILL_ROOT / "scripts" / "meta_api_helper.py"
TRACKER_PATH = SKILL_ROOT / "youtube-uploads.json"
MEDIA_DIR = PROFILE_ROOT / "media" / "meta-youtube-bridge"

# Reverse label map: label suffix -> human ratio
LABEL_TO_RATIO = {
    "default_1x1": "1:1",
    "igfeed_4x5": "4:5",
    "story_9x16": "9:16",
    "sidebar_16x9": "16:9",
}

# ---------------------------------------------------------------------------
# Env helpers (same pattern as _youtube_upload_internal.py)
# ---------------------------------------------------------------------------

def _load_env(path: Path) -> dict[str, str]:
    """Flat KEY=VALUE parser, no eval."""
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip()
    return env


def _get_cred(name: str) -> str:
    """Resolve credential: env > skill .env > meta skill .env > profile .env."""
    val = os.environ.get(name, "")
    if val:
        return val
    for env_path in [SKILL_ROOT / ".env", META_SKILL_ROOT / ".env", PROFILE_ROOT / ".env"]:
        env = _load_env(env_path)
        if env.get(name):
            return env[name]
    return ""


# ---------------------------------------------------------------------------
# Slack helpers
# ---------------------------------------------------------------------------
SLACK_CHANNEL_ID = os.environ.get("SLACK_CHANNEL_ID", "")
SLACK_THREAD_TS = os.environ.get("SLACK_THREAD_TS", "")


def _get_slack_token() -> str:
    token = os.environ.get("SLACK_BOT_TOKEN", "")
    if token:
        return token
    profile_env = _load_env(PROFILE_ROOT / ".env")
    return profile_env.get("SLACK_BOT_TOKEN", "")


def _get_allowed_channels() -> set[str]:
    cfg_path = PROFILE_ROOT / "openclaw.json"
    if not cfg_path.exists():
        return set()
    try:
        cfg = json.loads(cfg_path.read_text())
        channels = cfg.get("channels", {}).get("slack", {}).get("channels", {})
        return set(channels.keys()) if isinstance(channels, dict) else set()
    except Exception:
        return set()


def _slack_request(method: str, payload: dict, max_retries: int = 5) -> dict | None:
    import requests
    token = _get_slack_token()
    if not token:
        print("WARN: No SLACK_BOT_TOKEN — skipping Slack post.", file=sys.stderr)
        return None
    url = f"https://slack.com/api/{method}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    for attempt in range(max_retries):
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=30)
            data = resp.json()
            if data.get("ok"):
                return data
            if resp.status_code == 429:
                wait = int(resp.headers.get("Retry-After", 2 ** attempt))
                time.sleep(wait)
                continue
            print(f"WARN: Slack {method} failed: {data.get('error')}", file=sys.stderr)
            return data
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
            else:
                print(f"WARN: Slack {method} exception: {e}", file=sys.stderr)
    return None


def _post_to_slack(message: str):
    if not SLACK_CHANNEL_ID or not SLACK_THREAD_TS:
        return
    allowed = _get_allowed_channels()
    if allowed and SLACK_CHANNEL_ID not in allowed:
        print(f"WARN: Channel {SLACK_CHANNEL_ID} not in allowlist — skipping.", file=sys.stderr)
        return
    _slack_request("chat.postMessage", {
        "channel": SLACK_CHANNEL_ID,
        "thread_ts": SLACK_THREAD_TS,
        "text": message,
        "unfurl_links": False,
    })


# ---------------------------------------------------------------------------
# Import helpers from meta_api_helper.py via importlib
# ---------------------------------------------------------------------------

def _import_meta_helper():
    """Import meta_api_helper.py at runtime."""
    if not META_HELPER.exists():
        print(f"ERROR: meta_api_helper.py not found at {META_HELPER}", file=sys.stderr)
        sys.exit(1)
    spec = importlib.util.spec_from_file_location("meta_api_helper", str(META_HELPER))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# ---------------------------------------------------------------------------
# Tracker (dedup)
# ---------------------------------------------------------------------------

def _load_tracker() -> dict:
    if not TRACKER_PATH.exists():
        return {"version": 1, "uploads": []}
    try:
        return json.loads(TRACKER_PATH.read_text())
    except Exception:
        return {"version": 1, "uploads": []}


def _save_tracker(tracker: dict):
    TRACKER_PATH.write_text(json.dumps(tracker, indent=2) + "\n")


def _is_uploaded(tracker: dict, meta_video_id: str, ratio: str = "original") -> bool:
    for entry in tracker.get("uploads", []):
        if entry.get("meta_video_id") == meta_video_id and entry.get("ratio") == ratio:
            return True
    return False


# ---------------------------------------------------------------------------
# Video download
# ---------------------------------------------------------------------------

def _download_video(url: str, dest_path: Path) -> Path | None:
    """Download a video file from URL. Returns path on success."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=120) as resp:
            dest_path.write_bytes(resp.read())
        if dest_path.exists() and dest_path.stat().st_size > 1000:
            return dest_path
        return None
    except Exception as e:
        print(f"  [download] Failed: {e}", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# YouTube upload (via safe wrapper)
# ---------------------------------------------------------------------------

def _upload_to_youtube(video_path: str, title: str, description: str = "",
                       tags: str = "") -> dict | None:
    """Upload a video to YouTube via youtube_upload_safe.sh. Returns {id, url} or None."""
    safe_wrapper = SKILL_ROOT / "scripts" / "youtube_upload_safe.sh"
    if not safe_wrapper.exists():
        print(f"ERROR: youtube_upload_safe.sh not found at {safe_wrapper}", file=sys.stderr)
        return None

    cmd = [
        str(safe_wrapper),
        "--file", video_path,
        "--title", title[:100],
        "--privacy", "unlisted",
        "--no-synthetic-flag",
        "--no-upload-msg",
    ]
    if description:
        cmd.extend(["--description", description[:5000]])
    if tags:
        cmd.extend(["--tags", tags])

    env = os.environ.copy()
    # Ensure the YouTube safe wrapper's env gate is set
    env["YOUTUBE_UPLOAD_SAFE"] = "1"

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=600, env=env,
        )
        stdout = result.stdout
        stderr = result.stderr

        if result.returncode != 0:
            print(f"  [youtube] Upload failed (rc={result.returncode}): {stderr[:300]}", file=sys.stderr)
            return None

        # Parse VIDEO_ID and VIDEO_URL from stdout
        video_id = ""
        video_url = ""
        for line in stdout.splitlines():
            if line.startswith("VIDEO_ID="):
                video_id = line.split("=", 1)[1].strip()
            elif line.startswith("VIDEO_URL="):
                video_url = line.split("=", 1)[1].strip()

        if video_id:
            return {"id": video_id, "url": video_url or f"https://youtu.be/{video_id}"}
        else:
            print(f"  [youtube] No VIDEO_ID in output. stdout: {stdout[:300]}", file=sys.stderr)
            return None
    except subprocess.TimeoutExpired:
        print("  [youtube] Upload timed out after 600s", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  [youtube] Upload exception: {e}", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# PAC ratio extraction
# ---------------------------------------------------------------------------

def _extract_pac_videos(creative_data: dict) -> list[dict]:
    """Extract per-ratio video entries from PAC creative's raw asset_feed_spec.

    Returns list of {video_id, ratio} dicts.
    """
    afs = creative_data.get("creative", {}).get("asset_feed_spec", {})
    if not afs:
        return []

    videos = afs.get("videos", [])
    result = []
    for vid_entry in videos:
        video_id = vid_entry.get("video_id", "")
        if not video_id:
            continue

        # Extract ratio from adlabels
        ratio = "original"
        adlabels = vid_entry.get("adlabels", [])
        for label in adlabels:
            label_name = label.get("name", "")
            # Label format: "Ad Name | story_9x16"
            if " | " in label_name:
                suffix = label_name.rsplit(" | ", 1)[1].strip()
                if suffix in LABEL_TO_RATIO:
                    ratio = LABEL_TO_RATIO[suffix]
                    break

        result.append({"video_id": video_id, "ratio": ratio})

    return result


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Meta-to-YouTube bridge (internal — use meta_youtube_bridge_safe.sh)",
    )
    parser.add_argument("--top", type=int, default=20, help="Number of top ads to check")
    parser.add_argument("--date-preset", default="last_7d", help="Meta date preset")
    parser.add_argument("--dry-run", action="store_true", help="Print plan without uploading")
    parser.add_argument("--force", action="store_true", help="Re-upload even if in tracker")
    args = parser.parse_args()

    MEDIA_DIR.mkdir(parents=True, exist_ok=True)

    # Step 1: Load Meta credentials into env (for subprocess call)
    meta_creds = {
        "META_ACCESS_TOKEN": _get_cred("META_ACCESS_TOKEN"),
        "META_AD_ACCOUNT_ID": _get_cred("META_AD_ACCOUNT_ID"),
        "META_API_VERSION": _get_cred("META_API_VERSION") or "v24.0",
    }
    if not meta_creds["META_ACCESS_TOKEN"]:
        print("ERROR: META_ACCESS_TOKEN not set.", file=sys.stderr)
        sys.exit(1)
    if not meta_creds["META_AD_ACCOUNT_ID"]:
        print("ERROR: META_AD_ACCOUNT_ID not set.", file=sys.stderr)
        sys.exit(1)

    # Put Meta creds in env for subprocess
    for k, v in meta_creds.items():
        os.environ[k] = v

    # Step 2: Get top ads via subprocess (--format json)
    print(f"Fetching top {args.top} ads ({args.date_preset})...")
    cmd = [
        "uv", "run", str(META_HELPER),
        "top-ads",
        "--top", str(args.top),
        "--with-media",
        "--format", "json",
        "--date-preset", args.date_preset,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            print(f"ERROR: top-ads failed (rc={result.returncode}): {result.stderr[:500]}", file=sys.stderr)
            sys.exit(1)
        top_ads_data = json.loads(result.stdout)
    except subprocess.TimeoutExpired:
        print("ERROR: top-ads timed out after 120s", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse top-ads JSON: {e}", file=sys.stderr)
        print(f"stdout: {result.stdout[:500]}", file=sys.stderr)
        sys.exit(1)

    ads = top_ads_data.get("ads", [])
    if not ads:
        print("No ads found for the given period.")
        sys.exit(0)

    # Step 3: Filter to video ads only
    video_ads = []
    for ad in ads:
        media = ad.get("media", {})
        creative_type = media.get("creative_type", "")
        is_video = media.get("is_video", False)
        if is_video or creative_type == "single_video":
            video_ads.append(ad)
        elif creative_type == "pac":
            # PAC might have videos — we'll check with _read_creative_full later
            video_ads.append(ad)

    if not video_ads:
        print("No video ads in top performers.")
        sys.exit(0)

    print(f"Found {len(video_ads)} video/PAC ads out of {len(ads)} total.")

    # Step 4: Import meta_api_helper for download functions
    meta = _import_meta_helper()
    token = meta_creds["META_ACCESS_TOKEN"]
    account_id = meta_creds["META_AD_ACCOUNT_ID"]
    api_version = meta_creds["META_API_VERSION"]

    # Step 5: Load tracker
    tracker = _load_tracker()

    # Step 6: Process each video ad
    uploaded = []
    skipped = 0
    errors = 0

    for ad in video_ads:
        ad_id = ad.get("ad_id", "")
        ad_name = ad.get("ad_name", "Unknown Ad")
        spend = ad.get("spend", 0)

        print(f"\n--- Processing: {ad_name} (ad_id={ad_id}, spend=${spend:.2f}) ---")

        # Get full creative data for video IDs and PAC detection
        try:
            creative_data = meta._read_creative_full(ad_id, token, api_version)
        except Exception as e:
            print(f"  [error] Failed to read creative: {e}", file=sys.stderr)
            errors += 1
            continue

        creative_type = creative_data.get("creative_type", "")
        media_videos = creative_data.get("media", {}).get("videos", [])

        if creative_type == "pac":
            # PAC: extract per-ratio videos from raw asset_feed_spec
            pac_videos = _extract_pac_videos(creative_data)
            if not pac_videos:
                # Fallback: use flattened video list without ratio info
                pac_videos = [{"video_id": vid, "ratio": "original"} for vid in media_videos]

            if not pac_videos:
                print("  No videos found in PAC creative — skipping.")
                continue

            for pv in pac_videos:
                vid_id = pv["video_id"]
                ratio = pv["ratio"]

                if not args.force and _is_uploaded(tracker, vid_id, ratio):
                    print(f"  Already uploaded: video_id={vid_id} ratio={ratio} — skipping.")
                    skipped += 1
                    continue

                # Build title
                if ratio != "original":
                    title = f"{ad_name} ({ratio})"[:100]
                else:
                    title = ad_name[:100]

                print(f"  Downloading video_id={vid_id} ratio={ratio}...")

                if args.dry_run:
                    print(f"  [dry-run] Would upload: \"{title}\"")
                    uploaded.append({
                        "ad_name": ad_name, "ratio": ratio, "youtube_url": "(dry-run)",
                    })
                    continue

                # Download via fallbacks
                source = meta._get_video_source_with_fallbacks(
                    vid_id, ad_id, token, api_version, account_id,
                    thumbnail_url=creative_data.get("video_thumbnail", ""),
                    image_url=creative_data.get("image_url", ""),
                    effective_story_id=creative_data.get("effective_story_id", ""),
                    preview_link=creative_data.get("preview_link", ""),
                    dest_dir=str(MEDIA_DIR),
                )

                if not source.get("is_video"):
                    print(f"  Could not get actual video file (method={source.get('method')}) — skipping.")
                    errors += 1
                    continue

                # Ensure we have a local file
                local_path = source.get("local_path")
                if not local_path and source.get("url"):
                    ext = ".mp4"
                    dest = MEDIA_DIR / f"{ad_id}-{vid_id}-{ratio.replace(':', 'x')}{ext}"
                    local_path = _download_video(source["url"], dest)
                    if local_path:
                        local_path = str(local_path)

                if not local_path or not Path(local_path).exists():
                    print(f"  Download failed — skipping.")
                    errors += 1
                    continue

                file_size = Path(local_path).stat().st_size
                print(f"  Downloaded: {Path(local_path).name} ({file_size // 1024}KB)")

                # Upload to YouTube
                yt_result = _upload_to_youtube(
                    local_path, title,
                    description=f"Meta ad: {ad_name}\nAd ID: {ad_id}",
                    tags="Meta ad",
                )
                if not yt_result:
                    errors += 1
                    continue

                print(f"  Uploaded to YouTube: {yt_result['url']}")

                # Record in tracker
                tracker["uploads"].append({
                    "meta_video_id": vid_id,
                    "meta_ad_id": ad_id,
                    "meta_ad_name": ad_name,
                    "ratio": ratio,
                    "youtube_id": yt_result["id"],
                    "youtube_url": yt_result["url"],
                    "uploaded_at": datetime.now(timezone.utc).isoformat(),
                    "file_size_bytes": file_size,
                })
                _save_tracker(tracker)

                uploaded.append({
                    "ad_name": ad_name, "ratio": ratio, "youtube_url": yt_result["url"],
                })

        elif creative_type == "single_video" and media_videos:
            vid_id = media_videos[0]
            ratio = "original"

            if not args.force and _is_uploaded(tracker, vid_id, ratio):
                print(f"  Already uploaded: video_id={vid_id} — skipping.")
                skipped += 1
                continue

            title = ad_name[:100]

            print(f"  Downloading video_id={vid_id}...")

            if args.dry_run:
                print(f"  [dry-run] Would upload: \"{title}\"")
                uploaded.append({
                    "ad_name": ad_name, "ratio": ratio, "youtube_url": "(dry-run)",
                })
                continue

            # Download
            source = meta._get_video_source_with_fallbacks(
                vid_id, ad_id, token, api_version, account_id,
                thumbnail_url=creative_data.get("video_thumbnail", ""),
                image_url=creative_data.get("image_url", ""),
                effective_story_id=creative_data.get("effective_story_id", ""),
                preview_link=creative_data.get("preview_link", ""),
                dest_dir=str(MEDIA_DIR),
            )

            if not source.get("is_video"):
                print(f"  Could not get actual video file (method={source.get('method')}) — skipping.")
                errors += 1
                continue

            local_path = source.get("local_path")
            if not local_path and source.get("url"):
                dest = MEDIA_DIR / f"{ad_id}-{vid_id}.mp4"
                local_path = _download_video(source["url"], dest)
                if local_path:
                    local_path = str(local_path)

            if not local_path or not Path(local_path).exists():
                print(f"  Download failed — skipping.")
                errors += 1
                continue

            file_size = Path(local_path).stat().st_size
            print(f"  Downloaded: {Path(local_path).name} ({file_size // 1024}KB)")

            # Upload to YouTube
            yt_result = _upload_to_youtube(
                local_path, title,
                description=f"Meta ad: {ad_name}\nAd ID: {ad_id}",
                tags="Meta ad",
            )
            if not yt_result:
                errors += 1
                continue

            print(f"  Uploaded to YouTube: {yt_result['url']}")

            tracker["uploads"].append({
                "meta_video_id": vid_id,
                "meta_ad_id": ad_id,
                "meta_ad_name": ad_name,
                "ratio": ratio,
                "youtube_id": yt_result["id"],
                "youtube_url": yt_result["url"],
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "file_size_bytes": file_size,
            })
            _save_tracker(tracker)

            uploaded.append({
                "ad_name": ad_name, "ratio": ratio, "youtube_url": yt_result["url"],
            })
        else:
            print(f"  Not a video ad (type={creative_type}) — skipping.")
            continue

    # Step 7: Summary
    print(f"\n{'='*60}")
    print(f"Meta-to-YouTube Bridge Complete")
    print(f"  Uploaded: {len(uploaded)}")
    print(f"  Skipped (already uploaded): {skipped}")
    print(f"  Errors: {errors}")
    print(f"{'='*60}")

    # Step 8: Post Slack summary
    if uploaded and not args.dry_run:
        lines = ["*Meta → YouTube Bridge Complete* :youtube:\n"]
        # Group by ad name
        by_ad: dict[str, list] = {}
        for u in uploaded:
            by_ad.setdefault(u["ad_name"], []).append(u)
        for ad_name, entries in by_ad.items():
            lines.append(f"*{ad_name}*")
            for e in entries:
                ratio_label = f" ({e['ratio']})" if e["ratio"] != "original" else ""
                lines.append(f"  • {e['youtube_url']}{ratio_label}")
        lines.append(f"\n_{len(uploaded)} video{'s' if len(uploaded) != 1 else ''} uploaded, {skipped} skipped, {errors} error{'s' if errors != 1 else ''}_")
        _post_to_slack("\n".join(lines))
    elif args.dry_run and uploaded:
        print("\n[dry-run] Would post Slack summary with the above uploads.")
    elif not uploaded:
        print("\nNo new videos to upload.")


if __name__ == "__main__":
    if os.environ.get("META_YT_BRIDGE_SAFE") != "1":
        print(
            "ERROR: META_YT_BRIDGE_SAFE is not set. "
            "Do NOT call this script directly — use meta_youtube_bridge_safe.sh instead.",
            file=sys.stderr,
        )
        sys.exit(1)
    main()
