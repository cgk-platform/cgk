'use client'

import {
  Mail,
  Send,
  Inbox,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'

import type { TreasuryCommunication, ParsedStatus, ParsedConfidence } from '@/lib/treasury/types'

interface CommunicationLogProps {
  communications: TreasuryCommunication[]
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function CommunicationLog({ communications }: CommunicationLogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (communications.length === 0) {
    return (
      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Communication Log
        </h3>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-8 text-center">
          <Mail className="mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No communications yet</p>
          <p className="text-xs text-slate-400">
            Send an approval email to start the communication thread
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Communication Log ({communications.length})
      </h3>
      <div className="space-y-3">
        {communications.map((comm) => (
          <CommunicationEntry
            key={comm.id}
            communication={comm}
            isExpanded={expandedId === comm.id}
            onToggle={() => setExpandedId(expandedId === comm.id ? null : comm.id)}
          />
        ))}
      </div>
    </div>
  )
}

function CommunicationEntry({
  communication,
  isExpanded,
  onToggle,
}: {
  communication: TreasuryCommunication
  isExpanded: boolean
  onToggle: () => void
}) {
  const isOutbound = communication.direction === 'outbound'

  return (
    <div
      className={`rounded-lg border ${
        isOutbound ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'
      }`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              isOutbound ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isOutbound ? <Send className="h-4 w-4" /> : <Inbox className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900">
                {isOutbound ? 'Outbound Email' : 'Inbound Reply'}
              </span>
              {!isOutbound && communication.parsed_status && (
                <ParsedStatusBadge
                  status={communication.parsed_status}
                  confidence={communication.parsed_confidence}
                />
              )}
            </div>
            <p className="text-xs text-slate-500">
              {isOutbound
                ? `To: ${communication.to_email}`
                : `From: ${communication.from_email}`}
              {' '}
              &bull; {formatDateTime(communication.created_at)}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 px-4 py-3">
          {communication.subject && (
            <div className="mb-2">
              <span className="text-xs font-medium text-slate-500">Subject: </span>
              <span className="text-sm text-slate-700">{communication.subject}</span>
            </div>
          )}
          <div className="rounded-lg bg-white p-3">
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">
              {communication.body}
            </pre>
          </div>

          {/* Parsing details for inbound */}
          {!isOutbound && communication.parsed_status && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <HelpCircle className="h-3 w-3" />
                Parsing Results
              </div>
              <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <span className="text-xs text-slate-500">Detected Status</span>
                  <div className="font-medium capitalize text-slate-900">
                    {communication.parsed_status}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Confidence</span>
                  <div className="font-medium capitalize text-slate-900">
                    {communication.parsed_confidence}
                  </div>
                </div>
                {communication.matched_keywords.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-500">Matched Keywords</span>
                    <div className="flex flex-wrap gap-1">
                      {communication.matched_keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="inline-block rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ParsedStatusBadge({
  status,
  confidence,
}: {
  status: ParsedStatus
  confidence: ParsedConfidence | null
}) {
  const statusStyles = {
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    unclear: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  const statusIcons = {
    approved: <CheckCircle2 className="h-3 w-3" />,
    rejected: <XCircle className="h-3 w-3" />,
    unclear: <HelpCircle className="h-3 w-3" />,
  }

  const confidenceLabels = {
    high: '',
    medium: '?',
    low: '??',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
    >
      {statusIcons[status]}
      {status}
      {confidence && confidence !== 'high' && (
        <span className="opacity-60">{confidenceLabels[confidence]}</span>
      )}
    </span>
  )
}
