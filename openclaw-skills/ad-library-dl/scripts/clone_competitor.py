# /// script
# requires-python = ">=3.10"
# dependencies = ["google-genai>=1.0.0", "google-api-python-client>=2.100.0", "google-auth>=2.20.0"]
# ///
"""Competitor Clone Brief Generator.

Generates clone briefs for static ads (consumed by Pixel/designer)
and filming scripts for video ads (consumed by Reel/video-editor).
Saves outputs to Drive Clones/ subfolder and produces delegation payloads.

Supports automatic brand asset matching — when a BrandAssetStore catalog
exists, clone briefs include matched product images as --input-image refs.

Usage:
    # Static clone briefs (for Pixel)
    uv run clone_competitor.py --brand "BrandDir" --top 5 --type statics --slack

    # Video filming scripts (for Reel)
    uv run clone_competitor.py --brand "BrandDir" --top 3 --type videos --slack

    # Both types in a single run
    uv run clone_competitor.py --brand "BrandDir" --top 5 --type both --slack

    # Specific assets
    uv run clone_competitor.py --brand "BrandDir" --assets "abc123,def456" --slack

    # Skip brand asset matching
    uv run clone_competitor.py --brand "BrandDir" --top 5 --no-match
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import pathlib
import random
import re
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

# ---------------------------------------------------------------------------
# Imports from sibling modules
# ---------------------------------------------------------------------------

_script_dir = pathlib.Path(__file__).resolve().parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))

from ad_library_dl import (
    _read_slack_token,
    _get_allowed_channels,
    _dm_holden,
    _workspace_root,
    _retry as _retry_dl,
)

from analyze_competitor import (
    detect_workspace_root,
    load_catalog,
    save_catalog,
    load_cached_analysis,
    create_google_doc,
    _retry,
)

from competitor_monitor import (
    _drive_service,
    _drive_find_or_create_folder,
    _drive_upload_file,
)

from ci_store import CIStore

# Optional brand asset import (may not exist on first deploy)
try:
    from brand_asset_store import BrandAssetStore
except ImportError:
    BrandAssetStore = None


# ---------------------------------------------------------------------------
# Slack progress helper
# ---------------------------------------------------------------------------

_slack_enabled = False  # Set by main() when --slack is passed


def _enable_slack_for_interactive() -> None:
    """Enable Slack for interactive subcommands based on env vars."""
    global _slack_enabled
    _slack_enabled = bool(
        os.environ.get("SLACK_CHANNEL_ID") and os.environ.get("SLACK_THREAD_TS")
    )


def _slack_progress(text: str) -> None:
    """Post a brief progress update to the Slack thread (best-effort)."""
    if not _slack_enabled:
        return
    channel = os.environ.get("SLACK_CHANNEL_ID")
    thread_ts = os.environ.get("SLACK_THREAD_TS")
    token = os.environ.get("SLACK_BOT_TOKEN") or _read_slack_token()
    if not channel or not token or not thread_ts:
        return
    payload = {"channel": channel, "text": text, "thread_ts": thread_ts}
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception:
        pass


def _slack_upload_file(file_path: str | pathlib.Path, title: str, comment: str) -> bool:
    """Upload a file to the current Slack thread using the v2 files API.

    Uses the same 3-step pattern as video-editor/lib/slack_upload.py but with
    urllib only (no requests dependency).  Best-effort — returns False on any
    failure without raising.
    """
    channel = os.environ.get("SLACK_CHANNEL_ID")
    thread_ts = os.environ.get("SLACK_THREAD_TS")
    token = os.environ.get("SLACK_BOT_TOKEN") or _read_slack_token()
    if not channel or not token:
        return False

    fp = pathlib.Path(file_path)
    if not fp.exists():
        return False

    file_size = fp.stat().st_size

    try:
        # Step 1: Get upload URL
        params = urllib.parse.urlencode({"filename": fp.name, "length": str(file_size)})
        req = urllib.request.Request(
            f"https://slack.com/api/files.getUploadURLExternal?{params}",
            method="POST",
            headers={"Authorization": f"Bearer {token}"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        if not data.get("ok"):
            return False

        upload_url = data["upload_url"]
        file_id = data["file_id"]

        # Step 2: Upload file bytes to presigned URL
        boundary = "----CloneUploadBoundary"
        file_bytes = fp.read_bytes()
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{fp.name}"\r\n'
            f"Content-Type: application/octet-stream\r\n\r\n"
        ).encode() + file_bytes + f"\r\n--{boundary}--\r\n".encode()

        req2 = urllib.request.Request(
            upload_url,
            data=body,
            method="POST",
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        )
        urllib.request.urlopen(req2, timeout=30)

        # Step 3: Complete upload — share to channel/thread
        payload: dict = {
            "files": [{"id": file_id, "title": title}],
            "channel_id": channel,
            "initial_comment": comment,
        }
        if thread_ts:
            payload["thread_ts"] = thread_ts

        req3 = urllib.request.Request(
            "https://slack.com/api/files.completeUploadExternal",
            data=json.dumps(payload).encode(),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req3, timeout=15) as resp:
            result = json.loads(resp.read())
        return bool(result.get("ok"))
    except Exception:
        return False


def _resolve_source_image(
    competitors_dir: pathlib.Path,
    catalog: dict,
    asset_hash: str,
) -> str | None:
    """Look up the competitor ad image path from the catalog.

    Search order:
      1. workspace/brand/competitors/<brand>/<session>/<filename>
      2. ~/Downloads/ad-library/<brand>/<session>/<filename>

    Returns the absolute path string if the file exists, else None.
    """
    asset = catalog.get("assets", {}).get(asset_hash)
    if not asset:
        return None
    brand = asset.get("brand", "")
    session = asset.get("session", "")
    filename = asset.get("filename", "")
    if not (brand and session and filename):
        return None

    # 1. Primary: workspace competitors dir
    path = competitors_dir / brand / session / filename
    resolved = path.resolve()
    if str(resolved).startswith(str(competitors_dir.resolve())) and path.exists():
        return str(path)

    # 2. Fallback: ~/Downloads/ad-library (browser download default)
    downloads_dir = pathlib.Path.home() / "Downloads" / "ad-library"
    if downloads_dir.is_dir():
        dl_path = downloads_dir / brand / session / filename
        dl_resolved = dl_path.resolve()
        # Boundary check: must stay within ~/Downloads/ad-library/
        if str(dl_resolved).startswith(str(downloads_dir.resolve())) and dl_path.exists():
            return str(dl_path)

    return None


# ---------------------------------------------------------------------------
# Brand design context (colors, design rules, imagery guidelines, logo)
# ---------------------------------------------------------------------------

def _load_brand_design_context() -> tuple[str, str | None]:
    """Read brand design files and return condensed guidelines + logo path.

    Reads colors.md, design-rules.md, DESIGN-SYSTEM.md, imagery.md from
    workspace/brand/. Returns (condensed_context, logo_path_or_none).
    Skips template placeholders (files with {{ markers in first 200 chars).
    Condensed context is capped at 1500 chars.
    """
    profile_root = _script_dir.parent.parent.parent
    workspace = profile_root / "workspace"
    brand_dir = workspace / "brand"

    parts: list[str] = []

    # Read design files in priority order
    design_files = [
        ("COLORS", brand_dir / "colors.md"),
        ("DESIGN RULES", brand_dir / "design-rules.md"),
        ("DESIGN SYSTEM", workspace / "DESIGN-SYSTEM.md"),
        ("IMAGERY", brand_dir / "imagery.md"),
    ]

    for label, path in design_files:
        if not path.exists():
            continue
        try:
            content = path.read_text().strip()
        except Exception:
            continue

        # Skip template placeholders
        if "{{" in content[:200]:
            continue
        # Skip very short files (likely stubs)
        if len(content) < 50:
            continue

        # Take first 400 chars per file to stay within budget
        trimmed = content[:400]
        if len(content) > 400:
            trimmed += "..."
        parts.append(f"[{label}]\n{trimmed}")

    # Resolve logo path
    logo_path: str | None = None
    logo_candidates = [
        brand_dir / "logo.png",
        brand_dir / "logo-primary.png",
        brand_dir / "logo.svg",
        brand_dir / "logo.jpg",
        brand_dir / "logo-primary.svg",
        brand_dir / "logo-primary.jpg",
        brand_dir / "assets" / "images" / "uploaded" / "logo.png",
    ]
    for lp in logo_candidates:
        if lp.exists():
            logo_path = str(lp)
            break

    # Also check DB for logo-variant assets
    if logo_path is None and BrandAssetStore is not None:
        store = None
        try:
            store = BrandAssetStore()
            logos = store.find_by_type("logo-variant", limit=1)
            if logos:
                p = store.absolute_path(logos[0])
                if p.exists():
                    logo_path = str(p)
        except Exception:
            pass
        finally:
            if store is not None:
                store.close()

    condensed = "\n\n".join(parts)
    if len(condensed) > 1500:
        condensed = condensed[:1500] + "..."

    return condensed, logo_path


# ---------------------------------------------------------------------------
# Fallback product image resolution
# ---------------------------------------------------------------------------

def _resolve_fallback_product_images() -> list[dict]:
    """3-step fallback chain to find product images when catalog is empty.

    Returns list of dicts: [{"path": str, "product_name": str|None, "source": str}]

    Steps:
      1. BrandAssetStore.find_by_type("product-shot") — direct type query
      2. Parse workspace/brand/product-images.json → use local file paths
      3. Directory scan of workspace/brand/product-images/
    """
    if BrandAssetStore is None:
        return []

    profile_root = _script_dir.parent.parent.parent
    brand_dir = profile_root / "workspace" / "brand"
    results: list[dict] = []

    # Step 1: Direct DB query for product-shot assets
    store = None
    try:
        store = BrandAssetStore()
        shots = store.find_by_type("product-shot", limit=6)
        for s in shots:
            p = store.absolute_path(s)
            if p.exists():
                results.append({
                    "path": str(p),
                    "product_name": s.get("product_name"),
                    "source": "brand_assets_db",
                })
        if results:
            return results
    except Exception:
        pass
    finally:
        if store is not None:
            store.close()

    # Step 2: Parse product-images.json for local file references
    json_path = brand_dir / "product-images.json"
    if json_path.exists():
        try:
            data = json.loads(json_path.read_text())
            entries: list[tuple[str, list[str]]] = []
            if isinstance(data, list):
                for item in data:
                    name = item.get("product") or item.get("name") or "unknown"
                    imgs = item.get("images", [])
                    entries.append((name, imgs if isinstance(imgs, list) else []))
            elif isinstance(data, dict):
                for key, val in data.items():
                    if isinstance(val, list):
                        entries.append((key, val))
                    elif isinstance(val, dict):
                        entries.append((key, val.get("images", [])))

            for product_name, image_refs in entries:
                product_dir = brand_dir / "product-images" / product_name
                for img_ref in image_refs[:2]:  # Max 2 per product
                    # Resolve CDN URL to local file
                    if img_ref.startswith("http"):
                        fname = pathlib.PurePosixPath(img_ref.split("?")[0]).name
                        local = product_dir / fname if product_dir.is_dir() else None
                    else:
                        local = (json_path.parent / img_ref).resolve()
                        if not str(local).startswith(str(brand_dir.resolve())):
                            continue
                        if not local.exists() and product_dir.is_dir():
                            local = product_dir / pathlib.Path(img_ref).name

                    if local and local.exists():
                        results.append({
                            "path": str(local),
                            "product_name": product_name.replace("-", " ").title(),
                            "source": "product_images_json",
                        })
                        break  # One per product is enough at this stage
            if results:
                return results
        except Exception as e:
            print(f"[warn] Failed to parse product-images.json: {e}")

    # Step 3: Directory scan of product-images/
    pi_dir = brand_dir / "product-images"
    if pi_dir.is_dir():
        for subdir in sorted(pi_dir.iterdir()):
            if not subdir.is_dir():
                continue
            images = sorted(
                list(subdir.glob("*.png")) + list(subdir.glob("*.jpg"))
                + list(subdir.glob("*.webp")) + list(subdir.glob("*.jpeg"))
            )
            if images:
                results.append({
                    "path": str(images[0]),
                    "product_name": subdir.name.replace("-", " ").title(),
                    "source": "product_images_dir",
                })
        if results:
            return results

    return results


# ---------------------------------------------------------------------------
# Brand context helpers
# ---------------------------------------------------------------------------

def _load_brand_context() -> tuple[str, str]:
    """Load brand identity and product list from workspace.

    Returns (brand_context, products_summary).
    Uses products table for rich data (name + price + description),
    falls back to brand_assets product names.
    """
    profile_root = _script_dir.parent.parent.parent
    identity_path = profile_root / "workspace" / "brand" / "IDENTITY.md"

    brand_context = ""
    if identity_path.exists():
        try:
            brand_context = identity_path.read_text()[:2000]
        except Exception:
            pass

    products_summary = ""
    if BrandAssetStore is not None:
        store = None
        try:
            store = BrandAssetStore()
            # Try rich product catalog first
            detailed = store.list_products_detailed(brand="ours")
            if detailed:
                parts = []
                for p in detailed[:15]:
                    line = p["product_name"]
                    if p.get("price"):
                        line += f" ({p['price']})"
                    if p.get("description"):
                        desc = p["description"][:80].rstrip()
                        line += f" \u2014 {desc}"
                    parts.append(line)
                products_summary = "\n".join(parts)
            else:
                # Fallback to asset-based product names
                products = store.list_products()
                if products:
                    products_summary = ", ".join(products[:20])
        except Exception:
            pass
        finally:
            if store is not None:
                store.close()

    return brand_context, products_summary


def match_brand_assets(analysis: dict) -> dict:
    """Find matching brand assets for a clone brief.

    Returns {"product-shot": [{"asset_id": ..., "path": ...}], ...}

    When the catalog is empty or find_for_clone returns nothing,
    falls back to _resolve_fallback_product_images() for self-healing.
    """
    if BrandAssetStore is None:
        # No store module — still try fallback chain
        fallbacks = _resolve_fallback_product_images()
        if fallbacks:
            return {"product-shot": [
                {"asset_id": "fallback", "path": fb["path"],
                 "product_name": fb.get("product_name"), "asset_type": "product-shot"}
                for fb in fallbacks[:3]
            ]}
        return {}

    store = None
    try:
        store = BrandAssetStore()
        matched = store.find_for_clone(analysis)
        result = {}
        for role, assets in matched.items():
            result[role] = [
                {
                    "asset_id": a["asset_id"],
                    "path": str(store.absolute_path(a)),
                    "product_name": a.get("product_name"),
                    "asset_type": a.get("asset_type"),
                }
                for a in assets
            ]

        # Self-healing: if find_for_clone returned empty, try fallback chain
        if not result:
            print("    [match] Catalog empty or no matches — trying fallback chain...")
            fallbacks = _resolve_fallback_product_images()
            if fallbacks:
                result["product-shot"] = [
                    {"asset_id": "fallback", "path": fb["path"],
                     "product_name": fb.get("product_name"), "asset_type": "product-shot"}
                    for fb in fallbacks[:3]
                ]
                print(f"    [match] Fallback found {len(result['product-shot'])} product image(s) "
                      f"via {fallbacks[0]['source']}")

        return result
    except Exception as e:
        print(f"    [match] Brand asset matching failed: {e}")
        return {}
    finally:
        if store is not None:
            store.close()


# ---------------------------------------------------------------------------
# Clone brief generation (statics — for Pixel/designer)
# ---------------------------------------------------------------------------

STATIC_CLONE_PROMPT = """You are a creative director producing a clone brief for a competitor ad.
Given the analysis below, generate a detailed clone brief that our designer (Pixel) can use
to create a similar ad adapted to our brand.

IMPORTANT: If the competitor's product is NOT similar to ours (e.g., they sell ramen,
we sell shakes), focus your clone brief on the FORMAT, HOOK, and STYLE — not the product.
Describe how to recreate the ad's structure, pacing, visual approach, and hook technique
using OUR products instead. The goal is to steal the format, not clone the product.

{brand_context_block}

{design_context_block}

ANALYSIS:
{analysis_json}

{brand_assets_block}

Generate a JSON clone brief with these fields:

{{
    "brief_type": "static_clone",
    "concept_name": "<short-slug, 2-4 words, lowercase-dashed, e.g. benefits-list-pour-shot or flavor-bundle-v1>",
    "reference_rank": <int>,
    "prompt": "<detailed image generation prompt for nano-banana-pro, describing the composition, style, lighting, and layout to recreate — adapted to our brand>",
    "key_elements_to_keep": ["<list of composition/style elements that make this ad work>"],
    "elements_to_change": ["<list of things to swap for our brand: product, colors, copy, logo>"],
    "composition_notes": "<describe the layout: hero image placement, text hierarchy, negative space>",
    "lighting_style": "<describe the lighting approach>",
    "color_direction": "<color palette guidance for our brand version>",
    "text_overlays": ["<list of text elements with placement notes — adapted copy for our brand>"],
    "reference_image_notes": "<what to reference from the original, what to change>",
    "product_images": [
        {{"asset_id": "<id>", "role": "hero-product|lifestyle-bg|product-inset", "path": "<path>"}}
    ]
}}

For product_images, select the most relevant brand assets from the AVAILABLE list (if any).
Be specific and actionable. The designer should be able to execute this without seeing the original."""


VIDEO_CLONE_PROMPT = """You are a creative director producing a filming script / editing brief
for cloning a competitor video ad. Given the analysis below, create a production-ready brief.

IMPORTANT: If the competitor's product is NOT similar to ours (e.g., they sell ramen,
we sell shakes), focus on the FORMAT, HOOK, and STYLE — not the product.
Describe how to recreate the ad's structure, pacing, visual approach, and hook technique
using OUR products instead.

