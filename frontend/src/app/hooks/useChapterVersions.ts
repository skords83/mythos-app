import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChapterVersion } from '../components/types'

interface UseChapterVersionsArgs {
  chapterId: string | null
  showError: (message: string) => void
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void
  onConfirmed: () => void
}

export function useChapterVersions({ chapterId, showError, requestConfirm, onConfirmed }: UseChapterVersionsArgs) {
  const router = useRouter()
  const [versions, setVersions] = useState<ChapterVersion[]>([])

  const loadVersions = async (chapterId: string) => {
    try {
      const response = await fetch(`/api/chapter-versions?chapterId=${chapterId}`)
      if (response.status === 401) {
        router.push('/login')
        return
      }
      if (!response.ok) {
        showError('Entwürfe konnten nicht geladen werden.')
        setVersions([])
        return
      }
      const data = await response.json()
      setVersions(data)
    } catch (error) {
      console.error('Error loading chapter versions:', error)
      showError('Entwürfe konnten nicht geladen werden.')
      setVersions([])
    }
  }

  useEffect(() => {
    if (chapterId) {
      loadVersions(chapterId)
    } else {
      setVersions([])
    }
  }, [chapterId])

  const createVersion = async (name: string): Promise<ChapterVersion | null> => {
    if (!chapterId) return null
    try {
      const response = await fetch('/api/chapter-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId, name, content: '', wordCount: 0 }),
      })
      if (!response.ok) {
        showError('Entwurf konnte nicht erstellt werden.')
        return null
      }
      const created = await response.json()
      setVersions((prev) => [...prev, created])
      return created
    } catch (error) {
      console.error('Error creating chapter version:', error)
      showError('Entwurf konnte nicht erstellt werden.')
      return null
    }
  }

  const saveVersionContent = async (id: string, content: string, wordCount: number) => {
    try {
      const response = await fetch(`/api/chapter-versions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, wordCount }),
      })
      if (!response.ok) return
      const updated = await response.json()
      setVersions((prev) => prev.map((v) => (v.id === id ? updated : v)))
    } catch (error) {
      console.error('Error saving chapter version:', error)
    }
  }

  const renameVersion = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/chapter-versions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!response.ok) {
        showError('Entwurf konnte nicht umbenannt werden.')
        return
      }
      const updated = await response.json()
      setVersions((prev) => prev.map((v) => (v.id === id ? updated : v)))
    } catch (error) {
      console.error('Error renaming chapter version:', error)
      showError('Entwurf konnte nicht umbenannt werden.')
    }
  }

  const deleteVersion = (id: string, onDeleted?: () => void) => {
    requestConfirm('Entwurf löschen', 'Möchtest du diesen Entwurf wirklich löschen?', async () => {
      onConfirmed()
      try {
        const response = await fetch(`/api/chapter-versions/${id}`, { method: 'DELETE' })
        if (!response.ok) {
          showError('Entwurf konnte nicht gelöscht werden.')
          return
        }
        setVersions((prev) => prev.filter((v) => v.id !== id))
        onDeleted?.()
      } catch (error) {
        console.error('Error deleting chapter version:', error)
        showError('Entwurf konnte nicht gelöscht werden.')
      }
    })
  }

  return {
    versions,
    createVersion,
    saveVersionContent,
    renameVersion,
    deleteVersion,
  }
}
