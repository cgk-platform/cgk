#!/usr/bin/env python3
"""Meta Ads token auto-refresh — runs on a schedule via launchd.

Checks the current token's expiry and refreshes if < 14 days remain.
Updates both .token.json and ~/.zshrc with the new token automatically.

Logs to <profile>/skills/meta-ads/logs/token-refresh.log
"""

import datetime
import json
import os
import pathlib
import re
import stat
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request

# Derive profile root from script location: <root>/skills/meta-ads/scripts/token_refresh_cron.py
_oc_home = os.environ.get("OPENCLAW_HOME", str(pathlib.Path(__file__).resolve().parent.parent.parent.parent))
SKILL_DIR = pathlib.Path(_oc_home) / "skills" / "meta-ads"
TOKEN_FILE = SKILL_DIR / ".token.json"
ENV_FILE = SKILL_DIR / ".env"
LOG_DIR = SKILL_DIR / "logs"
LOG_FILE = LOG_DIR / "token-refresh.log"
ZSHRC = pathlib.Path.home() / ".zshrc"

# Derive plist name from profile directory name
_state_dir = pathlib.Path(_oc_home).name  # ".openclaw" or ".openclaw-rawdog" etc.
if _state_dir == ".openclaw":
    _plist_name = "ai.openclaw.gateway"
elif _state_dir.startswith(".openclaw-"):
    _profile = _state_dir.replace(".openclaw-", "")
    _plist_name = f"ai.openclaw.{_profile}"
else:
    _plist_name = "ai.openclaw.gateway"  # fallback
GATEWAY_PLIST = pathlib.Path.home() / "Library" / "LaunchAgents" / f"{_plist_name}.plist"
BASE_URL = "https://graph.facebook.com"
REFRESH_THRESHOLD_DAYS = 14


def log(msg):
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


def api_get(path, params):
    qs = urllib.parse.urlencode(params)
    url = f"{BASE_URL}/{path}?{qs}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def load_env():
    """Load Meta env vars — from environment first, then parse .zshrc as fallback."""
    keys = ["META_ACCESS_TOKEN", "META_APP_ID", "META_APP_SECRET", "META_API_VERSION"]
    env = {k: os.environ.get(k, "") for k in keys}

    # Fallback: parse ~/.secrets.env then ~/.zshrc for any missing values
    if not all(env.get(k) for k in ["META_ACCESS_TOKEN", "META_APP_ID", "META_APP_SECRET"]):
        secrets_env = pathlib.Path.home() / ".secrets.env"
        for rc_file in [secrets_env, ZSHRC]:
            if not rc_file.exists():
                continue
            content = rc_file.read_text()
            for key in keys:
                if not env.get(key):
                    match = re.search(rf'^export {key}="([^"]*)"', content, re.MULTILINE)
                    if match:
                        env[key] = match.group(1)

    # Also check .token.json for the token
    if not env.get("META_ACCESS_TOKEN") and TOKEN_FILE.exists():
        try:
            saved = json.loads(TOKEN_FILE.read_text())
            env["META_ACCESS_TOKEN"] = saved.get("access_token", "")
        except (json.JSONDecodeError, OSError):
            pass

    env.setdefault("META_API_VERSION", "v24.0")
    return env


def _atomic_write(path, content, mode=0o600):
    """Write content to path atomically via tempfile + os.replace."""
    parent = path.parent
    fd, tmp_path = tempfile.mkstemp(dir=parent, prefix=f".{path.name}.")
    try:
        os.write(fd, content.encode())
        os.fchmod(fd, mode)
        os.close(fd)
        os.replace(tmp_path, str(path))
    except Exception:
        os.close(fd) if not os.get_inheritable(fd) else None
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def update_zshrc(new_token):
    """Replace META_ACCESS_TOKEN value in ~/.zshrc (atomic write)."""
    # Check both ~/.secrets.env (preferred) and ~/.zshrc for the token
    secrets_env = pathlib.Path.home() / ".secrets.env"
    target = None

    for candidate in [secrets_env, ZSHRC]:
        if not candidate.exists():
            continue
        content = candidate.read_text()
        pattern = r'^(export META_ACCESS_TOKEN=")([^"]*)(")'
        if re.search(pattern, content, re.MULTILINE):
            target = candidate
            break

    if target is None:
        log("WARNING: META_ACCESS_TOKEN line not found in ~/.secrets.env or ~/.zshrc")
        return False

    content = target.read_text()
    pattern = r'^(export META_ACCESS_TOKEN=")([^"]*)(")'
    new_content = re.sub(pattern, rf'\g<1>{new_token}\3', content, flags=re.MULTILINE)
    _atomic_write(target, new_content, mode=0o600)
    log(f"Updated META_ACCESS_TOKEN in {target}")
    return True


def update_env_file(new_token):
    """Replace META_ACCESS_TOKEN in the skill .env file."""
    if not ENV_FILE.exists():
        log("WARNING: .env file not found, skipping")
        return False

    content = ENV_FILE.read_text()
    pattern = r'^(META_ACCESS_TOKEN=)(.*)'
    match = re.search(pattern, content, re.MULTILINE)

    if not match:
        log("WARNING: META_ACCESS_TOKEN not found in .env")
        return False

    new_content = re.sub(pattern, rf'\g<1>{new_token}', content, flags=re.MULTILINE)
    ENV_FILE.write_text(new_content)
    ENV_FILE.chmod(0o600)
    log("Updated META_ACCESS_TOKEN in .env")
    return True


