'use client'

import { useState, useTransition } from 'react'
import { subscribeToNewsletter } from '@/app/actions/newsletter'

interface NewsletterFormProps {
  /** Variant: 'inline' for homepage row, 'stacked' for footer column, 'footer' for dark background */
  variant?: 'inline' | 'stacked' | 'footer'
  className?: string
}

export function NewsletterForm({ variant = 'inline', className = '' }: NewsletterFormProps) {
  const [message, setMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await subscribeToNewsletter(formData)
      setMessage(result.message)
      setSuccess(result.success)
    })
  }

  const isFooter = variant === 'footer'

  if (success) {
    return (
      <div className={className}>
        <p className={`text-sm font-medium ${isFooter ? 'text-green-400' : 'text-green-600'}`}>{message}</p>
      </div>
    )
  }

  const isInline = variant === 'inline'

  return (
    <div className={className}>
      <form
        action={handleSubmit}
        className={isInline ? 'flex flex-col gap-2 sm:flex-row' : 'flex flex-col gap-2 sm:flex-row'}
      >
        <input
          type="email"
          name="email"
          placeholder="Enter your email"
          className={
            isFooter
              ? 'flex-1 rounded-btn border border-white/30 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none disabled:opacity-50'
              : 'flex-1 rounded-btn border border-gray-300 bg-white px-4 py-3 text-sm focus:border-cgk-navy focus:outline-none focus:ring-2 focus:ring-cgk-navy/20 disabled:opacity-50'
          }
          required
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={isPending}
          className={
            isFooter
              ? 'rounded-btn bg-white px-5 py-2.5 text-sm font-semibold text-cgk-navy transition-colors hover:bg-cgk-cream disabled:opacity-50'
              : 'rounded-btn bg-cgk-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-cgk-navy/90 disabled:opacity-50'
          }
        >
          {isPending ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      {message && !success && (
        <p className={`mt-2 text-sm ${isFooter ? 'text-red-400' : 'text-red-600'}`}>{message}</p>
      )}
    </div>
  )
}
