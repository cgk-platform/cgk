/**
 * Icon Component for Landing Page Blocks
 *
 * Provides dynamic icon rendering using Lucide icons.
 * Icons are specified by name and rendered from the Lucide library.
 */

import * as LucideIcons from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { cn } from '@cgk/ui'

/**
 * Map of icon names to Lucide components
 * This allows dynamic icon rendering by name
 */
type IconName = keyof typeof LucideIcons

/**
 * Check if a string is a valid Lucide icon name
 */
function isValidIconName(name: string): name is IconName {
  return name in LucideIcons && typeof (LucideIcons as Record<string, unknown>)[name] === 'function'
}

/**
 * Convert kebab-case to PascalCase for icon lookup
 */
function kebabToPascal(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

/**
 * Get a Lucide icon component by name
 * Supports both kebab-case (check-circle) and PascalCase (CheckCircle)
 */
export function getIconByName(name: string): React.ComponentType<LucideProps> | null {
  // Try direct lookup first
  if (isValidIconName(name)) {
    return LucideIcons[name] as React.ComponentType<LucideProps>
  }

  // Try PascalCase conversion
  const pascalName = kebabToPascal(name)
  if (isValidIconName(pascalName)) {
    return LucideIcons[pascalName] as React.ComponentType<LucideProps>
  }

  return null
}

/**
 * Props for LucideIcon component
 */
interface LucideIconProps extends Omit<LucideProps, 'ref'> {
  name: string
  fallback?: string
}

/**
 * Dynamic Lucide Icon Component
 *
 * Renders a Lucide icon by name. Falls back to a default icon if not found.
 */
export function LucideIcon({
  name,
  fallback = 'Circle',
  className,
  ...props
}: LucideIconProps) {
  const Icon = getIconByName(name) || getIconByName(fallback) || LucideIcons.Circle

  return <Icon className={cn('shrink-0', className)} {...props} />
}

/**
 * Common icon sets for quick access
 */
export const COMMON_ICONS = {
  // Actions
  check: 'Check',
  close: 'X',
  plus: 'Plus',
  minus: 'Minus',
  edit: 'Pencil',
  delete: 'Trash2',
  search: 'Search',
  filter: 'Filter',

  // Navigation
  arrowLeft: 'ArrowLeft',
  arrowRight: 'ArrowRight',
  arrowUp: 'ArrowUp',
  arrowDown: 'ArrowDown',
  chevronLeft: 'ChevronLeft',
  chevronRight: 'ChevronRight',
  chevronUp: 'ChevronUp',
  chevronDown: 'ChevronDown',
  menu: 'Menu',

  // Content
  star: 'Star',
  starFilled: 'Star',
  heart: 'Heart',
  heartFilled: 'Heart',
  bookmark: 'Bookmark',
  share: 'Share2',
  link: 'Link',
  copy: 'Copy',

  // Commerce
  cart: 'ShoppingCart',
  bag: 'ShoppingBag',
  package: 'Package',
  truck: 'Truck',
  creditCard: 'CreditCard',
  dollarSign: 'DollarSign',

  // User
  user: 'User',
  users: 'Users',
  settings: 'Settings',
  logout: 'LogOut',
  login: 'LogIn',

  // Communication
  mail: 'Mail',
  phone: 'Phone',
  message: 'MessageSquare',
  send: 'Send',

  // Status
  success: 'CheckCircle',
  error: 'XCircle',
  warning: 'AlertTriangle',
  info: 'Info',
  help: 'HelpCircle',

  // Media
  image: 'Image',
  video: 'Video',
  play: 'Play',
  pause: 'Pause',
  volume: 'Volume2',
  mute: 'VolumeX',

  // Layout
  grid: 'Grid',
  list: 'List',
  columns: 'Columns',
  rows: 'Rows',
  layout: 'Layout',

  // Misc
  sparkles: 'Sparkles',
  zap: 'Zap',
  flame: 'Flame',
  target: 'Target',
  trophy: 'Trophy',
  award: 'Award',
  badge: 'BadgeCheck',
  shield: 'Shield',
  lock: 'Lock',
  unlock: 'Unlock',
  eye: 'Eye',
  eyeOff: 'EyeOff',
  clock: 'Clock',
  calendar: 'Calendar',
  globe: 'Globe',
  map: 'Map',
  compass: 'Compass',
  sun: 'Sun',
  moon: 'Moon',
  cloud: 'Cloud',

  // Science & Health
  flask: 'FlaskConical',
  microscope: 'Microscope',
  dna: 'Dna',
  activity: 'Activity',
  thermometer: 'Thermometer',
  pill: 'Pill',
  stethoscope: 'Stethoscope',

  // Documents
  file: 'File',
  fileText: 'FileText',
  folder: 'Folder',
  download: 'Download',
  upload: 'Upload',
  printer: 'Printer',

  // Social
  facebook: 'Facebook',
  twitter: 'Twitter',
  instagram: 'Instagram',
  linkedin: 'Linkedin',
  youtube: 'Youtube',
  github: 'Github',
} as const

/**
 * Social media icon mapping
 */
export const SOCIAL_ICONS: Record<string, string> = {
  facebook: 'Facebook',
  twitter: 'Twitter',
  instagram: 'Instagram',
  linkedin: 'Linkedin',
  youtube: 'Youtube',
  tiktok: 'Music2', // TikTok uses music note as placeholder
  pinterest: 'Pin',
  snapchat: 'Ghost',
  reddit: 'MessageCircle',
  discord: 'MessageCircle',
  twitch: 'Tv',
}

/**
 * Get social media icon by platform name
 */
export function getSocialIcon(platform: string): string {
  return SOCIAL_ICONS[platform.toLowerCase()] || 'Link'
}
