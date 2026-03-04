"""
music.py — Music discovery: Freesound API + local library scanning.

Source types for set-music:
  - freesound:<id>     — Download from Freesound by sound ID
  - library:<filename> — From local music library (workspace/music/)
  - <path>             — Local file (existing behavior)
  - none               — No music

Provides:
  - search_freesound(): Search Freesound API for tracks
  - download_freesound_track(): Download a specific track by ID
  - scan_local_library(): Scan workspace/music/ for audio files
  - suggest_music(): AI-powered music suggestions based on storyboard mood
  - get_attribution_text(): Generate CC attribution for Freesound tracks
"""

import json
import os
import subprocess
import sys
from pathlib import Path

FREESOUND_API_KEY = os.environ.get("FREESOUND_API_KEY", "")
FREESOUND_BASE_URL = "https://freesound.org/apiv2"

AUDIO_EXTENSIONS = frozenset({".mp3", ".wav", ".aac", ".ogg", ".m4a", ".flac"})

# Mood-to-Freesound query mapping (tag:music filter applied separately)
# Keep queries SHORT — Freesound matches better with 2-3 broad terms
MOOD_TO_QUERY = {
    "calm": "calm ambient",
    "warm": "acoustic piano",
    "energetic": "upbeat energetic",
    "dramatic": "cinematic orchestral",
    "premium": "soft piano",
    "playful": "playful ukulele",
    "inspiring": "inspirational uplifting",
    "relaxing": "chill lofi",
    "confident": "corporate modern",
    "emotional": "piano strings",
    "upbeat": "happy positive",
    "minimal": "ambient electronic",
}


def _get_audio_duration(path: str) -> float:
    """Get audio duration via ffprobe."""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet",
             "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1",
             path],
            capture_output=True, text=True, timeout=15,
        )
        return float(result.stdout.strip()) if result.returncode == 0 else 0.0
    except (ValueError, subprocess.TimeoutExpired, FileNotFoundError):
        return 0.0


def search_freesound(
    query: str,
    min_duration: float = 15,
    max_duration: float = 300,
    limit: int = 5,
    license_filter: str = "",
) -> list[dict]:
    """Search Freesound API for music tracks matching query.

    Returns list of {id, name, duration, url, preview_url, license, tags, description}.
    """
    import requests

    if not FREESOUND_API_KEY:
        return []

    fields = "id,name,duration,url,previews,license,tags,description,avg_rating,num_ratings"
    # tag:music filters out random sound effects, field recordings, etc.
    filter_parts = [f"duration:[{min_duration} TO {max_duration}]", "tag:music"]
    if license_filter:
        filter_parts.append(f'license:"{license_filter}"')

    params = {
        "query": query,
        "filter": " ".join(filter_parts),
        "fields": fields,
        "page_size": min(limit, 15),
        "sort": "score",
    }
    headers = {"Authorization": f"Token {FREESOUND_API_KEY}"}

    try:
        resp = requests.get(
            f"{FREESOUND_BASE_URL}/search/text/",
            params=params,
            headers=headers,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"WARNING: Freesound search failed: {e}")
        return []

    results = []
    for item in data.get("results", []):
        previews = item.get("previews", {})
        preview_url = previews.get("preview-hq-mp3", previews.get("preview-lq-mp3", ""))
        results.append({
            "id": item["id"],
            "name": item.get("name", ""),
            "duration": item.get("duration", 0),
            "url": item.get("url", ""),
            "preview_url": preview_url,
            "license": item.get("license", ""),
            "tags": item.get("tags", [])[:10],
            "description": (item.get("description", "") or "")[:200],
            "avg_rating": item.get("avg_rating", 0),
            "num_ratings": item.get("num_ratings", 0),
        })

    return results


