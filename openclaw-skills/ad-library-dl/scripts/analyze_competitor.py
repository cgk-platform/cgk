# /// script
# requires-python = ">=3.10"
# dependencies = ["playwright>=1.40.0", "google-genai>=1.0.0", "google-cloud-storage>=2.0.0", "google-api-python-client>=2.100.0", "google-auth>=2.20.0"]
# ///
"""Competitive Ad Analysis Pipeline.

Downloads top ads from Facebook Ad Library, runs Gemini vision analysis
on each asset, aggregates into a master competitive intelligence brief
via Gemini Pro, outputs to Google Docs, and posts to Slack.
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
import time
import urllib.request


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
                delay = base_delay * (2 ** (attempt - 1))
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
# Import download functions from ad_library_dl (same package)
# ---------------------------------------------------------------------------

# Add script dir to path so we can import sibling module
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
    download_image,
    download_video,
    _url_hash,
    _guess_extension,
    _ytdlp_export_cookies,
    upload_to_drive,
    post_to_slack as _post_to_slack,
    _read_slack_token,
    _get_allowed_channels,
    _dm_holden,
    _workspace_root,
)


# ---------------------------------------------------------------------------
# Persistent storage helpers
# ---------------------------------------------------------------------------

def detect_workspace_root() -> pathlib.Path:
    """Resolve workspace root from script location.

    Layout: ~/.openclaw[-profile]/skills/ad-library-dl/scripts/analyze_competitor.py
    Returns: ~/.openclaw[-profile]/workspace/
    """
    # scripts/ → ad-library-dl/ → skills/ → .openclaw[-profile]/
    openclaw_root = _script_dir.parent.parent.parent
    return openclaw_root / "workspace"


def _migrate_catalog_v1_to_v2(catalog: dict) -> dict:
    """Migrate catalog from v1 to v2 schema.

    v2 adds: rank_history, drive_file_id, first_seen, clones per asset;
    drive folder IDs per brand.
    """
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"

    # Migrate assets
    for h, asset in catalog.get("assets", {}).items():
        old_rank = asset.get("rank")
        if "current_rank" not in asset:
            asset["current_rank"] = old_rank
        if "rank_history" not in asset:
            asset["rank_history"] = []
            if old_rank is not None:
                asset["rank_history"].append({
                    "rank": old_rank,
                    "session": asset.get("session", "unknown"),
                    "timestamp": asset.get("analyzed_at", now_iso),
                })
        if "drive_file_id" not in asset:
            asset["drive_file_id"] = None
        if "first_seen" not in asset:
            asset["first_seen"] = asset.get("analyzed_at", now_iso)
        if "clones" not in asset:
            asset["clones"] = []
        # Keep v1 'rank' for backwards compat but current_rank is authoritative
        asset.setdefault("rank", old_rank)

    # Migrate brands — add drive folder IDs
    for brand_key, brand in catalog.get("brands", {}).items():
        brand.setdefault("drive_root_folder_id", None)
        brand.setdefault("drive_statics_folder_id", None)
        brand.setdefault("drive_videos_folder_id", None)
        brand.setdefault("drive_clones_folder_id", None)

    catalog["version"] = 2
    print(f"[catalog] Migrated to v2 ({len(catalog.get('assets', {}))} assets, {len(catalog.get('brands', {}))} brands)")
    return catalog


def load_catalog(competitors_dir: pathlib.Path) -> dict:
    """Load catalog.json or initialize empty v2 catalog. Auto-migrates v1."""
    catalog_path = competitors_dir / "catalog.json"
    if catalog_path.exists():
        try:
            with open(catalog_path) as f:
                catalog = json.load(f)
            # Auto-migrate v1 → v2
            if catalog.get("version", 1) < 2:
                catalog = _migrate_catalog_v1_to_v2(catalog)
                save_catalog(catalog, competitors_dir)
            return catalog
        except (json.JSONDecodeError, OSError) as e:
            print(f"[catalog] Warning: corrupt catalog.json, starting fresh: {e}")
    return {
        "version": 2,
        "updated_at": None,
        "brands": {},
        "assets": {},
    }


def save_catalog(catalog: dict, competitors_dir: pathlib.Path) -> None:
    """Atomic write: write to .tmp then rename."""
    catalog["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    catalog_path = competitors_dir / "catalog.json"
    tmp_path = competitors_dir / "catalog.json.tmp"
    with open(tmp_path, "w") as f:
        json.dump(catalog, f, indent=2)
    tmp_path.rename(catalog_path)
    print(f"[catalog] Saved {catalog_path}")


def check_dedup(catalog: dict, url: str) -> dict | None:
    """Return existing asset entry for this URL hash, or None."""
    h = _url_hash(url)
    return catalog["assets"].get(h)


def _content_hash(file_path: pathlib.Path) -> str:
    """SHA256 hash of file contents, truncated to 16 chars."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def check_content_dedup(catalog: dict, content_hash: str) -> dict | None:
    """Find existing asset by content hash. Returns asset entry or None."""
    for asset in catalog["assets"].values():
        if asset.get("content_hash") == content_hash:
            return asset
    return None