{brand_context_block}

ANALYSIS:
{analysis_json}

Generate a JSON filming script with these fields:

{{
    "brief_type": "video_clone",
    "concept_name": "<short-slug, 2-4 words, lowercase-dashed, e.g. ugc-unboxing-hook or studio-benefits-reel>",
    "reference_rank": <int>,
    "total_duration_seconds": <int>,
    "hook_analysis": {{
        "technique": "<what grabs attention in first 3 seconds>",
        "our_version": "<how to adapt the hook for our brand>"
    }},
    "scenes": [
        {{
            "scene_number": <int>,
            "start_time": "<MM:SS>",
            "end_time": "<MM:SS>",
            "duration_seconds": <int>,
            "camera": "<shot type: close-up, wide, handheld, static, etc.>",
            "action": "<what happens visually>",
            "text_overlay": "<on-screen text if any>",
            "audio": "<voiceover line / music / SFX>"
        }}
    ],
    "voiceover_script": "<full adapted voiceover script for our brand>",
    "music_direction": "<genre, tempo, mood, reference track style>",
    "editing_notes": "<pacing, cut style, transitions, effects>",
    "cta": {{
        "text": "<call to action text>",
        "placement": "<how and when the CTA appears>"
    }},
    "production_requirements": ["<list: UGC vs studio, talent, props, locations>"]
}}

