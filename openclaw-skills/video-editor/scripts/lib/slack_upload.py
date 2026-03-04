"""Slack v2 file upload with retries + channel allowlist.

Adapted from veo-video-gen/_generate_video_internal.py for use by
the video-editor deliver pipeline.

Usage:
    from lib.slack_upload import upload_to_slack
    success = upload_to_slack(Path("/path/to/video.mp4"), "My Video Title",
                              channel="<channel_id>", thread_ts="1234.5678")
"""

import json
import os
import sys
import time
from pathlib import Path


UPLOAD_MAX_RETRIES = 5
UPLOAD_INITIAL_DELAY = 2


def _get_profile_root() -> Path:
    """Get profile root from env or derive from script location."""
    env_root = os.environ.get("PROFILE_ROOT", "")
    if env_root:
        return Path(env_root)
    # Derive: lib/ -> scripts/ -> video-editor/ -> skills/ -> profile root
    return Path(__file__).resolve().parent.parent.parent.parent


def _get_slack_bot_token() -> str:
    """Get Slack bot token from env, falling back to profile .env."""
    token = os.environ.get("SLACK_BOT_TOKEN", "")
    if token:
        return token
    # Fallback: read from profile .env
    env_file = _get_profile_root() / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("SLACK_BOT_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def _get_allowed_channels() -> set:
    """Read allowed channel IDs from openclaw.json (outbound allowlist)."""
    config_path = _get_profile_root() / "openclaw.json"
    if config_path.exists():
        try:
            cfg = json.loads(config_path.read_text())
            return set(
                cfg.get("channels", {})
                .get("slack", {})
                .get("channels", {})
                .keys()
            )
        except (json.JSONDecodeError, OSError):
            pass
    return set()


def _holden_user_id() -> str:
    """Return Holden's Slack user ID for this workspace."""
    name = _get_profile_root().name
    return {
        "openclaw-rawdog": "U07J2D9L0FL",
        "openclaw-vitahustle": "U0AF28VCYBH",
    }.get(name, "U0ACL7UV3RV")


def _dm_holden(text: str):
    """Send a DM to Holden about an allowlist block."""
    import urllib.request
    import urllib.error

    token = _get_slack_bot_token()
    if not token:
        return
    try:
        user_id = _holden_user_id()
        open_data = json.dumps({"users": user_id}).encode("utf-8")
        open_req = urllib.request.Request(
            "https://slack.com/api/conversations.open",
            data=open_data,
            headers={
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": f"Bearer {token}",
            },
        )
        with urllib.request.urlopen(open_req, timeout=10) as resp:
            open_resp = json.loads(resp.read())
        if not open_resp.get("ok"):
            return
        dm_channel = open_resp["channel"]["id"]
        msg_data = json.dumps({"channel": dm_channel, "text": text}).encode("utf-8")
        msg_req = urllib.request.Request(
            "https://slack.com/api/chat.postMessage",
            data=msg_data,
            headers={
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": f"Bearer {token}",
            },
        )
        urllib.request.urlopen(msg_req, timeout=10)
    except (OSError, json.JSONDecodeError):
        pass


def _slack_request(method: str, url: str, max_retries: int = UPLOAD_MAX_RETRIES,
                   **kwargs):
    """Make an HTTP request with retries + exponential backoff.

    Handles DNS failures, rate limits (429), and server errors (5xx).
    Returns the response on success, or None after exhausting retries.
    """
    import requests

    delay = UPLOAD_INITIAL_DELAY
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.request(method, url, timeout=(10, 60), **kwargs)
        except (requests.ConnectionError, requests.Timeout, OSError) as e:
            print(
                f"  Upload attempt {attempt}/{max_retries}: network error ({e}), "
                f"retrying in {delay}s...",
                file=sys.stderr,
            )
            time.sleep(delay)
            delay *= 2
            continue

        if resp.status_code == 429:
            retry_after = delay
            try:
                retry_after = int(resp.headers.get("Retry-After", 0)) or delay
            except (ValueError, TypeError):
                pass
            try:
                retry_after = resp.json().get("retry_after", retry_after)
            except Exception:
                pass
            print(
                f"  Upload attempt {attempt}/{max_retries}: rate limited (429), "
                f"waiting {retry_after}s...",
                file=sys.stderr,
            )
            time.sleep(retry_after)
            delay *= 2
            continue

        if resp.status_code >= 500:
            print(
                f"  Upload attempt {attempt}/{max_retries}: server error ({resp.status_code}), "
                f"retrying in {delay}s...",
                file=sys.stderr,
            )
            time.sleep(delay)
            delay *= 2
            continue

        # Success or non-retryable client error
        return resp

    print(f"  Upload failed after {max_retries} attempts", file=sys.stderr)
    return None


def upload_to_slack(
    file_path: Path,
    title: str,
    channel: str | None = None,
    thread_ts: str | None = None,
) -> bool:
    """Upload a file to Slack using the v2 API with retries + exponential backoff.

    Args:
        file_path: Path to the file to upload.
        title: Title for the Slack file.
        channel: Slack channel ID. Falls back to SLACK_CHANNEL_ID env var.
                 Raises ValueError if neither is provided.
        thread_ts: Slack thread timestamp. Falls back to SLACK_THREAD_TS env var.

    Returns:
        True if upload succeeded, False otherwise.
    """
    token = _get_slack_bot_token()
    if not channel:
        channel = os.environ.get("SLACK_CHANNEL_ID", "")
    if not thread_ts:
        thread_ts = os.environ.get("SLACK_THREAD_TS", "")

    if not channel:
        print(
            "ERROR: No Slack channel provided. Pass channel= explicitly or set "
            "SLACK_CHANNEL_ID in the environment.",
            file=sys.stderr,
        )
        return False

    if not token:
        print("ERROR: Slack bot token not available (SLACK_BOT_TOKEN missing).",
              file=sys.stderr)
        return False

    # Outbound allowlist check — DMs (D-prefix) always allowed, user is talking directly to the bot
    if not channel.startswith("D"):
        allowed = _get_allowed_channels()
        if allowed and channel not in allowed:
            print(f"[slack] BLOCKED: channel {channel} not in workspace allowlist",
                  file=sys.stderr)
            _dm_holden(
                f":warning: *Channel Allowlist Block*\n\n"
                f"Workspace `{_get_profile_root().name}` tried to upload to channel `{channel}` "
                f"but it's not in this workspace's Slack channel list.\n\n"
                f"Should I add this channel to the openclaw allowlist in "
                f"`openclaw.json`? Or is this a misconfiguration?"
            )
            return False

    file_path = Path(file_path)
    if not file_path.exists():
        print(f"ERROR: File not found: {file_path}", file=sys.stderr)
        return False

    file_size = file_path.stat().st_size
    print(f"Uploading to Slack: {file_path.name} ({file_size / (1024*1024):.1f} MB)")

    # Step 1: Get upload URL
    resp = _slack_request(
        "POST",
        "https://slack.com/api/files.getUploadURLExternal",
        headers={"Authorization": f"Bearer {token}"},
        data={"filename": file_path.name, "length": str(file_size)},
    )
    if resp is None:
        return False
    data = resp.json()
    if not data.get("ok"):
        print(f"Slack upload URL failed: {data}", file=sys.stderr)
        return False

    upload_url = data["upload_url"]
    file_id = data["file_id"]

    # Step 2: Upload file to presigned URL
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    resp = _slack_request(
        "POST",
        upload_url,
        files={"file": (file_path.name, file_bytes)},
    )
    if resp is None:
        return False
    if resp.status_code not in (200, 201):
        print(f"Slack file upload failed: {resp.status_code}", file=sys.stderr)
        return False

    # Step 3: Complete upload and share to channel
    payload = {
        "files": [{"id": file_id, "title": title}],
        "channel_id": channel,
    }
    if thread_ts:
        payload["thread_ts"] = thread_ts

    resp = _slack_request(
        "POST",
        "https://slack.com/api/files.completeUploadExternal",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=payload,
    )
    if resp is None:
        return False
    data = resp.json()
    if data.get("ok"):
        print(f"Uploaded to Slack: {title}")
        return True
    else:
        print(f"Slack complete upload failed: {data}", file=sys.stderr)
        return False
