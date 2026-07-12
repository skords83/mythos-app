export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
    if (!process.env.SENTRY_DSN) {
      const { logger } = await import('./lib/logger')
      logger.warn('SENTRY_DSN not set — error tracking disabled')
    }
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}