def update_gateway_plist(new_token):
    """Replace META_ACCESS_TOKEN in the OpenClaw gateway launchd plist."""
    if not GATEWAY_PLIST.exists():
        log("WARNING: Gateway plist not found, skipping")
        return False

    content = GATEWAY_PLIST.read_text()
    # Match the <key>META_ACCESS_TOKEN</key>\n    <string>...</string> pattern
    pattern = r'(<key>META_ACCESS_TOKEN</key>\s*<string>)([^<]*)(</string>)'
    match = re.search(pattern, content)

    if not match:
        log("WARNING: META_ACCESS_TOKEN not found in gateway plist")
        return False

    new_content = re.sub(pattern, rf'\g<1>{new_token}\3', content)
    GATEWAY_PLIST.write_text(new_content)
    log("Updated META_ACCESS_TOKEN in gateway plist")

    # Restart the gateway to pick up the new token
    import subprocess
    try:
        subprocess.run(["launchctl", "stop", _plist_name], check=False, timeout=5)
        import time
        time.sleep(2)
        subprocess.run(["launchctl", "start", _plist_name], check=False, timeout=5)
        log("Gateway restarted to pick up new token")
    except Exception as e:
        log(f"WARNING: Could not restart gateway: {e}")

    return True


def save_token(token, expires_at=None):
    """Save token to .token.json."""
    record = {
        "access_token": token,
        "token_type": "long_lived_user",
        "saved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "expires_at": expires_at,
        "last_refresh": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    TOKEN_FILE.write_text(json.dumps(record, indent=2) + "\n")
    TOKEN_FILE.chmod(0o600)


def main():
    log("--- Token refresh check started ---")

    env = load_env()
    token = env.get("META_ACCESS_TOKEN", "")
    app_id = env.get("META_APP_ID", "")
    app_secret = env.get("META_APP_SECRET", "")
    api_version = env.get("META_API_VERSION", "v24.0")

    if not token:
        log("ERROR: No access token found. Nothing to refresh.")
        sys.exit(1)

    if not app_id or not app_secret:
        log("ERROR: META_APP_ID and META_APP_SECRET required for refresh.")
        sys.exit(1)

    # Check current token status
    try:
        data = api_get(f"{api_version}/debug_token", {
            "input_token": token,
            "access_token": token,
        })
    except urllib.error.HTTPError as e:
        log(f"ERROR: Token debug failed with HTTP {e.code}")
        log("Token may be fully expired. Manual re-auth needed via Graph API Explorer.")
        sys.exit(1)

    info = data.get("data", {})

    if not info.get("is_valid"):
        log("ERROR: Token is invalid/expired. Manual re-auth needed.")
        log("  1. Go to https://developers.facebook.com/tools/explorer/")
        log("  2. Generate a new short-lived token")
        log("  3. Run: meta_api_helper.py exchange-token --short-lived-token <TOKEN>")
        sys.exit(1)

    token_type = info.get("type", "")
    expires_at = info.get("expires_at", 0)

    if token_type == "SYSTEM":
        log("System user token — never expires. No refresh needed.")
        return

    # Check if expires_at is 0 (never) or a timestamp
    if expires_at == 0:
        log("Token has no expiry (expires_at=0). Attempting preventive refresh anyway.")
        # Even "never expire" tokens should be refreshed periodically as a safety measure
        # Check when we last refreshed
        saved = None
        if TOKEN_FILE.exists():
            try:
                saved = json.loads(TOKEN_FILE.read_text())
            except (json.JSONDecodeError, OSError):
                pass

        if saved and saved.get("last_refresh"):
            last_refresh = datetime.datetime.fromisoformat(saved["last_refresh"])
            days_since = (datetime.datetime.now(datetime.timezone.utc) - last_refresh).days
            if days_since < 45:
                log(f"Last refresh was {days_since} days ago. Skipping (threshold: 45 days).")
                return
            log(f"Last refresh was {days_since} days ago. Refreshing as precaution.")
        else:
            log("No refresh history found. Refreshing as precaution.")
    else:
        # Has a real expiry timestamp
        exp_dt = datetime.datetime.fromtimestamp(expires_at, tz=datetime.timezone.utc)
        now = datetime.datetime.now(datetime.timezone.utc)
        days_left = (exp_dt - now).days

        log(f"Token expires: {exp_dt.strftime('%Y-%m-%d %H:%M UTC')} ({days_left} days left)")

        if days_left > REFRESH_THRESHOLD_DAYS:
            log(f"Token is healthy ({days_left} days remaining > {REFRESH_THRESHOLD_DAYS} threshold). No refresh needed.")
            return

        log(f"Token expiring soon ({days_left} days). Refreshing...")

    # Attempt refresh
    try:
        data = api_get(f"{api_version}/oauth/access_token", {
            "grant_type": "fb_exchange_token",
            "client_id": app_id,
            "client_secret": app_secret,
            "fb_exchange_token": token,
        })
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        log(f"ERROR: Token refresh failed with HTTP {e.code}: {body}")
        sys.exit(1)

    new_token = data.get("access_token")
    expires_in = data.get("expires_in")

    if not new_token:
        log(f"ERROR: No access_token in response: {json.dumps(data)}")
        sys.exit(1)

    new_expires_at = None
    if expires_in:
        exp_dt = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=int(expires_in))
        new_expires_at = exp_dt.isoformat()
        days = int(expires_in) // 86400
        log(f"New token obtained (expires in ~{days} days)")
    else:
        log("New token obtained (no expiry info)")

    # Save to .token.json
    save_token(new_token, new_expires_at)
    log(f"Saved to {TOKEN_FILE}")

    # Update all token locations
    if new_token != token:
        update_zshrc(new_token)
        update_gateway_plist(new_token)
        update_env_file(new_token)
        log("TOKEN CHANGED — .zshrc, gateway plist, and .env updated.")
    else:
        log("Token value unchanged after refresh.")

    log("--- Token refresh complete ---")


if __name__ == "__main__":
    main()
