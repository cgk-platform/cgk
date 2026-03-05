# /// script
# requires-python = ">=3.10"
# dependencies = ["playwright>=1.40.0", "google-genai>=1.0.0"]
# ///
"""Design System Cataloger — Extract CSS tokens from a website into brand files.

Crawls a website with Playwright, extracts CSS custom properties, computed
typography, color values, and @font-face declarations, then synthesizes them
into a structured design system using Gemini and writes results to brand files.

Usage:
    uv run catalog_design_system.py "https://oursite.com" [--depth 2] [--slack]
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import pathlib
import re
import sys
import time
import urllib.request
from urllib.parse import urljoin, urlparse

# IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks
_script_dir = pathlib.Path(__file__).parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))

from ad_library_dl import (
    ensure_playwright_browsers,
    _retry,
    _read_slack_token,
    _get_allowed_channels,
    _dm_holden,
)

_profile_root = _script_dir.parent.parent.parent
_brand_dir = _profile_root / "workspace" / "brand"
_workspace_dir = _profile_root / "workspace"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

_SKIP_EXTENSIONS = {
    ".pdf", ".zip", ".gz", ".tar", ".exe", ".dmg",
    ".css", ".js", ".json", ".xml", ".ico",
    ".woff", ".woff2", ".ttf", ".eot",
}

_TEMPLATE_MARKERS = ("_(extract from ads)_", "_(identify from ads)_", "_(extract", "_(identify")


# ---------------------------------------------------------------------------
# Token extraction (runs in browser via page.evaluate)
# ---------------------------------------------------------------------------

def extract_design_tokens(page) -> dict:
    """Extract CSS tokens from the current page via JavaScript."""
    tokens = page.evaluate("""() => {
        const result = { fonts: [], colors: [], css_vars: {}, font_faces: [] };

        // CSS custom properties from :root
        const rootStyle = getComputedStyle(document.documentElement);
        const allProps = [];
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    if (rule.selectorText === ':root' || rule.selectorText === 'html') {
                        const text = rule.cssText;
                        const matches = text.matchAll(/(--[\\w-]+)\\s*:\\s*([^;]+);/g);
                        for (const m of matches) {
                            result.css_vars[m[1].trim()] = m[2].trim();
                        }
                    }
                    // @font-face
                    if (rule.type === 5) {
                        const ff = rule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim();
                        const fw = rule.style.getPropertyValue('font-weight').trim();
                        const fs = rule.style.getPropertyValue('font-style').trim();
                        if (ff) result.font_faces.push({ family: ff, weight: fw || 'normal', style: fs || 'normal' });
                    }
                }
            } catch(e) {}
        }

        // Also resolve CSS vars from computed style
        const varNames = Object.keys(result.css_vars);
        for (const v of varNames) {
            const computed = rootStyle.getPropertyValue(v).trim();
            if (computed) result.css_vars[v] = computed;
        }

        // Computed styles from key elements
        const selectors = ['h1','h2','h3','h4','h5','h6','body','button','nav a','.btn','.cta','header','footer','p'];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (!el) continue;
            const s = getComputedStyle(el);
            const ff = s.fontFamily;
            const color = s.color;
            const bg = s.backgroundColor;
            if (ff) result.fonts.push({ selector: sel, family: ff });
            if (color && color !== 'rgba(0, 0, 0, 0)') result.colors.push({ selector: sel, value: color, prop: 'color' });
            if (bg && bg !== 'rgba(0, 0, 0, 0)') result.colors.push({ selector: sel, value: bg, prop: 'background-color' });
        }

        return result;
    }""")
    return tokens or {"fonts": [], "colors": [], "css_vars": {}, "font_faces": []}


# ---------------------------------------------------------------------------
# RGB to hex conversion
# ---------------------------------------------------------------------------

def _rgb_to_hex(rgb_str: str) -> str | None:
    """Convert rgb(r, g, b) or rgba(r, g, b, a) to #rrggbb. Returns None if unparseable."""
    m = re.match(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", rgb_str)
    if not m:
        return None
    r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
    # Skip pure white / pure black utility colors
    if (r, g, b) in ((0, 0, 0), (255, 255, 255)):
        return None
    # Skip transparent rgba values (alpha < 0.1)
    alpha_match = re.search(r"rgba\([^)]*,\s*([\d.]+)\s*\)", rgb_str)
    if alpha_match and float(alpha_match.group(1)) < 0.1:
        return None
    return f"#{r:02x}{g:02x}{b:02x}"


def _normalize_color(value: str) -> str | None:
    """Normalize a color value to hex. Passthrough for already-hex values."""
    value = value.strip()
    if value.startswith("#"):
        return value.lower()
    if value.startswith("rgb"):
        return _rgb_to_hex(value)
    return None


# ---------------------------------------------------------------------------
# Synthesis
# ---------------------------------------------------------------------------

def synthesize_design_system(all_tokens: list[dict], hero_analysis: str | None = None) -> dict:
    """Merge tokens from all pages and use Gemini to produce a structured design system."""
    # Aggregate fonts by family frequency
    font_counter: collections.Counter = collections.Counter()
    for page_tokens in all_tokens:
        for entry in page_tokens.get("fonts", []):
            # font-family can be a comma-separated stack — take first
            primary = entry["family"].split(",")[0].strip().strip("'\"")
            if primary:
                font_counter[primary] += 1

    # Aggregate colors by hex frequency
    color_counter: collections.Counter = collections.Counter()
    for page_tokens in all_tokens:
        for entry in page_tokens.get("colors", []):
            hex_val = _normalize_color(entry["value"])
            if hex_val:
                color_counter[hex_val] += 1

    # Collect all CSS variables (last-write wins for duplicates)
    all_css_vars: dict[str, str] = {}
    for page_tokens in all_tokens:
        all_css_vars.update(page_tokens.get("css_vars", {}))

    # Collect font faces (deduplicate by family+weight)
    seen_faces: set[tuple] = set()
    font_faces: list[dict] = []
    for page_tokens in all_tokens:
        for face in page_tokens.get("font_faces", []):
            key = (face.get("family", ""), face.get("weight", ""))
            if key not in seen_faces:
                seen_faces.add(key)
                font_faces.append(face)

    # Build Gemini prompt
    top_fonts = font_counter.most_common(10)
    top_colors = color_counter.most_common(20)
    css_var_sample = dict(list(all_css_vars.items())[:40])

    prompt = f"""Analyze these CSS design tokens extracted from a brand website and return a structured JSON design system.

FONT FREQUENCIES (family, count):
{json.dumps(top_fonts, indent=2)}

FONT FACES DECLARED:
{json.dumps(font_faces, indent=2)}

COLOR FREQUENCIES (hex, count):
{json.dumps(top_colors, indent=2)}

CSS CUSTOM PROPERTIES (sample):
{json.dumps(css_var_sample, indent=2)}
"""

    if hero_analysis:
        prompt += f"\nHERO VISUAL ANALYSIS:\n{hero_analysis}\n"

    prompt += """
Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{{
  "primary_fonts": [
    {{"family": "...", "weight": "...", "usage": "..."}}
  ],
  "secondary_fonts": [
    {{"family": "...", "weight": "...", "usage": "..."}}
  ],
  "color_palette": [
    {{"hex": "#rrggbb", "name": "...", "usage": "...", "frequency": 0}}
  ],
  "css_variables": {{
    "semantic_name": "value"
  }},
  "aesthetic_notes": "..."
}}

Rules:
- primary_fonts: top 1-2 most-used font families; exclude generic (sans-serif, serif, monospace) unless no named fonts found
- secondary_fonts: next 1-2 distinct font families
- color_palette: top 8-12 colors ranked by frequency; give each a semantic name (e.g. "brand-blue", "off-white"); exclude colors with frequency < 2 unless clearly significant
- css_variables: include only semantic variable names (color, font, spacing tokens); skip internal/utility vars
- aesthetic_notes: 2-3 sentences describing visual style, mood, and brand positioning based on all signals"""

    try:
        from google import genai
        project = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0013158607")
        client = genai.Client(vertexai=True, project=project, location="global")
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
        )
        raw = response.text.strip()
        # Strip markdown code blocks if present
        if raw.startswith("```"):
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)
        return json.loads(raw)
    except Exception as e:
        print(f"[gemini] Synthesis failed: {e}")
        # Return a minimal structure from raw data
        return {
            "primary_fonts": [{"family": f, "weight": "400", "usage": "body"} for f, _ in top_fonts[:2]],
            "secondary_fonts": [],
            "color_palette": [{"hex": h, "name": f"color-{i+1}", "usage": "unknown", "frequency": c}
                              for i, (h, c) in enumerate(top_colors[:8])],
            "css_variables": css_var_sample,
            "aesthetic_notes": "",
        }


