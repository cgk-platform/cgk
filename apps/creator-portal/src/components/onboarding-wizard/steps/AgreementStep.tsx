'use client'

import { cn } from '@cgk-platform/ui'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { AgreementData, AgreementDocument } from '../../../lib/onboarding-wizard/types'

interface AgreementStepProps {
  data: AgreementData
  errors: Record<string, string>
  onChange: (data: AgreementData) => void
}

// Mock documents - in production these would come from the API
const MOCK_DOCUMENTS: AgreementDocument[] = [
  {
    id: 'creator-agreement',
    title: 'Creator Program Agreement',
    version: '2.1',
    url: '/agreements/creator-agreement.pdf',
    required: true,
  },
  {
    id: 'content-guidelines',
    title: 'Content Guidelines',
    version: '1.4',
    url: '/agreements/content-guidelines.pdf',
    required: true,
  },
  {
    id: 'nda',
    title: 'Non-Disclosure Agreement',
    version: '1.0',
    url: '/agreements/nda.pdf',
    required: true,
  },
  {
    id: 'marketing-consent',
    title: 'Marketing Communications Consent',
    version: '1.1',
    url: '/agreements/marketing-consent.pdf',
    required: false,
  },
]

/**
 * Agreement Signing Step
 *
 * Review and sign required agreements.
 */
