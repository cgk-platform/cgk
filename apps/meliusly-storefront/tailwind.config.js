import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    // Include @cgk-platform/ui components
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        meliusly: {
          primary: '#0268A0',      // Blue
          dark: '#161F2B',         // Navy
          secondary: '#6ABFEF',    // Light Blue
          accent: '#0268A0',       // Same as primary
          gray: {
            50: '#F9FAFB',
            100: '#F3F4F6',
            200: '#E5E7EB',
            300: '#D1D5DB',
            400: '#9CA3AF',
            500: '#6B7280',
            600: '#4B5563',
            700: '#374151',
            800: '#1F2937',
            900: '#111827',
          },
          lightGray: '#F6F6F6',
          darkBlue: '#2E3F56',
          darkGray: '#777777',
          grayText: '#737373',
        },
      },
      fontFamily: {
        manrope: ['var(--font-manrope)', 'sans-serif'],
      },
      fontSize: {
        '2xs': '12px',
        'xs': '13px',
        'sm': '14px',
        'base': '16px',
        'md': '18px',
        'lg': '22px',
        'xl': '24px',
        '2xl': '28px',
        '3xl': '32px',
        '4xl': '40px',
      },
      lineHeight: {
        'heading': '1.3',
        'body': '1.6',
        'relaxed-body': '1.8',
      },
      letterSpacing: {
        'tight-body': '-1px',
        'label': '2px',
      },
      maxWidth: {
        'store': '1440px',
      },
      borderRadius: {
        'meliusly': '30px', // From Figma
      },
      spacing: {
        'section': '80px', // Vertical section spacing
      },
    },
  },
  plugins: [],
}

export default config
