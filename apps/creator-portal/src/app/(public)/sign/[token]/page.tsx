'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { SignatureCapture } from '@/components/esign/SignatureCanvas'

interface SigningSession {
  document: {
    id: string
    name: string
    fileUrl: string
    message: string | null
    expiresAt: string | null
  }
  signer: {
    id: string
    name: string
    email: string
    role: string
    status: string
  }
  fields: Array<{
    id: string
    type: string
    page: number
    x: number
    y: number
    width: number
    height: number
    required: boolean
    placeholder: string | null
    defaultValue: string | null
    value: string | null
    readOnly: boolean
  }>
  hasExistingSignature: boolean
}

type PageState = 'loading' | 'ready' | 'signing' | 'confirming' | 'success' | 'declined' | 'error'

export default function SigningPage(): React.JSX.Element {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = params.token as string
  const tenant = searchParams.get('tenant')

  const [state, setState] = useState<PageState>('loading')
  const [session, setSession] = useState<SigningSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signature, setSignature] = useState<{
    signatureData: string
    signatureType: 'drawn' | 'typed'
    fontName?: string
  } | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [showDeclineModal, setShowDeclineModal] = useState(false)

  const fetchSigningSession = useCallback(async () => {
    try {
      setState('loading')
      const url = tenant
        ? `/api/sign/${token}?tenant=${tenant}`
        : `/api/sign/${token}`

      const response = await fetch(url)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load document')
      }

      const data = await response.json()
      setSession(data)

      // Initialize field values with defaults
      const initialValues: Record<string, string> = {}
      data.fields.forEach((field: SigningSession['fields'][0]) => {
        if (field.defaultValue) {
          initialValues[field.id] = field.defaultValue
        }
      })
      setFieldValues(initialValues)

      setState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document')
      setState('error')
    }
  }, [token, tenant])

  useEffect(() => {
    fetchSigningSession()
  }, [fetchSigningSession])

  const handleSignatureAdopted = (sig: typeof signature) => {
    setSignature(sig)
    setState('confirming')
  }

  const handleSign = async () => {
    if (!signature || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const url = tenant
        ? `/api/sign/${token}?tenant=${tenant}`
        : `/api/sign/${token}`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureData: signature.signatureData,
          signatureType: signature.signatureType,
          fontName: signature.fontName,
          fieldValues,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to sign document')
      }

      setState('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign document')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDecline = async () => {
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const url = tenant
        ? `/api/sign/${token}?tenant=${tenant}`
        : `/api/sign/${token}`

      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason || 'No reason provided' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to decline document')
      }

      setState('declined')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline document')
    } finally {
      setSubmitting(false)
      setShowDeclineModal(false)
    }
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Loading document...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-destructive"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          </div>
          <h1 className="text-xl font-bold">Unable to Load Document</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            This signing link may have expired or already been used.
          </p>
        </div>
      </div>
    )
  }

  // Success state
  if (state === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-600 dark:text-green-400"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="text-xl font-bold">Document Signed Successfully</h1>
          <p className="mt-2 text-muted-foreground">
            Thank you for signing {session?.document.name}. A copy will be sent to your email.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            You can close this window now.
          </p>
        </div>
      </div>
    )
  }

  // Declined state
  if (state === 'declined') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-orange-600 dark:text-orange-400"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" x2="9" y1="9" y2="15" />
              <line x1="9" x2="15" y1="9" y2="15" />
            </svg>
          </div>
          <h1 className="text-xl font-bold">Document Declined</h1>
          <p className="mt-2 text-muted-foreground">
            You have declined to sign {session?.document.name}. The sender has been notified.
          </p>
        </div>
      </div>
    )
  }

  // Ready or signing state - show the document
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
          <div>
            <h1 className="font-semibold">{session?.document.name}</h1>
            <p className="text-sm text-muted-foreground">
              Signing as {session?.signer.name}
            </p>
          </div>
          <button
            onClick={() => setShowDeclineModal(true)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Decline to Sign
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Document preview */}
          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-4 font-semibold">Document Preview</h2>
            <div className="aspect-[8.5/11] rounded-lg border bg-muted">
              {session?.document.fileUrl && (
                <iframe
                  src={session.document.fileUrl}
                  className="h-full w-full rounded-lg"
                  title="Document Preview"
                />
              )}
            </div>
            {session?.document.message && (
              <div className="mt-4 rounded-lg bg-muted p-3">
                <p className="text-sm font-medium">Message from sender:</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {session.document.message}
                </p>
              </div>
            )}
          </div>

          {/* Signature section */}
          <div className="space-y-4">
            {/* Text fields */}
            {session?.fields.filter((f) => ['text', 'name', 'email'].includes(f.type)).map((field) => (
              <div key={field.id} className="rounded-lg border bg-card p-4">
                <label className="block text-sm font-medium">
                  {field.placeholder || field.type}
                  {field.required && <span className="text-destructive">*</span>}
                </label>
                <input
                  type={field.type === 'email' ? 'email' : 'text'}
                  value={fieldValues[field.id] || ''}
                  onChange={(e) =>
                    setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                  }
                  disabled={field.readOnly}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
            ))}

            {/* Signature capture */}
            {state === 'ready' && (
              <div className="rounded-lg border bg-card p-4">
                <h2 className="mb-4 font-semibold">Your Signature</h2>
                <SignatureCapture onSignatureComplete={handleSignatureAdopted} />
              </div>
            )}

            {/* Confirmation */}
            {state === 'confirming' && signature && (
              <div className="rounded-lg border bg-card p-4">
                <h2 className="mb-4 font-semibold">Confirm Your Signature</h2>

                {/* Signature preview */}
                <div className="mb-4 rounded-lg border bg-white p-4">
                  {signature.signatureType === 'drawn' ? (
                    <img
                      src={signature.signatureData}
                      alt="Your signature"
                      className="h-20 w-auto"
                    />
                  ) : (
                    <p
                      className="text-3xl"
                      style={{
                        fontFamily:
                          signature.fontName === 'brush-script'
                            ? "'Brush Script MT', cursive"
                            : signature.fontName === 'dancing-script'
                              ? "'Dancing Script', cursive"
                              : signature.fontName === 'great-vibes'
                                ? "'Great Vibes', cursive"
                                : "'Pacifico', cursive",
                      }}
                    >
                      {signature.signatureData}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setState('ready')}
                    disabled={submitting}
                    className="flex-1 rounded-lg border py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
                  >
                    Change Signature
                  </button>
                  <button
                    onClick={handleSign}
                    disabled={submitting}
                    className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {submitting ? 'Signing...' : 'Sign Document'}
                  </button>
                </div>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                  By clicking "Sign Document", you agree to sign this document
                  electronically and that this signature will be legally binding.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Decline modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-card p-6">
            <h2 className="text-lg font-semibold">Decline to Sign</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to decline signing this document? The sender will be notified.
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium">
                Reason (optional)
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Please provide a reason for declining..."
                className="mt-1 h-24 w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeclineModal(false)}
                disabled={submitting}
                className="flex-1 rounded-lg border py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={submitting}
                className="flex-1 rounded-lg bg-destructive py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {submitting ? 'Declining...' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
