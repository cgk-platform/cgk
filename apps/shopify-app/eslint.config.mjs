import baseConfig from '@cgk/eslint-config/library.js'

export default [
  ...baseConfig,
  {
    ignores: ['extensions/**', 'dist/**', '.shopify/**']
  }
]
