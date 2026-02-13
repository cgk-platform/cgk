const sharedConfig = require('@cgk-platform/tailwind-config')

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...sharedConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    ...sharedConfig.theme,
    extend: {
      ...sharedConfig.theme?.extend,
      colors: {
        ...sharedConfig.theme?.extend?.colors,
        // Industrial palette for contractor portal
        paper: {
          DEFAULT: '#F8F6F3',
          dark: '#EDE9E3',
        },
        graphite: {
          DEFAULT: '#2D2D2D',
          light: '#4A4A4A',
          muted: '#6B6B6B',
        },
        safety: {
          DEFAULT: '#FF6B35',
          light: '#FF8F5E',
          dark: '#E55A27',
        },
        blueprint: {
          DEFAULT: '#4A90A4',
          light: '#6AADBD',
          dark: '#3A7588',
        },
        verdigris: {
          DEFAULT: '#4A7C59',
          light: '#5D9A6F',
          dark: '#3A6347',
        },
      },
      fontFamily: {
        mono: ['DM Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
        sans: ['Source Sans 3', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grid-pattern': `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%232D2D2D' fill-opacity='0.03' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
      },
    },
  },
}
