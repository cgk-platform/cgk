# /// script
# requires-python = ">=3.10"
# dependencies = ["playwright>=1.40.0", "google-genai>=1.0.0"]
# ///
"""Brand Website Crawler — Product Image Discovery & Cataloging.

Crawls a brand's website (e.g., vitahustle.com) to discover product images,
lifestyle photos, and other brand assets. Downloads images, auto-tags them
with Gemini Flash, and stores them in the BrandAssetStore.

Usage:
    # Uses BRAND_WEBSITE_URL from profile .env by default
    uv run brand_crawl.py --depth 2 --min-size 300
    uv run brand_crawl.py --depth 1 --limit 50 --slack
    uv run brand_crawl.py --url "https://example.com" --all-pages --limit 100
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import time
import urllib.request
import urllib.error
from urllib.parse import urljoin, urlparse

_script_dir = pathlib.Path(__file__).resolve().parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))

from ad_library_dl import (
    ensure_playwright_browsers,
    _retry,
    _read_slack_token,
    _get_allowed_channels,
    _dm_holden,
)
from brand_asset_store import BrandAssetStore, _sha256_file


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# URL path patterns that indicate product/collection pages
_PRODUCT_PATTERNS = re.compile(
    r"/(products?|collections?|shop|store|catalog|category|items?|all)(/|$|\?)",
    re.IGNORECASE,
)

_SKIP_EXTENSIONS = {
    ".pdf", ".zip", ".gz", ".tar", ".rar", ".exe", ".dmg",
    ".css", ".js", ".json", ".xml", ".svg", ".ico",
    ".woff", ".woff2", ".ttf", ".eot",
}

_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_same_domain(base_url: str, url: str) -> bool:
    """Check if url is on the same domain as base_url."""
    base_host = urlparse(base_url).netloc.lower().replace("www.", "")
    url_host = urlparse(url).netloc.lower().replace("www.", "")
    return base_host == url_host


def _is_product_url(url: str) -> bool:
    """Check if URL matches product/collection page patterns."""
    return bool(_PRODUCT_PATTERNS.search(urlparse(url).path))


def _normalize_url(url: str) -> str:
    """Normalize URL by removing fragments and trailing slashes."""
    parsed = urlparse(url)
    path = parsed.path.rstrip("/") or "/"
    return f"{parsed.scheme}://{parsed.netloc}{path}"


def _slack_post(text: str, channel: str, thread_ts: str | None, token: str) -> bool:
    """Post a message to Slack."""
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
        print(f"    [slack] Post failed: {e}")
        return False


def _download_image(url: str, dest: pathlib.Path) -> bool:
    """Download image from URL to dest path with retries."""
    def _do():
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
            if len(data) < 1000:
                raise ValueError(f"Tiny response ({len(data)} bytes)")
            dest.write_bytes(data)

    try:
        _retry(_do, max_retries=3, base_delay=2.0, label="img-dl")
        return True
    except Exception as e:
        print(f"    [error] Download failed: {url[:80]}... — {e}")
        return False


# ---------------------------------------------------------------------------
# Design system extraction
# ---------------------------------------------------------------------------

def extract_design_tokens(page) -> dict:
    """Extract CSS design tokens from a page using Playwright (sync)."""
    return page.evaluate("""() => {
        const tokens = { fonts: {}, colors: {}, css_vars: {}, font_faces: [] };

        // CSS custom properties from :root and @font-face declarations
        try {
            const sheets = [...document.styleSheets];
            for (const sheet of sheets) {
                let rules;
                try { rules = sheet.cssRules; } catch { continue; }
                for (const rule of rules) {
                    if (rule.selectorText === ':root' || rule.selectorText === ':root, :host') {
                        for (const prop of rule.style) {
                            if (prop.startsWith('--')) {
                                tokens.css_vars[prop] = rule.style.getPropertyValue(prop).trim();
                            }
                        }
                    }
                    if (rule.constructor.name === 'CSSFontFaceRule' || rule.type === 5) {
                        tokens.font_faces.push({
                            family: rule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim(),
                            weight: rule.style.getPropertyValue('font-weight') || 'normal',
                            style: rule.style.getPropertyValue('font-style') || 'normal',
                        });
                    }
                }
            }
        } catch(e) {}

        // Extract computed styles from key elements
        const selectors = {
            'h1': 'h1', 'h2': 'h2', 'h3': 'h3', 'h4': 'h4',
            'body': 'body', 'nav': 'nav', 'header': 'header',
            'button': 'button', 'a.btn': 'a.btn', '.cta': '.cta',
            'footer': 'footer', 'p': 'p',
        };

        for (const [name, sel] of Object.entries(selectors)) {
            const el = document.querySelector(sel);
            if (el) {
                const s = getComputedStyle(el);
                tokens.fonts[name] = {
                    family: s.fontFamily,
                    size: s.fontSize,
                    weight: s.fontWeight,
                    lineHeight: s.lineHeight,
                    letterSpacing: s.letterSpacing,
                };
                tokens.colors[name] = {
                    color: s.color,
                    background: s.backgroundColor,
                };
            }
        }

        return tokens;
    }""")


def _rgb_to_hex(rgb_str: str) -> str | None:
    """Convert 'rgb(r, g, b)' or 'rgba(r, g, b, a)' to '#rrggbb'. Returns None if unparseable."""
    m = re.match(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", rgb_str)
    if not m:
        return None
    r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
    # Skip transparent / near-white / near-black utility colors
    if (r, g, b) in ((0, 0, 0), (255, 255, 255)):
        return None
    # Skip transparent rgba values (alpha < 0.1)
    alpha_match = re.search(r"rgba\([^)]*,\s*([\d.]+)\s*\)", rgb_str)
    if alpha_match and float(alpha_match.group(1)) < 0.1:
        return None
    return f"#{r:02x}{g:02x}{b:02x}"


def synthesize_design_system(all_tokens: list[dict]) -> dict:
    """Merge design tokens from all crawled pages into a unified design system."""
    # Aggregate font families by frequency
    font_family_counts: collections.Counter = collections.Counter()
    for tokens in all_tokens:
        for elem_name, font_data in tokens.get("fonts", {}).items():
            family = font_data.get("family", "").strip()
            if family:
                # Take the first declared family (before commas) as the canonical name
                primary = family.split(",")[0].strip().strip("'\"")
                if primary and primary.lower() not in ("serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui"):
                    font_family_counts[primary] += 1

    # Aggregate colors by frequency
    color_counts: collections.Counter = collections.Counter()
    for tokens in all_tokens:
        for elem_name, color_data in tokens.get("colors", {}).items():
            for key in ("color", "background"):
                hex_val = _rgb_to_hex(color_data.get(key, ""))
                if hex_val:
                    color_counts[hex_val] += 1

    # Aggregate CSS variables (take from first page that has them)
    merged_css_vars: dict = {}
    for tokens in all_tokens:
        if tokens.get("css_vars"):
            merged_css_vars.update(tokens["css_vars"])
            if len(merged_css_vars) >= 30:
                break

    # Aggregate font faces (deduplicate by family+weight)
    seen_faces: set = set()
    font_faces: list[dict] = []
    for tokens in all_tokens:
        for face in tokens.get("font_faces", []):
            key = (face.get("family", ""), face.get("weight", ""))
            if key not in seen_faces and face.get("family"):
                seen_faces.add(key)
                font_faces.append(face)

    # Build merged payload for Gemini to structure
    merged_data = {
        "font_families_by_frequency": font_family_counts.most_common(10),
        "colors_by_frequency": color_counts.most_common(20),
        "css_variables": dict(list(merged_css_vars.items())[:40]),
        "font_faces": font_faces[:20],
    }

    # Use Gemini Flash to structure into a clean design system
    prompt = f"""Analyze these CSS tokens extracted from a brand website and return a structured JSON design system.

