#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai>=1.0.0",
#     "openai>=1.0.0",
#     "requests>=2.31.0",
#     "pillow>=10.0.0",
#     "PyJWT>=2.8.0",
# ]
# ///
"""Extend/continue a previously generated video.

Reads the .meta.json sidecar from generate_video.py to determine the backend,
then calls the appropriate extension API:
  - Kling: dedicated /v1/videos/video-extend endpoint (best for long-form)
  - Veo 3.1: SDK re-call with video object reference (+7s per extension)
  - Sora 2: last-frame extraction + image-to-video + ffmpeg concat
"""
import argparse, json, os, signal, sys, time, subprocess
from pathlib import Path

try:
    from google.api_core.exceptions import ResourceExhausted as _ResourceExhausted
except ImportError:
    _ResourceExhausted = None

# Ignore SIGPIPE so broken exec pipes don't kill concurrent runs
try:
    signal.signal(signal.SIGPIPE, signal.SIG_IGN)
except (AttributeError, ValueError):
    pass

# Wrap stdout/stderr so BrokenPipeError doesn't crash the process
class _PipeSafe:
    def __init__(self, stream):
        self._stream = stream
    def write(self, data):
        try:
            self._stream.write(data)
        except (BrokenPipeError, OSError):
            pass
    def flush(self):
        try:
            self._stream.flush()
        except (BrokenPipeError, OSError):
            pass
    def __getattr__(self, name):
        return getattr(self._stream, name)

sys.stdout = _PipeSafe(sys.stdout)
sys.stderr = _PipeSafe(sys.stderr)

SLACK_BOT_TOKEN = os.environ.get("SLACK_BOT_TOKEN")
SLACK_CHANNEL_ID = os.environ.get("SLACK_CHANNEL_ID")
if not SLACK_CHANNEL_ID:
    print("[slack] SLACK_CHANNEL_ID not set — Slack upload will be skipped", file=sys.stderr)
SLACK_THREAD_TS = os.environ.get("SLACK_THREAD_TS", "")


def _workspace_root():
    """Derive workspace root from script location (4 dirs up)."""
    return Path(__file__).resolve().parent.parent.parent.parent


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
    import urllib.request, urllib.error
    config_path = _workspace_root() / "openclaw.json"
    token = None
    if config_path.exists():
        try:
            cfg = json.loads(config_path.read_text())
            token = cfg.get("channels", {}).get("slack", {}).get("botToken", "") or None
        except (json.JSONDecodeError, OSError):
            pass
    if not token:
        token = SLACK_BOT_TOKEN
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


KLING_ACCESS_KEY = os.environ.get("KLING_ACCESS_KEY", "")
KLING_SECRET_KEY = os.environ.get("KLING_SECRET_KEY", "")
KLING_BASE_URL = os.environ.get("KLING_BASE_URL", "https://api.klingai.com")

UPLOAD_MAX_RETRIES = 5
UPLOAD_INITIAL_DELAY = 2


# ---------------------------------------------------------------------------
# Slack helpers (duplicated — each script is self-contained per codebase pattern)
# ---------------------------------------------------------------------------

def _slack_request(method: str, url: str, max_retries: int = UPLOAD_MAX_RETRIES,
                   **kwargs) -> "requests.Response | None":
    import requests
    delay = UPLOAD_INITIAL_DELAY
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.request(method, url, timeout=(10, 60), **kwargs)
        except (requests.ConnectionError, requests.Timeout, OSError) as e:
            print(f"  Upload attempt {attempt}/{max_retries}: network error ({e}), retrying in {delay}s...", file=sys.stderr)
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
            print(f"  Upload attempt {attempt}/{max_retries}: rate limited (429), waiting {retry_after}s...", file=sys.stderr)
            time.sleep(retry_after)
            delay *= 2
            continue
        if resp.status_code >= 500:
            print(f"  Upload attempt {attempt}/{max_retries}: server error ({resp.status_code}), retrying in {delay}s...", file=sys.stderr)
            time.sleep(delay)
            delay *= 2
            continue
        return resp
    print(f"  Upload failed after {max_retries} attempts", file=sys.stderr)
    return None


