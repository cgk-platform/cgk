# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "google-api-python-client>=2.100.0",
#   "google-auth>=2.23.0",
#   "google-auth-httplib2>=0.2.0",
#   "httplib2>=0.22.0",
#   "requests>=2.31.0",
# ]
# ///
"""
YouTube upload — internal implementation.

DO NOT call this script directly. Use youtube_upload_safe.sh instead.
Env gate: exits unless YOUTUBE_UPLOAD_SAFE=1.
"""

import argparse
import io
import json
import os
import random
import signal
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# SIGPIPE safety (same pattern as veo-video-gen)
# ---------------------------------------------------------------------------
signal.signal(signal.SIGPIPE, signal.SIG_DFL)


class _PipeSafe(io.TextIOWrapper):
    """Swallow BrokenPipeError on write."""

    def write(self, s):
        try:
            return super().write(s)
        except BrokenPipeError:
            return 0

    def flush(self):
        try:
            super().flush()
        except BrokenPipeError:
            pass


try:
    sys.stdout = _PipeSafe(sys.stdout.buffer, encoding="utf-8", line_buffering=True)
    sys.stderr = _PipeSafe(sys.stderr.buffer, encoding="utf-8", line_buffering=True)
except Exception:
    pass

# ---------------------------------------------------------------------------
# Path derivation (no hardcoded paths)
# ---------------------------------------------------------------------------
# IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks
SCRIPT_DIR = Path(__file__).parent
SKILL_ROOT = SCRIPT_DIR.parent
PROFILE_ROOT = SKILL_ROOT.parent.parent  # skills/<name> -> profile root

# ---------------------------------------------------------------------------
# Env helpers
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
    """Resolve credential: env > skill .env > profile .env."""
    val = os.environ.get(name, "")
    if val:
        return val
    skill_env = _load_env(SKILL_ROOT / ".env")
    if skill_env.get(name):
        return skill_env[name]
    profile_env = _load_env(PROFILE_ROOT / ".env")
    return profile_env.get(name, "")


# ---------------------------------------------------------------------------
# Slack helpers (same pattern as veo-video-gen)
# ---------------------------------------------------------------------------
SLACK_CHANNEL_ID = os.environ.get("SLACK_CHANNEL_ID", "")
SLACK_THREAD_TS = os.environ.get("SLACK_THREAD_TS", "")


def _get_slack_token() -> str:
    """Read SLACK_BOT_TOKEN from env or profile .env."""
    token = os.environ.get("SLACK_BOT_TOKEN", "")
    if token:
        return token
    profile_env = _load_env(PROFILE_ROOT / ".env")
    return profile_env.get("SLACK_BOT_TOKEN", "")


def _get_allowed_channels() -> set[str]:
    """Read allowed channel IDs from openclaw.json."""
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
    """POST to Slack API with exponential backoff."""
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
    """Post message to the originating Slack thread."""
    if not SLACK_CHANNEL_ID or not SLACK_THREAD_TS:
        return
    allowed = _get_allowed_channels()
    if allowed and SLACK_CHANNEL_ID not in allowed:
        print(
            f"WARN: Channel {SLACK_CHANNEL_ID} not in allowlist — skipping Slack post.",
            file=sys.stderr,
        )
        return
    _slack_request(
        "chat.postMessage",
        {
            "channel": SLACK_CHANNEL_ID,
            "thread_ts": SLACK_THREAD_TS,
            "text": message,
            "unfurl_links": True,
        },
    )


# ---------------------------------------------------------------------------
# Shorts detection
# ---------------------------------------------------------------------------


def _detect_shorts(file_path: str, duration_hint: float | None = None) -> bool:
    """Detect if video qualifies as a YouTube Short (vertical + <=60s)."""
    import subprocess

    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "quiet",
                "-print_format", "json",
                "-show_streams",
                "-show_format",
                file_path,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        info = json.loads(result.stdout)
        # Get dimensions from first video stream
        width = height = 0
        for stream in info.get("streams", []):
            if stream.get("codec_type") == "video":
                width = int(stream.get("width", 0))
                height = int(stream.get("height", 0))
                break
        # Get duration
        duration = duration_hint
        if duration is None:
            fmt = info.get("format", {})
            dur_str = fmt.get("duration", "0")
            duration = float(dur_str)
        is_vertical = height > width and width > 0
        is_short_duration = duration <= 60
        return is_vertical and is_short_duration
    except Exception:
        return False


