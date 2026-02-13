/**
 * @cgk-platform/ui - React UI components using shadcn/ui patterns
 *
 * @ai-pattern ui-components
 * @ai-note Uses Radix primitives with Tailwind CSS styling
 */

// ============================================================================
// Design Tokens
// ============================================================================
export * from './tokens/colors'
export * from './tokens/typography'
export * from './tokens/spacing'
export * from './tokens/animation'

// ============================================================================
// Utilities
// ============================================================================
export { cn } from './utils/cn'
export { formatCurrency, formatPercent, formatNumber, formatCompact, formatBytes } from './utils/format'

// ============================================================================
// Component Primitives
// ============================================================================
export { Button, buttonVariants, type ButtonProps } from './components/button'
export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription, type CardProps } from './components/card'
export { Input, type InputProps } from './components/input'
export { Label, type LabelProps } from './components/label'
export { Select, SelectOption, selectVariants, type SelectProps } from './components/select'
export { Switch, type SwitchProps } from './components/switch'
export { Textarea, type TextareaProps } from './components/textarea'

// ============================================================================
// Radix Select (complex dropdowns)
// ============================================================================
export {
  RadixSelect,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from './components/radix-select'

// ============================================================================
// Tabs
// ============================================================================
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/tabs'

// ============================================================================
// Form Components
// ============================================================================
export { Checkbox } from './components/checkbox'
export { Slider } from './components/slider'
export { Progress } from './components/progress'

// ============================================================================
// Feedback Components
// ============================================================================
export { Alert, AlertTitle, AlertDescription, alertVariants, type AlertProps } from './components/alert'
export { Badge, badgeVariants, type BadgeProps } from './components/badge'
export { Spinner, spinnerVariants, type SpinnerProps } from './components/spinner'
export {
  StatusBadge,
  statusBadgeVariants,
  statusVariantMap,
  formatStatus,
  getVariantFromStatus,
  type StatusBadgeProps,
} from './components/status-badge'

// ============================================================================
// Dialog/Modal
// ============================================================================
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  AlertDialog,
  dialogContentVariants,
  type DialogContentProps,
  type AlertDialogProps,
} from './components/dialog'

// ============================================================================
// Toast/Notifications
// ============================================================================
export { Toaster, toast } from './components/toast'

// ============================================================================
// Skeleton/Loading
// ============================================================================
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonStats,
  skeletonVariants,
  type SkeletonProps,
} from './components/skeleton'

// ============================================================================
// Dropdown Menu
// ============================================================================
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './components/dropdown-menu'

// ============================================================================
// Table
// ============================================================================
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  SortableHeader,
  TableEmpty,
  TablePagination,
  ColumnVisibility,
  TableCheckbox,
  BulkActionBar,
  TableToolbar,
  type SortDirection,
  type SortableHeaderProps,
  type TableEmptyProps,
  type TablePaginationProps,
  type ColumnVisibilityProps,
  type TableCheckboxProps,
  type BulkActionBarProps,
  type TableToolbarProps,
} from './components/table'

// ============================================================================
// Tooltip
// ============================================================================
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  SimpleTooltip,
  InfoTooltip,
  TruncatedText,
  type SimpleTooltipProps,
  type InfoTooltipProps,
  type TruncatedTextProps,
} from './components/tooltip'

// ============================================================================
// Breadcrumb
// ============================================================================
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  SimpleBreadcrumbs,
  type BreadcrumbItemData,
  type SimpleBreadcrumbsProps,
} from './components/breadcrumb'

// ============================================================================
// Layout Components
// ============================================================================
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
  useTenantOptional,
} from './context/tenant-context'

export type { TenantContextValue, TenantInfo } from './context/tenant-context'

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
