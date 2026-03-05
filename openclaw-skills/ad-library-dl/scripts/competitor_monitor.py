# /// script
# requires-python = ">=3.10"
# dependencies = ["playwright>=1.40.0", "google-genai>=1.0.0", "google-cloud-storage>=2.0.0", "google-api-python-client>=2.100.0", "google-auth>=2.20.0"]
# ///
"""Competitive Intelligence Monitoring Pipeline.

Wraps analyze_competitor.py to provide:
- Persistent Google Drive folder structure per brand
- Rank change tracking across scans
- Scaling detection (ads climbing fast)
- Monitoring summaries with Slack output

Usage:
    # Full monitoring scan (interactive — posts to Slack thread)
    uv run competitor_monitor.py "AD_LIBRARY_URL" --limit 15 --monitor --slack

    # Cron/announce mode (summary to stdout, no progress spam)
    uv run competitor_monitor.py "AD_LIBRARY_URL" --limit 20 --monitor --quiet

    # List monitored brands
    uv run competitor_monitor.py --list-brands

    # Brand status
    uv run competitor_monitor.py --status --brand "BrandDir"

    # Scaling report
    uv run competitor_monitor.py --scaling --brand "BrandDir" --threshold 3
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import pathlib
import sys
import time
import urllib.request

# ---------------------------------------------------------------------------
# Import from sibling modules (same package)
# ---------------------------------------------------------------------------

# IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks
_script_dir = pathlib.Path(__file__).parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))

from ad_library_dl import (
    parse_ad_library_url,
    detect_brand_name,
    sanitize_brand,
    ensure_playwright_browsers,
    dismiss_cookie_dialogs,
    scroll_and_discover,
    detect_carousels,
    download_image,
    download_video,
    _url_hash,
    _guess_extension,
    _ytdlp_export_cookies,
    _read_slack_token,
    _get_allowed_channels,
    _dm_holden,
    _workspace_root,
)

from analyze_competitor import (
    detect_workspace_root,
    load_catalog,
    save_catalog,
    check_dedup,
    _content_hash,
    check_content_dedup,
    load_cached_analysis,
    persist_session,
    analyze_video_with_gemini,
    analyze_image_with_gemini,
    run_master_analysis,
    create_google_doc,
    post_analysis_to_slack,
    _retry,
    _push_competitor_to_mcp,
)

from ci_store import CIStore

# ---------------------------------------------------------------------------
# Module-level flags (set at runtime from CLI args)
# ---------------------------------------------------------------------------

_QUIET: bool = False  # Suppresses all Slack progress messages (cron mode)


# ---------------------------------------------------------------------------
# Gemini circuit breaker
# ---------------------------------------------------------------------------

class GeminiCircuitBreaker:
    """Trip after N consecutive Gemini failures to avoid wasting quota."""

    def __init__(self, threshold: int = 3):
        self.threshold = threshold
        self.consecutive_failures = 0
        self.is_open = False
        self.total_skipped = 0

    def record_success(self) -> None:
        self.consecutive_failures = 0

    def record_failure(self) -> None:
        self.consecutive_failures += 1
        if self.consecutive_failures >= self.threshold:
            self.is_open = True

    def should_skip(self) -> bool:
        if self.is_open:
            self.total_skipped += 1
            return True
        return False

    def summary(self) -> str:
        if self.is_open:
            return (
                f"Circuit breaker OPEN — {self.total_skipped} analyses skipped "
                f"after {self.threshold} consecutive failures"
            )
        return f"Circuit breaker closed ({self.consecutive_failures} consecutive failures)"


# ---------------------------------------------------------------------------
# Google Drive helpers (persistent folder structure)
# ---------------------------------------------------------------------------

def _load_google_creds():
    """Load Google OAuth credentials from profile's google-workspace-oauth.json."""
    import google.auth.transport.requests
    import google.oauth2.credentials

    profile_root = _script_dir.parent.parent.parent
    creds_path = profile_root / "credentials" / "google-workspace-oauth.json"

    if not creds_path.exists():
        print(f"[drive] OAuth credentials not found at: {creds_path}")
        return None

    creds_data = json.loads(creds_path.read_text())
    scopes = [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/documents",
    ]
    creds = google.oauth2.credentials.Credentials.from_authorized_user_info(creds_data, scopes=scopes)

    if creds.expired and creds.refresh_token:
        creds.refresh(google.auth.transport.requests.Request())
        updated = {
            "type": "authorized_user",
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "refresh_token": creds.refresh_token,
            "scopes": [s.rsplit("/", 1)[-1] for s in scopes],
            "account": creds_data.get("account", ""),
            "created_at": creds_data.get("created_at", ""),
        }
        creds_path.write_text(json.dumps(updated, indent=2))
        creds_path.chmod(0o600)

    return creds


def _drive_service():
    """Build Drive API service client."""
    from googleapiclient.discovery import build
    creds = _load_google_creds()
    if not creds:
        return None
    return build("drive", "v3", credentials=creds)


def _drive_search_folder(drive_svc, name: str, parent_id: str | None = None) -> str | None:
    """Find a folder by exact name, optionally within a parent. Returns folder ID or None."""
    q_parts = [
        "trashed = false",
        "mimeType = 'application/vnd.google-apps.folder'",
        f"name = '{name.replace(chr(92), chr(92)*2).replace(chr(39), chr(92)+chr(39))}'",
    ]
    if parent_id:
        q_parts.append(f"'{parent_id}' in parents")

    results = drive_svc.files().list(
        q=" and ".join(q_parts),
        pageSize=1,
        fields="files(id, name)",
    ).execute()

    files = results.get("files", [])
    return files[0]["id"] if files else None


def _drive_share_with_org(drive_svc, file_id: str) -> None:
    """Make a file/folder accessible to anyone with the link (viewer)."""
    try:
        drive_svc.permissions().create(
            fileId=file_id,
            body={"type": "anyone", "role": "reader"},
            fields="id",
        ).execute()
    except Exception as e:
        # If sharing fails (e.g. already shared, policy restrictions), log and continue
        print(f"  [drive] Sharing warning for {file_id}: {e}")


def _drive_create_folder(drive_svc, name: str, parent_id: str | None = None) -> str:
    """Create a Drive folder, returning its ID. Shared with anyone-with-link."""
    metadata = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    if parent_id:
        metadata["parents"] = [parent_id]

    folder = drive_svc.files().create(body=metadata, fields="id, name, webViewLink").execute()
    folder_id = folder["id"]
    _drive_share_with_org(drive_svc, folder_id)
    return folder_id


