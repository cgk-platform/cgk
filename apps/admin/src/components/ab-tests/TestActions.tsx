'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Pause, StopCircle, Trophy, Download } from 'lucide-react'

import { Button, Card, CardHeader, CardContent, cn } from '@cgk/ui'

import { useTestActions } from '@/lib/ab-tests/hooks'
import type { ABTest } from '@/lib/ab-tests/types'

interface TestActionsProps {
  test: ABTest
}

export function TestActions({ test }: TestActionsProps) {
  const router = useRouter()
  const { startTest, pauseTest, endTest, isLoading } = useTestActions(test.id)
  const [showEndConfirm, setShowEndConfirm] = useState(false)

  const handleStart = async () => {
    const success = await startTest()
    if (success) router.refresh()
  }

  const handlePause = async () => {
    const success = await pauseTest()
    if (success) router.refresh()
  }

  const handleEnd = async () => {
    const success = await endTest()
    if (success) {
      setShowEndConfirm(false)
      router.refresh()
    }
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Actions
        </h3>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-2">
          {/* Start/Resume */}
          {(test.status === 'draft' || test.status === 'paused') && (
            <Button
              variant="default"
              className="w-full justify-start bg-emerald-600 hover:bg-emerald-700"
              onClick={handleStart}
              disabled={isLoading}
            >
              <Play className="mr-2 h-4 w-4" />
              {test.status === 'draft' ? 'Start Test' : 'Resume Test'}
            </Button>
          )}

          {/* Pause */}
          {test.status === 'running' && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handlePause}
              disabled={isLoading}
            >
              <Pause className="mr-2 h-4 w-4" />
              Pause Test
            </Button>
          )}

          {/* End Test */}
          {(test.status === 'running' || test.status === 'paused') && (
            <>
              {showEndConfirm ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-sm text-amber-800">
                    Are you sure? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleEnd}
                      disabled={isLoading}
                    >
                      End Test
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEndConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start text-amber-600 hover:text-amber-700"
                  onClick={() => setShowEndConfirm(true)}
                >
                  <StopCircle className="mr-2 h-4 w-4" />
                  End Test
                </Button>
              )}
            </>
          )}

          {/* Declare Winner (if completed) */}
          {test.status === 'completed' && !test.winnerVariantId && (
            <Button
              variant="default"
              className="w-full justify-start"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Declare Winner
            </Button>
          )}

          {/* Export */}
          <Button
            variant="ghost"
            className="w-full justify-start"
            asChild
          >
            <a href={`/api/admin/ab-tests/${test.id}/export?format=csv`} download>
              <Download className="mr-2 h-4 w-4" />
              Export Results
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
