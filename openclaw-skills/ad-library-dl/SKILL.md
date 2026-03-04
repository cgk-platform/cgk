---
name: ad-library-dl
description: Download, analyze, monitor, and clone competitor ads from Facebook Ad Library. Includes brand asset management, design system capture, competitive intelligence pipeline, and interactive clone sessions with LLM-powered copy generation. Chain with nano-banana-pro for image generation and veo-video-gen for video production.
author: nova russell
version: 3.0.0
triggers:
  - 'download ad library'
  - 'facebook ads'
  - 'scrape ads'
  - 'competitor ads'
  - 'ad library download'
  - 'download facebook ads'
  - 'ad creatives'
  - 'clone competitor ads'
  - 'competitor creative'
  - 'spy on ads'
  - 'competitive analysis'
  - 'analyze competitor ads'
  - 'competitor intelligence'
  - 'monitor competitor'
  - 'competitor monitoring'
  - 'scaling ads'
  - 'clone briefs'
  - 'filming script'
  - 'competitor clone'
  - 'brand assets'
  - 'crawl website'
  - 'product images'
  - 'brand catalog'
  - 'asset library'
  - 'interactive clone'
  - 'clone session'
  - 'copy generation'
  - 'design system capture'
  - 'product catalog'
  - 'clone preflight'
metadata:
  {
    'clawdbot':
      {
        'emoji': '📥',
        'requires': { 'bins': ['yt-dlp'] },
        'install':
          [
            {
              'id': 'brew',
              'kind': 'brew',
              'formula': 'yt-dlp',
              'bins': ['yt-dlp'],
              'label': 'Install yt-dlp (brew)',
            },
            {
              'id': 'pip',
              'kind': 'pip',
              'package': 'yt-dlp',
              'bins': ['yt-dlp'],
              'label': 'Install yt-dlp (pip)',
            },
          ],
      },
  }
---

# Ad Library Downloader

Download, analyze, monitor, and clone competitor ads from Facebook Ad Library. Full competitive intelligence pipeline with brand asset management and design system capture.

## Script Inventory

| #   | Script                     | Purpose                                                                                |
| --- | -------------------------- | -------------------------------------------------------------------------------------- |
| 1   | `ad_library_dl.py`         | Download images/videos from Ad Library pages                                           |
| 2   | `analyze_competitor.py`    | Gemini vision analysis + competitive intelligence brief                                |
| 2a  | `analyze_safe.sh`          | Safe wrapper for `analyze_competitor.py` — always use this instead of calling directly |
| 3   | `competitor_monitor.py`    | Persistent monitoring with rank tracking and scaling detection                         |
| 3a  | `monitor_safe.sh`          | Safe wrapper for `competitor_monitor.py` — always use this instead of calling directly |
| 4   | `clone_competitor.py`      | Interactive clone sessions (two-phase: plan → execute)                                 |
| 5   | `clone_preflight.sh`       | Pre-flight checks before first clone run                                               |
| 6   | `brand_asset_store.py`     | Brand product image catalog (SQLite)                                                   |
| 7   | `brand_crawl.py`           | Crawl website for product images + design system extraction                            |
| 8   | `catalog_design_system.py` | Standalone design system capture (Playwright + Gemini)                                 |
| 9   | `product_catalog.py`       | Product catalog management (pricing, descriptions, images)                             |
| 10  | `ci_store.py`              | Competitive intelligence data store (SQLite + optional ChromaDB)                       |
| 11  | `sync_drive.py`            | Sync local assets/briefs to Google Drive                                               |

All scripts use PEP 723 inline dependencies — `uv run` handles installation automatically.

---

## 1. Download Ad Media (`ad_library_dl.py`)

```bash
uv run {baseDir}/scripts/ad_library_dl.py "AD_LIBRARY_URL" --type images --limit 10
```

With Drive upload, Slack notification, and offscreen browser:

```bash
uv run {baseDir}/scripts/ad_library_dl.py "AD_LIBRARY_URL" --type both --limit 20 --drive --slack --offscreen
```