def _drive_find_or_create_folder(drive_svc, name: str, parent_id: str | None = None) -> str:
    """Idempotent: find existing folder or create new one."""
    existing = _drive_search_folder(drive_svc, name, parent_id)
    if existing:
        return existing
    return _drive_create_folder(drive_svc, name, parent_id)


def _drive_rename(drive_svc, file_id: str, new_name: str) -> None:
    """Rename a file in Drive."""
    drive_svc.files().update(
        fileId=file_id,
        body={"name": new_name},
    ).execute()


def _drive_upload_file(drive_svc, local_path: pathlib.Path, folder_id: str, name: str | None = None) -> str:
    """Upload a file to Drive, returning its file ID. Inherits parent folder sharing."""
    from googleapiclient.http import MediaFileUpload

    file_name = name or local_path.name
    metadata = {"name": file_name, "parents": [folder_id]}
    media = MediaFileUpload(str(local_path), resumable=True)
    uploaded = drive_svc.files().create(
        body=metadata, media_body=media, fields="id, name",
    ).execute()
    return uploaded["id"]
    # Note: files inherit sharing from parent folder, so no need to share individually


def ensure_drive_structure(drive_svc, catalog: dict, brand_dir: str, brand_display: str) -> dict:
    """Ensure persistent Drive folder structure for a brand. Returns updated brand entry.

    Structure:
        Competitor Ads/                     (shared: anyone with link)
          <Brand Name>/
            Statics/
            Videos/
            Carousels/
              carousel-001/
              carousel-002/
            Clones/
    """
    brand_entry = catalog["brands"].get(brand_dir, {})

    # Root: "Competitor Ads"
    root_id = brand_entry.get("drive_root_folder_id")
    if not root_id:
        root_id = _drive_find_or_create_folder(drive_svc, "Competitor Ads")
        _drive_share_with_org(drive_svc, root_id)
        print(f"[drive] Root folder: Competitor Ads ({root_id})")
    else:
        # Ensure existing root folder is shared
        _drive_share_with_org(drive_svc, root_id)

    # Brand folder
    brand_folder_name = brand_display
    brand_folder_id = _drive_search_folder(drive_svc, brand_folder_name, root_id)
    if not brand_folder_id:
        brand_folder_id = _drive_create_folder(drive_svc, brand_folder_name, root_id)
        print(f"[drive] Created brand folder: {brand_folder_name}")

    # Subfolders
    statics_id = brand_entry.get("drive_statics_folder_id")
    if not statics_id:
        statics_id = _drive_find_or_create_folder(drive_svc, "Statics", brand_folder_id)

    videos_id = brand_entry.get("drive_videos_folder_id")
    if not videos_id:
        videos_id = _drive_find_or_create_folder(drive_svc, "Videos", brand_folder_id)

    carousels_id = brand_entry.get("drive_carousels_folder_id")
    if not carousels_id:
        carousels_id = _drive_find_or_create_folder(drive_svc, "Carousels", brand_folder_id)

    clones_id = brand_entry.get("drive_clones_folder_id")
    if not clones_id:
        clones_id = _drive_find_or_create_folder(drive_svc, "Clones", brand_folder_id)

    # Update brand entry
    brand_entry["drive_root_folder_id"] = root_id
    brand_entry["drive_statics_folder_id"] = statics_id
    brand_entry["drive_videos_folder_id"] = videos_id
    brand_entry["drive_carousels_folder_id"] = carousels_id
    brand_entry["drive_clones_folder_id"] = clones_id

    print(f"[drive] Structure ready — Statics:{statics_id}, Videos:{videos_id}, Carousels:{carousels_id}, Clones:{clones_id}")
    return brand_entry


# ---------------------------------------------------------------------------
# Rank change tracking
# ---------------------------------------------------------------------------

def compute_rank_changes(catalog: dict, brand_dir: str, new_scan: list[dict]) -> dict:
    """Compare new scan results against catalog. Returns structured diff.

    new_scan: list of {"url_hash": str, "rank": int, "type": str, ...}

    Returns:
        {
            "new_ads": [...],       # First time seen
            "rank_up": [...],       # Climbed in rank (lower number)
            "rank_down": [...],     # Dropped in rank (higher number)
            "unchanged": [...],     # Same rank
            "disappeared": [...],   # In catalog but not in new scan
        }
    """
    result = {
        "new_ads": [],
        "rank_up": [],
        "rank_down": [],
        "unchanged": [],
        "disappeared": [],
    }

    new_hashes = set()
    for item in new_scan:
        h = item["url_hash"]
        new_hashes.add(h)
        existing = catalog["assets"].get(h)

        if not existing or existing.get("brand") != brand_dir:
            result["new_ads"].append(item)
        else:
            old_rank = existing.get("current_rank", existing.get("rank"))
            new_rank = item["rank"]
            if old_rank is None:
                result["new_ads"].append(item)
            elif new_rank < old_rank:
                item["old_rank"] = old_rank
                item["rank_delta"] = old_rank - new_rank
                result["rank_up"].append(item)
            elif new_rank > old_rank:
                item["old_rank"] = old_rank
                item["rank_delta"] = new_rank - old_rank
                result["rank_down"].append(item)
            else:
                result["unchanged"].append(item)

    # Find disappeared ads (were in catalog for this brand, not in new scan)
    for h, asset in catalog["assets"].items():
        if asset.get("brand") == brand_dir and h not in new_hashes:
            result["disappeared"].append(asset)

    return result


# ---------------------------------------------------------------------------
# Scaling detection
# ---------------------------------------------------------------------------

def detect_scaling(catalog: dict, brand_dir: str, threshold: int = 3) -> list[dict]:
    """Find ads that climbed >= threshold positions across recent scans.

    Returns list of scaling alerts with velocity analysis.
    """
    scaling = []

    for h, asset in catalog["assets"].items():
        if asset.get("brand") != brand_dir:
            continue

        history = asset.get("rank_history", [])
        if len(history) < 2:
            continue

        # Compare last two entries
        latest = history[-1]
        previous = history[-2]
        delta = previous["rank"] - latest["rank"]

        if delta >= threshold:
            # Calculate velocity (positions per scan)
            total_climb = history[0]["rank"] - latest["rank"] if history[0]["rank"] > latest["rank"] else 0
            scans = len(history)

            scaling.append({
                "url_hash": h,
                "current_rank": latest["rank"],
                "previous_rank": previous["rank"],
                "delta": delta,
                "total_climb": total_climb,
                "scans_tracked": scans,
                "velocity": round(total_climb / max(scans - 1, 1), 1),
                "first_seen": asset.get("first_seen"),
                "type": asset.get("type"),
                "filename": asset.get("filename"),
            })

    scaling.sort(key=lambda x: x["delta"], reverse=True)
    return scaling


