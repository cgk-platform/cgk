'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { CreatorModal } from './creator-modal'
import { ExportModal } from './export-modal'
import { BulkActionModal } from './bulk-action-modal'
import { ConfirmModal } from './confirm-modal'

export function CreatorDirectoryClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const modal = searchParams.get('modal')
  const creatorId = searchParams.get('id')
  const action = searchParams.get('action')
  const ids = searchParams.get('ids')

  const closeModal = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('modal')
    params.delete('id')
    params.delete('action')
    params.delete('ids')
    const qs = params.toString()
    router.push(qs ? `/admin/creators?${qs}` : '/admin/creators')
  }, [router, searchParams])

  const handleSuccess = useCallback(() => {
    closeModal()
    router.refresh()
  }, [closeModal, router])

  if (modal === 'create') {
    return <CreatorModal mode="create" onClose={closeModal} onSuccess={handleSuccess} />
  }

  if (modal === 'edit' && creatorId) {
    return <CreatorModal mode="edit" creatorId={creatorId} onClose={closeModal} onSuccess={handleSuccess} />
  }

  if (modal === 'export') {
    return <ExportModal onClose={closeModal} selectedIds={ids?.split(',').filter(Boolean)} />
  }

  if (modal === 'bulk' && action && ids) {
    return (
      <BulkActionModal
        action={action}
        creatorIds={ids.split(',').filter(Boolean)}
        onClose={closeModal}
        onSuccess={handleSuccess}
      />
    )
  }

  if (modal === 'deactivate' && creatorId) {
    return (
      <ConfirmModal
        title="Deactivate Creator"
        description="Are you sure you want to deactivate this creator? They will lose access to the creator portal."
        confirmText="Deactivate"
        confirmVariant="warning"
        creatorId={creatorId}
        action="deactivate"
        onClose={closeModal}
        onSuccess={handleSuccess}
      />
    )
  }

  if (modal === 'delete' && creatorId) {
    return (
      <ConfirmModal
        title="Delete Creator"
        description="Are you sure you want to delete this creator? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="destructive"
        creatorId={creatorId}
        action="delete"
        onClose={closeModal}
        onSuccess={handleSuccess}
      />
    )
  }

  return null
}
