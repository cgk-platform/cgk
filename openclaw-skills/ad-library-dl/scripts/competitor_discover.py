# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Competitor Discovery Pipeline.

Discovers competitor brands using Brave Search and Facebook Ad Library URL
construction. Deduplicates results, stores to workspace/brand/competitors/,
and optionally posts to Slack.

Usage:
    uv run competitor_discover.py "Casper" --limit 10 --slack
    uv run competitor_discover.py --category "bedding" --limit 10
    uv run competitor_discover.py "CGK" --use-brave --slack
    uv run competitor_discover.py "Brand" --auto-monitor
    uv run competitor_discover.py "Casper" --json
"""

from __future__ import annotations

import argparse
import datetime
import gzip
import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request


# ---------------------------------------------------------------------------
# Import from sibling modules (same package)
# ---------------------------------------------------------------------------

# IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks
_script_dir = pathlib.Path(__file__).parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))

from ad_library_dl import sanitize_brand, _read_slack_token, _workspace_root


# ---------------------------------------------------------------------------
# Workspace root helper
# ---------------------------------------------------------------------------

def _competitors_dir() -> pathlib.Path:
    """Return workspace/brand/competitors/ path, creating it if needed.

    Layout: scripts/ -> ad-library-dl/ -> skills/ -> .openclaw[-profile]/
    workspace/ lives alongside skills/ under .openclaw[-profile]/
    """
    workspace = _workspace_root()
    competitors = workspace / "brand" / "competitors"
    competitors.mkdir(parents=True, exist_ok=True)
    return competitors


# ---------------------------------------------------------------------------
# Ad Library URL builder
# ---------------------------------------------------------------------------

def build_ad_library_url(
    brand_name: str,
    country: str = "US",
    active_status: str = "all",
    ad_type: str = "all",
) -> str:
    """Build a Facebook Ad Library search URL for a brand.

    KEY: active_status=all and ad_type=all — NEVER political_and_issue_ads.
    """
    params = {
        "active_status": active_status,
        "ad_type": ad_type,
        "country": country,
        "is_targeted_country": "false",
        "media_type": "all",
        "search_type": "page",
        "q": brand_name,
    }
    return "https://www.facebook.com/ads/library/?" + urllib.parse.urlencode(params)


# ---------------------------------------------------------------------------
# Brave Search integration
# ---------------------------------------------------------------------------

def brave_search(query: str, count: int = 10) -> list[dict]:
    """Run a Brave Search query. Returns list of result dicts or [] if unavailable."""
    api_key = os.environ.get("BRAVE_SEARCH_API_KEY")
    if not api_key:
        return []
    url = (
        "https://api.search.brave.com/res/v1/web/search"
        f"?q={urllib.parse.quote(query)}&count={count}"
    )
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
            if resp.headers.get("Content-Encoding") == "gzip":
                raw = gzip.decompress(raw)
            data = json.loads(raw)
        return data.get("web", {}).get("results", [])
    except (urllib.error.URLError, json.JSONDecodeError, OSError) as e:
        print(f"[brave] Search failed: {e}", file=sys.stderr)
        return []


# ---------------------------------------------------------------------------
# Brand name extraction from search results
# ---------------------------------------------------------------------------

# Common generic/service words to filter out of competitor candidates
_NOISE_WORDS = {
    "the", "and", "for", "best", "top", "review", "reviews", "vs", "versus",
    "compare", "comparison", "alternatives", "alternative", "brands", "brand",
    "company", "companies", "store", "stores", "shop", "online", "buy", "cheap",
    "discount", "sale", "deals", "deal", "free", "shipping", "usa", "canada",
    "reddit", "quora", "amazon", "google", "yelp", "trustpilot", "facebook",
    "instagram", "twitter", "youtube", "tiktok", "pinterest", "linkedin",
    "wirecutter", "nytimes", "forbes", "businessinsider", "buzzfeed",
}


def _extract_brand_candidates(results: list[dict], source_brand: str) -> list[str]:
    """Extract brand name candidates from Brave Search results.

    Pulls brand names from titles and descriptions. Filters noise words
    and the source brand itself.
    """
    import re

    candidates: list[str] = []
    source_lower = source_brand.lower()

    for result in results:
        title = result.get("title", "")
        desc = result.get("description", "")

        # Extract capitalized words/phrases that look like brand names
        # Pattern: one or more capitalized words (not all-caps generic terms)
        for text in (title, desc):
            # Find sequences of Title Case words (potential brand names)
            matches = re.findall(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b", text)
            for m in matches:
                lower = m.lower().strip()
                words = lower.split()
                # Skip if all words are noise or it's the source brand
                if all(w in _NOISE_WORDS for w in words):
                    continue
                if lower == source_lower:
                    continue
                if len(m) < 3:
                    continue
                candidates.append(m.strip())

        # Also extract from URL domain (e.g. "purple.com" -> "Purple")
        url = result.get("url", "")
        if url:
            try:
                domain = urllib.parse.urlparse(url).netloc
                # Strip www. and TLD
                domain = re.sub(r"^www\.", "", domain)
                domain = re.sub(r"\.(com|net|org|co|io|shop).*$", "", domain)
                if domain and domain.lower() not in _NOISE_WORDS and domain.lower() != source_lower:
                    # Convert slug to title case (e.g. "sleep-country" -> "Sleep Country")
                    brand_from_domain = " ".join(
                        w.capitalize() for w in re.split(r"[-_]", domain) if w
                    )
                    if len(brand_from_domain) >= 3:
                        candidates.append(brand_from_domain)
            except Exception:
                pass

    return candidates


def _score_candidate(name: str, seen: set[str]) -> float:
    """Score a candidate brand name for relevance. Returns 0.0–1.0."""
    lower = name.lower()

    # Already seen — will be deduped, score doesn't matter
    if lower in seen:
        return 0.0

    # Prefer shorter, more distinctive names (1–3 words)
    word_count = len(name.split())
    if word_count == 1:
        score = 0.9
    elif word_count == 2:
        score = 0.8
    else:
        score = 0.6

    # Penalise anything that looks like a generic descriptor
    noise_hits = sum(1 for w in name.lower().split() if w in _NOISE_WORDS)
    score -= noise_hits * 0.2

    return max(0.1, min(1.0, score))


# ---------------------------------------------------------------------------
# Competitor discovery
# ---------------------------------------------------------------------------

def discover_competitors(
    brand_name: str,
    category: str = "",
    limit: int = 10,
) -> list[dict]:
    """Discover competitor brands using Brave Search.

    Returns a list of dicts:
      {brand_name, url, source, relevance_score}

    Falls back to an empty list if BRAVE_SEARCH_API_KEY is not set.
    """
    results: list[dict] = []
    seen_lower: set[str] = set()

    queries: list[str] = []
    if brand_name:
        queries += [
            f"{brand_name} competitors alternative brands",
            f"brands like {brand_name}",
        ]
    if category:
        queries += [
            f"top {category} brands",
            f"best {category} companies",
        ]

    for query in queries:
        if len(results) >= limit:
            break
        print(f"[discover] Searching: {query}", flush=True)
        search_results = brave_search(query, count=10)
        if not search_results:
            continue

        candidates = _extract_brand_candidates(search_results, brand_name)
        for candidate in candidates:
            lower = candidate.lower()
            if lower in seen_lower:
                continue
            if len(results) >= limit:
                break
            score = _score_candidate(candidate, seen_lower)
            if score <= 0.0:
                continue
            seen_lower.add(lower)
            results.append({
                "brand_name": candidate,
                "url": build_ad_library_url(candidate),
                "source": "brave_search",
                "relevance_score": round(score, 2),
            })

    # Sort by relevance descending
    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return results[:limit]


# ---------------------------------------------------------------------------
# Persistent storage
# ---------------------------------------------------------------------------

def _load_discovered(path: pathlib.Path) -> dict:
    """Load existing discovered.json or return empty structure."""
    if path.exists():
        try:
            return json.loads(path.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {"source_brand": "", "discovered_at": "", "competitors": []}


def save_discovered(brand_name: str, competitors: list[dict]) -> pathlib.Path:
    """Store discovery results to workspace/brand/competitors/discovered.json."""
    dest_dir = _competitors_dir()
    path = dest_dir / "discovered.json"

    existing = _load_discovered(path)

    # Merge: add new entries not already present (dedup by brand_name lower)
    existing_lower = {c["brand_name"].lower() for c in existing.get("competitors", [])}
    merged = list(existing.get("competitors", []))
    for c in competitors:
        if c["brand_name"].lower() not in existing_lower:
            merged.append(c)
            existing_lower.add(c["brand_name"].lower())

    merged.sort(key=lambda x: x.get("relevance_score", 0.0), reverse=True)

    data = {
        "source_brand": brand_name or existing.get("source_brand", ""),
        "discovered_at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
        "competitors": merged,
    }
    path.write_text(json.dumps(data, indent=2))
    return path


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------

def _print_table(competitors: list[dict], source_brand: str) -> None:
    """Print a human-readable table of discovered competitors."""
    if not competitors:
        print("[discover] No competitors found.")
        return

    header = f"Discovered competitors for: {source_brand or '(category search)'}"
    print()
    print(header)
    print("-" * len(header))
    for i, c in enumerate(competitors, 1):
        score_pct = int(c.get("relevance_score", 0) * 100)
        print(f"  {i:2d}. {c['brand_name']:<30s}  score={score_pct}%  source={c.get('source', '?')}")
        print(f"       {c['url']}")
    print()


def _print_monitor_commands(competitors: list[dict], script_dir: pathlib.Path) -> None:
    """Print competitor_monitor.py commands for each discovered brand."""
    monitor_script = script_dir / "competitor_monitor.py"
    print("[auto-monitor] Run these commands to begin monitoring each brand:")
    print()
    for c in competitors:
        url = c["url"]
        print(f'  uv run {monitor_script} "{url}" --limit 15 --monitor --slack')
    print()


# ---------------------------------------------------------------------------
# Slack posting
# ---------------------------------------------------------------------------

def _get_allowed_channels() -> set[str]:
    """Read allowed channel IDs from openclaw.json."""
    config_path = _workspace_root() / "openclaw.json"
    if config_path.exists():
        try:
            cfg = json.loads(config_path.read_text())
            return set(cfg.get("channels", {}).get("slack", {}).get("channels", {}).keys())
        except (json.JSONDecodeError, OSError):
            pass
    return set()


def _holden_user_id() -> str:
    """Return Holden's Slack user ID for this workspace."""
    name = _workspace_root().name
    return {"openclaw-rawdog": "U07J2D9L0FL",
            "openclaw-vitahustle": "U0AF28VCYBH"}.get(name, "U0ACL7UV3RV")


