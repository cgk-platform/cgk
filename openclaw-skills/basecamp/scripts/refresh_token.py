#!/usr/bin/env python3
"""Refresh Basecamp OAuth token before expiry. Updates .env in-place."""

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

# Profile-aware path (NEVER .resolve()). Try __file__ first, then $PWD.
SKILL_DIR = Path(__file__).parent.parent
ENV_PATH = SKILL_DIR / ".env"


def load_env():
    """Load .env into a dict preserving order and comments."""
    lines = []
    vals = {}
    if ENV_PATH.exists():
        with open(ENV_PATH) as f:
            for line in f:
                lines.append(line)
                stripped = line.strip()
                if stripped and not stripped.startswith("#") and "=" in stripped:
                    key, _, value = stripped.partition("=")
                    vals[key.strip()] = value.strip()
    return lines, vals


def save_env(lines, updates):
    """Write .env back with updated values."""
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            key, _, _ = stripped.partition("=")
            key = key.strip()
            if key in updates:
                new_lines.append(f"{key}={updates[key]}\n")
                continue
        new_lines.append(line)
    with open(ENV_PATH, "w") as f:
        f.writelines(new_lines)


def refresh():
    lines, vals = load_env()

    refresh_token = vals.get("BASECAMP_REFRESH_TOKEN", "")
    client_id = vals.get("BASECAMP_CLIENT_ID", "")
    client_secret = vals.get("BASECAMP_CLIENT_SECRET", "")

    if not all([refresh_token, client_id, client_secret]):
        print(json.dumps({"error": "Missing BASECAMP_REFRESH_TOKEN, BASECAMP_CLIENT_ID, or BASECAMP_CLIENT_SECRET in .env"}))
        sys.exit(1)

    data = (
        f"type=refresh&refresh_token={refresh_token}"
        f"&client_id={client_id}&client_secret={client_secret}"
        f"&redirect_uri=http://localhost"
    ).encode()

    req = urllib.request.Request(
        "https://launchpad.37signals.com/authorization/token",
        data=data,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(json.dumps({"error": f"HTTP {e.code}", "detail": body}))
        sys.exit(1)

    new_access = result.get("access_token", "")
    new_refresh = result.get("refresh_token", "")

    if not new_access:
        print(json.dumps({"error": "No access_token in response", "response": result}))
        sys.exit(1)

    updates = {"BASECAMP_ACCESS_TOKEN": new_access}
    if new_refresh:
        updates["BASECAMP_REFRESH_TOKEN"] = new_refresh

    save_env(lines, updates)
    print(json.dumps({"status": "refreshed", "expires_in": result.get("expires_in", "unknown")}))


if __name__ == "__main__":
    refresh()
