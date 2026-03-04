# /// script
# requires-python = ">=3.10"
# dependencies = ["playwright>=1.40.0"]
# ///
"""Product Catalog Scraper.

Scrapes a Shopify (or general) storefront for structured product data using
Playwright. Extracts product name, price, description, image URL, and variants
from JSON-LD, Open Graph tags, or DOM selectors.

Stores results in brand_assets.db (products table) and optionally downloads
hero images into brand_assets for use in clone briefs.

Usage:
    # Own brand
    uv run product_catalog.py --url "https://vitahustle.com" --slack

    # Competitor brand
    uv run product_catalog.py --url "https://kachava.com" --brand Ka_Chava

    # From landing pages captured during ad scans
    uv run product_catalog.py --from-landing-pages --brand Ka_Chava
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import os
import pathlib
import re
import sys
import time
import urllib.request
import urllib.error

_script_dir = pathlib.Path(__file__).resolve().parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))

from brand_asset_store import BrandAssetStore
from ci_store import CIStore
from ad_library_dl import _read_slack_token, _workspace_root, _get_allowed_channels


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _slug_from_url(url: str) -> str:
    """Extract a slug from a product URL path."""
    from urllib.parse import urlparse
    path = urlparse(url).path.rstrip("/")
    # /products/vitahustle-greens -> vitahustle-greens
    slug = path.split("/")[-1] if "/" in path else path
    return re.sub(r"[^a-zA-Z0-9_-]", "", slug) or "unknown"


def _parse_price_cents(price_str: str | None) -> int | None:
    """Parse a price string like '$49.95' to cents (4995)."""
    if not price_str:
        return None
    m = re.search(r"[\d,]+\.?\d*", price_str.replace(",", ""))
    if m:
        try:
            return int(float(m.group()) * 100)
        except ValueError:
            pass
    return None


def _download_image(url: str, dest: pathlib.Path) -> bool:
    """Download an image file. Returns True on success."""
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
            if len(data) < 500:
                return False
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            return True
    except Exception:
        return False


def _guess_ext(url: str) -> str:
    """Guess image extension from URL."""
    from urllib.parse import urlparse
    path = urlparse(url).path.lower()
    for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        if path.endswith(ext):
            return ext
    return ".jpg"


# ---------------------------------------------------------------------------
# Page scraping
# ---------------------------------------------------------------------------

def discover_product_urls(page, base_url: str) -> list[str]:
    """Find product URLs from /collections/all or sitemap."""
    from urllib.parse import urlparse, urljoin
    parsed = urlparse(base_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"

    # Try /collections/all first (Shopify default)
    collections_url = f"{origin}/collections/all"
    print(f"[discover] Trying {collections_url}")

    try:
        page.goto(collections_url, wait_until="networkidle", timeout=30000)
        time.sleep(2)

        links = page.evaluate("""() => {
            const urls = new Set();
            document.querySelectorAll('a[href*="/products/"]').forEach(a => {
                if (a.href && !a.href.includes('#')) urls.add(a.href);
            });
            return [...urls];
        }""")
        if links:
            print(f"[discover] Found {len(links)} product links from /collections/all")
            return links
    except Exception as e:
        print(f"[discover] /collections/all failed: {e}")

    # Fallback: sitemap
    sitemap_url = f"{origin}/sitemap.xml"
    print(f"[discover] Trying sitemap: {sitemap_url}")
    try:
        req = urllib.request.Request(sitemap_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read().decode("utf-8", errors="replace")
        # Extract /products/ URLs from sitemap
        product_urls = re.findall(r"<loc>(https?://[^<]+/products/[^<]+)</loc>", content)
        if not product_urls:
            # Try sitemap index -> product sitemap
            sitemap_refs = re.findall(r"<loc>(https?://[^<]+sitemap_products[^<]*)</loc>", content)
            for ref in sitemap_refs[:1]:
                req2 = urllib.request.Request(ref, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req2, timeout=15) as resp2:
                    content2 = resp2.read().decode("utf-8", errors="replace")
                product_urls = re.findall(r"<loc>(https?://[^<]+/products/[^<]+)</loc>", content2)
        if product_urls:
            print(f"[discover] Found {len(product_urls)} product links from sitemap")
            return product_urls
    except Exception as e:
        print(f"[discover] Sitemap failed: {e}")

    # Last resort: scrape homepage for product links
    print("[discover] Scanning homepage for product links...")
    try:
        page.goto(origin, wait_until="networkidle", timeout=30000)
        time.sleep(2)
        links = page.evaluate("""() => {
            const urls = new Set();
            document.querySelectorAll('a[href*="/products/"]').forEach(a => {
                if (a.href && !a.href.includes('#')) urls.add(a.href);
            });
            return [...urls];
        }""")
        if links:
            print(f"[discover] Found {len(links)} product links from homepage")
            return links
    except Exception:
        pass

    print("[discover] No product URLs found")
    return []


def extract_product_data(page, url: str) -> dict | None:
    """Extract structured product data from a product page.

    Priority: JSON-LD > Open Graph > DOM selectors.
    """
    try:
        page.goto(url, wait_until="networkidle", timeout=30000)
        time.sleep(1)
    except Exception as e:
        print(f"  [error] Failed to load {url}: {e}")
        return None

    product = {"product_url": url, "product_id": _slug_from_url(url)}

    # 1. JSON-LD (Shopify always emits Product schema)
    jsonld_data = page.evaluate("""() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const s of scripts) {
            try {
                const data = JSON.parse(s.textContent);
                if (data['@type'] === 'Product') return data;
                if (Array.isArray(data)) {
                    const p = data.find(d => d['@type'] === 'Product');
                    if (p) return p;
                }
                if (data['@graph']) {
                    const p = data['@graph'].find(d => d['@type'] === 'Product');
                    if (p) return p;
                }
            } catch(e) {}
        }
        return null;
    }""")

    if jsonld_data:
        product["product_name"] = jsonld_data.get("name", "")
        product["description"] = jsonld_data.get("description", "")

        # Price from offers
        offers = jsonld_data.get("offers", {})
        if isinstance(offers, list):
            offers = offers[0] if offers else {}
        price = offers.get("price") or offers.get("lowPrice")
        currency = offers.get("priceCurrency", "USD")
        if price:
            product["price"] = f"${price}" if currency == "USD" else f"{price} {currency}"
            product["price_cents"] = _parse_price_cents(str(price))

        # Image
        img = jsonld_data.get("image")
        if isinstance(img, list):
            img = img[0] if img else None
        elif isinstance(img, dict):
            img = img.get("url") or img.get("contentUrl")
        if img:
            product["hero_image_url"] = img

        # Variants from offers
        if isinstance(jsonld_data.get("offers"), list) and len(jsonld_data["offers"]) > 1:
            variants = []
            for offer in jsonld_data["offers"]:
                v = {"name": offer.get("name", ""), "price": offer.get("price"), "sku": offer.get("sku")}
                variants.append(v)
            product["variants_json"] = json.dumps(variants)

        print(f"  [jsonld] Extracted: {product.get('product_name', '?')}")
        return product

    # 2. Open Graph fallback
    og_data = page.evaluate("""() => {
        const get = (prop) => {
            const el = document.querySelector(`meta[property="${prop}"]`);
            return el ? el.content : null;
        };
        return {
            title: get('og:title'),
            description: get('og:description'),
            image: get('og:image'),
            price: get('product:price:amount') || get('og:price:amount'),
            currency: get('product:price:currency') || get('og:price:currency'),
        };
    }""")

    if og_data and og_data.get("title"):
        product["product_name"] = og_data["title"]
        product["description"] = og_data.get("description", "")
        if og_data.get("price"):
            curr = og_data.get("currency", "USD")
            product["price"] = f"${og_data['price']}" if curr == "USD" else f"{og_data['price']} {curr}"
            product["price_cents"] = _parse_price_cents(og_data["price"])
        if og_data.get("image"):
            product["hero_image_url"] = og_data["image"]
        print(f"  [og] Extracted: {product.get('product_name', '?')}")
        return product

    # 3. DOM fallback
    dom_data = page.evaluate("""() => {
        const title = document.querySelector('h1')?.textContent?.trim() || '';
        const price = document.querySelector('[class*="price"], [data-price]')?.textContent?.trim() || '';
        const desc = document.querySelector('[class*="description"], [data-description]')?.textContent?.trim() || '';
        const img = document.querySelector('[class*="product"] img, [data-product-image] img')?.src || '';
        return { title, price, desc, img };
    }""")

    if dom_data and dom_data.get("title"):
        product["product_name"] = dom_data["title"]
        product["description"] = dom_data.get("desc", "")[:500]
        if dom_data.get("price"):
            product["price"] = dom_data["price"]
            product["price_cents"] = _parse_price_cents(dom_data["price"])
        if dom_data.get("img"):
            product["hero_image_url"] = dom_data["img"]
        print(f"  [dom] Extracted: {product.get('product_name', '?')}")
        return product

    print(f"  [skip] Could not extract product data from {url}")
    return None


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Product Catalog Scraper")
    parser.add_argument("--url", help="Storefront URL to scrape (e.g., https://vitahustle.com)")
    parser.add_argument("--brand", default="ours",
                        help="Brand identifier: 'ours' (default) or competitor dir name")
    parser.add_argument("--limit", type=int, default=50,
                        help="Max products to scrape (default: 50)")
    parser.add_argument("--no-images", action="store_true",
                        help="Skip downloading hero images")
    parser.add_argument("--slack", action="store_true",
                        help="Post summary to Slack thread")
    parser.add_argument("--from-landing-pages", action="store_true",
                        help="Scrape product URLs from CI store landing_page_url values")
    args = parser.parse_args()

    if not args.url and not args.from_landing_pages:
        print("[error] Provide --url or --from-landing-pages")
        sys.exit(1)

    # Collect URLs to scrape
    product_urls: list[str] = []

    if args.from_landing_pages:
        if args.brand == "ours":
            print("[error] --from-landing-pages requires --brand <competitor_dir>")
            sys.exit(1)
        try:
            ci = CIStore(enable_chroma=False)
            try:
                rows = ci._conn.execute(
                    "SELECT DISTINCT landing_page_url FROM assets WHERE brand_dir = ? AND landing_page_url IS NOT NULL",
                    (args.brand,),
                ).fetchall()
            finally:
                ci.close()
            for row in rows:
                url = row[0]
                if url and "/products/" in url:
                    product_urls.append(url)
            print(f"[landing-pages] Found {len(product_urls)} product URLs for {args.brand}")
        except Exception as e:
            print(f"[error] Failed to read landing pages: {e}")
            sys.exit(1)
    # URL-based discovery handled below with Playwright

    # Ensure Playwright
    from ad_library_dl import ensure_playwright_browsers
    ensure_playwright_browsers()
    from playwright.sync_api import sync_playwright

    store = BrandAssetStore()
    saved = 0
    images_saved = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        if args.url and not args.from_landing_pages:
            print(f"[catalog] Discovering products from {args.url}")
            product_urls = discover_product_urls(page, args.url)

        product_urls = product_urls[:args.limit]
        if not product_urls:
            print("[done] No product URLs to scrape")
            browser.close()
            store.close()
            sys.exit(0)

        print(f"\n[catalog] Scraping {len(product_urls)} products...")
        if args.url:
            source_url = args.url
        elif product_urls:
            source_url = product_urls[0].rsplit("/products/", 1)[0]
        else:
            source_url = ""

        for i, url in enumerate(product_urls, 1):
            print(f"\n[{i}/{len(product_urls)}] {url}")
            product = extract_product_data(page, url)
            if not product or not product.get("product_name"):
                continue

            # Save to products table
            store.save_product(
                product_id=product["product_id"],
                product_name=product["product_name"],
                product_url=product["product_url"],
                price=product.get("price"),
                price_cents=product.get("price_cents"),
                description=product.get("description"),
                hero_image_url=product.get("hero_image_url"),
                variants_json=product.get("variants_json"),
                brand=args.brand,
                source_url=source_url,
            )
            saved += 1

            # Download hero image and register in brand_assets
            hero_url = product.get("hero_image_url")
            if hero_url and not args.no_images:
                slug = product["product_id"]
                ext = _guess_ext(hero_url)
                dest = store.images_dir / "crawled" / f"{slug}{ext}"
                if dest.exists():
                    print(f"  [image] Already downloaded: {dest.name}")
                    images_saved += 1
                elif _download_image(hero_url, dest):
                    print(f"  [image] Downloaded: {dest.name}")
                    try:
                        store.add_asset(
                            dest,
                            asset_type="product-shot",
                            source="crawled",
                            ownership="ours" if args.brand == "ours" else "competitor",
                            product_name=product["product_name"],
                            source_url=hero_url,
                            source_page_url=url,
                            auto_analyze=True,
                            copy_to_store=False,
                        )
                        images_saved += 1
                    except Exception as e:
                        print(f"  [image] Failed to catalog: {e}")
                else:
                    print(f"  [image] Download failed")

        browser.close()

    store.close()

    print(f"\n[done] Scraped {saved} products, {images_saved} hero images for "
          f"{'own brand' if args.brand == 'ours' else args.brand}")

    # Slack summary
    if args.slack:
        channel = os.environ.get("SLACK_CHANNEL_ID")
        thread_ts = os.environ.get("SLACK_THREAD_TS")
        token = os.environ.get("SLACK_BOT_TOKEN") or _read_slack_token()
        # Channel allowlist check
        if channel and not channel.startswith("D"):
            allowed = _get_allowed_channels()
            if allowed and channel not in allowed:
                print(f"[slack] BLOCKED: {channel} not in channel allowlist")
                channel = None
        if channel and token and thread_ts:
            brand_label = "own brand" if args.brand == "ours" else args.brand
            text = (
                f":package: *Product Catalog Scraped: {brand_label}*\n"
                f"{saved} products cataloged, {images_saved} hero images downloaded\n"
                f"Source: {source_url}"
            )
            payload = {"channel": channel, "text": text, "thread_ts": thread_ts}
            req = urllib.request.Request(
                "https://slack.com/api/chat.postMessage",
                data=json.dumps(payload).encode(),
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            )
            try:
                urllib.request.urlopen(req, timeout=10)
            except Exception as e:
                print(f"[slack] Summary post failed: {e}")


if __name__ == "__main__":
    main()
