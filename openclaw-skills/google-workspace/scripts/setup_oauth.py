#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-auth>=2.20.0",
#     "google-auth-oauthlib>=1.0.0",
# ]
# ///
"""One-time OAuth setup for Google Workspace per-profile credentials.

Runs a browser-based OAuth consent flow:
1. Reads .oauth-client.json from the skill directory
2. Launches browser for Google OAuth consent
3. User signs in with their brand's Google account
4. Receives auth code -> exchanges for refresh token
5. Saves credentials to <workspace_root>/credentials/google-workspace-oauth.json

Usage (run once per profile):
    uv run ~/.openclaw/skills/google-workspace/scripts/setup_oauth.py
    uv run ~/.openclaw-rawdog/skills/google-workspace/scripts/setup_oauth.py
    uv run ~/.openclaw-vitahustle/skills/google-workspace/scripts/setup_oauth.py
"""

import json
import os
import pathlib
import signal
import sys
from datetime import datetime, timezone

# SIGPIPE safety
try:
    signal.signal(signal.SIGPIPE, signal.SIG_IGN)
except (AttributeError, ValueError):
    pass

# Do NOT use .resolve() -- skills are symlinked from the git repo.
# .resolve() follows symlinks, breaking profile isolation.
SKILL_DIR = pathlib.Path(__file__).parent.parent
OAUTH_CLIENT_FILE = SKILL_DIR / ".oauth-client.json"

SCOPES = [
    "https://www.googleapis.com/auth/presentations",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


def _workspace_root():
    """Derive workspace root: <root>/skills/<name>/scripts/<this> -> climb 4 dirs."""
    return pathlib.Path(__file__).parent.parent.parent.parent


def main():
    print("=" * 60)
    print("Google Workspace OAuth Setup")
    print("=" * 60)
    print()

    workspace = _workspace_root()
    profile_name = workspace.name
    print(f"Profile root: {workspace}")
    print(f"Profile: {profile_name}")
    print()

    # Check for OAuth client config
    if not OAUTH_CLIENT_FILE.exists():
        print(f"ERROR: OAuth client file not found at:")
        print(f"  {OAUTH_CLIENT_FILE}")
        print()
        print("To set up:")
        print("1. Go to Google Cloud Console -> APIs & Services -> Credentials")
        print("2. Create an OAuth 2.0 Client ID (Desktop App)")
        print("3. Download the client secret JSON")
        print(f"4. Save it as: {OAUTH_CLIENT_FILE}")
        print()
        print("Also enable these APIs in your project:")
        print("  - Google Slides API")
        print("  - Google Docs API")
        print("  - Google Sheets API")
        print("  - Google Drive API")
        sys.exit(1)

    # Load client config
    client_config = json.loads(OAUTH_CLIENT_FILE.read_text())

    # Ensure credentials directory exists
    creds_dir = workspace / "credentials"
    creds_dir.mkdir(exist_ok=True)
    creds_file = creds_dir / "google-workspace-oauth.json"

    if creds_file.exists():
        existing = json.loads(creds_file.read_text())
        account = existing.get("account", "unknown")
        print(f"WARNING: Credentials already exist for account: {account}")
        print(f"  {creds_file}")
        response = input("Overwrite? (y/N): ").strip().lower()
        if response != "y":
            print("Aborted.")
            sys.exit(0)
        print()

    # Run OAuth flow
    from google_auth_oauthlib.flow import InstalledAppFlow

    print("Launching browser for Google OAuth consent...")
    print(f"Scopes: {', '.join(s.split('/')[-1] for s in SCOPES)}")
    print()
    print("Sign in with the Google account for this profile.")
    print()

    flow = InstalledAppFlow.from_client_config(client_config, scopes=SCOPES)
    creds = flow.run_local_server(port=0, prompt="consent")

    # Get the email address of the authenticated user
    import urllib.request
    import urllib.error

    account_email = ""
    # Try Drive API about endpoint first (already authorized via drive scope)
    try:
        req = urllib.request.Request(
            "https://www.googleapis.com/drive/v3/about?fields=user",
            headers={"Authorization": f"Bearer {creds.token}"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            about = json.loads(resp.read().decode())
            account_email = about.get("user", {}).get("emailAddress", "")
    except Exception:
        pass

    # Fallback to userinfo endpoint
    if not account_email:
        try:
            req = urllib.request.Request(
                "https://www.googleapis.com/oauth2/v1/userinfo",
                headers={"Authorization": f"Bearer {creds.token}"},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                user_info = json.loads(resp.read().decode())
                account_email = user_info.get("email", "")
        except Exception:
            pass

    if not account_email:
        account_email = input("Could not auto-detect email. Enter Google account email: ").strip()

    # Save credentials
    creds_data = {
        "type": "authorized_user",
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "refresh_token": creds.refresh_token,
        "scopes": SCOPES,
        "account": account_email,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    creds_file.write_text(json.dumps(creds_data, indent=2))
    creds_file.chmod(0o600)

    print()
    print("=" * 60)
    print("SUCCESS!")
    print("=" * 60)
    print(f"Account:     {account_email}")
    print(f"Credentials: {creds_file}")
    print(f"Permissions: 600 (owner read/write only)")
    print()
    print("Verify with:")
    print(f"  uv run {SKILL_DIR / 'scripts' / 'google_workspace.py'} auth status")


if __name__ == "__main__":
    main()
