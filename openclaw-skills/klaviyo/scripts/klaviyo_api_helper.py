#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
Klaviyo API Helper Script

Usage:
    klaviyo_api_helper.py COMMAND [OPTIONS]

Read Commands:
    get-account                    Get account info
    get-profiles                   List profiles
    get-profile --id ID            Get single profile
    search-profile --email EMAIL   Search profile by email
    get-lists                      List all lists
    get-list-profiles --list-id ID List profiles in a list
    get-segments                   List all segments
    get-segment-profiles --segment-id ID  List profiles in a segment
    get-campaigns [--channel CH]   List campaigns
    get-campaign --id ID           Get single campaign
    get-flows                      List all flows
    get-flow --id ID               Get single flow
    get-templates                  List all templates
    get-template --id ID           Get single template
    get-events [--sort FIELD]      List events
    get-metrics                    List all metrics
    query-metric-aggregates        Query metric aggregates
    get-catalogs                   List catalog items
    get-catalog-items              List catalog items
    get-coupons                    List coupons
    get-tags                       List tags
    get-reports --type TYPE        Get performance reports

Action Commands (require --mode action):
    create-profile                 Create a new profile
    update-profile --id ID         Update a profile
    subscribe-profiles             Subscribe profiles to a list
    unsubscribe-profiles           Unsubscribe profiles from a list
    add-to-list                    Add profiles to a list
    remove-from-list               Remove profiles from a list
    create-campaign                Create a new campaign
    update-campaign --id ID        Update a campaign
    send-campaign --campaign-id ID Send a campaign
    create-event                   Track a custom event
    bulk-create-events --file F    Bulk create events from JSON
    create-coupon                  Create a coupon
    create-coupon-codes            Create coupon codes

Global Options:
    --mode MODE         read-only (default) or action
    --format FORMAT     json, table, or summary (default)
    --all               Paginate through all results
    --page-size N       Results per page (default: 20)
    --filter FILTER     Raw filter string
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

# --- Configuration ---
SKILL_DIR = pathlib.Path(__file__).resolve().parent.parent
ENV_FILE = SKILL_DIR / ".env"
CACHE_DIR = SKILL_DIR / "cache"
HISTORY_DIR = SKILL_DIR / "history"
LOGS_DIR = SKILL_DIR / "logs"

BASE_URL = "https://a.klaviyo.com/api"
DEFAULT_REVISION = "2024-10-15"
DEFAULT_PAGE_SIZE = 20
MAX_RETRIES = 3
RETRY_BACKOFF = [1, 2, 4]


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
    """Get the Klaviyo API key from environment."""
    key = os.environ.get("KLAVIYO_API_KEY", "")
    if not key:
        print("ERROR: KLAVIYO_API_KEY not set.", file=sys.stderr)
        print(f"Set it in {ENV_FILE} or as an environment variable.", file=sys.stderr)
        sys.exit(1)
    return key


def get_revision():
    """Get the API revision date."""
    return os.environ.get("KLAVIYO_API_REVISION", DEFAULT_REVISION)


# --- HTTP Helpers ---
def make_headers(content_type=False):
    """Build standard Klaviyo API headers."""
    headers = {
        "Authorization": f"Klaviyo-API-Key {get_api_key()}",
        "revision": get_revision(),
        "Accept": "application/vnd.api+json",
    }
    if content_type:
        headers["Content-Type"] = "application/vnd.api+json"
    return headers


def api_request(method, path, data=None, params=None, retries=MAX_RETRIES):
    """Make an API request with retry logic."""
    url = f"{BASE_URL}/{path.lstrip('/')}"

    if params:
        query = urllib.parse.urlencode(params, doseq=True)
        url = f"{url}?{query}" if "?" not in url else f"{url}&{query}"

    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")

    headers = make_headers(content_type=(body is not None))
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


def api_patch(path, data):
    """PATCH request."""
    return api_request("PATCH", path, data=data)


