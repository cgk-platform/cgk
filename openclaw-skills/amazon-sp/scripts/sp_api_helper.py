#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Amazon Selling Partner API Helper — Zero-dependency inventory, orders, pricing, and more.

Usage:
    sp_api_helper.py validate-token
    sp_api_helper.py health-check
    sp_api_helper.py refresh-token
    sp_api_helper.py account-info

    sp_api_helper.py fba-inventory [--granularity MARKETPLACE|ASIN] [--skus SKU1,SKU2] [--next-token TOKEN]
    sp_api_helper.py inventory-report --report-type TYPE [--wait] [--timeout SECS]
    sp_api_helper.py inventory-summary
    sp_api_helper.py low-stock [--threshold N]
    sp_api_helper.py list-reports [--type TYPE] [--limit N] [--status STATUS]
    sp_api_helper.py download-report --report-id ID [--output PATH]
    sp_api_helper.py get-report-status --report-id ID

    sp_api_helper.py orders [--since DATE] [--until DATE] [--status STATUS] [--limit N] [--next-token TOKEN]
    sp_api_helper.py order --order-id ID

    sp_api_helper.py catalog-search --keywords TEXT [--limit N]
    sp_api_helper.py catalog-item --asin ASIN
    sp_api_helper.py pricing --asin ASIN
    sp_api_helper.py fees --asin ASIN --price PRICE

    sp_api_helper.py listing --sku SKU
    sp_api_helper.py create-feed --file PATH
    sp_api_helper.py feed-status --feed-id ID

    sp_api_helper.py financial-events [--since DATE] [--until DATE] [--limit N] [--next-token TOKEN]

    sp_api_helper.py stranded-inventory [--timeout SECS] [--csv PATH]
    sp_api_helper.py restock [--timeout SECS] [--csv PATH]
    sp_api_helper.py aged-inventory [--timeout SECS] [--csv PATH]
    sp_api_helper.py storage-fees [--timeout SECS] [--csv PATH]
    sp_api_helper.py confirm-shipment --order-id ID --tracking NUMBER --carrier NAME

    sp_api_helper.py bulk-pricing --asins ASIN1,ASIN2,... [--json]
    sp_api_helper.py refund-tracker [--since DATE] [--until DATE] [--json]
    sp_api_helper.py fee-comparison --asins ASIN1,ASIN2 --price PRICE
    sp_api_helper.py returns-report [--timeout SECS] [--csv PATH] [--json]
    sp_api_helper.py order-velocity [--timeout SECS] [--json]
    sp_api_helper.py restock-calculator [--target-days N] [--timeout SECS] [--csv PATH] [--json]
    sp_api_helper.py profit-dashboard --asins ASIN1,ASIN2 [--limit N] [--json]

Environment variables (loaded from .env):
    SP_LWA_CLIENT_ID        — Login With Amazon client ID
    SP_LWA_CLIENT_SECRET     — LWA client secret
    SP_LWA_REFRESH_TOKEN     — Long-lived refresh token
    SP_REGION                — API region: NA, EU, or FE
    SP_MARKETPLACE_ID        — Primary marketplace ID
    SP_SELLER_ID             — Amazon seller/merchant ID
"""

import csv
import datetime
import gzip
import io
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks
SKILL_DIR = pathlib.Path(__file__).parent.parent
ENV_FILE = SKILL_DIR / ".env"
TOKEN_FILE = SKILL_DIR / ".token.json"
CACHE_DIR = SKILL_DIR / "cache"
HISTORY_DIR = SKILL_DIR / "history"
LOGS_DIR = SKILL_DIR / "logs"

# Read-only mode — blocks all state-changing commands
# Set SP_READ_ONLY=0 in the skill .env to enable write operations
READ_ONLY_MODE = os.environ.get("SP_READ_ONLY", "1") == "1"
WRITE_COMMANDS = {"create-feed", "confirm-shipment"}

# Regional endpoints (NO SigV4 — removed Oct 2023)
REGION_ENDPOINTS = {
    "NA": "https://sellingpartnerapi-na.amazon.com",
    "EU": "https://sellingpartnerapi-eu.amazon.com",
    "FE": "https://sellingpartnerapi-fe.amazon.com",
}

# Sandbox endpoints for testing
SANDBOX_ENDPOINTS = {
    "NA": "https://sandbox.sellingpartnerapi-na.amazon.com",
    "EU": "https://sandbox.sellingpartnerapi-eu.amazon.com",
    "FE": "https://sandbox.sellingpartnerapi-fe.amazon.com",
}

LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token"

# Report types — inventory focused
INVENTORY_REPORT_TYPES = {
    "GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA": "Active FBA inventory (near real-time)",
    "GET_FBA_MYI_ALL_INVENTORY_DATA": "All FBA inventory including archived",
    "GET_AFN_INVENTORY_DATA": "FBA inventory by warehouse",
    "GET_AFN_INVENTORY_DATA_BY_COUNTRY": "Per-country FBA inventory (EU)",
    "GET_MERCHANT_LISTINGS_ALL_DATA": "All merchant listings",
    "GET_MERCHANT_LISTINGS_DATA": "Active merchant listings only",
    "GET_RESERVED_INVENTORY_DATA": "Reserved inventory breakdown",
    "GET_LEDGER_SUMMARY_VIEW_DATA": "Inventory reconciliation (ledger summary)",
    "GET_LEDGER_DETAIL_VIEW_DATA": "Inventory movement details (18-month history)",
}

ALL_REPORT_TYPES = {
    **INVENTORY_REPORT_TYPES,
    "GET_FLAT_FILE_OPEN_LISTINGS_DATA": "Open listings",
    "GET_FLAT_FILE_ALL_ORDERS_DATA_BY_LAST_UPDATE_GENERAL": "Orders by last update",
    "GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL": "Orders by order date",
    "GET_FBA_ESTIMATED_FBA_FEES_TXT_DATA": "FBA fee estimates",
    "GET_FBA_REIMBURSEMENTS_DATA": "FBA reimbursements",
    "GET_FBA_STORAGE_FEE_CHARGES_DATA": "Monthly storage fees",
    "GET_FBA_INVENTORY_AGED_DATA": "Aged/stranded inventory",
    "GET_STRANDED_INVENTORY_UI_DATA": "Stranded inventory (Seller Central view)",
    "GET_RESTOCK_INVENTORY_RECOMMENDATIONS_REPORT": "Restock recommendations",
    "GET_SALES_AND_TRAFFIC_REPORT": "Sales and traffic (Business Reports)",
    "GET_FBA_FULFILLMENT_CUSTOMER_RETURNS_DATA": "FBA customer returns with reason codes",
}


# ---------------------------------------------------------------------------
# .env loader
# ---------------------------------------------------------------------------

def _load_env_file():
    """Load .env file from skill directory into os.environ."""
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key and key not in os.environ:
            os.environ[key] = value


def get_config():
    """Return config dict; raise if required vars missing."""
    _load_env_file()
    required = ["SP_LWA_CLIENT_ID", "SP_LWA_CLIENT_SECRET", "SP_LWA_REFRESH_TOKEN",
                 "SP_MARKETPLACE_ID", "SP_SELLER_ID"]
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        print(f"ERROR: Missing required environment variables: {', '.join(missing)}", file=sys.stderr)
        print(f"Set them in {ENV_FILE} or export them.", file=sys.stderr)
        sys.exit(1)

    region = os.environ.get("SP_REGION", "NA").upper()
    if region not in REGION_ENDPOINTS:
        print(f"ERROR: SP_REGION must be NA, EU, or FE (got '{region}')", file=sys.stderr)
        sys.exit(1)

    return {
        "client_id": os.environ["SP_LWA_CLIENT_ID"],
        "client_secret": os.environ["SP_LWA_CLIENT_SECRET"],
        "refresh_token": os.environ["SP_LWA_REFRESH_TOKEN"],
        "region": region,
        "endpoint": REGION_ENDPOINTS[region],
        "marketplace_id": os.environ["SP_MARKETPLACE_ID"],
        "seller_id": os.environ["SP_SELLER_ID"],
    }


# ---------------------------------------------------------------------------
# LWA Token Management (NO SigV4 — Amazon removed it Oct 2023)
# ---------------------------------------------------------------------------

def _read_cached_token():
    """Read cached LWA token if still valid (5-min buffer)."""
    if not TOKEN_FILE.exists():
        return None
    try:
        data = json.loads(TOKEN_FILE.read_text())
        expires_at = data.get("expires_at", 0)
        if time.time() < expires_at - 300:  # 5-min buffer
            return data["access_token"]
    except (json.JSONDecodeError, KeyError):
        pass
    return None


def _write_cached_token(access_token: str, expires_in: int):
    """Cache LWA token with expiry timestamp."""
    TOKEN_FILE.write_text(json.dumps({
        "access_token": access_token,
        "expires_at": time.time() + expires_in,
        "refreshed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }, indent=2))


def get_lwa_access_token(config: dict = None, force_refresh: bool = False) -> str:
    """Get LWA access token, using cache if valid."""
    if not force_refresh:
        cached = _read_cached_token()
        if cached:
            return cached

    if config is None:
        config = get_config()

    body = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": config["refresh_token"],
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
    }).encode()

    req = urllib.request.Request(LWA_TOKEN_URL, data=body, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        print(f"ERROR: LWA token request failed ({e.code}): {error_body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"ERROR: LWA token request failed: {e.reason}", file=sys.stderr)
        sys.exit(1)

    access_token = data["access_token"]
    expires_in = data.get("expires_in", 3600)
    _write_cached_token(access_token, expires_in)
    return access_token


# ---------------------------------------------------------------------------
# Core SP-API HTTP Client
# ---------------------------------------------------------------------------

def sp_api_request(method: str, path: str, config: dict = None,
                   params: dict = None, body: dict = None,
                   extra_headers: dict = None, raw_response: bool = False,
                   max_retries: int = 3) -> dict | bytes:
    """Make an SP-API request with auth, retry, and rate-limit handling.

    Auth is purely LWA access token in x-amz-access-token header.
    NO SigV4 signing (removed by Amazon Oct 2023).
    """
    if config is None:
        config = get_config()

    access_token = get_lwa_access_token(config)
    base_url = config["endpoint"]

    url = f"{base_url}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)

    headers = {
        "x-amz-access-token": access_token,
        "Content-Type": "application/json",
        "User-Agent": "OpenClaw-AmazonSP/1.0 (Python stdlib)",
    }
    if extra_headers:
        headers.update(extra_headers)

    data = json.dumps(body).encode() if body else None

    last_error = None
    for attempt in range(max_retries):
        req = urllib.request.Request(url, data=data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                # Track rate limit info
                rate_limit = resp.headers.get("x-amzn-RateLimit-Limit")
                if rate_limit:
                    _log_rate_limit(path, rate_limit)

                resp_bytes = resp.read()

                if raw_response:
                    return resp_bytes

                return json.loads(resp_bytes) if resp_bytes else {}

        except urllib.error.HTTPError as e:
            last_error = e
            error_body = e.read().decode("utf-8", errors="replace")

            # Rate limited (429) — backoff and retry
            if e.code == 429:
                wait = (2 ** attempt) + 0.5
                print(f"  Rate limited (429), waiting {wait:.1f}s before retry {attempt + 1}/{max_retries}...",
                      file=sys.stderr)
                time.sleep(wait)
                continue

            # 5xx server errors — retry with backoff
            if e.code >= 500:
                wait = (2 ** attempt) + 0.5
                print(f"  Server error ({e.code}), waiting {wait:.1f}s before retry {attempt + 1}/{max_retries}...",
                      file=sys.stderr)
                time.sleep(wait)
                continue

            # 403 with token expiry — refresh and retry once
            if e.code == 403 and attempt == 0:
                print("  Got 403, refreshing access token...", file=sys.stderr)
                access_token = get_lwa_access_token(config, force_refresh=True)
                headers["x-amz-access-token"] = access_token
                continue

            # Client error — don't retry
            try:
                err_json = json.loads(error_body)
                err_msg = err_json.get("errors", [{}])[0].get("message", error_body)
            except (json.JSONDecodeError, IndexError):
                err_msg = error_body
            print(f"ERROR: SP-API {method} {path} returned {e.code}: {err_msg}", file=sys.stderr)
            sys.exit(1)

        except urllib.error.URLError as e:
            last_error = e
            if attempt < max_retries - 1:
                wait = (2 ** attempt) + 0.5
                print(f"  Connection error: {e.reason}, retrying in {wait:.1f}s...", file=sys.stderr)
                time.sleep(wait)
                continue
            print(f"ERROR: SP-API request failed: {e.reason}", file=sys.stderr)
            sys.exit(1)

    print(f"ERROR: SP-API request failed after {max_retries} retries: {last_error}", file=sys.stderr)
    sys.exit(1)


def _log_rate_limit(path: str, rate_limit: str):
    """Log rate limit header for monitoring."""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOGS_DIR / "rate_limits.log"
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with open(log_file, "a") as f:
        f.write(f"{timestamp} | {path} | limit={rate_limit}\n")


# ---------------------------------------------------------------------------
# Report Helpers
# ---------------------------------------------------------------------------

def _safe_int(val) -> int:
    """Safely convert a value to int, handling float strings and non-numeric values."""
    try:
        return int(float(val)) if val else 0
    except (ValueError, TypeError):
        return 0


def _download_report_document(document_id: str, config: dict = None) -> str:
    """Download and decompress a report document. Handles GZIP bug gracefully."""
    if config is None:
        config = get_config()

    doc_info = sp_api_request("GET", f"/reports/2021-06-30/documents/{document_id}", config)

    download_url = doc_info.get("url")
    if not download_url:
        print("ERROR: No download URL in report document response", file=sys.stderr)
        sys.exit(1)

    compression = doc_info.get("compressionAlgorithm", "")

    # Download from pre-signed S3 URL (no auth headers needed)
    req = urllib.request.Request(download_url)
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw_bytes = resp.read()

    # Handle GZIP — with graceful fallback for Amazon's GZIP bug
    # (compressionAlgorithm may say GZIP but content isn't actually compressed)
    if compression.upper() == "GZIP":
        try:
            content = gzip.decompress(raw_bytes).decode("utf-8", errors="replace")
        except gzip.BadGzipFile:
            # GZIP bug: header says GZIP but content is plain text
            content = raw_bytes.decode("utf-8", errors="replace")
        except OSError as e:
            print(f"  Warning: GZIP decompression error ({e}), trying raw decode...", file=sys.stderr)
            content = raw_bytes.decode("utf-8", errors="replace")
    else:
        content = raw_bytes.decode("utf-8", errors="replace")

    return content


def _parse_tsv_report(content: str) -> list[dict]:
    """Parse tab-separated report content into list of dicts."""
    if not content.strip():
        return []
    reader = csv.DictReader(io.StringIO(content), delimiter="\t")
    return list(reader)


def _wait_for_report(report_id: str, config: dict, timeout: int = 300, poll_interval: int = 15) -> dict:
    """Poll report status until DONE, FATAL, or CANCELLED."""
    start = time.time()
    while time.time() - start < timeout:
        report = sp_api_request("GET", f"/reports/2021-06-30/reports/{report_id}", config)
        status = report.get("processingStatus", "")
        if status == "DONE":
            return report
        if status in ("FATAL", "CANCELLED"):
            print(f"ERROR: Report {report_id} status: {status}", file=sys.stderr)
            sys.exit(1)
        elapsed = int(time.time() - start)
        print(f"  Report status: {status} ({elapsed}s elapsed, polling every {poll_interval}s)...",
              file=sys.stderr)
        time.sleep(poll_interval)

    print(f"ERROR: Report {report_id} timed out after {timeout}s", file=sys.stderr)
    sys.exit(1)


def _cache_report(report_id: str, content: str):
    """Save report content to cache directory."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    cache_file = CACHE_DIR / f"{report_id}_{timestamp}.tsv"
    cache_file.write_text(content)
    return cache_file


