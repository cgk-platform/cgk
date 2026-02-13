import { Button, Card, CardContent } from '@cgk-platform/ui'
import { MessageSquare, Plus } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { getBulkSends } from '@/lib/creator-communications/db'

import { BulkSendList } from './bulk-send-list'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function BulkSendPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt((params.page as string) || '1', 10)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bulk Messages</h1>
          <p className="text-sm text-muted-foreground">
            Send messages to multiple creators at once
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/creators/communications/bulk/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      <Suspense fallback={<BulkSendSkeleton />}>
        <BulkSendLoader page={page} />
      </Suspense>
    </div>
  )
}

async function BulkSendLoader({ page }: { page: number }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const { rows, totalCount } = await getBulkSends(tenantSlug, page, 20)

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No bulk campaigns</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a campaign to send messages to multiple creators.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/admin/creators/communications/bulk/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Create Campaign
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <BulkSendList bulkSends={rows} totalCount={totalCount} page={page} />
}

function BulkSendSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
