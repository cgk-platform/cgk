#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "elevenlabs>=1.0.0",
#     "requests>=2.28.0",
#     "google-api-python-client>=2.100.0",
#     "google-auth>=2.20.0",
#     "google-auth-oauthlib>=1.0.0",
# ]
# ///
"""
_video_editor.py — Main pipeline for openCLAW video-editor skill.

MUST be called via video_editor_safe.sh (env gate enforced).
Direct calls are blocked.

Session-based workflow:
  start → analyze (clone) → storyboard → set-storyboard → set-voice →
  generate-voiceover → source-footage → normalize → set-captions →
  set-music → plan → render → deliver
"""

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# === Env Gate ===
if os.environ.get("VIDEO_EDITOR_SAFE") != "1":
    print("ERROR: Direct calls to _video_editor.py are blocked.")
    print("You MUST use video_editor_safe.sh with the session-based workflow.")
    print("Example: video_editor_safe.sh start --mode original")
    sys.exit(1)

# === Path Setup ===
# IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks
SCRIPT_DIR = Path(__file__).parent
SKILL_ROOT = SCRIPT_DIR.parent  # skills/video-editor/
PROFILE_ROOT = Path(os.environ["PROFILE_ROOT"])
MEDIA_DIR = Path(os.environ["MEDIA_DIR"])
SESSIONS_DIR = Path(os.environ["SESSIONS_DIR"])
PLANS_DIR = Path(os.environ["PLANS_DIR"])
BRAND_DIR = Path(os.environ["BRAND_DIR"])

# === Structured media layout roots ===
MEDIA_RENDERS_DIR = MEDIA_DIR / "renders"
MEDIA_SESSIONS_DIR = MEDIA_DIR / "sessions"
MEDIA_CATALOG_DIR = MEDIA_DIR / "catalog"

# Ensure lib is importable
sys.path.insert(0, str(SCRIPT_DIR))


def _session_media_dir(session_id: str) -> Path:
    """Return the structured session subdirectory for a given session ID.

    Creates the directory if it does not exist.
    """
    d = MEDIA_SESSIONS_DIR / session_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def _resolve_media_path(filename: str) -> Path | None:
    """Resolve a media filename checking both old flat layout and new structured layout.

    Search order:
      1. New structured layout (renders/, sessions/{sid}/, catalog/*)
      2. Old flat MEDIA_DIR (backward compatibility for pre-migration sessions)

    Returns the first existing Path, or None if not found.
    """
    name = Path(filename).name

    # 1a. Check renders/
    candidate = MEDIA_RENDERS_DIR / name
    if candidate.exists():
        return candidate

    # 1b. Check sessions/{any_session_id}/
    if MEDIA_SESSIONS_DIR.exists():
        for session_dir in MEDIA_SESSIONS_DIR.iterdir():
            if not session_dir.is_dir():
                continue
            candidate = session_dir / name
            if candidate.exists():
                return candidate

    # 1c. Check catalog subdirectories
    for subdir in ("social", "stock", "gdrive", "veo", "inbound"):
        candidate = MEDIA_CATALOG_DIR / subdir / name
        if candidate.exists():
            return candidate

    # 2. Flat fallback (pre-migration files, symlinks, etc.)
    candidate = MEDIA_DIR / name
    if candidate.exists():
        return candidate

    return None


def _load_brand_defaults() -> dict:
    """Load per-profile brand defaults from workspace-video-editor/brand_defaults.json.

    Returns an empty dict if the file is missing or unparseable — never blocks the pipeline.
    """
    defaults_path = PROFILE_ROOT / "workspace-video-editor" / "brand_defaults.json"
    if not defaults_path.exists():
        print(f"WARNING: brand_defaults.json not found at {defaults_path}")
        return {}
    try:
        return json.loads(defaults_path.read_text())
    except (json.JSONDecodeError, OSError) as e:
        print(f"WARNING: Could not load brand_defaults.json: {e}")
        return {}


def _post_slack_progress(msg: str):
    """Post a progress message to the originating Slack thread.

    Entirely non-fatal — all exceptions silently caught.
    Reads SLACK_CHANNEL_ID, SLACK_THREAD_TS, SLACK_BOT_TOKEN from env,
    falling back to profile .env if SLACK_BOT_TOKEN is missing.
    """
    try:
        import urllib.request
        import urllib.parse

        channel = os.environ.get("SLACK_CHANNEL_ID", "")
        thread_ts = os.environ.get("SLACK_THREAD_TS", "")
        token = os.environ.get("SLACK_BOT_TOKEN", "")

        if not token:
            # Fallback: read from profile .env
            env_file = PROFILE_ROOT / ".env"
            if env_file.exists():
                for line in env_file.read_text().splitlines():
                    if line.startswith("SLACK_BOT_TOKEN="):
                        token = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break

        if not (channel and thread_ts and token):
            return

        payload = json.dumps({
            "channel": channel,
            "thread_ts": thread_ts,
            "text": f":hourglass_flowing_sand: {msg}",
        }).encode()

        req = urllib.request.Request(
            "https://slack.com/api/chat.postMessage",
            data=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass


def _session_log(session_id: str, step: str, msg: str):
    """Append a timestamped entry to the session-specific log file.

    Persists with the session, unaffected by gateway log rotation.
    Entirely non-fatal — all exceptions silently caught.
    """
    try:
        log_path = SESSIONS_DIR / f"{session_id}.log"
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with open(log_path, "a") as f:
            f.write(f"[{ts}] [{step}] {msg}\n")
    except Exception:
        pass


def load_session(session_id: str) -> dict:
    """Load session JSON from disk."""
    path = SESSIONS_DIR / f"{session_id}.json"
    if not path.exists():
        print(f"ERROR: Session file not found: {path}")
        sys.exit(1)
    with open(path) as f:
        return json.load(f)


def save_session(session: dict):
    """Atomically save session JSON to disk."""
    session_id = session["session_id"]
    path = SESSIONS_DIR / f"{session_id}.json"
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w") as f:
        json.dump(session, f, indent=2)
    os.replace(str(tmp), str(path))


def require_step(session: dict, step_key: str, step_name: str):
    """Ensure a prerequisite step is completed."""
    if not session.get(step_key, False):
        print(f"ERROR: Step '{step_name}' must be completed first.")
        print(f"Run that step before proceeding.")
        sys.exit(1)


def _get_profile_name() -> str:
    """Derive the openCLAW profile name from PROFILE_ROOT path.

    ~/.openclaw/ -> 'cgk'
    ~/.openclaw-rawdog/ -> 'rawdog'
    ~/.openclaw-vitahustle/ -> 'vitahustle'
    """
    root_name = PROFILE_ROOT.name  # '.openclaw', '.openclaw-rawdog', '.openclaw-vitahustle'
    if root_name == '.openclaw':
        return 'cgk'
    # Strip '.openclaw-' prefix
    if root_name.startswith('.openclaw-'):
        return root_name[len('.openclaw-'):]
    return root_name


def _upload_file(api_url, api_key, project_id, file_type, file_path):
    """Upload a render/voiceover/music file to the Creative Studio via Vercel Blob."""
    import mimetypes
    import requests
    upload_url = f"{api_url}/api/admin/video-editor/projects/upload"
    mime_type = mimetypes.guess_type(file_path)[0] or 'application/octet-stream'
    filename = os.path.basename(file_path)
    try:
        with open(file_path, 'rb') as f:
            files = {'file': (filename, f, mime_type)}
            data = {'projectId': project_id, 'type': file_type}
            resp = requests.post(
                upload_url,
                headers={'x-api-key': api_key},
                files=files,
                data=data,
                timeout=120
            )
        if resp.status_code == 200:
            blob_url = resp.json().get('blobUrl', '')
            print(f"  Uploaded {file_type}: {blob_url}")
            return blob_url
        else:
            print(f"  Warning: {file_type} upload failed ({resp.status_code}): {resp.text[:200]}")
            return None
    except Exception as e:
        print(f"  Warning: {file_type} upload error: {e}")
        return None


def _pull_platform_edits(session_id: str) -> dict | None:
    """Pull user-edited captions from the Creative Studio before rendering.

    Returns a dict with editedCaptions and sceneOrder, or None if unavailable.
    """
    import urllib.request
    import urllib.error

    api_url = os.environ.get("CGK_PLATFORM_API_URL", "")
    api_key = os.environ.get("CGK_PLATFORM_API_KEY", "")
    if not api_url or not api_key:
        return None

    url = f"{api_url.rstrip('/')}/api/admin/video-editor/projects/pull-edits?sessionId={session_id}"
    req = urllib.request.Request(url, headers={"x-api-key": api_key})
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read())
        if data.get("hasEdits"):
            print(f"  Platform edits found: {len(data.get('editedCaptions', []))} caption(s) edited")
        return data
    except Exception as e:
        _session_log(session_id, "pull-edits", f"WARNING: {e}")
        return None


def _apply_caption_edits(timestamps_path: str, edited_captions: list[dict]) -> None:
    """Apply user-edited captions from the platform to the local timestamps file.

    Replaces words at matching sort_order positions in the timestamps JSON.
    """
    if not timestamps_path or not os.path.exists(timestamps_path):
        return
    if not edited_captions:
        return

    with open(timestamps_path) as f:
        ts_data = json.load(f)

    words = ts_data.get("words", [])
    edits_by_order = {ec["sortOrder"]: ec for ec in edited_captions}

    for i, word_entry in enumerate(words):
        if i in edits_by_order:
            edit = edits_by_order[i]
            word_entry["word"] = edit["word"]
            word_entry["start"] = edit["startTime"]
            word_entry["end"] = edit["endTime"]

    ts_data["words"] = words
    with open(timestamps_path, "w") as f:
        json.dump(ts_data, f, indent=2)

    print(f"  Applied {len(edited_captions)} caption edit(s) to timestamps")


def _auto_sync(session_id: str) -> str | None:
    """Auto-sync session state to CGK Platform. Non-fatal -- never blocks the pipeline.

    Returns the platform project_id on success, or None if sync is skipped or fails.
    """
    api_url = os.environ.get("CGK_PLATFORM_API_URL", "")
    api_key = os.environ.get("CGK_PLATFORM_API_KEY", "")
    if not api_url or not api_key:
        return None  # Platform sync not configured
    old_session_id = os.environ.get("SESSION_ID", "")
    try:
        os.environ["SESSION_ID"] = session_id
        return cmd_sync()
    except Exception as e:
        _session_log(session_id, "auto-sync", f"WARNING: {e}")
        return None
    finally:
        if old_session_id:
            os.environ["SESSION_ID"] = old_session_id
        elif "SESSION_ID" in os.environ:
            del os.environ["SESSION_ID"]


def _check_burned_captions(session: dict, storyboard: dict) -> list[dict]:
    """Check storyboard scenes for clips with heavy burned-in captions.

    Returns list of warning dicts: [{scene_num, filename, detail}].
    Only warns for clip: sources that resolve to cataloged clips with has_burned_captions.
    """
    if not session.get("footage_catalog_done"):
        return []

    from lib.catalog_store import CatalogStore
    store = CatalogStore(str(PROFILE_ROOT))

    warnings = []
    for scene in storyboard.get("scenes", []):
        src = scene.get("footage_source", "")
        if not src.startswith("clip:"):
            continue
        # Parse clip:filename@start-end
        clip_part = src[5:]  # strip "clip:"
        filename = clip_part.split("@")[0] if "@" in clip_part else clip_part
        if store.has_burned_captions(filename):
            warnings.append({
                "scene_num": scene.get("scene_num", "?"),
                "filename": filename,
                "detail": "heavy burned-in text (captions/subtitles) detected",
            })
    return warnings


def validate_footage_sources(session: dict, storyboard: dict, force_uncataloged: bool = False):
    """Validate footage sources in storyboard against catalog state.

    - Hard-blocks file: paths and raw paths when no catalog is attached
      (unless force_uncataloged override is active)
    - Validates clip: references against attached catalog and CatalogStore
    - Allows stock:, veo:, gdrive:, social: without catalog (they don't need one)

    Exits with sys.exit(1) on hard errors (same pattern as require_step).
    """
    catalog_done = session.get("footage_catalog_done", False) or session.get("uncataloged_override", False)
    session_id = session.get("session_id", "")

    # Prefixes that never need a catalog
    no_catalog_prefixes = ("stock:", "veo:", "gdrive:", "social:")

    # Collect errors for batch reporting
    errors = []
    warnings = []

    for i, scene in enumerate(storyboard.get("scenes", []), 1):
        src = scene.get("footage_source", "")

        # --- stock:, veo:, gdrive:, social: — always allowed ---
        if any(src.startswith(p) for p in no_catalog_prefixes):
            continue

        # --- file: paths — require catalog or force override ---
        if src.startswith("file:"):
            if not catalog_done and not force_uncataloged:
                errors.append(
                    f"Scene {i}: 'file:' source blocked — no footage catalog attached.\n"
                    f"  footage_source: {src}\n"
                    f"  Fix: Run analyze-footage first, then use clip: references.\n"
                    f"    video_editor_safe.sh analyze-footage --source <folder> --session {session_id}\n"
                    f"  Or attach an existing catalog:\n"
                    f"    video_editor_safe.sh attach-catalog --session {session_id} --catalog <catalog_id>\n"
                    f"  Emergency override: video_editor_safe.sh set-storyboard --force-uncataloged ..."
                )
            continue

        # --- clip: references — validate against catalog ---
        if src.startswith("clip:"):
            ref = src[5:].strip()
            if "@" not in ref:
                errors.append(
                    f"Scene {i}: clip: source missing @start-end range.\n"
                    f"  Got: {src}\n"
                    f"  Expected: clip:<filename>@<start>-<end>"
                )
                continue

            file_ref, _time_range = ref.rsplit("@", 1)
            file_ref = file_ref.strip()

            # Validate the clip file exists in catalog or media dir
            resolved = None

            # Check session catalog first
            if session.get("footage_catalog_id"):
                try:
                    from lib.catalog_store import CatalogStore
                    store = CatalogStore(str(PROFILE_ROOT))
                    result = store.resolve_clip(file_ref)
                    if result:
                        resolved = result
                except Exception:
                    pass

            # Check media dir as fallback
            if not resolved:
                media_path = MEDIA_DIR / file_ref
                if media_path.exists():
                    resolved = True
                else:
                    # Try basename variations
                    base = Path(file_ref).stem
                    for ext in [".mp4", ".mov", ".mkv", ".webm", ".m4v"]:
                        if (MEDIA_DIR / (base + ext)).exists():
                            resolved = True
                            break

            if not resolved:
                # Build helpful error with available clips
                available = []
                if session.get("footage_catalog_id"):
                    try:
                        from lib.catalog_store import CatalogStore
                        store = CatalogStore(str(PROFILE_ROOT))
                        catalog = store.get_catalog(session["footage_catalog_id"])
                        if catalog:
                            for clip in catalog.get("clips", []):
                                available.append(clip["filename"])
                    except Exception:
                        pass

                msg = (
                    f"Scene {i}: clip reference not found: '{file_ref}'\n"
                    f"  Full source: {src}"
                )
                if available:
                    msg += f"\n  Available clips in catalog: {', '.join(available)}"
                else:
                    msg += "\n  No catalog attached — run analyze-footage first."
                errors.append(msg)
            continue

        # --- Raw paths (no prefix) — treat same as file: ---
        if not catalog_done and not force_uncataloged:
            errors.append(
                f"Scene {i}: raw path blocked — no footage catalog attached.\n"
                f"  footage_source: {src}\n"
                f"  Fix: Use a prefix (file:, stock:, clip:, veo:, gdrive:, social:)\n"
                f"  For local footage, run analyze-footage first and use clip: references.\n"
                f"  Emergency override: video_editor_safe.sh set-storyboard --force-uncataloged ..."
            )

    # Print warnings
    for w in warnings:
        print(f"WARNING: {w}")

    # Hard-fail on errors
    if errors:
        print()
        print("=" * 60)
        print("ERROR: Storyboard footage source validation FAILED")
        print("=" * 60)
        print()
        for err in errors:
            print(f"  {err}")
            print()
        print("WHY: Using file: paths without a catalog risks using wrong footage")
        print("(e.g., Christmas bedding instead of bed skirts). The catalog system")
        print("identifies what's actually in each clip with timestamps.")
        print()
        print("QUICK FIX:")
        print(f"  1. Run: video_editor_safe.sh analyze-footage --source <folder> --session {session_id}")
        print(f"  2. Use clip: references from the catalog output")
        print(f"  3. Re-run set-storyboard with clip: sources")
        sys.exit(1)