def _save_inventory_snapshot(data: list[dict]):
    """Save inventory snapshot to history directory."""
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    snapshot_file = HISTORY_DIR / f"inventory_{timestamp}.json"
    snapshot_file.write_text(json.dumps(data, indent=2, default=str))
    return snapshot_file


# ---------------------------------------------------------------------------
# Command: validate-token
# ---------------------------------------------------------------------------

def cmd_validate_token(args: list[str]):
    """Validate LWA credentials and show token info."""
    config = get_config()
    print("Validating LWA credentials...")

    token = get_lwa_access_token(config, force_refresh=True)

    # Verify token works by calling a lightweight endpoint
    try:
        result = sp_api_request("GET", "/sellers/v1/marketplaceParticipations", config)
        participations = result.get("payload", [])
        print(f"\nSUCCESS: Token is valid")
        print(f"  Region:        {config['region']}")
        print(f"  Marketplace:   {config['marketplace_id']}")
        print(f"  Seller ID:     {config['seller_id']}")
        print(f"  Token cached:  {TOKEN_FILE}")
        if participations:
            print(f"\n  Marketplace Participations:")
            for p in participations:
                mp = p.get("marketplace", {})
                part = p.get("participation", {})
                name = mp.get("name", "Unknown")
                mp_id = mp.get("id", "?")
                is_participating = part.get("isParticipating", False)
                status = "ACTIVE" if is_participating else "INACTIVE"
                print(f"    {name} ({mp_id}) — {status}")
    except SystemExit:
        print("ERROR: Token obtained but API call failed. Check marketplace/seller config.",
              file=sys.stderr)
        sys.exit(1)


# ---------------------------------------------------------------------------
# Command: health-check
# ---------------------------------------------------------------------------

def cmd_health_check(args: list[str]):
    """Quick health check of all key endpoints."""
    config = get_config()
    print("Running SP-API health check...\n")

    checks = [
        ("LWA Token", lambda: get_lwa_access_token(config, force_refresh=True)),
        ("Sellers API", lambda: sp_api_request("GET", "/sellers/v1/marketplaceParticipations", config)),
        ("FBA Inventory API", lambda: sp_api_request("GET", "/fba/inventory/v1/summaries",
                                                      config, params={
                                                          "granularityType": "Marketplace",
                                                          "granularityId": config["marketplace_id"],
                                                          "marketplaceIds": config["marketplace_id"],
                                                      })),
        ("Reports API", lambda: sp_api_request("GET", "/reports/2021-06-30/reports",
                                                config, params={"reportTypes": "GET_MERCHANT_LISTINGS_DATA",
                                                                 "pageSize": "1"})),
    ]

    for name, check_fn in checks:
        try:
            check_fn()
            print(f"  [OK]   {name}")
        except SystemExit:
            print(f"  [FAIL] {name}")
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")

    print("\nHealth check complete.")


# ---------------------------------------------------------------------------
# Command: refresh-token
# ---------------------------------------------------------------------------

def cmd_refresh_token(args: list[str]):
    """Force-refresh the LWA access token."""
    config = get_config()
    token = get_lwa_access_token(config, force_refresh=True)
    print(f"Token refreshed successfully.")
    print(f"  Cached at: {TOKEN_FILE}")
    print(f"  First 20 chars: {token[:20]}...")


# ---------------------------------------------------------------------------
# Command: account-info
# ---------------------------------------------------------------------------

def cmd_account_info(args: list[str]):
    """Show account and marketplace participation info."""
    config = get_config()
    result = sp_api_request("GET", "/sellers/v1/marketplaceParticipations", config)
    participations = result.get("payload", [])

    print(f"ACCOUNT INFO")
    print(f"  Region:        {config['region']}")
    print(f"  Endpoint:      {config['endpoint']}")
    print(f"  Seller ID:     {config['seller_id']}")
    print(f"  Marketplace:   {config['marketplace_id']}")
    print(f"\nMARKETPLACE PARTICIPATIONS ({len(participations)}):")

    for p in participations:
        mp = p.get("marketplace", {})
        part = p.get("participation", {})
        name = mp.get("name", "Unknown")
        mp_id = mp.get("id", "?")
        country = mp.get("countryCode", "?")
        domain = mp.get("domainName", "?")
        is_active = part.get("isParticipating", False)
        has_sfp = part.get("hasSuspendedListings", False)
        status = "ACTIVE" if is_active else "INACTIVE"
        print(f"\n  {name} ({country})")
        print(f"    ID:       {mp_id}")
        print(f"    Domain:   {domain}")
        print(f"    Status:   {status}")
        if has_sfp:
            print(f"    WARNING:  Has suspended listings")


# ---------------------------------------------------------------------------
# Command: fba-inventory
# ---------------------------------------------------------------------------

def cmd_fba_inventory(args: list[str]):
    """Get real-time FBA inventory via getInventorySummaries."""
    config = get_config()
    granularity_raw = _get_arg(args, "--granularity", "Marketplace").upper()
    granularity = "ASIN" if granularity_raw == "ASIN" else "Marketplace"
    skus_filter = _get_arg(args, "--skus", "")
    next_token = _get_arg(args, "--next-token", "")

    params = {
        "granularityType": granularity,
        "granularityId": config["marketplace_id"],
        "marketplaceIds": config["marketplace_id"],
    }
    if skus_filter:
        params["sellerSkus"] = skus_filter.split(",")
    if next_token:
        params["nextToken"] = next_token

    all_items = []
    page = 0

    while True:
        result = sp_api_request("GET", "/fba/inventory/v1/summaries", config, params=params)
        payload = result.get("payload", result)

        items = payload.get("inventorySummaries", [])
        all_items.extend(items)
        page += 1

        # Check for pagination
        pagination = payload.get("pagination", result.get("pagination", {}))
        next_token_val = pagination.get("nextToken")

        if not next_token_val or page >= 50:  # Safety limit
            break

        params["nextToken"] = next_token_val
        print(f"  Fetching page {page + 1}...", file=sys.stderr)

    # Calculate summary stats
    total_available = 0
    total_inbound_working = 0
    total_inbound_shipped = 0
    total_inbound_receiving = 0
    total_reserved = 0
    total_unfulfillable = 0
    out_of_stock = []

    for item in all_items:
        inv = item.get("inventoryDetails", {})
        fulfillable = inv.get("fulfillableQuantity", 0)

        total_available += fulfillable

        # Reserved breakdown
        reserved = inv.get("reservedQuantity", {})
        res_total = reserved.get("totalReservedQuantity", 0) if isinstance(reserved, dict) else 0
        total_reserved += res_total

        # Inbound breakdown
        inbound_detail = inv.get("inboundWorkingQuantity", 0)
        shipped_detail = inv.get("inboundShippedQuantity", 0)
        receiving_detail = inv.get("inboundReceivingQuantity", 0)
        total_inbound_working += inbound_detail
        total_inbound_shipped += shipped_detail
        total_inbound_receiving += receiving_detail

        # Unfulfillable
        unfulfillable = inv.get("unfulfillableQuantity", {})
        unf_total = unfulfillable.get("totalUnfulfillableQuantity", 0) if isinstance(unfulfillable, dict) else unfulfillable
        total_unfulfillable += unf_total

        if fulfillable == 0:
            out_of_stock.append(item)

    total_inbound = total_inbound_working + total_inbound_shipped + total_inbound_receiving
    total_units = total_available + total_reserved + total_inbound + total_unfulfillable

    print(f"\nFBA INVENTORY SUMMARY")
    print(f"  Active SKUs:        {len(all_items)}")
    print(f"  Total Units:        {total_units:,}")
    print(f"  Available:          {total_available:,}")
    print(f"  Reserved:           {total_reserved:,}")
    print(f"  Inbound:            {total_inbound:,}")
    print(f"    Working:          {total_inbound_working:,}")
    print(f"    Shipped:          {total_inbound_shipped:,}")
    print(f"    Receiving:        {total_inbound_receiving:,}")
    print(f"  Unfulfillable:      {total_unfulfillable:,}")

    if out_of_stock:
        print(f"\nOUT OF STOCK ({len(out_of_stock)} SKUs):")
        for item in out_of_stock[:20]:
            sku = item.get("sellerSku", "?")
            asin = item.get("asin", "?")
            name = item.get("productName", "Unknown")[:50]
            print(f"  {sku}  {asin}  {name}")
        if len(out_of_stock) > 20:
            print(f"  ... and {len(out_of_stock) - 20} more")

    # Top 10 by available quantity
    sorted_items = sorted(all_items,
                          key=lambda x: x.get("inventoryDetails", {}).get("fulfillableQuantity", 0),
                          reverse=True)
    print(f"\nTOP 10 BY AVAILABLE QUANTITY:")
    print(f"  {'SKU':<25} {'ASIN':<12} {'Available':>10} {'Reserved':>10} {'Product'}")
    print(f"  {'---':<25} {'----':<12} {'---------':>10} {'--------':>10} {'-------'}")
    for item in sorted_items[:10]:
        sku = item.get("sellerSku", "?")[:25]
        asin = item.get("asin", "?")
        inv = item.get("inventoryDetails", {})
        avail = inv.get("fulfillableQuantity", 0)
        reserved = inv.get("reservedQuantity", {})
        res = reserved.get("totalReservedQuantity", 0) if isinstance(reserved, dict) else 0
        name = item.get("productName", "Unknown")[:40]
        print(f"  {sku:<25} {asin:<12} {avail:>10,} {res:>10,} {name}")

    # Save snapshot
    snapshot_file = _save_inventory_snapshot(all_items)
    print(f"\nSnapshot saved: {snapshot_file}")

    # CSV export — flatten inventory details for tabular output
    csv_path = _get_arg(args, "--csv", "")
    if csv_path:
        csv_rows = []
        for item in all_items:
            inv = item.get("inventoryDetails", {})
            reserved = inv.get("reservedQuantity", {})
            csv_rows.append({
                "sku": item.get("sellerSku", ""),
                "asin": item.get("asin", ""),
                "productName": item.get("productName", ""),
                "fulfillable": inv.get("fulfillableQuantity", 0),
                "reserved": reserved.get("totalReservedQuantity", 0) if isinstance(reserved, dict) else 0,
                "inboundWorking": inv.get("inboundWorkingQuantity", 0),
                "inboundShipped": inv.get("inboundShippedQuantity", 0),
                "inboundReceiving": inv.get("inboundReceivingQuantity", 0),
            })
        _write_csv_if_requested(["--csv", csv_path], csv_rows, "fba_inventory")

    # Output raw JSON if requested
    if "--json" in args:
        print(json.dumps(all_items, indent=2, default=str))


# ---------------------------------------------------------------------------
# Command: inventory-report
# ---------------------------------------------------------------------------

def cmd_inventory_report(args: list[str]):
    """Request, poll, and download an inventory report."""
    config = get_config()
    report_type = _get_arg(args, "--report-type", "")
    should_wait = "--wait" in args or "--no-wait" not in args  # Default: wait
    timeout = int(_get_arg(args, "--timeout", "300"))

    if not report_type:
        print("Available inventory report types:")
        for rt, desc in INVENTORY_REPORT_TYPES.items():
            print(f"  {rt}")
            print(f"    {desc}")
        print("\nUsage: inventory-report --report-type TYPE [--timeout SECS]")
        return

    if report_type not in ALL_REPORT_TYPES:
        print(f"WARNING: Unknown report type '{report_type}'. Proceeding anyway...", file=sys.stderr)

    # Create report
    print(f"Requesting report: {report_type}...")
    create_body = {
        "reportType": report_type,
        "marketplaceIds": [config["marketplace_id"]],
    }
    result = sp_api_request("POST", "/reports/2021-06-30/reports", config, body=create_body)
    report_id = result.get("reportId")
    if not report_id:
        print(f"ERROR: No reportId in response: {json.dumps(result)}", file=sys.stderr)
        sys.exit(1)

    print(f"  Report ID: {report_id}")

    if not should_wait:
        print(f"Report created. Check status with: get-report-status --report-id {report_id}")
        return

    # Wait for completion
    print(f"  Waiting for report (timeout: {timeout}s)...")
    report = _wait_for_report(report_id, config, timeout=timeout)
    document_id = report.get("reportDocumentId")

    if not document_id:
        print(f"ERROR: Report DONE but no reportDocumentId", file=sys.stderr)
        sys.exit(1)

    # Download
    print(f"  Downloading document: {document_id}...")
    content = _download_report_document(document_id, config)
    rows = _parse_tsv_report(content)

    # Cache
    cache_file = _cache_report(report_id, content)
    print(f"  Cached: {cache_file}")

    # Summary
    print(f"\nREPORT: {report_type}")
    print(f"  Rows: {len(rows)}")
    if rows:
        print(f"  Columns: {', '.join(rows[0].keys())}")
        print(f"\n  First 10 rows:")
        for row in rows[:10]:
            # Show key fields
            sku = row.get("sku", row.get("seller-sku", row.get("Seller SKU", "?")))
            asin = row.get("asin", row.get("ASIN", "?"))
            qty = row.get("quantity", row.get("afn-fulfillable-quantity",
                          row.get("Quantity Available", "?")))
            name = row.get("product-name", row.get("Product Name",
                          row.get("item-name", "?")))[:50]
            print(f"    {sku:<25} {asin:<12} qty={qty:<8} {name}")

        if len(rows) > 10:
            print(f"    ... {len(rows) - 10} more rows in {cache_file}")

    _write_csv_if_requested(args, rows, "report")

    # Also output full JSON if requested
    if "--json" in args:
        print(json.dumps(rows, indent=2, default=str))


