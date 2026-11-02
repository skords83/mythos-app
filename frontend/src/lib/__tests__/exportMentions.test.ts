import JSZip from 'jszip'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { CharacterMention } from '../tiptap/characterMentionExtension'
import { EntityMention } from '../tiptap/entityMentionExtension'
import { resolveMentionClick } from '../tiptap/mentionClick'
import { buildEpubArchive } from '../exportEpub'
import { parseHtmlToBlocks } from '../exportConvert'
import { loadProjectExportContent } from '../exportContent'

const html = '<p><strong><span data-character-mention="" data-character-id="c1" data-label="Fabian" class="editor">@Fabian</span></strong>, <em><span data-character-mention="" data-character-id="c2" data-label="Fräulein Müller">@Fräulein Müller</span></em>! <span data-entity-mention="" data-entity-kind="PLACE" data-entity-id="p1">@Köln am Rhein</span>; <span data-entity-mention="" data-entity-kind="ITEM" data-entity-id="i1" data-label="@Amulett">@@Amulett</span>.</p><p>mail@example.org @ bewusst @Fabian <a href="https://example.org/@name">Link</a><br>Ende&nbsp;.</p>'
const expected = 'Fabian, Fräulein Müller! Köln am Rhein; @Amulett.'
const originalFetch = global.fetch
afterEach(() => { global.fetch = originalFetch })

test.each([false, true])('exports stored HTML (object wrapper: %s) as clean XHTML in a real ZIP', async wrapped => {
  const stored = wrapped ? { content: html } : html
  const before = JSON.stringify(stored)
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ chapters: [{ id: 'c', order: 1 }], pagination: { totalPages: 1 } }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ title: 'Kapitel', content: stored }) })
  const archive = await buildEpubArchive('Test', await loadProjectExportContent('test'))
  const bytes = await archive.generateAsync({ type: 'uint8array' })
  const reopened = await JSZip.loadAsync(bytes)
  const xhtml = await reopened.file('OEBPS/content.xhtml')!.async('string')
  const doc = new DOMParser().parseFromString(xhtml, 'application/xml')
  expect(doc.querySelector('parsererror')).toBeNull()
  expect(doc.querySelector('p')!.textContent).toBe(expected)
  expect(doc.querySelector('strong')!.textContent).toBe('Fabian')
  expect(doc.querySelector('em')!.textContent).toBe('Fräulein Müller')
  expect(doc.querySelectorAll('p')[1].textContent).toBe('mail@example.org @ bewusst @Fabian LinkEnde\u00a0.')
  expect(doc.querySelector('a')!.getAttribute('href')).toBe('https://example.org/@name')
  expect(doc.querySelector('br')).not.toBeNull()
  expect(xhtml).not.toMatch(/data-character|data-entity|data-label|class="editor"/)
  expect(JSON.stringify(stored)).toBe(before)
  if (process.env.EPUB_TEST_ARTIFACT && !wrapped) require('node:fs').writeFileSync(process.env.EPUB_TEST_ARTIFACT, bytes)
})

test('shared text exporters receive readable names', () => {
  expect(parseHtmlToBlocks(html)[0].runs.map(r => r.text).join('')).toBe(expected)
})

test('export leaves live editor nodes, saved HTML and click targets intact', async () => {
  const editor = new Editor({ extensions: [StarterKit, CharacterMention, EntityMention], content: html })
  try {
    const before = editor.getHTML()
    await buildEpubArchive('Test', before)
    expect(editor.getHTML()).toBe(before)
    const targets: string[] = []
    editor.state.doc.descendants(node => {
      const result = resolveMentionClick(node, new MouseEvent('click'))
      if (result) targets.push(`${result.kind}:${result.id}`)
    })
    expect(targets).toEqual(['CHARACTER:c1', 'CHARACTER:c2', 'PLACE:p1', 'ITEM:i1'])
    expect(before).toContain('@Fräulein Müller')
  } finally { editor.destroy() }
})