# ---------------------------------------------------------------------------
# File writers
# ---------------------------------------------------------------------------

def _has_template_marker(line: str) -> bool:
    return any(marker in line for marker in _TEMPLATE_MARKERS)


def write_design_files(design_system: dict, brand_dir: pathlib.Path, workspace_dir: pathlib.Path):
    """Write design system data into brand files, preserving real manually-written content."""
    colors = design_system.get("color_palette", [])
    primary_fonts = design_system.get("primary_fonts", [])
    secondary_fonts = design_system.get("secondary_fonts", [])
    css_vars = design_system.get("css_variables", {})
    aesthetic_notes = design_system.get("aesthetic_notes", "")

    # --- colors.md ---
    colors_path = brand_dir / "colors.md"
    existing_colors = colors_path.read_text() if colors_path.exists() else ""
    new_colors_lines = []
    in_primary_table = False
    in_secondary_table = False
    primary_filled = False
    secondary_filled = False

    for line in existing_colors.splitlines(keepends=True):
        stripped = line.rstrip("\n")

        if "## Primary Colors" in stripped:
            in_primary_table = True
            in_secondary_table = False
            new_colors_lines.append(line)
            continue

        if "## Secondary Colors" in stripped:
            in_secondary_table = True
            in_primary_table = False
            new_colors_lines.append(line)
            continue

        if stripped.startswith("## ") and "Primary" not in stripped and "Secondary" not in stripped:
            in_primary_table = False
            in_secondary_table = False

        if in_primary_table and not primary_filled:
            if stripped.startswith("|") and _has_template_marker(stripped):
                # Replace template rows with actual data
                primary_colors = [c for c in colors if c.get("frequency", 0) >= 2][:3]
                if primary_colors:
                    for c in primary_colors:
                        hex_val = c.get("hex", "")
                        rgb = ""
                        if hex_val.startswith("#") and len(hex_val) == 7:
                            r = int(hex_val[1:3], 16)
                            g = int(hex_val[3:5], 16)
                            b = int(hex_val[5:7], 16)
                            rgb = f"{r}, {g}, {b}"
                        new_colors_lines.append(
                            f"| {c.get('name', hex_val)} | {hex_val} | {rgb} | {c.get('usage', '')} |\n"
                        )
                    primary_filled = True
                    continue
                # No data — keep template
            elif stripped.startswith("|") and primary_filled:
                # Skip remaining template rows after we've filled
                if _has_template_marker(stripped):
                    continue

        if in_secondary_table and not secondary_filled:
            if stripped.startswith("|") and _has_template_marker(stripped):
                secondary_colors = [c for c in colors if c.get("frequency", 0) >= 2][3:5]
                if secondary_colors:
                    for c in secondary_colors:
                        hex_val = c.get("hex", "")
                        rgb = ""
                        if hex_val.startswith("#") and len(hex_val) == 7:
                            r = int(hex_val[1:3], 16)
                            g = int(hex_val[3:5], 16)
                            b = int(hex_val[5:7], 16)
                            rgb = f"{r}, {g}, {b}"
                        new_colors_lines.append(
                            f"| {c.get('name', hex_val)} | {hex_val} | {rgb} | {c.get('usage', '')} |\n"
                        )
                    secondary_filled = True
                    continue
            elif stripped.startswith("|") and secondary_filled:
                if _has_template_marker(stripped):
                    continue

        new_colors_lines.append(line)

    colors_path.write_text("".join(new_colors_lines))
    print(f"[write] Updated {colors_path}")

    # --- typography.md ---
    typo_path = brand_dir / "typography.md"
    existing_typo = typo_path.read_text() if typo_path.exists() else ""
    new_typo_lines = []
    in_font_table = False
    font_table_filled = False
    all_fonts = primary_fonts + secondary_fonts
    font_iter = iter(all_fonts)

    for line in existing_typo.splitlines(keepends=True):
        stripped = line.rstrip("\n")

        if "## Font Stack" in stripped:
            in_font_table = True
            new_typo_lines.append(line)
            continue

        if stripped.startswith("## ") and "Font Stack" not in stripped:
            in_font_table = False

        if in_font_table and stripped.startswith("|") and _has_template_marker(stripped):
            font_entry = next(font_iter, None)
            if font_entry:
                # Infer usage from font position
                usage_map = {"body": "Body Copy", "headline": "Headlines", "cta": "CTA Text"}
                usage = font_entry.get("usage", "")
                new_typo_lines.append(
                    f"| {usage or '—'} | {font_entry.get('family', '')} | "
                    f"{font_entry.get('weight', '400')} | normal | |\n"
                )
                font_table_filled = True
                continue
            # No more fonts — keep template line as-is

        if in_font_table and stripped.startswith("|") and font_table_filled:
            if _has_template_marker(stripped):
                continue

        if "## Typography Rules" in stripped:
            new_typo_lines.append(line)
            # Add aesthetic notes if present and next line is template
            continue

        new_typo_lines.append(line)

    # Inject aesthetic notes into Typography Rules if the section has template content
    final_typo = "".join(new_typo_lines)
    if aesthetic_notes and "_(document from ad analysis — casing" in final_typo:
        final_typo = final_typo.replace(
            "- _(document from ad analysis — casing, hierarchy, spacing, line length)_",
            f"- {aesthetic_notes}",
        )

    typo_path.write_text(final_typo)
    print(f"[write] Updated {typo_path}")

    # --- DESIGN-SYSTEM.md ---
    ds_path = workspace_dir / "DESIGN-SYSTEM.md"
    if not ds_path.exists():
        print(f"[write] DESIGN-SYSTEM.md not found at {ds_path} — skipping")
        return

    existing_ds = ds_path.read_text()
    new_ds_lines = []
    in_brand_colors = False
    in_typography = False
    color_roles = ["Primary", "Secondary", "Accent", "Background", "Text"]
    color_role_idx = 0
    typo_roles = ["Headlines", "Subheadlines", "Body copy", "CTA text", "Fine print"]
    typo_role_idx = 0

    for line in existing_ds.splitlines(keepends=True):
        stripped = line.rstrip("\n")

        if "### Brand Colors" in stripped:
            in_brand_colors = True
            in_typography = False
            new_ds_lines.append(line)
            continue

        if "### Typography" in stripped and in_brand_colors or (
            "### Typography" in stripped and not in_typography
        ):
            in_brand_colors = False
            in_typography = True
            new_ds_lines.append(line)
            continue

        if stripped.startswith("###") and "Brand Colors" not in stripped and "Typography" not in stripped:
            in_brand_colors = False
            in_typography = False

        if in_brand_colors and stripped.startswith("|") and not stripped.startswith("| Role"):
            # Fill color table rows
            if color_role_idx < len(color_roles) and color_role_idx < len(colors):
                c = colors[color_role_idx]
                role = color_roles[color_role_idx]
                hex_val = c.get("hex", "")
                new_ds_lines.append(
                    f"| {role} | {c.get('name', '')} | {hex_val} | {c.get('usage', '')} |\n"
                )
                color_role_idx += 1
                continue
            elif color_role_idx < len(color_roles):
                # Ran out of colors — keep blank row
                pass

        if in_typography and stripped.startswith("|") and not stripped.startswith("| Usage"):
            if typo_role_idx < len(typo_roles) and typo_role_idx < len(all_fonts):
                f = all_fonts[typo_role_idx]
                role = typo_roles[typo_role_idx]
                new_ds_lines.append(
                    f"| {role} | {f.get('family', '')} | {f.get('weight', '')} | | |\n"
                )
                typo_role_idx += 1
                continue
            elif typo_role_idx < len(typo_roles):
                pass

        new_ds_lines.append(line)

    ds_path.write_text("".join(new_ds_lines))
    print(f"[write] Updated {ds_path}")


