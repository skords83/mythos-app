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

test.each([true, false])('chapter navigation remains complete (visible TOC: %s)', async includeTableOfContents => {
  const chapters = [
    { title: 'Ä & <Anfang> "eins"', content: '<p>Erster Text</p>' },
    { title: 'Gleich', content: '<h2>Keine neue Kapitelgrenze</h2><p>Zweiter Text</p>' },
    { title: 'Gleich', content: '<p><span data-character-mention="" data-label="Jörg">@Jörg</span></p>' },
  ]
  const before = JSON.stringify(chapters)
  const archive = await buildEpubArchive('Buchtitel', chapters, null, { includeTableOfContents })
  const bytes = await archive.generateAsync({ type: 'uint8array' })
  const zip = await (await import('jszip')).default.loadAsync(bytes)
  const opf = parseXml(await zip.file('OEBPS/content.opf')!.async('string'))
  expect(opf.documentElement.getAttribute('version')).toBe('2.0')
  const ncx = parseXml(await zip.file('OEBPS/toc.ncx')!.async('string'))
  const targets = Array.from(ncx.querySelectorAll('navPoint content')).map(node => node.getAttribute('src')!)
  expect(Array.from(ncx.querySelectorAll('navLabel text')).map(node => node.textContent)).toEqual(chapters.map(c => c.title))
  expect(new Set(targets).size).toBe(3)
  const spine = Array.from(opf.querySelectorAll('itemref')).map(node => node.getAttribute('idref'))
  expect(spine).toEqual([...(includeTableOfContents ? ['toc'] : []), 'chapter-1', 'chapter-2', 'chapter-3'])
  for (const [index, target] of targets.entries()) {
    const [file, id] = target.split('#')
    const doc = parseXml(await zip.file(`OEBPS/${file}`)!.async('string'))
    expect(doc.getElementById(id)?.textContent).toBe(chapters[index].title)
    expect(opf.querySelector(`item[id="chapter-${index + 1}"]`)?.getAttribute('href')).toBe(file)
  }
  expect(zip.file('OEBPS/toc.xhtml') !== null).toBe(includeTableOfContents)
  expect(opf.querySelector('reference[type="toc"]') !== null).toBe(includeTableOfContents)
  if (includeTableOfContents) {
    const toc = parseXml(await zip.file('OEBPS/toc.xhtml')!.async('string'))
    expect(Array.from(toc.querySelectorAll('a')).map(a => a.getAttribute('href'))).toEqual(targets)
  }
  expect(await zip.file('OEBPS/chapter-3.xhtml')!.async('string')).toContain('<p xmlns="http://www.w3.org/1999/xhtml">Jörg</p>')
  expect(JSON.stringify(chapters)).toBe(before)
  if (process.env.EPUB_NAV_ARTIFACT_DIR) require('node:fs').writeFileSync(`${process.env.EPUB_NAV_ARTIFACT_DIR}/mythos-toc-${includeTableOfContents}.epub`, bytes)
})

test.each([true, false])('one chapter works and an empty project fails clearly (TOC: %s)', async includeTableOfContents => {
  const zip = await buildEpubArchive('Buch', [{ title: 'Leer', content: '' }], null, { includeTableOfContents })
  const ncx = parseXml(await zip.file('OEBPS/toc.ncx')!.async('string'))
  expect(ncx.querySelectorAll('navPoint')).toHaveLength(1)
  await expect(buildEpubArchive('Buch', [], null, { includeTableOfContents })).rejects.toThrow('keine Kapitel')
})
