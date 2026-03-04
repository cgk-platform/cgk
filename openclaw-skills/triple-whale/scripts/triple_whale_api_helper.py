#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
Triple Whale API Helper Script

Usage:
    triple_whale_api_helper.py COMMAND [OPTIONS]

Commands:
    test-auth                     Validate API key
    summary                       Dashboard metrics + traffic/pixel stats
    attribution                   Order-level attribution with journeys + NC%
    compare                       TW vs Meta side-by-side comparison
    channels                      List channels with spend
    metrics [SEARCH]              Search/list all 689 TW metrics (e.g. 'visitor', 'pixel')
    ads                           Ad-level breakdown (TW orders/rev + Meta spend → CAC/ROAS/NC%)
    adsets                        Ad set-level breakdown (TW orders/rev + Meta spend → CAC/ROAS/NC%)
    campaigns                     Campaign-level breakdown (TW orders/rev + Meta spend → CAC/ROAS/NC%)
    moby                          (stub) Moby AI — requires OAuth
    sql                           (stub) SQL endpoint — requires OAuth

Global Options:
    --format FORMAT     json, table, or summary (default: summary)
    --start DATE        Start date (YYYY-MM-DD)
    --end DATE          End date (YYYY-MM-DD)
"""

import argparse
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta

# --- Configuration ---
SKILL_DIR = pathlib.Path(__file__).resolve().parent.parent
PROFILE_ROOT = SKILL_DIR.parent.parent  # ~/.openclaw-vitahustle/
ENV_FILE = SKILL_DIR / ".env"
CACHE_DIR = SKILL_DIR / "cache"
HISTORY_DIR = SKILL_DIR / "history"
LOGS_DIR = SKILL_DIR / "logs"

BASE_URL = "https://api.triplewhale.com/api/v2"
MAX_RETRIES = 3
RETRY_BACKOFF = [1, 2, 4]

# Attribution model shortcuts -> full names
ATTRIBUTION_MODELS = {
    "ti": "totalImpact",
    "ta": "tripleAttribution",
    "ta-views": "tripleAttributionViews",
    "linear-all": "linearAll",
    "linear-paid": "linearPaid",
    "first-click": "firstClick",
    "last-click": "lastClick",
}

# Key metric IDs for summary display (ordered for output)
# These match the `id` field in the TW metrics response
BLENDED_METRIC_IDS = [
    "sales",               # Order Revenue
    "netSales",            # Total Sales
    "totalNetProfit",      # Net Profit
    "grossProfit",         # Gross Profit
    "roas",                # Blended ROAS
    "mer",                 # MER
    "blendedAds",          # Blended Ad Spend
    "shopifyOrders",       # Orders
    "shopifyAov",          # True AOV
    "newCustomerSales",    # New Customer Revenue
    "rcRevenue",           # Returning Customer Revenue
    "newCustomersOrders",  # New Customer Orders
    "newCustomersPercent", # New Customer %
    "newCustomersCpa",     # New Customer CPA
    "newCustomersRoas",    # New Customer ROAS
    "ltvCpa",              # LTV/CPA
    "totalCpa",            # Blended CPA
    "totalRefunds",        # Returns
]

# Pixel / Traffic metrics
PIXEL_METRIC_IDS = [
    "pixelUniqueVisitors",      # Users (unique visitors)
    "pixelNewVisitors",         # New Users
    "pixelPercentNewVisitors",  # New Users % (NEW VISIT %)
    "pixelVisitors",            # Sessions
    "pixelPageViews",           # Page Views
    "pixelBounceRate",          # Bounce Rate
    "pixelConversionRate",      # Conversion Rate
    "pixelAvgSessionDuration",  # Session Duration
    "pixelAvgPagesPerSession",  # Pages per Session
    "pixelCostPerSession",      # Cost per Session
    "pixelCostPerAtc",          # Cost per Add to Cart
    "pixelPercentAtc",          # Add to Cart %
    "pixelUniqueSessionsAtc",   # Sessions with Add to Carts
]

# Platform-specific metric IDs
FACEBOOK_METRIC_IDS = [
    "facebookAds",         # Facebook Spend
    "facebookRoas",        # Facebook ROAS
    "facebookPurchases",   # Facebook Purchases
    "facebookCpa",         # Facebook CPA
    "facebookConversionValue",  # Facebook Conversion Value
    "facebookImpressions", # Facebook Impressions
    "facebookClicks",      # Facebook Clicks
    "facebookCtr",         # Facebook CTR
    "facebookCpm",         # Facebook CPM
    "facebookCpc",         # Facebook CPC
]

GOOGLE_METRIC_IDS = [
    "googleAds",           # Google Spend
    "googleRoas",          # Google ROAS
    "googleAllCpa",        # Google CPA
    "googleConversionValue",  # Google Conversion Value
    "totalGoogleAdsImpressions",
    "totalGoogleAdsClicks",
    "totalGoogleAdsCtr",
    "totalGoogleAdsCpm",
    "googleCpc",
]


def extract_metrics_map(result):
    """Convert TW metrics array response into a flat dict keyed by metric id.

    TW returns { metrics: [{ id, title, type, values: { current, previous }, delta, ... }] }
    This converts to { id: { title, type, current, previous, delta } }
    """
    metrics_map = {}
    raw_metrics = result.get("metrics", [])
    if not isinstance(raw_metrics, list):
        return metrics_map
    for m in raw_metrics:
        mid = m.get("id", "")
        values = m.get("values", {})
        metrics_map[mid] = {
            "title": m.get("title", mid),
            "type": m.get("type", "decimal"),
            "current": values.get("current"),
            "previous": values.get("previous"),
            "delta": m.get("delta"),
            "services": m.get("services", []),
        }
    return metrics_map


# Override formatting for metrics where TW's type field is wrong or too generic.
# Maps metric ID → forced format: "currency", "percent", "ratio", "number", "duration"
METRIC_FORMAT_OVERRIDES = {
    # Google Ads — TW returns "decimal" but these have specific meanings
    "totalGoogleAdsCtr": "percent",
    "totalGoogleAdsCpm": "currency",
    "googleCpc": "currency",
    "googleAllCpa": "currency",
    # Facebook — same issue
    "facebookCtr": "percent",
    "facebookCpm": "currency",
    "facebookCpc": "currency",
    "facebookCpa": "currency",
    # ROAS metrics — force ratio display
    "googleRoas": "ratio",
    "facebookRoas": "ratio",
    "blendedRoas": "ratio",
    "newCustomersRoas": "ratio",
    "roas": "ratio",
    # CPA / spend metrics
    "blendedCpa": "currency",
    "newCustomersCpa": "currency",
    # MER
    "mer": "percent",
    "newCustomersPercent": "percent",
    # Pixel metrics
    "pixelBounceRate": "percent",
    "pixelConversionRate": "percent",
    "pixelPercentAtc": "percent",
    "pixelPercentNewVisitors": "percent",
    "pixelCostPerSession": "currency",
    "pixelCostPerAtc": "currency",
    "pixelAvgPagesPerSession": "ratio",
    "pixelAvgSessionDuration": "duration",
}


def format_tw_metric(metric_type, value, metric_id=None):
    """Format a metric value based on its TW type field.

    If metric_id is provided, checks METRIC_FORMAT_OVERRIDES first.
    """
    if value is None:
        return "N/A"

    # Apply override if we know the metric ID
    if metric_id and metric_id in METRIC_FORMAT_OVERRIDES:
        metric_type = METRIC_FORMAT_OVERRIDES[metric_id]

    if metric_type == "currency":
        return format_currency(value)
    elif metric_type == "percent":
        return format_percent(value)
    elif metric_type == "ratio":
        try:
            return f"{float(value):.2f}x"
        except (ValueError, TypeError):
            return str(value)
    elif metric_type == "decimal":
        return format_number(value)
    elif metric_type == "duration":
        try:
            secs = int(float(value))
            if secs > 3600:
                return f"{secs // 3600}h {(secs % 3600) // 60}m"
            elif secs > 60:
                return f"{secs // 60}m {secs % 60}s"
            return f"{secs}s"
        except (ValueError, TypeError):
            return str(value)
    return format_number(value)


# --- Environment Loading ---
def load_env():
    """Load .env file into os.environ (does not override existing vars)."""
    if not ENV_FILE.exists():
        return
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value


def get_api_key():
    """Get the Triple Whale API key from environment."""
    key = os.environ.get("TRIPLE_WHALE_API_KEY", "")
    if not key:
        print("ERROR: TRIPLE_WHALE_API_KEY not set.", file=sys.stderr)
        print(f"Set it in {ENV_FILE} or as an environment variable.", file=sys.stderr)
        sys.exit(1)
    return key


def get_shop_domain():
    """Get the Shopify shop domain from environment."""
    domain = os.environ.get("TRIPLE_WHALE_SHOP_DOMAIN", "")
    if not domain:
        print("ERROR: TRIPLE_WHALE_SHOP_DOMAIN not set.", file=sys.stderr)
        print(f"Set it in {ENV_FILE} or as an environment variable.", file=sys.stderr)
        sys.exit(1)
    return domain


# --- Date Helpers ---
def parse_date(date_str):
    """Parse a date string (YYYY-MM-DD) and return a datetime."""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        print(f"ERROR: Invalid date format '{date_str}'. Use YYYY-MM-DD.", file=sys.stderr)
        sys.exit(1)


def default_start():
    """Default start date: 7 days ago."""
    return (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")


def default_end():
    """Default end date: yesterday."""
    return (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")


def format_date_range(start, end):
    """Format date range for display."""
    s = datetime.strptime(start, "%Y-%m-%d")
    e = datetime.strptime(end, "%Y-%m-%d")
    return f"{s.strftime('%b %d')} - {e.strftime('%b %d, %Y')}"


def build_periods_payload(shop, start, end):
    """Build the standard TW request payload with period object.

    TW API uses { shopDomain, period: { start, end }, todayHour }
    not startDate/endDate.
    """
    now = datetime.now()
    return {
        "shopDomain": shop,
        "period": {"start": start, "end": end},
        "todayHour": now.hour,
    }


# --- HTTP Layer ---
def make_headers():
    """Build standard Triple Whale API headers."""
    return {
        "x-api-key": get_api_key(),
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def api_request(method, path, data=None, params=None, retries=MAX_RETRIES):
    """Make an API request with retry logic."""
    url = f"{BASE_URL}/{path.lstrip('/')}"

    if params:
        query = urllib.parse.urlencode(params, doseq=True)
        url = f"{url}?{query}" if "?" not in url else f"{url}&{query}"

    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")

    headers = make_headers()
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read().decode("utf-8")
                if not raw:
                    return {}
                return json.loads(raw)
        except urllib.error.HTTPError as e:
            error_body = ""
            try:
                error_body = e.read().decode("utf-8")
            except Exception:
                pass

            if e.code == 429:
                retry_after = int(e.headers.get("Retry-After", "5"))
                if attempt < retries:
                    print(f"Rate limited. Waiting {retry_after}s...", file=sys.stderr)
                    time.sleep(retry_after)
                    continue
            elif e.code in (500, 502, 503) and attempt < retries:
                wait = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
                print(f"Server error {e.code}. Retrying in {wait}s...", file=sys.stderr)
                time.sleep(wait)
                continue

            print(f"HTTP {e.code}: {error_body}", file=sys.stderr)
            sys.exit(1)
        except urllib.error.URLError as e:
            if attempt < retries:
                wait = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
                print(f"Connection error. Retrying in {wait}s...", file=sys.stderr)
                time.sleep(wait)
                continue
            print(f"Connection error: {e.reason}", file=sys.stderr)
            sys.exit(1)

    print("Max retries exceeded.", file=sys.stderr)
    sys.exit(1)


def api_get(path, params=None):
    """GET request."""
    return api_request("GET", path, params=params)


def api_post(path, data):
    """POST request."""
    return api_request("POST", path, data=data)


# --- Formatting ---
def format_currency(value):
    """Format a number as currency."""
    if value is None:
        return "N/A"
    try:
        v = float(value)
        if abs(v) >= 1_000_000:
            return f"${v / 1_000_000:,.1f}M"
        elif abs(v) >= 1_000:
            return f"${v:,.0f}"
        else:
            return f"${v:,.2f}"
    except (ValueError, TypeError):
        return str(value)


def format_number(value):
    """Format a number with commas."""
    if value is None:
        return "N/A"
    try:
        v = float(value)
        if v == int(v):
            return f"{int(v):,}"
        return f"{v:,.2f}"
    except (ValueError, TypeError):
        return str(value)


def format_roas(value):
    """Format ROAS as Xx."""
    if value is None:
        return "N/A"
    try:
        return f"{float(value):.2f}x"
    except (ValueError, TypeError):
        return str(value)


def format_percent(value):
    """Format a number as percentage."""
    if value is None:
        return "N/A"
    try:
        return f"{float(value):.1f}%"
    except (ValueError, TypeError):
        return str(value)


def format_metric_value(key, value):
    """Format a metric value based on its key name."""
    if value is None:
        return "N/A"
    key_lower = key.lower()
    if any(k in key_lower for k in ["revenue", "profit", "spend", "aov", "cpa", "ncpa", "cost"]):
        return format_currency(value)
    elif any(k in key_lower for k in ["roas", "mer", "ltv"]):
        return format_roas(value)
    elif any(k in key_lower for k in ["ctr", "rate", "percent"]):
        return format_percent(value)
    else:
        return format_number(value)


def format_delta(tw_val, meta_val):
    """Format delta between two values as percentage."""
    try:
        tw = float(tw_val)
        meta = float(meta_val)
        if meta == 0:
            return "N/A"
        delta = ((tw - meta) / abs(meta)) * 100
        sign = "+" if delta > 0 else ""
        return f"{sign}{delta:.1f}%"
    except (ValueError, TypeError):
        return "N/A"


def print_table(headers, rows, min_widths=None):
    """Print a formatted ASCII table."""
    if not rows:
        print("(no data)")
        return

    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(str(cell)))

    if min_widths:
        for i, mw in enumerate(min_widths):
            if i < len(widths):
                widths[i] = max(widths[i], mw)

    # Header
    header_line = " | ".join(str(h).ljust(widths[i]) for i, h in enumerate(headers))
    sep_line = "-+-".join("-" * widths[i] for i in range(len(headers)))
    print(header_line)
    print(sep_line)

    # Rows
    for row in rows:
        line = " | ".join(str(cell).ljust(widths[i]) for i, cell in enumerate(row))
        print(line)


def format_output(data, fmt="summary", title=""):
    """Format output based on format type."""
    if fmt == "json":
        print(json.dumps(data, indent=2, default=str))
    elif fmt == "table":
        if isinstance(data, dict):
            rows = [[k, str(v)] for k, v in data.items()]
            print_table(["Key", "Value"], rows)
        elif isinstance(data, list) and data:
            if isinstance(data[0], dict):
                headers = list(data[0].keys())
                rows = [[str(row.get(h, "")) for h in headers] for row in data]
                print_table(headers, rows)
            else:
                for item in data:
                    print(item)
        else:
            print(json.dumps(data, indent=2, default=str))
    else:
        # summary mode — caller handles formatting
        if isinstance(data, str):
            print(data)
        else:
            print(json.dumps(data, indent=2, default=str))


# --- History / Snapshots ---
def save_snapshot(name, data):
    """Save a snapshot to the history directory."""
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"{ts}_{name}.json"
    filepath = HISTORY_DIR / filename
    with open(filepath, "w") as f:
        json.dump({"timestamp": ts, "name": name, "data": data}, f, indent=2, default=str)
    print(f"Snapshot saved: {filepath}", file=sys.stderr)
    return filepath


def load_previous_snapshot(name):
    """Load the most recent previous snapshot for a given name."""
    if not HISTORY_DIR.exists():
        return None
    files = sorted(HISTORY_DIR.glob(f"*_{name}.json"), reverse=True)
    if len(files) < 2:
        return None
    # Return the second most recent (skip the one we just saved)
    with open(files[1]) as f:
        return json.load(f)


def prune_old_snapshots(name, keep=30):
    """Keep only the most recent N snapshots of a given name."""
    if not HISTORY_DIR.exists():
        return
    files = sorted(HISTORY_DIR.glob(f"*_{name}.json"), reverse=True)
    for f in files[keep:]:
        f.unlink()
        print(f"Pruned old snapshot: {f.name}", file=sys.stderr)


# --- Logging ---
def log_operation(command, args_dict, result_summary=""):
    """Log an API operation."""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"[{ts}] {command} | args={json.dumps(args_dict, default=str)} | {result_summary}\n"
    log_file = LOGS_DIR / f"{datetime.now().strftime('%Y-%m-%d')}.log"
    with open(log_file, "a") as f:
        f.write(log_line)


# --- API Commands ---

def cmd_test_auth(args):
    """Validate API key by calling /users/api-keys/me."""
    result = api_get("users/api-keys/me")

    log_operation("test-auth", {}, f"success={bool(result)}")

    if args.format == "json":
        format_output(result, "json")
    else:
        print("Authentication successful!")
        if isinstance(result, dict):
            if "shopDomain" in result:
                print(f"  Shop: {result['shopDomain']}")
            if "name" in result:
                print(f"  Key name: {result['name']}")
            if "scopes" in result:
                scopes = result["scopes"]
                if isinstance(scopes, list):
                    print(f"  Scopes: {', '.join(scopes)}")
                else:
                    print(f"  Scopes: {scopes}")
            if "createdAt" in result:
                print(f"  Created: {result['createdAt']}")


def cmd_summary(args):
    """Fetch summary page data."""
    start = args.start or default_start()
    end = args.end or default_end()
    shop = get_shop_domain()

    payload = build_periods_payload(shop, start, end)

    # Add channel filter if specified
    if args.channel:
        payload["channel"] = args.channel

    # Add metrics filter if specified
    if args.metrics:
        payload["metrics"] = args.metrics.split(",")

    result = api_post("summary-page/get-data", payload)

    # Save snapshot if requested
    if args.save:
        save_snapshot("summary", result)
        prune_old_snapshots("summary")

    log_operation("summary", {"start": start, "end": end, "channel": args.channel},
                  f"keys={len(result) if isinstance(result, dict) else 'N/A'}")

    metrics = extract_metrics_map(result)

    # Dump all metrics for discovery
    if getattr(args, "dump_all", False):
        print(f"ALL metric IDs returned by TW ({len(metrics)} total):")
        print()
        for mid in sorted(metrics.keys()):
            m = metrics[mid]
            val = m["current"]
            mtype = m["type"]
            title = m["title"]
            display = format_tw_metric(mtype, val, metric_id=mid)
            print(f"  {mid:<40} {title:<35} {mtype:<10} {display}")
        return

    if args.format == "json":
        format_output(result, "json")
    elif args.format == "table":
        rows = []
        for mid in BLENDED_METRIC_IDS + PIXEL_METRIC_IDS:
            if mid in metrics:
                m = metrics[mid]
                if m["current"] is None or m["current"] == 0:
                    continue
                val = format_tw_metric(m["type"], m["current"], metric_id=mid)
                prev = format_tw_metric(m["type"], m["previous"], metric_id=mid)
                delta = f"{m['delta']}%" if m["delta"] is not None else ""
                rows.append([m["title"], val, prev, delta])
        if rows:
            print_table(["Metric", "Current", "Previous", "Delta %"], rows, min_widths=[30, 15, 15, 8])
        else:
            format_output(result, "json")
    else:
        # Summary format (Slack-friendly)
        channel_label = f" ({args.channel})" if args.channel else ""
        date_range = format_date_range(start, end)
        print(f"VitaHustle — Triple Whale Summary{channel_label} ({date_range})")
        print()

        if not metrics:
            print(json.dumps(result, indent=2, default=str))
        else:
            # Blended metrics
            print("Blended Metrics:")
            for mid in BLENDED_METRIC_IDS:
                if mid in metrics:
                    m = metrics[mid]
                    val = format_tw_metric(m["type"], m["current"], metric_id=mid)
                    delta_str = ""
                    if m["delta"] is not None and m["delta"] != 0:
                        sign = "+" if m["delta"] > 0 else ""
                        delta_str = f"  ({sign}{m['delta']}%)"
                    print(f"  {m['title'] + ':':<30} {val}{delta_str}")

            # Facebook metrics if present and not channel-filtered
            if not args.channel:
                fb_rows = [(mid, metrics[mid]) for mid in FACEBOOK_METRIC_IDS if mid in metrics
                           and metrics[mid]["current"] is not None and metrics[mid]["current"] != 0]
                if fb_rows:
                    print()
                    print("Facebook Ads:")
                    for mid, m in fb_rows:
                        val = format_tw_metric(m["type"], m["current"], metric_id=mid)
                        print(f"  {m['title'] + ':':<30} {val}")

                # Google metrics
                g_rows = [(mid, metrics[mid]) for mid in GOOGLE_METRIC_IDS if mid in metrics
                          and metrics[mid]["current"] is not None and metrics[mid]["current"] != 0]
                if g_rows:
                    print()
                    print("Google Ads:")
                    for mid, m in g_rows:
                        val = format_tw_metric(m["type"], m["current"], metric_id=mid)
                        print(f"  {m['title'] + ':':<30} {val}")

            # Pixel / Traffic metrics
            px_rows = [(mid, metrics[mid]) for mid in PIXEL_METRIC_IDS if mid in metrics
                       and metrics[mid]["current"] is not None and metrics[mid]["current"] != 0]
            if px_rows:
                print()
                print("Traffic / Pixel:")
                for mid, m in px_rows:
                    val = format_tw_metric(m["type"], m["current"], metric_id=mid)
                    delta_str = ""
                    if m["delta"] is not None and m["delta"] != 0:
                        sign = "+" if m["delta"] > 0 else ""
                        delta_str = f"  ({sign}{m['delta']}%)"
                    print(f"  {m['title'] + ':':<30} {val}{delta_str}")


def cmd_attribution(args):
    """Fetch order-level attribution data."""
    start = args.start or default_start()
    end = args.end or default_end()
    shop = get_shop_domain()

    # Resolve model shortcut
    model = ATTRIBUTION_MODELS.get(args.model, args.model)

    payload = build_periods_payload(shop, start, end)
    payload["attributionModel"] = model

    if args.limit:
        payload["limit"] = args.limit

    result = api_post("attribution/get-orders-with-journeys-v2", payload)

    log_operation("attribution", {"start": start, "end": end, "model": model, "limit": args.limit},
                  f"orders={len(result.get('orders', result.get('data', []))) if isinstance(result, dict) else 'N/A'}")

    # Dump raw field structure for discovery
    if getattr(args, "dump_fields", False):
        print("RAW RESPONSE TOP-LEVEL KEYS:")
        for k, v in result.items():
            vtype = type(v).__name__
            if isinstance(v, list):
                print(f"  {k}: list[{len(v)}]")
            elif isinstance(v, dict):
                print(f"  {k}: dict({len(v)} keys)")
            else:
                print(f"  {k}: {vtype} = {v}")

        orders_raw = result.get("ordersWithJourneys", result.get("orders", result.get("data", [])))
        if isinstance(orders_raw, list) and orders_raw:
            print()
            print(f"FIRST ORDER — ALL KEYS ({len(orders_raw[0])} fields):")
            for k, v in sorted(orders_raw[0].items()):
                if isinstance(v, dict):
                    print(f"  {k}: dict({len(v)} keys) → {list(v.keys())[:8]}")
                elif isinstance(v, list):
                    print(f"  {k}: list[{len(v)}]")
                    if v and isinstance(v[0], dict):
                        print(f"    [0] keys: {sorted(v[0].keys())}")
                else:
                    print(f"  {k}: {type(v).__name__} = {str(v)[:80]}")

            # Also dump touchpoint structure if available
            att = orders_raw[0].get("attribution", {})
            if att:
                print()
                print(f"ATTRIBUTION MODELS AVAILABLE: {sorted(att.keys())}")
                for model_key, tps in att.items():
                    if isinstance(tps, list) and tps:
                        print(f"  {model_key}[0] keys: {sorted(tps[0].keys())}")
                        break
        return

    if args.format == "json":
        format_output(result, "json")
    elif args.format == "table":
        orders = result.get("orders", result.get("data", []))
        if isinstance(orders, list) and orders:
            rows = []
            for order in orders[:args.limit or 50]:
                ctype = (order.get("customerType") or order.get("customer_type") or "?").capitalize()
                rows.append([
                    order.get("orderId", order.get("id", "N/A")),
                    order.get("createdAt", order.get("date", "N/A")),
                    format_currency(order.get("totalPrice", order.get("revenue", 0))),
                    order.get("attributedChannel", order.get("channel", "N/A")),
                    ctype[:3],
                    str(len(order.get("journey", order.get("touchpoints", [])))),
                ])
            print_table(
                ["Order ID", "Date", "Revenue", "Attributed To", "Type", "TPs"],
                rows,
                min_widths=[15, 12, 12, 20, 5, 5],
            )
        else:
            format_output(result, "json")
    else:
        # Summary format
        date_range = format_date_range(start, end)
        model_display = args.model.upper() if args.model in ATTRIBUTION_MODELS else model
        print(f"VitaHustle — Attribution Report [{model_display}] ({date_range})")
        print()

        orders = result.get("orders", result.get("data", []))
        if isinstance(orders, list):
            # Count new vs returning across all orders
            total_new = sum(1 for o in orders
                           if (o.get("customerType") or o.get("customer_type") or "").lower() == "new")
            nc_pct = (total_new / len(orders) * 100) if orders else 0
            print(f"Orders returned: {len(orders)} ({nc_pct:.0f}% new customers)")
            print()

            # Summarize by channel
            channel_totals = {}
            for order in orders:
                ch = order.get("attributedChannel", order.get("channel", "Unknown"))
                rev = float(order.get("totalPrice", order.get("revenue", 0)) or 0)
                ctype = (order.get("customerType") or order.get("customer_type") or "").lower()
                is_new = ctype == "new"
                if ch not in channel_totals:
                    channel_totals[ch] = {"orders": 0, "revenue": 0, "new": 0}
                channel_totals[ch]["orders"] += 1
                channel_totals[ch]["revenue"] += rev
                if is_new:
                    channel_totals[ch]["new"] += 1

            if channel_totals:
                print("Attribution by Channel:")
                for ch, data in sorted(channel_totals.items(), key=lambda x: x[1]["revenue"], reverse=True):
                    ch_nc = (data["new"] / data["orders"] * 100) if data["orders"] > 0 else 0
                    print(f"  {ch}: {data['orders']} orders ({ch_nc:.0f}% NC) | {format_currency(data['revenue'])} revenue")

            # Show first few orders with journeys
            print()
            show_count = min(args.limit or 5, len(orders), 10)
            print(f"Sample Orders (showing {show_count}):")
            for order in orders[:show_count]:
                order_id = order.get("orderId", order.get("id", "N/A"))
                revenue = format_currency(order.get("totalPrice", order.get("revenue", 0)))
                channel = order.get("attributedChannel", order.get("channel", "N/A"))
                journey = order.get("journey", order.get("touchpoints", []))
                print(f"  #{order_id}: {revenue} — attributed to {channel} ({len(journey)} touchpoints)")
        else:
            print(json.dumps(result, indent=2, default=str))


def cmd_compare(args):
    """Compare TW-tracked Facebook metrics vs blended metrics.

    Since TW's summary endpoint returns Facebook self-reported metrics alongside
    blended/pixel data, we can show both in a comparison table.
    """
    start = args.start or default_start()
    end = args.end or default_end()
    shop = get_shop_domain()

    # Resolve model shortcut
    model_key = args.model or "ti"
    model_display = model_key.upper() if model_key in ATTRIBUTION_MODELS else model_key

    # Fetch blended summary (includes both FB self-reported and pixel data)
    payload = build_periods_payload(shop, start, end)
    result = api_post("summary-page/get-data", payload)

    log_operation("compare", {"start": start, "end": end, "model": model_key},
                  "blended fetched")

    metrics = extract_metrics_map(result)
    date_range = format_date_range(start, end)

    if args.format == "json":
        format_output(result, "json")
        return

    print(f"TW vs Meta Reported — {date_range}")
    print()

    if not metrics:
        print("ERROR: No metrics returned.", file=sys.stderr)
        print(json.dumps(result, indent=2, default=str))
        return

    # TW tracks both Facebook self-reported AND pixel-attributed data
    # Facebook self-reported: facebookAds (spend), facebookConversionValue (revenue),
    #   facebookRoas, facebookPurchases, facebookCpa
    # Pixel/blended: sales, roas, shopifyOrders, etc.
    comparison = [
        # (Label, FB metric ID, Blended metric ID)
        ("Ad Spend", "facebookAds", None),
        ("Revenue (FB Reported)", "facebookConversionValue", "sales"),
        ("ROAS", "facebookRoas", "roas"),
        ("Purchases", "facebookPurchases", "shopifyOrders"),
        ("CPA", "facebookCpa", "totalCpa"),
        ("Impressions", "facebookImpressions", None),
        ("Clicks", "facebookClicks", None),
        ("CTR", "facebookCtr", None),
        ("CPM", "facebookCpm", None),
        ("CPC", "facebookCpc", None),
    ]

    headers = ["Metric", "Facebook Reported", "TW Blended/Pixel", "Delta"]
    rows = []

    for label, fb_id, blended_id in comparison:
        fb_m = metrics.get(fb_id)
        bl_m = metrics.get(blended_id) if blended_id else None

        if fb_m is None:
            continue

        fb_val = fb_m["current"]
        fb_display = format_tw_metric(fb_m["type"], fb_val, metric_id=fb_id)

        if bl_m and bl_m["current"] is not None:
            bl_val = bl_m["current"]
            bl_display = format_tw_metric(bl_m["type"], bl_val, metric_id=blended_id)
            delta = format_delta(bl_val, fb_val) if fb_val and bl_val else "—"
        else:
            bl_display = "—"
            delta = "—"

        rows.append([label, fb_display, bl_display, delta])

    if rows:
        print_table(headers, rows, min_widths=[22, 18, 18, 8])
    else:
        print("No Facebook metrics found in response.")

    # Blended context
    blended_context_ids = ["sales", "totalNetProfit", "blendedAds", "roas", "mer",
                           "newCustomersPercent", "pixelPercentNewVisitors"]
    context_rows = [(mid, metrics[mid]) for mid in blended_context_ids if mid in metrics]
    if context_rows:
        print()
        print("Blended Context:")
        for mid, m in context_rows:
            val = format_tw_metric(m["type"], m["current"], metric_id=mid)
            print(f"  {m['title'] + ':':<25} {val}")

    print()
    print("Note: For Meta's own self-reported numbers, also run:")
    print("  uv run .../meta_api_helper.py report --date-preset last_7d")
    print("Agent cross-skill orchestration will do this automatically.")


def cmd_channels(args):
    """List available channels with spend from the summary metrics.

    Uses a hybrid approach: known channels have pretty labels and explicit
    metric ID mappings. Unknown channels are auto-detected by scanning for
    metric IDs ending in 'Ads' (spend pattern) with non-zero values.
    """
    start = args.start or default_start()
    end = args.end or default_end()
    shop = get_shop_domain()

    payload = build_periods_payload(shop, start, end)
    result = api_post("summary-page/get-data", payload)

    metrics = extract_metrics_map(result)

    log_operation("channels", {"start": start, "end": end},
                  f"metrics={len(metrics)}")

    if args.format == "json":
        format_output(result, "json")
        return

    date_range = format_date_range(start, end)
    print(f"VitaHustle — Active Channels ({date_range})")
    print()

    # Known channels: (label, prefix, spend_id, roas_id, purchases_id, revenue_id)
    # prefix is used to mark these as "handled" so dynamic detection skips them
    KNOWN_CHANNELS = [
        ("Facebook",    "facebook",    "facebookAds",    "facebookRoas",    "facebookPurchases",            "facebookConversionValue"),
        ("Google",      "google",      "googleAds",      "googleRoas",      "ga_all_transactions_adGroup",  "googleConversionValue"),
        ("TikTok Ads",  "tiktok",      "tiktokAds",      "tiktokRoas",      "tiktokPurchases",              "tiktokConversionValue"),
        ("TikTok Shop", "tiktokShops", None,             None,              None,                           "tiktokShopsSales"),
        ("Snapchat",    "snapchat",    "snapchatAds",    "snapchatRoas",    "snapchatConversionPurchases",  "snapchatConversionValue"),
        ("Pinterest",   "pinterest",   "pinterestAds",   "pinterestRoas",   "pinterestPurchases",           "pinterestConversionValue"),
        ("Amazon Ads",  "amazon",      "amazonAds",      "amazonROAS",      "amazonPurchases",              "amazonAdsConversionValue"),
        ("Klaviyo",     "klaviyo",     None,             None,              None,                           "klaviyoPlacedOrderSales"),
        ("Attentive",   "attentive",   None,             None,              None,                           "attentivePlacedOrderSales"),
        ("Influencers", "influencer",  "influencerSpend","influencerRoas",  "influencerPurchases",          "influencerConversionValue"),
    ]

    handled_prefixes = {ch[1] for ch in KNOWN_CHANNELS}
    rows = []

    # 1) Known channels
    for label, prefix, spend_id, roas_id, purch_id, rev_id in KNOWN_CHANNELS:
        spend_val = metrics[spend_id]["current"] if spend_id and spend_id in metrics else 0
        roas_val = metrics[roas_id]["current"] if roas_id and roas_id in metrics else None
        purch_val = metrics[purch_id]["current"] if purch_id and purch_id in metrics else 0
        rev_val = metrics[rev_id]["current"] if rev_id and rev_id in metrics else 0

        if (not spend_val or spend_val == 0) and (not rev_val or rev_val == 0):
            continue

        rows.append([
            label,
            format_currency(spend_val) if spend_val else "—",
            format_currency(rev_val) if rev_val else "—",
            format_roas(roas_val) if roas_val else "—",
            format_number(purch_val) if purch_val else "—",
        ])

    # 2) Dynamic detection: scan for any *Ads metric with non-zero spend
    #    that doesn't match a known prefix
    for mid, m in metrics.items():
        if not mid.endswith("Ads"):
            continue
        # Derive prefix (e.g., "redditAds" -> "reddit")
        prefix = mid[:-3]  # strip "Ads"
        # Skip aggregates that aren't real channels
        if not prefix or prefix.lower() in {p.lower() for p in handled_prefixes} \
                or prefix.lower() in ("blended", "total", "custom", "api"):
            continue
        spend_val = m["current"]
        if not spend_val or spend_val == 0:
            continue

        # Try to find matching roas/purchases/revenue metrics
        roas_m = metrics.get(f"{prefix}Roas", metrics.get(f"{prefix}ROAS"))
        purch_m = metrics.get(f"{prefix}Purchases", metrics.get(f"{prefix}Conversions"))
        rev_m = metrics.get(f"{prefix}ConversionValue")

        label = prefix[0].upper() + prefix[1:]  # Title case the prefix
        # Clean up common patterns
        label = label.replace("Ads", "").replace("ads", "").strip()
        if not label:
            label = mid

        rows.append([
            label,
            format_currency(spend_val),
            format_currency(rev_m["current"]) if rev_m and rev_m["current"] else "—",
            format_roas(roas_m["current"]) if roas_m and roas_m["current"] else "—",
            format_number(purch_m["current"]) if purch_m and purch_m["current"] else "—",
        ])

    if rows:
        print_table(
            ["Channel", "Spend", "Revenue", "ROAS", "Orders"],
            rows,
            min_widths=[15, 12, 12, 8, 8],
        )
    else:
        print("No active channels found with spend or revenue.")


def cmd_metrics(args):
    """Search or list available TW metrics by keyword.

    Fetches the full summary response and filters metrics by a search term.
    Without a search term, lists all non-zero metrics.
    """
    start = args.start or default_start()
    end = args.end or default_end()
    shop = get_shop_domain()

    payload = build_periods_payload(shop, start, end)
    result = api_post("summary-page/get-data", payload)
    metrics = extract_metrics_map(result)
    date_range = format_date_range(start, end)

    search = (getattr(args, "search", "") or "").lower().strip()

    log_operation("metrics", {"start": start, "end": end, "search": search},
                  f"total={len(metrics)}")

    matches = []
    for mid in sorted(metrics.keys()):
        m = metrics[mid]
        if m["current"] is None:
            continue
        # Filter: skip zero values unless searching
        if not search and (m["current"] == 0 or m["current"] == 0.0):
            continue
        # Apply search filter
        if search:
            searchable = f"{mid} {m['title']}".lower()
            if search not in searchable:
                continue
        matches.append((mid, m))

    if args.format == "json":
        json_data = []
        for mid, m in matches:
            json_data.append({
                "id": mid, "title": m["title"], "type": m["type"],
                "current": m["current"], "previous": m["previous"], "delta": m["delta"],
            })
        print(json.dumps(json_data, indent=2, default=str))
        return

    search_label = f" matching '{search}'" if search else " (non-zero)"
    print(f"VitaHustle — TW Metrics{search_label} ({date_range})")
    print(f"{len(matches)} metrics")
    print()

    if not matches:
        print("No matching metrics found.")
        if search:
            print(f"Try a broader search term. Total metrics available: {len(metrics)}")
        return

    rows = []
    for mid, m in matches:
        val = format_tw_metric(m["type"], m["current"], metric_id=mid)
        prev = format_tw_metric(m["type"], m["previous"], metric_id=mid) if m["previous"] is not None else ""
        delta_str = f"{m['delta']}%" if m["delta"] is not None else ""
        rows.append([mid, m["title"], val, prev, delta_str])

    print_table(
        ["Metric ID", "Title", "Current", "Previous", "Delta"],
        rows,
        min_widths=[35, 30, 12, 12, 8],
    )


# --- Aggregation Helpers (ads / adsets / campaigns) ---

# Attribution model keys as returned by TW API
JOURNEY_MODELS = {
    "lpc": "lastPlatformClick",
    "last": "fullLastClick",
    "first": "fullFirstClick",
    "linear": "linear",
    "linear-all": "linearAll",
}

# Map friendly --source names to TW source strings
SOURCE_ALIASES = {
    "meta": "facebook-ads",
    "facebook": "facebook-ads",
    "fb": "facebook-ads",
    "google": "google-ads",
    "snap": "snapchat-ads",
    "snapchat": "snapchat-ads",
    "tiktok": "tiktok-ads",
    "klaviyo": "klaviyo",
    "email": "klaviyo",
}


# --- Meta Graph API Name Resolution ---

def _load_meta_credentials():
    """Load Meta API credentials from the profile's meta-ads skill .env.

    The meta-ads skill .env has the correct per-profile META_AD_ACCOUNT_ID
    (which differs per brand). Shell env may have a different profile's value,
    so we always read from the skill .env and return the credentials directly
    rather than relying on os.environ.

    Returns (access_token, ad_account_id, api_version).
    """
    meta_env = PROFILE_ROOT / "skills" / "meta-ads" / ".env"
    meta_vars = {}
    if meta_env.exists():
        with open(meta_env) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, _, value = line.partition("=")
                    meta_vars[key.strip()] = value.strip().strip('"').strip("'")

    # Skill .env takes priority for per-profile credentials,
    # fall back to os.environ for shared credentials like access token
    token = meta_vars.get("META_ACCESS_TOKEN") or os.environ.get("META_ACCESS_TOKEN", "")
    account_id = meta_vars.get("META_AD_ACCOUNT_ID") or os.environ.get("META_AD_ACCOUNT_ID", "")
    api_version = meta_vars.get("META_API_VERSION") or os.environ.get("META_API_VERSION", "v24.0")

    return token, account_id, api_version


def _fetch_meta_name_map(start, end):
    """Fetch ad/adset/campaign ID-to-name mappings and spend from Meta Insights API.

    Makes a single API call at level=ad which returns all three levels of names
    plus spend data for each ad.

    Returns (campaign_map, adset_map, ad_map, spend_maps) where:
    - campaign_map, adset_map, ad_map: {id: name}
    - spend_maps: {
        "adId": {id: spend_float},
        "adsetId": {id: spend_float},
        "campaignId": {id: spend_float},
      }
    Returns empty dicts if Meta credentials are unavailable.
    """
    token, account_id, api_version = _load_meta_credentials()

    empty_spend = {"adId": {}, "adsetId": {}, "campaignId": {}}

    if not token or not account_id:
        return {}, {}, {}, empty_spend

    # Ensure account_id has act_ prefix
    if not account_id.startswith("act_"):
        account_id = f"act_{account_id}"

    fields = "ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,spend"
    time_range = json.dumps({"since": start, "until": end})
    params = urllib.parse.urlencode({
        "fields": fields,
        "level": "ad",
        "time_range": time_range,
        "limit": "500",
        "access_token": token,
    })
    url = f"https://graph.facebook.com/{api_version}/{account_id}/insights?{params}"

    campaign_map = {}
    adset_map = {}
    ad_map = {}
    # Spend accumulators — ad-level spend is per row, adset/campaign need summing
    ad_spend = {}       # {ad_id: total_spend}
    adset_spend = {}    # {adset_id: total_spend}
    campaign_spend = {} # {campaign_id: total_spend}

    def _extract_data(rows):
        for row in rows:
            spend_val = float(row.get("spend", 0) or 0)
            cid = row.get("campaign_id", "")
            if cid:
                campaign_map[cid] = row.get("campaign_name", cid)
                campaign_spend[cid] = campaign_spend.get(cid, 0.0) + spend_val
            asid = row.get("adset_id", "")
            if asid:
                adset_map[asid] = row.get("adset_name", asid)
                adset_spend[asid] = adset_spend.get(asid, 0.0) + spend_val
            aid = row.get("ad_id", "")
            if aid:
                ad_map[aid] = row.get("ad_name", aid)
                ad_spend[aid] = ad_spend.get(aid, 0.0) + spend_val

    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        _extract_data(data.get("data", []))

        # Follow pagination if present
        next_url = data.get("paging", {}).get("next")
        pages = 0
        while next_url and pages < 4:
            pages += 1
            req = urllib.request.Request(next_url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            _extract_data(data.get("data", []))
            next_url = data.get("paging", {}).get("next")

    except Exception as e:
        print(f"Meta name/spend resolution failed: {e}", file=sys.stderr)

    spend_maps = {
        "adId": ad_spend,
        "adsetId": adset_spend,
        "campaignId": campaign_spend,
    }

    return campaign_map, adset_map, ad_map, spend_maps


def _resolve_names(groups, group_key, name_maps):
    """Replace numeric IDs with human-readable names in aggregated groups.

    Args:
        groups: dict from _aggregate_orders {id: {orders, revenue, ...}}
        group_key: which touchpoint field was grouped ('adId', 'adsetId', 'campaignId')
        name_maps: tuple of (campaign_map, adset_map, ad_map)

    Returns new dict with names as keys where available. Unresolved IDs keep
    their numeric key with a (?) suffix.
    """
    campaign_map, adset_map, ad_map = name_maps
    lookup = {
        "adId": ad_map,
        "adsetId": adset_map,
        "campaignId": campaign_map,
    }.get(group_key, {})

    if not lookup:
        return groups

    resolved = {}
    for key, data in groups.items():
        name = lookup.get(key)
        if name:
            display = name
        elif key.isdigit() or (key.startswith("12") and len(key) > 10):
            display = f"{key} (?)"
        else:
            display = key
        # Handle name collisions (multiple IDs same name) by summing
        if display in resolved:
            existing = resolved[display]
            existing["orders"] += data["orders"]
            existing["revenue"] += data["revenue"]
            existing["nc_orders"] = existing.get("nc_orders", 0) + data.get("nc_orders", 0)
            existing["spend"] = existing.get("spend", 0.0) + data.get("spend", 0.0)
            existing["sources"] = sorted(set(existing["sources"]) | set(data["sources"]))
            existing["aov"] = existing["revenue"] / existing["orders"] if existing["orders"] > 0 else 0
            existing["nc_pct"] = (existing["nc_orders"] / existing["orders"] * 100) if existing["orders"] > 0 else 0
            # Recompute CAC and ROAS after merge
            existing["cac"] = existing["spend"] / existing["orders"] if existing["orders"] > 0 and existing["spend"] > 0 else 0.0
            existing["roas"] = existing["revenue"] / existing["spend"] if existing["spend"] > 0 else 0.0
        else:
            resolved[display] = dict(data)
    return resolved


def _fetch_attribution_orders(args, max_pages=5):
    """Fetch orders from the attribution endpoint with pagination.

    Uses the real TW API format: { shop, startDate, endDate, page }.
    Paginates up to max_pages (100 orders/page).

    Returns (orders, start_date, end_date, total_for_range).
    """
    start = args.start or default_start()
    end = args.end or default_end()
    shop = get_shop_domain()

    all_orders = []
    total_for_range = 0
    page = 1

    while page <= max_pages:
        payload = {
            "shop": shop,
            "startDate": start,
            "endDate": end,
            "page": page,
        }
        result = api_post("attribution/get-orders-with-journeys-v2", payload)
        orders = result.get("ordersWithJourneys", [])
        if not isinstance(orders, list):
            break
        all_orders.extend(orders)
        total_for_range = result.get("totalForRange", len(all_orders))

        if result.get("finishedRange", True) or not orders:
            break
        page += 1

    return all_orders, start, end, total_for_range


def _resolve_source(source_arg):
    """Resolve a user-friendly source name to the TW API source string."""
    if not source_arg:
        return None
    lower = source_arg.lower().strip()
    return SOURCE_ALIASES.get(lower, lower)


def _aggregate_orders(orders, group_key, model_key, source_filter=None,
                      campaign_filter=None):
    """Aggregate orders by ad/adset/campaign from attribution touchpoints.

    Args:
        orders: list of order dicts from the TW attribution API
        group_key: touchpoint field to group by ('adId', 'adsetId', 'campaignId')
        model_key: attribution model key ('lastPlatformClick', 'linear', etc.)
        source_filter: only count touchpoints from this source (e.g., 'facebook-ads')
        campaign_filter: only count touchpoints matching this campaignId

    Returns dict of { id: { orders, revenue, aov, nc_orders, nc_pct, sources } }
    """
    groups = {}

    for order in orders:
        att = order.get("attribution", {})
        touchpoints = att.get(model_key, [])
        if not touchpoints:
            continue

        # Apply source filter
        if source_filter:
            touchpoints = [t for t in touchpoints
                           if (t.get("source", "") or "").lower() == source_filter.lower()]
        if not touchpoints:
            continue

        # Apply campaign filter
        if campaign_filter:
            touchpoints = [t for t in touchpoints
                           if str(t.get("campaignId", "")) == campaign_filter]
        if not touchpoints:
            continue

        revenue = float(order.get("total_price", 0) or 0)
        order_id = order.get("order_id", "")
        # Check new vs returning — TW uses customerType or customer_type
        ctype = (order.get("customerType") or order.get("customer_type") or "").lower()
        is_new = ctype == "new"

        # Distribute revenue equally among qualifying touchpoints
        credit_per = revenue / len(touchpoints)

        for tp in touchpoints:
            key_val = str(tp.get(group_key, "") or "").strip()
            if not key_val:
                key_val = "(none)"
            source = tp.get("source", "unknown")

            if key_val not in groups:
                groups[key_val] = {
                    "order_ids": set(),
                    "new_order_ids": set(),
                    "revenue": 0.0,
                    "sources": set(),
                }
            g = groups[key_val]
            g["order_ids"].add(order_id)
            if is_new:
                g["new_order_ids"].add(order_id)
            g["revenue"] += credit_per
            g["sources"].add(source)

    # Finalize metrics
    for g in groups.values():
        g["orders"] = len(g["order_ids"])
        g["nc_orders"] = len(g["new_order_ids"])
        del g["order_ids"]
        del g["new_order_ids"]
        g["aov"] = g["revenue"] / g["orders"] if g["orders"] > 0 else 0
        g["nc_pct"] = (g["nc_orders"] / g["orders"] * 100) if g["orders"] > 0 else 0
        g["sources"] = sorted(g["sources"])

    return groups


def _print_aggregated(groups, group_label, sort_by, limit, fmt, date_range,
                      model_display, filters="", total_for_range=0, fetched=0):
    """Print aggregated order data in the requested format."""
    sort_keys = {
        "revenue": lambda x: x[1]["revenue"],
        "orders": lambda x: x[1]["orders"],
        "aov": lambda x: x[1]["aov"],
        "spend": lambda x: x[1].get("spend", 0),
        "cac": lambda x: x[1].get("cac", 0),
        "roas": lambda x: x[1].get("roas", 0),
    }
    sort_fn = sort_keys.get(sort_by, sort_keys["revenue"])
    sorted_groups = sorted(groups.items(), key=sort_fn, reverse=True)

    if limit and limit > 0:
        sorted_groups = sorted_groups[:limit]

    if fmt == "json":
        json_data = []
        for name, data in sorted_groups:
            entry = {group_label.lower().replace(" ", "_"): name}
            entry.update(data)
            json_data.append(entry)
        print(json.dumps(json_data, indent=2, default=str))
        return

    if not sorted_groups:
        print(f"No {group_label.lower()}s found.")
        return

    total_orders = sum(g["orders"] for _, g in sorted_groups)
    total_nc = sum(g.get("nc_orders", 0) for _, g in sorted_groups)
    total_rev = sum(g["revenue"] for _, g in sorted_groups)
    total_spend = sum(g.get("spend", 0) for _, g in sorted_groups)
    has_spend = total_spend > 0
    has_nc = total_nc > 0
    total_nc_pct = (total_nc / total_orders * 100) if total_orders > 0 and has_nc else 0

    print(f"VitaHustle — {group_label}s [{model_display}] ({date_range}){filters}")
    count_line = f"{len(sorted_groups)} {group_label.lower()}s | {total_orders} orders"
    if has_nc:
        count_line += f" ({total_nc_pct:.0f}% NC)"
    count_line += f" | {format_currency(total_rev)} revenue"
    if has_spend:
        blended_cac = total_spend / total_orders if total_orders > 0 else 0
        blended_roas = total_rev / total_spend if total_spend > 0 else 0
        count_line += f" | {format_currency(total_spend)} spend | {format_currency(blended_cac)} CAC | {blended_roas:.2f}x ROAS"
    if total_for_range and fetched < total_for_range:
        count_line += f"  (from {fetched}/{total_for_range} orders fetched)"
    print(count_line)
    if has_spend:
        note = "spend from Meta Ads, revenue/orders from TW attribution"
        if has_nc:
            note = "spend from Meta Ads, revenue/orders/NC% from TW attribution"
        print(f"({note})")
    print()

    rows = []
    for name, g in sorted_groups:
        display_name = (name[:45] + "...") if len(name) > 48 else name
        source_str = ", ".join(g["sources"]) if isinstance(g.get("sources"), list) else ""
        row = [
            display_name,
            source_str[:14],
            str(g["orders"]),
        ]
        if has_nc:
            nc_pct = g.get("nc_pct", 0)
            row.append(f"{nc_pct:.0f}%" if nc_pct > 0 else "-")
        row.append(format_currency(g["revenue"]))
        if has_spend:
            row.extend([
                format_currency(g.get("spend", 0)),
                format_currency(g.get("cac", 0)) if g.get("cac", 0) > 0 else "-",
                format_roas(g.get("roas", 0)) if g.get("roas", 0) > 0 else "-",
            ])
        else:
            row.append(format_currency(g["aov"]))
        rows.append(row)

    if has_spend:
        if has_nc:
            print_table(
                [group_label, "Source", "Orders", "NC%", "Revenue", "Spend", "CAC", "ROAS"],
                rows,
                min_widths=[30, 14, 8, 5, 12, 12, 10, 8],
            )
        else:
            print_table(
                [group_label, "Source", "Orders", "Revenue", "Spend", "CAC", "ROAS"],
                rows,
                min_widths=[30, 14, 8, 12, 12, 10, 8],
            )
    else:
        if has_nc:
            print_table(
                [group_label, "Source", "Orders", "NC%", "Revenue", "AOV"],
                rows,
                min_widths=[30, 14, 8, 5, 12, 10],
            )
        else:
            print_table(
                [group_label, "Source", "Orders", "Revenue", "AOV"],
                rows,
                min_widths=[30, 14, 8, 12, 10],
            )


def _merge_meta_spend(groups, group_key, spend_maps):
    """Merge Meta spend data into aggregated groups and compute CAC + ROAS.

    For each group (ad/adset/campaign), looks up the Meta spend by the
    original numeric ID and adds spend, cac, and roas fields.
    """
    spend_map = spend_maps.get(group_key, {})
    if not spend_map:
        return

    for key, data in groups.items():
        # Try direct ID lookup
        spend = spend_map.get(key, 0.0)
        # Also try stripping (?) suffix for unresolved IDs
        if spend == 0.0 and key.endswith(" (?)"):
            spend = spend_map.get(key[:-4].strip(), 0.0)
        data["spend"] = spend
        data["cac"] = spend / data["orders"] if data["orders"] > 0 and spend > 0 else 0.0
        data["roas"] = data["revenue"] / spend if spend > 0 else 0.0


def _run_aggregation(args, group_key, group_label):
    """Shared logic for ads/adsets/campaigns commands."""
    orders, start, end, total = _fetch_attribution_orders(args)

    # Dump raw order structure for field discovery
    if getattr(args, "dump_fields", False):
        print(f"Fetched {len(orders)}/{total} orders from ordersWithJourneys endpoint")
        if orders:
            print()
            print(f"FIRST ORDER — ALL KEYS ({len(orders[0])} fields):")
            for k, v in sorted(orders[0].items()):
                if isinstance(v, dict):
                    subkeys = list(v.keys())[:10]
                    print(f"  {k}: dict({len(v)} keys) → {subkeys}")
                elif isinstance(v, list):
                    print(f"  {k}: list[{len(v)}]")
                    if v and isinstance(v[0], dict):
                        print(f"    [0] keys: {sorted(v[0].keys())}")
                else:
                    print(f"  {k}: {type(v).__name__} = {str(v)[:100]}")

            att = orders[0].get("attribution", {})
            if att:
                print()
                print(f"ATTRIBUTION MODEL KEYS: {sorted(att.keys())}")
                for mk, tps in att.items():
                    if isinstance(tps, list) and tps:
                        print(f"  {mk}[0] keys: {sorted(tps[0].keys())}")
                        break
        return

    model_key = JOURNEY_MODELS.get(args.model, args.model)
    model_display = args.model.upper()
    date_range = format_date_range(start, end)

    source_filter = _resolve_source(getattr(args, "source", None))
    campaign_filter = getattr(args, "campaign", None)
    no_names = getattr(args, "no_names", False)

    filters = ""
    if source_filter:
        filters += f" | source={source_filter}"
    if campaign_filter:
        filters += f" | campaign={campaign_filter}"

    groups = _aggregate_orders(orders, group_key, model_key,
                               source_filter=source_filter,
                               campaign_filter=campaign_filter)

    # Fetch Meta data (names + spend) and merge
    spend_maps = {}
    if not no_names and groups:
        has_numeric = any(k.isdigit() for k in groups if k != "(none)")
        if has_numeric:
            name_maps_result = _fetch_meta_name_map(start, end)
            # Unpack: 3 name maps + spend_maps dict
            campaign_map, adset_map, ad_map, spend_maps = name_maps_result
            name_maps = (campaign_map, adset_map, ad_map)
            resolved_count = sum(1 for m in name_maps if m)

            # Merge spend BEFORE name resolution (spend_maps use numeric IDs)
            _merge_meta_spend(groups, group_key, spend_maps)

            if resolved_count > 0:
                groups = _resolve_names(groups, group_key, name_maps)
    elif groups:
        # Even with --no-names, still fetch spend from Meta
        name_maps_result = _fetch_meta_name_map(start, end)
        _, _, _, spend_maps = name_maps_result
        _merge_meta_spend(groups, group_key, spend_maps)

    # Ensure all groups have spend/cac/roas fields (default 0 if Meta unavailable)
    for g in groups.values():
        g.setdefault("spend", 0.0)
        g.setdefault("cac", 0.0)
        g.setdefault("roas", 0.0)

    log_operation(group_label.lower(), {
        "start": start, "end": end, "model": model_key,
        "source": source_filter, "campaign": campaign_filter,
    }, f"{group_label.lower()}s={len(groups)} fetched={len(orders)}/{total}")

    _print_aggregated(groups, group_label, args.sort, args.limit, args.format,
                      date_range, model_display, filters,
                      total_for_range=total, fetched=len(orders))


def cmd_ads(args):
    """Ad-level attribution breakdown."""
    _run_aggregation(args, "adId", "Ad")


def cmd_adsets(args):
    """Ad set-level attribution breakdown."""
    _run_aggregation(args, "adsetId", "Ad Set")


def cmd_campaigns(args):
    """Campaign-level attribution breakdown."""
    _run_aggregation(args, "campaignId", "Campaign")


def cmd_moby(args):
    """Stub for Moby AI endpoint (requires OAuth)."""
    print("Moby AI (Natural Language Queries)")
    print("=" * 40)
    print()
    print("Status: REQUIRES OAUTH — not available with API key auth.")
    print()
    print("Moby allows natural-language questions like:")
    print('  "What was our best performing ad creative last week?"')
    print('  "Show me revenue by channel for the last 30 days"')
    print('  "Which campaigns have declining ROAS?"')
    print()
    print("To enable Moby:")
    print("  1. Register an OAuth app at developers.triplewhale.com")
    print("  2. Complete OAuth flow to get access + refresh tokens")
    print("  3. Update this script with OAuth token management")
    print()
    print("Endpoint: POST /orcabase/api/moby")
    print("Auth: Bearer token (OAuth)")


def cmd_sql(args):
    """Stub for SQL endpoint (requires OAuth)."""
    print("SQL Query Endpoint (ClickHouse)")
    print("=" * 40)
    print()
    print("Status: REQUIRES OAUTH — not available with API key auth.")
    print()
    print("The SQL endpoint allows direct ClickHouse queries against TW tables:")
    print("  - pixel_joined_tvf  — Pixel event data with attribution")
    print("  - blended_stats_tvf — Blended metrics by date/channel")
    print("  - orders_tvf        — Order data with customer info")
    print()
    print("Example query:")
    print('  SELECT date, channel, sum(revenue) as rev, sum(spend) as spend')
    print('  FROM blended_stats_tvf')
    print("  WHERE date >= '2026-02-01'")
    print('  GROUP BY date, channel')
    print('  ORDER BY date DESC')
    print()
    print("To enable SQL queries:")
    print("  1. Register an OAuth app at developers.triplewhale.com")
    print("  2. Complete OAuth flow to get access + refresh tokens")
    print("  3. Update this script with OAuth token management")
    print()
    print("Endpoint: POST /orcabase/api/sql")
    print("Auth: Bearer token (OAuth)")


# --- CLI Argument Parser ---
def build_parser():
    """Build the argument parser."""
    parser = argparse.ArgumentParser(
        prog="triple_whale_api_helper.py",
        description="Triple Whale API Helper — VitaHustle analytics source of truth",
    )
    parser.add_argument(
        "--format", choices=["json", "table", "summary"], default="summary",
        help="Output format (default: summary)",
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Shared format arg for all subparsers (so --format works before or after subcommand)
    fmt_kwargs = dict(choices=["json", "table", "summary"], default="summary",
                      help="Output format (default: summary)")

    # test-auth
    p_test = subparsers.add_parser("test-auth", help="Validate API key")
    p_test.add_argument("--format", **fmt_kwargs)

    # summary
    p_summary = subparsers.add_parser("summary", help="Dashboard metrics (summary page)")
    p_summary.add_argument("--format", **fmt_kwargs)
    p_summary.add_argument("--start", help="Start date (YYYY-MM-DD, default: 7 days ago)")
    p_summary.add_argument("--end", help="End date (YYYY-MM-DD, default: yesterday)")
    p_summary.add_argument("--channel", help="Filter by channel (e.g., meta, google, tiktok, email, sms)")
    p_summary.add_argument("--metrics", help="Comma-separated list of specific metrics to fetch")
    p_summary.add_argument("--save", action="store_true", help="Save snapshot to history/")
    p_summary.add_argument("--dump-all", action="store_true", dest="dump_all",
                           help="Dump ALL metric IDs returned by TW (for discovery)")

    # attribution
    p_attr = subparsers.add_parser("attribution", help="Order-level attribution with journeys")
    p_attr.add_argument("--format", **fmt_kwargs)
    p_attr.add_argument("--start", help="Start date (YYYY-MM-DD, default: 7 days ago)")
    p_attr.add_argument("--end", help="End date (YYYY-MM-DD, default: yesterday)")
    p_attr.add_argument(
        "--model", default="ti",
        help="Attribution model: ti (default), ta, ta-views, linear-all, linear-paid, first-click, last-click",
    )
    p_attr.add_argument("--limit", type=int, default=50, help="Max orders to return (default: 50)")
    p_attr.add_argument("--dump-fields", action="store_true", dest="dump_fields",
                        help="Dump all field names from the raw API response (for discovery)")

    # compare
    p_compare = subparsers.add_parser("compare", help="TW vs Meta side-by-side comparison")
    p_compare.add_argument("--format", **fmt_kwargs)
    p_compare.add_argument("--start", help="Start date (YYYY-MM-DD, default: 7 days ago)")
    p_compare.add_argument("--end", help="End date (YYYY-MM-DD, default: yesterday)")
    p_compare.add_argument("--model", default="ti", help="Attribution model for TW side (default: ti)")

    # channels
    p_channels = subparsers.add_parser("channels", help="List channels with spend")
    p_channels.add_argument("--format", **fmt_kwargs)
    p_channels.add_argument("--start", help="Start date (YYYY-MM-DD, default: 7 days ago)")
    p_channels.add_argument("--end", help="End date (YYYY-MM-DD, default: yesterday)")

    # metrics (search/list)
    p_metrics = subparsers.add_parser("metrics", help="Search or list all available TW metrics")
    p_metrics.add_argument("--format", **fmt_kwargs)
    p_metrics.add_argument("--start", help="Start date (YYYY-MM-DD, default: 7 days ago)")
    p_metrics.add_argument("--end", help="End date (YYYY-MM-DD, default: yesterday)")
    p_metrics.add_argument("search", nargs="?", default="",
                           help="Search keyword (e.g., 'visitor', 'bounce', 'amazon', 'pixel')")

    # --- Aggregation commands (ads / adsets / campaigns) ---
    agg_model_help = "Attribution model: lpc (default, last platform click), last, first, linear, linear-all"
    agg_sort_help = "Sort by: revenue (default), orders, aov, spend, cac, roas"
    agg_source_help = "Filter by source: meta/facebook, google, snap, tiktok, klaviyo (or raw TW source name)"

    agg_nonames_help = "Skip Meta API name resolution (show raw IDs)"

    # ads
    p_ads = subparsers.add_parser("ads", help="Ad-level attribution breakdown")
    p_ads.add_argument("--format", **fmt_kwargs)
    p_ads.add_argument("--start", help="Start date (YYYY-MM-DD, default: 7 days ago)")
    p_ads.add_argument("--end", help="End date (YYYY-MM-DD, default: yesterday)")
    p_ads.add_argument("--model", default="lpc", help=agg_model_help)
    p_ads.add_argument("--source", help=agg_source_help)
    p_ads.add_argument("--campaign", help="Filter by campaign ID")
    p_ads.add_argument("--sort", default="revenue", choices=["revenue", "orders", "aov", "spend", "cac", "roas"], help=agg_sort_help)
    p_ads.add_argument("--limit", type=int, default=0, help="Max rows to show (0 = all)")
    p_ads.add_argument("--no-names", action="store_true", dest="no_names", help=agg_nonames_help)
    p_ads.add_argument("--dump-fields", action="store_true", dest="dump_fields",
                       help="Dump raw order fields from API (for debugging)")

    # adsets
    p_adsets = subparsers.add_parser("adsets", help="Ad set-level attribution breakdown")
    p_adsets.add_argument("--format", **fmt_kwargs)
    p_adsets.add_argument("--start", help="Start date (YYYY-MM-DD, default: 7 days ago)")
    p_adsets.add_argument("--end", help="End date (YYYY-MM-DD, default: yesterday)")
    p_adsets.add_argument("--model", default="lpc", help=agg_model_help)
    p_adsets.add_argument("--source", help=agg_source_help)
    p_adsets.add_argument("--campaign", help="Filter by campaign ID")
    p_adsets.add_argument("--sort", default="revenue", choices=["revenue", "orders", "aov", "spend", "cac", "roas"], help=agg_sort_help)
    p_adsets.add_argument("--limit", type=int, default=0, help="Max rows to show (0 = all)")
    p_adsets.add_argument("--no-names", action="store_true", dest="no_names", help=agg_nonames_help)
    p_adsets.add_argument("--dump-fields", action="store_true", dest="dump_fields",
                          help="Dump raw order fields from API (for debugging)")

    # campaigns
    p_campaigns = subparsers.add_parser("campaigns", help="Campaign-level attribution breakdown")
    p_campaigns.add_argument("--format", **fmt_kwargs)
    p_campaigns.add_argument("--start", help="Start date (YYYY-MM-DD, default: 7 days ago)")
    p_campaigns.add_argument("--end", help="End date (YYYY-MM-DD, default: yesterday)")
    p_campaigns.add_argument("--model", default="lpc", help=agg_model_help)
    p_campaigns.add_argument("--source", help=agg_source_help)
    p_campaigns.add_argument("--sort", default="revenue", choices=["revenue", "orders", "aov", "spend", "cac", "roas"], help=agg_sort_help)
    p_campaigns.add_argument("--limit", type=int, default=0, help="Max rows to show (0 = all)")
    p_campaigns.add_argument("--no-names", action="store_true", dest="no_names", help=agg_nonames_help)
    p_campaigns.add_argument("--dump-fields", action="store_true", dest="dump_fields",
                             help="Dump raw order fields from API (for debugging)")

    # moby (stub)
    p_moby = subparsers.add_parser("moby", help="(stub) Moby AI — requires OAuth")
    p_moby.add_argument("--format", **fmt_kwargs)

    # sql (stub)
    p_sql = subparsers.add_parser("sql", help="(stub) SQL endpoint — requires OAuth")
    p_sql.add_argument("--format", **fmt_kwargs)

    return parser


# --- Command Map ---
COMMAND_MAP = {
    "test-auth": cmd_test_auth,
    "summary": cmd_summary,
    "attribution": cmd_attribution,
    "compare": cmd_compare,
    "channels": cmd_channels,
    "metrics": cmd_metrics,
    "ads": cmd_ads,
    "adsets": cmd_adsets,
    "campaigns": cmd_campaigns,
    "moby": cmd_moby,
    "sql": cmd_sql,
}


def main():
    """Main entry point."""
    load_env()

    parser = build_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    handler = COMMAND_MAP.get(args.command)
    if not handler:
        print(f"Unknown command: {args.command}", file=sys.stderr)
        parser.print_help()
        sys.exit(1)

    handler(args)


if __name__ == "__main__":
    main()