export function AgreementStep({
  data,
  errors,
  onChange,
}: AgreementStepProps): React.JSX.Element {
  const [documents, setDocuments] = useState<AgreementDocument[]>([])
  const [activeDocument, setActiveDocument] = useState<AgreementDocument | null>(null)
  const [showSignModal, setShowSignModal] = useState(false)
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentSignature, setCurrentSignature] = useState<string | null>(null)

  // Track whether initialization has been performed
  const hasInitializedRef = useRef(false)

  // Store latest values in refs to access in effect without triggering re-runs
  const dataRef = useRef(data)
  const onChangeRef = useRef(onChange)

  // Keep refs up to date
  useEffect(() => {
    dataRef.current = data
    onChangeRef.current = onChange
  }, [data, onChange])

  // Load documents and initialize agreements (runs once on mount)
  useEffect(() => {
    // In production, fetch from API
    setDocuments(MOCK_DOCUMENTS)

    // Initialize agreements array if empty and not already initialized
    if (!hasInitializedRef.current && dataRef.current.agreements.length === 0) {
      hasInitializedRef.current = true
      const initialAgreements = MOCK_DOCUMENTS.map((doc) => ({
        documentId: doc.id,
        signed: false,
        signedAt: null,
        signatureData: null,
      }))
      onChangeRef.current({ ...dataRef.current, agreements: initialAgreements })
    }
  }, [])

  const getAgreementStatus = useCallback(
    (documentId: string) => {
      return data.agreements.find((a) => a.documentId === documentId)
    },
    [data.agreements]
  )

  const handleOpenDocument = useCallback((doc: AgreementDocument) => {
    setActiveDocument(doc)
  }, [])

  const handleSignDocument = useCallback((doc: AgreementDocument) => {
    setActiveDocument(doc)
    setShowSignModal(true)
    setCurrentSignature(null)
  }, [])

  // Signature drawing
  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true)
    const canvas = signatureCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e) ? (e.touches[0]?.clientX ?? 0) - rect.left : e.clientX - rect.left
    const y = ('touches' in e) ? (e.touches[0]?.clientY ?? 0) - rect.top : e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return

    const canvas = signatureCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e) ? (e.touches[0]?.clientX ?? 0) - rect.left : e.clientX - rect.left
    const y = ('touches' in e) ? (e.touches[0]?.clientY ?? 0) - rect.top : e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }, [isDrawing])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)

    const canvas = signatureCanvasRef.current
    if (!canvas) return

    const signatureData = canvas.toDataURL()
    setCurrentSignature(signatureData)
  }, [])

  const clearSignature = useCallback(() => {
    const canvas = signatureCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setCurrentSignature(null)
  }, [])

  const handleConfirmSign = useCallback(() => {
    if (!activeDocument || !currentSignature) return

    const newAgreements = data.agreements.map((a) => {
      if (a.documentId === activeDocument.id) {
        return {
          ...a,
          signed: true,
          signedAt: new Date().toISOString(),
          signatureData: currentSignature,
        }
      }
      return a
    })

    // Check if all required are signed
    const requiredDocs = documents.filter((d) => d.required).map((d) => d.id)
    const allRequiredSigned = requiredDocs.every((docId) => {
      const agreement = newAgreements.find((a) => a.documentId === docId)
      return agreement ? agreement.signed : false
    })

    onChange({
      agreements: newAgreements,
      allRequiredSigned,
    })

    setShowSignModal(false)
    setActiveDocument(null)
    setCurrentSignature(null)
  }, [activeDocument, currentSignature, data.agreements, documents, onChange])

  const requiredCount = documents.filter((d) => d.required).length
  const signedRequiredCount = data.agreements.filter((a) => {
    const doc = documents.find((d) => d.id === a.documentId)
    return doc?.required && a.signed
  }).length

  return (
    <div className="space-y-8">
      {/* Progress */}
      <div className="rounded-lg bg-wizard-hover p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-wizard-text">
              {signedRequiredCount} of {requiredCount} required agreements signed
            </p>
            <p className="mt-1 text-xs text-wizard-muted">
              Please review and sign all required documents to continue
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
            <span className="font-serif text-lg font-medium text-wizard-accent">
              {signedRequiredCount}/{requiredCount}
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {errors.agreements && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-600">{errors.agreements}</p>
        </div>
      )}

      {/* Document list */}
      <div className="space-y-4">
        {documents.map((doc) => {
          const status = getAgreementStatus(doc.id)
          const isSigned = status?.signed

          return (
            <div
              key={doc.id}
              className={cn(
                'rounded-lg border p-4 transition-all',
                isSigned && 'border-wizard-success/30 bg-wizard-success/5',
                !isSigned && 'border-wizard-border bg-white'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      isSigned ? 'bg-wizard-success text-white' : 'bg-wizard-hover text-wizard-muted'
                    )}
                  >
                    {isSigned ? <CheckIcon /> : <DocumentIcon />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-wizard-text">{doc.title}</span>
                      {doc.required && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-wizard-muted">
                      Version {doc.version}
                    </p>
                    {isSigned && status?.signedAt && (
                      <p className="mt-1 text-xs text-wizard-success">
                        Signed on {new Date(status.signedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenDocument(doc)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-wizard-muted transition-colors hover:bg-wizard-hover hover:text-wizard-text"
                  >
                    View
                  </button>
                  {!isSigned && (
                    <button
                      type="button"
                      onClick={() => handleSignDocument(doc)}
                      className="rounded-lg bg-wizard-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-wizard-accent-hover"
                    >
                      Sign
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sign Modal */}
      {showSignModal && activeDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="font-serif text-xl font-medium text-wizard-text">
              Sign {activeDocument.title}
            </h3>
            <p className="mt-2 text-sm text-wizard-muted">
              By signing below, you agree to the terms outlined in this document.
            </p>

            {/* Agreement preview placeholder */}
            <div className="mt-4 h-40 overflow-y-auto rounded-lg border border-wizard-border bg-wizard-bg p-4">
              <p className="text-xs text-wizard-muted">
                [Document preview would appear here. In production, this would show
                the actual document content or an embedded PDF viewer.]
              </p>
              <p className="mt-2 text-xs text-wizard-muted">
                I agree to the terms and conditions of the {activeDocument.title}.
                This agreement is legally binding and supersedes any prior agreements.
              </p>
            </div>

            {/* Signature pad */}
            <div className="mt-4">
              <label className="text-sm font-medium text-wizard-text">
                Your Signature
              </label>
              <div className="relative mt-2">
                <canvas
                  ref={signatureCanvasRef}
                  width={400}
                  height={100}
                  className="w-full cursor-crosshair rounded-lg border border-wizard-border bg-white"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!currentSignature && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="text-sm text-wizard-muted/50">Draw your signature</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={clearSignature}
                className="mt-2 text-xs text-wizard-muted hover:text-wizard-text"
              >
                Clear
              </button>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowSignModal(false)
                  setActiveDocument(null)
                  setCurrentSignature(null)
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-wizard-muted transition-colors hover:bg-wizard-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSign}
                disabled={!currentSignature}
                className="rounded-lg bg-wizard-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-wizard-accent-hover disabled:opacity-50"
              >
                Sign Agreement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document viewer modal (simplified) */}
      {activeDocument && !showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[80vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-wizard-border p-4">
              <div>
                <h3 className="font-serif text-lg font-medium text-wizard-text">
                  {activeDocument.title}
                </h3>
                <p className="text-xs text-wizard-muted">Version {activeDocument.version}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDocument(null)}
                className="rounded-lg p-2 text-wizard-muted transition-colors hover:bg-wizard-hover hover:text-wizard-text"
              >
                <XIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm text-wizard-muted">
                [Full document content would appear here. In production, this would
                render the actual agreement document, possibly using an embedded PDF
                viewer or formatted HTML content.]
              </p>
            </div>
            <div className="border-t border-wizard-border p-4">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveDocument(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-wizard-muted transition-colors hover:bg-wizard-hover"
                >
                  Close
                </button>
                {!getAgreementStatus(activeDocument.id)?.signed && (
                  <button
                    type="button"
                    onClick={() => handleSignDocument(activeDocument)}
                    className="rounded-lg bg-wizard-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-wizard-accent-hover"
                  >
                    Sign This Agreement
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DocumentIcon(): React.JSX.Element {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XIcon(): React.JSX.Element {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