def api_delete(path):
    """DELETE request."""
    return api_request("DELETE", path)


def api_get_url(url):
    """GET request to a full URL (for pagination)."""
    headers = make_headers()
    req = urllib.request.Request(url, headers=headers, method="GET")

    for attempt in range(MAX_RETRIES + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            if e.code == 429:
                retry_after = int(e.headers.get("Retry-After", "5"))
                if attempt < MAX_RETRIES:
                    time.sleep(retry_after)
                    continue
            error_body = ""
            try:
                error_body = e.read().decode("utf-8")
            except Exception:
                pass
            print(f"HTTP {e.code}: {error_body}", file=sys.stderr)
            sys.exit(1)
        except urllib.error.URLError as e:
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)])
                continue
            print(f"Connection error: {e.reason}", file=sys.stderr)
            sys.exit(1)

    print("Max retries exceeded.", file=sys.stderr)
    sys.exit(1)


def paginate_all(path, params=None, page_size=DEFAULT_PAGE_SIZE):
    """Fetch all pages of a paginated endpoint."""
    if params is None:
        params = {}
    params["page[size]"] = page_size

    all_data = []
    result = api_get(path, params=params)
    all_data.extend(result.get("data", []))

    while True:
        next_url = result.get("links", {}).get("next")
        if not next_url:
            break
        result = api_get_url(next_url)
        all_data.extend(result.get("data", []))
        print(f"  Fetched {len(all_data)} records...", file=sys.stderr)

    return all_data


# --- Formatting ---
def flatten_resource(resource):
    """Flatten a JSON:API resource into a simple dict."""
    flat = {"id": resource.get("id", "")}
    flat.update(resource.get("attributes", {}))
    return flat


def format_output(data, fmt="summary"):
    """Format API response data for output."""
    if fmt == "json":
        return json.dumps(data, indent=2, default=str)

    if isinstance(data, list):
        if not data:
            return "No results found."

        if fmt == "table":
            return format_table([flatten_resource(r) for r in data])

        # summary mode
        items = [flatten_resource(r) for r in data]
        lines = [f"Found {len(items)} results:\n"]
        for item in items:
            name = (
                item.get("name")
                or item.get("email")
                or item.get("title")
                or item.get("id", "")
            )
            lines.append(f"  [{item['id']}] {name}")
        return "\n".join(lines)

    elif isinstance(data, dict):
        if "data" in data:
            return format_output(
                data["data"] if isinstance(data["data"], list) else [data["data"]], fmt
            )
        flat = flatten_resource(data) if "attributes" in data else data
        if fmt == "table":
            return format_table([flat])
        lines = []
        for k, v in flat.items():
            if isinstance(v, (dict, list)):
                v = json.dumps(v, default=str)
            lines.append(f"  {k}: {v}")
        return "\n".join(lines)

    return str(data)


def format_table(rows):
    """Format a list of dicts as a text table."""
    if not rows:
        return "No data."

    # Pick key columns (max 6)
    priority_keys = ["id", "name", "email", "status", "channel", "created", "updated"]
    all_keys = list(rows[0].keys())
    keys = [k for k in priority_keys if k in all_keys]
    for k in all_keys:
        if k not in keys and len(keys) < 6:
            keys.append(k)

    # Calculate column widths
    widths = {}
    for k in keys:
        widths[k] = max(len(k), max(len(str(r.get(k, ""))[:40]) for r in rows))

    # Header
    header = " | ".join(k.ljust(widths[k]) for k in keys)
    separator = "-+-".join("-" * widths[k] for k in keys)

    # Rows
    lines = [header, separator]
    for r in rows:
        line = " | ".join(str(r.get(k, ""))[:40].ljust(widths[k]) for k in keys)
        lines.append(line)

    return "\n".join(lines)


