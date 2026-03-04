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
"""Generate videos with Veo 3.1 or Sora 2 via litellm proxy.

For Sora: routes through litellm OpenAI-compatible API.
For Veo: uses Google genai SDK (video generation requires provider-specific APIs
that litellm can't proxy). API key is read from environment or litellm config.
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
    pass  # Windows doesn't have SIGPIPE

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

LITELLM_BASE_URL = os.environ.get("LITELLM_BASE_URL", "http://localhost:4000/v1")
LITELLM_API_KEY = os.environ.get("LITELLM_API_KEY", "")

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


def _slack_request(method: str, url: str, max_retries: int = UPLOAD_MAX_RETRIES,
                   **kwargs) -> "requests.Response | None":
    """Make an HTTP request with retries + exponential backoff.

    Handles DNS failures, rate limits (429), and server errors (5xx).
    Returns the response on success, or None after exhausting retries.
    """
    import requests

    delay = UPLOAD_INITIAL_DELAY
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.request(method, url, timeout=(10, 60), **kwargs)
        except (requests.ConnectionError, requests.Timeout, OSError) as e:
            print(f"  Upload attempt {attempt}/{max_retries}: network error ({e}), "
                  f"retrying in {delay}s...", file=sys.stderr)
            time.sleep(delay)
            delay *= 2
            continue

        if resp.status_code == 429:
            # Rate limited — use Retry-After header or backoff
            retry_after = delay
            try:
                retry_after = int(resp.headers.get("Retry-After", 0)) or delay
            except (ValueError, TypeError):
                pass
            try:
                retry_after = resp.json().get("retry_after", retry_after)
            except Exception:
                pass
            print(f"  Upload attempt {attempt}/{max_retries}: rate limited (429), "
                  f"waiting {retry_after}s...", file=sys.stderr)
            time.sleep(retry_after)
            delay *= 2
            continue

        if resp.status_code >= 500:
            print(f"  Upload attempt {attempt}/{max_retries}: server error ({resp.status_code}), "
                  f"retrying in {delay}s...", file=sys.stderr)
            time.sleep(delay)
            delay *= 2
            continue

        # Success or non-retryable client error
        return resp

    print(f"  Upload failed after {max_retries} attempts", file=sys.stderr)
    return None


def upload_to_slack(file_path: Path, title: str) -> bool:
    """Upload a file to Slack using the v2 API with retries + exponential backoff."""
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

    # Step 1: Get upload URL (with retries)
    resp = _slack_request(
        "POST",
        "https://slack.com/api/files.getUploadURLExternal",
        headers={"Authorization": f"Bearer {token}"},
        data={"filename": file_path.name, "length": str(file_size)},
    )
    if resp is None:
        return False
    data = resp.json()
    if not data.get("ok"):
        print(f"Slack upload URL failed: {data}", file=sys.stderr)
        return False

    upload_url = data["upload_url"]
    file_id = data["file_id"]

    # Step 2: Upload file to presigned URL (with retries)
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    resp = _slack_request(
        "POST",
        upload_url,
        files={"file": (file_path.name, file_bytes)},
    )
    if resp is None:
        return False
    if resp.status_code not in (200, 201):
        print(f"Slack file upload failed: {resp.status_code}", file=sys.stderr)
        return False

    # Step 3: Complete upload and share to channel (with retries)
    payload = {
        "files": [{"id": file_id, "title": title}],
        "channel_id": channel,
    }
    if SLACK_THREAD_TS:
        payload["thread_ts"] = SLACK_THREAD_TS

    resp = _slack_request(
        "POST",
        "https://slack.com/api/files.completeUploadExternal",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=payload,
    )
    if resp is None:
        return False
    data = resp.json()
    if data.get("ok"):
        print(f"Uploaded to Slack: {title}")
        return True
    else:
        print(f"Slack complete upload failed: {data}", file=sys.stderr)
        return False


def get_provider_key(provider: str) -> str | None:
    """Get the actual provider API key.

    Checks environment first, then tries to read from litellm's config.yaml.
    """
    env_map = {"openai": "OPENAI_API_KEY", "kling_ak": "KLING_ACCESS_KEY", "kling_sk": "KLING_SECRET_KEY"}
    env_var = env_map.get(provider, "")

    # Try environment first
    key = os.environ.get(env_var)
    if key:
        return key

    # Try reading from litellm's config.yaml
    config_paths = [
        Path.home() / "config.yaml",
        Path.home() / "litellm_config.yaml",
        Path.home() / ".litellm" / "config.yaml",
    ]
    for config_path in config_paths:
        if config_path.exists():
            try:
                # Simple YAML parsing for the api_key field
                content = config_path.read_text()
                import re
                for line in content.split('\n'):
                    if 'api_key:' in line and f'os.environ/{env_var}' not in line:
                        match = re.search(r'api_key:\s*(.+)', line)
                        if match:
                            return match.group(1).strip().strip('"').strip("'")
            except Exception:
                pass

    return None


def _is_rate_limit(exc):
    """Detect quota/rate-limit errors."""
    if _ResourceExhausted and isinstance(exc, _ResourceExhausted):
        return True
    msg = str(exc).lower()
    return any(x in msg for x in ("429", "resource_exhausted", "quota", "rate limit", "too many requests"))


def make_vertex_client():
    """Create a Vertex AI genai client using ADC."""
    from google import genai as _genai
    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0013158607")
    return _genai.Client(vertexai=True, project=project, location="global")


def _run_veo_operation(client, model, prompt, ref_image, args, generate_audio=True):
    """Submit Veo generate_videos and poll until done. Returns operation."""
    from google.genai import types

    config_kwargs = dict(
        aspect_ratio=args.aspect_ratio,
        resolution=args.resolution,
        generate_audio=generate_audio,
        number_of_videos=args.num_videos,
        duration_seconds=args.duration,
    )
    if args.person_generation:
        config_kwargs["person_generation"] = args.person_generation
    if args.seed is not None:
        config_kwargs["seed"] = args.seed

    config = types.GenerateVideosConfig(**config_kwargs)

    # Build source: image-to-video or text-to-video
    if ref_image:
        from io import BytesIO
        buf = BytesIO()
        ref_image.save(buf, format="PNG")
        source = types.GenerateVideosSource(
            image=types.Image(image_bytes=buf.getvalue(), mime_type="image/png"),
            prompt=prompt,
        )
    else:
        source = types.GenerateVideosSource(prompt=prompt)

    operation = client.models.generate_videos(model=model, source=source, config=config)

    MAX_POLL_TIME = 600
    start_time = time.time()
    while not operation.done:
        elapsed = time.time() - start_time
        if elapsed > MAX_POLL_TIME:
            raise TimeoutError(f"Veo timed out after {int(elapsed)}s")
        time.sleep(10)
        operation = client.operations.get(operation)
        print(f"[{int(elapsed)}s].", end="", flush=True)
    print()
    return operation


def _kling_jwt(access_key, secret_key):
    """Generate a short-lived HS256 JWT for Kling API auth."""
    import jwt
    now = int(time.time())
    payload = {"iss": access_key, "exp": now + 1800, "nbf": now - 5, "iat": now}
    return jwt.encode(payload, secret_key, algorithm="HS256")


def _kling_headers(access_key, secret_key):
    """Build Authorization + Content-Type headers for Kling API."""
    return {
        "Authorization": f"Bearer {_kling_jwt(access_key, secret_key)}",
        "Content-Type": "application/json",
    }


def _kling_camera_params(camera_preset):
    """Convert a camera preset name to Kling camera_control dict.

    Official API structure: {"type": "<preset>"|"simple", "config": {...}}
    - Named presets: type IS the preset name (no config needed)
    - Simple mode: type="simple", config has horizontal/vertical/pan/tilt/roll/zoom (-10 to 10)
    """
    # Named presets (type IS the preset, no config needed)
    type_presets = {
        "down-back": "down_back",
        "forward-up": "forward_up",
        "right-turn": "right_turn_forward",
        "left-turn": "left_turn_forward",
    }
    if camera_preset in type_presets:
        return {"type": type_presets[camera_preset]}

    # Simple movement presets (type="simple" with config values -10 to 10)
    simple_presets = {
        "pan-left":  {"pan": -10},
        "pan-right": {"pan": 10},
        "tilt-up":   {"tilt": 10},
        "tilt-down": {"tilt": -10},
        "zoom-in":   {"zoom": 10},
        "zoom-out":  {"zoom": -10},
        "dolly-in":  {"zoom": 10},
        "dolly-out": {"zoom": -10},
    }
    if camera_preset in simple_presets:
        config = {"horizontal": 0, "vertical": 0, "pan": 0, "tilt": 0, "roll": 0, "zoom": 0}
        config.update(simple_presets[camera_preset])
        return {"type": "simple", "config": config}

    # Raw JSON passthrough
    try:
        return json.loads(camera_preset)
    except (json.JSONDecodeError, TypeError):
        print(f"Warning: Unknown camera preset '{camera_preset}', ignoring.", file=sys.stderr)
        return None


def _kling_submit_text2video(access_key, secret_key, prompt, args):
    """POST /v1/videos/text2video and return task_id."""
    import requests
    mode_str = "pro" if args.backend == "kling-pro" else "std"
    # Snap duration to nearest "5" or "10"
    dur = "5" if args.duration <= 7 else "10"

    # Multi-shot mode: replace prompt+duration with shot_N_prompt/shot_N_duration
    if args.multi_shot:
        try:
            shots = json.loads(args.multi_shot)
        except json.JSONDecodeError as e:
            print(f"Error: --multi-shot must be valid JSON: {e}", file=sys.stderr)
            sys.exit(1)
        body = {
            "model_name": args.kling_model,
            "mode": mode_str,
            "aspect_ratio": args.aspect_ratio,
        }
        if args.kling_model.startswith("kling-v1"):
            body["cfg_scale"] = args.cfg_scale
        else:
            body["enable_audio"] = True
        for idx, shot in enumerate(shots, 1):
            body[f"shot_{idx}_prompt"] = shot["prompt"]
            body[f"shot_{idx}_duration"] = str(shot.get("duration", 5))
    else:
        body = {
            "model_name": args.kling_model,
            "prompt": prompt,
            "mode": mode_str,
            "aspect_ratio": args.aspect_ratio,
            "duration": dur,
        }
        if args.kling_model.startswith("kling-v1"):
            body["cfg_scale"] = args.cfg_scale
        else:
            body["enable_audio"] = True

    if args.negative_prompt:
        if args.kling_model in ("kling-v2-5", "kling-v2-6", "kling-v3-0"):
            print("Warning: negative_prompt not supported on {}, skipping.".format(args.kling_model), file=sys.stderr)
        else:
            body["negative_prompt"] = args.negative_prompt

    # Camera control (text2video only, V1 models only)
    if args.camera:
        if not args.kling_model.startswith("kling-v1"):
            print("Warning: camera_control is only supported on V1 models, ignoring --camera for {}.".format(args.kling_model), file=sys.stderr)
        else:
            cam = _kling_camera_params(args.camera)
            if cam:
                body["camera_control"] = cam

    resp = requests.post(
        f"{KLING_BASE_URL}/v1/videos/text2video",
        headers=_kling_headers(access_key, secret_key),
        json=body,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 0:
        raise RuntimeError(f"Kling text2video failed: {data.get('message', data)}")
    return data["data"]["task_id"]


def _kling_submit_image2video(access_key, secret_key, prompt, ref_image, args):
    """POST /v1/videos/image2video with a base64-encoded reference image.

    NOTE: Official Kling docs show image/image_tail as URL strings (uploaded via
    POST /v1/images/assets). Base64 may also be accepted — keeping base64 for now.
    If the API rejects base64, add an image upload step to get a URL first.
    """
    import requests, base64
    from io import BytesIO
    mode_str = "pro" if args.backend == "kling-pro" else "std"
    dur = "5" if args.duration <= 7 else "10"
    buf = BytesIO()
    ref_image.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    body = {
        "model_name": args.kling_model,
        "prompt": prompt,
        "mode": mode_str,
        "aspect_ratio": args.aspect_ratio,
        "duration": dur,
        "image": b64,
    }
    if args.kling_model.startswith("kling-v1"):
        body["cfg_scale"] = args.cfg_scale
    if args.negative_prompt:
        if args.kling_model in ("kling-v2-5", "kling-v2-6", "kling-v3-0"):
            print("Warning: negative_prompt not supported on {}, skipping.".format(args.kling_model), file=sys.stderr)
        else:
            body["negative_prompt"] = args.negative_prompt
    # End-frame image (image_tail) for start→end transitions
    if args.end_image:
        end_path = Path(args.end_image).expanduser()
        if not end_path.exists():
            print(f"Warning: --end-image not found: {end_path}, skipping.", file=sys.stderr)
        else:
            from PIL import Image as PILImage
            end_img = PILImage.open(str(end_path))
            end_buf = BytesIO()
            end_img.save(end_buf, format="PNG")
            body["image_tail"] = base64.b64encode(end_buf.getvalue()).decode()
    # enable_audio is incompatible with image_tail per Kling docs
    if "image_tail" not in body and not args.kling_model.startswith("kling-v1"):
        body["enable_audio"] = True
    resp = requests.post(
        f"{KLING_BASE_URL}/v1/videos/image2video",
        headers=_kling_headers(access_key, secret_key),
        json=body,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 0:
        raise RuntimeError(f"Kling image2video failed: {data.get('message', data)}")
    return data["data"]["task_id"]


def _kling_poll(access_key, secret_key, task_id, creation_endpoint, max_poll_time=600):
    """Poll GET /v1/videos/{creation_endpoint}/{task_id} until succeed/failed."""
    import requests
    start = time.time()
    while True:
        elapsed = time.time() - start
        if elapsed > max_poll_time:
            raise TimeoutError(f"Kling poll timed out after {int(elapsed)}s")
        resp = requests.get(
            f"{KLING_BASE_URL}/v1/videos/{creation_endpoint}/{task_id}",
            headers=_kling_headers(access_key, secret_key),
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"Kling poll error: {data.get('message', data)}")
        status = data["data"]["task_status"]
        if status == "succeed":
            return data["data"]["task_result"]
        if status == "failed":
            reason = data["data"].get("task_status_msg", "unknown")
            raise RuntimeError(f"Kling generation failed: {reason}")
        print(f"[{int(elapsed)}s] {status}.", end="", flush=True)
        time.sleep(5)


def _kling_download(video_url, output_path):
    """Stream-download a video from Kling CDN."""
    import requests
    resp = requests.get(video_url, stream=True, timeout=120)
    resp.raise_for_status()
    with open(output_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)


def main():
    parser = argparse.ArgumentParser(description="Generate videos via litellm")
    parser.add_argument("--prompt", "-p", required=True)
    parser.add_argument("--filename", "-f", required=True)
    parser.add_argument("--duration", "-d", type=int, default=8, help="Video length in seconds (default: 8)")
    parser.add_argument("--aspect-ratio", "-a", choices=["9:16", "16:9", "1:1"], default="9:16")
    parser.add_argument("--backend", "-b",
        choices=["veo-fast", "veo-quality", "vertex-veo-fast", "vertex-veo-quality", "kling-pro", "kling-std", "sora"],
        default="vertex-veo-fast")
    parser.add_argument("--resolution", "-r", choices=["720p", "1080p"], default="1080p",
        help="Output resolution (default: 1080p)")
    parser.add_argument("--num-videos", "-n", type=int, choices=[1, 2, 3, 4], default=1,
        help="Number of videos to generate (1-4, default: 1)")
    parser.add_argument("--person-generation", choices=["allow_all", "allow_adult", "dont_allow"],
        default=None, help="Person generation policy (default: unset, uses model default)")
    parser.add_argument("--seed", type=int, default=None, help="Seed for reproducibility")
    parser.add_argument("--api-key", "-k", help="Provider API key override")
    parser.add_argument("--base-url", help="litellm base URL override")
    parser.add_argument("--reference-image", "-I", help="Reference image path for image-to-video generation")
    parser.add_argument("--negative-prompt", default=None, help="Negative prompt (Kling only)")
    parser.add_argument("--kling-model", default="kling-v3-0",
        help="Kling model_name override (default: kling-v3-0). Options: kling-v1, kling-v2-6, kling-video-o1, kling-v3-0")
    parser.add_argument("--cfg-scale", type=float, default=0.5,
        help="CFG scale for Kling (0-1, default: 0.5)")
    parser.add_argument("--camera", default=None,
        help="Camera control preset for Kling text2video: dolly-in, dolly-out, pan-left, pan-right, tilt-up, tilt-down, zoom-in, zoom-out, or raw JSON")
    parser.add_argument("--multi-shot", default=None,
        help='Multi-shot JSON for Kling: [{"prompt":"scene 1","duration":5},{"prompt":"scene 2","duration":5}]')
    parser.add_argument("--end-image", default=None,
        help="End-frame image path for Kling image-to-video (image_tail)")
    parser.add_argument("--no-upload", action="store_true", help="Skip Slack upload")
    args = parser.parse_args()

    # Veo 3.1: auto-append anti-text directive to prevent text/watermark artifacts
    if args.backend in ("veo-fast", "veo-quality", "vertex-veo-fast", "vertex-veo-quality"):
        _lower = args.prompt.lower()
        if not any(kw in _lower for kw in ("no text", "no words", "no letters", "without text")):
            args.prompt = args.prompt.rstrip() + " Do not render any text, words, letters, numbers, titles, captions, subtitles, or watermarks on screen."
            print("(Auto-appended no-text directive for Veo 3.1)")

    output_path = Path(args.filename).expanduser()
    if not output_path.is_absolute():
        output_path = Path(__file__).resolve().parent.parent.parent.parent / "media" / output_path
    output_path.parent.mkdir(parents=True, exist_ok=True)

    saved_paths = []
    base_url = args.base_url or LITELLM_BASE_URL

    # Load reference image if provided
    ref_image = None
    if args.reference_image:
        ref_path = Path(args.reference_image).expanduser()
        if not ref_path.exists():
            print(f"Error: Reference image not found: {ref_path}", file=sys.stderr)
            sys.exit(1)
        print(f"Reference image: {ref_path}")
        from PIL import Image as PILImage
        ref_image = PILImage.open(str(ref_path))
        print(f"  Size: {ref_image.size}, Mode: {ref_image.mode}")

    if args.backend == "sora":
        # Sora via litellm (OpenAI-compatible)
        from openai import OpenAI

        api_key = args.api_key or LITELLM_API_KEY
        client = OpenAI(base_url=base_url, api_key=api_key)

        mode = "image-to-video" if ref_image else "text-to-video"
        print(f"Generating Sora video ({mode}, {args.duration}s, {args.aspect_ratio}) via litellm...")

        size_map = {"9:16": "720x1280", "16:9": "1280x720", "1:1": "1080x1080"}

        sora_kwargs = dict(
            model="sora-2",
            prompt=args.prompt,
            size=size_map[args.aspect_ratio],
            seconds=str(args.duration),
        )
        if ref_image:
            import base64
            from io import BytesIO
            buf = BytesIO()
            ref_image.save(buf, format="PNG")
            b64 = base64.b64encode(buf.getvalue()).decode()
            sora_kwargs["input_image_base64"] = b64

        video_job = client.videos.create_and_poll(**sora_kwargs)

        if video_job.status == "completed":
            print(f"Generation complete. Downloading {video_job.id}...")
            res = client.videos.download_content(video_job.id)
            output_path.write_bytes(res.content)
            print(f"MEDIA:{output_path.resolve()}")
            saved_paths.append(output_path)
            # Save .meta.json sidecar for extension support
            meta = {
                "backend": "sora", "job_id": video_job.id, "prompt": args.prompt,
                "duration": args.duration, "aspect_ratio": args.aspect_ratio,
                "resolution": args.resolution,
            }
            output_path.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2))
        else:
            print(f"Error: Video generation status is {video_job.status}", file=sys.stderr)
            if hasattr(video_job, 'error'):
                print(f"Error details: {video_job.error}", file=sys.stderr)
            sys.exit(1)

    elif args.backend in ("kling-pro", "kling-std"):
        # Kling 3.0 via REST API with JWT auth
        ak = KLING_ACCESS_KEY or get_provider_key("kling_ak")
        sk = KLING_SECRET_KEY or get_provider_key("kling_sk")
        if not ak or not sk:
            print("Error: KLING_ACCESS_KEY and KLING_SECRET_KEY required for Kling backend.", file=sys.stderr)
            sys.exit(1)

        creation_endpoint = "image2video" if ref_image else "text2video"
        mode = "image-to-video" if ref_image else "text-to-video"
        mode_str = "pro" if args.backend == "kling-pro" else "std"
        print(f"Generating Kling video ({mode_str} mode, {mode}, {args.duration}s, {args.aspect_ratio})...")

        if ref_image:
            task_id = _kling_submit_image2video(ak, sk, args.prompt, ref_image, args)
        else:
            task_id = _kling_submit_text2video(ak, sk, args.prompt, args)
        print(f"Kling task submitted: {task_id}")

        task_result = _kling_poll(ak, sk, task_id, creation_endpoint)
        print()

        videos = task_result.get("videos", [])
        if not videos:
            print("Error: Kling returned no videos.", file=sys.stderr)
            sys.exit(1)

        stem = output_path.stem
        suffix = output_path.suffix or ".mp4"
        parent = output_path.parent
        for i, vid in enumerate(videos):
            if len(videos) == 1:
                save_path = output_path
            else:
                save_path = parent / f"{stem}_{i + 1}{suffix}"
            _kling_download(vid["url"], save_path)
            size_mb = save_path.stat().st_size / (1024 * 1024)
            print(f"Saved: {save_path.resolve()} ({size_mb:.1f}MB)")
            print(f"MEDIA:{save_path.resolve()}")
            saved_paths.append(save_path)

        # Save .meta.json sidecar for extension support
        # video_id is needed for extension (different from task_id)
        video_id = videos[0].get("id", "") if videos else ""
        meta = {
            "backend": args.backend,
            "task_id": task_id,
            "video_id": video_id,
            "prompt": args.prompt,
            "duration": args.duration,
            "aspect_ratio": args.aspect_ratio,
            "resolution": args.resolution,
            "creation_endpoint": creation_endpoint,
        }
        output_path.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2))

    else:
        # Veo and Vertex backends — requires Google genai SDK
        from google import genai
        start_time = time.time()
        active_client = None

        # All Veo backends route through Vertex AI
        backend_map = {
            "vertex-veo-fast": "veo-3.1-fast-generate-001",
            "vertex-veo-quality": "veo-3.1-generate-001",
            "veo-fast": "veo-3.1-fast-generate-001",
            "veo-quality": "veo-3.1-generate-001",
        }
        vertex_model = backend_map.get(args.backend, "veo-3.1-fast-generate-001")
        mode = "image-to-video" if ref_image else "text-to-video"
        print(f"Using Vertex AI backend ({vertex_model}, {mode}, {args.duration}s, {args.aspect_ratio})...")
        active_client = make_vertex_client()
        operation = _run_veo_operation(active_client, vertex_model, args.prompt, ref_image, args, generate_audio=True)

        elapsed = time.time() - start_time
        generated = operation.response.generated_videos
        total = len(generated)
        print(f"\nGeneration complete ({int(elapsed)}s). {total} video(s). Downloading...")

        saved_paths = []
        stem = output_path.stem
        suffix = output_path.suffix or ".mp4"
        parent = output_path.parent

        for i, gen_video in enumerate(generated):
            video_obj = gen_video.video
            # Vertex AI returns video_bytes inline; fallback to files.download()
            if hasattr(video_obj, 'video_bytes') and video_obj.video_bytes:
                video_data = video_obj.video_bytes
            else:
                video_data = active_client.files.download(file=video_obj)

            # Single video → original filename; multiple → stem_1.mp4, stem_2.mp4, ...
            if total == 1:
                save_path = output_path
            else:
                save_path = parent / f"{stem}_{i + 1}{suffix}"

            save_path.write_bytes(video_data)
            size_mb = save_path.stat().st_size / (1024 * 1024)
            print(f"Saved: {save_path.resolve()} ({size_mb:.1f}MB)")
            print(f"MEDIA:{save_path.resolve()}")
            saved_paths.append(save_path)

            # Save .meta.json sidecar for extension support
            meta = {
                "backend": args.backend,
                "model": vertex_model if "vertex" in args.backend else studio_model,
                "prompt": args.prompt,
                "duration": args.duration,
                "aspect_ratio": args.aspect_ratio,
                "resolution": args.resolution,
            }
            if hasattr(video_obj, 'uri') and video_obj.uri:
                meta["video_uri"] = video_obj.uri
            save_path.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2))

    # Upload to Slack
    if not args.no_upload and saved_paths:
        for i, save_path in enumerate(saved_paths):
            file_size_mb = save_path.stat().st_size / (1024 * 1024)
            label = f" ({i+1}/{len(saved_paths)})" if len(saved_paths) > 1 else ""
            title = f"Generated video{label} ({args.backend}, {args.duration}s, {args.resolution}) - {file_size_mb:.1f}MB"
            print(f"\nUploading{label} to Slack ({file_size_mb:.1f}MB)...")
            if upload_to_slack(save_path, title):
                print(f"SLACK_UPLOADED:true")
            else:
                print(f"SLACK_UPLOADED:false — file saved locally", file=sys.stderr)


def _notify_complete(message: str):
    """Notify the agent so it can follow up with the user."""
    notify_script = Path(__file__).resolve().parent.parent.parent.parent / "scripts" / "notify-complete.sh"
    if notify_script.exists():
        try:
            subprocess.run([str(notify_script), message], timeout=20,
                           capture_output=True)
        except Exception:
            pass


# Task tracking — per-task file in active-tasks.d/ (no shared file = no race condition)
TASKS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "workspace" / "memory" / "active-tasks.d"


def _register_task(task_id: str, backend: str, log_file: str) -> Path:
    """Register this generation as a per-task file in active-tasks.d/."""
    from datetime import datetime, timezone
    TASKS_DIR.mkdir(parents=True, exist_ok=True)
    task_file = TASKS_DIR / f"{task_id}.json"
    task_file.write_text(json.dumps({
        "taskId": task_id,
        "type": "video-generation",
        "channel": f"channel:{SLACK_CHANNEL_ID}",
        "threadId": SLACK_THREAD_TS or "",
        "task": f"Video generation ({backend})",
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "pid": os.getpid(),
        "logFile": log_file,
    }, indent=2))
    return task_file


def _deregister_task(task_file: Path):
    """Remove this generation's task file."""
    try:
        task_file.unlink()
    except OSError:
        pass


if __name__ == "__main__":
    if os.environ.get("VIDEO_GEN_SAFE") != "1":
        print("ERROR: Direct generate_video.py calls are blocked.")
        print("Use generate_video_safe.sh instead.")
        sys.exit(1)
    import atexit
    # Parse args early to get task identity
    _args = sys.argv[1:]
    _backend = "veo-fast"
    _filename = ""
    for i, a in enumerate(_args):
        if a in ("-b", "--backend") and i + 1 < len(_args):
            _backend = _args[i + 1]
        if a in ("-f", "--filename") and i + 1 < len(_args):
            _filename = _args[i + 1]
    _task_id = f"generate-video-{int(time.time())}-{os.getpid()}"
    _task_file = _register_task(_task_id, _backend, _filename)
    atexit.register(_deregister_task, _task_file)

    try:
        main()
        _deregister_task(_task_file)
        _notify_complete(f"Done: Video generation complete. Check the output file.")
    except SystemExit:
        raise
    except Exception as e:
        _notify_complete(f"Done: Video generation failed — {e}")
        print(f"Video generation failed: {e}", file=sys.stderr)
        raise
