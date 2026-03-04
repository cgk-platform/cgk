# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "google-api-python-client>=2.100.0",
#   "google-auth>=2.23.0",
#   "google-auth-oauthlib>=1.1.0",
# ]
# ///
"""
One-time OAuth 2.0 helper — obtains a YouTube refresh token.

Usage:
  uv run youtube_auth_setup.py [--env-file /path/to/.env]

Flow:
  1. Reads YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET from .env or prompts
  2. Opens browser for Google OAuth consent
  3. Prints refresh token + channel ID
  4. Optionally writes them to the .env file
"""

import os
import sys
from pathlib import Path


def _load_env(env_path: Path) -> dict[str, str]:
    """Flat KEY=VALUE parser, no eval."""
    env = {}
    if not env_path.exists():
        return env
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip()
    return env


def main():
    import argparse

    parser = argparse.ArgumentParser(description="YouTube OAuth 2.0 token setup")
    parser.add_argument(
        "--env-file",
        type=Path,
        default=Path(__file__).resolve().parent.parent / ".env",
        help="Path to .env file (default: skill .env)",
    )
    args = parser.parse_args()

    env = _load_env(args.env_file)

    client_id = env.get("YOUTUBE_CLIENT_ID") or os.environ.get("YOUTUBE_CLIENT_ID")
    client_secret = env.get("YOUTUBE_CLIENT_SECRET") or os.environ.get(
        "YOUTUBE_CLIENT_SECRET"
    )

    if not client_id:
        client_id = input("Enter YOUTUBE_CLIENT_ID: ").strip()
    if not client_secret:
        client_secret = input("Enter YOUTUBE_CLIENT_SECRET: ").strip()

    if not client_id or not client_secret:
        print("ERROR: Both YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET are required.", file=sys.stderr)
        sys.exit(1)

    from google_auth_oauthlib.flow import InstalledAppFlow

    SCOPES = [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube",
    ]

    client_config = {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost"],
        }
    }

    flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
    credentials = flow.run_local_server(
        port=8090,
        access_type="offline",
        prompt="consent",
    )

    refresh_token = credentials.refresh_token
    if not refresh_token:
        print("ERROR: No refresh token received. Try revoking access at", file=sys.stderr)
        print("  https://myaccount.google.com/permissions", file=sys.stderr)
        print("and running this script again.", file=sys.stderr)
        sys.exit(1)

    # Fetch channel ID
    from googleapiclient.discovery import build

    youtube = build("youtube", "v3", credentials=credentials)
    resp = youtube.channels().list(part="snippet", mine=True).execute()
    items = resp.get("items", [])
    channel_id = items[0]["id"] if items else ""
    channel_title = items[0]["snippet"]["title"] if items else "(unknown)"

    print()
    print("=" * 60)
    print("  YouTube OAuth Setup Complete")
    print("=" * 60)
    print(f"  Channel: {channel_title}")
    print(f"  Channel ID: {channel_id}")
    print(f"  Refresh Token: {refresh_token}")
    print("=" * 60)
    print()

    write = input(f"Write these to {args.env_file}? [y/N] ").strip().lower()
    if write == "y":
        import re

        content = args.env_file.read_text()
        content = re.sub(
            r"^YOUTUBE_REFRESH_TOKEN=.*$",
            f"YOUTUBE_REFRESH_TOKEN={refresh_token}",
            content,
            flags=re.MULTILINE,
        )
        content = re.sub(
            r"^YOUTUBE_CHANNEL_ID=.*$",
            f"YOUTUBE_CHANNEL_ID={channel_id}",
            content,
            flags=re.MULTILINE,
        )
        args.env_file.write_text(content)
        print(f"Written to {args.env_file}")
    else:
        print("Not written. Copy the values above into your .env manually.")


if __name__ == "__main__":
    main()
