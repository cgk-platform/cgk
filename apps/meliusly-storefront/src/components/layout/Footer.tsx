/**
 * Footer Component
 *
 * Site footer for Meliusly storefront.
 * Based on Figma 1:4254 (396px desktop / 1149px mobile).
 * Features: Brand info, navigation columns, newsletter, social links.
 */

import Link from 'next/link'
import { Facebook, Instagram, Twitter, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-meliusly-darkBlue border-t border-white/10">
      <div className="mx-auto max-w-[1440px] px-6 py-16 lg:px-12">
        {/* Main Footer Content */}
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="space-y-6">
            <img
              src="/meliusly/logo/logo-white.svg"
              alt="Meliusly"
              className="h-10 w-auto"
              width={160}
              height={40}
            />
            <p className="font-manrope text-[14px] leading-relaxed text-white/80">
              Premium sofa bed support systems built for comfort and designed to last. Made in the
              USA with quality craftsmanship.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5 text-white" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5 text-white" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5 text-white" />
              </a>
            </div>
          </div>

          {/* Shop Column */}
          <div>
            <h3 className="font-manrope mb-6 text-[16px] font-semibold text-white">Shop</h3>
            <nav className="space-y-4">
              <Link
                href="/collections/all"
                className="font-manrope block text-[14px] text-white/80 transition-colors hover:text-white"
              >
                All Products
              </Link>
              <Link
                href="/collections/sofa-bed-supports"
                className="font-manrope block text-[14px] text-white/80 transition-colors hover:text-white"
              >
                Sofa Bed Supports
              </Link>
              <Link
                href="/collections/custom-solutions"
                className="font-manrope block text-[14px] text-white/80 transition-colors hover:text-white"
              >
                Custom Solutions
              </Link>
              <Link
                href="/collections/accessories"
                className="font-manrope block text-[14px] text-white/80 transition-colors hover:text-white"
              >
                Accessories
              </Link>
            </nav>
          </div>

          {/* Support Column */}
          <div>
            <h3 className="font-manrope mb-6 text-[16px] font-semibold text-white">Support</h3>
            <nav className="space-y-4">
              <Link
                href="/how-it-works"
                className="font-manrope block text-[14px] text-white/80 transition-colors hover:text-white"
              >
                How It Works
              </Link>
              <Link
                href="/installation"
                className="font-manrope block text-[14px] text-white/80 transition-colors hover:text-white"
              >
                Installation Guide
              </Link>
              <Link
                href="/faq"
                className="font-manrope block text-[14px] text-white/80 transition-colors hover:text-white"
              >
                FAQ
              </Link>
              <Link
                href="/contact"
                className="font-manrope block text-[14px] text-white/80 transition-colors hover:text-white"
              >
                Contact Us
              </Link>
            </nav>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="font-manrope mb-6 text-[16px] font-semibold text-white">Company</h3>
            <nav className="space-y-4">
              <Link
                href="/about"
                className="font-manrope block text-[14px] text-white/80 transition-colors hover:text-white"
              >
                About Us
              </Link>
              <Link
                href="/warranty"
                className="font-manrope block text-[14px] text-white/80 transition-colors hover:text-white"
              >
                Warranty
              </Link>
              <Link
                href="/shipping"
                className="font-manrope block text-[14px] text-white/80 transition-colors hover:text-white"
              >
                Shipping Policy
              </Link>
              <Link
                href="/returns"
                className="font-manrope block text-[14px] text-white/80 transition-colors hover:text-white"
              >
                Returns Policy
              </Link>
            </nav>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-16 border-t border-white/10 pt-12">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="font-manrope mb-3 text-[20px] font-semibold text-white">Stay Updated</h3>
            <p className="font-manrope mb-6 text-[14px] text-white/80">
              Get the latest updates on new products and exclusive offers.
            </p>
            <form className="flex gap-3">
              <div className="relative flex-1">
                <Mail className="text-meliusly-grayText absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="font-manrope h-12 w-full rounded-full bg-white/10 pr-4 pl-12 text-[14px] text-white placeholder-white/60 ring-2 ring-transparent transition-all outline-none focus:bg-white/15 focus:ring-white/30"
                  required
                />
              </div>
              <button
                type="submit"
                className="font-manrope bg-meliusly-primary hover:bg-meliusly-primary/90 rounded-full px-8 text-[14px] font-semibold text-white transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="font-manrope text-[13px] text-white/60">
              © {new Date().getFullYear()} Meliusly. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link
                href="/privacy"
                className="font-manrope text-[13px] text-white/60 transition-colors hover:text-white"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="font-manrope text-[13px] text-white/60 transition-colors hover:text-white"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
