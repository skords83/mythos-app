import { bulkNameLinks, chapterHtml, replaceChapterHtml } from '../bulkNameLinks'
import { recognizeNames, type NameCandidate } from '../nameRecognition'
const candidates: NameCandidate[] = [
  { id: 'f', name: 'Fabian', kind: 'CHARACTER', label: 'Fabian' },
  { id: 'f', name: 'Fabi', kind: 'CHARACTER', label: 'Fabian' },
  { id: 'b', name: 'Berlin', kind: 'PLACE' },
]
const kinds = ['CHARACTER', 'PLACE']
test('links every occurrence beyond the decoration limit, aliases and case variants', () => {
  const result = bulkNameLinks(`<p>${'Fabian '.repeat(45)}Fabi fabian Berlin</p>`, candidates, kinds)
  expect(result.added).toBe(48)
  expect(result.groups).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'CHARACTER:f', count: 47 })]))
  expect(result.content).toContain('data-label="fabian">@fabian')
})
test('retains word boundaries and does not invent inflected name matches', () => {
  expect(recognizeNames('Fabians SuperFabian Fabian_ Fabian2 (Fabian)!', candidates)).toHaveLength(1)
  const result = bulkNameLinks('<p>Fabians Hut</p>', [...candidates, { ...candidates[0], name: 'Fabians' }], kinds)
  expect(result.content).toContain('data-label="Fabians">@Fabians')
})
test('excludes collisions across names, aliases and deselected kinds', () => {
  const result = bulkNameLinks('<p>Fabi Fabian Berlin</p>', [...candidates, { id: 'other', name: 'Fabi', kind: 'PLACE' }], ['CHARACTER'])
  expect(result.added).toBe(1)
  expect(result.ambiguous[0]).toMatchObject({ text: 'Fabi', count: 1 })
  expect(result.content).toContain('<p>Fabi ')
})
test('overlapping names belonging to different entities are ambiguous', () => {
  const result = bulkNameLinks('<p>Berlin Mitte</p>', [...candidates, { id: 'bm', name: 'Berlin Mitte', kind: 'PLACE' }], kinds)
  expect(result.added).toBe(0)
  expect(result.ambiguous[0].candidates).toHaveLength(2)
})
test('duplicate aliases of the same entity remain unique', () => {
  expect(bulkNameLinks('<p>Fabian</p>', [...candidates, candidates[0]], kinds).added).toBe(1)
})
test('preserves formatting, comments, punctuation, images and existing links; repeat is a no-op', () => {
  const before = '<h2 data-custom="yes"><strong>Fabian!</strong></h2><p><em>Fabi</em> &amp; Berlin.</p><hr><p><span data-comment-id="c">Fabian</span><img src="/a.png"><span data-character-mention="" data-character-id="f" data-label="Fabian">@Fabian</span></p>'
  const result = bulkNameLinks(before, candidates, kinds)
  expect(result.added).toBe(4)
  expect(result.content).toContain('<h2 data-custom="yes"><strong><span')
  expect(result.content).toContain('</span>!</strong></h2>')
  expect(result.content).toContain('<span data-comment-id="c"><span')
  expect(result.content).toContain('<img src="/a.png"><span data-character-mention="" data-character-id="f" data-label="Fabian">@Fabian</span>')
  expect(bulkNameLinks(result.content, candidates, kinds)).toMatchObject({ added: 0, content: result.content })
})
test('selection excludes entire groups and preview counts match application', () => {
  const html = '<p>Fabian Fabi Berlin</p>'
  const preview = bulkNameLinks(html, candidates, kinds)
  const applied = bulkNameLinks(html, candidates, kinds, ['CHARACTER:f'])
  expect(applied.added).toBe(preview.groups.find(g => g.key === 'CHARACTER:f')!.count)
  expect(applied.skipped).toBe(1)
  expect(applied.content).toContain(' Berlin</p>')
})
test('preserves content wrappers and refuses unknown formats', () => {
  expect(chapterHtml({ content: '<p>x</p>', other: 1 })).toBe('<p>x</p>')
  expect(replaceChapterHtml({ content: 'old', other: 1 }, 'new')).toEqual({ content: 'new', other: 1 })
  expect(() => chapterHtml({ type: 'doc' })).toThrow()
})
