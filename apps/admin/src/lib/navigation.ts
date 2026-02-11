import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  BarChart3,
  Users,
  Wallet,
  Activity,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavChild {
  label: string
  href: string
}

export interface NavSection {
  label: string
  icon: LucideIcon
  href: string
  children?: NavChild[]
  featureFlag?: string
}

export const navigation: NavSection[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin',
  },
  {
    label: 'Content',
    icon: FileText,
    href: '/admin/content',
    children: [
      { label: 'Blog', href: '/admin/content/blog' },
      { label: 'Landing Pages', href: '/admin/content/pages' },
      { label: 'SEO', href: '/admin/content/seo' },
      { label: 'Brand Context', href: '/admin/content/brand' },
    ],
  },
  {
    label: 'Commerce',
    icon: ShoppingCart,
    href: '/admin/commerce',
    children: [
      { label: 'Orders', href: '/admin/commerce/orders' },
      { label: 'Customers', href: '/admin/commerce/customers' },
      { label: 'Subscriptions', href: '/admin/commerce/subscriptions' },
      { label: 'Reviews', href: '/admin/commerce/reviews' },
      { label: 'A/B Tests', href: '/admin/commerce/ab-tests' },
      { label: 'Promotions', href: '/admin/commerce/promotions' },
    ],
  },
  {
    label: 'Attribution',
    icon: BarChart3,
    href: '/admin/attribution',
    featureFlag: 'attribution',
    children: [
      { label: 'Overview', href: '/admin/attribution' },
      { label: 'Channels', href: '/admin/attribution/channels' },
      { label: 'Journeys', href: '/admin/attribution/journeys' },
      { label: 'AI Insights', href: '/admin/attribution/insights' },
    ],
  },
  {
    label: 'Creators',
    icon: Users,
    href: '/admin/creators',
    featureFlag: 'creators',
    children: [
      { label: 'Directory', href: '/admin/creators' },
      { label: 'Applications', href: '/admin/creators/applications' },
      { label: 'Pipeline', href: '/admin/creators/pipeline' },
      { label: 'Inbox', href: '/admin/creators/inbox' },
    ],
  },
  {
    label: 'Finance',
    icon: Wallet,
    href: '/admin/finance',
    children: [
      { label: 'Payouts', href: '/admin/finance/payouts' },
      { label: 'Treasury', href: '/admin/finance/treasury' },
      { label: 'Expenses', href: '/admin/finance/expenses' },
      { label: 'Tax / 1099', href: '/admin/finance/tax' },
    ],
  },
  {
    label: 'Operations',
    icon: Activity,
    href: '/admin/operations',
    children: [
      { label: 'Dashboard', href: '/admin/operations' },
      { label: 'Errors', href: '/admin/operations/errors' },
      { label: 'Health', href: '/admin/operations/health' },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    href: '/admin/settings',
    children: [
      { label: 'General', href: '/admin/settings/general' },
      { label: 'Domains', href: '/admin/settings/domains' },
      { label: 'Shopify', href: '/admin/settings/shopify' },
      { label: 'Payments', href: '/admin/settings/payments' },
      { label: 'Team', href: '/admin/settings/team' },
      { label: 'Integrations', href: '/admin/settings/integrations' },
    ],
  },
]