# ---------------------------------------------------------------------------
# Command: inventory-summary
# ---------------------------------------------------------------------------

def cmd_inventory_summary(args: list[str]):
    """Combined FBA + merchant inventory overview."""
    config = get_config()

    print("Fetching FBA inventory (real-time API)...")
    # Get FBA inventory
    fba_params = {
        "granularityType": "Marketplace",
        "granularityId": config["marketplace_id"],
        "marketplaceIds": config["marketplace_id"],
    }
    fba_items = []
    page = 0
    while True:
        page += 1
        result = sp_api_request("GET", "/fba/inventory/v1/summaries", config, params=fba_params)
        payload = result.get("payload", result)
        items = payload.get("inventorySummaries", [])
        fba_items.extend(items)
        pagination = payload.get("pagination", result.get("pagination", {}))
        next_token = pagination.get("nextToken")
        if not next_token or page >= 50:
            break
        fba_params["nextToken"] = next_token

    # Get merchant listings report (check for recent cached version first)
    print("Requesting merchant listings report...")
    create_body = {
        "reportType": "GET_MERCHANT_LISTINGS_DATA",
        "marketplaceIds": [config["marketplace_id"]],
    }
    result = sp_api_request("POST", "/reports/2021-06-30/reports", config, body=create_body)
    report_id = result.get("reportId")

    merchant_items = []
    if report_id:
        try:
            report = _wait_for_report(report_id, config, timeout=120)
            doc_id = report.get("reportDocumentId")
            if doc_id:
                content = _download_report_document(doc_id, config)
                merchant_items = _parse_tsv_report(content)
        except SystemExit:
            print("  Warning: Merchant listings report failed, showing FBA only", file=sys.stderr)

    # Summarize
    fba_skus = {item.get("sellerSku") for item in fba_items}
    merchant_skus = {item.get("seller-sku", item.get("sku")) for item in merchant_items}

    total_available_fba = sum(
        item.get("inventoryDetails", {}).get("fulfillableQuantity", 0)
        for item in fba_items
    )
    total_merchant = sum(
        _safe_int(item.get("quantity", item.get("Quantity Available", 0)))
        for item in merchant_items
    )

    print(f"\nINVENTORY SUMMARY (FBA + Merchant)")
    print(f"  FBA SKUs:             {len(fba_items)}")
    print(f"  FBA Available Units:  {total_available_fba:,}")
    print(f"  Merchant SKUs:        {len(merchant_items)}")
    print(f"  Merchant Units:       {total_merchant:,}")
    print(f"  FBA-only SKUs:        {len(fba_skus - merchant_skus)}")
    print(f"  Merchant-only SKUs:   {len(merchant_skus - fba_skus)}")
    print(f"  Both channels:        {len(fba_skus & merchant_skus)}")


# ---------------------------------------------------------------------------
# Command: low-stock
# ---------------------------------------------------------------------------

def cmd_low_stock(args: list[str]):
    """Show FBA items below stock threshold."""
    config = get_config()
    threshold = int(_get_arg(args, "--threshold", "14"))

    params = {
        "granularityType": "Marketplace",
        "granularityId": config["marketplace_id"],
        "marketplaceIds": config["marketplace_id"],
    }

    all_items = []
    page = 0
    while True:
        page += 1
        result = sp_api_request("GET", "/fba/inventory/v1/summaries", config, params=params)
        payload = result.get("payload", result)
        items = payload.get("inventorySummaries", [])
        all_items.extend(items)
        pagination = payload.get("pagination", result.get("pagination", {}))
        next_token = pagination.get("nextToken")
        if not next_token or page >= 50:
            break
        params["nextToken"] = next_token

    # Filter to low stock
    low_stock = []
    out_of_stock = []
    for item in all_items:
        inv = item.get("inventoryDetails", {})
        avail = inv.get("fulfillableQuantity", 0)
        if avail == 0:
            out_of_stock.append(item)
        elif avail <= threshold:
            low_stock.append(item)

    low_stock.sort(key=lambda x: x.get("inventoryDetails", {}).get("fulfillableQuantity", 0))

    print(f"LOW STOCK REPORT (threshold: <= {threshold} units)")
    print(f"  Total SKUs scanned: {len(all_items)}")
    print(f"  Low stock:          {len(low_stock)}")
    print(f"  Out of stock:       {len(out_of_stock)}")

    if out_of_stock:
        print(f"\nOUT OF STOCK ({len(out_of_stock)}):")
        print(f"  {'SKU':<25} {'ASIN':<12} {'Product'}")
        print(f"  {'---':<25} {'----':<12} {'-------'}")
        for item in out_of_stock:
            sku = item.get("sellerSku", "?")[:25]
            asin = item.get("asin", "?")
            name = item.get("productName", "Unknown")[:50]
            print(f"  {sku:<25} {asin:<12} {name}")

    if low_stock:
        print(f"\nLOW STOCK ({len(low_stock)}):")
        print(f"  {'SKU':<25} {'ASIN':<12} {'Available':>10} {'Reserved':>10} {'Product'}")
        print(f"  {'---':<25} {'----':<12} {'---------':>10} {'--------':>10} {'-------'}")
        for item in low_stock:
            sku = item.get("sellerSku", "?")[:25]
            asin = item.get("asin", "?")
            inv = item.get("inventoryDetails", {})
            avail = inv.get("fulfillableQuantity", 0)
            reserved = inv.get("reservedQuantity", {})
            res = reserved.get("totalReservedQuantity", 0) if isinstance(reserved, dict) else 0
            name = item.get("productName", "Unknown")[:40]
            print(f"  {sku:<25} {asin:<12} {avail:>10,} {res:>10,} {name}")


# ---------------------------------------------------------------------------
# Command: list-reports
# ---------------------------------------------------------------------------

def cmd_list_reports(args: list[str]):
    """List recent reports."""
    config = get_config()
    report_type = _get_arg(args, "--type", "")
    limit = int(_get_arg(args, "--limit", "10"))
    status = _get_arg(args, "--status", "")

    params = {"pageSize": str(min(limit, 100))}
    if report_type:
        params["reportTypes"] = report_type
    if status:
        params["processingStatuses"] = status

    result = sp_api_request("GET", "/reports/2021-06-30/reports", config, params=params)
    reports = result.get("reports", [])

    print(f"RECENT REPORTS ({len(reports)}):")
    print(f"  {'Report ID':<25} {'Type':<45} {'Status':<12} {'Created'}")
    print(f"  {'---------':<25} {'----':<45} {'------':<12} {'-------'}")
    for r in reports[:limit]:
        rid = r.get("reportId", "?")[:25]
        rtype = r.get("reportType", "?")[:45]
        rstatus = r.get("processingStatus", "?")
        created = r.get("createdTime", "?")[:19]
        print(f"  {rid:<25} {rtype:<45} {rstatus:<12} {created}")


# ---------------------------------------------------------------------------
# Command: download-report
# ---------------------------------------------------------------------------

def cmd_download_report(args: list[str]):
    """Download a specific report by ID."""
    config = get_config()
    report_id = _get_arg(args, "--report-id", "")
    output_path = _get_arg(args, "--output", "")

    if not report_id:
        print("Usage: download-report --report-id ID [--output PATH]", file=sys.stderr)
        sys.exit(1)

    # Get report info
    report = sp_api_request("GET", f"/reports/2021-06-30/reports/{report_id}", config)
    status = report.get("processingStatus", "")
    if status != "DONE":
        print(f"ERROR: Report status is '{status}', not DONE", file=sys.stderr)
        sys.exit(1)

    document_id = report.get("reportDocumentId")
    if not document_id:
        print("ERROR: No reportDocumentId in report", file=sys.stderr)
        sys.exit(1)

    content = _download_report_document(document_id, config)

    if output_path:
        pathlib.Path(output_path).write_text(content)
        print(f"Report saved to: {output_path}")
    else:
        cache_file = _cache_report(report_id, content)
        print(f"Report saved to: {cache_file}")

    rows = _parse_tsv_report(content)
    print(f"  Rows: {len(rows)}")
    if rows:
        print(f"  Columns: {', '.join(rows[0].keys())}")


# ---------------------------------------------------------------------------
# Command: get-report-status
# ---------------------------------------------------------------------------

def cmd_get_report_status(args: list[str]):
    """Check status of a report."""
    config = get_config()
    report_id = _get_arg(args, "--report-id", "")

    if not report_id:
        print("Usage: get-report-status --report-id ID", file=sys.stderr)
        sys.exit(1)

    report = sp_api_request("GET", f"/reports/2021-06-30/reports/{report_id}", config)
    print(f"Report: {report_id}")
    print(f"  Type:     {report.get('reportType', '?')}")
    print(f"  Status:   {report.get('processingStatus', '?')}")
    print(f"  Created:  {report.get('createdTime', '?')}")
    if report.get("processingEndTime"):
        print(f"  Finished: {report['processingEndTime']}")
    if report.get("reportDocumentId"):
        print(f"  Document: {report['reportDocumentId']}")


# ---------------------------------------------------------------------------
# Command: orders (v2026-01-01)
# ---------------------------------------------------------------------------

def cmd_orders(args: list[str]):
    """List orders using Orders API v2026-01-01 (searchOrders)."""
    config = get_config()
    since = _get_arg(args, "--since", "")
    until = _get_arg(args, "--until", "")
    status = _get_arg(args, "--status", "")
    limit = int(_get_arg(args, "--limit", "20"))
    next_token = _get_arg(args, "--next-token", "")

    if not since:
        # Default to last 7 days
        since = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)).strftime("%Y-%m-%d")

    # Build searchOrders query params (v2026-01-01 uses camelCase)
    params = {
        "marketplaceIds": [config["marketplace_id"]],
        "lastUpdatedAfter": f"{since}T00:00:00Z",
        "maxResultsPerPage": str(min(limit, 100)),
    }
    if until:
        params["lastUpdatedBefore"] = f"{until}T23:59:59Z"
    if status:
        # v2026-01-01 uses fulfillmentStatuses with SCREAMING_SNAKE_CASE values
        # Accept both "Unshipped" and "UNSHIPPED" formats from user
        statuses = [s.strip().upper().replace(" ", "_") for s in status.split(",")]
        # Handle concatenated words that need underscores
        status_map = {
            "PARTIALLYSHIPPED": "PARTIALLY_SHIPPED",
            "PENDINGAVAILABILITY": "PENDING_AVAILABILITY",
        }
        statuses = [status_map.get(s, s) for s in statuses]
        params["fulfillmentStatuses"] = statuses
    if next_token:
        params["paginationToken"] = next_token

    result = sp_api_request("GET", "/orders/2026-01-01/orders", config, params=params)

    orders = result.get("orders", [])

    print(f"ORDERS (since {since}):")
    print(f"  {'Order ID':<22} {'Date':<12} {'Status':<20} {'Total':>10} {'Fulfilled By'}")
    print(f"  {'--------':<22} {'----':<12} {'------':<20} {'-----':>10} {'------------'}")

    for order in orders[:limit]:
        order_id = order.get("orderId", order.get("amazonOrderId", "?"))
        created = str(order.get("createdTime", order.get("purchaseDate", "?")) or "?")[:10]
        # v2026-01-01: status is in fulfillment object
        fulfillment = order.get("fulfillment", {})
        order_status = fulfillment.get("status", order.get("orderStatus", "?"))
        fulfilled_by = fulfillment.get("fulfilledBy", order.get("fulfillmentChannel", "?"))
        # v2026-01-01: total is in proceeds object
        proceeds = order.get("proceeds", order.get("orderTotal", {}))
        if proceeds:
            total_amount = proceeds.get("total", proceeds.get("Amount", proceeds.get("amount", {})))
            if isinstance(total_amount, dict):
                total_str = f"{total_amount.get('currencyCode', 'USD')} {total_amount.get('amount', '?')}"
            else:
                currency = proceeds.get("currencyCode", "USD")
                total_str = f"{currency} {total_amount}" if total_amount else "?"
        else:
            total_str = "?"

        print(f"  {order_id:<22} {created:<12} {order_status:<20} {total_str:>10} {fulfilled_by}")

    # Pagination info (v2026-01-01 uses pagination.paginationToken)
    pagination = result.get("pagination", {})
    next_tok = pagination.get("paginationToken")
    if next_tok:
        print(f"\n  More results available. Use: orders --since {since} --next-token {next_tok}")

    print(f"\n  Total shown: {min(len(orders), limit)}")

    # CSV export for orders
    csv_path = _get_arg(args, "--csv", "")
    if csv_path and orders:
        csv_rows = []
        for order in orders[:limit]:
            oid = order.get("orderId", order.get("amazonOrderId", "?"))
            created_val = str(order.get("createdTime", order.get("purchaseDate", "?")) or "?")[:10]
            ff = order.get("fulfillment", {})
            status_val = ff.get("status", order.get("orderStatus", "?"))
            fulfilled_val = ff.get("fulfilledBy", order.get("fulfillmentChannel", "?"))
            procs = order.get("proceeds", order.get("orderTotal", {}))
            if procs:
                t = procs.get("total", procs.get("amount", procs.get("Amount", {})))
                total_csv = t.get("amount", t) if isinstance(t, dict) else str(t)
            else:
                total_csv = "?"
            csv_rows.append({
                "orderId": oid, "date": created_val,
                "status": status_val, "total": total_csv,
                "fulfilledBy": fulfilled_val,
            })
        _write_csv_if_requested(["--csv", csv_path], csv_rows, "orders")


