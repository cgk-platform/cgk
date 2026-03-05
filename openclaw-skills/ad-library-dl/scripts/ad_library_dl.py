# /// script
# requires-python = ">=3.10"
# dependencies = ["playwright>=1.40.0", "google-api-python-client>=2.100.0", "google-auth>=2.20.0"]
# ///
"""Facebook Ad Library Media Downloader.

Automates headless Chromium to scroll through Facebook Ad Library pages,
extract image/video CDN URLs from the DOM, and download them locally.
Mirrors the logic of the Chrome extension (content.js).

v2: Session-based folders, rank-based filenames, Google Drive upload,
Slack thread posting, and 30-day auto-purge.
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
import urllib.error
from urllib.parse import urlparse, parse_qs


# ---------------------------------------------------------------------------
# Retry with exponential backoff
# ---------------------------------------------------------------------------

def _retry(fn, max_retries: int = 3, base_delay: float = 2.0, label: str = "",
           on_retry=None):
    """Run fn() with exponential backoff. Returns result or raises last exception.

    on_retry: optional callback(attempt, max_retries, delay, error) called before sleeping.
    """
    last_exc = None
    for attempt in range(1, max_retries + 1):
        try:
            return fn()
        except Exception as e:
            last_exc = e
            if attempt < max_retries:
                delay = base_delay * (2 ** (attempt - 1))  # 2s, 4s, 8s
                tag = f" [{label}]" if label else ""
                print(f"    [retry{tag}] Attempt {attempt}/{max_retries} failed: {e} — retrying in {delay:.0f}s")
                if on_retry:
                    try:
                        on_retry(attempt, max_retries, delay, e)
                    except Exception:
                        pass
                time.sleep(delay)
    raise last_exc


# ---------------------------------------------------------------------------
# URL / brand helpers
# ---------------------------------------------------------------------------

def parse_ad_library_url(url: str) -> dict:
    """Extract query params (brand name, country, etc.) from an Ad Library URL."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    return {
        "q": params.get("q", [""])[0],
        "country": params.get("country", [""])[0],
        "active_status": params.get("active_status", [""])[0],
        "ad_type": params.get("ad_type", [""])[0],
    }


def detect_brand_name(page) -> str:
    """Auto-detect advertiser name from the rendered page (mirrors content.js)."""
    # 1. Profile picture alt text
    try:
        el = page.query_selector("img._8nqq")
        if el:
            alt = el.get_attribute("alt")
            if alt and alt.strip():
                return alt.strip()
    except Exception:
        pass

    # 2. Search input value
    try:
        el = page.query_selector('input[placeholder="Search by keyword or advertiser"]')
        if el:
            val = el.input_value()
            if val and val.strip():
                return val.strip()
    except Exception:
        pass

    # 3. URL q= parameter (fallback handled by caller)
    return ""


def sanitize_brand(name: str) -> str:
    """Sanitize brand name for use as a directory name."""
    return re.sub(r"[^a-zA-Z0-9_-]", "_", name).strip("_") or "UnknownBrand"


# ---------------------------------------------------------------------------
# Playwright helpers
# ---------------------------------------------------------------------------

def ensure_playwright_browsers():
    """Install Playwright Chromium if not already present."""
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            # Just check if launch works; if not, install below
            browser = p.chromium.launch(headless=True)
            browser.close()
    except Exception:
        print("[setup] Installing Playwright Chromium browser...")
        subprocess.run(
            [sys.executable, "-m", "playwright", "install", "chromium"],
            check=True,
            timeout=120,
        )


def dismiss_cookie_dialogs(page):
    """Click through Facebook cookie consent banners if present."""
    selectors = [
        'button[data-cookiebanner="accept_button"]',
        'button[title="Allow all cookies"]',
        'button[title="Accept All"]',
        'button:has-text("Allow all cookies")',
        'button:has-text("Accept All")',
        'button:has-text("Allow essential and optional cookies")',
    ]
    for sel in selectors:
        try:
            btn = page.query_selector(sel)
            if btn and btn.is_visible():
                btn.click()
                print("[cookies] Dismissed cookie dialog")
                time.sleep(1)
                return
        except Exception:
            continue


# ---------------------------------------------------------------------------
# Media extraction
# ---------------------------------------------------------------------------

