import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Chapter, Project } from '../components/types'
import { stripHtml } from '@/lib/text'
import { saveDraft, getDraft, deleteDraft, ChapterDraft } from '@/lib/chapterDraftStore'

interface UseChaptersArgs {
  selectedProject: Project | null
  showError: (message: string) => void
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void
  onConfirmed: () => void
}

export function extractContent(content: any): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (typeof content === 'object' && typeof content.content === 'string') return content.content
  return ''
}

export function useChapters({ selectedProject, showError, requestConfirm, onConfirmed }: UseChaptersArgs) {
  const router = useRouter()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [pendingDraft, setPendingDraft] = useState<ChapterDraft | null>(null)

  // Refs to always have current values in callbacks (stale closure fix)
  const editorContentRef = useRef(editorContent)
  const selectedChapterRef = useRef(selectedChapter)
  const chaptersRef = useRef(chapters)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorSetContentRef = useRef<((content: string) => void) | null>(null)
  const localDraftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracks the chapterId of the most recently started loadChapterContent call, so a
  // slow-resolving fetch/getDraft chain for a chapter the user has since switched away
  // from cannot clobber pendingDraft for the chapter that's actually open.
  const latestChapterRequestRef = useRef<string | null>(null)

  useEffect(() => { editorContentRef.current = editorContent }, [editorContent])
  useEffect(() => { selectedChapterRef.current = selectedChapter }, [selectedChapter])
  useEffect(() => { chaptersRef.current = chapters }, [chapters])

  const loadChapterContent = async (chapterId: string) => {
    latestChapterRequestRef.current = chapterId
    try {
      const response = await fetch(`/api/chapters/${chapterId}`)
      if (!response.ok) return null
      const data = await response.json()
      const draft = await getDraft(chapterId)
      if (draft && draft.updatedAt > new Date(data.updatedAt).getTime()) {
        if (latestChapterRequestRef.current === chapterId) setPendingDraft(draft)
      } else {
        if (latestChapterRequestRef.current === chapterId) {
          setPendingDraft(null)
        }
        if (draft) await deleteDraft(chapterId)
      }
      return data
    } catch (error) {
      console.error('Error loading chapter content:', error)
      return null
    }
  }

  const loadChapters = async (projectId: string) => {
    try {
      const response = await fetch(`/api/chapters?projectId=${projectId}&limit=200`)
      if (response.status === 401) {
        router.push('/login')
        return
      }
      if (!response.ok) {
        showError('Kapitel konnten nicht geladen werden.')
        setChapters([])
        return
      }
      const data = await response.json()
      const chapterList: Chapter[] = data.chapters
      if (Array.isArray(chapterList)) {
        setChapters(chapterList)
        if (chapterList.length > 0 && !selectedChapter) {
          const full = await loadChapterContent(chapterList[0].id)
          if (full) setSelectedChapter(full)
        }
      } else {
        setChapters([])
      }
    } catch (error) {
      console.error('Error loading chapters:', error)
      showError('Kapitel konnten nicht geladen werden.')
      setChapters([])
    }
  }

  useEffect(() => {
    if (selectedProject) {
      loadChapters(selectedProject.id)
    } else {
      setChapters([])
      setSelectedChapter(null)
      setEditorContent('')
      setPendingDraft(null)
    }
  }, [selectedProject])

  useEffect(() => {
    if (selectedChapter) {
      const c = extractContent(selectedChapter.content)
      setEditorContent(c)
      editorSetContentRef.current?.(c)
    }
  }, [selectedChapter])

  const setChapterTitle = (newTitle: string) => {
    if (!selectedChapter) return
    setSelectedChapter({ ...selectedChapter, title: newTitle })
    setChapters(chapters.map(ch =>
      ch.id === selectedChapter.id ? { ...ch, title: newTitle } : ch
    ))
  }

  const createChapter = async () => {
    if (!selectedProject) return
    try {
      const response = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Kapitel ${chapters.length + 1}`,
          projectId: selectedProject.id
        })
      })
      if (!response.ok) {
        showError('Kapitel konnte nicht erstellt werden.')
        return
      }
      const newChapter = await response.json()
      setChapters([...chapters, newChapter])
      setSelectedChapter(newChapter)
    } catch (error) {
      console.error('Error creating chapter:', error)
      showError('Kapitel konnte nicht erstellt werden.')
    }
  }

  // saveChapter uses refs to always have fresh values (stale closure fix)
  const saveChapter = useCallback(async (chapterOverride?: Chapter, contentOverride?: string) => {
    const chapter = chapterOverride ?? selectedChapterRef.current
    const content = contentOverride ?? editorContentRef.current
    if (!chapter) return

    setIsSaving(true)
    try {
      const textContent = stripHtml(content)
      const wordCount = textContent.trim().split(/\s+/).filter(w => w.length > 0).length
      const response = await fetch(`/api/chapters/${chapter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: chapter.title, content, wordCount })
      })
      if (!response.ok) {
        showError('Kapitel konnte nicht gespeichert werden.')
        return
      }
      await deleteDraft(chapter.id).catch(() => {})
      setChapters(prev => prev.map(ch =>
        ch.id === chapter.id ? { ...ch, title: chapter.title, content, wordCount } : ch
      ))
      if (!chapterOverride) {
        setSelectedChapter(prev => prev ? { ...prev, content, wordCount } : prev)
      }
      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Error saving chapter:', error)
      showError('Kapitel konnte nicht gespeichert werden.')
    } finally {
      setIsSaving(false)
    }
  }, [])

  // Autosave: debounce 2s after last change
  useEffect(() => {
    if (!selectedChapter) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setAutoSaveStatus('idle')
    autoSaveTimer.current = setTimeout(() => {
      setAutoSaveStatus('saving')
      saveChapter()
    }, 2000)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [editorContent, selectedChapter?.id])

  // Local-first fallback: always-active IndexedDB backup, independent of server-save outcome
  useEffect(() => {
    if (!selectedChapter) return
    if (localDraftTimer.current) clearTimeout(localDraftTimer.current)
    localDraftTimer.current = setTimeout(() => {
      saveDraft(selectedChapter.id, editorContent)
    }, 400)
    return () => {
      if (localDraftTimer.current) clearTimeout(localDraftTimer.current)
    }
  }, [editorContent, selectedChapter?.id])

  const deleteChapter = (chapterId: string) => {
    requestConfirm('Kapitel löschen', 'Möchtest du dieses Kapitel wirklich löschen?', async () => {
      onConfirmed()
      try {
        const response = await fetch(`/api/chapters/${chapterId}`, { method: 'DELETE' })
        if (!response.ok) {
          showError('Kapitel konnte nicht gelöscht werden.')
          return
        }
        const remaining = chapters.filter(ch => ch.id !== chapterId)
        setChapters(remaining)
        if (selectedChapter?.id === chapterId) {
          setSelectedChapter(remaining.length > 0 ? remaining[0] : null)
          setEditorContent(remaining.length > 0 ? extractContent(remaining[0].content) : '')
        }
      } catch (error) {
        console.error('Error deleting chapter:', error)
        showError('Kapitel konnte nicht gelöscht werden.')
      }
    })
  }

  // Save the outgoing chapter (bypassing the autosave debounce) before switching to another one
  const switchChapter = async (chapter: Chapter) => {
    if (selectedChapterRef.current && selectedChapterRef.current.id !== chapter.id) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      const currentContent = editorContentRef.current
      await saveChapter(selectedChapterRef.current, currentContent)
    }
    const full = await loadChapterContent(chapter.id)
    const loaded = full ?? chapter
    setEditorContent(extractContent(loaded.content))
    setSelectedChapter(loaded)
  }

  const restoreDraft = () => {
    if (!pendingDraft) return
    setEditorContent(pendingDraft.content)
    editorSetContentRef.current?.(pendingDraft.content)
    setPendingDraft(null)
  }

  const discardDraft = async () => {
    if (!pendingDraft) return
    await deleteDraft(pendingDraft.chapterId)
    setPendingDraft(null)
  }

  return {
    chapters,
    setChapters,
    selectedChapter,
    setSelectedChapter,
    editorContent,
    setEditorContent,
    isSaving,
    autoSaveStatus,
    editorSetContentRef,
    setChapterTitle,
    createChapter,
    saveChapter,
    deleteChapter,
    switchChapter,
    extractContent,
    pendingDraft,
    restoreDraft,
    discardDraft,
  }
}
