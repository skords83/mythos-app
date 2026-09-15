import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Chapter, Project } from '../components/types'
import { loadAllPages, ListLoadError } from '@/lib/loadAllPages'
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
  const [chaptersLoaded, setChaptersLoaded] = useState(false)
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [pendingDraft, setPendingDraft] = useState<ChapterDraft | null>(null)

  // Refs to always have current values in callbacks (stale closure fix)
  const pendingDraftRef = useRef(pendingDraft)
  const editorContentRef = useRef(editorContent)
  const selectedChapterRef = useRef(selectedChapter)
  const chaptersRef = useRef(chapters)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorSetContentRef = useRef<((content: string) => void) | null>(null)
  const localDraftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracks the chapterId of the most recently started loadChapterContent call, so a
  // slow-resolving fetch/getDraft chain for a chapter the user has since switched away
  // from cannot clobber pendingDraft for the chapter that's actually open.
  const projectGenerationRef = useRef(0)
  const latestChapterRequestRef = useRef<string | null>(null)
  // Tracks which chapter's content was last pushed into the editor via setContent, so
  // in-place updates to selectedChapter (autosave echoing the saved content back, a title
  // edit) don't re-push content for the chapter already open. Re-parsing the same HTML
  // through editor.commands.setContent while the user keeps typing would strip trailing
  // whitespace (ProseMirror's HTML parser normalizes it) on every autosave.
  const loadedIntoEditorChapterIdRef = useRef<string | null>(null)

  useEffect(() => { pendingDraftRef.current = pendingDraft }, [pendingDraft])
  useEffect(() => { editorContentRef.current = editorContent }, [editorContent])
  useEffect(() => { selectedChapterRef.current = selectedChapter }, [selectedChapter])
  useEffect(() => { chaptersRef.current = chapters }, [chapters])

  const loadChapterContent = async (chapterId: string) => {
    const generation = projectGenerationRef.current
    latestChapterRequestRef.current = chapterId
    const isCurrent = () => generation === projectGenerationRef.current && latestChapterRequestRef.current === chapterId
    try {
      const response = await fetch(`/api/chapters/${chapterId}`)
      if (!response.ok) return null
      const data = await response.json()
      // A metadata-only response must never become editable empty content.
      if (!data || data.id !== chapterId || !Object.prototype.hasOwnProperty.call(data, 'content')) return null
      let draft
      try {
        draft = await getDraft(chapterId)
      } catch (draftError) {
        console.error('Error reading local draft:', draftError)
        draft = undefined
      }
      if (!isCurrent()) return null
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
    const generation = projectGenerationRef.current
    const isCurrent = () => generation === projectGenerationRef.current
    try {
      const chapterList = await loadAllPages<Chapter>(`/api/chapters?projectId=${encodeURIComponent(projectId)}&limit=200`, 'chapters', isCurrent)
      if (!isCurrent()) return
      if (Array.isArray(chapterList)) {
        setChapters(chapterList)
        if (chapterList.length > 0 && !selectedChapterRef.current) {
          const full = await loadChapterContent(chapterList[0].id)
          if (!isCurrent() || latestChapterRequestRef.current !== chapterList[0].id) return
          if (full) {
            // Mount the editor with the loaded text, never with the previous empty state.
            setEditorContent(extractContent(full.content))
            setSelectedChapter(full)
          }
        }
      } else {
        setChapters([])
      }
    } catch (error) {
      if (!isCurrent()) return
      if (error instanceof ListLoadError && error.status === 401) router.push('/login')
      console.error('Error loading chapters:', error)
      showError('Kapitel konnten nicht geladen werden.')
      setChapters([])
    } finally {
      if (isCurrent()) setChaptersLoaded(true)
    }
  }

  useEffect(() => {
    // Invalidate every request from the previous project, even A -> B -> A.
    projectGenerationRef.current++
    const outgoing = selectedChapterRef.current
    if (outgoing && pendingDraftRef.current?.chapterId !== outgoing.id &&
        editorContentRef.current !== extractContent(outgoing.content)) {
      // Preserve edits even when switching before the local debounce fires.
      void saveDraft(outgoing.id, editorContentRef.current).catch(() => {
        showError('Der lokale Entwurf des vorherigen Kapitels konnte nicht gesichert werden.')
      })
    }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    if (localDraftTimer.current) clearTimeout(localDraftTimer.current)
    latestChapterRequestRef.current = null
    loadedIntoEditorChapterIdRef.current = null
    selectedChapterRef.current = null
    pendingDraftRef.current = null
    chaptersRef.current = []
    editorContentRef.current = ''
    setChapters([])
    setSelectedChapter(null)
    setEditorContent('')
    setPendingDraft(null)
    setAutoSaveStatus('idle')
    setIsSaving(false)
    if (selectedProject) {
      setChaptersLoaded(false)
      loadChapters(selectedProject.id)
    } else {
      setChaptersLoaded(false)
    }
    return () => {
      projectGenerationRef.current++
      latestChapterRequestRef.current = null
    }
  }, [selectedProject?.id])

  useEffect(() => {
    if (selectedChapter && selectedChapter.id !== loadedIntoEditorChapterIdRef.current) {
      loadedIntoEditorChapterIdRef.current = selectedChapter.id
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
    const generation = projectGenerationRef.current
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
      if (generation !== projectGenerationRef.current) return
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
    if (!chapter || pendingDraftRef.current?.chapterId === chapter.id) return

    const generation = projectGenerationRef.current
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
      if (pendingDraftRef.current?.chapterId !== chapter.id) {
        await deleteDraft(chapter.id, content).catch(() => {})
      }
      if (generation !== projectGenerationRef.current) return
      setChapters(prev => prev.map(ch =>
        ch.id === chapter.id ? { ...ch, title: chapter.title, content, wordCount } : ch
      ))
      if (!chapterOverride) {
        setSelectedChapter(prev => prev?.id === chapter.id ? { ...prev, content, wordCount } : prev)
      }
      setAutoSaveStatus('saved')
      setTimeout(() => {
        if (generation === projectGenerationRef.current) setAutoSaveStatus('idle')
      }, 2000)
    } catch (error) {
      console.error('Error saving chapter:', error)
      showError('Kapitel konnte nicht gespeichert werden.')
    } finally {
      if (generation === projectGenerationRef.current) setIsSaving(false)
    }
  }, [])

  // Autosave: wait for an explicit recovery decision before saving server content.
  useEffect(() => {
    if (!selectedChapter || pendingDraft?.chapterId === selectedChapter.id) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setAutoSaveStatus('idle')
    autoSaveTimer.current = setTimeout(() => {
      setAutoSaveStatus('saving')
      saveChapter()
    }, 2000)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [editorContent, selectedChapter?.id, pendingDraft])

  // Local-first fallback: always-active IndexedDB backup, independent of server-save outcome
  useEffect(() => {
    if (!selectedChapter) return
    // Suspend local writes while a recovery draft is pending for this chapter, otherwise
    // this effect would overwrite the newer local draft with the just-loaded server content
    // before the user has chosen to restore or discard it.
    if (pendingDraft && pendingDraft.chapterId === selectedChapter.id) return
    if (localDraftTimer.current) clearTimeout(localDraftTimer.current)
    localDraftTimer.current = setTimeout(() => {
      saveDraft(selectedChapter.id, editorContent).catch(() => {})
    }, 400)
    return () => {
      if (localDraftTimer.current) clearTimeout(localDraftTimer.current)
    }
  }, [editorContent, selectedChapter?.id, pendingDraft])

  const deleteChapter = (chapterId: string) => {
    requestConfirm('Kapitel löschen', 'Möchtest du dieses Kapitel wirklich löschen?', async () => {
      onConfirmed()
      const generation = projectGenerationRef.current
      try {
        const response = await fetch(`/api/chapters/${chapterId}`, { method: 'DELETE' })
        if (generation !== projectGenerationRef.current) return
        if (!response.ok) {
          showError('Kapitel konnte nicht gelöscht werden.')
          return
        }
        const remaining = chaptersRef.current.filter(ch => ch.id !== chapterId)
        setChapters(remaining)
        if (selectedChapterRef.current?.id === chapterId) {
          // No editable chapter until its full content has actually loaded.
          if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
          if (localDraftTimer.current) clearTimeout(localDraftTimer.current)
          selectedChapterRef.current = null
          setSelectedChapter(null)
          setEditorContent('')
          setPendingDraft(null)
          loadedIntoEditorChapterIdRef.current = null
          const next = remaining[0]
          if (next) {
            const full = await loadChapterContent(next.id)
            if (latestChapterRequestRef.current !== next.id) return
            if (!full) {
              showError('Das nächste Kapitel konnte nicht geladen werden. Bitte wähle es erneut aus.')
              return
            }
            setEditorContent(extractContent(full.content))
            setSelectedChapter(full)
          }
        }
      } catch (error) {
        console.error('Error deleting chapter:', error)
        showError('Kapitel konnte nicht gelöscht werden.')
      }
    })
  }

  // Save the outgoing chapter (bypassing the autosave debounce) before switching to another one
  const switchChapter = async (chapter: Chapter) => {
    if (chapter.projectId !== selectedProject?.id) return
    const generation = projectGenerationRef.current
    if (selectedChapterRef.current && selectedChapterRef.current.id !== chapter.id) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      const currentContent = editorContentRef.current
      await saveChapter(selectedChapterRef.current, currentContent)
    }
    if (generation !== projectGenerationRef.current) return
    const full = await loadChapterContent(chapter.id)
    if (generation !== projectGenerationRef.current || latestChapterRequestRef.current !== chapter.id) return
    if (!full) {
      showError('Kapitel konnte nicht geladen werden. Das bisherige Kapitel bleibt geöffnet.')
      return
    }
    setEditorContent(extractContent(full.content))
    setSelectedChapter(full)
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
    chaptersLoaded,
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
