# Design System Rules

**Purpose**: Comprehensive design system guide for CGK portal applications
**Scope**: `apps/admin`, `apps/orchestrator`, `apps/creator-portal` ONLY
**Excluded**: `apps/storefront` (uses tenant-specific theming)
**Last Updated**: 2026-02-27

---

## Aesthetic: "Editorial Precision"

A refined, magazine-quality feel with bold typography, generous whitespace, and subtle motion. Navy + Gold palette creates a distinctive, premium aesthetic.

**Design Principles**:

- Clean, spacious layouts with generous whitespace
- Bold, editorial-style typography
- Subtle animations and hover states
- Premium feel without being flashy
- Clear information hierarchy

---

## Color Palette

### Primary Colors

```css
--primary: hsl(222 47% 11%); /* Deep Navy - buttons, links, primary actions */
--gold: hsl(38 92% 50%); /* Gold accent - CTAs, highlights, special badges */
```

### Semantic Colors (Use Token Names, Not Raw Values)

| Token                                | Usage                                              | Example                               |
| ------------------------------------ | -------------------------------------------------- | ------------------------------------- |
| `bg-success`, `text-success`         | Healthy status, positive changes, completed states | Active integrations, completed orders |
| `bg-warning`, `text-warning`         | Degraded status, caution, pending states           | Pending verifications, draft content  |
| `bg-destructive`, `text-destructive` | Critical status, errors, destructive actions       | Failed jobs, error messages           |
| `bg-gold`, `text-gold`               | Premium highlights, revenue, super admin badge     | Revenue cards, premium features       |
| `bg-info`, `text-info`               | Informational states, customer-related             | Customer messages, notifications      |

### Usage Examples

```typescript
// CORRECT - Use semantic tokens
<div className="bg-success/10 text-success">Active</div>
<div className="bg-gold/15 text-gold border border-gold/20">Premium</div>
<div className="bg-warning/10 text-warning">Pending</div>

// WRONG - Hardcoded colors
<div className="bg-green-500 text-green-700">Active</div>
<div className="bg-amber-500 text-amber-700">Premium</div>
```

---

## Typography

### Font Stack (Loaded via next/font/google)

| Font                 | Weights  | Usage                               |
| -------------------- | -------- | ----------------------------------- |
| **Instrument Serif** | 400, 500 | Headlines, hero text, display type  |
| **Geist Sans**       | 400-700  | All UI text (body, buttons, labels) |
| **Geist Mono**       | 400      | Code, IDs, technical numbers        |

### Type Scale

```typescript
// Headlines - Instrument Serif
<h1 className="font-display text-4xl font-medium">Page Title</h1>
<h2 className="font-display text-3xl">Section Header</h2>

// Body - Geist Sans (default)
<p className="text-base">Regular body text</p>
<p className="text-sm text-muted-foreground">Helper text</p>

// Technical - Geist Mono
<code className="font-mono text-sm">order_abc123</code>
```

### Font Class Utilities

| Class          | Font             | Usage               |
| -------------- | ---------------- | ------------------- |
| `font-display` | Instrument Serif | Headlines only      |
| `font-sans`    | Geist Sans       | Body text (default) |
| `font-mono`    | Geist Mono       | Code, IDs, numbers  |

---

## Icons

**MANDATORY**: Use `lucide-react` exclusively. No inline SVGs.

```typescript
// CORRECT - lucide-react
import { User, Settings, CreditCard, ChevronRight } from 'lucide-react'

<User className="h-4 w-4" />
<Settings className="h-5 w-5 text-muted-foreground" />

// WRONG - inline SVGs
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
  <path d="M..." />
</svg>
```

### Icon Size Scale

| Size | Class     | Usage                              |
| ---- | --------- | ---------------------------------- |
| sm   | `h-3 w-3` | Badges, inline icons in text       |
| md   | `h-4 w-4` | Navigation items, buttons          |
| lg   | `h-5 w-5` | Mobile navigation, section headers |
| xl   | `h-6 w-6` | Empty states, feature highlights   |

---

## Status Badges

**ALWAYS use `@cgk-platform/ui StatusBadge`** - it auto-maps status strings to variants:

```typescript
import { StatusBadge } from '@cgk-platform/ui'

// Simple usage - variant auto-detected from status
<StatusBadge status="active" />
<StatusBadge status="pending" />
<StatusBadge status="failed" />

// With options
<StatusBadge status="connected" showDot />
<StatusBadge status="super_admin" label="Super Admin" className="bg-gold/15 text-gold" />

// With custom icon
<StatusBadge status="processing">
  <Loader2 className="h-3 w-3 animate-spin" />
</StatusBadge>
```

### Auto-Mapped Status Variants

| Variant         | Statuses                                                                             |
| --------------- | ------------------------------------------------------------------------------------ |
| **Success**     | `active`, `completed`, `approved`, `connected`, `healthy`, `signed`, `ready`         |
| **Warning**     | `pending`, `pending_verification`, `degraded`, `invited`, `sent`, `viewed`           |
| **Destructive** | `failed`, `rejected`, `disabled`, `disconnected`, `unhealthy`, `critical`, `deleted` |
| **Default**     | `draft`, `paused`, `unknown`                                                         |

---

## Animation System

### Duration Tokens

```css
--duration-fast: 150ms; /* Micro-interactions, hover states */
--duration-normal: 200ms; /* Component transitions */
--duration-slow: 300ms; /* Page transitions, modals */
```

### Tailwind Animation Classes

| Class             | Usage                                 |
| ----------------- | ------------------------------------- |
| `duration-fast`   | Hover states, button clicks           |
| `duration-normal` | Card transitions, menu opens          |
| `duration-slow`   | Modal entrances, drawer slides        |
| `animate-fade-up` | Page content entrance                 |
| `ease-smooth-out` | Deceleration easing (exit animations) |

### Usage Examples

```typescript
// Hover transitions
<Card className="transition-all duration-normal hover:shadow-lg hover:-translate-y-0.5">

// Page entrance
<div className="animate-fade-up">
  <h1>Page Title</h1>
</div>

// Staggered list animations
{items.map((item, index) => (
  <Card
    key={item.id}
    className="animate-fade-up"
    style={{ animationDelay: `${index * 75}ms` }}
  >
    {item.content}
  </Card>
))}
```

---

## Component Patterns

### Cards with Hover States

```typescript
import { Card } from '@cgk-platform/ui'
import { cn } from '@cgk-platform/ui/utils'

<Card className={cn(
  'transition-all duration-normal',
  'hover:shadow-lg hover:-translate-y-0.5',
  onClick && 'cursor-pointer'
)}>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Gold Accent for Special Items

Use for revenue cards, premium features, or highlighted content:

```typescript
<Card className={cn(
  isHighlighted && 'ring-1 ring-gold/20 bg-gradient-to-br from-gold/5 to-transparent'
)}>
  <CardHeader>
    <Badge className="bg-gold/15 text-gold border-gold/20">
      Premium
    </Badge>
  </CardHeader>
</Card>
```

### Status Dots with Animation

```typescript
import { StatusDot } from '@cgk-platform/ui'

// Static dot
<StatusDot status="healthy" />

// Animated pulse (for active/connected states)
<StatusDot status="healthy" animate />
```

### Button Variants

```typescript
import { Button } from '@cgk-platform/ui'

// Primary action (navy background)
<Button>Primary Action</Button>

// Gold CTA (premium actions, revenue-related)
<Button className="bg-gold hover:bg-gold/90 text-white">
  Upgrade Now
</Button>

// Ghost (secondary actions)
<Button variant="ghost">Cancel</Button>

// Destructive
<Button variant="destructive">Delete</Button>
```

---

## Mobile Navigation (MANDATORY)

All portal apps MUST have:

1. **Desktop sidebar**: Hidden below `lg:` breakpoint
2. **Mobile header**: Fixed top bar with hamburger menu
3. **Mobile drawer**: Slide-in navigation with backdrop blur

### Mobile Header Bar

```typescript
<div className="fixed inset-x-0 top-0 z-50 border-b bg-card/95 backdrop-blur lg:hidden">
  <div className="flex h-16 items-center justify-between px-4">
    <button onClick={() => setMobileMenuOpen(true)}>
      <Menu className="h-5 w-5" />
    </button>
    <div className="font-display text-lg">App Name</div>
    <div className="w-5" /> {/* Spacer for centering */}
  </div>