# --- Mode Enforcement ---
def check_action_mode(args):
    """Ensure action mode is enabled for write operations."""
    if getattr(args, "mode", "read-only") != "action":
        print("ERROR: This command requires action mode.", file=sys.stderr)
        print("Use --mode action to enable write operations.", file=sys.stderr)
        sys.exit(1)


# --- Commands ---
def cmd_get_account(args):
    """Get account information."""
    result = api_get("accounts/")
    print(format_output(result, args.format))


def cmd_get_profiles(args):
    """List profiles."""
    params = {}
    if args.filter:
        params["filter"] = args.filter
    if args.all:
        data = paginate_all("profiles/", params, args.page_size)
        print(format_output(data, args.format))
    else:
        params["page[size]"] = args.page_size
        result = api_get("profiles/", params)
        print(format_output(result, args.format))


def cmd_get_profile(args):
    """Get a single profile by ID."""
    result = api_get(f"profiles/{args.id}/")
    print(format_output(result, args.format))


def cmd_search_profile(args):
    """Search for a profile by email."""
    params = {"filter": f'equals(email,"{args.email}")'}
    result = api_get("profiles/", params)
    print(format_output(result, args.format))


def cmd_get_lists(args):
    """List all lists."""
    if args.all:
        data = paginate_all("lists/", page_size=args.page_size)
        print(format_output(data, args.format))
    else:
        result = api_get("lists/", {"page[size]": args.page_size})
        print(format_output(result, args.format))


def cmd_get_list_profiles(args):
    """List profiles in a list."""
    path = f"lists/{args.list_id}/profiles/"
    if args.all:
        data = paginate_all(path, page_size=args.page_size)
        print(format_output(data, args.format))
    else:
        result = api_get(path, {"page[size]": args.page_size})
        print(format_output(result, args.format))


def cmd_get_segments(args):
    """List all segments."""
    if args.all:
        data = paginate_all("segments/", page_size=args.page_size)
        print(format_output(data, args.format))
    else:
        result = api_get("segments/", {"page[size]": args.page_size})
        print(format_output(result, args.format))


def cmd_get_segment_profiles(args):
    """List profiles in a segment."""
    path = f"segments/{args.segment_id}/profiles/"
    if args.all:
        data = paginate_all(path, page_size=args.page_size)
        print(format_output(data, args.format))
    else:
        result = api_get(path, {"page[size]": args.page_size})
        print(format_output(result, args.format))


def cmd_get_campaigns(args):
    """List campaigns."""
    params = {}
    if args.channel:
        params["filter"] = f'equals(messages.channel,"{args.channel}")'
    if args.filter:
        params["filter"] = args.filter
    if args.all:
        data = paginate_all("campaigns/", params, args.page_size)
        print(format_output(data, args.format))
    else:
        params["page[size]"] = args.page_size
        result = api_get("campaigns/", params)
        print(format_output(result, args.format))


def cmd_get_campaign(args):
    """Get a single campaign by ID."""
    result = api_get(f"campaigns/{args.id}/")
    print(format_output(result, args.format))


def cmd_get_flows(args):
    """List all flows."""
    if args.all:
        data = paginate_all("flows/", page_size=args.page_size)
        print(format_output(data, args.format))
    else:
        result = api_get("flows/", {"page[size]": args.page_size})
        print(format_output(result, args.format))


def cmd_get_flow(args):
    """Get a single flow by ID."""
    result = api_get(f"flows/{args.id}/")
    print(format_output(result, args.format))


def cmd_get_templates(args):
    """List all templates."""
    if args.all:
        data = paginate_all("templates/", page_size=args.page_size)
        print(format_output(data, args.format))
    else:
        result = api_get("templates/", {"page[size]": args.page_size})
        print(format_output(result, args.format))


def cmd_get_template(args):
    """Get a single template by ID."""
    result = api_get(f"templates/{args.id}/")
    print(format_output(result, args.format))


