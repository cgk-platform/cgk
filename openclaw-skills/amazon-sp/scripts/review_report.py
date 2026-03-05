#!/usr/bin/env python3
"""
review_report.py — Daily Amazon review count + rating report, grouped by parent ASIN.

Usage:
    uv run scripts/review_report.py [--stdout] [--slack channel:<ID>] [--threaded <thread_ts>]

Options:
    --stdout        Print plain text to stdout (for cron announce delivery)
    --slack         Post directly to a Slack channel (e.g. channel:C0ADZGUJS4A)
    --threaded      Slack thread_ts to reply in a thread (optional)
"""

import sys
import os
import json
import time
import pathlib
import datetime

# Allow running from any directory
# IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks
_script_dir = pathlib.Path(__file__).parent
sys.path.insert(0, str(_script_dir))

from sp_api_helper import get_config, sp_api_request, _load_env_file


def get_all_asins(config: dict) -> list[str]:
    """Retrieve all ASINs from FBA inventory."""
    all_asins = []
    params = {
        "granularityType": "Marketplace",
        "granularityId": config["marketplace_id"],
        "marketplaceIds": config["marketplace_id"],
    }
    while True:
        result = sp_api_request("GET", "/fba/inventory/v1/summaries", config, params=params)
        payload = result.get("payload", result)
        items = payload.get("inventorySummaries", [])
        for item in items:
            asin = item.get("asin")
            if asin:
                all_asins.append(asin)
        next_token = payload.get("pagination", {}).get("nextToken")
        if not next_token:
            break
        params["nextToken"] = next_token
        time.sleep(0.5)
    return list(set(all_asins))


def get_catalog_item(asin: str, config: dict) -> dict:
    """Fetch catalog item with summaries + relationships."""
    try:
        params = {
            "marketplaceIds": [config["marketplace_id"]],
            "includedData": "summaries,relationships",
        }
        return sp_api_request("GET", f"/catalog/2022-04-01/items/{asin}", config, params=params)
    except Exception as e:
        return {}


def extract_parent_asin(catalog_item: dict) -> str | None:
    """Find the parent ASIN from relationships data."""
    relationships = catalog_item.get("relationships", [])
    for rel_set in relationships:
        for rel in rel_set.get("relationships", []):
            if rel.get("type") == "VARIATION_PARENT" or rel.get("childAsins") is not None:
                # This IS a parent — return None (the ASIN itself is the parent)
                return None
            parent = rel.get("parentAsin")
            if parent:
                return parent
    return None


def is_parent_asin(catalog_item: dict) -> bool:
    """Returns True if this ASIN is a variation parent."""
    relationships = catalog_item.get("relationships", [])
    for rel_set in relationships:
        for rel in rel_set.get("relationships", []):
            if rel.get("childAsins") or rel.get("type") in ("VARIATION_PARENT",):
                return True
    return False


def extract_review_data(catalog_item: dict) -> tuple[float | None, int | None, str]:
    """Extract (rating_value, review_count, title) from catalog summaries."""
    summaries = catalog_item.get("summaries", [{}])
    summary = summaries[0] if summaries else {}
    title = summary.get("itemName", "—")
    rating_obj = summary.get("averageCustomerRating")
    if rating_obj:
        return rating_obj.get("value"), rating_obj.get("count"), title
    return None, None, title


def star_bar(rating: float | None) -> str:
    """Return a simple star display e.g. '4.5 ★'"""
    if rating is None:
        return "N/A"
    full = int(rating)
    half = 1 if (rating - full) >= 0.25 else 0
    return f"{'★' * full}{'½' if half else ''}{'☆' * (5 - full - half)} {rating:.1f}"