def _url_hash(url: str) -> str:
    """Short hash for deduplication / filenames."""
    return hashlib.md5(url.encode()).hexdigest()[:10]


def _guess_extension(url: str, media_type: str) -> str:
    """Guess file extension from URL or fall back based on type."""
    try:
        path_part = urlparse(url).path
        m = re.search(r"\.([a-zA-Z0-9]{3,5})$", path_part)
        if m:
            ext = m.group(1).lower()
            if ext in ("jpg", "jpeg", "png", "gif", "webp", "mp4", "mov", "avi"):
                return f".{ext}"
    except Exception:
        pass

    query = urlparse(url).query.lower()
    if "dst-jpg" in query or "format=jpg" in query:
        return ".jpg"
    if "format=png" in query:
        return ".png"
    if "format=mp4" in query or "video/mp4" in query:
        return ".mp4"

    return ".mp4" if media_type == "video" else ".jpg"


def extract_media_urls(page, media_type: str) -> dict[str, list[str]]:
    """Extract image and/or video URLs from the current DOM state.

    Returns {"images": [...], "videos": [...], "landing_pages": [...]}.
    """
    results: dict[str, list[str]] = {"images": [], "videos": [], "landing_pages": []}

    if media_type in ("images", "both"):
        imgs = page.evaluate("""() => {
            const out = [];
            document.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]').forEach(img => {
                // Skip small images (logos, profile pics, icons)
                if (img.naturalWidth < 200 || img.naturalHeight < 200) return;
                // Skip images in the page header / profile section
                const rect = img.getBoundingClientRect();
                const parent = img.closest('[role="banner"], header, nav');
                if (parent) return;
                // Skip profile pics (typically square, small, and near the top)
                const isSquarish = Math.abs(img.naturalWidth - img.naturalHeight) < 20;
                const isSmallSquare = isSquarish && img.naturalWidth < 300;
                if (isSmallSquare) return;
                if (img.src) out.push(img.src);
            });
            return out;
        }""")
        results["images"] = imgs or []

    if media_type in ("videos", "both"):
        vids = page.evaluate("""() => {
            const out = new Set();
            document.querySelectorAll('video source[src*="video"], video[src*="video"]').forEach(el => {
                if (el.src) out.add(el.src);
            });
            document.querySelectorAll('video').forEach(v => {
                if (v.src) out.add(v.src);
                v.querySelectorAll('source').forEach(s => {
                    if (s.src) out.add(s.src);
                });
            });
            return [...out];
        }""")
        results["videos"] = vids or []

    # Extract CTA / landing page URLs (outbound ad links)
    landing = page.evaluate("""() => {
        const out = [];
        // Facebook wraps outbound ad links through l.facebook.com/l.php?u=<encoded>
        document.querySelectorAll('a[href*="l.facebook.com/l.php"]').forEach(a => {
            try {
                const url = new URL(a.href);
                const dest = url.searchParams.get('u');
                if (dest) out.push(decodeURIComponent(dest));
            } catch(e) {}
        });
        // Also check direct external links (some ads link directly)
        document.querySelectorAll('a[href^="http"]').forEach(a => {
            try {
                const url = new URL(a.href);
                if (!url.hostname.includes('facebook.com') && !url.hostname.includes('fb.com')) {
                    out.push(a.href);
                }
            } catch(e) {}
        });
        return out;
    }""")
    results["landing_pages"] = landing or []

    return results


def detect_carousels(page) -> list[list[str]]:
    """Detect carousel ads — groups of 2+ images within the same ad card.

    Returns list of groups, where each group is a list of image URLs.
    """
    groups = page.evaluate("""() => {
        const carousels = [];
        // Ad Library renders each ad in a container div. Carousels have
        // multiple scrollable images within one ad card.
        // Look for scrollable containers with multiple images
        const adCards = document.querySelectorAll('[class*="ad"], [data-testid*="ad"]');
        // Fallback: look for any container with 2+ large images
        const containers = adCards.length > 0 ? adCards :
            document.querySelectorAll('div[class]');

        containers.forEach(card => {
            const imgs = card.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]');
            const validImgs = [];
            imgs.forEach(img => {
                if (img.naturalWidth >= 200 && img.naturalHeight >= 200) {
                    const isSquarish = Math.abs(img.naturalWidth - img.naturalHeight) < 20;
                    if (!(isSquarish && img.naturalWidth < 300)) {
                        validImgs.push(img.src);
                    }
                }
            });
            if (validImgs.length >= 2) {
                carousels.push(validImgs);
            }
        });
        return carousels;
    }""")
    return groups or []


