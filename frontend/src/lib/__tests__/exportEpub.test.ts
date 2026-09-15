import { buildEpubArchive } from '../exportEpub'

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
const originalFetch = global.fetch
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    blob: async () => ({ type: 'image/png', arrayBuffer: async () => png.buffer }),
  })
})
afterEach(() => { global.fetch = originalFetch })
function parseXml(xml: string) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  expect(doc.querySelector('parsererror')).toBeNull()
  return doc
}

test('embeds uploaded and inline images and preserves text after HTML void elements', async () => {
  const zip = await buildEpubArchive('Trolle & Süden <3', `<p>Vorher&nbsp;<img src='/api/upload/a.png' alt='A & B'><br>Nachher</p><img src="/api/upload/a.png"><img src="data:image/png;base64,iVBORw0KGgo="><hr><p>Ende</p>`, '/api/upload/cover.png')
  const content = parseXml(await zip.file('OEBPS/content.xhtml')!.async('string'))
  expect(content.documentElement.textContent).toContain('Nachher')
  expect(content.documentElement.textContent).toContain('Ende')
  expect(content.querySelector('title')!.textContent).toBe('Trolle & Süden <3')
  const manifest = parseXml(await zip.file('OEBPS/content.opf')!.async('string'))
  parseXml(await zip.file('OEBPS/toc.ncx')!.async('string'))
  for (const img of Array.from(content.querySelectorAll('img'))) {
    const path = img.getAttribute('src')!
    expect(zip.file(`OEBPS/${path}`)).not.toBeNull()
    expect(Array.from(manifest.querySelectorAll('item')).some(item => item.getAttribute('href') === path)).toBe(true)
    expect(await zip.file(`OEBPS/${path}`)!.async('uint8array')).toEqual(png)
  }
  expect(global.fetch).toHaveBeenCalledTimes(3)
  const bytes = await zip.generateAsync({ type: 'uint8array' })
  expect(String.fromCharCode(...Array.from(bytes.slice(30, 38)))).toBe('mimetype')
  expect(bytes[8]).toBe(0)
})

test('fails explicitly if an image cannot be loaded', async () => {
  jest.mocked(global.fetch).mockResolvedValue({ ok: false, status: 404 } as Response)
  await expect(buildEpubArchive('Titel', '<p>Anfang<img src="/api/upload/missing.png">Ende</p>')).rejects.toThrow('Ein Bild konnte nicht')
})

test('exports text-only content as valid XHTML', async () => {
  const zip = await buildEpubArchive('Titel', '<p>Text&nbsp;&amp; mehr<br>Ende</p>')
  parseXml(await zip.file('OEBPS/content.xhtml')!.async('string'))
  expect(global.fetch).not.toHaveBeenCalled()
})
