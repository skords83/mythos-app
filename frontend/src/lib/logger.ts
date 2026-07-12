import pino from 'pino'
import * as Sentry from '@sentry/nextjs'

const REDACT_KEYS = new Set(['password', 'token', 'authorization', 'jwt'])

function redact(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return context
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(context)) {
    result[key] = REDACT_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : value
  }
  return result
}

const pinoLogger = pino({ level: process.env.LOG_LEVEL || 'info' })

export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    pinoLogger.info(redact(context), message)
  },
  warn(message: string, context?: Record<string, unknown>): void {
    pinoLogger.warn(redact(context), message)
  },
  error(error: unknown, context?: Record<string, unknown>): void {
    const safeContext = redact(context)
    const message = error instanceof Error ? error.message : String(error)
    pinoLogger.error({ ...safeContext, err: error }, message)
    Sentry.captureException(error, { extra: safeContext })
  },
}
