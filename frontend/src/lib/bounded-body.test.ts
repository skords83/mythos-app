/** @jest-environment node */
import { boundedBody } from './bounded-body'
test('bounds bytes rather than characters', async () => {
  await expect(boundedBody(new Request('http://localhost', { method: 'POST', body: 'ä'.repeat(10) }), 15)).rejects.toThrow('body_limit')
})
test('reads a chunked body up to the maximum', async () => {
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('hello')); controller.enqueue(new TextEncoder().encode('world')); controller.close() } })
  const request = new Request('http://localhost', { method: 'POST', body: stream, duplex: 'half' } as RequestInit)
  await expect(boundedBody(request, 10)).resolves.toBe('helloworld')
})
test('rejects a declared oversized body before consuming it', async () => {
  const req = new Request('http://localhost', { method: 'POST', headers: { 'content-length': '100' }, body: 'small' })
  await expect(boundedBody(req, 10)).rejects.toThrow('body_limit')
  expect(req.bodyUsed).toBe(false)
})
