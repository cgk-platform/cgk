# 🚨 CRITICAL: Always Use Figma for All Builds

**Date:** 2026-03-02
**Context Compaction Handoff**

---

## MANDATORY RULE

**NEVER create UI from scratch. ALL UI must come from Figma designs.**

Figma File: https://www.figma.com/design/P14Fv87DK7Bj5Zf162DA61/Meliusly?node-id=0-1

---

## Pages to Build (From Figma ONLY)

### 1. Homepage - PRIORITY

- **Figma Node:** 1:4242 (desktop 1440px), 1:4257 (mobile 360px)
- **Status:** NOT BUILT YET
- **Sections:** Hero, Trust Bar, Product Type Selector, Product Grid, Why Meliusly, Reviews, About, Product Guides, Org Section, Traits Bar

### 2. Collections Page

- **Figma Node:** 1:4174 (desktop), 1:4206 (mobile)
- **Status:** NOT BUILT YET

### 3. How It Works Page

- **Figma Node:** 1:4301 (desktop), 1:4363 (mobile)
- **Status:** NOT BUILT YET

---

## Already Built (Pixel-Perfect from Figma)

✅ PDP - All 12 sections (Figma 1:4127)
✅ Cart Drawer (Figma 1:4290, 1:4292)
✅ Cart State Management
✅ Checkout Flow

---

## Workflow for Each Component

1. **Get Figma Design:** `mcp__figma-desktop__get_screenshot({ nodeId: "X:XXXX" })`
2. **Build Pixel-Perfect:** Match exact typography, colors, spacing
3. **Verify:** Compare live vs Figma
4. **Iterate:** Fix until >95% visual parity

---

## Design Tokens (Meliusly)

- **Primary:** #0268A0
- **Dark:** #161F2B
- **Gray Text:** #777777
- **Light Gray:** #F6F6F6
- **Gold:** #FFB81C
- **Font:** Manrope (400, 500, 600, 700)

---

**REMEMBER:** If it's not in Figma, don't build it. Ask user first.
