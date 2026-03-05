#!/usr/bin/env python3
"""Search Giphy and return page URLs for Slack unfurling."""

import argparse
import json
import os
import random
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def load_api_key():
    """Load GIPHY_API_KEY from skill .env (derived from script location)."""
    key = os.environ.get("GIPHY_API_KEY")
    if key:
        return key

    env_path = Path(__file__).parent.parent / ".env"  # no .resolve() -- breaks profile isolation
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("GIPHY_API_KEY=") and not line.startswith("#"):
                    return line.split("=", 1)[1].strip()

    print("ERROR: GIPHY_API_KEY not found in environment or .env", file=sys.stderr)
    sys.exit(1)


def search_gifs(api_key, query, rating="pg-13", limit=10):
    """Search Giphy API, return list of page URLs."""
    params = urllib.parse.urlencode({
        "api_key": api_key,
        "q": query,
        "rating": rating,
        "limit": limit,
        "lang": "en",
    })
    url = f"https://api.giphy.com/v1/gifs/search?{params}"

    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.URLError as e:
        print(f"ERROR: Giphy API request failed: {e}", file=sys.stderr)
        sys.exit(1)

    results = data.get("data", [])
    if not results:
        print(f"ERROR: No GIFs found for query: {query}", file=sys.stderr)
        sys.exit(1)

    return [gif["url"] for gif in results if gif.get("url")]


def random_gif(api_key, tag, rating="pg-13"):
    """Get a random GIF from Giphy, return page URL."""
    params = urllib.parse.urlencode({
        "api_key": api_key,
        "tag": tag,
        "rating": rating,
    })
    url = f"https://api.giphy.com/v1/gifs/random?{params}"

    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.URLError as e:
        print(f"ERROR: Giphy API request failed: {e}", file=sys.stderr)
        sys.exit(1)

    gif_data = data.get("data")
    if not gif_data or not gif_data.get("url"):
        print(f"ERROR: No random GIF found for tag: {tag}", file=sys.stderr)
        sys.exit(1)

    return gif_data["url"]


def main():
    parser = argparse.ArgumentParser(description="Search Giphy for GIF URLs")
    parser.add_argument("query", help="Search query or tag")
    parser.add_argument("--random", action="store_true",
                        help="Use random endpoint for more variety")
    parser.add_argument("--count", type=int, default=1,
                        help="Number of URLs to return (default: 1)")
    parser.add_argument("--rating", default="pg-13",
                        help="Content rating: g, pg, pg-13, r (default: pg-13)")
    parser.add_argument("--limit", type=int, default=10,
                        help="Search pool size to pick from (default: 10)")
    args = parser.parse_args()

    api_key = load_api_key()

    if args.random:
        url = random_gif(api_key, args.query, args.rating)
        print(url)
    else:
        urls = search_gifs(api_key, args.query, args.rating, args.limit)
        random.shuffle(urls)
        for url in urls[:args.count]:
            print(url)


if __name__ == "__main__":
    main()