# =====================================================================
# Command: start
# =====================================================================
def cmd_start():
    session_id = os.environ["SESSION_ID"]
    mode = os.environ["MODE"]
    source_video = os.environ.get("SOURCE_VIDEO", "")
    now = datetime.now(timezone.utc)

    brand = _load_brand_defaults()

    session = {
        "session_id": session_id,
        "version": 1,
        "mode": mode,
        "created": now.isoformat(),
        "created_epoch": int(now.timestamp()),
        "slack_channel_id": os.environ.get("SLACK_CHANNEL_ID", ""),
        "slack_thread_ts": os.environ.get("SLACK_THREAD_TS", ""),
        "profile_root": str(PROFILE_ROOT),
        # Clone source
        "source_video": source_video,
        # Footage catalog (analyze-footage step)
        "footage_catalog_done": False,
        "footage_catalog_path": None,
        "footage_catalog_summary": None,
        # Step completion tracking
        "analyze_done": False,
        "analyze_result": None,
        "storyboard_done": False,
        "storyboard": None,
        "voice_done": False,
        "voice_id": None,
        "voice_name": brand.get("default_voice") or None,
        "voice_preview_path": None,
        "voiceover_done": False,
        "voiceover_path": None,
        "timestamps_path": None,
        "voiceover_script": None,
        "footage_done": False,
        "footage_clips": [],
        "normalize_done": False,
        "normalized_clips": [],
        "aspect_ratio": brand.get("default_aspect_ratio") or None,
        "captions_done": False,
        "caption_style": brand.get("default_caption_style") or None,
        "caption_config": None,
        "music_done": False,
        "music_path": None,
        "music_volume": brand.get("default_music_volume", 0.15),
        "music_attribution": "",
        "music_license": "",
        "plan_done": False,
        "plan_path": None,
        "render_done": False,
        "output_path": None,
        "delivered": False,
        # Brand defaults snapshot (for downstream commands to reference)
        "brand_defaults": brand,
    }

    save_session(session)

    print(f"Session started: {session_id}")
    print(f"  Mode: {mode}")
    print(f"  Channel: {session['slack_channel_id']}")
    print(f"  Thread: {session['slack_thread_ts']}")
    if source_video:
        print(f"  Source video: {source_video}")
    if brand:
        print(f"  Brand defaults loaded: {brand.get('brand_name', 'unknown')}")
        print(f"    Voice: {session['voice_name']}, Captions: {session['caption_style']}, "
              f"Aspect: {session['aspect_ratio']}, Music vol: {session['music_volume']}")
    print()

    if mode == "clone":
        print(f"NEXT STEP: Run analyze to break down the competitor video.")
        print(f"  video_editor_safe.sh analyze --session {session_id}")
    else:
        print(f"NEXT STEP: If using local footage, catalog it first (RECOMMENDED):")
        print(f"  video_editor_safe.sh analyze-footage --source <folder> --session {session_id}")
        print()
        print(f"Then load brand context and build the storyboard:")
        print(f"  video_editor_safe.sh storyboard --session {session_id}")


# =====================================================================
# Command: analyze (clone mode only)
# =====================================================================
def cmd_analyze():
    session_id = os.environ["SESSION_ID"]
    session = load_session(session_id)

    if session["mode"] != "clone":
        print("ERROR: analyze is only available in clone mode.")
        sys.exit(1)

    if session["analyze_done"]:
        print("WARNING: Analysis already completed. Showing cached result.")
        print(json.dumps(session["analyze_result"], indent=2))
        return

    source = session["source_video"]
    if not source:
        print("ERROR: No source video in session.")
        sys.exit(1)

    from lib.analyze import analyze_video
    result = analyze_video(source, MEDIA_DIR)

    session["analyze_done"] = True
    session["analyze_result"] = result
    save_session(session)

    print("=== COMPETITOR VIDEO ANALYSIS ===")
    print()
    print(f"Duration: {result.get('total_duration', 'unknown')}")
    print(f"Scenes: {len(result.get('scenes', []))}")
    print()

    for i, scene in enumerate(result.get("scenes", []), 1):
        print(f"Scene {i} ({scene.get('start', '?')}-{scene.get('end', '?')}s):")
        print(f"  Description: {scene.get('description', '')}")
        if scene.get("text_overlay"):
            print(f"  Text overlay: {scene['text_overlay']}")
        if scene.get("camera"):
            print(f"  Camera: {scene['camera']}")
        print()

    if result.get("voiceover_transcript"):
        print(f"Voiceover: {result['voiceover_transcript']}")
    if result.get("music_style"):
        print(f"Music style: {result['music_style']}")
    if result.get("hook_strategy"):
        print(f"Hook strategy: {result['hook_strategy']}")
    if result.get("cta"):
        print(f"CTA: {result['cta']}")
    print()
    print(f"NEXT STEP: Show this analysis to the user. Ask if they want to proceed with this structure.")
    print(f"When approved, run: video_editor_safe.sh storyboard --session {session_id}")


# =====================================================================
# Command: analyze-footage — Catalog a folder of clips
# =====================================================================
def cmd_analyze_footage():
    footage_source = os.environ.get("FOOTAGE_SOURCE", "")
    session_id = os.environ.get("SESSION_ID", "")
    if session_id:
        _session_log(session_id, "analyze-footage", f"started: {footage_source}")
    max_clips = int(os.environ.get("MAX_CLIPS", "50"))
    catalog_id = os.environ.get("CATALOG_ID", "") or None
    catalog_name = os.environ.get("CATALOG_NAME", "") or None
    catalog_tags_str = os.environ.get("CATALOG_TAGS", "")
    catalog_tags = [t.strip() for t in catalog_tags_str.split(",") if t.strip()] if catalog_tags_str else None
    min_size_str = os.environ.get("MIN_FILE_SIZE", "")
    min_file_size = int(min_size_str) if min_size_str else None

    if not footage_source:
        print("ERROR: FOOTAGE_SOURCE not set. Pass --source or --gdrive.")
        sys.exit(1)

    _post_slack_progress("Analyzing footage with Gemini...")

    from lib.catalog import analyze_footage_folder

    catalog = analyze_footage_folder(
        source=footage_source,
        output_dir=str(SESSIONS_DIR),  # legacy compat (unused by new path)
        media_dir=str(MEDIA_DIR),
        profile_root=str(PROFILE_ROOT),
        session_id=session_id if session_id else None,
        max_clips=max_clips,
        catalog_id=catalog_id,
        catalog_name=catalog_name,
        tags=catalog_tags,
        min_file_size=min_file_size,
    )

    catalog_path = catalog.pop("_catalog_path", None)
    stored_catalog_id = catalog.get("catalog_id", "")

    # If session-attached, save catalog info to session
    if session_id:
        try:
            session = load_session(session_id)
            session["footage_catalog_done"] = True
            session["footage_catalog_path"] = catalog_path
            session["footage_catalog_id"] = stored_catalog_id
            session["footage_catalog_summary"] = [
                {
                    "filename": c["filename"],
                    "duration": c.get("duration", 0),
                    "segments_count": len(c.get("segments", [])),
                }
                for c in catalog.get("clips", [])
            ]
            save_session(session)
        except SystemExit:
            # Session might not exist if running standalone
            pass

    # Print human-readable summary with clip: reference hints
    print()
    print("=== FOOTAGE CATALOG ===")
    cat_name = catalog.get("name", "")
    if cat_name:
        print(f"Name: {cat_name}")
    print(f"ID: {stored_catalog_id}")
    print(f"Source: {catalog['source']}")
    print(f"Clips: {catalog['clip_count']}, Total: {catalog['total_duration']:.1f}s")
    print()

    for clip in catalog.get("clips", []):
        fname = clip["filename"]
        dur = clip.get("duration", 0)
        segs = clip.get("segments", [])
        print(f"  {fname} ({dur:.1f}s)")

        for seg in segs:
            s, e = seg["start"], seg["end"]
            desc = seg.get("description", "")
            camera = seg.get("camera", "")
            mood = seg.get("mood", "")
            text_overlay = seg.get("text_overlay", "none")
            ref = f"clip:{fname}@{s}-{e}"
            detail = f"{camera}, {mood}" if camera and mood else camera or mood
            detail_str = f" -- {detail}" if detail else ""
            print(f"    [{s:.1f}-{e:.1f}]  {desc}{detail_str}")
            if text_overlay and text_overlay != "none":
                print(f"             text: \"{text_overlay}\"")
            print(f"             -> {ref}")
        print()

    if stored_catalog_id == "master":
        print("Clips added to MASTER CATALOG (searched by default for all storyboards).")
    print()
    print("NEXT STEP: Build storyboard referencing catalog clips.")
    if session_id:
        print(f"  video_editor_safe.sh storyboard --session {session_id}")
    print()
    print("Use clip: references in footage_source, e.g.:")
    if catalog.get("clips") and catalog["clips"][0].get("segments"):
        first = catalog["clips"][0]
        seg = first["segments"][0]
        print(f'  "footage_source": "clip:{first["filename"]}@{seg["start"]}-{seg["end"]}"')
    print()
    print("Catalog management:")
    print(f"  video_editor_safe.sh list-catalogs")
    print(f"  video_editor_safe.sh search-clips --query \"product\"")
    print(f"  video_editor_safe.sh cleanup-media --dry-run")


# =====================================================================
# Command: storyboard — Load brand context
# =====================================================================
def cmd_storyboard():
    session_id = os.environ["SESSION_ID"]
    session = load_session(session_id)

    if session["mode"] == "clone" and not session["analyze_done"]:
        print("ERROR: In clone mode, run 'analyze' first.")
        sys.exit(1)

    from lib.brand import load_brand_context
    brand = load_brand_context(BRAND_DIR, PROFILE_ROOT)

    print("=== BRAND CONTEXT LOADED ===")
    print()
    for key, val in brand.items():
        if val:
            preview = val[:200] + "..." if len(val) > 200 else val
            print(f"  {key}: {preview}")
    print()

    if session["mode"] == "clone" and session.get("analyze_result"):
        print("=== COMPETITOR STRUCTURE (adapt this) ===")
        result = session["analyze_result"]
        for i, scene in enumerate(result.get("scenes", []), 1):
            print(f"  Scene {i}: {scene.get('description', '')}")
        print()

    # Show footage catalog: session-attached, then master catalog fallback
    catalog = None
    catalog_source = None  # tracks where catalog came from
    if session.get("footage_catalog_id"):
        from lib.catalog_store import CatalogStore
        store = CatalogStore(str(PROFILE_ROOT))
        catalog = store.get_catalog(session["footage_catalog_id"])
        catalog_source = "session"
    elif session.get("footage_catalog_done") and session.get("footage_catalog_path"):
        cat_path = session["footage_catalog_path"]
        if os.path.exists(cat_path):
            with open(cat_path) as f:
                catalog = json.load(f)
            catalog_source = "session"

    # Fallback: load master catalog if no session catalog
    master_catalog = None
    if not catalog:
        try:
            from lib.catalog_store import CatalogStore
            store = CatalogStore(str(PROFILE_ROOT))
            master_catalog = store.get_catalog("master")
            if master_catalog and master_catalog.get("clips"):
                catalog = master_catalog
                catalog_source = "master"
        except Exception:
            pass

    if catalog:
        clips_list = catalog.get("clips", [])
        total_segs = sum(len(c.get("segments", [])) for c in clips_list)
        if catalog_source == "master":
            print(f"=== MASTER CATALOG ({len(clips_list)} clips, {total_segs} segments) ===")
            print()
            print("  IMPORTANT: Pick the BEST clips from this catalog. Do NOT default to stock:.")
            print("  Missing local files are auto-downloaded during source-footage — pick freely.")
            print()

            # For large catalogs (500+ segments), use semantic search if available
            # rather than dumping everything. For smaller catalogs, dump full.
            if total_segs >= 500:
                # Try semantic search hint
                try:
                    from lib.embeddings import EmbeddingStore
                    emb_store = EmbeddingStore(str(PROFILE_ROOT))
                    if emb_store.has_embeddings():
                        stats = emb_store.stats()
                        print(f"  Semantic search available ({stats['count']} segments indexed).")
                        print(f"  Use search-clips to find the best footage for each scene:")
                        print(f"    video_editor_safe.sh search-clips --query \"product close-up\"")
                        print(f"    video_editor_safe.sh search-clips --query \"application routine\"")
                        print()
                except Exception:
                    pass
                # Show summary (clip names + segment counts) instead of full dump
                for clip in clips_list:
                    fname = clip["filename"]
                    dur = clip.get("duration", 0)
                    segs = clip.get("segments", [])
                    subjects_set = set()
                    for seg in segs:
                        if seg.get("subjects"):
                            for s in seg["subjects"].split(","):
                                subjects_set.add(s.strip())
                    subj_str = f" — {', '.join(sorted(subjects_set)[:5])}" if subjects_set else ""
                    print(f"  {fname} ({dur:.1f}s, {len(segs)} segs){subj_str}")
                print()
                print(f"Use search-clips to find specific footage for each scene.")
                print(f"  video_editor_safe.sh search-clips --query \"<scene description>\"")
                print()
            else:
                # Dump the full catalog — manageable size for context
                for clip in clips_list:
                    fname = clip["filename"]
                    dur = clip.get("duration", 0)
                    segs = clip.get("segments", [])
                    print(f"  {fname} ({dur:.1f}s) — {len(segs)} segments")
                    for seg in segs:
                        s, e = seg["start"], seg["end"]
                        desc = seg.get("description", "")
                        subjects = seg.get("subjects", "")
                        mood = seg.get("mood", "")
                        camera = seg.get("camera", "")
                        ref = f"clip:{fname}@{s}-{e}"
                        detail_parts = [p for p in [camera, mood] if p]
                        detail_str = f" -- {', '.join(detail_parts)}" if detail_parts else ""
                        print(f"    [{s:.1f}-{e:.1f}]  {desc}{detail_str}")
                        if subjects:
                            print(f"             subjects: {subjects}")
                        print(f"             -> {ref}")
                    print()
                print("Use clip: references above in your storyboard's footage_source field.")
                print("Only use stock: for generic B-roll that the catalog genuinely doesn't have.")
                print("Missing files are auto-downloaded — do NOT avoid clips because they seem unavailable.")
                print()
                print("For targeted search: video_editor_safe.sh search-clips --query \"<what you need>\"")
                print()
        else:
            # Session-attached catalog — show full detail
            cat_name = catalog.get("name", "")
            header = f"=== FOOTAGE CATALOG: {cat_name} ===" if cat_name else "=== FOOTAGE CATALOG (available clips) ==="
            print(header)
            print()
            for clip in clips_list:
                fname = clip["filename"]
                dur = clip.get("duration", 0)
                segs = clip.get("segments", [])
                print(f"  {fname} ({dur:.1f}s) — {len(segs)} segments")
                for seg in segs:
                    s, e = seg["start"], seg["end"]
                    desc = seg.get("description", "")
                    subjects = seg.get("subjects", "")
                    mood = seg.get("mood", "")
                    camera = seg.get("camera", "")
                    ref = f"clip:{fname}@{s}-{e}"
                    detail_parts = [p for p in [camera, mood] if p]
                    detail_str = f" -- {', '.join(detail_parts)}" if detail_parts else ""
                    print(f"    [{s:.1f}-{e:.1f}]  {desc}{detail_str}")
                    if subjects:
                        print(f"             subjects: {subjects}")
                    print(f"             -> {ref}")
                print()
            print("Use clip: references above in your storyboard's footage_source field.")
            print()
            # Also mention master catalog if it has more
            try:
                if not master_catalog:
                    from lib.catalog_store import CatalogStore
                    store = CatalogStore(str(PROFILE_ROOT))
                    master_catalog = store.get_catalog("master")
                if master_catalog:
                    master_clips = master_catalog.get("clips", [])
                    master_segs = sum(len(c.get("segments", [])) for c in master_clips)
                    if master_segs > total_segs:
                        print(f"  TIP: Master catalog has {len(master_clips)} clips / {master_segs} segments total.")
                        print(f"  Search across ALL footage: video_editor_safe.sh search-clips --query \"<what you need>\"")
                        print()
            except Exception:
                pass
    else:
        # No catalog at all
        print("=== FOOTAGE CATALOG: NONE ===")
        print()
        print("  No footage catalogs exist yet.")
        print("  To catalog local footage, run analyze-footage first:")
        print(f"    video_editor_safe.sh analyze-footage --source <folder> --session {session_id}")
        print()
        print("  Sources that work without a catalog: stock:, veo:, gdrive:, social:")
        print()

    # Load storyboard template
    template_path = SKILL_ROOT / "templates" / "storyboard_template.json"
    if template_path.exists():
        with open(template_path) as f:
            template = json.load(f)
        print("=== STORYBOARD TEMPLATE ===")
        print(json.dumps(template, indent=2))
        print()

    print("NEXT STEP: Build a storyboard with the user. For each scene, determine:")
    print("  - Scene text/copy")
    print("  - Duration")
    if catalog:
        print("  - Footage source (preferred: clip: references from catalog above)")
        print("    clip:<file>@<start>-<end> | stock:<query> | social:<url> | veo:<prompt>")
        print("    gdrive:<id_or_url>")
    else:
        print("  - Footage source: stock:<query> | social:<url> | veo:<prompt> | gdrive:<id_or_url>")
        print("    NOTE: file: paths require running analyze-footage first (see above)")
    print()
    print(f"When finalized, save it:")
    print(f"  video_editor_safe.sh set-storyboard --session {session_id} --storyboard '<JSON>'")
    print()
    print("Storyboard JSON format:")
    print(json.dumps({
        "title": "Ad title",
        "total_duration": 30,
        "scenes": [
            {
                "scene_num": 1,
                "start": 0,
                "end": 3,
                "text": "Hook text here",
                "description": "Visual description",
                "footage_source": "stock:woman applying skincare morning routine",
                "transition": "crossfade"
            }
        ],
        "voiceover_script": "Full voiceover script here..."
    }, indent=2))


