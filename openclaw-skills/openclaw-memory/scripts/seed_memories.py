#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""openCLAW Memory Seed — Populate profile DBs with structured user records and longterm entries.

Seeds user records and longterm memories extracted from MEMORY.md content that was
offloaded to make room for the SQLite-backed on-demand recall system.

Usage:
    seed_memories.py --profile cgk|rawdog|vitahustle [--dry-run]
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import memory_db as db


def _err(msg):
    print(msg, file=sys.stderr)


# ---------------------------------------------------------------------------
# Seed data per profile
# ---------------------------------------------------------------------------

CGK_USERS = [
    {
        "id": "U0ACL7UV3RV",
        "display_name": "Holden Russell",
        "real_name": "Holden Russell",
        "timezone": "America/Los_Angeles",
        "notes": "Owner. Prefers no emojis. DM channel D0AFV778S56.",
        "context": {"role": "owner", "dm_channel": "D0AFV778S56"},
    },
    {
        "id": "U04UMHD0PEY",
        "display_name": "Roan",
        "timezone": "America/New_York",
        "notes": "Task reports daily at 10am EST. Track unresponded mentions (48h window). Paired with Jessi.",
        "context": {"report_channel": "C0AG4094ECC", "paired_with": "U098RJYQ1CN"},
    },
    {
        "id": "U098RJYQ1CN",
        "display_name": "Jessi",
        "timezone": "America/New_York",
        "notes": "Task reports daily at 10am EST. Track unresponded mentions (48h window). Paired with Roan.",
        "context": {"report_channel": "C0AG4094ECC", "paired_with": "U04UMHD0PEY"},
    },
    {
        "id": "U_FREDDY",
        "display_name": "Freddy",
        "notes": "Image gen projects in #fredies-workspace. Always load fredies-style-guide.md when working with Freddy. Says 'starting new project' to kick off sessions.",
        "preferences": {"workspace_channel": "fredies-workspace", "style_guide": "workspace/fredies-style-guide.md"},
    },
    {
        "id": "U_NINA",
        "display_name": "Nina",
        "notes": "Amazon A+ strategy with Mathilde. Image gen rules: Meta Ads = 3 orientations, Amazon listings = single orientation, Packaging = single 1x1. Only generate multiple ratios for Meta Ads.",
        "preferences": {"image_gen_rules": "single_ratio_for_non_ads"},
    },
    {
        "id": "U_BRUNO",
        "display_name": "Bruno",
        "notes": "Amazon SP bulk files, PPC Elite. Campaign name MUST include SKU + match type. Campaign/Ad Group IDs MUST always be populated (temp IDs ok). Ad Group name must match match type.",
        "preferences": {"ppc_tool": "PPC Elite"},
    },
    {
        "id": "U_MATHILDE",
        "display_name": "Mathilde",
        "notes": "Amazon A+ strategy for CGK Linens. Works with Nina on listing content.",
    },
    {
        "id": "U_TRI",
        "display_name": "TRI",
        "notes": "Ad evaluation rules: Always check purchase volume before scaling. Do not recommend instant scaling for low-volume ads even with high ROAS. Include volume context in all performance evaluations.",
        "preferences": {"ad_eval_rules": "volume_threshold_before_scaling"},
    },
]

