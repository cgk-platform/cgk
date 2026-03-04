"""
voice_search.py — ElevenLabs voice library search & preview download.

Uses stdlib only (urllib) — no new dependencies.

Provides:
  - search_shared_voices(): Search the ElevenLabs shared voice library
  - get_user_voices(): List voices in the user's own library
  - download_preview(): Download a voice preview MP3 to local path
  - add_voice_to_library(): Add a shared voice to the user's ElevenLabs library
"""

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

ELEVEN_API_KEY = os.environ.get("ELEVEN_API_KEY", "")
ELEVEN_BASE = "https://api.elevenlabs.io"


def _eleven_get(path: str, params: dict | None = None) -> dict:
    """GET request to ElevenLabs API. Returns parsed JSON."""
    url = f"{ELEVEN_BASE}{path}"
    if params:
        qs = "&".join(
            f"{k}={urllib.request.quote(str(v))}"
            for k, v in params.items()
            if v is not None and v != ""
        )
        if qs:
            url = f"{url}?{qs}"

    req = urllib.request.Request(
        url,
        headers={
            "xi-api-key": ELEVEN_API_KEY,
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")[:500]
        raise RuntimeError(f"ElevenLabs API {e.code}: {body}") from e


def _eleven_post(path: str, body: dict | None = None) -> dict:
    """POST request to ElevenLabs API. Returns parsed JSON."""
    url = f"{ELEVEN_BASE}{path}"
    data = json.dumps(body or {}).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "xi-api-key": ELEVEN_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode(errors="replace")[:500]
        raise RuntimeError(f"ElevenLabs API {e.code}: {body_text}") from e


def _normalize_voice(v: dict, source: str = "shared") -> dict:
    """Normalize a voice dict from either shared or user endpoint."""
    if source == "shared":
        return {
            "voice_id": v.get("voice_id", ""),
            "name": v.get("name", ""),
            "public_owner_id": v.get("public_owner_id", ""),
            "gender": v.get("gender", ""),
            "age": v.get("age", ""),
            "accent": v.get("accent", ""),
            "use_case": v.get("use_case", ""),
            "category": v.get("category", ""),
            "language": v.get("language", ""),
            "description": v.get("descriptive", "") or v.get("description", ""),
            "preview_url": v.get("preview_url", ""),
            "is_added_by_user": v.get("is_added_by_user", False),
        }
    # User library voice
    labels = v.get("labels", {})
    return {
        "voice_id": v.get("voice_id", ""),
        "name": v.get("name", ""),
        "gender": labels.get("gender", ""),
        "age": labels.get("age", ""),
        "accent": labels.get("accent", ""),
        "use_case": labels.get("use_case", ""),
        "category": v.get("category", ""),
        "language": labels.get("language", ""),
        "description": labels.get("description", "") or v.get("description", ""),
        "preview_url": v.get("preview_url", ""),
    }


def search_shared_voices(
    search: str = "",
    gender: str = "",
    age: str = "",
    accent: str = "",
    use_case: str = "",
    category: str = "",
    page_size: int = 10,
) -> list[dict]:
    """Search the ElevenLabs shared voice library.

    Returns list of normalized voice dicts.
    """
    params = {"page_size": page_size}
    if search:
        params["search"] = search
    if gender:
        params["gender"] = gender
    if age:
        params["age"] = age
    if accent:
        params["accent"] = accent
    if use_case:
        params["use_case"] = use_case
    if category:
        params["category"] = category

    data = _eleven_get("/v1/shared-voices", params)
    voices = data.get("voices", [])
    return [_normalize_voice(v, "shared") for v in voices]


def get_user_voices(
    search: str = "",
    page_size: int = 30,
) -> list[dict]:
    """Get voices from the user's own ElevenLabs library.

    Includes premade, cloned, and saved voices.
    """
    data = _eleven_get("/v2/voices")
    voices = data.get("voices", [])
    results = [_normalize_voice(v, "user") for v in voices]

    # Client-side search filter (user endpoint doesn't support server-side search)
    if search:
        terms = search.lower().split()
        filtered = []
        for v in results:
            searchable = " ".join([
                v["name"], v["gender"], v["age"], v["accent"],
                v["use_case"], v["description"],
            ]).lower()
            if all(t in searchable for t in terms):
                filtered.append(v)
        results = filtered

    return results[:page_size]


def download_preview(preview_url: str, output_path: str) -> bool:
    """Download a voice preview MP3 to a local path.

    Returns True on success, False on failure (non-fatal).
    """
    if not preview_url:
        return False
    try:
        req = urllib.request.Request(preview_url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(resp.read())
        return True
    except Exception:
        return False


def add_voice_to_library(
    voice_id: str,
    public_owner_id: str,
    name: str,
) -> bool:
    """Add a shared voice to the user's ElevenLabs library.

    Calls POST /v1/voices/add/{public_owner_id}/{voice_id}.
    Entirely non-fatal — returns True on success, False on any error.
    """
    if not voice_id or not public_owner_id:
        return False
    try:
        result = _eleven_post(
            f"/v1/voices/add/{public_owner_id}/{voice_id}",
            {"new_name": name or "Saved Voice"},
        )
        return bool(result.get("voice_id"))
    except Exception:
        return False
