# Reference Documentation

This folder contains reference documentation copied from the RAWDOG codebase for use during multi-tenant platform implementation. These docs have been adapted with multi-tenant context where applicable.

## Available References

| Document | Purpose | Used By Phases |
|----------|---------|----------------|
| **ADMIN-PATTERNS.md** | Batch save, cache-busting, Neon pooling patterns, multi-tenant query context | 2A, 2B, 2C, 2D, 2SA-*, 2PO-* |
| **META-ADS-INTEGRATION.md** | Meta/Facebook Marketing API patterns, rate limits, async reports | 2D, 2PO-HEALTH, 5D |
| **GOOGLE-ADS-INTEGRATION.md** | Google Ads GAQL queries, OAuth, spend sync | 2D, 2PO-HEALTH, 5D |
| **TIKTOK-ADS-INTEGRATION.md** | TikTok Pixel, Events API, spend sync | 2D, 2PO-HEALTH, 5D |

## When to Use These Docs

- **Before implementing any admin API route**: Read ADMIN-PATTERNS.md for cache-busting and Neon pooling gotchas
- **Before implementing ad platform integrations**: Read the relevant ads integration doc for rate limits and patterns
- **Before building health monitors for ad platforms**: Read the ads docs for API patterns and credential handling

## Source Location

Original docs are in `/docs/ai-reference/` in the RAWDOG codebase. These copies are maintained separately for the platform project.
