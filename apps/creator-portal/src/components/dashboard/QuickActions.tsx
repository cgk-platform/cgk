'use client'

import Link from 'next/link'

interface QuickAction {
  id: string
  label: string
  description: string
  href: string
  icon: React.ReactNode
}

const actions: QuickAction[] = [
  {
    id: 'projects',
    label: 'View Projects',
    description: 'See your active and past projects',
    href: '/projects',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'upload',
    label: 'Upload Files',
    description: 'Submit deliverables for review',
    href: '/projects?action=upload',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
      </svg>
    ),
  },
  {
    id: 'teleprompter',
    label: 'Teleprompter',
    description: 'Practice your scripts',
    href: '/teleprompter',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M7 7h10" />
        <path d="M7 12h10" />
        <path d="M7 17h10" />
      </svg>
    ),
  },
  {
    id: 'earnings',
    label: 'View Earnings',
    description: 'Track your income and payouts',
    href: '/earnings',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" x2="12" y1="2" y2="22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: 'messages',
    label: 'Messages',
    description: 'Chat with your coordinator',
    href: '/messages',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
]

export function QuickActions(): React.JSX.Element {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {actions.map((action) => (
        <Link
          key={action.id}
          href={action.href}
          className="group flex flex-col items-center rounded-lg border bg-card p-4 text-center transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <div className="mb-2 text-muted-foreground transition-colors group-hover:text-accent-foreground">
            {action.icon}
          </div>
          <span className="text-sm font-medium">{action.label}</span>
          <span className="mt-0.5 text-xs text-muted-foreground">
            {action.description}
          </span>
        </Link>
      ))}
    </div>
  )
}