def download_freesound_track(sound_id: int, output_path: str) -> dict:
    """Download a Freesound track by ID.

    Returns {path, duration, license, attribution, name} or {error}.
    """
    import requests

    if not FREESOUND_API_KEY:
        return {"error": "FREESOUND_API_KEY not set"}

    headers = {"Authorization": f"Token {FREESOUND_API_KEY}"}

    # Get sound details first
    try:
        resp = requests.get(
            f"{FREESOUND_BASE_URL}/sounds/{sound_id}/",
            params={"fields": "id,name,duration,license,username,previews"},
            headers=headers,
            timeout=15,
        )
        resp.raise_for_status()
        info = resp.json()
    except Exception as e:
        return {"error": f"Failed to get sound info: {e}"}

    # Download preview (HQ MP3 — no OAuth needed, just token auth)
    previews = info.get("previews", {})
    download_url = previews.get("preview-hq-mp3", previews.get("preview-lq-mp3", ""))
    if not download_url:
        return {"error": "No preview URL available for this sound"}

    try:
        resp = requests.get(download_url, headers=headers, timeout=60, stream=True)
        resp.raise_for_status()
        with open(output_path, "wb") as f:
            for chunk in resp.iter_content(8192):
                f.write(chunk)
    except Exception as e:
        return {"error": f"Download failed: {e}"}

    if not os.path.exists(output_path) or os.path.getsize(output_path) < 1000:
        return {"error": "Downloaded file is empty or too small"}

    duration = _get_audio_duration(output_path)
    license_name = info.get("license", "")
    username = info.get("username", "")
    name = info.get("name", f"Sound {sound_id}")

    # Build attribution string
    attribution = f'"{name}" by {username} (freesound.org/{sound_id})'
    if "Creative Commons 0" in license_name:
        attribution += " — CC0 (Public Domain)"
    elif license_name:
        license_short = license_name.split("/")[-2] if "/" in license_name else license_name
        attribution += f" — {license_short}"

    return {
        "path": output_path,
        "duration": duration,
        "license": license_name,
        "attribution": attribution,
        "name": name,
    }


def scan_local_library(library_dir: str) -> list[dict]:
    """Scan workspace/music/ for audio files.

    Returns list of {path, name, duration} sorted by name.
    """
    lib_path = Path(library_dir)
    if not lib_path.is_dir():
        return []

    tracks = []
    for f in sorted(lib_path.iterdir()):
        if f.is_file() and f.suffix.lower() in AUDIO_EXTENSIONS:
            duration = _get_audio_duration(str(f))
            tracks.append({
                "path": str(f),
                "name": f.name,
                "duration": duration,
            })
    return tracks


def _extract_mood_keywords(storyboard: dict) -> dict:
    """Extract mood, energy, tempo keywords from storyboard scenes.

    Returns {mood: str, energy: str, keywords: list[str]}.
    """
    # Collect mood signals from multiple sources
    moods = []

    # Explicit mood field on storyboard
    if storyboard.get("mood"):
        moods.append(storyboard["mood"].lower())

    # Scene descriptions and text
    scene_text = ""
    for scene in storyboard.get("scenes", []):
        desc = scene.get("description", "")
        text = scene.get("text", "")
        scene_mood = scene.get("mood", "")
        scene_text += f" {desc} {text}"
        if scene_mood:
            moods.append(scene_mood.lower())

    # VO script tone
    vo_script = storyboard.get("voiceover_script", "")
    full_text = (scene_text + " " + vo_script).lower()

    # Keyword detection from content
    mood_signals = {
        "calm": ["calm", "peaceful", "serene", "tranquil", "quiet", "soft"],
        "warm": ["warm", "cozy", "comfort", "gentle", "inviting", "home"],
        "energetic": ["energy", "active", "fast", "power", "intense", "workout"],
        "dramatic": ["dramatic", "bold", "striking", "powerful", "impact"],
        "premium": ["premium", "luxury", "elegant", "sophisticated", "high-end"],
        "playful": ["playful", "fun", "light", "cheerful", "bright", "happy"],
        "inspiring": ["inspir", "motivat", "uplift", "dream", "achieve"],
        "relaxing": ["relax", "chill", "unwind", "spa", "sleep", "sooth"],
        "confident": ["confident", "modern", "bold", "strong", "empower"],
        "emotional": ["emotional", "touching", "heartfelt", "story", "journey"],
        "upbeat": ["upbeat", "positive", "joyful", "excited", "celebrate"],
    }

    scores = {}
    for mood, keywords in mood_signals.items():
        score = sum(1 for kw in keywords if kw in full_text)
        if mood in moods:
            score += 3  # Explicit mood gets a boost
        if score > 0:
            scores[mood] = score

    # Sort by score, take top mood
    sorted_moods = sorted(scores.items(), key=lambda x: -x[1])
    primary_mood = sorted_moods[0][0] if sorted_moods else "warm"
    all_keywords = [m for m, _ in sorted_moods[:3]]

    # Determine energy level from scene count and duration
    scenes = storyboard.get("scenes", [])
    total_dur = storyboard.get("total_duration", 30)
    avg_scene_dur = total_dur / max(len(scenes), 1)
    energy = "high" if avg_scene_dur < 4 else "low" if avg_scene_dur > 8 else "medium"

    return {
        "mood": primary_mood,
        "energy": energy,
        "keywords": all_keywords,
    }


