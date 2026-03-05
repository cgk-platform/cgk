# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Brand Name to Ad Library URL Resolver.

Resolves brand names to Facebook Ad Library URLs using Brave Search API
for verification. Also provides competitor discovery.
"""

from __future__ import annotations

import argparse
import gzip
import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

# IMPORTANT: Do NOT use .resolve() -- breaks profile isolation via symlinks
_script_dir = pathlib.Path(__file__).parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))

from ad_library_dl import sanitize_brand


# ---------------------------------------------------------------------------
# Ad Library URL builder
# ---------------------------------------------------------------------------

def build_ad_library_url(
    brand_name: str,
    country: str = "US",
    active_status: str = "all",
    ad_type: str = "all",
) -> str:
    """Return a Facebook Ad Library search URL for the given brand name.

    Always defaults to active_status=all and ad_type=all.
    """
    params = urllib.parse.urlencode({
        "active_status": active_status,
        "ad_type": ad_type,
        "country": country,
        "is_targeted_country": "false",
        "media_type": "all",
        "search_type": "page",
        "q": brand_name,
    })
    return f"https://www.facebook.com/ads/library/?{params}"


# ---------------------------------------------------------------------------
# Brave Search
# ---------------------------------------------------------------------------

_GENERIC_BRANDS = frozenset({
    "amazon", "google", "walmart", "target", "ebay", "facebook", "instagram",
    "twitter", "youtube", "tiktok", "pinterest", "reddit", "apple", "microsoft",
    "shopify", "etsy", "aliexpress", "wish", "wayfair", "costco", "kroger",
    "home depot", "lowe's", "best buy", "cvs", "walgreens", "rite aid",
})


def brave_search(query: str, count: int = 10) -> list[dict]:
    """Run a Brave Web Search and return result dicts.

    Uses BRAVE_SEARCH_API_KEY env var. Returns empty list if no API key or
    on any network/parse error.

    Each result dict has keys: title, url, description.
    """
    api_key = os.environ.get("BRAVE_SEARCH_API_KEY", "")
    if not api_key:
        return []

    params = urllib.parse.urlencode({"q": query, "count": count})
    url = f"https://api.search.brave.com/res/v1/web/search?{params}"

    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": api_key,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read()
            if resp.info().get("Content-Encoding") == "gzip":
                raw = gzip.decompress(raw)
            data = json.loads(raw)
    except (urllib.error.URLError, OSError, json.JSONDecodeError, gzip.BadGzipFile) as e:
        print(f"[brave] Search failed: {e}", file=sys.stderr)
        return []

    results = []
    for item in data.get("web", {}).get("results", []):
        results.append({
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "description": item.get("description", ""),
        })
    return results


# ---------------------------------------------------------------------------
# Page ID extraction
# ---------------------------------------------------------------------------

def _extract_page_id_from_results(results: list[dict]) -> str | None:
    """Try to pull a numeric Facebook page ID from Brave search results.

    Looks for patterns like facebook.com/<numeric_id> or
    ads/library/?...page_id=<numeric_id>.
    """
    import re

    page_id_pattern = re.compile(
        r"facebook\.com/(?:ads/library/\?.*?page_id=)?(\d{10,20})"
    )
    for item in results:
        for field in (item.get("url", ""), item.get("description", "")):
            m = page_id_pattern.search(field)
            if m:
                return m.group(1)
    return None


# ---------------------------------------------------------------------------
# Brand resolver
# ---------------------------------------------------------------------------

def resolve_brand(brand_name: str, country: str = "US") -> dict:
    """Resolve a brand name to an Ad Library URL with optional Brave verification.

    Returns a dict with keys:
        brand_name, page_id, page_name, url, confidence_score, source
    """
    url = build_ad_library_url(brand_name, country=country)
    result = {
        "brand_name": brand_name,
        "page_id": None,
        "page_name": None,
        "url": url,
        "confidence_score": "low",
        "source": "constructed",
    }

    has_brave = bool(os.environ.get("BRAVE_SEARCH_API_KEY", ""))
    if not has_brave:
        return result

    # Step 2: Brave verification — two queries
    queries = [
        f"{brand_name} Facebook page",
        f"{brand_name} site:facebook.com",
    ]
    all_results: list[dict] = []
    for q in queries:
        all_results.extend(brave_search(q, count=5))

    if not all_results:
        return result

    # Check for exact brand name match in titles/descriptions
    brand_lower = brand_name.lower()
    exact_match = any(
        brand_lower in item.get("title", "").lower()
        or brand_lower in item.get("description", "").lower()
        for item in all_results
    )

    # Step 3: Try to extract page_id from results
    page_id = _extract_page_id_from_results(all_results)
    if page_id:
        result["page_id"] = page_id
        result["url"] = build_ad_library_url(brand_name, country=country)

    # Confidence scoring
    if exact_match and page_id:
        result["confidence_score"] = "high"
        result["source"] = "brave_verified"
    elif exact_match:
        result["confidence_score"] = "medium"
        result["source"] = "brave_verified"
    else:
        result["confidence_score"] = "low"
        result["source"] = "brave_unverified"

    # Try to capture page_name from search result titles
    for item in all_results:
        title = item.get("title", "")
        if brand_lower in title.lower() and "facebook" in item.get("url", "").lower():
            # Strip " | Facebook" suffix if present
            page_name = title.split("|")[0].strip()
            if page_name:
                result["page_name"] = page_name
                break

    return result


# ---------------------------------------------------------------------------
# Competitor discovery
# ---------------------------------------------------------------------------

def discover_competitors(
    brand_name: str,
    category: str | None = None,
    limit: int = 10,
    use_brave: bool = True,
) -> list[dict]:
    """Discover competitor brands via Brave Search.

    Returns a list of dicts with keys:
        brand_name, url, source, relevance_score
    """
    import re

    if not use_brave or not os.environ.get("BRAVE_SEARCH_API_KEY", ""):
        return []

    queries = [
        f"{brand_name} competitors alternative brands",
        f"brands like {brand_name}",
    ]
    if category:
        queries.append(f"{category} brands competitors")

    raw_results: list[dict] = []
    for q in queries:
        raw_results.extend(brave_search(q, count=10))

    # Extract candidate brand names from titles and descriptions
    seen_names: set[str] = set()
    candidates: list[dict] = []

    brand_lower = brand_name.lower()

    for item in raw_results:
        text = f"{item.get('title', '')} {item.get('description', '')}"
        # Extract capitalized multi-word brand-like tokens
        tokens = re.findall(r"\b[A-Z][a-zA-Z0-9&'-]{1,30}(?:\s[A-Z][a-zA-Z0-9&'-]{1,20}){0,2}\b", text)
        for token in tokens:
            token_lower = token.lower()
            # Skip the brand itself
            if token_lower == brand_lower:
                continue
            # Skip generic filter words
            if token_lower in _GENERIC_BRANDS:
                continue
            # Skip very short tokens likely to be noise
            if len(token) < 3:
                continue
            # Skip common structural words that appear capitalized in titles
            if token_lower in {
                "the", "and", "for", "top", "best", "new", "see", "our", "get",
                "how", "why", "what", "more", "list", "read", "your", "when",
                "these", "this", "with", "from", "like", "that",
            }:
                continue
            key = token_lower
            if key not in seen_names:
                seen_names.add(key)
                # Higher relevance when found near the primary brand name
                relevance = "high" if brand_lower in text[:200].lower() else "medium"
                candidates.append({
                    "brand_name": token,
                    "url": build_ad_library_url(token),
                    "source": "brave_search",
                    "relevance_score": relevance,
                })

    # Deduplicate further and cap at limit
    return candidates[:limit]


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _print_result(resolved: dict, json_only: bool) -> None:
    if json_only:
        print(json.dumps(resolved, indent=2))
        return

    print(f"Brand:      {resolved['brand_name']}")
    print(f"URL:        {resolved['url']}")
    print(f"Confidence: {resolved['confidence_score']}")
    print(f"Source:     {resolved['source']}")
    if resolved.get("page_id"):
        print(f"Page ID:    {resolved['page_id']}")
    if resolved.get("page_name"):
        print(f"Page Name:  {resolved['page_name']}")
    print()
    print(json.dumps(resolved, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Resolve brand names to Facebook Ad Library URLs"
    )
    parser.add_argument("brand", help="Brand name to resolve")
    parser.add_argument(
        "--country", default="US",
        help="Country code for Ad Library (default: US)"
    )
    parser.add_argument(
        "--json", dest="json_only", action="store_true",
        help="Output JSON only (no human-readable headers)"
    )
    parser.add_argument(
        "--competitors", action="store_true",
        help="Also discover competitors for this brand"
    )
    parser.add_argument(
        "--category", default=None,
        help="Brand category to improve competitor discovery (e.g. 'mattress')"
    )
    parser.add_argument(
        "--limit", type=int, default=10,
        help="Max competitors to return (default: 10)"
    )
    args = parser.parse_args()

    resolved = resolve_brand(args.brand, country=args.country)
    _print_result(resolved, args.json_only)

    if args.competitors:
        competitors = discover_competitors(
            args.brand,
            category=args.category,
            limit=args.limit,
        )
        if args.json_only:
            print(json.dumps(competitors, indent=2))
        else:
            print(f"\nCompetitors ({len(competitors)} found):")
            for c in competitors:
                print(f"  {c['brand_name']} [{c['relevance_score']}]")
                print(f"    {c['url']}")
            print()
            print(json.dumps(competitors, indent=2))


if __name__ == "__main__":
    main()
