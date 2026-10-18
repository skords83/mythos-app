/** Partial chronology: never infer story time from book/chapter reading order. */
export type StoryAnchor = { projectId: string; chapterId?: string; sceneId?: string; eventId?: string }
export type TemporalOrder = 'BEFORE' | 'SAME' | 'AFTER' | 'UNKNOWN'
export function compareStoryAnchors(a: StoryAnchor, b: StoryAnchor, edges: { sourceId: string; targetId: string }[]): TemporalOrder {
  if (a.eventId && b.eventId) {
    if (a.eventId === b.eventId) return 'SAME'
    const reaches = (from: string, to: string) => {
      const seen = new Set<string>(), queue = [from]
      while (queue.length) { const id = queue.pop()!; if (id === to) return true; if (seen.has(id)) continue; seen.add(id); queue.push(...edges.filter(e => e.sourceId === id).map(e => e.targetId)) }
      return false
    }
    const forward = reaches(a.eventId, b.eventId), backward = reaches(b.eventId, a.eventId)
    return forward && backward ? 'UNKNOWN' : forward ? 'BEFORE' : backward ? 'AFTER' : 'UNKNOWN'
  }
  if (a.projectId === b.projectId && a.chapterId === b.chapterId && a.sceneId === b.sceneId && a.eventId === b.eventId) return 'SAME'
  return 'UNKNOWN'
}
export function validityAt(start: StoryAnchor, end: StoryAnchor | null, at: StoryAnchor, edges: {sourceId:string;targetId:string}[]) {
  const begins = compareStoryAnchors(start,at,edges), ends = end ? compareStoryAnchors(end,at,edges) : null
  if (begins === 'AFTER') return 'FUTURE'
  if (ends === 'BEFORE' || ends === 'SAME') return 'ENDED'
  if (begins === 'UNKNOWN' || ends === 'UNKNOWN') return 'UNKNOWN'
  return 'ACTIVE'
}
