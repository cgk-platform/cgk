# Complete Figma Page & Section Audit

**Figma File:** https://www.figma.com/design/P14Fv87DK7Bj5Zf162DA61/Meliusly?node-id=0-1

**Date:** 2026-03-02

---

## All Page Flows in Figma

| Page             | Desktop (1440px)                    | Mobile (360px)       | Status                      |
| ---------------- | ----------------------------------- | -------------------- | --------------------------- |
| **Homepage**     | 1:4242                              | 1:4257               | ✅ Need to build            |
| **PDP**          | 1:4127                              | 1:4154               | ✅ Built (12 sections)      |
| **Collections**  | 1:4174                              | 1:4206               | ⏳ Need to build            |
| **How It Works** | 1:4301 (Custom_Flow)                | 1:4363 (Custom_Flow) | ⏳ Need to build from Figma |
| **Cart**         | 1:4290 (empty), 1:4292 (with items) | -                    | ✅ Built (CartDrawer)       |
| **Mobile Nav**   | -                                   | 1:4294               | ✅ Built                    |

---

## Section-Level Components Found

### About Section

- **Desktop:** 1:4250 (743px height) - appears on Homepage
- **Mobile:** 1:4265 (773px height)
- **Location:** Part of Homepage flow, NOT a standalone page

### Contact

- **NOT FOUND** as standalone page or section in Figma
- May need to be designed OR exists under different name

---

## ACTIONS REQUIRED

### 1. Delete Non-Figma Pages (DONE)

- ❌ Deleted: `/about/page.tsx` (made from scratch)
- ❌ Deleted: `/contact/page.tsx` (made from scratch)
- ❌ Deleted: `/how-it-works/page.tsx` (made from scratch)
- ❌ Deleted: `/api/contact/route.ts` (made from scratch)

### 2. Build from Figma - Homepage

- [ ] Get Figma design for node 1:4242 (desktop)
- [ ] Build all homepage sections pixel-perfect
- [ ] Verify against node 1:4257 (mobile)

### 3. Build from Figma - Collections

- [ ] Get Figma design for node 1:4174 (desktop)
- [ ] Build collections page pixel-perfect
- [ ] Verify against node 1:4206 (mobile)

### 4. Build from Figma - How It Works

- [ ] Get Figma design for node 1:4301 (desktop Custom_Flow)
- [ ] Build pixel-perfect from Figma
- [ ] Verify against node 1:4363 (mobile)

### 5. Clarify Missing Pages

- [ ] **Contact page:** Does this exist in Figma? If not, should it be designed first?
- [ ] **About page:** This is a section on Homepage (1:4250), not a standalone page

---

## Next Steps

1. Commit the deletion of non-Figma pages
2. Build Homepage from Figma 1:4242
3. Build Collections from Figma 1:4174
4. Build How It Works from Figma 1:4301
5. Ask user about Contact page design

**RULE:** No more creating pages from scratch. Everything must come from Figma designs.
