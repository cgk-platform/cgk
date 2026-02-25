'use client'

import { cn } from '@cgk-platform/ui'
import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface RefreshButtonProps {
  onRefresh: () => Promise<void> | void
  className?: string
}

export function RefreshButton({ onRefresh, className }: RefreshButtonProps) {
  const [spinning, setSpinning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleClick = useCallback(async () => {
    setSpinning(true)
    try {
      await onRefresh()
    } finally {
      // Keep spinning for at least 500ms for visual feedback
      timerRef.current = setTimeout(() => setSpinning(false), 500)
    }
  }, [onRefresh])

  return (
    <button
      onClick={handleClick}
      disabled={spinning}
      className={cn(
        'rounded-md border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50',
        className
      )}
      aria-label="Refresh"
      title="Refresh"
    >
      <RefreshCw className={cn('h-4 w-4', spinning && 'animate-spin')} />
    </button>
  )
}