Adapt everything to our brand. Be production-ready — a video editor should be able to execute this."""


def generate_static_brief(client, analysis: dict, model: str,
                          brand_context: str = "", products_summary: str = "",
                          brand_assets: dict | None = None,
                          competitor_products: list[dict] | None = None,
                          design_context: str = "") -> dict:
    """Generate a static clone brief from an asset analysis."""
    # Build brand context block
    brand_context_block = ""
    if brand_context or products_summary:
        brand_context_block = f"OUR BRAND:\n{brand_context[:1000]}\n"
        if products_summary:
            brand_context_block += f"\nOUR PRODUCTS:\n{products_summary}\n"

    # Add competitor product context if available
    if competitor_products:
        brand_context_block += "\nCOMPETITOR PRODUCTS (what this ad is selling):\n"
        for cp in competitor_products[:5]:
            line = f"  - {cp['product_name']}"
            if cp.get("price"):
                line += f" ({cp['price']})"
            if cp.get("description"):
                line += f" \u2014 {cp['description'][:80]}"
            brand_context_block += line + "\n"

    # Build design context block from brand design files
    design_context_block = ""
    if design_context:
        design_context_block = (
            "BRAND DESIGN GUIDELINES (use these colors, styles, and rules):\n"
            f"{design_context}\n"
        )

    # Build brand assets block
    brand_assets_block = ""
    if brand_assets:
        lines = ["AVAILABLE BRAND ASSETS (our product images for reference):"]
        for role, assets in brand_assets.items():
            for a in assets[:2]:  # Max 2 per role to keep prompt manageable
                name = a.get("product_name") or "unnamed"
                lines.append(f"  - [{role}] {name} (asset_id: {a['asset_id'][:12]}, path: {a['path']})")
        brand_assets_block = "\n".join(lines)

    prompt = STATIC_CLONE_PROMPT.format(
        analysis_json=json.dumps(analysis, indent=2),
        brand_context_block=brand_context_block,
        design_context_block=design_context_block,
        brand_assets_block=brand_assets_block,
    )
    response = _retry(
        lambda: client.models.generate_content(model=model, contents=[prompt]),
        max_retries=3, base_delay=5.0, label="clone-brief",
    )

    text = response.text
    # Parse JSON from response
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
        return {"brief_type": "static_clone", "raw_brief": text}


def generate_video_brief(client, analysis: dict, model: str,
                         brand_context: str = "", products_summary: str = "",
                         competitor_products: list[dict] | None = None) -> dict:
    """Generate a video filming script from an asset analysis."""
    brand_context_block = ""
    if brand_context or products_summary:
        brand_context_block = f"OUR BRAND:\n{brand_context[:1000]}\n"
        if products_summary:
            brand_context_block += f"\nOUR PRODUCTS:\n{products_summary}\n"

    if competitor_products:
        brand_context_block += "\nCOMPETITOR PRODUCTS (what this ad is selling):\n"
        for cp in competitor_products[:5]:
            line = f"  - {cp['product_name']}"
            if cp.get("price"):
                line += f" ({cp['price']})"
            if cp.get("description"):
                line += f" \u2014 {cp['description'][:80]}"
            brand_context_block += line + "\n"

    prompt = VIDEO_CLONE_PROMPT.format(
        analysis_json=json.dumps(analysis, indent=2),
        brand_context_block=brand_context_block,
    )
    response = _retry(
        lambda: client.models.generate_content(model=model, contents=[prompt]),
        max_retries=3, base_delay=5.0, label="video-script",
    )

    text = response.text
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
        return {"brief_type": "video_clone", "raw_script": text}


# ---------------------------------------------------------------------------
# Video script → Google Doc
# ---------------------------------------------------------------------------

def video_brief_to_markdown(brief: dict, brand: str, rank: int) -> str:
    """Convert a video clone brief JSON to markdown for Google Doc."""
    lines = [
        f"# Video Clone Brief — {brand} (Reference: #{rank})",
        "",
        f"**Duration:** {brief.get('total_duration_seconds', '?')} seconds",
        "",
    ]

    # Hook
    hook = brief.get("hook_analysis", {})
    if hook:
        lines += [
            "## Hook (First 3 Seconds)",
            f"**Original technique:** {hook.get('technique', 'N/A')}",
            f"**Our version:** {hook.get('our_version', 'N/A')}",
            "",
        ]

    # Scenes
    scenes = brief.get("scenes", [])
    if scenes:
        lines.append("## Scene Breakdown")
        lines.append("")
        for scene in scenes:
            lines.append(f"### Scene {scene.get('scene_number', '?')} "
                        f"({scene.get('start_time', '?')} - {scene.get('end_time', '?')})")
            lines.append(f"- **Camera:** {scene.get('camera', 'N/A')}")
            lines.append(f"- **Action:** {scene.get('action', 'N/A')}")
            if scene.get("text_overlay"):
                lines.append(f"- **Text overlay:** {scene['text_overlay']}")
            if scene.get("audio"):
                lines.append(f"- **Audio:** {scene['audio']}")
            lines.append("")

    # Voiceover
    vo = brief.get("voiceover_script")
    if vo:
        lines += ["## Voiceover Script", "", vo, ""]

    # Music
    music = brief.get("music_direction")
    if music:
        lines += ["## Music Direction", "", music, ""]

    # Editing
    editing = brief.get("editing_notes")
    if editing:
        lines += ["## Editing Notes", "", editing, ""]

    # CTA
    cta = brief.get("cta", {})
    if cta:
        lines += [
            "## Call to Action",
            f"- **Text:** {cta.get('text', 'N/A')}",
            f"- **Placement:** {cta.get('placement', 'N/A')}",
            "",
        ]

    # Production requirements
    reqs = brief.get("production_requirements", [])
    if reqs:
        lines.append("## Production Requirements")
        for r in reqs:
            lines.append(f"- {r}")
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Delegation payloads (for sessions_send)
# ---------------------------------------------------------------------------

def build_static_delegation(brief: dict, asset_hash: str, channel_id: str, thread_ts: str,
                            brand_context: str = "", logo_path: str | None = None) -> dict:
    """Build sessions_send payload for Pixel (static clone).

    Always includes brand context section and logo path when available.
    Adds explicit WARNING when no product images matched.
    """
    prompt = brief.get("prompt", "")
    reference_notes = brief.get("reference_image_notes", "")
    text_overlays = brief.get("text_overlays", [])
    product_images = brief.get("product_images", [])

    message = (
        f"Generate a brand-adapted version of competitor ad (ref: {asset_hash[:8]}).\n\n"
    )

    # Always include brand context so Pixel knows the brand guidelines
    if brand_context:
        message += f"BRAND CONTEXT:\n{brand_context[:800]}\n\n"

    message += (
        f"Prompt: {prompt}\n\n"
        f"Text overlays to include: {json.dumps(text_overlays)}\n\n"
        f"Reference notes: {reference_notes}\n\n"
    )

    # Always include logo if available
    if logo_path:
        message += f"Brand logo (MUST include in generated ad): --input-image \"{logo_path}\"\n\n"

    if product_images:
        message += "Product reference images (pass as --input-image to generate_ads_safe.sh):\n"
        for pi in product_images:
            message += f"  --input-image \"{pi['path']}\" (role: {pi.get('role', 'reference')})\n"
        message += "\n"
    else:
        message += (
            "WARNING: No product images were matched from the brand asset catalog.\n"
            "Before generating, check workspace/brand/product-images/ for product shots.\n"
            "If found, pass them as --input-image to generate_ads_safe.sh.\n\n"
        )

    message += (
        f"Generate in all 3 ratios (1:1, 9:16, 16:9).\n"
        f"Respond directly to channel:{channel_id} thread:{thread_ts}"
    )

    return {
        "target_agent": "designer",
        "message": message,
    }


def build_video_delegation(brief: dict, asset_hash: str, doc_url: str | None,
                           channel_id: str, thread_ts: str) -> dict:
    """Build sessions_send payload for Reel (video clone)."""
    hook = brief.get("hook_analysis", {}).get("our_version", "")
    duration = brief.get("total_duration_seconds", 30)

    message = (
        f"Create a video ad based on competitor clone brief (ref: {asset_hash[:8]}).\n\n"
        f"Duration: {duration}s\n"
        f"Hook: {hook}\n"
    )
    if doc_url:
        message += f"Full filming script: {doc_url}\n"
    message += (
        f"\nFollow the scene breakdown and voiceover script in the doc.\n"
        f"Respond directly to channel:{channel_id} thread:{thread_ts}"
    )

    return {
        "target_agent": "video-editor",
        "message": message,
    }


# ---------------------------------------------------------------------------
# Slack posting
# ---------------------------------------------------------------------------

def post_clone_summary_to_slack(brand: str, briefs: list[dict], clone_type: str,
                                 drive_url: str | None) -> bool:
    """Post clone brief summary to Slack."""
    channel = os.environ.get("SLACK_CHANNEL_ID")
    thread_ts = os.environ.get("SLACK_THREAD_TS")
    token = os.environ.get("SLACK_BOT_TOKEN") or _read_slack_token()

    if not channel or not token:
        print("[slack] Missing channel or token — skipping")
        return False

    allowed = _get_allowed_channels()
    if allowed and channel not in allowed:
        print(f"[slack] BLOCKED: channel {channel} not in allowlist")
        _dm_holden(
            f":warning: *Channel Allowlist Block*\n\n"
            f"clone_competitor.py tried to post to `{channel}` "
            f"but it's not in the workspace allowlist."
        )
        return False

    type_label = "Static Clone Briefs" if clone_type == "statics" else "Video Filming Scripts"
    lines = [
        f"\U0001f3a8 *{type_label}: {brand}*",
        f"Generated {len(briefs)} clone brief{'s' if len(briefs) != 1 else ''}",
        "",
    ]

    for brief in briefs[:5]:
        rank = brief.get("reference_rank", "?")
        source_drive_id = brief.get("_source_drive_id")
        doc_url = brief.get("doc_url")
        if clone_type == "statics":
            desc = brief.get("composition_notes", "N/A")[:80]
            if source_drive_id:
                ad_link = f"https://drive.google.com/file/d/{source_drive_id}/view"
                lines.append(f"  \u2022 <{ad_link}|#{rank}> — {desc}")
            else:
                lines.append(f"  \u2022 #{rank} — {desc}")
        else:
            duration = brief.get("total_duration_seconds", "?")
            hook = brief.get("hook_analysis", {}).get("technique", "N/A")[:60]
            if source_drive_id:
                ad_link = f"https://drive.google.com/file/d/{source_drive_id}/view"
                label = f"{duration}s, hook: {hook}"
                if doc_url:
                    lines.append(f"  \u2022 <{ad_link}|#{rank}> — {label} | <{doc_url}|Script>")
                else:
                    lines.append(f"  \u2022 <{ad_link}|#{rank}> — {label}")
            elif doc_url:
                lines.append(f"  \u2022 #{rank} — {duration}s, hook: <{doc_url}|{hook}>")
            else:
                lines.append(f"  \u2022 #{rank} — {duration}s, hook: {hook}")

    if drive_url:
        lines.append("")
        lines.append(f"\U0001f4c1 <{drive_url}|Clone briefs folder>")

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
        print("[slack] Posted clone summary")
        return True
    except Exception as e:
        print(f"[slack] Failed: {e}")
        return False


# ---------------------------------------------------------------------------
# Interactive clone session management
# ---------------------------------------------------------------------------

_SESSION_TTL = int(os.environ.get("CLONE_SESSION_TTL", "14400"))  # 4 hours default
_SESSION_CLEANUP_AGE = 86400  # 24 hours


def _sanitize_concept_name(name: str) -> str:
    """Replicate generate_ads_safe.sh concept name sanitization exactly.

    Shell equivalent:
        echo "$name" | tr '[:upper:]' '[:lower:]'
            | sed 's/[^a-z0-9._-]/-/g'
            | sed 's/--*/-/g'
            | sed 's/^-//;s/-$//'
            | cut -c1-60
    """
    s = name.lower()
    s = re.sub(r'[^a-z0-9._-]', '-', s)
    s = re.sub(r'-{2,}', '-', s)
    s = s.strip('-')
    return s[:60]


def _sessions_dir() -> pathlib.Path:
    """Return the clone sessions directory, creating it if needed."""
    profile_root = _script_dir.parent.parent.parent
    d = profile_root / "workspace" / ".clone-sessions"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _generate_session_id() -> str:
    """Generate a unique clone session ID."""
    ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    rand = random.randint(10000, 99999)
    return f"cln-{ts}-{rand}"


_SESSION_ID_PATTERN = re.compile(r'^cln-\d{8}-\d{6}-\d{5}$')


def _get_session_file(session_id: str) -> pathlib.Path:
    if not _SESSION_ID_PATTERN.match(session_id):
        raise ValueError(
            f"Invalid session ID format: {session_id!r}. "
            f"Expected format: cln-YYYYMMDD-HHMMSS-NNNNN"
        )
    return _sessions_dir() / f"{session_id}.json"


def _session_load(session_id: str) -> dict:
    """Load and validate a session. Raises on missing/expired."""
    sf = _get_session_file(session_id)
    if not sf.exists():
        raise FileNotFoundError(f"Session {session_id} not found at {sf}")

    # Verify file permissions
    mode = sf.stat().st_mode & 0o777
    if mode != 0o600:
        sf.chmod(0o600)

    try:
        data = json.loads(sf.read_text())
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Session {session_id} file is corrupt (invalid JSON: {e}). "
            f"Delete {sf} and start a new session with 'init'."
        ) from e

    # TTL check (file mtime)
    mtime = sf.stat().st_mtime
    age = time.time() - mtime
    if age > _SESSION_TTL:
        raise TimeoutError(
            f"Session {session_id} expired ({int(age)}s old, max {_SESSION_TTL}s). "
            f"Start a new session with 'init'."
        )

    # Thread affinity check
    env_thread = os.environ.get("SLACK_THREAD_TS", "")
    session_thread = data.get("slack_thread_ts", "")
    if session_thread and not env_thread:
        raise PermissionError(
            f"Session {session_id} is bound to Slack thread {session_thread}, "
            f"but SLACK_THREAD_TS is not set. Set it before operating on this session."
        )
    if env_thread and session_thread and env_thread != session_thread:
        raise PermissionError(
            f"Session {session_id} belongs to thread {session_thread}, "
            f"but current thread is {env_thread}."
        )

    return data


def _session_save(session_id: str, data: dict) -> None:
    """Atomically save session data and refresh TTL."""
    sf = _get_session_file(session_id)
    tmp = sf.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    tmp.rename(sf)
    sf.chmod(0o600)


def _session_step_done(data: dict, index: int, step: str) -> bool:
    """Check if a step is done for a specific ad index."""
    if index < 0 or index >= len(data.get("ads", [])):
        return False
    return bool(data["ads"][index].get(f"{step}_done", False))


def _cleanup_old_sessions() -> None:
    """Remove sessions older than CLEANUP_AGE."""
    sdir = _sessions_dir()
    completed = sdir / "completed"
    completed.mkdir(exist_ok=True, mode=0o700)
    now = time.time()
    for f in sdir.glob("cln-*.json"):
        age = now - f.stat().st_mtime
        if age > _SESSION_CLEANUP_AGE:
            try:
                f.rename(completed / f.name)
            except Exception as e:
                print(f"[warn] Failed to archive session {f.name}: {e}")
    # Also purge completed sessions older than 30 days
    for f in completed.glob("cln-*.json"):
        try:
            age = now - f.stat().st_mtime
            if age > 86400 * 30:
                f.unlink()
        except Exception as e:
            print(f"[warn] Failed to purge old session {f.name}: {e}")
    # Clean up gate lockfiles older than 24 hours
    gates_dir = sdir / "gates"
    if gates_dir.is_dir():
        for f in gates_dir.glob("gate-*.lock"):
            try:
                age = now - f.stat().st_mtime
                if age > _SESSION_CLEANUP_AGE:
                    f.unlink()
            except Exception as e:
                print(f"[warn] Failed to clean gate lockfile {f.name}: {e}")


def _llm_generate_copy(prompt: str) -> str:
    """Call LLM via LiteLLM proxy with model fallback chain.

    Fallback: claude-opus-4-6 → gemini-3-pro → gemini-3-flash → kimi-k2.5:cloud
    Uses raw HTTP (urllib) — same pattern as rest of clone_competitor.py.
    """
    litellm_url = "http://127.0.0.1:4000/v1/chat/completions"
    litellm_key = os.environ.get("LITELLM_API_KEY", "")

    models = [
        "anthropic/claude-opus-4-6",
        "litellm/gemini-3-pro",
        "litellm/gemini-3-flash",
        "ollama/kimi-k2.5:cloud",
    ]

    last_error = None
    for model in models:
        try:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.8,
                "max_tokens": 4096,
            }
            headers = {"Content-Type": "application/json"}
            if litellm_key:
                headers["Authorization"] = f"Bearer {litellm_key}"

            req = urllib.request.Request(
                litellm_url,
                data=json.dumps(payload).encode(),
                headers=headers,
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read())

            content = result["choices"][0]["message"]["content"]
            if content:
                return content
        except Exception as e:
            last_error = e
            print(f"  [copy-gen] {model} failed: {e}")
            continue

    raise RuntimeError(
        f"All LLM models failed for copy generation. Last error: {last_error}\n"
        f"  Hint: All models route through LiteLLM proxy at {litellm_url}. "
        f"Is the LiteLLM proxy running? Check: launchctl list | grep litellm"
    )


COPY_GEN_PROMPT = """You are a world-class direct response copywriter creating ad copy variations for a clone ad.

COMPETITOR AD ANALYSIS:
{analysis}

OUR BRAND:
{brand_context}

OUR PRODUCTS:
{products_summary}

CONFIRMED PRODUCT FOR THIS AD: {confirmed_product}

BRAND DESIGN GUIDELINES:
{design_context}

COMPETITOR AD COMPOSITION:
{composition_notes}

Generate exactly {count} copy variations for this clone ad. Each variation should take a DIFFERENT angle:
1. **Benefit-focused** — Lead with the product's key benefit/result
2. **Urgency/Scarcity** — Create urgency with limited-time or exclusive framing
3. **Social-proof/Lifestyle** — Lead with transformation, results, or social validation

For EACH variation, provide:
- `headline`: The primary headline text to render ON the image (max 8 words, punchy)
- `secondary_text`: Supporting text below the headline (max 15 words)
- `cta`: Call-to-action button text (2-4 words)
- `generation_prompt`: A COMPLETE, DETAILED image generation prompt that includes:
  - The exact headline text to render on the image
  - The exact CTA text to render
  - Product placement and composition matching the competitor's layout
  - Our brand's color palette and visual style
  - Specific lighting, photography style, and mood
  - The confirmed product as the hero
  - CRITICAL: Do NOT describe the product's physical appearance (shape, color, packaging) —
    a reference photo of the actual product will be provided as an input image.
    Instead, describe WHERE and HOW the product should be placed in the composition.

CRITICAL: The `generation_prompt` must be a standalone, complete prompt for an AI image generator.
It must include the actual text to be rendered on the image (headline, CTA).
Do NOT just describe composition — include all visual details needed to generate the final ad.

