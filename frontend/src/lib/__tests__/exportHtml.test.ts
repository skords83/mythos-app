import { parseExportHtml } from '../exportHtml'

test('uses the editor display label without looking up or replacing aliases', () => {
  const doc = parseExportHtml('<p><span data-character-mention="" data-character-id="canonical-id" data-label="Die Königin &amp; Ärztin">@Die Königin &amp; Ärztin</span>?</p>')
  expect(doc.body.innerHTML).toBe('<p>Die Königin &amp; Ärztin?</p>')
})

test('keeps plain legacy content, unrelated spans, whitespace and regular links', () => {
  const html = '<p>  Fabian, <span>@Müller</span>! mail@example.org @ <a href="mailto:a@example.org">a@example.org</a></p><p>Ende</p>'
  expect(parseExportHtml(html).body.innerHTML).toBe(html)
})

test('removes editor attributes and is safe to apply repeatedly, including literal @ in names', () => {
  const html = '<p><span data-character-mention="" data-label="@Name" data-character-id="c" contenteditable="false" class="editor" style="color:red">@@Name</span></p>'
  const clean = parseExportHtml(html).body.innerHTML
  expect(clean).toBe('<p>@Name</p>')
  expect(parseExportHtml(clean).body.innerHTML).toBe(clean)
})