# ---------------------------------------------------------------------------
# Command: order (single order detail, v2026-01-01)
# ---------------------------------------------------------------------------

def cmd_order(args: list[str]):
    """Get single order details using Orders API v2026-01-01."""
    config = get_config()
    order_id = _get_arg(args, "--order-id", "")

    if not order_id:
        print("Usage: order --order-id 123-4567890-1234567", file=sys.stderr)
        sys.exit(1)

    # V3 fix: pass includedData=items so the response includes order line items
    result = sp_api_request("GET", f"/orders/2026-01-01/orders/{order_id}", config,
                            params={"includedData": "items"})
    order = result.get("order", result.get("payload", result))

    # v2026-01-01 field names (with v0 fallbacks)
    oid = order.get("orderId", order.get("amazonOrderId", order_id))
    created = order.get("createdTime", order.get("purchaseDate", "?"))
    updated = order.get("lastUpdatedTime", order.get("lastUpdateDate", "?"))
    fulfillment = order.get("fulfillment", {})
    status = fulfillment.get("status", order.get("orderStatus", "?"))
    fulfilled_by = fulfillment.get("fulfilledBy", order.get("fulfillmentChannel", "?"))
    ship_service = fulfillment.get("shipServiceLevel", order.get("shipServiceLevel", "?"))
    # v2026-01-01: salesChannel is an object {channelName, marketplaceId}
    sales_ch = order.get("salesChannel", "?")
    if isinstance(sales_ch, dict):
        sales_ch = sales_ch.get("channelName", "?")
    # v2026-01-01: programs object holds isPrime, isBusinessOrder, etc.
    programs = order.get("programs", {})
    is_prime = programs.get("isPrime", order.get("isPrime", "?"))
    is_business = programs.get("isBusinessOrder", order.get("isBusinessOrder", "?"))

    print(f"ORDER DETAILS: {oid}")
    print(f"  Status:           {status}")
    print(f"  Created:          {created}")
    print(f"  Last Updated:     {updated}")
    print(f"  Fulfilled By:     {fulfilled_by}")
    print(f"  Ship Service:     {ship_service}")
    print(f"  Sales Channel:    {sales_ch}")

    # v2026-01-01: total is in proceeds object
    proceeds = order.get("proceeds", order.get("orderTotal", {}))
    if proceeds:
        total = proceeds.get("total", proceeds)
        if isinstance(total, dict):
            print(f"  Order Total:      {total.get('currencyCode', '?')} {total.get('amount', '?')}")
        else:
            print(f"  Order Total:      {total}")

    print(f"  Is Prime:         {is_prime}")
    print(f"  Is Business:      {is_business}")

    # v2026-01-01 getOrder includes items in the response
    items = order.get("items", order.get("orderItems", []))
    if items:
        print(f"\n  ORDER ITEMS ({len(items)}):")
        for item in items:
            asin = item.get("asin", item.get("ASIN", "?"))
            sku = item.get("sellerSku", item.get("SellerSKU", "?"))
            title = str(item.get("title", item.get("Title", "?")))[:50]
            qty = item.get("quantityOrdered", item.get("QuantityOrdered", 0))
            price = item.get("itemPrice", item.get("ItemPrice", {}))
            if isinstance(price, dict):
                price_str = f"{price.get('currencyCode', '?')} {price.get('amount', '?')}"
            else:
                price_str = str(price) if price else "?"
            print(f"    {asin}  {sku:<20}  qty={qty}  {price_str}  {title}")

    if "--json" in args:
        print(f"\n{json.dumps(order, indent=2, default=str)}")


# ---------------------------------------------------------------------------
# Command: catalog-search
# ---------------------------------------------------------------------------

def cmd_catalog_search(args: list[str]):
    """Search catalog items using Catalog Items v2022-04-01."""
    config = get_config()
    keywords = _get_arg(args, "--keywords", "")
    limit = int(_get_arg(args, "--limit", "10"))

    if not keywords:
        print("Usage: catalog-search --keywords TEXT [--limit N]", file=sys.stderr)
        sys.exit(1)

    params = {
        "keywords": keywords,
        "marketplaceIds": [config["marketplace_id"]],
        "pageSize": str(min(limit, 20)),
        "includedData": "summaries,images",
    }

    result = sp_api_request("GET", "/catalog/2022-04-01/items", config, params=params)
    items = result.get("items", [])

    print(f"CATALOG SEARCH: '{keywords}' ({len(items)} results)")
    print(f"  {'ASIN':<12} {'Title'}")
    print(f"  {'----':<12} {'-----'}")
    for item in items[:limit]:
        asin = item.get("asin", "?")
        summaries = item.get("summaries", [{}])
        title = summaries[0].get("itemName", "Unknown")[:70] if summaries else "Unknown"
        print(f"  {asin:<12} {title}")


# ---------------------------------------------------------------------------
# Command: catalog-item
# ---------------------------------------------------------------------------

def cmd_catalog_item(args: list[str]):
    """Get catalog item details by ASIN."""
    config = get_config()
    asin = _get_arg(args, "--asin", "")

    if not asin:
        print("Usage: catalog-item --asin B0XXXXXXXX", file=sys.stderr)
        sys.exit(1)

    params = {
        "marketplaceIds": [config["marketplace_id"]],
        "includedData": "summaries,attributes,images,productTypes,salesRanks",
    }

    result = sp_api_request("GET", f"/catalog/2022-04-01/items/{asin}", config, params=params)

    summaries = result.get("summaries", [{}])
    summary = summaries[0] if summaries else {}

    print(f"CATALOG ITEM: {asin}")
    print(f"  Title:          {summary.get('itemName', '?')}")
    print(f"  Brand:          {summary.get('brand', '?')}")
    print(f"  Manufacturer:   {summary.get('manufacturer', '?')}")
    print(f"  Product Type:   {summary.get('productType', '?')}")
    print(f"  Marketplace:    {summary.get('marketplaceId', '?')}")

    # Sales ranks
    ranks = result.get("salesRanks", [])
    if ranks:
        print(f"\n  SALES RANKS:")
        for rank_set in ranks:
            for rank in rank_set.get("ranks", []):
                title_r = rank.get("title", "?")
                value = rank.get("value", "?")
                print(f"    #{value} in {title_r}")

    # Product types
    ptypes = result.get("productTypes", [])
    if ptypes:
        print(f"\n  PRODUCT TYPES: {', '.join(pt.get('productType', '?') for pt in ptypes)}")

    if "--json" in args:
        print(f"\n{json.dumps(result, indent=2, default=str)}")


# ---------------------------------------------------------------------------
# Command: pricing
# ---------------------------------------------------------------------------

def cmd_pricing(args: list[str]):
    """Get competitive pricing for an ASIN."""
    config = get_config()
    asin = _get_arg(args, "--asin", "")

    if not asin:
        print("Usage: pricing --asin B0XXXXXXXX", file=sys.stderr)
        sys.exit(1)

    # Get competitive pricing via batch endpoint (POST)
    # Required fields per OpenAPI spec: asin, marketplaceId, includedData, method, uri
    result = sp_api_request("POST", "/batches/products/pricing/2022-05-01/items/competitiveSummary",
                            config, body={
                                "requests": [{
                                    "asin": asin,
                                    "marketplaceId": config["marketplace_id"],
                                    "includedData": ["featuredBuyingOptions"],
                                    "method": "GET",
                                    "uri": f"/products/pricing/2022-05-01/items/{asin}/competitiveSummary",
                                }]
                            })

    print(f"PRICING: {asin}")

    # V1 fix: batch endpoint may wrap in responses[] envelope
    pricing_data = result
    responses = result.get("responses", [])
    if responses:
        body = responses[0].get("body", {})
        if body:
            pricing_data = body

    # Handle various response formats
    if "asinCompetitivePricing" in pricing_data:
        for pricing in pricing_data["asinCompetitivePricing"]:
            featured = pricing.get("featuredBuyingOptions", [])
            if featured:
                print(f"\n  FEATURED BUYING OPTIONS (Buy Box):")
                for opt in featured:
                    condition = opt.get("condition", "?")
                    price_info = opt.get("price", {})
                    listing_price = price_info.get("listingPrice", {})
                    amount = listing_price.get("amount", "?")
                    currency = listing_price.get("currencyCode", "USD")
                    print(f"    {condition}: {currency} {amount}")

            comp_prices = pricing.get("competitivePrices", [])
            if comp_prices:
                print(f"\n  COMPETITIVE PRICES:")
                for cp in comp_prices:
                    belongs = cp.get("belongsToRequester", False)
                    condition = cp.get("condition", "?")
                    price_val = cp.get("price", {}).get("listingPrice", {})
                    amount = price_val.get("amount", "?")
                    currency = price_val.get("currencyCode", "USD")
                    yours = " (YOUR OFFER)" if belongs else ""
                    print(f"    {condition}: {currency} {amount}{yours}")
    else:
        print(f"  Response: {json.dumps(pricing_data, indent=2, default=str)}")

    if "--json" in args:
        print(f"\n{json.dumps(result, indent=2, default=str)}")


# ---------------------------------------------------------------------------
# Command: fees
# ---------------------------------------------------------------------------

def cmd_fees(args: list[str]):
    """Estimate fees for an ASIN at a given price."""
    config = get_config()
    asin = _get_arg(args, "--asin", "")
    price = _get_arg(args, "--price", "")

    if not asin or not price:
        print("Usage: fees --asin B0XXXXXXXX --price 29.99", file=sys.stderr)
        sys.exit(1)

    body = {
        "FeesEstimateRequest": {
            "MarketplaceId": config["marketplace_id"],
            "IsAmazonFulfilled": True,
            "PriceToEstimateFees": {
                "ListingPrice": {
                    "CurrencyCode": "USD",
                    "Amount": float(price),
                },
            },
            "Identifier": f"fee-estimate-{asin}",
        }
    }

    result = sp_api_request("POST",
                            f"/products/fees/v0/items/{asin}/feesEstimate",
                            config, body=body)

    payload = result.get("payload", result)
    estimate = payload.get("FeesEstimateResult", {})
    fee_detail = estimate.get("FeesEstimate", {})

    print(f"FEE ESTIMATE: {asin} at ${price}")

    total = fee_detail.get("TotalFeesEstimate", {})
    if total:
        print(f"  Total Fees: {total.get('CurrencyCode', 'USD')} {total.get('Amount', '?')}")

    fee_details = fee_detail.get("FeeDetailList", [])
    if fee_details:
        print(f"\n  FEE BREAKDOWN:")
        for fd in fee_details:
            fee_type = fd.get("FeeType", "?")
            fee_amount = fd.get("FeeAmount", {})
            amount = fee_amount.get("Amount", "?")
            currency = fee_amount.get("CurrencyCode", "USD")
            print(f"    {fee_type}: {currency} {amount}")

    # Margin calculation
    if total and total.get("Amount"):
        total_fees = float(total["Amount"])
        selling_price = float(price)
        margin = selling_price - total_fees
        margin_pct = (margin / selling_price * 100) if selling_price else 0
        print(f"\n  MARGIN ANALYSIS:")
        print(f"    Selling Price:  ${selling_price:.2f}")
        print(f"    Total Fees:     ${total_fees:.2f}")
        print(f"    Margin:         ${margin:.2f} ({margin_pct:.1f}%)")
        print(f"    (excludes COGS)")


# ---------------------------------------------------------------------------
# Command: listing
# ---------------------------------------------------------------------------

def cmd_listing(args: list[str]):
    """Get listing details for a SKU."""
    config = get_config()
    sku = _get_arg(args, "--sku", "")

    if not sku:
        print("Usage: listing --sku YOUR-SKU-123", file=sys.stderr)
        sys.exit(1)

    params = {
        "marketplaceIds": [config["marketplace_id"]],
        "includedData": "summaries,attributes,issues,offers,fulfillmentAvailability",
    }

    result = sp_api_request("GET",
                            f"/listings/2021-08-01/items/{config['seller_id']}/{urllib.parse.quote(sku)}",
                            config, params=params)

    print(f"LISTING: {sku}")

    summaries = result.get("summaries", [{}])
    if summaries:
        s = summaries[0]
        print(f"  ASIN:           {s.get('asin', '?')}")
        print(f"  Product Type:   {s.get('productType', '?')}")
        print(f"  Status:         {', '.join(s.get('status', ['?']))}")
        print(f"  Item Name:      {s.get('itemName', '?')}")
        print(f"  Created:        {s.get('createdDate', '?')}")
        print(f"  Last Updated:   {s.get('lastUpdatedDate', '?')}")

    issues = result.get("issues", [])
    if issues:
        print(f"\n  ISSUES ({len(issues)}):")
        for issue in issues:
            severity = issue.get("severity", "?")
            message = issue.get("message", "?")
            print(f"    [{severity}] {message}")

    offers = result.get("offers", [])
    if offers:
        print(f"\n  OFFERS ({len(offers)}):")
        for offer in offers:
            mp = offer.get("marketplaceId", "?")
            offer_type = offer.get("offerType", "?")
            price_obj = offer.get("price", {})
            print(f"    {mp}: {offer_type} — {json.dumps(price_obj)}")

    fulfillment = result.get("fulfillmentAvailability", [])
    if fulfillment:
        print(f"\n  FULFILLMENT AVAILABILITY:")
        for fa in fulfillment:
            fc = fa.get("fulfillmentChannelCode", "?")
            qty = fa.get("quantity", "?")
            print(f"    {fc}: {qty} units")

    if "--json" in args:
        print(f"\n{json.dumps(result, indent=2, default=str)}")