def suggest_music(
    storyboard: dict,
    library_dir: str = "",
    target_duration: float = 0,
) -> list[dict]:
    """Analyze storyboard mood/energy and suggest music.

    Returns ranked list of suggestions with source and reason.
    """
    mood_info = _extract_mood_keywords(storyboard)
    primary_mood = mood_info["mood"]
    keywords = mood_info["keywords"]
    energy = mood_info["energy"]

    if target_duration <= 0:
        target_duration = storyboard.get("total_duration", 30)

    # Duration range: allow tracks somewhat longer than video (will be trimmed)
    min_dur = max(10, target_duration * 0.5)
    max_dur = target_duration * 4

    suggestions = []

    # Search Freesound if API key available
    if FREESOUND_API_KEY:
        # Primary search using mood keyword (all licenses — CC0 used as ranking boost)
        query = MOOD_TO_QUERY.get(primary_mood, f"{primary_mood} background music")
        fs_results = search_freesound(
            query=query,
            min_duration=min_dur,
            max_duration=max_dur,
            limit=8,
        )
        for r in fs_results:
            mood_match = [kw for kw in keywords if kw in " ".join(r.get("tags", [])).lower()]
            suggestions.append({
                "rank": 0,
                "name": r["name"],
                "duration": r["duration"],
                "source": f"freesound:{r['id']}",
                "preview_url": r.get("preview_url", ""),
                "license": r.get("license", ""),
                "avg_rating": r.get("avg_rating", 0),
                "num_ratings": r.get("num_ratings", 0),
                "mood_match": mood_match or [primary_mood],
                "reason": f"Mood: {primary_mood}, energy: {energy}",
            })

        # If few results, try secondary query with energy modifier
        if len(suggestions) < 3:
            energy_terms = {"high": "upbeat fast", "medium": "moderate", "low": "slow ambient"}
            secondary_query = f"{primary_mood} {energy_terms.get(energy, '')} background music"
            fs_results2 = search_freesound(
                query=secondary_query,
                min_duration=min_dur,
                max_duration=max_dur,
                limit=5,
            )
            seen_ids = {s["source"] for s in suggestions}
            for r in fs_results2:
                ref = f"freesound:{r['id']}"
                if ref not in seen_ids:
                    suggestions.append({
                        "rank": 0,
                        "name": r["name"],
                        "duration": r["duration"],
                        "source": ref,
                        "preview_url": r.get("preview_url", ""),
                        "license": r.get("license", ""),
                        "avg_rating": r.get("avg_rating", 0),
                        "num_ratings": r.get("num_ratings", 0),
                        "mood_match": [primary_mood],
                        "reason": f"Secondary: {primary_mood} + {energy} energy",
                    })

    # Scan local library
    if library_dir:
        local_tracks = scan_local_library(library_dir)
        for track in local_tracks:
            suggestions.append({
                "rank": 0,
                "name": track["name"],
                "duration": track["duration"],
                "source": f"library:{track['name']}",
                "preview_url": "",
                "license": "local",
                "mood_match": [],
                "reason": "Local library",
            })

    # Rank: prefer duration match, CC0, good ratings, mood match
    for i, s in enumerate(suggestions):
        dur_diff = abs(s["duration"] - target_duration)
        dur_score = max(0, 100 - dur_diff)  # Closer to target = higher score
        is_cc0 = 1 if "Creative Commons 0" in s.get("license", "") else 0
        mood_score = len(s.get("mood_match", [])) * 20
        rating = s.get("avg_rating", 0) or 0
        num_ratings = s.get("num_ratings", 0) or 0
        rating_score = (rating * 10) if num_ratings >= 2 else 0  # Only trust with 2+ ratings
        s["rank"] = dur_score + (is_cc0 * 50) + mood_score + rating_score

    suggestions.sort(key=lambda x: -x["rank"])
    return suggestions[:8]


def get_attribution_text(session: dict) -> str:
    """Generate attribution text for Freesound CC tracks used in the video."""
    attribution = session.get("music_attribution", "")
    if not attribution:
        return ""
    license_name = session.get("music_license", "")
    if "Creative Commons 0" in license_name:
        return f"Music: {attribution} (no attribution required — CC0)"
    return f"Music attribution: {attribution}"
