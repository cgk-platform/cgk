import baseConfig from '@cgk-platform/eslint-config/library.js'

export default [
  ...baseConfig,
  {
    ignores: ['extensions/**', 'dist/**', '.shopify/**']
  }
]