CGK_LONGTERM = [
    {
        "category": "fact",
        "content": "Roan & Jessi Task Report: Daily at 10am EST (7am PST) in channel:C0AG4094ECC. Show unresponded mentions/tasks from last 48h for Roan (U04UMHD0PEY) and Jessi (U098RJYQ1CN). If EITHER has responded to a tagged message, do NOT include it. Bold channel names, double-space between entries, include deep links. Header: '*:date: Roan & Jessi Task Report -- [Current Date]*'",
        "source": "MEMORY.md offload",
        "tags": ["report", "roan", "jessi", "daily"],
    },
    {
        "category": "preference",
        "content": "Freddy image gen workspace rules: When working with Freddy in #fredies-workspace, ALWAYS load workspace/fredies-style-guide.md. Contains shot type rotation, model direction, bedroom aesthetic, lighting, color palette, project workflow. Freddy says 'starting new project' to kick off a new product session and provides description + reference images.",
        "source": "MEMORY.md offload",
        "tags": ["freddy", "image-gen"],
    },
    {
        "category": "preference",
        "content": "Nina image gen orientation rules: Meta Ads = generate all 3 orientations (1x1, 9x16, 16x9). Amazon listing images = single orientation only (e.g. 1200x1500). Packaging/product design mockups = single 1x1 square. General rule: only generate multiple ratios when output is explicitly for Meta Ads.",
        "source": "MEMORY.md offload",
        "tags": ["nina", "image-gen"],
    },
    {
        "category": "process",
        "content": "Bruno SP Bulk File Rules: (1) Campaign name MUST include SKU and match type as suffix, format: [Base Name] - [SKU] - [Match Type]. (2) Campaign ID and Ad Group ID MUST always be populated (use temp IDs like CAMP1, AG1) -- never leave blank. (3) Ad Group name must match the match type string exactly (Exact, Broad, Phrase).",
        "source": "MEMORY.md offload",
        "tags": ["bruno", "amazon", "bulk-file"],
    },
    {
        "category": "process",
        "content": "SKC Default Launch Settings (Bruno/PPC Elite): Daily budget $50, TOS placement +25%, all other placements 0%, bidding strategy Dynamic bids - down only, start date ALWAYS today's actual date, structure: Campaign > 4 Bidding Adjustments > Ad Group > Product Ad > Keyword (Exact).",
        "source": "MEMORY.md offload",
        "tags": ["bruno", "amazon", "skc-launch"],
    },
    {
        "category": "process",
        "content": "TRI Ad Evaluation Rules: (1) Always check purchase volume before scaling recommendations. (2) Do not recommend instant scaling for low-volume ads even with high ROAS (e.g. 1 purchase at 3x ROAS requires further investigation). (3) Include volume context in all performance evaluations.",
        "source": "MEMORY.md offload",
        "tags": ["tri", "ad-evaluation"],
    },
    {
        "category": "process",
        "content": "Nina & Mathilde A+ Strategy Framework for CGK Linens: 5 steps: (1) Competitive Intelligence (top 20 competitors), (2) Rufus & SEO (semantic clusters, no keyword stuffing), (3) A+ Module Architecture (6 modules), (4) Conversion Optimization (A/B variants), (5) Ruthless Audit. Tone: confident, clean, high-trust, premium-functionality. Hard rules: NO customer reviews in A+, module body 20 words max, headline 5-6 words max, CVR focus on gusset pillow, 6 modules total, each with copy + matching image. Full template: workspace/amazon-aplus-kickoff-template.md",
        "source": "MEMORY.md offload",
        "tags": ["nina", "mathilde", "amazon", "aplus"],
    },
    {
        "category": "fact",
        "content": "Amazon Agent Team Routing: Keystone (amazon-ppc) = PPC/campaigns/bids/keywords/bulk files/ACOS. Lister (amazon-listing) = listings/titles/bullets/A+/backend keywords. Mapper (amazon-catalog) = ASIN research/catalog/competitors/variations. Ledger (amazon-analytics) = analytics/TACOS/P&L/velocity/business reports. Harbor (amazon) = inventory/FBA/suppressed/stranded/general ops. Agent instructions at workspace/agents/<agent-id>/INSTRUCTIONS.md.",
        "source": "MEMORY.md offload",
        "tags": ["amazon", "routing"],
    },
    {
        "category": "process",
        "content": "Team Task Digest (Daily): 5:00 AM PST in channel:C0AF9UDAY5D (#nina-nova). Sources: Asana tasks for Nina, Slack #cgk-creative (C08SJGN9PSM) last 7 days, mentions in #nina-nova, Google Sheet 1LxOr-lO16hPbmRL-80mVFCKGiNSJ3GXu0kpB8yW6Oz4. Design Team Filter: Nina, Ryan, Shandon, Christiana, Jeff, Mathilde, Freddy, Nestor. Only include tasks due today or future. Prioritize by due date, flag upcoming deadlines.",
        "source": "MEMORY.md offload",
        "tags": ["cron", "digest", "nina"],
    },
    {
        "category": "decision",
        "content": "Heartbeat Mechanism DISABLED: heartbeat.every set to 'off' in openclaw.json. Reason: heartbeats run in main session and inherit its delivery context. When Nova is active in a thread, heartbeat output routes to that thread instead of top-level. Cron jobs with explicit delivery routing cover all periodic tasks instead. Do NOT re-enable without code-level fix for delivery context isolation.",
        "source": "MEMORY.md offload",
        "tags": ["heartbeat", "decision"],
    },
    {
        "category": "process",
        "content": "Scheduled Reports Config: All use delivery.mode 'announce'. Meta-ads heartbeat: 9am/12pm/3pm/6pm PST snapshot today > #growth. Daily recap: 6:30am snapshot yesterday > #growth. Weekly recap: 7:30am Mon snapshot last_7d > #growth. Creative intelligence: 8:30am Mon creative_analysis_safe.sh > #growth. Mention summaries: chris 7:15am, roan 8am, sam 1pm all to #nova-sam. On fire: read report-learnings.md, run stdout mode, synthesize, append learnings. announceTimeoutMs: 300000.",
        "source": "MEMORY.md offload",
        "tags": ["cron", "reports", "meta-ads"],
    },
    {
        "category": "process",
        "content": "MCP Knowledge Storage Rules (CGK): ALWAYS store brand info via create_brand_document (categories: brand_voice, product_info, faq, policies, guidelines, templates). ALWAYS retrieve brand context before writing ad copy (list_brand_documents brand_voice + search_brand_documents for product). Store proven ad copy as creative ideas (type: hook/script, status: proven, include performanceScore). Store worst-performing as anti-patterns. After competitor analysis: store as brand document (product_info). After creative-library: auto-pushes when CGK_MCP_SERVER_URL/CGK_MCP_API_KEY set. Search before creating to avoid duplicates. Image/video gen = openCLAW skills ONLY.",
        "source": "MEMORY.md offload",
        "tags": ["mcp", "knowledge"],
    },
    {
        "category": "process",
        "content": "Excel Toolkit: Custom skill at workspace/skills/excel-toolkit/. Use for ALL Excel files from PPC team. NEVER read raw Excel bytes. Commands: summary, sheet (paginated with --limit/--columns), stats, search, formulas, set-cell, append-rows, to-markdown. Path: uv run workspace/skills/excel-toolkit/scripts/excel_read.py <command>",
        "source": "MEMORY.md offload",
        "tags": ["excel", "ppc"],
    },
    {
        "category": "process",
        "content": "Vector Store: Semantic vector DB at workspace/skills/vector-store/. ChromaDB at workspace/vector-db/chroma/. Workflow: ingest once (excel/text/data), search anytime. Collections: campaigns, keywords, products, brand, ad_copy, competitor, excel_data. Ingest new Excel from PPC immediately, brand guidelines to brand collection, proven ad copy to ad_copy. Path: uv run workspace/skills/vector-store/scripts/<ingest|search|manage>.py",
        "source": "MEMORY.md offload",
        "tags": ["vector-store", "rag"],
    },
]