def upload_to_slack(file_path: Path, title: str) -> bool:
    token = SLACK_BOT_TOKEN
    channel = SLACK_CHANNEL_ID
    if not token or not channel:
        print("Slack credentials not available, skipping upload.")
        return False
    # Outbound allowlist check — DMs (D-prefix) always allowed, user is talking directly to the bot
    if not channel.startswith("D"):
        allowed = _get_allowed_channels()
        if allowed and channel not in allowed:
            print(f"[slack] BLOCKED: channel {channel} not in workspace allowlist")
            _dm_holden(
                f":warning: *Channel Allowlist Block*\n\n"
                f"Workspace `{_workspace_root().name}` tried to upload to channel `{channel}` "
                f"but it's not in this workspace's Slack channel list.\n\n"
                f"Should I add this channel to the openclaw allowlist in "
                f"`openclaw.json`? Or is this a misconfiguration?"
            )
            return False
    file_size = file_path.stat().st_size
    resp = _slack_request("POST", "https://slack.com/api/files.getUploadURLExternal",
                          headers={"Authorization": f"Bearer {token}"},
                          data={"filename": file_path.name, "length": str(file_size)})
    if resp is None:
        return False
    data = resp.json()
    if not data.get("ok"):
        print(f"Slack upload URL failed: {data}", file=sys.stderr)
        return False
    upload_url = data["upload_url"]
    file_id = data["file_id"]
    with open(file_path, "rb") as f:
        file_bytes = f.read()
    resp = _slack_request("POST", upload_url, files={"file": (file_path.name, file_bytes)})
    if resp is None:
        return False
    if resp.status_code not in (200, 201):
        print(f"Slack file upload failed: {resp.status_code}", file=sys.stderr)
        return False
    payload = {"files": [{"id": file_id, "title": title}], "channel_id": channel}
    if SLACK_THREAD_TS:
        payload["thread_ts"] = SLACK_THREAD_TS
    resp = _slack_request("POST", "https://slack.com/api/files.completeUploadExternal",
                          headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                          json=payload)
    if resp is None:
        return False
    data = resp.json()
    if data.get("ok"):
        print(f"Uploaded to Slack: {title}")
        return True
    else:
        print(f"Slack complete upload failed: {data}", file=sys.stderr)
        return False


# ---------------------------------------------------------------------------
# Provider key helpers
# ---------------------------------------------------------------------------

def get_provider_key(provider: str) -> str | None:
    env_map = {"openai": "OPENAI_API_KEY",
               "kling_ak": "KLING_ACCESS_KEY", "kling_sk": "KLING_SECRET_KEY"}
    env_var = env_map.get(provider, "")
    key = os.environ.get(env_var)
    if key:
        return key
    config_paths = [Path.home() / "config.yaml", Path.home() / "litellm_config.yaml",
                    Path.home() / ".litellm" / "config.yaml"]
    for config_path in config_paths:
        if config_path.exists():
            try:
                import re
                content = config_path.read_text()
                for line in content.split('\n'):
                    if 'api_key:' in line and f'os.environ/{env_var}' not in line:
                        match = re.search(r'api_key:\s*(.+)', line)
                        if match:
                            return match.group(1).strip().strip('"').strip("'")
            except Exception:
                pass
    return None


def make_vertex_client():
    """Create a Vertex AI genai client using ADC."""
    from google import genai as _genai
    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0013158607")
    return _genai.Client(vertexai=True, project=project, location="global")


# ---------------------------------------------------------------------------
# Kling helpers
# ---------------------------------------------------------------------------

def _kling_jwt(access_key, secret_key):
    import jwt
    now = int(time.time())
    payload = {"iss": access_key, "exp": now + 1800, "nbf": now - 5, "iat": now}
    return jwt.encode(payload, secret_key, algorithm="HS256")


def _kling_headers(access_key, secret_key):
    return {
        "Authorization": f"Bearer {_kling_jwt(access_key, secret_key)}",
        "Content-Type": "application/json",
    }


def _kling_poll(access_key, secret_key, task_id, creation_endpoint, max_poll_time=600):
    import requests
    start = time.time()
    while True:
        elapsed = time.time() - start
        if elapsed > max_poll_time:
            raise TimeoutError(f"Kling poll timed out after {int(elapsed)}s")
        resp = requests.get(
            f"{KLING_BASE_URL}/v1/videos/{creation_endpoint}/{task_id}",
            headers=_kling_headers(access_key, secret_key), timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"Kling poll error: {data.get('message', data)}")
        status = data["data"]["task_status"]
        if status == "succeed":
            return data["data"]["task_result"]
        if status == "failed":
            reason = data["data"].get("task_status_msg", "unknown")
            raise RuntimeError(f"Kling extension failed: {reason}")
        print(f"[{int(elapsed)}s] {status}.", end="", flush=True)
        time.sleep(5)