# ---------------------------------------------------------------------------
# YouTube upload
# ---------------------------------------------------------------------------


def _build_youtube_client():
    """Build authenticated YouTube API client from OAuth credentials."""
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    client_id = _get_cred("YOUTUBE_CLIENT_ID")
    client_secret = _get_cred("YOUTUBE_CLIENT_SECRET")
    refresh_token = _get_cred("YOUTUBE_REFRESH_TOKEN")

    if not client_id:
        print("ERROR: YOUTUBE_CLIENT_ID is not set.", file=sys.stderr)
        sys.exit(1)
    if not client_secret:
        print("ERROR: YOUTUBE_CLIENT_SECRET is not set.", file=sys.stderr)
        sys.exit(1)
    if not refresh_token:
        print("ERROR: YOUTUBE_REFRESH_TOKEN is not set.", file=sys.stderr)
        print("Run youtube_auth_setup.py to obtain one.", file=sys.stderr)
        sys.exit(1)

    credentials = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=[
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube",
        ],
    )

    return build("youtube", "v3", credentials=credentials)


def _resumable_upload(youtube, body: dict, media_path: str, notify: bool = True) -> str:
    """Upload video with resumable upload and exponential backoff."""
    from googleapiclient.http import MediaFileUpload

    media = MediaFileUpload(
        media_path,
        chunksize=10 * 256 * 1024,  # 2.5 MB chunks
        resumable=True,
    )

    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media,
        notifySubscribers=notify,
    )

    video_id = None
    max_retries = 10
    retry = 0

    while video_id is None:
        try:
            status, response = request.next_chunk()
            if status:
                pct = int(status.progress() * 100)
                print(f"Upload progress: {pct}%")
            if response is not None:
                video_id = response.get("id")
                if not video_id:
                    print("ERROR: Upload completed but no video ID returned.", file=sys.stderr)
                    print(f"Response: {json.dumps(response, indent=2)}", file=sys.stderr)
                    sys.exit(1)
        except Exception as e:
            error_str = str(e)
            if retry >= max_retries:
                print(f"ERROR: Upload failed after {max_retries} retries: {error_str}", file=sys.stderr)
                sys.exit(1)
            # Retriable errors
            if any(code in error_str for code in ["500", "502", "503", "504", "ResumableUploadError"]):
                retry += 1
                wait = min(2 ** retry + random.random(), 64)
                print(f"Retriable error, retry {retry}/{max_retries} in {wait:.1f}s: {error_str}", file=sys.stderr)
                time.sleep(wait)
            else:
                print(f"ERROR: Non-retriable upload error: {error_str}", file=sys.stderr)
                sys.exit(1)

    return video_id


def _set_thumbnail(youtube, video_id: str, thumbnail_path: str):
    """Upload custom thumbnail for a video."""
    from googleapiclient.http import MediaFileUpload

    ext = Path(thumbnail_path).suffix.lower()
    mimetype = "image/png" if ext == ".png" else "image/jpeg"
    media = MediaFileUpload(thumbnail_path, mimetype=mimetype)
    try:
        youtube.thumbnails().set(videoId=video_id, media_body=media).execute()
        print(f"Thumbnail set from: {thumbnail_path}")
    except Exception as e:
        print(f"WARN: Thumbnail upload failed: {e}", file=sys.stderr)
        print("The video was uploaded successfully but the thumbnail was not set.", file=sys.stderr)