# ---------------------------------------------------------------------------
# Monitoring summary (Slack-formatted)
# ---------------------------------------------------------------------------

def format_monitoring_summary(
    brand: str,
    changes: dict,
    scaling_alerts: list[dict],
    doc_url: str | None,
    drive_folder_url: str | None,
    session_ts: str,
) -> str:
    """Format monitoring results as Slack mrkdwn."""
    lines = [
        f"\U0001f50d *Competitor Monitor: {brand}*",
        f"_Scan: {session_ts}_",
        "",
    ]

    # Summary stats
    total = sum(len(v) for v in changes.values())
    new_count = len(changes["new_ads"])
    up_count = len(changes["rank_up"])
    down_count = len(changes["rank_down"])

    lines.append(f"*{total} ads tracked* \u2014 {new_count} new, {up_count} \u2191 climbing, {down_count} \u2193 dropping")

    # New ads
    if changes["new_ads"]:
        lines.append("")
        lines.append(f"\U0001f195 *New Ads ({new_count}):*")
        for ad in changes["new_ads"][:5]:
            lines.append(f"  \u2022 #{ad['rank']} ({ad.get('type', '?')})")

    # Rank climbers
    if changes["rank_up"]:
        lines.append("")
        lines.append(f"\U0001f4c8 *Climbing ({up_count}):*")
        for ad in sorted(changes["rank_up"], key=lambda x: x.get("rank_delta", 0), reverse=True)[:5]:
            lines.append(f"  \u2022 #{ad.get('old_rank')} \u2192 #{ad['rank']} (+{ad.get('rank_delta', '?')} positions)")

    # Scaling alerts
    if scaling_alerts:
        lines.append("")
        lines.append(f"\U0001f680 *Scaling Alerts ({len(scaling_alerts)}):*")
        for alert in scaling_alerts[:3]:
            lines.append(
                f"  \u2022 #{alert['current_rank']} ({alert['type']}) \u2014 "
                f"climbed {alert['delta']} positions, velocity {alert['velocity']} pos/scan"
            )

    # Disappeared
    disappeared_count = len(changes.get("disappeared", []))
    if disappeared_count > 0:
        lines.append("")
        lines.append(f"\U0001f47b *Disappeared:* {disappeared_count} ads no longer in top results")

    # Links
    lines.append("")
    if doc_url:
        lines.append(f"\U0001f4c4 <{doc_url}|Full Analysis (Google Doc)>")
    if drive_folder_url:
        lines.append(f"\U0001f4c1 <{drive_folder_url}|Media Files (Google Drive)>")

    return "\n".join(lines)