# =====================================================================
# Command: set-storyboard
# =====================================================================
def cmd_set_storyboard():
    session_id = os.environ["SESSION_ID"]
    session = load_session(session_id)
    storyboard_json = os.environ["STORYBOARD_JSON"]

    try:
        storyboard = json.loads(storyboard_json)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid storyboard JSON: {e}")
        sys.exit(1)

    # Validate required fields
    if "scenes" not in storyboard or not storyboard["scenes"]:
        print("ERROR: Storyboard must have at least one scene.")
        sys.exit(1)

    for i, scene in enumerate(storyboard["scenes"], 1):
        if "footage_source" not in scene:
            print(f"ERROR: Scene {i} missing 'footage_source'.")
            sys.exit(1)
        if "text" not in scene and "description" not in scene:
            print(f"WARNING: Scene {i} has no text or description.")
        # Validate text_overlays if present
        overlays = scene.get("text_overlays", [])
        if not isinstance(overlays, list):
            print(f"ERROR: Scene {i} 'text_overlays' must be a list.")
            sys.exit(1)
        valid_positions = {
            "top-left", "top-center", "top-right",
            "center-left", "center", "center-right",
            "bottom-left", "bottom-center", "bottom-right",
        }
        valid_overlay_styles = {"price-tag", "cta"}
        for oi, overlay in enumerate(overlays, 1):
            if "text" not in overlay or not overlay["text"]:
                print(f"ERROR: Scene {i} overlay {oi} missing 'text'.")
                sys.exit(1)
            pos = overlay.get("position", "top-right")
            if pos not in valid_positions:
                print(f"ERROR: Scene {i} overlay {oi} invalid position '{pos}'.")
                print(f"  Valid positions: {', '.join(sorted(valid_positions))}")
                sys.exit(1)
            dur = overlay.get("duration", 3)
            if not isinstance(dur, (int, float)) or dur <= 0:
                print(f"ERROR: Scene {i} overlay {oi} 'duration' must be a positive number.")
                sys.exit(1)

    # --- Footage source validation ---
    force_uncataloged = os.environ.get("FORCE_UNCATALOGED", "") == "1"
    validate_footage_sources(session, storyboard, force_uncataloged)

    if force_uncataloged:
        session["uncataloged_override"] = True
        session["uncataloged_override_time"] = datetime.now(timezone.utc).isoformat()
        print()
        print("WARNING: --force-uncataloged override active. Footage sources were NOT")
        print("validated against a catalog. You are responsible for verifying clip contents.")
        print()

    # --- Burned caption contamination check ---
    caption_warnings = _check_burned_captions(session, storyboard)

    session["storyboard"] = storyboard
    session["storyboard_done"] = True
    session["voiceover_script"] = storyboard.get("voiceover_script", "")
    if caption_warnings:
        session["burned_caption_warnings"] = caption_warnings
    save_session(session)

    print(f"Storyboard saved ({len(storyboard['scenes'])} scenes).")

    if caption_warnings:
        print()
        print("=" * 60)
        print("[CAUTION: burned-in captions detected]")
        print("=" * 60)
        for w in caption_warnings:
            print(f"  Scene {w['scene_num']}: {w['filename']} -- {w['detail']}")
        print()
        print("These clips have burned-in text (captions, subtitles, etc.)")
        print("that will show through under new captions, causing double-text.")
        print("Options:")
        print("  1. Use a different clip (search with: search-clips --exclude-heavy-text)")
        print("  2. Set captions to 'none' (no new captions)")
        print("  3. Proceed anyway (if burned text is acceptable)")
        print()

    print()
    print(f"NEXT STEP: Choose a voice for the voiceover.")
    print(f"  video_editor_safe.sh set-voice --session {session_id} --voice \"Rachel\"")
    print()
    print("Available voice suggestions: Rachel, Josh, Emily, Adam, Bella, Antoni")
    print("Or use --voice-id for a custom/cloned voice.")

    _auto_sync(session_id)


# =====================================================================
# Command: set-voice
# =====================================================================
def cmd_set_voice():
    session_id = os.environ["SESSION_ID"]
    session = load_session(session_id)
    require_step(session, "storyboard_done", "set-storyboard")

    voice_name = os.environ.get("VOICE_NAME", "")
    voice_id = os.environ.get("VOICE_ID", "")

    if not session.get("voiceover_script"):
        print("ERROR: No voiceover script in storyboard. Add 'voiceover_script' to the storyboard JSON.")
        sys.exit(1)

    script = session["voiceover_script"]
    # Take first ~15 words for preview
    words = script.split()
    preview_text = " ".join(words[:15])
    if len(words) > 15:
        preview_text += "..."

    from lib.voiceover import generate_preview, resolve_voice
    resolved_voice_id, resolved_name = resolve_voice(voice_name, voice_id)

    preview_path = str(_session_media_dir(session_id) / f"{session_id}-voice-preview.mp3")
    generate_preview(preview_text, resolved_voice_id, preview_path)

    # Auto-add voice to ElevenLabs library (non-fatal)
    public_owner_id = os.environ.get("VOICE_PUBLIC_OWNER_ID", "")
    if public_owner_id:
        from lib.voice_search import add_voice_to_library
        added = add_voice_to_library(resolved_voice_id, public_owner_id, resolved_name)
        if added:
            print(f"Voice '{resolved_name}' added to your ElevenLabs library.")
        else:
            print(f"Note: Could not add voice to library (may already be added).")

    session["voice_done"] = True
    session["voice_id"] = resolved_voice_id
    session["voice_name"] = resolved_name
    session["voice_preview_path"] = preview_path
    save_session(session)

    print(f"Voice preview generated: {resolved_name} ({resolved_voice_id})")
    print(f"Preview file: {preview_path}")
    print(f"Preview text: \"{preview_text}\"")
    print()
    print("NEXT STEP: Upload the voice preview to the Slack thread for user approval.")
    print(f"  File: {preview_path}")
    print("  Ask: 'Does this voice sound right? Want to try a different one?'")
    print()
    print("If approved, generate full voiceover:")
    print(f"  video_editor_safe.sh generate-voiceover --session {session_id}")
    print()
    print("If not, try another voice:")
    print(f"  video_editor_safe.sh set-voice --session {session_id} --voice \"<other>\"")
    print()
    print("To browse voices interactively:")
    print(f"  video_editor_safe.sh search-voices --gender female --accent american")


# =====================================================================
# Command: search-voices (standalone — no session required)
# =====================================================================
def cmd_search_voices():
    """Search the ElevenLabs voice library and download previews."""
    from lib.voice_search import download_preview, get_user_voices, search_shared_voices

    query = os.environ.get("VOICE_SEARCH_QUERY", "")
    gender = os.environ.get("VOICE_SEARCH_GENDER", "")
    age = os.environ.get("VOICE_SEARCH_AGE", "")
    accent = os.environ.get("VOICE_SEARCH_ACCENT", "")
    use_case = os.environ.get("VOICE_SEARCH_USE_CASE", "")
    category = os.environ.get("VOICE_SEARCH_CATEGORY", "")
    my_voices = os.environ.get("VOICE_SEARCH_MY_VOICES", "") == "1"
    limit = int(os.environ.get("VOICE_SEARCH_LIMIT", "10"))
    max_previews = int(os.environ.get("VOICE_SEARCH_MAX_PREVIEWS", "5"))

    print("=== Voice Search ===")
    if my_voices:
        print("Searching your ElevenLabs library...")
        voices = get_user_voices(search=query, page_size=limit)
    else:
        filters = []
        if query:
            filters.append(f"query=\"{query}\"")
        if gender:
            filters.append(f"gender={gender}")
        if age:
            filters.append(f"age={age}")
        if accent:
            filters.append(f"accent={accent}")
        if use_case:
            filters.append(f"use_case={use_case}")
        if category:
            filters.append(f"category={category}")
        print(f"Searching shared voice library: {', '.join(filters) if filters else '(all)'}...")
        voices = search_shared_voices(
            search=query,
            gender=gender,
            age=age,
            accent=accent,
            use_case=use_case,
            category=category,
            page_size=limit,
        )

    if not voices:
        print("\nNo voices found matching your criteria.")
        print("Try broader search terms or fewer filters.")
        return

    print(f"\nFound {len(voices)} voice(s):\n")

    preview_paths = []
    for i, v in enumerate(voices, 1):
        meta_parts = []
        if v["gender"]:
            meta_parts.append(v["gender"])
        if v["age"]:
            meta_parts.append(v["age"])
        if v["accent"]:
            meta_parts.append(v["accent"])
        if v["use_case"]:
            meta_parts.append(v["use_case"])
        meta = ", ".join(meta_parts) if meta_parts else "—"

        print(f"  {i}. {v['name']}")
        print(f"     ID: {v['voice_id']}")
        if v.get("public_owner_id"):
            print(f"     Owner: {v['public_owner_id']}")
            if v.get("is_added_by_user"):
                print(f"     (already in your library)")
        print(f"     {meta}")
        if v["description"]:
            desc = v["description"][:120]
            if len(v["description"]) > 120:
                desc += "..."
            print(f"     {desc}")

        # Download preview
        if i <= max_previews and v["preview_url"]:
            safe_name = "".join(c if c.isalnum() or c in "-_" else "-" for c in v["name"].lower())
            preview_file = MEDIA_DIR / f"voice-preview-{safe_name}-{v['voice_id'][:8]}.mp3"
            if download_preview(v["preview_url"], str(preview_file)):
                preview_paths.append((v["name"], str(preview_file)))
                print(f"     Preview: {preview_file}")

        print()

    if preview_paths:
        print("=== Preview Files ===")
        print("Upload these to the Slack thread so the user can listen:\n")
        for name, path in preview_paths:
            print(f"  {name}: {path}")
        print()

    print("=== Next Steps ===")
    print("1. Upload preview MP3s to Slack thread")
    print("2. Ask user to pick a voice")
    print("3. Use the voice_id with set-voice (include --public-owner-id to auto-save to your library):")
    print("   video_editor_safe.sh set-voice --session <ID> --voice-id <picked_voice_id> --public-owner-id <owner_id>")


# =====================================================================
# Command: generate-voiceover
# =====================================================================
def cmd_generate_voiceover():
    session_id = os.environ["SESSION_ID"]
    session = load_session(session_id)
    require_step(session, "voice_done", "set-voice")

    script = session["voiceover_script"]
    voice_id = session["voice_id"]

    if not script:
        print("ERROR: No voiceover script. Re-run set-storyboard with voiceover_script.")
        sys.exit(1)

    from lib.voiceover import generate_full_voiceover

    vo_path = str(_session_media_dir(session_id) / f"{session_id}-voiceover.mp3")
    ts_path = str(_session_media_dir(session_id) / f"{session_id}-timestamps.json")

    generate_full_voiceover(script, voice_id, vo_path, ts_path)

    session["voiceover_done"] = True
    session["voiceover_path"] = vo_path
    session["timestamps_path"] = ts_path
    save_session(session)

    # Read duration from timestamps
    duration = "unknown"
    if os.path.exists(ts_path):
        with open(ts_path) as f:
            ts_data = json.load(f)
        duration = f"{ts_data.get('total_duration', 0):.1f}s"
        word_count = len(ts_data.get("words", []))
    else:
        word_count = len(script.split())

    print(f"Full voiceover generated ({duration}, {word_count} words).")
    print(f"  Audio: {vo_path}")
    print(f"  Timestamps: {ts_path}")
    print()
    print("NEXT STEP: Upload the voiceover MP3 to the Slack thread for user approval.")
    print(f"  File: {vo_path}")
    print("  Ask: 'Here's the full voiceover. Sound good?'")
    print()
    print("If approved, source the footage:")
    print(f"  video_editor_safe.sh source-footage --session {session_id}")

    _auto_sync(session_id)


# =====================================================================
# Command: source-footage
# =====================================================================
def cmd_source_footage():
    session_id = os.environ["SESSION_ID"]
    session = load_session(session_id)
    require_step(session, "storyboard_done", "set-storyboard")

    storyboard = session["storyboard"]
    scenes = storyboard.get("scenes", [])

    _post_slack_progress(f"Sourcing footage for {len(scenes)} scenes...")

    from lib.footage import source_scene_footage

    clips = []
    waiting_veo = []

    for scene in scenes:
        num = scene.get("scene_num", scenes.index(scene) + 1)
        src = scene.get("footage_source", "")

        print(f"Scene {num}: sourcing footage ({src[:50]}{'...' if len(src) > 50 else ''})...")

        clip_info = source_scene_footage(
            scene=scene,
            session_id=session_id,
            scene_num=num,
            media_dir=str(MEDIA_DIR),
            catalog_done=session.get("footage_catalog_done", False) or session.get("uncataloged_override", False),
        )

        if clip_info.get("status") == "waiting_veo":
            waiting_veo.append(clip_info)
            print(f"  WAITING — Needs Veo generation.")
        elif clip_info.get("status") == "ready":
            print(f"  Ready: {clip_info['path']} "
                  f"({clip_info.get('duration', '?')}s, "
                  f"{clip_info.get('resolution', '?')}, "
                  f"{clip_info.get('codec', '?')})")
        else:
            print(f"  ERROR: {clip_info.get('error', 'Unknown error')}")

        clips.append(clip_info)

    session["footage_clips"] = clips
    all_ready = all(c.get("status") == "ready" for c in clips)
    session["footage_done"] = all_ready
    save_session(session)

    print()
    if waiting_veo:
        print(f"{len(waiting_veo)} scene(s) need Veo generation:")
        for c in waiting_veo:
            print(f"  Scene {c['scene_num']}: generate_video_safe.sh --prompt \"{c.get('veo_prompt', '')}\"")
        print()
        print("After generating Veo clips, re-run source-footage to validate them.")
        print(f"  video_editor_safe.sh source-footage --session {session_id}")
    elif all_ready:
        print("All footage sourced successfully.")
        print()
        print(f"NEXT STEP: Normalize all clips to target aspect ratio.")
        print(f"  video_editor_safe.sh normalize --session {session_id} --aspect-ratio 9:16")
    else:
        errors = [c for c in clips if c.get("status") == "error"]
        print(f"{len(errors)} scene(s) had errors. Fix source paths and re-run.")
        print(f"  video_editor_safe.sh source-footage --session {session_id}")

    _auto_sync(session_id)


# =====================================================================
# Command: normalize
# =====================================================================
def cmd_normalize():
    session_id = os.environ["SESSION_ID"]
    session = load_session(session_id)
    require_step(session, "footage_done", "source-footage")

    aspect_ratio = os.environ["ASPECT_RATIO"]

    from lib.timeline import normalize_clips

    clips = session["footage_clips"]
    storyboard = session["storyboard"]
    scenes = storyboard.get("scenes", [])

    _post_slack_progress(f"Normalizing {len(clips)} clips to {aspect_ratio}...")

    normalized = normalize_clips(
        clips=clips,
        scenes=scenes,
        aspect_ratio=aspect_ratio,
        session_id=session_id,
        media_dir=str(_session_media_dir(session_id)),
    )

    session["normalized_clips"] = normalized
    session["normalize_done"] = True
    session["aspect_ratio"] = aspect_ratio
    save_session(session)

    print(f"All {len(normalized)} clips normalized to {aspect_ratio}.")
    for n in normalized:
        print(f"  Scene {n['scene_num']}: {n['path']} ({n.get('duration', '?')}s)")
    print()
    print(f"NEXT STEP: Choose caption style.")
    print(f"  video_editor_safe.sh set-captions --session {session_id} --style tiktok")
    print()
    print("Available styles: tiktok, minimal, bold, karaoke, none")


# =====================================================================
# Command: set-captions
# =====================================================================
def cmd_set_captions():
    session_id = os.environ["SESSION_ID"]
    session = load_session(session_id)
    require_step(session, "normalize_done", "normalize")

    style = os.environ.get("CAPTION_STYLE", "")
    custom_json = os.environ.get("CAPTION_JSON", "")

    if custom_json:
        try:
            config = json.loads(custom_json)
        except json.JSONDecodeError as e:
            print(f"ERROR: Invalid caption JSON: {e}")
            sys.exit(1)
        style = "custom"
    else:
        # Load preset from templates
        styles_path = SKILL_ROOT / "templates" / "caption_styles.json"
        if styles_path.exists():
            with open(styles_path) as f:
                all_styles = json.load(f)
            config = all_styles.get(style, {})
        else:
            config = {"style": style}

    session["captions_done"] = True
    session["caption_style"] = style
    session["caption_config"] = config
    save_session(session)

    print(f"Caption style set: {style}")
    if style != "none":
        print(f"  Config: {json.dumps(config, indent=2)}")

    # G3: Auto-sync after caption style set
    _auto_sync(session_id)

    print()
    print(f"NEXT STEP: Get music suggestions or set music manually.")
    print(f"  video_editor_safe.sh suggest-music --session {session_id}  (AI suggestions)")
    print(f"  video_editor_safe.sh set-music --session {session_id} --music <path>")
    print(f"  video_editor_safe.sh set-music --session {session_id} --none")


# =====================================================================
# Command: suggest-music — AI-powered music suggestions
# =====================================================================
def cmd_suggest_music():
    session_id = os.environ["SESSION_ID"]
    session = load_session(session_id)
    require_step(session, "storyboard_done", "set-storyboard")

    storyboard = session["storyboard"]
    total_dur = storyboard.get("total_duration", 30)

    from lib.music import suggest_music, _extract_mood_keywords, FREESOUND_API_KEY

    library_dir = str(PROFILE_ROOT / "workspace" / "music")
    mood_info = _extract_mood_keywords(storyboard)

    print("=== MUSIC SUGGESTIONS ===")
    print(f"Storyboard mood: {mood_info['mood']}, energy: {mood_info['energy']}")
    if mood_info["keywords"]:
        print(f"Keywords: {', '.join(mood_info['keywords'])}")
    print(f"Target duration: {total_dur:.1f}s")
    print()

    suggestions = suggest_music(
        storyboard=storyboard,
        library_dir=library_dir,
        target_duration=total_dur,
    )

    if not suggestions:
        print("No music sources configured.")
        if not FREESOUND_API_KEY:
            print("  Set FREESOUND_API_KEY in your profile .env to enable Freesound search.")
            print("  Register free at: https://freesound.org/apiv2/apply")
        if not os.path.isdir(library_dir):
            print(f"  Create {library_dir}/ and add audio files for local library.")
        print()
        print(f"You can still set music manually:")
        print(f"  video_editor_safe.sh set-music --session {session_id} --music /path/to/track.mp3")
        return

    for i, s in enumerate(suggestions, 1):
        dur = s["duration"]
        source = s["source"]
        name = s["name"]
        license_str = ""
        if s.get("license") and s["license"] != "local":
            if "Creative Commons 0" in s["license"]:
                license_str = " | CC0"
            else:
                license_str = f" | CC-BY"

        rating_str = ""
        avg_r = s.get("avg_rating", 0)
        num_r = s.get("num_ratings", 0)
        if avg_r and num_r:
            rating_str = f" | {avg_r:.1f}/5 ({num_r} ratings)"

        mood_str = ""
        if s.get("mood_match"):
            mood_str = f"Mood: {', '.join(s['mood_match'])}"

        print(f"  {i}. \"{name}\" ({dur:.0f}s) — {source}")
        detail_parts = [p for p in [mood_str, license_str.lstrip(" | "), rating_str.lstrip(" | ")] if p]
        if detail_parts:
            print(f"     {' | '.join(detail_parts)}")
        if s.get("preview_url"):
            print(f"     Preview: {s['preview_url']}")
        print()

    print("To use a suggestion:")
    first_source = suggestions[0]["source"]
    print(f"  video_editor_safe.sh set-music --session {session_id} --music {first_source}")
    print()
    print("Or provide your own:")
    print(f"  video_editor_safe.sh set-music --session {session_id} --music /path/to/track.mp3")
    print(f"  video_editor_safe.sh set-music --session {session_id} --none")


