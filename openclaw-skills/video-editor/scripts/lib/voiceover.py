"""
voiceover.py — ElevenLabs TTS with word-level timestamps.

Provides:
  - resolve_voice(): Map voice name → voice_id
  - generate_preview(): Short preview clip
  - generate_full_voiceover(): Full VO + word timestamp JSON
"""

import json
import os
import subprocess
import sys

ELEVEN_API_KEY = os.environ.get("ELEVEN_API_KEY", "")

# Well-known ElevenLabs voice name → ID mappings
VOICE_MAP = {
    "rachel": "21m00Tcm4TlvDq8ikWAM",
    "drew": "29vD33N1CtxCmqQRPOHJ",
    "clyde": "2EiwWnXFnvU5JabPnv8n",
    "paul": "5Q0t7uMcjvnagumLfvZi",
    "domi": "AZnzlk1XvdvUeBnXmlld",
    "dave": "CYw49thndnv3VG8VTISZ",
    "fin": "D38z5RcWu1voky8WS1ja",
    "sarah": "EXAVITQu4vr4xnSDxMaL",
    "antoni": "ErXwobaYiN019PkySvjV",
    "thomas": "GBv7mTt0atIp3Br8iCZE",
    "charlie": "IKne3meq5aSn9XLyUdCD",
    "emily": "LcfcDJNUP1GQjkzn1xUU",
    "elli": "MF3mGyEYCl7XYWbV9V6O",
    "callum": "N2lVS1w4EtoT3dr4eOWO",
    "patrick": "ODq5zmih8GrVes37Dizd",
    "harry": "SOYHLrjzK2X1ezoPC6cr",
    "liam": "TX3LPaxmHKxFdv7VOQHJ",
    "dorothy": "ThT5KcBeYPX3keUQqHPh",
    "josh": "TxGEqnHWrfWFTfGW9XjX",
    "arnold": "VR6AewLTigWG4xSOukaG",
    "charlotte": "XB0fDUnXU5powFXDhCwa",
    "alice": "Xb7hH8MSUJpSbSDYk0k2",
    "matilda": "XrExE9yKIg1WjnnlVkGX",
    "james": "ZQe5CZNOzWyzPSCn5a3c",
    "joseph": "Zlb1dXrM653N07WRdFW3",
    "jessica": "cgSgspJ2msm6clMCkdW9",
    "michael": "flq6f7yk4E4fJM5XTYuZ",
    "ethan": "g5CIjZEefAph4nQFvHAz",
    "chris": "iP95p4xoKVk53GoZ742B",
    "gigi": "jBpfuIE2acCO8z3wKNLl",
    "freya": "jsCqWAovK2LkecY7zXl4",
    "brian": "nPczCjzI2devNBz1zQrb",
    "grace": "oWAxZDx7w5VEj9dCyTzz",
    "daniel": "onwK4e9ZLuTAKqWV03F9",
    "lily": "pFZP5JQG7iQjIQuC4Bku",
    "serena": "pMsXgVXv3BLzUgSXRplE",
    "adam": "pNInz6obpgDQGcFmaJgB",
    "nicole": "piTKgcLEGmPE4e6mEKli",
    "bill": "pqHfZKP75CvOlQylNhV4",
    "george": "JBFqnCBsd6RMkjVDRZzb",
    "sam": "yoZ06aMxZJJ28mfd3POQ",
    "glinda": "z9fAnlkpzviPz146aGWa",
    "bella": "EXAVITQu4vr4xnSDxMaL",
}


def resolve_voice(name: str = "", voice_id: str = "") -> tuple[str, str]:
    """Resolve voice name to (voice_id, display_name)."""
    if voice_id:
        return voice_id, name or "custom"

    if not name:
        # Default voice
        return VOICE_MAP["rachel"], "Rachel"

    key = name.lower().strip()
    if key in VOICE_MAP:
        return VOICE_MAP[key], name.title()

    # If exact ID was passed as name
    if len(name) > 10 and not " " in name:
        return name, name

    print(f"WARNING: Voice '{name}' not found in presets. Using as voice_id directly.")
    return name, name


def generate_preview(text: str, voice_id: str, output_path: str):
    """Generate a short voice preview clip."""
    try:
        from elevenlabs import ElevenLabs
    except ImportError:
        print("ERROR: elevenlabs package not installed. Run: pip install elevenlabs")
        sys.exit(1)

    if not ELEVEN_API_KEY:
        print("ERROR: ELEVEN_API_KEY not set.")
        sys.exit(1)

    client = ElevenLabs(api_key=ELEVEN_API_KEY)

    audio_generator = client.text_to_speech.convert(
        voice_id=voice_id,
        text=text,
        model_id="eleven_multilingual_v2",
        output_format="mp3_44100_128",
    )

    # Collect bytes from generator
    audio_bytes = b""
    for chunk in audio_generator:
        audio_bytes += chunk

    with open(output_path, "wb") as f:
        f.write(audio_bytes)

    print(f"Preview saved: {output_path} ({len(audio_bytes)} bytes)")