# ---------------------------------------------------------------------------
# Hero screenshot + Gemini analysis
# ---------------------------------------------------------------------------

def _analyze_hero(screenshot_path: pathlib.Path) -> str | None:
    """Use Gemini to analyze a hero screenshot for aesthetic observations."""
    try:
        import base64
        from google import genai
        from google.genai import types

        raw_bytes = screenshot_path.read_bytes()
        project = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0013158607")
        client = genai.Client(vertexai=True, project=project, location="global")
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=[
                types.Part.from_bytes(
                    data=raw_bytes,
                    mime_type="image/png",
                ),
                "Analyze this website hero section for brand aesthetic. In 2-3 sentences describe: "
                "visual style, mood, color treatment, typography feel, and overall brand positioning. "
                "Be specific and descriptive.",
            ],
        )
        return response.text.strip()
    except Exception as e:
        print(f"[gemini] Hero analysis failed: {e}")
        return None


# ---------------------------------------------------------------------------
# Crawl
# ---------------------------------------------------------------------------

def _is_same_domain(base_url: str, url: str) -> bool:
    base_host = urlparse(base_url).netloc.lower().replace("www.", "")
    url_host = urlparse(url).netloc.lower().replace("www.", "")
    return base_host == url_host


def _normalize_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.rstrip("/") or "/"
    return f"{parsed.scheme}://{parsed.netloc}{path}"


