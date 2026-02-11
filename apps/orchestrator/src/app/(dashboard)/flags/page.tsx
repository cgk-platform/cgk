'use client'

import type { FeatureFlag } from '@cgk/feature-flags'
import { Button } from '@cgk/ui'
import { useState, useCallback } from 'react'

import { CreateFlagModal, FlagEditor, FlagList } from '../../../components/flags'

/**
 * Feature Flags page
 *
 * Manage platform-wide and per-tenant feature flags.
 */
export default function FlagsPage() {
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const handleFlagCreated = useCallback(() => {
    setShowCreateModal(false)
    handleRefresh()
  }, [handleRefresh])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-muted-foreground">
            Manage platform-wide and per-tenant feature flags.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>Create Flag</Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Flag List */}
        <div className="col-span-5">
          <FlagList
            key={refreshKey}
            onSelectFlag={setSelectedFlag}
            selectedFlagKey={selectedFlag?.key}
          />
        </div>

        {/* Flag Editor */}
        <div className="col-span-7">
          {selectedFlag ? (
            <FlagEditor
              key={selectedFlag.key}
              flagKey={selectedFlag.key}
              onUpdate={handleRefresh}
            />
          ) : (
            <div className="flex items-center justify-center h-64 rounded-lg border border-dashed text-muted-foreground">
              Select a flag to view details
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateFlagModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleFlagCreated}
        />
      )}
    </div>
  )
}
