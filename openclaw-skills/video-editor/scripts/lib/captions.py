"""
captions.py -- ASS subtitle generation from ElevenLabs word timestamps.

Supports 9 preset styles:
  - tiktok:     Centered, bold white, word-by-word highlight, semi-transparent box
  - minimal:    Bottom, small white, no box, subtle
  - bold:       Large centered, thick outline, word pop scale animation
  - reveal:     Word-by-word build-up with highlight on newest word
  - karaoke:    Fill animation left-to-right per word
  - subtitle:   Traditional subtitle, bottom, 8-word chunks, semi-transparent box
  - centered:   Large center-screen text, 2-3 words, scale pop-in animation
  - typewriter: Character-by-character reveal using karaoke per-char timing
  - bounce:     Word-by-word scale 150%->100% pop, center screen

Also supports dynamic text overlays (price tags, CTAs, etc.) separate from
the caption track, written as additional ASS events with dedicated styles.

Generates .ass files for FFmpeg subtitle burning via the `ass` filter.
"""

import json
import os
from pathlib import Path

# Load preset styles -- resolve to skill root (scripts/lib/ -> scripts/ -> video-editor/)
SKILL_ROOT = Path(__file__).parent.parent.parent.resolve()
STYLES_PATH = SKILL_ROOT / "templates" / "caption_styles.json"


def load_styles() -> dict:
    """Load caption style presets."""
    if STYLES_PATH.exists():
        with open(STYLES_PATH) as f:
            return json.load(f)
    return {}