def post_monitoring_to_slack(summary_text: str) -> bool:
    """Post monitoring summary to Slack thread."""
    channel = os.environ.get("SLACK_CHANNEL_ID")
    thread_ts = os.environ.get("SLACK_THREAD_TS")
    token = os.environ.get("SLACK_BOT_TOKEN") or _read_slack_token()

    if not channel:
        print("[slack] SLACK_CHANNEL_ID not set — skipping")
        return False
    if not token:
        print("[slack] No Slack token — skipping")
        return False

    allowed = _get_allowed_channels()
    if allowed and channel not in allowed:
        print(f"[slack] BLOCKED: channel {channel} not in allowlist")
        _dm_holden(
            f":warning: *Channel Allowlist Block*\n\n"
            f"competitor_monitor.py tried to post to `{channel}` "
            f"but it's not in the workspace allowlist."
        )
        return False

    payload = {"channel": channel, "text": summary_text}
    if thread_ts:
        payload["thread_ts"] = thread_ts

    def _do_post():
        req = urllib.request.Request(
            "https://slack.com/api/chat.postMessage",
            data=json.dumps(payload).encode(),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
            if not result.get("ok"):
                raise RuntimeError(result.get("error", "unknown"))

    try:
        _retry(_do_post, max_retries=3, base_delay=2.0, label="slack")
        print("[slack] Posted monitoring summary")
        return True
    except Exception as e:
        print(f"[slack] Failed: {e}")
        return False


def _slack_progress(msg: str) -> None:
    """Post a brief progress update to the Slack thread (non-blocking, best-effort).

    Guards:
    - Suppressed entirely in quiet mode (``--quiet``).
    - Suppressed when ``SLACK_THREAD_TS`` is absent to prevent top-level channel spam.
    """
    if _QUIET:
        return

    channel = os.environ.get("SLACK_CHANNEL_ID")
    thread_ts = os.environ.get("SLACK_THREAD_TS")
    token = os.environ.get("SLACK_BOT_TOKEN") or _read_slack_token()

    if not channel or not token:
        return  # silently skip if not in Slack context

    # Never post progress as top-level messages — thread_ts required
    if not thread_ts:
        return

    payload = {"channel": channel, "text": msg, "thread_ts": thread_ts}

    try:
        req = urllib.request.Request(
            "https://slack.com/api/chat.postMessage",
            data=json.dumps(payload).encode(),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        urllib.request.urlopen(req, timeout=10)
    except Exception:
        pass  # best-effort — don't break the pipeline


# ---------------------------------------------------------------------------
# Info commands (--list-brands, --status, --scaling)
# ---------------------------------------------------------------------------

def cmd_list_brands(competitors_dir: pathlib.Path) -> None:
    """List all monitored brands."""
    catalog = load_catalog(competitors_dir)
    brands = catalog.get("brands", {})
    if not brands:
        print("No monitored brands found.")
        return

    print(f"Monitored Brands ({len(brands)}):\n")
    for key, brand in sorted(brands.items()):
        sessions = len(brand.get("sessions", []))
        last = brand.get("last_analyzed", "never")[:10]
        asset_count = sum(1 for a in catalog["assets"].values() if a.get("brand") == key)
        print(f"  {brand.get('display_name', key)}")
        print(f"    Dir: {key} | Scans: {sessions} | Assets: {asset_count} | Last: {last}")
        if brand.get("drive_statics_folder_id"):
            print(f"    Drive: configured")
        print()


def cmd_status(competitors_dir: pathlib.Path, brand_dir: str) -> None:
    """Show detailed status for a brand."""
    catalog = load_catalog(competitors_dir)
    brand = catalog["brands"].get(brand_dir)
    if not brand:
        print(f"Brand '{brand_dir}' not found in catalog.")
        sys.exit(1)

    assets = {h: a for h, a in catalog["assets"].items() if a.get("brand") == brand_dir}
    images = [a for a in assets.values() if a.get("type") == "image"]
    videos = [a for a in assets.values() if a.get("type") == "video"]

    print(f"Brand: {brand.get('display_name', brand_dir)}")
    print(f"First analyzed: {brand.get('first_analyzed', 'unknown')[:10]}")
    print(f"Last analyzed: {brand.get('last_analyzed', 'unknown')[:10]}")
    print(f"Total scans: {len(brand.get('sessions', []))}")
    print(f"Assets: {len(assets)} ({len(images)} images, {len(videos)} videos)")
    print(f"Drive configured: {'yes' if brand.get('drive_statics_folder_id') else 'no'}")
    print()

    # Top 10 by current rank
    ranked = sorted(assets.values(), key=lambda a: a.get("current_rank", 999))
    print("Top 10 by current rank:")
    for a in ranked[:10]:
        history_len = len(a.get("rank_history", []))
        clones_count = len(a.get("clones", []))
        print(f"  #{a.get('current_rank', '?'):>3} | {a['type']:>5} | {a.get('url_hash', '?')[:8]} | "
              f"history: {history_len} scans | clones: {clones_count}")


def cmd_scaling(competitors_dir: pathlib.Path, brand_dir: str, threshold: int) -> None:
    """Show scaling report for a brand."""
    catalog = load_catalog(competitors_dir)
    if brand_dir not in catalog.get("brands", {}):
        print(f"Brand '{brand_dir}' not found.")
        sys.exit(1)

    alerts = detect_scaling(catalog, brand_dir, threshold)
    if not alerts:
        print(f"No scaling detected (threshold: {threshold} positions)")
        return

    print(f"Scaling Alerts for {brand_dir} (threshold: {threshold}):\n")
    for alert in alerts:
        print(f"  #{alert['current_rank']} ({alert['type']}) — "
              f"climbed {alert['delta']} positions (#{alert['previous_rank']} → #{alert['current_rank']})")
        print(f"    Total climb: {alert['total_climb']} over {alert['scans_tracked']} scans, "
              f"velocity: {alert['velocity']} pos/scan")
        print(f"    First seen: {alert.get('first_seen', 'unknown')[:10]}")
        print()


# ---------------------------------------------------------------------------
# Dedup helpers
# ---------------------------------------------------------------------------

def _find_persisted_file(competitors_dir: pathlib.Path, asset_entry: dict) -> pathlib.Path | None:
    """Locate a previously-persisted media file for an asset.

    Walks ``competitors/<brand>/<session>/`` directories looking for the
    original download.  Returns the path if found, ``None`` otherwise.
    """
    brand = asset_entry.get("brand")
    filename = asset_entry.get("filename")
    session = asset_entry.get("session")
    if not brand or not filename:
        return None

    # Fast path: check the recorded session directory first
    if session:
        candidate = competitors_dir / brand / session / filename
        if candidate.exists():
            return candidate

    # Slow path: scan all session dirs for this brand
    brand_dir = competitors_dir / brand
    if not brand_dir.is_dir():
        return None
    for session_dir in sorted(brand_dir.iterdir(), reverse=True):
        if not session_dir.is_dir():
            continue
        candidate = session_dir / filename
        if candidate.exists():
            return candidate
    return None


# ---------------------------------------------------------------------------
# Main monitoring pipeline
# ---------------------------------------------------------------------------

def run_monitor(args) -> None:
    """Full monitoring scan: download, analyze, track ranks, manage Drive, post summary."""
    global _QUIET
    _QUIET = getattr(args, "quiet", False)

    brand_name_ref = ["Unknown"]  # mutable — inner function updates [0]

    try:
        _run_monitor_inner(args, brand_name_ref=brand_name_ref)
    except Exception as exc:
        # Pipeline-level failure notification
        error_msg = (
            f":rotating_light: *Competitor Monitor Failed*\n\n"
            f"Brand: {brand_name_ref[0]}\n"
            f"Error: `{exc}`"
        )
        # Always try to post failure (even in quiet mode)
        post_monitoring_to_slack(error_msg)
        raise


def _run_monitor_inner(args, *, brand_name_ref: list[str]) -> None:
    """Inner implementation of run_monitor — separated for error handling wrapper."""
    # In announce mode (no --slack), redirect diagnostic output to stderr so
    # only the final monitoring summary goes to stdout (gateway captures stdout).
    _real_stdout = sys.stdout
    if not args.slack:
        sys.stdout = sys.stderr

    from google import genai

    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0013158607")
    client = genai.Client(vertexai=True, project=project, location="global")
    print(f"[genai] Vertex AI (project={project})")

    url_info = parse_ad_library_url(args.url)
    session_ts = datetime.datetime.now().strftime("%Y-%m-%d-%H%M%S")

    # Init persistent storage
    workspace_root = detect_workspace_root()
    competitors_dir = workspace_root / "brand" / "competitors"
    competitors_dir.mkdir(parents=True, exist_ok=True)
    catalog = load_catalog(competitors_dir)
    print(f"[persist] Catalog: {len(catalog['assets'])} assets, {len(catalog['brands'])} brands")

    # ---------------------------------------------------------------------------
    # Step 1: Download media (with browser retry)
    # ---------------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("STEP 1: Download media from Ad Library")
    print("=" * 60)
    _slack_progress(":mag: *Scanning Ad Library* — discovering and downloading ads...")

    ensure_playwright_browsers()
    from playwright.sync_api import sync_playwright

    max_browser_attempts = 2
    for attempt in range(1, max_browser_attempts + 1):
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    viewport={"width": 1280, "height": 900},
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                )
                page = context.new_page()
                page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

                print(f"[browser] Navigating to Ad Library... (attempt {attempt}/{max_browser_attempts})")
                page.goto(args.url, wait_until="networkidle", timeout=60000)
                time.sleep(3)
                dismiss_cookie_dialogs(page)

                brand = detect_brand_name(page) or url_info["q"] or "UnknownBrand"
                brand_dir = sanitize_brand(brand)
                brand_name_ref[0] = brand  # expose to error handler
                print(f"[info] Brand: {brand}")

                out_dir = pathlib.Path.home() / "Downloads" / "ad-library" / brand_dir / session_ts
                out_dir.mkdir(parents=True, exist_ok=True)

                print("[scroll] Discovering media...")
                media = scroll_and_discover(page, args.type, args.limit)

                # Detect carousel ads (groups of 2+ images in the same ad card)
                carousel_groups = detect_carousels(page)
                browser.close()
            break  # success — exit retry loop
        except Exception as browser_exc:
            if attempt < max_browser_attempts:
                print(f"[browser] Attempt {attempt} failed: {browser_exc} — retrying in 30s...")
                time.sleep(30)
            else:
                raise

    # Build a lookup: image_url -> carousel index (None if not in a carousel)
    carousel_lookup: dict[str, int] = {}
    for ci, group in enumerate(carousel_groups):
        for img_url in group:
            carousel_lookup[img_url] = ci
    if carousel_groups:
        carousel_image_count = sum(len(g) for g in carousel_groups)
        print(f"[carousel] Detected {len(carousel_groups)} carousel ads ({carousel_image_count} images)")

    images = media["images"][:args.limit]
    videos = media["videos"][:args.limit]  # Independent limit (not shared with images)
    landing_pages = media.get("landing_pages", [])

    if not images and not videos:
        print("[done] No media found.")
        return

    # Download with rank-based naming + dedup
    cookies_file = _ytdlp_export_cookies() if videos else None

    downloaded_files: list[dict] = []
    cached_analyses: list[dict] = []
    new_scan_items: list[dict] = []  # For rank tracking

    reanalyze_files: list[dict] = []  # Assets with catalog entry but missing analysis
    img_ok = 0
    dedup_count = 0
    for i, url in enumerate(images, 1):
        h = _url_hash(url)
        ext = _guess_extension(url, "image")

        # Map landing page by position (best-effort: landing pages correlate by impression order)
        lp_url = landing_pages[i - 1] if i - 1 < len(landing_pages) else None

        new_scan_items.append({"url_hash": h, "rank": i, "type": "image", "url": url, "landing_page_url": lp_url})

        existing = check_dedup(catalog, url)
        if existing and not args.force:
            # Catalog entry exists — always skip download
            cached = load_cached_analysis(competitors_dir, existing)
            if cached:
                cached["_rank"] = i
                cached_analyses.append(cached)
            else:
                # Analysis file missing — check if media persists for re-analysis
                persisted = _find_persisted_file(competitors_dir, existing)
                if persisted:
                    reanalyze_files.append({
                        "path": persisted, "type": "image", "rank": i,
                        "url": url, "content_hash": existing.get("content_hash"),
                        "landing_page_url": lp_url,
                    })
                    print(f"  [{i}/{len(images)}] [dedup] Re-analyze {h[:8]} (analysis missing, media found)")
                else:
                    print(f"  [{i}/{len(images)}] [dedup] Skip {h[:8]} (catalog only, no analysis/media)")
            dedup_count += 1
            continue

        dest = out_dir / f"rank-{i:03d}-img-{h}{ext}"
        print(f"  [{i}/{len(images)}] Downloading image \u2192 {dest.name}")
        if download_image(url, dest):
            # Content-hash dedup check (catches cross-session dupes with different URLs)
            chash = _content_hash(dest)
            content_match = check_content_dedup(catalog, chash)
            if content_match and not args.force:
                cached = load_cached_analysis(competitors_dir, content_match)
                if cached:
                    cached["_rank"] = i
                    cached_analyses.append(cached)
                dedup_count += 1
                content_match["current_rank"] = i
                content_match["rank"] = i
                content_match["rank_history"].append({
                    "rank": i, "session": session_ts,
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                })
                print(f"  [{i}/{len(images)}] [content-dedup] Same content as {content_match['url_hash'][:8]}")
                dest.unlink(missing_ok=True)
                continue

            img_ok += 1
            downloaded_files.append({"path": dest, "type": "image", "rank": i, "url": url, "content_hash": chash, "landing_page_url": lp_url})

    vid_ok = 0
    vid_dedup = 0
    for i, url in enumerate(videos, 1):
        h = _url_hash(url)
        ext = _guess_extension(url, "video")

        new_scan_items.append({"url_hash": h, "rank": i, "type": "video", "url": url})

        existing = check_dedup(catalog, url)
        if existing and not args.force:
            # Catalog entry exists — always skip download
            cached = load_cached_analysis(competitors_dir, existing)
            if cached:
                cached["_rank"] = i
                cached_analyses.append(cached)
            else:
                persisted = _find_persisted_file(competitors_dir, existing)
                if persisted:
                    reanalyze_files.append({
                        "path": persisted, "type": "video", "rank": i,
                        "url": url, "content_hash": existing.get("content_hash"),
                    })
                    print(f"  [{i}/{len(videos)}] [dedup] Re-analyze {h[:8]} (analysis missing, media found)")
                else:
                    print(f"  [{i}/{len(videos)}] [dedup] Skip {h[:8]} (catalog only, no analysis/media)")
            dedup_count += 1
            vid_dedup += 1
            continue

        dest = out_dir / f"rank-{i:03d}-vid-{h}{ext}"
        print(f"  [{i}/{len(videos)}] Downloading video \u2192 {dest.name}")
        if download_video(url, dest, cookies_file):
            # Content-hash dedup check
            chash = _content_hash(dest)
            content_match = check_content_dedup(catalog, chash)
            if content_match and not args.force:
                cached = load_cached_analysis(competitors_dir, content_match)
                if cached:
                    cached["_rank"] = i
                    cached_analyses.append(cached)
                dedup_count += 1
                vid_dedup += 1
                content_match["current_rank"] = i
                content_match["rank"] = i
                content_match["rank_history"].append({
                    "rank": i, "session": session_ts,
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                })
                print(f"  [{i}/{len(videos)}] [content-dedup] Same content as {content_match['url_hash'][:8]}")
                dest.unlink(missing_ok=True)
                continue

            vid_ok += 1
            downloaded_files.append({"path": dest, "type": "video", "rank": i, "url": url, "content_hash": chash})

    print(f"\n[download] {img_ok} images, {vid_ok} videos new; {dedup_count} cached")

    # Milestone 2: Discovery + download summary
    _slack_progress(
        f":magnifying_glass_tilted_right: *Discovery complete* — "
        f"{len(images)} images + {len(videos)} videos found, "
        f"{img_ok + vid_ok} new, {dedup_count} cached"
    )

    # Propagate content_hash and landing_page_url to new_scan_items for CI store
    content_hash_map = {_url_hash(item["url"]): item.get("content_hash") for item in downloaded_files}
    lp_map = {_url_hash(item["url"]): item.get("landing_page_url") for item in downloaded_files if item.get("landing_page_url")}
    for scan_item in new_scan_items:
        ch = content_hash_map.get(scan_item["url_hash"])
        if ch:
            scan_item["content_hash"] = ch
        # landing_page_url already set on scan_item for images; also check from downloaded_files for videos
        if not scan_item.get("landing_page_url"):
            lp = lp_map.get(scan_item["url_hash"])
            if lp:
                scan_item["landing_page_url"] = lp

    # Early catalog checkpoint: save content hashes immediately so crash recovery works
    if downloaded_files:
        now_ckpt = datetime.datetime.utcnow().isoformat() + "Z"
        for item in downloaded_files:
            h = _url_hash(item["url"])
            rank_history_entry = {"rank": item["rank"], "session": session_ts, "timestamp": now_ckpt}
            analysis_filename = f"rank-{item['rank']:03d}-{'img' if item['type'] == 'image' else 'vid'}-{h}.analysis.json"
            existing = catalog["assets"].get(h)
            if existing:
                existing["current_rank"] = item["rank"]
                existing["rank"] = item["rank"]
                existing["rank_history"].append(rank_history_entry)
                existing["filename"] = item["path"].name
                existing["session"] = session_ts
                existing["analysis_file"] = analysis_filename
                if not existing.get("content_hash") and item.get("content_hash"):
                    existing["content_hash"] = item["content_hash"]
                if item.get("landing_page_url"):
                    existing["landing_page_url"] = item["landing_page_url"]
            else:
                catalog["assets"][h] = {
                    "url_hash": h,
                    "brand": brand_dir,
                    "type": item["type"],
                    "rank": item["rank"],
                    "current_rank": item["rank"],
                    "rank_history": [rank_history_entry],
                    "filename": item["path"].name,
                    "analyzed_at": None,
                    "first_seen": now_ckpt,
                    "session": session_ts,
                    "analysis_file": analysis_filename,
                    "source_url_prefix": item["url"][:60],
                    "content_hash": item.get("content_hash"),
                    "landing_page_url": item.get("landing_page_url"),
                    "drive_file_id": None,
                    "clones": [],
                }
        save_catalog(catalog, competitors_dir)
        print(f"[checkpoint] Saved {len(downloaded_files)} assets to catalog (crash recovery)")

    if not downloaded_files and not cached_analyses:
        print("[done] No files and no cached analyses.")
        print(f"[info] No new ads found for {brand}. Scan complete.")
        return

    # ---------------------------------------------------------------------------
    # Step 2: Rank change analysis
    # ---------------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("STEP 2: Rank change analysis")
    print("=" * 60)

    changes = compute_rank_changes(catalog, brand_dir, new_scan_items)
    print(f"  New: {len(changes['new_ads'])} | Up: {len(changes['rank_up'])} | "
          f"Down: {len(changes['rank_down'])} | Same: {len(changes['unchanged'])} | "
          f"Gone: {len(changes['disappeared'])}")

    # ---------------------------------------------------------------------------
    # Step 3: Gemini vision analysis (new + re-analyze assets)
    # ---------------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("STEP 3: Gemini vision analysis")
    print("=" * 60)

    # Combine new downloads + assets needing re-analysis
    analysis_queue = list(downloaded_files) + list(reanalyze_files)
    if analysis_queue:
        _slack_progress(f":brain: *Analyzing {len(analysis_queue)} new ads* with Gemini...")

    all_analyses: list[dict] = list(cached_analyses)
    flash_model = args.flash_model
    circuit = GeminiCircuitBreaker(threshold=3)

    def _gemini_retry_cb(attempt, max_retries, delay, error):
        """Post to Slack when Gemini hits rate limits or retries."""
        err_short = str(error)[:80]
        _slack_progress(f":hourglass: Gemini rate limit — retrying in {delay:.0f}s (attempt {attempt}/{max_retries}): {err_short}")

    analysis_total = len(analysis_queue)
    analysis_done = 0
    for item in sorted(analysis_queue, key=lambda x: x["rank"]):
        fpath = item["path"]
        ftype = item["type"]
        rank = item["rank"]
        analysis_done += 1

        if circuit.should_skip():
            print(f"\n[{rank}] [circuit-breaker] Skipping {ftype}: {fpath.name}")
            all_analyses.append({
                "_rank": rank, "_type": ftype, "_filename": fpath.name,
                "error": "skipped — circuit breaker open",
            })
            continue

        print(f"\n[{rank}] Analyzing {ftype}: {fpath.name}")
        try:
            if ftype == "video":
                analysis = analyze_video_with_gemini(client, fpath, model=flash_model, project=project,
                                                     on_retry=_gemini_retry_cb)
            else:
                analysis = analyze_image_with_gemini(client, fpath, model=flash_model,
                                                     on_retry=_gemini_retry_cb)

            analysis["_rank"] = rank
            analysis["_type"] = ftype
            analysis["_filename"] = fpath.name
            all_analyses.append(analysis)
            circuit.record_success()

            json_path = fpath.with_suffix(".analysis.json")
            with open(json_path, "w") as f:
                json.dump(analysis, indent=2, fp=f)
        except Exception as e:
            print(f"  [error] Analysis failed: {e}")
            circuit.record_failure()
            all_analyses.append({
                "_rank": rank, "_type": ftype, "_filename": fpath.name, "error": str(e),
            })

    print(f"\n[analysis] {len(analysis_queue)} analyzed + {len(cached_analyses)} cached = {len(all_analyses)} total")
    print(f"[circuit-breaker] {circuit.summary()}")

    # ---------------------------------------------------------------------------
    # Step 4: Master analysis + Google Doc
    # ---------------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("STEP 4: Master analysis + Google Doc")
    print("=" * 60)
    # (No progress message — internal pipeline step)

    all_analyses.sort(key=lambda x: x.get("_rank", 999))
    master_report = run_master_analysis(client, brand, all_analyses, model=args.model,
                                        on_retry=_gemini_retry_cb)

    report_path = out_dir / "competitive-analysis.md"
    with open(report_path, "w") as f:
        f.write(master_report)

    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    doc_title = f"{brand} Competitive Analysis \u2014 {date_str}"
    doc_result = create_google_doc(master_report, doc_title)
    doc_url = doc_result["doc_url"] if doc_result else None

    # Persist session files + update catalog immediately after analysis
    # (before Drive upload, so analysis work survives upload crashes)
    persist_session(out_dir, competitors_dir, brand_dir, session_ts)
    now_persist = datetime.datetime.utcnow().isoformat() + "Z"
    for item in downloaded_files:
        h = _url_hash(item["url"])
        existing = catalog["assets"].get(h)
        if existing:
            existing["analyzed_at"] = now_persist
    save_catalog(catalog, competitors_dir)
    print(f"[checkpoint] Session persisted + catalog updated (analysis complete)")

    # ---------------------------------------------------------------------------
    # Step 5: Drive structure + file management
    # ---------------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("STEP 5: Drive folder structure + uploads")
    print("=" * 60)
    # (No progress message — internal pipeline step)

    drive_folder_url = None
    drive_svc = _drive_service()

    if drive_svc:
        # Ensure brand folder structure
        brand_entry = catalog["brands"].get(brand_dir, {
            "display_name": brand,
            "first_analyzed": datetime.datetime.utcnow().isoformat() + "Z",
            "ad_library_url": args.url,
            "sessions": [],
        })
        brand_entry = ensure_drive_structure(drive_svc, catalog, brand_dir, brand)
        catalog["brands"][brand_dir] = brand_entry

        statics_folder = brand_entry["drive_statics_folder_id"]
        videos_folder = brand_entry["drive_videos_folder_id"]
        carousels_folder = brand_entry["drive_carousels_folder_id"]

        # Track carousel folders created this session (carousel_index -> folder_id)
        carousel_drive_folders: dict[int, str] = {}

        # Upload new files with rank-prefixed names
        # Content-hash dedup: track already-uploaded content to avoid duplicates
        uploaded_content: dict[str, str] = {}  # content_hash -> drive_file_id

        upload_total = len(downloaded_files)
        upload_ok = 0
        upload_dedup = 0
        for idx, item in enumerate(downloaded_files, 1):
            h = _url_hash(item["url"])
            ext = _guess_extension(item["url"], item["type"])
            rank_name = f"{item['rank']:03d}_{h}{ext}"

            # Skip if this asset already has a drive_file_id (e.g. from a prior session)
            existing_asset = catalog["assets"].get(h)
            if existing_asset and existing_asset.get("drive_file_id"):
                print(f"  [drive] [{idx}/{upload_total}] Skip {rank_name} (already uploaded)")
                upload_dedup += 1
                continue

            # Content-hash dedup: reuse drive_file_id if identical content already uploaded
            chash = item.get("content_hash")
            if chash and chash in uploaded_content:
                if existing_asset:
                    existing_asset["drive_file_id"] = uploaded_content[chash]
                print(f"  [drive] [{idx}/{upload_total}] Dedup {rank_name} (content match)")
                upload_dedup += 1
                continue

            # Route to correct folder: carousel / statics / videos
            carousel_idx = carousel_lookup.get(item["url"])
            if carousel_idx is not None and item["type"] == "image":
                # Carousel image -- create/find subfolder for this carousel group
                if carousel_idx not in carousel_drive_folders:
                    folder_name = f"carousel-{carousel_idx + 1:03d}"
                    folder_id = _drive_find_or_create_folder(drive_svc, folder_name, carousels_folder)
                    carousel_drive_folders[carousel_idx] = folder_id
                    print(f"  [drive] Created carousel folder: {folder_name}")
                target_folder = carousel_drive_folders[carousel_idx]
            elif item["type"] == "video":
                target_folder = videos_folder
            else:
                target_folder = statics_folder

            try:
                file_id = _drive_upload_file(drive_svc, item["path"], target_folder, rank_name)
                # Store drive_file_id in catalog
                if existing_asset:
                    existing_asset["drive_file_id"] = file_id
                if chash:
                    uploaded_content[chash] = file_id
                upload_ok += 1
                print(f"  [drive] [{idx}/{upload_total}] Uploaded {rank_name}")
            except Exception as e:
                print(f"  [drive] [{idx}/{upload_total}] Upload failed for {rank_name}: {e}")

        if upload_total > 0:
            print(f"  [drive] Uploads complete: {upload_ok} new, {upload_dedup} deduped (of {upload_total})")

        # Rename existing files when rank changed
        for ad in changes["rank_up"] + changes["rank_down"]:
            h = ad["url_hash"]
            asset = catalog["assets"].get(h)
            if asset and asset.get("drive_file_id"):
                ext = _guess_extension("", asset.get("type", "image"))
                # Try common extensions
                if not ext:
                    ext = ".jpg" if asset.get("type") == "image" else ".mp4"
                new_name = f"{ad['rank']:03d}_{h}{ext}"
                try:
                    _drive_rename(drive_svc, asset["drive_file_id"], new_name)
                    print(f"  [drive] Renamed {h[:8]} \u2192 {new_name}")
                except Exception as e:
                    print(f"  [drive] Rename failed for {h[:8]}: {e}")

        # Get Drive folder URL
        root_id = brand_entry.get("drive_root_folder_id")
        if root_id:
            # Find the brand folder ID
            brand_folder_id = _drive_search_folder(drive_svc, brand, root_id)
            if brand_folder_id:
                drive_folder_url = f"https://drive.google.com/drive/folders/{brand_folder_id}"
    else:
        print("[drive] No Drive credentials — skipping")

    # ---------------------------------------------------------------------------
    # Step 6: Finalize catalog (brand entry, rank tracking, Drive IDs)
    # ---------------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("STEP 6: Finalize catalog")
    print("=" * 60)
    # (No progress message — internal pipeline step)

    now_iso = datetime.datetime.utcnow().isoformat() + "Z"

    # Update rank for cached (dedup'd) assets
    for scan_item in new_scan_items:
        h = scan_item["url_hash"]
        asset = catalog["assets"].get(h)
        if asset and asset.get("brand") == brand_dir:
            old_rank = asset.get("current_rank")
            new_rank = scan_item["rank"]
            if old_rank != new_rank:
                asset["current_rank"] = new_rank
                asset["rank"] = new_rank
                asset["rank_history"].append({
                    "rank": new_rank,
                    "session": session_ts,
                    "timestamp": now_iso,
                })

    # Update brand
    brand_entry = catalog["brands"].get(brand_dir, {
        "display_name": brand,
        "first_analyzed": now_iso,
        "ad_library_url": args.url,
        "sessions": [],
    })
    brand_entry.setdefault("sessions", [])
    brand_entry["last_analyzed"] = now_iso
    brand_entry["sessions"].append({
        "timestamp": session_ts,
        "ads_analyzed": len(all_analyses),
        "new_assets": len(downloaded_files),
        "deduped": dedup_count,
        "doc_url": doc_url,
        "mode": "monitor",
    })
    catalog["brands"][brand_dir] = brand_entry
    save_catalog(catalog, competitors_dir)

    # Push to MCP
    if master_report:
        _push_competitor_to_mcp(brand, master_report)

    # ---------------------------------------------------------------------------
    # Step 6b: Persist to CI Store (SQLite + optional PostgreSQL + ChromaDB)
    # ---------------------------------------------------------------------------
    ci = None
    try:
        ci = CIStore(enable_chroma=True)
        # Annotate analyses with asset hashes for ci_store
        for item in downloaded_files:
            h = _url_hash(item["url"])
            for analysis in all_analyses:
                fname = analysis.get("_filename", "")
                if h in fname:
                    analysis["_url_hash"] = h
                    break

        drive_ids = {}
        brand_e = catalog["brands"].get(brand_dir, {})
        for key in ("root", "statics", "videos", "clones"):
            fid = brand_e.get(f"drive_{key}_folder_id")
            if fid:
                drive_ids[key] = fid

        ci.save_scan(
            brand_dir=brand_dir,
            brand_display=brand,
            assets=new_scan_items,
            changes=changes,
            analyses=all_analyses,
            session_ts=session_ts,
            ad_library_url=args.url,
            doc_url=doc_url,
            drive_url=drive_folder_url,
            scaling_alerts=len(detect_scaling(catalog, brand_dir, threshold=args.threshold)),
            deduped=dedup_count,
            drive_folder_ids=drive_ids,
        )
        # Sync per-asset drive_file_id from catalog → ci.db
        for h, asset in catalog.get("assets", {}).items():
            fid = asset.get("drive_file_id")
            if fid:
                ci.update_asset_drive_id(h, fid)
    except Exception as e:
        print(f"[ci_store] Warning: failed to persist to CI store: {e}")
    finally:
        if ci:
            ci.close()

    # ---------------------------------------------------------------------------
    # Step 7: Scaling detection + summary
    # ---------------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("STEP 7: Scaling detection + summary")
    print("=" * 60)
    # (No progress message — internal pipeline step)

    scaling_alerts = detect_scaling(catalog, brand_dir, threshold=args.threshold)
    if scaling_alerts:
        print(f"[scaling] {len(scaling_alerts)} ads scaling:")
        for alert in scaling_alerts:
            print(f"  #{alert['current_rank']} — climbed {alert['delta']} positions")

    summary = format_monitoring_summary(
        brand, changes, scaling_alerts, doc_url, drive_folder_url, session_ts,
    )

    # Diagnostic banner (always to stderr / current stdout)
    print("\n" + "=" * 60)
    print("MONITORING COMPLETE")
    print("=" * 60)
    print(f"  Brand: {brand}")
    print(f"  Assets: {len(all_analyses)} ({img_ok} new imgs, {vid_ok} new vids, {dedup_count} cached)")
    print(f"  Rank changes: {len(changes['new_ads'])} new, {len(changes['rank_up'])} up, {len(changes['rank_down'])} down")
    if scaling_alerts:
        print(f"  Scaling alerts: {len(scaling_alerts)}")
    if doc_url:
        print(f"  Google Doc: {doc_url}")
    if drive_folder_url:
        print(f"  Drive: {drive_folder_url}")

    if args.slack:
        post_monitoring_to_slack(summary)
    else:
        # Announce mode: restore real stdout, print ONLY the summary (gateway captures it)
        sys.stdout = _real_stdout
        print(summary)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    if not os.environ.get("MONITOR_SAFE"):
        print("ERROR: Direct calls blocked. Use monitor_safe.sh.", file=sys.stderr)
        sys.exit(1)

    parser = argparse.ArgumentParser(
        description="Competitive intelligence monitoring pipeline",
    )
    parser.add_argument("url", nargs="?", help="Facebook Ad Library URL")
    parser.add_argument("--brand-name", dest="brand_name", default=None,
                        help="Brand name to resolve to Ad Library URL (alternative to positional URL)")
    parser.add_argument("--discover-competitors", dest="discover_competitors", action="store_true",
                        help="Discover competitors first, then monitor all found brands")
    parser.add_argument("--limit", type=int, default=15, help="Max ads to scan (default: 15)")
    parser.add_argument("--type", choices=["images", "videos", "both"], default="both")
    parser.add_argument("--monitor", action="store_true", help="Run full monitoring scan")
    parser.add_argument("--slack", action="store_true", help="Post results to Slack")
    parser.add_argument("--quiet", action="store_true", help="Suppress progress messages (for cron/announce mode)")
    parser.add_argument("--force", action="store_true", help="Re-download all (ignore dedup)")
    parser.add_argument("--model", default="gemini-3-pro-preview", help="Model for master analysis")
    parser.add_argument("--flash-model", default="gemini-3-flash-preview", help="Model for per-asset analysis")
    parser.add_argument("--threshold", type=int, default=3, help="Scaling detection threshold (positions)")

    # Info commands
    parser.add_argument("--list-brands", action="store_true", help="List all monitored brands")
    parser.add_argument("--status", action="store_true", help="Show brand status")
    parser.add_argument("--scaling", action="store_true", help="Show scaling report")
    parser.add_argument("--brand", help="Brand directory name (for --status/--scaling)")

    args = parser.parse_args()

    # Resolve persistent storage
    workspace_root = detect_workspace_root()
    competitors_dir = workspace_root / "brand" / "competitors"
    competitors_dir.mkdir(parents=True, exist_ok=True)

    # Info commands
    if args.list_brands:
        cmd_list_brands(competitors_dir)
        return

    if args.status:
        if not args.brand:
            print("--status requires --brand <BrandDir>")
            sys.exit(1)
        cmd_status(competitors_dir, args.brand)
        return

    if args.scaling:
        if not args.brand:
            print("--scaling requires --brand <BrandDir>")
            sys.exit(1)
        cmd_scaling(competitors_dir, args.brand, args.threshold)
        return

    # Resolve brand name to URL if --brand-name provided
    if args.brand_name and not args.url:
        from brand_resolver import resolve_brand
        resolved = resolve_brand(args.brand_name)
        args.url = resolved["url"]
        print(f"[brand] Resolved '{args.brand_name}' -> {args.url} (confidence: {resolved['confidence_score']})")

    # Discover-then-monitor flow
    if args.discover_competitors:
        if not args.brand_name and not args.url:
            print("[error] --discover-competitors requires --brand-name or a URL")
            sys.exit(1)
        brand = args.brand_name or parse_ad_library_url(args.url).get("q", "")
        from competitor_discover import discover_competitors
        competitors = discover_competitors(brand_name=brand, limit=10)
        if not competitors:
            print("[discover] No competitors found.")
            sys.exit(0)
        print(f"[discover] Found {len(competitors)} competitors. Monitoring each...")
        for c in competitors:
            print(f"\n{'='*60}")
            print(f"[monitor] Starting: {c['brand_name']}")
            args.url = c["url"]
            try:
                run_monitor(args)
            except Exception as e:
                print(f"[monitor] Error monitoring {c['brand_name']}: {e}")
        return

    # Monitoring scan requires URL
    if not args.url:
        parser.print_help()
        sys.exit(1)

    if "facebook.com/ads/library" not in args.url and "fb.com/ads/library" not in args.url:
        print("[error] URL must be a Facebook Ad Library URL")
        sys.exit(1)

    run_monitor(args)


if __name__ == "__main__":
    main()