Return ONLY valid JSON array:
[
  {{
    "variation": 1,
    "angle": "benefit-focused",
    "headline": "...",
    "secondary_text": "...",
    "cta": "...",
    "generation_prompt": "..."
  }},
  ...
]"""


# ---------------------------------------------------------------------------
# Subcommand implementations (interactive clone session)
# ---------------------------------------------------------------------------

def cmd_init(args) -> None:
    """Create a new interactive clone session."""
    _enable_slack_for_interactive()

    _cleanup_old_sessions()

    # Load catalog
    workspace_root = detect_workspace_root()
    competitors_dir = workspace_root / "brand" / "competitors"
    catalog = load_catalog(competitors_dir)

    brand = catalog["brands"].get(args.brand)
    if not brand:
        available = list(catalog["brands"].keys())
        print(f"ERROR: Brand '{args.brand}' not found in catalog.")
        if available:
            print(f"  Available: {', '.join(available)}")
        sys.exit(1)

    brand_display = brand.get("display_name", args.brand)

    # Select assets (same logic as batch mode)
    all_brand_assets = {
        h: a for h, a in catalog["assets"].items()
        if a.get("brand") == args.brand
    }

    if args.assets:
        target_hashes = [h.strip() for h in args.assets.split(",")]
        selected = []
        for h in target_hashes:
            matches = [ah for ah in all_brand_assets if ah.startswith(h)]
            if matches:
                selected.append((matches[0], all_brand_assets[matches[0]]))
            else:
                print(f"[warn] Asset {h} not found")
    else:
        media_type = "image" if args.clone_type == "statics" else "video"
        typed_assets = [
            (h, a) for h, a in all_brand_assets.items()
            if a.get("type") == media_type
        ]
        typed_assets.sort(key=lambda x: x[1].get("current_rank", 999))
        # Dedup by rank
        by_rank: dict[int, list] = {}
        for h, a in typed_assets:
            r = a.get("current_rank", 999)
            by_rank.setdefault(r, []).append((h, a))
        selected = []
        for r in sorted(by_rank):
            candidates = by_rank[r]
            candidates.sort(key=lambda x: (0 if x[1].get("content_hash") else 1, x[1].get("first_seen", "")))
            selected.append(candidates[0])
        selected = selected[:args.top]

    if not selected:
        print(f"ERROR: No {args.clone_type} assets found for {args.brand}")
        sys.exit(1)

    # Load brand context
    brand_context, products_summary = _load_brand_context()
    design_context, logo_path = _load_brand_design_context()

    # Build per-ad entries
    ads = []
    ads_without_analysis = 0
    for idx, (h, asset) in enumerate(selected):
        rank = asset.get("current_rank", asset.get("rank", 0))
        source_image = _resolve_source_image(competitors_dir, catalog, h)
        source_drive_id = asset.get("drive_file_id", "")

        # Match brand assets for product suggestions
        analysis = load_cached_analysis(competitors_dir, asset)
        if not analysis:
            ads_without_analysis += 1
        matched = {}
        matched_products = []
        if analysis and not args.no_match:
            matched = match_brand_assets(analysis)
            product_shots = matched.get("product-shot", [])
            for ps in product_shots[:3]:
                matched_products.append({
                    "product_name": ps.get("product_name", "Unknown"),
                    "product_image": ps.get("path", ""),
                })

        suggested = matched_products[0]["product_name"] if matched_products else ""

        # Save brief file
        brief_data = {}
        if analysis:
            try:
                brief_data = generate_static_brief(
                    _get_genai_client(), analysis, "gemini-3-pro-preview",
                    brand_context=brand_context,
                    products_summary=products_summary,
                    brand_assets=matched if matched else None,
                    competitor_products=None,
                    design_context=design_context,
                )
            except Exception as e:
                print(f"  [warn] Brief generation for {h[:8]} failed: {e}")
                brief_data = {"prompt": "", "composition_notes": ""}

        brief_file = _sessions_dir() / f"brief-{h[:10]}.json"
        brief_file.write_text(json.dumps(brief_data, indent=2))

        ads.append({
            "index": idx,
            "asset_hash": h,
            "rank": rank,
            "source_image": source_image or "",
            "source_drive_id": source_drive_id,
            "brief_file": str(brief_file),
            "matched_products": matched_products,
            "suggested_product": suggested,
            "logo_path": logo_path or "",
            "show_done": False,
            "product_done": False,
            "product_confirmed": "",
            "product_image_path": "",
            "copy_gen_done": False,
            "copy_options": [],
            "copy_done": False,
            "copy_selected": {},
            "generate_launched": False,
            "generate_done": False,
            "generate_pid": None,
            "concept_dir": "",
        })

    # Hard-fail if any ads are missing source images — cannot clone without reference
    missing_source = [a for a in ads if not a["source_image"]]
    if missing_source:
        print(f"ERROR: {len(missing_source)}/{len(ads)} ads have no source image file.")
        for m in missing_source:
            print(f"  Ad {m['index']} (rank #{m['rank']}, {m['asset_hash'][:8]}): source image not found")
        print()
        print("Source images are required for clone generation. Without the competitor ad")
        print("as a visual reference, the generator cannot replicate its style and layout.")
        print()
        print("Fix options:")
        print("  1. Re-scrape: uv run ad_library_dl.py \"<AD_LIBRARY_URL>\" --type images --offscreen")
        print("  2. Check ~/Downloads/ad-library/ for downloaded files")
        print("  3. Verify the brand directory in workspace/brand/competitors/")
        sys.exit(1)

    session_id = _generate_session_id()
    session_data = {
        "version": 1,
        "session_id": session_id,
        "created": datetime.datetime.utcnow().isoformat() + "Z",
        "brand": args.brand,
        "brand_display": brand_display,
        "clone_type": args.clone_type,
        "slack_channel_id": os.environ.get("SLACK_CHANNEL_ID", ""),
        "slack_thread_ts": os.environ.get("SLACK_THREAD_TS", ""),
        "total_ads": len(ads),
        "current_index": 0,
        "logo_path": logo_path or "",
        "ads": ads,
    }

    _session_save(session_id, session_data)

    print(f"Session {session_id} created. {len(ads)} ads queued for interactive cloning.")
    print(f"Brand: {brand_display} | Type: {args.clone_type}")
    for ad in ads:
        print(f"  Ad {ad['index']}: rank #{ad['rank']} ({ad['asset_hash'][:8]})"
              f"{' — suggested: ' + ad['suggested_product'] if ad['suggested_product'] else ''}")
    if ads_without_analysis > 0:
        print()
        print(f"WARNING: {ads_without_analysis}/{len(ads)} ads have no cached Gemini analysis.")
        print("  Product matching and auto-briefs will be limited for those ads.")
        print("  For better results, run analyze_competitor.py for this brand first.")
    print()
    print(f"NEXT STEP: Run show-ad to display the first competitor ad:")
    print(f"  clone_safe.sh show-ad --session {session_id} --index 0")
    print()
    print(">>> ONE STEP AT A TIME. Follow the NEXT STEP instructions from each command.")


def _get_genai_client():
    """Lazy-init Gemini client."""
    from google import genai
    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0013158607")
    return genai.Client(vertexai=True, project=project, location="global")


def cmd_show_ad(args) -> None:
    """Display competitor ad + analysis to Slack."""
    _enable_slack_for_interactive()
    data = _session_load(args.session)
    idx = args.index

    if idx < 0 or idx >= data["total_ads"]:
        print(f"ERROR: Index {idx} out of range (0-{data['total_ads'] - 1})")
        sys.exit(1)

    ad = data["ads"][idx]

    # Upload competitor source image to Slack
    source_image = ad["source_image"]
    if source_image and pathlib.Path(source_image).exists():
        rank = ad["rank"]
        brand = data["brand_display"]
        ok = _slack_upload_file(
            source_image,
            title=f"{brand} — Rank #{rank} (clone candidate {idx + 1}/{data['total_ads']})",
            comment=(
                f":mag: *Clone Candidate {idx + 1}/{data['total_ads']}* — {brand} Rank #{rank}\n"
                f"Asset: `{ad['asset_hash'][:10]}`"
            ),
        )
        if not ok:
            print(f"[warn] Failed to upload source image to Slack")
    else:
        print(f"[warn] Source image not found: {source_image}")

    # Load and display analysis
    brief_file = ad.get("brief_file", "")
    brief_data = {}
    if brief_file and pathlib.Path(brief_file).exists():
        brief_data = json.loads(pathlib.Path(brief_file).read_text())

    composition = brief_data.get("composition_notes", "N/A")
    key_elements = brief_data.get("key_elements_to_keep", [])
    color_dir = brief_data.get("color_direction", "N/A")
    text_overlays = brief_data.get("text_overlays", [])

    print(f"\n--- Ad {idx} Analysis ---")
    print(f"Rank: #{ad['rank']}")
    print(f"Composition: {composition}")
    if key_elements:
        print(f"Key elements: {', '.join(key_elements[:5])}")
    print(f"Color direction: {color_dir}")
    if text_overlays:
        print(f"Text overlays: {json.dumps(text_overlays[:3])}")
    print()

    # Show product suggestion
    if ad["matched_products"]:
        print(f"Suggested product: {ad['suggested_product']}")
        if len(ad["matched_products"]) > 1:
            alts = [p["product_name"] for p in ad["matched_products"][1:]]
            print(f"Alternatives: {', '.join(alts)}")
    else:
        print("No product suggestion available — user must specify product.")

    # Mark step done
    data["ads"][idx]["show_done"] = True
    data["current_index"] = idx
    _session_save(args.session, data)

    # Build product suggestion string
    suggested = ad['suggested_product'] or "(none — user must specify)"
    alts = ""
    if len(ad["matched_products"]) > 1:
        alt_names = [p["product_name"] for p in ad["matched_products"][1:]]
        alts = f"  |  Alternatives: {', '.join(alt_names)}"

    print()
    print(f"\u26d4 STOP \u2014 USER INPUT REQUIRED")
    print(f"Show the competitor ad above to the user and ask which product to use.")
    print(f"Suggested: {suggested}{alts}")
    print(f"DO NOT auto-fill. DO NOT proceed until the user responds.")
    print()
    print(f"After the user specifies a product, run:")
    print(f"  clone_safe.sh set-product --session {args.session} --index {idx} --product \"<user's response>\"")


def cmd_set_product(args) -> None:
    """Record confirmed product for an ad."""
    data = _session_load(args.session)
    idx = args.index

    if idx < 0 or idx >= data["total_ads"]:
        print(f"ERROR: Index {idx} out of range (0-{data['total_ads'] - 1})")
        sys.exit(1)

    # Prerequisite: show_done
    if not _session_step_done(data, idx, "show"):
        print(f"ERROR: Ad {idx} has not been shown yet.")
        print(f"  First run: clone_competitor.py show-ad --session {args.session} --index {idx}")
        sys.exit(1)

    product = args.product

    # Resolve product image from brand assets
    product_image_path = ""
    if BrandAssetStore is not None:
        store = None
        try:
            store = BrandAssetStore()
            # Search for product shots matching the confirmed product
            results = store.search(product, limit=3)
            for r in results:
                if r.get("asset_type") == "product-shot":
                    p = store.absolute_path(r)
                    if p.exists():
                        product_image_path = str(p)
                        break
            if not product_image_path:
                # Fallback: product-shot filtered by confirmed product name
                shots = store.find_by_type("product-shot", product_name=product, limit=1)
                if not shots:
                    # Try individual words (e.g. "Face Moisturizer" → "Moisturizer")
                    for word in product.split():
                        if len(word) >= 3:
                            shots = store.find_by_type("product-shot", product_name=word, limit=1)
                            if shots:
                                break
                if shots:
                    p = store.absolute_path(shots[0])
                    if p.exists():
                        product_image_path = str(p)
        except Exception as e:
            print(f"[warn] Brand asset search failed: {e}")
        finally:
            if store:
                store.close()

    # Fallback to fallback chain
    if not product_image_path:
        fallbacks = _resolve_fallback_product_images()
        if fallbacks:
            product_image_path = fallbacks[0]["path"]

    data["ads"][idx]["product_done"] = True
    data["ads"][idx]["product_confirmed"] = product
    data["ads"][idx]["product_image_path"] = product_image_path
    _session_save(args.session, data)

    print(f"Product confirmed: {product}")
    if product_image_path:
        print(f"Product image: {pathlib.Path(product_image_path).name}")
    else:
        print("[warn] No product image found — generation will proceed without product reference")
    print()
    print(f"NEXT STEP: Generate copy options by running:")
    print(f"  clone_safe.sh copy-gen --session {args.session} --index {idx}")


def cmd_copy_gen(args) -> None:
    """Generate copy variations via LLM."""
    data = _session_load(args.session)
    idx = args.index
    count = getattr(args, "count", 3)

    if idx < 0 or idx >= data["total_ads"]:
        print(f"ERROR: Index {idx} out of range (0-{data['total_ads'] - 1})")
        sys.exit(1)

    # Prerequisite: product_done
    if not _session_step_done(data, idx, "product"):
        print(f"ERROR: Product has not been confirmed for ad {idx}.")
        print(f"  First run: clone_competitor.py set-product --session {args.session} --index {idx} --product \"<product>\"")
        sys.exit(1)

    ad = data["ads"][idx]

    # Load context
    brand_context, products_summary = _load_brand_context()
    design_context, _ = _load_brand_design_context()

    # Load brief for composition notes
    brief_data = {}
    brief_file = ad.get("brief_file", "")
    if brief_file and pathlib.Path(brief_file).exists():
        brief_data = json.loads(pathlib.Path(brief_file).read_text())

    # Load analysis
    workspace_root = detect_workspace_root()
    competitors_dir = workspace_root / "brand" / "competitors"
    catalog = load_catalog(competitors_dir)
    asset = catalog.get("assets", {}).get(ad["asset_hash"], {})
    analysis = load_cached_analysis(competitors_dir, asset) if asset else {}
    analysis_text = json.dumps(analysis, indent=2)[:3000] if analysis else "No analysis available"

    prompt = COPY_GEN_PROMPT.format(
        analysis=analysis_text,
        brand_context=brand_context[:1000],
        products_summary=products_summary[:500],
        confirmed_product=ad["product_confirmed"],
        design_context=design_context[:800],
        composition_notes=brief_data.get("composition_notes", "N/A"),
        count=count,
    )

    print(f"Generating {count} copy variations for ad {idx} ({ad['product_confirmed']})...")

    try:
        response_text = _llm_generate_copy(prompt)

        # Parse JSON from response
        text = response_text
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

        options = json.loads(text)
        if not isinstance(options, list):
            options = [options]
        # Filter out non-dict entries (malformed LLM responses like ["string1", ...])
        options = [opt for opt in options if isinstance(opt, dict)]
        if not options:
            raise ValueError("LLM returned no valid copy option objects")
        options = options[:count]
    except Exception as e:
        print(f"ERROR: Copy generation failed: {e}")
        print(f"Falling back to brief's default prompt.")
        # Fallback: use brief prompt as single option
        options = [{
            "variation": 1,
            "angle": "default",
            "headline": ad["product_confirmed"],
            "secondary_text": "",
            "cta": "Shop Now",
            "generation_prompt": brief_data.get("prompt", f"Generate an ad for {ad['product_confirmed']}"),
        }]

    # Validate required fields in each option — fill defaults for missing keys
    for opt in options:
        if not opt.get("headline"):
            opt["headline"] = ad["product_confirmed"]
        if not opt.get("cta"):
            opt["cta"] = "Shop Now"
        if not opt.get("generation_prompt"):
            opt["generation_prompt"] = (
                f"Generate an ad for {ad['product_confirmed']}. "
                f"Headline: {opt['headline']}. CTA: {opt['cta']}."
            )

    # Store options
    data["ads"][idx]["copy_options"] = options
    data["ads"][idx]["copy_gen_done"] = True
    _session_save(args.session, data)

    # Display options
    print(f"\n--- {len(options)} Copy Variations ---\n")
    for i, opt in enumerate(options, 1):
        print(f"  [{i}] {opt.get('angle', 'variation ' + str(i))}")
        print(f"      Headline: {opt.get('headline', 'N/A')}")
        if opt.get("secondary_text"):
            print(f"      Secondary: {opt['secondary_text']}")
        print(f"      CTA: {opt.get('cta', 'N/A')}")
        print()

    n = len(options)
    choice_range = f"1-{n}" if n > 1 else "1"

    print(f"\u26d4 STOP \u2014 USER INPUT REQUIRED")
    print(f"Present these {n} copy options to the user. Ask which they prefer ({choice_range}, or custom).")
    print(f"DO NOT auto-select. DO NOT proceed until the user chooses.")
    print()
    print(f"After the user selects, run:")
    print(f"  clone_safe.sh set-copy --session {args.session} --index {idx} --choice <user's choice>")
    print(f"  Or for custom: --choice custom --custom-headline \"...\" --custom-cta \"...\"")


def cmd_set_copy(args) -> None:
    """Record user's copy selection."""
    data = _session_load(args.session)
    idx = args.index

    if idx < 0 or idx >= data["total_ads"]:
        print(f"ERROR: Index {idx} out of range (0-{data['total_ads'] - 1})")
        sys.exit(1)

    # Prerequisite: copy_gen_done
    if not _session_step_done(data, idx, "copy_gen"):
        print(f"ERROR: Copy options have not been generated for ad {idx}.")
        print(f"  First run: clone_competitor.py copy-gen --session {args.session} --index {idx}")
        sys.exit(1)

    ad = data["ads"][idx]
    choice = args.choice

    if choice == "custom":
        selected = {
            "variation": 0,
            "angle": "custom",
            "headline": getattr(args, "custom_headline", "") or "",
            "secondary_text": getattr(args, "custom_secondary", "") or "",
            "cta": getattr(args, "custom_cta", "") or "Shop Now",
            "generation_prompt": "",  # Will be built from brief + custom text
        }
        # Build generation prompt from brief + custom copy
        brief_data = {}
        brief_file = ad.get("brief_file", "")
        if brief_file and pathlib.Path(brief_file).exists():
            brief_data = json.loads(pathlib.Path(brief_file).read_text())
        base_prompt = brief_data.get("prompt", "")
        selected["generation_prompt"] = (
            f"{base_prompt}\n\nRender the following text ON the image:\n"
            f"Headline: {selected['headline']}\n"
            f"CTA: {selected['cta']}"
        )
    else:
        # Numeric choice
        try:
            choice_idx = int(choice) - 1
        except ValueError:
            print(f"ERROR: Invalid choice '{choice}'. Use 1, 2, 3, or 'custom'.")
            sys.exit(1)

        options = ad.get("copy_options", [])
        if choice_idx < 0 or choice_idx >= len(options):
            print(f"ERROR: Choice {choice} out of range (1-{len(options)})")
            sys.exit(1)

        selected = options[choice_idx]

    data["ads"][idx]["copy_selected"] = selected
    data["ads"][idx]["copy_done"] = True
    _session_save(args.session, data)

    print(f"Copy selected: [{selected.get('angle', 'custom')}]")
    print(f"  Headline: {selected.get('headline', 'N/A')}")
    print(f"  CTA: {selected.get('cta', 'N/A')}")
    print()
    print(f"NEXT STEP: Review the generation plan:")
    print(f"  clone_safe.sh plan --session {args.session} --index {idx}")


