import { Card, CardContent } from '@cgk/ui'

export interface ActivityItem {
  id: string
  type: string
  description: string
  timestamp: string
}

interface ActivityFeedProps {
  items: ActivityItem[]
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium">Recent Activity</h3>
          <p className="mt-2 text-sm text-muted-foreground">No recent activity.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 text-sm font-medium">Recent Activity</h3>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
              <div className="flex-1">
                <p className="text-sm">{item.description}</p>
                <p className="text-xs text-muted-foreground">{item.timestamp}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function ActivityFeedSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
