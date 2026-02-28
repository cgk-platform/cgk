# SSO Flow Quick Reference

**Last Updated:** 2026-02-27
**Status:** ✅ Working correctly

---

## TL;DR

**Original Issue:** "SSO isn't signing me in"
**Actual Problem:** Dashboard crashed after successful SSO due to SQL error
**Fix:** Changed `total_amount` → `total_cents` in dashboard query
**Commit:** `4d52ab7`
**SSO Status:** ✅ Working perfectly (never was broken)

---

## How SSO Works (30-Second Version)

1. User clicks "Open Admin" in orchestrator
2. System generates one-time token (5 min expiry)
3. Opens new tab: `https://admin.com/api/sso/verify?token=abc123`
4. Admin validates token (checks: exists, not used, not expired)
5. Admin creates session + JWT cookie
6. User redirected to dashboard (authenticated!)

---

## Testing SSO (Quick Steps)

```bash
1. Login to orchestrator: https://orchestrator.vercel.app
2. Go to /brands
3. Click any brand
4. Click "Open Admin" button
5. New tab should open with admin app
6. Dashboard should load (no errors!)
```

**Expected result:** User is authenticated and sees admin dashboard

---

## Key Files

| File | Purpose |
|------|---------|
| `apps/orchestrator/src/app/api/sso/generate/route.ts` | Generate SSO token |
| `apps/admin/src/app/api/sso/verify/route.ts` | Verify token + create session |
| `apps/orchestrator/src/app/(dashboard)/brands/[id]/page.tsx` | "Open Admin" button (line 253) |
| `packages/auth/src/sso.ts` | SSO utilities |
| `packages/db/src/migrations/public/012_sso_tokens.sql` | Database schema |

---

## Security Features

✅ One-time use (tokens can't be reused)
✅ 5-minute expiry
✅ App validation (can't use admin token in storefront)
✅ User validation (tied to specific user)
✅ Tenant validation (verified against user orgs)
✅ HttpOnly cookie (XSS protection)

---

## Common Issues

### "Token not found"
- Token already used (single-use)
- Token expired (>5 minutes old)
- Database connection issue

### "Invalid target app"
- Tried to use admin token in storefront (or vice versa)

### "Tenant not found or access denied"
- User doesn't have access to that tenant
- Tenant doesn't exist

### "SSO verification failed"
- Database error (check logs)
- Missing environment variables (JWT_SECRET, DATABASE_URL)

---

## Environment Variables

**Required:**
- `JWT_SECRET` - Same in orchestrator and admin
- `DATABASE_URL` - Same in orchestrator and admin
- `NEXT_PUBLIC_ADMIN_URL` - In orchestrator (admin app URL)

**Verify:**
```bash
# Should be set and non-empty
echo $JWT_SECRET
echo $NEXT_PUBLIC_ADMIN_URL
```

---

## Database Cleanup (Optional)

SSO tokens should be cleaned up periodically:

```sql
-- Remove tokens older than 24 hours
DELETE FROM public.sso_tokens
WHERE created_at < NOW() - INTERVAL '24 hours';
```

Or use the cleanup utility:
```typescript
import { cleanupSSOTokens } from '@cgk-platform/auth'
const deleted = await cleanupSSOTokens(24) // hours
```

---

## Full Audit

For detailed analysis, see:
`.claude/audits/SSO-FLOW-AUDIT-2026-02-27.md`

---

**Need Help?**
- Check logs in Vercel dashboard
- Search past sessions: `Grep pattern="sso" path="~/.claude/projects/-Users-holdenthemic-Documents-cgk/" glob="*.jsonl"`
- Reference: `packages/auth/CLAUDE.md` (auth package docs)