# ---------------------------------------------------------------------------
# Command: create-feed
# ---------------------------------------------------------------------------

def cmd_create_feed(args: list[str]):
    """Create a JSON_LISTINGS_FEED from a JSON file."""
    config = get_config()
    file_path = _get_arg(args, "--file", "")

    if not file_path:
        print("Usage: create-feed --file path/to/feed.json", file=sys.stderr)
        print("\nThe file must be a valid JSON_LISTINGS_FEED document.", file=sys.stderr)
        print("See references/08-feeds-api.md for format details.", file=sys.stderr)
        sys.exit(1)

    feed_path = pathlib.Path(file_path)
    if not feed_path.exists():
        print(f"ERROR: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)

    feed_content = feed_path.read_text()

    # Validate it's JSON
    try:
        json.loads(feed_content)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in feed file: {e}", file=sys.stderr)
        sys.exit(1)

    # Step 1: Create feed document
    print("Creating feed document...")
    doc_body = {
        "contentType": "application/json; charset=UTF-8",
    }
    doc_result = sp_api_request("POST", "/feeds/2021-06-30/documents", config, body=doc_body)
    document_id = doc_result.get("feedDocumentId")
    upload_url = doc_result.get("url")

    if not document_id or not upload_url:
        print(f"ERROR: Failed to create feed document: {json.dumps(doc_result)}", file=sys.stderr)
        sys.exit(1)

    # Step 2: Upload content to pre-signed URL
    print(f"  Uploading feed content ({len(feed_content)} bytes)...")
    upload_req = urllib.request.Request(upload_url, data=feed_content.encode("utf-8"), method="PUT")
    upload_req.add_header("Content-Type", "application/json; charset=UTF-8")
    try:
        with urllib.request.urlopen(upload_req, timeout=120) as resp:
            pass
    except urllib.error.HTTPError as e:
        print(f"ERROR: Upload failed ({e.code}): {e.read().decode()}", file=sys.stderr)
        sys.exit(1)

    # Step 3: Create feed
    print("  Submitting feed...")
    feed_body = {
        "feedType": "JSON_LISTINGS_FEED",
        "marketplaceIds": [config["marketplace_id"]],
        "inputFeedDocumentId": document_id,
    }
    feed_result = sp_api_request("POST", "/feeds/2021-06-30/feeds", config, body=feed_body)
    feed_id = feed_result.get("feedId")

    print(f"\nFeed created successfully!")
    print(f"  Feed ID:     {feed_id}")
    print(f"  Document ID: {document_id}")
    print(f"  Type:        JSON_LISTINGS_FEED")
    print(f"\nCheck status: feed-status --feed-id {feed_id}")


# ---------------------------------------------------------------------------
# Command: feed-status
# ---------------------------------------------------------------------------

def cmd_feed_status(args: list[str]):
    """Check feed processing status."""
    config = get_config()
    feed_id = _get_arg(args, "--feed-id", "")

    if not feed_id:
        print("Usage: feed-status --feed-id ID", file=sys.stderr)
        sys.exit(1)

    result = sp_api_request("GET", f"/feeds/2021-06-30/feeds/{feed_id}", config)

    print(f"FEED STATUS: {feed_id}")
    print(f"  Type:         {result.get('feedType', '?')}")
    print(f"  Status:       {result.get('processingStatus', '?')}")
    print(f"  Created:      {result.get('createdTime', '?')}")
    print(f"  Started:      {result.get('processingStartTime', '?')}")
    print(f"  Finished:     {result.get('processingEndTime', '?')}")

    result_doc_id = result.get("resultFeedDocumentId")
    if result_doc_id:
        print(f"  Result Doc:   {result_doc_id}")
        # Download and show results
        try:
            content = _download_report_document(result_doc_id, config)
            if not content or not content.strip():
                print("\n  (No processing results available)", file=sys.stderr)
            else:
                result_data = json.loads(content)
                print(f"\n  PROCESSING RESULTS:")
                summary = result_data.get("summary", {})
                print(f"    Items processed: {summary.get('messagesProcessed', '?')}")
                print(f"    Items accepted:  {summary.get('messagesAccepted', '?')}")
                print(f"    Items invalid:   {summary.get('messagesInvalid', '?')}")

                errors = result_data.get("issues", [])
                if errors:
                    print(f"\n    ERRORS ({len(errors)}):")
                    for err in errors[:10]:
                        print(f"      [{err.get('severity', '?')}] {err.get('message', '?')}")
        except json.JSONDecodeError:
            print("\n  (Feed result document is not JSON — may be TSV/text)", file=sys.stderr)
        except Exception:
            pass  # Other errors — skip gracefully


# ---------------------------------------------------------------------------
# Command: financial-events (v2024-06-19)
# ---------------------------------------------------------------------------

def cmd_financial_events(args: list[str]):
    """Get financial events using Finances v2024-06-19 (NOT v0)."""
    config = get_config()
    since = _get_arg(args, "--since", "")
    until = _get_arg(args, "--until", "")
    limit = int(_get_arg(args, "--limit", "50"))
    next_token = _get_arg(args, "--next-token", "")

    if not since:
        since = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)).strftime("%Y-%m-%d")

    # V4 fix: v2024-06-19 may use pageSize instead of maxResultsPerPage.
    # Send both — the API ignores unrecognized params.
    page_limit = str(min(limit, 100))
    params = {
        "postedAfter": f"{since}T00:00:00Z",
        "maxResultsPerPage": page_limit,
        "pageSize": page_limit,
    }
    if until:
        params["postedBefore"] = f"{until}T23:59:59Z"
    if next_token:
        params["nextToken"] = next_token

    result = sp_api_request("GET", "/finances/2024-06-19/transactions", config, params=params)

    transactions = result.get("transactions", result.get("payload", {}).get("FinancialEvents", []))

    print(f"FINANCIAL EVENTS (since {since}):")

    if isinstance(transactions, list):
        print(f"  Total: {len(transactions)}")
        for txn in transactions[:limit]:
            txn_type = txn.get("transactionType", txn.get("type", "?"))
            posted = str(txn.get("postedDate", txn.get("PostedDate", "?")) or "?")[:10]
            amount = txn.get("totalAmount", txn.get("amount", {}))
            if isinstance(amount, dict):
                amt_str = f"{amount.get('currencyCode', amount.get('CurrencyCode', 'USD'))} {amount.get('amount', amount.get('Amount', '?'))}"
            else:
                amt_str = str(amount)
            desc = str(txn.get("description", txn.get("Description", "")) or "")[:50]
            print(f"  {posted}  {txn_type:<25} {amt_str:>12}  {desc}")
    elif isinstance(transactions, dict):
        # v0-style nested events
        for event_type, events in transactions.items():
            if isinstance(events, list) and events:
                print(f"\n  {event_type} ({len(events)}):")
                for evt in events[:5]:
                    posted = str(evt.get("PostedDate", evt.get("postedDate", "?")) or "?")[:10]
                    print(f"    {posted}  {json.dumps(evt, default=str)[:100]}")

    next_tok = result.get("nextToken", result.get("payload", {}).get("NextToken"))
    if next_tok:
        print(f"\n  More results available. Use: financial-events --since {since} --next-token {next_tok}")


# ---------------------------------------------------------------------------
# Command: stranded-inventory
# ---------------------------------------------------------------------------

def cmd_stranded_inventory(args: list[str]):
    """Request and display stranded inventory report."""
    config = get_config()
    timeout = int(_get_arg(args, "--timeout", "300"))

    print("Requesting stranded inventory report...")
    create_body = {
        "reportType": "GET_STRANDED_INVENTORY_UI_DATA",
        "marketplaceIds": [config["marketplace_id"]],
    }
    result = sp_api_request("POST", "/reports/2021-06-30/reports", config, body=create_body)
    report_id = result.get("reportId")
    if not report_id:
        print(f"ERROR: No reportId in response: {json.dumps(result)}", file=sys.stderr)
        sys.exit(1)

    print(f"  Report ID: {report_id}")
    print(f"  Waiting for report (timeout: {timeout}s)...")
    report = _wait_for_report(report_id, config, timeout=timeout)
    document_id = report.get("reportDocumentId")
    if not document_id:
        print("ERROR: Report DONE but no reportDocumentId", file=sys.stderr)
        sys.exit(1)

    content = _download_report_document(document_id, config)
    rows = _parse_tsv_report(content)
    cache_file = _cache_report(report_id, content)

    print(f"\nSTRANDED INVENTORY ({len(rows)} items)")
    if rows:
        print(f"  {'SKU':<25} {'ASIN':<12} {'Condition':<10} {'Qty':>6} {'Reason'}")
        print(f"  {'---':<25} {'----':<12} {'---------':<10} {'---':>6} {'------'}")
        for row in rows:
            sku = str(row.get("seller-sku", row.get("sku", "?")))[:25]
            asin = str(row.get("asin", "?"))
            condition = str(row.get("condition", "?"))[:10]
            qty = str(row.get("quantity", row.get("afn-listing-exists", "?")))
            reason = str(row.get("stranded-reason", row.get("issue", "?")))[:40]
            print(f"  {sku:<25} {asin:<12} {condition:<10} {qty:>6} {reason}")
    else:
        print("  No stranded inventory found.")

    print(f"\n  Cached: {cache_file}")
    _write_csv_if_requested(args, rows, "stranded_inventory")

    if "--json" in args:
        print(json.dumps(rows, indent=2, default=str))


# ---------------------------------------------------------------------------
# Command: restock
# ---------------------------------------------------------------------------

def cmd_restock(args: list[str]):
    """Request and display restock inventory recommendations."""
    config = get_config()
    timeout = int(_get_arg(args, "--timeout", "300"))

    print("Requesting restock recommendations report...")
    create_body = {
        "reportType": "GET_RESTOCK_INVENTORY_RECOMMENDATIONS_REPORT",
        "marketplaceIds": [config["marketplace_id"]],
    }
    result = sp_api_request("POST", "/reports/2021-06-30/reports", config, body=create_body)
    report_id = result.get("reportId")
    if not report_id:
        print(f"ERROR: No reportId in response: {json.dumps(result)}", file=sys.stderr)
        sys.exit(1)

    print(f"  Report ID: {report_id}")
    print(f"  Waiting for report (timeout: {timeout}s)...")
    report = _wait_for_report(report_id, config, timeout=timeout)
    document_id = report.get("reportDocumentId")
    if not document_id:
        print("ERROR: Report DONE but no reportDocumentId", file=sys.stderr)
        sys.exit(1)

    content = _download_report_document(document_id, config)
    rows = _parse_tsv_report(content)
    cache_file = _cache_report(report_id, content)

    print(f"\nRESTOCK RECOMMENDATIONS ({len(rows)} items)")
    if rows:
        print(f"  {'SKU':<25} {'ASIN':<12} {'Available':>9} {'Reorder':>9} {'Product'}")
        print(f"  {'---':<25} {'----':<12} {'---------':>9} {'-------':>9} {'-------'}")
        for row in rows:
            sku = str(row.get("Merchant SKU", row.get("seller-sku", "?")))[:25]
            asin = str(row.get("ASIN", row.get("asin", "?")))
            available = str(row.get("Available", row.get("available", "?")))
            reorder = str(row.get("Recommended Order Quantity", row.get("recommended-order-quantity", "?")))
            name = str(row.get("Product Name", row.get("product-name", "?")))[:35]
            print(f"  {sku:<25} {asin:<12} {available:>9} {reorder:>9} {name}")
    else:
        print("  No restock recommendations available.")

    print(f"\n  Cached: {cache_file}")
    _write_csv_if_requested(args, rows, "restock_recommendations")

    if "--json" in args:
        print(json.dumps(rows, indent=2, default=str))


# ---------------------------------------------------------------------------
# Command: aged-inventory
# ---------------------------------------------------------------------------

def cmd_aged_inventory(args: list[str]):
    """Show aged FBA inventory approaching storage fee thresholds."""
    config = get_config()
    timeout = int(_get_arg(args, "--timeout", "300"))

    print("Requesting aged inventory report...")
    create_body = {
        "reportType": "GET_FBA_INVENTORY_AGED_DATA",
        "marketplaceIds": [config["marketplace_id"]],
    }
    result = sp_api_request("POST", "/reports/2021-06-30/reports", config, body=create_body)
    report_id = result.get("reportId")
    if not report_id:
        print(f"ERROR: No reportId in response: {json.dumps(result)}", file=sys.stderr)
        sys.exit(1)

    print(f"  Report ID: {report_id}")
    print(f"  Waiting for report (timeout: {timeout}s)...")
    report = _wait_for_report(report_id, config, timeout=timeout)
    document_id = report.get("reportDocumentId")
    if not document_id:
        print("ERROR: Report DONE but no reportDocumentId", file=sys.stderr)
        sys.exit(1)

    content = _download_report_document(document_id, config)
    rows = _parse_tsv_report(content)
    cache_file = _cache_report(report_id, content)

    # Categorize by age thresholds
    over_181 = []         # 181-365 days — long-term storage surcharge
    over_365 = []         # 365+ days — highest storage surcharge
    normal = []

    for row in rows:
        qty_181_270 = _safe_int(row.get("inv-age-181-to-270-days", 0))
        qty_271_365 = _safe_int(row.get("inv-age-271-to-365-days", 0))
        qty_365_plus = _safe_int(row.get("inv-age-365-plus-days", 0))

        if qty_365_plus > 0:
            over_365.append(row)
        elif qty_271_365 > 0 or qty_181_270 > 0:
            over_181.append(row)
        else:
            normal.append(row)

    print(f"\nAGED INVENTORY REPORT ({len(rows)} total items)")
    print(f"  365+ days (highest surcharge):       {len(over_365)} items")
    print(f"  181-365 days (long-term surcharge):   {len(over_181)} items")
    print(f"  Under 181 days:                       {len(normal)} items")

    if over_365:
        print(f"\n  CRITICAL — 365+ DAYS (remove or liquidate to avoid fees):")
        print(f"  {'SKU':<25} {'ASIN':<12} {'Qty 365+':>9} {'Product'}")
        print(f"  {'---':<25} {'----':<12} {'--------':>9} {'-------'}")
        for row in over_365[:20]:
            sku = str(row.get("sku", row.get("seller-sku", "?")))[:25]
            asin = str(row.get("asin", "?"))
            qty = str(row.get("inv-age-365-plus-days", "?"))
            name = str(row.get("product-name", row.get("Product Name", "?")))[:35]
            print(f"  {sku:<25} {asin:<12} {qty:>9} {name}")

    if over_181:
        print(f"\n  WARNING — 181-365 DAYS (approaching highest surcharge):")
        print(f"  {'SKU':<25} {'ASIN':<12} {'Qty 181+':>9} {'Product'}")
        print(f"  {'---':<25} {'----':<12} {'--------':>9} {'-------'}")
        for row in over_181[:20]:
            sku = str(row.get("sku", row.get("seller-sku", "?")))[:25]
            asin = str(row.get("asin", "?"))
            qty_181 = _safe_int(row.get("inv-age-181-to-270-days", 0))
            qty_271 = _safe_int(row.get("inv-age-271-to-365-days", 0))
            name = str(row.get("product-name", row.get("Product Name", "?")))[:35]
            print(f"  {sku:<25} {asin:<12} {qty_181 + qty_271:>9} {name}")

    print(f"\n  Cached: {cache_file}")
    _write_csv_if_requested(args, rows, "aged_inventory")

    if "--json" in args:
        print(json.dumps(rows, indent=2, default=str))