| Argument         | Description                                       | Default                                       |
| ---------------- | ------------------------------------------------- | --------------------------------------------- |
| `URL`            | Facebook Ad Library URL (required)                | —                                             |
| `--type`         | `images`, `videos`, or `both`                     | `both`                                        |
| `--limit`        | Max media files to download                       | `50`                                          |
| `--output`       | Output directory                                  | `~/Downloads/ad-library/<brand>/<timestamp>/` |
| `--headed`       | Visible browser (debugging)                       | headless                                      |
| `--offscreen`    | Headed but off-screen (avoids headless detection) | off                                           |
| `--drive`        | Upload to Google Drive                            | off                                           |
| `--slack`        | Post summary to Slack thread                      | off                                           |
| `--purge-days N` | Auto-purge local sessions older than N days       | `30`                                          |

Files named by impression rank: `rank-001-img-<hash>.jpg`, `rank-001-vid-<hash>.mp4`.

---

## 2. Competitive Analysis (`analyze_competitor.py`)

Full Gemini-powered competitive intelligence pipeline:

```bash
uv run {baseDir}/scripts/analyze_competitor.py "AD_LIBRARY_URL" --limit 10 --slack --drive
```

Pipeline: Download → Gemini vision per ad → Master CI brief → Google Doc → Slack.

| Argument        | Description                                                 | Default                  |
| --------------- | ----------------------------------------------------------- | ------------------------ |
| `URL`           | Facebook Ad Library URL (positional, required)              | —                        |
| `--limit`       | Max ads to analyze                                          | `10`                     |
| `--type`        | `images`, `videos`, or `both`                               | `both`                   |
| `--slack`       | Post results to Slack                                       | off                      |
| `--drive`       | Upload media to Drive                                       | off                      |
| `--model`       | Gemini model for master analysis                            | `gemini-3-pro-preview`   |
| `--flash-model` | Gemini model for individual analyses                        | `gemini-3-flash-preview` |
| `--offscreen`   | Off-screen headed browser                                   | headless                 |
| `--force`       | Re-download and re-analyze all assets, ignoring dedup cache | off                      |
| `--no-persist`  | Skip persistent storage (no catalog update, no MCP summary) | off                      |

**Requires:** `GEMINI_API_KEY` environment variable.

---

## 3. Competitor Monitoring (`competitor_monitor.py`)

Persistent tracking with rank change detection and scaling alerts:

```bash
uv run {baseDir}/scripts/competitor_monitor.py "AD_LIBRARY_URL" --limit 15 --monitor --slack
```

| Argument              | Description                                    | Default                  |
| --------------------- | ---------------------------------------------- | ------------------------ |
| `URL`                 | Facebook Ad Library URL (positional, optional) | —                        |
| `--limit`             | Max ads to scan                                | `15`                     |
| `--monitor`           | Run full monitoring scan                       | off                      |
| `--slack`             | Post results to Slack                          | off                      |
| `--threshold`         | Scaling detection threshold (positions)        | `3`                      |
| `--quiet`             | Suppress non-essential output                  | off                      |
| `--force`             | Force re-scan even if recently scanned         | off                      |
| `--model`             | Gemini model for analysis                      | `gemini-3-pro-preview`   |
| `--flash-model`       | Gemini model for per-asset analysis            | `gemini-3-flash-preview` |
| `--type`              | `images`, `videos`, or `both`                  | `both`                   |
| `--list-brands`       | List all monitored brands                      | —                        |
| `--status --brand X`  | Show brand monitoring status                   | —                        |
| `--scaling --brand X` | Show scaling report for a brand                | —                        |

Features: persistent Drive structure, rank history tracking, scaling detection, Drive file management with rank-prefixed names.

---

## 4. Clone Workflow (`clone_competitor.py`)

Interactive session workflow with human-in-the-loop decisions. Batch mode is disabled.

### Interactive Clone Sessions (Preferred)

Step-by-step workflow with human-in-the-loop decisions:

