/**
 * @cgk-platform/core - Core utilities, types, and configuration schemas
 *
 * @ai-pattern core-package
 * @ai-required This package is required by all other @cgk packages
 */

// Configuration
export { defineConfig, type PlatformConfig } from './config'
export { validateConfig } from './config-validator'

// Types
export type {
  TenantContext,
  TenantId,
  UserId,
  OrganizationId,
} from './types/tenant'

export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  PaginationParams,
} from './types/api'

// Utilities
export { invariant } from './utils/invariant'
export { createId } from './utils/id'
export {
  validateRequiredEnv,
  validateEnv,
  validateAppEnv,
  isEnvSet,
  getEnvOrDefault,
  getRequiredEnv,
  APP_ENV_CONFIGS,
  type EnvValidationResult,
  type AppName,
} from './utils/env'
export {
  fetchWithTimeout,
  createFetchWithTimeout,
  FETCH_TIMEOUTS,
  type TimeoutType,
} from './utils/fetch'
