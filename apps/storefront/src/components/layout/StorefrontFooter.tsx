'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Facebook, Instagram, Twitter, Mail } from 'lucide-react'
import { Input, Button } from '@cgk-platform/ui'

interface FooterLink {
  label: string
  href: string
}

interface FooterSection {
  title: string
  links: FooterLink[]
}

const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: 'Shop',
    links: [
      { label: 'Sofa Bed Supports', href: '/collections/sofa-bed-supports' },
      { label: 'Mattress Toppers', href: '/collections/mattress-toppers' },
      { label: 'Bedding Essentials', href: '/collections/bedding' },
      { label: 'All Products', href: '/collections/all' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Our Story', href: '/pages/about' },
      { label: 'Reviews', href: '/pages/reviews' },
      { label: 'Blog', href: '/pages/blog' },
      { label: 'Careers', href: '/pages/careers' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Contact Us', href: '/pages/contact' },
      { label: 'Shipping & Returns', href: '/pages/shipping' },
      { label: 'FAQs', href: '/pages/faq' },
      { label: 'Size Guide', href: '/pages/size-guide' },
    ],
  },
  {
    title: 'Connect',
    links: [
      { label: 'Facebook', href: 'https://facebook.com/meliusly' },
      { label: 'Instagram', href: 'https://instagram.com/meliusly' },
      { label: 'Twitter', href: 'https://twitter.com/meliusly' },
      { label: 'Pinterest', href: 'https://pinterest.com/meliusly' },
    ],
  },
]

const SOCIAL_LINKS = [
  { icon: Facebook, href: 'https://facebook.com/meliusly', label: 'Facebook' },
  { icon: Instagram, href: 'https://instagram.com/meliusly', label: 'Instagram' },
  { icon: Twitter, href: 'https://twitter.com/meliusly', label: 'Twitter' },
  { icon: Mail, href: 'mailto:support@meliusly.com', label: 'Email' },
]

const LEGAL_LINKS: FooterLink[] = [
  { label: 'Privacy Policy', href: '/pages/privacy' },
  { label: 'Terms of Service', href: '/pages/terms' },
  { label: 'Accessibility', href: '/pages/accessibility' },
]

export function StorefrontFooter() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || isSubmitting) return

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setSubmitStatus('success')
        setEmail('')
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <footer className="bg-[#2B3E50] text-white">
      {/* Newsletter Section */}
      <section className="border-b border-white/10">
        <div className="container mx-auto px-4 py-20 md:py-24">
          <div className="mx-auto max-w-2xl animate-fade-in text-center">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Stay Connected
            </h2>
            <p className="mb-8 text-sm leading-relaxed text-white/70 md:text-base">
              Subscribe to receive exclusive offers, design inspiration, and sleep comfort tips.
            </p>

            <form
              onSubmit={handleNewsletterSubmit}
              className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="h-12 w-full border-white/20 bg-white/10 text-white transition-all duration-300 placeholder:text-white/50 focus:border-[#FFB81C] focus:bg-white/15 focus:ring-[#FFB81C]/30"
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 bg-[#FFB81C] px-8 font-semibold text-[#2B3E50] transition-all duration-300 hover:scale-105 hover:bg-[#FFB81C]/90 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSubmitting ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </form>

            {submitStatus === 'success' && (
              <p className="mt-4 animate-fade-in text-sm text-[#FFB81C]">
                Thank you for subscribing! Check your inbox for exclusive offers.
              </p>
            )}
            {submitStatus === 'error' && (
              <p className="mt-4 animate-fade-in text-sm text-red-300">
                Something went wrong. Please try again.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-16 md:py-20">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4 md:gap-8">
          {FOOTER_SECTIONS.map((section, idx) => (
            <div
              key={section.title}
              className="animate-fade-in"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <h3 className="mb-6 text-base font-semibold tracking-wide">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group relative inline-block text-sm text-white/70 transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                      <span className="absolute bottom-0 left-0 h-[1px] w-0 bg-[#FFB81C] transition-all duration-300 group-hover:w-full" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social Media Icons */}
        <div
          className="mb-12 flex animate-fade-in items-center justify-center gap-4"
          style={{ animationDelay: '400ms' }}
        >
          {SOCIAL_LINKS.map((social) => {
            const Icon = social.icon
            return (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="group flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/30 transition-all duration-300 hover:scale-110 hover:border-[#FFB81C]"
              >
                <Icon className="h-5 w-5 text-white/70 transition-colors duration-300 group-hover:text-[#FFB81C]" />
              </a>
            )
          })}
        </div>

        {/* Legal Links & Copyright */}
        <div
          className="animate-fade-in space-y-4 border-t border-white/10 pt-8 text-center"
          style={{ animationDelay: '500ms' }}
        >
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            {LEGAL_LINKS.map((link, idx) => (
              <span key={link.href} className="flex items-center gap-x-6">
                <Link
                  href={link.href}
                  className="text-white/60 transition-colors duration-200 hover:text-white"
                >
                  {link.label}
                </Link>
                {idx < LEGAL_LINKS.length - 1 && <span className="text-white/30">•</span>}
              </span>
            ))}
          </div>
          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} Meliusly. All rights reserved.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </footer>
  )
}