# =====================================================================
# Command: set-music
# =====================================================================
def cmd_set_music():
    session_id = os.environ["SESSION_ID"]
    session = load_session(session_id)
    require_step(session, "captions_done", "set-captions")

    music_ref = os.environ.get("MUSIC_PATH", "none")
    music_volume = float(os.environ.get("MUSIC_VOLUME", "0.15"))

    music_path = None
    music_attribution = ""
    music_license = ""

    if music_ref.startswith("freesound:"):
        # Download from Freesound
        from lib.music import download_freesound_track
        sound_id = int(music_ref.split(":")[1])
        output_path = str(MEDIA_DIR / f"{session_id}-music-fs{sound_id}.mp3")
        info = download_freesound_track(sound_id, output_path)
        if "error" in info:
            print(f"ERROR: {info['error']}")
            sys.exit(1)
        music_path = output_path
        music_attribution = info.get("attribution", "")
        music_license = info.get("license", "")
        print(f"Downloaded from Freesound: {info.get('name', '')} ({info.get('duration', 0):.1f}s)")
        if music_attribution:
            print(f"  Attribution: {music_attribution}")

    elif music_ref.startswith("library:"):
        # From local music library
        filename = music_ref[8:]
        library_dir = str(PROFILE_ROOT / "workspace" / "music")
        music_path = os.path.join(library_dir, filename)
        if not os.path.exists(music_path):
            print(f"ERROR: Music file not found in library: {filename}")
            print(f"  Expected at: {music_path}")
            sys.exit(1)

    elif music_ref == "none":
        music_path = None
    else:
        # Raw path (existing behavior)
        music_path = music_ref
        if not os.path.exists(music_path):
            print(f"ERROR: Music file not found: {music_path}")
            sys.exit(1)

    session["music_done"] = True
    session["music_path"] = music_path
    session["music_volume"] = music_volume
    session["music_attribution"] = music_attribution
    session["music_license"] = music_license
    save_session(session)

    if music_path is None:
        print("No background music set.")
    else:
        print(f"Background music set: {music_path} (volume: {music_volume})")

    # G3: Auto-sync after music set
    _auto_sync(session_id)

    print()
    print(f"NEXT STEP: Review the full assembly plan.")
    print(f"  video_editor_safe.sh plan --session {session_id}")


# =====================================================================
# VO-Aware Scene Alignment
# =====================================================================
def _align_scenes_to_vo(plan_scenes, vo_words, transition_dur=0.5):
    """Adjust scene clip_duration so scene cuts align with VO word timing.

    Maps VO words to scenes using original storyboard times, then computes
    clip durations so the xfade chain produces cuts when each scene's
    voiceover content actually starts.

    Math: For scene i's xfade to start at VO time T[i+1]:
      dur[0] = T[1] + xfade
      dur[i] = T[i+1] - T[i] + xfade  (for 0 < i < n-1)
      dur[n-1] = actual clip duration   (last scene plays full)

    Returns (adjusted_scenes, adjustments_log).
    """
    n = len(plan_scenes)
    if not vo_words or n < 2:
        return plan_scenes, []

    # Step 1: Map VO words to scenes using original storyboard times
    scene_word_groups = []
    for s in plan_scenes:
        words = [
            w for w in vo_words
            if w["start"] >= s["start"] and w["start"] < s["end"]
        ]
        scene_word_groups.append(words)

    # Step 2: Get VO start time for each scene (when its first word begins)
    vo_starts = []
    for words in scene_word_groups:
        vo_starts.append(words[0]["start"] if words else None)

    # Fill None gaps by linear interpolation from neighbors
    for i in range(1, n):
        if vo_starts[i] is None:
            prev_val, prev_i = 0.0, 0
            next_val, next_i = vo_words[-1]["end"], n
            for j in range(i - 1, -1, -1):
                if vo_starts[j] is not None:
                    prev_val, prev_i = vo_starts[j], j
                    break
            for j in range(i + 1, n):
                if vo_starts[j] is not None:
                    next_val, next_i = vo_starts[j], j
                    break
            span = max(next_i - prev_i, 1)
            vo_starts[i] = prev_val + (next_val - prev_val) * (i - prev_i) / span

    # Step 3: Compute aligned clip durations
    adjustments = []

    for i in range(n):
        actual_dur = plan_scenes[i]["clip_duration"]
        original_scene_dur = plan_scenes[i]["end"] - plan_scenes[i]["start"]

        if i < n - 1 and vo_starts[i + 1] is not None:
            if i == 0:
                target = vo_starts[1] + transition_dur
            else:
                target = (vo_starts[i + 1] - (vo_starts[i] or 0)) + transition_dur
            # Clamp: can't show more footage than we have, min 0.3s
            new_dur = max(0.3, min(target, actual_dur))
        else:
            # Last scene — play full clip
            new_dur = actual_dur

        new_dur = round(new_dur, 2)

        if abs(new_dur - original_scene_dur) > 0.3:
            adjustments.append({
                "scene_num": plan_scenes[i]["scene_num"],
                "original": round(original_scene_dur, 1),
                "aligned": round(new_dur, 1),
                "vo_start": round(vo_starts[i], 1) if vo_starts[i] is not None else None,
            })

        plan_scenes[i]["clip_duration"] = new_dur

    # Recompute start/end to reflect actual video timeline
    cumulative = 0.0
    for i, s in enumerate(plan_scenes):
        s["start"] = round(cumulative, 2)
        s["end"] = round(cumulative + s["clip_duration"], 2)
        if i < n - 1:
            cumulative += s["clip_duration"] - transition_dur
        else:
            cumulative += s["clip_duration"]

    return plan_scenes, adjustments


# =====================================================================
# Command: plan
# =====================================================================
def cmd_plan():
    session_id = os.environ["SESSION_ID"]
    session = load_session(session_id)

    # Validate all prerequisites
    require_step(session, "storyboard_done", "set-storyboard")
    require_step(session, "voiceover_done", "generate-voiceover")
    require_step(session, "footage_done", "source-footage")
    require_step(session, "normalize_done", "normalize")
    require_step(session, "captions_done", "set-captions")
    require_step(session, "music_done", "set-music")

    storyboard = session["storyboard"]
    scenes = storyboard.get("scenes", [])
    normalized = session["normalized_clips"]
    aspect = session["aspect_ratio"]

    # Compute dimensions
    dims = {
        "9:16": "1080x1920",
        "16:9": "1920x1080",
        "1:1": "1080x1080",
        "4:5": "1080x1350",
    }
    resolution = dims.get(aspect, "1080x1920")

    # Compute total duration from storyboard
    total_dur = 0
    for scene in scenes:
        total_dur = max(total_dur, scene.get("end", 0))

    # Compute effective video duration accounting for xfade overlaps
    transition_dur = 0.5
    num_transitions = max(0, len(scenes) - 1)
    effective_video_dur = total_dur - (num_transitions * transition_dur)

    # Load VO duration and word timestamps for mismatch detection
    vo_duration = 0
    vo_words = []
    ts_path = session.get("timestamps_path")
    if ts_path and os.path.exists(ts_path):
        with open(ts_path) as f:
            ts_data = json.load(f)
        vo_duration = ts_data.get("total_duration", 0)
        vo_words = ts_data.get("words", [])

    # Ensure renders directory exists for the output path
    MEDIA_RENDERS_DIR.mkdir(parents=True, exist_ok=True)

    # Build plan
    now = datetime.now(timezone.utc)
    plan = {
        "session_id": session_id,
        "created": now.isoformat(),
        "created_epoch": int(now.timestamp()),
        "aspect_ratio": aspect,
        "resolution": resolution,
        "total_duration": total_dur,
        "scenes": [],
        "voiceover": {
            "path": session["voiceover_path"],
            "voice": session["voice_name"],
            "timestamps": session["timestamps_path"],
        },
        "vo_duration": vo_duration,
        "effective_video_duration": effective_video_dur,
        "music": {
            "path": session["music_path"],
            "volume": session["music_volume"],
        },
        "captions": {
            "style": session["caption_style"],
            "config": session["caption_config"],
        },
        "output_path": str(MEDIA_RENDERS_DIR / f"{session_id}-final.mp4"),
    }

    for i, scene in enumerate(scenes):
        norm = normalized[i] if i < len(normalized) else {}
        plan["scenes"].append({
            "scene_num": scene.get("scene_num", i + 1),
            "start": scene.get("start", 0),
            "end": scene.get("end", 0),
            "text": scene.get("text", ""),
            "clip_path": norm.get("path", ""),
            "clip_duration": norm.get("duration", 0),
            "transition": scene.get("transition", "crossfade"),
        })

    # === VO-Aware Scene Alignment ===
    # Adjust clip durations so scene cuts match when VO words are actually spoken.
    # This ensures the SUV clip is on screen when the VO says "SUV", etc.
    vo_adjustments = []
    if vo_words and len(plan["scenes"]) >= 2:
        plan["scenes"], vo_adjustments = _align_scenes_to_vo(
            plan["scenes"], vo_words, transition_dur,
        )
        # Recompute total_dur and effective_video_dur from aligned scenes
        if plan["scenes"]:
            total_dur = plan["scenes"][-1]["end"]
            plan["total_duration"] = total_dur
            actual_clip_sum = sum(s["clip_duration"] for s in plan["scenes"])
            effective_video_dur = actual_clip_sum - (num_transitions * transition_dur)
            plan["effective_video_duration"] = effective_video_dur

    # Save plan to disk (for inspection — plan_done set after validation)
    plan_path = str(PLANS_DIR / f"{session_id}-plan.json")
    tmp = plan_path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(plan, f, indent=2)
    os.replace(tmp, plan_path)

    # Print human-readable plan
    print("=== VIDEO ASSEMBLY PLAN ===")
    print(f"Session: {session_id}")
    print(f"Output: {aspect} ({resolution}), ~{total_dur:.1f}s")
    if vo_adjustments:
        print(f"  (VO-aligned: {len(vo_adjustments)} scene(s) adjusted)")
    print()
    print("TIMELINE:")
    shortfall_total = 0
    shortfall_scenes = []
    actual_clip_total = 0
    for s in plan["scenes"]:
        scene_dur = s["end"] - s["start"]
        clip_dur = s["clip_duration"]
        actual_clip_total += clip_dur
        short_note = ""
        if clip_dur > 0 and clip_dur < scene_dur - 0.2:
            gap = scene_dur - clip_dur
            shortfall_total += gap
            shortfall_scenes.append((s["scene_num"], gap, clip_dur, scene_dur))
            short_note = f" [{clip_dur:.1f}s clip, short by {gap:.1f}s]"
        print(f"  [{s['start']:.1f}s - {s['end']:.1f}s]  Scene {s['scene_num']}: "
              f"{s['text'][:40]}{'...' if len(s.get('text', '')) > 40 else ''} "
              f"+ {s['transition']}{short_note}")
    print()
    print("AUDIO:")
    print(f"  Voiceover: {os.path.basename(session['voiceover_path'])} "
          f"(ElevenLabs {session['voice_name']})")
    if session["music_path"]:
        print(f"  Music: {os.path.basename(session['music_path'])} "
              f"at {int(session['music_volume'] * 100)}% volume")
    else:
        print("  Music: none")
    print()
    print("CAPTIONS:")
    print(f"  Style: {session['caption_style']}")
    print()
    print(f"Output: {plan['output_path']}")

    # VO alignment adjustments
    if vo_adjustments:
        print()
        print("VO ALIGNMENT ADJUSTMENTS:")
        for adj in vo_adjustments:
            direction = "trimmed" if adj["aligned"] < adj["original"] else "extended"
            print(f"  Scene {adj['scene_num']}: {adj['original']:.1f}s -> {adj['aligned']:.1f}s "
                  f"({direction}, VO starts at {adj['vo_start']:.1f}s)")

    # VO-Scene alignment preview (using adjusted video timeline)
    if vo_duration > 0 and vo_words:
        print()
        print("VO-SCENE ALIGNMENT:")
        for s in plan["scenes"]:
            scene_words = [
                w for w in vo_words
                if w["start"] >= s["start"] and w["start"] < s["end"]
            ]
            if scene_words:
                text = " ".join(w["word"] for w in scene_words)
                print(f"  Scene {s['scene_num']} [{s['start']:.1f}-{s['end']:.1f}s]: \"{text}\"")
            else:
                print(f"  Scene {s['scene_num']} [{s['start']:.1f}-{s['end']:.1f}s]: (no VO)")

    print("===")

    # === DURATION VALIDATION GATE ===
    force_plan = os.environ.get("FORCE_PLAN") == "1"
    gate_failed = False

    # Check 1: Clip shortfall — block render if total gap > 2s
    if shortfall_total > 2.0:
        if force_plan:
            print()
            print("WARNING (--force): Clips are too short for the storyboard")
            print(f"  Total shortfall: {shortfall_total:.1f}s (threshold: 2.0s)")
            for scene_num, gap, clip_dur, scene_dur in shortfall_scenes:
                print(f"  Scene {scene_num}: clip is {clip_dur:.1f}s, scene needs {scene_dur:.1f}s (short by {gap:.1f}s)")
            print("  Short clips will hold on last frame. Proceeding anyway (--force).")
        else:
            gate_failed = True
            print()
            print("=" * 60)
            print("BLOCKED: Clips are too short for the storyboard")
            print("=" * 60)
            print(f"  Total shortfall: {shortfall_total:.1f}s (threshold: 2.0s)")
            print()
            for scene_num, gap, clip_dur, scene_dur in shortfall_scenes:
                print(f"  Scene {scene_num}: clip is {clip_dur:.1f}s, scene needs {scene_dur:.1f}s (short by {gap:.1f}s)")
            print()
            print("FIX OPTIONS:")
            print("  1. Use longer clip: ranges (extend @start-end in storyboard)")
            print("  2. Shorten scene durations in storyboard to match available footage")
            print("  3. Source longer clips for the affected scenes")
            print(f"  4. Use --force to proceed anyway (short clips hold on last frame)")
            print()
            print(f"After fixing, re-run: video_editor_safe.sh set-storyboard --session {session_id} ...")
            print(f"Then: video_editor_safe.sh normalize --session {session_id} --aspect-ratio {aspect}")
            print(f"Then: video_editor_safe.sh plan --session {session_id}")
    elif shortfall_total > 0:
        print()
        print(f"  Note: {shortfall_total:.1f}s total clip shortfall (under 2s threshold — OK)")
        print(f"  Minor gaps are smoothed by transitions. Video will end at last clip frame.")

    # Check 2: VO cutoff — warn if actual clip duration is 5+ seconds shorter than VO
    effective_clip_dur = actual_clip_total - (num_transitions * transition_dur)
    if vo_duration > 0 and effective_clip_dur > 0:
        vo_overshoot = vo_duration - effective_clip_dur
        if vo_overshoot >= 5.0:
            if force_plan:
                print()
                print("WARNING (--force): Video is too short for the voiceover")
                print(f"  Voiceover duration:      {vo_duration:.1f}s")
                print(f"  Effective video duration: {effective_clip_dur:.1f}s")
                print(f"  VO will be cut off by:   {vo_overshoot:.1f}s")
                print("  Proceeding anyway (--force). VO may be trimmed at the end.")
            else:
                gate_failed = True
                print()
                print("=" * 60)
                print("BLOCKED: Video is too short for the voiceover")
                print("=" * 60)
                print(f"  Voiceover duration:      {vo_duration:.1f}s")
                print(f"  Effective video duration: {effective_clip_dur:.1f}s (clips minus {num_transitions} xfade overlaps)")
                print(f"  VO will be cut off by:   {vo_overshoot:.1f}s")
                print()
                print("FIX OPTIONS:")
                print("  1. Extend clip: ranges to provide more footage")
                print("  2. Add more scenes to the storyboard")
                print("  3. Trim the voiceover script and re-generate")
                print(f"  4. Use --force to proceed anyway (VO may be trimmed)")
                print()
                print(f"After fixing, re-run the affected steps then: video_editor_safe.sh plan --session {session_id}")
        elif vo_overshoot >= 2.0:
            print()
            print(f"  WARNING: VO ({vo_duration:.1f}s) is {vo_overshoot:.1f}s longer than video ({effective_clip_dur:.1f}s).")
            print(f"  The last {vo_overshoot:.1f}s of voiceover may be cut off. Consider extending clips or trimming VO.")

    if gate_failed:
        # Save session WITHOUT plan_done — render is blocked
        session["plan_path"] = plan_path
        save_session(session)
        print()
        print("Render is BLOCKED until the above issues are fixed.")
        print("The plan file has been saved for inspection.")
        return

    # Validation passed — mark plan as done
    session["plan_done"] = True
    session["plan_path"] = plan_path
    save_session(session)

    # G3: Auto-sync after plan validated
    _auto_sync(session_id)

    print()
    print("NEXT STEP: Show this plan to the user for approval.")
    print("  Ask: 'Here's the assembly plan. Ready to render?'")
    print()
    print("If approved:")
    print(f"  video_editor_safe.sh render --session {session_id}")


