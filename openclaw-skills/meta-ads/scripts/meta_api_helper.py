#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai>=1.0.0",
#     "google-api-python-client>=2.100.0",
#     "google-auth>=2.20.0",
#     "anthropic>=0.40.0",
# ]
# ///
"""Meta Ads API Helper — Quick diagnostics, queries, token management, creative staging, and creative analysis.

Usage:
    meta_api_helper.py report [--date-preset today] [--slack CHANNEL]
    meta_api_helper.py snapshot [--date-preset today] [--slack CHANNEL]
    meta_api_helper.py top-ads [--date-preset today] [--top N] [--with-media] [--format json]
    meta_api_helper.py creative-analysis [--date-preset today] [--compare-preset last_30d] [--top N] [--keyword TEXT] [--slack CHANNEL] [--threaded] [--model MODEL]
    meta_api_helper.py creative-library [--date-preset last_30d] [--top 15] [--model MODEL] [--slack CHANNEL] [--threaded] [--skip-synthesis] [--push-to-platform] [--no-doc]
    meta_api_helper.py campaigns [--date-preset today]
    meta_api_helper.py adsets [--date-preset today] [--campaign-filter TEXT]
    meta_api_helper.py validate-token
    meta_api_helper.py account-info
    meta_api_helper.py health-check
    meta_api_helper.py list-campaigns [--limit N]
    meta_api_helper.py insights-summary [--date-preset PRESET]
    meta_api_helper.py debug-token
    meta_api_helper.py exchange-token --short-lived-token TOKEN
    meta_api_helper.py refresh-token
    meta_api_helper.py token-status
    meta_api_helper.py discover-page
    meta_api_helper.py setup-staging [--yes]
    meta_api_helper.py upload-image --file PATH
    meta_api_helper.py upload-video --file PATH
    meta_api_helper.py reencode-video --file PATH [--output PATH]
    meta_api_helper.py get-ad-copy --ad-id ID
    meta_api_helper.py list-ad-copy [--campaign-filter TEXT] [--top N]
    meta_api_helper.py stage-ad --images|--media PATHS --product NAME --copy-from ID|--body/--headline/--link/--cta --name NAME [--yes]
    meta_api_helper.py get-ad --ad-id ID
    meta_api_helper.py edit-ad --ad-id ID [--body TEXT] [--headline TEXT] [--link URL] [--cta TYPE] [--description TEXT] [--url-tags TAGS] [--status STATUS] [--yes]
    meta_api_helper.py duplicate-ad --ad-id ID --to-adset ADSET_ID [--name NAME] [--body TEXT] [--headline TEXT] [--link URL] [--cta TYPE] [--description TEXT] [--url-tags TAGS] [--status STATUS] [--yes]
    meta_api_helper.py update-budget --id TARGET_ID --budget DOLLARS [--type daily|lifetime] [--yes]
    meta_api_helper.py update-adset --adset-id ID [--bid-strategy STR] [--bid-amount DOLLARS] [--roas-floor NUM] [--optimization-goal GOAL] [--status STATUS] [--yes]
    meta_api_helper.py duplicate-adset --adset-id ID --to-campaign ID [--adset-name NAME] [--budget DOLLARS] [--budget-type TYPE] [--bid-strategy STR] [--bid-amount DOLLARS] [--roas-floor NUM] [--status STATUS] [--include-ads] [--yes]
    meta_api_helper.py list-campaign-adsets --campaign-id ID
    meta_api_helper.py launch-ad --media|--images PATHS --campaign-id ID [--product NAME] [--copy-from ID|--body/--headline/--link/--cta] [--name NAME] [--adset-id ID|--adset-name NAME] [--budget 50] [--budget-type daily] [--status PAUSED] [--clone-targeting-from ID] [--bid-strategy STR] [--bid-amount DOLLARS] [--roas-floor NUM] [--yes]
    meta_api_helper.py subscribe --report-type TYPE --user-id UID
    meta_api_helper.py unsubscribe --report-type TYPE --user-id UID
    meta_api_helper.py list-subscriptions

Environment variables:
    META_ACCESS_TOKEN    — Required for most commands
    META_AD_ACCOUNT_ID   — Required (must include act_ prefix)
    META_API_VERSION     — Optional, default v24.0
    META_APP_ID          — Required for token exchange/refresh
    META_APP_SECRET      — Required for token exchange/refresh
"""

import base64
import copy
import datetime
import io
import json
import os
import pathlib
import random
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ENV_FILE = pathlib.Path(__file__).parent.parent / ".env"


def _load_env_file():
    """Load .env file from skill directory as fallback for missing env vars."""
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and not os.environ.get(key):
                os.environ[key] = value


# Auto-load .env on import so all commands have access
_load_env_file()


def get_config():
    token = os.environ.get("META_ACCESS_TOKEN", "")
    account_id = os.environ.get("META_AD_ACCOUNT_ID", "")
    api_version = os.environ.get("META_API_VERSION", "v24.0")

    if not token:
        print("ERROR: META_ACCESS_TOKEN not set.")
        print("Export it in your shell:  export META_ACCESS_TOKEN='EAAx...'")
        sys.exit(1)

    if not account_id:
        print("ERROR: META_AD_ACCOUNT_ID not set.")
        print("Export it in your shell:  export META_AD_ACCOUNT_ID='act_123456789'")
        sys.exit(1)

    if not account_id.startswith("act_"):
        print(f"WARNING: META_AD_ACCOUNT_ID='{account_id}' is missing the 'act_' prefix.")
        print("Meta API requires the act_ prefix. Prepending it automatically.")
        account_id = f"act_{account_id}"

    return token, account_id, api_version


BASE_URL = "https://graph.facebook.com"


def _ads_manager_url(ad_id=None, adset_id=None, campaign_id=None, *, level=None):
    """Build a direct Ads Manager link filtered to the right level.

    Parameters
    ----------
    ad_id : str, optional       – Ad ID to filter on.
    adset_id : str, optional    – Ad-set ID to filter on.
    campaign_id : str, optional – Campaign ID to filter on.
    level : str, optional       – Force view level: "ad", "adset", or "campaign".
                                  Auto-detected from the most granular ID supplied.

    The URL opens directly to the correct view (/manage/ads, /manage/adsets, or
    /manage/campaigns) with only the relevant ``selected_*_ids`` param so that
    Meta Ads Manager applies the filter reliably across all Business-Manager
    account types.
    """
    acct = os.environ.get("META_AD_ACCOUNT_ID", "").replace("act_", "")
    biz = os.environ.get("META_BUSINESS_ID", "")

    if level is None:
        if ad_id:
            level = "ad"
        elif adset_id:
            level = "adset"
        elif campaign_id:
            level = "campaign"
        else:
            level = "ad"

    base = f"https://www.facebook.com/adsmanager/manage"

    if level == "campaign":
        url = (f"{base}/campaigns?act={acct}&business_id={biz}"
               f"&selected_campaign_ids={campaign_id or ad_id}")
    elif level == "adset":
        url = (f"{base}/adsets?act={acct}&business_id={biz}"
               f"&selected_adset_ids={adset_id or ad_id}")
        if campaign_id:
            url += f"&selected_campaign_ids={campaign_id}"
    else:  # ad
        url = (f"{base}/ads?act={acct}&business_id={biz}"
               f"&selected_ad_ids={ad_id}")
        if adset_id:
            url += f"&selected_adset_ids={adset_id}"
        if campaign_id:
            url += f"&selected_campaign_ids={campaign_id}"
    return url
TOKEN_FILE = pathlib.Path(__file__).resolve().parent.parent / ".token.json"
STAGING_CONFIG = pathlib.Path(__file__).parent.parent / ".staging.json"
STAGING_LOG = pathlib.Path(__file__).parent.parent / "logs" / "staging.log"
MEDIA_CACHE_DIR = pathlib.Path(__file__).resolve().parent.parent / "cache"


def _load_staging_config():
    """Load staging config (.staging.json) or return empty dict."""
    if not STAGING_CONFIG.exists():
        return {}
    try:
        return json.loads(STAGING_CONFIG.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def _save_staging_config(config):
    """Save staging config to .staging.json."""
    STAGING_CONFIG.write_text(json.dumps(config, indent=2) + "\n")


def _log_write(operation, details):
    """Append a timestamped entry to the staging write log."""
    STAGING_LOG.parent.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    entry = f"[{ts}] {operation}: {json.dumps(details)}\n"
    with open(STAGING_LOG, "a") as f:
        f.write(entry)


def _get_flag(flag_name, default=None):
    """Extract a --flag value from sys.argv."""
    args = sys.argv[1:]
    if flag_name in args:
        idx = args.index(flag_name)
        if idx + 1 < len(args):
            return args[idx + 1]
    return default


# ---------------------------------------------------------------------------
# Retry & rate-limit infrastructure
# ---------------------------------------------------------------------------

RETRYABLE_ERROR_CODES = {1, 2, 4, 17, 341, 368}
MAX_RETRIES = 5
RETRY_BASE_DELAY = 1.0  # seconds: 1 → 2 → 4 → 8 → 16


def _is_retryable_error(err_body):
    """Check if a Meta API error is transient and worth retrying."""
    error = err_body.get("error", {})
    if error.get("is_transient"):
        return True
    if error.get("code") in RETRYABLE_ERROR_CODES:
        return True
    return False


def _parse_rate_limit_headers(headers):
    """Parse Meta rate-limit headers. Returns {should_throttle, wait_seconds}."""
    result = {"should_throttle": False, "wait_seconds": 0}

    for key in ("x-business-use-case-usage", "x-app-usage"):
        val = headers.get(key)
        if not val:
            continue
        try:
            parsed = json.loads(val)
            # x-app-usage: {"call_count": N, "total_cputime": N, "total_time": N}
            if isinstance(parsed, dict):
                for field in ("call_count", "total_cputime", "total_time"):
                    if parsed.get(field, 0) > 90:
                        result["should_throttle"] = True
                        result["wait_seconds"] = max(result["wait_seconds"], 60)
                # x-business-use-case-usage: {biz_id: [{...usage...}]}
                for _biz_id, entries in parsed.items():
                    if isinstance(entries, list):
                        for entry in entries:
                            for field in ("call_count", "total_cputime", "total_time"):
                                if entry.get(field, 0) > 90:
                                    result["should_throttle"] = True
                                    est = entry.get("estimated_time_to_regain_access", 0)
                                    result["wait_seconds"] = max(
                                        result["wait_seconds"], est if est else 60
                                    )
        except (json.JSONDecodeError, TypeError):
            continue

    return result


# ---------------------------------------------------------------------------
# HTTP helpers (stdlib only — no external dependencies)
# ---------------------------------------------------------------------------

def api_get(path, params=None, token=None, raise_on_error=False):
    """Make a GET request to the Graph API with retry. Returns parsed JSON.

    If raise_on_error=True, raises RuntimeError instead of sys.exit(1) on
    terminal failures (allows callers to handle errors gracefully).
    """
    if params is None:
        params = {}
    if token:
        params["access_token"] = token
    qs = urllib.parse.urlencode(params)
    url = f"{BASE_URL}/{path}?{qs}" if qs else f"{BASE_URL}/{path}"

    for attempt in range(MAX_RETRIES + 1):
        req = urllib.request.Request(url)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = resp.read().decode()
                headers = {k.lower(): v for k, v in resp.getheaders()}
                rl = _parse_rate_limit_headers(headers)
                if rl["should_throttle"]:
                    time.sleep(min(rl["wait_seconds"], 300))
                return json.loads(body), headers
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            try:
                err = json.loads(body)
            except json.JSONDecodeError:
                err = {"raw": body}
            if attempt < MAX_RETRIES and (e.code >= 500 or _is_retryable_error(err)):
                if e.code >= 500:
                    delay = RETRY_BASE_DELAY * (2 ** (attempt + 1)) + random.uniform(1, 3)
                else:
                    delay = RETRY_BASE_DELAY * (2 ** attempt) + random.uniform(0, 1)
                print(f"  [retry {attempt+1}/{MAX_RETRIES}] HTTP {e.code}, waiting {delay:.1f}s...")
                time.sleep(delay)
                continue
            print(f"HTTP {e.code} Error:")
            print(json.dumps(err, indent=2))
            if raise_on_error:
                raise RuntimeError(f"HTTP {e.code}: {json.dumps(err)}")
            sys.exit(1)
        except urllib.error.URLError as e:
            if attempt < MAX_RETRIES:
                delay = RETRY_BASE_DELAY * (2 ** attempt) + random.uniform(0, 1)
                print(f"  [retry {attempt+1}/{MAX_RETRIES}] Network error, waiting {delay:.1f}s...")
                time.sleep(delay)
                continue
            print(f"Network error: {e.reason}")
            if raise_on_error:
                raise RuntimeError(f"Network error: {e.reason}")
            sys.exit(1)


def api_post(path, data=None, token=None, timeout=30):
    """Make a POST request to the Graph API with retry. Returns parsed JSON."""
    if data is None:
        data = {}
    if token:
        data["access_token"] = token
    encoded = urllib.parse.urlencode(data).encode()

    for attempt in range(MAX_RETRIES + 1):
        req = urllib.request.Request(f"{BASE_URL}/{path}", data=encoded, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read().decode()
                headers = {k.lower(): v for k, v in resp.getheaders()}
                rl = _parse_rate_limit_headers(headers)
                if rl["should_throttle"]:
                    time.sleep(min(rl["wait_seconds"], 300))
                return json.loads(body), headers
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            try:
                err = json.loads(body)
            except json.JSONDecodeError:
                err = {"raw": body}
            if attempt < MAX_RETRIES and (e.code >= 500 or _is_retryable_error(err)):
                if e.code >= 500:
                    delay = RETRY_BASE_DELAY * (2 ** (attempt + 1)) + random.uniform(1, 3)
                else:
                    delay = RETRY_BASE_DELAY * (2 ** attempt) + random.uniform(0, 1)
                print(f"  [retry {attempt+1}/{MAX_RETRIES}] HTTP {e.code}, waiting {delay:.1f}s...")
                time.sleep(delay)
                continue
            print(f"HTTP {e.code} Error:")
            print(json.dumps(err, indent=2))
            sys.exit(1)
        except urllib.error.URLError as e:
            if attempt < MAX_RETRIES:
                delay = RETRY_BASE_DELAY * (2 ** attempt) + random.uniform(0, 1)
                print(f"  [retry {attempt+1}/{MAX_RETRIES}] Network error, waiting {delay:.1f}s...")
                time.sleep(delay)
                continue
            print(f"Network error: {e.reason}")
            sys.exit(1)


def api_batch_post(requests_list, token):
    """Send a batch POST to the Graph API. Max 50 per batch.

    requests_list: [{"method": "POST", "relative_url": "...", "body": "..."}, ...]
    Returns: list of {code, body} dicts.
    """
    if len(requests_list) > 50:
        requests_list = requests_list[:50]
    data, _ = api_post("", {
        "batch": json.dumps(requests_list),
    }, token, timeout=60)
    # data is the raw response — a list of {code, headers, body} objects
    results = []
    if isinstance(data, list):
        for item in data:
            code = item.get("code", 500)
            body_str = item.get("body", "{}")
            try:
                body = json.loads(body_str)
            except (json.JSONDecodeError, TypeError):
                body = {"raw": body_str}
            results.append({"code": code, "body": body})
    return results


def _create_labels_batch(label_names_needed, ad_name, account_id, api_version, token):
    """Create ad labels, using batch API when 2+ labels needed.

    label_names_needed: {"ratio": "label_suffix", ...}  e.g. {"1x1": "default_1x1"}
    Returns: {"ratio": {"id": "...", "name": "..."}, ...}
    """
    result = {}
    items = list(label_names_needed.items())

    if len(items) == 0:
        return result

    if len(items) == 1:
        ratio, suffix = items[0]
        full_name = f"{ad_name} | {suffix}"
        resp, _ = api_post(f"{api_version}/{account_id}/adlabels", {
            "name": full_name,
        }, token)
        label_id = resp.get("id")
        if label_id:
            result[ratio] = {"id": label_id, "name": full_name}
        return result

    # 2+ labels — use batch
    batch_requests = []
    for ratio, suffix in items:
        full_name = f"{ad_name} | {suffix}"
        batch_requests.append({
            "method": "POST",
            "relative_url": f"{api_version}/{account_id}/adlabels",
            "body": urllib.parse.urlencode({"name": full_name}),
        })

    batch_results = api_batch_post(batch_requests, token)

    for i, (ratio, suffix) in enumerate(items):
        full_name = f"{ad_name} | {suffix}"
        if i < len(batch_results) and batch_results[i]["code"] == 200:
            label_id = batch_results[i]["body"].get("id")
            if label_id:
                result[ratio] = {"id": label_id, "name": full_name}
                continue
        # Fallback: create individually
        try:
            resp, _ = api_post(f"{api_version}/{account_id}/adlabels", {
                "name": full_name,
            }, token)
            label_id = resp.get("id")
            if label_id:
                result[ratio] = {"id": label_id, "name": full_name}
        except SystemExit:
            print(f"  WARNING: Could not create label for {ratio}")

    return result


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_validate_token():
    """Validate access token — show app, user, scopes, expiry."""
    token, _, api_version = get_config()

    data, _ = api_get(f"{api_version}/debug_token", {
        "input_token": token,
        "access_token": token,
    })

    info = data.get("data", {})
    print("=== Token Validation ===")
    print(f"  App ID:       {info.get('app_id', 'N/A')}")
    print(f"  Type:         {info.get('type', 'N/A')}")
    print(f"  User ID:      {info.get('user_id', 'N/A')}")
    print(f"  Valid:        {info.get('is_valid', 'N/A')}")
    print(f"  Expires:      {info.get('expires_at', 'never') if info.get('expires_at', 0) != 0 else 'never'}")
    print(f"  Issued:       {info.get('issued_at', 'N/A')}")

    scopes = info.get("scopes", [])
    print(f"  Scopes ({len(scopes)}):")
    for s in scopes:
        print(f"    - {s}")

    granular = info.get("granular_scopes", [])
    if granular:
        print(f"  Granular Scopes:")
        for g in granular:
            print(f"    - {g.get('scope', '?')}: {g.get('target_ids', 'all')}")


def cmd_account_info():
    """Fetch ad account details."""
    token, account_id, api_version = get_config()

    fields = "name,account_id,account_status,currency,timezone_name,timezone_offset_hours_utc,amount_spent,balance,spend_cap,business_name,disable_reason"
    data, _ = api_get(f"{api_version}/{account_id}", {"fields": fields}, token)

    status_map = {
        1: "ACTIVE",
        2: "DISABLED",
        3: "UNSETTLED",
        7: "PENDING_RISK_REVIEW",
        8: "PENDING_SETTLEMENT",
        9: "IN_GRACE_PERIOD",
        100: "PENDING_CLOSURE",
        101: "CLOSED",
        201: "ANY_ACTIVE",
        202: "ANY_CLOSED",
    }

    raw_status = data.get("account_status", "?")
    status_label = status_map.get(raw_status, str(raw_status))

    print("=== Ad Account Info ===")
    print(f"  Name:         {data.get('name', 'N/A')}")
    print(f"  Account ID:   {data.get('account_id', 'N/A')}")
    print(f"  Status:       {status_label} ({raw_status})")
    print(f"  Currency:     {data.get('currency', 'N/A')}")
    print(f"  Timezone:     {data.get('timezone_name', 'N/A')} (UTC{data.get('timezone_offset_hours_utc', '?'):+})")
    print(f"  Business:     {data.get('business_name', 'N/A')}")
    print(f"  Amount Spent: {data.get('amount_spent', 'N/A')} (lifetime, in cents)")
    print(f"  Balance:      {data.get('balance', 'N/A')}")
    print(f"  Spend Cap:    {data.get('spend_cap', 'none')}")

    if data.get("disable_reason") and data["disable_reason"] != 0:
        print(f"  Disable Reason: {data['disable_reason']}")


def cmd_health_check():
    """Check rate limit utilization by making a lightweight call."""
    token, account_id, api_version = get_config()

    _, headers = api_get(f"{api_version}/{account_id}", {"fields": "name"}, token)

    print("=== Rate Limit Health Check ===")

    throttle_keys = [
        ("x-fb-ads-insights-throttle", "Insights Throttle"),
        ("x-ad-account-usage", "Ad Account Usage"),
        ("x-business-use-case-usage", "Business Use Case"),
        ("x-app-usage", "App Usage"),
    ]

    found_any = False
    for header_key, label in throttle_keys:
        val = headers.get(header_key)
        if val:
            found_any = True
            print(f"\n  {label} ({header_key}):")
            try:
                parsed = json.loads(val)
                print(f"    {json.dumps(parsed, indent=4)}")
            except json.JSONDecodeError:
                print(f"    {val}")

    if not found_any:
        print("  No throttle headers returned (normal for low-volume accounts).")
        print("  Headers will appear once you make enough API calls.")

    print("\n  Tip: acc_id_util_pct > 75% = slow down, > 90% = pause")


def cmd_list_campaigns(limit=10):
    """List recent campaigns with status."""
    token, account_id, api_version = get_config()

    fields = "name,status,objective,daily_budget,lifetime_budget,created_time,updated_time"
    data, _ = api_get(f"{api_version}/{account_id}/campaigns", {
        "fields": fields,
        "limit": str(limit),
    }, token)

    campaigns = data.get("data", [])
    print(f"=== Campaigns (showing {len(campaigns)}) ===\n")

    if not campaigns:
        print("  No campaigns found.")
        return

    for c in campaigns:
        budget = c.get("daily_budget") or c.get("lifetime_budget") or "N/A"
        budget_type = "daily" if c.get("daily_budget") else "lifetime" if c.get("lifetime_budget") else ""
        print(f"  {c.get('id', '?')}")
        print(f"    Name:      {c.get('name', 'N/A')}")
        print(f"    Status:    {c.get('status', 'N/A')}")
        print(f"    Objective: {c.get('objective', 'N/A')}")
        print(f"    Budget:    {budget} ({budget_type})")
        print(f"    Created:   {c.get('created_time', 'N/A')}")
        print()


def cmd_insights_summary(date_preset="last_7d"):
    """Account-level spend/impressions/clicks summary."""
    token, account_id, api_version = get_config()

    fields = "impressions,clicks,spend,ctr,cpc,cpm,reach,frequency"
    data, _ = api_get(f"{api_version}/{account_id}/insights", {
        "fields": fields,
        "date_preset": date_preset,
    }, token)

    results = data.get("data", [])
    print(f"=== Insights Summary ({date_preset}) ===\n")

    if not results:
        print("  No data for this period.")
        return

    row = results[0]
    print(f"  Date Range:   {row.get('date_start', '?')} to {row.get('date_stop', '?')}")
    print(f"  Impressions:  {row.get('impressions', '0'):>12}")
    print(f"  Reach:        {row.get('reach', '0'):>12}")
    print(f"  Clicks:       {row.get('clicks', '0'):>12}")
    print(f"  Spend:        ${row.get('spend', '0'):>11}")
    print(f"  CTR:          {row.get('ctr', '0'):>11}%")
    print(f"  CPC:          ${row.get('cpc', '0'):>11}")
    print(f"  CPM:          ${row.get('cpm', '0'):>11}")
    print(f"  Frequency:    {row.get('frequency', '0'):>12}")


def cmd_cgk_report(date_preset="today", slack_target=None, threaded=False, report_type=None):
    """CGK performance report — Shopify vs Amazon breakdown.

    Pulls campaign-level insights and splits by channel:
    - Shopify campaigns: Spend, Revenue, ROAS, CPA, Purchases
    - Amazon campaigns (name contains 'amz'): Spend, Outbound Clicks, Cost/Click
    """
    token, account_id, api_version = get_config()

    fields = (
        "campaign_name,spend,impressions,clicks,ctr,"
        "actions,action_values,cost_per_action_type,"
        "purchase_roas,outbound_clicks,cost_per_outbound_click"
    )
    data, _ = api_get(f"{api_version}/{account_id}/insights", {
        "fields": fields,
        "date_preset": date_preset,
        "level": "campaign",
        "limit": "500",
    }, token)

    rows = data.get("data", [])
    if not rows:
        _brand = os.environ.get("BRAND_NAME", "Meta Ads")
        print(f"=== {_brand} Report ({date_preset}) ===\n")
        print("  No data for this period.")
        return

    # Helper to extract a specific action value
    def get_action(row, action_type, key="actions"):
        for a in row.get(key, []):
            if a.get("action_type") == action_type:
                return float(a.get("value", 0))
        return 0.0

    def get_action_value(row, action_type):
        return get_action(row, action_type, key="action_values")

    # Filter out zero-spend rows
    rows = [r for r in rows if float(r.get("spend", 0)) > 0]
    if not rows:
        _brand = os.environ.get("BRAND_NAME", "Meta Ads")
        print(f"=== {_brand} Report ({date_preset}) ===\n")
        print("  No campaigns with spend in this period.")
        return

    # Split campaigns
    amazon = [r for r in rows if "amz" in r.get("campaign_name", "").lower()]
    shopify = [r for r in rows if "amz" not in r.get("campaign_name", "").lower()]

    # Shopify aggregation
    sh_spend = sum(float(r.get("spend", 0)) for r in shopify)
    sh_revenue = sum(get_action_value(r, "purchase") for r in shopify)
    if sh_revenue == 0:
        sh_revenue = sum(get_action_value(r, "omni_purchase") for r in shopify)
    if sh_revenue == 0:
        sh_revenue = sum(get_action_value(r, "offsite_conversion.fb_pixel_purchase") for r in shopify)
    sh_purchases = sum(get_action(r, "purchase") for r in shopify)
    if sh_purchases == 0:
        sh_purchases = sum(get_action(r, "omni_purchase") for r in shopify)
    if sh_purchases == 0:
        sh_purchases = sum(get_action(r, "offsite_conversion.fb_pixel_purchase") for r in shopify)
    sh_roas = sh_revenue / sh_spend if sh_spend > 0 else 0
    sh_cpa = sh_spend / sh_purchases if sh_purchases > 0 else 0

    # Amazon aggregation
    amz_spend = sum(float(r.get("spend", 0)) for r in amazon)
    amz_outbound = 0
    for r in amazon:
        for a in r.get("outbound_clicks", []):
            if a.get("action_type") == "outbound_click":
                amz_outbound += int(a.get("value", 0))
    if amz_outbound == 0:
        amz_outbound = sum(int(get_action(r, "link_click")) for r in amazon)
    amz_cpc = amz_spend / amz_outbound if amz_outbound > 0 else 0

    total_spend = sh_spend + amz_spend
    date_start = rows[0].get("date_start", "?")
    date_stop = rows[0].get("date_stop", "?")

    # Terminal output
    _brand = os.environ.get("BRAND_NAME", "Meta Ads")
    print(f"=== {_brand} Report ({date_preset}: {date_start} to {date_stop}) ===\n")
    print("SHOPIFY CAMPAIGNS")
    print(f"  Spend:       ${sh_spend:,.2f}")
    print(f"  Revenue:     ${sh_revenue:,.2f}")
    print(f"  ROAS:        {sh_roas:.2f}x")
    print(f"  CPA:         ${sh_cpa:,.2f}")
    print(f"  Purchases:   {int(sh_purchases)}")
    if shopify:
        print(f"  ({len(shopify)} campaign{'s' if len(shopify) != 1 else ''})")
    if amazon:
        print()
        print("AMAZON CAMPAIGNS")
        print(f"  Spend:          ${amz_spend:,.2f}")
        print(f"  Outbound Clicks: {amz_outbound:,}")
        print(f"  Cost/Click:     ${amz_cpc:.2f}")
        print(f"  ({len(amazon)} campaign{'s' if len(amazon) != 1 else ''})")
    print()
    print("ACCOUNT TOTAL")
    print(f"  Total Spend: ${total_spend:,.2f}")
    print(f"\n--- Campaign Detail ---\n")
    for r in shopify:
        name = r.get("campaign_name", "?")
        sp = float(r.get("spend", 0))
        rev = get_action_value(r, "purchase") or get_action_value(r, "omni_purchase")
        purch = int(get_action(r, "purchase") or get_action(r, "omni_purchase"))
        roas = rev / sp if sp > 0 else 0
        print(f"  [Shopify] {name}")
        print(f"    Spend: ${sp:,.2f}  Revenue: ${rev:,.2f}  ROAS: {roas:.2f}x  Purchases: {purch}")
    if amazon:
        for r in amazon:
            name = r.get("campaign_name", "?")
            sp = float(r.get("spend", 0))
            oc = 0
            for a in r.get("outbound_clicks", []):
                if a.get("action_type") == "outbound_click":
                    oc += int(a.get("value", 0))
            if oc == 0:
                oc = int(get_action(r, "link_click"))
            cpc = sp / oc if oc > 0 else 0
            print(f"  [Amazon] {name}")
            print(f"    Spend: ${sp:,.2f}  Outbound Clicks: {oc:,}  Cost/Click: ${cpc:.2f}")

    # Post to Slack with proper formatting
    if slack_target:
        lines = []
        lines.append(f":chart_with_upwards_trend: *{_brand} Meta Ads — {date_preset}* ({date_start})")
        lines.append("")
        lines.append(f":shopping_trolley: *Shopify* ({len(shopify)} campaigns)")
        lines.append(f"${sh_spend:,.2f} spend · ${sh_revenue:,.2f} rev · *{sh_roas:.2f}x ROAS* · ${sh_cpa:,.2f} CPA · {int(sh_purchases)} purchases")
        if amazon:
            lines.append("")
            lines.append(f":package: *Amazon* ({len(amazon)} campaigns)")
            lines.append(f"${amz_spend:,.2f} spend · {amz_outbound:,} clicks · ${amz_cpc:.2f} CPC")
        lines.append("")
        lines.append(f"*Total Spend: ${total_spend:,.2f}*")
        lines.append("")
        lines.append("─" * 30)
        for r in shopify:
            name = r.get("campaign_name", "?")
            sp = float(r.get("spend", 0))
            rev = get_action_value(r, "purchase") or get_action_value(r, "omni_purchase")
            purch = int(get_action(r, "purchase") or get_action(r, "omni_purchase"))
            roas = rev / sp if sp > 0 else 0
            lines.append(f"• *{name}*")
            lines.append(f"  ${sp:,.2f} → ${rev:,.2f} · {roas:.2f}x · {purch} purch")
        if amazon:
            for r in amazon:
                name = r.get("campaign_name", "?")
                sp = float(r.get("spend", 0))
                oc = 0
                for a in r.get("outbound_clicks", []):
                    if a.get("action_type") == "outbound_click":
                        oc += int(a.get("value", 0))
                if oc == 0:
                    oc = int(get_action(r, "link_click"))
                cpc = sp / oc if oc > 0 else 0
                lines.append(f"• *{name}*")
                lines.append(f"  ${sp:,.2f} · {oc:,} clicks · ${cpc:.2f} CPC")

        slack_msg = "\n".join(lines)
        rtype = report_type or _infer_report_type(date_preset)

        if threaded:
            header_ts = _post_or_reuse_header(slack_target, rtype)
            if header_ts:
                cc = _get_cc_line(rtype)
                _post_to_slack(slack_target, slack_msg + cc, thread_ts=header_ts)
                print(f"  THREAD_TS={header_ts}")
            else:
                _post_to_slack(slack_target, slack_msg)  # fallback
        else:
            _post_to_slack(slack_target, slack_msg)


HISTORY_DIR = pathlib.Path(__file__).parent.parent / "history"


def _save_snapshot(data, date_preset):
    """Save snapshot to history directory. Returns filepath."""
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y-%m-%d-%H%M%S")
    filepath = HISTORY_DIR / f"{ts}-{date_preset}.json"
    filepath.write_text(json.dumps(data, indent=2) + "\n")
    _prune_history()
    return filepath


def _load_last_snapshot(date_preset=None):
    """Load the most recent snapshot, optionally filtered by date_preset."""
    if not HISTORY_DIR.exists():
        return None
    files = sorted(HISTORY_DIR.glob("*.json"), reverse=True)
    for f in files:
        if date_preset and date_preset not in f.name:
            continue
        try:
            return json.loads(f.read_text())
        except (json.JSONDecodeError, OSError):
            continue
    return None


def _compute_trends(date_preset, lookback_days=7):
    """Compute multi-day trends from snapshot history.

    Returns a dict with ROAS, spend, revenue trends and notable changes,
    or None if insufficient data.
    """
    if not HISTORY_DIR.exists():
        return None

    cutoff = datetime.datetime.now() - datetime.timedelta(days=lookback_days)
    files = sorted(HISTORY_DIR.glob(f"*-{date_preset}.json"))

    snapshots = []
    for f in files:
        # Parse date from filename: YYYY-MM-DD-HHMMSS-preset.json
        try:
            parts = f.stem.split("-")
            file_date = datetime.datetime(int(parts[0]), int(parts[1]), int(parts[2]))
            if file_date < cutoff:
                continue
            data = json.loads(f.read_text())
            data["_file_date"] = file_date
            snapshots.append(data)
        except (ValueError, IndexError, json.JSONDecodeError, OSError):
            continue

    if len(snapshots) < 2:
        return None

    current = snapshots[-1]
    earliest = snapshots[0]

    cur_sh = current.get("shopify", {})
    ear_sh = earliest.get("shopify", {})

    cur_roas = cur_sh.get("roas", 0)
    ear_roas = ear_sh.get("roas", 0)
    roas_delta = round(cur_roas - ear_roas, 2)
    roas_pct = round((roas_delta / ear_roas) * 100, 1) if ear_roas else 0

    if roas_delta > 0.05:
        roas_dir = "up"
    elif roas_delta < -0.05:
        roas_dir = "down"
    else:
        roas_dir = "flat"

    # Compute averages across all snapshots
    spends = [s.get("shopify", {}).get("spend", 0) for s in snapshots]
    revenues = [s.get("shopify", {}).get("revenue", 0) for s in snapshots]
    avg_spend = round(sum(spends) / len(spends), 2) if spends else 0
    avg_revenue = round(sum(revenues) / len(revenues), 2) if revenues else 0
    cur_spend = cur_sh.get("spend", 0)
    cur_revenue = cur_sh.get("revenue", 0)

    spend_dir = "up" if cur_spend > avg_spend * 1.05 else ("down" if cur_spend < avg_spend * 0.95 else "flat")
    rev_dir = "up" if cur_revenue > avg_revenue * 1.05 else ("down" if cur_revenue < avg_revenue * 0.95 else "flat")

    # Notable items
    notable = []
    if roas_pct != 0:
        notable.append(f"ROAS {'up' if roas_pct > 0 else 'down'} {abs(roas_pct)}% over {lookback_days}d")

    # Top ad movers — compare current vs earliest top_ads
    cur_ads = {a["ad_id"]: a for a in current.get("top_ads", []) if a.get("ad_id")}
    ear_ads = {a["ad_id"]: a for a in earliest.get("top_ads", []) if a.get("ad_id")}
    for ad_id, cur_ad in cur_ads.items():
        if ad_id in ear_ads:
            ear_ad = ear_ads[ad_id]
            d_roas = cur_ad.get("roas", 0) - ear_ad.get("roas", 0)
            if abs(d_roas) >= 0.5:
                name = cur_ad.get("ad_name", "Unknown")[:30]
                if d_roas > 0:
                    notable.append(f"{name} ROAS improved from {ear_ad.get('roas', 0):.2f}x to {cur_ad.get('roas', 0):.2f}x")
                else:
                    notable.append(f"{name} ROAS declined from {ear_ad.get('roas', 0):.2f}x to {cur_ad.get('roas', 0):.2f}x")

    return {
        "snapshots_count": len(snapshots),
        "period": f"{lookback_days} days",
        "shopify_roas": {"current": cur_roas, "previous": ear_roas, "direction": roas_dir, "delta": roas_delta, "pct": roas_pct},
        "shopify_spend": {"current": cur_spend, "avg": avg_spend, "direction": spend_dir},
        "shopify_revenue": {"current": cur_revenue, "avg": avg_revenue, "direction": rev_dir},
        "notable": notable,
    }


def _format_trends_section(trends):
    """Format trend data as Slack mrkdwn section."""
    if not trends:
        return ""

    lines = []
    period = trends["period"]
    lines.append(f":chart_with_upwards_trend: *{period} Trends* ({trends['snapshots_count']} snapshots)")

    roas = trends["shopify_roas"]
    arrow = ":arrow_upper_right:" if roas["direction"] == "up" else (":arrow_lower_right:" if roas["direction"] == "down" else ":left_right_arrow:")
    sign = "+" if roas["delta"] >= 0 else ""
    lines.append(f"• Shopify ROAS: {roas['previous']:.2f}x → {roas['current']:.2f}x ({sign}{roas['pct']}%) {arrow}")

    spend = trends["shopify_spend"]
    lines.append(f"• Avg daily spend: ${spend['avg']:,.0f} → ${spend['current']:,.0f}")

    rev = trends["shopify_revenue"]
    lines.append(f"• Avg daily revenue: ${rev['avg']:,.0f} → ${rev['current']:,.0f}")

    for note in trends.get("notable", []):
        lines.append(f"• _{note}_")

    return "\n".join(lines)


def _prune_history():
    """Auto-prune old snapshot files to prevent unbounded growth.

    Strategy:
    - Last 7 days: keep all snapshots
    - 8-30 days: keep 1 per day per preset (latest each day)
    - 30+ days: delete
    """
    if not HISTORY_DIR.exists():
        return

    now = datetime.datetime.now()
    week_ago = now - datetime.timedelta(days=7)
    month_ago = now - datetime.timedelta(days=30)

    # Group files by date + preset
    daily_keep = {}  # key: "YYYY-MM-DD-preset" -> latest file path
    to_delete = []

    for f in HISTORY_DIR.glob("*.json"):
        try:
            parts = f.stem.split("-")
            file_date = datetime.datetime(int(parts[0]), int(parts[1]), int(parts[2]))
            # Extract preset: everything after the HHMMSS part
            preset = "-".join(parts[4:]) if len(parts) > 4 else parts[3] if len(parts) > 3 else "unknown"
        except (ValueError, IndexError):
            continue

        if file_date >= week_ago:
            # Keep all from last 7 days
            continue
        elif file_date >= month_ago:
            # 8-30 days: keep 1 per day per preset
            day_key = f"{parts[0]}-{parts[1]}-{parts[2]}-{preset}"
            if day_key not in daily_keep or f.name > daily_keep[day_key].name:
                if day_key in daily_keep:
                    to_delete.append(daily_keep[day_key])
                daily_keep[day_key] = f
            else:
                to_delete.append(f)
        else:
            # 30+ days: delete
            to_delete.append(f)

    for f in to_delete:
        try:
            f.unlink()
        except OSError:
            pass

    if to_delete:
        print(f"  [History] Pruned {len(to_delete)} old snapshot(s)")


def _workspace_root():
    """Derive the workspace root from this script's location.

    Path: <root>/skills/meta-ads/scripts/meta_api_helper.py → climb 4 dirs.
    """
    return pathlib.Path(__file__).resolve().parent.parent.parent.parent


def _get_slack_token():
    """Read Slack bot token from openclaw config."""
    config_path = _workspace_root() / "openclaw.json"
    if config_path.exists():
        try:
            cfg = json.loads(config_path.read_text())
            token = cfg.get("channels", {}).get("slack", {}).get("botToken", "")
            if token and not token.startswith("${"):
                return token
        except (json.JSONDecodeError, OSError):
            pass
    return os.environ.get("SLACK_BOT_TOKEN", "")


def _get_allowed_channels():
    """Read allowed channel IDs from openclaw.json config.

    Uses the same channels.slack.channels section that openclaw's built-in
    groupPolicy="allowlist" uses, keeping a single source of truth.
    """
    config_path = _workspace_root() / "openclaw.json"
    if config_path.exists():
        try:
            cfg = json.loads(config_path.read_text())
            channels = cfg.get("channels", {}).get("slack", {}).get("channels", {})
            return set(channels.keys())
        except (json.JSONDecodeError, OSError):
            pass
    return set()


def _dm_user(user_id, text):
    """Send a direct message to a Slack user via conversations.open + chat.postMessage."""
    token = _get_slack_token()
    if not token:
        return
    try:
        open_data = json.dumps({"users": user_id}).encode("utf-8")
        open_req = urllib.request.Request(
            "https://slack.com/api/conversations.open",
            data=open_data,
            headers={
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": f"Bearer {token}",
            },
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
            headers={
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": f"Bearer {token}",
            },
        )
        urllib.request.urlopen(msg_req, timeout=10)
    except (OSError, json.JSONDecodeError, urllib.error.URLError):
        pass


def _post_to_slack(target, text, thread_ts=None):
    """Post text to a Slack channel using Slack Web API directly.

    target: e.g. "channel:C0XXXXXXXXX" or just "C0XXXXXXXXX"
    Returns the message ts on success (for threading), or None on failure.
    """
    token = _get_slack_token()
    if not token:
        print("\n[Slack] No bot token found")
        return None

    # Extract channel ID from "channel:XXXXX" format
    channel_id = target.split(":", 1)[-1] if ":" in target else target

    # Defense-in-depth: only allow posting to channels in this workspace
    # DMs (D-prefix) always allowed — user is talking directly to the bot
    if not channel_id.startswith("D"):
        allowed = _get_allowed_channels()
        if allowed and channel_id not in allowed:
            print(f"\n[Slack] BLOCKED: channel {channel_id} not in workspace allowlist")
            workspace = _workspace_root().name
            _dm_user(
                "U0ACL7UV3RV",
                f":warning: *Channel Allowlist Block*\n\n"
                f"Workspace `{workspace}` tried to post to channel `{channel_id}` "
                f"but it's not in this workspace's Slack channel list.\n\n"
                f"Should I add this channel to the openclaw allowlist in "
                f"`openclaw.json`? Or is this a misconfiguration?",
            )
            return None

    payload = {
        "channel": channel_id,
        "text": text,
    }
    if thread_ts:
        payload["thread_ts"] = thread_ts

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=data,
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": f"Bearer {token}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            if result.get("ok"):
                print(f"\n[Slack] Posted to #{channel_id}")
                return result.get("ts")
            else:
                print(f"\n[Slack] API error: {result.get('error', 'unknown')}")
                return None
    except Exception as e:
        print(f"\n[Slack] Failed: {e}")
        return None


def _find_recent_header(target, header_text, window_minutes=10):
    """Check if a matching header was recently posted. Returns ts if found."""
    token = _get_slack_token()
    if not token:
        return None
    channel_id = target.split(":", 1)[-1] if ":" in target else target
    oldest = str(time.time() - window_minutes * 60)
    params = urllib.parse.urlencode({
        "channel": channel_id, "oldest": oldest, "limit": "20",
    })
    req = urllib.request.Request(
        f"https://slack.com/api/conversations.history?{params}",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            if not result.get("ok"):
                return None
            header_first_line = header_text.split("\n")[0].strip()
            for msg in result.get("messages", []):
                msg_first_line = (msg.get("text") or "").split("\n")[0].strip()
                if msg_first_line == header_first_line:
                    return msg.get("ts")
    except Exception:
        pass
    return None


def _post_or_reuse_header(slack_target, rtype):
    """Post a report header or reuse one if recently posted. Returns thread ts."""
    header = _report_header(rtype)
    existing_ts = _find_recent_header(slack_target, header)
    if existing_ts:
        print(f"\n[Slack] Reusing existing header: {existing_ts}")
        return existing_ts
    return _post_to_slack(slack_target, header)


# ---------------------------------------------------------------------------
# Report Types + Threaded Delivery
# ---------------------------------------------------------------------------

REPORT_TYPES = {
    "heartbeat": {"emoji": ":chart_with_upwards_trend:", "label": "Heartbeat"},
    "daily_recap": {"emoji": ":sunrise:", "label": "Daily Recap"},
    "weekly_recap": {"emoji": ":calendar:", "label": "Weekly Recap"},
    "creative_intelligence": {"emoji": ":art:", "label": "Creative Intelligence"},
}


def _infer_report_type(date_preset):
    """Auto-map date_preset to a report type."""
    if date_preset == "yesterday":
        return "daily_recap"
    elif date_preset in ("last_7d", "last_7_days"):
        return "weekly_recap"
    else:
        return "heartbeat"


def _report_header(report_type):
    """Generate short channel header message for threaded delivery."""
    _brand = os.environ.get("BRAND_NAME", "Meta Ads")
    rt = REPORT_TYPES.get(report_type, REPORT_TYPES["heartbeat"])
    now = datetime.datetime.now()
    date_str = now.strftime("%b %-d, %Y")
    hour = now.strftime("%-I %p").lstrip("0")
    return (
        f"{rt['emoji']} *{_brand} Meta Ads — {hour} {rt['label']}* | {date_str}\n\n"
        f":thread: Full report in thread below :point_down:"
    )


# ---------------------------------------------------------------------------
# CC Subscriptions
# ---------------------------------------------------------------------------

SUBSCRIPTIONS_FILE = pathlib.Path(__file__).parent.parent / "report-subscriptions.json"


def _load_subscriptions():
    """Load CC subscriptions from JSON file."""
    if SUBSCRIPTIONS_FILE.exists():
        try:
            return json.loads(SUBSCRIPTIONS_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {"heartbeat": [], "daily_recap": [], "weekly_recap": [], "creative_intelligence": []}


def _save_subscriptions(subs):
    """Save CC subscriptions to JSON file."""
    SUBSCRIPTIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SUBSCRIPTIONS_FILE.write_text(json.dumps(subs, indent=2) + "\n")


def _get_cc_line(report_type):
    """Return CC mention line for a report type, or empty string."""
    subs = _load_subscriptions()
    user_ids = subs.get(report_type, [])
    if not user_ids:
        return ""
    mentions = " ".join(f"<@{uid}>" for uid in user_ids)
    return f"\n\ncc: {mentions}"


def cmd_subscribe(report_type, user_id):
    """Subscribe a user to CC notifications for a report type."""
    if report_type not in REPORT_TYPES:
        print(f"ERROR: Unknown report type '{report_type}'. Valid: {', '.join(REPORT_TYPES)}")
        sys.exit(1)
    subs = _load_subscriptions()
    if user_id not in subs.get(report_type, []):
        subs.setdefault(report_type, []).append(user_id)
        _save_subscriptions(subs)
        print(f"Subscribed {user_id} to {report_type} reports.")
    else:
        print(f"{user_id} is already subscribed to {report_type} reports.")


def cmd_unsubscribe(report_type, user_id):
    """Unsubscribe a user from CC notifications for a report type."""
    if report_type not in REPORT_TYPES:
        print(f"ERROR: Unknown report type '{report_type}'. Valid: {', '.join(REPORT_TYPES)}")
        sys.exit(1)
    subs = _load_subscriptions()
    if user_id in subs.get(report_type, []):
        subs[report_type].remove(user_id)
        _save_subscriptions(subs)
        print(f"Unsubscribed {user_id} from {report_type} reports.")
    else:
        print(f"{user_id} is not subscribed to {report_type} reports.")


def cmd_list_subscriptions():
    """List all report subscriptions."""
    subs = _load_subscriptions()
    print("Report Subscriptions:")
    for rtype, users in subs.items():
        rt = REPORT_TYPES.get(rtype, {})
        label = rt.get("label", rtype)
        emoji = rt.get("emoji", "")
        if users:
            print(f"  {emoji} {label}: {', '.join(users)}")
        else:
            print(f"  {emoji} {label}: (none)")


def _format_snapshot_slack(snapshot, prev, budgets, adset_budget_map):
    """Format snapshot data as Slack mrkdwn."""
    _brand = os.environ.get("BRAND_NAME", "Meta Ads")
    lines = []
    ds = snapshot["date_range"]["start"]
    de = snapshot["date_range"]["end"]
    preset = snapshot.get("date_preset", "today")

    # Header
    lines.append(f":chart_with_upwards_trend: *{_brand} Meta Ads — {preset}* ({ds})")
    lines.append("")

    # Shopify summary
    sh = snapshot["shopify"]
    lines.append(f":shopping_trolley: *Shopify*")
    lines.append(f"${sh['spend']:,.2f} spend · ${sh['revenue']:,.2f} rev · *{sh['roas']:.2f}x ROAS* · ${sh['cpa']:,.2f} CPA · {sh['purchases']} purchases")
    if prev:
        p = prev.get("shopify", {})
        d_roas = sh["roas"] - p.get("roas", 0)
        d_rev = sh["revenue"] - p.get("revenue", 0)
        d_spend = sh["spend"] - p.get("spend", 0)
        parts = []
        if d_spend != 0:
            parts.append(f"spend {'+' if d_spend >= 0 else ''}{d_spend:,.2f}")
        if d_rev != 0:
            parts.append(f"rev {'+' if d_rev >= 0 else ''}{d_rev:,.2f}")
        if d_roas != 0:
            parts.append(f"ROAS {'+' if d_roas >= 0 else ''}{d_roas:.2f}")
        if parts:
            lines.append(f"_vs last: {' · '.join(parts)}_")
    lines.append("")

    # Amazon summary (only if campaigns exist)
    amz = snapshot["amazon"]
    if amz.get("campaigns"):
        lines.append(f":package: *Amazon*")
        lines.append(f"${amz['spend']:,.2f} spend · {amz['outbound_clicks']:,} clicks · ${amz['cost_per_click']:.2f} CPC")
        if prev:
            p = prev.get("amazon", {})
            d_spend = amz["spend"] - p.get("spend", 0)
            d_oc = amz["outbound_clicks"] - p.get("outbound_clicks", 0)
            parts = []
            if d_spend != 0:
                parts.append(f"spend {'+' if d_spend >= 0 else ''}{d_spend:,.2f}")
            if d_oc != 0:
                parts.append(f"clicks {'+' if d_oc >= 0 else ''}{d_oc:,}")
            if parts:
                lines.append(f"_vs last: {' · '.join(parts)}_")
        lines.append("")

    total = snapshot["account"]["total_spend"]
    lines.append(f"*Total Spend: ${total:,.2f}*")
    if prev:
        d_total = total - prev.get("account", {}).get("total_spend", 0)
        if d_total != 0:
            lines.append(f"_vs last: {'+' if d_total >= 0 else ''}{d_total:,.2f}_")
    lines.append("")

    # Shopify campaigns
    lines.append("─" * 30)
    lines.append("*Shopify Campaigns*")
    for c in sh["campaigns"]:
        cid = c["id"]
        budget_info = budgets.get(cid, {})
        db = budget_info.get("daily_budget")
        if db:
            bstr = f"${int(db)/100:,.0f}/day"
        elif cid in adset_budget_map:
            bstr = f"${adset_budget_map[cid]/100:,.0f}/day"
        else:
            bstr = "CBO"
        lines.append(f"• *{c['name']}* — {bstr}")
        lines.append(f"  ${c['spend']:,.2f} spend → ${c['revenue']:,.2f} rev · {c['roas']:.2f}x · {c['purchases']} purch")

    if amz.get("campaigns"):
        lines.append("")
        lines.append("*Amazon Campaigns*")
        for c in amz["campaigns"]:
            cid = c["id"]
            budget_info = budgets.get(cid, {})
            db = budget_info.get("daily_budget")
            if db:
                bstr = f"${int(db)/100:,.0f}/day"
            elif cid in adset_budget_map:
                bstr = f"${adset_budget_map[cid]/100:,.0f}/day"
            else:
                bstr = "CBO"
            lines.append(f"• *{c['name']}* — {bstr} · ${c['spend']:,.2f}")

    # Top 5 ads
    lines.append("")
    lines.append("─" * 30)
    lines.append(":trophy: *Top 5 Shopify Ads*")
    for i, ad in enumerate(snapshot["top_ads"], 1):
        lines.append(f"*{i}. {ad['ad_name']}*")
        metrics = f"${ad['spend']:,.2f} → ${ad['revenue']:,.2f} · *{ad['roas']:.2f}x*"
        if ad.get("cpa") and ad["cpa"] > 0:
            metrics += f" · ${ad['cpa']:,.2f} CPA"
        metrics += f" · {ad['purchases']} purch"
        lines.append(metrics)
        if ad.get("ads_manager"):
            lines.append(f"<{ad['ads_manager']}|:gear: Ads Manager>")
        if prev:
            prev_ad = next((a for a in prev.get("top_ads", []) if a.get("ad_id") == ad["ad_id"]), None)
            if prev_ad:
                d_spend = ad["spend"] - prev_ad.get("spend", 0)
                d_rev = ad["revenue"] - prev_ad.get("revenue", 0)
                if d_spend != 0 or d_rev != 0:
                    lines.append(f"_vs last: spend {'+' if d_spend >= 0 else ''}{d_spend:,.2f} · rev {'+' if d_rev >= 0 else ''}{d_rev:,.2f}_")
        lines.append("")

    return "\n".join(lines)


def _format_report_slack(snapshot_text, date_preset):
    """Simple wrapper — for report command, just wrap in code block for now."""
    # report doesn't have structured data, so we just clean up the text
    return snapshot_text


def cmd_cgk_snapshot(date_preset="today", slack_target=None, threaded=False, report_type=None):
    """Full CGK snapshot: account breakdown, top ads, campaigns, ad sets.

    Saves all data to history for trend comparison. Loads last snapshot
    and shows deltas. Supports threaded delivery with --threaded flag.
    """
    token, account_id, api_version = get_config()

    # ── Pull all data ──────────────────────────────────────────────

    # 1. Campaign-level insights (for account breakdown)
    camp_fields = (
        "campaign_id,campaign_name,spend,impressions,clicks,ctr,"
        "actions,action_values,cost_per_action_type,"
        "purchase_roas,outbound_clicks,cost_per_outbound_click"
    )
    camp_data, _ = api_get(f"{api_version}/{account_id}/insights", {
        "fields": camp_fields,
        "date_preset": date_preset,
        "level": "campaign",
        "limit": "500",
    }, token)
    campaign_rows = [r for r in camp_data.get("data", []) if float(r.get("spend", 0)) > 0]

    # 2. Ad-level insights (for top ads)
    ad_fields = (
        "ad_id,ad_name,campaign_name,adset_name,spend,"
        "actions,action_values,cost_per_action_type,purchase_roas"
    )
    ad_data, _ = api_get(f"{api_version}/{account_id}/insights", {
        "fields": ad_fields,
        "date_preset": date_preset,
        "level": "ad",
        "limit": "500",
    }, token)
    ad_rows = [r for r in ad_data.get("data", []) if float(r.get("spend", 0)) > 0]

    # 3. Campaign budgets
    budget_data, _ = api_get(f"{api_version}/{account_id}/campaigns", {
        "fields": "name,status,daily_budget,lifetime_budget",
        "limit": "500",
        "filtering": '[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]',
    }, token)
    budgets = {c["id"]: c for c in budget_data.get("data", [])}

    # 4. Ad set budgets for CBO campaigns
    cbo_ids = [cid for cid, c in budgets.items()
               if not c.get("daily_budget") and not c.get("lifetime_budget")]
    adset_budget_map = {}
    for cid in cbo_ids:
        try:
            as_data, _ = api_get(f"{api_version}/{cid}/adsets", {
                "fields": "name,daily_budget,status",
                "limit": "100",
            }, token)
            total = sum(int(a.get("daily_budget", 0)) for a in as_data.get("data", []))
            if total > 0:
                adset_budget_map[cid] = total
        except Exception:
            pass

    # ── Helper functions ───────────────────────────────────────────

    def get_action(row, action_type, key="actions"):
        for a in row.get(key, []):
            if a.get("action_type") == action_type:
                return float(a.get("value", 0))
        return 0.0

    def get_action_value(row, action_type):
        return get_action(row, action_type, key="action_values")

    # ── Compute metrics ────────────────────────────────────────────

    amazon_camps = [r for r in campaign_rows if "amz" in r.get("campaign_name", "").lower()]
    shopify_camps = [r for r in campaign_rows if "amz" not in r.get("campaign_name", "").lower()]

    sh_spend = sum(float(r.get("spend", 0)) for r in shopify_camps)
    sh_rev = sum(get_action_value(r, "purchase") or get_action_value(r, "omni_purchase") for r in shopify_camps)
    sh_purch = sum(int(get_action(r, "purchase") or get_action(r, "omni_purchase")) for r in shopify_camps)
    sh_roas = sh_rev / sh_spend if sh_spend > 0 else 0
    sh_cpa = sh_spend / sh_purch if sh_purch > 0 else 0

    amz_spend = sum(float(r.get("spend", 0)) for r in amazon_camps)
    amz_oc = 0
    for r in amazon_camps:
        for a in r.get("outbound_clicks", []):
            if a.get("action_type") == "outbound_click":
                amz_oc += int(a.get("value", 0))
    if amz_oc == 0:
        amz_oc = sum(int(get_action(r, "link_click")) for r in amazon_camps)
    amz_cpc = amz_spend / amz_oc if amz_oc > 0 else 0

    total_spend = sh_spend + amz_spend

    # Top 5 Shopify ads
    shopify_ads = [r for r in ad_rows if "amz" not in r.get("campaign_name", "").lower()]
    shopify_ads.sort(key=lambda r: float(r.get("spend", 0)), reverse=True)
    top_ads = shopify_ads[:5]

    # Build Ads Manager links (no API call needed)
    ads_manager_links = {}
    for r in top_ads:
        ad_id = r.get("ad_id", "")
        if ad_id:
            ads_manager_links[ad_id] = _ads_manager_url(ad_id)

    # ── Build snapshot data ────────────────────────────────────────

    snapshot = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "date_preset": date_preset,
        "date_range": {
            "start": campaign_rows[0].get("date_start", "?") if campaign_rows else "?",
            "end": campaign_rows[0].get("date_stop", "?") if campaign_rows else "?",
        },
        "account": {
            "total_spend": round(total_spend, 2),
        },
        "shopify": {
            "spend": round(sh_spend, 2),
            "revenue": round(sh_rev, 2),
            "roas": round(sh_roas, 2),
            "cpa": round(sh_cpa, 2),
            "purchases": sh_purch,
            "campaigns": [{
                "name": r.get("campaign_name", "?"),
                "id": r.get("campaign_id", ""),
                "spend": round(float(r.get("spend", 0)), 2),
                "revenue": round(get_action_value(r, "purchase") or get_action_value(r, "omni_purchase"), 2),
                "roas": round((get_action_value(r, "purchase") or get_action_value(r, "omni_purchase")) / float(r.get("spend", 1)), 2) if float(r.get("spend", 0)) > 0 else 0,
                "purchases": int(get_action(r, "purchase") or get_action(r, "omni_purchase")),
            } for r in shopify_camps],
        },
        "amazon": {
            "spend": round(amz_spend, 2),
            "outbound_clicks": amz_oc,
            "cost_per_click": round(amz_cpc, 2),
            "campaigns": [{
                "name": r.get("campaign_name", "?"),
                "id": r.get("campaign_id", ""),
                "spend": round(float(r.get("spend", 0)), 2),
            } for r in amazon_camps],
        },
        "top_ads": [{
            "ad_id": r.get("ad_id", ""),
            "ad_name": r.get("ad_name", "?"),
            "campaign": r.get("campaign_name", "?"),
            "adset": r.get("adset_name", "?"),
            "spend": round(float(r.get("spend", 0)), 2),
            "revenue": round(get_action_value(r, "purchase") or get_action_value(r, "omni_purchase"), 2),
            "roas": round(((get_action_value(r, "purchase") or get_action_value(r, "omni_purchase")) / float(r.get("spend", 1))), 2) if float(r.get("spend", 0)) > 0 else 0,
            "purchases": int(get_action(r, "purchase") or get_action(r, "omni_purchase")),
            "cpa": round(float(r.get("spend", 0)) / max(int(get_action(r, "purchase") or get_action(r, "omni_purchase")), 1), 2) if int(get_action(r, "purchase") or get_action(r, "omni_purchase")) > 0 else 0,
            "ads_manager": ads_manager_links.get(r.get("ad_id", ""), ""),
        } for r in top_ads],
    }

    # ── Save snapshot ──────────────────────────────────────────────

    filepath = _save_snapshot(snapshot, date_preset)

    # ── Load previous snapshot for comparison ──────────────────────

    prev = _load_last_snapshot(date_preset)
    # Skip if prev is the one we just saved (same timestamp prefix)
    if prev and prev.get("timestamp") == snapshot["timestamp"]:
        # Load second-most-recent
        files = sorted(HISTORY_DIR.glob(f"*-{date_preset}.json"), reverse=True)
        prev = None
        for f in files[1:]:
            try:
                prev = json.loads(f.read_text())
                break
            except Exception:
                continue

    # ── Print report ───────────────────────────────────────────────

    _brand = os.environ.get("BRAND_NAME", "Meta Ads")
    ds = snapshot["date_range"]["start"]
    de = snapshot["date_range"]["end"]
    print(f"=== {_brand} Full Snapshot ({date_preset}: {ds} to {de}) ===\n")

    # Account breakdown
    print("SHOPIFY")
    print(f"  Spend: ${sh_spend:,.2f}  Revenue: ${sh_rev:,.2f}  ROAS: {sh_roas:.2f}x  CPA: ${sh_cpa:,.2f}  Purchases: {sh_purch}")
    if prev:
        p = prev.get("shopify", {})
        d_spend = sh_spend - p.get("spend", 0)
        d_rev = sh_rev - p.get("revenue", 0)
        d_roas = sh_roas - p.get("roas", 0)
        d_purch = sh_purch - p.get("purchases", 0)
        print(f"  vs last: Spend {'+' if d_spend >= 0 else ''}{d_spend:,.2f}  Rev {'+' if d_rev >= 0 else ''}{d_rev:,.2f}  ROAS {'+' if d_roas >= 0 else ''}{d_roas:.2f}  Purch {'+' if d_purch >= 0 else ''}{d_purch}")

    if amazon_camps:
        print()
        print("AMAZON")
        print(f"  Spend: ${amz_spend:,.2f}  Outbound Clicks: {amz_oc:,}  Cost/Click: ${amz_cpc:.2f}")
        if prev:
            p = prev.get("amazon", {})
            d_spend = amz_spend - p.get("spend", 0)
            d_oc = amz_oc - p.get("outbound_clicks", 0)
            print(f"  vs last: Spend {'+' if d_spend >= 0 else ''}{d_spend:,.2f}  Clicks {'+' if d_oc >= 0 else ''}{d_oc:,}")

    print(f"\n  TOTAL SPEND: ${total_spend:,.2f}")
    if prev:
        d_total = total_spend - prev.get("account", {}).get("total_spend", 0)
        print(f"  vs last: {'+' if d_total >= 0 else ''}{d_total:,.2f}")

    # Campaign detail
    print(f"\n--- Shopify Campaigns ---")
    for c in snapshot["shopify"]["campaigns"]:
        cid = c["id"]
        budget_info = budgets.get(cid, {})
        db = budget_info.get("daily_budget")
        if db:
            bstr = f"${int(db)/100:,.0f}/day"
        elif cid in adset_budget_map:
            bstr = f"${adset_budget_map[cid]/100:,.0f}/day*"
        else:
            bstr = "CBO"
        print(f"  {c['name']:<42} {bstr:<14} Spend: ${c['spend']:>8,.2f}  Rev: ${c['revenue']:>8,.2f}  ROAS: {c['roas']:.2f}x  Purch: {c['purchases']}")

    if snapshot["amazon"]["campaigns"]:
        print(f"\n--- Amazon Campaigns ---")
        for c in snapshot["amazon"]["campaigns"]:
            cid = c["id"]
            budget_info = budgets.get(cid, {})
            db = budget_info.get("daily_budget")
            if db:
                bstr = f"${int(db)/100:,.0f}/day"
            elif cid in adset_budget_map:
                bstr = f"${adset_budget_map[cid]/100:,.0f}/day*"
            else:
                bstr = "CBO"
            print(f"  {c['name']:<42} {bstr:<14} Spend: ${c['spend']:>8,.2f}")

    # Top 5 ads
    print(f"\n--- Top 5 Shopify Ads ---")
    for i, ad in enumerate(snapshot["top_ads"], 1):
        print(f"  #{i} {ad['ad_name']}")
        print(f"     {ad['campaign']} > {ad['adset']}")
        print(f"     Spend: ${ad['spend']:,.2f}  Rev: ${ad['revenue']:,.2f}  ROAS: {ad['roas']:.2f}x  CPA: ${ad['cpa']:,.2f}  Purch: {ad['purchases']}")
        if ad.get("ads_manager"):
            print(f"     Ads Manager: {ad['ads_manager']}")
        # Show delta if previous snapshot has this ad
        if prev:
            prev_ad = next((a for a in prev.get("top_ads", []) if a.get("ad_id") == ad["ad_id"]), None)
            if prev_ad:
                d_spend = ad["spend"] - prev_ad.get("spend", 0)
                d_rev = ad["revenue"] - prev_ad.get("revenue", 0)
                print(f"     vs last: Spend {'+' if d_spend >= 0 else ''}{d_spend:,.2f}  Rev {'+' if d_rev >= 0 else ''}{d_rev:,.2f}")

    print(f"\n  Saved to: {filepath}")
    if prev:
        prev_ts = prev.get("timestamp", "?")[:19]
        print(f"  Compared to: {prev_ts}")
    else:
        print(f"  No previous snapshot for comparison (first run).")

    # Post to Slack if requested
    if slack_target:
        slack_msg = _format_snapshot_slack(snapshot, prev, budgets, adset_budget_map)
        rtype = report_type or _infer_report_type(date_preset)

        # Compute and append trends
        trends = _compute_trends(date_preset)
        if trends and trends["snapshots_count"] > 1:
            slack_msg += "\n\n" + _format_trends_section(trends)

        if threaded:
            header_ts = _post_or_reuse_header(slack_target, rtype)
            if header_ts:
                cc = _get_cc_line(rtype)
                _post_to_slack(slack_target, slack_msg + cc, thread_ts=header_ts)
                print(f"  THREAD_TS={header_ts}")
            else:
                _post_to_slack(slack_target, slack_msg)  # fallback
        else:
            _post_to_slack(slack_target, slack_msg)


def cmd_cgk_top_ads(date_preset="today", top_n=5, with_media=False, format_json=False):
    """Top performing Shopify ads by spend with Ads Manager links.

    Excludes Amazon campaigns. Shows spend, revenue, ROAS, cost per purchase,
    and a direct Ads Manager link for each ad.

    --with-media: Enrich each ad with full creative media URL + preview link.
    --format json: Output structured JSON instead of human-readable text.
    """
    token, account_id, api_version = get_config()

    # Pull ad-level insights
    fields = (
        "ad_id,ad_name,campaign_name,adset_name,spend,"
        "actions,action_values,cost_per_action_type,purchase_roas,"
        "impressions,clicks,cpc,ctr,"
        "video_p25_watched_actions,video_thruplay_actions"
    )
    data, _ = api_get(f"{api_version}/{account_id}/insights", {
        "fields": fields,
        "date_preset": date_preset,
        "level": "ad",
        "limit": "500",
    }, token)

    rows = data.get("data", [])

    # Filter: Shopify only (exclude Amazon), spend > 0
    rows = [r for r in rows
            if float(r.get("spend", 0)) > 0
            and "amz" not in r.get("campaign_name", "").lower()]

    if not rows:
        _brand = os.environ.get("BRAND_NAME", "Meta Ads")
        print(f"=== {_brand} Top Ads ({date_preset}) ===\n")
        print("  No Shopify ads with spend in this period.")
        return

    # Helper functions
    def get_action(row, action_type, key="actions"):
        for a in row.get(key, []):
            if a.get("action_type") == action_type:
                return float(a.get("value", 0))
        return 0.0

    def get_action_value(row, action_type):
        return get_action(row, action_type, key="action_values")

    # Sort by spend descending, take top N
    rows.sort(key=lambda r: float(r.get("spend", 0)), reverse=True)
    top = rows[:top_n]

    # Build Ads Manager links (no API call needed)
    ads_manager_links = {}
    for r in top:
        ad_id = r.get("ad_id", "")
        if ad_id:
            ads_manager_links[ad_id] = _ads_manager_url(ad_id)

    # Fetch actual landing page URLs from each ad's creative
    ad_landing_pages = {}
    for r in top:
        ad_id = r.get("ad_id", "")
        if ad_id:
            try:
                copy = _get_ad_copy_quiet(ad_id, token, api_version)
                ad_landing_pages[ad_id] = copy.get("link", "")
            except Exception:
                ad_landing_pages[ad_id] = ""

    # Fetch creative media URLs when --with-media
    ad_media = {}
    if with_media:
        for r in top:
            ad_id = r.get("ad_id", "")
            if not ad_id:
                continue
            try:
                creative_data = _read_creative_full(ad_id, token, api_version)
                ctype = creative_data.get("creative_type", "single_image")
                media_info = {
                    "creative_type": ctype,
                    "is_video": ctype == "single_video" or (ctype == "pac" and creative_data.get("media", {}).get("videos")),
                    "media_url": "",
                    "preview_link": creative_data.get("preview_link", ""),
                }

                if ctype == "single_image":
                    img_hashes = creative_data.get("media", {}).get("images", [])
                    if img_hashes:
                        urls = _get_image_urls(img_hashes, token, api_version, account_id)
                        first = urls.get(img_hashes[0], {})
                        media_info["media_url"] = first.get("url", "")
                elif ctype == "single_video":
                    # Use image_url (720px+ poster frame) for the slide image
                    media_info["media_url"] = creative_data.get("image_url", "")
                elif ctype == "pac":
                    img_hashes = creative_data.get("media", {}).get("images", [])
                    vid_ids = creative_data.get("media", {}).get("videos", [])
                    if img_hashes:
                        urls = _get_image_urls(img_hashes, token, api_version, account_id)
                        first = urls.get(img_hashes[0], {})
                        media_info["media_url"] = first.get("url", "")
                    elif vid_ids:
                        # PAC with videos only — use poster frame
                        media_info["media_url"] = creative_data.get("image_url", "")

                ad_media[ad_id] = media_info
            except Exception as e:
                print(f"  [warn] Could not fetch media for ad {ad_id}: {e}", file=sys.stderr)
                ad_media[ad_id] = {"creative_type": "unknown", "is_video": False, "media_url": "", "preview_link": ""}

    date_start = top[0].get("date_start", "?")
    date_stop = top[0].get("date_stop", "?")

    # Pre-compute per-ad metrics used by both output modes
    ad_metrics = []
    for r in top:
        ad_id = r.get("ad_id", "")
        sp = float(r.get("spend", 0))
        rev = get_action_value(r, "purchase") or get_action_value(r, "omni_purchase")
        purchases = int(get_action(r, "purchase") or get_action(r, "omni_purchase"))
        roas = rev / sp if sp > 0 else 0
        cpp = sp / purchases if purchases > 0 else 0
        impressions = int(r.get("impressions", 0))
        clicks = int(r.get("clicks", 0))
        ctr = float(r.get("ctr", 0))
        cpc = float(r.get("cpc", 0))
        video_plays = get_action(r, "video_play") or get_action(r, "video_view")
        video_thruplays = get_action(r, "video_thruplay")
        thumbstop = (video_plays / impressions * 100) if impressions > 0 and video_plays > 0 else 0
        hold_rate = (video_thruplays / video_plays * 100) if video_plays and video_plays > 0 else 0
        ad_metrics.append({
            "ad_id": ad_id,
            "ad_name": r.get("ad_name", "?"),
            "campaign": r.get("campaign_name", "?"),
            "adset": r.get("adset_name", "?"),
            "spend": sp, "revenue": rev, "roas": roas, "cpa": cpp,
            "purchases": purchases, "impressions": impressions, "clicks": clicks,
            "ctr": ctr, "cpc": cpc, "thumbstop": thumbstop, "hold_rate": hold_rate,
        })

    # Summary totals
    total_spend = sum(m["spend"] for m in ad_metrics)
    total_rev = sum(m["revenue"] for m in ad_metrics)
    total_purch = sum(m["purchases"] for m in ad_metrics)
    total_roas = total_rev / total_spend if total_spend > 0 else 0

    # JSON output mode
    if format_json:
        result = {
            "ads": [],
            "summary": {"spend": total_spend, "revenue": total_rev, "roas": total_roas, "purchases": total_purch},
            "period": {"start": date_start, "end": date_stop, "preset": date_preset},
        }
        for m in ad_metrics:
            entry = {
                "ad_id": m["ad_id"],
                "ad_name": m["ad_name"],
                "campaign": m["campaign"],
                "adset": m["adset"],
                "spend": m["spend"], "revenue": m["revenue"], "roas": m["roas"], "cpa": m["cpa"],
                "ctr": m["ctr"], "cpc": m["cpc"], "thumbstop": m["thumbstop"], "hold_rate": m["hold_rate"],
                "purchases": m["purchases"], "impressions": m["impressions"], "clicks": m["clicks"],
                "ads_manager_link": ads_manager_links.get(m["ad_id"], ""),
                "landing_page": ad_landing_pages.get(m["ad_id"], ""),
            }
            if with_media:
                entry["media"] = ad_media.get(m["ad_id"], {})
            result["ads"].append(entry)
        print(json.dumps(result, indent=2))
        return

    # Human-readable output
    _brand = os.environ.get("BRAND_NAME", "Meta Ads")
    print(f"=== {_brand} Top {len(top)} Shopify Ads ({date_preset}: {date_start} to {date_stop}) ===\n")

    for i, m in enumerate(ad_metrics, 1):
        ads_mgr = ads_manager_links.get(m["ad_id"], "N/A")
        landing_page = ad_landing_pages.get(m["ad_id"], "")

        print(f"  #{i}  {m['ad_name']}")
        print(f"      Campaign:     {m['campaign']}")
        print(f"      Ad Set:       {m['adset']}")
        print(f"      Landing Page: {landing_page or '(none)'}")
        print(f"      Spend:        ${m['spend']:,.2f}")
        print(f"      Revenue:      ${m['revenue']:,.2f}")
        print(f"      ROAS:         {m['roas']:.2f}x")
        print(f"      CPA:          ${m['cpa']:,.2f}")
        print(f"      Purchases:    {m['purchases']}")
        print(f"      CTR:          {m['ctr']:.2f}%")
        print(f"      CPC:          ${m['cpc']:,.2f}")
        if m['thumbstop'] > 0:
            print(f"      Thumbstop:    {m['thumbstop']:.1f}%")
        if m['hold_rate'] > 0:
            print(f"      Hold Rate:    {m['hold_rate']:.1f}%")
        print(f"      Ads Manager:  {ads_mgr}")
        print()

    print(f"  TOP {len(ad_metrics)} TOTAL")
    print(f"    Spend: ${total_spend:,.2f}  Revenue: ${total_rev:,.2f}  ROAS: {total_roas:.2f}x  Purchases: {total_purch}")

    # Landing page breakdown — group performance by actual destination URL
    lp_stats = {}
    for r in top:
        ad_id = r.get("ad_id", "")
        url = ad_landing_pages.get(ad_id, "") or "(unknown)"
        # Normalize: strip query params for grouping
        base_url = url.split("?")[0].rstrip("/") if url != "(unknown)" else url
        if base_url not in lp_stats:
            lp_stats[base_url] = {"spend": 0, "revenue": 0, "purchases": 0, "ads": 0, "full_url": url}
        lp_stats[base_url]["spend"] += float(r.get("spend", 0))
        lp_stats[base_url]["revenue"] += get_action_value(r, "purchase") or get_action_value(r, "omni_purchase")
        lp_stats[base_url]["purchases"] += int(get_action(r, "purchase") or get_action(r, "omni_purchase"))
        lp_stats[base_url]["ads"] += 1

    if len(lp_stats) > 1 or (len(lp_stats) == 1 and "(unknown)" not in lp_stats):
        print(f"\n  --- Landing Page Breakdown ---\n")
        for url, s in sorted(lp_stats.items(), key=lambda x: x[1]["spend"], reverse=True):
            lp_roas = s["revenue"] / s["spend"] if s["spend"] > 0 else 0
            print(f"  {url}")
            print(f"    {s['ads']} ad{'s' if s['ads'] != 1 else ''} · ${s['spend']:,.2f} spend · ${s['revenue']:,.2f} rev · {lp_roas:.2f}x ROAS · {s['purchases']} purchases")
            print()


def _extract_lp_from_creative(creative, ad_id=None, token=None, api_version=None):
    """Extract landing page URL from a creative object.

    Checks all known locations where Meta stores destination URLs:
    1. creative.link_url (top-level)
    2. oss.link_data.link / oss.link_data.call_to_action.value.link
    3. oss.video_data.call_to_action.value.link
    4. oss.template_data.link / oss.template_data.call_to_action.value.link (DPA/catalog)
    5. afs.link_urls[0].website_url (PAC)
    Returns URL string or empty string.
    """
    lp = creative.get("link_url", "")
    if lp:
        return lp

    oss = creative.get("object_story_spec", {})
    # link_data (standard link ads)
    ld = oss.get("link_data", {})
    lp = ld.get("link", "") or ld.get("call_to_action", {}).get("value", {}).get("link", "")
    if lp:
        return lp

    # video_data (video ads)
    vd = oss.get("video_data", {})
    lp = vd.get("call_to_action", {}).get("value", {}).get("link", "")
    if lp:
        return lp

    # template_data (DPA/catalog ads)
    td = oss.get("template_data", {})
    lp = td.get("link", "") or td.get("call_to_action", {}).get("value", {}).get("link", "")
    if lp:
        return lp

    # asset_feed_spec (PAC ads)
    afs = creative.get("asset_feed_spec", {})
    links = afs.get("link_urls", [])
    if links:
        lp = links[0].get("website_url", "")
        if lp:
            return lp

    return ""


def cmd_lp_performance(date_preset="last_30d", format_json=False, campaign_filter=None):
    """Performance aggregated by landing page (actual destination URL).

    Pulls ad-level insights for all ads with spend, then batch-fetches
    each ad's creative to extract the real destination URL.  Aggregates
    spend, purchases, revenue, ROAS, CPA, and AOV per landing page.

    Uses batch API calls (50 ads per request) to avoid the 500 error
    that occurs when requesting creative{} fields with limit=500.
    """
    token, account_id, api_version = get_config()

    # Step 1: Pull ad-level insights (lightweight — no creative fields)
    fields = (
        "ad_id,ad_name,campaign_name,spend,"
        "actions,action_values,cost_per_action_type"
    )
    params = {
        "fields": fields,
        "date_preset": date_preset,
        "level": "ad",
        "limit": "500",
    }
    if campaign_filter:
        params["filtering"] = json.dumps([
            {"field": "campaign.name", "operator": "CONTAIN", "value": campaign_filter}
        ])

    data, _ = api_get(f"{api_version}/{account_id}/insights", params, token)
    rows = data.get("data", [])

    # Paginate if needed
    paging = data.get("paging", {})
    while paging.get("next"):
        try:
            next_url = paging["next"]
            req = urllib.request.Request(next_url)
            with urllib.request.urlopen(req, timeout=30) as resp:
                page = json.loads(resp.read().decode())
            rows.extend(page.get("data", []))
            paging = page.get("paging", {})
        except Exception as e:
            print(f"  [warn] Pagination error: {e}", file=sys.stderr)
            break

    # Filter to spend > 0
    rows = [r for r in rows if float(r.get("spend", 0)) > 0]

    if not rows:
        _brand = os.environ.get("BRAND_NAME", "Meta Ads")
        print(f"=== {_brand} LP Performance ({date_preset}) ===\n")
        print("  No ads with spend in this period.")
        return

    # Helper functions (same as top-ads)
    def get_action(row, action_type, key="actions"):
        for a in row.get(key, []):
            if a.get("action_type") == action_type:
                return float(a.get("value", 0))
        return 0.0

    def get_action_value(row, action_type):
        return get_action(row, action_type, key="action_values")

    # Step 2: Batch-fetch creative link URLs using Graph API batch endpoint
    # (50 per request instead of 478 sequential calls)
    ad_ids = list({r.get("ad_id", "") for r in rows if r.get("ad_id")})
    print(f"  Fetching landing pages for {len(ad_ids)} ads...", file=sys.stderr)

    ad_lp = {}  # ad_id -> landing page URL
    unresolved_ids = []  # ad_ids where batch couldn't find LP
    batch_size = 50
    creative_fields = "creative{link_url,object_story_spec,asset_feed_spec,effective_object_story_id}"
    for i in range(0, len(ad_ids), batch_size):
        batch = ad_ids[i:i + batch_size]
        batch_requests = []
        for ad_id in batch:
            encoded_fields = urllib.parse.quote(creative_fields)
            batch_requests.append({
                "method": "GET",
                "relative_url": f"{api_version}/{ad_id}?fields={encoded_fields}",
            })
        try:
            results = api_batch_post(batch_requests, token)
            for j, res in enumerate(results):
                if res.get("code") != 200:
                    unresolved_ids.append(batch[j])
                    continue
                body = res.get("body", {})
                ad_id = batch[j]
                creative = body.get("creative", {})

                lp = _extract_lp_from_creative(creative, ad_id, token, api_version)
                if lp:
                    ad_lp[ad_id] = lp
                else:
                    unresolved_ids.append(ad_id)
        except Exception as e:
            print(f"  [warn] Batch {i // batch_size + 1} failed: {e}", file=sys.stderr)
            # Fallback to sequential for this batch
            for ad_id in batch:
                try:
                    copy = _get_ad_copy_quiet(ad_id, token, api_version)
                    lp = copy.get("link", "")
                    if lp:
                        ad_lp[ad_id] = lp
                    else:
                        unresolved_ids.append(ad_id)
                except Exception:
                    unresolved_ids.append(ad_id)
        pct = min(100, int((i + len(batch)) / len(ad_ids) * 100))
        print(f"  ... {pct}% ({len(ad_lp)} LPs resolved)", file=sys.stderr)

    # Second pass: try effective_object_story_id -> post attachments for unresolved
    if unresolved_ids:
        print(f"  Resolving {len(unresolved_ids)} remaining via story posts...", file=sys.stderr)
        for ad_id in unresolved_ids:
            if ad_id in ad_lp:
                continue
            try:
                # Fetch effective_object_story_id if we don't have it
                data, _ = api_get(f"{api_version}/{ad_id}", {
                    "fields": "creative{effective_object_story_id}",
                }, token, raise_on_error=True)
                story_id = data.get("creative", {}).get("effective_object_story_id", "")
                if not story_id:
                    continue
                # Query the post for call_to_action link
                try:
                    post_data, _ = api_get(f"{api_version}/{story_id}", {
                        "fields": "call_to_action,link,attachments{url,unshimmed_url}",
                    }, token, raise_on_error=True)
                    lp = post_data.get("link", "")
                    if not lp:
                        cta = post_data.get("call_to_action", {})
                        lp = cta.get("value", {}).get("link", "")
                    if not lp:
                        atts = post_data.get("attachments", {}).get("data", [])
                        for att in atts:
                            lp = att.get("unshimmed_url", "") or att.get("url", "")
                            if lp:
                                break
                    if lp:
                        ad_lp[ad_id] = lp
                except Exception:
                    pass  # Permission denied on partner Page posts — expected for PAC
            except Exception:
                pass

    print(f"  Resolved {len(ad_lp)} of {len(ad_ids)} landing pages.", file=sys.stderr)

    # Step 3: Aggregate by landing page (strip query params for grouping)
    lp_stats = {}
    unknown_ads = []  # track unresolved ad details
    for r in rows:
        ad_id = r.get("ad_id", "")
        raw_url = ad_lp.get(ad_id, "")
        if not raw_url:
            base_url = "(unknown)"
            unknown_ads.append({"ad_id": ad_id, "ad_name": r.get("ad_name", "?"), "spend": float(r.get("spend", 0))})
        else:
            base_url = raw_url.split("?")[0].rstrip("/")

        sp = float(r.get("spend", 0))
        rev = get_action_value(r, "purchase") or get_action_value(r, "omni_purchase")
        purchases = int(get_action(r, "purchase") or get_action(r, "omni_purchase"))

        if base_url not in lp_stats:
            lp_stats[base_url] = {
                "spend": 0, "revenue": 0, "purchases": 0,
                "ads": 0, "full_url": raw_url,
            }
        lp_stats[base_url]["spend"] += sp
        lp_stats[base_url]["revenue"] += rev
        lp_stats[base_url]["purchases"] += purchases
        lp_stats[base_url]["ads"] += 1

    # Sort by spend descending
    sorted_lps = sorted(lp_stats.items(), key=lambda x: x[1]["spend"], reverse=True)

    # Compute derived metrics
    results = []
    for url, s in sorted_lps:
        roas = s["revenue"] / s["spend"] if s["spend"] > 0 else 0
        cpa = s["spend"] / s["purchases"] if s["purchases"] > 0 else 0
        aov = s["revenue"] / s["purchases"] if s["purchases"] > 0 else 0
        results.append({
            "landing_page": url,
            "spend": s["spend"],
            "revenue": s["revenue"],
            "purchases": s["purchases"],
            "roas": roas,
            "cpa": cpa,
            "aov": aov,
            "ad_count": s["ads"],
        })

    # Totals
    total_spend = sum(r["spend"] for r in results)
    total_rev = sum(r["revenue"] for r in results)
    total_purch = sum(r["purchases"] for r in results)
    total_roas = total_rev / total_spend if total_spend > 0 else 0
    total_cpa = total_spend / total_purch if total_purch > 0 else 0
    total_aov = total_rev / total_purch if total_purch > 0 else 0

    # JSON output mode
    if format_json:
        output = {
            "landing_pages": results,
            "summary": {
                "spend": total_spend, "revenue": total_rev,
                "purchases": total_purch, "roas": total_roas,
                "cpa": total_cpa, "aov": total_aov,
                "total_ads": len(rows), "unique_lps": len(results),
            },
            "period": {"preset": date_preset},
        }
        if unknown_ads:
            output["unknown_ads"] = unknown_ads
        print(json.dumps(output, indent=2))
        return

    # Human-readable output
    _brand = os.environ.get("BRAND_NAME", "Meta Ads")
    print(f"=== {_brand} LP Performance ({date_preset}) ===")
    print(f"  {len(rows)} ads with spend → {len(results)} unique landing pages\n")

    for i, r in enumerate(results, 1):
        print(f"  #{i}  {r['landing_page']}")
        print(f"      Spend:     ${r['spend']:,.2f}")
        print(f"      CPA:       ${r['cpa']:,.2f}")
        print(f"      ROAS:      {r['roas']:.2f}x")
        print(f"      AOV:       ${r['aov']:,.2f}")
        print(f"      Purchases: {r['purchases']}")
        print(f"      Revenue:   ${r['revenue']:,.2f}")
        print(f"      Ads:       {r['ad_count']}")
        print()

    print(f"  TOTAL")
    print(f"    Spend: ${total_spend:,.2f}  Revenue: ${total_rev:,.2f}  ROAS: {total_roas:.2f}x")
    print(f"    CPA: ${total_cpa:,.2f}  AOV: ${total_aov:,.2f}  Purchases: {total_purch}")

    if unknown_ads:
        print(f"\n  --- Unknown LP Ads ({len(unknown_ads)}) ---")
        print(f"  These are partnership/Page-post ads where the creative is owned by another Page.")
        for ua in sorted(unknown_ads, key=lambda x: x["spend"], reverse=True):
            print(f"    {ua['ad_id']}  ${ua['spend']:,.2f}  {ua['ad_name'][:80]}")


def cmd_cgk_campaigns(date_preset="today"):
    """CGK campaign-level breakdown with daily budgets, split by channel.

    Shows each campaign with its budget + channel-appropriate metrics.
    Pulls ad set budgets for CBO campaigns where campaign-level budget isn't set.
    Shopify: Spend, Revenue, ROAS, CPA, Purchases, Daily Budget
    Amazon: Spend, Outbound Clicks, Cost/Click, Daily Budget
    """
    token, account_id, api_version = get_config()

    # Step 1: Get campaign list with budgets
    camp_data, _ = api_get(f"{api_version}/{account_id}/campaigns", {
        "fields": "name,status,daily_budget,lifetime_budget",
        "limit": "500",
        "filtering": '[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]',
    }, token)
    campaigns = {c["id"]: c for c in camp_data.get("data", [])}

    # Step 2: For campaigns without daily_budget, pull ad set budgets
    cbo_campaign_ids = [cid for cid, c in campaigns.items()
                        if not c.get("daily_budget") and not c.get("lifetime_budget")
                        and c.get("status") == "ACTIVE"]
    adset_budgets = {}  # campaign_id -> total daily budget from ad sets
    for cid in cbo_campaign_ids:
        try:
            as_data, _ = api_get(f"{api_version}/{cid}/adsets", {
                "fields": "name,daily_budget,lifetime_budget,status",
                "limit": "100",
            }, token)
            total = 0
            for adset in as_data.get("data", []):
                db = adset.get("daily_budget")
                if db:
                    total += int(db)
            if total > 0:
                adset_budgets[cid] = total
        except Exception:
            pass

    # Step 3: Get insights at campaign level
    fields = (
        "campaign_id,campaign_name,spend,impressions,clicks,ctr,"
        "actions,action_values,cost_per_action_type,"
        "purchase_roas,outbound_clicks,cost_per_outbound_click"
    )
    ins_data, _ = api_get(f"{api_version}/{account_id}/insights", {
        "fields": fields,
        "date_preset": date_preset,
        "level": "campaign",
        "limit": "500",
    }, token)

    rows = ins_data.get("data", [])
    _brand = os.environ.get("BRAND_NAME", "Meta Ads")
    if not rows:
        print(f"=== {_brand} Campaigns ({date_preset}) ===\n")
        print("  No data for this period.")
        return

    def get_action(row, action_type, key="actions"):
        for a in row.get(key, []):
            if a.get("action_type") == action_type:
                return float(a.get("value", 0))
        return 0.0

    def get_action_value(row, action_type):
        return get_action(row, action_type, key="action_values")

    def get_budget(campaign_id):
        c = campaigns.get(campaign_id, {})
        daily = c.get("daily_budget")
        lifetime = c.get("lifetime_budget")
        status = c.get("status", "?")
        if daily:
            return f"${int(daily)/100:,.2f}/day", status
        elif lifetime:
            return f"${int(lifetime)/100:,.2f} life", status
        elif campaign_id in adset_budgets:
            total = adset_budgets[campaign_id]
            return f"${total/100:,.2f}/day*", status  # * = sum of ad set budgets
        return "CBO", status

    # Filter: only active campaigns with spend > 0
    active_ids = {cid for cid, c in campaigns.items() if c.get("status") == "ACTIVE"}
    rows = [r for r in rows if float(r.get("spend", 0)) > 0
            and r.get("campaign_id", "") in active_ids]
    if not rows:
        print(f"=== {_brand} Campaigns ({date_preset}) ===\n")
        print("  No active campaigns with spend in this period.")
        return

    amazon = [r for r in rows if "amz" in r.get("campaign_name", "").lower()]
    shopify = [r for r in rows if "amz" not in r.get("campaign_name", "").lower()]

    date_start = rows[0].get("date_start", "?")
    date_stop = rows[0].get("date_stop", "?")

    print(f"=== {_brand} Campaigns ({date_preset}: {date_start} to {date_stop}) ===\n")

    # Shopify campaigns
    print("SHOPIFY CAMPAIGNS")
    print(f"  {'Campaign':<40} {'Budget':<16} {'Spend':>10} {'Revenue':>10} {'ROAS':>7} {'CPA':>8} {'Purch':>6}")
    print(f"  {'─'*40} {'─'*16} {'─'*10} {'─'*10} {'─'*7} {'─'*8} {'─'*6}")

    sh_total_spend = 0
    sh_total_rev = 0
    sh_total_purch = 0
    for r in shopify:
        name = r.get("campaign_name", "?")[:40]
        cid = r.get("campaign_id", "")
        sp = float(r.get("spend", 0))
        rev = get_action_value(r, "purchase") or get_action_value(r, "omni_purchase")
        purch = int(get_action(r, "purchase") or get_action(r, "omni_purchase"))
        roas = rev / sp if sp > 0 else 0
        cpa = sp / purch if purch > 0 else 0
        budget, status = get_budget(cid)

        sh_total_spend += sp
        sh_total_rev += rev
        sh_total_purch += purch

        print(f"  {name:<40} {budget:<16} ${sp:>9,.2f} ${rev:>9,.2f} {roas:>6.2f}x ${cpa:>7,.2f} {purch:>6}")

    sh_total_roas = sh_total_rev / sh_total_spend if sh_total_spend > 0 else 0
    sh_total_cpa = sh_total_spend / sh_total_purch if sh_total_purch > 0 else 0
    print(f"  {'TOTAL':<40} {'':<16} ${sh_total_spend:>9,.2f} ${sh_total_rev:>9,.2f} {sh_total_roas:>6.2f}x ${sh_total_cpa:>7,.2f} {sh_total_purch:>6}")

    print()

    # Amazon campaigns (only if any exist)
    amz_total_spend = 0
    amz_total_clicks = 0
    if amazon:
        print("AMAZON CAMPAIGNS")
        print(f"  {'Campaign':<40} {'Budget':<16} {'Spend':>10} {'OB Clicks':>10} {'Cost/Click':>10}")
        print(f"  {'─'*40} {'─'*16} {'─'*10} {'─'*10} {'─'*10}")

        for r in amazon:
            name = r.get("campaign_name", "?")[:40]
            cid = r.get("campaign_id", "")
            sp = float(r.get("spend", 0))
            oc = 0
            for a in r.get("outbound_clicks", []):
                if a.get("action_type") == "outbound_click":
                    oc += int(a.get("value", 0))
            if oc == 0:
                oc = int(get_action(r, "link_click"))
            cpc = sp / oc if oc > 0 else 0
            budget, status = get_budget(cid)

            amz_total_spend += sp
            amz_total_clicks += oc

            print(f"  {name:<40} {budget:<16} ${sp:>9,.2f} {oc:>10,} ${cpc:>9.2f}")

        amz_total_cpc = amz_total_spend / amz_total_clicks if amz_total_clicks > 0 else 0
        print(f"  {'TOTAL':<40} {'':<16} ${amz_total_spend:>9,.2f} {amz_total_clicks:>10,} ${amz_total_cpc:>9.2f}")

    print(f"\n  ACCOUNT TOTAL SPEND: ${sh_total_spend + amz_total_spend:,.2f}")
    print(f"\n  * = sum of ad set daily budgets (CBO campaign)")
    print(f"  CBO = Advantage Campaign Budget (Meta auto-distributes)")
    print(f"  Use 'adsets --campaign-filter NAME' to see ad set budgets")


def cmd_cgk_adsets(date_preset="today", campaign_filter=None):
    """CGK ad set level breakdown with budgets, split by channel.

    Shows each ad set with its daily budget and performance metrics.
    """
    token, account_id, api_version = get_config()

    fields = (
        "campaign_name,adset_name,adset_id,spend,impressions,clicks,ctr,"
        "actions,action_values,cost_per_action_type,"
        "purchase_roas,outbound_clicks,cost_per_outbound_click"
    )
    ins_data, _ = api_get(f"{api_version}/{account_id}/insights", {
        "fields": fields,
        "date_preset": date_preset,
        "level": "adset",
        "limit": "500",
    }, token)

    rows = ins_data.get("data", [])

    # Filter: spend > 0 only
    rows = [r for r in rows if float(r.get("spend", 0)) > 0]

    # Apply campaign filter if specified
    if campaign_filter:
        cf = campaign_filter.lower()
        rows = [r for r in rows if cf in r.get("campaign_name", "").lower()]

    _brand = os.environ.get("BRAND_NAME", "Meta Ads")
    if not rows:
        print(f"=== {_brand} Ad Sets ({date_preset}) ===\n")
        print("  No ad sets with spend in this period.")
        return

    # Get ad set budgets and status
    adset_ids = [r.get("adset_id", "") for r in rows if r.get("adset_id")]
    adset_budgets = {}
    for asid in adset_ids:
        try:
            as_data, _ = api_get(f"{api_version}/{asid}", {
                "fields": "daily_budget,lifetime_budget,status",
            }, token)
            adset_budgets[asid] = as_data
        except Exception:
            pass

    # Remove inactive ad sets (PAUSED/ARCHIVED) unless they have spend in this period
    # spend > 0 already guaranteed above, so all rows have spend — keep them all
    # But filter out DELETED ad sets
    rows = [r for r in rows
            if adset_budgets.get(r.get("adset_id", ""), {}).get("status") != "DELETED"]

    def get_action(row, action_type, key="actions"):
        for a in row.get(key, []):
            if a.get("action_type") == action_type:
                return float(a.get("value", 0))
        return 0.0

    def get_action_value(row, action_type):
        return get_action(row, action_type, key="action_values")

    def get_adset_budget(adset_id):
        info = adset_budgets.get(adset_id, {})
        daily = info.get("daily_budget")
        lifetime = info.get("lifetime_budget")
        status = info.get("status", "?")
        if daily:
            return f"${int(daily)/100:,.2f}/day", status
        elif lifetime:
            return f"${int(lifetime)/100:,.2f} life", status
        return "auto", status

    amazon = [r for r in rows if "amz" in r.get("campaign_name", "").lower()]
    shopify = [r for r in rows if "amz" not in r.get("campaign_name", "").lower()]

    date_start = rows[0].get("date_start", "?")
    date_stop = rows[0].get("date_stop", "?")

    print(f"=== {_brand} Ad Sets ({date_preset}: {date_start} to {date_stop}) ===\n")

    if shopify:
        print("SHOPIFY AD SETS")
        print(f"  {'Ad Set':<45} {'Budget':<14} {'Spend':>9} {'Rev':>9} {'ROAS':>6} {'CPA':>7} {'Purch':>5}")
        print(f"  {'─'*45} {'─'*14} {'─'*9} {'─'*9} {'─'*6} {'─'*7} {'─'*5}")

        cur_campaign = None
        for r in sorted(shopify, key=lambda x: x.get("campaign_name", "")):
            cname = r.get("campaign_name", "?")
            if cname != cur_campaign:
                print(f"\n  [{cname}]")
                cur_campaign = cname

            asid = r.get("adset_id", "")
            name = r.get("adset_name", "?")[:45]
            sp = float(r.get("spend", 0))
            rev = get_action_value(r, "purchase") or get_action_value(r, "omni_purchase")
            purch = int(get_action(r, "purchase") or get_action(r, "omni_purchase"))
            roas = rev / sp if sp > 0 else 0
            cpa = sp / purch if purch > 0 else 0
            budget, _ = get_adset_budget(asid)

            print(f"  {name:<45} {budget:<14} ${sp:>8,.2f} ${rev:>8,.2f} {roas:>5.2f}x ${cpa:>6,.2f} {purch:>5}")

        print()

    if amazon:
        print()
        print("AMAZON AD SETS")
        print(f"  {'Ad Set':<45} {'Budget':<14} {'Spend':>9} {'OB Clk':>7} {'CPC':>7}")
        print(f"  {'─'*45} {'─'*14} {'─'*9} {'─'*7} {'─'*7}")

        cur_campaign = None
        for r in sorted(amazon, key=lambda x: x.get("campaign_name", "")):
            cname = r.get("campaign_name", "?")
            if cname != cur_campaign:
                print(f"\n  [{cname}]")
                cur_campaign = cname

            asid = r.get("adset_id", "")
            name = r.get("adset_name", "?")[:45]
            sp = float(r.get("spend", 0))
            oc = 0
            for a in r.get("outbound_clicks", []):
                if a.get("action_type") == "outbound_click":
                    oc += int(a.get("value", 0))
            if oc == 0:
                oc = int(get_action(r, "link_click"))
            cpc = sp / oc if oc > 0 else 0
            budget, _ = get_adset_budget(asid)

            print(f"  {name:<45} {budget:<14} ${sp:>8,.2f} {oc:>7,} ${cpc:>6.2f}")

    print(f"\n  ({len(rows)} ad sets with spend)")


def cmd_query(fields, level="campaign", date_preset="today", breakdowns=None,
              time_increment=None, filtering=None, campaign_filter=None, limit=500):
    """Flexible insights query — agent specifies fields, level, breakdowns, etc.

    Args:
        fields: Comma-separated API fields (e.g. "spend,impressions,ctr,actions")
        level: account, campaign, adset, ad
        date_preset: today, yesterday, last_7d, last_30d, this_month, last_month
        breakdowns: Optional comma-separated (e.g. "age,gender" or "publisher_platform")
        time_increment: Optional - 1 (daily), 7 (weekly), monthly, all_days
        filtering: Optional JSON string for filtering
        campaign_filter: Optional text to filter campaign names (case-insensitive contains)
        limit: Max rows (default 500)
    """
    token, account_id, api_version = get_config()

    params = {
        "fields": fields,
        "date_preset": date_preset,
        "level": level,
        "limit": str(limit),
    }
    if breakdowns:
        params["breakdowns"] = breakdowns
    if time_increment:
        params["time_increment"] = time_increment
    if filtering:
        params["filtering"] = filtering

    data, _ = api_get(f"{api_version}/{account_id}/insights", params, token)

    rows = data.get("data", [])

    # Apply campaign name filter if specified
    if campaign_filter and rows:
        cf = campaign_filter.lower()
        rows = [r for r in rows if cf in r.get("campaign_name", "").lower()]

    if not rows:
        print(f"=== Custom Query ({date_preset}, level={level}) ===\n")
        print("  No data for this period/filter.")
        return

    # Determine date range
    date_start = rows[0].get("date_start", "?")
    date_stop = rows[0].get("date_stop", "?")
    print(f"=== Custom Query ({date_preset}: {date_start} to {date_stop}, level={level}) ===\n")

    # Print as formatted table
    # Get all unique keys from rows (excluding date_start, date_stop, date_stop)
    skip_keys = {"date_start", "date_stop"}
    all_keys = []
    for r in rows:
        for k in r:
            if k not in skip_keys and k not in all_keys:
                all_keys.append(k)

    # For simple scalar fields, print as table
    # For complex fields (actions, action_values, etc.), print expanded
    simple_keys = []
    complex_keys = []
    for k in all_keys:
        sample = rows[0].get(k)
        if isinstance(sample, list):
            complex_keys.append(k)
        else:
            simple_keys.append(k)

    if simple_keys:
        # Calculate column widths
        col_widths = {}
        for k in simple_keys:
            col_widths[k] = max(len(k), max(len(str(r.get(k, ""))) for r in rows))

        # Header
        header = "  ".join(k.ljust(col_widths[k]) for k in simple_keys)
        print(f"  {header}")
        print(f"  {'─' * len(header)}")

        # Rows
        for r in rows:
            line = "  ".join(str(r.get(k, "")).ljust(col_widths[k]) for k in simple_keys)
            print(f"  {line}")

    # Print complex fields (actions, action_values, etc.)
    if complex_keys:
        print()
        for r in rows:
            label = r.get("campaign_name") or r.get("adset_name") or r.get("ad_name") or ""
            if label:
                print(f"\n  --- {label} ---")
            for k in complex_keys:
                items = r.get(k, [])
                if items:
                    print(f"  {k}:")
                    for item in items:
                        action_type = item.get("action_type", "?")
                        value = item.get("value", "?")
                        print(f"    {action_type}: {value}")

    print(f"\n  ({len(rows)} row{'s' if len(rows) != 1 else ''})")


# ---------------------------------------------------------------------------
# Creative Staging Pipeline
# ---------------------------------------------------------------------------

def cmd_discover_page():
    """Find the Facebook Page and Instagram account linked to this ad account."""
    token, account_id, api_version = get_config()
    business_id = os.environ.get("META_BUSINESS_ID", "")

    print("=== Discovering Page & Instagram Account ===\n")

    pages = []

    # Try business-owned pages first
    if business_id:
        try:
            data, _ = api_get(f"{api_version}/{business_id}/owned_pages", {
                "fields": "id,name,access_token",
                "limit": "25",
            }, token)
            pages = data.get("data", [])
            if pages:
                print(f"  Found {len(pages)} page(s) via Business ID {business_id}")
        except Exception:
            pass

    # Fallback to /me/accounts
    if not pages:
        data, _ = api_get(f"{api_version}/me/accounts", {
            "fields": "id,name,access_token",
            "limit": "25",
        }, token)
        pages = data.get("data", [])
        if pages:
            print(f"  Found {len(pages)} page(s) via /me/accounts")

    if not pages:
        print("  ERROR: No Facebook Pages found. Check token permissions (pages_read_engagement).")
        sys.exit(1)

    # Show pages and pick the first
    for i, p in enumerate(pages):
        print(f"  [{i+1}] {p['name']} (ID: {p['id']})")

    page = pages[0]
    page_id = page["id"]
    print(f"\n  Using: {page['name']} ({page_id})")

    # Fetch Instagram business account
    ig_user_id = ""
    try:
        ig_data, _ = api_get(f"{api_version}/{page_id}", {
            "fields": "instagram_business_account",
        }, token)
        ig_account = ig_data.get("instagram_business_account", {})
        ig_user_id = ig_account.get("id", "")
        if ig_user_id:
            print(f"  Instagram Business Account: {ig_user_id}")
        else:
            print("  No Instagram business account linked to this page.")
    except Exception:
        print("  Could not fetch Instagram account (non-critical).")

    # Save to staging config
    config = _load_staging_config()
    config["page_id"] = page_id
    config["page_name"] = page["name"]
    if ig_user_id:
        config["instagram_user_id"] = ig_user_id
    _save_staging_config(config)
    _log_write("discover-page", {"page_id": page_id, "instagram_user_id": ig_user_id})

    print(f"\n  Saved to {STAGING_CONFIG}")


def cmd_setup_staging(auto_yes=False):
    """Create (or verify) the PAUSED staging campaign."""
    token, account_id, api_version = get_config()
    config = _load_staging_config()

    print("=== Setup Staging Campaign ===\n")

    # Check if already configured
    existing_id = config.get("staging_campaign_id")
    if existing_id:
        # Verify it still exists
        try:
            data, _ = api_get(f"{api_version}/{existing_id}", {
                "fields": "name,status",
            }, token)
            print(f"  Staging campaign already exists:")
            print(f"    ID:     {existing_id}")
            print(f"    Name:   {data.get('name', '?')}")
            print(f"    Status: {data.get('status', '?')}")
            return
        except Exception:
            print(f"  Previous staging campaign {existing_id} no longer exists. Creating new one.")

    campaign_name = "STAGING | Creative Testing"

    if not auto_yes:
        print(f"  Will create PAUSED campaign: '{campaign_name}'")
        print(f"  Account: {account_id}")
        resp = input("  Proceed? [y/N] ").strip().lower()
        if resp != "y":
            print("  Aborted.")
            return

    # Create PAUSED campaign (no CBO — ad sets get individual budgets)
    data, _ = api_post(f"{api_version}/{account_id}/campaigns", {
        "name": campaign_name,
        "objective": "OUTCOME_SALES",
        "status": "PAUSED",
        "special_ad_categories": "[]",
        "is_budget_schedule_enabled": "false",
        "is_adset_budget_sharing_enabled": "false",
    }, token)

    campaign_id = data.get("id")
    if not campaign_id:
        print(f"  ERROR: Campaign creation failed.")
        print(json.dumps(data, indent=2))
        sys.exit(1)

    config["staging_campaign_id"] = campaign_id
    _save_staging_config(config)
    _log_write("setup-staging", {"campaign_id": campaign_id, "name": campaign_name})

    print(f"  Created staging campaign:")
    print(f"    ID:   {campaign_id}")
    print(f"    Name: {campaign_name}")
    print(f"  Saved to {STAGING_CONFIG}")


def cmd_upload_image(file_path):
    """Upload a single image to Meta and return its hash."""
    token, account_id, api_version = get_config()

    path = pathlib.Path(file_path)
    if not path.exists():
        print(f"  ERROR: File not found: {file_path}")
        sys.exit(1)

    print(f"=== Uploading Image ===\n")
    print(f"  File: {path.name} ({path.stat().st_size / 1024:.1f} KB)")

    image_bytes = path.read_bytes()
    b64 = base64.b64encode(image_bytes).decode()

    data, _ = api_post(f"{api_version}/{account_id}/adimages", {
        "filename": path.name,
        "bytes": b64,
    }, token, timeout=120)

    # Response: {"images": {"filename": {"hash": "...", "url": "..."}}}
    images = data.get("images", {})
    if not images:
        print(f"  ERROR: Upload failed.")
        print(json.dumps(data, indent=2))
        sys.exit(1)

    img_info = next(iter(images.values()))
    img_hash = img_info.get("hash", "")
    img_url = img_info.get("url", "")

    _log_write("upload-image", {"file": str(path), "hash": img_hash})

    print(f"  Hash: {img_hash}")
    if img_url:
        print(f"  URL:  {img_url}")

    # Print as JSON for script consumption
    result = {"hash": img_hash, "url": img_url, "filename": path.name}
    print(f"\n  JSON: {json.dumps(result)}")
    return result


def _upload_images(image_map):
    """Upload multiple images. Takes {"1x1": "/path", ...}, returns {"1x1": "hash", ...}.

    image_map: dict mapping ratio label to file path
    Returns: dict mapping ratio label to image hash
    """
    token, account_id, api_version = get_config()
    hashes = {}

    for ratio, file_path in image_map.items():
        path = pathlib.Path(file_path)
        if not path.exists():
            print(f"  WARNING: File not found: {file_path} (skipping {ratio})")
            continue

        print(f"  Uploading {ratio}: {path.name} ({path.stat().st_size / 1024:.1f} KB)...")
        image_bytes = path.read_bytes()
        b64 = base64.b64encode(image_bytes).decode()

        data, _ = api_post(f"{api_version}/{account_id}/adimages", {
            "filename": path.name,
            "bytes": b64,
        }, token, timeout=120)

        images = data.get("images", {})
        if images:
            img_info = next(iter(images.values()))
            img_hash = img_info.get("hash", "")
            hashes[ratio] = img_hash
            _log_write("upload-image", {"ratio": ratio, "file": str(path), "hash": img_hash})
            print(f"    Hash: {img_hash}")
        else:
            print(f"    ERROR: Upload failed for {ratio}")

    return hashes


# ---------------------------------------------------------------------------
# Video upload
# ---------------------------------------------------------------------------

VIDEO_POLL_INTERVAL = 10   # seconds between status checks
VIDEO_POLL_TIMEOUT = 600   # 10 min max wait


def _upload_video_raw(file_path, token, account_id, api_version):
    """Upload a video to Meta via /advideos.

    1. Upload (multipart POST for ≤100MB, chunked for larger files)
    2. Poll until processing completes
    3. Get thumbnail

    Returns {"video_id": "...", "thumbnail_url": "..."} or None.
    """
    path = pathlib.Path(file_path)
    if not path.exists():
        print(f"  ERROR: File not found: {file_path}")
        return None

    # Probe and re-encode if needed for Meta compatibility
    reencoded_path = None
    probe = _probe_video(str(path))
    if probe:
        duration = probe.get("duration", 0)
        if duration and duration < 1.0:
            print(f"  ERROR: Video too short ({duration:.2f}s) — Meta requires >= 1s. Skipping upload.")
            return None
        if _needs_meta_reencode(probe):
            print(f"    Re-encoding for Meta compatibility...")
            reencoded_path = _reencode_for_meta(str(path), probe_data=probe)
            if reencoded_path:
                path = pathlib.Path(reencoded_path)
                _log_write("reencode-video", {"original": str(file_path), "output": reencoded_path})
                print(f"    Re-encoded: {path.name} ({path.stat().st_size / (1024*1024):.1f} MB)")

    file_size = path.stat().st_size
    print(f"  Uploading video: {path.name} ({file_size / (1024*1024):.1f} MB)...")

    video_id = None
    multipart_limit = 100 * 1024 * 1024  # 100MB

    if file_size <= multipart_limit:
        # Primary path: single multipart POST to /advideos
        boundary = f"----MetaVideo{random.randint(100000, 999999)}"
        video_bytes = path.read_bytes()

        parts = []
        parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"access_token\"\r\n\r\n{token}")
        file_header = f"--{boundary}\r\nContent-Disposition: form-data; name=\"source\"; filename=\"{path.name}\"\r\nContent-Type: video/mp4\r\n\r\n"
        footer = f"\r\n--{boundary}--\r\n"

        text_body = "\r\n".join(parts) + "\r\n" + file_header
        body_bytes = text_body.encode() + video_bytes + footer.encode()

        req = urllib.request.Request(
            f"{BASE_URL}/{api_version}/{account_id}/advideos",
            data=body_bytes, method="POST"
        )
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                upload_resp = json.loads(resp.read().decode())
                video_id = upload_resp.get("id") or upload_resp.get("video_id")
                if not video_id:
                    print(f"  ERROR: Multipart upload returned no video ID.")
                    print(json.dumps(upload_resp, indent=2))
                    return None
        except Exception as e:
            print(f"  ERROR: Multipart upload failed: {e}")
            return None
    else:
        # Large file fallback: chunked transfer via /advideos
        session_resp, _ = api_post(f"{api_version}/{account_id}/advideos", {
            "upload_phase": "start",
            "file_size": str(file_size),
        }, token, timeout=60)
        upload_session_id = session_resp.get("upload_session_id", "")
        video_id = session_resp.get("video_id")
        video_bytes = path.read_bytes()
        chunk_size = 4 * 1024 * 1024  # 4MB chunks
        offset = 0
        while offset < len(video_bytes):
            chunk = video_bytes[offset:offset + chunk_size]
            end_offset = offset + len(chunk)
            boundary = f"----MetaVideoChunk{random.randint(100000, 999999)}"
            parts = []
            parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"access_token\"\r\n\r\n{token}")
            parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"upload_phase\"\r\n\r\ntransfer")
            parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"upload_session_id\"\r\n\r\n{upload_session_id}")
            parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"start_offset\"\r\n\r\n{offset}")
            header_part = f"--{boundary}\r\nContent-Disposition: form-data; name=\"video_file_chunk\"; filename=\"chunk\"\r\nContent-Type: application/octet-stream\r\n\r\n"
            footer = f"\r\n--{boundary}--\r\n"
            text_body = "\r\n".join(parts) + "\r\n" + header_part
            body_bytes = text_body.encode() + chunk + footer.encode()
            req = urllib.request.Request(
                f"{BASE_URL}/{api_version}/{account_id}/advideos",
                data=body_bytes, method="POST"
            )
            req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
            try:
                with urllib.request.urlopen(req, timeout=300) as resp:
                    chunk_resp = json.loads(resp.read().decode())
                    offset = int(chunk_resp.get("start_offset", end_offset))
            except Exception as e:
                print(f"  ERROR: Chunk upload failed at offset {offset}: {e}")
                return None
        # Finish the chunked upload
        finish_resp, _ = api_post(f"{api_version}/{account_id}/advideos", {
            "upload_phase": "finish",
            "upload_session_id": upload_session_id,
        }, token, timeout=60)
        if not video_id:
            video_id = finish_resp.get("video_id") or finish_resp.get("id")

    if not video_id:
        print(f"  ERROR: No video_id obtained from upload.")
        return None

    print(f"    Video ID: {video_id}")

    # Step 2: Poll for processing completion
    print(f"    Waiting for processing...")
    elapsed = 0
    while elapsed < VIDEO_POLL_TIMEOUT:
        time.sleep(VIDEO_POLL_INTERVAL)
        elapsed += VIDEO_POLL_INTERVAL
        try:
            status_data, _ = api_get(f"{api_version}/{video_id}", {
                "fields": "status",
            }, token)
            video_status = status_data.get("status", {})
            processing = video_status.get("video_status", "")
            if processing == "ready":
                print(f"    Processing complete ({elapsed}s)")
                break
            elif processing in ("error", "expired"):
                print(f"    ERROR: Video processing failed: {processing}")
                return None
            else:
                dots = "." * ((elapsed // VIDEO_POLL_INTERVAL) % 4)
                print(f"    Status: {processing}{dots} ({elapsed}s)", end="\r")
        except Exception:
            pass
    else:
        print(f"\n    WARNING: Processing timed out after {VIDEO_POLL_TIMEOUT}s. Video may still be processing.")

    # Step 3: Get thumbnail
    thumbnail_url = ""
    try:
        thumb_data, _ = api_get(f"{api_version}/{video_id}", {
            "fields": "thumbnails",
        }, token)
        thumbnails = thumb_data.get("thumbnails", {}).get("data", [])
        if thumbnails:
            thumbnail_url = thumbnails[0].get("uri", "")
    except Exception:
        pass

    result = {"video_id": video_id, "thumbnail_url": thumbnail_url}
    _log_write("upload-video", {"file": str(path), "video_id": video_id})

    # Clean up temp re-encoded file
    if reencoded_path:
        try:
            rp = pathlib.Path(reencoded_path)
            rp.unlink(missing_ok=True)
            if rp.parent.name.startswith("meta_reencode_"):
                rp.parent.rmdir()
        except OSError:
            pass

    return result


def _upload_videos(video_map):
    """Upload multiple videos. Takes {"ratio": "/path", ...}.

    Returns {"ratio": {"video_id": "...", "thumbnail_url": "..."}, ...}
    """
    token, account_id, api_version = get_config()
    results = {}

    for ratio, file_path in video_map.items():
        print(f"  [{ratio}] ", end="")
        result = _upload_video_raw(file_path, token, account_id, api_version)
        if result:
            results[ratio] = result
            print(f"    Video ID: {result['video_id']}")
        else:
            print(f"    ERROR: Upload failed for {ratio}")

    return results


def cmd_upload_video(file_path):
    """Upload a single video to Meta and return its ID."""
    token, account_id, api_version = get_config()

    print(f"=== Uploading Video ===\n")
    result = _upload_video_raw(file_path, token, account_id, api_version)
    if not result:
        print("  Upload failed.")
        sys.exit(1)

    print(f"\n  Video ID:      {result['video_id']}")
    if result.get("thumbnail_url"):
        print(f"  Thumbnail URL: {result['thumbnail_url']}")
    print(f"\n  JSON: {json.dumps(result)}")
    return result


def cmd_reencode_video(file_path, output_path=None):
    """Re-encode a video for Meta compatibility and show before/after probe data."""
    path = pathlib.Path(file_path)
    if not path.exists():
        print(f"ERROR: File not found: {file_path}")
        sys.exit(1)

    print(f"=== Re-encode Video for Meta ===\n")
    print(f"  Input: {path.name}")

    probe_before = _probe_video(str(path))
    if not probe_before:
        print("  ERROR: Could not probe video (ffprobe missing or file unreadable).")
        sys.exit(1)

    print(f"  Duration: {probe_before.get('duration', 0):.1f}s")
    print(f"  Video:  {probe_before.get('video_codec')} / {probe_before.get('pix_fmt')} / "
          f"color_range={probe_before.get('color_range')} / color_space={probe_before.get('color_space')}")
    print(f"  Audio:  {probe_before.get('audio_codec')} / {probe_before.get('sample_rate')}Hz / "
          f"{probe_before.get('channels')}ch")

    needs = _needs_meta_reencode(probe_before)
    print(f"  Needs re-encode: {'YES' if needs else 'NO'}")

    if not needs:
        print("\n  Video already meets Meta specs. No re-encoding needed.")
        return

    print(f"\n  Re-encoding...")
    result_path = _reencode_for_meta(str(path), output_path=output_path, probe_data=probe_before)
    if not result_path:
        print("  ERROR: Re-encoding failed.")
        sys.exit(1)

    probe_after = _probe_video(result_path)
    out = pathlib.Path(result_path)
    print(f"\n  Output: {out}")
    print(f"  Size:   {out.stat().st_size / (1024*1024):.1f} MB")
    if probe_after:
        print(f"  Video:  {probe_after.get('video_codec')} / {probe_after.get('pix_fmt')} / "
              f"color_range={probe_after.get('color_range')} / color_space={probe_after.get('color_space')}")
        print(f"  Audio:  {probe_after.get('audio_codec')} / {probe_after.get('sample_rate')}Hz / "
              f"{probe_after.get('channels')}ch")
        still_needs = _needs_meta_reencode(probe_after)
        print(f"  Meta-ready: {'YES' if not still_needs else 'NO (unexpected)'}")

    print(f"\n  Done.")


def cmd_get_ad_copy(ad_id):
    """Fetch ad creative text from an existing ad."""
    token, _, api_version = get_config()

    print(f"=== Ad Copy for {ad_id} ===\n")

    # Fetch ad with creative fields
    data, _ = api_get(f"{api_version}/{ad_id}", {
        "fields": "name,creative{body,title,link_url,call_to_action_type,object_story_spec,asset_feed_spec}",
    }, token)

    creative = data.get("creative", {})
    if not creative:
        print(f"  ERROR: No creative found for ad {ad_id}")
        sys.exit(1)

    # Extract copy from various possible locations
    copy = {}

    # Direct fields
    if creative.get("body"):
        copy["body"] = creative["body"]
    if creative.get("title"):
        copy["headline"] = creative["title"]
    if creative.get("link_url"):
        copy["link"] = creative["link_url"]
    if creative.get("call_to_action_type"):
        copy["cta"] = creative["call_to_action_type"]

    # Try object_story_spec for richer data
    oss = creative.get("object_story_spec", {})
    link_data = oss.get("link_data", {})
    if link_data:
        if link_data.get("message") and not copy.get("body"):
            copy["body"] = link_data["message"]
        if link_data.get("name") and not copy.get("headline"):
            copy["headline"] = link_data["name"]
        if link_data.get("description"):
            copy["description"] = link_data["description"]
        if link_data.get("link") and not copy.get("link"):
            copy["link"] = link_data["link"]
        cta = link_data.get("call_to_action", {})
        if cta.get("type") and not copy.get("cta"):
            copy["cta"] = cta["type"]

    # Try asset_feed_spec bodies/titles
    afs = creative.get("asset_feed_spec", {})
    if afs:
        bodies = afs.get("bodies", [])
        if bodies and not copy.get("body"):
            copy["body"] = bodies[0].get("text", "")
        titles = afs.get("titles", [])
        if titles and not copy.get("headline"):
            copy["headline"] = titles[0].get("text", "")
        links = afs.get("link_urls", [])
        if links and not copy.get("link"):
            copy["link"] = links[0].get("website_url", "")
        ctas = afs.get("call_to_action_types", [])
        if ctas and not copy.get("cta"):
            copy["cta"] = ctas[0]
        descs = afs.get("descriptions", [])
        if descs and not copy.get("description"):
            copy["description"] = descs[0].get("text", "")

    # Display
    print(f"  Ad Name:     {data.get('name', '?')}")
    print(f"  Body:        {copy.get('body', '(none)')}")
    print(f"  Headline:    {copy.get('headline', '(none)')}")
    print(f"  Description: {copy.get('description', '(none)')}")
    print(f"  Link:        {copy.get('link', '(none)')}")
    print(f"  CTA:         {copy.get('cta', '(none)')}")
    print(f"\n  JSON: {json.dumps(copy)}")

    return copy


def cmd_list_ad_copy(campaign_filter=None, top_n=5):
    """List top ads by spend and show their copy for selection."""
    token, account_id, api_version = get_config()

    print(f"=== Ad Copy Listings ===\n")

    # Pull ad-level insights sorted by spend
    fields = "ad_id,ad_name,campaign_name,spend,actions,action_values,purchase_roas"
    params = {
        "fields": fields,
        "date_preset": "last_30d",
        "level": "ad",
        "limit": "200",
        "sort": "spend_descending",
    }

    data, _ = api_get(f"{api_version}/{account_id}/insights", params, token)
    rows = data.get("data", [])

    # Filter by campaign name
    if campaign_filter:
        cf = campaign_filter.lower()
        rows = [r for r in rows if cf in r.get("campaign_name", "").lower()
                or cf in r.get("ad_name", "").lower()]

    # Filter spend > 0 and take top N
    rows = [r for r in rows if float(r.get("spend", 0)) > 0]
    rows.sort(key=lambda r: float(r.get("spend", 0)), reverse=True)
    rows = rows[:top_n]

    if not rows:
        print("  No ads found matching the filter.")
        return

    print(f"  Top {len(rows)} ads by spend (last 30d):")
    if campaign_filter:
        print(f"  Filter: '{campaign_filter}'")
    print()

    results = []
    for i, r in enumerate(rows, 1):
        ad_id = r.get("ad_id", "")
        ad_name = r.get("ad_name", "?")
        spend = float(r.get("spend", 0))

        # Extract ROAS from purchase_roas array
        roas_val = 0.0
        roas_list = r.get("purchase_roas", [])
        if isinstance(roas_list, list):
            for rv in roas_list:
                if isinstance(rv, dict) and rv.get("action_type") in ("omni_purchase", "purchase"):
                    roas_val = float(rv.get("value", 0))
                    break

        roas_str = f"{roas_val:.2f}x" if roas_val > 0 else "N/A"
        print(f"  [{i}] {ad_name}")
        print(f"      Ad ID: {ad_id}  |  Spend: ${spend:,.2f}  |  ROAS: {roas_str}")

        # Fetch creative copy for this ad
        try:
            copy = _get_ad_copy_quiet(ad_id, token, api_version)
            body_preview = (copy.get("body", "")[:80] + "...") if len(copy.get("body", "")) > 80 else copy.get("body", "(none)")
            print(f"      Body: {body_preview}")
            print(f"      Headline: {copy.get('headline', '(none)')}")
            print(f"      Link: {copy.get('link', '(none)')}")
            results.append({"ad_id": ad_id, "ad_name": ad_name, "spend": spend, "roas": roas_val, "copy": copy})
        except Exception:
            print(f"      (Could not fetch copy)")
            results.append({"ad_id": ad_id, "ad_name": ad_name, "spend": spend, "roas": roas_val, "copy": {}})
        print()

    print(f"  NOTE: Ads ranked by spend. Check ROAS before selecting copy for staging.")
    print(f"  Use: get-ad-copy --ad-id <ID> for full details")
    print(f"  Or:  stage-ad --copy-from <ID> to use an ad's copy")
    return results


def _get_ad_copy_quiet(ad_id, token, api_version):
    """Fetch ad copy without printing (for batch use)."""
    data, _ = api_get(f"{api_version}/{ad_id}", {
        "fields": "creative{body,title,link_url,call_to_action_type,object_story_spec,asset_feed_spec}",
    }, token)

    creative = data.get("creative", {})
    copy = {}

    if creative.get("body"):
        copy["body"] = creative["body"]
    if creative.get("title"):
        copy["headline"] = creative["title"]
    if creative.get("link_url"):
        copy["link"] = creative["link_url"]
    if creative.get("call_to_action_type"):
        copy["cta"] = creative["call_to_action_type"]

    oss = creative.get("object_story_spec", {})
    link_data = oss.get("link_data", {})
    if link_data:
        if link_data.get("message") and not copy.get("body"):
            copy["body"] = link_data["message"]
        if link_data.get("name") and not copy.get("headline"):
            copy["headline"] = link_data["name"]
        if link_data.get("description"):
            copy["description"] = link_data["description"]
        if link_data.get("link") and not copy.get("link"):
            copy["link"] = link_data["link"]
        cta = link_data.get("call_to_action", {})
        if cta.get("type") and not copy.get("cta"):
            copy["cta"] = cta["type"]

    afs = creative.get("asset_feed_spec", {})
    if afs:
        bodies = afs.get("bodies", [])
        if bodies and not copy.get("body"):
            copy["body"] = bodies[0].get("text", "")
        titles = afs.get("titles", [])
        if titles and not copy.get("headline"):
            copy["headline"] = titles[0].get("text", "")
        links = afs.get("link_urls", [])
        if links and not copy.get("link"):
            copy["link"] = links[0].get("website_url", "")
        ctas = afs.get("call_to_action_types", [])
        if ctas and not copy.get("cta"):
            copy["cta"] = ctas[0]
        descs = afs.get("descriptions", [])
        if descs and not copy.get("description"):
            copy["description"] = descs[0].get("text", "")

    return copy


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}
KNOWN_RATIOS = {"1x1", "4x5", "9x16", "16x9"}

# Expected aspect ratios as width/height
_RATIO_VALUES = {"1x1": 1.0, "4x5": 0.8, "9x16": 0.5625, "16x9": 1.7778}


def _get_media_dimensions(file_path):
    """Get width x height of an image or video file. Returns (width, height) or None."""
    # Try ffprobe first (works for images and videos)
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0",
             file_path],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0 and "x" in result.stdout.strip():
            parts = result.stdout.strip().split("x")
            return int(parts[0]), int(parts[1])
    except (FileNotFoundError, subprocess.TimeoutExpired, ValueError):
        pass

    # Fallback: sips (macOS built-in, images only)
    try:
        result = subprocess.run(
            ["sips", "-g", "pixelWidth", "-g", "pixelHeight", file_path],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0:
            width = height = None
            for line in result.stdout.splitlines():
                if "pixelWidth" in line:
                    width = int(line.split(":")[-1].strip())
                elif "pixelHeight" in line:
                    height = int(line.split(":")[-1].strip())
            if width and height:
                return width, height
    except (FileNotFoundError, subprocess.TimeoutExpired, ValueError):
        pass

    return None


def _probe_video(file_path):
    """Probe video for codec, pixel format, color space, audio rate, duration.

    Returns dict with metadata or None on error.
    """
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json",
             "-show_format", "-show_streams", file_path],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            return None
        data = json.loads(result.stdout)
    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError):
        return None

    probe = {
        "video_codec": None, "pix_fmt": None, "color_range": None,
        "color_space": None, "color_primaries": None, "color_trc": None,
        "frame_rate": None, "width": None, "height": None,
        "audio_codec": None, "sample_rate": None, "channels": None,
        "duration": None,
    }

    for stream in data.get("streams", []):
        if stream.get("codec_type") == "video" and probe["video_codec"] is None:
            probe["video_codec"] = stream.get("codec_name")
            probe["pix_fmt"] = stream.get("pix_fmt")
            probe["color_range"] = stream.get("color_range", "unknown")
            probe["color_space"] = stream.get("color_space", "unknown")
            probe["color_primaries"] = stream.get("color_primaries", "unknown")
            probe["color_trc"] = stream.get("color_transfer", "unknown")
            probe["width"] = stream.get("width")
            probe["height"] = stream.get("height")
            # Detect variable frame rate
            r_rate = stream.get("r_frame_rate", "")
            avg_rate = stream.get("avg_frame_rate", "")
            probe["frame_rate"] = r_rate
            probe["vfr"] = (r_rate != avg_rate) if (r_rate and avg_rate) else False
        elif stream.get("codec_type") == "audio" and probe["audio_codec"] is None:
            probe["audio_codec"] = stream.get("codec_name")
            probe["sample_rate"] = stream.get("sample_rate")
            probe["channels"] = stream.get("channels")

    fmt = data.get("format", {})
    try:
        probe["duration"] = float(fmt.get("duration", 0))
    except (TypeError, ValueError):
        probe["duration"] = 0

    return probe


def _needs_meta_reencode(probe_data):
    """Return True if video needs re-encoding for Meta compatibility."""
    if not probe_data:
        return False

    # Pixel format must be yuv420p
    if probe_data.get("pix_fmt") != "yuv420p":
        return True
    # Color range must be tagged (not "unknown")
    if probe_data.get("color_range") in (None, "unknown", ""):
        return True
    # Color space must be tagged
    if probe_data.get("color_space") in (None, "unknown", ""):
        return True
    # Audio sample rate must be 48000 (only check if audio exists)
    if probe_data.get("audio_codec") is not None and str(probe_data.get("sample_rate")) != "48000":
        return True
    # Audio codec should be aac
    if probe_data.get("audio_codec") not in ("aac", None):
        # None = no audio track, which is fine
        return True
    # Video codec should be h264
    if probe_data.get("video_codec") != "h264":
        return True
    # Variable frame rate needs fixing
    if probe_data.get("vfr"):
        return True
    # Color transfer must be tagged (not "unknown") — ensures x264 VUI is set
    if probe_data.get("color_trc") in (None, "unknown", ""):
        return True
    # Width must be >= 1200px (Meta minimum for ad videos)
    width = probe_data.get("width")
    if width is not None and width < 1200:
        return True

    return False


def _reencode_for_meta(input_path, output_path=None, probe_data=None):
    """Re-encode video to Meta-compatible spec using ffmpeg.

    Returns path to re-encoded file, or None on error.
    Original file is never modified.
    If probe_data shows no audio stream, generates silent stereo audio
    (Meta requires audio for ad videos).
    """
    inp = pathlib.Path(input_path)
    if output_path:
        out = pathlib.Path(output_path)
    else:
        tmp_dir = pathlib.Path(tempfile.mkdtemp(prefix="meta_reencode_"))
        out = tmp_dir / f"{inp.stem}_meta{inp.suffix}"

    has_audio = probe_data.get("audio_codec") is not None if probe_data else True

    cmd = ["ffmpeg", "-i", str(inp)]
    if not has_audio:
        # Generate silent stereo audio when input has no audio stream
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]

    # Build video filter chain (conditional upscaling for < 1200px width)
    vf_filters = []
    if probe_data and probe_data.get("width") is not None and probe_data["width"] < 1200:
        vf_filters.append("scale=1200:-2:flags=lanczos")

    cmd += [
        "-c:v", "libx264", "-profile:v", "high", "-level", "4.0",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-color_range", "tv",
        "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
        "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709",
        "-r", "30",
        "-g", "60",
    ]
    if vf_filters:
        cmd += ["-vf", ",".join(vf_filters)]
    cmd += [
        "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "128k",
        "-movflags", "+faststart",
    ]
    if not has_audio:
        cmd += ["-shortest"]
    cmd += ["-y", str(out)]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode != 0:
            print(f"    WARNING: ffmpeg re-encode failed (exit {result.returncode})")
            stderr_tail = result.stderr.strip().splitlines()[-5:] if result.stderr else []
            for line in stderr_tail:
                print(f"      {line}")
            return None
        if not out.exists() or out.stat().st_size == 0:
            print("    WARNING: ffmpeg produced empty output")
            return None
        return str(out)
    except FileNotFoundError:
        print("    WARNING: ffmpeg not found — skipping re-encode")
        return None
    except subprocess.TimeoutExpired:
        print("    WARNING: ffmpeg re-encode timed out (10 min)")
        return None


def _detect_ratio_from_dimensions(width, height):
    """Determine the closest known aspect ratio from actual pixel dimensions."""
    if not width or not height:
        return None
    actual = width / height
    best_ratio = None
    best_distance = float("inf")
    for name, target in _RATIO_VALUES.items():
        distance = abs(actual - target)
        if distance < best_distance:
            best_distance = distance
            best_ratio = name
    # Sanity check: if closest ratio is still >25% off, it's unknown
    if best_distance / _RATIO_VALUES.get(best_ratio, 1.0) > 0.25:
        return None
    return best_ratio


def _validate_media_dimensions(file_map):
    """Check actual dimensions of each file against its assigned ratio.

    If a mismatch is found, remaps files to their correct ratios.
    Returns the (possibly corrected) file_map and prints diagnostics for every file.
    """
    # Step 4: Check ffprobe availability upfront
    has_ffprobe = shutil.which("ffprobe") is not None
    if not has_ffprobe:
        print("    WARNING: ffprobe not found — dimension validation disabled. "
              "Install ffmpeg for accurate ratio detection.")
        return file_map

    issues = []
    detected = {}   # path -> (w, h, actual_ratio)
    unprobed = {}   # assigned_ratio -> path  (files where probing failed)
    diagnostics = []  # (filename, dims_str, detected_ratio, note)

    for assigned_ratio, path in file_map.items():
        fname = pathlib.Path(path).name
        dims = _get_media_dimensions(path)
        if dims is None:
            unprobed[assigned_ratio] = path
            diagnostics.append((fname, "???", assigned_ratio,
                                "ffprobe failed, using filename"))
            continue
        w, h = dims
        actual_ratio = _detect_ratio_from_dimensions(w, h)
        detected[path] = (w, h, actual_ratio)

        if actual_ratio and actual_ratio != assigned_ratio:
            issues.append((path, assigned_ratio, actual_ratio, w, h))
            diagnostics.append((fname, f"{w}x{h}", actual_ratio,
                                f"filename said {assigned_ratio}, corrected by ffprobe"))
        else:
            diagnostics.append((fname, f"{w}x{h}",
                                actual_ratio or assigned_ratio, "matches filename"))

    # Print diagnostic table for every file
    for fname, dims_str, ratio, note in diagnostics:
        print(f"    {fname}: {dims_str} -> {ratio} ({note})")

    if not issues:
        return file_map

    # Remap: build corrected file_map using actual dimensions
    print(f"\n  Remapping {len(issues)} file(s) to correct ratios...")
    corrected = {}
    for path, (w, h, actual_ratio) in detected.items():
        ratio_to_use = actual_ratio if actual_ratio else None
        # Find what ratio this path was originally assigned
        for orig_ratio, orig_path in file_map.items():
            if orig_path == path:
                ratio_to_use = ratio_to_use or orig_ratio
                break
        if ratio_to_use:
            if ratio_to_use in corrected:
                # Conflict: two files detected as the same ratio
                print(f"    CONFLICT: Multiple files detected as {ratio_to_use}, "
                      f"keeping {pathlib.Path(corrected[ratio_to_use]).name}")
            else:
                corrected[ratio_to_use] = path

    # Step 2 fix: preserve files that couldn't be probed (keep original assignment)
    for assigned_ratio, path in unprobed.items():
        if path not in corrected.values():
            if assigned_ratio not in corrected:
                corrected[assigned_ratio] = path

    # Show the corrected mapping
    for ratio, path in sorted(corrected.items()):
        orig_ratio = None
        for r, p in file_map.items():
            if p == path:
                orig_ratio = r
                break
        if orig_ratio != ratio:
            print(f"    {pathlib.Path(path).name}: {orig_ratio} -> {ratio}")
        else:
            print(f"    {pathlib.Path(path).name}: {ratio} (unchanged)")

    return corrected


def _parse_media_paths(media_str):
    """Parse comma-separated media paths, auto-detect ratios and media type.

    Two-phase approach:
      Phase 1: Collect file paths and detect media type from extensions.
      Phase 2: For each file, try ffprobe FIRST to get actual dimensions and
               detect ratio. Fall back to filename parsing only if ffprobe fails.

    Returns: {"media_type": "image"|"video", "files": {"ratio": "/path", ...}}
    """
    paths = [p.strip() for p in media_str.split(",") if p.strip()]
    if not paths:
        return {"media_type": "image", "files": {}}

    # Phase 1: Detect media type from extensions
    image_count = 0
    video_count = 0
    for p in paths:
        ext = pathlib.Path(p).suffix.lower()
        if ext in IMAGE_EXTENSIONS:
            image_count += 1
        elif ext in VIDEO_EXTENSIONS:
            video_count += 1

    if image_count > 0 and video_count > 0:
        print("  ERROR: Mixed image and video files. Use all images or all videos.")
        sys.exit(1)

    media_type = "video" if video_count > 0 else "image"

    # Phase 2: Assign ratios — ffprobe first, filename fallback
    result = {}
    for p in paths:
        ratio_from_probe = None

        # Try ffprobe to get actual dimensions
        dims = _get_media_dimensions(p)
        if dims is not None:
            w, h = dims
            ratio_from_probe = _detect_ratio_from_dimensions(w, h)

        if ratio_from_probe:
            # ffprobe succeeded — use detected ratio
            if ratio_from_probe in result:
                # Conflict: another file already claimed this ratio, skip
                print(f"    WARNING: {pathlib.Path(p).name} detected as "
                      f"{ratio_from_probe} but slot already taken, skipping")
            else:
                result[ratio_from_probe] = p
        else:
            # Fallback: parse ratio from filename
            name = pathlib.Path(p).name.lower()
            matched = False
            for ratio in ["16x9", "9x16", "4x5", "1x1"]:
                if ratio in name:
                    if ratio not in result:
                        result[ratio] = p
                        matched = True
                    break
            if not matched:
                # Assign to first available slot
                for ratio in ["1x1", "4x5", "9x16", "16x9"]:
                    if ratio not in result:
                        result[ratio] = p
                        break

    return {"media_type": media_type, "files": result}


def _parse_image_paths(images_str):
    """Compat wrapper — returns {"ratio": "/path", ...} (image files only)."""
    parsed = _parse_media_paths(images_str)
    return parsed["files"]


def _select_catchall_ratio(available_ratios):
    """Pick the best catch-all ratio. Priority: 1x1 > 4x5 > 16x9 > 9x16."""
    for ratio in ("1x1", "4x5", "16x9", "9x16"):
        if ratio in available_ratios:
            return ratio
    return next(iter(available_ratios)) if available_ratios else "1x1"


def cmd_stage_ad(media_str, copy_from=None, body=None, headline=None,
                 link=None, cta=None, ad_name="Staged Creative", auto_yes=False,
                 product=None):
    """Full staging pipeline: upload images/videos, create ad set, creative, and PAUSED ad."""
    token, account_id, api_version = get_config()
    config = _load_staging_config()

    print("=== Stage Ad Creative ===\n")

    # 1. Validate prereqs
    staging_campaign_id = config.get("staging_campaign_id")
    page_id = config.get("page_id")
    ig_user_id = config.get("instagram_user_id", "")

    if not staging_campaign_id:
        print("  ERROR: No staging campaign configured.")
        print("  Run: meta_api_helper.py setup-staging --yes")
        sys.exit(1)
    if not page_id:
        print("  ERROR: No page_id configured.")
        print("  Run: meta_api_helper.py discover-page")
        sys.exit(1)

    # 2. Resolve ad copy
    copy = {}
    if copy_from:
        print(f"  Fetching copy from ad {copy_from}...")
        copy = _get_ad_copy_quiet(copy_from, token, api_version)
        print(f"    Body:     {(copy.get('body', '')[:60] + '...') if len(copy.get('body', '')) > 60 else copy.get('body', '(none)')}")
        print(f"    Headline: {copy.get('headline', '(none)')}")
        print(f"    Link:     {copy.get('link', '(none)')}")
        print(f"    CTA:      {copy.get('cta', '(none)')}")
    else:
        if body:
            copy["body"] = body
        if headline:
            copy["headline"] = headline
        if link:
            copy["link"] = link
        if cta:
            copy["cta"] = cta

    if not copy.get("body"):
        print("  ERROR: No ad body text. Use --copy-from or --body")
        sys.exit(1)
    if not copy.get("link"):
        print("  ERROR: No link URL. Use --copy-from or --link")
        sys.exit(1)

    # 3. Parse media paths and detect type
    print(f"\n  Parsing media paths...")
    parsed = _parse_media_paths(media_str)
    media_type = parsed["media_type"]
    file_map = parsed["files"]
    if not file_map:
        print("  ERROR: No valid media paths provided.")
        sys.exit(1)

    print(f"  Media type: {media_type}")
    for ratio, path in file_map.items():
        print(f"    {ratio}: {path}")

    # 3b. Validate dimensions and remap if needed
    print(f"\n  Validating dimensions...")
    file_map = _validate_media_dimensions(file_map)

    # 3c. Compute ad set name early (needed for confirmation display)
    try:
        from zoneinfo import ZoneInfo
        acct_tz = ZoneInfo("America/Los_Angeles")
    except ImportError:
        from datetime import timezone as _tz
        acct_tz = _tz(datetime.timedelta(hours=-8))
    today_str = datetime.datetime.now(acct_tz).strftime("%m.%d.%y")
    format_label = "Video" if media_type == "video" else "Static"
    adset_name = f"{format_label} | {product} | {today_str}"
    pixel_id = os.environ.get("META_PIXEL_ID", "")

    if not auto_yes:
        print(f"\n  Ad Name:  {ad_name}")
        print(f"  Product:  {product}")
        print(f"  Ad Set:   {adset_name}")
        print(f"  Copy: {copy.get('body', '')[:80]}...")
        resp = input("  Proceed with staging? [y/N] ").strip().lower()
        if resp != "y":
            print("  Aborted.")
            return

    # 4. Upload media
    if media_type == "video":
        print(f"\n  Uploading {len(file_map)} video(s)...")
        assets = _upload_videos(file_map)
        if not assets:
            print("  ERROR: No videos uploaded successfully.")
            sys.exit(1)
    else:
        print(f"\n  Uploading {len(file_map)} image(s)...")
        assets = _upload_images(file_map)
        if not assets:
            print("  ERROR: No images uploaded successfully.")
            sys.exit(1)

    # 5. Get or create today's ad set
    print(f"\n  Looking for ad set: '{adset_name}'...")

    adset_data, _ = api_get(f"{api_version}/{staging_campaign_id}/adsets", {
        "fields": "id,name,status",
        "limit": "100",
    }, token)

    adset_id = None
    for adset in adset_data.get("data", []):
        if adset.get("name") == adset_name:
            adset_id = adset["id"]
            print(f"    Found existing: {adset_id}")
            break

    if not adset_id:
        print(f"    Creating new ad set...")
        adset_params = {
            "name": adset_name,
            "campaign_id": staging_campaign_id,
            "status": "PAUSED",
            "daily_budget": "100",  # $1.00 in cents
            "billing_event": "IMPRESSIONS",
            "optimization_goal": "OFFSITE_CONVERSIONS",
            "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
            "is_dynamic_creative": "false",
            "targeting": json.dumps({
                "geo_locations": {"countries": ["US"]},
                "age_min": 25,
                "age_max": 65,
            }),
            "promoted_object": json.dumps({"pixel_id": pixel_id, "custom_event_type": "PURCHASE"}) if pixel_id else "{}",
            "attribution_spec": json.dumps([
                {"event_type": "CLICK_THROUGH", "window_days": 7},
                {"event_type": "VIEW_THROUGH", "window_days": 1},
            ]),
        }
        adset_resp, _ = api_post(f"{api_version}/{account_id}/adsets", adset_params, token)
        adset_id = adset_resp.get("id")
        if not adset_id:
            print(f"    ERROR: Ad set creation failed.")
            print(json.dumps(adset_resp, indent=2))
            sys.exit(1)
        _log_write("create-adset", {"adset_id": adset_id, "name": adset_name})
        print(f"    Created: {adset_id}")

    # 6. Create ad creative
    print(f"\n  Creating ad creative...")

    use_asset_feed = len(assets) >= 2

    if use_asset_feed:
        creative_params = _build_asset_feed_creative(
            assets, copy, page_id, ig_user_id, ad_name,
            token, account_id, api_version,
            media_type=media_type
        )
    else:
        # Single-media creative — no PAC needed
        ratio = next(iter(assets))
        if media_type == "video":
            video_info = assets[ratio]
            oss_data = {
                "page_id": page_id,
                "video_data": {
                    "video_id": video_info["video_id"],
                    "image_url": video_info.get("thumbnail_url", ""),
                    "message": copy.get("body", ""),
                    "title": copy.get("headline", ""),
                    "link_description": copy.get("description", ""),
                    "call_to_action": {
                        "type": copy.get("cta", "SHOP_NOW"),
                        "value": {"link": copy.get("link", "")},
                    },
                },
            }
        else:
            img_hash = assets[ratio]
            oss_data = {
                "page_id": page_id,
                "link_data": {
                    "image_hash": img_hash,
                    "link": copy.get("link", ""),
                    "message": copy.get("body", ""),
                    "name": copy.get("headline", ""),
                    "description": copy.get("description", ""),
                    "call_to_action": {
                        "type": copy.get("cta", "SHOP_NOW"),
                        "value": {"link": copy.get("link", "")},
                    },
                },
            }
        if ig_user_id:
            oss_data["instagram_user_id"] = ig_user_id
        creative_params = {
            "name": ad_name,
            "object_story_spec": json.dumps(oss_data),
        }

    creative_resp, _ = api_post(f"{api_version}/{account_id}/adcreatives", creative_params, token)
    creative_id = creative_resp.get("id")
    if not creative_id:
        print(f"    ERROR: Creative creation failed.")
        print(json.dumps(creative_resp, indent=2))
        sys.exit(1)
    _log_write("create-creative", {"creative_id": creative_id, "name": ad_name,
                                    "media_type": media_type, "assets": str(assets)})
    print(f"    Creative ID: {creative_id}")

    # 7. Create PAUSED ad
    print(f"\n  Creating PAUSED ad...")
    ad_resp, _ = api_post(f"{api_version}/{account_id}/ads", {
        "name": ad_name,
        "adset_id": adset_id,
        "creative": json.dumps({"creative_id": creative_id}),
        "status": "PAUSED",
    }, token)

    ad_id = ad_resp.get("id")
    if not ad_id:
        print(f"    ERROR: Ad creation failed.")
        print(json.dumps(ad_resp, indent=2))
        sys.exit(1)
    _log_write("create-ad", {"ad_id": ad_id, "creative_id": creative_id, "adset_id": adset_id,
                             "adset_name": adset_name, "product": product})
    print(f"    Ad ID: {ad_id}")

    # 8. Build Ads Manager links (one per level for reliable filtering)
    ads_manager_link = _ads_manager_url(ad_id, adset_id, staging_campaign_id, level="ad")
    adset_link = _ads_manager_url(adset_id=adset_id, campaign_id=staging_campaign_id, level="adset")
    campaign_link = _ads_manager_url(campaign_id=staging_campaign_id, level="campaign")

    # 9. Report
    print(f"\n{'='*50}")
    print(f"  STAGED SUCCESSFULLY")
    print(f"{'='*50}")
    print(f"  Ad Name:     {ad_name}")
    print(f"  Product:     {product}")
    print(f"  Ad Set:      {adset_name}")
    print(f"  Ad ID:       {ad_id}")
    print(f"  Creative ID: {creative_id}")
    print(f"  Ad Set ID:   {adset_id}")
    print(f"  Campaign ID: {staging_campaign_id}")
    print(f"  Media Type:  {media_type}")
    if media_type == "video":
        vid_summary = ", ".join(f"{r}={v['video_id']}" for r, v in assets.items())
        print(f"  Videos:      {vid_summary}")
    else:
        img_summary = ", ".join(f"{r}={h[:12]}..." for r, h in assets.items())
        print(f"  Images:      {img_summary}")
    print(f"\n  Ads Manager Links:")
    print(f"    Ad:        {ads_manager_link}")
    print(f"    Ad Set:    {adset_link}")
    print(f"    Campaign:  {campaign_link}")
    print(f"\n  Status: PAUSED — review in Ads Manager before activating.")

    return {
        "ad_id": ad_id,
        "creative_id": creative_id,
        "adset_id": adset_id,
        "adset_name": adset_name,
        "product": product,
        "campaign_id": staging_campaign_id,
        "ads_manager_link": ads_manager_link,
        "adset_manager_link": adset_link,
        "campaign_manager_link": campaign_link,
        "media_type": media_type,
        "assets": assets,
    }


def _build_asset_feed_creative(hashes, copy, page_id, ig_user_id, ad_name,
                                token, account_id, api_version,
                                media_type="image"):
    """Build an ad creative with asset_feed_spec and placement customization rules.

    Supports 4 ratios (1x1, 4x5, 9x16, 16x9) for both images and videos.
    Uses dynamic catch-all selection and priority-ordered placement rules.

    The catch-all rule (empty customization_spec) is critical — without it, uncovered
    placements fall back to the first asset regardless of labels.
    """
    label_map = {
        "1x1": "default_1x1",
        "4x5": "igfeed_4x5",
        "9x16": "story_9x16",
        "16x9": "sidebar_16x9",
    }

    # Determine which ratios are present
    available_ratios = set(hashes.keys())
    catchall_ratio = _select_catchall_ratio(available_ratios)

    # Create ad labels via batch
    needed_labels = {r: label_map[r] for r in label_map if r in hashes}
    label_names = _create_labels_batch(needed_labels, ad_name, account_id, api_version, token)

    # Determine label key based on media type
    label_key = "video_label" if media_type == "video" else "image_label"

    # Build assets array — each asset gets its own ratio label
    assets = []
    for ratio, asset_ref in hashes.items():
        if media_type == "video":
            entry = {"video_id": asset_ref["video_id"], "thumbnail_url": asset_ref["thumbnail_url"]}
        else:
            entry = {"hash": asset_ref}
        if ratio in label_names:
            entry["adlabels"] = [{"name": label_names[ratio]["name"]}]
        assets.append(entry)

    # Build text arrays — each entry gets ALL labels (same copy for all placements)
    all_labels = [{"name": label_names[r]["name"]} for r in label_names]
    bodies = [{"text": copy.get("body", ""), "adlabels": all_labels}]
    titles = [{"text": copy.get("headline", ""), "adlabels": all_labels}]
    link_urls = [{"website_url": copy.get("link", ""), "adlabels": all_labels}]
    descriptions = []
    if copy.get("description"):
        descriptions = [{"text": copy["description"]}]

    # Build asset customization rules with priority ordering
    rules = []
    priority = 1

    # Rule 1: Stories & Reels — 9:16 (only if present and NOT catch-all)
    # Includes audience_network (vertical format) per real CGK ad structure
    if "9x16" in label_names and "9x16" != catchall_ratio:
        label_ref = {"name": label_names["9x16"]["name"]}
        rules.append({
            "customization_spec": {
                "publisher_platforms": ["facebook", "instagram", "audience_network", "messenger"],
                "facebook_positions": ["facebook_reels", "story"],
                "instagram_positions": ["story", "reels", "ig_search", "profile_reels"],
                "messenger_positions": ["story"],
                "audience_network_positions": ["classic", "rewarded_video"],
            },
            label_key: label_ref,
            "body_label": label_ref,
            "title_label": label_ref,
            "link_url_label": label_ref,
            "priority": priority,
        })
        priority += 1

    # Rule 2: Sidebar & Search — 16:9 (only if present and NOT catch-all)
    if "16x9" in label_names and "16x9" != catchall_ratio:
        label_ref = {"name": label_names["16x9"]["name"]}
        rules.append({
            "customization_spec": {
                "publisher_platforms": ["facebook"],
                "facebook_positions": ["right_hand_column", "search"],
            },
            label_key: label_ref,
            "body_label": label_ref,
            "title_label": label_ref,
            "link_url_label": label_ref,
            "priority": priority,
        })
        priority += 1

    # Rule 3: IG Feed — 4:5 (only if present and NOT catch-all)
    if "4x5" in label_names and "4x5" != catchall_ratio:
        label_ref = {"name": label_names["4x5"]["name"]}
        rules.append({
            "customization_spec": {
                "publisher_platforms": ["instagram"],
                "instagram_positions": ["stream", "explore", "explore_home", "profile_feed"],
            },
            label_key: label_ref,
            "body_label": label_ref,
            "title_label": label_ref,
            "link_url_label": label_ref,
            "priority": priority,
        })
        priority += 1

    # Rule 4: FB Feed — 1:1 (only if present and NOT catch-all)
    # Includes video_feeds & instream_video per real CGK ad structure
    if "1x1" in label_names and "1x1" != catchall_ratio:
        label_ref = {"name": label_names["1x1"]["name"]}
        rules.append({
            "customization_spec": {
                "publisher_platforms": ["facebook"],
                "facebook_positions": ["feed", "marketplace", "video_feeds", "instream_video"],
            },
            label_key: label_ref,
            "body_label": label_ref,
            "title_label": label_ref,
            "link_url_label": label_ref,
            "priority": priority,
        })
        priority += 1

    # Catch-all rule — empty customization_spec covers all unclaimed placements
    if catchall_ratio in label_names:
        label_ref = {"name": label_names[catchall_ratio]["name"]}
        rules.append({
            "customization_spec": {},
            label_key: label_ref,
            "body_label": label_ref,
            "title_label": label_ref,
            "link_url_label": label_ref,
            "priority": priority,
        })

    # Build the asset_feed_spec
    asset_key = "videos" if media_type == "video" else "images"
    asset_feed_spec = {
        asset_key: assets,
        "bodies": bodies,
        "titles": titles,
        "link_urls": link_urls,
        "call_to_action_types": [copy.get("cta", "SHOP_NOW")],
        "ad_formats": ["AUTOMATIC_FORMAT"],
        "optimization_type": "PLACEMENT",
        "asset_customization_rules": rules,
    }
    if descriptions:
        asset_feed_spec["descriptions"] = descriptions

    oss = {"page_id": page_id}
    if ig_user_id:
        oss["instagram_user_id"] = ig_user_id

    creative_params = {
        "name": ad_name,
        "asset_feed_spec": json.dumps(asset_feed_spec),
        "object_story_spec": json.dumps(oss),
    }

    return creative_params


def cmd_debug_token():
    """Full token debug info — scopes, app, user, granular permissions."""
    token, _, api_version = get_config()

    data, _ = api_get(f"{api_version}/debug_token", {
        "input_token": token,
        "access_token": token,
    })

    print("=== Full Token Debug ===")
    print(json.dumps(data, indent=2))


# ---------------------------------------------------------------------------
# Token management
# ---------------------------------------------------------------------------

def _save_token(token, token_type, expires_at=None):
    """Persist token metadata to disk."""
    record = {
        "access_token": token,
        "token_type": token_type,
        "saved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "expires_at": expires_at,
    }
    TOKEN_FILE.write_text(json.dumps(record, indent=2) + "\n")
    TOKEN_FILE.chmod(0o600)
    print(f"  Token saved to {TOKEN_FILE}")


def _load_token():
    """Load saved token record, or None."""
    if not TOKEN_FILE.exists():
        return None
    try:
        return json.loads(TOKEN_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def _get_app_credentials():
    """Return (app_id, app_secret) or exit with instructions."""
    app_id = os.environ.get("META_APP_ID", "")
    app_secret = os.environ.get("META_APP_SECRET", "")
    if not app_id or not app_secret:
        print("ERROR: META_APP_ID and META_APP_SECRET are required for token management.")
        print("Set them in ~/.zshrc and run: source ~/.zshrc")
        sys.exit(1)
    return app_id, app_secret


def cmd_exchange_token(short_lived_token):
    """Exchange a short-lived token (~1-2 hrs) for a long-lived token (~60 days)."""
    app_id, app_secret = _get_app_credentials()
    api_version = os.environ.get("META_API_VERSION", "v24.0")

    print("=== Exchanging Short-Lived Token for Long-Lived Token ===\n")

    # Exchange via the OAuth endpoint
    data, _ = api_get(f"{api_version}/oauth/access_token", {
        "grant_type": "fb_exchange_token",
        "client_id": app_id,
        "client_secret": app_secret,
        "fb_exchange_token": short_lived_token,
    })

    new_token = data.get("access_token")
    expires_in = data.get("expires_in")  # seconds

    if not new_token:
        print("ERROR: No access_token in response.")
        print(json.dumps(data, indent=2))
        sys.exit(1)

    # Calculate expiry
    expires_at = None
    if expires_in:
        expires_dt = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=int(expires_in))
        expires_at = expires_dt.isoformat()
        days = int(expires_in) // 86400
        print(f"  Long-lived token obtained (expires in ~{days} days)")
        print(f"  Expires at: {expires_at}")
    else:
        print("  Long-lived token obtained (no expiry info — may be permanent)")

    # Save to file
    _save_token(new_token, "long_lived_user", expires_at)

    # Print the token (first/last 8 chars)
    masked = new_token[:8] + "..." + new_token[-8:] if len(new_token) > 20 else new_token
    print(f"  Token:    {masked}")
    print(f"\n  To use this token, run:")
    print(f"    export META_ACCESS_TOKEN='{new_token}'")
    print(f"\n  Or add it to ~/.zshrc to persist across sessions.")


def cmd_refresh_token():
    """Refresh the current long-lived token.

    Meta long-lived user tokens can be refreshed by exchanging them again,
    but ONLY if the token is still valid and less than 60 days old.
    The new token will have a fresh 60-day expiry.

    System user tokens never expire and don't need refreshing.
    """
    app_id, app_secret = _get_app_credentials()
    token = os.environ.get("META_ACCESS_TOKEN", "")
    api_version = os.environ.get("META_API_VERSION", "v24.0")

    if not token:
        # Try loading from saved file
        saved = _load_token()
        if saved and saved.get("access_token"):
            token = saved["access_token"]
            print("  Using saved token from .token.json")
        else:
            print("ERROR: No META_ACCESS_TOKEN set and no saved token found.")
            sys.exit(1)

    print("=== Refreshing Long-Lived Token ===\n")

    # First, check what kind of token this is
    debug_data, _ = api_get(f"{api_version}/debug_token", {
        "input_token": token,
        "access_token": token,
    })
    info = debug_data.get("data", {})

    if not info.get("is_valid"):
        print("  ERROR: Current token is invalid/expired. Cannot refresh.")
        print("  You need to generate a new short-lived token from Graph API Explorer")
        print("  and run: meta_api_helper.py exchange-token --short-lived-token <TOKEN>")
        sys.exit(1)

    token_type = info.get("type", "")
    if token_type == "SYSTEM":
        print("  This is a system user token — it never expires. No refresh needed.")
        return

    # Exchange the current long-lived token for a new one
    data, _ = api_get(f"{api_version}/oauth/access_token", {
        "grant_type": "fb_exchange_token",
        "client_id": app_id,
        "client_secret": app_secret,
        "fb_exchange_token": token,
    })

    new_token = data.get("access_token")
    expires_in = data.get("expires_in")

    if not new_token:
        print("  ERROR: Could not refresh token.")
        print("  This may happen if the token was already refreshed recently")
        print("  or if it's too close to expiry. Generate a new one from")
        print("  Graph API Explorer and use exchange-token instead.")
        print(json.dumps(data, indent=2))
        sys.exit(1)

    expires_at = None
    if expires_in:
        expires_dt = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=int(expires_in))
        expires_at = expires_dt.isoformat()
        days = int(expires_in) // 86400
        print(f"  Token refreshed (new expiry: ~{days} days)")
        print(f"  Expires at: {expires_at}")
    else:
        print("  Token refreshed (no expiry info)")

    _save_token(new_token, "long_lived_user", expires_at)

    masked = new_token[:8] + "..." + new_token[-8:] if len(new_token) > 20 else new_token
    print(f"  Token:    {masked}")

    if new_token != token:
        print(f"\n  TOKEN CHANGED — update your env:")
        print(f"    export META_ACCESS_TOKEN='{new_token}'")
    else:
        print(f"\n  Token value unchanged (still valid).")


def cmd_token_status():
    """Show current token status: type, expiry, days remaining, refresh advice."""
    token = os.environ.get("META_ACCESS_TOKEN", "")
    api_version = os.environ.get("META_API_VERSION", "v24.0")

    saved = _load_token()

    if not token and saved and saved.get("access_token"):
        token = saved["access_token"]
        print("  (Using saved token from .token.json)\n")

    if not token:
        print("=== Token Status ===")
        print("  No token found. Set META_ACCESS_TOKEN or run exchange-token.")
        sys.exit(1)

    print("=== Token Status ===\n")

    # Debug the token
    data, _ = api_get(f"{api_version}/debug_token", {
        "input_token": token,
        "access_token": token,
    })
    info = data.get("data", {})

    is_valid = info.get("is_valid", False)
    token_type = info.get("type", "Unknown")
    expires_at = info.get("expires_at", 0)
    app_id = info.get("app_id", "N/A")
    scopes = info.get("scopes", [])

    print(f"  Valid:       {'YES' if is_valid else 'NO'}")
    print(f"  Type:        {token_type}")
    print(f"  App ID:      {app_id}")
    print(f"  Scopes:      {', '.join(scopes[:5])}{'...' if len(scopes) > 5 else ''}")

    if expires_at == 0:
        print(f"  Expires:     NEVER (system user or non-expiring token)")
        print(f"\n  Status: No action needed.")
    elif expires_at:
        exp_dt = datetime.datetime.fromtimestamp(expires_at, tz=datetime.timezone.utc)
        now = datetime.datetime.now(datetime.timezone.utc)
        remaining = exp_dt - now
        days_left = remaining.days

        print(f"  Expires:     {exp_dt.strftime('%Y-%m-%d %H:%M UTC')}")
        print(f"  Days left:   {days_left}")

        if not is_valid:
            print(f"\n  EXPIRED — Generate a new short-lived token from Graph API Explorer:")
            print(f"    https://developers.facebook.com/tools/explorer/")
            print(f"  Then run:")
            print(f"    meta_api_helper.py exchange-token --short-lived-token <TOKEN>")
        elif days_left < 7:
            print(f"\n  EXPIRING SOON — Refresh now:")
            print(f"    meta_api_helper.py refresh-token")
        elif days_left < 30:
            print(f"\n  Healthy, but consider refreshing within {days_left - 7} days.")
            print(f"    meta_api_helper.py refresh-token")
        else:
            print(f"\n  Healthy. No action needed.")
    else:
        print(f"  Expires:     Unknown")

    # Show saved token info if available
    if saved:
        print(f"\n  Saved token file: {TOKEN_FILE}")
        print(f"  Saved at:    {saved.get('saved_at', 'N/A')}")
        if saved.get("expires_at"):
            print(f"  Saved expiry: {saved['expires_at']}")


# ---------------------------------------------------------------------------
# Ad read / edit / duplicate helpers
# ---------------------------------------------------------------------------

def _read_creative_full(ad_id, token, api_version):
    """Read complete ad + creative in a single API call. Returns structured data."""
    fields = (
        "name,status,adset_id,campaign_id,"
        "creative{id,name,body,title,link_url,call_to_action_type,"
        "object_story_spec,asset_feed_spec,thumbnail_url,image_url,"
        "effective_object_story_id},"
        "preview_shareable_link"
    )
    data, _ = api_get(f"{api_version}/{ad_id}", {"fields": fields}, token)

    creative = data.get("creative", {})
    if not creative:
        print(f"ERROR: No creative found for ad {ad_id}")
        sys.exit(1)

    oss = creative.get("object_story_spec", {})
    afs = creative.get("asset_feed_spec", {})

    # Detect creative type
    if afs and (afs.get("images") or afs.get("videos")):
        creative_type = "pac"
    elif oss.get("video_data"):
        creative_type = "single_video"
    else:
        creative_type = "single_image"

    # Extract copy
    ad_copy = {}
    link_data = oss.get("link_data", {})
    video_data = oss.get("video_data", {})

    if creative_type == "pac":
        bodies = afs.get("bodies", [])
        if bodies:
            ad_copy["body"] = bodies[0].get("text", "")
        titles = afs.get("titles", [])
        if titles:
            ad_copy["headline"] = titles[0].get("text", "")
        links = afs.get("link_urls", [])
        if links:
            ad_copy["link"] = links[0].get("website_url", "")
        descs = afs.get("descriptions", [])
        if descs:
            ad_copy["description"] = descs[0].get("text", "")
        ctas = afs.get("call_to_action_types", [])
        if ctas:
            ad_copy["cta"] = ctas[0]
    elif creative_type == "single_video":
        ad_copy["body"] = video_data.get("message", "")
        ad_copy["headline"] = video_data.get("title", "")
        ad_copy["description"] = video_data.get("link_description", "")
        cta = video_data.get("call_to_action", {})
        if cta.get("type"):
            ad_copy["cta"] = cta["type"]
        if cta.get("value", {}).get("link"):
            ad_copy["link"] = cta["value"]["link"]
    else:  # single_image
        ad_copy["body"] = link_data.get("message", "")
        ad_copy["headline"] = link_data.get("name", "")
        ad_copy["description"] = link_data.get("description", "")
        ad_copy["link"] = link_data.get("link", "")
        cta = link_data.get("call_to_action", {})
        if cta.get("type"):
            ad_copy["cta"] = cta["type"]

    # Fallback to top-level creative fields
    if not ad_copy.get("body") and creative.get("body"):
        ad_copy["body"] = creative["body"]
    if not ad_copy.get("headline") and creative.get("title"):
        ad_copy["headline"] = creative["title"]
    if not ad_copy.get("link") and creative.get("link_url"):
        ad_copy["link"] = creative["link_url"]
    if not ad_copy.get("cta") and creative.get("call_to_action_type"):
        ad_copy["cta"] = creative["call_to_action_type"]

    # Extract media refs
    images = []
    videos = []
    if creative_type == "pac":
        for img in afs.get("images", []):
            images.append(img.get("hash", ""))
        for vid in afs.get("videos", []):
            videos.append(vid.get("video_id", ""))
    elif creative_type == "single_video":
        vid_id = video_data.get("video_id", "")
        if vid_id:
            videos.append(vid_id)
    else:
        img_hash = link_data.get("image_hash", "")
        if img_hash:
            images.append(img_hash)

    # Extract url_tags
    url_tags = None
    if creative_type == "pac":
        # Check link_urls for url_tags
        links = afs.get("link_urls", [])
        for lnk in links:
            if lnk.get("url_tags"):
                url_tags = lnk["url_tags"]
                break
    else:
        # For single-media, url_tags are query params on the link itself
        link_val = ad_copy.get("link", "")
        if "?" in link_val:
            url_tags = link_val.split("?", 1)[1]

    return {
        "ad": {
            "id": data.get("id", ad_id),
            "name": data.get("name", ""),
            "status": data.get("status", ""),
            "adset_id": data.get("adset_id", ""),
            "campaign_id": data.get("campaign_id", ""),
        },
        "creative": {
            "id": creative.get("id", ""),
            "name": creative.get("name", ""),
            "object_story_spec": oss,
            "asset_feed_spec": afs,
        },
        "creative_type": creative_type,
        "copy": ad_copy,
        "media": {"images": images, "videos": videos},
        "video_thumbnail": creative.get("thumbnail_url", ""),
        "image_url": creative.get("image_url", ""),
        "effective_story_id": creative.get("effective_object_story_id", ""),
        "url_tags": url_tags,
        "preview_link": data.get("preview_shareable_link", ""),
        "ads_manager_link": _ads_manager_url(
            data.get("id", ad_id),
            data.get("adset_id", ""),
            data.get("campaign_id", ""),
        ),
    }


# ---------------------------------------------------------------------------
# Creative Analysis — Media Download Helpers
# ---------------------------------------------------------------------------

def _get_image_urls(image_hashes, token, api_version, account_id):
    """Resolve image hashes to CDN URLs via the Ad Images API.

    Returns: {hash: {url, permalink_url, width, height}}
    """
    if not image_hashes:
        return {}
    hashes_param = json.dumps(image_hashes)
    data, _ = api_get(f"{api_version}/{account_id}/adimages", {
        "hashes": hashes_param,
        "fields": "hash,url,permalink_url,width,height",
    }, token)
    result = {}
    images = data.get("data", [])
    if isinstance(images, list):
        for img in images:
            h = img.get("hash", "")
            if h:
                result[h] = {
                    "url": img.get("url", ""),
                    "permalink_url": img.get("permalink_url", ""),
                    "width": img.get("width"),
                    "height": img.get("height"),
                }
    return result


def _get_video_info(video_id, token, api_version):
    """Fetch video metadata including download URL.

    Returns: {source, picture, permalink_url, length, title}
    """
    data, _ = api_get(f"{api_version}/{video_id}", {
        "fields": "source,picture,permalink_url,length,title",
    }, token)
    return {
        "source": data.get("source", ""),
        "picture": data.get("picture", ""),
        "permalink_url": data.get("permalink_url", ""),
        "length": data.get("length"),
        "title": data.get("title", ""),
    }


def _ytdlp_export_cookies():
    """Export Chrome cookies to a temp file for yt-dlp.

    --cookies-from-browser has a known issue with Facebook (decrypted cookies
    don't work), but exporting to a cookies.txt first and passing --cookies works.
    Returns path to cookies file or None.
    """
    import shutil
    import subprocess as _sp
    import tempfile

    ytdlp_bin = shutil.which("yt-dlp")
    if not ytdlp_bin:
        return None

    cookies_path = pathlib.Path(tempfile.gettempdir()) / "ytdlp_fb_cookies.txt"

    # Export cookies by downloading a dummy URL with --cookies-from-browser + --cookies output
    cmd = [
        ytdlp_bin,
        "--cookies-from-browser", "chrome",
        "--cookies", str(cookies_path),
        "--no-download",
        "--quiet", "--no-warnings",
        "https://example.com",
    ]
    try:
        _sp.run(cmd, capture_output=True, text=True, timeout=30)
        if cookies_path.exists() and cookies_path.stat().st_size > 100:
            return str(cookies_path)
    except Exception:
        pass
    return None


def _ytdlp_download_video(url, dest_path, cookies_file=None):
    """Try downloading a video using yt-dlp. Returns dest_path on success, None on failure.

    yt-dlp has native Facebook video support and can extract videos from
    Facebook post URLs when browser cookies provide authentication.

    Uses --cookies with an exported file (not --cookies-from-browser) because
    the latter has a known issue where decrypted cookies fail for Facebook.
    """
    import shutil
    import subprocess as _sp

    ytdlp_bin = shutil.which("yt-dlp")
    if not ytdlp_bin:
        return None

    dest = pathlib.Path(dest_path)
    dest.parent.mkdir(parents=True, exist_ok=True)

    # yt-dlp may merge video+audio into final output; use template
    outtmpl = str(dest.with_suffix(".%(ext)s"))

    cmd = [
        ytdlp_bin,
        "--output", outtmpl,
        "--no-playlist",
        "--no-check-certificates",
        "--socket-timeout", "30",
        "--retries", "2",
        "--quiet", "--no-warnings",
    ]
    if cookies_file:
        cmd.extend(["--cookies", cookies_file])

    cmd.append(url)

    try:
        result = _sp.run(cmd, capture_output=True, text=True, timeout=180)
        if result.returncode == 0:
            # Find the downloaded file (extension may vary: mp4, webm, etc.)
            for ext in (".mp4", ".webm", ".mkv", ".mov", ".avi"):
                candidate = dest.with_suffix(ext)
                if candidate.exists() and candidate.stat().st_size > 1000:
                    if candidate.suffix != ".mp4":
                        final = candidate.with_suffix(".mp4")
                        candidate.rename(final)
                        return str(final)
                    return str(candidate)
            # Check glob pattern for any file matching the stem
            for f in dest.parent.glob(f"{dest.stem}.*"):
                if f.is_file() and f.stat().st_size > 1000:
                    return str(f)
        else:
            stderr = result.stderr.strip()
            if "registered users" in stderr or "cookies" in stderr.lower():
                print(f"    [yt-dlp] Auth required — log into facebook.com in Chrome, then retry")
            elif stderr:
                print(f"    [yt-dlp] Failed: {stderr[:120]}")
    except _sp.TimeoutExpired:
        print(f"    [yt-dlp] Timed out after 180s")
    except Exception as e:
        print(f"    [yt-dlp] Error: {e}")

    return None


def _get_video_source_with_fallbacks(video_id, ad_id, token, api_version, account_id,
                                      thumbnail_url="", image_url="",
                                      effective_story_id="",
                                      preview_link="", dest_dir=None):
    """Try multiple approaches to get a downloadable video file or URL.

    PAC (Partnership Ad) videos are owned by the partner's Page, so direct
    GET /{video_id}?fields=source fails with permission error #10.  This
    function tries progressively broader approaches:

    1. Direct video node (works for own videos)
    2. Account-scoped /advideos endpoint (may work for PAC)
    3. yt-dlp download from Facebook post URL (requires Chrome cookies)
    4. yt-dlp download from preview_shareable_link
    5. Effective story ID → post attachments (Graph API)
    6. Effective story ID → full_picture (high-res poster)
    7. AdCreative image_url (poster frame at usable resolution)
    8. Thumbnail URL last resort (64x64)

    Returns: {"url": str, "method": str, "is_video": bool, "local_path": str|None}
    """

    # --- Approach 1: Direct video node ---
    try:
        vid_info = _get_video_info(video_id, token, api_version)
        source = vid_info.get("source", "")
        if source:
            return {"url": source, "method": "direct", "is_video": True, "local_path": None}
    except (SystemExit, Exception):
        pass  # expected for PAC videos

    # --- Approach 2: Account-scoped advideos ---
    try:
        filtering = json.dumps([
            {"field": "id", "operator": "IN", "value": [str(video_id)]}
        ])
        data, _ = api_get(f"{api_version}/{account_id}/advideos", {
            "filtering": filtering,
            "fields": "source,picture,permalink_url,length,title",
        }, token)
        videos = data.get("data", [])
        if videos:
            source = videos[0].get("source", "")
            if source:
                return {"url": source, "method": "advideos", "is_video": True, "local_path": None}
            print(f"    [fallback] advideos returned video but no source field")
        else:
            print(f"    [fallback] advideos returned empty list (PAC video not in account library)")
    except (SystemExit, Exception):
        pass

    # --- Approach 3: yt-dlp from Facebook post URL ---
    # Check cache first — yt-dlp is slow, skip if we already have this file
    _dest_dir = dest_dir or CREATIVE_LIBRARY_MEDIA_DIR
    cache_prefix = pathlib.Path(_dest_dir) / f"{ad_id}-{video_id}"
    for cached in pathlib.Path(_dest_dir).glob(f"{ad_id}-{video_id}*"):
        if cached.is_file() and cached.stat().st_size > 1000 and cached.suffix in (".mp4", ".mkv", ".webm", ".mov"):
            sz = cached.stat().st_size
            print(f"    [cache] Using cached video ({sz // 1024}KB): {cached.name}")
            return {"url": "", "method": "cache", "is_video": True, "local_path": str(cached)}

    # Export Chrome cookies once for all yt-dlp attempts
    cookies_file = _ytdlp_export_cookies()

    # Construct the post URL from effective_object_story_id ({page_id}_{post_id})
    if effective_story_id and "_" in effective_story_id:
        page_id, post_id = effective_story_id.split("_", 1)
        fb_post_url = f"https://www.facebook.com/{page_id}/posts/{post_id}"
        print(f"    [yt-dlp] Trying Facebook post URL...")

        dest_path = pathlib.Path(_dest_dir) / f"{ad_id}-{video_id}"
        local = _ytdlp_download_video(fb_post_url, dest_path, cookies_file=cookies_file)
        if local:
            sz = pathlib.Path(local).stat().st_size
            print(f"    [yt-dlp] Downloaded video ({sz // 1024}KB) from post URL")
            return {"url": fb_post_url, "method": "ytdlp_post", "is_video": True, "local_path": local}

        # Try without cookies (some posts are public)
        local = _ytdlp_download_video(fb_post_url, dest_path, cookies_file=None)
        if local:
            sz = pathlib.Path(local).stat().st_size
            print(f"    [yt-dlp] Downloaded video ({sz // 1024}KB) from public post")
            return {"url": fb_post_url, "method": "ytdlp_post_public", "is_video": True, "local_path": local}

    # --- Approach 4: yt-dlp from preview_shareable_link ---
    if preview_link and cookies_file:
        print(f"    [yt-dlp] Trying preview link...")
        dest_path = pathlib.Path(_dest_dir) / f"{ad_id}-preview"
        local = _ytdlp_download_video(preview_link, dest_path, cookies_file=cookies_file)
        if local:
            sz = pathlib.Path(local).stat().st_size
            print(f"    [yt-dlp] Downloaded video ({sz // 1024}KB) from preview link")
            return {"url": preview_link, "method": "ytdlp_preview", "is_video": True, "local_path": local}

    # --- Approach 5: Effective story → post attachments (actual video) ---
    if effective_story_id:
        try:
            data, _ = api_get(f"{api_version}/{effective_story_id}", {
                "fields": "attachments{media{source},subattachments{media{source}}}",
            }, token)
            attachments = data.get("attachments", {}).get("data", [])
            for att in attachments:
                media = att.get("media", {})
                source = media.get("source", "")
                if source:
                    return {"url": source, "method": "story_video", "is_video": True, "local_path": None}
                subatts = att.get("subattachments", {}).get("data", [])
                for sub in subatts:
                    sub_source = sub.get("media", {}).get("source", "")
                    if sub_source:
                        return {"url": sub_source, "method": "story_video_sub", "is_video": True, "local_path": None}
        except (SystemExit, Exception):
            pass  # permission error expected for PAC

        # --- Approach 6: Effective story → full_picture (high-res poster) ---
        try:
            data, _ = api_get(f"{api_version}/{effective_story_id}", {
                "fields": "full_picture",
            }, token)
            full_pic = data.get("full_picture", "")
            if full_pic:
                print(f"    [fallback] got full_picture from story")
                return {"url": full_pic, "method": "story_full_picture", "is_video": False, "local_path": None}
        except (SystemExit, Exception):
            pass  # permission error expected for PAC

    # --- Approach 7: AdCreative image_url (poster frame ~720px+) ---
    if image_url:
        print(f"    [fallback] using creative image_url (poster frame)")
        return {"url": image_url, "method": "image_url", "is_video": False, "local_path": None}

    # --- Approach 8: Thumbnail URL last resort (64x64) ---
    if thumbnail_url:
        print(f"    [fallback] using thumbnail (64x64, too small for vision analysis)")
        return {"url": thumbnail_url, "method": "thumbnail", "is_video": False, "local_path": None}

    return {"url": "", "method": "none", "is_video": False, "local_path": None}


def _download_media(url, dest_path):
    """Download a file from URL to dest_path. Returns dest_path on success, None on failure."""
    if not url:
        return None
    dest = pathlib.Path(dest_path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            dest.write_bytes(resp.read())
        return str(dest)
    except Exception as e:
        print(f"  [download] Failed to download {url[:80]}...: {e}")
        return None


def _clean_media_cache(max_age_hours=168):
    """Remove cached media files older than max_age_hours (default 7 days).

    Preserves vision analysis JSON files for longer (they're small and expensive to regenerate).
    """
    if not MEDIA_CACHE_DIR.exists():
        return
    cutoff = time.time() - (max_age_hours * 3600)
    vision_cutoff = time.time() - (720 * 3600)  # 30 days for vision cache
    for f in MEDIA_CACHE_DIR.iterdir():
        if not f.is_file():
            continue
        age_cutoff = vision_cutoff if f.suffix == ".json" else cutoff
        if f.stat().st_mtime < age_cutoff:
            try:
                f.unlink()
            except OSError:
                pass


# ---------------------------------------------------------------------------
# Creative Analysis — Extended Metrics Fetch
# ---------------------------------------------------------------------------

CREATIVE_METRICS_FIELDS = (
    "ad_id,ad_name,campaign_name,adset_name,spend,impressions,clicks,ctr,"
    "actions,action_values,cost_per_action_type,purchase_roas,"
    "inline_link_clicks,inline_link_click_ctr,cost_per_inline_link_click,"
    "outbound_clicks,cost_per_outbound_click,"
    "inline_post_engagement,cost_per_inline_post_engagement,"
    "video_play_actions,video_thruplay_watched_actions,"
    "video_p25_watched_actions,video_p50_watched_actions,"
    "video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions,"
    "video_avg_time_watched_actions,video_continuous_2_sec_watched_actions,"
    "cost_per_thruplay"
)

CREATIVE_METRICS_FIELDS_LITE = ",".join([
    "ad_id", "ad_name", "campaign_name",
    "spend", "impressions", "clicks", "ctr",
    "actions", "action_values", "purchase_roas",
])


def _extract_action_value(row, action_type, key="actions"):
    """Extract a value from Meta's actions/action_values arrays."""
    for a in row.get(key, []):
        if a.get("action_type") == action_type:
            return float(a.get("value", 0))
    return 0.0


def _extract_video_metric(row, field_name):
    """Extract a video metric value from the actions-style array fields."""
    vals = row.get(field_name, [])
    if isinstance(vals, list):
        for v in vals:
            return float(v.get("value", 0))
    return 0.0


def _compute_creative_metrics(row):
    """Compute extended creative metrics from a raw insights row.

    Returns a dict with all computed metrics.
    """
    sp = float(row.get("spend", 0))
    impressions = float(row.get("impressions", 0))
    clicks = float(row.get("clicks", 0))
    ctr = float(row.get("ctr", 0))

    rev = (_extract_action_value(row, "purchase", "action_values")
           or _extract_action_value(row, "omni_purchase", "action_values"))
    purchases = (_extract_action_value(row, "purchase")
                 or _extract_action_value(row, "omni_purchase"))
    roas = rev / sp if sp > 0 else 0
    cpa = sp / purchases if purchases > 0 else 0

    inline_link_clicks = float(row.get("inline_link_clicks", 0))
    link_ctr = float(row.get("inline_link_click_ctr", 0))
    cplc = float(row.get("cost_per_inline_link_click", 0))

    # Video metrics
    video_plays = _extract_video_metric(row, "video_play_actions")
    thruplay = _extract_video_metric(row, "video_thruplay_watched_actions")
    views_3s = _extract_video_metric(row, "video_continuous_2_sec_watched_actions")
    p25 = _extract_video_metric(row, "video_p25_watched_actions")
    p50 = _extract_video_metric(row, "video_p50_watched_actions")
    p75 = _extract_video_metric(row, "video_p75_watched_actions")
    p95 = _extract_video_metric(row, "video_p95_watched_actions")
    p100 = _extract_video_metric(row, "video_p100_watched_actions")

    # Computed video rates
    hook_rate = views_3s / impressions if impressions > 0 else 0
    hold_rate = thruplay / views_3s if views_3s > 0 else 0
    thumbstop = video_plays / impressions if impressions > 0 else 0
    completion_rate = p100 / video_plays if video_plays > 0 else 0

    is_video = video_plays > 0

    return {
        "spend": sp,
        "impressions": impressions,
        "clicks": clicks,
        "ctr": ctr,
        "revenue": rev,
        "purchases": int(purchases),
        "roas": roas,
        "cpa": cpa,
        "inline_link_clicks": inline_link_clicks,
        "link_ctr": link_ctr,
        "cplc": cplc,
        "is_video": is_video,
        "video_plays": video_plays,
        "thruplay": thruplay,
        "views_3s": views_3s,
        "p25": p25,
        "p50": p50,
        "p75": p75,
        "p95": p95,
        "p100": p100,
        "hook_rate": hook_rate,
        "hold_rate": hold_rate,
        "thumbstop_ratio": thumbstop,
        "completion_rate": completion_rate,
    }


def _fetch_creative_metrics(date_preset, token, api_version, account_id,
                            ad_ids=None, keyword_filter=None,
                            fields_override=None, raise_on_error=False):
    """Fetch ad-level insights with full creative metrics.

    Returns: {ad_id: {metrics_dict}} for all Shopify ads with spend > 0.

    keyword_filter: if set, applies Meta server-side ad.name CONTAIN filter.
    fields_override: if set, uses these fields instead of CREATIVE_METRICS_FIELDS.
    raise_on_error: if True, raises RuntimeError on API failure instead of exit.
    """
    params = {
        "fields": fields_override or CREATIVE_METRICS_FIELDS,
        "date_preset": date_preset,
        "level": "ad",
        "limit": "500",
        "sort": '["spend_descending"]',
    }
    filters = []
    if ad_ids:
        filters.append({"field": "ad.id", "operator": "IN", "value": ad_ids})
    filters.append({"field": "ad.impressions", "operator": "GREATER_THAN", "value": "0"})
    if keyword_filter:
        filters.append({"field": "ad.name", "operator": "CONTAIN", "value": keyword_filter})
    params["filtering"] = json.dumps(filters)
    data, _ = api_get(f"{api_version}/{account_id}/insights", params, token,
                      raise_on_error=raise_on_error)
    rows = data.get("data", [])

    result = {}
    for row in rows:
        ad_id = row.get("ad_id", "")
        sp = float(row.get("spend", 0))
        if sp <= 0:
            continue
        if "amz" in row.get("campaign_name", "").lower():
            continue
        metrics = _compute_creative_metrics(row)
        metrics["ad_name"] = row.get("ad_name", "")
        metrics["campaign_name"] = row.get("campaign_name", "")
        metrics["adset_name"] = row.get("adset_name", "")
        metrics["date_start"] = row.get("date_start", "")
        metrics["date_stop"] = row.get("date_stop", "")
        result[ad_id] = metrics
    return result


# ---------------------------------------------------------------------------
# Creative Analysis — Gemini helpers (Vertex AI)
# ---------------------------------------------------------------------------

def _get_gemini_client():
    """Get a Vertex AI Gemini client. Uses ADC for auth."""
    from google import genai
    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0013158607")
    return genai.Client(vertexai=True, project=project, location="global")


def _gemini_media_part(file_path):
    """Load a local media file as a Vertex AI inline Part."""
    from google.genai import types as genai_types
    p = pathlib.Path(file_path)
    data = p.read_bytes()
    suffix = p.suffix.lower()
    mime_map = {".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm",
                ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
                ".gif": "image/gif", ".webp": "image/webp"}
    mime = mime_map.get(suffix, "application/octet-stream")
    return genai_types.Part.from_bytes(data=data, mime_type=mime)


# ---------------------------------------------------------------------------
# Creative Analysis — Vision Analysis (Gemini)
# ---------------------------------------------------------------------------

def _analyze_creative_visual(media_path, media_type, ad_metrics, model_name="gemini-3-flash-preview"):
    """Analyze a creative image or video using Gemini vision.

    media_path: local file path to image or video
    media_type: "image" or "video"
    ad_metrics: dict of computed metrics for context
    model_name: Gemini model to use

    Returns structured analysis dict, or None on failure.
    """
    try:
        from google import genai
    except ImportError:
        print("  [vision] google-genai not installed — skipping visual analysis")
        return None

    client = _get_gemini_client()

    # Build metrics context string
    m = ad_metrics
    metrics_context = f"Spend: ${m['spend']:,.2f}"
    if m.get("revenue"):
        metrics_context += f" | Revenue: ${m['revenue']:,.2f} | ROAS: {m['roas']:.2f}x"
    if m.get("purchases"):
        metrics_context += f" | Purchases: {m['purchases']} | CPA: ${m['cpa']:,.2f}"
    if m.get("link_ctr"):
        metrics_context += f" | Link CTR: {m['link_ctr']:.2f}%"
    if m.get("is_video"):
        metrics_context += (
            f" | Hook Rate: {m['hook_rate']:.1%} | Hold Rate: {m['hold_rate']:.1%}"
            f" | Thumbstop: {m['thumbstop_ratio']:.1%} | Completion: {m['completion_rate']:.1%}"
        )

    brand_desc = os.environ.get("BRAND_CATEGORY", "e-commerce brand")

    if media_type == "video":
        prompt = f"""Analyze this ad creative video for a {brand_desc}.
Performance metrics: {metrics_context}

Provide a structured analysis in JSON format:
{{
  "hook_analysis": "What happens in the first 3 seconds that grabs attention?",
  "visual_style": "Describe the visual style, lighting, camera work, pacing",
  "product_presentation": "How is the product shown? Lifestyle vs product-focused?",
  "emotional_tone": "What emotions does this evoke? What's the messaging approach?",
  "performance_drivers": "Given the metrics above, what visual/conceptual elements likely drive the strong performance?",
  "format": "UGC/polished/lifestyle/demo/testimonial/etc",
  "key_elements": ["element1", "element2", "element3"],
  "iteration_suggestions": ["suggestion1", "suggestion2"],
  "format_flip_idea": "If this were converted to a static image ad, what would the concept be?"
}}"""
    else:
        prompt = f"""Analyze this ad creative image for a {brand_desc}.
Performance metrics: {metrics_context}

Provide a structured analysis in JSON format:
{{
  "visual_hierarchy": "Describe the focal points and visual flow",
  "color_palette": "Colors, contrast, readability",
  "product_presentation": "How is the product shown? Lifestyle vs product-focused?",
  "copy_integration": "Is there text overlay? How does it work with the image?",
  "emotional_tone": "What emotions does this evoke? What's the messaging approach?",
  "performance_drivers": "Given the metrics above, what visual/conceptual elements likely drive the strong performance?",
  "format": "lifestyle/product-shot/UGC/flat-lay/comparison/etc",
  "key_elements": ["element1", "element2", "element3"],
  "iteration_suggestions": ["suggestion1", "suggestion2"],
  "format_flip_idea": "If this were converted to a video ad, what would the concept be?"
}}"""

    try:
        print(f"  [vision] Loading {media_type} as inline bytes...")
        media_part = _gemini_media_part(media_path)

        response = client.models.generate_content(
            model=model_name,
            contents=[media_part, prompt],
        )

        analysis_text = response.text

        # Parse JSON from response
        try:
            if "```json" in analysis_text:
                json_start = analysis_text.find("```json") + 7
                json_end = analysis_text.find("```", json_start)
                json_str = analysis_text[json_start:json_end].strip()
            elif "```" in analysis_text:
                json_start = analysis_text.find("```") + 3
                json_end = analysis_text.find("```", json_start)
                json_str = analysis_text[json_start:json_end].strip()
            else:
                json_str = analysis_text.strip()
            return json.loads(json_str)
        except json.JSONDecodeError:
            return {"raw_analysis": analysis_text}

    except Exception as e:
        print(f"  [vision] Analysis failed: {e}")
        return None


# ---------------------------------------------------------------------------
# Creative Analysis — Fatigue Detection
# ---------------------------------------------------------------------------

def _detect_fatigue(ad_id, metrics_primary, metrics_compare):
    """Compare primary window vs compare window to detect creative fatigue.

    Returns: {level: none|early|moderate|severe, flags: [...], details: {...}}
    """
    flags = []
    details = {}

    roas_p = metrics_primary.get("roas", 0)
    roas_c = metrics_compare.get("roas", 0)
    if roas_c > 0:
        roas_ratio = roas_p / roas_c
        details["roas_ratio"] = roas_ratio
        if roas_ratio < 0.8:
            flags.append(f"ROAS declined {(1 - roas_ratio):.0%} ({roas_p:.2f}x vs {roas_c:.2f}x avg)")

    ctr_p = metrics_primary.get("ctr", 0)
    ctr_c = metrics_compare.get("ctr", 0)
    if ctr_c > 0:
        ctr_ratio = ctr_p / ctr_c
        details["ctr_ratio"] = ctr_ratio
        if ctr_ratio < 0.8:
            flags.append(f"CTR declined {(1 - ctr_ratio):.0%} ({ctr_p:.2f}% vs {ctr_c:.2f}% avg)")

    cpa_p = metrics_primary.get("cpa", 0)
    cpa_c = metrics_compare.get("cpa", 0)
    if cpa_c > 0 and cpa_p > 0:
        cpa_ratio = cpa_p / cpa_c
        details["cpa_ratio"] = cpa_ratio
        if cpa_ratio > 1.2:
            flags.append(f"CPA increased {(cpa_ratio - 1):.0%} (${cpa_p:,.2f} vs ${cpa_c:,.2f} avg)")

    # Hook rate fatigue (video only)
    hook_p = metrics_primary.get("hook_rate", 0)
    hook_c = metrics_compare.get("hook_rate", 0)
    if hook_c > 0 and hook_p > 0:
        hook_ratio = hook_p / hook_c
        details["hook_ratio"] = hook_ratio
        if hook_ratio < 0.8:
            flags.append(f"Hook rate declined {(1 - hook_ratio):.0%}")

    # Determine fatigue level
    n = len(flags)
    if n == 0:
        level = "none"
    elif n == 1:
        level = "early"
    elif n == 2:
        level = "moderate"
    else:
        level = "severe"

    return {"level": level, "flags": flags, "details": details}


# ---------------------------------------------------------------------------
# Brand Guideline Feedback Loop
# ---------------------------------------------------------------------------

def _update_brand_file(filepath: pathlib.Path, date_str: str, source: str, section_lines: list) -> None:
    """Append or replace auto-generated section in a brand file."""
    if not section_lines:
        return

    marker = f"## Updated from {source}"
    new_section = f"\n\n---\n{marker} — {date_str}\n\n" + "\n".join(section_lines) + "\n"

    if filepath.exists():
        existing = filepath.read_text(encoding="utf-8")
        marker_idx = existing.find(f"---\n{marker}")
        if marker_idx >= 0:
            existing = existing[:marker_idx].rstrip()
        else:
            existing = existing.rstrip()
    else:
        existing = f"# {filepath.stem.replace('-', ' ').title()}\n"

    filepath.write_text(existing + new_section, encoding="utf-8")
    print(f"  Updated {filepath.name}")


def _build_design_rules_section(do_rules: list, dont_rules: list, hooks: list) -> list:
    """Build DO/DON'T rules section from analysis data."""
    lines = []

    seen_do = set()
    unique_do = []
    for r in do_rules:
        r_str = str(r).strip()
        if r_str and r_str.lower() not in seen_do:
            seen_do.add(r_str.lower())
            unique_do.append(r_str)

    seen_dont = set()
    unique_dont = []
    for r in dont_rules:
        r_str = str(r).strip()
        if r_str and r_str.lower() not in seen_dont:
            seen_dont.add(r_str.lower())
            unique_dont.append(r_str)

    if unique_do:
        lines.append("### DO (from top performers)")
        for r in unique_do[:8]:
            lines.append(f"- {r}")
        lines.append("")

    if unique_dont:
        lines.append("### DON'T (patterns to avoid)")
        for r in unique_dont[:5]:
            lines.append(f"- {r}")
        lines.append("")

    if hooks:
        seen_hooks = set()
        unique_hooks = []
        for h in hooks:
            h_str = str(h).strip()[:150]
            if h_str and h_str.lower() not in seen_hooks:
                seen_hooks.add(h_str.lower())
                unique_hooks.append(h_str)
        if unique_hooks:
            lines.append("### Hook Techniques")
            for h in unique_hooks[:5]:
                lines.append(f"- {h}")

    return lines


def _build_imagery_section(visual_styles: list, product_presentations: list) -> list:
    """Build imagery patterns section from analysis data."""
    lines = []

    if visual_styles:
        lines.append("### Visual Style Patterns")
        seen = set()
        for vs in visual_styles:
            vs_trimmed = vs.strip()[:200]
            if vs_trimmed and vs_trimmed.lower() not in seen:
                seen.add(vs_trimmed.lower())
                lines.append(f"- {vs_trimmed}")
        lines.append("")

    if product_presentations:
        lines.append("### Product Presentation Patterns")
        seen = set()
        for pp in product_presentations:
            pp_trimmed = pp.strip()[:200]
            if pp_trimmed and pp_trimmed.lower() not in seen:
                seen.add(pp_trimmed.lower())
                lines.append(f"- {pp_trimmed}")

    return lines


def _build_colors_section(all_colors: list) -> list:
    """Build color palette section from analysis data."""
    if not all_colors:
        return []

    from collections import Counter
    hex_colors = []
    for c in all_colors:
        c_str = str(c).strip()
        if c_str.startswith("#") and len(c_str) in (4, 7, 9):
            hex_colors.append(c_str.upper())
        elif c_str:
            match = re.search(r'#[0-9A-Fa-f]{3,8}', c_str)
            if match:
                hex_colors.append(match.group().upper())

    if not hex_colors:
        return []

    counts = Counter(hex_colors)
    lines = ["### Dominant Colors (from top performers)"]
    lines.append("| Color | Hex | Frequency |")
    lines.append("|-------|-----|-----------|")
    for color, count in counts.most_common(10):
        lines.append(f"| {color} | `{color}` | {count}x |")

    return lines


def update_brand_guidelines_from_analysis(ad_analyses: list) -> None:
    """Update brand guideline files with patterns from creative analysis.

    Aggregates vision analysis results across analyzed ads and writes findings to:
    - design-rules.md — DO/DON'T rules from winners/losers
    - imagery.md — photography patterns from top ads
    - colors.md — dominant colors from top performers
    """
    profile_root = _workspace_root()
    brand_dir = profile_root / "workspace" / "brand"
    brand_dir.mkdir(parents=True, exist_ok=True)

    date_str = datetime.datetime.now().strftime("%Y-%m-%d")

    all_colors = []
    do_rules = []
    dont_rules = []
    visual_styles = []
    product_presentations = []
    hook_techniques = []

    for a in ad_analyses:
        v = a.get("vision") or {}
        if not v:
            continue
        m = a.get("metrics", {})
        roas = m.get("roas", 0)

        palette = v.get("color_palette", [])
        if isinstance(palette, list):
            all_colors.extend(palette)
        elif isinstance(palette, str):
            all_colors.append(palette)

        elems = v.get("key_elements", [])
        if isinstance(elems, list) and roas >= 2.0:
            do_rules.extend(elems[:3])

        suggestions = v.get("iteration_suggestions", [])
        if isinstance(suggestions, list) and roas < 1.5:
            dont_rules.extend(str(s) for s in suggestions[:2])

        vs = v.get("visual_style", "")
        if vs:
            visual_styles.append(str(vs))
        pp = v.get("product_presentation", "")
        if pp:
            product_presentations.append(str(pp))

        hook = v.get("hook_analysis", "")
        if hook:
            hook_techniques.append(str(hook))

    _update_brand_file(
        brand_dir / "design-rules.md",
        date_str,
        "Creative Analysis",
        _build_design_rules_section(do_rules, dont_rules, hook_techniques),
    )

    _update_brand_file(
        brand_dir / "imagery.md",
        date_str,
        "Creative Analysis",
        _build_imagery_section(visual_styles, product_presentations),
    )

    _update_brand_file(
        brand_dir / "colors.md",
        date_str,
        "Creative Analysis",
        _build_colors_section(all_colors),
    )

    print(f"  Updated brand guidelines from creative analysis ({len(ad_analyses)} ads)")


# ---------------------------------------------------------------------------
# Creative Analysis — Main Command
# ---------------------------------------------------------------------------

def cmd_cgk_creative_analysis(date_preset="today", compare_preset="last_30d",
                               top_n=5, slack_target=None, threaded=False,
                               model_name="gemini-3-flash-preview",
                               keyword_filter=None):
    """AI-powered creative analysis with vision models + fatigue detection.

    Pulls top N Shopify ads, downloads their creative media, analyzes with
    Gemini vision, detects fatigue, and generates actionable recommendations.

    keyword_filter: if set, only analyzes ads whose name contains this string
    (server-side Meta API filter — reduces payload before it hits the wire).
    """
    token, account_id, api_version = get_config()

    label = f"{date_preset} vs {compare_preset}, top {top_n}"
    if keyword_filter:
        label += f", keyword={keyword_filter!r}"
    print(f"=== Creative Intelligence ({label}) ===\n")

    # Step 1: Clean media cache
    _clean_media_cache()

    # Step 2: Fetch primary + comparison metrics
    print("Fetching ad metrics...")
    metrics_primary = _fetch_creative_metrics(date_preset, token, api_version, account_id,
                                              keyword_filter=keyword_filter)
    time.sleep(3)  # Prevent burst rate limit hits between back-to-back Insights calls
    try:
        metrics_compare = _fetch_creative_metrics(compare_preset, token, api_version, account_id,
                                                  keyword_filter=keyword_filter,
                                                  fields_override=CREATIVE_METRICS_FIELDS_LITE,
                                                  raise_on_error=True)
    except RuntimeError as exc:
        print(f"  [WARN] Comparison period fetch failed — proceeding with primary data only: {exc}")
        metrics_compare = {}

    if not metrics_primary:
        _brand = os.environ.get("BRAND_NAME", "Meta Ads")
        msg = f"No Shopify ads with spend found for {date_preset}."
        print(f"  {msg}")
        if slack_target:
            _post_to_slack(slack_target, f":art: *{_brand} Creative Intelligence* — {msg}")
        return

    # Step 3: Sort by spend, take top N
    sorted_ads = sorted(metrics_primary.items(), key=lambda x: x[1]["spend"], reverse=True)
    top_ads = sorted_ads[:top_n]

    print(f"  Found {len(metrics_primary)} ads, analyzing top {len(top_ads)}...\n")

    # Step 4: Analyze each ad
    ad_analyses = []
    for ad_id, m in top_ads:
        print(f"  Analyzing ad {m['ad_name'][:50]}...")

        # Read creative details (image hashes / video IDs)
        try:
            creative_data = _read_creative_full(ad_id, token, api_version)
        except SystemExit:
            print(f"    Skipping — could not read creative for ad {ad_id}")
            ad_analyses.append({
                "ad_id": ad_id, "metrics": m, "creative_data": None,
                "vision": None, "fatigue": {"level": "unknown", "flags": []},
            })
            continue

        media_refs = creative_data.get("media", {})
        creative_type = creative_data.get("creative_type", "unknown")
        image_hashes = media_refs.get("images", [])
        video_ids = media_refs.get("videos", [])

        # Resolve and download media
        downloaded_path = None
        media_type = None
        asset_url = None

        if video_ids:
            vid_id = video_ids[0]
            print(f"    Resolving video {vid_id}...")
            result = _get_video_source_with_fallbacks(
                vid_id, ad_id, token, api_version, account_id,
                thumbnail_url=creative_data.get("video_thumbnail", ""),
                image_url=creative_data.get("image_url", ""),
                effective_story_id=creative_data.get("effective_story_id", ""),
                preview_link=creative_data.get("preview_link", ""),
                dest_dir=MEDIA_CACHE_DIR,
            )
            asset_url = result["url"]
            method = result["method"]

            if result.get("local_path"):
                downloaded_path = result["local_path"]
                media_type = "video"
            elif result["is_video"] and asset_url:
                dest = MEDIA_CACHE_DIR / f"{ad_id}-{vid_id}.mp4"
                if dest.exists() and dest.stat().st_size > 1000:
                    downloaded_path = str(dest)
                    print(f"    [cache] Using cached video ({dest.stat().st_size // 1024}KB)")
                else:
                    downloaded_path = _download_media(asset_url, dest)
                    if downloaded_path:
                        sz = pathlib.Path(downloaded_path).stat().st_size
                        print(f"    Downloaded video ({sz // 1024}KB) [method: {method}]")
                    else:
                        print(f"    Video download failed [method: {method}]")
                media_type = "video"
            elif not result["is_video"] and asset_url and method != "thumbnail":
                ext = "png" if ".png" in asset_url.lower() else "jpg"
                dest = MEDIA_CACHE_DIR / f"{ad_id}-{vid_id}-poster.{ext}"
                downloaded_path = _download_media(asset_url, dest)
                media_type = "image"
                if downloaded_path:
                    sz = pathlib.Path(downloaded_path).stat().st_size
                    print(f"    Downloaded poster ({sz // 1024}KB) [method: {method}]")
                else:
                    print(f"    Poster download failed [method: {method}]")
            else:
                print(f"    No usable media — PAC video requires Facebook login in Chrome for yt-dlp")
        elif image_hashes:
            h = image_hashes[0]
            print(f"    Resolving image {h[:12]}...")
            try:
                img_urls = _get_image_urls(image_hashes[:1], token, api_version, account_id)
                img_data = img_urls.get(h, {})
                img_url = img_data.get("url", "")
                if img_url:
                    ext = "jpg"
                    if ".png" in img_url.lower():
                        ext = "png"
                    dest = MEDIA_CACHE_DIR / f"{ad_id}-{h[:12]}.{ext}"
                    downloaded_path = _download_media(img_url, dest)
                    media_type = "image"
                    asset_url = img_url
                    if downloaded_path:
                        print(f"    Downloaded image ({pathlib.Path(downloaded_path).stat().st_size // 1024}KB)")
                else:
                    print(f"    No image URL available")
            except SystemExit:
                print(f"    Could not fetch image URLs")

        # Run vision analysis — with caching
        vision_result = None
        vision_cache = MEDIA_CACHE_DIR / f"{ad_id}.vision.json"
        if vision_cache.exists():
            try:
                cached = json.loads(vision_cache.read_text(encoding="utf-8"))
                if cached and isinstance(cached, dict):
                    vision_result = cached
                    print(f"    [cache] Using cached vision analysis")
            except (json.JSONDecodeError, OSError):
                pass
        if not vision_result and downloaded_path and media_type:
            print(f"    Running vision analysis ({model_name})...")
            vision_result = _analyze_creative_visual(downloaded_path, media_type, m, model_name)
            if vision_result:
                print(f"    Vision analysis complete")
                try:
                    vision_cache.write_text(
                        json.dumps(vision_result, indent=2, default=str),
                        encoding="utf-8"
                    )
                except OSError:
                    pass

        # Fatigue detection
        compare_metrics = metrics_compare.get(ad_id, {})
        fatigue = _detect_fatigue(ad_id, m, compare_metrics) if compare_metrics else {
            "level": "no_data", "flags": ["No comparison data available"], "details": {},
        }

        ad_analyses.append({
            "ad_id": ad_id,
            "metrics": m,
            "creative_data": creative_data,
            "vision": vision_result,
            "fatigue": fatigue,
            "media_type": media_type or ("video" if video_ids else "image"),
            "asset_url": asset_url,
        })

    # Step 5: Generate output
    now = datetime.datetime.now()
    date_str = now.strftime("%b %-d, %Y")

    # Terminal output
    _brand = os.environ.get("BRAND_NAME", "Meta Ads")
    print(f"\n{'='*70}")
    print(f"  {_brand} Creative Intelligence — Top {len(ad_analyses)} Ads | {date_str}")
    print(f"{'='*70}\n")

    for i, a in enumerate(ad_analyses, 1):
        m = a["metrics"]
        f = a["fatigue"]
        v = a.get("vision")
        cd = a.get("creative_data")
        mt = a.get("media_type", "unknown")

        fatigue_badge = {"none": "OK", "early": "EARLY", "moderate": "MODERATE",
                         "severe": "SEVERE", "no_data": "N/A", "unknown": "?"}.get(f["level"], "?")

        print(f"  #{i}  {m['ad_name']}")
        print(f"      Type: {mt.upper()} | Fatigue: {fatigue_badge}")
        print(f"      Spend: ${m['spend']:,.2f} | Rev: ${m['revenue']:,.2f} | ROAS: {m['roas']:.2f}x | CPA: ${m['cpa']:,.2f}")
        print(f"      Purchases: {m['purchases']} | Link CTR: {m['link_ctr']:.2f}%")
        if m.get("is_video"):
            print(f"      Hook: {m['hook_rate']:.1%} | Hold: {m['hold_rate']:.1%} | Thumbstop: {m['thumbstop_ratio']:.1%} | Completion: {m['completion_rate']:.1%}")
        if f["flags"]:
            print(f"      Fatigue Flags: {'; '.join(f['flags'])}")
        if v:
            drivers = v.get("performance_drivers", v.get("raw_analysis", ""))
            if drivers and len(str(drivers)) > 10:
                print(f"      Why it works: {str(drivers)[:200]}")
            suggestions = v.get("iteration_suggestions", [])
            if suggestions:
                print(f"      Iterations: {'; '.join(str(s) for s in suggestions[:3])}")
            flip = v.get("format_flip_idea", "")
            if flip:
                print(f"      Format Flip: {str(flip)[:150]}")
        if cd:
            print(f"      Preview: {cd.get('preview_link', 'N/A')}")
            print(f"      Ads Manager: {cd.get('ads_manager_link', 'N/A')}")
        print()

    # Print recommendations summary
    fatigued = [a for a in ad_analyses if a["fatigue"]["level"] in ("moderate", "severe")]
    healthy = [a for a in ad_analyses if a["fatigue"]["level"] == "none"]

    print(f"  {'='*60}")
    print(f"  RECOMMENDATIONS")
    print(f"  {'='*60}")
    if fatigued:
        print(f"\n  :warning: FATIGUE ALERTS ({len(fatigued)} ads):")
        for a in fatigued:
            print(f"    - {a['metrics']['ad_name'][:40]} [{a['fatigue']['level'].upper()}]: {'; '.join(a['fatigue']['flags'][:2])}")
    if healthy:
        print(f"\n  :white_check_mark: HEALTHY PERFORMERS ({len(healthy)} ads):")
        for a in healthy:
            print(f"    - {a['metrics']['ad_name'][:40]} (ROAS: {a['metrics']['roas']:.2f}x)")
    print()

    # Step 5b: Update brand guidelines from analysis
    update_brand_guidelines_from_analysis(ad_analyses)

    # Step 6: Slack output
    if slack_target:
        _post_creative_analysis_to_slack(
            ad_analyses, date_preset, compare_preset, date_str,
            slack_target, threaded,
        )


def _post_creative_analysis_to_slack(ad_analyses, date_preset, compare_preset,
                                      date_str, slack_target, threaded):
    """Post creative analysis results to Slack with threading."""

    rtype = "creative_intelligence"
    header_ts = None

    if threaded:
        header_ts = _post_or_reuse_header(slack_target, rtype)
        if header_ts:
            print(f"  THREAD_TS={header_ts}")

    # Per-ad cards
    for i, a in enumerate(ad_analyses, 1):
        m = a["metrics"]
        f = a["fatigue"]
        v = a.get("vision")
        cd = a.get("creative_data")
        mt = a.get("media_type", "unknown")

        fatigue_emoji = {
            "none": ":white_check_mark:", "early": ":warning:",
            "moderate": ":rotating_light:", "severe": ":fire:",
            "no_data": ":grey_question:", "unknown": ":grey_question:",
        }.get(f["level"], ":grey_question:")

        lines = [f"*#{i} {m['ad_name']}*  {fatigue_emoji}"]
        lines.append(f"_{mt.upper()} | {m['campaign_name'][:30]} > {m['adset_name'][:30]}_")
        lines.append("")

        # Metrics
        lines.append(f":moneybag: *Spend:* ${m['spend']:,.2f} | *Rev:* ${m['revenue']:,.2f} | *ROAS:* {m['roas']:.2f}x | *CPA:* ${m['cpa']:,.2f}")
        lines.append(f":chart_with_upwards_trend: *Purchases:* {m['purchases']} | *Link CTR:* {m['link_ctr']:.2f}%")
        if m.get("is_video"):
            lines.append(f":movie_camera: *Hook:* {m['hook_rate']:.1%} | *Hold:* {m['hold_rate']:.1%} | *Thumbstop:* {m['thumbstop_ratio']:.1%} | *Completion:* {m['completion_rate']:.1%}")

        # Fatigue
        if f["flags"]:
            lines.append(f"\n:hourglass: *Fatigue ({f['level'].upper()}):* {'; '.join(f['flags'][:2])}")

        # Vision analysis
        if v:
            drivers = v.get("performance_drivers", "")
            if drivers:
                lines.append(f"\n:brain: *Why it works:* {str(drivers)[:300]}")
            suggestions = v.get("iteration_suggestions", [])
            if suggestions:
                lines.append(f":bulb: *Iterations:* {'; '.join(str(s) for s in suggestions[:3])}")
            flip = v.get("format_flip_idea", "")
            if flip:
                lines.append(f":arrows_counterclockwise: *Format flip:* {str(flip)[:200]}")

        # Links
        asset_link = a.get("asset_url", "")
        if cd or asset_link:
            preview = cd.get("preview_link", "") if cd else ""
            ads_mgr = cd.get("ads_manager_link", "") if cd else ""
            link_parts = []
            if asset_link:
                link_parts.append(f"<{asset_link}|Raw Asset>")
            if preview:
                link_parts.append(f"<{preview}|Preview>")
            if ads_mgr:
                link_parts.append(f"<{ads_mgr}|Ads Manager>")
            if link_parts:
                lines.append(f"\n:link: {' | '.join(link_parts)}")

        card_text = "\n".join(lines)
        if threaded and header_ts:
            _post_to_slack(slack_target, card_text, thread_ts=header_ts)
        else:
            _post_to_slack(slack_target, card_text)

    # Recommendations summary
    fatigued = [a for a in ad_analyses if a["fatigue"]["level"] in ("moderate", "severe")]
    healthy = [a for a in ad_analyses if a["fatigue"]["level"] == "none"]

    rec_lines = [":brain: *Creative Intelligence — Recommendations*", ""]

    if fatigued:
        rec_lines.append(f":rotating_light: *Fatigue Alerts ({len(fatigued)} ads need attention):*")
        for a in fatigued:
            rec_lines.append(f"  • {a['metrics']['ad_name'][:40]} — {a['fatigue']['level'].upper()}: {'; '.join(a['fatigue']['flags'][:2])}")
        rec_lines.append("")

    if healthy:
        rec_lines.append(f":white_check_mark: *Healthy Performers to Double Down On ({len(healthy)}):*")
        for a in healthy:
            v = a.get("vision", {}) or {}
            elements = v.get("key_elements", [])
            desc = f" — {', '.join(str(e) for e in elements[:2])}" if elements else ""
            rec_lines.append(f"  • {a['metrics']['ad_name'][:40]} (ROAS: {a['metrics']['roas']:.2f}x){desc}")
        rec_lines.append("")

    # Format flip opportunities
    flip_lines = []
    for a in ad_analyses:
        v = a.get("vision", {}) or {}
        flip = v.get("format_flip_idea", "")
        if flip:
            mt = a.get("media_type", "unknown")
            flip_dir = "Video → Static" if mt == "video" else "Static → Video"
            flip_lines.append(f"  • {a['metrics']['ad_name'][:30]} ({flip_dir}): {str(flip)[:120]}")
    if flip_lines:
        rec_lines.append(":arrows_counterclockwise: *Format Flip Opportunities:*")
        rec_lines.extend(flip_lines)
        rec_lines.append("")

    cc = _get_cc_line(rtype)
    rec_text = "\n".join(rec_lines) + cc

    if threaded and header_ts:
        _post_to_slack(slack_target, rec_text, thread_ts=header_ts)
    else:
        _post_to_slack(slack_target, rec_text)


# ---------------------------------------------------------------------------
# Creative Library — Persistent Storage + Deep Analysis
# ---------------------------------------------------------------------------

CREATIVE_LIBRARY_DIR = _workspace_root() / "workspace" / "brand" / "reference-ads"
CREATIVE_LIBRARY_MEDIA_DIR = CREATIVE_LIBRARY_DIR / "media"


def _analyze_creative_deep(media_path, media_type, ad_metrics, copy_data, model_name="gemini-3-flash-preview"):
    """Enhanced creative analysis: vision + copy analysis + copy-visual synergy.

    media_path: local file path to image or video
    media_type: "image" or "video"
    ad_metrics: dict of computed metrics
    copy_data: dict with body, headline, description, link, cta
    model_name: Gemini model to use

    Returns structured analysis dict, or None on failure.
    """
    try:
        from google import genai
    except ImportError:
        print("  [deep-analysis] google-genai not installed — skipping")
        return None

    client = _get_gemini_client()

    # Build metrics context
    m = ad_metrics
    metrics_ctx = f"Spend: ${m['spend']:,.2f}"
    if m.get("revenue"):
        metrics_ctx += f" | Revenue: ${m['revenue']:,.2f} | ROAS: {m['roas']:.2f}x"
    if m.get("purchases"):
        metrics_ctx += f" | Purchases: {m['purchases']} | CPA: ${m['cpa']:,.2f}"
    if m.get("link_ctr"):
        metrics_ctx += f" | Link CTR: {m['link_ctr']:.2f}%"
    if m.get("is_video"):
        metrics_ctx += (
            f" | Hook Rate: {m['hook_rate']:.1%} | Hold Rate: {m['hold_rate']:.1%}"
            f" | Thumbstop: {m['thumbstop_ratio']:.1%} | Completion: {m['completion_rate']:.1%}"
        )

    # Build copy context
    body = copy_data.get("body", "")
    headline = copy_data.get("headline", "")
    description = copy_data.get("description", "")
    cta = copy_data.get("cta", "")
    link = copy_data.get("link", "")

    copy_ctx = f"Body: {body}\nHeadline: {headline}"
    if description:
        copy_ctx += f"\nDescription: {description}"
    if cta:
        copy_ctx += f"\nCTA: {cta}"
    if link:
        copy_ctx += f"\nLanding Page: {link}"

    prompt = f"""You are a senior performance creative strategist. Analyze this ad creative for an e-commerce brand.

PERFORMANCE METRICS:
{metrics_ctx}

AD COPY:
{copy_ctx}

Provide a comprehensive structured analysis in JSON format:
{{
  "hook_technique": "text-on-screen / visual-shock / question / pain-point / curiosity / UGC-style",
  "product_presentation": "lifestyle / product-shot / UGC / demo / comparison / testimonial",
  "visual_style": "brief description of lighting, camera work, overall aesthetic",
  "color_palette": ["#hex1", "#hex2", "#hex3"],
  "format_classification": "UGC / polished / lifestyle / demo / testimonial / comparison",

  "copy_analysis": {{
    "body_structure": "hook → problem → solution → proof → CTA (describe the actual structure)",
    "headline_technique": "benefit-led / curiosity / social-proof / urgency / question / how-to",
    "emotional_triggers": ["list of triggers: aspiration, fear-of-missing-out, pain-point, social-proof, curiosity, humor, urgency"],
    "readability": "short/punchy or long-form, estimated reading level",
    "cta_copy_strength": "weak/moderate/strong — explain why",
    "word_count": {{"body": 0, "headline": 0}}
  }},

  "copy_visual_synergy": "How well do the copy and visual work together? Does the copy reinforce the visual message? Score 1-10 with explanation.",
  "copy_suggestions": [
    "Alternative body copy suggestion 1 — with brief rationale",
    "Alternative headline suggestion — with brief rationale"
  ],

  "performance_drivers": "Given the metrics, what elements (visual + copy) likely drive performance?",
  "key_elements": ["element1", "element2", "element3"],
  "iteration_suggestions": ["suggestion1", "suggestion2"],
  "format_flip_idea": "If this were converted to a {'static image' if media_type == 'video' else 'video'} ad, what would the concept be?"
}}"""

    try:
        print(f"  [deep-analysis] Loading {media_type} as inline bytes...")
        media_part = _gemini_media_part(media_path)

        response = client.models.generate_content(
            model=model_name,
            contents=[media_part, prompt],
        )

        analysis_text = response.text

        # Parse JSON from response
        try:
            if "```json" in analysis_text:
                json_start = analysis_text.find("```json") + 7
                json_end = analysis_text.find("```", json_start)
                json_str = analysis_text[json_start:json_end].strip()
            elif "```" in analysis_text:
                json_start = analysis_text.find("```") + 3
                json_end = analysis_text.find("```", json_start)
                json_str = analysis_text[json_start:json_end].strip()
            else:
                json_str = analysis_text.strip()
            return json.loads(json_str)
        except json.JSONDecodeError:
            return {"raw_analysis": analysis_text}

    except Exception as e:
        print(f"  [deep-analysis] Analysis failed: {e}")
        return None


def _analyze_copy_performance(all_analyses):
    """Rank copy performance across all analyzed ads.

    all_analyses: list of ad analysis dicts (each has metrics, creative_data, vision)

    Returns structured copy rankings or None on failure.
    """
    try:
        from google import genai
    except ImportError:
        return None

    # Build copy+metrics data for all ads
    copy_entries = []
    for a in all_analyses:
        cd = a.get("creative_data")
        if not cd:
            continue
        m = a["metrics"]
        ad_copy = cd.get("copy", {})
        entry = {
            "ad_name": m.get("ad_name", ""),
            "campaign": m.get("campaign_name", ""),
            "spend": m["spend"],
            "revenue": m["revenue"],
            "roas": round(m["roas"], 2),
            "cpa": round(m["cpa"], 2),
            "link_ctr": round(m["link_ctr"], 2),
            "purchases": m["purchases"],
            "body": ad_copy.get("body", ""),
            "headline": ad_copy.get("headline", ""),
            "description": ad_copy.get("description", ""),
            "cta": ad_copy.get("cta", ""),
            "link": ad_copy.get("link", ""),
        }
        copy_entries.append(entry)

    if not copy_entries:
        return None

    prompt = f"""You are a senior direct-response copywriter analyzing ad copy performance data.

Here are {len(copy_entries)} ads with their copy and performance metrics:

{json.dumps(copy_entries, indent=2)}

Analyze the copy performance and return structured JSON:
{{
  "top_bodies": [
    {{"copy": "the body text", "roas": 3.9, "ad_name": "...", "why": "brief explanation"}}
  ],
  "top_headlines": [
    {{"copy": "the headline text", "roas": 3.9, "ad_name": "...", "why": "brief explanation"}}
  ],
  "copy_patterns": {{
    "most_common_cta": "SHOP_NOW or other",
    "emotional_triggers": {{"aspiration": 5, "pain_point": 3}},
    "headline_techniques": {{"benefit_led": 4, "curiosity": 2}},
    "avg_body_word_count": 50,
    "avg_headline_word_count": 5
  }},
  "new_suggestions": [
    {{
      "body": "suggested body copy",
      "headline": "suggested headline",
      "rationale": "why this should work based on the patterns above"
    }}
  ]
}}

Focus on: what copy patterns correlate with high ROAS? What body structures convert best?
Rank the top 3-5 bodies and headlines by ROAS. Generate 2-3 new copy suggestions."""

    try:
        client = _get_gemini_client()
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=[prompt],
        )
        text = response.text
        try:
            if "```json" in text:
                json_start = text.find("```json") + 7
                json_end = text.find("```", json_start)
                return json.loads(text[json_start:json_end].strip())
            elif "```" in text:
                json_start = text.find("```") + 3
                json_end = text.find("```", json_start)
                return json.loads(text[json_start:json_end].strip())
            return json.loads(text.strip())
        except json.JSONDecodeError:
            return {"raw_analysis": text}
    except Exception as e:
        print(f"  [copy-analysis] Failed: {e}")
        return None


def _generate_overall_learnings(all_analyses, copy_analysis):
    """Generate overall learnings and recommendations from all analyzed ads.

    Returns a Slack-formatted string, or None on failure.
    """
    try:
        from google import genai
    except ImportError:
        return None

    # Build summary of all ad analyses
    summaries = []
    for a in all_analyses:
        m = a["metrics"]
        v = a.get("vision", {}) or {}
        cd = a.get("creative_data", {}) or {}
        ad_copy = cd.get("copy", {}) or {}
        mt = a.get("media_type", "unknown")

        entry = {
            "ad_name": m.get("ad_name", ""),
            "type": mt,
            "spend": m["spend"],
            "roas": round(m["roas"], 2),
            "cpa": round(m["cpa"], 2),
            "purchases": m.get("purchases", 0),
            "ctr": round(m.get("link_ctr", 0), 2),
            "body": ad_copy.get("body", "")[:100],
            "headline": ad_copy.get("headline", ""),
        }
        if v and not v.get("raw_analysis"):
            entry["hook"] = v.get("hook_technique", "")
            entry["format"] = v.get("format_classification", "")
            entry["presentation"] = v.get("product_presentation", "")
            entry["drivers"] = str(v.get("performance_drivers", ""))[:200]
            ca = v.get("copy_analysis", {})
            if isinstance(ca, dict):
                entry["triggers"] = ca.get("emotional_triggers", [])
                entry["body_structure"] = ca.get("body_structure", "")
        summaries.append(entry)

    prompt = f"""You are a senior performance marketing strategist. Below are {len(summaries)} analyzed ads with their performance data and creative analysis.

{json.dumps(summaries, indent=2)}

Write a concise executive summary for Slack with:

1. **KEY LEARNINGS** (3-5 bullets) — What patterns drive the best ROAS? What visual styles, hooks, copy structures, and emotional triggers work? Be specific — reference actual ads and numbers.

2. **WHAT'S NOT WORKING** (2-3 bullets) — What patterns correlate with low ROAS? What should be cut or changed?

3. **RECOMMENDATIONS** (3-5 bullets) — Specific, actionable next steps. New creative concepts to test, copy angles to try, budget allocation suggestions. Be concrete — "test X with Y" not "consider exploring".

Format for Slack (use *bold*, _italic_, bullet points). Keep it under 2000 characters total. No headers larger than bold text. Start each section with an emoji."""

    try:
        client = _get_gemini_client()
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=[prompt],
        )
        text = response.text.strip()
        # Wrap in a header
        return f":brain: *Overall Learnings & Recommendations*\n\n{text}"
    except Exception as e:
        print(f"  [learnings] Failed: {e}")
        return None


def _run_master_analysis(all_analyses, copy_analysis):
    """Run deep strategic analysis using Claude Opus (via litellm proxy) or Gemini Pro fallback.

    Returns {"full": markdown_for_doc, "slack": short_slack_summary, "provider": name} or None.
    """
    # Build comprehensive data bundle
    summaries = []
    for a in all_analyses:
        m = a["metrics"]
        v = a.get("vision", {}) or {}
        cd = a.get("creative_data", {}) or {}
        ad_copy = cd.get("copy", {}) or {}
        mt = a.get("media_type", "unknown")

        entry = {
            "ad_name": m.get("ad_name", ""),
            "type": mt,
            "spend": m["spend"],
            "revenue": m.get("revenue", 0),
            "roas": round(m["roas"], 2),
            "cpa": round(m["cpa"], 2),
            "purchases": m.get("purchases", 0),
            "ctr": round(m.get("link_ctr", 0), 2),
            "body": ad_copy.get("body", ""),
            "headline": ad_copy.get("headline", ""),
            "cta": ad_copy.get("cta", ""),
        }
        if m.get("is_video"):
            entry["hook_rate"] = round(m.get("hook_rate", 0), 4)
            entry["thumbstop"] = round(m.get("thumbstop_ratio", 0), 4)
            entry["completion"] = round(m.get("completion_rate", 0), 4)
        if v and not v.get("raw_analysis"):
            entry["vision"] = {
                "hook_technique": v.get("hook_technique", ""),
                "format": v.get("format_classification", ""),
                "presentation": v.get("product_presentation", ""),
                "visual_style": v.get("visual_style", ""),
                "color_palette": v.get("color_palette", []),
                "key_elements": v.get("key_elements", []),
                "performance_drivers": str(v.get("performance_drivers", "")),
                "copy_visual_synergy": str(v.get("copy_visual_synergy", "")),
                "iteration_suggestions": v.get("iteration_suggestions", []),
                "format_flip_idea": v.get("format_flip_idea", ""),
            }
            ca = v.get("copy_analysis", {})
            if isinstance(ca, dict):
                entry["copy_analysis"] = {
                    "triggers": ca.get("emotional_triggers", []),
                    "body_structure": ca.get("body_structure", ""),
                    "headline_technique": ca.get("headline_technique", ""),
                    "cta_strength": ca.get("cta_copy_strength", ""),
                }
        else:
            entry["vision"] = None
        summaries.append(entry)

    copy_rankings = {}
    if copy_analysis:
        copy_rankings = {
            "top_bodies": copy_analysis.get("top_bodies", [])[:5],
            "top_headlines": copy_analysis.get("top_headlines", [])[:5],
            "patterns": copy_analysis.get("copy_patterns", {}),
            "suggestions": copy_analysis.get("new_suggestions", [])[:5],
        }

    data_str = json.dumps({"ads": summaries, "copy_rankings": copy_rankings}, indent=2)

    # Count format types for conditional sections
    video_count = sum(1 for s in summaries if s.get("type") == "video")
    static_count = sum(1 for s in summaries if s.get("type") == "image")

    format_sections = ""
    if video_count > 0 and static_count > 0:
        # Both formats present — compare them
        format_sections = f"""
## Video Learnings ({video_count} ads)
Analyze ONLY the video ads as a group:
- What's working in video? (hooks, pacing, camera style, UGC vs produced, completion rates)
- What should we make MORE of? (specific format/style/hook combos that perform)
- What's NOT working in video? (what to stop doing)
- 2-3 bullets max per subsection. Reference specific ads and numbers.

## Static Image Learnings ({static_count} ads)
Analyze ONLY the static/image ads as a group:
- What's working in static? (composition, text overlays, lifestyle vs product-on-white, color)
- What should we make MORE of? (specific visual styles that convert)
- What's NOT working in static? (what to stop doing)
- 2-3 bullets max per subsection. Reference specific ads and numbers.

## Video vs Static
One paragraph: which format is winning overall and why? Use avg ROAS, CPA, CTR across each format. Should budget shift toward video or static?
"""
    elif video_count > 0:
        format_sections = f"""
## Video Learnings ({video_count} ads)
Analyze the video ads as a group:
- What's working in video? (hooks, pacing, camera style, UGC vs produced, completion/thumbstop rates)
- What should we make MORE of? (specific format/style/hook combos — be concrete: "more UGC with curiosity hooks" not "more engaging content")
- What's NOT working? (specific patterns from low performers)
- 3-5 bullets per subsection. Reference specific ads and bold the numbers.
"""
    elif static_count > 0:
        format_sections = f"""
## Static Image Learnings ({static_count} ads)
Analyze the static/image ads as a group:
- What's working in static? (composition, text overlays, lifestyle vs product shots, color usage)
- What should we make MORE of? (specific visual styles that convert — be concrete)
- What's NOT working? (specific patterns from low performers)
- 3-5 bullets per subsection. Reference specific ads and bold the numbers.
"""

    brand_name = os.environ.get("BRAND_NAME", "the brand")
    brand_desc = os.environ.get("BRAND_CATEGORY", "e-commerce brand")
    prompt = f"""You're a senior performance creative strategist briefing a growth team on Meta ad creative for {brand_name} ({brand_desc}).

Here are {len(summaries)} ads ({video_count} video, {static_count} static) with FULL performance data + Gemini vision analysis of extracted video/image assets:

{data_str}

Write a strategic brief in markdown. This covers the FULL creative — visual, copy, and performance together. Be CONCISE and ACTIONABLE. Use bullets, tables, and bold numbers. No filler.

## The Big Insight
One bold sentence. The single most important creative learning from this batch.

## Creative Winners & Losers
| Ad | Verdict | ROAS | Why |
Each ad gets ONE row. Verdict = 🟢 Scale / 🔴 Kill / 🟡 Iterate.
Below the table: 2-3 bullets on what separates the winners from the losers (visual style, hook technique, pacing, copy, format — whatever the data shows).

## Visual & Creative Playbook
What's working visually? Synthesize across all ads. Use the vision analysis data:
- **Winning hook techniques** — which hooks drive the highest thumbstop/CTR? Reference specific ads.
- **Visual style that converts** — lighting, camera work, pacing, aesthetic. What do the winners look like vs the losers?
- **Format insights** — UGC vs polished vs lifestyle vs demo. What format wins and why?
- **Color & composition** — any patterns in palette or framing that correlate with performance?
Keep to 5-7 bullets total. Bold the data.
{format_sections}
## Copy Playbook
Cheat sheet format — "Do / Don't":
- ✅ Do: [specific rule backed by data, with example from winning ad]
- ❌ Don't: [specific anti-pattern from losing ad]
4-6 rules max. Include body copy structure, headline technique, and CTA insights.

## Test Next
3 specific new creative concepts. For each:
- **Title** — one line
- **Format + Hook** — e.g., "UGC / curiosity hook"
- **Visual direction** — what it looks like (camera, lighting, pacing)
- **Copy angle** — headline + body direction
- **Why** — what data supports this (one sentence)

## Iterations
2-3 specific tweaks to existing winners. "Take [ad name], change [specific visual/copy element], because [data reason]."

STYLE: Every sentence must reference data or specific ads. No "consider testing" — say WHAT to test. No filler phrases. Bold the numbers. Scannable in 90 seconds."""

    full_text = None
    provider = None

    # Primary: Direct Anthropic SDK
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model="claude-opus-4-6",
                max_tokens=8192,
                messages=[{"role": "user", "content": prompt}],
            )
            full_text = response.content[0].text.strip()
            provider = "Claude Opus"
            print("  [master-analysis] Claude Opus (direct) complete")
        except Exception as e:
            print(f"  [master-analysis] Claude Opus direct failed: {e}")

    # Fallback: Direct Anthropic SDK with secondary key
    if not full_text:
        api_key_2 = os.environ.get("ANTHROPIC_API_KEY_2")
        if api_key_2:
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=api_key_2)
                response = client.messages.create(
                    model="claude-opus-4-6",
                    max_tokens=8192,
                    messages=[{"role": "user", "content": prompt}],
                )
                full_text = response.content[0].text.strip()
                provider = "Claude Opus"
                print("  [master-analysis] Claude Opus (direct, key 2) complete")
            except Exception as e:
                print(f"  [master-analysis] Claude Opus direct (key 2) failed: {e}")

    # Secondary: Claude Opus via litellm proxy (OpenAI-compatible)
    if not full_text:
        litellm_url = os.environ.get("LITELLM_BASE_URL", "http://localhost:4000/v1")
        litellm_key = os.environ.get("LITELLM_API_KEY", "")
        if litellm_key:
            try:
                resp = urllib.request.urlopen(urllib.request.Request(
                    f"{litellm_url}/chat/completions",
                    data=json.dumps({
                        "model": "claude-opus-4-6",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 8192,
                    }).encode(),
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {litellm_key}",
                    },
                ), timeout=180)
                result = json.loads(resp.read().decode())
                full_text = result["choices"][0]["message"]["content"].strip()
                provider = "Claude Opus"
                print("  [master-analysis] Claude Opus (via proxy) complete")
            except Exception as e:
                print(f"  [master-analysis] Claude Opus proxy failed: {e}")

    # Tertiary: Gemini 3 Pro (Vertex AI)
    if not full_text:
        try:
            client = _get_gemini_client()
            response = client.models.generate_content(
                model="gemini-3-pro-preview",
                contents=[prompt],
            )
            full_text = response.text.strip()
            provider = "Gemini Pro"
            print("  [master-analysis] Gemini 3 Pro complete (fallback)")
        except Exception as e:
            print(f"  [master-analysis] Gemini 3 Pro failed: {e}")

    if not full_text:
        print("  [master-analysis] All providers failed")
        return None

    # Use AI to generate a short Slack summary from the full analysis
    # Gemini Flash is fast + cheap for this summarization task
    slack_summary = ""
    slack_prompt = f"""Summarize this Meta ads strategic analysis for a Slack message. MAX 500 characters.

{full_text}

FORMAT RULES (Slack, NOT markdown):
- Bold = *single asterisks* (NEVER **double**)
- Italic = _underscores_
- One *bold* takeaway sentence
- 3-4 bullet points (• prefix), each ONE short sentence
- Budget line: :chart_with_upwards_trend: *Scale:* ad names | :no_entry_sign: *Kill:* ad names
- NO headers, NO tables, NO sections
- Under 500 chars total

Output ONLY the message text."""

    try:
        summary_client = _get_gemini_client()
        summary_resp = summary_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[slack_prompt],
        )
        slack_summary = summary_resp.text.strip()
        # Fix any markdown bold **text** → Slack bold *text*
        slack_summary = re.sub(r'\*\*([^*]+)\*\*', r'*\1*', slack_summary)
        # Hard cap — if AI went over, truncate at last complete line under 700 chars
        if len(slack_summary) > 700:
            lines = slack_summary.split("\n")
            trimmed = []
            total = 0
            for ln in lines:
                if total + len(ln) + 1 > 700:
                    break
                trimmed.append(ln)
                total += len(ln) + 1
            slack_summary = "\n".join(trimmed)
        print("  [master-analysis] Slack summary generated (Gemini Flash)")
    except Exception as e:
        print(f"  [master-analysis] Slack summary generation failed: {e}")

    # Fallback: simple one-liner if AI summary failed
    if not slack_summary:
        slack_summary = f"Master analysis complete ({provider}). See Google Doc for full details."

    return {"full": full_text, "slack": slack_summary, "provider": provider}


def _build_creative_report_markdown(all_analyses, copy_analysis, overall_learnings,
                                     master_analysis, date_preset):
    """Build a full markdown report using AI to compose a polished, cohesive document.

    Sends all data to Claude Opus (via litellm proxy) with Gemini Pro fallback.
    Falls back to programmatic builder if all AI calls fail.
    Returns the complete markdown report string.
    """
    _brand = os.environ.get("BRAND_NAME", "Meta Ads")
    now = datetime.datetime.now()
    date_str = now.strftime("%b %-d, %Y")
    account_id = os.environ.get("META_AD_ACCOUNT_ID", "")
    if not account_id:
        log("WARNING: META_AD_ACCOUNT_ID not set — Ad Manager links will be omitted")

    # Build comprehensive data bundle for the AI
    ads_data = []
    for i, a in enumerate(all_analyses, 1):
        m = a["metrics"]
        v = a.get("vision", {}) or {}
        cd = a.get("creative_data", {}) or {}
        mt = a.get("media_type", "unknown")
        ad_copy = cd.get("copy", {}) or {}
        preview = cd.get("preview_link", "")
        asset = a.get("asset_url", "")
        ad_mgr = (
            f"https://adsmanager.facebook.com/adsmanager/manage/ads?"
            f"act={account_id.replace('act_', '')}"
            f"&selected_ad_ids={a['ad_id']}"
        ) if account_id else ""

        ad_entry = {
            "number": i,
            "ad_name": m.get("ad_name", ""),
            "media_type": mt,
            "metrics": {
                "spend": m["spend"],
                "revenue": m.get("revenue", 0),
                "roas": round(m["roas"], 2),
                "cpa": round(m["cpa"], 2),
                "purchases": m.get("purchases", 0),
                "link_ctr": round(m.get("link_ctr", 0), 2),
            },
            "copy": {
                "headline": ad_copy.get("headline", ""),
                "body": ad_copy.get("body", ""),
                "cta": ad_copy.get("cta", ""),
                "landing_page": ad_copy.get("link", ""),
            },
            "links": {
                "preview": preview,
                "asset": asset if asset and asset.startswith("http") else "",
                "ads_manager": ad_mgr,
            },
        }
        if m.get("is_video"):
            ad_entry["metrics"]["thumbstop_rate"] = round(m.get("thumbstop_ratio", 0), 4)
            ad_entry["metrics"]["hook_rate"] = round(m.get("hook_rate", 0), 4)
            ad_entry["metrics"]["hold_rate"] = round(m.get("hold_rate", 0), 4)
            ad_entry["metrics"]["completion_rate"] = round(m.get("completion_rate", 0), 4)
        if v and not v.get("raw_analysis"):
            ad_entry["vision_analysis"] = {
                "hook_technique": v.get("hook_technique", ""),
                "product_presentation": v.get("product_presentation", ""),
                "visual_style": v.get("visual_style", ""),
                "format": v.get("format_classification", ""),
                "performance_drivers": str(v.get("performance_drivers", ""))[:500],
                "key_elements": v.get("key_elements", []),
                "color_palette": v.get("color_palette", []),
            }
            ca = v.get("copy_analysis", {})
            if isinstance(ca, dict) and ca:
                ad_entry["copy_analysis"] = {
                    "body_structure": ca.get("body_structure", ""),
                    "headline_technique": ca.get("headline_technique", ""),
                    "emotional_triggers": ca.get("emotional_triggers", []),
                    "cta_strength": ca.get("cta_copy_strength", ""),
                    "copy_visual_synergy": v.get("copy_visual_synergy", ""),
                }
            ad_entry["suggestions"] = {
                "copy_suggestions": v.get("copy_suggestions", [])[:3],
                "iteration_suggestions": v.get("iteration_suggestions", [])[:3],
                "format_flip": v.get("format_flip_idea", ""),
                "why_it_works": v.get("why_it_works", ""),
            }
        ads_data.append(ad_entry)

    data_bundle = json.dumps({
        "ads": ads_data,
        "copy_rankings": copy_analysis or {},
    }, indent=2, default=str)

    ma_full = master_analysis.get("full", "") if isinstance(master_analysis, dict) else (master_analysis or "")

    # Count format types for conditional sections
    doc_video_count = sum(1 for ad in ads_data if ad.get("media_type") == "video")
    doc_static_count = sum(1 for ad in ads_data if ad.get("media_type") == "image")

    doc_format_headings = ""
    doc_format_instructions = ""
    if doc_video_count > 0 and doc_static_count > 0:
        doc_format_headings = "## Video Learnings\n## Static Image Learnings\n"
        doc_format_instructions = f"""
**Video Learnings** ({doc_video_count} video ads):
- What's working in VIDEO specifically? (hooks, pacing, camera style, UGC vs produced, completion rates, thumbstop)
- What to make MORE of — specific format/style/hook combos. Be concrete: "more UGC with curiosity hooks and soft lighting" not "more engaging content"
- What to STOP doing in video — patterns from low performers
- 3-5 data-backed bullets. Bold the numbers.

**Static Image Learnings** ({doc_static_count} static ads):
- What's working in STATIC specifically? (composition, text overlays, lifestyle vs product shots, color, before/after)
- What to make MORE of — specific visual styles that convert
- What to STOP doing in static
- 3-5 data-backed bullets. Bold the numbers.

Include a one-line comparison: which format is winning overall (avg ROAS across video vs static)?
"""
    elif doc_video_count > 0:
        doc_format_headings = "## Video Learnings\n"
        doc_format_instructions = f"""
**Video Learnings** ({doc_video_count} video ads):
- What's working in VIDEO? (hooks, pacing, camera style, UGC vs produced, completion/thumbstop rates)
- What to make MORE of — specific format/style/hook combos that perform. Be concrete.
- What to STOP doing — patterns from low performers
- 4-6 data-backed bullets. Bold the numbers.
"""
    elif doc_static_count > 0:
        doc_format_headings = "## Static Image Learnings\n"
        doc_format_instructions = f"""
**Static Image Learnings** ({doc_static_count} static ads):
- What's working in STATIC? (composition, text overlays, lifestyle vs product shots, color usage)
- What to make MORE of — specific visual styles that convert. Be concrete.
- What to STOP doing — patterns from low performers
- 4-6 data-backed bullets. Bold the numbers.
"""

    report_prompt = f"""You're writing a creative performance brief for a growth marketing team. This goes in a Google Doc via markdown. The audience is media buyers and creative strategists — they scan, they don't read. Every line must earn its place.

IMPORTANT: This is a CREATIVE analysis, not just a copy analysis. Each ad has been analyzed by Gemini vision AI which extracted visual style, hooks, pacing, camera work, colors, format, and more. Feature this analysis prominently — it's the most valuable part.

## THE DATA

Each ad below includes: performance metrics, ad copy, AND Gemini vision analysis of the extracted video/image asset.

**Date:** {date_str} | **Period:** {date_preset} | **Ads:** {len(all_analyses)} ({doc_video_count} video, {doc_static_count} static)

{data_bundle}

## MASTER ANALYSIS (synthesize the key insights — don't just paste it, weave the best parts in):
{ma_full if ma_full else "(Not available)"}

## REQUIRED HEADINGS (exact — used for doc section linking):

# {_brand} Creative Library — {date_str}
## Dashboard
## Ad #1: [exact ad name]
## Ad #2: [exact ad name]
(etc.)
{doc_format_headings}## Creative Playbook
## Strategic Recommendations

## HOW TO WRITE THIS

**Dashboard section** — THE MOST IMPORTANT PART:
> 📊 **Total Spend:** $X | **Revenue:** $X | **Avg ROAS:** Xx
>
> 🏆 **Winner:** Ad name (Xx ROAS) — one sentence why (reference creative format + hook)
> 🚫 **Cut:** Ad name (Xx ROAS) — one sentence why
> 🔄 **Iterate:** Ad name — one sentence what to change

Then a single metrics table — all ads side by side:

| | Ad 1 | Ad 2 | Ad 3 |
|---|---|---|---|
| Spend | $X | $X | $X |
| ROAS | Xx | Xx | Xx |
| CPA | $X | $X | $X |
| CTR | X% | X% | X% |
| Thumbstop | X% | X% | X% |
| Format | UGC/etc | UGC/etc | UGC/etc |

That's it for the dashboard. No paragraphs.

**Per-ad sections** — each ad is a mini creative brief (~20-25 lines):
- One-liner verdict: `> 🟢 SCALE` or `> 🔴 CUT` or `> 🟡 ITERATE` with ROAS and spend
- **Quick metrics** — key numbers for THIS ad
- **The Creative** — describe the visual: format, hook technique, camera style, lighting, pacing, colors. This is NOT just copy. What does the viewer SEE in the first 3 seconds? What's the visual style? (Use the vision_analysis data)
- **The Copy** — headline + body verbatim (quoted), plus structure analysis
- **Why It Works / Doesn't** — 3-4 bullets combining visual + copy + performance insights. Reference specific vision analysis findings (e.g., "The curiosity hook + UGC format drives 96% thumbstop")
- **Next Steps** — 1-2 specific creative iterations. Be specific about visual AND copy changes.
- Links at bottom: [Ads Manager](url) | [Preview](url) | [Raw Asset](url)
- `---` between ads

If an ad has NO vision analysis (media couldn't be downloaded), say "⚠️ Vision analysis unavailable — media could not be extracted" and analyze based on copy + metrics only.

{doc_format_instructions}
**Creative Playbook** — the team's cheat sheet:

*Visual Rules:*
- What hook techniques work best? (data-backed)
- What format wins? (UGC vs polished vs lifestyle)
- What visual style converts? (lighting, pacing, camera)
- Color palette patterns?

*Copy Rules:*
- Do / Don't format, 3-4 rules
- Top 2-3 performing copy lines (ranked, with ROAS)

*2 New Creative Concepts* — for each:
- Format + hook angle
- Visual direction (one sentence — what the viewer sees)
- Copy direction (headline + body idea)
- Why (data-backed rationale)

**Strategic Recommendations** — condense:
- **Scale:** which ads, how much
- **Kill:** which ads, why
- **Test Next:** 2-3 creative concepts (visual + copy direction, one sentence each)
- **Key Insight:** the single biggest creative learning

## STYLE RULES

- CONCISE. Bullets over paragraphs. Tables for comparisons.
- Use blockquotes (>) for verdicts, callouts, key takeaways
- Use emoji sparingly: 🟢🔴🟡📊🏆🎬✅❌💡
- Bold the numbers: **4.03x ROAS**, **96.4% thumbstop**
- No filler phrases. No generic advice.
- Scannable in 60 seconds, readable in 3 minutes

Output ONLY the markdown. No preamble. Start with #."""

    # Try AI-driven report generation
    report_md = None

    # Primary: Direct Anthropic SDK
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=6000,
                messages=[{"role": "user", "content": report_prompt}],
            )
            report_md = response.content[0].text.strip()
            print("  [report] AI-generated report complete (Claude Sonnet direct)")
        except Exception as e:
            print(f"  [report] Claude Sonnet direct failed: {e}")

    # Fallback: Direct Anthropic SDK with secondary key
    if not report_md:
        api_key_2 = os.environ.get("ANTHROPIC_API_KEY_2")
        if api_key_2:
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=api_key_2)
                response = client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=6000,
                    messages=[{"role": "user", "content": report_prompt}],
                )
                report_md = response.content[0].text.strip()
                print("  [report] AI-generated report complete (Claude Sonnet direct, key 2)")
            except Exception as e:
                print(f"  [report] Claude Sonnet direct (key 2) failed: {e}")

    # Secondary: Claude Sonnet via litellm proxy
    if not report_md:
        litellm_url = os.environ.get("LITELLM_BASE_URL", "http://localhost:4000/v1")
        litellm_key = os.environ.get("LITELLM_API_KEY", "")
        if litellm_key:
            try:
                resp = urllib.request.urlopen(urllib.request.Request(
                    f"{litellm_url}/chat/completions",
                    data=json.dumps({
                        "model": "claude-sonnet-4-6",
                        "messages": [{"role": "user", "content": report_prompt}],
                        "max_tokens": 6000,
                    }).encode(),
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {litellm_key}",
                    },
                ), timeout=360)
                result = json.loads(resp.read().decode())
                report_md = result["choices"][0]["message"]["content"].strip()
                print("  [report] AI-generated report complete (Claude Sonnet via proxy)")
            except Exception as e:
                print(f"  [report] Claude Sonnet proxy failed: {e}")

    # Fallback: Gemini Pro (Vertex AI)
    if not report_md:
        try:
            client = _get_gemini_client()
            response = client.models.generate_content(
                model="gemini-3-pro-preview",
                contents=[report_prompt],
            )
            report_md = response.text.strip()
            print("  [report] AI-generated report complete (Gemini Pro)")
        except Exception as e:
            print(f"  [report] Gemini Pro failed: {e}")

    # Final fallback: programmatic builder
    if not report_md:
        print("  [report] AI generation failed, using programmatic builder")
        report_md = _build_creative_report_programmatic(
            all_analyses, copy_analysis, overall_learnings, master_analysis,
            date_preset, date_str, account_id
        )

    return report_md


def _build_creative_report_programmatic(all_analyses, copy_analysis, overall_learnings,
                                         master_analysis, date_preset, date_str, account_id):
    """Programmatic fallback for building the report markdown."""
    _brand = os.environ.get("BRAND_NAME", "Meta Ads")
    total_spend = sum(a["metrics"]["spend"] for a in all_analyses)
    total_revenue = sum(a["metrics"].get("revenue", 0) for a in all_analyses)
    avg_roas = total_revenue / total_spend if total_spend > 0 else 0
    top = max(all_analyses, key=lambda a: a["metrics"]["roas"])
    top_name = top["metrics"].get("ad_name", "Unknown")
    top_roas = top["metrics"]["roas"]

    lines = []
    lines.append(f"# {_brand} Creative Library — {date_str}")
    lines.append("")
    lines.append(f"**Period:** {date_preset} | **Ads Analyzed:** {len(all_analyses)}")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Executive Summary")
    lines.append("")
    lines.append("| Metric | Value |")
    lines.append("|--------|-------|")
    lines.append(f"| Total Spend | ${total_spend:,.2f} |")
    lines.append(f"| Total Revenue | ${total_revenue:,.2f} |")
    lines.append(f"| Avg ROAS | **{avg_roas:.2f}x** |")
    lines.append(f"| Top Performer | **{top_name}** ({top_roas:.2f}x ROAS) |")
    lines.append("")
    lines.append("---")
    lines.append("")

    for i, a in enumerate(all_analyses, 1):
        m = a["metrics"]
        v = a.get("vision", {}) or {}
        cd = a.get("creative_data", {}) or {}
        mt = a.get("media_type", "unknown")
        ad_copy = cd.get("copy", {}) or {}

        lines.append(f"## Ad #{i}: {m['ad_name']}")
        lines.append("")
        lines.append(f"> **{mt.upper()}** | **{m['roas']:.2f}x ROAS** | Spend: ${m['spend']:,.2f}")
        lines.append("")
        lines.append("| Metric | Value |")
        lines.append("|--------|-------|")
        lines.append(f"| Spend | ${m['spend']:,.2f} |")
        lines.append(f"| Revenue | ${m.get('revenue', 0):,.2f} |")
        lines.append(f"| ROAS | **{m['roas']:.2f}x** |")
        lines.append(f"| CPA | ${m['cpa']:,.2f} |")
        lines.append(f"| CTR | {m.get('link_ctr', 0):.2f}% |")
        if m.get("is_video"):
            lines.append(f"| Thumbstop | {m.get('thumbstop_ratio', 0):.1%} |")
            lines.append(f"| Hook Rate | {m.get('hook_rate', 0):.1%} |")
            lines.append(f"| Completion | {m.get('completion_rate', 0):.1%} |")
        lines.append("")

        body = ad_copy.get("body", "")
        headline = ad_copy.get("headline", "")
        if body or headline:
            if headline:
                lines.append(f"**Headline:** {headline}")
            if body:
                lines.append(f"**Body:** {body}")
            lines.append("")

        if v and not v.get("raw_analysis"):
            drivers = v.get("performance_drivers", "")
            if drivers:
                lines.append(f"**Why it works:** {drivers}")
                lines.append("")

        lines.append("---")
        lines.append("")

    if copy_analysis:
        lines.append("## Copy Performance Rankings")
        lines.append("")
        for tb in copy_analysis.get("top_bodies", [])[:5]:
            lines.append(f"- **{tb.get('roas', 0)}x** — \"{str(tb.get('copy', ''))[:100]}\" — _{tb.get('ad_name', '')}_")
        lines.append("")

    ma_full = master_analysis.get("full", "") if isinstance(master_analysis, dict) else (master_analysis or "")
    if ma_full:
        lines.append("---")
        lines.append("")
        if not ma_full.strip().startswith("#"):
            lines.append("## Master Strategic Analysis")
            lines.append("")
        lines.append(ma_full)
        lines.append("")

    return "\n".join(lines)


def _load_google_creds():
    """Load Google OAuth credentials from profile's google-workspace-oauth.json."""
    import google.auth.transport.requests
    import google.oauth2.credentials

    profile_root = pathlib.Path(__file__).resolve().parent.parent.parent.parent
    creds_path = profile_root / "credentials" / "google-workspace-oauth.json"

    if not creds_path.exists():
        print(f"  [google] OAuth credentials not found at: {creds_path}")
        return None

    creds_data = json.loads(creds_path.read_text())
    scopes = [
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/presentations",
    ]
    creds = google.oauth2.credentials.Credentials.from_authorized_user_info(creds_data, scopes=scopes)

    if creds.expired and creds.refresh_token:
        creds.refresh(google.auth.transport.requests.Request())
        updated = {
            "type": "authorized_user",
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "refresh_token": creds.refresh_token,
            "scopes": [s.rsplit("/", 1)[-1] for s in scopes],
            "account": creds_data.get("account", ""),
            "created_at": creds_data.get("created_at", ""),
        }
        creds_path.write_text(json.dumps(updated, indent=2))
        creds_path.chmod(0o600)

    return creds


def _md_to_html(md_text):
    """Convert basic markdown to HTML for Google Docs import."""
    import html as html_mod

    lines = md_text.split("\n")
    html_parts = ["<html><body>"]
    in_list = False

    for line in lines:
        stripped = line.strip()

        # Close list if we're leaving list context
        if in_list and not stripped.startswith("- ") and not stripped.startswith("* "):
            html_parts.append("</ul>")
            in_list = False

        if stripped.startswith("#### "):
            html_parts.append(f"<h4>{html_mod.escape(stripped[5:])}</h4>")
        elif stripped.startswith("### "):
            html_parts.append(f"<h3>{html_mod.escape(stripped[4:])}</h3>")
        elif stripped.startswith("## "):
            html_parts.append(f"<h2>{html_mod.escape(stripped[3:])}</h2>")
        elif stripped.startswith("# "):
            html_parts.append(f"<h1>{html_mod.escape(stripped[2:])}</h1>")
        elif stripped == "---" or stripped == "***":
            html_parts.append("<hr>")
        elif stripped.startswith("- ") or stripped.startswith("* "):
            if not in_list:
                html_parts.append("<ul>")
                in_list = True
            content = stripped[2:]
            content = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', content)
            html_parts.append(f"<li>{content}</li>")
        elif stripped:
            content = html_mod.escape(stripped)
            content = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', content)
            html_parts.append(f"<p>{content}</p>")

    if in_list:
        html_parts.append("</ul>")
    html_parts.append("</body></html>")
    return "\n".join(html_parts)


def _create_google_doc(markdown_content, title):
    """Create a Google Doc from markdown content using Google Workspace OAuth.

    Creates the doc, shares it publicly, and extracts heading IDs for section links.
    Returns {"doc_id": "...", "doc_url": "...", "section_links": {heading: url}} or None on failure.
    """
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaInMemoryUpload

    try:
        creds = _load_google_creds()
        if not creds:
            return None

        drive_svc = build("drive", "v3", credentials=creds)
        docs_svc = build("docs", "v1", credentials=creds)

        # Convert markdown to HTML and upload as Google Doc
        html_content = _md_to_html(markdown_content)
        media = MediaInMemoryUpload(
            html_content.encode("utf-8"),
            mimetype="text/html",
            resumable=False,
        )
        file_metadata = {
            "name": title,
            "mimeType": "application/vnd.google-apps.document",
        }
        created = drive_svc.files().create(
            body=file_metadata,
            media_body=media,
            fields="id,webViewLink",
        ).execute()

        doc_id = created.get("id", "")
        doc_url = created.get("webViewLink", "")
        if not doc_url:
            doc_url = f"https://docs.google.com/document/d/{doc_id}/edit"

        print(f"  [google-doc] Created: {doc_url}")

        # Share publicly (anyone with link can view)
        try:
            drive_svc.permissions().create(
                fileId=doc_id,
                body={"type": "anyone", "role": "reader"},
            ).execute()
            print(f"  [google-doc] Shared publicly (anyone with link)")
        except Exception as e:
            print(f"  [google-doc] Share failed (doc still accessible to owner): {e}")

        # Extract heading IDs for section links
        section_links = {}
        try:
            doc_body = docs_svc.documents().get(documentId=doc_id).execute()
            for element in doc_body.get("body", {}).get("content", []):
                para = element.get("paragraph", {})
                ps = para.get("paragraphStyle", {})
                named_style = ps.get("namedStyleType", "")
                if named_style.startswith("HEADING"):
                    heading_text = ""
                    for pe in para.get("elements", []):
                        heading_text += pe.get("textRun", {}).get("content", "")
                    heading_text = heading_text.strip()
                    heading_id = ps.get("headingId", "")
                    if heading_text and heading_id:
                        section_links[heading_text] = f"{doc_url}#heading={heading_id}"

            if section_links:
                print(f"  [google-doc] Extracted {len(section_links)} section links")
        except Exception as e:
            print(f"  [google-doc] Could not extract section links: {e}")

        return {"doc_id": doc_id, "doc_url": doc_url, "section_links": section_links}

    except Exception as e:
        print(f"  [google-doc] Failed: {e}")
        return None


def _write_reference_ad(analysis, workspace_dir):
    """Write a single ad reference file to workspace/brand/reference-ads/.

    analysis: dict with ad_id, metrics, creative_data, vision, fatigue, media_type, asset_url
    workspace_dir: Path to reference-ads directory

    Returns the written file path.
    """
    workspace_dir.mkdir(parents=True, exist_ok=True)

    m = analysis["metrics"]
    cd = analysis.get("creative_data", {}) or {}
    v = analysis.get("vision", {}) or {}
    f = analysis.get("fatigue", {})
    ad_copy = cd.get("copy", {})
    ad_info = cd.get("ad", {})

    # Build filename keyed by ad_id for deduplication (same ad → same file)
    ad_name = m.get("ad_name", "unknown")
    ad_id = str(analysis.get("ad_id", ""))
    slug = re.sub(r'[^a-z0-9]+', '-', ad_name.lower()).strip('-')[:60]
    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    filename = f"{ad_id}-{slug}.md" if ad_id else f"{date_str}-{slug}.md"
    filepath = workspace_dir / filename

    # Check for old date-based files for this same ad and remove them
    if ad_id:
        for old_file in workspace_dir.glob(f"*-{slug}.md"):
            if old_file.name != filename and old_file.exists():
                old_file.unlink()

    lines = [
        f"# {ad_name}",
        f"_Ad ID: {ad_id} | Campaign: {m.get('campaign_name', 'N/A')} | Ad Set: {m.get('adset_name', 'N/A')}_",
        f"_Last analyzed: {date_str} | Source: Meta Ads_",
        "",
        "## Performance",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| Spend | ${m['spend']:,.2f} |",
        f"| Revenue | ${m['revenue']:,.2f} |",
        f"| ROAS | {m['roas']:.2f}x |",
        f"| Purchases | {m['purchases']} |",
        f"| CPA | ${m['cpa']:,.2f} |",
        f"| Link CTR | {m['link_ctr']:.2f}% |",
    ]
    if m.get("is_video"):
        lines.extend([
            f"| Hook Rate | {m['hook_rate']:.1%} |",
            f"| Hold Rate | {m['hold_rate']:.1%} |",
            f"| Thumbstop | {m['thumbstop_ratio']:.1%} |",
            f"| Completion | {m['completion_rate']:.1%} |",
        ])

    # Ad Copy section
    lines.extend(["", "## Ad Copy", ""])
    if ad_copy.get("body"):
        lines.append(f"**Body:** {ad_copy['body']}")
    if ad_copy.get("headline"):
        lines.append(f"**Headline:** {ad_copy['headline']}")
    if ad_copy.get("description"):
        lines.append(f"**Description:** {ad_copy['description']}")
    if ad_copy.get("cta"):
        lines.append(f"**CTA:** {ad_copy['cta']}")
    if ad_copy.get("link"):
        lines.append(f"**Landing Page:** {ad_copy['link']}")

    # Copy Analysis (from deep vision analysis)
    copy_a = v.get("copy_analysis", {})
    if copy_a:
        lines.extend(["", "## Copy Analysis", ""])
        if copy_a.get("body_structure"):
            lines.append(f"- **Body structure:** {copy_a['body_structure']}")
        if copy_a.get("headline_technique"):
            lines.append(f"- **Headline technique:** {copy_a['headline_technique']}")
        if copy_a.get("emotional_triggers"):
            triggers = copy_a["emotional_triggers"]
            if isinstance(triggers, list):
                lines.append(f"- **Emotional triggers:** {', '.join(triggers)}")
        if copy_a.get("cta_copy_strength"):
            lines.append(f"- **CTA strength:** {copy_a['cta_copy_strength']}")

    synergy = v.get("copy_visual_synergy")
    if synergy:
        lines.append(f"- **Copy-visual synergy:** {synergy}")

    # Copy Suggestions
    suggestions = v.get("copy_suggestions", [])
    if suggestions:
        lines.extend(["", "## Copy Suggestions", ""])
        for i, s in enumerate(suggestions, 1):
            lines.append(f"{i}. {s}")

    # Visual Analysis
    if v:
        lines.extend(["", "## Visual Analysis", ""])
        for key in ["hook_technique", "product_presentation", "visual_style",
                     "format_classification", "performance_drivers"]:
            val = v.get(key)
            if val:
                label = key.replace("_", " ").title()
                lines.append(f"- **{label}:** {val}")
        elements = v.get("key_elements", [])
        if elements:
            lines.append(f"- **Key elements:** {', '.join(str(e) for e in elements)}")
        iters = v.get("iteration_suggestions", [])
        if iters:
            lines.extend(["", "### Iteration Suggestions", ""])
            for s in iters:
                lines.append(f"- {s}")
        flip = v.get("format_flip_idea")
        if flip:
            lines.append(f"\n**Format flip:** {flip}")

    # Fatigue
    if f and f.get("level") != "unknown":
        lines.extend(["", "## Fatigue", ""])
        lines.append(f"**Level:** {f.get('level', 'N/A').upper()}")
        if f.get("flags"):
            for flag in f["flags"]:
                lines.append(f"- {flag}")

    # Links
    lines.extend(["", "## Links", ""])
    asset_url = analysis.get("asset_url")
    if asset_url:
        lines.append(f"- [Raw Asset]({asset_url})")
    preview = cd.get("preview_link")
    if preview:
        lines.append(f"- [Preview]({preview})")
    ads_mgr = cd.get("ads_manager_link")
    if ads_mgr:
        lines.append(f"- [Ads Manager]({ads_mgr})")

    lines.append("")

    filepath.write_text("\n".join(lines), encoding="utf-8")
    return filepath


def _update_reference_index(workspace_dir, written_files, copy_analysis):
    """Update reference-ads/index.md with a table of all analyzed ads."""
    index_path = workspace_dir / "index.md"

    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    lines = [
        "# Creative Library — Reference Ads Index",
        f"_Last updated: {date_str}_",
        "",
        "| File | Ad Name | ROAS | Spend | Type |",
        "|------|---------|------|-------|------|",
    ]

    # Read existing entries to preserve them (dedup by ad_id)
    existing_rows = {}  # ad_id → row string
    if index_path.exists():
        text = index_path.read_text(encoding="utf-8")
        for line in text.splitlines():
            if line.startswith("|") and not line.startswith("| File") and not line.startswith("|---"):
                # Extract ad_id from filename (format: {ad_id}-{slug}.md)
                parts = [p.strip() for p in line.strip("|").split("|")]
                if parts:
                    fname = parts[0].strip()
                    # Extract from markdown link [filename](./filename)
                    fname_match = re.search(r'\[([^\]]+)\]', fname)
                    if fname_match:
                        fname = fname_match.group(1)
                    # Extract ad_id (digits before first dash)
                    id_match = re.match(r'^(\d+)-', fname)
                    row_id = id_match.group(1) if id_match else fname
                    existing_rows[row_id] = line

    # Build new rows — overwrite existing entries for same ad_id
    new_ad_ids = set()
    for fp, analysis in written_files.items():
        m = analysis["metrics"]
        mt = analysis.get("media_type", "unknown")
        ad_id = str(analysis.get("ad_id", ""))
        new_ad_ids.add(ad_id)
        existing_rows[ad_id] = (
            f"| [{fp.name}](./{fp.name}) "
            f"| {m['ad_name'][:40]} "
            f"| {m['roas']:.2f}x "
            f"| ${m['spend']:,.0f} "
            f"| {mt} |"
        )

    # Write all rows (deduped)
    for row in existing_rows.values():
        lines.append(row)

    # Copy performance summary
    if copy_analysis:
        lines.extend(["", "## Top Copy by ROAS", ""])
        top_bodies = copy_analysis.get("top_bodies", [])
        if top_bodies:
            lines.append("### Top Body Copy")
            for tb in top_bodies[:5]:
                lines.append(f"- **{tb.get('ad_name', '?')}** (ROAS: {tb.get('roas', 0)}x): {str(tb.get('copy', ''))[:100]}")

        top_headlines = copy_analysis.get("top_headlines", [])
        if top_headlines:
            lines.append("")
            lines.append("### Top Headlines")
            for th in top_headlines[:5]:
                lines.append(f"- **{th.get('ad_name', '?')}** (ROAS: {th.get('roas', 0)}x): {th.get('copy', '')}")

        suggestions = copy_analysis.get("new_suggestions", [])
        if suggestions:
            lines.extend(["", "## AI Copy Suggestions", ""])
            for i, s in enumerate(suggestions, 1):
                lines.append(f"{i}. **Headline:** {s.get('headline', 'N/A')}")
                lines.append(f"   **Body:** {s.get('body', 'N/A')[:120]}")
                lines.append(f"   _Rationale: {s.get('rationale', 'N/A')}_")
                lines.append("")

    lines.append("")
    index_path.write_text("\n".join(lines), encoding="utf-8")
    return index_path


def _synthesize_brand_patterns(all_analyses, copy_analysis):
    """Synthesize visual + copy patterns across all analyzed ads into brand files.

    Appends findings to existing brand files (never overwrites).
    """
    brand_dir = _workspace_root() / "workspace" / "brand"
    brand_dir.mkdir(parents=True, exist_ok=True)

    date_str = datetime.datetime.now().strftime("%Y-%m-%d")

    # Collect pattern data
    colors = []
    formats = []
    hooks = []
    copy_structures = []
    headline_techniques = []
    emotional_triggers = []

    for a in all_analyses:
        v = a.get("vision", {}) or {}
        colors.extend(v.get("color_palette", []))
        fmt = v.get("format_classification", "")
        if fmt:
            formats.append(fmt)
        hook = v.get("hook_technique", "")
        if hook:
            hooks.append(hook)

        ca = v.get("copy_analysis", {})
        if ca:
            bs = ca.get("body_structure", "")
            if bs:
                copy_structures.append(bs)
            ht = ca.get("headline_technique", "")
            if ht:
                headline_techniques.append(ht)
            triggers = ca.get("emotional_triggers", [])
            if isinstance(triggers, list):
                emotional_triggers.extend(triggers)

    # Write copy-guidelines.md
    copy_file = brand_dir / "copy-guidelines.md"
    section = [
        f"\n\n---\n## Creative Library Analysis — {date_str}\n",
    ]

    if copy_analysis:
        patterns = copy_analysis.get("copy_patterns", {})
        if patterns:
            section.append("### Copy Patterns")
            if patterns.get("most_common_cta"):
                section.append(f"- **Most common CTA:** {patterns['most_common_cta']}")
            if patterns.get("avg_body_word_count"):
                section.append(f"- **Avg body word count:** {patterns['avg_body_word_count']}")
            if patterns.get("avg_headline_word_count"):
                section.append(f"- **Avg headline word count:** {patterns['avg_headline_word_count']}")

            et = patterns.get("emotional_triggers", {})
            if et:
                sorted_triggers = sorted(et.items(), key=lambda x: x[1], reverse=True)
                section.append(f"- **Top emotional triggers:** {', '.join(f'{k} ({v})' for k, v in sorted_triggers[:5])}")

            hts = patterns.get("headline_techniques", {})
            if hts:
                sorted_ht = sorted(hts.items(), key=lambda x: x[1], reverse=True)
                section.append(f"- **Top headline techniques:** {', '.join(f'{k} ({v})' for k, v in sorted_ht[:5])}")

        top_bodies = copy_analysis.get("top_bodies", [])
        if top_bodies:
            section.append("\n### Top-Performing Body Copy")
            for tb in top_bodies[:3]:
                section.append(f"- ROAS {tb.get('roas', 0)}x: \"{str(tb.get('copy', ''))[:150]}\"")

        suggestions = copy_analysis.get("new_suggestions", [])
        if suggestions:
            section.append("\n### AI-Generated Copy Suggestions")
            for s in suggestions:
                section.append(f"- **{s.get('headline', '?')}** — {s.get('body', '')[:100]}")
                section.append(f"  _{s.get('rationale', '')}_")

    section.append("")

    # Update copy-guidelines.md — replace existing auto-generated section instead of appending
    marker = "## Creative Library Analysis"
    section_text = "\n".join(section)
    if copy_file.exists():
        existing = copy_file.read_text(encoding="utf-8")
        # Find and replace existing auto-generated section (starts with marker, runs to end or next ---)
        marker_idx = existing.find(f"---\n{marker}")
        if marker_idx >= 0:
            # Remove everything from marker to end (auto-generated content is always at the bottom)
            existing = existing[:marker_idx].rstrip()
        else:
            existing = existing.rstrip()
    else:
        existing = "# Ad Copy Guidelines\n_Best-performing copy patterns from creative library analysis._\n"
    copy_file.write_text(existing + "\n" + section_text, encoding="utf-8")
    print(f"  Updated {copy_file}")

    # Update DESIGN-SYSTEM.md — replace existing auto-generated section instead of appending
    design_file = brand_dir / "DESIGN-SYSTEM.md"
    from collections import Counter
    design_section = [
        f"\n\n---\n## Creative Library Patterns — {date_str}\n",
    ]
    if formats:
        fmt_counts = Counter(formats)
        design_section.append(f"- **Top formats:** {', '.join(f'{k} ({v})' for k, v in fmt_counts.most_common(5))}")
    if hooks:
        hook_counts = Counter(hooks)
        design_section.append(f"- **Hook techniques:** {', '.join(f'{k} ({v})' for k, v in hook_counts.most_common(5))}")
    if colors:
        unique_colors = list(dict.fromkeys(c for c in colors if c.startswith("#")))[:10]
        if unique_colors:
            design_section.append(f"- **Color palette:** {', '.join(unique_colors)}")
    design_section.append("")

    design_marker = "## Creative Library Patterns"
    design_text = "\n".join(design_section)
    if design_file.exists():
        existing = design_file.read_text(encoding="utf-8")
        # Remove ALL existing auto-generated pattern sections
        marker_idx = existing.find(f"---\n{design_marker}")
        if marker_idx >= 0:
            existing = existing[:marker_idx].rstrip()
        else:
            existing = existing.rstrip()
    else:
        existing = "# Design System\n_Visual patterns extracted from top-performing ad creatives._\n"
    design_file.write_text(existing + "\n" + design_text, encoding="utf-8")
    print(f"  Updated {design_file}")


def _mcp_call(server_url, api_key, method, params):
    """Make a JSON-RPC call to the MCP server."""
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": api_key,
    }
    payload = json.dumps({
        "jsonrpc": "2.0",
        "id": random.randint(1, 999999),
        "method": method,
        "params": params,
    }).encode("utf-8")
    req = urllib.request.Request(server_url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            if result.get("error"):
                print(f"    MCP error: {result['error'].get('message', 'unknown')}")
                return None
            return result.get("result")
    except Exception as e:
        print(f"    MCP call failed: {e}")
        return None


def _find_existing_brand_doc(title, category, server_url, api_key):
    """Search MCP for existing brand doc by title + category. Returns doc id or None."""
    result = _mcp_call(server_url, api_key, "tools/call", {
        "name": "search_brand_documents",
        "arguments": {"query": title, "category": category, "limit": 5},
    })
    if not result:
        return None
    for r in result.get("content", []):
        try:
            data = json.loads(r.get("text", "{}"))
            for doc in data.get("documents", []):
                if doc.get("title", "").strip() == title.strip():
                    return doc.get("id")
        except Exception:
            pass
    return None


def _find_existing_creative_idea(copy_text, idea_type, server_url, api_key):
    """Search MCP for existing creative idea by content snippet. Returns idea id or None."""
    snippet = copy_text[:40] if copy_text else ""
    if not snippet:
        return None
    result = _mcp_call(server_url, api_key, "tools/call", {
        "name": "search_creative_ideas",
        "arguments": {"query": snippet, "type": idea_type, "limit": 5},
    })
    if not result:
        return None
    for r in result.get("content", []):
        try:
            data = json.loads(r.get("text", "{}"))
            for idea in data.get("ideas", []):
                if snippet in (idea.get("content", "") or ""):
                    return idea.get("id")
        except Exception:
            pass
    return None


def _push_to_platform_mcp(all_analyses, copy_analysis, server_url, api_key):
    """Push analysis results to CGK platform via MCP JSON-RPC with dedup.

    Stores:
    - Copy guidelines as brand document (category: brand_voice) — deduped by title
    - Top-performing copy as creative ideas (status: proven) — deduped by content
    - AI suggestions as creative ideas (status: ready) — deduped by content
    """
    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    created = 0
    updated = 0

    # Store copy guidelines as brand document (dedup by title)
    if copy_analysis:
        patterns = copy_analysis.get("copy_patterns", {})
        top_bodies = copy_analysis.get("top_bodies", [])
        content_parts = [f"# Copy Performance Analysis — {date_str}\n"]
        if patterns:
            content_parts.append(f"Most common CTA: {patterns.get('most_common_cta', 'N/A')}")
        if top_bodies:
            content_parts.append("\n## Top Body Copy by ROAS")
            for tb in top_bodies[:5]:
                content_parts.append(f"- ROAS {tb.get('roas', 0)}x: {str(tb.get('copy', ''))[:150]}")

        title = f"Copy Performance Analysis — {date_str}"
        existing_id = _find_existing_brand_doc(title, "brand_voice", server_url, api_key)

        if existing_id:
            _mcp_call(server_url, api_key, "tools/call", {
                "name": "update_brand_document",
                "arguments": {"id": existing_id, "content": "\n".join(content_parts)},
            })
            updated += 1
        else:
            _mcp_call(server_url, api_key, "tools/call", {
                "name": "create_brand_document",
                "arguments": {
                    "slug": f"copy-analysis-{date_str}",
                    "title": title,
                    "content": "\n".join(content_parts),
                    "category": "brand_voice",
                    "tags": ["creative-library", "copy-analysis", "auto-generated", date_str],
                },
            })
            created += 1

    # Store top-performing copy as proven creative ideas (dedup by content)
    if copy_analysis:
        for tb in copy_analysis.get("top_bodies", [])[:3]:
            copy_text = tb.get("copy", "")
            existing_id = _find_existing_creative_idea(copy_text, "hook", server_url, api_key)

            if existing_id:
                _mcp_call(server_url, api_key, "tools/call", {
                    "name": "update_creative_idea",
                    "arguments": {
                        "id": existing_id,
                        "performanceScore": min(int(tb.get("roas", 0) * 25), 100),
                        "description": f"ROAS {tb.get('roas', 0)}x — {tb.get('why', '')}",
                    },
                })
                updated += 1
            else:
                _mcp_call(server_url, api_key, "tools/call", {
                    "name": "create_creative_idea",
                    "arguments": {
                        "title": f"Proven Body: {str(copy_text)[:50]}",
                        "type": "hook",
                        "status": "proven",
                        "content": copy_text,
                        "description": f"ROAS {tb.get('roas', 0)}x — {tb.get('why', '')}",
                        "tags": ["creative-library", "proven-copy", date_str],
                        "performanceScore": min(int(tb.get("roas", 0) * 25), 100),
                    },
                })
                created += 1

        for s in copy_analysis.get("new_suggestions", [])[:3]:
            content = f"Headline: {s.get('headline', '')}\nBody: {s.get('body', '')}"
            existing_id = _find_existing_creative_idea(content, "ad_concept", server_url, api_key)

            if existing_id:
                updated += 1  # Skip — AI suggestion already stored
            else:
                _mcp_call(server_url, api_key, "tools/call", {
                    "name": "create_creative_idea",
                    "arguments": {
                        "title": f"AI Suggestion: {s.get('headline', 'New Copy')}",
                        "type": "ad_concept",
                        "status": "ready",
                        "content": content,
                        "description": s.get("rationale", ""),
                        "tags": ["creative-library", "ai-suggestion", date_str],
                    },
                })
                created += 1

    print(f"  MCP: {created} created, {updated} updated/skipped (dedup)")


def _push_anti_patterns_to_mcp(all_analyses, server_url, api_key):
    """Store worst-performing ad patterns as brand knowledge."""
    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    bottom = [a for a in all_analyses if a.get("roas", 999) < 0.5 and a.get("spend", 0) > 5.0]
    if not bottom:
        return

    title = f"Ad Anti-Patterns — {date_str}"
    existing_id = _find_existing_brand_doc(title, "guidelines", server_url, api_key)

    content = "# Ad Anti-Patterns\n\n" + "\n".join([
        f"- **Ad {a.get('ad_id', '?')}**: ROAS {a.get('roas', 0):.2f}, Spend ${a.get('spend', 0):.2f} — {(a.get('ad_name') or 'unnamed')[:60]}"
        for a in sorted(bottom, key=lambda x: x.get("roas", 0))[:10]
    ])

    if existing_id:
        _mcp_call(server_url, api_key, "tools/call", {
            "name": "update_brand_document",
            "arguments": {"id": existing_id, "content": content},
        })
        print(f"  MCP: Updated anti-patterns ({len(bottom)} ads)")
    else:
        slug = f"anti-patterns-{date_str}"
        _mcp_call(server_url, api_key, "tools/call", {
            "name": "create_brand_document",
            "arguments": {
                "slug": slug, "title": title, "content": content,
                "category": "guidelines",
                "tags": ["anti-pattern", "creative-library", "auto-generated", date_str],
            },
        })
        print(f"  MCP: Created anti-patterns ({len(bottom)} ads)")


def cmd_cgk_creative_library(date_preset="last_30d", top_n=15,
                              model_name="gemini-3-flash-preview", slack_target=None,
                              threaded=False, skip_synthesis=False,
                              push_to_platform=False, no_doc=False):
    """Build creative library: bulk download, deep analysis, copy intelligence, persistent storage.

    Pulls top N ads, downloads media persistently, runs deep vision+copy analysis,
    ranks copy performance, writes reference files, synthesizes brand patterns.
    """
    token, account_id, api_version = get_config()
    _brand = os.environ.get("BRAND_NAME", "Meta Ads")

    print(f"=== {_brand} Creative Library ({date_preset}, top {top_n}, model: {model_name}) ===\n")

    # Ensure directories exist
    CREATIVE_LIBRARY_DIR.mkdir(parents=True, exist_ok=True)
    CREATIVE_LIBRARY_MEDIA_DIR.mkdir(parents=True, exist_ok=True)

    # Step 1: Fetch metrics
    print("Fetching ad metrics...")
    metrics = _fetch_creative_metrics(date_preset, token, api_version, account_id)

    if not metrics:
        msg = f"No Shopify ads with spend found for {date_preset}."
        print(f"  {msg}")
        if slack_target:
            _post_to_slack(slack_target, f":books: *{_brand} Creative Library* — {msg}")
        return

    # Step 2: Sort by spend, take top N
    sorted_ads = sorted(metrics.items(), key=lambda x: x[1]["spend"], reverse=True)
    top_ads = sorted_ads[:top_n]

    print(f"  Found {len(metrics)} ads, analyzing top {len(top_ads)}...\n")

    # Step 3: Analyze each ad
    all_analyses = []
    for ad_id, m in top_ads:
        print(f"  [{len(all_analyses)+1}/{len(top_ads)}] {m['ad_name'][:55]}...")

        # Read creative details
        try:
            creative_data = _read_creative_full(ad_id, token, api_version)
        except (SystemExit, Exception) as e:
            print(f"    Skipping — could not read creative: {e}")
            all_analyses.append({
                "ad_id": ad_id, "metrics": m, "creative_data": None,
                "vision": None, "fatigue": {"level": "unknown", "flags": []},
            })
            continue

        media_refs = creative_data.get("media", {})
        creative_type = creative_data.get("creative_type", "unknown")
        image_hashes = media_refs.get("images", [])
        video_ids = media_refs.get("videos", [])
        ad_copy = creative_data.get("copy", {})

        # Resolve and download media (persistent storage)
        downloaded_path = None
        media_type = None
        asset_url = None

        if video_ids:
            vid_id = video_ids[0]
            print(f"    Resolving video {vid_id}...")
            result = _get_video_source_with_fallbacks(
                vid_id, ad_id, token, api_version, account_id,
                thumbnail_url=creative_data.get("video_thumbnail", ""),
                image_url=creative_data.get("image_url", ""),
                effective_story_id=creative_data.get("effective_story_id", ""),
                preview_link=creative_data.get("preview_link", ""),
                dest_dir=CREATIVE_LIBRARY_MEDIA_DIR,
            )
            asset_url = result["url"]
            method = result["method"]

            # yt-dlp may have already downloaded the file locally
            if result.get("local_path"):
                downloaded_path = result["local_path"]
                media_type = "video"
            elif result["is_video"] and asset_url:
                # Got a video URL — download it
                dest = CREATIVE_LIBRARY_MEDIA_DIR / f"{ad_id}-{vid_id}.mp4"
                if dest.exists() and dest.stat().st_size > 1000:
                    downloaded_path = str(dest)
                    print(f"    Using cached video ({dest.stat().st_size // 1024}KB) [method: {method}]")
                else:
                    downloaded_path = _download_media(asset_url, dest)
                    if downloaded_path:
                        sz = dest.stat().st_size
                        print(f"    Downloaded video ({sz // 1024}KB) [method: {method}]")
                    else:
                        print(f"    Video download failed [method: {method}]")
                media_type = "video"
            elif not result["is_video"] and asset_url and method != "thumbnail":
                # Poster frame at usable resolution — download as image
                ext = "png" if ".png" in asset_url.lower() else "jpg"
                dest = CREATIVE_LIBRARY_MEDIA_DIR / f"{ad_id}-{vid_id}-poster.{ext}"
                if dest.exists() and dest.stat().st_size > 1000:
                    downloaded_path = str(dest)
                    print(f"    Using cached poster ({dest.stat().st_size // 1024}KB) [method: {method}]")
                else:
                    downloaded_path = _download_media(asset_url, dest)
                    if downloaded_path:
                        sz = dest.stat().st_size
                        print(f"    Downloaded poster ({sz // 1024}KB) [method: {method}]")
                    else:
                        print(f"    Poster download failed [method: {method}]")
                media_type = "image"
            else:
                # Thumbnail is 64x64, too small for Gemini vision analysis
                preview = creative_data.get("preview_link", "")
                if preview:
                    asset_url = preview
                print(f"    No usable media — PAC video requires Facebook login in Chrome for yt-dlp")
                print(f"    (Copy analysis will still run)")
        elif image_hashes:
            h = image_hashes[0]
            print(f"    Resolving image {h[:12]}...")
            try:
                img_urls = _get_image_urls(image_hashes[:1], token, api_version, account_id)
                img_data = img_urls.get(h, {})
                img_url = img_data.get("url", "")
                if img_url:
                    ext = "png" if ".png" in img_url.lower() else "jpg"
                    dest = CREATIVE_LIBRARY_MEDIA_DIR / f"{ad_id}-{h[:12]}.{ext}"
                    if dest.exists():
                        downloaded_path = str(dest)
                        print(f"    Using cached image ({dest.stat().st_size // 1024}KB)")
                    else:
                        downloaded_path = _download_media(img_url, dest)
                        if downloaded_path:
                            print(f"    Downloaded image ({dest.stat().st_size // 1024}KB)")
                    media_type = "image"
                    asset_url = img_url
            except (SystemExit, Exception):
                print(f"    Could not fetch image URLs")

        # Run deep analysis (vision + copy + synergy) — with caching
        vision_result = None
        vision_cache_path = CREATIVE_LIBRARY_MEDIA_DIR / f"{ad_id}.vision.json"
        if vision_cache_path.exists():
            try:
                cached_vision = json.loads(vision_cache_path.read_text(encoding="utf-8"))
                if cached_vision and isinstance(cached_vision, dict):
                    vision_result = cached_vision
                    print(f"    [cache] Using cached vision analysis")
            except (json.JSONDecodeError, OSError):
                pass  # corrupted cache, re-analyze
        if not vision_result and downloaded_path and media_type:
            print(f"    Running deep analysis ({model_name})...")
            vision_result = _analyze_creative_deep(
                downloaded_path, media_type, m, ad_copy, model_name
            )
            if vision_result:
                print(f"    Deep analysis complete")
                # Cache the vision result for future runs
                try:
                    vision_cache_path.write_text(
                        json.dumps(vision_result, indent=2, default=str),
                        encoding="utf-8"
                    )
                except OSError:
                    pass

        all_analyses.append({
            "ad_id": ad_id,
            "metrics": m,
            "creative_data": creative_data,
            "vision": vision_result,
            "fatigue": {"level": "none", "flags": []},
            "media_type": media_type or ("video" if video_ids else "image"),
            "asset_url": asset_url,
        })

    # Step 4: Copy performance analysis
    print("\nAnalyzing copy performance across all ads...")
    copy_analysis = _analyze_copy_performance(all_analyses)
    if copy_analysis:
        print("  Copy performance analysis complete")
    else:
        print("  Copy performance analysis skipped (no data or API unavailable)")

    # Step 5: Write reference files
    print("\nWriting reference files...")
    written_files = {}
    for a in all_analyses:
        if a.get("creative_data"):
            fp = _write_reference_ad(a, CREATIVE_LIBRARY_DIR)
            written_files[fp] = a
            print(f"  Wrote {fp.name}")

    _update_reference_index(CREATIVE_LIBRARY_DIR, written_files, copy_analysis)
    print(f"  Updated index.md ({len(written_files)} ads)")

    # Step 6: Synthesize brand patterns
    if not skip_synthesis and all_analyses:
        print("\nSynthesizing brand patterns...")
        _synthesize_brand_patterns(all_analyses, copy_analysis)
        print("  Brand pattern synthesis complete")

    # Step 7: Push to platform MCP (auto-detect when env vars present)
    mcp_url = os.environ.get("CGK_MCP_SERVER_URL")
    mcp_key = os.environ.get("CGK_MCP_API_KEY")
    if push_to_platform or (mcp_url and mcp_key):
        if mcp_url and mcp_key:
            print("\nPushing to platform MCP...")
            _push_to_platform_mcp(all_analyses, copy_analysis, mcp_url, mcp_key)
            _push_anti_patterns_to_mcp(all_analyses, mcp_url, mcp_key)
        else:
            print("\n  CGK_MCP_SERVER_URL / CGK_MCP_API_KEY not set — skipping platform push")

    # Step 7.5: Overall learnings (Gemini Flash) — generate early for report
    overall_learnings = _generate_overall_learnings(all_analyses, copy_analysis)

    # Step 7.6: Master Analysis (Claude Opus / Gemini Pro fallback)
    master_analysis = None
    doc_url = None
    section_links = {}
    if not no_doc or slack_target:
        print("\nRunning master strategic analysis...")
        master_analysis = _run_master_analysis(all_analyses, copy_analysis)

    # Step 7.7: Build markdown report & create Google Doc
    if not no_doc:
        print("\nBuilding report markdown...")
        report_md = _build_creative_report_markdown(
            all_analyses, copy_analysis, overall_learnings, master_analysis, date_preset
        )

        now = datetime.datetime.now()
        date_str = now.strftime("%b %-d, %Y")
        print("Creating Google Doc...")
        doc_result = _create_google_doc(report_md, f"{_brand} Creative Library — {date_str}")
        doc_url = doc_result.get("doc_url") if doc_result else None
        section_links = doc_result.get("section_links", {}) if doc_result else {}

    # Step 8: Terminal output summary
    now = datetime.datetime.now()
    date_str = now.strftime("%b %-d, %Y")

    print(f"\n{'='*70}")
    print(f"  {_brand} Creative Library — {len(all_analyses)} Ads | {date_str}")
    print(f"{'='*70}\n")

    for i, a in enumerate(all_analyses, 1):
        m = a["metrics"]
        v = a.get("vision", {}) or {}
        cd = a.get("creative_data", {}) or {}
        mt = a.get("media_type", "unknown")

        print(f"  #{i}  {m['ad_name']}")
        print(f"      {mt.upper()} | Spend: ${m['spend']:,.2f} | ROAS: {m['roas']:.2f}x | CPA: ${m['cpa']:,.2f}")

        if v and not v.get("raw_analysis"):
            # Vision analysis details
            hook = v.get("hook_technique", "")
            prod = v.get("product_presentation", "")
            style = v.get("visual_style", "")
            fmt = v.get("format_classification", "")
            palette = v.get("color_palette", [])

            if hook or prod or fmt:
                print(f"      Hook: {hook} | Presentation: {prod} | Format: {fmt}")
            if style:
                print(f"      Visual Style: {str(style)[:120]}")
            if palette:
                print(f"      Palette: {' '.join(str(c) for c in palette[:5])}")

            # Copy analysis details
            ca = v.get("copy_analysis", {})
            if isinstance(ca, dict) and ca:
                body_struct = ca.get("body_structure", "")
                hl_tech = ca.get("headline_technique", "")
                triggers = ca.get("emotional_triggers", [])
                cta_str = ca.get("cta_copy_strength", "")
                if body_struct:
                    print(f"      Copy Structure: {str(body_struct)[:120]}")
                if hl_tech:
                    print(f"      Headline Technique: {hl_tech}")
                if triggers:
                    print(f"      Emotional Triggers: {', '.join(str(t) for t in triggers[:5])}")
                if cta_str:
                    print(f"      CTA Strength: {str(cta_str)[:80]}")

            # Copy-visual synergy
            synergy = v.get("copy_visual_synergy", "")
            if synergy:
                print(f"      Synergy: {str(synergy)[:120]}")

            # Key elements + performance drivers
            elements = v.get("key_elements", [])
            if elements:
                print(f"      Key Elements: {', '.join(str(e) for e in elements[:5])}")

            drivers = v.get("performance_drivers", "")
            if drivers:
                print(f"      Why It Works: {str(drivers)[:200]}")

            # Iteration suggestions
            iters = v.get("iteration_suggestions", [])
            if iters:
                for idx, sug in enumerate(iters[:2], 1):
                    print(f"      Iteration {idx}: {str(sug)[:120]}")
        elif v and v.get("raw_analysis"):
            print(f"      Vision: (raw text — JSON parse failed)")
        else:
            print(f"      Vision: No analysis (media not downloaded)")
        print()

    # Copy rankings
    if copy_analysis:
        print(f"  {'='*60}")
        print(f"  TOP COPY BY ROAS")
        print(f"  {'='*60}\n")

        for tb in copy_analysis.get("top_bodies", [])[:5]:
            print(f"    ROAS {tb.get('roas', 0)}x: \"{str(tb.get('copy', ''))[:80]}...\"")
            print(f"      — {tb.get('ad_name', '')} | {tb.get('why', '')}")
            print()

        suggestions = copy_analysis.get("new_suggestions", [])
        if suggestions:
            print(f"  AI COPY SUGGESTIONS:")
            for i, s in enumerate(suggestions, 1):
                print(f"    {i}. Headline: {s.get('headline', 'N/A')}")
                print(f"       Body: {s.get('body', 'N/A')[:100]}")
                print(f"       Rationale: {s.get('rationale', 'N/A')}")
                print()

    print(f"  Files: {CREATIVE_LIBRARY_DIR}")
    print(f"  Media: {CREATIVE_LIBRARY_MEDIA_DIR}")
    print(f"  Total: {len(written_files)} reference files written\n")

    # Step 9: Slack output — AI-generated thread
    if slack_target:
        rtype = "creative_library"
        header_ts = None

        if threaded:
            header_ts = _post_or_reuse_header(slack_target, rtype)
            if header_ts:
                print(f"  THREAD_TS={header_ts}")

        thread_kw = {"thread_ts": header_ts} if (threaded and header_ts) else {}

        # Build data for AI to compose Slack thread
        slack_ads = []
        for i, a in enumerate(all_analyses, 1):
            m = a["metrics"]
            v = a.get("vision", {}) or {}
            cd = a.get("creative_data", {}) or {}
            mt = a.get("media_type", "unknown")
            ad_copy = cd.get("copy", {}) or {}
            preview = cd.get("preview_link", "")
            asset = a.get("asset_url", "")
            ad_name = m.get("ad_name", "")
            ad_mgr = (
                f"https://adsmanager.facebook.com/adsmanager/manage/ads?"
                f"act={account_id.replace('act_', '')}"
                f"&selected_ad_ids={a['ad_id']}"
            )

            # Find section link for this ad
            sec_url = doc_url or ""
            if section_links:
                for heading, surl in section_links.items():
                    if ad_name and ad_name in heading:
                        sec_url = surl
                        break
                    if heading.startswith(f"Ad #{i}:"):
                        sec_url = surl
                        break

            ad_entry = {
                "number": i,
                "ad_name": ad_name,
                "media_type": mt,
                "spend": m["spend"],
                "revenue": m.get("revenue", 0),
                "roas": round(m["roas"], 2),
                "cpa": round(m["cpa"], 2),
                "purchases": m.get("purchases", 0),
                "link_ctr": round(m.get("link_ctr", 0), 2),
                "headline": ad_copy.get("headline", ""),
                "body": ad_copy.get("body", "")[:200],
                "deep_dive_url": sec_url,
                "ads_manager_url": ad_mgr,
                "has_vision": bool(v and not v.get("raw_analysis")),
            }
            if m.get("is_video"):
                ad_entry["thumbstop"] = round(m.get("thumbstop_ratio", 0), 4)
                ad_entry["hook_rate"] = round(m.get("hook_rate", 0), 4)
                ad_entry["completion"] = round(m.get("completion_rate", 0), 4)
            if v and not v.get("raw_analysis"):
                ad_entry["why_it_works"] = str(v.get("performance_drivers", ""))[:300]
                ad_entry["hook_technique"] = v.get("hook_technique", "")
                ad_entry["format"] = v.get("format_classification", "")
                ad_entry["visual_style"] = str(v.get("visual_style", ""))[:150]
            slack_ads.append(ad_entry)

        # Build section links for copy/master analysis/format sections
        copy_sec_url = doc_url or ""
        ma_sec_url = doc_url or ""
        video_sec_url = ""
        static_sec_url = ""
        if section_links:
            for heading, surl in section_links.items():
                if "Copy" in heading or "Playbook" in heading or "Creative Playbook" in heading:
                    copy_sec_url = surl
                if "Master" in heading or "Strategic" in heading or "Recommendation" in heading:
                    ma_sec_url = surl
                if "Video Learnings" in heading or "Video Learning" in heading:
                    video_sec_url = surl
                if "Static" in heading and "Learning" in heading:
                    static_sec_url = surl

        ma_slack = ""
        ma_provider = ""
        if master_analysis and isinstance(master_analysis, dict):
            ma_slack = master_analysis.get("slack", "")
            ma_provider = master_analysis.get("provider", "AI")

        slack_data = json.dumps({
            "ads": slack_ads,
            "copy_rankings": {
                "top_bodies": (copy_analysis or {}).get("top_bodies", [])[:5],
                "top_headlines": (copy_analysis or {}).get("top_headlines", [])[:3],
                "suggestions": (copy_analysis or {}).get("new_suggestions", [])[:3],
                "patterns": (copy_analysis or {}).get("copy_patterns", {}),
            },
            "master_analysis_summary": ma_slack,
            "master_analysis_provider": ma_provider,
            "doc_url": doc_url or "",
            "copy_section_url": copy_sec_url,
            "master_section_url": ma_sec_url,
            "video_section_url": video_sec_url,
            "static_section_url": static_sec_url,
            "date_str": date_str,
            "date_preset": date_preset,
            "num_ads": len(all_analyses),
            "has_doc": bool(doc_url),
        }, indent=2, default=str)

        slack_thread_prompt = f"""Write a Slack thread (3-4 messages) briefing a growth marketing team on ad creative performance. Return a JSON array of strings.

DATA (includes Gemini vision analysis of extracted video/image assets):
{slack_data}

FORMAT RULES — this is Slack, NOT markdown:
- Bold: *single asterisks* only (NEVER **double**)
- Italic: _underscores_
- Links: <https://url|Display Text>
- Emoji: :emoji_name:
- No headers, no tables, no code blocks

MESSAGE 1 — THE BRIEF (under 800 chars)
Open with: :books: *Creative Library* — N Ads | Date
Link to doc if available: :page_facing_up: <doc_url|Full Report>
Then the verdict:
:chart_with_upwards_trend: *Scale:* [ad name] — [one reason, reference creative format/hook]
:no_entry_sign: *Kill:* [ad name] — [one reason]
:arrows_counterclockwise: *Iterate:* [ad name] — [specific creative change]
Quick scorecard (one line per ad): name | spend | ROAS | format
No paragraphs.

MESSAGE 2 — AD CARDS (under 1500 chars)
For each ad, 3-4 lines:
*Ad Name* — *Xx ROAS* | $X spend | Format
:clapper: Creative: [one sentence on visual style, hook technique, what the viewer sees — use the vision analysis]
:bulb: [one sentence: what's working or broken — be specific about creative elements]
<deep_dive_url|Full analysis> · <ads_manager_url|Ads Manager>
Separate ads with blank line. Be blunt.

MESSAGE 3 — FORMAT LEARNINGS + STRATEGY (under 1500 chars)
If there are BOTH video and static ads, break it down:
:movie_camera: *Video:* 2-3 bullets — what's working in video? (hooks, pacing, UGC vs produced, thumbstop/completion insights). What to do MORE of.
:frame_with_picture: *Static:* 2-3 bullets — what's working in static? (composition, text overlays, colors). What to do MORE of.
If only one format exists, just cover that one with 3-4 bullets.
If video_section_url or static_section_url exist, link them: <video_section_url|Video deep dive> · <static_section_url|Static deep dive>
:rocket: *Test next:* 1-2 new creative concepts (format + hook + visual direction)
Link to doc: <master_section_url|Full Strategy>

MESSAGE 4 (optional, only if master analysis has good content) — AI STRATEGIC ANALYSIS (under 800 chars)
The master analysis slack summary — key insight + budget actions

TONE: Monday morning standup energy. Direct, specific, no filler. Reference creative/visual elements, not just copy.

Output ONLY the JSON array: ["msg1", "msg2", "msg3"] or ["msg1", "msg2", "msg3", "msg4"]"""

        # Generate Slack thread via AI
        slack_messages = None

        # Primary: Direct Anthropic SDK
        try:
            api_key = os.environ.get("ANTHROPIC_API_KEY")
            if api_key:
                import anthropic
                client = anthropic.Anthropic(api_key=api_key)
                response = client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=4096,
                    messages=[{"role": "user", "content": slack_thread_prompt}],
                )
                raw = response.content[0].text.strip()
                if raw.startswith("```"):
                    raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
                slack_messages = json.loads(raw)
                if isinstance(slack_messages, list) and all(isinstance(m, str) for m in slack_messages):
                    slack_messages = [
                        re.sub(r'\*\*([^*]+)\*\*', r'*\1*', m) for m in slack_messages
                    ]
                    print(f"  [slack] AI-generated {len(slack_messages)} thread messages (Claude Sonnet direct)")
                else:
                    slack_messages = None
        except Exception as e:
            print(f"  [slack] Claude Sonnet direct failed: {e}")

        # Fallback: Direct Anthropic SDK with secondary key
        if not slack_messages:
            try:
                api_key_2 = os.environ.get("ANTHROPIC_API_KEY_2")
                if api_key_2:
                    import anthropic
                    client = anthropic.Anthropic(api_key=api_key_2)
                    response = client.messages.create(
                        model="claude-sonnet-4-6",
                        max_tokens=4096,
                        messages=[{"role": "user", "content": slack_thread_prompt}],
                    )
                    raw = response.content[0].text.strip()
                    if raw.startswith("```"):
                        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
                    slack_messages = json.loads(raw)
                    if isinstance(slack_messages, list) and all(isinstance(m, str) for m in slack_messages):
                        slack_messages = [
                            re.sub(r'\*\*([^*]+)\*\*', r'*\1*', m) for m in slack_messages
                        ]
                        print(f"  [slack] AI-generated {len(slack_messages)} thread messages (Claude Sonnet direct, key 2)")
                    else:
                        slack_messages = None
            except Exception as e:
                print(f"  [slack] Claude Sonnet direct (key 2) failed: {e}")

        # Secondary: Claude Sonnet via litellm proxy
        if not slack_messages:
            try:
                litellm_url = os.environ.get("LITELLM_BASE_URL", "http://localhost:4000/v1")
                litellm_key = os.environ.get("LITELLM_API_KEY", "")
                if litellm_key:
                    resp = urllib.request.urlopen(urllib.request.Request(
                        f"{litellm_url}/chat/completions",
                        data=json.dumps({
                            "model": "claude-sonnet-4-6",
                            "messages": [{"role": "user", "content": slack_thread_prompt}],
                            "max_tokens": 4096,
                        }).encode(),
                        headers={
                            "Content-Type": "application/json",
                            "Authorization": f"Bearer {litellm_key}",
                        },
                    ), timeout=120)
                    result = json.loads(resp.read().decode())
                    raw = result["choices"][0]["message"]["content"].strip()
                    if raw.startswith("```"):
                        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
                    slack_messages = json.loads(raw)
                    if isinstance(slack_messages, list) and all(isinstance(m, str) for m in slack_messages):
                        slack_messages = [
                            re.sub(r'\*\*([^*]+)\*\*', r'*\1*', m) for m in slack_messages
                        ]
                        print(f"  [slack] AI-generated {len(slack_messages)} thread messages (Claude Sonnet via proxy)")
                    else:
                        slack_messages = None
            except Exception as e:
                print(f"  [slack] AI proxy generation failed: {e}")

        # Fallback: Gemini Flash (Vertex AI)
        if not slack_messages:
            try:
                gclient = _get_gemini_client()
                gresp = gclient.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=[slack_thread_prompt],
                )
                raw = gresp.text.strip()
                if raw.startswith("```"):
                    raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
                slack_messages = json.loads(raw)
                if isinstance(slack_messages, list) and all(isinstance(m, str) for m in slack_messages):
                    slack_messages = [
                        re.sub(r'\*\*([^*]+)\*\*', r'*\1*', m) for m in slack_messages
                    ]
                    print(f"  [slack] AI-generated {len(slack_messages)} thread messages (Gemini Flash)")
                else:
                    slack_messages = None
            except Exception as e:
                print(f"  [slack] Gemini fallback failed: {e}")

        # Final fallback: simple programmatic messages
        if not slack_messages:
            print("  [slack] AI generation failed, using programmatic fallback")
            msg1 = f":books: *{_brand} Creative Library* — {len(all_analyses)} Ads | {date_str}\n"
            if doc_url:
                msg1 += f":page_facing_up: <{doc_url}|Full Analysis — Google Doc>\n"
            msg1 += f"_Period: {date_preset}_\n\n"
            for i, a in enumerate(all_analyses, 1):
                m = a["metrics"]
                mt = a.get("media_type", "unknown")
                msg1 += f"{i}. *{m['ad_name'][:45]}* — {mt.upper()} | ${m['spend']:,.0f} | {m['roas']:.2f}x ROAS\n"
            slack_messages = [msg1.strip()]

            if master_analysis and isinstance(master_analysis, dict):
                ma_msg = master_analysis.get("slack", "")
                if ma_msg:
                    ma_msg = re.sub(r'\*\*([^*]+)\*\*', r'*\1*', ma_msg)
                    provider = master_analysis.get("provider", "AI")
                    slack_messages.append(
                        f":brain: *Strategic Analysis* _({provider})_\n"
                        + (f"<{doc_url}|Full analysis in doc →>\n\n" if doc_url else "\n")
                        + ma_msg
                    )

        # Verify critical links are present in at least one message
        all_text = "\n".join(slack_messages)
        if doc_url and doc_url not in all_text:
            # AI dropped the doc link — append it to the first message
            slack_messages[0] += f"\n:page_facing_up: <{doc_url}|Full Analysis — Google Doc>"

        # Post all messages
        for msg in slack_messages:
            if msg and msg.strip():
                _post_to_slack(slack_target, msg.strip(), **thread_kw)

    # Output structured JSON delimiter for agent consumption
    output = {
        "command": "creative-library",
        "date_preset": date_preset,
        "ads_analyzed": len(all_analyses),
        "files_written": len(written_files),
        "library_dir": str(CREATIVE_LIBRARY_DIR),
        "copy_analysis": copy_analysis,
        "doc_url": doc_url,
    }
    print("--- CREATIVE_LIBRARY_JSON ---")
    print(json.dumps(output))


def _clone_creative_with_edits(creative_full, edits, account_id, api_version, token):
    """Deep-copy the creative spec, apply edits, create a new creative via API.

    Returns {"creative_id": "...", "changed_fields": [...]}.
    """
    creative_type = creative_full["creative_type"]
    oss = copy.deepcopy(creative_full["creative"].get("object_story_spec", {}))
    afs = copy.deepcopy(creative_full["creative"].get("asset_feed_spec", {}))
    changed = []

    if creative_type == "pac":
        # PAC edits — update all entries in each array
        if "body" in edits:
            for b in afs.get("bodies", []):
                b["text"] = edits["body"]
            changed.append("body")
        if "headline" in edits:
            for t in afs.get("titles", []):
                t["text"] = edits["headline"]
            changed.append("headline")
        if "link" in edits:
            for lu in afs.get("link_urls", []):
                lu["website_url"] = edits["link"]
            changed.append("link")
        if "description" in edits:
            for d in afs.get("descriptions", []):
                d["text"] = edits["description"]
            # If no descriptions array, create one
            if not afs.get("descriptions"):
                afs["descriptions"] = [{"text": edits["description"]}]
            changed.append("description")
        if "cta" in edits:
            afs["call_to_action_types"] = [edits["cta"]]
            changed.append("cta")
        if "url_tags" in edits:
            tags = edits["url_tags"]
            # Set url_tags on relevant asset arrays
            for arr_key in ("images", "videos", "bodies", "titles", "descriptions", "link_urls"):
                for item in afs.get(arr_key, []):
                    item["url_tags"] = tags
            changed.append("url_tags")
    else:
        # Single-media edits (link_data or video_data)
        link_data = oss.get("link_data", {})
        video_data = oss.get("video_data", {})
        is_video = creative_type == "single_video"
        media_data = video_data if is_video else link_data

        if "body" in edits:
            media_data["message"] = edits["body"]
            changed.append("body")
        if "headline" in edits:
            if is_video:
                media_data["title"] = edits["headline"]
            else:
                media_data["name"] = edits["headline"]
            changed.append("headline")
        if "link" in edits:
            if is_video:
                cta_obj = media_data.setdefault("call_to_action", {})
                cta_obj.setdefault("value", {})["link"] = edits["link"]
            else:
                media_data["link"] = edits["link"]
                cta_obj = media_data.get("call_to_action", {})
                if cta_obj.get("value"):
                    cta_obj["value"]["link"] = edits["link"]
            changed.append("link")
        if "description" in edits:
            if is_video:
                media_data["link_description"] = edits["description"]
            else:
                media_data["description"] = edits["description"]
            changed.append("description")
        if "cta" in edits:
            cta_obj = media_data.setdefault("call_to_action", {})
            cta_obj["type"] = edits["cta"]
            changed.append("cta")
        if "url_tags" in edits:
            # Append url_tags as query params on the link
            tags = edits["url_tags"]
            if is_video:
                cta_obj = media_data.get("call_to_action", {})
                link_val = cta_obj.get("value", {}).get("link", "")
            else:
                link_val = media_data.get("link", "")
            if link_val:
                sep = "&" if "?" in link_val else "?"
                new_link = f"{link_val}{sep}{tags}"
                if is_video:
                    media_data.setdefault("call_to_action", {}).setdefault("value", {})["link"] = new_link
                else:
                    media_data["link"] = new_link
                    cta_obj = media_data.get("call_to_action", {})
                    if cta_obj.get("value"):
                        cta_obj["value"]["link"] = new_link
            changed.append("url_tags")

        if is_video:
            oss["video_data"] = media_data
        else:
            oss["link_data"] = media_data

    # Build creative params — strip prior " (edited)" and Meta's hash suffixes
    creative_name = creative_full["creative"].get("name", "Edited Creative")
    # Strip Meta hash suffixes and " (edited)" tags in any order
    creative_name = re.sub(r'(\s+\d{4}-\d{2}-\d{2}-[0-9a-f]{12,}|\s*\(edited\))+$', '', creative_name)
    # Also strip any remaining hash/edited fragments in the middle
    creative_name = re.sub(r'\s+\d{4}-\d{2}-\d{2}-[0-9a-f]{12,}', '', creative_name)
    creative_name = creative_name.replace(' (edited)', '').strip()
    creative_name = f"{creative_name} (edited)"

    creative_params = {"name": creative_name}
    if creative_type == "pac":
        creative_params["asset_feed_spec"] = json.dumps(afs)
        # PAC creatives need object_story_spec with ONLY page_id/ig_user_id —
        # sending the full oss (with link_data/video_data) causes Meta API to
        # reject it as redundant parameters conflicting with asset_feed_spec.
        pac_oss = {}
        if "page_id" in oss:
            pac_oss["page_id"] = oss["page_id"]
        if "instagram_actor_id" in oss:
            pac_oss["instagram_actor_id"] = oss["instagram_actor_id"]
        creative_params["object_story_spec"] = json.dumps(pac_oss)
    else:
        creative_params["object_story_spec"] = json.dumps(oss)

    resp, _ = api_post(f"{api_version}/{account_id}/adcreatives", creative_params, token)
    new_id = resp.get("id")
    if not new_id:
        print(f"ERROR: Failed to create new creative.")
        print(json.dumps(resp, indent=2))
        sys.exit(1)

    return {"creative_id": new_id, "changed_fields": changed}


def _show_edit_diff(creative_full, edits):
    """Print before/after comparison of fields that will change. Returns True if there are changes."""
    ad_copy = creative_full["copy"]
    has_changes = False

    field_labels = {
        "body": "Body",
        "headline": "Headline",
        "link": "Link",
        "description": "Description",
        "cta": "CTA",
        "url_tags": "URL Tags",
    }

    for field, label in field_labels.items():
        if field in edits:
            has_changes = True
            old_val = ad_copy.get(field, "(none)")
            if field == "url_tags":
                old_val = creative_full.get("url_tags") or "(none)"
            new_val = edits[field]
            # Truncate long values for display
            old_disp = (old_val[:80] + "...") if len(str(old_val)) > 80 else old_val
            new_disp = (new_val[:80] + "...") if len(str(new_val)) > 80 else new_val
            print(f"  {label}:")
            print(f"    Before: {old_disp}")
            print(f"    After:  {new_disp}")

    return has_changes


# ---------------------------------------------------------------------------
# Ad read / edit / duplicate commands
# ---------------------------------------------------------------------------

def cmd_get_ad(ad_id):
    """Display full ad details: name, status, creative type, copy, media, url_tags, preview."""
    token, _, api_version = get_config()

    print(f"=== Ad Details: {ad_id} ===\n")

    cf = _read_creative_full(ad_id, token, api_version)

    ad = cf["ad"]
    print(f"  Name:          {ad['name']}")
    print(f"  Status:        {ad['status']}")
    print(f"  Ad Set ID:     {ad['adset_id']}")
    print(f"  Campaign ID:   {ad['campaign_id']}")
    print(f"  Creative ID:   {cf['creative']['id']}")
    print(f"  Creative Type: {cf['creative_type']}")

    print(f"\n  --- Copy ---")
    c = cf["copy"]
    print(f"  Body:        {c.get('body', '(none)')}")
    print(f"  Headline:    {c.get('headline', '(none)')}")
    print(f"  Description: {c.get('description', '(none)')}")
    print(f"  Link:        {c.get('link', '(none)')}")
    print(f"  CTA:         {c.get('cta', '(none)')}")

    print(f"\n  --- Media ---")
    m = cf["media"]
    if m["images"]:
        print(f"  Images:      {', '.join(m['images'])}")
    if m["videos"]:
        print(f"  Videos:      {', '.join(m['videos'])}")
    if not m["images"] and not m["videos"]:
        print(f"  (no media refs found)")

    print(f"\n  URL Tags:    {cf['url_tags'] or '(none)'}")
    print(f"  Ads Manager: {cf['ads_manager_link']}")

    print(f"\n  JSON: {json.dumps(cf['copy'])}")
    return cf


def cmd_edit_ad(ad_id, body=None, headline=None, link=None, cta=None,
                description=None, url_tags=None, status=None, auto_yes=False):
    """Edit an existing ad by creating a new creative with changes and swapping it, or update status."""
    token, account_id, api_version = get_config()

    print(f"=== Edit Ad: {ad_id} ===\n")

    # 1. Read current ad
    print("  Reading current ad...")
    cf = _read_creative_full(ad_id, token, api_version)
    print(f"  Ad: {cf['ad']['name']}")
    print(f"  Creative type: {cf['creative_type']}")
    print(f"  Current creative: {cf['creative']['id']}")

    # 2. Build edits dict
    edits = {}
    if body is not None:
        edits["body"] = body
    if headline is not None:
        edits["headline"] = headline
    if link is not None:
        edits["link"] = link
    if cta is not None:
        edits["cta"] = cta
    if description is not None:
        edits["description"] = description
    if url_tags is not None:
        edits["url_tags"] = url_tags

    if not edits and status is None:
        print("\n  ERROR: No edits provided. Use --body, --headline, --link, --cta, --description, --url-tags, or --status.")
        sys.exit(1)

    # 3. Show diff
    if edits:
        print(f"\n  --- Copy Changes ---")
        _show_edit_diff(cf, edits)
    
    if status:
        print(f"\n  --- Status Change ---")
        print(f"    Before: {cf['ad']['status']}")
        print(f"    After:  {status}")

    # 4. Confirm
    if not auto_yes:
        resp = input("\n  Apply these changes? [y/N] ").strip().lower()
        if resp != "y":
            print("  Aborted.")
            return

    new_creative_id = None
    # 5. Create new creative if there are copy edits
    if edits:
        print(f"\n  Creating new creative with edits...")
        result = _clone_creative_with_edits(cf, edits, account_id, api_version, token)
        new_creative_id = result["creative_id"]
        print(f"  New creative ID: {new_creative_id}")
        print(f"  Changed fields: {', '.join(result['changed_fields'])}")

    # 6. Apply updates to the ad
    params = {}
    if new_creative_id:
        params["creative"] = json.dumps({"creative_id": new_creative_id})
    if status:
        params["status"] = status

    if params:
        print(f"\n  Updating ad {ad_id}...")
        update_resp, _ = api_post(f"{api_version}/{ad_id}", params, token)
        if not update_resp.get("success"):
            print(f"  WARNING: Update response: {json.dumps(update_resp)}")

    # 7. Build Ads Manager link
    ads_manager_link = _ads_manager_url(ad_id)

    # 8. Log + report
    _log_write("edit-ad", {
        "ad_id": ad_id,
        "old_creative_id": cf["creative"]["id"],
        "new_creative_id": new_creative_id,
        "changed_fields": list(edits.keys()),
        "status": status,
    })

    print(f"\n{'='*50}")
    print(f"  AD UPDATED SUCCESSFULLY")
    print(f"{'='*50}")
    print(f"  Ad ID:             {ad_id}")
    if new_creative_id:
        print(f"  Old Creative ID:   {cf['creative']['id']}")
        print(f"  New Creative ID:   {new_creative_id}")
        print(f"  Changed:           {', '.join(edits.keys())}")
    if status:
        print(f"  Status:            {status}")
    print(f"  Ads Manager:       {ads_manager_link}")

    return {"ad_id": ad_id, "new_creative_id": new_creative_id, "ads_manager_link": ads_manager_link}


def cmd_duplicate_ad(ad_id, to_adset, name=None, body=None, headline=None,
                     link=None, cta=None, description=None, url_tags=None,
                     status="PAUSED", auto_yes=False):
    """Duplicate an ad to a different ad set, optionally with copy edits."""
    token, account_id, api_version = get_config()

    print(f"=== Duplicate Ad: {ad_id} ===\n")

    # 1. Read source ad
    print("  Reading source ad...")
    cf = _read_creative_full(ad_id, token, api_version)
    print(f"  Source: {cf['ad']['name']}")
    print(f"  Creative type: {cf['creative_type']}")
    print(f"  Target ad set: {to_adset}")

    # 2. Build edits
    edits = {}
    if body is not None:
        edits["body"] = body
    if headline is not None:
        edits["headline"] = headline
    if link is not None:
        edits["link"] = link
    if cta is not None:
        edits["cta"] = cta
    if description is not None:
        edits["description"] = description
    if url_tags is not None:
        edits["url_tags"] = url_tags

    # 3. Determine creative to use
    if edits:
        print(f"\n  --- Copy Changes ---")
        _show_edit_diff(cf, edits)
    else:
        print(f"\n  No copy changes — reusing existing creative {cf['creative']['id']}")

    ad_name = name or f"{cf['ad']['name']} (copy)"

    # 4. Confirm
    if not auto_yes:
        print(f"\n  New ad name: {ad_name}")
        print(f"  Status: {status}")
        resp = input("  Create duplicate? [y/N] ").strip().lower()
        if resp != "y":
            print("  Aborted.")
            return

    # 5. Create new creative if edits, otherwise reuse
    if edits:
        print(f"\n  Creating new creative with edits...")
        result = _clone_creative_with_edits(cf, edits, account_id, api_version, token)
        creative_id = result["creative_id"]
        print(f"  New creative ID: {creative_id}")
    else:
        creative_id = cf["creative"]["id"]

    # 6. Create new ad
    print(f"\n  Creating new ad in ad set {to_adset}...")
    ad_resp, _ = api_post(f"{api_version}/{account_id}/ads", {
        "name": ad_name,
        "adset_id": to_adset,
        "creative": json.dumps({"creative_id": creative_id}),
        "status": status,
    }, token)

    new_ad_id = ad_resp.get("id")
    if not new_ad_id:
        print(f"  ERROR: Ad creation failed.")
        print(json.dumps(ad_resp, indent=2))
        sys.exit(1)

    # 7. Build Ads Manager link
    ads_manager_link = _ads_manager_url(new_ad_id, to_adset)

    # 8. Log + report
    _log_write("duplicate-ad", {
        "source_ad_id": ad_id,
        "new_ad_id": new_ad_id,
        "creative_id": creative_id,
        "to_adset": to_adset,
        "has_edits": bool(edits),
    })

    print(f"\n{'='*50}")
    print(f"  AD DUPLICATED SUCCESSFULLY")
    print(f"{'='*50}")
    print(f"  Source Ad ID:   {ad_id}")
    print(f"  New Ad ID:      {new_ad_id}")
    print(f"  Creative ID:    {creative_id}")
    print(f"  Ad Set ID:      {to_adset}")
    print(f"  Ad Name:        {ad_name}")
    print(f"  Status:         {status}")
    print(f"  Ads Manager:    {ads_manager_link}")

    return {"ad_id": new_ad_id, "creative_id": creative_id, "ads_manager_link": ads_manager_link}


def cmd_update_budget(target_id, new_budget=None, budget_type="daily", auto_yes=False):
    """Update the budget of a campaign (CBO) or ad set directly.

    Detects automatically whether target_id is a campaign or ad set:
    - Ad set: updates the ad set directly.
    - Campaign with campaign-level budget (CBO): updates campaign directly.
    - Campaign without campaign-level budget (ABO): lists active ad sets and exits.
    """
    token, account_id, api_version = get_config()

    # 1. Validate args
    if not new_budget:
        print("ERROR: --budget DOLLARS is required.")
        sys.exit(1)
    try:
        new_cents = int(float(new_budget) * 100)
    except (ValueError, TypeError):
        print(f"ERROR: Invalid budget amount '{new_budget}'. Must be a number (e.g. 100 or 99.50).")
        sys.exit(1)
    if new_cents <= 0:
        print("ERROR: Budget must be greater than 0.")
        sys.exit(1)
    if budget_type not in ("daily", "lifetime"):
        print(f"ERROR: budget_type must be 'daily' or 'lifetime', got '{budget_type}'.")
        sys.exit(1)

    budget_field = "daily_budget" if budget_type == "daily" else "lifetime_budget"

    print(f"=== Update Budget: {target_id} ===\n")

    # 2. Fetch target to determine type + read current budget
    print("  Fetching target details...")
    # First, try fetching fields common to both to avoid node-type errors
    obj, _ = api_get(f"{api_version}/{target_id}", {
        "fields": "name,status,daily_budget,lifetime_budget",
    }, token)

    # Now probe for specific fields to determine type
    is_adset = False
    is_campaign = False
    
    try:
        probe, _ = api_get(f"{api_version}/{target_id}", {"fields": "campaign_id"}, token)
        if "campaign_id" in probe:
            is_adset = True
            obj["campaign_id"] = probe["campaign_id"]
    except Exception:
        pass

    if not is_adset:
        try:
            probe, _ = api_get(f"{api_version}/{target_id}", {"fields": "objective"}, token)
            if "objective" in probe:
                is_campaign = True
                obj["objective"] = probe["objective"]
        except Exception:
            pass

    # If still not sure, check for budget fields (campaigns usually have them in CBO)
    if not is_adset and not is_campaign:
        if "daily_budget" in obj or "lifetime_budget" in obj:
             is_campaign = True

    if not is_adset and not is_campaign:
        print(f"  ERROR: Could not determine if {target_id} is a campaign or ad set.")
        print(f"  Response: {json.dumps(obj, indent=2)}")
        sys.exit(1)

    obj_name = obj.get("name", target_id)
    obj_status = obj.get("status", "?")
    old_daily = obj.get("daily_budget")
    old_lifetime = obj.get("lifetime_budget")

    def _old_budget_str():
        if budget_type == "daily":
            return f"${int(old_daily)/100:,.2f}/day" if old_daily else "none"
        return f"${int(old_lifetime)/100:,.2f} lifetime" if old_lifetime else "none"

    # 3. Branch on type
    if is_adset:
        parent_campaign_id = obj.get("campaign_id")

        print(f"  Type:     Ad Set")
        print(f"  Name:     {obj_name}")
        print(f"  Status:   {obj_status}")
        print(f"  Campaign: {parent_campaign_id}")
        print()
        print(f"  BEFORE: {budget_type} budget = {_old_budget_str()}")
        print(f"  AFTER:  {budget_type} budget = ${new_cents/100:,.2f}")
        print()

        if not auto_yes:
            resp = input(f"  Update Ad Set '{obj_name}' budget? [y/N] ").strip().lower()
            if resp != "y":
                print("  Aborted.")
                return

        print("  Applying update...")
        post_resp, _ = api_post(f"{api_version}/{target_id}", {budget_field: str(new_cents)}, token)
        if not post_resp.get("success"):
            print("  ERROR: Update failed.")
            print(json.dumps(post_resp, indent=2))
            sys.exit(1)

        old_val = int(old_daily) if (budget_type == "daily" and old_daily) else (int(old_lifetime) if old_lifetime else 0)
        _log_write("update-budget", {
            "target_id": target_id,
            "type": "adset",
            "name": obj_name,
            "budget_type": budget_type,
            "old_budget_cents": old_val,
            "new_budget_cents": new_cents,
        })

        ads_manager_link = _ads_manager_url(adset_id=target_id, campaign_id=parent_campaign_id, level="adset")

        print(f"\n{'='*50}")
        print(f"  BUDGET UPDATED SUCCESSFULLY")
        print(f"{'='*50}")
        print(f"  Ad Set ID:    {target_id}")
        print(f"  Name:         {obj_name}")
        print(f"  Status:       {obj_status}")
        print(f"  Budget type:  {budget_type}")
        print(f"  Old budget:   {_old_budget_str()}")
        print(f"  New budget:   ${new_cents/100:,.2f}/{budget_type}")
        print(f"  Ads Manager:  {ads_manager_link}")

    else:  # is_campaign
        has_campaign_budget = bool(old_daily or old_lifetime)

        print(f"  Type:     Campaign")
        print(f"  Name:     {obj_name}")
        print(f"  Status:   {obj_status}")

        if has_campaign_budget:
            # CBO path — update campaign directly
            print(f"  Budget mode: CBO (campaign-level budget)")
            print()
            print(f"  BEFORE: {budget_type} budget = {_old_budget_str()}")
            print(f"  AFTER:  {budget_type} budget = ${new_cents/100:,.2f}")
            print()

            if not auto_yes:
                resp = input(f"  Update Campaign '{obj_name}' budget? [y/N] ").strip().lower()
                if resp != "y":
                    print("  Aborted.")
                    return

            print("  Applying update...")
            post_resp, _ = api_post(f"{api_version}/{target_id}", {budget_field: str(new_cents)}, token)
            if not post_resp.get("success"):
                print("  ERROR: Update failed.")
                print(json.dumps(post_resp, indent=2))
                sys.exit(1)

            old_val = int(old_daily) if (budget_type == "daily" and old_daily) else (int(old_lifetime) if old_lifetime else 0)
            _log_write("update-budget", {
                "target_id": target_id,
                "type": "campaign_cbo",
                "name": obj_name,
                "budget_type": budget_type,
                "old_budget_cents": old_val,
                "new_budget_cents": new_cents,
            })

            ads_manager_link = _ads_manager_url(campaign_id=target_id, level="campaign")

            print(f"\n{'='*50}")
            print(f"  BUDGET UPDATED SUCCESSFULLY")
            print(f"{'='*50}")
            print(f"  Campaign ID:  {target_id}")
            print(f"  Name:         {obj_name}")
            print(f"  Status:       {obj_status}")
            print(f"  Budget type:  {budget_type}")
            print(f"  Old budget:   {_old_budget_str()}")
            print(f"  New budget:   ${new_cents/100:,.2f}/{budget_type}")
            print(f"  Ads Manager:  {ads_manager_link}")

        else:
            # ABO path — list active ad sets, exit with instructions
            print(f"\n  Campaign '{obj_name}' uses ABO (ad-set-level budgets).")
            print("  Fetching active ad sets...")
            as_data, _ = api_get(f"{api_version}/{target_id}/adsets", {
                "fields": "name,daily_budget,lifetime_budget,status",
                "limit": "200",
                "filtering": '[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]',
            }, token)

            adsets = as_data.get("data", [])
            if not adsets:
                print("  No active/paused ad sets found in this campaign.")
                return

            print()
            print(f"  Campaign '{obj_name}' has ABO (ad-set-level budgets). Active ad sets:")
            for ads in adsets:
                ads_id = ads.get("id", "?")
                ads_name = ads.get("name", "?")
                ads_status = ads.get("status", "?")
                ads_daily = ads.get("daily_budget")
                ads_lifetime = ads.get("lifetime_budget")
                if ads_daily:
                    bstr = f"${int(ads_daily)/100:,.2f}/day"
                elif ads_lifetime:
                    bstr = f"${int(ads_lifetime)/100:,.2f} lifetime"
                else:
                    bstr = "no budget"
                print(f"    [{ads_id}] {ads_name:<40} {bstr:<18} {ads_status}")

            print()
            print("  Re-run with the specific ad set ID to update one.")
            print(f"  Example: update-budget --id <ADSET_ID> --budget {new_budget}")


# ---------------------------------------------------------------------------
# Ad Set Management
# ---------------------------------------------------------------------------


def cmd_update_adset(adset_id, bid_strategy=None, bid_amount=None, roas_floor=None,
                     optimization_goal=None, status=None, auto_yes=False):
    """Update bid strategy, bid amount, optimization goal, or status on an existing ad set."""
    token, account_id, api_version = get_config()

    # 1. Fetch ad set current state
    fields = "id,name,status,campaign_id,bid_strategy,bid_amount,bid_constraints,optimization_goal,daily_budget,lifetime_budget"
    adset_data, _ = api_get(f"{api_version}/{adset_id}", {"fields": fields}, token)
    adset_name = adset_data.get("name", "Unknown")
    campaign_id = adset_data.get("campaign_id")

    # 2. Fetch parent campaign to detect CBO
    camp_data, _ = api_get(f"{api_version}/{campaign_id}", {
        "fields": "name,bid_strategy,daily_budget,lifetime_budget",
    }, token)
    is_cbo = bool(camp_data.get("daily_budget") or camp_data.get("lifetime_budget"))
    camp_bid_strategy = camp_data.get("bid_strategy")

    # 3. Print current state
    cur_bid_strategy = adset_data.get("bid_strategy") or (camp_bid_strategy if is_cbo else None)
    cur_bid_amount = adset_data.get("bid_amount")
    cur_bid_constraints = adset_data.get("bid_constraints")
    cur_opt_goal = adset_data.get("optimization_goal", "?")
    cur_status = adset_data.get("status", "?")
    cur_daily = adset_data.get("daily_budget")
    cur_lifetime = adset_data.get("lifetime_budget")

    print(f"=== Update Ad Set ===\n")
    print(f"  Ad Set:    {adset_name} [{adset_id}]")
    print(f"  Campaign:  {camp_data.get('name', '?')} [{campaign_id}]")
    print(f"  Status:    {cur_status}")
    print(f"  Bid:       {_format_bid_strategy(cur_bid_strategy, cur_bid_amount, cur_bid_constraints)}")
    print(f"  Opt Goal:  {cur_opt_goal}")
    if cur_daily:
        print(f"  Budget:    ${int(cur_daily)/100:,.2f}/day")
    elif cur_lifetime:
        print(f"  Budget:    ${int(cur_lifetime)/100:,.2f} lifetime")
    if is_cbo:
        print(f"  Note:      CBO campaign — bid strategy lives on campaign level")
    print()

    # 4. Build update dict from non-None params
    update = {}
    changes = []

    if status is not None:
        update["status"] = status
        changes.append(f"Status: {cur_status} → {status}")

    if optimization_goal is not None:
        update["optimization_goal"] = optimization_goal
        changes.append(f"Opt Goal: {cur_opt_goal} → {optimization_goal}")

    effective_bid_strategy = bid_strategy or cur_bid_strategy
    effective_opt_goal = optimization_goal or cur_opt_goal

    # 5. Auto-reconcile optimization_goal vs bid_strategy
    if bid_strategy:
        if is_cbo:
            print(f"  WARNING: CBO campaign — bid_strategy lives on campaign, not ad set.")
            print(f"           Skipping bid_strategy update. Use update-budget on campaign to change.")
        else:
            update["bid_strategy"] = bid_strategy
            changes.append(f"Bid Strategy: {_format_bid_strategy(cur_bid_strategy)} → {_format_bid_strategy(bid_strategy)}")

            # BID_CAP/COST_CAP + VALUE → auto-adjust to OFFSITE_CONVERSIONS
            if bid_strategy in ("LOWEST_COST_WITH_BID_CAP", "COST_CAP") and effective_opt_goal == "VALUE":
                print(f"  NOTE: {_format_bid_strategy(bid_strategy)} doesn't support VALUE optimization.")
                print(f"        Auto-adjusting to OFFSITE_CONVERSIONS.")
                update["optimization_goal"] = "OFFSITE_CONVERSIONS"
                effective_opt_goal = "OFFSITE_CONVERSIONS"
                changes.append(f"Opt Goal: {cur_opt_goal} → OFFSITE_CONVERSIONS (auto)")

            # MIN_ROAS + non-VALUE → auto-adjust to VALUE
            if bid_strategy == "LOWEST_COST_WITH_MIN_ROAS" and effective_opt_goal != "VALUE":
                print(f"  NOTE: Min ROAS requires VALUE optimization.")
                print(f"        Auto-adjusting to VALUE.")
                update["optimization_goal"] = "VALUE"
                effective_opt_goal = "VALUE"
                changes.append(f"Opt Goal: {cur_opt_goal} → VALUE (auto)")

    # 6. Validate companion fields
    if effective_bid_strategy == "LOWEST_COST_WITH_MIN_ROAS":
        if roas_floor is not None:
            bc = {"roas_average_floor": str(int(float(roas_floor) * 100))}
            update["bid_constraints"] = json.dumps(bc)
            old_roas = ""
            if cur_bid_constraints and cur_bid_constraints.get("roas_average_floor"):
                old_roas = f"{int(cur_bid_constraints['roas_average_floor'])/100:.0f}%"
            changes.append(f"ROAS Floor: {old_roas or '(none)'} → {int(float(roas_floor) * 100):.0f}%")
        elif bid_strategy == "LOWEST_COST_WITH_MIN_ROAS" and not cur_bid_constraints:
            print("  ERROR: --roas-floor is required when switching to MIN_ROAS and no existing roas_floor.")
            sys.exit(1)

    if effective_bid_strategy in ("COST_CAP", "LOWEST_COST_WITH_BID_CAP"):
        if bid_amount is not None:
            cents = int(float(bid_amount) * 100)
            update["bid_amount"] = str(cents)
            old_amt = f"${int(cur_bid_amount)/100:,.2f}" if cur_bid_amount else "(none)"
            changes.append(f"Bid Amount: {old_amt} → ${bid_amount:,.2f}")
        elif bid_strategy in ("COST_CAP", "LOWEST_COST_WITH_BID_CAP") and not cur_bid_amount:
            print(f"  ERROR: --bid-amount is required when switching to {bid_strategy} and no existing bid_amount.")
            sys.exit(1)

    if not update:
        print("  No changes specified. Use --bid-strategy, --bid-amount, --roas-floor, --optimization-goal, or --status.")
        return

    # 7. Print diff and confirm
    print("  Changes:")
    for c in changes:
        print(f"    • {c}")
    print()

    if not auto_yes:
        resp = input("  Apply changes? [y/N] ").strip().lower()
        if resp != "y":
            print("  Aborted.")
            return

    # 8. POST update
    result, _ = api_post(f"{api_version}/{adset_id}", update, token)
    if result.get("success"):
        print(f"\n  ✓ Ad set updated successfully.")
    else:
        print(f"\n  ERROR: Update failed.")
        print(json.dumps(result, indent=2))
        sys.exit(1)

    # 9. Log
    _log_write("update-adset", {
        "adset_id": adset_id,
        "adset_name": adset_name,
        "campaign_id": campaign_id,
        "changes": update,
    })

    # 10. Print result with link
    link = _ads_manager_url(adset_id=adset_id, campaign_id=campaign_id, level="adset")
    if link:
        print(f"  Ads Manager: {link}")


def cmd_duplicate_adset(source_adset_id, to_campaign_id, adset_name=None, budget=None,
                        budget_type="daily", bid_strategy=None, bid_amount=None,
                        roas_floor=None, status="PAUSED", include_ads=False, auto_yes=False):
    """Duplicate an ad set (targeting, budget, bid strategy) to another campaign."""
    token, account_id, api_version = get_config()
    config = _load_staging_config()
    pixel_id = os.environ.get("META_PIXEL_ID", config.get("pixel_id", ""))

    # 1. Fetch source ad set
    src_fields = "id,name,status,daily_budget,lifetime_budget,campaign_id,targeting,optimization_goal,bid_strategy,billing_event,promoted_object,bid_amount,bid_constraints"
    src_data, _ = api_get(f"{api_version}/{source_adset_id}", {"fields": src_fields}, token)
    src_name = src_data.get("name", "Unknown")
    src_campaign_id = src_data.get("campaign_id")

    # Also get cloned fields via helper
    cloned = _clone_adset_targeting(source_adset_id, token, api_version)

    # 2. Fetch target campaign
    camp_data, _ = api_get(f"{api_version}/{to_campaign_id}", {
        "fields": "name,status,objective,daily_budget,lifetime_budget,bid_strategy",
    }, token)
    camp_name = camp_data.get("name", "Unknown")
    is_cbo = bool(camp_data.get("daily_budget") or camp_data.get("lifetime_budget"))
    camp_bid_strategy = camp_data.get("bid_strategy")

    # 3. Build new ad set name
    resolved_name = adset_name or f"{src_name} (copy)"

    # 4. Bid strategy reconciliation
    # Priority: explicit --bid-strategy > target campaign CBO > cloned source > default
    if bid_strategy:
        effective_bid_strategy = bid_strategy
    elif is_cbo and camp_bid_strategy:
        effective_bid_strategy = camp_bid_strategy
        cloned_bs = cloned.get("bid_strategy")
        if cloned_bs and cloned_bs != camp_bid_strategy:
            print(f"    NOTE: Source uses {_format_bid_strategy(cloned_bs)}, target CBO requires {_format_bid_strategy(camp_bid_strategy)}.")
    elif cloned.get("bid_strategy"):
        effective_bid_strategy = cloned["bid_strategy"]
    else:
        effective_bid_strategy = "LOWEST_COST_WITHOUT_CAP"

    effective_bid_amount = bid_amount  # explicit takes priority
    effective_bid_constraints = cloned.get("bid_constraints")
    effective_opt_goal = cloned.get("optimization_goal", "OFFSITE_CONVERSIONS")

    # Auto-reconcile optimization_goal with bid strategy
    if effective_bid_strategy in ("LOWEST_COST_WITH_BID_CAP", "COST_CAP") and effective_opt_goal == "VALUE":
        print(f"    NOTE: {_format_bid_strategy(effective_bid_strategy)} doesn't support VALUE. Auto-adjusting to OFFSITE_CONVERSIONS.")
        effective_opt_goal = "OFFSITE_CONVERSIONS"

    if effective_bid_strategy == "LOWEST_COST_WITH_MIN_ROAS" and effective_opt_goal != "VALUE":
        print(f"    NOTE: Min ROAS requires VALUE. Auto-adjusting from {effective_opt_goal}.")
        effective_opt_goal = "VALUE"

    # Validate companion fields
    if effective_bid_strategy == "LOWEST_COST_WITH_MIN_ROAS":
        if roas_floor is not None:
            effective_bid_constraints = {"roas_average_floor": str(int(float(roas_floor) * 100))}
        elif not effective_bid_constraints:
            print("  ERROR: --roas-floor is required for LOWEST_COST_WITH_MIN_ROAS strategy.")
            sys.exit(1)

    if effective_bid_strategy in ("COST_CAP", "LOWEST_COST_WITH_BID_CAP"):
        if effective_bid_amount is None:
            effective_bid_amount = cloned.get("bid_amount")
        if effective_bid_amount is None:
            print(f"  ERROR: --bid-amount is required for {effective_bid_strategy} strategy.")
            sys.exit(1)

    # 5. Resolve budget
    if not is_cbo:
        if budget is not None:
            resolved_budget = float(budget)
        elif src_data.get("daily_budget"):
            resolved_budget = int(src_data["daily_budget"]) / 100
            budget_type = "daily"
        elif src_data.get("lifetime_budget"):
            resolved_budget = int(src_data["lifetime_budget"]) / 100
            budget_type = "lifetime"
        else:
            resolved_budget = 50.0
            budget_type = "daily"

    # 6. Build adset_params
    adset_params = {
        "name": resolved_name,
        "campaign_id": to_campaign_id,
        "status": status,
        "billing_event": cloned.get("billing_event", "IMPRESSIONS"),
        "optimization_goal": effective_opt_goal,
        "is_dynamic_creative": "false",
        "targeting": json.dumps(cloned["targeting"]) if isinstance(cloned.get("targeting"), dict) else cloned.get("targeting", "{}"),
        "attribution_spec": json.dumps([
            {"event_type": "CLICK_THROUGH", "window_days": 7},
            {"event_type": "VIEW_THROUGH", "window_days": 1},
        ]),
    }

    # Bid strategy on ad set only for ABO
    if not is_cbo:
        adset_params["bid_strategy"] = effective_bid_strategy

    # Min ROAS bid constraints
    if effective_bid_strategy == "LOWEST_COST_WITH_MIN_ROAS" and effective_bid_constraints:
        adset_params["bid_constraints"] = json.dumps(effective_bid_constraints) if isinstance(effective_bid_constraints, dict) else effective_bid_constraints

    # Budget (skip for CBO)
    if not is_cbo:
        budget_cents = str(int(resolved_budget * 100))
        budget_field = "daily_budget" if budget_type == "daily" else "lifetime_budget"
        adset_params[budget_field] = budget_cents

    # Promoted object
    if cloned.get("promoted_object"):
        po = cloned["promoted_object"]
        adset_params["promoted_object"] = json.dumps(po) if isinstance(po, dict) else po
    elif pixel_id:
        adset_params["promoted_object"] = json.dumps({"pixel_id": pixel_id, "custom_event_type": "PURCHASE"})

    # Bid amount for cost-cap / bid-cap
    if effective_bid_strategy in ("LOWEST_COST_WITH_BID_CAP", "COST_CAP"):
        if isinstance(effective_bid_amount, (int,)) and effective_bid_amount > 500:
            adset_params["bid_amount"] = str(effective_bid_amount)
        elif effective_bid_amount is not None:
            adset_params["bid_amount"] = str(int(float(effective_bid_amount) * 100))

    # 7. Print summary
    print(f"=== Duplicate Ad Set ===\n")
    print(f"  Source:      {src_name} [{source_adset_id}]")
    print(f"  Target:      {camp_name} [{to_campaign_id}]")
    print(f"  New Name:    {resolved_name}")
    print(f"  Bid:         {_format_bid_strategy(effective_bid_strategy, effective_bid_amount and int(float(effective_bid_amount) * 100) if not (isinstance(effective_bid_amount, (int,)) and effective_bid_amount > 500) else effective_bid_amount, effective_bid_constraints)}")
    print(f"  Opt Goal:    {effective_opt_goal}")
    if not is_cbo:
        print(f"  Budget:      ${resolved_budget:,.2f}/{budget_type}")
    else:
        print(f"  Budget:      CBO (campaign-level)")
    print(f"  Status:      {status}")
    print(f"  Include Ads: {'Yes' if include_ads else 'No'}")
    print()

    # 8. Confirm
    if not auto_yes:
        resp = input("  Proceed with duplication? [y/N] ").strip().lower()
        if resp != "y":
            print("  Aborted.")
            return

    # 9. Create ad set
    print(f"  Creating ad set: {resolved_name}...")
    adset_resp, _ = api_post(f"{api_version}/{account_id}/adsets", adset_params, token)
    new_adset_id = adset_resp.get("id")
    if not new_adset_id:
        print(f"  ERROR: Ad set creation failed.")
        print(json.dumps(adset_resp, indent=2))
        sys.exit(1)
    print(f"  Created: {new_adset_id}")

    # 10. Duplicate ads if requested
    duplicated_ads = []
    if include_ads:
        ads_data, _ = api_get(f"{api_version}/{source_adset_id}/ads", {
            "fields": "id,name,status,creative",
            "limit": "100",
        }, token)
        source_ads = ads_data.get("data", [])
        if source_ads:
            print(f"\n  Duplicating {len(source_ads)} ad(s)...")
            for src_ad in source_ads:
                creative_id = src_ad.get("creative", {}).get("id")
                if not creative_id:
                    print(f"    Skipping ad {src_ad.get('id')} — no creative ID")
                    continue
                ad_params = {
                    "name": src_ad.get("name", "Ad") + " (copy)",
                    "adset_id": new_adset_id,
                    "creative": json.dumps({"creative_id": creative_id}),
                    "status": "PAUSED",
                }
                ad_resp, _ = api_post(f"{api_version}/{account_id}/ads", ad_params, token)
                new_ad_id = ad_resp.get("id")
                if new_ad_id:
                    print(f"    Created ad: {new_ad_id} (from {src_ad.get('id')})")
                    duplicated_ads.append(new_ad_id)
                else:
                    print(f"    WARNING: Failed to duplicate ad {src_ad.get('id')}")
        else:
            print("  No ads found in source ad set.")

    # 11. Log
    _log_write("duplicate-adset", {
        "source_adset_id": source_adset_id,
        "new_adset_id": new_adset_id,
        "to_campaign_id": to_campaign_id,
        "name": resolved_name,
        "include_ads": include_ads,
        "duplicated_ads": duplicated_ads,
    })

    # 12. Print result with links
    print(f"\n  ✓ Ad set duplicated successfully.")
    link = _ads_manager_url(adset_id=new_adset_id, campaign_id=to_campaign_id, level="adset")
    if link:
        print(f"  Ads Manager: {link}")
    if duplicated_ads:
        print(f"  Duplicated {len(duplicated_ads)} ad(s) into new ad set.")


# ---------------------------------------------------------------------------
# Ad Launch Pipeline
# ---------------------------------------------------------------------------


def _clone_adset_targeting(adset_id, token, api_version):
    """Fetch targeting & optimization fields from an existing ad set for cloning."""
    fields = "targeting,optimization_goal,bid_strategy,billing_event,promoted_object,bid_amount,bid_constraints"
    data, _ = api_get(f"{api_version}/{adset_id}", {"fields": fields}, token)
    result = {}
    for key in ("targeting", "optimization_goal", "bid_strategy", "billing_event",
                "promoted_object", "bid_amount", "bid_constraints"):
        val = data.get(key)
        if val is not None:
            result[key] = val
    return result


def _format_bid_strategy(bid_strategy, bid_amount=None, bid_constraints=None):
    """Format bid strategy for display."""
    labels = {
        "LOWEST_COST_WITHOUT_CAP": "Lowest Cost",
        "COST_CAP": "Cost Cap",
        "LOWEST_COST_WITH_BID_CAP": "Bid Cap",
        "LOWEST_COST_WITH_MIN_ROAS": "Min ROAS",
    }
    label = labels.get(bid_strategy, bid_strategy or "?")
    if bid_strategy in ("COST_CAP", "LOWEST_COST_WITH_BID_CAP") and bid_amount:
        label += f" @ ${int(bid_amount)/100:,.2f}"
    if bid_strategy == "LOWEST_COST_WITH_MIN_ROAS" and bid_constraints:
        roas_floor = bid_constraints.get("roas_average_floor")
        if roas_floor:
            label += f" @ {int(roas_floor)/100:.0f}%"
    return label


def cmd_list_campaign_adsets(campaign_id):
    """List all ad sets in a campaign with ID, name, budget, bid strategy, and status."""
    token, account_id, api_version = get_config()

    # Fetch campaign info (include bid_strategy for CBO campaigns)
    camp_data, _ = api_get(f"{api_version}/{campaign_id}", {
        "fields": "name,status,objective,daily_budget,lifetime_budget,bid_strategy",
    }, token)
    camp_name = camp_data.get("name", "Unknown")
    is_cbo = bool(camp_data.get("daily_budget") or camp_data.get("lifetime_budget"))

    print(f"=== Ad Sets in Campaign ===\n")
    print(f"  Campaign:  {camp_name} [{campaign_id}]")
    print(f"  Status:    {camp_data.get('status', '?')}")
    print(f"  Objective: {camp_data.get('objective', '?')}")
    if is_cbo:
        cb = camp_data.get("daily_budget") or camp_data.get("lifetime_budget")
        cb_type = "daily" if camp_data.get("daily_budget") else "lifetime"
        print(f"  Budget:    ${int(cb)/100:,.2f}/{cb_type} (CBO — ad sets inherit)")
    else:
        print(f"  Budget:    ABO (each ad set has its own budget)")
    camp_bid = camp_data.get("bid_strategy")
    if camp_bid:
        print(f"  Bid Strategy: {_format_bid_strategy(camp_bid)} (campaign-level)")
    print()

    # Fetch ad sets with bid info
    data, _ = api_get(f"{api_version}/{campaign_id}/adsets", {
        "fields": "id,name,status,daily_budget,lifetime_budget,bid_strategy,bid_amount,bid_constraints",
        "limit": "100",
    }, token)

    adsets = data.get("data", [])
    if not adsets:
        print("  No ad sets found in this campaign.")
        return

    print(f"  {'ID':<24} {'Name':<40} {'Budget':<16} {'Bid Strategy':<22} {'Status'}")
    print(f"  {'-'*24} {'-'*40} {'-'*16} {'-'*22} {'-'*10}")

    for a in adsets:
        a_id = a.get("id", "?")
        a_name = a.get("name", "?")
        a_status = a.get("status", "?")
        a_daily = a.get("daily_budget")
        a_lifetime = a.get("lifetime_budget")
        if is_cbo:
            bstr = "(CBO)"
        elif a_daily:
            bstr = f"${int(a_daily)/100:,.2f}/day"
        elif a_lifetime:
            bstr = f"${int(a_lifetime)/100:,.2f} life"
        else:
            bstr = "no budget"
        # For CBO campaigns, ad sets may not have their own bid_strategy — inherit from campaign
        a_bid_strategy = a.get("bid_strategy") or (camp_bid if is_cbo else None)
        bid_str = _format_bid_strategy(a_bid_strategy, a.get("bid_amount"), a.get("bid_constraints"))
        disp_name = a_name[:39] + "…" if len(a_name) > 40 else a_name
        print(f"  {a_id:<24} {disp_name:<40} {bstr:<16} {bid_str:<22} {a_status}")

    print(f"\n  Total: {len(adsets)} ad set(s)")


def cmd_launch_ad(media_str, campaign_id, product=None, copy_from=None,
                  body=None, headline=None, link=None, cta=None,
                  description=None, ad_name=None, auto_yes=False,
                  adset_id=None, adset_name=None, budget=50,
                  budget_type="daily", status="PAUSED",
                  clone_targeting_from=None, bid_strategy=None,
                  bid_amount=None, roas_floor=None):
    """Launch an ad into a production campaign with proper budget, targeting, and status."""
    token, account_id, api_version = get_config()
    config = _load_staging_config()
    page_id = config.get("page_id")
    ig_user_id = config.get("instagram_user_id", "")
    pixel_id = os.environ.get("META_PIXEL_ID", "")

    print("=== Launch Ad ===\n")

    if not page_id:
        print("  ERROR: No page_id configured. Run: meta_api_helper.py discover-page")
        sys.exit(1)

    # --- 1. Validate campaign ---
    print(f"  Validating campaign {campaign_id}...")
    camp_data, _ = api_get(f"{api_version}/{campaign_id}", {
        "fields": "name,status,objective,daily_budget,lifetime_budget,bid_strategy",
    }, token)
    camp_name = camp_data.get("name")
    if not camp_name:
        print(f"  ERROR: Campaign {campaign_id} not found or inaccessible.")
        if camp_data.get("error"):
            print(f"    {camp_data['error'].get('message', '')}")
        sys.exit(1)

    is_cbo = bool(camp_data.get("daily_budget") or camp_data.get("lifetime_budget"))
    camp_bid_strategy = camp_data.get("bid_strategy")
    print(f"    Name:      {camp_name}")
    print(f"    Status:    {camp_data.get('status', '?')}")
    print(f"    Objective: {camp_data.get('objective', '?')}")
    print(f"    Budget:    {'CBO' if is_cbo else 'ABO'}")
    if camp_bid_strategy:
        print(f"    Bid:       {_format_bid_strategy(camp_bid_strategy)}")

    # --- 2. Resolve ad copy ---
    print(f"\n  Resolving ad copy...")
    ad_copy = {}
    if copy_from:
        print(f"    Fetching copy from ad {copy_from}...")
        ad_copy = _get_ad_copy_quiet(copy_from, token, api_version)
    if body:
        ad_copy["body"] = body
    if headline:
        ad_copy["headline"] = headline
    if link:
        ad_copy["link"] = link
    if cta:
        ad_copy["cta"] = cta
    if description:
        ad_copy["description"] = description

    if not ad_copy.get("body"):
        print("  ERROR: No ad body text. Use --copy-from or --body")
        sys.exit(1)
    if not ad_copy.get("link"):
        print("  ERROR: No link URL. Use --copy-from or --link")
        sys.exit(1)

    # --- 3. Print full copy for verification ---
    print(f"\n  === Ad Copy (verify before launch) ===")
    print(f"    Body:        {ad_copy.get('body', '(none)')}")
    print(f"    Headline:    {ad_copy.get('headline', '(none)')}")
    print(f"    Description: {ad_copy.get('description', '(none)')}")
    print(f"    CTA:         {ad_copy.get('cta', 'SHOP_NOW')}")
    print(f"    Link:        {ad_copy.get('link', '(none)')}")
    print(f"  ========================================")

    # --- 4. Parse & validate media ---
    print(f"\n  Parsing media paths...")
    parsed = _parse_media_paths(media_str)
    media_type = parsed["media_type"]
    file_map = parsed["files"]
    if not file_map:
        print("  ERROR: No valid media paths provided.")
        sys.exit(1)

    print(f"  Media type: {media_type}")
    for ratio, path in file_map.items():
        print(f"    {ratio}: {path}")

    print(f"\n  Validating dimensions...")
    file_map = _validate_media_dimensions(file_map)

    # --- 5. Resolve ad set ---
    print(f"\n  Resolving ad set...")
    created_new_adset = False

    if adset_id:
        # Validate it belongs to this campaign
        adset_check, _ = api_get(f"{api_version}/{adset_id}", {
            "fields": "id,name,campaign_id,status",
        }, token)
        if adset_check.get("campaign_id") != campaign_id:
            actual_camp = adset_check.get("campaign_id", "unknown")
            print(f"  ERROR: Ad set {adset_id} belongs to campaign {actual_camp}, not {campaign_id}.")
            sys.exit(1)
        print(f"    Using existing ad set: {adset_check.get('name', '?')} [{adset_id}]")
        resolved_adset_name = adset_check.get("name", adset_id)
    else:
        # Build ad set name
        try:
            from zoneinfo import ZoneInfo
            acct_tz = ZoneInfo("America/Los_Angeles")
        except ImportError:
            from datetime import timezone as _tz
            acct_tz = _tz(datetime.timedelta(hours=-8))
        today_str = datetime.datetime.now(acct_tz).strftime("%m.%d.%y")
        format_label = "Video" if media_type == "video" else "Static"
        if adset_name:
            resolved_adset_name = adset_name
        elif product:
            resolved_adset_name = f"{format_label} | {product} | {today_str}"
        else:
            resolved_adset_name = f"{format_label} | {today_str}"

        # Clone targeting
        targeting_source = None
        cloned = {}
        if clone_targeting_from:
            print(f"    Cloning targeting from ad set {clone_targeting_from}...")
            cloned = _clone_adset_targeting(clone_targeting_from, token, api_version)
            targeting_source = clone_targeting_from
        else:
            # Try to find first ACTIVE ad set in campaign
            existing, _ = api_get(f"{api_version}/{campaign_id}/adsets", {
                "fields": "id,name,status,targeting,optimization_goal,bid_strategy,billing_event,promoted_object,bid_amount,bid_constraints",
                "limit": "50",
            }, token)
            for ex in existing.get("data", []):
                if ex.get("status") == "ACTIVE":
                    for key in ("targeting", "optimization_goal", "bid_strategy",
                                "billing_event", "promoted_object", "bid_amount",
                                "bid_constraints"):
                        if ex.get(key) is not None:
                            cloned[key] = ex[key]
                    targeting_source = ex["id"]
                    print(f"    Cloned targeting from active ad set: {ex.get('name', '?')} [{ex['id']}]")
                    break

        if not cloned.get("targeting"):
            print(f"    Using default targeting: US, age 25-65, lowest cost")
            cloned["targeting"] = {"geo_locations": {"countries": ["US"]}, "age_min": 25, "age_max": 65}
            cloned["optimization_goal"] = "OFFSITE_CONVERSIONS"
            cloned["bid_strategy"] = "LOWEST_COST_WITHOUT_CAP"

        # --- Resolve effective bid strategy ---
        # Priority: explicit flag > campaign-level (CBO always wins) > cloned from source > default
        if bid_strategy:
            effective_bid_strategy = bid_strategy
        elif is_cbo and camp_bid_strategy:
            # CBO campaign's bid strategy governs all ad sets — always use it
            effective_bid_strategy = camp_bid_strategy
            cloned_bs = cloned.get("bid_strategy")
            if cloned_bs and cloned_bs != camp_bid_strategy:
                print(f"    NOTE: Source ad set uses {_format_bid_strategy(cloned_bs)}, but CBO campaign requires {_format_bid_strategy(camp_bid_strategy)}.")
                print(f"          Using campaign's bid strategy.")
            else:
                print(f"    Inheriting bid strategy from CBO campaign: {_format_bid_strategy(camp_bid_strategy)}")
        elif cloned.get("bid_strategy"):
            effective_bid_strategy = cloned["bid_strategy"]
        else:
            effective_bid_strategy = "LOWEST_COST_WITHOUT_CAP"

        effective_bid_amount = bid_amount  # explicit takes priority
        effective_bid_constraints = cloned.get("bid_constraints")
        effective_opt_goal = cloned.get("optimization_goal", "OFFSITE_CONVERSIONS")

        # --- Auto-reconcile optimization_goal with bid strategy ---
        # BID_CAP and COST_CAP require OFFSITE_CONVERSIONS (not VALUE)
        if effective_bid_strategy in ("LOWEST_COST_WITH_BID_CAP", "COST_CAP") and effective_opt_goal == "VALUE":
            print(f"    NOTE: {_format_bid_strategy(effective_bid_strategy)} doesn't support VALUE optimization.")
            print(f"          Auto-adjusting to OFFSITE_CONVERSIONS.")
            effective_opt_goal = "OFFSITE_CONVERSIONS"

        # MIN_ROAS requires VALUE optimization
        if effective_bid_strategy == "LOWEST_COST_WITH_MIN_ROAS" and effective_opt_goal != "VALUE":
            print(f"    NOTE: Min ROAS requires VALUE optimization.")
            print(f"          Auto-adjusting from {effective_opt_goal} to VALUE.")
            effective_opt_goal = "VALUE"

        # LOWEST_COST supports both — keep whatever was cloned

        # --- Validate companion fields for bid strategy ---
        if effective_bid_strategy == "LOWEST_COST_WITH_MIN_ROAS":
            if roas_floor is not None:
                effective_bid_constraints = {"roas_average_floor": str(int(float(roas_floor) * 100))}
            elif not effective_bid_constraints:
                print("  ERROR: --roas-floor is required for LOWEST_COST_WITH_MIN_ROAS strategy.")
                print("  Value is the minimum ROAS as a decimal (e.g. 2.0 = 200% return).")
                sys.exit(1)

        if effective_bid_strategy in ("COST_CAP", "LOWEST_COST_WITH_BID_CAP"):
            # Try sources in order: explicit flag > cloned from source > existing ad sets in campaign
            if effective_bid_amount is None:
                effective_bid_amount = cloned.get("bid_amount")
            if effective_bid_amount is None and is_cbo:
                # For CBO, check existing ad sets for a bid_amount to inherit
                existing_adsets, _ = api_get(f"{api_version}/{campaign_id}/adsets", {
                    "fields": "bid_amount,status", "limit": "10",
                }, token)
                for ex_a in existing_adsets.get("data", []):
                    if ex_a.get("bid_amount"):
                        effective_bid_amount = ex_a["bid_amount"]
                        print(f"    Inherited bid amount ${int(effective_bid_amount)/100:,.2f} from existing ad set")
                        break
            if effective_bid_amount is None:
                print(f"  ERROR: --bid-amount is required for {effective_bid_strategy} strategy.")
                print("  Value is your target CPA/bid cap in dollars (e.g. 25 = $25).")
                sys.exit(1)

        # Build ad set params
        adset_params = {
            "name": resolved_adset_name,
            "campaign_id": campaign_id,
            "status": status,
            "billing_event": cloned.get("billing_event", "IMPRESSIONS"),
            "optimization_goal": effective_opt_goal,
            "is_dynamic_creative": "false",
            "targeting": json.dumps(cloned["targeting"]) if isinstance(cloned["targeting"], dict) else cloned["targeting"],
            "attribution_spec": json.dumps([
                {"event_type": "CLICK_THROUGH", "window_days": 7},
                {"event_type": "VIEW_THROUGH", "window_days": 1},
            ]),
        }

        # Only set bid_strategy on ad set for ABO campaigns; CBO inherits from campaign
        if not is_cbo:
            adset_params["bid_strategy"] = effective_bid_strategy

        # For min-ROAS, include bid_constraints
        if effective_bid_strategy == "LOWEST_COST_WITH_MIN_ROAS" and effective_bid_constraints:
            adset_params["bid_constraints"] = json.dumps(effective_bid_constraints) if isinstance(effective_bid_constraints, dict) else effective_bid_constraints

        # Budget: skip if CBO (campaign handles it)
        if not is_cbo:
            budget_cents = str(int(float(budget) * 100))
            budget_field = "daily_budget" if budget_type == "daily" else "lifetime_budget"
            adset_params[budget_field] = budget_cents

        # Promoted object
        if cloned.get("promoted_object"):
            po = cloned["promoted_object"]
            adset_params["promoted_object"] = json.dumps(po) if isinstance(po, dict) else po
        elif pixel_id:
            adset_params["promoted_object"] = json.dumps({"pixel_id": pixel_id, "custom_event_type": "PURCHASE"})

        # Bid amount for cost-cap / bid-cap strategies
        if effective_bid_strategy in ("LOWEST_COST_WITH_BID_CAP", "COST_CAP"):
            # effective_bid_amount could be int (cents from API) or float (dollars from flag)
            if isinstance(effective_bid_amount, (int,)) and effective_bid_amount > 500:
                # Already in cents (from API clone)
                adset_params["bid_amount"] = str(effective_bid_amount)
            elif effective_bid_amount is not None:
                # In dollars (from --bid-amount flag)
                adset_params["bid_amount"] = str(int(float(effective_bid_amount) * 100))

        # Confirmation before creating
        if not auto_yes:
            print(f"\n  === Launch Summary ===")
            print(f"    Campaign:    {camp_name}")
            print(f"    Ad Set:      {resolved_adset_name} (NEW)")
            if not is_cbo:
                print(f"    Budget:      ${float(budget):,.2f}/{budget_type}")
            else:
                print(f"    Budget:      CBO (campaign-level)")
            print(f"    Bid:         {_format_bid_strategy(effective_bid_strategy, effective_bid_amount and int(float(effective_bid_amount) * 100), effective_bid_constraints)}")
            print(f"    Status:      {status}")
            print(f"    Targeting:   {'cloned from ' + targeting_source if targeting_source else 'defaults (US/25-65)'}")
            print(f"    Media:       {len(file_map)} {media_type}(s)")
            print(f"    Attribution: 7d click / 1d view")
            resp = input("\n  Proceed with launch? [y/N] ").strip().lower()
            if resp != "y":
                print("  Aborted.")
                return

        print(f"\n    Creating ad set: {resolved_adset_name}...")
        adset_resp, _ = api_post(f"{api_version}/{account_id}/adsets", adset_params, token)
        adset_id = adset_resp.get("id")
        if not adset_id:
            print(f"    ERROR: Ad set creation failed.")
            print(json.dumps(adset_resp, indent=2))
            sys.exit(1)
        _log_write("create-adset", {"adset_id": adset_id, "name": resolved_adset_name,
                                     "campaign_id": campaign_id, "source": "launch-ad"})
        print(f"    Created: {adset_id}")
        created_new_adset = True

    # --- 6. Upload media ---
    if media_type == "video":
        print(f"\n  Uploading {len(file_map)} video(s)...")
        assets = _upload_videos(file_map)
        if not assets:
            print("  ERROR: No videos uploaded successfully.")
            sys.exit(1)
    else:
        print(f"\n  Uploading {len(file_map)} image(s)...")
        assets = _upload_images(file_map)
        if not assets:
            print("  ERROR: No images uploaded successfully.")
            sys.exit(1)

    # --- 7. Create ad creative ---
    print(f"\n  Creating ad creative...")
    if not ad_name:
        ad_name = resolved_adset_name if created_new_adset else f"Ad {datetime.datetime.now().strftime('%m.%d.%y %H:%M')}"

    use_asset_feed = len(assets) >= 2

    if use_asset_feed:
        creative_params = _build_asset_feed_creative(
            assets, ad_copy, page_id, ig_user_id, ad_name,
            token, account_id, api_version,
            media_type=media_type
        )
    else:
        ratio = next(iter(assets))
        if media_type == "video":
            video_info = assets[ratio]
            oss_data = {
                "page_id": page_id,
                "video_data": {
                    "video_id": video_info["video_id"],
                    "image_url": video_info.get("thumbnail_url", ""),
                    "message": ad_copy.get("body", ""),
                    "title": ad_copy.get("headline", ""),
                    "link_description": ad_copy.get("description", ""),
                    "call_to_action": {
                        "type": ad_copy.get("cta", "SHOP_NOW"),
                        "value": {"link": ad_copy.get("link", "")},
                    },
                },
            }
        else:
            img_hash = assets[ratio]
            oss_data = {
                "page_id": page_id,
                "link_data": {
                    "image_hash": img_hash,
                    "link": ad_copy.get("link", ""),
                    "message": ad_copy.get("body", ""),
                    "name": ad_copy.get("headline", ""),
                    "description": ad_copy.get("description", ""),
                    "call_to_action": {
                        "type": ad_copy.get("cta", "SHOP_NOW"),
                        "value": {"link": ad_copy.get("link", "")},
                    },
                },
            }
        if ig_user_id:
            oss_data["instagram_user_id"] = ig_user_id
        creative_params = {
            "name": ad_name,
            "object_story_spec": json.dumps(oss_data),
        }

    creative_resp, _ = api_post(f"{api_version}/{account_id}/adcreatives", creative_params, token)
    creative_id = creative_resp.get("id")
    if not creative_id:
        print(f"    ERROR: Creative creation failed.")
        print(json.dumps(creative_resp, indent=2))
        sys.exit(1)
    _log_write("create-creative", {"creative_id": creative_id, "name": ad_name,
                                    "media_type": media_type, "source": "launch-ad"})
    print(f"    Creative ID: {creative_id}")

    # --- 8. Create ad ---
    print(f"\n  Creating ad with status: {status}...")
    ad_resp, _ = api_post(f"{api_version}/{account_id}/ads", {
        "name": ad_name,
        "adset_id": adset_id,
        "creative": json.dumps({"creative_id": creative_id}),
        "status": status,
    }, token)

    ad_id = ad_resp.get("id")
    if not ad_id:
        print(f"    ERROR: Ad creation failed.")
        print(json.dumps(ad_resp, indent=2))
        sys.exit(1)
    _log_write("create-ad", {"ad_id": ad_id, "creative_id": creative_id, "adset_id": adset_id,
                             "campaign_id": campaign_id, "status": status, "source": "launch-ad"})
    print(f"    Ad ID: {ad_id}")

    # --- 9. Report ---
    ads_manager_link = _ads_manager_url(ad_id, adset_id, campaign_id, level="ad")
    adset_link = _ads_manager_url(adset_id=adset_id, campaign_id=campaign_id, level="adset")
    campaign_link = _ads_manager_url(campaign_id=campaign_id, level="campaign")

    print(f"\n{'='*50}")
    print(f"  LAUNCHED SUCCESSFULLY")
    print(f"{'='*50}")
    print(f"  Ad Name:     {ad_name}")
    if product:
        print(f"  Product:     {product}")
    print(f"  Campaign:    {camp_name} [{campaign_id}]")
    print(f"  Ad Set:      {resolved_adset_name} [{adset_id}] {'(NEW)' if created_new_adset else '(existing)'}")
    print(f"  Ad ID:       {ad_id}")
    print(f"  Creative ID: {creative_id}")
    print(f"  Status:      {status}")
    if not is_cbo and created_new_adset:
        print(f"  Budget:      ${float(budget):,.2f}/{budget_type}")
    elif is_cbo:
        print(f"  Budget:      CBO (campaign-level)")
    if created_new_adset:
        _rpt_ba = int(float(bid_amount) * 100) if bid_amount else None
        print(f"  Bid:         {_format_bid_strategy(adset_params.get('bid_strategy', '?'), _rpt_ba or adset_params.get('bid_amount'))}")
    print(f"  Attribution: 7d click / 1d view")
    print(f"  Media Type:  {media_type}")
    if media_type == "video":
        vid_summary = ", ".join(f"{r}={v['video_id']}" for r, v in assets.items())
        print(f"  Videos:      {vid_summary}")
    else:
        img_summary = ", ".join(f"{r}={h[:12]}..." for r, h in assets.items())
        print(f"  Images:      {img_summary}")
    print(f"\n  Ads Manager Links:")
    print(f"    Ad:        {ads_manager_link}")
    print(f"    Ad Set:    {adset_link}")
    print(f"    Campaign:  {campaign_link}")
    if status == "PAUSED":
        print(f"\n  Status: PAUSED — activate in Ads Manager or via update-budget when ready.")
    else:
        print(f"\n  Status: ACTIVE — ad is live!")

    return {
        "ad_id": ad_id,
        "creative_id": creative_id,
        "adset_id": adset_id,
        "adset_name": resolved_adset_name,
        "campaign_id": campaign_id,
        "campaign_name": camp_name,
        "status": status,
        "ads_manager_link": ads_manager_link,
        "adset_manager_link": adset_link,
        "campaign_manager_link": campaign_link,
        "media_type": media_type,
        "assets": assets,
        "new_adset": created_new_adset,
    }


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def print_help():
    print(__doc__)
    print("Commands:")
    print("  report [--date-preset] [--slack CHANNEL] [--threaded] [--report-type TYPE]")
    print("                                    Shopify vs Amazon breakdown (default: today)")
    print("  snapshot [--date-preset] [--slack CHANNEL] [--threaded] [--report-type TYPE]")
    print("                                    Full snapshot with history + trend comparison")
    print("  top-ads [--date-preset] [--top N] [--with-media] [--format json]")
    print("                                    Top N Shopify ads by spend with preview links (default: 5)")
    print("  lp-performance [--date-preset last_30d] [--format json] [--campaign-filter TEXT]")
    print("                                    Performance aggregated by landing page (destination URL)")
    print("  creative-analysis [--date-preset] [--compare-preset] [--top N] [--slack CHANNEL] [--threaded] [--model MODEL]")
    print("                                    AI-powered creative analysis with vision models + fatigue detection")
    print("  creative-library [--date-preset last_30d] [--top 15] [--model MODEL] [--slack CHANNEL] [--threaded]")
    print("                       [--skip-synthesis] [--push-to-platform] [--no-doc]")
    print("                                    Build creative library: bulk download, deep analysis, copy intelligence")
    print("  campaigns [--date-preset]         Campaign-level detail with budgets (default: today)")
    print("  adsets [--date-preset] [--campaign-filter TEXT]")
    print("                                    Ad set level detail with budgets")
    print("  query --fields F [options]        Custom insights query")
    print("    --fields         Comma-separated fields (required)")
    print("    --level          account|campaign|adset|ad (default: campaign)")
    print("    --date-preset    today|yesterday|last_7d|last_30d|this_month (default: today)")
    print("    --breakdowns     Comma-separated: age,gender,publisher_platform,country,device_platform")
    print("    --time-increment 1 (daily), 7 (weekly), monthly, all_days")
    print("    --filtering      JSON array string for server-side filtering")
    print("    --campaign-filter  Text to filter campaign names (case-insensitive)")
    print("  validate-token                    Check token validity and permissions")
    print("  account-info                      Show ad account details")
    print("  health-check                      Check rate limit utilization")
    print("  list-campaigns [--limit N]        List recent campaigns (default: 10)")
    print("  insights-summary [--date-preset]  Account insights (default: last_7d)")
    print("  debug-token                       Full token debug output")
    print()
    print("Creative Staging Pipeline:")
    print("  discover-page                     Find Facebook Page & Instagram account, save to .staging.json")
    print("  setup-staging [--yes]             Create PAUSED staging campaign (one-time setup)")
    print("  upload-image --file PATH          Upload image to Meta, return hash")
    print("  upload-video --file PATH          Upload video to Meta, return video ID")
    print("  reencode-video --file PATH [--output PATH]")
    print("                                    Re-encode video for Meta compatibility (probe + ffmpeg)")
    print("  get-ad-copy --ad-id ID            Fetch ad creative text from an existing ad")
    print("  list-ad-copy [--campaign-filter TEXT] [--top N]")
    print("                                    List top ads by spend with their copy (default: top 5, last 30d)")
    print("  stage-ad --images|--media PATHS --product NAME --name NAME [options]")
    print("    --images/--media Comma-separated paths (auto-detects 1x1/4x5/9x16/16x9 from filename)")
    print("                     Supports images (.png/.jpg/.webp) and videos (.mp4/.mov/.avi/.mkv)")
    print("    --product NAME   Product name for ad set grouping (required, freeform)")
    print("    --name           Name for the new ad creative")
    print("    --copy-from ID   Copy body/headline/link/CTA from an existing ad")
    print("    --body TEXT       Ad body text (alternative to --copy-from)")
    print("    --headline TEXT   Ad headline")
    print("    --link URL        Destination URL")
    print("    --cta TYPE        Call to action (default: SHOP_NOW)")
    print("    --yes             Skip confirmation (for agent automation)")
    print("  get-ad --ad-id ID                 Full ad details (copy, media, creative type, preview)")
    print("  edit-ad --ad-id ID [options]      Edit ad copy by creating new creative + swapping")
    print("    --body TEXT        New body text")
    print("    --headline TEXT    New headline")
    print("    --link URL         New destination URL")
    print("    --cta TYPE         New call to action")
    print("    --description TEXT New description")
    print("    --url-tags TAGS    URL tracking tags (e.g. 'utm_source=meta&utm_medium=paid')")
    print("    --yes              Skip confirmation")
    print("  duplicate-ad --ad-id ID --to-adset ADSET_ID [options]")
    print("                                    Duplicate ad to a different ad set")
    print("    --name NAME        Name for new ad (default: '<original> (copy)')")
    print("    --body/--headline/--link/--cta/--description/--url-tags  Override copy fields")
    print("    --status STATUS    Status for new ad (default: PAUSED)")
    print("    --yes              Skip confirmation")
    print("  update-budget --id TARGET_ID --budget DOLLARS [--type daily|lifetime] [--yes]")
    print("                                    Update campaign (CBO) or ad set budget")
    print("    --id TARGET_ID     Campaign or ad set ID (auto-detected)")
    print("    --budget DOLLARS   New budget in dollars (e.g. 100 or 99.50)")
    print("    --type TYPE        daily (default) or lifetime")
    print("    --yes              Skip confirmation")
    print()
    print("Ad Launch Pipeline:")
    print("  list-campaign-adsets --campaign-id ID")
    print("                                    List all ad sets in a campaign with budgets")
    print("  launch-ad --media|--images PATHS --campaign-id ID [options]")
    print("                                    Launch ad into a production campaign")
    print("    --media/--images   Comma-separated media paths (required)")
    print("    --campaign-id ID   Target campaign (required)")
    print("    --product NAME     Product name for ad set naming")
    print("    --copy-from ID     Copy body/headline/link/CTA from an existing ad")
    print("    --body TEXT        Ad body text (alternative to --copy-from)")
    print("    --headline TEXT    Ad headline")
    print("    --link URL         Destination URL")
    print("    --cta TYPE         Call to action (default: SHOP_NOW)")
    print("    --description TEXT Link description")
    print("    --name NAME        Ad/creative name")
    print("    --adset-id ID      Use existing ad set (skip creation)")
    print("    --adset-name NAME  Custom name for new ad set")
    print("    --budget DOLLARS   Ad set budget, default 50 (ignored for CBO)")
    print("    --budget-type TYPE daily (default) or lifetime")
    print("    --status STATUS    PAUSED (default) or ACTIVE")
    print("    --clone-targeting-from ID  Clone targeting from this ad set")
    print("    --bid-strategy STR LOWEST_COST_WITHOUT_CAP (default), COST_CAP, LOWEST_COST_WITH_BID_CAP, LOWEST_COST_WITH_MIN_ROAS")
    print("    --bid-amount DOLLARS  Bid/CPA cap in dollars (required for COST_CAP and BID_CAP)")
    print("    --roas-floor NUM   Min ROAS as decimal, e.g. 2.0 = 200% (required for MIN_ROAS)")
    print("    --yes              Skip confirmation")
    print()
    print("Ad Set Management:")
    print("  update-adset --adset-id ID [options]")
    print("                                    Update bid strategy/amount on an existing ad set")
    print("    --adset-id ID      Ad set to update (required)")
    print("    --bid-strategy STR LOWEST_COST_WITHOUT_CAP, COST_CAP, LOWEST_COST_WITH_BID_CAP, LOWEST_COST_WITH_MIN_ROAS")
    print("    --bid-amount DOLLARS  Bid/CPA cap in dollars (required for COST_CAP and BID_CAP)")
    print("    --roas-floor NUM   Min ROAS as decimal, e.g. 2.0 = 200% (required for MIN_ROAS)")
    print("    --optimization-goal GOAL  OFFSITE_CONVERSIONS, VALUE, LINK_CLICKS, etc.")
    print("    --status STATUS    ACTIVE, PAUSED, DELETED, ARCHIVED")
    print("    --yes              Skip confirmation")
    print("  duplicate-adset --adset-id ID --to-campaign ID [options]")
    print("                                    Duplicate ad set to another campaign")
    print("    --adset-id ID      Source ad set to duplicate (required)")
    print("    --to-campaign ID   Target campaign (required)")
    print("    --adset-name NAME  Name for new ad set (default: '<original> (copy)')")
    print("    --budget DOLLARS   Budget for new ad set (default: clone from source)")
    print("    --budget-type TYPE daily (default) or lifetime")
    print("    --bid-strategy STR Override bid strategy (default: clone from source or CBO campaign)")
    print("    --bid-amount DOLLARS  Override bid amount")
    print("    --roas-floor NUM   Override ROAS floor")
    print("    --status STATUS    PAUSED (default) or ACTIVE")
    print("    --include-ads      Also duplicate all ads from source ad set")
    print("    --yes              Skip confirmation")
    print()
    print("Token Management:")
    print("  exchange-token --short-lived-token TOKEN")
    print("                                    Convert short-lived token to long-lived (~60 days)")
    print("  refresh-token                     Refresh a long-lived token before it expires")
    print("  token-status                      Show token type, expiry, and refresh advice")
    print()
    print("Report Subscriptions:")
    print("  subscribe --report-type TYPE --user-id UID")
    print("                                    Subscribe a user to CC on report type (heartbeat|daily_recap|weekly_recap)")
    print("  unsubscribe --report-type TYPE --user-id UID")
    print("                                    Unsubscribe a user from CC on report type")
    print("  list-subscriptions                List all report subscriptions")
    print()
    print("Report Threading:")
    print("  --threaded                        Post header in channel, full report as thread reply")
    print("  --report-type TYPE                heartbeat|daily_recap|weekly_recap (auto-inferred if omitted)")


def main():
    args = sys.argv[1:]

    if not args or args[0] in ("-h", "--help", "help"):
        print_help()
        sys.exit(0)

    cmd = args[0]

    if cmd == "report":
        preset = "today"
        slack_target = None
        threaded = "--threaded" in args
        rtype = None
        if "--date-preset" in args:
            idx = args.index("--date-preset")
            if idx + 1 < len(args):
                preset = args[idx + 1]
        if "--slack" in args:
            idx = args.index("--slack")
            if idx + 1 < len(args):
                slack_target = args[idx + 1]
        if "--report-type" in args:
            idx = args.index("--report-type")
            if idx + 1 < len(args):
                rtype = args[idx + 1]
        cmd_cgk_report(preset, slack_target=slack_target, threaded=threaded, report_type=rtype)
    elif cmd == "snapshot":
        preset = "today"
        slack_target = None
        threaded = "--threaded" in args
        rtype = None
        if "--date-preset" in args:
            idx = args.index("--date-preset")
            if idx + 1 < len(args):
                preset = args[idx + 1]
        if "--slack" in args:
            idx = args.index("--slack")
            if idx + 1 < len(args):
                slack_target = args[idx + 1]
        if "--report-type" in args:
            idx = args.index("--report-type")
            if idx + 1 < len(args):
                rtype = args[idx + 1]
        cmd_cgk_snapshot(preset, slack_target=slack_target, threaded=threaded, report_type=rtype)
    elif cmd == "top-ads":
        preset = "today"
        top_n = 5
        if "--date-preset" in args:
            idx = args.index("--date-preset")
            if idx + 1 < len(args):
                preset = args[idx + 1]
        if "--top" in args:
            idx = args.index("--top")
            if idx + 1 < len(args):
                top_n = int(args[idx + 1])
        with_media = "--with-media" in args
        format_json = "--format" in args and (args.index("--format") + 1 < len(args)) and args[args.index("--format") + 1] == "json"
        cmd_cgk_top_ads(preset, top_n, with_media=with_media, format_json=format_json)
    elif cmd == "lp-performance":
        preset = "last_30d"
        cf = None
        if "--date-preset" in args:
            idx = args.index("--date-preset")
            if idx + 1 < len(args):
                preset = args[idx + 1]
        if "--campaign-filter" in args:
            idx = args.index("--campaign-filter")
            if idx + 1 < len(args):
                cf = args[idx + 1]
        format_json = "--format" in args and (args.index("--format") + 1 < len(args)) and args[args.index("--format") + 1] == "json"
        cmd_lp_performance(preset, format_json=format_json, campaign_filter=cf)
    elif cmd == "creative-analysis":
        if os.environ.get("CREATIVE_ANALYSIS_SAFE") != "1":
            print("ERROR: Direct creative-analysis calls are blocked.")
            print("Use creative_analysis_safe.sh instead.")
            sys.exit(1)
        preset = "today"
        compare = "last_30d"
        top_n = 5
        slack_target = None
        threaded = "--threaded" in args
        model = "gemini-3-flash-preview"
        keyword = None
        if "--date-preset" in args:
            idx = args.index("--date-preset")
            if idx + 1 < len(args):
                preset = args[idx + 1]
        if "--compare-preset" in args:
            idx = args.index("--compare-preset")
            if idx + 1 < len(args):
                compare = args[idx + 1]
        if "--top" in args:
            idx = args.index("--top")
            if idx + 1 < len(args):
                top_n = int(args[idx + 1])
        if "--keyword" in args:
            idx = args.index("--keyword")
            if idx + 1 < len(args):
                keyword = args[idx + 1]
        if "--slack" in args:
            idx = args.index("--slack")
            if idx + 1 < len(args):
                slack_target = args[idx + 1]
        if "--model" in args:
            idx = args.index("--model")
            if idx + 1 < len(args):
                model = args[idx + 1]
        cmd_cgk_creative_analysis(preset, compare_preset=compare, top_n=top_n,
                                   slack_target=slack_target, threaded=threaded,
                                   model_name=model, keyword_filter=keyword)
    elif cmd == "creative-library":
        preset = "last_30d"
        top_n = 15
        slack_target = None
        threaded = "--threaded" in args
        model = "gemini-3-flash-preview"
        skip_synthesis = "--skip-synthesis" in args
        push_platform = "--push-to-platform" in args
        no_doc = "--no-doc" in args
        if "--date-preset" in args:
            idx = args.index("--date-preset")
            if idx + 1 < len(args):
                preset = args[idx + 1]
        if "--top" in args:
            idx = args.index("--top")
            if idx + 1 < len(args):
                top_n = int(args[idx + 1])
        if "--slack" in args:
            idx = args.index("--slack")
            if idx + 1 < len(args):
                slack_target = args[idx + 1]
        if "--model" in args:
            idx = args.index("--model")
            if idx + 1 < len(args):
                model = args[idx + 1]
        cmd_cgk_creative_library(
            date_preset=preset, top_n=top_n, model_name=model,
            slack_target=slack_target, threaded=threaded,
            skip_synthesis=skip_synthesis, push_to_platform=push_platform,
            no_doc=no_doc,
        )
    elif cmd == "campaigns":
        preset = "today"
        if "--date-preset" in args:
            idx = args.index("--date-preset")
            if idx + 1 < len(args):
                preset = args[idx + 1]
        cmd_cgk_campaigns(preset)
    elif cmd == "adsets":
        preset = "today"
        cf = None
        if "--date-preset" in args:
            idx = args.index("--date-preset")
            if idx + 1 < len(args):
                preset = args[idx + 1]
        if "--campaign-filter" in args:
            idx = args.index("--campaign-filter")
            if idx + 1 < len(args):
                cf = args[idx + 1]
        cmd_cgk_adsets(preset, campaign_filter=cf)
    elif cmd == "query":
        q_fields = _get_flag("--fields")
        if not q_fields:
            print("ERROR: --fields is required for query command.")
            print("Example: query --fields 'spend,impressions,ctr' --level campaign --date-preset last_7d")
            sys.exit(1)
        cmd_query(
            fields=q_fields,
            level=_get_flag("--level", "campaign"),
            date_preset=_get_flag("--date-preset", "today"),
            breakdowns=_get_flag("--breakdowns"),
            time_increment=_get_flag("--time-increment"),
            filtering=_get_flag("--filtering"),
            campaign_filter=_get_flag("--campaign-filter"),
        )
    elif cmd == "validate-token":
        cmd_validate_token()
    elif cmd == "account-info":
        cmd_account_info()
    elif cmd == "health-check":
        cmd_health_check()
    elif cmd == "list-campaigns":
        limit = 10
        if "--limit" in args:
            idx = args.index("--limit")
            if idx + 1 < len(args):
                limit = int(args[idx + 1])
        cmd_list_campaigns(limit)
    elif cmd == "insights-summary":
        preset = "last_7d"
        if "--date-preset" in args:
            idx = args.index("--date-preset")
            if idx + 1 < len(args):
                preset = args[idx + 1]
        cmd_insights_summary(preset)
    elif cmd == "debug-token":
        cmd_debug_token()
    elif cmd == "exchange-token":
        slt = None
        if "--short-lived-token" in args:
            idx = args.index("--short-lived-token")
            if idx + 1 < len(args):
                slt = args[idx + 1]
        if not slt:
            print("ERROR: --short-lived-token TOKEN is required.")
            print("Get one from: https://developers.facebook.com/tools/explorer/")
            sys.exit(1)
        cmd_exchange_token(slt)
    elif cmd == "refresh-token":
        cmd_refresh_token()
    elif cmd == "token-status":
        cmd_token_status()
    elif cmd == "discover-page":
        cmd_discover_page()
    elif cmd == "setup-staging":
        auto_yes = "--yes" in args
        cmd_setup_staging(auto_yes=auto_yes)
    elif cmd == "upload-image":
        file_path = _get_flag("--file")
        if not file_path:
            print("ERROR: --file PATH is required.")
            sys.exit(1)
        cmd_upload_image(file_path)
    elif cmd == "upload-video":
        file_path = _get_flag("--file")
        if not file_path:
            print("ERROR: --file PATH is required.")
            sys.exit(1)
        cmd_upload_video(file_path)
    elif cmd == "reencode-video":
        file_path = _get_flag("--file")
        if not file_path:
            print("ERROR: --file PATH is required.")
            sys.exit(1)
        output_path = _get_flag("--output")
        cmd_reencode_video(file_path, output_path=output_path)
    elif cmd == "get-ad-copy":
        ad_id = _get_flag("--ad-id")
        if not ad_id:
            print("ERROR: --ad-id ID is required.")
            sys.exit(1)
        cmd_get_ad_copy(ad_id)
    elif cmd == "list-ad-copy":
        cf = _get_flag("--campaign-filter")
        top_n = int(_get_flag("--top", "5"))
        cmd_list_ad_copy(campaign_filter=cf, top_n=top_n)
    elif cmd == "stage-ad":
        if os.environ.get("STAGE_AD_SAFE") != "1":
            print("ERROR: Direct stage-ad calls are blocked.")
            print("You MUST use stage_ad_safe.sh with the two-phase plan/execute workflow.")
            print("Run: stage_ad_safe.sh plan --media <path> --product <name> --copy-from <id>")
            print("Then: stage_ad_safe.sh execute --plan <plan_file>")
            print("See agent instructions for the full Creative Staging Pipeline.")
            sys.exit(1)
        media_str = _get_flag("--media") or _get_flag("--images")
        if not media_str:
            print("ERROR: --images or --media PATHS is required (comma-separated).")
            sys.exit(1)
        product = _get_flag("--product")
        if not product:
            print("ERROR: --product NAME is required.")
            sys.exit(1)
        cmd_stage_ad(
            media_str=media_str,
            copy_from=_get_flag("--copy-from"),
            body=_get_flag("--body"),
            headline=_get_flag("--headline"),
            link=_get_flag("--link"),
            cta=_get_flag("--cta"),
            ad_name=_get_flag("--name", "Staged Creative"),
            auto_yes="--yes" in args,
            product=product,
        )
    elif cmd == "get-ad":
        ad_id = _get_flag("--ad-id")
        if not ad_id:
            print("ERROR: --ad-id ID is required.")
            sys.exit(1)
        cmd_get_ad(ad_id)
    elif cmd == "edit-ad":
        ad_id = _get_flag("--ad-id")
        if not ad_id:
            print("ERROR: --ad-id ID is required.")
            sys.exit(1)
        cmd_edit_ad(
            ad_id=ad_id,
            body=_get_flag("--body"),
            headline=_get_flag("--headline"),
            link=_get_flag("--link"),
            cta=_get_flag("--cta"),
            description=_get_flag("--description"),
            url_tags=_get_flag("--url-tags"),
            status=_get_flag("--status"),
            auto_yes="--yes" in args,
        )
    elif cmd == "duplicate-ad":
        ad_id = _get_flag("--ad-id")
        to_adset = _get_flag("--to-adset")
        if not ad_id:
            print("ERROR: --ad-id ID is required.")
            sys.exit(1)
        if not to_adset:
            print("ERROR: --to-adset ADSET_ID is required.")
            sys.exit(1)
        cmd_duplicate_ad(
            ad_id=ad_id,
            to_adset=to_adset,
            name=_get_flag("--name"),
            body=_get_flag("--body"),
            headline=_get_flag("--headline"),
            link=_get_flag("--link"),
            cta=_get_flag("--cta"),
            description=_get_flag("--description"),
            url_tags=_get_flag("--url-tags"),
            status=_get_flag("--status", "PAUSED"),
            auto_yes="--yes" in args,
        )
    elif cmd == "update-budget":
        target_id = _get_flag("--id")
        if not target_id:
            print("ERROR: --id TARGET_ID is required.")
            sys.exit(1)
        new_budget = _get_flag("--budget")
        if not new_budget:
            print("ERROR: --budget DOLLARS is required.")
            sys.exit(1)
        cmd_update_budget(
            target_id=target_id,
            new_budget=new_budget,
            budget_type=_get_flag("--type", "daily"),
            auto_yes="--yes" in args,
        )
    elif cmd == "update-adset":
        adset_id = _get_flag("--adset-id")
        if not adset_id:
            print("ERROR: --adset-id ID is required.")
            sys.exit(1)
        bid_amt = _get_flag("--bid-amount")
        if bid_amt:
            try:
                bid_amt = float(bid_amt)
            except ValueError:
                print(f"ERROR: --bid-amount must be a number, got '{bid_amt}'")
                sys.exit(1)
        roas_fl = _get_flag("--roas-floor")
        if roas_fl:
            try:
                roas_fl = float(roas_fl)
            except ValueError:
                print(f"ERROR: --roas-floor must be a number, got '{roas_fl}'")
                sys.exit(1)
        cmd_update_adset(
            adset_id=adset_id,
            bid_strategy=_get_flag("--bid-strategy"),
            bid_amount=bid_amt,
            roas_floor=roas_fl,
            optimization_goal=_get_flag("--optimization-goal"),
            status=_get_flag("--status"),
            auto_yes="--yes" in args,
        )
    elif cmd == "duplicate-adset":
        adset_id = _get_flag("--adset-id")
        if not adset_id:
            print("ERROR: --adset-id ID is required.")
            sys.exit(1)
        to_campaign = _get_flag("--to-campaign")
        if not to_campaign:
            print("ERROR: --to-campaign ID is required.")
            sys.exit(1)
        budget_val = _get_flag("--budget")
        if budget_val:
            try:
                budget_val = float(budget_val)
            except ValueError:
                print(f"ERROR: --budget must be a number, got '{budget_val}'")
                sys.exit(1)
        bid_amt = _get_flag("--bid-amount")
        if bid_amt:
            try:
                bid_amt = float(bid_amt)
            except ValueError:
                print(f"ERROR: --bid-amount must be a number, got '{bid_amt}'")
                sys.exit(1)
        roas_fl = _get_flag("--roas-floor")
        if roas_fl:
            try:
                roas_fl = float(roas_fl)
            except ValueError:
                print(f"ERROR: --roas-floor must be a number, got '{roas_fl}'")
                sys.exit(1)
        cmd_duplicate_adset(
            source_adset_id=adset_id,
            to_campaign_id=to_campaign,
            adset_name=_get_flag("--adset-name"),
            budget=budget_val,
            budget_type=_get_flag("--budget-type", "daily"),
            bid_strategy=_get_flag("--bid-strategy"),
            bid_amount=bid_amt,
            roas_floor=roas_fl,
            status=_get_flag("--status", "PAUSED"),
            include_ads="--include-ads" in args,
            auto_yes="--yes" in args,
        )
    elif cmd == "list-campaign-adsets":
        cid = _get_flag("--campaign-id")
        if not cid:
            print("ERROR: --campaign-id ID is required.")
            sys.exit(1)
        cmd_list_campaign_adsets(campaign_id=cid)
    elif cmd == "launch-ad":
        if os.environ.get("STAGE_AD_SAFE") != "1":
            print("ERROR: Direct launch-ad calls are blocked.")
            print("You MUST use stage_ad_safe.sh with the unified pipeline workflow.")
            print("Run: stage_ad_safe.sh set-destination --session <ID> --campaign-id <ID> --adset-id <ID>")
            print("See agent instructions for the full Unified Ad Pipeline.")
            sys.exit(1)
        media_str = _get_flag("--media") or _get_flag("--images")
        if not media_str:
            print("ERROR: --images or --media PATHS is required (comma-separated).")
            sys.exit(1)
        cid = _get_flag("--campaign-id")
        if not cid:
            print("ERROR: --campaign-id ID is required.")
            sys.exit(1)
        budget_val = _get_flag("--budget", "50")
        try:
            budget_val = float(budget_val)
        except ValueError:
            print(f"ERROR: --budget must be a number, got '{budget_val}'")
            sys.exit(1)
        bid_amt = _get_flag("--bid-amount")
        if bid_amt:
            try:
                bid_amt = float(bid_amt)
            except ValueError:
                print(f"ERROR: --bid-amount must be a number, got '{bid_amt}'")
                sys.exit(1)
        roas_fl = _get_flag("--roas-floor")
        if roas_fl:
            try:
                roas_fl = float(roas_fl)
            except ValueError:
                print(f"ERROR: --roas-floor must be a number, got '{roas_fl}'")
                sys.exit(1)
        cmd_launch_ad(
            media_str=media_str,
            campaign_id=cid,
            product=_get_flag("--product"),
            copy_from=_get_flag("--copy-from"),
            body=_get_flag("--body"),
            headline=_get_flag("--headline"),
            link=_get_flag("--link"),
            cta=_get_flag("--cta"),
            description=_get_flag("--description"),
            ad_name=_get_flag("--name"),
            auto_yes="--yes" in args,
            adset_id=_get_flag("--adset-id"),
            adset_name=_get_flag("--adset-name"),
            budget=budget_val,
            budget_type=_get_flag("--budget-type", "daily"),
            status=_get_flag("--status", "PAUSED"),
            clone_targeting_from=_get_flag("--clone-targeting-from"),
            bid_strategy=_get_flag("--bid-strategy"),
            bid_amount=bid_amt,
            roas_floor=roas_fl,
        )
    elif cmd == "subscribe":
        rtype = _get_flag("--report-type")
        user_id = _get_flag("--user-id")
        if not rtype or not user_id:
            print("ERROR: --report-type TYPE and --user-id UID are required.")
            sys.exit(1)
        cmd_subscribe(rtype, user_id)
    elif cmd == "unsubscribe":
        rtype = _get_flag("--report-type")
        user_id = _get_flag("--user-id")
        if not rtype or not user_id:
            print("ERROR: --report-type TYPE and --user-id UID are required.")
            sys.exit(1)
        cmd_unsubscribe(rtype, user_id)
    elif cmd == "list-subscriptions":
        cmd_list_subscriptions()
    else:
        print(f"Unknown command: {cmd}")
        print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