</div>
```

### Mobile Drawer

```typescript
import { cn } from '@cgk-platform/ui/utils'

<div className={cn(
  'fixed inset-y-0 left-0 z-50 w-80 bg-card shadow-2xl',
  'transition-transform duration-slow ease-smooth-out',
  mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
)}>
  {/* Navigation content */}
</div>

{/* Backdrop */}
{mobileMenuOpen && (
  <div
    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
    onClick={() => setMobileMenuOpen(false)}
  />
)}
```

### Desktop Sidebar

```typescript
<aside className="hidden lg:flex flex-col w-64 border-r bg-card">
  {/* Desktop navigation */}
</aside>
```

---

## Layout Patterns

### Standard Portal Layout

```typescript
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <MobileHeader onMenuOpen={() => setMobileMenuOpen(true)} />

      {/* Mobile drawer */}
      <MobileDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="flex h-screen">
        {/* Desktop sidebar */}
        <DesktopSidebar />

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container py-8 lg:py-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
```

### Content Container Widths

```typescript
// Standard content (most pages)
<div className="container max-w-6xl">

// Wide content (dashboards, tables)
<div className="container max-w-7xl">

// Narrow content (forms, settings)
<div className="container max-w-4xl">
```

---

## Spacing Scale

Use consistent spacing multipliers:

| Class          | Size   | Usage                                      |
| -------------- | ------ | ------------------------------------------ |
| `gap-2`, `p-2` | 0.5rem | Tight spacing (badges, inline elements)    |
| `gap-4`, `p-4` | 1rem   | Standard spacing (card padding, grid gaps) |
| `gap-6`, `p-6` | 1.5rem | Generous spacing (section padding)         |
| `gap-8`, `p-8` | 2rem   | Large spacing (page sections)              |

---

## Patterns to AVOID

| Pattern                        | Why                              | Use Instead                                             |
| ------------------------------ | -------------------------------- | ------------------------------------------------------- |
| Hardcoded colors (`green-500`) | Breaks theme consistency         | Semantic tokens (`bg-success`)                          |
| Inline SVGs                    | Inconsistent sizing, bloated JSX | `lucide-react` icons                                    |
| Custom badge components        | Duplicates StatusBadge           | `@cgk-platform/ui StatusBadge`                          |
| No mobile nav                  | Unusable on phones               | Mobile drawer pattern                                   |
| No hover states                | Feels unresponsive               | `transition-all duration-normal`                        |
| Using `bg-amber-*` for gold    | Inconsistent shade               | `bg-gold` token                                         |
| Mixing font families           | Destroys visual hierarchy        | Stick to Instrument Serif (display) + Geist Sans (body) |

---

## Component Library Reference

All components from `@cgk-platform/ui`:

```typescript
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  StatusBadge,
  Input,
  Select,
  Dialog,
  Sheet,
  Table,
  Tabs,
  // ... all shadcn/ui components
} from '@cgk-platform/ui'
```

**CRITICAL**: Import from `@cgk-platform/ui`, NOT subpaths like `@cgk-platform/ui/button`.

---

## Accessibility Requirements

- All interactive elements must have keyboard navigation
- Focus states must be visible (default Tailwind ring)
- Color cannot be the only indicator of state (use icons + labels)
- ARIA labels for icon-only buttons
- Semantic HTML (nav, main, aside, etc.)

```typescript
// CORRECT - Accessible icon button
<button aria-label="Open menu" onClick={...}>
  <Menu className="h-5 w-5" />
</button>

// WRONG - No label
<button onClick={...}>
  <Menu className="h-5 w-5" />
</button>
```

---

## Dark Mode (Future)

Design system is prepared for dark mode via CSS variables. All colors use HSL tokens defined in `globals.css`:

```css
:root {
  --primary: 222 47% 11%;
  --gold: 38 92% 50%;
  /* ... */
}

[data-theme='dark'] {
  --primary: 222 47% 20%; /* Lighter in dark mode */
  /* ... */
}
```

Currently single-theme (light), but dark mode can be added by:

1. Defining dark mode CSS variables
2. Adding theme toggle component
3. No code changes required (tokens handle it)

---

**For Figma design system, see**: `.claude/knowledge-bases/figma-design-system/README.md`

**End of Guide**