RAWDOG_USERS = [
    {
        "id": "U0ACL7UV3RV",
        "display_name": "Holden Russell",
        "real_name": "Holden Russell",
        "timezone": "America/Los_Angeles",
        "notes": "Owner. DM channel D0AFM37GTNG.",
        "context": {"role": "owner", "dm_channel": "D0AFM37GTNG"},
    },
]

RAWDOG_LONGTERM = [
    {
        "category": "fact",
        "content": "RAWDOG Brand Quick Reference: Entity: Rawdog, Inc. Website: https://www.justrawdogit.com (ALWAYS use www.). Positioning: first seed oil-free men's skincare brand. Tagline: 'Raw performance. Stripped down to only what works.' Products: Cleanser ($39), Moisturizer ($45), Eye Cream ($48), Core Set bundle ($118.80 / $99 sub). Active discount: RAWDOG10. Reward tiers: $50+ free shipping, $60+ $25 gift card, $99+ free hat. Subscription: 15% off, every 45/60/75 days. Default recommendation: Core Set subscription. Shipping: US-only, free $50+, ships within 1 business day. Support: support@justrawdogit.com. Social: @justrawdogit. Creator program: justrawdogit.com/creator/join",
        "source": "MEMORY.md offload",
        "tags": ["brand", "products", "pricing"],
    },
    {
        "category": "process",
        "content": "MCP Knowledge Storage Rules (RAWDOG): ALWAYS store brand info via add_brand_knowledge (categories: brand_identity, products, pricing, competitors, creator_guidelines, faqs, policies, scripts, company_info). ALWAYS retrieve brand context before writing ad copy (get_brand_context_overview + search_brand_knowledge). Store proven ad copy as creative ideas (type: hook/script, status: proven, include performance_score). Store worst-performing as anti-patterns. After competitor analysis: store as brand knowledge (competitors). After creative-library: always push to platform. Search before creating to avoid duplicates. Image/video gen = openCLAW skills ONLY.",
        "source": "MEMORY.md offload",
        "tags": ["mcp", "knowledge"],
    },
]

