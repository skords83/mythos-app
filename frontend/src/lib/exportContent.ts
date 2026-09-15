import type { Chapter } from '@/app/components/types'
import { extractContent } from '@/app/hooks/useChapters'
import { escapeXml } from './exportEpub'

// The sidebar list deliberately omits content. Export must load every page and
// every chapter, independently of which chapters were opened in the editor.
export async function loadProjectExportContent(
  projectId: string,
  currentChapter?: { id: string; title: string; content: string },
): Promise<string> {
  const chapters: Chapter[] = []
  let page = 1
  let totalPages = 1
  do {
    const response = await fetch(`/api/chapters?projectId=${encodeURIComponent(projectId)}&limit=200&page=${page}`, { cache: 'no-store' })
    if (!response.ok) throw new Error('Die Kapitelliste konnte nicht für den Export geladen werden.')
    const data = await response.json()
    if (!Array.isArray(data.chapters) || !Number.isInteger(data.pagination?.totalPages)) {
      throw new Error('Die Kapitelliste für den Export ist unvollständig.')
    }
    chapters.push(...data.chapters)
    totalPages = data.pagination.totalPages
    page++
  } while (page <= totalPages)

  const parts: string[] = []
  for (const chapter of chapters.sort((a, b) => a.order - b.order)) {
    let full: Pick<Chapter, 'title' | 'content'>
    if (currentChapter?.id === chapter.id) {
      full = currentChapter
    } else {
      const response = await fetch(`/api/chapters/${encodeURIComponent(chapter.id)}`, { cache: 'no-store' })
      if (!response.ok) throw new Error(`Kapitel „${chapter.title}“ konnte nicht für den Export geladen werden.`)
      full = await response.json()
      if (!Object.prototype.hasOwnProperty.call(full, 'content')) {
        throw new Error(`Der Inhalt von Kapitel „${chapter.title}“ fehlt beim Export.`)
      }
    }
    parts.push(`<h2>${escapeXml(full.title)}</h2>${extractContent(full.content)}`)
  }
  return parts.join('<br/><br/>')
}