def cmd_generate(args) -> None:
    """Deprecated — replaced by plan + execute two-phase architecture."""
    print("ERROR: 'generate' has been replaced by 'plan' + 'execute'.")
    print(f"  Step 1: clone_safe.sh plan --session {args.session} --index {args.index}")
    print(f"  Step 2: clone_safe.sh execute --session {args.session} --index {args.index}")
    print()
    print("Use clone_safe.sh — not clone_competitor.py directly.")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Plan + Execute two-phase architecture (replaces cmd_generate)
# ---------------------------------------------------------------------------

_PLAN_TTL = 1800  # 30 minutes — plan must be executed within this window


def _build_generation_prompt(ad: dict, data: dict) -> str:
    """Build the full generation prompt with image role labels.

    Shared between cmd_plan (to write into the plan file) and batch mode.
    """
    selected_copy = ad["copy_selected"]
    gen_prompt = selected_copy.get("generation_prompt", "")

    if not gen_prompt:
        brief_data = {}
        brief_file = ad.get("brief_file", "")
        if brief_file and pathlib.Path(brief_file).exists():
            brief_data = json.loads(pathlib.Path(brief_file).read_text())
        gen_prompt = brief_data.get("prompt", f"Generate an ad for {ad['product_confirmed']}")
        headline = selected_copy.get("headline", "")
        cta = selected_copy.get("cta", "")
        if headline:
            gen_prompt += f"\n\nRender this headline text ON the image: {headline}"
        if cta:
            gen_prompt += f"\nCTA button text: {cta}"

    # Prepend image role labels so the generator knows which image is which
    image_roles = []
    img_num = 0

    # Hard-fail: competitor source image is mandatory for clone generation
    if not (ad.get("source_image") and pathlib.Path(ad["source_image"]).exists()):
        print("ERROR: Source competitor ad image not found. Cannot clone without reference.")
        print(f"  Expected: {ad.get('source_image', '(not set)')}")
        print("  The competitor ad image is the foundation of a clone — it defines the style,")
        print("  layout, and composition to replicate. Without it, generation produces generic")
        print("  output with no resemblance to the competitor's ad.")
        sys.exit(1)

    if ad.get("source_image") and pathlib.Path(ad["source_image"]).exists():
        img_num += 1
        image_roles.append(
            f"Image {img_num} is a COMPETITOR AD — use it as a STYLE and LAYOUT reference only. "
            f"Mimic its composition, lighting, and visual approach, but do NOT reproduce its product."
        )
    if ad.get("product_image_path") and pathlib.Path(ad["product_image_path"]).exists():
        img_num += 1
        image_roles.append(
            f"Image {img_num} is OUR ACTUAL PRODUCT PHOTO — this EXACT product MUST appear in the generated ad. "
            f"Use this specific product's appearance, packaging, shape, and colors. "
            f"Do NOT imagine or reinterpret the product — reproduce it faithfully from this reference photo."
        )
    logo_path = ad.get("logo_path") or data.get("logo_path", "")
    if logo_path and pathlib.Path(logo_path).exists():
        img_num += 1
        image_roles.append(
            f"Image {img_num} is OUR BRAND LOGO — incorporate it into the ad design."
        )
    if image_roles:
        role_prefix = "REFERENCE IMAGES (in order):\n" + "\n".join(image_roles) + "\n\n"
        gen_prompt = role_prefix + gen_prompt

    return gen_prompt


def cmd_plan(args) -> None:
    """Validate all steps and write generation plan file."""
    # Safe wrapper gate — must be called through clone_safe.sh
    if not os.environ.get("CLONE_SAFE"):
        print("ERROR: clone_competitor.py plan must be called through clone_safe.sh.")
        print(f"  Use: bash clone_safe.sh plan --session {args.session} --index {args.index}")
        sys.exit(1)

    data = _session_load(args.session)
    idx = args.index

    if idx < 0 or idx >= data["total_ads"]:
        print(f"ERROR: Index {idx} out of range (0-{data['total_ads'] - 1})")
        sys.exit(1)

    # Comprehensive prerequisite gate — ALL flags must be set
    errors = 0
    if not _session_step_done(data, idx, "show"):
        print("ERROR: Ad has not been shown. Run show-ad first.")
        errors += 1
    if not _session_step_done(data, idx, "product"):
        print("ERROR: Product has not been confirmed. Run set-product first.")
        errors += 1
    if not _session_step_done(data, idx, "copy_gen"):
        print("ERROR: Copy has not been generated. Run copy-gen first.")
        errors += 1
    if not _session_step_done(data, idx, "copy"):
        print("ERROR: Copy has not been selected. Run set-copy first.")
        errors += 1
    if errors > 0:
        print(f"\nBLOCKED: {errors} step(s) incomplete.")
        sys.exit(1)

    ad = data["ads"][idx]
    selected_copy = ad["copy_selected"]

    # Build generation prompt
    gen_prompt = _build_generation_prompt(ad, data)

    # Reject empty or trivially short generation prompts — indicates upstream failure
    # Strip role prefix before measuring (REFERENCE IMAGES block is boilerplate)
    prompt_body = gen_prompt
    if "REFERENCE IMAGES (in order):" in prompt_body:
        # Take content after the role labels section
        parts = prompt_body.split("\n\n", 2)
        prompt_body = parts[-1] if len(parts) > 1 else prompt_body
    prompt_body = prompt_body.strip()
    if len(prompt_body) < 50:
        print("ERROR: Generation prompt is too short or empty.")
        print(f"  Prompt body ({len(prompt_body)} chars): {prompt_body[:80]!r}")
        print("  This usually means copy-gen or set-copy produced no real creative direction.")
        print("  Re-run copy-gen to generate new copy options:")
        print(f"    clone_safe.sh copy-gen --session {args.session} --index {idx}")
        sys.exit(1)

    # Derive concept name and concept dir
    raw_concept = f"clone-{ad['asset_hash'][:8]}-{ad['product_confirmed'][:20]}"
    concept_name = _sanitize_concept_name(raw_concept)
    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    workspace_root = detect_workspace_root()
    concept_dir = str(workspace_root / "brand" / "creatives" / "clone" / f"{date_str}-{concept_name}")

    # Resolve image paths
    images = {}
    if ad.get("source_image") and pathlib.Path(ad["source_image"]).exists():
        images["source_ad"] = ad["source_image"]
    if ad.get("product_image_path") and pathlib.Path(ad["product_image_path"]).exists():
        images["product"] = ad["product_image_path"]
    logo_path = ad.get("logo_path") or data.get("logo_path", "")
    if logo_path and pathlib.Path(logo_path).exists():
        images["logo"] = logo_path

    # Competitor ref metadata
    competitor_ref = {
        "brand": data["brand_display"],
        "rank": ad["rank"],
        "asset_hash": ad["asset_hash"][:10],
    }

    # Build plan
    plan = {
        "version": 1,
        "created": datetime.datetime.utcnow().isoformat() + "Z",
        "session_id": data["session_id"],
        "ad_index": idx,
        "product": ad["product_confirmed"],
        "headline": selected_copy.get("headline", ""),
        "cta": selected_copy.get("cta", "Shop Now"),
        "generation_prompt": gen_prompt,
        "concept_name": concept_name,
        "concept_dir": concept_dir,
        "images": images,
        "competitor_ref": competitor_ref,
        "slack_channel_id": os.environ.get("SLACK_CHANNEL_ID", ""),
        "slack_thread_ts": os.environ.get("SLACK_THREAD_TS", ""),
    }

    # Write plan file
    plan_file = _sessions_dir() / f"plan-{data['session_id']}-ad{idx}.json"
    plan_file.write_text(json.dumps(plan, indent=2, ensure_ascii=False))
    plan_file.chmod(0o600)

    # Print human-readable summary
    print(f"Generation plan for ad {idx}:")
    print(f"  Product:    {plan['product']}")
    print(f"  Headline:   {plan['headline']}")
    print(f"  CTA:        {plan['cta']}")
    print(f"  Source ad:   rank #{competitor_ref['rank']} ({competitor_ref['asset_hash']})")
    print(f"  Images:     {len(images)} reference image(s)")
    for role, path in images.items():
        print(f"    {role}: {pathlib.Path(path).name}")
    print(f"  Concept:    {concept_name}")
    print(f"  Output dir: {concept_dir}")
    prompt_preview = gen_prompt[:120].replace("\n", " ")
    print(f"  Prompt:     {prompt_preview}...")
    print()
    print(f"Plan written to: {plan_file.name}")
    print()
    print(f"\u26d4 STOP \u2014 USER APPROVAL REQUIRED")
    print(f"Show the plan summary above to the user. Ask if they approve.")
    print(f"DO NOT execute until the user explicitly confirms.")
    print()
    print(f"After the user approves, run:")
    print(f"  clone_safe.sh execute --session {args.session} --index {idx}")
    print()
    print("This will generate images in 3 aspect ratios (5-10 minutes).")
    print("Wait for completion before moving to next ad.")


