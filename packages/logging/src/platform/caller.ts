/**
 * Caller location extraction from stack trace
 */

import type { CallerLocation } from './types.js'

/**
 * Extract caller location from Error stack trace
 *
 * Parses V8-style stack traces to find the call site outside this library.
 */
export function getCallerLocation(): CallerLocation | null {
  // Create an error to capture stack trace
  const stackError = new Error()
  const stack = stackError.stack

  if (!stack) {
    return null
  }

  const lines = stack.split('\n')

  // Find the first stack frame outside the logging package
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Skip frames from this logging package
    if (
      line.includes('/packages/logging/') ||
      line.includes('@cgk-platform/logging') ||
      line.includes('PlatformLogger') ||
      line.includes('getCallerLocation')
    ) {
      continue
    }

    // Parse the stack frame
    const parsed = parseStackFrame(line)
    if (parsed) {
      return parsed
    }
  }

  return null
}

/**
 * Parse a single stack frame line
 *
 * Handles V8-style formats:
 * - "    at FunctionName (/path/to/file.ts:10:5)"
 * - "    at /path/to/file.ts:10:5"
 * - "    at Object.<anonymous> (/path/to/file.ts:10:5)"
 */
function parseStackFrame(line: string): CallerLocation | null {
  // Pattern for V8-style stack traces
  const v8Pattern = /^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+)(?::\d+)?\)?$/

  const match = line.match(v8Pattern)
  if (!match) {
    return null
  }

  const functionName = match[1]
  const filePath = match[2]
  const lineNumber = match[3]

  if (!filePath || !lineNumber) {
    return null
  }

  // Clean up file path - remove webpack/bundler noise
  let cleanPath = filePath
  if (cleanPath.includes('webpack:')) {
    cleanPath = cleanPath.replace(/^webpack:[^/]*\//, '')
  }

  // Clean up function name
  let cleanFunctionName = functionName ?? null
  if (cleanFunctionName) {
    // Remove Object. prefix and <anonymous> suffix
    cleanFunctionName = cleanFunctionName
      .replace(/^Object\./, '')
      .replace(/\.<anonymous>$/, '')
      .replace(/^Module\./, '')

    // If it's just "anonymous" or empty after cleanup, set to null
    if (cleanFunctionName === 'anonymous' || cleanFunctionName === '') {
      cleanFunctionName = null
    }
  }

  return {
    file: cleanPath,
    line: parseInt(lineNumber, 10),
    functionName: cleanFunctionName,
  }
}

/**
 * Extract file name from full path
 */
export function getFileName(filePath: string): string {
  const parts = filePath.split('/')
  return parts[parts.length - 1] ?? filePath
}

/**
 * Make a relative path from the project root
 */
export function makeRelativePath(filePath: string): string {
  // Common project root markers
  const rootMarkers = ['/src/', '/app/', '/apps/', '/packages/', '/lib/']

  for (const marker of rootMarkers) {
    const idx = filePath.indexOf(marker)
    if (idx !== -1) {
      return filePath.slice(idx + 1) // Remove leading slash
    }
  }

  // Fall back to filename only
  return getFileName(filePath)
}
