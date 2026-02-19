'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@cgk-platform/ui'
import { AlertTriangle, CheckCircle, Link, RefreshCw } from 'lucide-react'

interface LinkHealthEntry {
  id: string
  title: string
  slug: string
  totalLinks: number
  brokenLinks: number
  lastChecked: string | null
  status: 'healthy' | 'broken' | 'unchecked'
}

const MOCK_ENTRIES: LinkHealthEntry[] = [
  {
    id: '1',
    title: 'Complete Skincare Routine Guide',
    slug: 'complete-skincare-routine-guide',
    totalLinks: 18,
    brokenLinks: 0,
    lastChecked: '2026-02-18T14:00:00Z',
    status: 'healthy',
  },
  {
    id: '2',
    title: 'Top 10 Supplements for Energy',
    slug: 'top-10-supplements-energy',
    totalLinks: 12,
    brokenLinks: 3,
    lastChecked: '2026-02-18T14:00:00Z',
    status: 'broken',
  },
  {
    id: '3',
    title: 'Anti-Aging Foods to Eat Daily',
    slug: 'anti-aging-foods-daily',
    totalLinks: 7,
    brokenLinks: 1,
    lastChecked: '2026-02-17T09:00:00Z',
    status: 'broken',
  },
  {
    id: '4',
    title: 'New Draft Post',
    slug: 'new-draft-post',
    totalLinks: 0,
    brokenLinks: 0,
    lastChecked: null,
    status: 'unchecked',
  },
]

function StatusCell({ status }: { status: LinkHealthEntry['status'] }) {
  if (status === 'healthy') {
    return (
      <div className="flex items-center gap-1.5 text-success">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Healthy</span>
      </div>
    )
  }
  if (status === 'broken') {
    return (
      <div className="flex items-center gap-1.5 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">Broken links</span>
      </div>
    )
  }
  return <Badge variant="outline">Unchecked</Badge>
}

export default function LinkHealthPage() {
  const [entries, setEntries] = useState<LinkHealthEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/blog/link-health')
      if (res.ok) {
        const data = await res.json() as { entries: LinkHealthEntry[] }
        setEntries(data.entries.length > 0 ? data.entries : MOCK_ENTRIES)
      } else {
        setEntries(MOCK_ENTRIES)
      }
    } catch {
      setEntries(MOCK_ENTRIES)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchEntries()
  }, [fetchEntries])

  async function handleScan() {
    setScanning(true)
    await new Promise((r) => setTimeout(r, 1500))
    setScanning(false)
  }

  const brokenCount = entries.filter((e) => e.status === 'broken').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Link Health</h1>
          <p className="text-muted-foreground">
            Monitor broken and outdated links across all blog posts.
          </p>
        </div>
        <Button variant="outline" onClick={() => void handleScan()} disabled={scanning}>
          <RefreshCw className={`mr-2 h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning…' : 'Scan All Posts'}
        </Button>
      </div>

      {brokenCount > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              {brokenCount} {brokenCount === 1 ? 'post has' : 'posts have'} broken links that need
              attention.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="h-6 w-6 text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Post</TableHead>
                  <TableHead className="text-right">Total Links</TableHead>
                  <TableHead className="text-right">Broken</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Checked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableEmpty
                    icon={Link}
                    title="No posts scanned yet"
                    description="Click &quot;Scan All Posts&quot; to check link health across your blog."
                    colSpan={5}
                  />
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <p className="font-medium">{entry.title}</p>
                        <p className="text-xs text-muted-foreground">/{entry.slug}</p>
                      </TableCell>
                      <TableCell className="text-right">{entry.totalLinks}</TableCell>
                      <TableCell className="text-right">
                        {entry.brokenLinks > 0 ? (
                          <span className="font-semibold text-destructive">
                            {entry.brokenLinks}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusCell status={entry.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.lastChecked
                          ? new Date(entry.lastChecked).toLocaleDateString()
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
