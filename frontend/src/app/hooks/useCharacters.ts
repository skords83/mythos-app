import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Character, Project } from '../components/types'

interface UseCharactersArgs {
  selectedProject: Project | null
  showError: (message: string) => void
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void
  onConfirmed: () => void
}

export function useCharacters({ selectedProject, showError, requestConfirm, onConfirmed }: UseCharactersArgs) {
  const router = useRouter()
  const [characters, setCharacters] = useState<Character[]>([])
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)

  const loadCharacters = async (projectId: string) => {
    try {
      const response = await fetch(`/api/characters?projectId=${projectId}`)
      if (response.status === 401) {
        router.push('/login')
        return
      }
      if (!response.ok) {
        showError('Charaktere konnten nicht geladen werden.')
        setCharacters([])
        return
      }
      const data = await response.json()
      setCharacters(data)
    } catch (error) {
      console.error('Error loading characters:', error)
      showError('Charaktere konnten nicht geladen werden.')
      setCharacters([])
    }
  }

  useEffect(() => {
    if (selectedProject) {
      loadCharacters(selectedProject.id)
    } else {
      setCharacters([])
    }
  }, [selectedProject])

  const addCharacter = async (name: string, appearance: string, personality: string, backstory: string, motivation: string, flaw: string, secrets: string, role: '' | 'PROTAGONIST' | 'ANTAGONIST' | 'MENTOR', visibility: 'PRIVATE' | 'FAMILY') => {
    if (!selectedProject) return
    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, appearance, personality, backstory, motivation, flaw, secrets, role: role || null, visibility, projectId: selectedProject.id })
      })
      if (!response.ok) {
        showError('Charakter konnte nicht erstellt werden.')
        return
      }
      const newCharacter = await response.json()
      setCharacters([newCharacter, ...characters])
    } catch (error) {
      console.error('Error adding character:', error)
      showError('Charakter konnte nicht erstellt werden.')
    }
  }

  const updateCharacter = async (id: string, name: string, appearance: string, personality: string, backstory: string, motivation: string, flaw: string, secrets: string, role: '' | 'PROTAGONIST' | 'ANTAGONIST' | 'MENTOR', visibility: 'PRIVATE' | 'FAMILY', avatarUrl?: string | null) => {
    try {
      const response = await fetch(`/api/characters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, appearance, personality, backstory, motivation, flaw, secrets, role: role || null, visibility, avatarUrl })
      })
      if (!response.ok) {
        showError('Charakter konnte nicht gespeichert werden.')
        return
      }
      const updated = await response.json()
      setCharacters(characters.map(c => c.id === id ? updated : c))
    } catch (error) {
      console.error('Error updating character:', error)
      showError('Charakter konnte nicht gespeichert werden.')
    }
  }

  const deleteCharacter = (characterId: string) => {
    requestConfirm('Charakter löschen', 'Möchtest du diesen Charakter wirklich löschen?', async () => {
      onConfirmed()
      try {
        const response = await fetch(`/api/characters/${characterId}`, { method: 'DELETE' })
        if (!response.ok) {
          showError('Charakter konnte nicht gelöscht werden.')
          return
        }
        setCharacters(characters.filter(c => c.id !== characterId))
      } catch (error) {
        console.error('Error deleting character:', error)
        showError('Charakter konnte nicht gelöscht werden.')
      }
    })
  }

  return {
    characters,
    editingCharacter,
    setEditingCharacter,
    addCharacter,
    updateCharacter,
    deleteCharacter,
  }
}
