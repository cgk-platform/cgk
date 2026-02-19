import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@cgk-platform/ui'
import { ArrowRight, FileText, Inbox, Mail, MessageSquare, Star } from 'lucide-react'
import Link from 'next/link'

export default function CommunicationsPage() {
  const cards = [
    {
      title: 'Review Queue',
      description: 'Review request & reminder emails',
      href: '/admin/communications/queues/review',
      icon: Star,
    },
    {
      title: 'Subscription Queue',
      description: 'Subscription lifecycle emails',
      href: '/admin/communications/queues/subscription',
      icon: Mail,
    },
    {
      title: 'E-Sign Queue',
      description: 'Document signing notification emails',
      href: '/admin/communications/queues/esign',
      icon: FileText,
    },
    {
      title: 'Treasury Queue',
      description: 'Treasury approval & payout emails',
      href: '/admin/communications/queues/treasury',
      icon: MessageSquare,
    },
    {
      title: 'Slack',
      description: 'Slack workspace & digest settings',
      href: '/admin/communications/slack',
      icon: MessageSquare,
    },
    {
      title: 'Inbound Emails',
      description: 'Received emails and thread matching',
      href: '/admin/communications/inbound',
      icon: Inbox,
    },
    {
      title: 'Receipt Processing',
      description: 'Treasury receipt parsing queue',
      href: '/admin/communications/inbound/receipts',
      icon: FileText,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Communications</h1>
        <p className="text-muted-foreground">
          Manage email queues, Slack notifications, and inbound email processing.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group">
            <Card className="h-full transition-all duration-200 hover:border-primary/50 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-muted p-2.5">
                    <card.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <CardTitle className="mt-3 text-lg">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <span className="text-sm text-muted-foreground">View queue</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