def _run_clone_generation(plan_data: dict) -> dict:
    """Execute clone image generation from a validated plan.

    Shared between interactive cmd_execute and batch main_batch.
    Calls _generate_ads_internal.sh directly (bypasses generate_ads_safe.sh).

    Returns dict with keys: success, concept_dir, drive_url, images_generated.
    """
    internal_script = _script_dir.parent.parent / "nano-banana-pro" / "scripts" / "_generate_ads_internal.sh"
    if not internal_script.exists():
        return {"success": False, "error": f"_generate_ads_internal.sh not found at {internal_script}"}

    concept_dir = pathlib.Path(plan_data["concept_dir"])
    concept_name = plan_data["concept_name"]
    gen_prompt = plan_data["generation_prompt"]
    images = plan_data.get("images", {})
    profile_root = _script_dir.parent.parent.parent

    # Create concept folder
    concept_dir.mkdir(parents=True, exist_ok=True)

    # Write prompt.txt
    (concept_dir / "prompt.txt").write_text(gen_prompt)

    # Build command — call _generate_ads_internal.sh directly
    cmd: list[str] = [str(internal_script), "--no-logo"]

    # Add reference images in order: source_ad, product, logo
    for role in ("source_ad", "product", "logo"):
        img_path = images.get(role, "")
        if img_path and pathlib.Path(img_path).exists():
            cmd.extend(["--input-image", img_path])

    cmd.extend(["--name", concept_name])
    cmd.append(gen_prompt)

    env = {
        **os.environ,
        "AD_GEN_SAFE": "1",
        "MEDIA_OUTPUT_DIR": str(concept_dir),
        "SKIP_SLACK_UPLOAD": "1",
    }

    try:
        result = subprocess.run(
            cmd, env=env, timeout=900,
            capture_output=True, text=True,
        )
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Generation timed out (15 min limit)"}

    if result.returncode != 0:
        stderr_tail = result.stderr[-300:] if result.stderr else ""
        return {"success": False, "error": f"Generation failed (exit {result.returncode}): {stderr_tail}"}

    # Read manifest to verify success
    manifest_path = concept_dir / "manifest.json"
    succeeded = 0
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text())
            succeeded = manifest.get("succeeded", 0)
        except (json.JSONDecodeError, OSError):
            pass

    if succeeded == 0:
        return {"success": False, "error": "No images succeeded (check manifest.json)"}

    # Post-generation: Drive upload
    drive_url = ""
    uploader = _script_dir.parent.parent / "nano-banana-pro" / "scripts" / "upload_creatives_to_drive.py"
    if uploader.exists():
        upload_args = [
            "uv", "run", str(uploader),
            "--concept-dir", str(concept_dir),
            "--category", "clone",
            "--concept-name", concept_name,
            "--prompt", gen_prompt[:500],
        ]
        competitor_ref = plan_data.get("competitor_ref")
        if competitor_ref:
            upload_args.extend(["--competitor-ref-json", json.dumps(competitor_ref)])
        try:
            upload_result = subprocess.run(
                upload_args, capture_output=True, text=True, timeout=120,
            )
            if upload_result.returncode == 0 and upload_result.stdout.strip():
                drive_url = upload_result.stdout.strip()
        except Exception:
            pass

    # Post to Slack: upload 1:1 square image with Drive link
    square_imgs = list(concept_dir.glob("*-1x1.png"))
    if square_imgs:
        comment = f":art: *{concept_name}*"
        if drive_url:
            comment += f"\n:file_folder: <{drive_url}|View all sizes on Drive>"
        _slack_upload_file(square_imgs[0], f"{concept_name} — 1:1 (Square)", comment)

    # Write reference.json + brief.json
    competitor_ref = plan_data.get("competitor_ref", {})
    reference = {
        "competitor_brand": competitor_ref.get("brand", ""),
        "competitor_ad_rank": competitor_ref.get("rank", ""),
        "asset_hash": competitor_ref.get("asset_hash", ""),
        "source_image": images.get("source_ad", ""),
        "session_id": plan_data.get("session_id", ""),
    }
    (concept_dir / "reference.json").write_text(json.dumps(reference, indent=2))

    plan_export = {k: v for k, v in plan_data.items()
                   if k not in ("generation_prompt",)}
    (concept_dir / "brief.json").write_text(json.dumps(plan_export, indent=2))

    # Create media symlinks
    for img in concept_dir.glob("*.png"):
        link_target = profile_root / "media" / img.name
        try:
            link_target.unlink(missing_ok=True)
            link_target.symlink_to(img)
        except OSError:
            pass

    return {
        "success": True,
        "concept_dir": str(concept_dir),
        "drive_url": drive_url,
        "images_generated": succeeded,
    }


def cmd_execute(args) -> None:
    """Read plan file and run image generation synchronously."""
    # Safe wrapper gate — must be called through clone_safe.sh
    if not os.environ.get("CLONE_SAFE"):
        print("ERROR: clone_competitor.py execute must be called through clone_safe.sh.")
        print(f"  Use: bash clone_safe.sh execute --session {args.session} --index {args.index}")
        sys.exit(1)

    data = _session_load(args.session)
    idx = args.index

    if idx < 0 or idx >= data["total_ads"]:
        print(f"ERROR: Index {idx} out of range (0-{data['total_ads'] - 1})")
        sys.exit(1)

    # Find plan file
    plan_file = _sessions_dir() / f"plan-{data['session_id']}-ad{idx}.json"
    if not plan_file.exists():
        print(f"ERROR: No plan file found for ad {idx}.")
        print(f"  Run plan first: clone_competitor.py plan --session {args.session} --index {idx}")
        sys.exit(1)

    plan_data = json.loads(plan_file.read_text())

    # Validate plan TTL (30 minutes)
    try:
        created = datetime.datetime.fromisoformat(plan_data["created"].rstrip("Z"))
        age = (datetime.datetime.utcnow() - created).total_seconds()
    except (KeyError, ValueError):
        age = 0
    if age > _PLAN_TTL:
        print(f"ERROR: Plan expired ({int(age)}s old, max {_PLAN_TTL}s).")
        print(f"  Re-run: clone_competitor.py plan --session {args.session} --index {idx}")
        sys.exit(1)

    # Validate all image files still exist on disk
    images = plan_data.get("images", {})
    for role, path in images.items():
        if not pathlib.Path(path).exists():
            print(f"ERROR: {role} image no longer exists: {path}")
            sys.exit(1)

    # Validate Slack env vars
    channel = os.environ.get("SLACK_CHANNEL_ID", "")
    thread_ts = os.environ.get("SLACK_THREAD_TS", "")
    if not channel or not thread_ts:
        print("ERROR: SLACK_CHANNEL_ID and SLACK_THREAD_TS must be set.")
        sys.exit(1)

    # Guard: prevent double-launch (--force allows retry after failure)
    if data["ads"][idx].get("generate_launched"):
        if getattr(args, "force", False):
            data["ads"][idx]["generate_launched"] = False
            data["ads"][idx]["generate_done"] = False
            data["ads"][idx]["concept_dir"] = ""
            _session_save(args.session, data)
            print(f"Force-reset: cleared previous generation state for ad {idx}.")
        else:
            print(f"WARNING: Generation already launched for ad {idx}.")
            print(f"  Run session-status to check if it completed or failed.")
            print(f"  To retry: clone_competitor.py execute --session {args.session} --index {idx} --force")
            sys.exit(1)

    concept_name = plan_data["concept_name"]
    print(f"Executing generation for ad {idx} ({concept_name})...")
    print(f"  Product:  {plan_data['product']}")
    print(f"  Headline: {plan_data.get('headline', 'N/A')}")
    print(f"  Images:   {len(images)} reference image(s)")
    print()

    _enable_slack_for_interactive()
    _slack_progress(f":art: Generating clone ad — _{concept_name}_...")

    # Mark as launched before running (in case of crash)
    data["ads"][idx]["generate_launched"] = True
    data["ads"][idx]["concept_dir"] = plan_data["concept_dir"]
    _session_save(args.session, data)

    # Run generation synchronously
    result = _run_clone_generation(plan_data)

    if result["success"]:
        data["ads"][idx]["generate_done"] = True
        _session_save(args.session, data)

        # Archive plan file
        completed_dir = _sessions_dir() / "completed"
        completed_dir.mkdir(exist_ok=True, mode=0o700)
        try:
            plan_file.rename(completed_dir / plan_file.name)
        except OSError:
            pass

        print(f"Generation complete!")
        print(f"  Images generated: {result['images_generated']}")
        print(f"  Concept dir: {result['concept_dir']}")
        if result.get("drive_url"):
            print(f"  Drive: {result['drive_url']}")

        _slack_progress(
            f":white_check_mark: Clone _{concept_name}_ complete — "
            f"{result['images_generated']} image(s) generated"
        )
    else:
        print(f"ERROR: {result.get('error', 'Unknown error')}")
        _slack_progress(f":x: Clone _{concept_name}_ failed — {result.get('error', 'unknown')[:100]}")

    # Determine next step
    next_idx = idx + 1
    if next_idx < data["total_ads"]:
        print()
        if result["success"]:
            print(f"NEXT STEP: Show the next ad:")
            print(f"  clone_safe.sh show-ad --session {args.session} --index {next_idx}")
        else:
            print(f"To retry: clone_competitor.py execute --session {args.session} --index {idx} --force")
    else:
        print()
        print(f"All {data['total_ads']} ads processed!")
        print(f"Run session-status to check progress:")
        print(f"  clone_safe.sh session-status --session {args.session}")


def cmd_skip(args) -> None:
    """Skip the current ad and move to the next one."""
    data = _session_load(args.session)
    idx = args.index

    if idx < 0 or idx >= data["total_ads"]:
        print(f"ERROR: Index {idx} out of range (0-{data['total_ads'] - 1})")
        sys.exit(1)

    data["ads"][idx]["skipped"] = True
    _session_save(args.session, data)

    print(f"Ad {idx} (rank #{data['ads'][idx]['rank']}, {data['ads'][idx]['asset_hash'][:8]}) skipped.")

    # Determine next step
    next_idx = idx + 1
    if next_idx < data["total_ads"]:
        print()
        print(f"NEXT STEP: Show the next ad:")
        print(f"  clone_safe.sh show-ad --session {args.session} --index {next_idx}")
    else:
        print()
        print(f"All ads processed. Check session status:")
        print(f"  clone_safe.sh session-status --session {args.session}")


def cmd_skip_all(args) -> None:
    """Skip all remaining unprocessed ads in the session."""
    data = _session_load(args.session)

    skipped_count = 0
    for ad in data["ads"]:
        if not ad.get("generate_done") and not ad.get("skipped"):
            ad["skipped"] = True
            skipped_count += 1

    _session_save(args.session, data)

    if skipped_count == 0:
        print("No remaining ads to skip — all ads already generated or skipped.")
    else:
        print(f"Skipped {skipped_count} remaining ads. Session complete.")

    print()
    print(f"NEXT STEP: Review session summary:")
    print(f"  clone_safe.sh session-status --session {args.session}")


def cmd_session_status(args) -> None:
    """Show per-ad completion status with live generation verification."""
    data = _session_load(args.session)
    dirty = False  # Track if we need to save updated state

    print(f"Session: {data['session_id']}")
    print(f"Brand: {data['brand_display']} | Type: {data['clone_type']}")
    print(f"Created: {data['created']}")
    print(f"Total ads: {data['total_ads']}")
    print()
    print("Step Completion:")
    for ad in data["ads"]:
        idx = ad["index"]

        # Handle skipped ads
        if ad.get("skipped"):
            product_label = f" — {ad['product_confirmed']}" if ad.get("product_confirmed") else ""
            print(f"  Ad {idx} (rank #{ad['rank']}, {ad['asset_hash'][:8]}{product_label}):")
            print(f"    [SKIPPED]")
            continue

        # Verify generation status for launched-but-not-done ads
        gen_status = ""
        if ad.get("generate_launched") and not ad.get("generate_done"):
            pid = ad.get("generate_pid")
            cdir = pathlib.Path(ad.get("concept_dir", ""))
            if pid:
                try:
                    os.kill(pid, 0)  # signal 0 = existence check
                    gen_status = " (running)"
                except OSError:
                    # Process exited — check concept_dir for output
                    if cdir.exists() and list(cdir.glob("*.png")):
                        ad["generate_done"] = True
                        dirty = True
                        gen_status = " (completed)"
                    else:
                        gen_status = " (FAILED — check log)"

        checks = {
            "show": ad.get("show_done", False),
            "product": ad.get("product_done", False),
            "copy_gen": ad.get("copy_gen_done", False),
            "copy": ad.get("copy_done", False),
            "generate": ad.get("generate_done", False),
        }
        product_label = f" — {ad['product_confirmed']}" if ad.get("product_confirmed") else ""
        print(f"  Ad {idx} (rank #{ad['rank']}, {ad['asset_hash'][:8]}{product_label}):")
        print(f"    [{'\u2713' if checks['show'] else ' '}] show  "
              f"[{'\u2713' if checks['product'] else ' '}] product  "
              f"[{'\u2713' if checks['copy_gen'] else ' '}] copy-gen  "
              f"[{'\u2713' if checks['copy'] else ' '}] set-copy  "
              f"[{'\u2713' if checks['generate'] else ' '}] plan+execute{gen_status}")

        # Show log path for failed generations
        if gen_status == " (FAILED — check log)" and ad.get("generate_log"):
            print(f"      Log: {ad['generate_log']}")

    if dirty:
        _session_save(args.session, data)