# ---------------------------------------------------------------------------
# Command: storage-fees
# ---------------------------------------------------------------------------

def cmd_storage_fees(args: list[str]):
    """Show FBA storage fee charges."""
    config = get_config()
    timeout = int(_get_arg(args, "--timeout", "300"))

    print("Requesting storage fee charges report...")
    create_body = {
        "reportType": "GET_FBA_STORAGE_FEE_CHARGES_DATA",
        "marketplaceIds": [config["marketplace_id"]],
    }
    result = sp_api_request("POST", "/reports/2021-06-30/reports", config, body=create_body)
    report_id = result.get("reportId")
    if not report_id:
        print(f"ERROR: No reportId in response: {json.dumps(result)}", file=sys.stderr)
        sys.exit(1)

    print(f"  Report ID: {report_id}")
    print(f"  Waiting for report (timeout: {timeout}s)...")
    report = _wait_for_report(report_id, config, timeout=timeout)
    document_id = report.get("reportDocumentId")
    if not document_id:
        print("ERROR: Report DONE but no reportDocumentId", file=sys.stderr)
        sys.exit(1)

    content = _download_report_document(document_id, config)
    rows = _parse_tsv_report(content)
    cache_file = _cache_report(report_id, content)

    # Calculate total fees
    total_fee = 0.0
    for row in rows:
        fee = row.get("estimated-monthly-storage-fee", row.get("monthly-storage-fee",
              row.get("storage-fee", "0")))
        try:
            total_fee += float(fee) if fee else 0.0
        except (ValueError, TypeError):
            pass

    print(f"\nSTORAGE FEE CHARGES ({len(rows)} items)")
    print(f"  Total Monthly Storage Fee: ${total_fee:,.2f}")

    if rows:
        # Sort by fee descending (safe float for non-numeric values)
        def _safe_fee(r):
            try:
                v = r.get("estimated-monthly-storage-fee", r.get("monthly-storage-fee",
                    r.get("storage-fee", "0"))) or "0"
                return float(v)
            except (ValueError, TypeError):
                return 0.0
        sorted_rows = sorted(rows, key=_safe_fee, reverse=True)

        print(f"\n  TOP STORAGE FEE ITEMS:")
        print(f"  {'SKU':<25} {'ASIN':<12} {'Fee':>10} {'Volume':>10} {'Product'}")
        print(f"  {'---':<25} {'----':<12} {'---':>10} {'------':>10} {'-------'}")
        for row in sorted_rows[:20]:
            sku = str(row.get("sku", row.get("seller-sku", "?")))[:25]
            asin = str(row.get("asin", "?"))
            fee = row.get("estimated-monthly-storage-fee", row.get("monthly-storage-fee",
                  row.get("storage-fee", "?")))
            try:
                fee_str = f"${float(fee):,.2f}" if fee and fee != "?" else "?"
            except (ValueError, TypeError):
                fee_str = "?"
            volume = str(row.get("volume", row.get("item-volume", "?")))[:10]
            name = str(row.get("product-name", row.get("Product Name", "?")))[:30]
            print(f"  {sku:<25} {asin:<12} {fee_str:>10} {volume:>10} {name}")

    print(f"\n  Cached: {cache_file}")
    _write_csv_if_requested(args, rows, "storage_fees")

    if "--json" in args:
        print(json.dumps(rows, indent=2, default=str))


# ---------------------------------------------------------------------------
# Command: confirm-shipment
# ---------------------------------------------------------------------------

def cmd_confirm_shipment(args: list[str]):
    """Confirm shipment for a merchant-fulfilled (MFN) order."""
    config = get_config()
    order_id = _get_arg(args, "--order-id", "")
    tracking = _get_arg(args, "--tracking", "")
    carrier = _get_arg(args, "--carrier", "")

    if not order_id or not tracking or not carrier:
        print("Usage: confirm-shipment --order-id ID --tracking NUMBER --carrier NAME", file=sys.stderr)
        print("\nExample carriers: UPS, USPS, FedEx, DHL, Amazon Shipping", file=sys.stderr)
        sys.exit(1)

    # Safety: show what we're about to do and confirm
    print(f"CONFIRM SHIPMENT:")
    print(f"  Order ID: {order_id}")
    print(f"  Carrier:  {carrier}")
    print(f"  Tracking: {tracking}")
    print(f"\n  This will mark the order as shipped on Amazon.")

    if "--yes" in args or "--force" in args:
        print("  (Auto-confirmed via --yes/--force flag)")
    else:
        print(f"  Proceed? [y/N] ", end="", flush=True)
        try:
            confirmation = input().strip().lower()
        except EOFError:
            print("\nERROR: Cannot confirm interactively (no TTY). Use --yes to skip.", file=sys.stderr)
            sys.exit(1)
        if confirmation not in ("y", "yes"):
            print("Cancelled.")
            return

    # NOTE: confirmShipment does NOT exist in Orders v2026-01-01.
    # Using v0 endpoint which is deprecated but still functional for MFN sellers.
    print("  NOTE: Using Orders v0 endpoint (confirmShipment is not available in v2026-01-01).",
          file=sys.stderr)

    ship_date = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # V2 fix: try shippingConfirmation format first; fall back to packageDetail if 400
    body = {
        "marketplaceId": config["marketplace_id"],
        "orderItems": [],  # Empty = all items in order
        "shippingConfirmation": {
            "carrierCode": carrier,
            "trackingNumber": tracking,
            "shipDate": ship_date,
        },
    }

    try:
        result = sp_api_request("POST",
                                f"/orders/v0/orders/{order_id}/shipment/confirm",
                                config, body=body)
    except SystemExit:
        # shippingConfirmation format rejected — try packageDetail format
        print("  Retrying with packageDetail format...", file=sys.stderr)
        body = {
            "marketplaceId": config["marketplace_id"],
            "packageDetail": {
                "packageReferenceId": "1",
                "carrierCode": carrier,
                "trackingNumber": tracking,
                "shipDate": ship_date,
                "orderItems": [],
            },
        }
        result = sp_api_request("POST",
                                f"/orders/v0/orders/{order_id}/shipment/confirm",
                                config, body=body)

    print(f"\nShipment confirmed successfully!")
    print(f"  Order:    {order_id}")
    print(f"  Carrier:  {carrier}")
    print(f"  Tracking: {tracking}")

    # Log the write operation
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOGS_DIR / "write_operations.log"
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with open(log_file, "a") as f:
        f.write(f"{timestamp} | confirm-shipment | order={order_id} carrier={carrier} tracking={tracking}\n")


# ---------------------------------------------------------------------------
# Command: bulk-pricing (F5)
# ---------------------------------------------------------------------------

def cmd_bulk_pricing(args: list[str]):
    """Batch competitive pricing for up to 20 ASINs."""
    config = get_config()
    asins_str = _get_arg(args, "--asins", "")

    if not asins_str:
        print("Usage: bulk-pricing --asins B0XXX,B0YYY,B0ZZZ [--json]", file=sys.stderr)
        sys.exit(1)

    asins = [a.strip() for a in asins_str.split(",") if a.strip()]
    if len(asins) > 20:
        print("ERROR: Maximum 20 ASINs per batch request.", file=sys.stderr)
        sys.exit(1)

    requests_body = []
    for asin in asins:
        requests_body.append({
            "asin": asin,
            "marketplaceId": config["marketplace_id"],
            "includedData": ["featuredBuyingOptions"],
            "method": "GET",
            "uri": f"/products/pricing/2022-05-01/items/{asin}/competitiveSummary",
        })

    result = sp_api_request("POST", "/batches/products/pricing/2022-05-01/items/competitiveSummary",
                            config, body={"requests": requests_body})

    # Unwrap batch response envelope
    pricing_data = result
    responses = result.get("responses", [])

    print(f"BULK PRICING: {len(asins)} ASINs")
    print(f"  {'ASIN':<12} {'Condition':<12} {'Buy Box':>10} {'Yours':>6}")
    print(f"  {'----':<12} {'---------':<12} {'-------':>10} {'-----':>6}")

    if responses:
        # Batch envelope format: responses[].body.asinCompetitivePricing
        for resp in responses:
            body = resp.get("body", {})
            _print_bulk_pricing_row(body)
    elif "asinCompetitivePricing" in pricing_data:
        _print_bulk_pricing_row(pricing_data)
    else:
        print(f"  Response: {json.dumps(result, indent=2, default=str)}")

    if "--json" in args:
        print(f"\n{json.dumps(result, indent=2, default=str)}")


def _print_bulk_pricing_row(body: dict):
    """Print a single row from bulk pricing results."""
    for pricing in body.get("asinCompetitivePricing", []):
        asin = pricing.get("asin", "?")
        featured = pricing.get("featuredBuyingOptions", [])
        if featured:
            for opt in featured:
                condition = opt.get("condition", "?")
                lp = opt.get("price", {}).get("listingPrice", {})
                amount = lp.get("amount", "?")
                currency = lp.get("currencyCode", "USD")
                print(f"  {asin:<12} {condition:<12} {currency} {amount:>7}")
        comp_prices = pricing.get("competitivePrices", [])
        for cp in comp_prices:
            belongs = cp.get("belongsToRequester", False)
            condition = cp.get("condition", "?")
            lp = cp.get("price", {}).get("listingPrice", {})
            amount = lp.get("amount", "?")
            currency = lp.get("currencyCode", "USD")
            yours = "  *" if belongs else ""
            print(f"  {asin:<12} {condition:<12} {currency} {amount:>7}{yours}")


# ---------------------------------------------------------------------------
# Command: refund-tracker (F7)
# ---------------------------------------------------------------------------

def cmd_refund_tracker(args: list[str]):
    """Refund/return analytics by ASIN."""
    config = get_config()
    since = _get_arg(args, "--since", "")
    until = _get_arg(args, "--until", "")

    if not since:
        since = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)).strftime("%Y-%m-%d")

    page_limit = str(min(100, 100))
    params = {
        "postedAfter": f"{since}T00:00:00Z",
        "maxResultsPerPage": page_limit,
        "pageSize": page_limit,
    }
    if until:
        params["postedBefore"] = f"{until}T23:59:59Z"

    # Paginate through all transactions to find refunds
    refunds_by_asin = {}  # asin -> {"count": N, "total": float}
    all_count = 0
    next_token = ""

    while True:
        if next_token:
            params["nextToken"] = next_token

        result = sp_api_request("GET", "/finances/2024-06-19/transactions", config, params=params)
        transactions = result.get("transactions", [])
        if not isinstance(transactions, list):
            break

        for txn in transactions:
            all_count += 1
            txn_type = txn.get("transactionType", txn.get("type", "")).lower()
            if "refund" not in txn_type:
                continue

            # Try to extract ASIN from transaction items or description
            items = txn.get("items", txn.get("relatedItems", []))
            asin = "Unknown"
            if isinstance(items, list) and items:
                asin = items[0].get("asin", items[0].get("ASIN", "Unknown"))

            amount = txn.get("totalAmount", txn.get("amount", {}))
            amt_val = 0.0
            if isinstance(amount, dict):
                try:
                    amt_val = abs(float(amount.get("amount", amount.get("Amount", 0))))
                except (ValueError, TypeError):
                    pass
            elif amount:
                try:
                    amt_val = abs(float(amount))
                except (ValueError, TypeError):
                    pass

            if asin not in refunds_by_asin:
                refunds_by_asin[asin] = {"count": 0, "total": 0.0}
            refunds_by_asin[asin]["count"] += 1
            refunds_by_asin[asin]["total"] += amt_val

        next_token = result.get("nextToken", "")
        if not next_token:
            break

    total_refunds = sum(v["count"] for v in refunds_by_asin.values())
    total_amount = sum(v["total"] for v in refunds_by_asin.values())

    print(f"REFUND TRACKER (since {since}):")
    print(f"  Total transactions scanned: {all_count}")
    print(f"  Total refunds: {total_refunds}")
    print(f"  Total refund amount: ${total_amount:.2f}")

    if refunds_by_asin:
        # Sort by refund count descending
        sorted_asins = sorted(refunds_by_asin.items(), key=lambda x: x[1]["count"], reverse=True)
        print(f"\n  {'ASIN':<14} {'Refunds':>8} {'Amount':>10}")
        print(f"  {'----':<14} {'-------':>8} {'------':>10}")
        for asin, data in sorted_asins:
            print(f"  {asin:<14} {data['count']:>8} ${data['total']:>9.2f}")

        if all_count > 0:
            refund_rate = (total_refunds / all_count) * 100
            print(f"\n  Refund rate: {refund_rate:.1f}% of all transactions")
    else:
        print("  No refunds found in this period.")

    if "--json" in args:
        print(f"\n{json.dumps(refunds_by_asin, indent=2, default=str)}")


