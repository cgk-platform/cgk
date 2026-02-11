import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  BarChart3,
  Users,
  Wallet,
  Activity,
  Settings,
  Calendar,
  Bot,
  Mail,
  Headphones,
  ClipboardList,
  FileSignature,
  Plug,
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
    label: 'Surveys',
    icon: ClipboardList,
    href: '/admin/surveys',
    children: [
      { label: 'All Surveys', href: '/admin/surveys' },
      { label: 'Attribution Options', href: '/admin/surveys/attribution' },
      { label: 'Slack Integration', href: '/admin/surveys/slack' },
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
    label: 'E-Signatures',
    icon: FileSignature,
    href: '/admin/esign',
    featureFlag: 'esign',
    children: [
      { label: 'Dashboard', href: '/admin/esign' },
      { label: 'Documents', href: '/admin/esign/documents' },
      { label: 'Pending', href: '/admin/esign/pending' },
      { label: 'Counter-Sign', href: '/admin/esign/counter-sign' },
      { label: 'Templates', href: '/admin/esign/templates' },
      { label: 'Bulk Send', href: '/admin/esign/bulk-send' },
      { label: 'Reports', href: '/admin/esign/reports' },
      { label: 'Webhooks', href: '/admin/esign/webhooks' },
    ],
  },
  {
    label: 'Scheduling',
    icon: Calendar,
    href: '/admin/scheduling',
    featureFlag: 'scheduling',
    children: [
      { label: 'Dashboard', href: '/admin/scheduling' },
      { label: 'Event Types', href: '/admin/scheduling/event-types' },
      { label: 'Availability', href: '/admin/scheduling/availability' },
      { label: 'Bookings', href: '/admin/scheduling/bookings' },
      { label: 'Analytics', href: '/admin/scheduling/analytics' },
      { label: 'Settings', href: '/admin/scheduling/settings' },
    ],
  },
  {
    label: 'Support',
    icon: Headphones,
    href: '/admin/support',
    children: [
      { label: 'Dashboard', href: '/admin/support' },
      { label: 'Tickets', href: '/admin/support/tickets' },
      { label: 'Agents', href: '/admin/support/agents' },
      { label: 'Settings', href: '/admin/support/settings' },
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
    label: 'Bri',
    icon: Bot,
    href: '/admin/bri',
    featureFlag: 'aiAgents',
    children: [
      { label: 'Dashboard', href: '/admin/bri' },
      { label: 'Conversations', href: '/admin/bri/conversations' },
      { label: 'Action Log', href: '/admin/bri/action-log' },
      { label: 'Creative Ideas', href: '/admin/bri/creative-ideas' },
      { label: 'Autonomy', href: '/admin/bri/autonomy' },
      { label: 'Voice', href: '/admin/bri/voice' },
      { label: 'Integrations', href: '/admin/bri/integrations' },
      { label: 'Team Memories', href: '/admin/bri/team-memories' },
      { label: 'Notifications', href: '/admin/bri/notifications' },
      { label: 'Follow-ups', href: '/admin/bri/followups' },
    ],
  },
  {
    label: 'Templates',
    icon: Mail,
    href: '/admin/templates',
    children: [
      { label: 'Library', href: '/admin/templates' },
      { label: 'Analytics', href: '/admin/templates/analytics' },
    ],
  },
  {
    label: 'Operations',
    icon: Activity,
    href: '/admin/operations',
    children: [
      { label: 'Dashboard', href: '/admin/operations' },
      { label: 'Logs', href: '/admin/operations/logs' },
      { label: 'Errors', href: '/admin/operations/errors' },
      { label: 'Health', href: '/admin/operations/health' },
    ],
  },
  {
    label: 'Integrations',
    icon: Plug,
    href: '/admin/integrations',
    children: [
      { label: 'Overview', href: '/admin/integrations' },
      { label: 'Shopify', href: '/admin/integrations/shopify-app' },
      { label: 'Meta Ads', href: '/admin/integrations/meta-ads' },
      { label: 'Google Ads', href: '/admin/integrations/google-ads' },
      { label: 'TikTok Ads', href: '/admin/integrations/tiktok-ads' },
      { label: 'SMS & Voice', href: '/admin/integrations/sms' },
      { label: 'Slack', href: '/admin/integrations/slack' },
      { label: 'Klaviyo', href: '/admin/integrations/klaviyo' },
      { label: 'Yotpo', href: '/admin/integrations/yotpo' },
      { label: 'MCP', href: '/admin/integrations/mcp' },
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