def _kling_download(video_url, output_path):
    import requests
    resp = requests.get(video_url, stream=True, timeout=120)
    resp.raise_for_status()
    with open(output_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)


# ---------------------------------------------------------------------------
# Extension: Kling 3.0
# ---------------------------------------------------------------------------

def extend_kling(meta, video_path, prompt, negative_prompt, num_extensions, output_path):
    """Extend via Kling's dedicated /v1/videos/video-extend endpoint."""
    import requests

    ak = KLING_ACCESS_KEY or get_provider_key("kling_ak")
    sk = KLING_SECRET_KEY or get_provider_key("kling_sk")
    if not ak or not sk:
        print("Error: KLING_ACCESS_KEY and KLING_SECRET_KEY required.", file=sys.stderr)
        sys.exit(1)

    # video_id (from task_result.videos[].id) is required for extension, NOT task_id
    current_video_id = meta.get("video_id", "")
    if not current_video_id:
        print("Error: No video_id in .meta.json. Re-generate the video to populate it.", file=sys.stderr)
        sys.exit(1)

    current_video = video_path

    for i in range(1, num_extensions + 1):
        print(f"\n--- Extension {i}/{num_extensions} ---")
        body = {"video_id": current_video_id, "prompt": prompt}
        if negative_prompt:
            body["negative_prompt"] = negative_prompt
        resp = requests.post(
            f"{KLING_BASE_URL}/v1/videos/video-extend",
            headers=_kling_headers(ak, sk), json=body, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"Kling extend failed: {data.get('message', data)}")

        new_task_id = data["data"]["task_id"]
        print(f"Extension task: {new_task_id}")

        task_result = _kling_poll(ak, sk, new_task_id, "video-extend")
        print()

        videos = task_result.get("videos", [])
        if not videos:
            raise RuntimeError("Kling extension returned no videos.")

        ext_path = output_path if i == num_extensions else output_path.with_stem(f"{output_path.stem}_ext{i}")
        _kling_download(videos[0]["url"], ext_path)
        size_mb = ext_path.stat().st_size / (1024 * 1024)
        print(f"Saved extension {i}: {ext_path.resolve()} ({size_mb:.1f}MB)")

        # Update video_id for chaining (next extension uses the new video's id)
        current_video_id = videos[0].get("id", current_video_id)
        current_video = ext_path

    # Update .meta.json
    meta["video_id"] = current_video_id
    meta["extensions"] = meta.get("extensions", 0) + num_extensions
    output_path.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2))
    print(f"MEDIA:{output_path.resolve()}")
    return output_path


# ---------------------------------------------------------------------------
# Extension: Veo 3.1
# ---------------------------------------------------------------------------

def extend_veo(meta, video_path, prompt, num_extensions, output_path):
    """Extend via Google genai SDK re-call with video object reference."""
    from google import genai
    from google.genai import types

    video_uri = meta.get("video_uri")
    if not video_uri:
        print("Error: No video_uri in .meta.json. Veo extension requires a video URI.", file=sys.stderr)
        print("Vertex-generated videos (inline bytes) cannot be extended.", file=sys.stderr)
        print("Regenerate the video to get a video URI for extension.", file=sys.stderr)
        sys.exit(1)

    model_name = meta.get("model", "veo-3.1-fast-generate-preview")
    backend = meta.get("backend", "veo-fast")

    # All backends use Vertex AI
    client = make_vertex_client()

    current_uri = video_uri
    current_path = output_path

    for i in range(1, num_extensions + 1):
        print(f"\n--- Extension {i}/{num_extensions} ---")
        video_obj = types.Video(uri=current_uri, mime_type="video/mp4")

        config = types.GenerateVideosConfig(number_of_videos=1, resolution="720p")

        operation = client.models.generate_videos(
            model=model_name, prompt=prompt, video=video_obj, config=config)

        MAX_POLL_TIME = 600
        start_time = time.time()
        while not operation.done:
            elapsed = time.time() - start_time
            if elapsed > MAX_POLL_TIME:
                raise TimeoutError(f"Veo extension timed out after {int(elapsed)}s")
            time.sleep(10)
            operation = client.operations.get(operation)
            print(f"[{int(elapsed)}s].", end="", flush=True)
        print()

        generated = operation.response.generated_videos
        if not generated:
            raise RuntimeError("Veo extension returned no videos.")

        gen_video = generated[0]
        video_result = gen_video.video

        if hasattr(video_result, 'video_bytes') and video_result.video_bytes:
            video_data = video_result.video_bytes
        else:
            video_data = client.files.download(file=video_result)

        ext_path = output_path if i == num_extensions else output_path.with_stem(f"{output_path.stem}_ext{i}")
        ext_path.write_bytes(video_data)
        size_mb = ext_path.stat().st_size / (1024 * 1024)
        print(f"Saved extension {i}: {ext_path.resolve()} ({size_mb:.1f}MB)")

        # Update URI for next chain
        if hasattr(video_result, 'uri') and video_result.uri:
            current_uri = video_result.uri
        else:
            print("Warning: No URI on extended video — further chaining may fail.", file=sys.stderr)

    # Update .meta.json
    meta["video_uri"] = current_uri
    meta["extensions"] = meta.get("extensions", 0) + num_extensions
    output_path.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2))
    print(f"MEDIA:{output_path.resolve()}")
    return output_path