# ---------------------------------------------------------------------------
# Scroll + discover loop
# ---------------------------------------------------------------------------

def scroll_and_discover(page, media_type: str, limit: int) -> dict[str, list[str]]:
    """Core loop: scroll incrementally, extract media URLs, stop at limit or page bottom.

    Returns {"images": [...], "videos": [...], "landing_pages": [...]}.
    Uses lists (preserving DOM order = impression rank) with set-based dedup.
    """
    seen_images: set[str] = set()
    seen_videos: set[str] = set()
    seen_landing_pages: set[str] = set()
    ordered_images: list[str] = []
    ordered_videos: list[str] = []
    ordered_landing_pages: list[str] = []
    no_new_count = 0
    max_no_new = 5  # stop after 5 consecutive scrolls with no new media

    def _count():
        # When fetching both types, keep scrolling until the dominant type
        # hits the limit.  This prevents images from starving out video
        # discovery (videos appear deeper in the feed).
        if media_type == "both":
            return max(len(ordered_images), len(ordered_videos))
        return len(ordered_images) + len(ordered_videos)

    def _collect():
        nonlocal no_new_count
        before = _count()
        found = extract_media_urls(page, media_type)
        for url in found["images"]:
            if url not in seen_images:
                seen_images.add(url)
                ordered_images.append(url)
        for url in found["videos"]:
            if url not in seen_videos:
                seen_videos.add(url)
                ordered_videos.append(url)
        for url in found.get("landing_pages", []):
            if url not in seen_landing_pages:
                seen_landing_pages.add(url)
                ordered_landing_pages.append(url)
        after = _count()
        if after > before:
            no_new_count = 0
            print(f"  [scroll] Found {after - before} new — total {after}")
        else:
            no_new_count += 1

    # Initial collection before scrolling
    _collect()

    while _count() < limit and no_new_count < max_no_new:
        old_height = page.evaluate("document.body.scrollHeight")
        page.evaluate("window.scrollBy(0, window.innerHeight)")
        time.sleep(2)  # wait for lazy-loading

        _collect()

        if _count() >= limit:
            break

        new_height = page.evaluate("document.body.scrollHeight")
        if new_height == old_height:
            # Page height didn't change — might be at bottom. Wait a bit more.
            time.sleep(2)
            final_height = page.evaluate("document.body.scrollHeight")
            if final_height == old_height:
                # Truly at bottom
                _collect()
                print("  [scroll] Reached bottom of page")
                break
            else:
                # New content loaded during extra wait
                _collect()

    total = _count()
    lp_count = len(ordered_landing_pages)
    lp_note = f", {lp_count} landing pages" if lp_count else ""
    print(f"  [scroll] Discovery complete — {len(ordered_images)} images, {len(ordered_videos)} videos ({total} total{lp_note})")
    return {"images": ordered_images, "videos": ordered_videos, "landing_pages": ordered_landing_pages}


# ---------------------------------------------------------------------------
# Download helpers
# ---------------------------------------------------------------------------

def download_image(url: str, dest: pathlib.Path) -> bool:
    """Download image via urllib with retries (CDN URLs are public)."""
    def _do():
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
            if len(data) < 500:
                raise ValueError(f"Tiny response ({len(data)} bytes), likely error page")
            dest.write_bytes(data)
    try:
        _retry(_do, max_retries=3, base_delay=2.0, label="img")
        return True
    except Exception as e:
        print(f"    [error] Image download failed after retries: {e}")
        return False


def download_video(url: str, dest: pathlib.Path, cookies_file: str | None = None) -> bool:
    """Download video: direct HTTP first (with retries), yt-dlp fallback."""
    def _direct():
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
            if len(data) > 5000:
                dest.write_bytes(data)
                return True
            raise ValueError(f"Small response ({len(data)} bytes)")

    # Try direct download with retries
    try:
        _retry(_direct, max_retries=2, base_delay=3.0, label="vid-direct")
        return True
    except Exception as e:
        print(f"    [direct] Failed after retries ({e}), trying yt-dlp fallback...")

    # yt-dlp fallback (has its own --retries)
    return _ytdlp_download_video(url, dest, cookies_file)


