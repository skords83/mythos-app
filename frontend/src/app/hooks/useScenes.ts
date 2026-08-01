import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Scene } from '../components/types'

interface UseScenesArgs {
  chapterId: string | null
  showError: (message: string) => void
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void
  onConfirmed: () => void
}

export function useScenes({ chapterId, showError, requestConfirm, onConfirmed }: UseScenesArgs) {
  const router = useRouter()
  const [scenes, setScenes] = useState<Scene[]>([])

  const loadScenes = async (chapterId: string) => {
    try {
      const response = await fetch(`/api/scenes?chapterId=${chapterId}`)
      if (response.status === 401) {
        router.push('/login')
        return
      }
      if (!response.ok) {
        showError('Szenen konnten nicht geladen werden.')
        setScenes([])
        return
      }
      const data = await response.json()
      setScenes(data)
    } catch (error) {
      console.error('Error loading scenes:', error)
      showError('Szenen konnten nicht geladen werden.')
      setScenes([])
    }
  }

  useEffect(() => {
    if (chapterId) {
      loadScenes(chapterId)
    } else {
      setScenes([])
    }
  }, [chapterId])

  const addScene = async (name: string, description: string, visibility: 'PRIVATE' | 'FAMILY', outline: string = '', tags: string[] = []) => {
    if (!chapterId) return
    try {
      const response = await fetch('/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, outline, tags, visibility, chapterId })
      })
      if (!response.ok) {
        showError('Szene konnte nicht erstellt werden.')
        return
      }
      const newScene = await response.json()
      setScenes([...scenes, newScene])
    } catch (error) {
      console.error('Error adding scene:', error)
      showError('Szene konnte nicht erstellt werden.')
    }
  }

  const updateScene = async (id: string, name: string, description: string, visibility: 'PRIVATE' | 'FAMILY', outline: string = '', tags?: string[]) => {
    try {
      const response = await fetch(`/api/scenes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, outline, visibility, ...(tags !== undefined ? { tags } : {}) })
      })
      if (!response.ok) {
        showError('Szene konnte nicht gespeichert werden.')
        return
      }
      const updated = await response.json()
      setScenes(scenes.map(s => s.id === id ? updated : s))
    } catch (error) {
      console.error('Error updating scene:', error)
      showError('Szene konnte nicht gespeichert werden.')
    }
  }

  const deleteScene = (sceneId: string) => {
    requestConfirm('Szene löschen', 'Möchtest du diese Szene wirklich löschen?', async () => {
      onConfirmed()
      try {
        const response = await fetch(`/api/scenes/${sceneId}`, { method: 'DELETE' })
        if (!response.ok) {
          showError('Szene konnte nicht gelöscht werden.')
          return
        }
        setScenes(scenes.filter(s => s.id !== sceneId))
      } catch (error) {
        console.error('Error deleting scene:', error)
        showError('Szene konnte nicht gelöscht werden.')
      }
    })
  }

  return {
    scenes,
    addScene,
    updateScene,
    deleteScene,
  }
}
