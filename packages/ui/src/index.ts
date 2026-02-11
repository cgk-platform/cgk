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
export { Textarea, type TextareaProps } from './components/textarea'

// Feedback components
export { Alert, AlertTitle, AlertDescription, alertVariants, type AlertProps } from './components/alert'
export { Badge, badgeVariants, type BadgeProps } from './components/badge'
export { Spinner, spinnerVariants, type SpinnerProps } from './components/spinner'

// Layout components
export { Container, type ContainerProps } from './components/container'

// Types
export type { VariantProps } from 'class-variance-authority'