def _ytdlp_export_cookies() -> str | None:
    """Export Chrome cookies to a temp file for yt-dlp."""
    ytdlp_bin = shutil.which("yt-dlp")
    if not ytdlp_bin:
        return None

    cookies_path = pathlib.Path(tempfile.gettempdir()) / "ytdlp_fb_cookies.txt"

    cmd = [
        ytdlp_bin,
        "--cookies-from-browser", "chrome",
        "--cookies", str(cookies_path),
        "--no-download",
        "--quiet", "--no-warnings",
        "https://example.com",
    ]
    try:
        subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if cookies_path.exists() and cookies_path.stat().st_size > 100:
            return str(cookies_path)
    except Exception:
        pass
    return None


def _ytdlp_download_video(url: str, dest: pathlib.Path, cookies_file: str | None = None) -> bool:
    """Try downloading a video using yt-dlp. Returns True on success."""
    ytdlp_bin = shutil.which("yt-dlp")
    if not ytdlp_bin:
        print("    [yt-dlp] Not installed, skipping fallback")
        return False

    dest.parent.mkdir(parents=True, exist_ok=True)
    outtmpl = str(dest.with_suffix(".%(ext)s"))

    cmd = [
        ytdlp_bin,
        "--output", outtmpl,
        "--no-playlist",
        "--no-check-certificates",
        "--socket-timeout", "30",
        "--retries", "2",
        "--quiet", "--no-warnings",
    ]
    if cookies_file:
        cmd.extend(["--cookies", cookies_file])
    cmd.append(url)

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        if result.returncode == 0:
            for ext in (".mp4", ".webm", ".mkv", ".mov", ".avi"):
                candidate = dest.with_suffix(ext)
                if candidate.exists() and candidate.stat().st_size > 1000:
                    if candidate.suffix != ".mp4":
                        final = candidate.with_suffix(".mp4")
                        candidate.rename(final)
                        return True
                    return True
            # Check glob for any file matching the stem
            for f in dest.parent.glob(f"{dest.stem}.*"):
                if f.is_file() and f.stat().st_size > 1000:
                    return True
        else:
            stderr = result.stderr.strip()
            if "registered users" in stderr or "cookies" in stderr.lower():
                print("    [yt-dlp] Auth required — log into facebook.com in Chrome, then retry")
            elif stderr:
                print(f"    [yt-dlp] Failed: {stderr[:120]}")
    except subprocess.TimeoutExpired:
        print("    [yt-dlp] Timed out after 180s")
    except Exception as e:
        print(f"    [yt-dlp] Error: {e}")

    return False


# ---------------------------------------------------------------------------
# Google Drive upload (uses Google Workspace OAuth)
# ---------------------------------------------------------------------------

def _load_google_creds():
    """Load Google OAuth credentials from profile's google-workspace-oauth.json."""
    import google.auth.transport.requests
    import google.oauth2.credentials

    # IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks
    profile_root = pathlib.Path(__file__).parent.parent.parent.parent
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


def upload_to_drive(session_dir: pathlib.Path, brand_name: str, session_ts: str) -> str | None:
    """Upload session folder to Google Drive and return shareable folder URL.

    Steps:
    1. Create folder via Drive API
    2. Upload each file to that folder
    3. Share folder publicly
    4. Return folder URL
    """
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload

    creds = _load_google_creds()
    if not creds:
        return None

    drive_svc = build("drive", "v3", credentials=creds)
    folder_name = f"{brand_name} — Ad Library {session_ts}"
    print(f"[drive] Creating folder: {folder_name}")

    # 1. Create folder
    try:
        folder_meta = {
            "name": folder_name,
            "mimeType": "application/vnd.google-apps.folder",
        }
        folder = drive_svc.files().create(body=folder_meta, fields="id").execute()
        folder_id = folder.get("id", "")
        if not folder_id:
            print("[drive] Could not create folder")
            return None
        print(f"[drive] Created folder: {folder_id}")
    except Exception as e:
        print(f"[drive] Failed to create folder: {e}")
        return None

    # 2. Upload each file (with retries)
    media_files = sorted(f for f in session_dir.iterdir() if f.is_file() and not f.name.startswith("."))
    uploaded = 0
    for f in media_files:
        def _upload_file(filepath=f):
            file_meta = {"name": filepath.name, "parents": [folder_id]}
            media = MediaFileUpload(str(filepath), resumable=True)
            drive_svc.files().create(body=file_meta, media_body=media, fields="id").execute()

        try:
            _retry(_upload_file, max_retries=3, base_delay=3.0, label="drive")
            uploaded += 1
            print(f"  [drive] Uploaded {f.name} ({uploaded}/{len(media_files)})")
        except Exception as e:
            print(f"  [drive] Failed to upload {f.name} after retries: {e}")

    # 3. Share publicly
    try:
        drive_svc.permissions().create(
            fileId=folder_id,
            body={"type": "anyone", "role": "reader"},
        ).execute()
        print("[drive] Shared folder publicly")
    except Exception as e:
        print(f"[drive] Share error (folder still accessible to owner): {e}")

    folder_url = f"https://drive.google.com/drive/folders/{folder_id}"
    print(f"[drive] Folder URL: {folder_url}")
    print(f"[drive] Uploaded {uploaded}/{len(media_files)} files")
    return folder_url


