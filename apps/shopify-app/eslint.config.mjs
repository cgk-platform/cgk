import baseConfig from '@cgk-platform/eslint-config/library'

export default [
  ...baseConfig,
  {
    ignores: ['extensions/**', 'dist/**', '.shopify/**']
  }
]
