'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { InviteContractorModal } from '@/components/contractors'

/**
 * Standalone invite page - opens the modal automatically
 * and redirects back to contractors list when closed
 */
export default function InviteContractorPage() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)

  const handleClose = () => {
    setIsOpen(false)
    router.push('/admin/contractors')
  }

  return <InviteContractorModal isOpen={isOpen} onClose={handleClose} />
}