```bash
# 1. Initialize session — loads catalog, generates initial briefs
bash {baseDir}/scripts/clone_safe.sh init --brand "BrandDir" --top 5 --type statics

# 2. Show competitor ad + analysis in Slack
bash {baseDir}/scripts/clone_safe.sh show-ad --session <ID> --index 0

# 3. Confirm which product to feature
bash {baseDir}/scripts/clone_safe.sh set-product --session <ID> --index 0 --product "Product Name"

# 4. Generate 3 copy variations via LLM
bash {baseDir}/scripts/clone_safe.sh copy-gen --session <ID> --index 0 [--count 3]

# 5. Select copy variation (1-3 or custom)
bash {baseDir}/scripts/clone_safe.sh set-copy --session <ID> --index 0 --choice 1
# Custom copy:
bash {baseDir}/scripts/clone_safe.sh set-copy --session <ID> --index 0 --choice custom --custom-headline "..." --custom-secondary "..." --custom-cta "..."

# 6. Review generation plan (validates ALL prior steps)
bash {baseDir}/scripts/clone_safe.sh plan --session <ID> --index 0

# 7. Execute image generation (synchronous, ~5-10 min)
bash {baseDir}/scripts/clone_safe.sh execute --session <ID> --index 0
# Retry after failure:
bash {baseDir}/scripts/clone_safe.sh execute --session <ID> --index 0 --force

# Skip an ad:
bash {baseDir}/scripts/clone_safe.sh skip --session <ID> --index 0

# Skip all remaining unprocessed ads (bulk shortcut):
bash {baseDir}/scripts/clone_safe.sh skip-all --session <ID>

# Check session progress:
bash {baseDir}/scripts/clone_safe.sh session-status --session <ID>

# List all active sessions:
bash {baseDir}/scripts/clone_safe.sh list-sessions
```

**Subcommand summary:**

| Subcommand       | Purpose                                                   | Prerequisites |
| ---------------- | --------------------------------------------------------- | ------------- |
| `init`           | Create session, load catalog, generate briefs             | —             |
| `show-ad`        | Upload competitor image to Slack, display analysis        | —             |
| `set-product`    | Record confirmed product for ad                           | `show-ad`     |
| `copy-gen`       | Generate LLM copy variations (Opus → Flash fallback)      | `set-product` |
| `set-copy`       | Record user's copy selection                              | `copy-gen`    |
| `plan`           | Validate all steps + write generation plan                | `set-copy`    |
| `execute`        | Read plan + run image generation (synchronous, ~5-10 min) | `plan`        |
| `skip`           | Skip ad, move to next                                     | —             |
| `skip-all`       | Skip all remaining unprocessed ads                        | —             |
| `session-status` | Show per-ad step completion, verify PID status            | —             |
| `list-sessions`  | List active/expired sessions                              | —             |

**Init flags:**

| Flag         | Description                                    | Default   |
| ------------ | ---------------------------------------------- | --------- |
| `--brand`    | Brand directory name in catalog (required)     | —         |
| `--top`      | Clone top N assets by rank                     | `5`       |
| `--type`     | `statics` or `videos`                          | `statics` |
| `--assets`   | Comma-separated asset hashes (overrides --top) | —         |
| `--no-match` | Disable brand asset matching                   | off       |

**set-copy flags:**

| Flag                 | Description                                         | Default |
| -------------------- | --------------------------------------------------- | ------- |
| `--session`          | Session ID (required)                               | —       |
| `--index`            | Ad index (required)                                 | —       |
| `--choice`           | `1`, `2`, `3`, or `custom` (required)               | —       |
| `--custom-headline`  | Custom headline text (with `--choice custom`)       | `""`    |
| `--custom-secondary` | Custom secondary body text (with `--choice custom`) | `""`    |
| `--custom-cta`       | Custom CTA text (with `--choice custom`)            | `""`    |

Sessions stored at `workspace/.clone-sessions/cln-*.json` (mode 0600, 4hr TTL by default, thread-affine). Override TTL via `CLONE_SESSION_TTL` env var (seconds), e.g. `CLONE_SESSION_TTL=28800` for 8 hours.

---

## 5. Pre-Flight Check (`clone_preflight.sh`)

Run before first clone to verify brand setup:

```bash
bash {baseDir}/scripts/clone_preflight.sh
```

Checks: brand identity exists, product images available, logo present, catalog health, competitors directory populated. Reports `[OK]`, `[WARN]`, `[CRIT]` for each check. Fix `[CRIT]` issues before cloning.

---

## 6. Brand Asset Catalog (`brand_asset_store.py`)

SQLite catalog of brand product images, logos, and creative assets:

