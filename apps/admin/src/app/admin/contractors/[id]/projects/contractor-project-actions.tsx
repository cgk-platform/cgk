'use client'

import { Button } from '@cgk/ui'
import { FolderPlus } from 'lucide-react'
import { useState } from 'react'

import { ProjectAssignmentModal } from '@/components/contractors'

interface ContractorProjectActionsProps {
  contractorId: string
  contractorName: string
}

export function ContractorProjectActions({
  contractorId,
  contractorName,
}: ContractorProjectActionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>
        <FolderPlus className="mr-2 h-4 w-4" />
        Assign New Project
      </Button>

      <ProjectAssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contractorId={contractorId}
        contractorName={contractorName}
      />
    </>
  )
}