VITAHUSTLE_USERS = [
    {
        "id": "U0ACL7UV3RV",
        "display_name": "Holden Russell",
        "real_name": "Holden Russell",
        "timezone": "America/Los_Angeles",
        "notes": "Owner. DM channel D0AFXHVML4V.",
        "context": {"role": "owner", "dm_channel": "D0AFXHVML4V"},
    },
]

VITAHUSTLE_LONGTERM = [
    {
        "category": "fact",
        "content": """VitaHustle Brand Guidelines & Claims:
- VitaHustle is one word, pronounced Vy-ta-Hustle, registered trademark.
- Tagline: "Damn Delicious". Mission: Simplify daily nutrition -- ONE shake replaces protein powder + greens + vitamins.
- Founded by Kevin Hart -- always mention for credibility.
- Guarantee: 60-day money-back (less s&h).
Key Numbers: 86 superfoods & nutrients, 20g plant-based protein (ONE) / 30g (MAX), 22 vitamins & minerals (100% RDA of C,D,E,Zinc), 3B CFU probiotics + 14 digestive enzymes, 300mg Ashwagandha (KSM-66), 1g sugar, 150-160 cal, 7x less sugar than leading superfood shake (needs disclaimer), 60-day guarantee, 4/5 prefer taste, 200K+ customers, 5M+ shakes, 4.7/5 stars, 2000+ 5-star reviews.
Survey stats (require disclaimer): 98% improved wellness, 95% simplified nutrition, 89% more energy, 83% better digestion, 85% weight management.
Ashwagandha claims (require disclaimer): 72% reduced stress/cortisol, 47% improved hormonal balance, 82% enhanced vitality.
Timeline: Day 30 energy/digestion/recovery, Day 60 less stress/clarity/bloat, Day 90 better sleep/cognition/hormones.
Free of: top 9 allergens, soy/dairy/gluten-free, non-GMO, no artificial anything, no sugar alcohols, 0mg cholesterol, made in USA.
Press: Good Housekeeping, Mindbodygreen, 60 Minutes, Entrepreneur, Essence, Men's Health, Popular Science.
QVC: Multiple sellouts, exclusive protein powder, record dollars-per-minute.""",
        "source": "MEMORY.md offload",
        "tags": ["brand", "claims", "guidelines"],
    },
    {
        "category": "fact",
        "content": """VitaHustle FTC Compliance -- FORBIDDEN CLAIMS (NEVER USE):
NEVER write: cures/treats/prevents/heals/diagnoses ANY disease, treats anxiety (use 'balances mood'), reduces depression (use 'supports emotional balance'), boosts immunity (use 'supports immune system'), prevents Alzheimer's (use 'supports memory and cognition'), treats arthritis (use 'supports joint flexibility'), lowers blood sugar, lowers risk of heart attack (use 'supports heart health'), lose weight/burns fat (use 'supports weight management'), specific weight loss promises in testimonials, fights COVID/flu.
If customer/creator says something forbidden, cannot use that testimonial even with disclaimer.
Required footer on any LP/ad with health claims: standard FTC disclaimer.""",
        "source": "MEMORY.md offload",
        "tags": ["brand", "ftc", "compliance", "forbidden"],
    },
    {
        "category": "fact",
        "content": "VitaHustle Audience Personas (2026): Marcus (32-48, $65-95K, Kevin Hart fan, challenge hook), Jess (28-44, $60-90K, busy mom, highest thumbstop 41.6%), Chris (35-55, $50-80K, value optimizer, best ROAS 1.29x), Taylor (18-34, $35-65K, trend foodie, Dubai Chocolate), Dana (30-52, $55-85K, 30-Day transformer, 1.29x ROAS), Alex (30-50, $80-130K, skeptical optimizer, 2.12x ROAS highest), Carol (50-65, $70-110K, over-50 seeker, underserved). Full details: brand/personas/audience-personas-2026.md. Reference relevant persona before creating creative briefs.",
        "source": "MEMORY.md offload",
        "tags": ["brand", "personas", "audience"],
    },
    {
        "category": "fact",
        "content": "VitaHustle Creative Self-Audit (2026-02-19): Top 20 ads analyzed (16 images + 4 videos). Key finding: 'Celebrity-Anchored Direct Response' -- 75% rely on Kevin Hart. Core formula: Bundle & Save statics (50%+ OFF + free gifts) + confrontational video hooks. Trend: Dubai Chocolate across 5 ads. Gaps: no everyday-hero UGC, no efficacy/science angle, no on-the-go use cases, no comparison statics. CEO 'sick of UGC' -- explore in-between content. Full report: brand/self-audit/competitive-analysis.md",
        "source": "MEMORY.md offload",
        "tags": ["brand", "audit", "creative"],
    },
    {
        "category": "fact",
        "content": "VitaHustle 2026 Product Launch Calendar: RTD (Ready-To-Drink): Jan (Choc/Van), May (Strawberry/Cookies). Powder: May (Birthday Cake), July (Pina Colada), Sept (Salted Caramel/PSL), Nov (Jumanji).",
        "source": "MEMORY.md offload",
        "tags": ["brand", "products", "launches"],
    },
    {
        "category": "preference",
        "content": "VitaHustle Performance Reporting Style: Use emojis for visual cues. Bold labels + line breaks for metrics. Group logically (Overview vs Campaign Detail). ALWAYS specify data source (Meta or Triple Whale). For comparison, list Meta side-by-side with TW Meta Channel. Metrics: Meta = CPP, Spend, ROAS, Purchases. TW = nCPA, New Visitor %, Spend, ROAS, Purchases.",
        "source": "MEMORY.md offload",
        "tags": ["reporting", "style"],
    },
    {
        "category": "process",
        "content": "Triple Whale Config (VitaHustle): Source of truth for ALL ad spend decisions (TW > Meta). Default attribution: Total Impact (TI), switchable to TA/TA+Views. Shop domain: vita-hustle.myshopify.com. TI stability: needs 7-day+ window. Key blended: Blended ROAS, MER, Net Profit, True AOV. Key acquisition: NCPA, LTV/CPA ratio. Health threshold: LTV/CPA > 3x healthy, < 2x warning. Script: uv run <profile>/skills/triple-whale/scripts/triple_whale_api_helper.py. Commands: test-auth, summary, attribution, compare, channels. OAuth stubs: moby, sql (not yet available). Always run TW alongside meta-ads reports, flag discrepancies > 15%.",
        "source": "MEMORY.md offload",
        "tags": ["triple-whale", "analytics"],
    },
]


