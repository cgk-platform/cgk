'use client'

import { Button } from '@cgk-platform/ui'
import { Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface DuplicatePageButtonProps {
  pageId: string
}

export function DuplicatePageButton({ pageId }: DuplicatePageButtonProps) {
  const router = useRouter()
  const [duplicating, setDuplicating] = useState(false)

  const handleDuplicate = async () => {
    setDuplicating(true)
    try {
      const res = await fetch(`/api/admin/landing-pages/${pageId}/duplicate`, {
        method: 'POST',
      })
      if (res.ok) {
        const { page } = await res.json()
        router.push(`/admin/landing-pages/${page.id}`)
      }
    } catch (err) {
      console.error('Failed to duplicate page:', err)
    } finally {
      setDuplicating(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDuplicate}
      disabled={duplicating}
      title="Duplicate page"
    >
      <Copy className="h-4 w-4" />
    </Button>
  )
}
