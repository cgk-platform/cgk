'use client'

/**
 * Mobile Navigation Drawer
 *
 * Slide-in navigation drawer for mobile devices.
 * Based on Figma 1:4294 (360x800px).
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/collections/all' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[80vw] max-w-[360px] bg-white shadow-2xl transition-transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-meliusly-gray/20 flex items-center justify-between border-b px-6 py-6">
            <img
              src="/meliusly/logo/logo.svg"
              alt="Meliusly"
              className="h-8 w-auto"
              width={128}
              height={32}
            />
            <button
              onClick={onClose}
              className="hover:bg-meliusly-gray/10 flex items-center justify-center rounded-full p-2 transition-colors"
              aria-label="Close menu"
            >
              <X className="text-meliusly-dark h-6 w-6" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-1 flex-col gap-2 px-6 py-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className="font-manrope text-meliusly-dark hover:bg-meliusly-gray/10 hover:text-meliusly-primary rounded-lg px-4 py-3 text-[16px] font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-meliusly-gray/20 border-t px-6 py-6">
            <p className="font-manrope text-meliusly-grayText text-[13px]">
              Premium Sofa Bed Support
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