# =====================================================================
# Command: render
# =====================================================================
def cmd_render():
    session_id = os.environ["SESSION_ID"]
    _session_log(session_id, "render", "started")
    session = load_session(session_id)
    require_step(session, "plan_done", "plan")

    plan_path = session.get("plan_path")
    if not plan_path or not os.path.exists(plan_path):
        print("ERROR: Plan file missing. Re-run 'plan' command.")
        sys.exit(1)

    # Check plan TTL
    with open(plan_path) as f:
        plan = json.load(f)

    plan_age = int(time.time()) - plan.get("created_epoch", 0)
    if plan_age > 1800:  # 30 min
        print(f"ERROR: Plan has expired (age: {plan_age}s > 1800s).")
        print("Re-run 'plan' to generate a fresh plan.")
        sys.exit(1)

    _post_slack_progress("Rendering final video...")
    _session_log(session_id, "render", "generating captions + audio mix")

    # G1: Pull user-edited captions from Creative Studio before rendering
    platform_edits = _pull_platform_edits(session_id)
    if platform_edits and platform_edits.get("hasEdits"):
        ts_path = session.get("timestamps_path")
        _apply_caption_edits(ts_path, platform_edits.get("editedCaptions", []))
        _session_log(session_id, "render", f"applied {len(platform_edits.get('editedCaptions', []))} platform caption edits")

    from lib.timeline import build_filter_graph, run_ffmpeg
    from lib.captions import generate_ass_subtitles
    from lib.audio import build_audio_mix

    # Collect text_overlays from all storyboard scenes
    storyboard_for_overlays = session.get("storyboard", {})
    all_text_overlays = []
    for scene in storyboard_for_overlays.get("scenes", []):
        all_text_overlays.extend(scene.get("text_overlays", []))

    # Generate captions file if needed
    captions_path = None
    caption_style = session["caption_style"]
    has_overlays = bool(all_text_overlays)
    if (caption_style and caption_style != "none") or has_overlays:
        captions_path = str(_session_media_dir(session_id) / f"{session_id}-captions.ass")
        timestamps_path = session["timestamps_path"]
        if timestamps_path and os.path.exists(timestamps_path):
            with open(timestamps_path) as f:
                ts_data = json.load(f)
            generate_ass_subtitles(
                timestamps=ts_data,
                style_config=session.get("caption_config", {}),
                output_path=captions_path,
                resolution=plan["resolution"],
                text_overlays=all_text_overlays if has_overlays else None,
            )
            print(f"Captions generated: {captions_path}")
        elif has_overlays:
            # No voiceover timestamps but overlays exist -- generate overlays-only .ass
            generate_ass_subtitles(
                timestamps={},
                style_config=session.get("caption_config", {}),
                output_path=captions_path,
                resolution=plan["resolution"],
                text_overlays=all_text_overlays,
            )
            print(f"Overlay-only captions generated: {captions_path}")
        else:
            print("WARNING: No timestamps for captions. Skipping captions.")
            captions_path = None

    # Build audio mix -- use max of VO and video duration to avoid cutoff
    _post_slack_progress("Mixing audio...")
    audio_mix_path = str(_session_media_dir(session_id) / f"{session_id}-audio-mix.aac")
    vo_dur = plan.get("vo_duration", 0)
    video_dur = plan.get("total_duration", 0)
    audio_duration = max(vo_dur, video_dur) if vo_dur > 0 else video_dur
    build_audio_mix(
        voiceover_path=session["voiceover_path"],
        music_path=session.get("music_path"),
        music_volume=session.get("music_volume", 0.15),
        output_path=audio_mix_path,
        total_duration=audio_duration,
    )
    print(f"Audio mixed: {audio_mix_path}")

    # Build and run FFmpeg filter graph
    _post_slack_progress("Running FFmpeg assembly...")
    _session_log(session_id, "render", "starting FFmpeg assembly")
    output_path = plan["output_path"]
    filter_graph = build_filter_graph(
        scenes=plan["scenes"],
        resolution=plan["resolution"],
        captions_path=captions_path,
    )

    run_ffmpeg(
        scenes=plan["scenes"],
        audio_path=audio_mix_path,
        filter_graph=filter_graph,
        output_path=output_path,
        resolution=plan["resolution"],
    )

    session["render_done"] = True
    session["output_path"] = output_path
    save_session(session)
    _session_log(session_id, "render", f"complete: {output_path}")

    # Archive plan
    completed_plan = str(PLANS_DIR / "completed" / os.path.basename(plan_path))
    try:
        os.rename(plan_path, completed_plan)
    except OSError:
        pass

    file_size = os.path.getsize(output_path) / (1024 * 1024)  # MB
    print()
    print(f"Render complete: {output_path} ({file_size:.1f} MB)")

    # --- Automated QC Checks ---
    _session_log(session_id, "qc", "running automated quality checks")
    from lib.qc import run_qc, has_failures, has_warnings, format_report

    qc_results = run_qc(output_path, session, plan)
    session["qc_results"] = [r.to_dict() for r in qc_results]
    save_session(session)

    print()
    print(format_report(qc_results))

    if has_failures(qc_results):
        session["qc_passed"] = False
        save_session(session)
        _session_log(session_id, "qc", "FAILED -- delivery blocked")
        print()
        print("Delivery is BLOCKED until QC failures are fixed.")
        print("Fix the issues above, then re-render and re-run QC.")
        print(f"  video_editor_safe.sh render --session {session_id}")
        return

    session["qc_passed"] = True
    save_session(session)
    _session_log(session_id, "qc", "passed" + (" with warnings" if has_warnings(qc_results) else ""))

    print()
    print("NEXT STEP: Deliver the video (uploads to Slack + archives session):")
    print(f"  video_editor_safe.sh deliver --session {session_id}")

    _auto_sync(session_id)


# =====================================================================
# Command: preview-scene
# =====================================================================
def cmd_preview_scene():
    """Render a single scene for preview. No audio, with captions if enabled. ~5s output."""
    import subprocess as _subprocess

    session_id = os.environ["SESSION_ID"]
    scene_num = int(os.environ.get("SCENE_NUM", "1"))
    session = load_session(session_id)
    require_step(session, "normalize_done", "normalize")

    storyboard = session.get("storyboard", {})
    scenes = storyboard.get("scenes", [])

    scene = None
    for s in scenes:
        if s.get("scene_num") == scene_num:
            scene = s
            break
    if not scene:
        print(f"ERROR: Scene {scene_num} not found in storyboard.")
        sys.exit(1)

    normalized = session.get("normalized_clips", [])
    clip_path = None
    for nc in normalized:
        if nc.get("scene_num") == scene_num:
            clip_path = nc.get("path")
            break

    if not clip_path or not os.path.exists(clip_path):
        print(f"ERROR: Normalized clip for scene {scene_num} not found.")
        sys.exit(1)

    preview_path = str(_session_media_dir(session_id) / f"{session_id}-preview-scene{scene_num}.mp4")

    cmd = ["ffmpeg", "-y", "-i", clip_path]

    captions_path = str(_session_media_dir(session_id) / f"{session_id}-captions.ass")
    caption_style = session.get("caption_style", "none")
    if caption_style and caption_style != "none" and os.path.exists(captions_path):
        cmd.extend(["-vf", f"ass={captions_path}"])

    cmd.extend([
        "-an",
        "-t", "5",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        preview_path,
    ])

    result = _subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        print(f"ERROR: Preview render failed: {result.stderr[:200]}")
        sys.exit(1)

    scene_dur = float(scene.get("end", 0)) - float(scene.get("start", 0))
    print(f"Scene {scene_num} preview rendered: {preview_path}")
    print(f"  Role: {scene.get('role', 'unknown')}")
    print(f"  Duration: {scene_dur:.1f}s")
    print(f"  Description: {scene.get('description', '')[:80]}")
    print()
    print("Upload this preview to the Slack thread for user review.")


# =====================================================================
# Command: render-variant
# =====================================================================
def cmd_render_variant():
    """Render an alternate version with overridden settings. Does not modify session state."""
    session_id = os.environ["SESSION_ID"]
    suffix = os.environ["VARIANT_SUFFIX"]
    caption_style_override = os.environ.get("VARIANT_CAPTION_STYLE", "")
    music_volume_override = os.environ.get("VARIANT_MUSIC_VOLUME", "")

    _session_log(session_id, "render-variant", f"started suffix={suffix}")
    session = load_session(session_id)
    require_step(session, "render_done", "render")

    # Load completed plan from archive
    completed_plan_path = str(PLANS_DIR / "completed" / f"{session_id}-plan.json")
    if not os.path.exists(completed_plan_path):
        # Fall back to active plan directory in case render is fresh
        active_plan_path = session.get("plan_path", "")
        if active_plan_path and os.path.exists(active_plan_path):
            completed_plan_path = active_plan_path
        else:
            print("ERROR: Completed plan not found. The session plan may have been purged.")
            print("Variants require the plan file to be present in the plans/completed/ directory.")
            sys.exit(1)

    with open(completed_plan_path) as f:
        plan = json.load(f)

    # Apply overrides to a shallow copy — never mutate the session
    effective_session = dict(session)

    if caption_style_override:
        valid_styles = {"tiktok", "minimal", "bold", "karaoke", "subtitle", "centered", "typewriter", "bounce", "none"}
        if caption_style_override not in valid_styles:
            print(f"ERROR: Invalid --caption-style '{caption_style_override}'. Use: {', '.join(sorted(valid_styles))}")
            sys.exit(1)
        effective_session["caption_style"] = caption_style_override
        # Load preset config for the new style
        styles_path = SKILL_ROOT / "templates" / "caption_styles.json"
        if styles_path.exists() and caption_style_override != "none":
            with open(styles_path) as f:
                all_styles = json.load(f)
            effective_session["caption_config"] = all_styles.get(caption_style_override, {"style": caption_style_override})
        else:
            effective_session["caption_config"] = {}

    if music_volume_override:
        try:
            vol = float(music_volume_override)
            if not (0.0 <= vol <= 1.0):
                raise ValueError("out of range")
            effective_session["music_volume"] = vol
        except ValueError:
            print(f"ERROR: --music-volume must be a float between 0.0 and 1.0, got '{music_volume_override}'")
            sys.exit(1)

    _post_slack_progress(f"Rendering variant '{suffix}'...")
    _session_log(session_id, "render-variant", "generating captions + audio mix")

    from lib.timeline import build_filter_graph, run_ffmpeg
    from lib.captions import generate_ass_subtitles
    from lib.audio import build_audio_mix

    # Collect text_overlays from storyboard (inherited by all variants)
    variant_storyboard = effective_session.get("storyboard", {})
    variant_text_overlays = []
    for scene in variant_storyboard.get("scenes", []):
        variant_text_overlays.extend(scene.get("text_overlays", []))

    # Generate captions for this variant into a variant-specific file
    captions_path = None
    variant_caption_style = effective_session.get("caption_style", "")
    variant_has_overlays = bool(variant_text_overlays)
    if (variant_caption_style and variant_caption_style != "none") or variant_has_overlays:
        captions_path = str(_session_media_dir(session_id) / f"{session_id}-captions-{suffix}.ass")
        timestamps_path = effective_session.get("timestamps_path")
        if timestamps_path and os.path.exists(timestamps_path):
            with open(timestamps_path) as f:
                ts_data = json.load(f)
            generate_ass_subtitles(
                timestamps=ts_data,
                style_config=effective_session.get("caption_config", {}),
                output_path=captions_path,
                resolution=plan["resolution"],
                text_overlays=variant_text_overlays if variant_has_overlays else None,
            )
            print(f"Captions generated: {captions_path}")
        else:
            print("WARNING: No timestamps for captions. Skipping captions.")
            captions_path = None

    # Build audio mix for this variant
    _post_slack_progress("Mixing audio for variant...")
    audio_mix_path = str(_session_media_dir(session_id) / f"{session_id}-audio-mix-{suffix}.aac")
    vo_dur = plan.get("vo_duration", 0)
    video_dur = plan.get("total_duration", 0)
    audio_duration = max(vo_dur, video_dur) if vo_dur > 0 else video_dur
    build_audio_mix(
        voiceover_path=effective_session["voiceover_path"],
        music_path=effective_session.get("music_path"),
        music_volume=effective_session.get("music_volume", 0.15),
        output_path=audio_mix_path,
        total_duration=audio_duration,
    )
    print(f"Audio mixed: {audio_mix_path}")

    # Build and run FFmpeg filter graph
    _post_slack_progress("Running FFmpeg assembly for variant...")
    _session_log(session_id, "render-variant", "starting FFmpeg assembly")
    MEDIA_RENDERS_DIR.mkdir(parents=True, exist_ok=True)
    output_path = str(MEDIA_RENDERS_DIR / f"{session_id}-{suffix}.mp4")
    filter_graph = build_filter_graph(
        scenes=plan["scenes"],
        resolution=plan["resolution"],
        captions_path=captions_path,
    )

    run_ffmpeg(
        scenes=plan["scenes"],
        audio_path=audio_mix_path,
        filter_graph=filter_graph,
        output_path=output_path,
        resolution=plan["resolution"],
    )

    _session_log(session_id, "render-variant", f"complete: {output_path}")

    # Clean up variant intermediates
    for tmp_path in [audio_mix_path, captions_path]:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass

    # Record variant in session (append, do not overwrite existing entries)
    session = load_session(session_id)
    variants = session.get("render_variants", [])
    variants.append({
        "suffix": suffix,
        "path": output_path,
        "caption_style": effective_session.get("caption_style"),
        "voice_name": effective_session.get("voice_name"),
        "music_volume": effective_session.get("music_volume", 0.15),
    })
    session["render_variants"] = variants
    save_session(session)

    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print()
    print(f"Variant render complete: {output_path} ({file_size:.1f} MB)")
    print(f"  Suffix: {suffix}")
    print(f"  Caption style: {effective_session.get('caption_style', 'none')}")
    print(f"  Music volume: {effective_session.get('music_volume', 0.15):.2f}")
    print()
    print("Upload this variant to the Slack thread for user review.")