# ---------------------------------------------------------------------------
# Extension: Sora 2
# ---------------------------------------------------------------------------

def extend_sora(meta, video_path, prompt, num_extensions, output_path):
    """Extend via frame extraction + OpenAI image-to-video + ffmpeg concat."""
    from openai import OpenAI
    import tempfile

    api_key = os.environ.get("OPENAI_API_KEY") or get_provider_key("openai")
    if not api_key:
        print("Error: OPENAI_API_KEY required for Sora extension.", file=sys.stderr)
        sys.exit(1)

    # Use OpenAI directly (NOT litellm) for input_reference support
    client = OpenAI(api_key=api_key)

    # Derive size from meta aspect_ratio, duration from meta
    aspect_ratio = meta.get("aspect_ratio", "9:16")
    size_map = {"9:16": "720x1280", "16:9": "1280x720", "1:1": "1080x1080"}
    size = size_map.get(aspect_ratio, "720x1280")
    duration = str(meta.get("duration", 8))

    current_video = video_path
    segments = [str(video_path)]  # Start with original
    tmpdir = Path(tempfile.mkdtemp(prefix="sora_extend_"))

    for i in range(1, num_extensions + 1):
        print(f"\n--- Extension {i}/{num_extensions} ---")

        # Extract last frame with ffmpeg
        frame_path = tmpdir / f"frame_{i}.png"
        cmd = ["ffmpeg", "-y", "-sseof", "-0.1", "-i", str(current_video),
               "-frames:v", "1", "-update", "1", str(frame_path)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0 or not frame_path.exists():
            raise RuntimeError(f"ffmpeg frame extraction failed: {result.stderr}")
        print(f"Extracted last frame: {frame_path}")

        # Create video from last frame via OpenAI using create_and_poll
        with open(frame_path, "rb") as f:
            video_job = client.videos.create_and_poll(
                model="sora-2",
                prompt=prompt,
                size=size,
                seconds=duration,
                input_reference=f,
            )

        if video_job.status == "completed":
            print(f"Extension {i} complete.")
        elif video_job.status in ("failed", "cancelled"):
            raise RuntimeError(f"Sora extension failed: {getattr(video_job, 'error', 'unknown')}")
        else:
            raise RuntimeError(f"Sora extension unexpected status: {video_job.status}")

        # Download segment
        segment_path = tmpdir / f"segment_{i}.mp4"
        res = client.videos.download_content(video_job.id)
        segment_path.write_bytes(res.content)
        print(f"Downloaded segment {i}: {segment_path}")
        segments.append(str(segment_path))
        current_video = segment_path

    # Concatenate all segments with ffmpeg
    print(f"\nConcatenating {len(segments)} segments...")
    concat_list = tmpdir / "concat.txt"
    with open(concat_list, "w") as f:
        for seg in segments:
            f.write(f"file '{seg}'\n")

    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list),
           "-c", "copy", str(output_path)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg concat failed: {result.stderr}")

    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"Saved concatenated video: {output_path.resolve()} ({size_mb:.1f}MB)")

    # Cleanup temp files
    import shutil
    shutil.rmtree(tmpdir, ignore_errors=True)

    # Update .meta.json
    meta["extensions"] = meta.get("extensions", 0) + num_extensions
    output_path.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2))
    print(f"MEDIA:{output_path.resolve()}")
    return output_path


