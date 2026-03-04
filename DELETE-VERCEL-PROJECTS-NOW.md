# Delete Vercel Projects - Simple Guide

## The Real Question: Do You Want WordPress-Style Forks or Not?

### Option A: Just Clean Up (Delete Everything Now)

**If you DON'T want to migrate tenants to separate forks:**

```bash
# Delete all 9 Vercel projects RIGHT NOW (safe - data is in database)
vercel project rm cgk-meliusly-storefront --scope cgk-linens-88e79683 --yes
vercel project rm cgk-admin --scope cgk-linens-88e79683 --yes
vercel project rm cgk-storefront --scope cgk-linens-88e79683 --yes
vercel project rm cgk-shopify-app --scope cgk-linens-88e79683 --yes
vercel project rm cgk-orchestrator --scope cgk-linens-88e79683 --yes
vercel project rm cgk-creator-portal --scope cgk-linens-88e79683 --yes
vercel project rm cgk-contractor-portal --scope cgk-linens-88e79683 --yes
vercel project rm cgk-command-center --scope cgk-linens-88e79683 --yes
vercel project rm cgk-mcp-server --scope cgk-linens-88e79683 --yes
```

**What happens:**

- ✅ Vercel projects deleted
- ✅ Data still safe in Neon database
- ✅ Can redeploy anytime from GitHub
- ✅ No data loss

**When to do this:**

- You're cleaning up old infrastructure
- You're not actively using these tenants
- You'll redeploy if/when needed

---

### Option B: WordPress-Style Migration (Export First, Then Delete)

**If you DO want each tenant in separate fork:**

This is what we built in Phase 3-8. But honestly, it's overcomplicated for what you need.

**The REAL simple version:**

1. **Keep using the current monorepo** (it works fine!)
2. **Delete the unused Vercel projects** (cleanup)
3. **Deploy ONLY what you need** when you need it

**Why WordPress-style might be overkill:**

- You're the only user of this platform (not selling it to customers)
- Managing 4 separate repos is more work, not less
- Current monorepo works perfectly
- You can always fork later if needed

---

## What I Recommend

### Immediate Action (Do This Now):

```bash
# 1. Delete cgk-meliusly-storefront (app doesn't exist anymore)
vercel project rm cgk-meliusly-storefront --scope cgk-linens-88e79683 --yes
```

### Then Decide: Multi-Tenant or Separate Forks?

**Multi-Tenant (Simpler - Current Setup):**

- Keep all 4 tenants in one database
- Deploy only the apps you need
- One codebase, easy to maintain
- **Action**: Delete unused Vercel projects, keep cgk-admin + cgk-storefront

**Separate Forks (WordPress-Style):**

- Each tenant gets own repo + Vercel + database
- More isolated, but more infrastructure to manage
- **Action**: Run export script first, THEN delete

---

## Quick Delete Script

If you want to delete everything and start fresh:

```bash
#!/bin/bash
# delete-all-vercel-projects.sh

PROJECTS=(
  "cgk-meliusly-storefront"
  "cgk-admin"
  "cgk-storefront"
  "cgk-shopify-app"
  "cgk-orchestrator"
  "cgk-creator-portal"
  "cgk-contractor-portal"
  "cgk-command-center"
  "cgk-mcp-server"
)

for project in "${PROJECTS[@]}"; do
  echo "Deleting $project..."
  vercel project rm "$project" --scope cgk-linens-88e79683 --yes
done

echo "✅ All projects deleted"
```

**Run it:**

```bash
chmod +x delete-all-vercel-projects.sh
./delete-all-vercel-projects.sh
```

---

## Can You Undo?

**Yes, for 7 days:**

- Vercel keeps deleted projects for 7 days
- Contact support@vercel.com to restore
- After 7 days, they're gone forever (but data is still in database)

---

## My Honest Recommendation

1. **Delete `cgk-meliusly-storefront` NOW** (app doesn't exist)
2. **Keep cgk-admin + cgk-storefront** (if you're using them)
3. **Delete the other 7** if you're not using them
4. **Forget the WordPress-style migration** unless you're actually selling this platform to customers

The complexity we built (tenant export, GitHub forks, etc.) is for **multi-tenant SaaS distribution**, not for your personal use.

If it's just you using this platform, the current setup is fine. Just delete what you don't need.
