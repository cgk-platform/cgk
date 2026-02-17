/**
 * Contact Us Page
 *
 * Provides contact form and information - integrates with support system.
 */

'use client'

import { useState, type FormEvent } from 'react'

import { Mail, MapPin, Phone, Send } from 'lucide-react'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('submitting')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setStatus('success')
        setFormData({ name: '', email: '', subject: '', message: '' })
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="container mx-auto px-4 py-12" style={{ maxWidth: 'var(--portal-max-width)' }}>
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Contact Us</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[hsl(var(--portal-muted-foreground))]">
            Have a question or need help? We&apos;re here for you. Send us a message and we&apos;ll
            get back to you as soon as possible.
          </p>
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-5">
          {/* Contact Form */}
          <div className="lg:col-span-3">
            {status === 'success' ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-900/20">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                  <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                  Message Sent!
                </h3>
                <p className="mt-2 text-green-700 dark:text-green-300">
                  Thanks for reaching out. We&apos;ll get back to you within 24-48 hours.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="mt-4 text-sm font-medium text-green-600 underline hover:no-underline dark:text-green-400"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-[hsl(var(--portal-foreground))]"
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1.5 block w-full rounded-lg border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-background))] px-4 py-2.5 text-[hsl(var(--portal-foreground))] placeholder-[hsl(var(--portal-muted-foreground))] focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]/20"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-[hsl(var(--portal-foreground))]"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1.5 block w-full rounded-lg border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-background))] px-4 py-2.5 text-[hsl(var(--portal-foreground))] placeholder-[hsl(var(--portal-muted-foreground))] focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]/20"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-[hsl(var(--portal-foreground))]"
                  >
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="mt-1.5 block w-full rounded-lg border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-background))] px-4 py-2.5 text-[hsl(var(--portal-foreground))] placeholder-[hsl(var(--portal-muted-foreground))] focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]/20"
                    placeholder="How can we help?"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-[hsl(var(--portal-foreground))]"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="mt-1.5 block w-full resize-none rounded-lg border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-background))] px-4 py-2.5 text-[hsl(var(--portal-foreground))] placeholder-[hsl(var(--portal-muted-foreground))] focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]/20"
                    placeholder="Tell us more about your question or concern..."
                  />
                </div>

                {status === 'error' && (
                  <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    Something went wrong. Please try again or email us directly.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[hsl(var(--portal-primary))] px-6 py-3 font-medium text-white transition-all hover:bg-[hsl(var(--portal-primary))]/90 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === 'submitting' ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Contact Info Sidebar */}
          <div className="space-y-8 lg:col-span-2">
            <div className="rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-6">
              <h3 className="text-lg font-semibold">Other Ways to Reach Us</h3>

              <div className="mt-6 space-y-6">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--portal-primary))]/10">
                    <Mail className="h-5 w-5 text-[hsl(var(--portal-primary))]" />
                  </div>
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
                      support@example.com
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--portal-primary))]/10">
                    <Phone className="h-5 w-5 text-[hsl(var(--portal-primary))]" />
                  </div>
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
                      Mon-Fri, 9am-5pm EST
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--portal-primary))]/10">
                    <MapPin className="h-5 w-5 text-[hsl(var(--portal-primary))]" />
                  </div>
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
                      Contact us for store location
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-muted))]/30 p-6">
              <h3 className="text-lg font-semibold">Quick Links</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <a
                    href="/faq"
                    className="text-[hsl(var(--portal-primary))] hover:underline"
                  >
                    Frequently Asked Questions
                  </a>
                </li>
                <li>
                  <a
                    href="/shipping"
                    className="text-[hsl(var(--portal-primary))] hover:underline"
                  >
                    Shipping Information
                  </a>
                </li>
                <li>
                  <a
                    href="/returns"
                    className="text-[hsl(var(--portal-primary))] hover:underline"
                  >
                    Returns &amp; Exchanges
                  </a>
                </li>
                <li>
                  <a
                    href="/account/orders"
                    className="text-[hsl(var(--portal-primary))] hover:underline"
                  >
                    Track Your Order
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