# =====================================================================
# Command: batch-variants
# =====================================================================
def cmd_batch_variants():
    """Render multiple variants in one pass with intelligent step-skipping.

    Reads BATCH_VARIANTS_JSON from env: a JSON array of variant specs:
      [{"suffix": "bold-adam", "caption_style": "bold", "voice_name": "Adam"},
       {"suffix": "tiktok-bella", "caption_style": "tiktok", "voice_name": "Bella"},
       {"suffix": "centered-no-music", "caption_style": "centered", "music_volume": 0}]

    Per variant:
      - Voiceover is reused if voice_name is unchanged (skips ElevenLabs).
      - Captions are always regenerated (style may differ).
      - Audio mix is always regenerated (volume may differ).
      - FFmpeg renders each variant independently.

    Reports per-variant progress and a summary at the end.
    """
    session_id = os.environ["SESSION_ID"]
    variants_json = os.environ["BATCH_VARIANTS_JSON"]

    _session_log(session_id, "batch-variants", "started")
    session = load_session(session_id)
    require_step(session, "render_done", "render")

    try:
        variants = json.loads(variants_json)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid --variants JSON: {e}")
        sys.exit(1)

    if not isinstance(variants, list) or not variants:
        print("ERROR: --variants must be a non-empty JSON array.")
        sys.exit(1)

    valid_styles = {
        "tiktok", "minimal", "bold", "karaoke", "subtitle",
        "centered", "typewriter", "bounce", "none",
    }

    seen_suffixes: set[str] = set()
    for vi, v in enumerate(variants, 1):
        if not isinstance(v, dict):
            print(f"ERROR: Variant {vi} must be a JSON object.")
            sys.exit(1)
        suffix = v.get("suffix", "")
        if not suffix:
            print(f"ERROR: Variant {vi} missing 'suffix'.")
            sys.exit(1)
        if suffix in seen_suffixes:
            print(f"ERROR: Duplicate suffix '{suffix}' in variants.")
            sys.exit(1)
        seen_suffixes.add(suffix)
        caption_style = v.get("caption_style", "")
        if caption_style and caption_style not in valid_styles:
            print(f"ERROR: Variant '{suffix}' invalid caption_style '{caption_style}'.")
            print(f"  Valid styles: {', '.join(sorted(valid_styles))}")
            sys.exit(1)
        music_volume = v.get("music_volume")
        if music_volume is not None:
            try:
                vol = float(music_volume)
                if not (0.0 <= vol <= 1.0):
                    raise ValueError("out of range")
            except (ValueError, TypeError):
                print(f"ERROR: Variant '{suffix}' music_volume must be 0.0-1.0.")
                sys.exit(1)

    # Load plan from archive
    completed_plan_path = str(PLANS_DIR / "completed" / f"{session_id}-plan.json")
    if not os.path.exists(completed_plan_path):
        active_plan_path = session.get("plan_path", "")
        if active_plan_path and os.path.exists(active_plan_path):
            completed_plan_path = active_plan_path
        else:
            print("ERROR: Completed plan not found. batch-variants requires the plan file.")
            print("  Expected: " + str(PLANS_DIR / "completed" / f"{session_id}-plan.json"))
            sys.exit(1)

    with open(completed_plan_path) as f:
        plan = json.load(f)

    # Load caption style presets once
    styles_path = SKILL_ROOT / "templates" / "caption_styles.json"
    all_styles: dict = {}
    if styles_path.exists():
        with open(styles_path) as f:
            all_styles = json.load(f)

    # Collect text_overlays from storyboard (constant across all variants)
    storyboard = session.get("storyboard", {})
    global_text_overlays: list[dict] = []
    for scene in storyboard.get("scenes", []):
        global_text_overlays.extend(scene.get("text_overlays", []))

    from lib.timeline import build_filter_graph, run_ffmpeg
    from lib.captions import generate_ass_subtitles
    from lib.audio import build_audio_mix
    from lib.voiceover import generate_full_voiceover, resolve_voice

    # Voiceover cache: normalised voice name -> (vo_path, ts_path, ts_data)
    base_voice_name = session.get("voice_name", "")
    base_vo_path = session.get("voiceover_path", "")
    base_ts_path = session.get("timestamps_path", "")
    base_ts_data: dict = {}
    if base_ts_path and os.path.exists(base_ts_path):
        with open(base_ts_path) as f:
            base_ts_data = json.load(f)

    vo_cache: dict[str, tuple[str, str, dict]] = {}
    if base_voice_name and base_vo_path and os.path.exists(base_vo_path):
        vo_cache[base_voice_name.lower()] = (base_vo_path, base_ts_path, base_ts_data)

    results: list[dict] = []

    print(f"=== BATCH VARIANTS: {len(variants)} variant(s) for session {session_id} ===")
    print()

    for vi, variant in enumerate(variants, 1):
        suffix = variant["suffix"]
        caption_style = variant.get("caption_style") or session.get("caption_style", "tiktok")
        voice_name_req = variant.get("voice_name") or base_voice_name
        music_volume = variant.get("music_volume")
        if music_volume is None:
            music_volume = session.get("music_volume", 0.15)
        else:
            music_volume = float(music_volume)

        print(f"[{vi}/{len(variants)}] Variant: {suffix}")
        print(f"  caption_style={caption_style}  voice={voice_name_req}  music_vol={music_volume:.2f}")

        try:
            # Step 1: Voiceover (reuse if same voice, regenerate if different)
            vo_cache_key = voice_name_req.lower() if voice_name_req else ""
            if vo_cache_key in vo_cache:
                vo_path, ts_path, ts_data = vo_cache[vo_cache_key]
                print(f"  [SKIP] Voiceover reused ({voice_name_req})")
            else:
                print(f"  [GEN ] Voiceover for voice '{voice_name_req}'...")
                resolved_voice_id, resolved_name = resolve_voice(voice_name_req, "")
                vo_path = str(
                    _session_media_dir(session_id) / f"{session_id}-vo-{suffix}.mp3"
                )
                ts_path = str(
                    _session_media_dir(session_id) / f"{session_id}-ts-{suffix}.json"
                )
                script = session.get("voiceover_script", "")
                if not script:
                    raise ValueError(
                        "Session has no voiceover_script; cannot regenerate voiceover for a different voice."
                    )
                generate_full_voiceover(script, resolved_voice_id, vo_path, ts_path)
                ts_data = {}
                if os.path.exists(ts_path):
                    with open(ts_path) as f:
                        ts_data = json.load(f)
                vo_cache[vo_cache_key] = (vo_path, ts_path, ts_data)
                print(f"  [DONE] Voiceover: {os.path.basename(vo_path)}")

            # Step 2: Generate captions
            captions_path = None
            has_overlays = bool(global_text_overlays)
            if (caption_style and caption_style != "none") or has_overlays:
                captions_path = str(
                    _session_media_dir(session_id) / f"{session_id}-captions-{suffix}.ass"
                )
                caption_config = all_styles.get(caption_style, {"style": caption_style})
                generate_ass_subtitles(
                    timestamps=ts_data,
                    style_config=caption_config,
                    output_path=captions_path,
                    resolution=plan["resolution"],
                    text_overlays=global_text_overlays if has_overlays else None,
                )
                print(f"  [GEN ] Captions: {os.path.basename(captions_path)}")

            # Step 3: Audio mix
            audio_mix_path = str(
                _session_media_dir(session_id) / f"{session_id}-audio-mix-{suffix}.aac"
            )
            vo_dur = ts_data.get("total_duration", 0)
            video_dur = plan.get("total_duration", 0)
            audio_duration = max(vo_dur, video_dur) if vo_dur > 0 else video_dur
            build_audio_mix(
                voiceover_path=vo_path,
                music_path=session.get("music_path"),
                music_volume=music_volume,
                output_path=audio_mix_path,
                total_duration=audio_duration,
            )
            print(f"  [GEN ] Audio mix: {os.path.basename(audio_mix_path)}")

            # Step 4: FFmpeg render
            output_path = str(
                _session_media_dir(session_id) / f"{session_id}-{suffix}.mp4"
            )
            filter_graph = build_filter_graph(
                scenes=plan["scenes"],
                resolution=plan["resolution"],
                captions_path=captions_path,
            )
            run_ffmpeg(
                scenes=plan["scenes"],
                audio_path=audio_mix_path,
                filter_graph=filter_graph,
                output_path=output_path,
                resolution=plan["resolution"],
            )

            # Step 5: Cleanup intermediates
            for tmp in [audio_mix_path, captions_path]:
                if tmp and os.path.exists(tmp):
                    try:
                        os.remove(tmp)
                    except OSError:
                        pass

            file_size = os.path.getsize(output_path) / (1024 * 1024)
            print(f"  [DONE] {file_size:.1f} MB -> {output_path}")
            _session_log(session_id, "batch-variants", f"completed {suffix}: {output_path}")

            results.append({
                "suffix": suffix,
                "status": "ok",
                "path": output_path,
                "size_mb": round(file_size, 1),
                "caption_style": caption_style,
                "voice_name": voice_name_req,
                "music_volume": music_volume,
            })

        except Exception as exc:
            print(f"  [FAIL] {suffix}: {exc}")
            _session_log(session_id, "batch-variants", f"FAILED {suffix}: {exc}")
            results.append({
                "suffix": suffix,
                "status": "failed",
                "error": str(exc),
            })

        print()

    # Persist successful variants into session
    session = load_session(session_id)
    existing_variants = session.get("render_variants", [])
    existing_suffixes = {v["suffix"] for v in existing_variants}
    for r in results:
        if r["status"] == "ok" and r["suffix"] not in existing_suffixes:
            existing_variants.append({
                "suffix": r["suffix"],
                "path": r["path"],
                "caption_style": r["caption_style"],
                "voice_name": r["voice_name"],
                "music_volume": r["music_volume"],
            })
    session["render_variants"] = existing_variants
    save_session(session)

    ok_results = [r for r in results if r["status"] == "ok"]
    failed_results = [r for r in results if r["status"] == "failed"]

    print("=== BATCH VARIANTS SUMMARY ===")
    for r in results:
        if r["status"] == "ok":
            print(f"  OK    {r['suffix']:<30s} {r['size_mb']:5.1f} MB  {r['path']}")
        else:
            print(f"  FAIL  {r['suffix']:<30s} {r.get('error', 'unknown error')}")
    print()
    print(f"Completed: {len(ok_results)}/{len(results)} variants succeeded.")
    if failed_results:
        print(f"  {len(failed_results)} failed -- see errors above.")
        sys.exit(1)


# =====================================================================
# Command: deliver
# =====================================================================
def cmd_deliver():
    session_id = os.environ["SESSION_ID"]
    _session_log(session_id, "deliver", "started")
    session = load_session(session_id)
    require_step(session, "render_done", "render")

    output_path = session.get("output_path")
    if not output_path or not os.path.exists(output_path):
        print(f"ERROR: Output file missing: {output_path}")
        sys.exit(1)

    # Read channel/thread from session JSON first, env vars as fallback
    channel = session.get("slack_channel_id") or os.environ.get("SLACK_CHANNEL_ID", "")
    thread_ts = session.get("slack_thread_ts") or os.environ.get("SLACK_THREAD_TS", "")

    if not channel:
        print("ERROR: No Slack channel available (not in session or env vars).")
        print("Set SLACK_CHANNEL_ID env var and retry.")
        sys.exit(1)

    # Upload BEFORE archive — if upload fails, session stays active for retry
    from lib.slack_upload import upload_to_slack

    title_parts = [session_id]
    storyboard = session.get("storyboard", {})
    if storyboard.get("title"):
        title_parts = [storyboard["title"]]
    title = f"{' '.join(title_parts)} ({session.get('aspect_ratio', '?')})"

    print(f"Uploading video to Slack...")
    success = upload_to_slack(
        Path(output_path),
        title,
        channel=channel,
        thread_ts=thread_ts,
    )

    if not success:
        _session_log(session_id, "deliver", "FAILED: Slack upload failed")
        print()
        print("ERROR: Slack upload failed. Session is still active — fix the issue and retry:")
        print(f"  video_editor_safe.sh deliver --session {session_id}")
        sys.exit(1)

    _session_log(session_id, "deliver", f"uploaded to {channel}")
    # Upload succeeded — mark delivered and archive
    session["delivered"] = True
    save_session(session)

    # Archive session
    session_file = SESSIONS_DIR / f"{session_id}.json"
    archived = SESSIONS_DIR / "completed" / f"{session_id}.json"
    try:
        os.rename(str(session_file), str(archived))
    except OSError:
        pass

    print()
    print(f"Session {session_id} delivered successfully.")
    print(f"  Output: {output_path}")
    print(f"  Channel: {channel}")
    if thread_ts:
        print(f"  Thread: {thread_ts}")

    # Show music attribution if applicable
    if session.get("music_attribution"):
        from lib.music import get_attribution_text
        attr_text = get_attribution_text(session)
        if attr_text:
            print()
            print(f"  {attr_text}")

    print()
    print("Session complete. Archived.")

    synced_project_id = _auto_sync(session_id)
    if synced_project_id and synced_project_id != "unknown":
        platform_url = os.environ.get("CGK_PLATFORM_API_URL", "").rstrip("/")
        if platform_url.endswith("/api"):
            platform_url = platform_url[:-4]
        if not platform_url:
            platform_url = "https://cgk-admin.vercel.app"
        print(f"  Creative Studio: {platform_url}/admin/creative-studio/{synced_project_id}")

    # Auto-cleanup session intermediates (keep final render + voiceover)
    gc_count = _gc_session_artifacts(session_id, session)
    if gc_count > 0:
        print(f"  Cleaned up {gc_count} intermediate file(s).")

    # Auto-process pending catalog entries from this session
    try:
        pending_count = cmd_catalog_pending(silent=True)
        if pending_count and pending_count > 0:
            print(f"  {pending_count} clip(s) added to master catalog from this session.")
    except Exception:
        pass


# =====================================================================
# Helper: Garbage-collect session intermediate files
# =====================================================================
def _gc_session_artifacts(session_id: str, session: dict, dry_run: bool = False) -> int:
    """Delete intermediate files for a completed session.

    Keeps: final render, voiceover audio.
    Deletes: normalized clips, audio mix, ASS captions, voice preview, timestamps JSON.

    Returns count of files deleted.
    """
    output_path = session.get("output_path", "")
    voiceover_path = session.get("voiceover_path", "")

    # Patterns to clean up (session-prefixed intermediates)
    patterns = [
        f"{session_id}-norm-*.mp4",       # Normalized clips
        f"{session_id}-audio-mix.aac",    # Audio mix
        f"{session_id}-audio-mix-*.aac",  # Variant audio mixes
        f"{session_id}-captions.ass",     # Caption file
        f"{session_id}-captions-*.ass",   # Variant caption files
        f"{session_id}-voice-preview.mp3",# Voice preview
        f"{session_id}-timestamps.json",  # Timestamp data
    ]

    # Search both old flat layout and new structured sessions/ layout
    import glob
    search_dirs = [MEDIA_DIR]
    session_subdir = MEDIA_SESSIONS_DIR / session_id
    if session_subdir.exists():
        search_dirs.append(session_subdir)

    deleted = 0
    for pattern in patterns:
        for search_dir in search_dirs:
            for filepath in glob.glob(str(search_dir / pattern)):
                # Never delete the final render or voiceover
                if filepath == output_path or filepath == voiceover_path:
                    continue
                if dry_run:
                    print(f"  [dry-run] Would delete: {os.path.basename(filepath)}")
                else:
                    try:
                        os.remove(filepath)
                    except OSError:
                        pass
                deleted += 1

    return deleted


# =====================================================================
# Command: gc — Garbage-collect session artifacts
# =====================================================================
def cmd_gc():
    """Clean up intermediate files from completed sessions.

    --dry-run: Show what would be deleted without deleting.
    --aggressive: Also clean up orphan files (no matching session).
    """
    dry_run = os.environ.get("GC_DRY_RUN", "") == "1"
    aggressive = os.environ.get("GC_AGGRESSIVE", "") == "1"

    completed_dir = SESSIONS_DIR / "completed"
    if not completed_dir.exists():
        print("No completed sessions found.")
        return

    total_deleted = 0

    # Phase 1: Clean intermediates from completed sessions
    session_files = sorted(completed_dir.glob("*.json"))
    session_files = [f for f in session_files if "catalog" not in f.name]

    print(f"Scanning {len(session_files)} completed session(s)...")
    for sf in session_files:
        try:
            session = json.loads(sf.read_text())
        except (json.JSONDecodeError, OSError):
            continue
        sid = session.get("session_id", sf.stem)
        count = _gc_session_artifacts(sid, session, dry_run=dry_run)
        if count > 0:
            print(f"  {sid}: {count} intermediate(s) {'would be' if dry_run else ''} deleted")
            total_deleted += count

    # Phase 2: Aggressive -- find orphan session files in media dir
    if aggressive:
        import glob
        import re as re_mod

        known_sids = set()
        for sf in session_files:
            known_sids.add(sf.stem)
        # Also check active sessions
        for sf in SESSIONS_DIR.glob("*.json"):
            if "catalog" not in sf.name:
                known_sids.add(sf.stem)

        # Scan both flat layout and structured sessions/ layout for orphan norm clips
        orphan_dirs = [MEDIA_DIR]
        if MEDIA_SESSIONS_DIR.exists():
            orphan_dirs.extend(
                d for d in MEDIA_SESSIONS_DIR.iterdir() if d.is_dir()
            )

        for search_dir in orphan_dirs:
            for filepath in glob.glob(str(search_dir / "vid-*-norm-*.mp4")):
                basename = os.path.basename(filepath)
                # Extract session ID from filename: vid-YYYYMMDD-HHMMSS-NNNNN-norm-N.mp4
                match = re_mod.match(r"(vid-\d{8}-\d{6}-\d+)-norm-", basename)
                if match:
                    sid = match.group(1)
                    if sid not in known_sids:
                        if dry_run:
                            print(f"  [orphan] Would delete: {basename}")
                        else:
                            try:
                                os.remove(filepath)
                            except OSError:
                                pass
                        total_deleted += 1

    mode = "[dry-run] " if dry_run else ""
    print(f"\n{mode}Total: {total_deleted} file(s) {'would be ' if dry_run else ''}cleaned up.")


# =====================================================================
# Command: list-catalogs — List all saved catalogs
# =====================================================================
def cmd_list_catalogs():
    from lib.catalog_store import CatalogStore

    store = CatalogStore(str(PROFILE_ROOT))
    sort_by = os.environ.get("SORT_BY", "created")
    tag_filter = os.environ.get("TAG_FILTER", "") or None
    source_filter = os.environ.get("SOURCE_FILTER", "") or None
    limit = int(os.environ.get("LIMIT", "20"))
    offset = int(os.environ.get("OFFSET", "0"))

    catalogs, total = store.list_catalogs(
        sort_by=sort_by,
        tag_filter=tag_filter,
        source_filter=source_filter,
        limit=limit,
        offset=offset,
    )

    print("=== FOOTAGE CATALOGS ===")
    print(f"Showing {len(catalogs)} of {total} catalogs")
    if tag_filter:
        print(f"  Filter: tag={tag_filter}")
    if source_filter:
        print(f"  Filter: source={source_filter}")
    print()

    if not catalogs:
        print("  No catalogs found.")
        print("  Create one with: video_editor_safe.sh analyze-footage --gdrive <folder>")
        return

    for cat in catalogs:
        cat_id = cat.get("catalog_id", "?")
        name = cat.get("name", cat_id)
        clips = cat.get("clip_count", 0)
        segs = cat.get("segment_count", 0)
        dur = cat.get("total_duration", 0)
        created = cat.get("created", "?")[:10]
        tags = ", ".join(cat.get("tags", [])) or "none"
        source_short = cat.get("source", "")[:40]

        print(f"  {cat_id}")
        print(f"    Name: {name}")
        print(f"    Source: {source_short}")
        print(f"    Clips: {clips}, Segments: {segs}, Duration: {dur:.1f}s")
        print(f"    Tags: {tags}")
        print(f"    Created: {created}")
        print()

    if total > offset + limit:
        print(f"  ... {total - offset - limit} more. Use --offset {offset + limit} to see next page.")


# =====================================================================
# Command: search-clips — Search segments across all catalogs
# =====================================================================
def _format_quality_stars(score: float | int | None) -> str:
    """Format a 1-5 quality score as a bracketed text rating, e.g. '[4/5]'."""
    if score is None:
        return ""
    try:
        rounded = max(1, min(5, round(float(score))))
        return f"[{rounded}/5]"
    except (TypeError, ValueError):
        return ""