def _add_to_playlist(youtube, video_id: str, playlist_id: str):
    """Add video to a playlist."""
    body = {
        "snippet": {
            "playlistId": playlist_id,
            "resourceId": {
                "kind": "youtube#video",
                "videoId": video_id,
            },
        }
    }
    try:
        youtube.playlistItems().insert(part="snippet", body=body).execute()
        print(f"Added to playlist: {playlist_id}")
    except Exception as e:
        print(f"WARN: Playlist insertion failed: {e}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description="Upload video to YouTube (internal — use youtube_upload_safe.sh)",
    )
    parser.add_argument("-f", "--file", required=True, help="Video file path (absolute)")
    parser.add_argument("-t", "--title", required=True, help="Video title (max 100 chars)")
    parser.add_argument("-d", "--description", default="", help="Video description (max 5000 chars)")
    parser.add_argument("--tags", default="", help="Comma-separated tags")
    parser.add_argument("-c", "--category", default="22", help="Category ID (default: 22 = People & Blogs)")
    parser.add_argument("-p", "--privacy", default="private", choices=["private", "unlisted", "public"], help="Privacy status")
    parser.add_argument("--publish-at", default="", help="Scheduled publish time (ISO 8601, requires private)")
    parser.add_argument("--thumbnail", default="", help="Custom thumbnail image path")
    parser.add_argument("--playlist-id", default="", help="Add to playlist after upload")
    parser.add_argument("--notify", default=True, action=argparse.BooleanOptionalAction, help="Notify subscribers (default: true)")
    parser.add_argument("--no-synthetic-flag", action="store_true", help="Skip AI content declaration")
    parser.add_argument("--no-upload-msg", action="store_true", help="Skip Slack success message")

    args = parser.parse_args()

    # Validate file exists
    video_path = Path(args.file)
    if not video_path.exists():
        print(f"ERROR: Video file not found: {args.file}", file=sys.stderr)
        sys.exit(1)
    if not video_path.is_file():
        print(f"ERROR: Not a file: {args.file}", file=sys.stderr)
        sys.exit(1)

    title = args.title.strip()

    # Validate description length
    description = args.description.strip()
    if len(description) > 5000:
        print(f"ERROR: Description exceeds 5000 characters ({len(description)} chars).", file=sys.stderr)
        sys.exit(1)

    # Validate publish-at requires private
    if args.publish_at and args.privacy != "private":
        print("ERROR: --publish-at requires --privacy private.", file=sys.stderr)
        sys.exit(1)

    # Validate thumbnail exists
    if args.thumbnail and not Path(args.thumbnail).exists():
        print(f"ERROR: Thumbnail file not found: {args.thumbnail}", file=sys.stderr)
        sys.exit(1)

    # Shorts detection (before title length check — appending #Shorts adds 8 chars)
    is_short = _detect_shorts(str(video_path))
    if is_short and "#Shorts" not in title:
        title = f"{title} #Shorts"
        print(f"Shorts detected — title updated: {title}")

    # Validate title length (after Shorts tag appended)
    if len(title) > 100:
        print(f"ERROR: Title exceeds 100 characters ({len(title)} chars).", file=sys.stderr)
        sys.exit(1)

    # Parse tags
    tags = [t.strip() for t in args.tags.split(",") if t.strip()] if args.tags else []

    # Build request body
    snippet = {
        "title": title,
        "description": description,
        "tags": tags,
        "categoryId": args.category,
    }

    status_body: dict = {
        "privacyStatus": args.privacy,
        "selfDeclaredMadeForKids": False,
    }

    if args.publish_at:
        status_body["privacyStatus"] = "private"
        status_body["publishAt"] = args.publish_at

    if not args.no_synthetic_flag:
        status_body["containsSyntheticMedia"] = True

    body = {"snippet": snippet, "status": status_body}

    # Build client and upload
    print(f"Uploading: {video_path.name}")
    print(f"Title: {title}")
    print(f"Privacy: {args.privacy}")
    if args.publish_at:
        print(f"Scheduled: {args.publish_at}")

    youtube = _build_youtube_client()
    video_id = _resumable_upload(youtube, body, str(video_path), notify=args.notify)

    video_url = f"https://youtu.be/{video_id}"
    print(f"VIDEO_ID={video_id}")
    print(f"VIDEO_URL={video_url}")

    # Optional: set thumbnail
    if args.thumbnail:
        _set_thumbnail(youtube, video_id, args.thumbnail)

    # Optional: add to playlist
    if args.playlist_id:
        _add_to_playlist(youtube, video_id, args.playlist_id)

    # Slack success message
    if not args.no_upload_msg:
        privacy_label = args.privacy
        if args.publish_at:
            privacy_label = f"scheduled ({args.publish_at})"
        msg = f"*YouTube upload complete* :youtube:\n>*{title}*\n>{video_url}\n>Privacy: {privacy_label}"
        if is_short:
            msg += "\n>Type: Short"
        if args.playlist_id:
            msg += f"\n>Playlist: {args.playlist_id}"
        _post_to_slack(msg)

    print("Upload complete.")


if __name__ == "__main__":
    if os.environ.get("YOUTUBE_UPLOAD_SAFE") != "1":
        print(
            "ERROR: YOUTUBE_UPLOAD_SAFE is not set. "
            "Do NOT call this script directly — use youtube_upload_safe.sh instead.",
            file=sys.stderr,
        )
        sys.exit(1)
    main()