# ---------------------------------------------------------------------------
# Command: fee-comparison (F8)
# ---------------------------------------------------------------------------

def cmd_fee_comparison(args: list[str]):
    """Compare FBA vs MFN fees for ASINs."""
    config = get_config()
    asins_str = _get_arg(args, "--asins", _get_arg(args, "--asin", ""))
    price = _get_arg(args, "--price", "")

    if not asins_str or not price:
        print("Usage: fee-comparison --asins B0XXX,B0YYY --price 29.99", file=sys.stderr)
        print("       fee-comparison --asin B0XXXXXXXX --price 29.99", file=sys.stderr)
        sys.exit(1)

    asins = [a.strip() for a in asins_str.split(",") if a.strip()]
    price_val = float(price)

    print(f"FEE COMPARISON: FBA vs MFN at ${price_val:.2f}")
    print(f"  {'ASIN':<14} {'FBA Fees':>10} {'MFN Fees':>10} {'Diff':>10} {'Better':<6}")
    print(f"  {'----':<14} {'--------':>10} {'--------':>10} {'----':>10} {'------':<6}")

    for asin in asins:
        fba_total = _get_fee_estimate(config, asin, price_val, is_fba=True)
        mfn_total = _get_fee_estimate(config, asin, price_val, is_fba=False)

        if fba_total is not None and mfn_total is not None:
            diff = fba_total - mfn_total
            better = "MFN" if diff > 0 else "FBA" if diff < 0 else "Same"
            print(f"  {asin:<14} ${fba_total:>8.2f}  ${mfn_total:>8.2f}  ${diff:>+8.2f}  {better}")
        elif fba_total is not None:
            print(f"  {asin:<14} ${fba_total:>8.2f}  {'N/A':>10}  {'N/A':>10}  FBA")
        elif mfn_total is not None:
            print(f"  {asin:<14} {'N/A':>10}  ${mfn_total:>8.2f}  {'N/A':>10}  MFN")
        else:
            print(f"  {asin:<14} {'Error':>10}  {'Error':>10}  {'N/A':>10}  ?")


