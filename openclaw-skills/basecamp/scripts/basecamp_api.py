#!/usr/bin/env python3
"""Basecamp 4 API client -- shared by all modules."""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path

# Profile-aware env loading (NEVER use .resolve())
SKILL_DIR = Path(__file__).parent.parent
_env_path = SKILL_DIR / ".env"


def _load_env(path):
    """Load .env file into os.environ (simple key=value parser)."""
    if not path.exists():
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip("'\"")
                if key and key not in os.environ:
                    os.environ[key] = value


_load_env(_env_path)

ACCOUNT_ID = os.environ.get("BASECAMP_ACCOUNT_ID", "")
ACCESS_TOKEN = os.environ.get("BASECAMP_ACCESS_TOKEN", "")
USER_AGENT = os.environ.get("BASECAMP_USER_AGENT", "openCLAW (noreply@example.com)")

DEFAULT_PROJECT = os.environ.get("BASECAMP_DEFAULT_PROJECT", "")

BASE_URL = f"https://3.basecampapi.com/{ACCOUNT_ID}"

MAX_RETRIES = 3


def resolve_project(args_project):
    """Return project ID from args or fall back to BASECAMP_DEFAULT_PROJECT."""
    if args_project:
        return args_project
    if DEFAULT_PROJECT:
        return DEFAULT_PROJECT
    print(json.dumps({"error": "No --project specified and BASECAMP_DEFAULT_PROJECT not set"}))
    sys.exit(1)


def _check_config():
    """Validate required env vars are set."""
    missing = []
    if not ACCOUNT_ID:
        missing.append("BASECAMP_ACCOUNT_ID")
    if not ACCESS_TOKEN:
        missing.append("BASECAMP_ACCESS_TOKEN")
    if missing:
        print(json.dumps({"error": f"Missing env vars: {', '.join(missing)}"}))
        sys.exit(1)


def _headers():
    return {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
    }


def _parse_link_header(header):
    """Parse Link header for pagination (RFC 5988). Returns dict of rel->url."""
    links = {}
    if not header:
        return links
    for part in header.split(","):
        match = re.match(r'\s*<([^>]+)>\s*;\s*rel="([^"]+)"', part.strip())
        if match:
            links[match.group(2)] = match.group(1)
    return links


def api_request(method, path, data=None, paginate=False):
    """Make an authenticated request to the Basecamp API.

    Args:
        method: HTTP method (GET, POST, PUT, DELETE)
        path: API path (e.g., /projects.json) or full URL
        data: Request body dict (for POST/PUT)
        paginate: If True, follow Link headers to get all results

    Returns:
        Parsed JSON response (dict or list)
    """
    _check_config()

    url = path if path.startswith("http") else f"{BASE_URL}{path}"
    all_results = []

    while url:
        body = json.dumps(data).encode() if data is not None else None
        req = urllib.request.Request(url, data=body, headers=_headers(), method=method)

        for attempt in range(MAX_RETRIES):
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    resp_body = resp.read().decode()
                    link_header = resp.headers.get("Link", "")

                    if not resp_body:
                        return {} if not paginate else all_results

                    result = json.loads(resp_body)

                    if paginate and isinstance(result, list):
                        all_results.extend(result)
                        links = _parse_link_header(link_header)
                        url = links.get("next")
                        if url:
                            req = urllib.request.Request(
                                url, headers=_headers(), method="GET"
                            )
                        break
                    else:
                        return result

            except urllib.error.HTTPError as e:
                if e.code == 429:
                    retry_after = int(e.headers.get("Retry-After", 5))
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(retry_after)
                        continue
                error_body = e.read().decode() if e.fp else ""
                return {"error": f"HTTP {e.code}", "detail": error_body}
            except urllib.error.URLError as e:
                if attempt < MAX_RETRIES - 1:
                    time.sleep(2 ** attempt)
                    continue
                return {"error": f"Connection error: {e.reason}"}
        else:
            if paginate:
                break

    return all_results if paginate else {}


def output(data):
    """Print JSON output for agent consumption."""
    print(json.dumps(data, indent=2, default=str))


if __name__ == "__main__":
    _check_config()
    output({"status": "ok", "account_id": ACCOUNT_ID, "base_url": BASE_URL})