def cmd_get_events(args):
    """List events."""
    params = {}
    if args.sort:
        params["sort"] = args.sort
    if args.filter:
        params["filter"] = args.filter
    if args.all:
        data = paginate_all("events/", params, args.page_size)
        print(format_output(data, args.format))
    else:
        params["page[size]"] = args.page_size
        result = api_get("events/", params)
        print(format_output(result, args.format))


def cmd_get_metrics(args):
    """List all metrics."""
    if args.all:
        data = paginate_all("metrics/", page_size=args.page_size)
        print(format_output(data, args.format))
    else:
        result = api_get("metrics/", {"page[size]": args.page_size})
        print(format_output(result, args.format))


def cmd_query_metric_aggregates(args):
    """Query metric aggregates."""
    data = {
        "data": {
            "type": "metric-aggregate",
            "attributes": {
                "metric_id": args.metric_id,
                "measurements": args.measurement.split(","),
                "interval": args.interval or "day",
                "filter": [
                    f"greater-or-equal(datetime,{args.date_from}T00:00:00+00:00)",
                    f"less-than(datetime,{args.date_to}T23:59:59+00:00)",
                ],
            },
        }
    }
    if args.group_by:
        data["data"]["attributes"]["by"] = args.group_by.split(",")

    result = api_post("metric-aggregates/", data)
    print(format_output(result, args.format))


def cmd_get_catalogs(args):
    """List catalog items."""
    cmd_get_catalog_items(args)


def cmd_get_catalog_items(args):
    """List catalog items."""
    if args.all:
        data = paginate_all("catalog-items/", page_size=args.page_size)
        print(format_output(data, args.format))
    else:
        result = api_get("catalog-items/", {"page[size]": args.page_size})
        print(format_output(result, args.format))


def cmd_get_coupons(args):
    """List coupons."""
    if args.all:
        data = paginate_all("coupons/", page_size=args.page_size)
        print(format_output(data, args.format))
    else:
        result = api_get("coupons/", {"page[size]": args.page_size})
        print(format_output(result, args.format))


def cmd_get_tags(args):
    """List tags."""
    if args.all:
        data = paginate_all("tags/", page_size=args.page_size)
        print(format_output(data, args.format))
    else:
        result = api_get("tags/", {"page[size]": args.page_size})
        print(format_output(result, args.format))


def cmd_get_reports(args):
    """Get performance reports."""
    report_type = args.type
    stats = args.statistics.split(",") if args.statistics else ["opens", "clicks", "revenue"]

    type_map = {
        "campaign": "campaign-values-report",
        "flow": "flow-values-report",
        "form": "form-values-report",
        "segment": "segment-values-report",
    }

    endpoint_map = {
        "campaign": "campaign-values-reports/",
        "flow": "flow-values-reports/",
        "form": "form-values-reports/",
        "segment": "segment-values-reports/",
    }

    if report_type not in type_map:
        print(f"ERROR: Unknown report type '{report_type}'. Use: campaign, flow, form, segment", file=sys.stderr)
        sys.exit(1)

    data = {
        "data": {
            "type": type_map[report_type],
            "attributes": {
                "statistics": stats,
                "timeframe": {
                    "start": f"{args.date_from}T00:00:00+00:00",
                    "end": f"{args.date_to}T23:59:59+00:00",
                },
            },
        }
    }

    result = api_post(endpoint_map[report_type], data)
    print(format_output(result, args.format))


# --- Action Commands ---
def cmd_create_profile(args):
    """Create a new profile."""
    check_action_mode(args)
    attrs = {}
    if args.email:
        attrs["email"] = args.email
    if args.first_name:
        attrs["first_name"] = args.first_name
    if args.last_name:
        attrs["last_name"] = args.last_name
    if args.phone:
        attrs["phone_number"] = args.phone
    if args.properties:
        attrs["properties"] = json.loads(args.properties)

    data = {"data": {"type": "profile", "attributes": attrs}}
    result = api_post("profiles/", data)
    print(format_output(result, args.format))


