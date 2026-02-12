'use client'

import { Button } from '@cgk/ui'
import { Download, UserPlus } from 'lucide-react'
import { useState, useTransition } from 'react'

import { InviteContractorModal } from './invite-contractor-modal'

interface ContractorActionsProps {
  totalCount: number
}

export function ContractorActions({ totalCount }: ContractorActionsProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isExporting, startExport] = useTransition()

  const handleExport = () => {
    startExport(async () => {
      const response = await fetch('/api/admin/contractors/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `contractors-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting || totalCount === 0}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </Button>

        <Button size="sm" onClick={() => setIsInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Contractor
        </Button>
      </div>

      <InviteContractorModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
    </>
  )
}
