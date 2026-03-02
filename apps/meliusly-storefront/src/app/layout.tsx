import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import { RootLayout } from '@/components/layout/RootLayout'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Meliusly - Premium Sofa Bed Support',
    template: '%s | Meliusly',
  },
  description: 'Built for Comfort, Designed to Last',
  keywords: ['sofa bed', 'support board', 'mattress support', 'furniture'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://meliusly.com',
    siteName: 'Meliusly',
    images: [
      {
        url: '/meliusly/hero/hero-desktop.webp',
        width: 1920,
        height: 1153,
        alt: 'Meliusly Premium Sofa Bed Support',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Meliusly - Premium Sofa Bed Support',
    description: 'Built for Comfort, Designed to Last',
    images: ['/meliusly/hero/hero-desktop.webp'],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="font-manrope text-meliusly-dark bg-white antialiased">
        <RootLayout>{children}</RootLayout>
      </body>
    </html>
  )
}