PROFILE_DIRS = {
    "cgk": Path.home() / ".openclaw",
    "rawdog": Path.home() / ".openclaw-rawdog",
    "vitahustle": Path.home() / ".openclaw-vitahustle",
}


def _get_profile_data(profile: str):
    """Return (users, longterm) for the given profile."""
    if profile == "cgk":
        return CGK_USERS, CGK_LONGTERM
    elif profile == "rawdog":
        return RAWDOG_USERS, RAWDOG_LONGTERM
    elif profile == "vitahustle":
        return VITAHUSTLE_USERS, VITAHUSTLE_LONGTERM
    else:
        _err(f"Unknown profile: {profile}")
        sys.exit(1)


def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args

    profile = None
    for i, a in enumerate(args):
        if a == "--profile" and i + 1 < len(args):
            profile = args[i + 1]

    if not profile:
        _err("Usage: seed_memories.py --profile cgk|rawdog|vitahustle [--dry-run]")
        sys.exit(1)

    if profile not in PROFILE_DIRS:
        _err(f"Unknown profile: {profile}")
        sys.exit(1)

    # Override db module paths since symlinks resolve to repo dir
    profile_root = PROFILE_DIRS[profile]
    db.PROFILE_ROOT = profile_root
    db.DB_DIR = profile_root / "memory"
    db.DB_PATH = db.DB_DIR / "openclaw-memory.db"

    _err(f"[seed] profile={profile}, db={db.DB_PATH}")
    _err(f"[seed] dry_run={dry_run}")

    users, longterm_entries = _get_profile_data(profile)
    conn = db.get_db() if not dry_run else None

    stats = {"users_added": 0, "users_skipped": 0, "longterm_added": 0, "longterm_skipped": 0}

    # Seed users
    for u in users:
        uid = u["id"]
        if not dry_run:
            existing = db.user_get(conn, uid)
            if existing:
                _err(f"  [skip] User {uid} ({u['display_name']}) already exists")
                stats["users_skipped"] += 1
                continue
            db.user_upsert(
                conn, uid,
                display_name=u.get("display_name", uid),
                real_name=u.get("real_name"),
                timezone=u.get("timezone"),
                notes=u.get("notes", ""),
                preferences=u.get("preferences", {}),
                context=u.get("context", {}),
            )
            _err(f"  [add]  User {uid} ({u['display_name']})")
            stats["users_added"] += 1
        else:
            _err(f"  [dry]  User {uid} ({u['display_name']})")
            stats["users_added"] += 1

    # Seed longterm entries
    for entry in longterm_entries:
        content = entry["content"]
        if not dry_run:
            # Deduplicate by checking first 80 chars via LIKE (avoids FTS5 syntax issues)
            check = content.strip()[:80].replace("'", "''")
            rows = conn.execute(
                "SELECT id FROM longterm WHERE content LIKE ? LIMIT 1",
                (f"{check}%",),
            ).fetchall()
            is_dup = len(rows) > 0
            if is_dup:
                _err(f"  [skip] Longterm [{entry['category']}]: {content[:60]}...")
                stats["longterm_skipped"] += 1
                continue
            db.longterm_add(
                conn,
                category=entry["category"],
                content=content,
                source=entry.get("source", "seed"),
                confidence=1.0,
                tags=entry.get("tags", []),
                created_by="seed_memories",
            )
            _err(f"  [add]  Longterm [{entry['category']}]: {content[:60]}...")
            stats["longterm_added"] += 1
        else:
            _err(f"  [dry]  Longterm [{entry['category']}]: {content[:60]}...")
            stats["longterm_added"] += 1

    if conn:
        conn.close()

    _err(f"[seed] Done: {stats['users_added']} users added, {stats['users_skipped']} skipped, "
         f"{stats['longterm_added']} longterm added, {stats['longterm_skipped']} skipped")
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
