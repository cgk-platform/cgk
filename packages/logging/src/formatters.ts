/**
 * Log formatters
 */

import type { LogEntry } from './types'

export type LogFormatter = (entry: LogEntry) => string

/**
 * JSON formatter - outputs single-line JSON
 */
export const jsonFormatter: LogFormatter = (entry) => {
  return JSON.stringify(entry)
}

/**
 * Pretty formatter - human-readable output for development
 */
export const prettyFormatter: LogFormatter = (entry) => {
  const levelColors: Record<string, string> = {
    trace: '\x1b[90m', // gray
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m', // green
    warn: '\x1b[33m', // yellow
    error: '\x1b[31m', // red
    fatal: '\x1b[35m', // magenta
  }

  const reset = '\x1b[0m'
  const color = levelColors[entry.level] ?? ''

  const timestamp = entry.timestamp.substring(11, 23) // HH:MM:SS.mmm
  const level = entry.level.toUpperCase().padEnd(5)

  let output = `${color}${timestamp} ${level}${reset} ${entry.message}`

  if (entry.context && Object.keys(entry.context).length > 0) {
    output += ` ${JSON.stringify(entry.context)}`
  }

  if (entry.error) {
    output += `\n${color}  Error: ${entry.error.message}${reset}`
    if (entry.error.stack) {
      output += `\n${entry.error.stack.split('\n').slice(1).join('\n')}`
    }
  }

  return output
}

/**
 * Create a custom formatter
 */
export function createFormatter(
  format: (entry: LogEntry) => string
): LogFormatter {
  return format
}
