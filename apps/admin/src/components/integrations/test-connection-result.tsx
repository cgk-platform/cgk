'use client'

import { cn } from '@cgk/ui'
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface TestConnectionResultProps {
  status: 'idle' | 'testing' | 'success' | 'error'
  message?: string
  details?: Record<string, unknown>
  className?: string
}

export function TestConnectionResult({
  status,
  message,
  details,
  className,
}: TestConnectionResultProps) {
  if (status === 'idle') return null

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4',
        status === 'testing' && 'border-blue-500/30 bg-blue-500/5',
        status === 'success' && 'border-emerald-500/30 bg-emerald-500/5',
        status === 'error' && 'border-rose-500/30 bg-rose-500/5',
        className
      )}
    >
      {status === 'testing' && (
        <Loader2 className="h-5 w-5 animate-spin text-blue-500 shrink-0" />
      )}
      {status === 'success' && (
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
      )}
      {status === 'error' && (
        <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium',
            status === 'testing' && 'text-blue-500',
            status === 'success' && 'text-emerald-500',
            status === 'error' && 'text-rose-500'
          )}
        >
          {status === 'testing' && 'Testing connection...'}
          {status === 'success' && (message || 'Connection successful')}
          {status === 'error' && (message || 'Connection failed')}
        </p>

        {details && Object.keys(details).length > 0 && (
          <div className="mt-2 space-y-1">
            {Object.entries(details).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{key}:</span>
                <span className="font-mono text-foreground">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