```bash
# Add images (with optional metadata flags)
uv run {baseDir}/scripts/brand_asset_store.py add --type product-shot --product "Product Name" /path/to/image.jpg

# Bulk add directory
uv run {baseDir}/scripts/brand_asset_store.py add --type lifestyle /path/to/dir/

# Search assets (full-text search)
uv run {baseDir}/scripts/brand_asset_store.py search "chocolate shake jar"

# List with filters
uv run {baseDir}/scripts/brand_asset_store.py list --type product-shot

# Catalog stats
uv run {baseDir}/scripts/brand_asset_store.py stats

# Import from product-images.json
uv run {baseDir}/scripts/brand_asset_store.py import-json /path/to/product-images.json

# Import images from a directory
uv run {baseDir}/scripts/brand_asset_store.py import-dir /path/to/dir/ --product "Product Name"

# Catalog health check
uv run {baseDir}/scripts/brand_asset_store.py health
uv run {baseDir}/scripts/brand_asset_store.py health --json
```

**Asset types:** `product-shot`, `lifestyle`, `packaging`, `logo-variant`, `ugc`, `texture`, `model`, `ingredient`, `before-after`, `hero`, `flat-lay`, `other`

**`add` flags:**

| Flag           | Description                                       | Default    |
| -------------- | ------------------------------------------------- | ---------- |
| `files`        | Image files or directories (positional, required) | —          |
| `--type`       | Asset type (see list above)                       | `other`    |
| `--source`     | `crawled`, `uploaded`, or `generated`             | `uploaded` |
| `--ownership`  | `ours` or `competitor`                            | `ours`     |
| `--product`    | Product name                                      | —          |
| `--collection` | Collection name                                   | —          |
| `--tags`       | Comma-separated tags                              | —          |
| `--no-analyze` | Skip Gemini analysis                              | off        |

**`import-dir` flags:**

| Flag           | Description                                        | Default        |
| -------------- | -------------------------------------------------- | -------------- |
| `directory`    | Directory containing images (positional, required) | —              |
| `--product`    | Product name (default: inferred from dir name)     | —              |
| `--type`       | Asset type                                         | `product-shot` |
| `--no-analyze` | Skip Gemini analysis                               | off            |

---

## 7. Website Crawler (`brand_crawl.py`)

Crawl website for product images and design system extraction:

```bash
# Product image crawl (default)
uv run {baseDir}/scripts/brand_crawl.py --depth 2 --slack

# Explicit URL
uv run {baseDir}/scripts/brand_crawl.py --url "https://example.com" --all-pages --limit 100

# Design system extraction — captures CSS tokens, fonts, colors
uv run {baseDir}/scripts/brand_crawl.py --url "https://example.com" --design-system
```

| Argument          | Description                                         | Default                     |
| ----------------- | --------------------------------------------------- | --------------------------- |
| `--url`           | Website URL to crawl                                | `BRAND_WEBSITE_URL` env var |
| `--depth`         | Max crawl depth                                     | `2`                         |
| `--min-size`      | Min image dimension (px)                            | `300`                       |
| `--limit`         | Max images to discover                              | `200`                       |
| `--all-pages`     | Crawl all pages (not just product pages)            | off                         |
| `--slack`         | Post progress to Slack                              | off                         |
| `--design-system` | Extract CSS tokens, fonts, colors → write to brand/ | off                         |

---

## 8. Design System Capture (`catalog_design_system.py`)

Standalone design system extraction using Playwright and Gemini:

```bash
uv run {baseDir}/scripts/catalog_design_system.py <url>
```

Captures: color palette, typography stack, spacing tokens, component patterns. Outputs structured markdown to `colors.md`, `typography.md`, `design-rules.md`.

| Argument  | Description                                   | Default |
| --------- | --------------------------------------------- | ------- |
| `url`     | Website URL to capture (positional, required) | —       |
| `--depth` | Max crawl depth                               | `2`     |
| `--slack` | Post summary to Slack                         | off     |

---

## 9. Product Catalog (`product_catalog.py`)

Manage product pricing, descriptions, and image associations for LLM copy generation:

```bash
uv run {baseDir}/scripts/product_catalog.py --url "https://example.com" --brand "BrandDir"
uv run {baseDir}/scripts/product_catalog.py --url "https://example.com" --limit 100 --no-images
uv run {baseDir}/scripts/product_catalog.py --from-landing-pages
uv run {baseDir}/scripts/product_catalog.py --slack
```

