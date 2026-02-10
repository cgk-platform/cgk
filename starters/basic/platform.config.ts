import { defineConfig } from '@cgk/core'

export default defineConfig({
  brand: {
    name: 'My Brand',
    slug: 'mybrand',
  },
  features: {
    creators: false,
    abTesting: false,
    attribution: false,
    reviews: false,
  },
  deployment: {
    profile: 'small',
  },
})