def load_cached_analysis(competitors_dir: pathlib.Path, asset_entry: dict) -> dict | None:
    """Load a previously-saved analysis JSON from persistent storage."""
    brand = asset_entry.get("brand", "")
    session = asset_entry.get("session", "")
    analysis_file = asset_entry.get("analysis_file", "")
    if not (brand and session and analysis_file):
        return None
    cached_path = competitors_dir / brand / session / analysis_file
    if cached_path.exists():
        try:
            with open(cached_path) as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    return None


def persist_session(
    out_dir: pathlib.Path,
    competitors_dir: pathlib.Path,
    brand_dir_name: str,
    session_ts: str,
) -> pathlib.Path:
    """Copy session files to persistent storage and update latest symlink.

    Returns the persistent session directory.
    """
    brand_persist_dir = competitors_dir / brand_dir_name
    session_persist_dir = brand_persist_dir / session_ts
    session_persist_dir.mkdir(parents=True, exist_ok=True)

    copied = 0
    for f in sorted(out_dir.iterdir()):
        if f.is_file():
            shutil.copy2(f, session_persist_dir / f.name)
            copied += 1

    # Update latest symlink
    latest_link = brand_persist_dir / "latest"
    if latest_link.is_symlink() or latest_link.exists():
        latest_link.unlink()
    latest_link.symlink_to(session_ts)

    print(f"[persist] Copied {copied} files to {session_persist_dir}")
    print(f"[persist] Updated latest → {session_ts}")
    return session_persist_dir


def _extract_section(markdown: str, heading: str, max_words: int = 500) -> str:
    """Extract a section from markdown by heading keyword, truncated to max_words."""
    pattern = rf"(^|\n)##?\s+[^\n]*{re.escape(heading)}[^\n]*\n"
    match = re.search(pattern, markdown, re.IGNORECASE)
    if not match:
        return ""
    start = match.end()
    # Find next heading of same or higher level
    next_heading = re.search(r"\n##?\s+", markdown[start:])
    end = start + next_heading.start() if next_heading else len(markdown)
    section = markdown[start:end].strip()
    words = section.split()
    if len(words) > max_words:
        section = " ".join(words[:max_words]) + "..."
    return section


def write_mcp_summary(
    master_report: str,
    brand: str,
    brand_dir_name: str,
    competitors_dir: pathlib.Path,
    num_assets: int,
    session_ts: str,
) -> pathlib.Path:
    """Generate mcp-summary.md and emit [mcp-ready] stdout line."""
    date_str = session_ts[:10]

    exec_summary = _extract_section(master_report, "executive summary", 300)
    opportunities = _extract_section(master_report, "opportunit", 200)
    body = exec_summary or master_report[:500]

    brand_slug = brand_dir_name.lower().replace("_", "-")
    title = f"{brand} \u2014 Competitive Ad Analysis ({date_str})"
    tags_str = f"[competitor-analysis, {brand_slug}, facebook-ads, ad-library]"

    lines = [
        "---",
        "mcp_action: add_brand_knowledge",
        "categorySlug: competitors",
        f'title: "{title}"',
        f'summary: "Analysis of {num_assets} top-performing {brand} ads from Facebook Ad Library"',
        f"tags: {tags_str}",
        "priority: 75",
        "---",
        f"# {brand} \u2014 Competitive Analysis",
        "",
        body,
        "",
    ]
    if opportunities:
        lines += ["## Key Opportunities", "", opportunities, ""]
    lines.append(
        f"*Full report: competitors/{brand_dir_name}/latest/competitive-analysis.md*"
    )

    mcp_summary_path = competitors_dir / brand_dir_name / "mcp-summary.md"
    mcp_summary_path.parent.mkdir(parents=True, exist_ok=True)
    with open(mcp_summary_path, "w") as f:
        f.write("\n".join(lines) + "\n")

    mcp_meta = {
        "action": "add_brand_knowledge",
        "categorySlug": "competitors",
        "title": title,
        "content_file": str(mcp_summary_path),
    }
    print(f"[mcp-ready] {json.dumps(mcp_meta)}")

    return mcp_summary_path


# ---------------------------------------------------------------------------
# MCP platform push — competitor intel as brand documents
# ---------------------------------------------------------------------------