# ---------------------------------------------------------------------------
# Slack posting
# ---------------------------------------------------------------------------

def _workspace_root():
    """Derive workspace root from script location (4 dirs up).

    IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks.
    """
    return pathlib.Path(__file__).parent.parent.parent.parent


def _get_allowed_channels():
    """Read allowed channel IDs from openclaw.json (outbound allowlist)."""
    config_path = _workspace_root() / "openclaw.json"
    if config_path.exists():
        try:
            cfg = json.loads(config_path.read_text())
            return set(cfg.get("channels", {}).get("slack", {}).get("channels", {}).keys())
        except (json.JSONDecodeError, OSError):
            pass
    return set()


def _holden_user_id():
    """Return Holden's Slack user ID for this workspace."""
    name = _workspace_root().name
    return {"openclaw-rawdog": "U07J2D9L0FL",
            "openclaw-vitahustle": "U0AF28VCYBH"}.get(name, "U0ACL7UV3RV")


def _dm_holden(text):
    """Send a DM to Holden about an allowlist block."""
    token = _read_slack_token()
    if not token:
        return
    try:
        user_id = _holden_user_id()
        open_data = json.dumps({"users": user_id}).encode("utf-8")
        open_req = urllib.request.Request(
            "https://slack.com/api/conversations.open",
            data=open_data,
            headers={"Content-Type": "application/json; charset=utf-8",
                     "Authorization": f"Bearer {token}"},
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
            headers={"Content-Type": "application/json; charset=utf-8",
                     "Authorization": f"Bearer {token}"},
        )
        urllib.request.urlopen(msg_req, timeout=10)
    except (OSError, json.JSONDecodeError, urllib.error.URLError):
        pass


def _read_slack_token() -> str | None:
    """Read SLACK_BOT_TOKEN from the workspace's openclaw.json."""
    config_path = _workspace_root() / "openclaw.json"
    if not config_path.exists():
        print(f"[slack] Config not found at {config_path} — cannot resolve bot token", flush=True)
        return None
    try:
        with open(config_path) as f:
            data = json.load(f)
        return data.get("channels", {}).get("slack", {}).get("botToken", "") or None
    except Exception:
        return None


