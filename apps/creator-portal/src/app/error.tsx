'use client'

import { useEffect } from 'react'
import { Button } from '@cgk-platform/ui'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">An error occurred while loading this page.</p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  )
}
