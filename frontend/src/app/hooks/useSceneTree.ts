import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Chapter, Scene } from '../components/types'

interface UseSceneTreeArgs {
  chapters: Chapter[]
  selectedChapter: Chapter | null
  showError: (message: string) => void
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void
  onConfirmed: () => void
}

export function useSceneTree({ chapters, selectedChapter, showError, requestConfirm, onConfirmed }: UseSceneTreeArgs) {
  const router = useRouter()
  const [expandedChapterIds, setExpandedChapterIds] = useState<Set<string>>(new Set())
  const [scenesByChapter, setScenesByChapter] = useState<Record<string, Scene[]>>({})
  const [loadingChapterIds, setLoadingChapterIds] = useState<Set<string>>(new Set())
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)

  const loadScenesFor = async (chapterId: string) => {
    setLoadingChapterIds((prev) => new Set(prev).add(chapterId))
    try {
      const response = await fetch(`/api/scenes?chapterId=${chapterId}`)
      if (response.status === 401) {
        router.push('/login')
        return
      }
      if (!response.ok) {
        showError('Szenen konnten nicht geladen werden.')
        return
      }
      const data = await response.json()
      setScenesByChapter((prev) => ({ ...prev, [chapterId]: data }))
    } catch (error) {
      console.error('Error loading scenes:', error)
      showError('Szenen konnten nicht geladen werden.')
    } finally {
      setLoadingChapterIds((prev) => {
        const next = new Set(prev)
        next.delete(chapterId)
        return next
      })
    }
  }

  const expandChapter = (chapterId: string) => {
    setExpandedChapterIds((prev) => new Set(prev).add(chapterId))
    if (!scenesByChapter[chapterId]) {
      loadScenesFor(chapterId)
    }
  }

  const toggleChapter = (chapterId: string) => {
    if (expandedChapterIds.has(chapterId)) {
      setExpandedChapterIds((prev) => {
        const next = new Set(prev)
        next.delete(chapterId)
        return next
      })
    } else {
      expandChapter(chapterId)
    }
  }

  const expandAll = () => {
    chapters.forEach((chapter) => expandChapter(chapter.id))
  }

  // Keep the tree in sync when the open chapter changes from elsewhere
  // (search jump, chapter list click) - reveal its scenes, drop any
  // stale scene selection that belonged to a different chapter.
  useEffect(() => {
    if (!selectedChapter) {
      setSelectedScene(null)
      return
    }
    expandChapter(selectedChapter.id)
    setSelectedScene((prev) => (prev && prev.chapterId === selectedChapter.id ? prev : null))
  }, [selectedChapter?.id])

  const createScene = async (chapterId: string) => {
    try {
      const response = await fetch('/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Neue Szene', description: '', outline: '', tags: [], visibility: 'PRIVATE', chapterId }),
      })
      if (!response.ok) {
        showError('Szene konnte nicht erstellt werden.')
        return
      }
      const created: Scene = await response.json()
      setScenesByChapter((prev) => ({ ...prev, [chapterId]: [...(prev[chapterId] ?? []), created] }))
      setExpandedChapterIds((prev) => new Set(prev).add(chapterId))
      setSelectedScene(created)
    } catch (error) {
      console.error('Error creating scene:', error)
      showError('Szene konnte nicht erstellt werden.')
    }
  }

  const updateSceneFields = async (scene: Scene, updates: Partial<Pick<Scene, 'name' | 'description' | 'outline' | 'tags' | 'visibility'>>) => {
    try {
      const response = await fetch(`/api/scenes/${scene.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        showError('Szene konnte nicht gespeichert werden.')
        return
      }
      const updated: Scene = await response.json()
      setScenesByChapter((prev) => ({
        ...prev,
        [scene.chapterId]: (prev[scene.chapterId] ?? []).map((s) => (s.id === updated.id ? updated : s)),
      }))
      setSelectedScene((prev) => (prev?.id === updated.id ? updated : prev))
    } catch (error) {
      console.error('Error updating scene:', error)
      showError('Szene konnte nicht gespeichert werden.')
    }
  }

  const deleteScene = (scene: Scene) => {
    requestConfirm('Szene löschen', 'Möchtest du diese Szene wirklich löschen?', async () => {
      onConfirmed()
      try {
        const response = await fetch(`/api/scenes/${scene.id}`, { method: 'DELETE' })
        if (!response.ok) {
          showError('Szene konnte nicht gelöscht werden.')
          return
        }
        setScenesByChapter((prev) => ({
          ...prev,
          [scene.chapterId]: (prev[scene.chapterId] ?? []).filter((s) => s.id !== scene.id),
        }))
        setSelectedScene((prev) => (prev?.id === scene.id ? null : prev))
      } catch (error) {
        console.error('Error deleting scene:', error)
        showError('Szene konnte nicht gelöscht werden.')
      }
    })
  }

  return {
    expandedChapterIds,
    scenesByChapter,
    loadingChapterIds,
    toggleChapter,
    expandAll,
    selectedScene,
    setSelectedScene,
    createScene,
    updateSceneFields,
    deleteScene,
  }
}