def _dm_holden(text: str) -> None:
    """Send a DM to Holden about an allowlist block."""
    token = _read_slack_token()
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


def post_to_slack(channel: str, thread_ts: str | None, text: str, token: str) -> dict:
    """Post a message to Slack. Returns the API response dict."""
    payload: dict = {"channel": channel, "text": text}
    if thread_ts:
        payload["thread_ts"] = thread_ts
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def _post_discovery_to_slack(
    competitors: list[dict],
    source_brand: str,
    stored_path: pathlib.Path | None,
) -> bool:
    """Post discovery results to Slack thread.

    Reads SLACK_CHANNEL_ID + SLACK_THREAD_TS from env.
    Reads SLACK_BOT_TOKEN from workspace openclaw.json.
    """
    channel = os.environ.get("SLACK_CHANNEL_ID")
    thread_ts = os.environ.get("SLACK_THREAD_TS")
    token = os.environ.get("SLACK_BOT_TOKEN") or _read_slack_token()

    if not channel:
        print("[slack] SLACK_CHANNEL_ID not set — skipping Slack post")
        return False
    if not token:
        print("[slack] No Slack token found — skipping Slack post")
        return False

    if not channel.startswith("D"):
        allowed = _get_allowed_channels()
        if allowed and channel not in allowed:
            print(f"[slack] BLOCKED: channel {channel} not in workspace allowlist")
            _dm_holden(
                f":warning: *Channel Allowlist Block*\n\n"
                f"Workspace `{_workspace_root().name}` tried to post to channel `{channel}` "
                f"but it's not in this workspace's Slack channel list.\n\n"
                f"Should I add this channel to the openclaw allowlist in "
                f"`openclaw.json`? Or is this a misconfiguration?"
            )
            return False

    # Build message
    label = source_brand or "(category search)"
    lines = [f"*Competitor Discovery: {label}*", f"Found {len(competitors)} competitors:"]
    for i, c in enumerate(competitors, 1):
        score_pct = int(c.get("relevance_score", 0) * 100)
        lines.append(f"{i}. *{c['brand_name']}* ({score_pct}%) — <{c['url']}|Ad Library>")
    if stored_path:
        lines.append(f"\nStored to `{stored_path}`")

    text = "\n".join(lines)

    try:
        result = post_to_slack(channel, thread_ts, text, token)
        if not result.get("ok"):
            print(f"[slack] API error: {result.get('error', 'unknown')}")
            return False
        print("[slack] Posted to Slack thread")
        return True
    except (OSError, urllib.error.URLError, json.JSONDecodeError) as e:
        print(f"[slack] Failed to post: {e}")
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Discover competitor brands via Brave Search + Facebook Ad Library"
    )
    parser.add_argument(
        "brand_name",
        nargs="?",
        default="",
        help="Source brand name (required unless --category is given)",
    )
    parser.add_argument(
        "--category",
        default="",
        help="Product category for discovery (e.g. 'bedding', 'mattress')",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Max competitors to discover (default: 10)",
    )
    parser.add_argument(
        "--slack",
        action="store_true",
        help="Post results to Slack thread (reads SLACK_CHANNEL_ID + SLACK_THREAD_TS from env)",
    )
    parser.add_argument(
        "--use-brave",
        action="store_true",
        default=None,
        help="Use Brave Search API (default: on if BRAVE_SEARCH_API_KEY is set)",
    )
    parser.add_argument(
        "--auto-monitor",
        action="store_true",
        help="After discovery, print competitor_monitor.py commands for each found brand",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        dest="json_output",
        help="Output JSON only (no table or progress output)",
    )
    args = parser.parse_args()

    if not args.brand_name and not args.category:
        parser.error("Provide a brand_name positional argument or --category")

    # Determine whether Brave is available
    brave_available = bool(os.environ.get("BRAVE_SEARCH_API_KEY"))
    if args.use_brave and not brave_available:
        print(
            "[error] --use-brave requested but BRAVE_SEARCH_API_KEY is not set",
            file=sys.stderr,
        )
        sys.exit(1)

    if not args.json_output:
        if brave_available:
            print("[discover] Brave Search API: available")
        else:
            print("[discover] Brave Search API: not configured (set BRAVE_SEARCH_API_KEY)")

    # Run discovery
    competitors = discover_competitors(
        brand_name=args.brand_name,
        category=args.category,
        limit=args.limit,
    )

    if not competitors:
        if args.json_output:
            print(json.dumps({"source_brand": args.brand_name, "competitors": []}))
        else:
            print("[discover] No competitors found. Check BRAVE_SEARCH_API_KEY or try a broader --category.")
        sys.exit(0)

    # Store results
    stored_path: pathlib.Path | None = None
    try:
        stored_path = save_discovered(args.brand_name, competitors)
        if not args.json_output:
            print(f"[discover] Stored results to: {stored_path}")
    except OSError as e:
        print(f"[discover] Could not store results: {e}", file=sys.stderr)

    # Output
    if args.json_output:
        output = {
            "source_brand": args.brand_name,
            "discovered_at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
            "competitors": competitors,
        }
        print(json.dumps(output, indent=2))
        return

    _print_table(competitors, args.brand_name)

    if args.auto_monitor:
        _print_monitor_commands(competitors, _script_dir)

    if args.slack:
        _post_discovery_to_slack(competitors, args.brand_name, stored_path)


if __name__ == "__main__":
    main()
