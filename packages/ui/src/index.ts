/**
 * @cgk/ui - React UI components using shadcn/ui patterns
 *
 * @ai-pattern ui-components
 * @ai-note Uses Radix primitives with Tailwind CSS styling
 */

// Utilities
export { cn } from './utils/cn'

// Component primitives
export { Button, buttonVariants, type ButtonProps } from './components/button'
export { Card, CardHeader, CardContent, CardFooter, type CardProps } from './components/card'
export { Input, type InputProps } from './components/input'
export { Label, type LabelProps } from './components/label'
export { Select, SelectOption, selectVariants, type SelectProps } from './components/select'
export { Switch, type SwitchProps } from './components/switch'
export { Textarea, type TextareaProps } from './components/textarea'

// Feedback components
export { Alert, AlertTitle, AlertDescription, alertVariants, type AlertProps } from './components/alert'
export { Badge, badgeVariants, type BadgeProps } from './components/badge'
export { Spinner, spinnerVariants, type SpinnerProps } from './components/spinner'

// Layout components
export { Container, type ContainerProps } from './components/container'

// Permission context
export {
  PermissionGate,
  PermissionProvider,
  useHasAllPermissions,
  useHasAnyPermission,
  useHasPermission,
  usePermissions,
  withPermission,
} from './context/permission-context'

// Tenant context
export {
  TenantProvider,
  useAvailableTenants,
  useCurrentTenant,
  useHasMultipleTenants,
  useTenant,
} from './context/tenant-context'

export type { TenantInfo } from './context/tenant-context'

// Tenant switching components
export {
  MultiTenantWelcomeModal,
  type MultiTenantWelcomeModalProps,
} from './components/multi-tenant-welcome-modal'

export {
  RoleBadge,
  roleBadgeVariants,
  TenantLogo,
  TenantSwitcher,
  type TenantSwitcherProps,
} from './components/tenant-switcher'

// Types
export type { VariantProps } from 'class-variance-authority'
