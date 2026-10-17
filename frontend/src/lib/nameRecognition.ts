// Shared by passive editor decorations and bulk linking. Keep the existing
// minimum length, Unicode word boundaries and exact name/alias forms.
export type NameKind = 'CHARACTER' | 'PLACE' | 'ITEM'
export interface NameCandidate { id: string; name: string; kind: NameKind; label?: string }
export const candidateKey = (c: NameCandidate) => `${c.kind}:${c.id}`
export interface NameMatch { from: number; to: number; candidates: NameCandidate[] }
export function recognizeNames(text: string, candidates: NameCandidate[]): NameMatch[] {
  const hits: NameMatch[] = []
  const ranges = new Map<string, NameMatch>()
  for (const candidate of candidates) {
    if (candidate.name.trim().length < 3) continue
    const escaped = candidate.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'giu')
    for (const match of Array.from(text.matchAll(re))) {
      const from = match.index!, to = from + match[0].length
      const key = `${from}:${to}`
      const existing = ranges.get(key)
      if (existing) {
        if (!existing.candidates.some(c => candidateKey(c) === candidateKey(candidate))) existing.candidates.push(candidate)
      } else {
        const hit = { from, to, candidates: [candidate] }
        hits.push(hit)
        ranges.set(key, hit)
      }
    }
  }
  // Connected overlapping ranges are ambiguous if they refer to different
  // entities, including aliases and entities outside the selected type filter.
  const groups: (NameMatch & { best: { from: number; to: number } })[] = []
  for (const hit of hits.sort((a, b) => a.from - b.from || b.to - a.to)) {
    const previous = groups[groups.length - 1]
    if (previous && hit.from < previous.to) {
      previous.to = Math.max(previous.to, hit.to)
      if (hit.to - hit.from > previous.best.to - previous.best.from) previous.best = { from: hit.from, to: hit.to }
      for (const c of hit.candidates) if (!previous.candidates.some(p => candidateKey(p) === candidateKey(c))) previous.candidates.push(c)
    } else groups.push({ ...hit, candidates: [...hit.candidates], best: { from: hit.from, to: hit.to } })
  }
  return groups.map(({ best, ...group }) => group.candidates.length === 1 ? { ...group, ...best } : group)
}

export function mentionAttributes(candidate: NameCandidate, label: string) {
  return candidate.kind === 'CHARACTER'
    ? { characterId: candidate.id, label }
    : { kind: candidate.kind, entityId: candidate.id, label }
}