def _get_fee_estimate(config: dict, asin: str, price: float, is_fba: bool) -> float | None:
    """Get total fee estimate for an ASIN. Returns None on error."""
    body = {
        "FeesEstimateRequest": {
            "MarketplaceId": config["marketplace_id"],
            "IsAmazonFulfilled": is_fba,
            "PriceToEstimateFees": {
                "ListingPrice": {
                    "CurrencyCode": "USD",
                    "Amount": price,
                },
            },
            "Identifier": f"fee-{'fba' if is_fba else 'mfn'}-{asin}",
        }
    }
    try:
        result = sp_api_request("POST",
                                f"/products/fees/v0/items/{asin}/feesEstimate",
                                config, body=body)
        payload = result.get("payload", result)
        estimate = payload.get("FeesEstimateResult", {})
        total = estimate.get("FeesEstimate", {}).get("TotalFeesEstimate", {})
        return float(total.get("Amount", 0))
    except (SystemExit, ValueError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Command: returns-report (F12)
# ---------------------------------------------------------------------------

def cmd_returns_report(args: list[str]):
    """FBA returns with reason codes."""
    config = get_config()
    timeout = int(_get_arg(args, "--timeout", "300"))
    csv_path = _get_arg(args, "--csv", "")

    print("Requesting FBA customer returns report...")
    report_body = {
        "reportType": "GET_FBA_FULFILLMENT_CUSTOMER_RETURNS_DATA",
        "marketplaceIds": [config["marketplace_id"]],
    }
    create_result = sp_api_request("POST", "/reports/2021-06-30/reports", config, body=report_body)
    report_id = create_result.get("reportId")
    if not report_id:
        print("ERROR: Failed to create returns report.", file=sys.stderr)
        sys.exit(1)

    print(f"  Report ID: {report_id}")
    report = _wait_for_report(report_id, config, timeout=timeout)
    doc_id = report.get("reportDocumentId")
    if not doc_id:
        print("ERROR: No document ID in completed report.", file=sys.stderr)
        sys.exit(1)

    content = _download_report_document(doc_id, config)
    rows = _parse_tsv_report(content)
    _cache_report(report_id, content)

    print(f"\nFBA RETURNS REPORT ({len(rows)} returns):")

    if not rows:
        print("  No returns found.")
        return

    # Group by ASIN and reason
    by_asin = {}
    reason_counts = {}
    for row in rows:
        asin = row.get("asin", row.get("ASIN", row.get("fnsku", "?")))
        reason = row.get("reason", row.get("return-reason", row.get("Reason", "Unknown")))
        sku = row.get("sku", row.get("SKU", row.get("seller-sku", "")))
        qty = _safe_int(row.get("quantity", row.get("Quantity", 1)))

        if asin not in by_asin:
            by_asin[asin] = {"sku": sku, "total": 0, "reasons": {}}
        by_asin[asin]["total"] += qty
        by_asin[asin]["reasons"][reason] = by_asin[asin]["reasons"].get(reason, 0) + qty
        reason_counts[reason] = reason_counts.get(reason, 0) + qty

    # Summary by ASIN
    sorted_asins = sorted(by_asin.items(), key=lambda x: x[1]["total"], reverse=True)
    print(f"\n  RETURNS BY ASIN (top 20):")
    print(f"  {'ASIN':<14} {'SKU':<20} {'Returns':>8} {'Top Reason'}")
    print(f"  {'----':<14} {'---':<20} {'-------':>8} {'----------'}")
    for asin, data in sorted_asins[:20]:
        top_reason = max(data["reasons"], key=data["reasons"].get) if data["reasons"] else "?"
        print(f"  {asin:<14} {data['sku']:<20} {data['total']:>8} {top_reason}")

    # Summary by reason
    sorted_reasons = sorted(reason_counts.items(), key=lambda x: x[1], reverse=True)
    print(f"\n  RETURNS BY REASON:")
    print(f"  {'Reason':<40} {'Count':>8}")
    print(f"  {'------':<40} {'-----':>8}")
    for reason, count in sorted_reasons:
        print(f"  {reason:<40} {count:>8}")

    if csv_path:
        _write_csv_if_requested(["--csv", csv_path], rows, "returns")

    if "--json" in args:
        print(json.dumps(rows, indent=2, default=str))


# ---------------------------------------------------------------------------
# Command: order-velocity (F4)
# ---------------------------------------------------------------------------

def cmd_order_velocity(args: list[str]):
    """Calculate order velocity (units/day) per ASIN over 7/14/30 day windows."""
    config = get_config()
    timeout = int(_get_arg(args, "--timeout", "300"))

    # Request sales and traffic report for last 30 days
    end_date = datetime.datetime.now(datetime.timezone.utc).date()
    start_date = end_date - datetime.timedelta(days=30)

    print(f"Requesting Sales & Traffic report ({start_date} to {end_date})...")
    report_body = {
        "reportType": "GET_SALES_AND_TRAFFIC_REPORT",
        "marketplaceIds": [config["marketplace_id"]],
        "dataStartTime": f"{start_date}T00:00:00Z",
        "dataEndTime": f"{end_date}T23:59:59Z",
        "reportOptions": {"dateGranularity": "DAY", "asinGranularity": "CHILD"},
    }
    create_result = sp_api_request("POST", "/reports/2021-06-30/reports", config, body=report_body)
    report_id = create_result.get("reportId")
    if not report_id:
        print("ERROR: Failed to create sales report.", file=sys.stderr)
        sys.exit(1)

    print(f"  Report ID: {report_id}")
    report = _wait_for_report(report_id, config, timeout=timeout)
    doc_id = report.get("reportDocumentId")
    if not doc_id:
        print("ERROR: No document ID in completed report.", file=sys.stderr)
        sys.exit(1)

    content = _download_report_document(doc_id, config)
    _cache_report(report_id, content)

    # Sales & Traffic report is JSON, not TSV
    try:
        report_data = json.loads(content)
    except json.JSONDecodeError:
        # Try TSV fallback
        rows = _parse_tsv_report(content)
        report_data = None

    # Parse daily ASIN-level data
    asin_daily = {}  # asin -> {date_str: units}
    if report_data:
        # JSON format: salesAndTrafficByAsin[]
        entries = report_data.get("salesAndTrafficByAsin", [])
        for entry in entries:
            asin = entry.get("parentAsin", entry.get("childAsin", "?"))
            date_str = entry.get("date", "")
            sales = entry.get("salesByAsin", {})
            units = sales.get("unitsOrdered", sales.get("unitsSold", 0))
            if asin not in asin_daily:
                asin_daily[asin] = {}
            asin_daily[asin][date_str] = asin_daily[asin].get(date_str, 0) + units
    else:
        # TSV fallback
        for row in rows:
            asin = row.get("(Child) ASIN", row.get("asin", row.get("ASIN", "?")))
            units = _safe_int(row.get("Units Ordered", row.get("unitsOrdered", 0)))
            date_str = row.get("Date", row.get("date", ""))
            if asin not in asin_daily:
                asin_daily[asin] = {}
            asin_daily[asin][date_str] = asin_daily[asin].get(date_str, 0) + units

    # Calculate velocity for each ASIN at 7/14/30 day windows
    today = end_date
    results = []
    for asin, daily in asin_daily.items():
        total_30 = sum(daily.values())
        # Calculate 7-day and 14-day totals
        total_7 = 0
        total_14 = 0
        for date_str, units in daily.items():
            try:
                d = datetime.date.fromisoformat(date_str[:10])
            except (ValueError, TypeError):
                continue
            days_ago = (today - d).days
            if days_ago <= 7:
                total_7 += units
            if days_ago <= 14:
                total_14 += units

        results.append({
            "asin": asin,
            "units_7d": total_7,
            "units_14d": total_14,
            "units_30d": total_30,
            "velocity_7d": round(total_7 / 7, 1),
            "velocity_14d": round(total_14 / 14, 1),
            "velocity_30d": round(total_30 / 30, 1),
        })

    # Sort by 30-day velocity descending
    results.sort(key=lambda x: x["velocity_30d"], reverse=True)

    print(f"\nORDER VELOCITY ({start_date} to {end_date}):")
    print(f"  {'ASIN':<14} {'7d Units':>8} {'7d/day':>7} {'14d Units':>9} {'14d/day':>8} {'30d Units':>9} {'30d/day':>8}")
    print(f"  {'----':<14} {'------':>8} {'------':>7} {'-------':>9} {'-------':>8} {'-------':>9} {'-------':>8}")

    for r in results[:30]:
        print(f"  {r['asin']:<14} {r['units_7d']:>8} {r['velocity_7d']:>7.1f} "
              f"{r['units_14d']:>9} {r['velocity_14d']:>8.1f} "
              f"{r['units_30d']:>9} {r['velocity_30d']:>8.1f}")

    if not results:
        print("  No sales data found for this period.")

    if "--json" in args:
        print(f"\n{json.dumps(results, indent=2, default=str)}")


# ---------------------------------------------------------------------------
# Command: restock-calculator (F1)
# ---------------------------------------------------------------------------

def cmd_restock_calculator(args: list[str]):
    """Calculate days-of-supply and recommended reorder quantities per SKU."""
    config = get_config()
    target_days = int(_get_arg(args, "--target-days", "60"))
    timeout = int(_get_arg(args, "--timeout", "300"))
    csv_path = _get_arg(args, "--csv", "")

    # Step 1: Get current FBA inventory levels
    print("Fetching current FBA inventory...")
    inv_params = {
        "granularityType": "Marketplace",
        "granularityId": config["marketplace_id"],
        "marketplaceIds": config["marketplace_id"],
    }
    inv_result = sp_api_request("GET", "/fba/inventory/v1/summaries", config, params=inv_params)
    summaries = inv_result.get("payload", inv_result).get("inventorySummaries", [])

    inventory = {}  # sku -> {asin, available, inbound}
    for item in summaries:
        sku = item.get("sellerSku", "?")
        inventory[sku] = {
            "asin": item.get("asin", "?"),
            "fnsku": item.get("fnSku", "?"),
            "product_name": str(item.get("productName", "?"))[:40],
            "available": _safe_int(item.get("totalFulfillableQuantity",
                                            item.get("inventoryDetails", {}).get("fulfillableQuantity", 0))),
            "inbound": _safe_int(item.get("inventoryDetails", {}).get("inboundWorkingQuantity", 0))
                     + _safe_int(item.get("inventoryDetails", {}).get("inboundShippedQuantity", 0))
                     + _safe_int(item.get("inventoryDetails", {}).get("inboundReceivingQuantity", 0)),
        }

    # Step 2: Get 30-day sales velocity via sales report
    end_date = datetime.datetime.now(datetime.timezone.utc).date()
    start_date = end_date - datetime.timedelta(days=30)

    print("Requesting 30-day Sales & Traffic report for velocity...")
    report_body = {
        "reportType": "GET_SALES_AND_TRAFFIC_REPORT",
        "marketplaceIds": [config["marketplace_id"]],
        "dataStartTime": f"{start_date}T00:00:00Z",
        "dataEndTime": f"{end_date}T23:59:59Z",
        "reportOptions": {"dateGranularity": "DAY", "asinGranularity": "CHILD"},
    }
    create_result = sp_api_request("POST", "/reports/2021-06-30/reports", config, body=report_body)
    report_id = create_result.get("reportId")
    if not report_id:
        print("ERROR: Failed to create sales report.", file=sys.stderr)
        sys.exit(1)

    print(f"  Report ID: {report_id}")
    report = _wait_for_report(report_id, config, timeout=timeout)
    doc_id = report.get("reportDocumentId")
    if not doc_id:
        print("ERROR: No document in completed report.", file=sys.stderr)
        sys.exit(1)

    content = _download_report_document(doc_id, config)
    _cache_report(report_id, content)

    # Parse velocity by ASIN
    velocity_by_asin = {}  # asin -> total_units_30d
    try:
        report_data = json.loads(content)
        for entry in report_data.get("salesAndTrafficByAsin", []):
            asin = entry.get("parentAsin", entry.get("childAsin", "?"))
            sales = entry.get("salesByAsin", {})
            units = sales.get("unitsOrdered", sales.get("unitsSold", 0))
            velocity_by_asin[asin] = velocity_by_asin.get(asin, 0) + units
    except json.JSONDecodeError:
        rows = _parse_tsv_report(content)
        for row in rows:
            asin = row.get("(Child) ASIN", row.get("asin", "?"))
            units = _safe_int(row.get("Units Ordered", row.get("unitsOrdered", 0)))
            velocity_by_asin[asin] = velocity_by_asin.get(asin, 0) + units

    # Step 3: Combine inventory + velocity
    results = []
    for sku, inv in inventory.items():
        asin = inv["asin"]
        units_30d = velocity_by_asin.get(asin, 0)
        daily_velocity = round(units_30d / 30, 2) if units_30d else 0
        available = inv["available"]
        inbound = inv["inbound"]
        total_stock = available + inbound

        if daily_velocity > 0:
            days_remaining = round(total_stock / daily_velocity, 1)
            reorder_qty = max(0, round(target_days * daily_velocity - total_stock))
        else:
            days_remaining = 999 if total_stock > 0 else 0
            reorder_qty = 0

        results.append({
            "sku": sku,
            "asin": asin,
            "product_name": inv["product_name"],
            "available": available,
            "inbound": inbound,
            "units_30d": units_30d,
            "daily_velocity": daily_velocity,
            "days_remaining": days_remaining,
            "reorder_qty": reorder_qty,
        })

    # Sort by days remaining (most urgent first)
    results.sort(key=lambda x: x["days_remaining"])

    print(f"\nRESTOCK CALCULATOR (target: {target_days} days supply):")
    print(f"  {'SKU':<20} {'ASIN':<14} {'Avail':>6} {'Inbound':>8} {'30d Sales':>10} {'Vel/day':>8} {'Days Left':>10} {'Reorder':>8}")
    print(f"  {'---':<20} {'----':<14} {'-----':>6} {'-------':>8} {'---------':>10} {'-------':>8} {'---------':>10} {'-------':>8}")

    for r in results[:40]:
        days_str = str(r["days_remaining"]) if r["days_remaining"] < 999 else "N/A"
        reorder_str = str(r["reorder_qty"]) if r["reorder_qty"] > 0 else "-"
        print(f"  {r['sku']:<20} {r['asin']:<14} {r['available']:>6} {r['inbound']:>8} "
              f"{r['units_30d']:>10} {r['daily_velocity']:>8.1f} {days_str:>10} {reorder_str:>8}")

    # Alerts
    urgent = [r for r in results if r["days_remaining"] < 14 and r["daily_velocity"] > 0]
    low = [r for r in results if 14 <= r["days_remaining"] < 30 and r["daily_velocity"] > 0]
    if urgent:
        print(f"\n  URGENT (< 14 days): {len(urgent)} SKUs need immediate reorder!")
        for r in urgent:
            print(f"    {r['sku']} ({r['asin']}): {r['days_remaining']} days left, reorder {r['reorder_qty']} units")
    if low:
        print(f"\n  LOW STOCK (14-30 days): {len(low)} SKUs")

    if csv_path:
        _write_csv_if_requested(["--csv", csv_path], results, "restock-calc")

    if "--json" in args:
        print(f"\n{json.dumps(results, indent=2, default=str)}")


# ---------------------------------------------------------------------------
# Command: profit-dashboard (F2)
# ---------------------------------------------------------------------------

COGS_FILE = SKILL_DIR / "cogs.csv"


def _load_cogs() -> dict:
    """Load COGS data from cogs.csv. Returns {asin: cost_per_unit}."""
    if not COGS_FILE.exists():
        return {}
    cogs = {}
    with open(COGS_FILE) as f:
        reader = csv.DictReader(f)
        for row in reader:
            asin = row.get("asin", row.get("ASIN", ""))
            cost = row.get("cost", row.get("cogs", row.get("COGS", "")))
            if asin and cost:
                try:
                    cogs[asin] = float(cost)
                except ValueError:
                    pass
    return cogs


def cmd_profit_dashboard(args: list[str]):
    """Per-ASIN P&L: selling price, Amazon fees, COGS, margin, ROI."""
    config = get_config()
    asins_str = _get_arg(args, "--asins", "")
    limit = int(_get_arg(args, "--limit", "20"))

    if not asins_str:
        print("Usage: profit-dashboard --asins B0XXX,B0YYY [--limit N]", file=sys.stderr)
        print(f"\nOptional: Create {COGS_FILE} with columns: asin, cost", file=sys.stderr)
        print("  Example: asin,cost", file=sys.stderr)
        print("           B0XXXXXXXX,12.50", file=sys.stderr)
        sys.exit(1)

    asins = [a.strip() for a in asins_str.split(",") if a.strip()][:limit]
    cogs_data = _load_cogs()

    print(f"PROFIT DASHBOARD ({len(asins)} ASINs):")
    if cogs_data:
        print(f"  COGS loaded for {len(cogs_data)} ASINs from {COGS_FILE}")
    else:
        print(f"  No COGS file found. Create {COGS_FILE} for full P&L.")

    print(f"\n  {'ASIN':<14} {'Price':>8} {'Fees':>8} {'COGS':>8} {'Margin':>8} {'Margin%':>8} {'ROI':>8}")
    print(f"  {'----':<14} {'-----':>8} {'----':>8} {'----':>8} {'------':>8} {'-------':>8} {'---':>8}")

    results = []
    for asin in asins:
        # Get Buy Box price via pricing API
        price = _get_buy_box_price(config, asin)
        if price is None:
            print(f"  {asin:<14} {'N/A':>8} — could not fetch pricing")
            continue

        # Get FBA fee estimate
        fee_total = _get_fee_estimate(config, asin, price, is_fba=True)
        if fee_total is None:
            fee_total = 0.0

        cogs = cogs_data.get(asin, 0.0)
        margin = price - fee_total - cogs
        margin_pct = (margin / price * 100) if price else 0
        roi = (margin / cogs * 100) if cogs else 0

        results.append({
            "asin": asin,
            "price": price,
            "fees": fee_total,
            "cogs": cogs,
            "margin": margin,
            "margin_pct": margin_pct,
            "roi": roi,
        })

        cogs_str = f"${cogs:.2f}" if cogs else "-"
        roi_str = f"{roi:.0f}%" if cogs else "N/A"
        print(f"  {asin:<14} ${price:>7.2f} ${fee_total:>7.2f} {cogs_str:>8} ${margin:>7.2f} {margin_pct:>7.1f}% {roi_str:>8}")

    if "--json" in args:
        print(f"\n{json.dumps(results, indent=2, default=str)}")


def _get_buy_box_price(config: dict, asin: str) -> float | None:
    """Get the current Buy Box price for an ASIN."""
    try:
        result = sp_api_request("POST", "/batches/products/pricing/2022-05-01/items/competitiveSummary",
                                config, body={
                                    "requests": [{
                                        "asin": asin,
                                        "marketplaceId": config["marketplace_id"],
                                        "includedData": ["featuredBuyingOptions"],
                                        "method": "GET",
                                        "uri": f"/products/pricing/2022-05-01/items/{asin}/competitiveSummary",
                                    }]
                                })

        # Unwrap batch envelope
        pricing_data = result
        responses = result.get("responses", [])
        if responses:
            body = responses[0].get("body", {})
            if body:
                pricing_data = body

        for pricing in pricing_data.get("asinCompetitivePricing", []):
            for opt in pricing.get("featuredBuyingOptions", []):
                lp = opt.get("price", {}).get("listingPrice", {})
                try:
                    return float(lp.get("amount", 0))
                except (ValueError, TypeError):
                    pass
    except SystemExit:
        pass
    return None


# ---------------------------------------------------------------------------
# CSV export helper
# ---------------------------------------------------------------------------

def _write_csv_if_requested(args: list[str], rows: list[dict], default_name: str):
    """Write rows to CSV if --csv flag is present."""
    csv_path = _get_arg(args, "--csv", "")
    if not csv_path:
        return
    if not rows:
        print("  No data to export to CSV.", file=sys.stderr)
        return

    output = pathlib.Path(csv_path)
    fieldnames = list(rows[0].keys())
    with open(output, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  CSV exported: {output} ({len(rows)} rows)")


# ---------------------------------------------------------------------------
# Argument parsing helpers
# ---------------------------------------------------------------------------

def _get_arg(args: list[str], flag: str, default: str = "") -> str:
    """Get a named argument value from args list."""
    for i, arg in enumerate(args):
        if arg == flag and i + 1 < len(args):
            return args[i + 1]
    return default


def _print_help():
    """Print usage help."""
    print(__doc__)
    print("\nCOMMANDS:")
    commands = {
        "validate-token": "Validate LWA credentials and show token info",
        "health-check": "Quick health check of all key endpoints",
        "refresh-token": "Force-refresh the LWA access token",
        "account-info": "Show account and marketplace participation info",
        "fba-inventory": "Real-time FBA inventory via getInventorySummaries",
        "inventory-report": "Request, poll, download an inventory report",
        "inventory-summary": "Combined FBA + merchant inventory overview",
        "low-stock": "Show FBA items below stock threshold",
        "list-reports": "List recent reports",
        "download-report": "Download a specific report by ID",
        "get-report-status": "Check status of a report",
        "orders": "List orders (v2026-01-01 GET /orders)",
        "order": "Get single order details (v2026-01-01 getOrder)",
        "catalog-search": "Search catalog items",
        "catalog-item": "Get catalog item details by ASIN",
        "pricing": "Get competitive pricing for an ASIN",
        "fees": "Estimate fees for an ASIN at a given price",
        "listing": "Get listing details for a SKU",
        "create-feed": "Create a JSON_LISTINGS_FEED from a JSON file",
        "feed-status": "Check feed processing status",
        "financial-events": "Get financial events (v2024-06-19)",
        "stranded-inventory": "Show stranded FBA inventory",
        "restock": "Show restock recommendations",
        "aged-inventory": "Show aged inventory (storage fee thresholds)",
        "storage-fees": "Show FBA storage fee charges",
        "confirm-shipment": "Confirm shipment for MFN order",
        "bulk-pricing": "Batch competitive pricing for up to 20 ASINs",
        "refund-tracker": "Refund/return analytics by ASIN",
        "fee-comparison": "Compare FBA vs MFN fees side-by-side",
        "returns-report": "FBA returns with reason codes",
        "order-velocity": "7/14/30-day sales velocity per ASIN",
        "restock-calculator": "Days-of-supply and reorder quantities per SKU",
        "profit-dashboard": "Per-ASIN P&L: price, fees, COGS, margin, ROI",
    }
    for cmd, desc in commands.items():
        print(f"  {cmd:<25} {desc}")

    print("\nINVENTORY REPORT TYPES:")
    for rt, desc in INVENTORY_REPORT_TYPES.items():
        print(f"  {rt}")
        print(f"    {desc}")

    print(f"\nConfiguration: Set variables in {ENV_FILE}")
    print(f"  Required: SP_LWA_CLIENT_ID, SP_LWA_CLIENT_SECRET, SP_LWA_REFRESH_TOKEN,")
    print(f"            SP_MARKETPLACE_ID, SP_SELLER_ID")
    print(f"  Optional: SP_REGION (default: NA)")


# ---------------------------------------------------------------------------
# Main dispatcher
# ---------------------------------------------------------------------------

COMMANDS = {
    "validate-token": cmd_validate_token,
    "health-check": cmd_health_check,
    "refresh-token": cmd_refresh_token,
    "account-info": cmd_account_info,
    "fba-inventory": cmd_fba_inventory,
    "inventory-report": cmd_inventory_report,
    "inventory-summary": cmd_inventory_summary,
    "low-stock": cmd_low_stock,
    "list-reports": cmd_list_reports,
    "download-report": cmd_download_report,
    "get-report-status": cmd_get_report_status,
    "orders": cmd_orders,
    "order": cmd_order,
    "catalog-search": cmd_catalog_search,
    "catalog-item": cmd_catalog_item,
    "pricing": cmd_pricing,
    "fees": cmd_fees,
    "listing": cmd_listing,
    "create-feed": cmd_create_feed,
    "feed-status": cmd_feed_status,
    "financial-events": cmd_financial_events,
    "stranded-inventory": cmd_stranded_inventory,
    "restock": cmd_restock,
    "aged-inventory": cmd_aged_inventory,
    "storage-fees": cmd_storage_fees,
    "confirm-shipment": cmd_confirm_shipment,
    "bulk-pricing": cmd_bulk_pricing,
    "refund-tracker": cmd_refund_tracker,
    "fee-comparison": cmd_fee_comparison,
    "returns-report": cmd_returns_report,
    "order-velocity": cmd_order_velocity,
    "restock-calculator": cmd_restock_calculator,
    "profit-dashboard": cmd_profit_dashboard,
}


def main():
    args = sys.argv[1:]

    if not args or args[0] in ("--help", "-h", "help"):
        _print_help()
        sys.exit(0)

    command = args[0]
    cmd_args = args[1:]

    if command not in COMMANDS:
        print(f"ERROR: Unknown command '{command}'", file=sys.stderr)
        print(f"Run with --help to see available commands.", file=sys.stderr)
        sys.exit(1)

    if command in WRITE_COMMANDS and READ_ONLY_MODE:
        print(f"ERROR: '{command}' is blocked — skill is in read-only mode.", file=sys.stderr)
        print("Set SP_READ_ONLY=0 in the skill .env to enable write operations.", file=sys.stderr)
        sys.exit(1)

    COMMANDS[command](cmd_args)


if __name__ == "__main__":
    main()