def post_to_slack(brand: str, drive_url: str | None, img_count: int, vid_count: int) -> bool:
    """Post download summary to Slack thread.

    Reads SLACK_CHANNEL_ID + SLACK_THREAD_TS from env (set by OpenClaw).
    Reads SLACK_BOT_TOKEN from the workspace's openclaw.json.
    """
    channel = os.environ.get("SLACK_CHANNEL_ID")
    thread_ts = os.environ.get("SLACK_THREAD_TS")
    token = os.environ.get("SLACK_BOT_TOKEN") or _read_slack_token()

    if not channel:
        print("[slack] SLACK_CHANNEL_ID not set — skipping Slack post (running locally)")
        return False
    if not token:
        print("[slack] No Slack token found — skipping Slack post")
        return False

    # Outbound allowlist check — DMs (D-prefix) always allowed, user is talking directly to the bot
    if not channel.startswith("D"):
        allowed = _get_allowed_channels()
        if allowed and channel not in allowed:
            print(f"[slack] BLOCKED: channel {channel} not in workspace allowlist")
            _dm_holden(
                f":warning: *Channel Allowlist Block*\n\n"
                f"Workspace `{_workspace_root().name}` tried to post to channel `{channel}` "
                f"but it's not in this workspace's Slack channel list.\n\n"
                f"Should I add this channel to the openclaw allowlist in "
                f"`openclaw.json`? Or is this a misconfiguration?"
            )
            return False

    # Build message
    parts = []
    if img_count:
        parts.append(f"{img_count} image{'s' if img_count != 1 else ''}")
    if vid_count:
        parts.append(f"{vid_count} video{'s' if vid_count != 1 else ''}")
    media_summary = ", ".join(parts) if parts else "no media"

    lines = [f"\U0001f4e5 *Ad Library Download: {brand}*", media_summary]
    if drive_url:
        lines.append(f"\U0001f517 <{drive_url}|Google Drive folder>")

    text = "\n".join(lines)

    payload = {"channel": channel, "text": text}
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
        print("[slack] Posted to Slack thread")
        return True
    except Exception as e:
        print(f"[slack] Failed to post after retries: {e}")
        return False


# ---------------------------------------------------------------------------
# Auto-purge old downloads
# ---------------------------------------------------------------------------

