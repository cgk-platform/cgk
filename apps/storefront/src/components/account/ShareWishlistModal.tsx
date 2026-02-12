/**
 * Share Wishlist Modal
 *
 * Allows customers to share their wishlist via link, email, or social media.
 */

'use client'

import { Button, cn } from '@cgk/ui'
import { useState } from 'react'

import type { PortalContentStrings, ShareWishlistResponse } from '@/lib/account/types'
import { getContent } from '@/lib/account/content'

import { Modal, ModalFooter } from './Modal'

interface ShareWishlistModalProps {
  isOpen: boolean
  onClose: () => void
  content: PortalContentStrings
  onGenerateLink?: (expiresInDays?: number) => Promise<ShareWishlistResponse>
  shareUrl?: string
  onCopy?: () => void
  copied?: boolean
}

type ShareMethod = 'link' | 'email' | 'twitter' | 'facebook' | 'pinterest'

export function ShareWishlistModal({
  isOpen,
  onClose,
  content,
  onGenerateLink,
  shareUrl: externalShareUrl,
  onCopy: externalOnCopy,
  copied: externalCopied,
}: ShareWishlistModalProps) {
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expiresIn, setExpiresIn] = useState<number | undefined>(7)

  // Support both modes: with onGenerateLink callback or with pre-generated shareUrl
  const effectiveShareLink = externalShareUrl || shareLink
  const effectiveCopied = externalCopied !== undefined ? externalCopied : copied

  const handleGenerateLink = async () => {
    if (!onGenerateLink) return

    setIsGenerating(true)
    setError(null)

    try {
      const result = await onGenerateLink(expiresIn)
      setShareLink(result.shareUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (externalOnCopy) {
      externalOnCopy()
      return
    }

    if (!effectiveShareLink) return

    try {
      await navigator.clipboard.writeText(effectiveShareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = effectiveShareLink
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShare = (method: ShareMethod) => {
    if (!effectiveShareLink) return

    const encodedUrl = encodeURIComponent(effectiveShareLink)
    const text = encodeURIComponent('Check out my wishlist!')

    switch (method) {
      case 'email':
        window.open(
          `mailto:?subject=${text}&body=${encodedUrl}`,
          '_blank'
        )
        break
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
          '_blank',
          'width=600,height=400'
        )
        break
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
          '_blank',
          'width=600,height=400'
        )
        break
      case 'pinterest':
        window.open(
          `https://pinterest.com/pin/create/button/?url=${encodedUrl}`,
          '_blank',
          'width=600,height=400'
        )
        break
    }
  }

  const handleClose = () => {
    setShareLink(null)
    setCopied(false)
    setError(null)
    setExpiresIn(7)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getContent(content, 'wishlist.share')}
      description="Share your wishlist with friends and family"
      size="md"
    >
      {!effectiveShareLink ? (
        <>
          {/* Expiration Setting */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-stone-700">
              Link expires in
            </label>
            <div className="mt-2 flex gap-2">
              {[
                { value: 1, label: '1 day' },
                { value: 7, label: '7 days' },
                { value: 30, label: '30 days' },
                { value: undefined, label: 'Never' },
              ].map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => setExpiresIn(option.value)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    expiresIn === option.value
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <ModalFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateLink}
              disabled={isGenerating}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isGenerating ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
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
                  Generating...
                </>
              ) : (
                'Generate Link'
              )}
            </Button>
          </ModalFooter>
        </>
      ) : (
        <>
          {/* Share Link */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-stone-700">
              Share link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={effectiveShareLink}
                readOnly
                className="flex-1 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-700"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                  effectiveCopied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-stone-900 text-white hover:bg-stone-800'
                )}
              >
                {effectiveCopied ? (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-stone-700">
              Or share via
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleShare('email')}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition-colors hover:bg-stone-200"
                aria-label="Share via email"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => handleShare('twitter')}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1DA1F2] text-white transition-opacity hover:opacity-90"
                aria-label="Share on Twitter"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => handleShare('facebook')}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1877F2] text-white transition-opacity hover:opacity-90"
                aria-label="Share on Facebook"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => handleShare('pinterest')}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E60023] text-white transition-opacity hover:opacity-90"
                aria-label="Share on Pinterest"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
                </svg>
              </button>
            </div>
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={handleClose}>
              Done
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  )
}
