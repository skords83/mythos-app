/** @jest-environment node */
import { checkRateLimit } from './rateLimit'
jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({ on: jest.fn(), eval: jest.fn().mockRejectedValue(new Error('offline')) })))
test('OAuth/MCP fail closed without exposing the backend error', async () => {
  const result = await checkRateLimit('test', 'oauth:test', { limit: 10, windowMs: 60000, failClosed: true })
  expect(result?.status).toBe(503)
  expect(await result?.json()).toEqual({ error: 'temporarily_unavailable' })
  expect(result?.headers.get('retry-after')).toBe('5')
})
test('existing application routes retain the default fail-open policy', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  try { expect(await checkRateLimit('test', 'app:test', { limit: 10, windowMs: 60000 })).toBeNull() }
  finally { log.mockRestore() }
})
