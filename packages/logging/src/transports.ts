/**
 * Log transports
 */

import { LogLevel } from './levels'

export type LogTransport = (level: LogLevel, message: string) => void

/**
 * Console transport - outputs to stdout/stderr
 */
export const consoleTransport: LogTransport = (level, message) => {
  if (level >= LogLevel.ERROR) {
    console.error(message)
  } else {
    console.log(message)
  }
}

/**
 * Create a transport that writes to a stream
 */
export function createStreamTransport(
  stdout: NodeJS.WritableStream,
  stderr: NodeJS.WritableStream
): LogTransport {
  return (level, message) => {
    const stream = level >= LogLevel.ERROR ? stderr : stdout
    stream.write(message + '\n')
  }
}

/**
 * Create a transport that batches logs
 */
export function createBatchTransport(
  flush: (logs: string[]) => Promise<void>,
  options: { maxBatchSize?: number; flushInterval?: number } = {}
): LogTransport {
  const { maxBatchSize = 100, flushInterval = 5000 } = options
  const buffer: string[] = []
  let timer: NodeJS.Timer | null = null

  async function doFlush(): Promise<void> {
    if (buffer.length === 0) return

    const logs = buffer.splice(0, buffer.length)
    try {
      await flush(logs)
    } catch (error) {
      console.error('Failed to flush logs:', error)
      // Re-add failed logs to buffer
      buffer.unshift(...logs)
    }
  }

  return (_level, message) => {
    buffer.push(message)

    if (buffer.length >= maxBatchSize) {
      doFlush()
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null
        doFlush()
      }, flushInterval)
    }
  }
}

/**
 * Create a multi-transport that sends to multiple destinations
 */
export function createMultiTransport(...transports: LogTransport[]): LogTransport {
  return (level, message) => {
    for (const transport of transports) {
      transport(level, message)
    }
  }
}
