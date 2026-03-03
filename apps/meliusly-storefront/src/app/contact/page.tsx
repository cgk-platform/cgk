'use client'

import { useState } from 'react'
import type { Metadata } from 'next'
import { logger } from '@cgk-platform/logging'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitStatus('success')
        setFormData({ name: '', email: '', subject: '', message: '' })
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      logger.error('Form submission error:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#F8F9FA] to-white px-6 py-16 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[1440px] text-center">
          <h1 className="font-manrope mb-6 text-[40px] leading-[1.3] font-semibold text-[#161F2B] lg:text-[56px]">
            Contact Us
          </h1>
          <p className="font-manrope mx-auto max-w-[768px] text-[18px] leading-relaxed text-[#777777] lg:text-[20px]">
            Have a question? We're here to help. Reach out and we'll get back to you as soon as
            possible.
          </p>
        </div>
      </section>

      {/* Contact Form & Info Section */}
      <section className="px-6 py-16 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Contact Form */}
            <div>
              <h2 className="font-manrope mb-6 text-[28px] leading-[1.3] font-semibold text-[#161F2B]">
                Send us a message
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="font-manrope mb-2 block text-[14px] font-semibold text-[#161F2B]"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="font-manrope w-full rounded-lg border border-[#E5E7EB] px-4 py-3 text-[16px] text-[#161F2B] transition-colors focus:border-[#0268A0] focus:ring-2 focus:ring-[#0268A0]/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="font-manrope mb-2 block text-[14px] font-semibold text-[#161F2B]"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="font-manrope w-full rounded-lg border border-[#E5E7EB] px-4 py-3 text-[16px] text-[#161F2B] transition-colors focus:border-[#0268A0] focus:ring-2 focus:ring-[#0268A0]/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="font-manrope mb-2 block text-[14px] font-semibold text-[#161F2B]"
                  >
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="font-manrope w-full rounded-lg border border-[#E5E7EB] px-4 py-3 text-[16px] text-[#161F2B] transition-colors focus:border-[#0268A0] focus:ring-2 focus:ring-[#0268A0]/20 focus:outline-none"
                  >
                    <option value="">Select a subject</option>
                    <option value="product-inquiry">Product Inquiry</option>
                    <option value="order-status">Order Status</option>
                    <option value="returns">Returns & Exchanges</option>
                    <option value="technical-support">Technical Support</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="font-manrope mb-2 block text-[14px] font-semibold text-[#161F2B]"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="font-manrope w-full rounded-lg border border-[#E5E7EB] px-4 py-3 text-[16px] text-[#161F2B] transition-colors focus:border-[#0268A0] focus:ring-2 focus:ring-[#0268A0]/20 focus:outline-none"
                  />
                </div>

                {/* Status Messages */}
                {submitStatus === 'success' && (
                  <div className="rounded-lg bg-green-50 px-4 py-3 text-center">
                    <p className="font-manrope text-[14px] text-green-700">
                      Thank you for your message! We'll get back to you soon.
                    </p>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-center">
                    <p className="font-manrope text-[14px] text-red-600">
                      There was an error submitting your message. Please try again.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="font-manrope w-full rounded-lg bg-[#0268A0] px-8 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#015580] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="font-manrope mb-6 text-[28px] leading-[1.3] font-semibold text-[#161F2B]">
                Other ways to reach us
              </h2>

              <div className="space-y-8">
                <div>
                  <h3 className="font-manrope mb-2 text-[18px] font-semibold text-[#161F2B]">
                    Customer Support
                  </h3>
                  <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
                    Monday - Friday: 9:00 AM - 5:00 PM EST
                    <br />
                    Email: support@meliusly.com
                    <br />
                    Phone: 1-800-MELIUSLY
                  </p>
                </div>

                <div>
                  <h3 className="font-manrope mb-2 text-[18px] font-semibold text-[#161F2B]">
                    Returns & Exchanges
                  </h3>
                  <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
                    We offer a 30-day return policy with free return shipping.
                    <br />
                    Email: returns@meliusly.com
                  </p>
                </div>

                <div>
                  <h3 className="font-manrope mb-2 text-[18px] font-semibold text-[#161F2B]">
                    General Inquiries
                  </h3>
                  <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
                    For partnership opportunities, press inquiries, or other questions.
                    <br />
                    Email: hello@meliusly.com
                  </p>
                </div>

                <div className="rounded-xl bg-[#F8F9FA] p-6">
                  <h3 className="font-manrope mb-3 text-[18px] font-semibold text-[#161F2B]">
                    Quick Help
                  </h3>
                  <ul className="space-y-2">
                    <li>
                      <a
                        href="/how-it-works"
                        className="font-manrope text-[14px] text-[#0268A0] underline hover:text-[#015580]"
                      >
                        How It Works
                      </a>
                    </li>
                    <li>
                      <a
                        href="/products/sleepsaver-pro"
                        className="font-manrope text-[14px] text-[#0268A0] underline hover:text-[#015580]"
                      >
                        Size Guide
                      </a>
                    </li>
                    <li>
                      <a
                        href="/collections/all"
                        className="font-manrope text-[14px] text-[#0268A0] underline hover:text-[#015580]"
                      >
                        Shop All Products
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
