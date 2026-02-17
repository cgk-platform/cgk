# @cgk-platform/commerce-primitives

Commerce primitive utilities, formatters, validators, and constants for the CGK platform.

## Installation

```bash
pnpm add @cgk-platform/commerce-primitives
```

## Features

- **Money Formatters** - Format, parse, and perform arithmetic on Money objects
- **Product Formatters** - Format products for display with computed properties
- **Cart Formatters** - Format carts with totals and display helpers
- **Cart Attributes** - Build and parse platform cart attributes for tenant tracking
- **Pagination** - Cursor-based pagination utilities
- **Variant Selection** - Product variant selection and availability helpers
- **Validators** - Cart and discount code validation

## Quick Start

```typescript
import {
  formatMoney,
  buildCartAttributes,
  validateQuantity,
  findVariantByOptions,
} from '@cgk-platform/commerce-primitives'

// Format money
const price = formatMoney({ amount: '29.99', currencyCode: 'USD' })
// "$29.99"

// Build cart attributes for multi-tenant tracking
const attributes = buildCartAttributes('tenant-slug', 'visitor-id', {
  utmSource: 'google',
  utmCampaign: 'summer-sale',
})

// Validate quantity
const result = validateQuantity(5)
if (!result.valid) {
  console.error(result.error)
}

// Find variant by options
const variant = findVariantByOptions(product.variants, [
  { name: 'Size', value: 'M' },
  { name: 'Color', value: 'Blue' },
])
```

## API Reference

See [CLAUDE.md](./CLAUDE.md) for detailed API documentation.

## License

MIT
