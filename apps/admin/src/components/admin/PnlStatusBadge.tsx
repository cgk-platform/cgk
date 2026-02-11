'use client'

import { Badge } from '@cgk/ui'
import { Check, X, HelpCircle } from 'lucide-react'
import { useState } from 'react'

interface PnlStatusBadgeProps {
  countForPnl: boolean
  exclusionReason?: string | null
  onToggle?: (countForPnl: boolean, reason?: string) => Promise<void>
  readOnly?: boolean
  itemType: string
  itemId: string
}

export function PnlStatusBadge({
  countForPnl,
  exclusionReason,
  onToggle,
  readOnly = false,
  itemType,
  itemId,
}: PnlStatusBadgeProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showReasonInput, setShowReasonInput] = useState(false)
  const [reason, setReason] = useState('')

  const handleClick = async () => {
    if (readOnly || isLoading || !onToggle) return

    if (countForPnl) {
      // Excluding from P&L - need a reason
      setShowReasonInput(true)
    } else {
      // Including back in P&L
      setIsLoading(true)
      try {
        await onToggle(true)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleExclude = async () => {
    if (!reason.trim()) return

    setIsLoading(true)
    try {
      await onToggle?.(false, reason)
      setShowReasonInput(false)
      setReason('')
    } finally {
      setIsLoading(false)
    }
  }

  if (showReasonInput) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for exclusion..."
          className="px-2 py-1 text-sm border rounded"
          autoFocus
        />
        <button
          onClick={handleExclude}
          disabled={!reason.trim() || isLoading}
          className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
        >
          Exclude
        </button>
        <button
          onClick={() => {
            setShowReasonInput(false)
            setReason('')
          }}
          className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={countForPnl ? 'default' : 'secondary'}
        className={`cursor-pointer ${readOnly ? 'cursor-default' : 'hover:opacity-80'} ${
          isLoading ? 'opacity-50' : ''
        } ${countForPnl ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-600'}`}
        onClick={handleClick}
      >
        {countForPnl ? (
          <>
            <Check className="h-3 w-3 mr-1" />
            In P&L
          </>
        ) : (
          <>
            <X className="h-3 w-3 mr-1" />
            Excluded
          </>
        )}
      </Badge>
      {!countForPnl && exclusionReason && (
        <div className="group relative">
          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            {exclusionReason}
          </div>
        </div>
      )}
    </div>
  )
}

interface PnlToggleButtonProps {
  countForPnl: boolean
  onToggle: () => void
  disabled?: boolean
}

export function PnlToggleButton({ countForPnl, onToggle, disabled }: PnlToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${
          countForPnl
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }
      `}
    >
      {countForPnl ? (
        <>
          <Check className="h-3 w-3" />
          Included
        </>
      ) : (
        <>
          <X className="h-3 w-3" />
          Excluded
        </>
      )}
    </button>
  )
}
