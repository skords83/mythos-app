import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Faction, Project } from '../components/types'

interface UseFactionsArgs {
  selectedProject: Project | null
  showError: (message: string) => void
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void
  onConfirmed: () => void
}

export function useFactions({ selectedProject, showError, requestConfirm, onConfirmed }: UseFactionsArgs) {
  const router = useRouter()
  const [factions, setFactions] = useState<Faction[]>([])
  const [editingFaction, setEditingFaction] = useState<Faction | null>(null)

  const loadFactions = async (projectId: string) => {
    try {
      const response = await fetch(`/api/factions?projectId=${projectId}`)
      if (response.status === 401) {
        router.push('/login')
        return
      }
      if (!response.ok) {
        showError('Fraktionen konnten nicht geladen werden.')
        setFactions([])
        return
      }
      const data = await response.json()
      setFactions(data)
    } catch (error) {
      console.error('Error loading factions:', error)
      showError('Fraktionen konnten nicht geladen werden.')
      setFactions([])
    }
  }

  useEffect(() => {
    if (selectedProject) {
      loadFactions(selectedProject.id)
    } else {
      setFactions([])
    }
  }, [selectedProject])

  const addFaction = async (name: string, description: string, goal: string, visibility: 'PRIVATE' | 'FAMILY') => {
    if (!selectedProject) return
    try {
      const response = await fetch('/api/factions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, goal, visibility, projectId: selectedProject.id })
      })
      if (!response.ok) {
        showError('Fraktion konnte nicht erstellt werden.')
        return
      }
      const newFaction = await response.json()
      setFactions([newFaction, ...factions])
    } catch (error) {
      console.error('Error adding faction:', error)
      showError('Fraktion konnte nicht erstellt werden.')
    }
  }

  const updateFaction = async (id: string, name: string, description: string, goal: string, visibility: 'PRIVATE' | 'FAMILY') => {
    try {
      const response = await fetch(`/api/factions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, goal, visibility })
      })
      if (!response.ok) {
        showError('Fraktion konnte nicht gespeichert werden.')
        return
      }
      const updated = await response.json()
      setFactions(factions.map(f => f.id === id ? updated : f))
    } catch (error) {
      console.error('Error updating faction:', error)
      showError('Fraktion konnte nicht gespeichert werden.')
    }
  }

  const deleteFaction = (factionId: string) => {
    requestConfirm('Fraktion löschen', 'Möchtest du diese Fraktion wirklich löschen?', async () => {
      onConfirmed()
      try {
        const response = await fetch(`/api/factions/${factionId}`, { method: 'DELETE' })
        if (!response.ok) {
          showError('Fraktion konnte nicht gelöscht werden.')
          return
        }
        setFactions(factions.filter(f => f.id !== factionId))
      } catch (error) {
        console.error('Error deleting faction:', error)
        showError('Fraktion konnte nicht gelöscht werden.')
      }
    })
  }

  return {
    factions,
    editingFaction,
    setEditingFaction,
    addFaction,
    updateFaction,
    deleteFaction,
  }
}
