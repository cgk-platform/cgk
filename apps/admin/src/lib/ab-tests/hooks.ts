/**
 * A/B Testing Client Hooks
 *
 * React hooks for fetching and managing A/B testing data
 */

'use client'

import { useCallback, useEffect, useState } from 'react'

import type {
  ABTest,
  ABVariant,
  TestResults,
  ABTestQuickStatsData,
  TimeSeriesDataPoint,
  FunnelStep,
  SegmentData,
  SRMAnalysis,
  DataQualityOverview,
  Guardrail,
  TemplateABTest,
  ABTestFilters,
  WizardData,
} from './types'

const POLL_INTERVAL = 30000 // 30 seconds

/**
 * Fetch A/B tests list
 */
export function useABTests(filters: ABTestFilters = {}) {
  const [tests, setTests] = useState<ABTest[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTests = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.testType) params.set('testType', filters.testType)
      if (filters.search) params.set('search', filters.search)
      if (filters.page) params.set('page', String(filters.page))
      if (filters.limit) params.set('limit', String(filters.limit))
      if (filters.sort) params.set('sort', filters.sort)
      if (filters.dir) params.set('dir', filters.dir)

      const res = await fetch(`/api/admin/ab-tests?${params}`)
      if (!res.ok) throw new Error('Failed to fetch tests')

      const data = await res.json()
      setTests(data.tests)
      setTotal(data.total)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchTests()
  }, [fetchTests])

  return { tests, total, isLoading, error, refetch: fetchTests }
}

/**
 * Fetch single A/B test
 */
export function useABTest(testId: string) {
  const [test, setTest] = useState<ABTest | null>(null)
  const [variants, setVariants] = useState<ABVariant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTest = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/ab-tests/${testId}`)
      if (!res.ok) throw new Error('Failed to fetch test')

      const data = await res.json()
      setTest(data.test)
      setVariants(data.variants || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [testId])

  useEffect(() => {
    fetchTest()
  }, [fetchTest])

  return { test, variants, isLoading, error, refetch: fetchTest }
}

/**
 * Fetch test results with polling
 */
export function useTestResults(testId: string, enablePolling = true) {
  const [results, setResults] = useState<TestResults | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/ab-tests/${testId}/results`)
      if (!res.ok) throw new Error('Failed to fetch results')

      const data = await res.json()
      setResults(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [testId])

  useEffect(() => {
    fetchResults()

    if (enablePolling) {
      const interval = setInterval(fetchResults, POLL_INTERVAL)
      return () => clearInterval(interval)
    }
  }, [fetchResults, enablePolling])

  return { results, isLoading, error, refetch: fetchResults }
}

/**
 * Fetch quick stats
 */
export function useABTestStats() {
  const [stats, setStats] = useState<ABTestQuickStatsData>({
    activeCount: 0,
    activeChange: 0,
    avgLift: 0,
    monthlyCount: 0,
    totalVisitors: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/ab-tests?stats=true')
        if (!res.ok) throw new Error('Failed to fetch stats')

        const data = await res.json()
        setStats(data.stats)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  return { stats, isLoading, error }
}

/**
 * Fetch time series data
 */
export function useTimeSeriesData(testId: string) {
  const [data, setData] = useState<TimeSeriesDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/admin/ab-tests/${testId}/results?timeSeries=true`)
        if (!res.ok) throw new Error('Failed to fetch time series')

        const json = await res.json()
        setData(json.timeSeries || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [testId])

  return { data, isLoading, error }
}

/**
 * Fetch funnel data
 */
export function useFunnelData(testId: string) {
  const [data, setData] = useState<FunnelStep[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/admin/ab-tests/${testId}/results?funnel=true`)
        if (!res.ok) throw new Error('Failed to fetch funnel')

        const json = await res.json()
        setData(json.funnel || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [testId])

  return { data, isLoading, error }
}

/**
 * Fetch segment data
 */
export function useSegmentData(
  testId: string,
  segmentType: 'device' | 'country' | 'source'
) {
  const [data, setData] = useState<SegmentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          `/api/admin/ab-tests/${testId}/segments?type=${segmentType}`
        )
        if (!res.ok) throw new Error('Failed to fetch segments')

        const json = await res.json()
        setData(json.segments || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [testId, segmentType])

  return { data, isLoading, error }
}

/**
 * Fetch SRM analysis
 */
export function useSRMAnalysis(testId: string) {
  const [analysis, setAnalysis] = useState<SRMAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/admin/ab-tests/${testId}/srm`)
        if (!res.ok) throw new Error('Failed to fetch SRM analysis')

        const data = await res.json()
        setAnalysis(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [testId])

  return { analysis, isLoading, error }
}

/**
 * Fetch data quality overview
 */
export function useDataQualityOverview() {
  const [overview, setOverview] = useState<DataQualityOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/ab-tests/data-quality')
        if (!res.ok) throw new Error('Failed to fetch data quality')

        const data = await res.json()
        setOverview(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  return { overview, isLoading, error }
}

/**
 * Fetch guardrails
 */
export function useGuardrails(testId: string) {
  const [guardrails, setGuardrails] = useState<Guardrail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/admin/ab-tests/${testId}/guardrails`)
        if (!res.ok) throw new Error('Failed to fetch guardrails')

        const data = await res.json()
        setGuardrails(data.guardrails || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [testId])

  return { guardrails, isLoading, error }
}

/**
 * Fetch template A/B tests
 */
export function useTemplateABTests() {
  const [tests, setTests] = useState<TemplateABTest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/templates/ab-tests')
        if (!res.ok) throw new Error('Failed to fetch template tests')

        const data = await res.json()
        setTests(data.tests || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  return { tests, isLoading, error }
}

/**
 * Create A/B test mutation
 */
export function useCreateABTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createTest = useCallback(async (data: WizardData): Promise<ABTest | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/ab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create test')
      }

      const result = await res.json()
      return result.test
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { createTest, isLoading, error }
}

/**
 * Test actions (start, pause, end)
 */
export function useTestActions(testId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const performAction = useCallback(
    async (action: 'start' | 'pause' | 'end'): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/admin/ab-tests/${testId}/${action}`, {
          method: 'POST',
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || `Failed to ${action} test`)
        }

        return true
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [testId]
  )

  return {
    startTest: () => performAction('start'),
    pauseTest: () => performAction('pause'),
    endTest: () => performAction('end'),
    isLoading,
    error,
  }
}

/**
 * Delete test mutation
 */
export function useDeleteABTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const deleteTest = useCallback(async (testId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/ab-tests/${testId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to delete test')
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { deleteTest, isLoading, error }
}