def build_report(parent_data: dict) -> str:
    """Build Slack mrkdwn report from parent_data dict."""
    today = datetime.date.today().strftime("%B %d, %Y")

    lines = [
        f"*:star: Amazon Review Report — {today}*",
        "",
    ]

    # Sort by review count desc
    sorted_parents = sorted(
        parent_data.items(),
        key=lambda x: x[1].get("count") or 0,
        reverse=True
    )

    for parent_asin, data in sorted_parents:
        title = data.get("title", "—")
        rating = data.get("rating")
        count = data.get("count")
        child_count = data.get("child_count", 0)

        rating_str = f"{rating:.1f} ★" if rating is not None else "No rating"
        count_str = f"{count:,}" if count is not None else "—"

        lines.append(f"*{title}*")
        lines.append(f"  Parent ASIN: `{parent_asin}`  •  {child_count} variation(s)")
        lines.append(f"  ⭐ {rating_str}   |   📝 {count_str} reviews")
        lines.append("")

    if not sorted_parents:
        lines.append("_No products found or no review data available._")

    lines.append(f"_Report generated at 9:00 AM PST · SP-API Catalog_")
    return "\n".join(lines)


def post_to_slack(message: str, channel: str, thread_ts: str | None = None):
    """Post message to Slack using the OpenClaw message tool (via subprocess)."""
    import subprocess, shlex
    cmd = ["openclaw", "message", "send", "--channel", channel, "--text", message]
    if thread_ts:
        cmd += ["--thread-ts", thread_ts]
    subprocess.run(cmd, check=False)


def main():
    args = sys.argv[1:]
    stdout_mode = "--stdout" in args
    slack_channel = None
    thread_ts = None

    if "--slack" in args:
        idx = args.index("--slack")
        if idx + 1 < len(args):
            slack_channel = args[idx + 1]
    if "--threaded" in args:
        idx = args.index("--threaded")
        if idx + 1 < len(args):
            thread_ts = args[idx + 1]

    _load_env_file()
    config = get_config()

    print("→ Fetching all ASINs from FBA inventory...", file=sys.stderr)
    all_asins = get_all_asins(config)
    print(f"  Found {len(all_asins)} ASINs", file=sys.stderr)

    # First pass: identify parent/child relationships
    parent_map: dict[str, set] = {}  # parent_asin → set of child ASINs
    asin_catalog: dict[str, dict] = {}

    print("→ Fetching catalog data for each ASIN...", file=sys.stderr)
    for i, asin in enumerate(all_asins):
        print(f"  [{i+1}/{len(all_asins)}] {asin}", file=sys.stderr)
        item = get_catalog_item(asin, config)
        asin_catalog[asin] = item

        parent = extract_parent_asin(item)
        if parent:
            # This is a child ASIN
            parent_map.setdefault(parent, set()).add(asin)
        elif is_parent_asin(item):
            # This IS the parent
            parent_map.setdefault(asin, set())
        else:
            # Standalone product (no variation) — treat as its own parent
            parent_map.setdefault(asin, set())

        time.sleep(0.3)  # Catalog API rate limit: 2/sec burst

    # Collect parent ASINs we haven't fetched yet
    unfetched_parents = [p for p in parent_map if p not in asin_catalog]
    if unfetched_parents:
        print(f"→ Fetching {len(unfetched_parents)} parent ASIN(s) not in inventory...", file=sys.stderr)
        for asin in unfetched_parents:
            item = get_catalog_item(asin, config)
            asin_catalog[asin] = item
            time.sleep(0.3)

    # Build parent-level data
    parent_data: dict[str, dict] = {}
    for parent_asin, children in parent_map.items():
        item = asin_catalog.get(parent_asin, {})
        rating, count, title = extract_review_data(item)
        parent_data[parent_asin] = {
            "title": title,
            "rating": rating,
            "count": count,
            "child_count": len(children),
        }

    report = build_report(parent_data)

    if stdout_mode or (not slack_channel):
        print(report)
    if slack_channel:
        post_to_slack(report, slack_channel, thread_ts)
        print(f"✓ Report posted to {slack_channel}", file=sys.stderr)


if __name__ == "__main__":
    main()