def cmd_update_profile(args):
    """Update a profile."""
    check_action_mode(args)
    attrs = {}
    if args.email:
        attrs["email"] = args.email
    if args.first_name:
        attrs["first_name"] = args.first_name
    if args.last_name:
        attrs["last_name"] = args.last_name
    if args.phone:
        attrs["phone_number"] = args.phone
    if args.properties:
        attrs["properties"] = json.loads(args.properties)

    data = {"data": {"type": "profile", "id": args.id, "attributes": attrs}}
    result = api_patch(f"profiles/{args.id}/", data)
    print(format_output(result, args.format))


def cmd_subscribe_profiles(args):
    """Subscribe profiles to a list."""
    check_action_mode(args)
    profiles = []
    for email in args.emails:
        profiles.append({"type": "profile", "attributes": {"email": email}})

    data = {
        "data": {
            "type": "profile-subscription-bulk-create-job",
            "attributes": {
                "profiles": {"data": profiles},
            },
            "relationships": {
                "list": {"data": {"type": "list", "id": args.list_id}},
            },
        }
    }
    result = api_post("profile-subscription-bulk-create-jobs/", data)
    print(format_output(result, args.format))


def cmd_unsubscribe_profiles(args):
    """Unsubscribe profiles from a list."""
    check_action_mode(args)
    profiles = []
    for email in args.emails:
        profiles.append({"type": "profile", "attributes": {"email": email}})

    data = {
        "data": {
            "type": "profile-subscription-bulk-delete-job",
            "attributes": {
                "profiles": {"data": profiles},
            },
            "relationships": {
                "list": {"data": {"type": "list", "id": args.list_id}},
            },
        }
    }
    result = api_post("profile-subscription-bulk-delete-jobs/", data)
    print(format_output(result, args.format))


def cmd_add_to_list(args):
    """Add profiles to a list."""
    check_action_mode(args)
    profiles = [{"type": "profile", "id": pid} for pid in args.profile_ids]
    data = {"data": profiles}
    result = api_post(f"lists/{args.list_id}/relationships/profiles/", data)
    print("Profiles added to list." if not result else format_output(result, args.format))