# ---------------------------------------------------------------------------
# Task tracking
# ---------------------------------------------------------------------------

TASKS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "workspace" / "memory" / "active-tasks.d"


def _register_task(task_id: str, backend: str, log_file: str) -> Path:
    from datetime import datetime, timezone
    TASKS_DIR.mkdir(parents=True, exist_ok=True)
    task_file = TASKS_DIR / f"{task_id}.json"
    task_file.write_text(json.dumps({
        "taskId": task_id,
        "type": "video-extension",
        "channel": f"channel:{SLACK_CHANNEL_ID}",
        "threadId": SLACK_THREAD_TS or "",
        "task": f"Video extension ({backend})",
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "pid": os.getpid(),
        "logFile": log_file,
    }, indent=2))
    return task_file


def _deregister_task(task_file: Path):
    try:
        task_file.unlink()
    except OSError:
        pass


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Extend a previously generated video")
    parser.add_argument("--video", "-v", required=True, help="Path to video (must have .meta.json sidecar)")
    parser.add_argument("--prompt", "-p", default=None, help="Continuation prompt (default: reuse original)")
    parser.add_argument("--negative-prompt", default=None, help="Negative prompt (Kling only)")
    parser.add_argument("--extensions", "-n", type=int, default=1, help="Number of extensions to chain (default: 1)")
    parser.add_argument("--filename", "-f", default=None, help="Output path (default: {original}_extended.mp4)")
    parser.add_argument("--no-upload", action="store_true", help="Skip Slack upload")
    args = parser.parse_args()

    video_path = Path(args.video).expanduser().resolve()
    if not video_path.exists():
        print(f"Error: Video not found: {video_path}", file=sys.stderr)
        sys.exit(1)

    meta_path = video_path.with_suffix(".meta.json")
    if not meta_path.exists():
        print(f"Error: No .meta.json sidecar found at {meta_path}", file=sys.stderr)
        print("Extension requires metadata from generate_video.py. Re-generate the video first.", file=sys.stderr)
        sys.exit(1)

    meta = json.loads(meta_path.read_text())
    backend = meta.get("backend", "")
    prompt = args.prompt or meta.get("prompt", "Continue the video")

    # Determine output path
    if args.filename:
        output_path = Path(args.filename).expanduser().resolve()
    else:
        output_path = video_path.with_stem(f"{video_path.stem}_extended")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Extending video: {video_path}")
    print(f"Backend: {backend}")
    print(f"Extensions: {args.extensions}")
    print(f"Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
    print(f"Output: {output_path}")

    if backend in ("kling-pro", "kling-std"):
        result = extend_kling(meta, video_path, prompt, args.negative_prompt, args.extensions, output_path)
    elif backend in ("veo-fast", "veo-quality", "vertex-veo-fast", "vertex-veo-quality"):
        result = extend_veo(meta, video_path, prompt, args.extensions, output_path)
    elif backend == "sora":
        result = extend_sora(meta, video_path, prompt, args.extensions, output_path)
    else:
        print(f"Error: Unknown backend '{backend}' in .meta.json", file=sys.stderr)
        sys.exit(1)

    # Upload to Slack
    if not args.no_upload and result:
        file_size_mb = result.stat().st_size / (1024 * 1024)
        title = f"Extended video ({backend}, {args.extensions} ext) - {file_size_mb:.1f}MB"
        print(f"\nUploading to Slack ({file_size_mb:.1f}MB)...")
        if upload_to_slack(result, title):
            print("SLACK_UPLOADED:true")
        else:
            print("SLACK_UPLOADED:false — file saved locally", file=sys.stderr)


if __name__ == "__main__":
    if os.environ.get("VIDEO_EXTEND_SAFE") != "1":
        print("ERROR: Direct extend_video.py calls are blocked.")
        print("Use extend_video_safe.sh instead.")
        sys.exit(1)
    import atexit
    _args = sys.argv[1:]
    _video = ""
    for i, a in enumerate(_args):
        if a in ("-v", "--video") and i + 1 < len(_args):
            _video = _args[i + 1]
    _task_id = f"extend-video-{int(time.time())}-{os.getpid()}"
    _task_file = _register_task(_task_id, "extend", _video)
    atexit.register(_deregister_task, _task_file)

    try:
        main()
        _deregister_task(_task_file)
    except SystemExit:
        raise
    except Exception as e:
        print(f"Video extension failed: {e}", file=sys.stderr)
        raise
