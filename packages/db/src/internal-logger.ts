/**
 * Internal logger for the db package.
 *
 * Uses console.* instead of @cgk-platform/logging to avoid
 * a circular dependency (logging depends on db).
 */

const isDebug = process.env.DEBUG_SQL_LOGGING === 'true'

export const logger = {
  debug(msg: string, ctx?: object): void {
    if (isDebug) console.log(`[db] ${msg}`, ctx ? JSON.stringify(ctx) : '')
  },
  info(msg: string, ctx?: object): void {
    console.log(`[db] ${msg}`, ctx ? JSON.stringify(ctx) : '')
  },
  warn(msg: string, ctx?: object): void {
    console.warn(`[db] ${msg}`, ctx ? JSON.stringify(ctx) : '')
  },
  error(msg: string, err?: Error | unknown, ctx?: object): void {
    console.error(`[db] ${msg}`, err || '', ctx ? JSON.stringify(ctx) : '')
  },
}
