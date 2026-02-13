'use client'

import { Button } from '@cgk-platform/ui'
import { FolderPlus } from 'lucide-react'
import { useState } from 'react'

import { ProjectAssignmentModal } from '@/components/contractors'

interface ContractorDetailActionsProps {
  contractorId: string
  contractorName: string
  showProjectButton?: boolean
}

export function ContractorDetailActions({
  contractorId,
  contractorName,
  showProjectButton = false,
}: ContractorDetailActionsProps) {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)

  if (showProjectButton) {
    return (
      <>
        <Button size="sm" onClick={() => setIsProjectModalOpen(true)}>
          <FolderPlus className="mr-2 h-4 w-4" />
          Assign Project
        </Button>

        <ProjectAssignmentModal
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          contractorId={contractorId}
          contractorName={contractorName}
        />
      </>
    )
  }

  return (
    <>
      <Button variant="outline" onClick={() => setIsProjectModalOpen(true)}>
        <FolderPlus className="mr-2 h-4 w-4" />
        Assign Project
      </Button>

      <ProjectAssignmentModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        contractorId={contractorId}
        contractorName={contractorName}
      />
    </>
  )
}
