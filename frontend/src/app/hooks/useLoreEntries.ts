import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoreEntry, Project } from '../components/types'

interface UseLoreEntriesArgs {
  selectedProject: Project | null
  showError: (message: string) => void
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void
  onConfirmed: () => void
}

export function useLoreEntries({ selectedProject, showError, requestConfirm, onConfirmed }: UseLoreEntriesArgs) {
  const router = useRouter()
  const [loreEntries, setLoreEntries] = useState<LoreEntry[]>([])
  const [editingLoreEntry, setEditingLoreEntry] = useState<LoreEntry | null>(null)

  const loadLoreEntries = async (projectId: string) => {
    try {
      const response = await fetch(`/api/lore-entries?projectId=${projectId}`)
      if (response.status === 401) {
        router.push('/login')
        return
      }
      if (!response.ok) {
        showError('Lore-Bibel konnte nicht geladen werden.')
        setLoreEntries([])
        return
      }
      const data = await response.json()
      setLoreEntries(data)
    } catch (error) {
      console.error('Error loading lore entries:', error)
      showError('Lore-Bibel konnte nicht geladen werden.')
      setLoreEntries([])
    }
  }

  useEffect(() => {
    if (selectedProject) {
      loadLoreEntries(selectedProject.id)
    } else {
      setLoreEntries([])
    }
  }, [selectedProject])

  const addLoreEntry = async (
    title: string,
    content: string,
    category: string,
    visibility: 'PRIVATE' | 'FAMILY'
  ) => {
    if (!selectedProject) return
    try {
      const response = await fetch('/api/lore-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category, visibility, projectId: selectedProject.id })
      })
      if (!response.ok) {
        showError('Lore-Eintrag konnte nicht erstellt werden.')
        return
      }
      const newEntry = await response.json()
      setLoreEntries([...loreEntries, newEntry])
    } catch (error) {
      console.error('Error adding lore entry:', error)
      showError('Lore-Eintrag konnte nicht erstellt werden.')
    }
  }

  const updateLoreEntry = async (
    id: string,
    title: string,
    content: string,
    category: string,
    visibility: 'PRIVATE' | 'FAMILY'
  ) => {
    try {
      const response = await fetch(`/api/lore-entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category, visibility })
      })
      if (!response.ok) {
        showError('Lore-Eintrag konnte nicht gespeichert werden.')
        return
      }
      const updated = await response.json()
      setLoreEntries(loreEntries.map(e => e.id === id ? updated : e))
    } catch (error) {
      console.error('Error updating lore entry:', error)
      showError('Lore-Eintrag konnte nicht gespeichert werden.')
    }
  }

  const deleteLoreEntry = (entryId: string) => {
    requestConfirm('Lore-Eintrag löschen', 'Möchtest du diesen Lore-Eintrag wirklich löschen?', async () => {
      onConfirmed()
      try {
        const response = await fetch(`/api/lore-entries/${entryId}`, { method: 'DELETE' })
        if (!response.ok) {
          showError('Lore-Eintrag konnte nicht gelöscht werden.')
          return
        }
        setLoreEntries(loreEntries.filter(e => e.id !== entryId))
      } catch (error) {
        console.error('Error deleting lore entry:', error)
        showError('Lore-Eintrag konnte nicht gelöscht werden.')
      }
    })
  }

  return {
    loreEntries,
    editingLoreEntry,
    setEditingLoreEntry,
    addLoreEntry,
    updateLoreEntry,
    deleteLoreEntry,
  }
}
