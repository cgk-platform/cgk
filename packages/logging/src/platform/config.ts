/**
 * PlatformLogger configuration per environment
 */

import type { LogLevelName } from '../levels.js'
import type { PlatformLoggerConfig } from './types.js'

/** Default configuration by environment */
const DEFAULT_CONFIG: Record<string, Partial<PlatformLoggerConfig>> = {
  development: {
    level: 'debug',
    enableConsole: true,
    bufferSize: 10, // Smaller buffer for dev
    flushIntervalMs: 2000,
  },
  test: {
    level: 'warn',
    enableConsole: false, // Suppress in tests
    bufferSize: 100,
    flushIntervalMs: 10000,
  },
  staging: {
    level: 'debug',
    enableConsole: false,
    bufferSize: 50,
    flushIntervalMs: 5000,
  },
  production: {
    level: 'info',
    enableConsole: false,
    bufferSize: 50,
    flushIntervalMs: 5000,
  },
}

interface DefaultConfig {
  level: LogLevelName
  environment: string
  version: string | null
  region: string | null
  enableConsole: boolean
  bufferSize: number
  flushIntervalMs: number
}

const PRODUCTION_DEFAULTS: DefaultConfig = {
  level: 'info',
  environment: 'production',
  version: null,
  region: null,
  enableConsole: false,
  bufferSize: 50,
  flushIntervalMs: 5000,
}

/** Get minimum log level for storage */
export function getStorageMinLevel(environment: string): LogLevelName {
  // In production/staging, don't store debug/trace
  if (environment === 'production' || environment === 'staging') {
    return 'info'
  }
  return 'debug'
}

/** Check if log level should be stored */
export function shouldStoreLevel(level: LogLevelName, environment: string): boolean {
  const minLevel = getStorageMinLevel(environment)
  const levelOrder: LogLevelName[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
  return levelOrder.indexOf(level) >= levelOrder.indexOf(minLevel)
}

/** Merge user config with environment defaults */
export function mergeConfig(
  userConfig: PlatformLoggerConfig,
  environment: string
): Required<PlatformLoggerConfig> {
  const envDefaults = DEFAULT_CONFIG[environment] ?? PRODUCTION_DEFAULTS

  return {
    service: userConfig.service,
    level: userConfig.level ?? envDefaults.level ?? PRODUCTION_DEFAULTS.level,
    environment: userConfig.environment ?? environment,
    version: userConfig.version ?? process.env.APP_VERSION ?? null,
    region: userConfig.region ?? process.env.VERCEL_REGION ?? null,
    enableConsole:
      userConfig.enableConsole ?? envDefaults.enableConsole ?? PRODUCTION_DEFAULTS.enableConsole,
    bufferSize: userConfig.bufferSize ?? envDefaults.bufferSize ?? PRODUCTION_DEFAULTS.bufferSize,
    flushIntervalMs:
      userConfig.flushIntervalMs ??
      envDefaults.flushIntervalMs ??
      PRODUCTION_DEFAULTS.flushIntervalMs,
  }
}

/** Get current environment */
export function getEnvironment(): string {
  return process.env.NODE_ENV ?? 'development'
}