def _mcp_call(server_url, api_key, method, params):
    """Make a JSON-RPC call to the MCP server."""
    import random
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": api_key,
    }
    payload = json.dumps({
        "jsonrpc": "2.0",
        "id": random.randint(1, 999999),
        "method": method,
        "params": params,
    }).encode("utf-8")
    req = urllib.request.Request(server_url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            if result.get("error"):
                print(f"    [mcp] Error: {result['error'].get('message', 'unknown')}")
                return None
            return result.get("result")
    except Exception as e:
        print(f"    [mcp] Call failed: {e}")
        return None


def _find_existing_competitor_doc(brand_name, server_url, api_key):
    """Search MCP for existing competitor doc by brand name prefix. Returns doc id or None."""
    result = _mcp_call(server_url, api_key, "tools/call", {
        "name": "search_brand_documents",
        "arguments": {"query": f"Competitor Analysis: {brand_name}", "category": "product_info", "limit": 5},
    })
    if not result:
        return None
    for r in result.get("content", []):
        try:
            data = json.loads(r.get("text", "{}"))
            for doc in data.get("documents", []):
                if doc.get("title", "").startswith(f"Competitor Analysis: {brand_name}"):
                    return doc.get("id")
        except Exception:
            pass
    return None


def _push_competitor_to_mcp(brand_name, report_content, tags=None):
    """Push competitor analysis to CGK MCP as brand document with dedup."""
    mcp_url = os.environ.get("CGK_MCP_SERVER_URL")
    mcp_key = os.environ.get("CGK_MCP_API_KEY")
    if not mcp_url or not mcp_key:
        print("  [mcp] Skipping — CGK_MCP_SERVER_URL or CGK_MCP_API_KEY not set")
        return

    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    title = f"Competitor Analysis: {brand_name} — {date_str}"
    slug = f"competitor-{brand_name.lower().replace(' ', '-')}-{date_str}"
    tags = tags or []

    existing_id = _find_existing_competitor_doc(brand_name, mcp_url, mcp_key)

    if existing_id:
        _mcp_call(mcp_url, mcp_key, "tools/call", {
            "name": "update_brand_document",
            "arguments": {"id": existing_id, "title": title, "content": report_content},
        })
        print(f"  [mcp] Updated existing competitor doc for {brand_name}")
    else:
        _mcp_call(mcp_url, mcp_key, "tools/call", {
            "name": "create_brand_document",
            "arguments": {
                "slug": slug, "title": title, "content": report_content,
                "category": "product_info",
                "tags": ["competitor-analysis", "auto-generated", brand_name.lower().replace(" ", "-")] + tags,
            },
        })
        print(f"  [mcp] Created competitor doc for {brand_name}")


# ---------------------------------------------------------------------------
# Gemini vision analysis — per asset
# ---------------------------------------------------------------------------

INDIVIDUAL_ANALYSIS_PROMPT = """Analyze this ad creative in detail for competitive intelligence:

1. SCRIPT / VOICEOVER: Extract the full spoken text or text overlays
2. SCENE BREAKDOWN: Second-by-second description of visuals (0:00-0:01: ..., 0:01-0:02: ...)
3. HOOK (first 3 seconds): What technique grabs attention? (curiosity, shock, question, UGC, etc.)
4. CTA: What's the call-to-action and how is it presented?
5. VISUAL STYLE: Lighting, color grade, camera work, composition, UGC vs produced
6. AUDIO: Music style, sound effects, voiceover tone
7. TEXT OVERLAYS: All on-screen text, fonts, placement, timing
8. PRODUCT PRESENTATION: How is the product shown? Demo, lifestyle, before/after, etc.

Return as structured JSON."""

IMAGE_ANALYSIS_PROMPT = """Analyze this ad image in detail for competitive intelligence:

1. VISUAL COMPOSITION: Layout, focal point, rule of thirds, negative space
2. TEXT OVERLAYS: All on-screen text, fonts, placement, hierarchy
3. PRODUCT PRESENTATION: How is the product shown? Demo, lifestyle, before/after, flat lay, etc.
4. COLOR PALETTE: Dominant colors, accent colors, overall mood
5. STYLE: UGC vs produced vs lifestyle vs editorial — what makes you think so?
6. HOOK TECHNIQUE: What grabs attention? (bold text, shocking visual, curiosity gap, social proof, etc.)
7. CTA: What's the call-to-action and where is it placed?
8. BRAND ELEMENTS: Logo placement, brand colors, consistency signals

Return as structured JSON."""


def _parse_json_response(text: str) -> dict:
    """Extract JSON from Gemini response (handles markdown code blocks)."""
    if "```json" in text:
        start = text.find("```json") + 7
        end = text.find("```", start)
        if end > start:
            text = text[start:end].strip()
    elif "```" in text:
        start = text.find("```") + 3
        end = text.find("```", start)
        if end > start:
            text = text[start:end].strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw_analysis": text}


def _upload_video_to_gcs(video_path: pathlib.Path, project: str) -> str | None:
    """Upload video to GCS temp bucket and return gs:// URI, or None on failure.

    Bucket is read from GOOGLE_CLOUD_BUCKET env var. Falls back to
    '<project>-vertex-tmp' if unset. The blob is stored under
    tmp/ad-library-analysis/<filename> and is NOT auto-deleted — callers
    should clean up via _delete_gcs_blob() after analysis.
    """
    bucket_name = os.environ.get("GOOGLE_CLOUD_BUCKET", f"{project}-vertex-tmp")
    blob_name = f"tmp/ad-library-analysis/{video_path.name}"
    try:
        from google.cloud import storage as gcs
        gcs_client = gcs.Client(project=project)
        bucket = gcs_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        blob.upload_from_filename(str(video_path), content_type="video/mp4")
        uri = f"gs://{bucket_name}/{blob_name}"
        print(f"  [gcs] Uploaded to {uri}")
        return uri
    except Exception as e:
        print(f"  [gcs] Upload failed: {e}", file=sys.stderr)
        return None


def _delete_gcs_blob(uri: str, project: str) -> None:
    """Delete a GCS blob by gs:// URI. Silently ignores errors."""
    try:
        from google.cloud import storage as gcs
        # gs://bucket/path/file → bucket="bucket", blob="path/file"
        without_scheme = uri[len("gs://"):]
        bucket_name, _, blob_name = without_scheme.partition("/")
        gcs_client = gcs.Client(project=project)
        gcs_client.bucket(bucket_name).blob(blob_name).delete()
        print(f"  [gcs] Cleaned up {uri}")
    except Exception:
        pass


def analyze_video_with_gemini(client, video_path: pathlib.Path, model: str = "gemini-3-flash-preview",
                               project: str = "gen-lang-client-0013158607", on_retry=None) -> dict:
    """Analyze video with Vertex AI.

    Strategy:
    - < 15MB: inline_data (no upload, fastest path)
    - >= 15MB: upload to GCS temp bucket → file_data gs:// URI, then delete
    - GCS bucket: GOOGLE_CLOUD_BUCKET env var, default '<project>-vertex-tmp'
    """
    from google.genai import types as google_types
    raw_bytes = video_path.read_bytes()
    size_mb = len(raw_bytes) / (1024 * 1024)

    if size_mb <= 15:
        print(f"  [gemini] Analyzing video inline with {model} ({size_mb:.1f}MB)...")
        parts = [
            google_types.Part(inline_data=google_types.Blob(mime_type="video/mp4", data=raw_bytes)),
            google_types.Part(text=INDIVIDUAL_ANALYSIS_PROMPT),
        ]
    else:
        print(f"  [gemini] Video {video_path.name} is {size_mb:.1f}MB — using GCS fallback...")
        gcs_uri = _upload_video_to_gcs(video_path, project)
        if not gcs_uri:
            return {"error": f"Video too large for inline ({size_mb:.1f}MB) and GCS upload failed"}
        parts = [
            google_types.Part(
                file_data=google_types.FileData(mime_type="video/mp4", file_uri=gcs_uri)
            ),
            google_types.Part(text=INDIVIDUAL_ANALYSIS_PROMPT),
        ]

    try:
        response = _retry(
            lambda: client.models.generate_content(
                model=model,
                contents=[google_types.Content(role="user", parts=parts)],
            ),
            max_retries=3, base_delay=5.0, label="gemini-analyze",
            on_retry=on_retry,
        )
        return _parse_json_response(response.text)
    finally:
        # Clean up GCS temp file if we used the fallback path
        if size_mb > 15 and gcs_uri:
            _delete_gcs_blob(gcs_uri, project)


def analyze_image_with_gemini(client, image_path: pathlib.Path, model: str = "gemini-3-flash-preview",
                               on_retry=None) -> dict:
    """Analyze image inline with Vertex AI (no upload step)."""
    from google.genai import types as google_types
    raw_bytes = image_path.read_bytes()
    mime = "image/jpeg" if image_path.suffix.lower() in (".jpg", ".jpeg") else "image/png"
    print(f"  [gemini] Analyzing image inline with {model}: {image_path.name}")
    parts = [
        google_types.Part(inline_data=google_types.Blob(mime_type=mime, data=raw_bytes)),
        google_types.Part(text=IMAGE_ANALYSIS_PROMPT),
    ]
    response = _retry(
        lambda: client.models.generate_content(
            model=model,
            contents=[google_types.Content(role="user", parts=parts)],
        ),
        max_retries=3, base_delay=3.0, label="gemini-analyze",
        on_retry=on_retry,
    )
    return _parse_json_response(response.text)


# ---------------------------------------------------------------------------
# Master analysis
# ---------------------------------------------------------------------------

def build_master_prompt(brand: str, all_analyses: list[dict]) -> str:
    """Build the master analysis prompt with all individual analyses."""
    analyses_json = json.dumps(all_analyses, indent=2)

    return f"""You're a senior competitive creative strategist writing a competitive intelligence brief.

Below are analyses of the top {len(all_analyses)} ads from {brand}, ordered by impression volume
(#1 = most impressions). Each includes a detailed creative breakdown.

{analyses_json}

Write a comprehensive competitive creative analysis as a Google Doc.
Structure it however makes sense for the data — this should read like a
real strategy document, not a template. Include:

- Executive summary (what is this brand's creative strategy?)
- Pattern analysis (what hooks/formats/styles do they lean on?)
- Top performers deep-dive (why are #1-3 winning?)
- Creative playbook (their formula, reverse-engineered)
- Opportunities (gaps we can exploit, angles they're missing)
- Recommended scripts/prompts for creating our versions

Write in markdown. Be specific and data-backed. Reference specific ads by rank number."""


def run_master_analysis(client, brand: str, all_analyses: list[dict], model: str,
                        on_retry=None) -> str:
    """Run master competitive analysis with Gemini Pro (with retries)."""
    prompt = build_master_prompt(brand, all_analyses)

    print(f"[analysis] Running master analysis with {model}...")
    response = _retry(
        lambda: client.models.generate_content(model=model, contents=[prompt]),
        max_retries=3, base_delay=10.0, label="gemini-master",
        on_retry=on_retry,
    )
    return response.text


# ---------------------------------------------------------------------------
# Google Doc creation (Google Workspace OAuth)
# ---------------------------------------------------------------------------

def _load_google_creds():
    """Load Google OAuth credentials from profile's google-workspace-oauth.json."""
    import google.auth.transport.requests
    import google.oauth2.credentials

    # IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks
    profile_root = pathlib.Path(__file__).parent.parent.parent.parent
    creds_path = profile_root / "credentials" / "google-workspace-oauth.json"

    if not creds_path.exists():
        print(f"[google-doc] OAuth credentials not found at: {creds_path}")
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


def _md_to_html(md_text):
    """Convert basic markdown to HTML for Google Docs import."""
    import html as html_mod

    lines = md_text.split("\n")
    html_parts = ["<html><body>"]
    in_list = False

    for line in lines:
        stripped = line.strip()
        if in_list and not stripped.startswith("- ") and not stripped.startswith("* "):
            html_parts.append("</ul>")
            in_list = False

        if stripped.startswith("#### "):
            html_parts.append(f"<h4>{html_mod.escape(stripped[5:])}</h4>")
        elif stripped.startswith("### "):
            html_parts.append(f"<h3>{html_mod.escape(stripped[4:])}</h3>")
        elif stripped.startswith("## "):
            html_parts.append(f"<h2>{html_mod.escape(stripped[3:])}</h2>")
        elif stripped.startswith("# "):
            html_parts.append(f"<h1>{html_mod.escape(stripped[2:])}</h1>")
        elif stripped == "---" or stripped == "***":
            html_parts.append("<hr>")
        elif stripped.startswith("- ") or stripped.startswith("* "):
            if not in_list:
                html_parts.append("<ul>")
                in_list = True
            content = stripped[2:]
            content = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', content)
            html_parts.append(f"<li>{content}</li>")
        elif stripped:
            content = html_mod.escape(stripped)
            content = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', content)
            html_parts.append(f"<p>{content}</p>")

    if in_list:
        html_parts.append("</ul>")
    html_parts.append("</body></html>")
    return "\n".join(html_parts)


def create_google_doc(markdown_content: str, title: str) -> dict | None:
    """Create a Google Doc from markdown content using Google Workspace OAuth.

    Returns {"doc_id": "...", "doc_url": "..."} or None on failure.
    """
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaInMemoryUpload

    try:
        creds = _load_google_creds()
        if not creds:
            return None

        drive_svc = build("drive", "v3", credentials=creds)

        html_content = _md_to_html(markdown_content)
        media = MediaInMemoryUpload(
            html_content.encode("utf-8"),
            mimetype="text/html",
            resumable=False,
        )
        file_metadata = {
            "name": title,
            "mimeType": "application/vnd.google-apps.document",
        }
        created = drive_svc.files().create(
            body=file_metadata,
            media_body=media,
            fields="id,webViewLink",
        ).execute()

        doc_id = created.get("id", "")
        doc_url = created.get("webViewLink", "")
        if not doc_url:
            doc_url = f"https://docs.google.com/document/d/{doc_id}/edit"

        print(f"[google-doc] Created: {doc_url}")

        # Share publicly
        try:
            drive_svc.permissions().create(
                fileId=doc_id,
                body={"type": "anyone", "role": "reader"},
            ).execute()
            print("[google-doc] Shared publicly")
        except Exception as e:
            print(f"[google-doc] Share error: {e}")

        return {"doc_id": doc_id, "doc_url": doc_url}

    except Exception as e:
        print(f"[google-doc] Failed: {e}")
        return None


# ---------------------------------------------------------------------------
# Slack posting (analysis-specific)
# ---------------------------------------------------------------------------

def post_analysis_to_slack(brand: str, doc_url: str | None, num_assets: int, drive_url: str | None = None) -> bool:
    """Post competitive analysis summary to Slack thread."""
    channel = os.environ.get("SLACK_CHANNEL_ID")
    thread_ts = os.environ.get("SLACK_THREAD_TS")
    token = os.environ.get("SLACK_BOT_TOKEN") or _read_slack_token()

    if not channel:
        print("[slack] SLACK_CHANNEL_ID not set — skipping Slack post")
        return False
    if not token:
        print("[slack] No Slack token found — skipping")
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

    lines = [
        f"\U0001f50d *Competitive Analysis: {brand}*",
        f"Analyzed {num_assets} top-performing ad{'s' if num_assets != 1 else ''}",
    ]
    if doc_url:
        lines.append(f"\U0001f4c4 <{doc_url}|Full Analysis (Google Doc)>")
    if drive_url:
        lines.append(f"\U0001f4c1 <{drive_url}|Media Files (Google Drive)>")

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
        print("[slack] Posted analysis to Slack")
        return True
    except Exception as e:
        print(f"[slack] Failed to post after retries: {e}")
        return False


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def main():
    if not os.environ.get("ANALYZE_SAFE"):
        print("ERROR: Direct calls blocked. Use analyze_safe.sh.", file=sys.stderr)
        sys.exit(1)

    parser = argparse.ArgumentParser(
        description="Competitive ad analysis pipeline — download, analyze with Gemini, create report"
    )
    parser.add_argument("url", help="Facebook Ad Library URL")
    parser.add_argument(
        "--limit", type=int, default=10,
        help="Max number of ads to analyze (default: 10)"
    )
    parser.add_argument(
        "--type", choices=["images", "videos", "both"], default="both",
        help="Media type to analyze (default: both)"
    )
    parser.add_argument(
        "--slack", action="store_true",
        help="Post results to Slack (reads SLACK_CHANNEL_ID + SLACK_THREAD_TS from env)"
    )
    parser.add_argument(
        "--drive", action="store_true",
        help="Upload media to Google Drive"
    )
    parser.add_argument(
        "--model", type=str, default="gemini-3-pro-preview",
        help="Gemini model for master analysis (default: gemini-3-pro-preview)"
    )
    parser.add_argument(
        "--flash-model", type=str, default="gemini-3-flash-preview",
        help="Gemini model for individual analyses (default: gemini-3-flash-preview)"
    )
    parser.add_argument(
        "--offscreen", action="store_true",
        help="Run headed browser off-screen (default: headless)"
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Re-download and re-analyze all assets, ignoring dedup cache"
    )
    parser.add_argument(
        "--no-persist", action="store_true",
        help="Skip persistent storage (no catalog update, no MCP summary)"
    )
    args = parser.parse_args()

    # Validate URL
    if "facebook.com/ads/library" not in args.url and "fb.com/ads/library" not in args.url:
        print("[error] URL must be a Facebook Ad Library URL")
        sys.exit(1)

    from google import genai

    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0013158607")
    client = genai.Client(vertexai=True, project=project, location="global")
    print(f"[genai] Using Vertex AI (project={project}, location=global)")
    url_info = parse_ad_library_url(args.url)
    session_ts = datetime.datetime.now().strftime("%Y-%m-%d-%H%M%S")

    # -----------------------------------------------------------------------
    # Persistent storage init
    # -----------------------------------------------------------------------
    persist = not args.no_persist
    catalog = None
    competitors_dir = None
    if persist:
        try:
            workspace_root = detect_workspace_root()
            competitors_dir = workspace_root / "brand" / "competitors"
            competitors_dir.mkdir(parents=True, exist_ok=True)
            catalog = load_catalog(competitors_dir)
            print(f"[persist] Workspace: {workspace_root}")
            print(f"[persist] Catalog: {len(catalog['assets'])} cached assets, {len(catalog['brands'])} brands")
        except Exception as e:
            print(f"[persist] Warning: could not init persistent storage: {e}")
            persist = False

    # -----------------------------------------------------------------------
    # Step 1: Download media
    # -----------------------------------------------------------------------
    print("=" * 60)
    print("STEP 1: Download media from Ad Library")
    print("=" * 60)

    ensure_playwright_browsers()
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        if args.offscreen:
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
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        print("[browser] Navigating to Ad Library...")
        page.goto(args.url, wait_until="networkidle", timeout=60000)
        time.sleep(3)

        dismiss_cookie_dialogs(page)

        brand = detect_brand_name(page) or url_info["q"] or "UnknownBrand"
        brand_dir = sanitize_brand(brand)
        print(f"[info] Brand: {brand}")

        out_dir = pathlib.Path.home() / "Downloads" / "ad-library" / brand_dir / session_ts
        out_dir.mkdir(parents=True, exist_ok=True)

        print("[scroll] Discovering media...")
        media = scroll_and_discover(page, args.type, args.limit)
        browser.close()

    images = media["images"][:args.limit]
    videos = media["videos"][:max(0, args.limit - len(images))]
    landing_pages = media.get("landing_pages", [])

    if not images and not videos:
        print("[done] No media found.")
        sys.exit(0)

    # Download with rank-based naming + dedup
    cookies_file = _ytdlp_export_cookies() if videos else None

    downloaded_files: list[dict] = []  # {"path": Path, "type": "image"|"video", "rank": int, "url": str}
    cached_analyses: list[dict] = []   # Pre-loaded from dedup cache

    img_ok = 0
    dedup_count = 0
    for i, url in enumerate(images, 1):
        h = _url_hash(url)
        ext = _guess_extension(url, "image")

        # Dedup check
        if persist and catalog and not args.force:
            existing = check_dedup(catalog, url)
            if existing:
                cached = load_cached_analysis(competitors_dir, existing)
                if cached:
                    cached["_rank"] = i  # Update rank to current position
                    cached_analyses.append(cached)
                    dedup_count += 1
                    print(f"  [{i}/{len(images)}] [dedup] Skipping image {h} (cached from {existing['session']})")
                    continue

        dest = out_dir / f"rank-{i:03d}-img-{h}{ext}"
        print(f"  [{i}/{len(images)}] Downloading image \u2192 {dest.name}")
        if download_image(url, dest):
            # Content-hash dedup check (catches cross-session dupes with different URLs)
            if persist and catalog and not args.force:
                chash = _content_hash(dest)
                content_match = check_content_dedup(catalog, chash)
                if content_match:
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
            else:
                chash = None
            img_ok += 1
            lp_url = landing_pages[i - 1] if i - 1 < len(landing_pages) else None
            downloaded_files.append({"path": dest, "type": "image", "rank": i, "url": url, "content_hash": chash, "landing_page_url": lp_url})

    vid_ok = 0
    for i, url in enumerate(videos, 1):
        h = _url_hash(url)
        ext = _guess_extension(url, "video")

        # Dedup check
        if persist and catalog and not args.force:
            existing = check_dedup(catalog, url)
            if existing:
                cached = load_cached_analysis(competitors_dir, existing)
                if cached:
                    cached["_rank"] = i
                    cached_analyses.append(cached)
                    dedup_count += 1
                    print(f"  [{i}/{len(videos)}] [dedup] Skipping video {h} (cached from {existing['session']})")
                    continue

        dest = out_dir / f"rank-{i:03d}-vid-{h}{ext}"
        print(f"  [{i}/{len(videos)}] Downloading video \u2192 {dest.name}")
        if download_video(url, dest, cookies_file):
            # Content-hash dedup check
            if persist and catalog and not args.force:
                chash = _content_hash(dest)
                content_match = check_content_dedup(catalog, chash)
                if content_match:
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
                        print(f"  [{i}/{len(videos)}] [content-dedup] Same content as {content_match['url_hash'][:8]}")
                        dest.unlink(missing_ok=True)
                        continue
            else:
                chash = None
            vid_ok += 1
            downloaded_files.append({"path": dest, "type": "video", "rank": i, "url": url, "content_hash": chash})

    print(f"\n[download] {img_ok} images, {vid_ok} videos downloaded to {out_dir}")
    if dedup_count:
        print(f"[dedup] {dedup_count} assets skipped (cached from previous runs)")

    # Early catalog checkpoint: save content hashes immediately so crash recovery works
    if persist and catalog and downloaded_files:
        now_ckpt = datetime.datetime.utcnow().isoformat() + "Z"
        for item in downloaded_files:
            h = _url_hash(item["url"])
            ftype = item["type"]
            analysis_filename = f"rank-{item['rank']:03d}-{'img' if ftype == 'image' else 'vid'}-{h}.analysis.json"
            rank_history_entry = {"rank": item["rank"], "session": session_ts, "timestamp": now_ckpt}
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
            else:
                catalog["assets"][h] = {
                    "url_hash": h,
                    "brand": brand_dir,
                    "type": ftype,
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
        print("[done] No files downloaded and no cached analyses.")
        sys.exit(0)

    # -----------------------------------------------------------------------
    # Step 2: Per-asset Gemini vision analysis
    # -----------------------------------------------------------------------
    print()
    print("=" * 60)
    print("STEP 2: Gemini vision analysis (per asset)")
    print("=" * 60)

    all_analyses: list[dict] = list(cached_analyses)  # Start with dedup-loaded analyses

    for item in sorted(downloaded_files, key=lambda x: x["rank"]):
        fpath = item["path"]
        ftype = item["type"]
        rank = item["rank"]

        print(f"\n[{rank}] Analyzing {ftype}: {fpath.name}")

        try:
            if ftype == "video":
                analysis = analyze_video_with_gemini(client, fpath, model=args.flash_model, project=project)
            else:
                analysis = analyze_image_with_gemini(client, fpath, model=args.flash_model)

            analysis["_rank"] = rank
            analysis["_type"] = ftype
            analysis["_filename"] = fpath.name
            all_analyses.append(analysis)

            # Save analysis JSON alongside media file
            json_path = fpath.with_suffix(".analysis.json")
            with open(json_path, "w") as f:
                json.dump(analysis, indent=2, fp=f)
            print(f"  [saved] {json_path.name}")

        except Exception as e:
            print(f"  [error] Gemini analysis failed: {e}")
            all_analyses.append({
                "_rank": rank,
                "_type": ftype,
                "_filename": fpath.name,
                "error": str(e),
            })

    new_analyzed = len(all_analyses) - len(cached_analyses)
    print(f"\n[analysis] {new_analyzed} new + {len(cached_analyses)} cached = {len(all_analyses)} total analyses")

    # -----------------------------------------------------------------------
    # Step 3: Master analysis
    # -----------------------------------------------------------------------
    print()
    print("=" * 60)
    print("STEP 3: Master competitive analysis")
    print("=" * 60)

    # Sort all analyses by rank for the master prompt
    all_analyses.sort(key=lambda x: x.get("_rank", 999))
    master_report = run_master_analysis(client, brand, all_analyses, model=args.model)

    # Save master report locally
    report_path = out_dir / "competitive-analysis.md"
    with open(report_path, "w") as f:
        f.write(master_report)
    print(f"[report] Saved to {report_path}")

    # -----------------------------------------------------------------------
    # Step 4: Google Doc creation
    # -----------------------------------------------------------------------
    print()
    print("=" * 60)
    print("STEP 4: Create Google Doc")
    print("=" * 60)

    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    doc_title = f"{brand} Competitive Analysis \u2014 {date_str}"
    doc_result = create_google_doc(master_report, doc_title)

    doc_url = doc_result["doc_url"] if doc_result else None
    if doc_url:
        print(f"[doc] Google Doc: {doc_url}")
    else:
        print("[doc] Google Doc creation failed \u2014 report saved locally")

    # -----------------------------------------------------------------------
    # Step 4b: Persist session to workspace (before Drive, so analysis survives upload crashes)
    # -----------------------------------------------------------------------
    if persist and catalog and competitors_dir:
        session_persist_dir = persist_session(out_dir, competitors_dir, brand_dir, session_ts)

    # -----------------------------------------------------------------------
    # Step 4c: Google Drive upload (optional)
    # -----------------------------------------------------------------------
    drive_url = None
    if args.drive:
        print()
        drive_url = upload_to_drive(out_dir, brand, session_ts)

    # -----------------------------------------------------------------------
    # Step 5: Catalog update
    # -----------------------------------------------------------------------
    if persist and catalog and competitors_dir:
        print()
        print("=" * 60)
        print("STEP 5: Finalize catalog")
        print("=" * 60)

        # Update catalog — assets (v2 schema)
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        for item in downloaded_files:
            h = _url_hash(item["url"])
            ftype = item["type"]
            ext = _guess_extension(item["url"], ftype)
            analysis_filename = f"rank-{item['rank']:03d}-{'img' if ftype == 'image' else 'vid'}-{h}.analysis.json"

            existing = catalog["assets"].get(h)
            rank_history_entry = {
                "rank": item["rank"],
                "session": session_ts,
                "timestamp": now_iso,
            }

            if existing:
                # Update existing asset — append rank history
                existing["current_rank"] = item["rank"]
                existing["rank"] = item["rank"]
                existing["rank_history"].append(rank_history_entry)
                existing["filename"] = item["path"].name
                existing["analyzed_at"] = now_iso
                existing["session"] = session_ts
                existing["analysis_file"] = analysis_filename
                if not existing.get("content_hash") and item.get("content_hash"):
                    existing["content_hash"] = item["content_hash"]
            else:
                # New asset — full v2 entry
                catalog["assets"][h] = {
                    "url_hash": h,
                    "brand": brand_dir,
                    "type": ftype,
                    "rank": item["rank"],
                    "current_rank": item["rank"],
                    "rank_history": [rank_history_entry],
                    "filename": item["path"].name,
                    "analyzed_at": now_iso,
                    "first_seen": now_iso,
                    "session": session_ts,
                    "analysis_file": analysis_filename,
                    "source_url_prefix": item["url"][:60],
                    "content_hash": item.get("content_hash"),
                    "landing_page_url": item.get("landing_page_url"),
                    "drive_file_id": None,
                    "clones": [],
                }

        # Update catalog — brand
        brand_entry = catalog["brands"].get(brand_dir, {
            "display_name": brand,
            "first_analyzed": datetime.datetime.utcnow().isoformat() + "Z",
            "ad_library_url": args.url,
            "sessions": [],
        })
        brand_entry["last_analyzed"] = datetime.datetime.utcnow().isoformat() + "Z"
        brand_entry["sessions"].append({
            "timestamp": session_ts,
            "ads_analyzed": len(all_analyses),
            "new_assets": len(downloaded_files),
            "deduped": dedup_count,
            "doc_url": doc_url,
        })
        catalog["brands"][brand_dir] = brand_entry

        save_catalog(catalog, competitors_dir)

        # Write MCP summary
        write_mcp_summary(
            master_report, brand, brand_dir, competitors_dir,
            len(all_analyses), session_ts,
        )

    # Push competitor analysis to MCP platform (auto-detect when env vars present)
    if master_report:
        _push_competitor_to_mcp(brand, master_report)

    # -----------------------------------------------------------------------
    # Step 6: Slack posting
    # -----------------------------------------------------------------------
    if args.slack:
        print()
        print("=" * 60)
        print("STEP 6: Post to Slack")
        print("=" * 60)
        post_analysis_to_slack(brand, doc_url, len(all_analyses), drive_url)

    # -----------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------
    print()
    print("=" * 60)
    print("COMPLETE")
    print("=" * 60)
    print(f"  Brand: {brand}")
    print(f"  Assets analyzed: {len(all_analyses)} ({img_ok} new images, {vid_ok} new videos, {dedup_count} cached)")
    print(f"  Local files: {out_dir}")
    if persist and competitors_dir:
        print(f"  Persistent: {competitors_dir / brand_dir / session_ts}")
    if doc_url:
        print(f"  Google Doc: {doc_url}")
    if drive_url:
        print(f"  Google Drive: {drive_url}")


if __name__ == "__main__":
    main()
