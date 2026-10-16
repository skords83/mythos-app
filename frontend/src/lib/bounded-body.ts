/** Bound bytes while reading, including chunked bodies without Content-Length. */
export async function boundedBody(request: Request, maximum: number): Promise<string> {
  if (Number(request.headers.get('content-length')) > maximum) throw new Error('body_limit')
  const reader = request.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maximum) { await reader.cancel(); throw new Error('body_limit') }
      chunks.push(value)
    }
    return Buffer.concat(chunks).toString('utf8')
  } finally { reader.releaseLock() }
}