def generate_full_voiceover(
    script: str, voice_id: str, audio_path: str, timestamps_path: str
):
    """Generate full voiceover with word-level timestamps."""
    try:
        from elevenlabs import ElevenLabs
    except ImportError:
        print("ERROR: elevenlabs package not installed. Run: pip install elevenlabs")
        sys.exit(1)

    if not ELEVEN_API_KEY:
        print("ERROR: ELEVEN_API_KEY not set.")
        sys.exit(1)

    client = ElevenLabs(api_key=ELEVEN_API_KEY)

    # Use convert_with_timestamps for word-level timing
    response = client.text_to_speech.convert_with_timestamps(
        voice_id=voice_id,
        text=script,
        model_id="eleven_multilingual_v2",
        output_format="mp3_44100_128",
    )

    import base64 as _base64

    audio_bytes = b""
    words = []

    def _process_alignment(alignment):
        """Extract word timestamps from an alignment object (handles both old and new SDK formats)."""
        if alignment is None:
            return
        # New SDK: alignment may be a dict or object with character_start_times_seconds etc.
        # Old SDK: alignment.words or alignment.characters
        characters = None
        char_starts = None
        char_ends = None

        if isinstance(alignment, dict):
            characters = alignment.get("characters", [])
            char_starts = alignment.get("character_start_times_seconds", [])
            char_ends = alignment.get("character_end_times_seconds", [])
        else:
            # Try object attributes
            if hasattr(alignment, "words") and alignment.words:
                for w in alignment.words:
                    words.append({
                        "word": w.word if hasattr(w, "word") else str(w),
                        "start": w.start if hasattr(w, "start") else 0,
                        "end": w.end if hasattr(w, "end") else 0,
                    })
                return
            characters = getattr(alignment, "characters", None) or []
            char_starts = getattr(alignment, "character_start_times_seconds", None) or []
            char_ends = getattr(alignment, "character_end_times_seconds", None) or []

        # Build words from character arrays
        current_word = ""
        word_start = None
        word_end = None

        for i, ch in enumerate(characters):
            char = ch if isinstance(ch, str) else (getattr(ch, "character", "") if hasattr(ch, "character") else "")
            start = char_starts[i] if isinstance(char_starts, list) and i < len(char_starts) else (getattr(ch, "character_start_times_seconds", 0) if hasattr(ch, "character_start_times_seconds") else getattr(ch, "start", 0))
            end = char_ends[i] if isinstance(char_ends, list) and i < len(char_ends) else (getattr(ch, "character_end_times_seconds", 0) if hasattr(ch, "character_end_times_seconds") else getattr(ch, "end", 0))

            if char.strip() == "" or char in ".,!?;:":
                if current_word:
                    words.append({
                        "word": current_word + (char if char in ".,!?;:" else ""),
                        "start": word_start,
                        "end": word_end,
                    })
                    current_word = ""
                    word_start = None
                    word_end = None
            else:
                if word_start is None:
                    word_start = start
                current_word += char
                word_end = end

        if current_word:
            words.append({"word": current_word, "start": word_start, "end": word_end})

    for item in response:
        # Handle ElevenLabs SDK 2.x which returns tuples of (event_type, data)
        if isinstance(item, tuple):
            event_type, data = item[0], item[1] if len(item) > 1 else None
            if event_type == "audio_base_64" and data:
                audio_bytes += _base64.b64decode(data)
            elif event_type == "alignment" and data:
                _process_alignment(data if isinstance(data, dict) else data)
        else:
            # Old SDK: item has .audio_base64 and .alignment attributes
            audio_b64 = getattr(item, "audio_base64", None)
            if audio_b64:
                audio_bytes += _base64.b64decode(audio_b64)
            alignment = getattr(item, "alignment", None)
            if alignment:
                _process_alignment(alignment)

    # Save audio
    with open(audio_path, "wb") as f:
        f.write(audio_bytes)

    # Compute total duration from word timestamps
    total_duration = words[-1]["end"] if words else 0

    # Verify with ffprobe (actual file duration may differ from word timestamps)
    try:
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet",
             "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1",
             audio_path],
            capture_output=True, text=True, timeout=15,
        )
        actual_dur = float(probe.stdout.strip()) if probe.returncode == 0 else 0
        if actual_dur > 0 and abs(actual_dur - total_duration) > 1.0:
            print(f"  NOTE: Word timestamps say {total_duration:.1f}s but audio file is {actual_dur:.1f}s")
            total_duration = actual_dur  # Use actual file duration
    except (ValueError, subprocess.TimeoutExpired, FileNotFoundError):
        pass

    # Save timestamps
    ts_data = {
        "total_duration": total_duration,
        "word_count": len(words),
        "words": words,
        "script": script,
    }
    with open(timestamps_path, "w") as f:
        json.dump(ts_data, f, indent=2)

    print(f"Voiceover: {audio_path} ({len(audio_bytes)} bytes, {total_duration:.1f}s)")
    print(f"Timestamps: {timestamps_path} ({len(words)} words)")
