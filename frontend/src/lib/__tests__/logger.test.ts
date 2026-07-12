jest.mock('pino', () => {
  const mockInstance = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  return jest.fn(() => mockInstance)
})

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import pino from 'pino'
import * as Sentry from '@sentry/nextjs'
import { logger } from '../logger'

const pinoInstance = (pino as unknown as jest.Mock)()

describe('logger', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('redacts password/token/authorization/jwt keys before logging', () => {
    logger.error(new Error('boom'), {
      userId: 'u1',
      password: 'hunter2',
      token: 'abc',
      authorization: 'Bearer xyz',
      jwt: 'header.payload.sig',
    })

    const [payload] = pinoInstance.error.mock.calls[0]
    expect(payload.userId).toBe('u1')
    expect(payload.password).toBe('[REDACTED]')
    expect(payload.token).toBe('[REDACTED]')
    expect(payload.authorization).toBe('[REDACTED]')
    expect(payload.jwt).toBe('[REDACTED]')
  })

  it('logs errors as JSON via pino and forwards them to Sentry with redacted context', () => {
    const err = new Error('db down')
    logger.error(err, { route: 'GET /api/projects', password: 'secret' })

    expect(pinoInstance.error).toHaveBeenCalledTimes(1)
    const [payload, message] = pinoInstance.error.mock.calls[0]
    expect(payload.err).toBe(err)
    expect(message).toBe('db down')

    expect(Sentry.captureException).toHaveBeenCalledWith(err, {
      extra: { route: 'GET /api/projects', password: '[REDACTED]' },
    })
  })

  it('info and warn do not call Sentry', () => {
    logger.info('starting up', { port: 4000 })
    logger.warn('rate limited', { ip: '1.2.3.4' })

    expect(pinoInstance.info).toHaveBeenCalledWith({ port: 4000 }, 'starting up')
    expect(pinoInstance.warn).toHaveBeenCalledWith({ ip: '1.2.3.4' }, 'rate limited')
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('handles missing context', () => {
    logger.error(new Error('no context'))
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      { extra: undefined }
    )
  })
})