def cmd_search_clips():
    from lib.catalog_store import CatalogStore

    store = CatalogStore(str(PROFILE_ROOT))
    query = os.environ.get("SEARCH_QUERY", "")
    catalog_id = os.environ.get("CATALOG_ID", "") or None
    limit = int(os.environ.get("LIMIT", "20"))
    offset = int(os.environ.get("OFFSET", "0"))
    min_quality_raw = os.environ.get("MIN_QUALITY", "").strip()
    min_quality = int(min_quality_raw) if min_quality_raw else None

    if min_quality is not None and not (1 <= min_quality <= 5):
        print(f"ERROR: --min-quality must be 1-5, got {min_quality}.")
        sys.exit(1)

    if not query:
        print("ERROR: SEARCH_QUERY not set. Pass --query <text>.")
        sys.exit(1)

    # Try semantic search first (if embeddings exist)
    semantic_results = []
    try:
        from lib.embeddings import EmbeddingStore
        emb_store = EmbeddingStore(str(PROFILE_ROOT))
        if emb_store.has_embeddings():
            semantic_results = emb_store.search(
                query=query,
                top_k=limit + offset,
                catalog_id=catalog_id,
            )
    except Exception:
        pass  # Fall through to keyword search

    if semantic_results:
        # Paginate
        total = len(semantic_results)
        page = semantic_results[offset:offset + limit]

        print(f'=== CLIP SEARCH (semantic): "{query}" ===')
        print(f"Found {total} matching segments (showing {len(page)})")
        print()

        if not page:
            print("  No matching segments found.")
            return

        for r in page:
            ref = r["clip_ref"]
            text = r.get("text", "")
            score = r.get("score", 0)
            quality = r.get("clip_quality_score")
            quality_label = f"  quality: {_format_quality_stars(quality)}" if quality is not None else ""

            print(f"  {ref}  (relevance: {score:.2f}){quality_label}")
            print(f"    {text}")
            print()

        if total > offset + limit:
            print(f"  ... {total - offset - limit} more. Use --offset {offset + limit}")
        return

    # Fallback: keyword search
    exclude_heavy = os.environ.get("EXCLUDE_HEAVY_TEXT", "") == "1"
    results, total = store.search_clips(
        query=query,
        catalog_id=catalog_id,
        limit=limit,
        offset=offset,
        exclude_heavy_text=exclude_heavy,
        min_quality=min_quality,
    )

    mode_label = "keyword"
    if exclude_heavy:
        mode_label += ", excluding heavy-text clips"
    if min_quality is not None:
        mode_label += f", quality >={min_quality}/5"
    print(f'=== CLIP SEARCH ({mode_label}): "{query}" ===')
    print(f"Found {total} matching segments (showing {len(results)})")
    print()

    if not results:
        print("  No matching segments found.")
        if min_quality is not None:
            print(f"  TIP: Lower --min-quality (currently {min_quality}) to see more results.")
        print("  TIP: Run 'build-embeddings' for semantic search (matches meaning, not just keywords).")
        return

    for r in results:
        seg = r["segment"]
        ref = r["clip_ref"]
        desc = seg.get("description", "")
        camera = seg.get("camera", "")
        mood = seg.get("mood", "")
        subjects = seg.get("subjects", "")
        cat_name = r.get("catalog_name", r["catalog_id"])
        has_captions = r.get("has_burned_captions", False)
        clip_quality = r.get("clip_quality_score")
        seg_quality = seg.get("quality_score")
        seg_quality_notes = seg.get("quality_notes", "")

        caption_badge = " [BURNED CAPTIONS]" if has_captions else ""
        quality_badge = f"  quality: {_format_quality_stars(clip_quality)}" if clip_quality is not None else ""
        print(f"  {ref}{caption_badge}{quality_badge}")
        print(f"    {desc}")
        if subjects:
            print(f"    subjects: {subjects}")
        detail = f"{camera}, {mood}" if camera and mood else camera or mood
        if detail:
            print(f"    ({detail})")
        if seg_quality is not None and seg_quality_notes:
            print(f"    segment quality: {_format_quality_stars(seg_quality)} -- {seg_quality_notes}")
        print(f"    Catalog: {cat_name}")
        print()

    if total > offset + limit:
        print(f"  ... {total - offset - limit} more. Use --offset {offset + limit}")

    # DAM-enhanced search: query remote DAM for additional results
    _search_dam_clips(query, results, limit, min_quality, exclude_heavy)


def _search_dam_clips(query, local_results, limit, min_quality, exclude_heavy):
    """Query remote DAM for clips not in local results. Non-fatal."""
    try:
        from lib.dam_client import DAMClient
        client = DAMClient()
        if not client.configured:
            return

        dam_results = client.search_clips(
            query=query,
            limit=limit,
            min_quality=min_quality or 0,
            exclude_burned=exclude_heavy,
        )
        if not dam_results:
            return

        # Deduplicate against local results by filename
        local_filenames = set()
        for r in local_results:
            fname = r.get("filename", "")
            if fname:
                local_filenames.add(fname)
            # Also extract from clip_ref
            ref = r.get("clip_ref", "")
            if ref.startswith("clip:"):
                parts = ref[5:].split("@")
                if parts:
                    local_filenames.add(parts[0])

        dam_only = []
        for r in dam_results:
            # DAM search returns segment rows with asset_id, title, etc.
            key = r.get("openclaw_catalog_id", "") or r.get("title", "")
            if key and key not in local_filenames:
                dam_only.append(r)

        if not dam_only:
            return

        print(f"\n  --- DAM-only results ({len(dam_only)}) ---")
        for r in dam_only:
            title = r.get("title", "?")
            desc = r.get("segment_description", r.get("description", ""))
            start = r.get("start_time", 0)
            end = r.get("end_time", 0)
            quality = r.get("quality_score")
            quality_label = f"  quality: {_format_quality_stars(quality)}" if quality else ""
            catalog_id = r.get("openclaw_catalog_id", title)
            ref = f"clip:{catalog_id}@{start}-{end}" if start or end else f"clip:{catalog_id}"
            print(f"  [DAM] {ref}{quality_label}")
            if desc:
                print(f"    {desc}")
            print()
    except Exception:
        pass  # Non-fatal: DAM search failure does not block local search


# =====================================================================
# Command: use-template — Generate storyboard from a template
# =====================================================================
def cmd_use_template():
    """Load a storyboard template and compute proportional scene timings.

    Templates are in templates/storyboards/*.json. Each scene has a
    duration_fraction that is multiplied by the total duration.

    Outputs a ready-to-customize storyboard JSON.
    """
    template_id = os.environ.get("TEMPLATE_ID", "")
    brand = _load_brand_defaults()

    duration_env = os.environ.get("TEMPLATE_DURATION", "")
    if duration_env:
        total_duration = float(duration_env)
    else:
        total_duration = float(brand.get("max_duration", 30))

    # Find template
    templates_dir = SKILL_ROOT / "templates" / "storyboards"
    if not templates_dir.exists():
        print(f"ERROR: Templates directory not found: {templates_dir}")
        sys.exit(1)

    if not template_id:
        # List available templates
        print("Available storyboard templates:")
        print()
        for tf in sorted(templates_dir.glob("*.json")):
            try:
                tmpl = json.loads(tf.read_text())
                tid = tmpl.get("template_id", tf.stem)
                name = tmpl.get("name", tid)
                desc = tmpl.get("description", "")
                scenes = len(tmpl.get("scenes", []))
                print(f"  {tid}")
                print(f"    {name} ({scenes} scenes)")
                if desc:
                    print(f"    {desc[:80]}...")
                print()
            except (json.JSONDecodeError, OSError):
                continue
        print("Usage: video_editor_safe.sh use-template --template <id> --duration <seconds>")
        return

    template_file = templates_dir / f"{template_id}.json"
    if not template_file.exists():
        print(f"ERROR: Template '{template_id}' not found at {template_file}")
        print("Run 'use-template' without arguments to list available templates.")
        sys.exit(1)

    tmpl = json.loads(template_file.read_text())

    # Build storyboard from template with proportional timings
    scenes = []
    running_time = 0.0
    for i, scene_tmpl in enumerate(tmpl.get("scenes", []), 1):
        fraction = scene_tmpl.get("duration_fraction", 0.15)
        scene_dur = round(total_duration * fraction, 1)
        start = round(running_time, 1)
        end = round(running_time + scene_dur, 1)

        scenes.append({
            "scene_num": i,
            "start": start,
            "end": end,
            "role": scene_tmpl.get("role", ""),
            "text": scene_tmpl.get("text", ""),
            "description": scene_tmpl.get("description", ""),
            "footage_source": scene_tmpl.get("footage_source", f"stock:{scene_tmpl.get('footage_hint', '')}"),
            "footage_hint": scene_tmpl.get("footage_hint", ""),
            "transition": scene_tmpl.get("transition", "crossfade"),
        })
        running_time = end

    preferred_moods = brand.get("preferred_moods", [])
    default_mood = preferred_moods[0] if preferred_moods else ""

    storyboard = {
        "title": f"{tmpl.get('name', template_id)} Ad",
        "template_id": template_id,
        "total_duration": total_duration,
        "mood": default_mood,
        "scenes": scenes,
        "voiceover_script": tmpl.get("voiceover_template", ""),
    }

    # Output as formatted JSON
    output = json.dumps(storyboard, indent=2)
    print(f"=== Storyboard Template: {tmpl.get('name', template_id)} ===")
    print(f"Total duration: {total_duration}s, {len(scenes)} scenes")
    if brand:
        duration_source = "brand default" if not os.environ.get("TEMPLATE_DURATION") else "user arg"
        print(f"Brand defaults applied ({brand.get('brand_name', 'unknown')}):")
        print(f"  Duration: {total_duration}s ({duration_source})")
        if default_mood:
            print(f"  Mood: {default_mood} (from preferred_moods)")
        preferred_sources = brand.get("preferred_footage_sources", [])
        if preferred_sources:
            print(f"  Preferred footage: {', '.join(preferred_sources)}")
    print()
    print("Generated storyboard JSON (customize {{variables}} before using):")
    print()
    print(output)
    print()
    print("NEXT STEPS:")
    print("  1. Copy the JSON above")
    print("  2. Replace all {{variable}} placeholders with your content")
    print("  3. Update footage_source for each scene (stock:, clip:, gdrive:, etc.)")
    print("  4. Set the storyboard:")
    print("     video_editor_safe.sh set-storyboard --session <ID> --storyboard '<JSON>'")


# =====================================================================
# Command: catalog-audit-text — Audit clips for burned-in text overlays
# =====================================================================
def cmd_catalog_audit_text():
    """Audit all cataloged clips for text overlay contamination.

    Reports clips with heavy burned-in captions that will cause
    double-text when used with new caption overlays.
    """
    from lib.catalog_store import CatalogStore

    store = CatalogStore(str(PROFILE_ROOT))
    audit = store.audit_text_overlays()

    print("=" * 60)
    print("CATALOG TEXT OVERLAY AUDIT")
    print("=" * 60)
    print()
    print(f"Total clips analyzed: {audit['total_clips']}")
    print(f"  Clean (no text):    {audit['clean_count']}")
    print(f"  Light text:         {audit['light_count']}")
    print(f"  Heavy text:         {audit['heavy_count']}")
    print(f"  Unknown (no data):  {audit['unknown_count']}")
    print()

    if audit["heavy_clips"]:
        print("--- HEAVY (will contaminate new captions) ---")
        for clip in audit["heavy_clips"]:
            pct = (clip["segments_heavy"] / max(clip["segments_total"], 1)) * 100
            print(f"  {clip['filename']}")
            print(f"    {clip['segments_heavy']}/{clip['segments_total']} segments ({pct:.0f}%) have heavy text")
            print(f"    Catalog: {clip['catalog_id']}")
        print()

    if audit["light_clips"]:
        print("--- LIGHT (small watermarks/logos, usually safe) ---")
        for clip in audit["light_clips"][:10]:
            print(f"  {clip['filename']}  (catalog: {clip['catalog_id']})")
        if len(audit["light_clips"]) > 10:
            print(f"  ... and {len(audit['light_clips']) - 10} more")
        print()

    if audit["unknown_count"] > 0:
        print("--- UNKNOWN (cataloged before text overlay analysis) ---")
        print(f"  {audit['unknown_count']} clips lack text_overlay_severity data.")
        print("  To backfill: re-catalog these clips with 'analyze-footage'.")
        print("  New catalogs will automatically include text overlay analysis.")
        print()

    if audit["heavy_count"] == 0:
        print("All clips are clean or light-text. No contamination risk.")
    else:
        print(f"ACTION: {audit['heavy_count']} clip(s) have heavy burned-in text.")
        print("Use '--exclude-heavy-text' with search-clips to filter them out.")


# =====================================================================
# Command: attach-catalog — Attach existing catalog to a session
# =====================================================================
def cmd_attach_catalog():
    from lib.catalog_store import CatalogStore

    session_id = os.environ["SESSION_ID"]
    catalog_id = os.environ["CATALOG_ID"]

    session = load_session(session_id)
    store = CatalogStore(str(PROFILE_ROOT))

    catalog = store.get_catalog(catalog_id)
    if catalog is None:
        print(f"ERROR: Catalog '{catalog_id}' not found.")
        print("Run: video_editor_safe.sh list-catalogs")
        sys.exit(1)

    cat_dir = store.root / catalog_id
    session["footage_catalog_done"] = True
    session["footage_catalog_path"] = str(cat_dir / "catalog.json")
    session["footage_catalog_id"] = catalog_id
    session["footage_catalog_summary"] = [
        {
            "filename": c["filename"],
            "duration": c.get("duration", 0),
            "segments_count": len(c.get("segments", [])),
        }
        for c in catalog.get("clips", [])
    ]
    save_session(session)

    print(f"Catalog '{catalog.get('name', catalog_id)}' attached to session {session_id}.")
    print(f"  {catalog['clip_count']} clips, {catalog['total_duration']:.1f}s")
    print()
    print("Catalog clips are now available as clip: references in your storyboard.")
    print(f"NEXT STEP: video_editor_safe.sh storyboard --session {session_id}")


# =====================================================================
# Command: rename-catalog — Rename a catalog
# =====================================================================
def cmd_rename_catalog():
    from lib.catalog_store import CatalogStore

    catalog_id = os.environ["CATALOG_ID"]
    new_name = os.environ["CATALOG_NAME"]

    store = CatalogStore(str(PROFILE_ROOT))
    if store.rename_catalog(catalog_id, new_name):
        print(f"Catalog '{catalog_id}' renamed to '{new_name}'.")
    else:
        print(f"ERROR: Catalog '{catalog_id}' not found.")
        sys.exit(1)


# =====================================================================
# Command: cleanup-media — Clean up expired local media files
# =====================================================================
def cmd_cleanup_media():
    from lib.catalog_store import CatalogStore, REDOWNLOADABLE_SOURCE_TYPES as REDOWNLOADABLE_TYPES

    store = CatalogStore(str(PROFILE_ROOT))
    ttl_days = int(os.environ.get("TTL_DAYS", "7"))
    ttl_seconds = ttl_days * 86400
    dry_run = os.environ.get("DRY_RUN", "") == "1"
    force = os.environ.get("FORCE", "") == "1"
    report = os.environ.get("REPORT", "") == "1"
    dam_verified = os.environ.get("DAM_VERIFIED", "") == "1"

    # DAM-verified cleanup: only delete files with confirmed DAM copies
    if dam_verified:
        _cleanup_dam_verified(store, dry_run)
        return

    if report:
        # Disk usage report
        disk = store.get_disk_report()
        print("=== MEDIA DISK USAGE REPORT ===")
        print()

        def fmt_size(b):
            if b >= 1_000_000_000:
                return f"{b / 1e9:.1f}GB"
            if b >= 1_000_000:
                return f"{b / 1e6:.1f}MB"
            return f"{b / 1000:.0f}KB"

        print(f"Total:       {disk['total']['count']} clips ({fmt_size(disk['total']['size'])})")
        print(f"Pinned:      {disk['pinned']['count']} clips ({fmt_size(disk['pinned']['size'])})")
        for st, info in sorted(disk["pinned"].get("by_type", {}).items()):
            print(f"  {st:12s} {info['count']} clips ({fmt_size(info['size'])})")
        print(f"TTL-managed: {disk['ttl_managed']['count']} clips ({fmt_size(disk['ttl_managed']['size'])})")
        for st, info in sorted(disk["ttl_managed"].get("by_type", {}).items()):
            print(f"  {st:12s} {info['count']} clips ({fmt_size(info['size'])})")
        print(f"Expired:     {disk['expired']['count']} clips ({fmt_size(disk['expired']['size'])})")
        return

    if dry_run:
        clips = store.cleanup_expired_files(ttl_seconds=ttl_seconds, dry_run=True, force=force)
        if not clips:
            print(f"No expired clips (TTL: {ttl_days} days).")
            return

        def fmt_size(b):
            if b >= 1_000_000:
                return f"{b / 1e6:.1f}MB"
            return f"{b / 1000:.0f}KB"

        total_size = sum(c.get("size", 0) for c in clips)
        print(f"=== DRY RUN: {len(clips)} clip(s) would be cleaned ({fmt_size(total_size)}) ===")
        for c in clips:
            pin_note = " (PINNED)" if c.get("pinned") else ""
            redown = "re-downloadable" if c.get("source_type") in REDOWNLOADABLE_TYPES else "NOT re-downloadable"
            print(f"  {c['filename']:40s} {fmt_size(c.get('size', 0)):>8s}  {c.get('source_type', '?'):8s}  {redown}{pin_note}")
        print()
        print(f"Run without --dry-run to delete these files.")
        if not force:
            print(f"Use --force to also clean pinned clips (social/inbound/veo).")
    else:
        clips = store.cleanup_expired_files(ttl_seconds=ttl_seconds, dry_run=False, force=force)
        if not clips:
            print(f"No expired clips to clean (TTL: {ttl_days} days).")
            return

        def fmt_size(b):
            if b >= 1_000_000:
                return f"{b / 1e6:.1f}MB"
            return f"{b / 1000:.0f}KB"

        total_size = sum(c.get("size", 0) for c in clips)
        print(f"=== CLEANED: {len(clips)} clip(s), freed {fmt_size(total_size)} ===")
        for c in clips:
            pin_note = " (was pinned)" if c.get("pinned") else ""
            print(f"  {c['filename']:40s} {fmt_size(c.get('size', 0)):>8s}  {c.get('source_type', '?')}{pin_note}")
        print()
        print("Catalog entries preserved. Files will be re-downloaded on next use.")