def _extract_links(page, base_url: str) -> list[str]:
    links = page.evaluate("""() => {
        const out = [];
        document.querySelectorAll('a[href]').forEach(a => {
            if (a.href && a.href.startsWith('http')) out.push(a.href);
        });
        return out;
    }""")
    valid = []
    for link in links or []:
        if not _is_same_domain(base_url, link):
            continue
        parsed = urlparse(link)
        ext = pathlib.Path(parsed.path).suffix.lower()
        if ext in _SKIP_EXTENSIONS:
            continue
        valid.append(link)
    return valid


def crawl_for_design(
    url: str,
    depth: int = 2,
    slack_channel: str | None = None,
    slack_thread: str | None = None,
) -> dict:
    """BFS crawl the site, extract design tokens from each page, synthesize, and write files."""
    ensure_playwright_browsers()

    from playwright.sync_api import sync_playwright

    domain = urlparse(url).netloc
    print(f"[crawl] Starting design system extraction from {url}")
    print(f"  Depth: {depth}")

    all_tokens: list[dict] = []
    hero_screenshot: pathlib.Path | None = None
    pages_visited = 0
    visited: set[str] = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent=USER_AGENT,
        )
        page = context.new_page()

        queue: list[tuple[str, int]] = [(url.rstrip("/"), 0)]

        while queue:
            current_url, current_depth = queue.pop(0)
            norm = _normalize_url(current_url)

            if norm in visited:
                continue
            if not _is_same_domain(url, current_url):
                continue
            if current_depth > depth:
                continue

            visited.add(norm)
            pages_visited += 1
            print(f"\n[page {pages_visited}] {current_url} (depth {current_depth})")

            try:
                page.goto(current_url, wait_until="domcontentloaded", timeout=30000)
                time.sleep(1.5)

                tokens = extract_design_tokens(page)
                all_tokens.append(tokens)
                print(f"  Fonts: {len(tokens['fonts'])}, Colors: {len(tokens['colors'])}, "
                      f"CSS vars: {len(tokens['css_vars'])}")

                # Hero screenshot on homepage only
                if pages_visited == 1 and hero_screenshot is None:
                    tmp_path = pathlib.Path("/tmp") / f"hero_{domain.replace('.', '_')}.png"
                    page.screenshot(path=str(tmp_path), clip={"x": 0, "y": 0, "width": 1280, "height": 700})
                    hero_screenshot = tmp_path
                    print(f"  [screenshot] Hero saved to {tmp_path}")

                if current_depth < depth:
                    for link in _extract_links(page, url):
                        if _normalize_url(link) not in visited:
                            queue.append((link, current_depth + 1))

            except Exception as e:
                print(f"  [error] {current_url}: {e}")
                continue

        browser.close()

    print(f"\n[crawl] Done — {pages_visited} pages crawled")

    # Analyze hero screenshot
    hero_analysis = None
    if hero_screenshot and hero_screenshot.exists():
        print("[gemini] Analyzing hero screenshot...")
        hero_analysis = _analyze_hero(hero_screenshot)
        if hero_analysis:
            print(f"  {hero_analysis[:120]}...")

    # Synthesize
    print("[gemini] Synthesizing design system...")
    design_system = synthesize_design_system(all_tokens, hero_analysis)

    # Write brand files
    _brand_dir.mkdir(parents=True, exist_ok=True)
    write_design_files(design_system, _brand_dir, _workspace_dir)

    summary = {
        "url": url,
        "pages_visited": pages_visited,
        "primary_fonts": design_system.get("primary_fonts", []),
        "color_count": len(design_system.get("color_palette", [])),
        "css_variable_count": len(design_system.get("css_variables", {})),
        "aesthetic_notes": design_system.get("aesthetic_notes", ""),
    }
    return summary


