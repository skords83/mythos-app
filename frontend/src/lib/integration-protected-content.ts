/**
 * Conservatively protects Mythos-specific references and comment anchors.
 * False positives are acceptable; losing existing references is not.
 */
export function hasProtectedChapterContent(content: unknown): boolean {
  if (typeof content !== "string") return true

  return /data-(?:character-mention|entity-mention|comment-id)(?=[\s=/><])/i.test(content)
}
