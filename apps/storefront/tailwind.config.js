const baseConfig = require('@cgk-platform/tailwind-config')

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...baseConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme?.extend,
      screens: {
        ...baseConfig.theme?.extend?.screens,
        // Matches Shopify Dawn's 2-col → 3-col product grid breakpoint
        dawn: '750px',
      },
      colors: {
        ...baseConfig.theme?.extend?.colors,
        // CGK brand colors
        cgk: {
          navy: '#182F5C',
          'light-blue': '#D7E7F3',
          cream: '#EDE6DF',
          gold: '#D29B28',
          'off-white': '#FAFAFA',
          charcoal: '#242833',
          'near-white': '#FBF9F8',
        },
      },
      fontFamily: {
        ...baseConfig.theme?.extend?.fontFamily,
        assistant: ['var(--font-assistant)', 'system-ui', 'sans-serif'],
        raleway: ['var(--font-raleway)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        store: '1400px',
      },
      borderRadius: {
        ...baseConfig.theme?.extend?.borderRadius,
        btn: '6px',
      },
      keyframes: {
        ...baseConfig.theme?.extend?.keyframes,
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0%)' },
        },
      },
      animation: {
        ...baseConfig.theme?.extend?.animation,
        marquee: 'marquee 30s linear infinite',
        'marquee-reverse': 'marquee-reverse 30s linear infinite',
      },
    },
  },
}
