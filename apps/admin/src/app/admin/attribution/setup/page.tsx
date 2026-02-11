'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

import { SetupWizard } from '@/components/attribution'

export default function AttributionSetupPage() {
  const router = useRouter()

  const handleComplete = useCallback(() => {
    router.push('/admin/attribution')
  }, [router])

  return (
    <div className="py-6">
      <SetupWizard onComplete={handleComplete} />
    </div>
  )
}