| Flag                   | Description                                         | Default |
| ---------------------- | --------------------------------------------------- | ------- |
| `--url`                | Storefront URL to scrape                            | —       |
| `--brand`              | Brand directory name                                | `ours`  |
| `--limit`              | Max products to scrape                              | `50`    |
| `--no-images`          | Skip image download                                 | off     |
| `--slack`              | Post progress to Slack                              | off     |
| `--from-landing-pages` | Scrape from saved landing pages instead of live URL | off     |

---

## 10. CI Data Store (`ci_store.py`)

SQLite + optional ChromaDB store for competitive intelligence data:

```bash
# List monitored brands
uv run {baseDir}/scripts/ci_store.py brands

# Show brand status
uv run {baseDir}/scripts/ci_store.py status <brand>

# Scaling report for a brand
uv run {baseDir}/scripts/ci_store.py scaling <brand> [--threshold N]

# Search analyses by keyword
uv run {baseDir}/scripts/ci_store.py search "hook technique" [--brand BrandDir] [--limit N]

# Rank history for a specific asset
uv run {baseDir}/scripts/ci_store.py history <asset_hash>

# Backfill ChromaDB from existing analyses
uv run {baseDir}/scripts/ci_store.py backfill

# Force re-migration from catalog.json
uv run {baseDir}/scripts/ci_store.py migrate
```

**Subcommand summary:**

| Subcommand        | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| `brands`          | List all monitored brands                       |
| `status <brand>`  | Show brand monitoring status and asset counts   |
| `scaling <brand>` | Show scaling report for a brand                 |
| `search <query>`  | Full-text search across analyses                |
| `history <hash>`  | Rank history for a specific asset               |
| `backfill`        | Backfill ChromaDB from existing SQLite analyses |
| `migrate`         | Force re-migration from catalog.json            |

Stores: asset analyses, clone records, rank history, scaling events. Used by `clone_competitor.py` for clone persistence and by `competitor_monitor.py` for rank tracking.

---

## 11. Drive Sync (`sync_drive.py`)

Sync local assets, briefs, and creatives to Google Drive:

```bash
uv run {baseDir}/scripts/sync_drive.py --brand "BrandDir"
uv run {baseDir}/scripts/sync_drive.py --dry-run
uv run {baseDir}/scripts/sync_drive.py --sync-only
uv run {baseDir}/scripts/sync_drive.py --reconcile
```

| Flag          | Description                                                   | Default    |
| ------------- | ------------------------------------------------------------- | ---------- |
| `--brand`     | Filter to a specific brand directory name                     | all brands |
| `--dry-run`   | Preview changes without applying                              | off        |
| `--sync-only` | Phase 1 only: catalog → ci.db (skip Drive upload)             | off        |
| `--reconcile` | Phase 1 + 3: match existing Drive files (skip Phase 2 upload) | off        |

Syncs: competitor ad media, analysis docs, clone briefs, generated creatives. Creates/updates the Drive folder structure under `Competitor Ads/<Brand>/`.

---

## Workflow: End-to-End Clone Pipeline

1. **Crawl** — `brand_crawl.py` to build brand asset catalog
2. **Pre-flight** — `clone_preflight.sh` to verify brand setup
3. **Monitor** — `competitor_monitor.py` to download + analyze competitor ads
4. **Clone** — `clone_competitor.py init` for interactive session
5. **Generate** — Pixel receives briefs with `--input-image` product references

## Notes

- Clone generation uses two-phase architecture: `clone_competitor.py plan` validates all steps and writes a plan file, then `clone_competitor.py execute` reads the plan and runs `_generate_ads_internal.sh` directly. `generate_ads_safe.sh --category clone` hard-rejects with a redirect message. NEVER call `generate_ads_safe.sh` or `_generate_ads_internal.sh` directly for clone workflows.
- Default browser mode is headless. Use `--offscreen` for agent/automated use.
- Requires `yt-dlp` for video download fallback.
- Playwright Chromium auto-installs on first run.
- Facebook CDN URLs are publicly downloadable without auth.
- Images <100x100px skipped (icons/avatars).
- Google Drive upload requires `gog` CLI.
- Slack posting reads `SLACK_CHANNEL_ID` + `SLACK_THREAD_TS` from env.
- All scripts use PEP 723 inline dependencies — `uv run` handles installation automatically.
