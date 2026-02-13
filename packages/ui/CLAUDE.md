# @cgk-platform/ui - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-10

---

## Purpose

React UI components using shadcn/ui patterns. Provides a consistent design system across all CGK applications with Radix primitives and Tailwind CSS styling.

---

## Quick Reference

```typescript
import { Button, Card, CardHeader, CardContent, Input, Container } from '@cgk-platform/ui'
import { cn } from '@cgk-platform/ui'
```

---

## Key Patterns

### Pattern 1: Using Components

```tsx
import { Button, Card, CardHeader, CardContent } from '@cgk-platform/ui'

export function OrderCard({ order }) {
  return (
    <Card>
      <CardHeader>Order #{order.number}</CardHeader>
      <CardContent>
        <p>{order.total}</p>
        <Button variant="outline" size="sm">View Details</Button>
      </CardContent>
    </Card>
  )
}
```

### Pattern 2: Class Merging with cn()

```tsx
import { cn } from '@cgk-platform/ui'

function CustomButton({ className, ...props }) {
  return (
    <button
      className={cn(
        'base-styles here',
        props.disabled && 'opacity-50',
        className
      )}
      {...props}
    />
  )
}
```

### Pattern 3: Button Variants

```tsx
<Button variant="default">Primary Action</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Subtle</Button>
<Button variant="link">Link Style</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All components |
| `utils/cn.ts` | Class merging | `cn` |
| `components/button.tsx` | Button component | `Button`, `buttonVariants` |
| `components/card.tsx` | Card components | `Card`, `CardHeader`, etc. |
| `components/input.tsx` | Input component | `Input` |
| `components/container.tsx` | Layout container | `Container` |

---

## Exports Reference

### Components

- `Button` - Primary button with variants
- `Card`, `CardHeader`, `CardContent`, `CardFooter` - Card layout
- `Input` - Form input
- `Container` - Page layout container

### Utilities

- `cn(...classes)` - Merge Tailwind classes safely

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@radix-ui/react-slot` | Polymorphic component support |
| `class-variance-authority` | Variant management |
| `clsx` | Class name construction |
| `tailwind-merge` | Tailwind class conflict resolution |

---

## Common Gotchas

### 1. Always use cn() for conditional classes

```tsx
// WRONG - Classes may conflict
<div className={`p-4 ${large ? 'p-8' : ''}`} />

// CORRECT - cn() handles conflicts
<div className={cn('p-4', large && 'p-8')} />
```

### 2. Remember peer dependencies

This package requires React 18+ as a peer dependency. Ensure your app has React installed.

---

## Integration Points

### Used by:
- All frontend applications
- `apps/storefront`
- `apps/admin`

### Uses:
- `@cgk-platform/core` - Types only
