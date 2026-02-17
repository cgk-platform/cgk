# @cgk-platform/analytics

GA4 and attribution tracking for the CGK platform.

## Installation

```bash
pnpm add @cgk-platform/analytics
```

## Features

- **GA4 Integration** - Google Analytics 4 tracking
- **Attribution Tracking** - UTM parameters and source tracking
- **E-commerce Events** - Standardized commerce event tracking
- **Server-Side Tracking** - Track events from server actions
- **Cookie Persistence** - Store attribution data across sessions

## Quick Start

### Initialize GA4

```typescript
'use client'

import { initGA4, trackPageView } from '@cgk-platform/analytics'

// Initialize in root layout
useEffect(() => {
  initGA4({
    measurementId: 'G-XXXXXXXXXX',
    debug: process.env.NODE_ENV === 'development',
  })
  
  trackPageView()
}, [])
```

### Track Events

```typescript
import { trackEvent } from '@cgk-platform/analytics'

trackEvent('button_click', {
  category: 'engagement',
  label: 'add_to_cart',
  value: 1,
})
```

### E-commerce Tracking

```typescript
import {
  trackViewItem,
  trackAddToCart,
  trackPurchase,
} from '@cgk-platform/analytics'

// View product
trackViewItem({
  items: [{
    item_id: 'SKU_123',
    item_name: 'Premium Cotton Sheets',
    price: 99.99,
    item_category: 'Bedding',
  }],
})

// Add to cart
trackAddToCart({
  currency: 'USD',
  value: 99.99,
  items: [{
    item_id: 'SKU_123',
    item_name: 'Premium Cotton Sheets',
    quantity: 1,
    price: 99.99,
  }],
})

// Purchase
trackPurchase({
  transaction_id: 'order_456',
  value: 99.99,
  currency: 'USD',
  tax: 8.50,
  shipping: 5.00,
  items: [{
    item_id: 'SKU_123',
    item_name: 'Premium Cotton Sheets',
    quantity: 1,
    price: 99.99,
  }],
})
```

### Attribution Tracking

```typescript
import {
  trackAttribution,
  parseAttributionParams,
  getAttributionFromCookie,
} from '@cgk-platform/analytics'

// Parse URL parameters
const params = parseAttributionParams(searchParams)

// Track attribution (stores in cookie)
trackAttribution({
  source: params.utm_source || 'direct',
  medium: params.utm_medium || 'none',
  campaign: params.utm_campaign,
  term: params.utm_term,
  content: params.utm_content,
})

// Retrieve attribution data
const attribution = getAttributionFromCookie(cookies)
console.log(attribution.source) // 'google', 'facebook', etc.
```

### Server-Side Tracking

```typescript
import { trackServerEvent } from '@cgk-platform/analytics'

// Track from server action
export async function submitForm(data: FormData) {
  'use server'
  
  await trackServerEvent({
    eventName: 'form_submit',
    params: {
      form_name: 'contact',
      user_id: userId,
    },
  })
}
```

## Key Exports

### GA4
- `initGA4(config)` - Initialize Google Analytics
- `trackEvent(name, params)` - Track custom event
- `trackPageView()` - Track page view

### E-commerce
- `trackViewItem(event)` - Product view
- `trackAddToCart(event)` - Add to cart
- `trackRemoveFromCart(event)` - Remove from cart
- `trackBeginCheckout(event)` - Checkout started
- `trackPurchase(event)` - Order completed

### Attribution
- `trackAttribution(data)` - Store attribution data
- `parseAttributionParams(params)` - Parse UTM parameters
- `getAttributionFromCookie(cookies)` - Retrieve attribution

### Server
- `trackServerEvent(event)` - Track from server-side

## Types

```typescript
type AttributionData = {
  source: string
  medium: string
  campaign?: string
  term?: string
  content?: string
  timestamp: number
}

type EcommerceItem = {
  item_id: string
  item_name: string
  price: number
  quantity?: number
  item_category?: string
}

type PurchaseEvent = {
  transaction_id: string
  value: number
  currency: string
  tax?: number
  shipping?: number
  items: EcommerceItem[]
}
```

## License

MIT