def cmd_list_sessions(args) -> None:
    """List active clone sessions."""
    sdir = _sessions_dir()
    sessions = sorted(sdir.glob("cln-*.json"), key=lambda f: f.stat().st_mtime, reverse=True)

    if not sessions:
        print("No active clone sessions.")
        return

    print(f"Active clone sessions ({len(sessions)}):\n")
    now = time.time()
    for sf in sessions[:10]:
        try:
            data = json.loads(sf.read_text())
            age_min = int((now - sf.stat().st_mtime) / 60)
            expired = age_min > (_SESSION_TTL // 60)
            status = "EXPIRED" if expired else "active"
            done = sum(1 for ad in data.get("ads", []) if ad.get("generate_done"))
            total = data.get("total_ads", 0)
            print(f"  {data['session_id']} | {data.get('brand_display', '?')} | "
                  f"{done}/{total} done | {age_min}m ago | {status}")
        except (json.JSONDecodeError, OSError, KeyError):
            print(f"  {sf.stem} | [corrupt]")


# ---------------------------------------------------------------------------
# Main pipeline (batch mode — original functionality)
# ---------------------------------------------------------------------------

def main_batch(args):
    """Original batch pipeline logic."""

    global _slack_enabled
    _slack_enabled = args.slack

    if _slack_enabled:
        type_label = {"statics": "static ads", "videos": "video ads", "both": "ads"}.get(args.clone_type, "ads")
        count_label = f"top {args.top}" if not args.assets else f"{len(args.assets.split(','))} specific"
        _slack_progress(f":hourglass_flowing_sand: *Starting clone pipeline for {args.brand} ({count_label} {type_label})...*\nThis typically takes 2-3 minutes per ad. I'll update you as each step completes.")

    # ---------------------------------------------------------------------------
    # Brand catalog health check & auto-import
    # ---------------------------------------------------------------------------
    if (args.check_catalog or args.auto_import) and BrandAssetStore is not None:
        store = None
        try:
            store = BrandAssetStore()
            health = store.catalog_health_check()
            if health["warnings"]:
                print("[catalog] Health check warnings:")
                for w in health["warnings"]:
                    print(f"  [WARN] {w}")
            else:
                print(f"[catalog] Healthy — {health['asset_count']} assets, "
                      f"{health['product_count']} products")

            # Auto-import if catalog is empty and product-images.json exists
            if args.auto_import and health["asset_count"] == 0:
                profile_root = _script_dir.parent.parent.parent
                json_path = profile_root / "workspace" / "brand" / "product-images.json"
                pi_dir = profile_root / "workspace" / "brand" / "product-images"
                if json_path.exists():
                    print(f"[auto-import] Importing from {json_path}...")
                    result = store.import_from_product_images_json(json_path, auto_analyze=False)
                    print(f"[auto-import] {result['imported']} images, {result['products_saved']} products imported")
                elif pi_dir.is_dir():
                    for subdir in sorted(pi_dir.iterdir()):
                        if subdir.is_dir():
                            print(f"[auto-import] Importing from {subdir.name}/...")
                            store.import_from_local_directory(subdir, auto_analyze=False)
        except Exception as e:
            print(f"[catalog] Health check failed: {e}")
        finally:
            if store is not None:
                store.close()

    # Load brand design context (colors, design rules, logo)
    design_context, logo_path = _load_brand_design_context()
    if design_context:
        print(f"[brand] Loaded design context ({len(design_context)} chars)")
    if logo_path:
        print(f"[brand] Logo: {pathlib.Path(logo_path).name}")

    # Load catalog
    workspace_root = detect_workspace_root()
    competitors_dir = workspace_root / "brand" / "competitors"
    catalog = load_catalog(competitors_dir)

    brand = catalog["brands"].get(args.brand)
    if not brand:
        print(f"[error] Brand '{args.brand}' not found in catalog.")
        available = list(catalog["brands"].keys())
        if available:
            print(f"  Available: {', '.join(available)}")
        sys.exit(1)

    brand_display = brand.get("display_name", args.brand)

    # Load brand context for product-match awareness
    brand_context, products_summary = _load_brand_context()

    # Load competitor products (if cataloged)
    competitor_products: list[dict] = []
    if BrandAssetStore is not None:
        store = None
        try:
            store = BrandAssetStore()
            competitor_products = store.list_products_detailed(brand=args.brand)
            if competitor_products:
                print(f"[products] Loaded {len(competitor_products)} competitor products for {args.brand}")
        except Exception as e:
            print(f"[warn] Competitor product lookup failed: {e}")
        finally:
            if store is not None:
                store.close()

    # Select assets
    all_brand_assets = {
        h: a for h, a in catalog["assets"].items()
        if a.get("brand") == args.brand
    }

    if args.assets:
        # Specific assets
        target_hashes = [h.strip() for h in args.assets.split(",")]
        selected = []
        for h in target_hashes:
            # Allow partial hash matching
            matches = [ah for ah in all_brand_assets if ah.startswith(h)]
            if matches:
                selected.append((matches[0], all_brand_assets[matches[0]]))
            else:
                print(f"[warn] Asset {h} not found")
    else:
        # Top N by rank, filtered by type
        # Deduplicate: multiple scans produce duplicate entries for the same ad
        # at the same rank. Keep only one entry per rank (prefer content_hash,
        # then most recent first_seen).
        def _dedup_by_rank(assets: list[tuple[str, dict]]) -> list[tuple[str, dict]]:
            """Deduplicate asset list so each rank appears only once."""
            by_rank: dict[int, list[tuple[str, dict]]] = {}
            for h, a in assets:
                r = a.get("current_rank", 999)
                by_rank.setdefault(r, []).append((h, a))
            deduped = []
            for r in sorted(by_rank):
                candidates = by_rank[r]
                # Prefer entry with content_hash, then latest first_seen
                candidates.sort(key=lambda x: (
                    0 if x[1].get("content_hash") else 1,
                    x[1].get("first_seen", ""),
                ), reverse=False)
                # Pick the one with content_hash (sorted first) or last by date
                best = candidates[0] if candidates[0][1].get("content_hash") else candidates[-1]
                deduped.append(best)
            return deduped

        if args.clone_type == "both":
            # Select top N images AND top N videos independently
            images = [(h, a) for h, a in all_brand_assets.items() if a.get("type") == "image"]
            videos = [(h, a) for h, a in all_brand_assets.items() if a.get("type") == "video"]
            images.sort(key=lambda x: x[1].get("current_rank", 999))
            videos.sort(key=lambda x: x[1].get("current_rank", 999))
            images = _dedup_by_rank(images)
            videos = _dedup_by_rank(videos)
            selected = images[:args.top] + videos[:args.top]
        else:
            media_type = "image" if args.clone_type == "statics" else "video"
            typed_assets = [
                (h, a) for h, a in all_brand_assets.items()
                if a.get("type") == media_type
            ]
            typed_assets.sort(key=lambda x: x[1].get("current_rank", 999))
            typed_assets = _dedup_by_rank(typed_assets)
            selected = typed_assets[:args.top]

    if not selected:
        print(f"[done] No {args.clone_type} assets found for {args.brand}")
        sys.exit(0)

    # Determine which types we're processing
    types_to_process = []
    if args.clone_type == "both":
        has_images = any(a.get("type") == "image" for _, a in selected)
        has_videos = any(a.get("type") == "video" for _, a in selected)
        if has_images:
            types_to_process.append("statics")
        if has_videos:
            types_to_process.append("videos")
    else:
        types_to_process.append(args.clone_type)

    print(f"[clone] Generating clone briefs for {brand_display}: "
          f"{len(selected)} assets ({', '.join(types_to_process)})")
    _slack_progress(f":art: *Cloning {len(selected)} ads from {brand_display}...*")

    # Init Gemini
    from google import genai
    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0013158607")
    client = genai.Client(vertexai=True, project=project, location="global")

    # Generate briefs
    briefs: list[dict] = []
    skipped_no_analysis = 0
    total_selected = len(selected)
    for brief_idx, (h, asset) in enumerate(selected, 1):
        rank = asset.get("current_rank", asset.get("rank", "?"))
        asset_type = asset.get("type", "image")
        current_clone_type = "statics" if asset_type == "image" else "videos"
        print(f"\n[{rank}] Generating {current_clone_type} brief for {asset_type} {h[:8]}...")
        _slack_progress(f":brain: Analyzing ad {brief_idx}/{total_selected} (rank #{rank})...")

        # Load cached analysis
        analysis = load_cached_analysis(competitors_dir, asset)
        if not analysis:
            print(f"  [skip] No cached analysis for {h[:8]} — run analyze_competitor.py first")
            skipped_no_analysis += 1
            continue

        # Match brand assets for static briefs (if not disabled)
        matched_assets = {}
        if current_clone_type == "statics" and not args.no_match:
            matched_assets = match_brand_assets(analysis)
            if matched_assets:
                total_matched = sum(len(v) for v in matched_assets.values())
                print(f"  [match] Found {total_matched} brand assets across {len(matched_assets)} role(s)")

        try:
            if current_clone_type == "statics":
                brief = generate_static_brief(
                    client, analysis, args.model,
                    brand_context=brand_context,
                    products_summary=products_summary,
                    brand_assets=matched_assets if matched_assets else None,
                    competitor_products=competitor_products if competitor_products else None,
                    design_context=design_context,
                )
            else:
                brief = generate_video_brief(
                    client, analysis, args.model,
                    brand_context=brand_context,
                    products_summary=products_summary,
                    competitor_products=competitor_products if competitor_products else None,
                )

            brief["reference_rank"] = rank
            brief["asset_hash"] = h
            brief["_clone_type"] = current_clone_type  # Track type for mixed batches
            # Carry source competitor ad's Drive file ID for linking in Slack
            source_drive_id = asset.get("drive_file_id")
            if source_drive_id:
                brief["_source_drive_id"] = source_drive_id
            briefs.append(brief)
            print(f"  [done] Brief generated")
        except Exception as e:
            print(f"  [error] Brief generation failed: {e}")

    if not briefs:
        if skipped_no_analysis > 0:
            print(f"\nERROR: {skipped_no_analysis}/{total_selected} ads skipped — no cached analysis found.")
            print("The competitor ads must be analyzed before cloning.")
            print("Run analyze_competitor.py for this brand first:")
            print(f"  uv run analyze_competitor.py '<AD_LIBRARY_URL>' --limit {total_selected} --slack")
            sys.exit(1)
        print("[done] No briefs generated.")
        sys.exit(0)

    # ---------------------------------------------------------------------------
    # Save to Drive
    # ---------------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("Saving clone briefs")
    print("=" * 60)
    _slack_progress(f":white_check_mark: {len(briefs)}/{total_selected} briefs generated. Saving to Drive...")

    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    batch_name = f"{date_str}_{args.clone_type}"
    drive_url = None

    # Save locally
    clone_dir = competitors_dir / args.brand / "clones" / batch_name
    clone_dir.mkdir(parents=True, exist_ok=True)

    for brief in briefs:
        h = brief.get("asset_hash", "unknown")
        brief_path = clone_dir / f"{h[:8]}_brief.json"
        with open(brief_path, "w") as f:
            json.dump(brief, f, indent=2)
        print(f"  [saved] {brief_path.name}")

    # Upload to Drive
    drive_svc = _drive_service()
    if drive_svc and brand.get("drive_clones_folder_id"):
        clones_folder = brand["drive_clones_folder_id"]
        batch_folder = _drive_find_or_create_folder(drive_svc, batch_name, clones_folder)

        for brief in briefs:
            h = brief.get("asset_hash", "unknown")
            brief_path = clone_dir / f"{h[:8]}_brief.json"
            try:
                file_id = _drive_upload_file(drive_svc, brief_path, batch_folder)
                brief["_drive_brief_id"] = file_id
                print(f"  [drive] Uploaded {brief_path.name}")
            except Exception as e:
                print(f"  [drive] Upload failed: {e}")

        # For video briefs, also create Google Docs
        video_briefs = [b for b in briefs if b.get("_clone_type") == "videos"]
        for brief in video_briefs:
            rank = brief.get("reference_rank", "?")
            h = brief.get("asset_hash", "unknown")
            md_content = video_brief_to_markdown(brief, brand_display, rank)
            doc_title = f"{brand_display} Clone Script — #{rank} ({date_str})"
            doc_result = create_google_doc(md_content, doc_title)
            if doc_result:
                brief["doc_url"] = doc_result["doc_url"]
                print(f"  [doc] Created: {doc_result['doc_url']}")

        drive_url = f"https://drive.google.com/drive/folders/{batch_folder}"
        _slack_progress(f":white_check_mark: All briefs saved \u2014 <{drive_url}|Google Drive>")

    # Update catalog — re-load before saving to avoid overwriting concurrent changes
    # (batch mode holds catalog in memory for 10+ minutes during brief generation)
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"
    fresh_catalog = load_catalog(competitors_dir)
    for brief in briefs:
        h = brief.get("asset_hash")
        ct = brief.get("_clone_type", args.clone_type)
        if h and h in fresh_catalog["assets"]:
            fresh_catalog["assets"][h].setdefault("clones", []).append({
                "clone_id": f"{batch_name}_{h[:8]}",
                "type": ct,
                "created_at": now_iso,
                "drive_file_id": None,
                "agent": "designer" if ct == "statics" else "video-editor",
                "batch": batch_name,
            })
    save_catalog(fresh_catalog, competitors_dir)

    # Persist clones to CI Store
    ci = None
    try:
        ci = CIStore(enable_chroma=False)
        for brief in briefs:
            h = brief.get("asset_hash")
            ct = brief.get("_clone_type", args.clone_type)
            if h:
                ci.save_clone(
                    asset_hash=h,
                    clone_type=ct,
                    brief=brief,
                    batch_name=batch_name,
                    agent="designer" if ct == "statics" else "video-editor",
                    doc_url=brief.get("doc_url"),
                    brand_dir=args.brand,
                )
    except Exception as e:
        print(f"[ci_store] Warning: failed to persist clones: {e}")
    finally:
        if ci is not None:
            ci.close()

    # ---------------------------------------------------------------------------
    # Delegation payloads
    # ---------------------------------------------------------------------------
    if args.delegate:
        channel = os.environ.get("SLACK_CHANNEL_ID", "")
        thread_ts = os.environ.get("SLACK_THREAD_TS", "")

        print("\n" + "=" * 60)
        print("Delegation Payloads")
        print("=" * 60)

        delegations = []
        for brief in briefs:
            h = brief.get("asset_hash", "")
            ct = brief.get("_clone_type", args.clone_type)
            if ct == "statics":
                payload = build_static_delegation(
                    brief, h, channel, thread_ts,
                    brand_context=design_context, logo_path=logo_path,
                )
            else:
                doc_url = brief.get("doc_url")
                payload = build_video_delegation(brief, h, doc_url, channel, thread_ts)
            delegations.append(payload)

        print(json.dumps(delegations, indent=2))

    # ---------------------------------------------------------------------------
    # Slack summary
    # ---------------------------------------------------------------------------
    if args.slack:
        # For mixed batches, post separate summaries per type
        static_briefs = [b for b in briefs if b.get("_clone_type") == "statics"]
        video_briefs = [b for b in briefs if b.get("_clone_type") == "videos"]
        if args.clone_type == "both":
            if static_briefs:
                post_clone_summary_to_slack(brand_display, static_briefs, "statics", drive_url)
            if video_briefs:
                post_clone_summary_to_slack(brand_display, video_briefs, "videos", drive_url)
        else:
            post_clone_summary_to_slack(brand_display, briefs, args.clone_type, drive_url)

    # ---------------------------------------------------------------------------
    # Execute mode — sequential image generation via _run_clone_generation
    # ---------------------------------------------------------------------------
    if args.execute:
        static_briefs_exec = [b for b in briefs if b.get("_clone_type") == "statics"]
        if static_briefs_exec:
            # Pre-resolve product images: if briefs lack product_images but the
            # products table has hero_image_url values, download them as fallbacks.
            _fallback_product_images: list[str] = []
            has_any_images = any(brief.get("product_images") for brief in static_briefs_exec)
            if not has_any_images and BrandAssetStore is not None:
                store = None
                try:
                    store = BrandAssetStore()
                    product_shots = store.find_by_type("product-shot", limit=3)
                    if product_shots:
                        for ps in product_shots:
                            p = store.absolute_path(ps)
                            if p.exists():
                                _fallback_product_images.append(str(p))
                    else:
                        own_products = store.list_products_detailed(brand="ours")
                        for prod in own_products[:3]:
                            hero_url = prod.get("hero_image_url")
                            if not hero_url:
                                continue
                            slug = prod["product_id"]
                            ext = pathlib.Path(hero_url).suffix or ".jpg"
                            if len(ext) > 5:
                                ext = ".jpg"
                            dest = store.images_dir / "crawled" / f"{slug}{ext}"
                            if dest.exists():
                                _fallback_product_images.append(str(dest))
                            else:
                                try:
                                    req = urllib.request.Request(hero_url, headers={
                                        "User-Agent": "Mozilla/5.0"
                                    })
                                    with urllib.request.urlopen(req, timeout=30) as resp:
                                        dl_data = resp.read()
                                        if len(dl_data) > 500:
                                            dest.parent.mkdir(parents=True, exist_ok=True)
                                            dest.write_bytes(dl_data)
                                            _fallback_product_images.append(str(dest))
                                            print(f"  [fallback] Downloaded product image: {dest.name}")
                                except Exception:
                                    pass
                except Exception as e:
                    print(f"  [fallback] Product image lookup failed: {e}")
                finally:
                    if store is not None:
                        store.close()

            if _fallback_product_images:
                print(f"[execute] Using {len(_fallback_product_images)} fallback product images")

            _slack_progress(f":art: *Generating {len(static_briefs_exec)} clone ads (3 ratios each)...*")

            success_count = 0
            fail_count = 0
            for i, brief in enumerate(static_briefs_exec, 1):
                concept = _sanitize_concept_name(brief.get("concept_name", brief.get("asset_hash", "")[:8]))
                print(f"[execute] Clone {i}/{len(static_briefs_exec)} — generating {concept}...")
                _slack_progress(f":paintbrush: Generating clone {i}/{len(static_briefs_exec)} — _{concept}_...")

                # Resolve images for plan_data
                asset_hash = brief.get("asset_hash", "")
                source_image = _resolve_source_image(competitors_dir, catalog, asset_hash)
                rank_label = brief.get("reference_rank", "?")

                images: dict[str, str] = {}
                if source_image and pathlib.Path(source_image).exists():
                    images["source_ad"] = source_image

                # Product images from brief or fallback
                brief_images = brief.get("product_images", [])
                product_added = False
                for pi in brief_images:
                    pi_path = pi.get("path", "")
                    if pi_path and pathlib.Path(pi_path).exists():
                        images["product"] = pi_path
                        product_added = True
                        break
                if not product_added and _fallback_product_images:
                    images["product"] = _fallback_product_images[0]

                if logo_path and pathlib.Path(logo_path).exists():
                    images["logo"] = logo_path

                # Enrich prompt with text overlays
                gen_prompt = brief.get("prompt", "")
                text_overlays = brief.get("text_overlays", [])
                if text_overlays:
                    overlay_text = "\n".join(f"  - {t}" for t in text_overlays[:5])
                    gen_prompt += (
                        f"\n\nIMPORTANT: Render the following text ON the image:\n"
                        f"{overlay_text}"
                    )

                concept_dir_str = str(workspace_root / "brand" / "creatives" / "clone" / f"{date_str}-clone-{concept}")

                # Build plan_data for _run_clone_generation
                plan_data = {
                    "concept_name": f"clone-{concept}",
                    "concept_dir": concept_dir_str,
                    "generation_prompt": gen_prompt,
                    "images": images,
                    "competitor_ref": {
                        "brand": brand_display,
                        "rank": rank_label,
                        "asset_hash": asset_hash[:10] if asset_hash else "",
                    },
                    "session_id": f"batch-{batch_name}",
                }

                # Upload source ad image to Slack before generating
                if source_image and _slack_enabled:
                    _slack_upload_file(
                        source_image,
                        title=f"{brand_display} — Rank #{rank_label}",
                        comment=f":mag: *Cloning from:* {brand_display} — Rank #{rank_label}",
                    )

                result = _run_clone_generation(plan_data)
                if result["success"]:
                    success_count += 1
                else:
                    fail_count += 1
                    print(f"  [error] {result.get('error', 'unknown')[:200]}")

            _slack_progress(
                f":tada: *Clone batch complete — {success_count}/{len(static_briefs_exec)} "
                f"ads generated ({success_count * 3} images)*\n"
                f":file_folder: All clones organized in workspace/brand/creatives/clone/"
            )
            print(f"\n[execute] Generated {success_count}/{len(static_briefs_exec)} ads ({success_count * 3} images)")

    static_count = len([b for b in briefs if b.get("_clone_type") == "statics"])
    video_count = len([b for b in briefs if b.get("_clone_type") == "videos"])
    type_summary = []
    if static_count:
        type_summary.append(f"{static_count} static")
    if video_count:
        type_summary.append(f"{video_count} video")
    print(f"\n[done] Generated {' + '.join(type_summary)} clone briefs for {brand_display}")


def main():
    parser = argparse.ArgumentParser(
        description="Clone competitor ads — interactive sessions or batch mode",
    )
    subparsers = parser.add_subparsers(dest="command")

    # --- Interactive session subcommands ---

    # init
    p_init = subparsers.add_parser("init", help="Create interactive clone session")
    p_init.add_argument("--brand", required=True, help="Brand directory name in catalog")
    p_init.add_argument("--top", type=int, default=5, help="Clone top N assets by rank")
    p_init.add_argument("--type", dest="clone_type", choices=["statics", "videos"],
                        default="statics", help="Type of clone (default: statics)")
    p_init.add_argument("--assets", help="Comma-separated asset hashes (overrides --top)")
    p_init.add_argument("--no-match", action="store_true", help="Disable brand asset matching")
    p_init.set_defaults(func=cmd_init)

    # show-ad
    p_show = subparsers.add_parser("show-ad", help="Display competitor ad + analysis")
    p_show.add_argument("--session", required=True, help="Session ID")
    p_show.add_argument("--index", type=int, required=True, help="Ad index (0-based)")
    p_show.set_defaults(func=cmd_show_ad)

    # set-product
    p_prod = subparsers.add_parser("set-product", help="Confirm product for ad")
    p_prod.add_argument("--session", required=True, help="Session ID")
    p_prod.add_argument("--index", type=int, required=True, help="Ad index")
    p_prod.add_argument("--product", required=True, help="Confirmed product name")
    p_prod.set_defaults(func=cmd_set_product)

    # copy-gen
    p_copy = subparsers.add_parser("copy-gen", help="Generate copy variations via LLM")
    p_copy.add_argument("--session", required=True, help="Session ID")
    p_copy.add_argument("--index", type=int, required=True, help="Ad index")
    p_copy.add_argument("--count", type=int, default=3, help="Number of variations (default: 3)")
    p_copy.set_defaults(func=cmd_copy_gen)

    # set-copy
    p_setcopy = subparsers.add_parser("set-copy", help="Record copy selection")
    p_setcopy.add_argument("--session", required=True, help="Session ID")
    p_setcopy.add_argument("--index", type=int, required=True, help="Ad index")
    p_setcopy.add_argument("--choice", required=True, help="1, 2, 3, or 'custom'")
    p_setcopy.add_argument("--custom-headline", default="", help="Custom headline (with --choice custom)")
    p_setcopy.add_argument("--custom-secondary", default="", help="Custom secondary text")
    p_setcopy.add_argument("--custom-cta", default="", help="Custom CTA text")
    p_setcopy.set_defaults(func=cmd_set_copy)

    # plan (two-phase: step 1)
    p_plan = subparsers.add_parser("plan", help="Validate all steps + write generation plan")
    p_plan.add_argument("--session", required=True, help="Session ID")
    p_plan.add_argument("--index", type=int, required=True, help="Ad index")
    p_plan.set_defaults(func=cmd_plan)

    # execute (two-phase: step 2)
    p_exec = subparsers.add_parser("execute", help="Read plan + run image generation (synchronous, ~5-10 min)")
    p_exec.add_argument("--session", required=True, help="Session ID")
    p_exec.add_argument("--index", type=int, required=True, help="Ad index")
    p_exec.add_argument("--force", action="store_true", help="Retry after failed generation (resets launch state)")
    p_exec.set_defaults(func=cmd_execute)

    # generate (deprecated — redirects to plan + execute)
    p_gen = subparsers.add_parser("generate", help="[DEPRECATED] Use 'plan' + 'execute' instead")
    p_gen.add_argument("--session", required=True, help="Session ID")
    p_gen.add_argument("--index", type=int, required=True, help="Ad index")
    p_gen.add_argument("--force", action="store_true", help="(deprecated)")
    p_gen.set_defaults(func=cmd_generate)

    # skip
    p_skip = subparsers.add_parser("skip", help="Skip an ad and move to the next one")
    p_skip.add_argument("--session", required=True, help="Session ID")
    p_skip.add_argument("--index", type=int, required=True, help="Ad index to skip")
    p_skip.set_defaults(func=cmd_skip)

    # skip-all
    p_skip_all = subparsers.add_parser("skip-all", help="Skip all remaining unprocessed ads")
    p_skip_all.add_argument("--session", required=True, help="Session ID")
    p_skip_all.set_defaults(func=cmd_skip_all)

    # session-status
    p_status = subparsers.add_parser("session-status", help="Show session completion status")
    p_status.add_argument("--session", required=True, help="Session ID")
    p_status.set_defaults(func=cmd_session_status)

    # list-sessions
    p_list = subparsers.add_parser("list-sessions", help="List active clone sessions")
    p_list.set_defaults(func=cmd_list_sessions)

    # --- Batch mode (original --brand --execute/--delegate flow) ---
    # If no subcommand is given but --brand is present, run batch mode
    # We add batch args directly to the main parser for backward compat
    parser.add_argument("--brand", help="Brand directory name (batch mode)")
    parser.add_argument("--top", type=int, default=5, help="Clone top N assets")
    parser.add_argument("--type", dest="clone_type", choices=["statics", "videos", "both"],
                        default="both", help="Type of clone briefs (batch mode)")
    parser.add_argument("--assets", help="Comma-separated asset hashes")
    parser.add_argument("--slack", action="store_true", help="Post summary to Slack")
    parser.add_argument("--model", default="gemini-3-pro-preview", help="Model for brief generation")
    parser.add_argument("--delegate", action="store_true", help="Output delegation payloads")
    parser.add_argument("--no-match", action="store_true", help="Disable brand asset matching")
    parser.add_argument("--execute", action="store_true", help="Run image generation sequentially")
    parser.add_argument("--check-catalog", action="store_true", help="Run catalog health check")
    parser.add_argument("--auto-import", action="store_true", help="Auto-import if catalog empty")

    args = parser.parse_args()

    # Route to subcommand or batch mode
    if args.command and hasattr(args, "func"):
        try:
            args.func(args)
        except (ValueError, FileNotFoundError, TimeoutError, PermissionError) as e:
            # Clean error output for session validation failures
            print(f"ERROR: {e}", file=sys.stderr)
            sys.exit(1)
    elif args.brand:
        # Batch mode disabled — redirect to interactive flow
        print("ERROR: Batch mode (--brand without subcommand) is disabled.")
        print("Use the interactive clone workflow instead:")
        print(f"  clone_safe.sh init --brand {args.brand} --top {args.top} --type {getattr(args, 'clone_type', 'statics')}")
        print("  Then follow the NEXT STEP instructions from each command.")
        sys.exit(1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