def _cleanup_dam_verified(store, dry_run):
    """Delete local files that have verified DAM copies (valid Blob URL).

    Only removes the local file — catalog entries persist so that
    _resolve_clip_reference() can auto-download from DAM when needed.
    """
    from lib.dam_client import DAMClient

    client = DAMClient()
    if not client.configured:
        print("ERROR: DAM not configured. Set CGK_PLATFORM_API_URL and CGK_PLATFORM_API_KEY.")
        sys.exit(1)

    # Get all clips from master catalog
    master = store.get_or_create_master()
    clips = master.get("clips", [])

    def fmt_size(b):
        if b >= 1_000_000_000:
            return f"{b / 1e9:.1f}GB"
        if b >= 1_000_000:
            return f"{b / 1e6:.1f}MB"
        return f"{b / 1000:.0f}KB"

    verified = []
    not_in_dam = 0
    metadata_only = 0
    no_local = 0

    for clip in clips:
        filename = clip.get("filename", "")
        local_path = clip.get("path", "")

        if not local_path or not os.path.exists(local_path):
            no_local += 1
            continue

        dam_entry = client.lookup_clip(filename)
        if not dam_entry:
            not_in_dam += 1
            continue

        file_url = dam_entry.get("file_url", "")
        if not file_url.startswith("https://"):
            metadata_only += 1
            continue

        file_size = os.path.getsize(local_path)
        verified.append({
            "filename": filename,
            "path": local_path,
            "size": file_size,
            "dam_url": file_url,
        })

    if not verified:
        print("No clips eligible for DAM-verified cleanup.")
        print(f"  {not_in_dam} not in DAM, {metadata_only} metadata-only, {no_local} no local file")
        return

    total_size = sum(v["size"] for v in verified)

    if dry_run:
        print(f"=== DAM-VERIFIED DRY RUN: {len(verified)} clip(s) safe to delete ({fmt_size(total_size)}) ===")
        for v in verified:
            print(f"  {v['filename']:40s} {fmt_size(v['size']):>8s}")
        print()
        print(f"  {not_in_dam} not in DAM (kept), {metadata_only} metadata-only (kept), {no_local} no local file")
        print(f"\nRun without --dry-run to delete these files.")
    else:
        deleted = 0
        freed = 0
        for v in verified:
            try:
                os.unlink(v["path"])
                deleted += 1
                freed += v["size"]
            except OSError as e:
                print(f"  ERROR: {v['filename']} -> {e}")
        print(f"=== DAM-VERIFIED CLEANUP: {deleted} file(s) deleted, {fmt_size(freed)} freed ===")
        print("Catalog entries preserved. Files will auto-download from DAM on next use.")


# =====================================================================
# Command: catalog-pending — Process deferred catalog entries
# =====================================================================
def cmd_catalog_pending(silent: bool = False) -> int:
    import tempfile
    from lib.catalog_store import CatalogStore
    from lib.catalog import _analyze_single_clip_local

    store = CatalogStore(str(PROFILE_ROOT))
    pending_dir = store.root / "_pending"

    if not pending_dir.exists():
        if not silent:
            print("No pending catalog entries.")
        return 0

    pending_files = sorted(pending_dir.glob("*.json"))
    if not pending_files:
        if not silent:
            print("No pending catalog entries.")
        return 0

    # Get or create master catalog
    master = store.get_or_create_master()
    master_id = master["catalog_id"]
    existing_filenames = {c["filename"] for c in master.get("clips", [])}

    if not silent:
        _post_slack_progress(f"Processing {len(pending_files)} queued clips...")
        print(f"=== Processing {len(pending_files)} pending clip(s) ===")

    processed = 0
    for pf in pending_files:
        try:
            entry = json.loads(pf.read_text())
        except (json.JSONDecodeError, OSError):
            pf.unlink(missing_ok=True)
            continue

        file_path = entry.get("file_path", "")
        raw_filename = entry.get("filename", Path(file_path).name)
        source_meta = entry.get("source_meta", {})
        video_info = entry.get("video_info", {})

        # Sanitize filename for safe catalog references
        from lib.catalog_store import sanitize_filename
        filename = sanitize_filename(raw_filename)

        # Rename file on disk if name changed
        if filename != raw_filename and os.path.exists(file_path):
            clean_path = Path(file_path).parent / filename
            if not clean_path.exists():
                os.rename(file_path, str(clean_path))
                file_path = str(clean_path)
                if not silent:
                    print(f"  {raw_filename} → {filename}")

        # Skip if already in master
        if filename in existing_filenames:
            if not silent:
                print(f"  {filename} — already in master catalog, skipping.")
            pf.unlink(missing_ok=True)
            continue

        # Skip if file doesn't exist
        if not os.path.exists(file_path):
            if not silent:
                print(f"  {filename} — file missing, skipping.")
            pf.unlink(missing_ok=True)
            continue

        if not silent:
            print(f"  {filename} — analyzing...")

        # Run Gemini analysis
        with tempfile.TemporaryDirectory() as tmpdir:
            clip_entry = _analyze_single_clip_local(file_path, filename, tmpdir)

        # Merge video info
        clip_entry["downloaded"] = True
        clip_entry["path"] = file_path
        for k in ("width", "height", "resolution", "fps", "codec", "duration"):
            if k in video_info and not clip_entry.get(k):
                clip_entry[k] = video_info[k]

        # Set source metadata
        clip_entry["source_type"] = source_meta.get("source_type", "local")
        clip_entry["source_url"] = source_meta.get("source_url", "")
        clip_entry["source_id"] = source_meta.get("source_id", "")

        segs = len(clip_entry.get("segments", []))
        if not silent:
            if "error" in clip_entry:
                print(f"    WARNING: {clip_entry['error']}")
            else:
                print(f"    OK: {segs} segments")

        # Add to master catalog
        added = store.add_clips_to_catalog(master_id, [clip_entry])
        if added > 0:
            store.set_clip_source(filename, source_meta)
            store.touch_clip(filename)
            existing_filenames.add(filename)
            processed += 1

        # Remove pending file
        pf.unlink(missing_ok=True)

    if not silent:
        print(f"\n{processed} clip(s) added to master catalog.")

    return processed


# =====================================================================
# Command: catalog-add — Add individual clips directly to master catalog
# =====================================================================
def cmd_catalog_add():
    import tempfile
    from lib.catalog_store import CatalogStore
    from lib.catalog import _analyze_single_clip_local

    store = CatalogStore(str(PROFILE_ROOT))
    clip_paths_str = os.environ.get("CLIP_PATHS", "")
    source_type_override = os.environ.get("SOURCE_TYPE", "")

    if not clip_paths_str:
        print("ERROR: No clip paths provided.")
        sys.exit(1)

    clip_paths = [p.strip() for p in clip_paths_str.split(",") if p.strip()]

    # Get or create master catalog
    master = store.get_or_create_master()
    master_id = master["catalog_id"]
    existing_filenames = {c["filename"] for c in master.get("clips", [])}

    if len(clip_paths) > 1:
        _post_slack_progress(f"Cataloging {len(clip_paths)} clips...")

    print(f"=== Adding {len(clip_paths)} clip(s) to master catalog ===")

    added_count = 0
    for clip_path in clip_paths:
        if not os.path.exists(clip_path):
            print(f"  {clip_path} — file not found, skipping.")
            continue

        raw_filename = Path(clip_path).name

        # Sanitize filename for safe catalog references
        from lib.catalog_store import sanitize_filename
        filename = sanitize_filename(raw_filename)

        # Rename file on disk if name changed
        if filename != raw_filename:
            clean_path = Path(clip_path).parent / filename
            if not clean_path.exists():
                os.rename(clip_path, str(clean_path))
                print(f"  {raw_filename} → {filename}")
                clip_path = str(clean_path)
            else:
                # Clean name already exists, use it as-is
                filename = raw_filename

        # Check for duplicates
        if filename in existing_filenames:
            print(f"  {filename} — already in master catalog, skipping.")
            continue

        print(f"  {filename} — analyzing...")

        # Run Gemini analysis
        with tempfile.TemporaryDirectory() as tmpdir:
            clip_entry = _analyze_single_clip_local(clip_path, filename, tmpdir)

        clip_entry["downloaded"] = True
        clip_entry["path"] = clip_path

        # Determine source type
        if source_type_override:
            st = source_type_override
        else:
            # Auto-detect from filename/path
            st = "local"

        clip_entry["source_type"] = st
        clip_entry["source_url"] = clip_path
        clip_entry["source_id"] = ""

        segs = len(clip_entry.get("segments", []))
        if "error" in clip_entry:
            print(f"    WARNING: {clip_entry['error']}")
        else:
            print(f"    OK: {segs} segments")

        # Add to master
        added = store.add_clips_to_catalog(master_id, [clip_entry])
        if added > 0:
            source_meta = {
                "source_type": st,
                "source_url": clip_path,
                "source_id": "",
            }
            store.set_clip_source(filename, source_meta)
            store.touch_clip(filename)
            existing_filenames.add(filename)
            added_count += 1

    print(f"\n{added_count} clip(s) added to master catalog.")
    if added_count > 0:
        print("These clips are now searchable and available for storyboards.")
        # Dual-write: push newly added clips to remote DAM (non-fatal)
        _push_catalog_add_to_dam(clip_paths, store, master_id)


def _push_catalog_add_to_dam(clip_paths, store, master_id):
    """Push catalog-add clips to remote DAM. Non-fatal."""
    try:
        from lib.dam_client import DAMClient, compute_file_hash
        client = DAMClient()
        if not client.configured:
            return

        master = store.get_catalog(master_id)
        if not master:
            return

        clips_by_path = {}
        for clip in master.get("clips", []):
            p = clip.get("path", "")
            if p:
                clips_by_path[p] = clip

        pushed = 0
        for cp in clip_paths:
            cp = str(Path(cp).resolve()) if os.path.exists(cp) else cp
            clip = clips_by_path.get(cp)
            if not clip:
                continue

            filename = clip.get("filename", "")
            existing = client.lookup_clip(filename)
            if existing and existing.get("file_url", "").startswith("https://"):
                continue

            upload_result = client.upload_clip(cp)
            if not upload_result or not upload_result.get("url"):
                continue

            blob_url = upload_result["url"]
            file_hash = compute_file_hash(cp)

            from lib.dam_client import build_clip_payload
            payload = build_clip_payload(
                clip, Path(str(PROFILE_ROOT)) / "media",
                file_url=blob_url, file_hash=file_hash,
            )
            result = client.ingest_clip(payload)
            if result:
                pushed += 1

        if pushed > 0:
            print(f"  DAM sync: {pushed} clip(s) pushed to remote DAM.")
    except Exception as e:
        print(f"  DAM sync skipped: {e}")


def cmd_rebuild_index():
    """Migrate catalog filenames to sanitized form and rebuild index."""
    from lib.catalog_store import CatalogStore

    store = CatalogStore(str(PROFILE_ROOT))

    print("=== Migrating catalog filenames ===")
    stats = store.migrate_filenames()
    print(f"  Renamed: {stats['renamed']}")
    print(f"  Already clean: {stats['already_clean']}")
    print(f"  Files missing (catalog-only): {stats['missing']}")
    if stats.get("errors"):
        print(f"  Errors: {stats['errors']}")
    print()
    print("Index rebuilt with sanitized keys.")


# =====================================================================
# Command: build-embeddings — Generate semantic embeddings for catalog
# =====================================================================
def cmd_build_embeddings():
    """Generate vector embeddings for all catalog segments.

    Uses Gemini text-embedding-004 for semantic search.
    Incremental: only embeds new/changed segments unless --force.
    """
    from lib.embeddings import EmbeddingStore

    catalog_id = os.environ.get("CATALOG_ID", "") or "master"
    force = os.environ.get("FORCE_EMBEDDINGS") == "1"

    emb_store = EmbeddingStore(str(PROFILE_ROOT))

    if emb_store.has_embeddings() and not force:
        stats = emb_store.stats()
        print(f"Existing embeddings: {stats['count']} segments ({stats['size_mb']:.1f} MB)")
        print(f"  Model: {stats['model']}")
        print(f"  Built: {stats['built_at']}")
        print("Adding new segments (use --force to rebuild all)...")
        print()

    count = emb_store.build(catalog_id=catalog_id, force=force)

    stats = emb_store.stats()
    print()
    print(f"Embedding store: {stats['count']} segments, {stats['size_mb']:.1f} MB")
    print(f"search-clips will now use semantic (vector) search automatically.")


# =====================================================================
# Command: sync — Push session state to CGK Platform Creative Studio
# =====================================================================
def cmd_sync():
    """Sync current session state to CGK Platform Creative Studio."""
    import urllib.request
    import urllib.error

    session_id = os.environ.get("SESSION_ID", "")
    if not session_id:
        print("ERROR: --session required")
        sys.exit(1)

    session = load_session(session_id)

    api_url = os.environ.get("CGK_PLATFORM_API_URL", "")
    api_key = os.environ.get("CGK_PLATFORM_API_KEY", "")

    if not api_url or not api_key:
        print("WARNING: CGK_PLATFORM_API_URL or CGK_PLATFORM_API_KEY not set, skipping sync")
        return

    storyboard = session.get("storyboard") or {}

    payload = {
        "openclawSessionId": session_id,
        "openclawProfile": _get_profile_name(),
        "title": session.get("title") or session.get("storyboard", {}).get("title") or session_id,
        "status": _map_session_status(session),
        "storyboard": storyboard if storyboard else None,
        "voiceId": session.get("voice_id"),
        "voiceName": session.get("voice_name"),
        "voiceoverScript": session.get("voiceover_script"),
        "voiceoverUrl": None,  # B1: send null, Blob URL set by upload route
        "captionStyle": session.get("caption_style"),
        "captionConfig": session.get("caption_config"),
        "musicUrl": None,  # B1: send null, Blob URL set by upload route
        "musicAttribution": session.get("music_attribution"),
        "musicVolume": session.get("music_volume"),
        "aspectRatio": session.get("aspect_ratio"),
        "templateId": session.get("template_id"),
        "mode": session.get("mode"),
        "renderUrl": None,  # B1: send null, Blob URL set by upload route
        "qcResults": session.get("qc_results"),
        "brandDefaults": session.get("brand_defaults"),
    }

    scenes = storyboard.get("scenes", [])
    if scenes:
        payload["scenes"] = [
            {
                "sceneNumber": i + 1,
                "role": s.get("role"),
                "duration": s.get("duration"),
                "footageHint": s.get("footage_hint"),
                "sourceType": s.get("source_type"),
                "sourceReference": s.get("source_reference"),
                "transition": s.get("transition", "crossfade"),
            }
            for i, s in enumerate(scenes)
        ]

    # Load timestamps from file if available
    timestamps = []
    ts_path = session.get("timestamps_path")
    if ts_path and os.path.exists(ts_path):
        try:
            with open(ts_path) as f:
                ts_data = json.load(f)
            timestamps = ts_data.get("words", [])
        except (json.JSONDecodeError, OSError):
            pass

    if timestamps:
        payload["captions"] = [
            {
                "word": t.get("word", ""),
                "startTime": t.get("start", 0),
                "endTime": t.get("end", 0),
            }
            for t in timestamps
        ]

    req = urllib.request.Request(
        f"{api_url.rstrip('/')}/api/admin/video-editor/projects/sync",
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
        },
    )

    try:
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read())
        project_id = result.get("projectId", "unknown")
        is_new = result.get("isNew", False)
        action = "Created" if is_new else "Synced"
        print(f"Platform sync OK: {action} project {project_id}")
        _session_log(session_id, "sync", f"{action.lower()} platform project {project_id}")

        # Upload files if they exist locally
        if project_id and project_id != "unknown":
            output_path = session.get("output_path")
            if output_path and os.path.isfile(output_path):
                _upload_file(api_url, api_key, project_id, "render", output_path)
            vo_path = session.get("voiceover_path")
            if vo_path and os.path.isfile(vo_path):
                _upload_file(api_url, api_key, project_id, "voiceover", vo_path)
            music_path = session.get("music_path")
            if music_path and os.path.isfile(music_path):
                _upload_file(api_url, api_key, project_id, "music", music_path)

            # Print Creative Studio link
            platform_url = api_url.rstrip("/")
            if platform_url.endswith("/api"):
                platform_url = platform_url[:-4]
            studio_url = f"{platform_url}/admin/creative-studio/{project_id}"
            print(f"\n  View in Creative Studio: {studio_url}")
            return project_id

        return project_id
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"Platform sync ERROR: HTTP {e.code} - {body}")
        _session_log(session_id, "sync", f"ERROR HTTP {e.code}: {body[:200]}")
    except urllib.error.URLError as e:
        print(f"Platform sync ERROR: {e.reason}")
        _session_log(session_id, "sync", f"ERROR URLError: {e.reason}")
    except Exception as e:
        print(f"Platform sync ERROR: {e}")
        _session_log(session_id, "sync", f"ERROR: {e}")
    return None


def _map_session_status(session: dict) -> str:
    """Map openCLAW session state to platform project status."""
    if session.get("delivered"):
        return "delivered"
    if session.get("render_done"):
        return "rendered"
    if session.get("plan_done"):
        return "producing"
    if session.get("storyboard_done"):
        return "storyboarding"
    return "draft"


# =====================================================================
# Dispatch
# =====================================================================
def main():
    if len(sys.argv) < 2:
        print("ERROR: No command specified.")
        sys.exit(1)

    command = sys.argv[1]
    dispatch = {
        "start": cmd_start,
        "analyze": cmd_analyze,
        "analyze-footage": cmd_analyze_footage,
        "storyboard": cmd_storyboard,
        "set-storyboard": cmd_set_storyboard,
        "set-voice": cmd_set_voice,
        "search-voices": cmd_search_voices,
        "generate-voiceover": cmd_generate_voiceover,
        "source-footage": cmd_source_footage,
        "normalize": cmd_normalize,
        "set-captions": cmd_set_captions,
        "suggest-music": cmd_suggest_music,
        "set-music": cmd_set_music,
        "plan": cmd_plan,
        "render": cmd_render,
        "preview-scene": cmd_preview_scene,
        "render-variant": cmd_render_variant,
        "batch-variants": cmd_batch_variants,
        "deliver": cmd_deliver,
        "list-catalogs": cmd_list_catalogs,
        "search-clips": cmd_search_clips,
        "attach-catalog": cmd_attach_catalog,
        "rename-catalog": cmd_rename_catalog,
        "cleanup-media": cmd_cleanup_media,
        "catalog-pending": cmd_catalog_pending,
        "use-template": cmd_use_template,
        "catalog-audit-text": cmd_catalog_audit_text,
        "gc": cmd_gc,
        "catalog-add": cmd_catalog_add,
        "rebuild-index": cmd_rebuild_index,
        "build-embeddings": cmd_build_embeddings,
        "sync": cmd_sync,
    }

    handler = dispatch.get(command)
    if not handler:
        print(f"ERROR: Unknown command '{command}'")
        sys.exit(1)

    handler()


if __name__ == "__main__":
    main()
