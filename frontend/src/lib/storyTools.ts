import { htmlToText } from './text'

export function parseAliases(value: unknown): string[] | undefined | null {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.length > 30 || value.some(v => typeof v !== 'string' || v.trim().length > 100 || !v.trim())) return null
  return Array.from(new Set(value.map(v => v.trim())))
}
export function manuscriptText(content: unknown): string {
  if (typeof content === 'string') {
    try { return manuscriptText(JSON.parse(content)) } catch { return htmlToText(content) }
  }
  if (!content || typeof content !== 'object') return ''
  const node = content as { text?: string; html?: string; attrs?: { label?: string }; content?: unknown[] | string }
  if (node.html) return htmlToText(node.html)
  if (typeof node.content === 'string') return htmlToText(node.content)
  return node.text ?? node.attrs?.label ?? node.content?.map(manuscriptText).join(' ') ?? ''
}
export function occurrences(text: string, names: string[]) {
  const escaped = Array.from(new Set(names.filter(Boolean))).sort((a,b) => b.length-a.length).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!escaped.length) return []
  return Array.from(text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}_])(?:${escaped.join('|')})(?![\\p{L}\\p{N}_])`, 'giu'))).map(m => ({ offset: m.index!, text: m[0], snippet: `${m.index! > 60 ? '…' : ''}${text.slice(Math.max(0,m.index!-60),m.index!+m[0].length+60)}…` }))
}
const COMMON = new Set('Aber Alle Alles Als Also Am An Auch Auf Aus Bei Beim Bis Da Dabei Dann Das Dass Dein Deine Dem Den Denn Der Des Die Diese Dieser Dieses Doch Dort Du Durch Ein Eine Einem Einen Einer Eines Er Es Etwas Für Ganz Gegen Genau Hat Hatte Hier Ich Ihr Ihre Im In Ist Ja Jetzt Kein Keine Man Mein Meine Mich Mir Mit Nach Nicht Noch Nun Nur Ob Oder Ohne Schon Sehr Sein Seine Selbst Sich Sie Sind So Über Um Und Uns Unser Unter Vom Von Vor War Waren Was Wenn Wer Wie Wieder Wir Wird Wo Wurde Zu Zum Zur'.toLocaleLowerCase('de').split(' '))
export function discoverNames(texts: string[], known: string[]) {
  const excluded = new Set(known.flatMap(n => [n.toLocaleLowerCase('de'), ...n.toLocaleLowerCase('de').split(/\s+/)]))
  const counts = new Map<string, number>()
  for (const text of texts) for (const match of Array.from(text.matchAll(new RegExp('(?<![\\p{L}\\p{N}_])[\\p{Lu}][\\p{L}’-]{2,}(?![\\p{L}\\p{N}_])','gu')))) {
    const name = match[0], lower = name.toLocaleLowerCase('de')
    if (!COMMON.has(lower) && !excluded.has(lower)) counts.set(name,(counts.get(name) ?? 0)+1)
  }
  return Array.from(counts).filter(([,count]) => count >= 3).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,40).map(([name,count]) => ({name,count}))
}

// Preserve the identity of existing links even when an entity has been renamed.
export function mentionLabels(content: unknown): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  const add = (kind: string, id: string, label: string) => {
    if (kind && id && label) (result[`${kind}:${id}`] ??= []).push(label.replace(/^@/, ''))
  }
  const visit = (value: unknown) => {
    if (typeof value === 'string') {
      try { visit(JSON.parse(value)); return } catch { /* persisted HTML */ }
      for (const match of Array.from(value.matchAll(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi))) {
        const attr = (name: string) => new RegExp(`\\b${name}=["']([^"']*)["']`, 'i').exec(match[1])?.[1] ?? ''
        const characterId = attr('data-character-id')
        add(characterId ? 'CHARACTER' : attr('data-entity-kind'), characterId || attr('data-entity-id'), htmlToText(match[2]))
      }
      return
    }
    if (!value || typeof value !== 'object') return
    const node = value as { attrs?: { characterId?: string; entityId?: string; kind?: string; label?: string }; content?: unknown; html?: string }
    if (node.attrs?.label) add(node.attrs.characterId ? 'CHARACTER' : node.attrs.kind ?? '', node.attrs.characterId ?? node.attrs.entityId ?? '', node.attrs.label)
    if (Array.isArray(node.content)) node.content.forEach(visit)
    else if (typeof node.content === 'string') visit(node.content)
    if (node.html) visit(node.html)
  }
  visit(content)
  return result
}