def _time_to_ass(seconds: float) -> str:
    """Convert seconds to ASS timestamp format (H:MM:SS.cc)."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    cs = int((s % 1) * 100)
    return f"{h}:{m:02d}:{int(s):02d}.{cs:02d}"


def _escape_ass(text: str) -> str:
    """Escape special ASS characters."""
    return text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")


# --- Overlay position -> ASS alignment + margins mapping ---
# ASS alignments: 1=bot-left, 2=bot-center, 3=bot-right,
#                 4=mid-left, 5=mid-center, 6=mid-right,
#                 7=top-left, 8=top-center, 9=top-right
_OVERLAY_POSITION_MAP = {
    "top-left":      (7, 40, 40, 80),
    "top-center":    (8, 40, 40, 80),
    "top-right":     (9, 40, 40, 80),
    "center-left":   (4, 40, 40, 0),
    "center":        (5, 40, 40, 0),
    "center-right":  (6, 40, 40, 0),
    "bottom-left":   (1, 40, 40, 80),
    "bottom-center": (2, 40, 40, 80),
    "bottom-right":  (3, 40, 40, 80),
}


def _build_header(style_config: dict, resolution: str, overlay_styles: list[dict] | None = None) -> str:
    """Build ASS file header with style definition(s).

    Args:
        style_config:   Caption style config for the Default/Highlight styles.
        resolution:     Video resolution as "WxH".
        overlay_styles: Optional list of overlay style dicts to append to the
                        [V4+ Styles] section before [Events].
    """
    w, h = resolution.split("x")
    play_res_x = int(w)
    play_res_y = int(h)

    font = style_config.get("font", "Montserrat")
    font_size = style_config.get("font_size", 48)
    primary_color = style_config.get("primary_color", "&H00FFFFFF")
    highlight_color = style_config.get("highlight_color", "&H00FFC864")
    outline_color = style_config.get("outline_color", "&H00000000")
    back_color = style_config.get("back_color", "&H80000000")
    outline_width = style_config.get("outline_width", 2)
    shadow = style_config.get("shadow", 0)
    alignment = style_config.get("alignment", 2)
    margin_v = style_config.get("margin_v", 500)
    margin_l = style_config.get("margin_l", 40)
    margin_r = style_config.get("margin_r", 40)
    bold = style_config.get("bold", 1)
    border_style = style_config.get("border_style", 1)

    lines = [
        "[Script Info]",
        "Title: openCLAW Video Editor Captions",
        "ScriptType: v4.00+",
        f"PlayResX: {play_res_x}",
        f"PlayResY: {play_res_y}",
        "WrapStyle: 0",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Default,{font},{font_size},{primary_color},{highlight_color},{outline_color},{back_color},{bold},0,0,0,100,100,0,0,{border_style},{outline_width},{shadow},{alignment},{margin_l},{margin_r},{margin_v},1",
        f"Style: Highlight,{font},{font_size},{highlight_color},{highlight_color},{outline_color},{back_color},{bold},0,0,0,100,100,0,0,{border_style},{outline_width},{shadow},{alignment},{margin_l},{margin_r},{margin_v},1",
    ]

    # Append overlay-specific named styles
    if overlay_styles:
        for ovl_style in overlay_styles:
            lines.append(ovl_style["definition"])

    lines += [
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
        "",
    ]

    return "\n".join(lines)


def _build_overlay_style_definition(overlay: dict, style_name: str) -> str:
    """Build an ASS Style line for a single text overlay.

    Overlay styles are named (e.g., "Overlay0", "Overlay1") so multiple
    overlays can coexist in the same .ass file without interfering with
    the caption Default/Highlight styles.
    """
    pos = overlay.get("position", "top-right")
    alignment, margin_l, margin_r, margin_v = _OVERLAY_POSITION_MAP.get(
        pos, _OVERLAY_POSITION_MAP["top-right"]
    )

    overlay_style = overlay.get("style", "cta")

    if overlay_style == "price-tag":
        font = "Impact"
        font_size = 64
        primary_color = "&H0000FFFF"   # Yellow
        outline_color = "&H00000000"   # Black
        back_color = "&H00000000"
        bold = 1
        outline_width = 4
        shadow = 2
        border_style = 1
    elif overlay_style == "cta":
        font = "Montserrat"
        font_size = 72
        primary_color = "&H00FFFFFF"
        outline_color = "&H00000000"
        back_color = "&HC8000000"      # 78% transparent black box
        bold = 1
        outline_width = 0
        shadow = 0
        border_style = 3
    else:
        # Generic text overlay
        font = "Arial"
        font_size = 48
        primary_color = "&H00FFFFFF"
        outline_color = "&H00000000"
        back_color = "&H00000000"
        bold = 0
        outline_width = 2
        shadow = 1
        border_style = 1

    return (
        f"Style: {style_name},{font},{font_size},{primary_color},{primary_color},"
        f"{outline_color},{back_color},{bold},0,0,0,100,100,0,0,"
        f"{border_style},{outline_width},{shadow},{alignment},{margin_l},{margin_r},{margin_v},1"
    )


def _generate_overlay_events(text_overlays: list[dict]) -> tuple[list[dict], list[str]]:
    """Generate ASS overlay style definitions and dialogue events.

    Returns:
        (overlay_styles, events)
        overlay_styles: list of {"definition": <Style line>} dicts for the header
        events:         list of Dialogue event strings (layer=1 to render above captions)
    """
    overlay_style_defs = []
    events = []

    for idx, overlay in enumerate(text_overlays):
        text = overlay.get("text", "")
        if not text:
            continue

        style_name = f"Overlay{idx}"
        definition = _build_overlay_style_definition(overlay, style_name)
        overlay_style_defs.append({"definition": definition})

        start_offset = float(overlay.get("start_offset", 0))
        duration = float(overlay.get("duration", 3))
        start = _time_to_ass(start_offset)
        end = _time_to_ass(start_offset + duration)
        escaped = _escape_ass(text)

        # Layer 1 renders above layer 0 (captions)
        events.append(f"Dialogue: 1,{start},{end},{style_name},,0,0,0,,{escaped}")

    return overlay_style_defs, events


def _generate_tiktok_style(words: list, style_config: dict) -> list:
    """Generate TikTok-style word-by-word highlight captions.

    Shows groups of 3-5 words at a time. The current word is highlighted.
    """
    events = []
    group_size = style_config.get("group_size", 4)
    highlight_color = style_config.get("highlight_color", "&H00FFC864")

    groups = []
    for i in range(0, len(words), group_size):
        groups.append(words[i:i + group_size])

    for group in groups:
        group_end = group[-1]["end"]

        for wi, word in enumerate(group):
            parts = []
            for gi, gw in enumerate(group):
                w_text = _escape_ass(gw["word"])
                if gi == wi:
                    parts.append(f"{{\\c{highlight_color}\\b1}}{w_text}{{\\r}}")
                else:
                    parts.append(w_text)

            text = " ".join(parts)
            start = _time_to_ass(word["start"])
            if wi < len(group) - 1:
                end = _time_to_ass(group[wi + 1]["start"])
            else:
                end = _time_to_ass(group_end)

            events.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}")

    return events


def _generate_minimal_style(words: list, style_config: dict) -> list:
    """Generate minimal bottom captions -- sentence chunks."""
    events = []
    chunk_size = style_config.get("chunk_size", 8)

    for i in range(0, len(words), chunk_size):
        chunk = words[i:i + chunk_size]
        text = " ".join(_escape_ass(w["word"]) for w in chunk)
        start = _time_to_ass(chunk[0]["start"])
        end = _time_to_ass(chunk[-1]["end"])
        events.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}")

    return events


def _generate_bold_style(words: list, style_config: dict) -> list:
    """Generate bold centered captions with word pop animation."""
    events = []
    group_size = style_config.get("group_size", 3)

    groups = []
    for i in range(0, len(words), group_size):
        groups.append(words[i:i + group_size])

    for group in groups:
        group_end = group[-1]["end"]

        for wi, word in enumerate(group):
            parts = []
            for gi, gw in enumerate(group):
                w_text = _escape_ass(gw["word"])
                if gi == wi:
                    parts.append(f"{{\\fscx120\\fscy120\\t(0,100,\\fscx100\\fscy100)}}{w_text}{{\\r}}")
                else:
                    parts.append(w_text)

            text = " ".join(parts)
            start = _time_to_ass(word["start"])
            if wi < len(group) - 1:
                end = _time_to_ass(group[wi + 1]["start"])
            else:
                end = _time_to_ass(group_end)
            events.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}")

    return events


def _generate_reveal_style(words: list, style_config: dict) -> list:
    """Generate reveal captions -- all words visible, highlight sweeps across.

    All words in a group are shown the entire time. As each word is spoken,
    the highlight color moves to it while the rest stay in the primary color.
    No words appear or disappear mid-group.

    Example for group ["fits", "any", "bed"]:
      Event 1 (word 1 timing): "FITS any bed"    (FITS highlighted)
      Event 2 (word 2 timing): "fits ANY bed"     (ANY highlighted)
      Event 3 (word 3 timing): "fits any BED"     (BED highlighted)
    """
    events = []
    group_size = style_config.get("group_size", 3)
    highlight_color = style_config.get("highlight_color", "&H00FFC864")

    groups = []
    for i in range(0, len(words), group_size):
        groups.append(words[i:i + group_size])

    for group in groups:
        group_end = group[-1]["end"]

        for wi, word in enumerate(group):
            parts = []
            for gi, gw in enumerate(group):
                w_text = _escape_ass(gw["word"])
                if gi == wi:
                    parts.append(
                        f"{{\\c{highlight_color}\\fscx115\\fscy115"
                        f"\\t(0,80,\\fscx100\\fscy100)}}{w_text}{{\\r}}"
                    )
                else:
                    parts.append(w_text)

            text = " ".join(parts)
            start = _time_to_ass(word["start"])
            if wi < len(group) - 1:
                end = _time_to_ass(group[wi + 1]["start"])
            else:
                end = _time_to_ass(group_end)
            events.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}")

    return events


def _generate_karaoke_style(words: list, style_config: dict) -> list:
    """Generate karaoke-style fill animation per word."""
    events = []
    chunk_size = style_config.get("chunk_size", 6)

    for i in range(0, len(words), chunk_size):
        chunk = words[i:i + chunk_size]
        chunk_start = chunk[0]["start"]
        chunk_end = chunk[-1]["end"]

        kara_parts = []
        for w in chunk:
            duration_cs = int((w["end"] - w["start"]) * 100)
            w_text = _escape_ass(w["word"])
            kara_parts.append(f"{{\\kf{duration_cs}}}{w_text}")

        text = " ".join(kara_parts)
        start = _time_to_ass(chunk_start)
        end = _time_to_ass(chunk_end)
        events.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}")

    return events


def _generate_subtitle_style(words: list, style_config: dict) -> list:
    """Generate traditional subtitle captions -- static 8-word chunks at bottom.

    Uses border_style=3 (opaque box) for the semi-transparent background slab.
    No animation; clean professional/documentary feel.
    """
    events = []
    chunk_size = style_config.get("chunk_size", 8)

    for i in range(0, len(words), chunk_size):
        chunk = words[i:i + chunk_size]
        text = " ".join(_escape_ass(w["word"]) for w in chunk)
        start = _time_to_ass(chunk[0]["start"])
        end = _time_to_ass(chunk[-1]["end"])
        events.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}")

    return events


def _generate_centered_style(words: list, style_config: dict) -> list:
    """Generate large centered captions with scale pop-in per group.

    2-3 word groups fill the middle of the screen. Each group scales from
    130% to 100% on entry, giving a dramatic pop-in feel.
    """
    events = []
    group_size = style_config.get("group_size", 3)

    groups = []
    for i in range(0, len(words), group_size):
        groups.append(words[i:i + group_size])

    for group in groups:
        text = " ".join(_escape_ass(w["word"]) for w in group)
        # Scale pop-in: animate from 130% to 100% over 150ms
        animated_text = f"{{\\fscx130\\fscy130\\t(0,150,\\fscx100\\fscy100)}}{text}"
        start = _time_to_ass(group[0]["start"])
        end = _time_to_ass(group[-1]["end"])
        events.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{animated_text}")

    return events


def _generate_typewriter_style(words: list, style_config: dict) -> list:
    """Generate typewriter captions -- characters appear one at a time.

    Groups a full sentence (chunk_size words) into one event and uses
    ASS \\kf (karaoke fill) on a per-character basis to simulate typing.
    Each character's duration is proportional to its word's spoken duration
    divided equally across the characters in that word.
    """
    events = []
    chunk_size = style_config.get("chunk_size", 12)

    for i in range(0, len(words), chunk_size):
        chunk = words[i:i + chunk_size]
        chunk_start = chunk[0]["start"]
        chunk_end = chunk[-1]["end"]

        kara_parts = []
        for wi, w in enumerate(chunk):
            word_text = w["word"]
            chars = list(word_text)
            if not chars:
                continue
            word_dur_cs = max(1, int((w["end"] - w["start"]) * 100))
            # Distribute duration evenly across chars; last char absorbs rounding
            per_char_cs = word_dur_cs // len(chars)
            remainder_cs = word_dur_cs - per_char_cs * len(chars)

            for ci, ch in enumerate(chars):
                dur = per_char_cs + (remainder_cs if ci == len(chars) - 1 else 0)
                kara_parts.append(f"{{\\kf{dur}}}{_escape_ass(ch)}")

            # Space between words (1 centisecond pause, absorbed into gap)
            if wi < len(chunk) - 1:
                kara_parts.append("{\\kf1} ")

        text = "".join(kara_parts)
        start = _time_to_ass(chunk_start)
        end = _time_to_ass(chunk_end)
        events.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}")

    return events


def _generate_bounce_style(words: list, style_config: dict) -> list:
    """Generate bounce captions -- word-by-word pop from 150% to 100% scale.

    1-2 word groups at center screen. Each word group bounces in with an
    aggressive scale-down using ASS \\t transform for kinetic energy.
    """
    events = []
    group_size = style_config.get("group_size", 2)

    groups = []
    for i in range(0, len(words), group_size):
        groups.append(words[i:i + group_size])

    for group in groups:
        text = " ".join(_escape_ass(w["word"]) for w in group)
        # Bounce: scale from 150% to 100% over 120ms, overshoot slightly back
        animated_text = (
            f"{{\\fscx150\\fscy150\\t(0,120,\\fscx95\\fscy95)"
            f"\\t(120,200,\\fscx100\\fscy100)}}{text}"
        )
        start = _time_to_ass(group[0]["start"])
        end = _time_to_ass(group[-1]["end"])
        events.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{animated_text}")

    return events


def generate_ass_subtitles(
    timestamps: dict,
    style_config: dict,
    output_path: str,
    resolution: str = "1080x1920",
    text_overlays: list[dict] | None = None,
):
    """Generate an ASS subtitle file from word timestamps.

    Args:
        timestamps:     Dict with "words" list (word, start, end)
        style_config:   Caption style configuration dict
        output_path:    Path to write .ass file
        resolution:     Video resolution (WxH)
        text_overlays:  Optional list of overlay dicts with keys:
                          text, position, style, start_offset, duration
    """
    words = timestamps.get("words", [])
    style_name = style_config.get("style", "tiktok")

    # Build overlay styles and events (empty if no overlays)
    overlay_style_defs: list[dict] = []
    overlay_events: list[str] = []
    if text_overlays:
        overlay_style_defs, overlay_events = _generate_overlay_events(text_overlays)

    if not words:
        print("WARNING: No words in timestamps. Creating subtitle file with overlays only.")
        header = _build_header(style_config, resolution, overlay_style_defs)
        with open(output_path, "w", encoding="utf-8-sig") as f:
            f.write(header)
            for event in overlay_events:
                f.write(event + "\n")
        return

    # Build header (caption styles + any overlay styles)
    header = _build_header(style_config, resolution, overlay_style_defs)

    # Generate caption events based on style
    generators = {
        "tiktok":      _generate_tiktok_style,
        "minimal":     _generate_minimal_style,
        "bold":        _generate_bold_style,
        "reveal":      _generate_reveal_style,
        "karaoke":     _generate_karaoke_style,
        "subtitle":    _generate_subtitle_style,
        "centered":    _generate_centered_style,
        "typewriter":  _generate_typewriter_style,
        "bounce":      _generate_bounce_style,
    }

    generator = generators.get(style_name, _generate_tiktok_style)
    caption_events = generator(words, style_config)

    # Write file: header, caption events (layer 0), then overlay events (layer 1)
    with open(output_path, "w", encoding="utf-8-sig") as f:
        f.write(header)
        for event in caption_events:
            f.write(event + "\n")
        for event in overlay_events:
            f.write(event + "\n")

    total_events = len(caption_events) + len(overlay_events)
    print(
        f"Subtitles generated: {output_path} "
        f"({len(caption_events)} caption events, "
        f"{len(overlay_events)} overlay events, "
        f"style={style_name})"
    )