# ---------------------------------------------------------------------------
# Slack helper
# ---------------------------------------------------------------------------

def _slack_post(text: str, channel: str, thread_ts: str | None, token: str) -> bool:
    payload: dict = {"channel": channel, "text": text}
    if thread_ts:
        payload["thread_ts"] = thread_ts

    def _do():
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
        _retry(_do, max_retries=2, base_delay=2.0, label="slack")
        return True
    except Exception as e:
        print(f"[slack] Post failed: {e}")
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Catalog a brand's design system from their website")
    parser.add_argument("url", help="Website URL to crawl")
    parser.add_argument("--depth", type=int, default=2, help="Max crawl depth (default: 2)")
    parser.add_argument("--slack", action="store_true", help="Post summary to Slack")
    args = parser.parse_args()

    slack_channel = os.environ.get("SLACK_CHANNEL_ID") if args.slack else None
    slack_thread = os.environ.get("SLACK_THREAD_TS") if args.slack else None

    # Validate Slack channel against allowlist
    slack_token = None
    if slack_channel:
        slack_token = os.environ.get("SLACK_BOT_TOKEN") or _read_slack_token()
        if slack_token:
            allowed = _get_allowed_channels()
            if allowed and slack_channel not in allowed:
                print(f"[slack] BLOCKED: channel {slack_channel} not in allowlist")
                _dm_holden(
                    f":warning: *Channel Allowlist Block*\n\n"
                    f"catalog_design_system.py tried to post to `{slack_channel}` "
                    f"but it's not in the workspace allowlist."
                )
                slack_channel = None

    summary = crawl_for_design(
        url=args.url,
        depth=args.depth,
        slack_channel=slack_channel,
        slack_thread=slack_thread,
    )

    domain = urlparse(args.url).netloc
    print(f"\n{'=' * 60}")
    print(f"Design System Summary — {domain}")
    print(f"{'=' * 60}")
    print(f"  Pages visited:     {summary['pages_visited']}")
    print(f"  Colors extracted:  {summary['color_count']}")
    print(f"  CSS variables:     {summary['css_variable_count']}")
    fonts = summary.get("primary_fonts", [])
    if fonts:
        print(f"  Primary font:      {fonts[0].get('family', '—')}")
    if summary.get("aesthetic_notes"):
        print(f"  Aesthetic:         {summary['aesthetic_notes'][:100]}...")
    print(f"\n  Brand files updated:")
    print(f"    {_brand_dir / 'colors.md'}")
    print(f"    {_brand_dir / 'typography.md'}")
    print(f"    {_workspace_dir / 'DESIGN-SYSTEM.md'}")

    if slack_channel and slack_token:
        font_name = fonts[0].get("family", "unknown") if fonts else "unknown"
        _slack_post(
            f":art: *Design system extracted from `{domain}`*\n"
            f"  {summary['color_count']} colors, {summary['css_variable_count']} CSS variables\n"
            f"  Primary font: {font_name}\n"
            + (f"  _{summary['aesthetic_notes']}_" if summary.get("aesthetic_notes") else ""),
            slack_channel,
            slack_thread,
            slack_token,
        )


if __name__ == "__main__":
    main()
