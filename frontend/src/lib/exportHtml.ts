/** Parse an export-only copy; never change the editor or persisted chapter HTML. */
export function parseExportHtml(html: string): Document {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  // These are the two atom nodes serialized by Mythos' Tiptap extensions and
  // bulk name linking. Plain @text has no reliable identity and stays untouched.
  for (const mention of Array.from(doc.body.querySelectorAll('span[data-character-mention], span[data-entity-mention]'))) {
    // Match the editor's label parsing, including aliases and legacy spans that
    // lack data-label. A literal @ inside the label must remain intact.
    const label = mention.getAttribute('data-label') ?? (mention.textContent ?? '').replace(/^@/, '')
    mention.replaceWith(doc.createTextNode(label))
  }
  return doc
}