def purge_old_downloads(base_dir: pathlib.Path, max_age_days: int = 30):
    """Delete session directories older than max_age_days.

    Walks ~/Downloads/ad-library/*/ looking for timestamped session dirs.
    """
    if not base_dir.exists():
        return

    now = datetime.datetime.now()
    purged = 0
    bytes_freed = 0
    ts_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}-\d{6}$")

    for brand_dir in base_dir.iterdir():
        if not brand_dir.is_dir():
            continue
        for session_dir in brand_dir.iterdir():
            if not session_dir.is_dir():
                continue
            # Only purge timestamped session directories
            if not ts_pattern.match(session_dir.name):
                continue
            try:
                # Parse timestamp from directory name
                ts = datetime.datetime.strptime(session_dir.name, "%Y-%m-%d-%H%M%S")
                age = now - ts
                if age.days > max_age_days:
                    # Calculate size before deletion
                    dir_size = sum(
                        f.stat().st_size for f in session_dir.rglob("*") if f.is_file()
                    )
                    shutil.rmtree(session_dir)
                    purged += 1
                    bytes_freed += dir_size
            except (ValueError, OSError):
                continue

    if purged > 0:
        mb_freed = bytes_freed / (1024 * 1024)
        print(f"[purge] Purged {purged} session{'s' if purged != 1 else ''} ({mb_freed:.1f}MB freed)")
    else:
        print("[purge] No old sessions to purge")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Download images/videos from Facebook Ad Library"
    )
    parser.add_argument("url", help="Facebook Ad Library URL")
    parser.add_argument(
        "--type", choices=["images", "videos", "both"], default="both",
        help="Media type to download (default: both)"
    )
    parser.add_argument(
        "--limit", type=int, default=50,
        help="Max number of media files to download (default: 50)"
    )
    parser.add_argument(
        "--output", type=str, default=None,
        help="Output directory (default: ~/Downloads/ad-library/<brand>/<timestamp>/)"
    )
    parser.add_argument(
        "--headed", action="store_true",
        help="Run browser in headed (visible) mode"
    )
    parser.add_argument(
        "--offscreen", action="store_true",
        help="Run headless with anti-detection flags (truly invisible, for automated use)"
    )
    parser.add_argument(
        "--drive", action="store_true",
        help="Upload to Google Drive (create public folder, return shareable link)"
    )
    parser.add_argument(
        "--slack", action="store_true",
        help="Post results to Slack (reads SLACK_CHANNEL_ID + SLACK_THREAD_TS from env)"
    )
    parser.add_argument(
        "--purge-days", type=int, default=30,
        help="Auto-purge local downloads older than N days (default: 30, 0 to disable)"
    )
    args = parser.parse_args()

    # Validate URL
    if "facebook.com/ads/library" not in args.url and "fb.com/ads/library" not in args.url:
        print("[error] URL must be a Facebook Ad Library URL")
        print("  Example: https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=Nike")
        sys.exit(1)

    url_info = parse_ad_library_url(args.url)
    print(f"[info] Query: {url_info['q'] or '(none)'} | Country: {url_info['country'] or '(none)'}")
    use_headed = args.headed or args.offscreen
    print(f"[info] Type: {args.type} | Limit: {args.limit} | Headed: {args.headed} | Offscreen: {args.offscreen}")

    # Auto-purge old downloads
    ad_library_base = pathlib.Path.home() / "Downloads" / "ad-library"
    if args.purge_days > 0:
        purge_old_downloads(ad_library_base, args.purge_days)

    # Ensure Playwright browsers are installed
    ensure_playwright_browsers()

    from playwright.sync_api import sync_playwright

    # Session timestamp for folder isolation
    session_ts = datetime.datetime.now().strftime("%Y-%m-%d-%H%M%S")

    with sync_playwright() as p:
        print("[browser] Launching Chromium...")
        if args.headed:
            # Fully visible — debug mode only
            browser = p.chromium.launch(headless=False)
        elif args.offscreen:
            # Truly headless + stealth: invisible AND avoids bot-detection flags.
            # macOS constrains windows to visible displays so negative position tricks
            # don't work — use headless=True with anti-detection args instead.
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                ],
            )
        else:
            browser = p.chromium.launch(headless=True)

        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        page = context.new_page()
        # Remove the webdriver flag that headless mode exposes
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        print(f"[browser] Navigating to Ad Library...")
        page.goto(args.url, wait_until="networkidle", timeout=60000)
        time.sleep(3)  # extra settle time

        # Dismiss cookie dialogs
        dismiss_cookie_dialogs(page)

        # Detect brand name
        brand = detect_brand_name(page) or url_info["q"] or "UnknownBrand"
        brand_dir = sanitize_brand(brand)
        print(f"[info] Brand detected: {brand}")

        # Set up output directory (session-based)
        if args.output:
            out_dir = pathlib.Path(args.output)
        else:
            out_dir = ad_library_base / brand_dir / session_ts
        out_dir.mkdir(parents=True, exist_ok=True)
        print(f"[info] Output directory: {out_dir}")

        # Scroll and discover media
        print("[scroll] Starting scroll + discovery...")
        media = scroll_and_discover(page, args.type, args.limit)

        browser.close()

    # Prepare download lists (respect limit) — already ordered by impression rank
    images = media["images"]
    videos = media["videos"]

    total_found = len(images) + len(videos)
    if total_found == 0:
        print("[done] No media found. The page may require login or the search returned no results.")
        sys.exit(0)

    # Trim to limit
    remaining = args.limit
    if args.type in ("images", "both"):
        images = images[:remaining]
        remaining -= len(images)
    if args.type in ("videos", "both") and remaining > 0:
        videos = videos[:remaining]

    # Export cookies for video downloads
    cookies_file = None
    if videos:
        print("[cookies] Exporting Chrome cookies for video downloads...")
        cookies_file = _ytdlp_export_cookies()
        if cookies_file:
            print(f"[cookies] Exported to {cookies_file}")
        else:
            print("[cookies] Could not export cookies (yt-dlp fallback may fail for auth-required videos)")

    # Download images — rank-based naming (rank = impression order)
    img_ok = 0
    for i, url in enumerate(images, 1):
        h = _url_hash(url)
        ext = _guess_extension(url, "image")
        dest = out_dir / f"rank-{i:03d}-img-{h}{ext}"
        print(f"  [{i}/{len(images)}] Downloading image → {dest.name}")
        if download_image(url, dest):
            img_ok += 1

    # Download videos — rank-based naming (continues ranking after images)
    vid_ok = 0
    for i, url in enumerate(videos, 1):
        h = _url_hash(url)
        ext = _guess_extension(url, "video")
        dest = out_dir / f"rank-{i:03d}-vid-{h}{ext}"
        print(f"  [{i}/{len(videos)}] Downloading video → {dest.name}")
        if download_video(url, dest, cookies_file):
            vid_ok += 1

    # Summary
    print()
    print(f"[done] Downloaded {img_ok}/{len(images)} images, {vid_ok}/{len(videos)} videos")
    print(f"[done] Saved to: {out_dir}")

    # Google Drive upload
    drive_url = None
    if args.drive:
        drive_url = upload_to_drive(out_dir, brand, session_ts)

    # Slack posting
    if args.slack:
        post_to_slack(brand, drive_url, img_ok, vid_ok)


if __name__ == "__main__":
    main()
