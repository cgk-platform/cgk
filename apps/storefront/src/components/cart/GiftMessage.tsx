/**
 * Gift Message
 *
 * Collapsible textarea for adding a gift message to the cart.
 * Saves to cart attributes on blur.
 */

'use client'

import { cn } from '@cgk-platform/ui'
import { useCallback, useState, useTransition } from 'react'

import { updateCartNote } from '@/lib/cart/actions'

const MAX_CHARS = 250

export function GiftMessage() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, MAX_CHARS)
    setMessage(value)
    setSaved(false)
  }, [])

  const handleSave = useCallback(() => {
    if (isPending) return
    startTransition(async () => {
      try {
        await updateCartNote(message)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (err) {
        console.error('[GiftMessage] Failed to save note:', err)
      }
    })
  }, [message, isPending])

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-cgk-navy',
          'transition-colors hover:bg-gray-50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cgk-navy'
        )}
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
          Add a gift message
        </span>
        <svg
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div
        className={cn(
          'grid transition-all duration-300',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 px-4 pb-4">
            <textarea
              value={message}
              onChange={handleChange}
              onBlur={handleSave}
              placeholder="Write your gift message here..."
              maxLength={MAX_CHARS}
              rows={3}
              className={cn(
                'w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm',
                'placeholder:text-gray-400',
                'focus:border-cgk-navy focus:outline-none focus:ring-1 focus:ring-cgk-navy'
              )}
            />
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>
                {saved && (
                  <span className="text-green-600">
                    Saved!
                  </span>
                )}
                {isPending && (
                  <span className="text-gray-500">
                    Saving...
                  </span>
                )}
              </span>
              <span>{message.length}/{MAX_CHARS}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