Input data:
{json.dumps(merged_data, indent=2)}

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{{
  "primary_fonts": [
    {{"family": "Font Name", "role": "headlines|body|ui", "weights": ["400", "700"]}}
  ],
  "secondary_fonts": [
    {{"family": "Font Name", "role": "accent|mono", "weights": ["400"]}}
  ],
  "color_palette": [
    {{"hex": "#rrggbb", "role": "primary|secondary|accent|neutral|background|text", "name": "descriptive name"}}
  ],
  "css_variables": {{
    "semantic_name": "value"
  }}
}}

Rules:
- primary_fonts: up to 2 fonts, most prominent by frequency and role
- secondary_fonts: up to 2 fonts, supporting roles
- color_palette: up to 8 colors, most visually significant (skip near-white/near-black utility colors)
- css_variables: only semantic/brand variables (skip layout/spacing utilities)
- If data is insufficient for a section, return an empty array/object for that section
"""

    try:
        from google import genai
        project = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0013158607")
        client = genai.Client(vertexai=True, project=project, location="global")
        model = "gemini-3-flash-preview"
        print(f"[design] Synthesizing design system with {model}...")
        response = _retry(
            lambda: client.models.generate_content(model=model, contents=[prompt]),
            max_retries=3, base_delay=5.0, label="design-system",
        )
        text = response.text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        return json.loads(text)
    except Exception as e:
        print(f"[design] Gemini synthesis failed: {e} — returning raw merged data")
        # Fallback: return structured data without Gemini
        top_fonts = [f for f, _ in font_family_counts.most_common(4)]
        top_colors = [c for c, _ in color_counts.most_common(8)]
        return {
            "primary_fonts": [{"family": f, "role": "unknown", "weights": []} for f in top_fonts[:2]],
            "secondary_fonts": [{"family": f, "role": "unknown", "weights": []} for f in top_fonts[2:4]],
            "color_palette": [{"hex": c, "role": "unknown", "name": c} for c in top_colors],
            "css_variables": dict(list(merged_css_vars.items())[:20]),
        }


def write_design_files(design_system: dict, brand_dir: pathlib.Path):
    """Write extracted design tokens into colors.md and typography.md in brand_dir."""
    _TEMPLATE_MARKERS = ("_(extract from ads)_", "_(identify from ads)_")

    def _is_template(text: str) -> bool:
        return any(m in text for m in _TEMPLATE_MARKERS)

    # --- colors.md ---
    colors_path = brand_dir / "colors.md"
    if colors_path.exists():
        colors_content = colors_path.read_text()
    else:
        colors_content = "# Brand Color Palette\n\n## Primary Colors\n\n| Color | Hex | RGB | Usage |\n|-------|-----|-----|-------|\n\n## Secondary Colors\n\n| Color | Hex | RGB | Usage |\n|-------|-----|-----|-------|\n"

    palette = design_system.get("color_palette", [])
    primary_colors = [c for c in palette if c.get("role") in ("primary", "background", "text", "accent")][:3]
    secondary_colors = [c for c in palette if c not in primary_colors][:2]

    def _build_color_rows(colors: list[dict]) -> str:
        rows = []
        for c in colors:
            hex_val = c.get("hex", "")
            name = c.get("name", hex_val)
            role = c.get("role", "")
            # Compute RGB from hex
            try:
                r = int(hex_val[1:3], 16)
                g = int(hex_val[3:5], 16)
                b = int(hex_val[5:7], 16)
                rgb = f"rgb({r}, {g}, {b})"
            except Exception:
                rgb = ""
            rows.append(f"| {name} | {hex_val} | {rgb} | {role} |")
        return "\n".join(rows)

    if primary_colors and _is_template(colors_content):
        primary_section = (
            "| Color | Hex | RGB | Usage |\n"
            "|-------|-----|-----|-------|\n"
            + _build_color_rows(primary_colors)
        )
        colors_content = re.sub(
            r"(## Primary Colors\s*\n+)\| Color.*?(?=\n##|\Z)",
            lambda m: m.group(1) + primary_section + "\n\n",
            colors_content,
            flags=re.DOTALL,
        )

    if secondary_colors and _is_template(colors_content):
        secondary_section = (
            "| Color | Hex | RGB | Usage |\n"
            "|-------|-----|-----|-------|\n"
            + _build_color_rows(secondary_colors)
        )
        colors_content = re.sub(
            r"(## Secondary Colors\s*\n+)\| Color.*?(?=\n##|\Z)",
            lambda m: m.group(1) + secondary_section + "\n\n",
            colors_content,
            flags=re.DOTALL,
        )

    colors_path.write_text(colors_content)
    print(f"[design] Updated {colors_path}")

    # --- typography.md ---
    typo_path = brand_dir / "typography.md"
    if typo_path.exists():
        typo_content = typo_path.read_text()
    else:
        typo_content = "# Brand Typography\n\n## Font Stack\n\n| Usage | Font Family | Weight | Style | Notes |\n|-------|-------------|--------|-------|-------|\n"

    primary_fonts = design_system.get("primary_fonts", [])
    secondary_fonts = design_system.get("secondary_fonts", [])
    all_fonts = primary_fonts + secondary_fonts

    if all_fonts and _is_template(typo_content):
        role_to_usage = {
            "headlines": "Headlines",
            "body": "Body Copy",
            "ui": "UI / CTA",
            "accent": "Accent",
            "mono": "Monospace",
            "unknown": "General",
        }
        rows = []
        usage_slots = ["Headlines", "Subheadlines", "Body Copy", "CTA Text", "Fine Print"]
        for i, font in enumerate(all_fonts[:5]):
            usage = role_to_usage.get(font.get("role", ""), "General")
            if i < len(usage_slots):
                usage = usage_slots[i]
            weights = ", ".join(font.get("weights", [])) or "regular"
            rows.append(f"| {usage} | {font.get('family', '')} | {weights} | normal | |")

        font_section = (
            "| Usage | Font Family | Weight | Style | Notes |\n"
            "|-------|-------------|--------|-------|-------|\n"
            + "\n".join(rows)
        )
        typo_content = re.sub(
            r"(## Font Stack\s*\n+)\| Usage.*?(?=\n##|\Z)",
            lambda m: m.group(1) + font_section + "\n\n",
            typo_content,
            flags=re.DOTALL,
        )

    typo_path.write_text(typo_content)
    print(f"[design] Updated {typo_path}")


# ---------------------------------------------------------------------------
# Crawler
# ---------------------------------------------------------------------------

class BrandCrawler:
    """Playwright-based website crawler for brand product images."""

    def __init__(
        self,
        base_url: str,
        depth: int = 2,
        min_size: int = 300,
        limit: int = 200,
        all_pages: bool = False,
        slack_channel: str | None = None,
        slack_thread: str | None = None,
        design_system: bool = False,
    ):
        self.base_url = base_url.rstrip("/")
        self.depth = depth
        self.min_size = min_size
        self.limit = limit
        self.all_pages = all_pages
        self.slack_channel = slack_channel
        self.slack_thread = slack_thread
        self.design_system = design_system
        self.slack_token = None

        if self.slack_channel:
            self.slack_token = os.environ.get("SLACK_BOT_TOKEN") or _read_slack_token()
            if self.slack_token:
                allowed = _get_allowed_channels()
                if allowed and self.slack_channel not in allowed:
                    print(f"[slack] BLOCKED: channel {self.slack_channel} not in allowlist")
                    _dm_holden(
                        f":warning: *Channel Allowlist Block*\n\n"
                        f"brand_crawl.py tried to post to `{self.slack_channel}` "
                        f"but it's not in the workspace allowlist."
                    )
                    self.slack_channel = None

        # State
        self.visited: set[str] = set()
        self.image_urls: dict[str, dict] = {}  # url -> {page_url, page_title}
        self.pages_visited = 0
        self._design_tokens: list[dict] = []

    def _slack(self, text: str):
        """Post progress to Slack if configured."""
        if self.slack_channel and self.slack_token:
            _slack_post(text, self.slack_channel, self.slack_thread, self.slack_token)

    def crawl(self) -> list[dict]:
        """Run the crawl. Returns list of discovered image dicts."""
        ensure_playwright_browsers()

        from playwright.sync_api import sync_playwright

        print(f"[crawl] Starting crawl of {self.base_url}")
        print(f"  Depth: {self.depth}, Min size: {self.min_size}px, Limit: {self.limit}")
        print(f"  Mode: {'all pages' if self.all_pages else 'product-focused'}")

        domain = urlparse(self.base_url).netloc
        self._slack(f":mag: Crawling `{domain}` for brand assets...")

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": 1280, "height": 900},
                user_agent=USER_AGENT,
            )
            page = context.new_page()

            # BFS crawl
            queue: list[tuple[str, int]] = [(self.base_url, 0)]

            while queue and len(self.image_urls) < self.limit:
                url, current_depth = queue.pop(0)
                norm_url = _normalize_url(url)

                if norm_url in self.visited:
                    continue
                if not _is_same_domain(self.base_url, url):
                    continue
                if current_depth > self.depth:
                    continue

                self.visited.add(norm_url)
                self.pages_visited += 1

                print(f"\n[page {self.pages_visited}] {url} (depth {current_depth})")

                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    time.sleep(2)  # Let lazy-loaded content settle

                    # Dismiss cookie banners
                    self._dismiss_cookies(page)

                    # Scroll to load lazy images
                    self._scroll_page(page)

                    # Extract images from this page
                    page_title = page.title() or ""
                    images = self._extract_images(page)
                    new_count = 0
                    for img_url in images:
                        if img_url not in self.image_urls and len(self.image_urls) < self.limit:
                            self.image_urls[img_url] = {
                                "page_url": url,
                                "page_title": page_title,
                            }
                            new_count += 1

                    print(f"  Found {len(images)} images ({new_count} new), total: {len(self.image_urls)}")

                    # Extract design tokens if requested
                    if self.design_system:
                        try:
                            tokens = extract_design_tokens(page)
                            if tokens:
                                self._design_tokens.append(tokens)
                        except Exception as e:
                            print(f"  [design] Token extraction failed on {url}: {e}")

                    # Progress update every 5 pages
                    if self.pages_visited % 5 == 0:
                        self._slack(
                            f"Crawling `{domain}` — {self.pages_visited} pages visited, "
                            f"{len(self.image_urls)} images found..."
                        )

                    # Discover links for BFS
                    if current_depth < self.depth:
                        links = self._extract_links(page)
                        for link in links:
                            norm_link = _normalize_url(link)
                            if norm_link not in self.visited:
                                # In product-focused mode, only follow product-like URLs
                                # (plus home and top-level pages at depth 0)
                                if self.all_pages or current_depth == 0 or _is_product_url(link):
                                    queue.append((link, current_depth + 1))

                except Exception as e:
                    print(f"  [error] Failed to crawl {url}: {e}")
                    continue

            browser.close()

        token_note = f", {len(self._design_tokens)} pages with design tokens" if self.design_system else ""
        print(f"\n[crawl] Done — {self.pages_visited} pages, {len(self.image_urls)} unique images{token_note}")
        return [
            {"url": url, **meta}
            for url, meta in self.image_urls.items()
        ]

    def _dismiss_cookies(self, page):
        """Dismiss common cookie consent banners."""
        cookie_selectors = [
            'button:has-text("Accept")',
            'button:has-text("Allow")',
            'button:has-text("Got it")',
            'button:has-text("OK")',
            'button:has-text("Agree")',
            '[id*="cookie"] button',
            '[class*="cookie"] button',
            '[id*="consent"] button',
        ]
        for sel in cookie_selectors:
            try:
                btn = page.query_selector(sel)
                if btn and btn.is_visible():
                    btn.click()
                    time.sleep(0.5)
                    return
            except Exception:
                continue

    def _scroll_page(self, page, max_scrolls: int = 5):
        """Scroll down to trigger lazy-loaded images."""
        for _ in range(max_scrolls):
            page.evaluate("window.scrollBy(0, window.innerHeight)")
            time.sleep(0.8)

    def _extract_images(self, page) -> list[str]:
        """Extract qualifying image URLs from the page."""
        min_size = self.min_size
        images = page.evaluate(f"""() => {{
            const out = new Set();

            // Regular img tags
            document.querySelectorAll('img').forEach(img => {{
                if (img.naturalWidth >= {min_size} || img.naturalHeight >= {min_size} ||
                    img.width >= {min_size} || img.height >= {min_size}) {{
                    const src = img.currentSrc || img.src;
                    if (src && src.startsWith('http')) out.add(src);
                }}
                // Also check srcset for high-res versions
                if (img.srcset) {{
                    const parts = img.srcset.split(',');
                    for (const part of parts) {{
                        const url = part.trim().split(/\\s+/)[0];
                        if (url && url.startsWith('http')) out.add(url);
                    }}
                }}
            }});

            // Picture source elements
            document.querySelectorAll('picture source').forEach(src => {{
                if (src.srcset) {{
                    const parts = src.srcset.split(',');
                    for (const part of parts) {{
                        const url = part.trim().split(/\\s+/)[0];
                        if (url && url.startsWith('http')) out.add(url);
                    }}
                }}
            }});

            // Open Graph images
            const ogImg = document.querySelector('meta[property="og:image"]');
            if (ogImg) {{
                const content = ogImg.getAttribute('content');
                if (content && content.startsWith('http')) out.add(content);
            }}

            // JSON-LD structured data product images
            document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {{
                try {{
                    const data = JSON.parse(script.textContent);
                    const items = Array.isArray(data) ? data : [data];
                    for (const item of items) {{
                        if (item.image) {{
                            const imgs = Array.isArray(item.image) ? item.image : [item.image];
                            for (const img of imgs) {{
                                const url = typeof img === 'string' ? img : img.url;
                                if (url && url.startsWith('http')) out.add(url);
                            }}
                        }}
                    }}
                }} catch(e) {{}}
            }});

            return [...out];
        }}""")

        # Filter to same domain or known CDN patterns
        valid = []
        for img_url in (images or []):
            parsed = urlparse(img_url)
            ext = pathlib.Path(parsed.path).suffix.lower()
            # Skip non-image extensions
            if ext and ext in _SKIP_EXTENSIONS:
                continue
            # Accept images from same domain or CDN
            valid.append(img_url)

        return valid

    def _extract_links(self, page) -> list[str]:
        """Extract internal links from the page."""
        links = page.evaluate("""() => {
            const out = [];
            document.querySelectorAll('a[href]').forEach(a => {
                const href = a.href;
                if (href && href.startsWith('http')) out.push(href);
            });
            return out;
        }""")

        valid = []
        for link in (links or []):
            if not _is_same_domain(self.base_url, link):
                continue
            parsed = urlparse(link)
            ext = pathlib.Path(parsed.path).suffix.lower()
            if ext in _SKIP_EXTENSIONS:
                continue
            # Skip anchors, tel:, mailto:, javascript:
            if parsed.fragment and not parsed.path:
                continue
            valid.append(link)

        return valid


# ---------------------------------------------------------------------------
# Download + catalog pipeline
# ---------------------------------------------------------------------------

def download_and_catalog(
    discovered: list[dict],
    store: BrandAssetStore,
    slack_channel: str | None = None,
    slack_thread: str | None = None,
    slack_token: str | None = None,
) -> dict:
    """Download discovered images and catalog them in the BrandAssetStore.

    Returns summary dict with counts.
    """
    crawled_dir = store.images_dir / "crawled"
    crawled_dir.mkdir(parents=True, exist_ok=True)

    total = len(discovered)
    downloaded = 0
    new_assets = 0
    skipped = 0
    failed = 0

    print(f"\n[catalog] Processing {total} discovered images...")

    for i, item in enumerate(discovered, 1):
        url = item["url"]

        # Generate filename from URL hash
        url_hash = hashlib.sha256(url.encode()).hexdigest()[:16]
        parsed = urlparse(url)
        ext = pathlib.Path(parsed.path).suffix.lower()
        if ext not in _IMAGE_EXTENSIONS:
            ext = ".jpg"
        filename = f"crawl_{url_hash}{ext}"
        dest = crawled_dir / filename

        # Download if not already present
        if not dest.exists():
            print(f"  [{i}/{total}] Downloading {url[:80]}...")
            if not _download_image(url, dest):
                failed += 1
                continue
            downloaded += 1
        else:
            # Check if already in catalog
            file_hash = _sha256_file(dest)
            existing = store.get_asset(file_hash)
            if existing:
                skipped += 1
                continue
            downloaded += 1  # File exists but not cataloged

        # Add to catalog (auto-analyzes with Gemini)
        try:
            store.add_asset(
                dest,
                asset_type="other",  # Gemini will classify
                source="crawled",
                source_url=url,
                source_page_url=item.get("page_url"),
                source_page_title=item.get("page_title"),
                copy_to_store=False,  # Already in crawled dir
            )
            new_assets += 1
        except Exception as e:
            print(f"    [error] Catalog failed: {e}")
            failed += 1

        # Slack progress every 5 images
        if i % 5 == 0 and slack_channel and slack_token:
            _slack_post(
                f"Analyzing crawled images: {i}/{total} done...",
                slack_channel, slack_thread, slack_token,
            )

    return {
        "total_discovered": total,
        "downloaded": downloaded,
        "new_assets": new_assets,
        "skipped_existing": skipped,
        "failed": failed,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Crawl brand website for product images")
    parser.add_argument("--url", default=None,
                        help="Website URL to crawl (default: BRAND_WEBSITE_URL env var)")
    parser.add_argument("--depth", type=int, default=2, help="Max crawl depth (default: 2)")
    parser.add_argument("--min-size", type=int, default=300, help="Min image dimension in px (default: 300)")
    parser.add_argument("--limit", type=int, default=200, help="Max images to discover (default: 200)")
    parser.add_argument("--all-pages", action="store_true",
                        help="Crawl all pages (default: product-focused)")
    parser.add_argument("--slack", action="store_true", help="Post progress to Slack")
    parser.add_argument("--design-system", action="store_true",
                        help="Extract CSS tokens, fonts, and colors into brand design files")
    args = parser.parse_args()

    # Resolve URL: explicit --url > BRAND_WEBSITE_URL env var
    url = args.url or os.environ.get("BRAND_WEBSITE_URL")
    if not url:
        print("[error] No URL specified. Pass --url or set BRAND_WEBSITE_URL env var.")
        sys.exit(1)

    slack_channel = os.environ.get("SLACK_CHANNEL_ID") if args.slack else None
    slack_thread = os.environ.get("SLACK_THREAD_TS") if args.slack else None

    # Crawl website
    crawler = BrandCrawler(
        base_url=url,
        depth=args.depth,
        min_size=args.min_size,
        limit=args.limit,
        all_pages=args.all_pages,
        slack_channel=slack_channel,
        slack_thread=slack_thread,
        design_system=args.design_system,
    )
    discovered = crawler.crawl()

    # Design system extraction (runs before image cataloging)
    if args.design_system and crawler._design_tokens:
        profile_root = _script_dir.parent.parent.parent
        brand_dir = profile_root / "workspace" / "brand"
        if brand_dir.is_dir():
            print(f"\n[design] Synthesizing design system from {len(crawler._design_tokens)} pages...")
            design_system = synthesize_design_system(crawler._design_tokens)
            write_design_files(design_system, brand_dir)
            print("[design] Brand design files updated.")
        else:
            print(f"[design] brand_dir not found at {brand_dir}, skipping file write.")

    if not discovered:
        print("[done] No images discovered.")
        return

    # Download + catalog
    store = BrandAssetStore()
    try:
        slack_token = None
        if slack_channel:
            slack_token = os.environ.get("SLACK_BOT_TOKEN") or _read_slack_token()

        summary = download_and_catalog(
            discovered, store,
            slack_channel=slack_channel,
            slack_thread=slack_thread,
            slack_token=slack_token,
        )

        # Record crawl session
        store.record_crawl(
            url=url,
            depth=args.depth,
            pages=crawler.pages_visited,
            found=summary["total_discovered"],
            new=summary["new_assets"],
        )

        # Print summary
        print(f"\n{'=' * 60}")
        print(f"Crawl Summary — {urlparse(url).netloc}")
        print(f"{'=' * 60}")
        print(f"  Pages visited:     {crawler.pages_visited}")
        print(f"  Images discovered: {summary['total_discovered']}")
        print(f"  Downloaded:        {summary['downloaded']}")
        print(f"  New assets:        {summary['new_assets']}")
        print(f"  Already cataloged: {summary['skipped_existing']}")
        print(f"  Failed:            {summary['failed']}")

        # Slack final summary
        if slack_channel and slack_token:
            stats = store.stats()
            by_type = stats.get("by_type", {})
            type_breakdown = ", ".join(f"{c} {t}" for t, c in sorted(by_type.items()) if c > 0)
            _slack_post(
                f":white_check_mark: *Crawl complete* — `{urlparse(url).netloc}`\n"
                f"  {summary['new_assets']} images cataloged"
                + (f" ({type_breakdown})" if type_breakdown else "")
                + f"\n  {summary['skipped_existing']} already in catalog, {summary['failed']} failed",
                slack_channel, slack_thread, slack_token,
            )
    finally:
        store.close()
    print(f"\n[done] Brand asset catalog updated.")


if __name__ == "__main__":
    main()
