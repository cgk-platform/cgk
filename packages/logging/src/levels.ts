/**
 * Log levels
 */

export enum LogLevel {
  TRACE = 10,
  DEBUG = 20,
  INFO = 30,
  WARN = 40,
  ERROR = 50,
  FATAL = 60,
}

export type LogLevelName = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export function levelToName(level: LogLevel): LogLevelName {
  switch (level) {
    case LogLevel.TRACE:
      return 'trace'
    case LogLevel.DEBUG:
      return 'debug'
    case LogLevel.INFO:
      return 'info'
    case LogLevel.WARN:
      return 'warn'
    case LogLevel.ERROR:
      return 'error'
    case LogLevel.FATAL:
      return 'fatal'
    default:
      return 'info'
  }
}

export function nameToLevel(name: LogLevelName): LogLevel {
  switch (name) {
    case 'trace':
      return LogLevel.TRACE
    case 'debug':
      return LogLevel.DEBUG
    case 'info':
      return LogLevel.INFO
    case 'warn':
      return LogLevel.WARN
    case 'error':
      return LogLevel.ERROR
    case 'fatal':
      return LogLevel.FATAL
    default:
      return LogLevel.INFO
  }
}

export function shouldLog(messageLevel: LogLevel, minLevel: LogLevel): boolean {
  return messageLevel >= minLevel
}