def cmd_remove_from_list(args):
    """Remove profiles from a list."""
    check_action_mode(args)
    profiles = [{"type": "profile", "id": pid} for pid in args.profile_ids]
    # Klaviyo uses DELETE with body for relationship removal
    url = f"{BASE_URL}/lists/{args.list_id}/relationships/profiles/"
    body = json.dumps({"data": profiles}).encode("utf-8")
    headers = make_headers(content_type=True)
    req = urllib.request.Request(url, data=body, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print("Profiles removed from list.")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        print(f"HTTP {e.code}: {error_body}", file=sys.stderr)
        sys.exit(1)


def cmd_create_campaign(args):
    """Create a new campaign."""
    check_action_mode(args)
    data = {
        "data": {
            "type": "campaign",
            "attributes": {
                "name": args.name,
                "audiences": {
                    "included": [{"type": "list", "id": args.list_id}],
                    "excluded": [],
                },
                "campaign-messages": {
                    "data": [
                        {
                            "type": "campaign-message",
                            "attributes": {
                                "channel": args.channel or "email",
                                "label": args.name,
                                "content": {
                                    "subject": args.subject,
                                    "from_email": args.from_email,
                                    "from_label": args.from_label or "",
                                },
                            },
                        }
                    ]
                },
                "send_strategy": {"method": args.send_strategy or "immediate"},
            },
        }
    }
    result = api_post("campaigns/", data)
    print(format_output(result, args.format))


def cmd_update_campaign(args):
    """Update a campaign."""
    check_action_mode(args)
    attrs = {}
    if args.name:
        attrs["name"] = args.name
    if args.status:
        attrs["status"] = args.status

    data = {"data": {"type": "campaign", "id": args.id, "attributes": attrs}}
    result = api_patch(f"campaigns/{args.id}/", data)
    print(format_output(result, args.format))


def cmd_send_campaign(args):
    """Send a campaign."""
    check_action_mode(args)
    data = {"data": {"type": "campaign-send-job", "id": args.campaign_id}}
    result = api_post("campaign-send-jobs/", data)
    print("Campaign send job created." if not result else format_output(result, args.format))


def cmd_create_event(args):
    """Track a custom event."""
    check_action_mode(args)
    props = json.loads(args.properties) if args.properties else {}
    data = {
        "data": {
            "type": "event",
            "attributes": {
                "metric": {
                    "data": {"type": "metric", "attributes": {"name": args.metric}}
                },
                "profile": {
                    "data": {
                        "type": "profile",
                        "attributes": {"email": args.email},
                    }
                },
                "properties": props,
            },
        }
    }
    if args.value:
        data["data"]["attributes"]["value"] = float(args.value)

    result = api_post("events/", data)
    print("Event created." if not result else format_output(result, args.format))


def cmd_bulk_create_events(args):
    """Bulk create events from a JSON file."""
    check_action_mode(args)
    with open(args.file) as f:
        events_data = json.load(f)

    data = {"data": {"type": "event-bulk-create-job", "attributes": {"events": events_data}}}
    result = api_post("event-bulk-create-jobs/", data)
    print(format_output(result, args.format))


def cmd_create_coupon(args):
    """Create a coupon."""
    check_action_mode(args)
    data = {
        "data": {
            "type": "coupon",
            "attributes": {
                "external_id": args.external_id or f"coupon-{int(time.time())}",
                "description": args.description,
            },
        }
    }
    result = api_post("coupons/", data)
    print(format_output(result, args.format))


def cmd_create_coupon_codes(args):
    """Create coupon codes in bulk."""
    check_action_mode(args)
    codes = []
    for i in range(args.quantity):
        codes.append({
            "type": "coupon-code",
            "attributes": {
                "unique_code": f"{args.prefix}{i + 1:04d}",
            },
            "relationships": {
                "coupon": {"data": {"type": "coupon", "id": args.coupon_id}},
            },
        })

    data = {
        "data": {
            "type": "coupon-code-bulk-create-job",
            "attributes": {"codes": {"data": codes}},
        }
    }
    result = api_post("coupon-code-bulk-create-jobs/", data)
    print(format_output(result, args.format))


# --- CLI Parser ---
def build_parser():
    # Parent parser with global options (inherited by all subcommands)
    parent = argparse.ArgumentParser(add_help=False)
    parent.add_argument("--mode", default="read-only", choices=["read-only", "action"])
    parent.add_argument("--format", default="summary", choices=["json", "table", "summary"])
    parent.add_argument("--all", action="store_true", help="Paginate all results")
    parent.add_argument("--page-size", type=int, default=DEFAULT_PAGE_SIZE)
    parent.add_argument("--filter", default=None, help="Raw filter string")

    parser = argparse.ArgumentParser(
        description="Klaviyo API Helper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        parents=[parent],
    )

    sub = parser.add_subparsers(dest="command", help="Command to run")

    # --- Read Commands ---
    sub.add_parser("get-account", help="Get account info", parents=[parent])

    p = sub.add_parser("get-profiles", help="List profiles", parents=[parent])
    p = sub.add_parser("get-profile", help="Get single profile", parents=[parent])
    p.add_argument("--id", required=True)

    p = sub.add_parser("search-profile", help="Search profile by email", parents=[parent])
    p.add_argument("--email", required=True)

    sub.add_parser("get-lists", help="List all lists", parents=[parent])

    p = sub.add_parser("get-list-profiles", help="List profiles in a list", parents=[parent])
    p.add_argument("--list-id", required=True)

    sub.add_parser("get-segments", help="List all segments", parents=[parent])

    p = sub.add_parser("get-segment-profiles", help="List profiles in a segment", parents=[parent])
    p.add_argument("--segment-id", required=True)

    p = sub.add_parser("get-campaigns", help="List campaigns", parents=[parent])
    p.add_argument("--channel", default=None, choices=["email", "sms"])

    p = sub.add_parser("get-campaign", help="Get single campaign", parents=[parent])
    p.add_argument("--id", required=True)

    sub.add_parser("get-flows", help="List all flows", parents=[parent])

    p = sub.add_parser("get-flow", help="Get single flow", parents=[parent])
    p.add_argument("--id", required=True)

    sub.add_parser("get-templates", help="List all templates", parents=[parent])

    p = sub.add_parser("get-template", help="Get single template", parents=[parent])
    p.add_argument("--id", required=True)

    p = sub.add_parser("get-events", help="List events", parents=[parent])
    p.add_argument("--sort", default="-datetime")

    sub.add_parser("get-metrics", help="List all metrics", parents=[parent])

    p = sub.add_parser("query-metric-aggregates", help="Query metric aggregates", parents=[parent])
    p.add_argument("--metric-id", required=True)
    p.add_argument("--measurement", required=True, help="Comma-separated: count,sum,unique,value")
    p.add_argument("--interval", default="day", choices=["hour", "day", "week", "month"])
    p.add_argument("--from", dest="date_from", required=True, help="Start date YYYY-MM-DD")
    p.add_argument("--to", dest="date_to", required=True, help="End date YYYY-MM-DD")
    p.add_argument("--group-by", default=None, help="Comma-separated group-by fields")

    sub.add_parser("get-catalogs", help="List catalog items", parents=[parent])
    sub.add_parser("get-catalog-items", help="List catalog items", parents=[parent])
    sub.add_parser("get-coupons", help="List coupons", parents=[parent])
    sub.add_parser("get-tags", help="List tags", parents=[parent])

    p = sub.add_parser("get-reports", help="Get performance reports", parents=[parent])
    p.add_argument("--type", required=True, choices=["campaign", "flow", "form", "segment"])
    p.add_argument("--statistics", default="opens,clicks,revenue")
    p.add_argument("--from", dest="date_from", required=True, help="Start date YYYY-MM-DD")
    p.add_argument("--to", dest="date_to", required=True, help="End date YYYY-MM-DD")
    p.add_argument("--interval", default=None, choices=["daily", "weekly", "monthly"])

    # --- Action Commands ---
    p = sub.add_parser("create-profile", help="Create a new profile", parents=[parent])
    p.add_argument("--email", required=True)
    p.add_argument("--first-name", default=None)
    p.add_argument("--last-name", default=None)
    p.add_argument("--phone", default=None)
    p.add_argument("--properties", default=None, help="JSON string of custom properties")

    p = sub.add_parser("update-profile", help="Update a profile", parents=[parent])
    p.add_argument("--id", required=True)
    p.add_argument("--email", default=None)
    p.add_argument("--first-name", default=None)
    p.add_argument("--last-name", default=None)
    p.add_argument("--phone", default=None)
    p.add_argument("--properties", default=None, help="JSON string of custom properties")

    p = sub.add_parser("subscribe-profiles", help="Subscribe profiles to a list", parents=[parent])
    p.add_argument("--list-id", required=True)
    p.add_argument("--emails", nargs="+", required=True)

    p = sub.add_parser("unsubscribe-profiles", help="Unsubscribe profiles from a list", parents=[parent])
    p.add_argument("--list-id", required=True)
    p.add_argument("--emails", nargs="+", required=True)

    p = sub.add_parser("add-to-list", help="Add profiles to a list", parents=[parent])
    p.add_argument("--list-id", required=True)
    p.add_argument("--profile-ids", nargs="+", required=True)

    p = sub.add_parser("remove-from-list", help="Remove profiles from a list", parents=[parent])
    p.add_argument("--list-id", required=True)
    p.add_argument("--profile-ids", nargs="+", required=True)

    p = sub.add_parser("create-campaign", help="Create a new campaign", parents=[parent])
    p.add_argument("--name", required=True)
    p.add_argument("--list-id", required=True)
    p.add_argument("--subject", required=True)
    p.add_argument("--from-email", required=True)
    p.add_argument("--from-label", default=None)
    p.add_argument("--channel", default="email", choices=["email", "sms"])
    p.add_argument("--send-strategy", default="immediate")

    p = sub.add_parser("update-campaign", help="Update a campaign", parents=[parent])
    p.add_argument("--id", required=True)
    p.add_argument("--name", default=None)
    p.add_argument("--status", default=None)

    p = sub.add_parser("send-campaign", help="Send a campaign", parents=[parent])
    p.add_argument("--campaign-id", required=True)

    p = sub.add_parser("create-event", help="Track a custom event", parents=[parent])
    p.add_argument("--metric", required=True, help="Metric name")
    p.add_argument("--email", required=True, help="Profile email")
    p.add_argument("--properties", default=None, help="JSON string of event properties")
    p.add_argument("--value", default=None, help="Numeric value")

    p = sub.add_parser("bulk-create-events", help="Bulk create events from JSON", parents=[parent])
    p.add_argument("--file", required=True, help="Path to JSON file with events")

    p = sub.add_parser("create-coupon", help="Create a coupon", parents=[parent])
    p.add_argument("--description", required=True)
    p.add_argument("--external-id", default=None)

    p = sub.add_parser("create-coupon-codes", help="Create coupon codes in bulk", parents=[parent])
    p.add_argument("--coupon-id", required=True)
    p.add_argument("--quantity", type=int, required=True)
    p.add_argument("--prefix", default="CODE")

    return parser


# --- Command Dispatch ---
COMMAND_MAP = {
    "get-account": cmd_get_account,
    "get-profiles": cmd_get_profiles,
    "get-profile": cmd_get_profile,
    "search-profile": cmd_search_profile,
    "get-lists": cmd_get_lists,
    "get-list-profiles": cmd_get_list_profiles,
    "get-segments": cmd_get_segments,
    "get-segment-profiles": cmd_get_segment_profiles,
    "get-campaigns": cmd_get_campaigns,
    "get-campaign": cmd_get_campaign,
    "get-flows": cmd_get_flows,
    "get-flow": cmd_get_flow,
    "get-templates": cmd_get_templates,
    "get-template": cmd_get_template,
    "get-events": cmd_get_events,
    "get-metrics": cmd_get_metrics,
    "query-metric-aggregates": cmd_query_metric_aggregates,
    "get-catalogs": cmd_get_catalogs,
    "get-catalog-items": cmd_get_catalog_items,
    "get-coupons": cmd_get_coupons,
    "get-tags": cmd_get_tags,
    "get-reports": cmd_get_reports,
    "create-profile": cmd_create_profile,
    "update-profile": cmd_update_profile,
    "subscribe-profiles": cmd_subscribe_profiles,
    "unsubscribe-profiles": cmd_unsubscribe_profiles,
    "add-to-list": cmd_add_to_list,
    "remove-from-list": cmd_remove_from_list,
    "create-campaign": cmd_create_campaign,
    "update-campaign": cmd_update_campaign,
    "send-campaign": cmd_send_campaign,
    "create-event": cmd_create_event,
    "bulk-create-events": cmd_bulk_create_events,
    "create-coupon": cmd_create_coupon,
    "create-coupon-codes": cmd_create_coupon_codes,
}


def main():
    load_env()
    parser = build_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    handler = COMMAND_MAP.get(args.command)
    if handler:
        handler(args)
    else:
        print(f"Unknown command: {args.command}", file=sys.stderr)
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
