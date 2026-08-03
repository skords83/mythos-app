import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Idea, Project } from '../components/types'

interface UseIdeasArgs {
  selectedProject: Project | null
  showError: (message: string) => void
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void
  onConfirmed: () => void
}

export function useIdeas({ selectedProject, showError, requestConfirm, onConfirmed }: UseIdeasArgs) {
  const router = useRouter()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null)

  const loadIdeas = async (projectId: string) => {
    try {
      const response = await fetch(`/api/ideas?projectId=${projectId}`)
      if (response.status === 401) {
        router.push('/login')
        return
      }
      if (!response.ok) {
        showError('Ideenboard konnte nicht geladen werden.')
        setIdeas([])
        return
      }
      const data = await response.json()
      setIdeas(data)
    } catch (error) {
      console.error('Error loading ideas:', error)
      showError('Ideenboard konnte nicht geladen werden.')
      setIdeas([])
    }
  }

  useEffect(() => {
    if (selectedProject) {
      loadIdeas(selectedProject.id)
    } else {
      setIdeas([])
    }
  }, [selectedProject])

  const addIdea = async (
    title: string,
    content: string,
    tags: string[],
    visibility: 'PRIVATE' | 'FAMILY'
  ) => {
    if (!selectedProject) return
    try {
      const response = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, tags, visibility, projectId: selectedProject.id })
      })
      if (!response.ok) {
        showError('Idee konnte nicht erstellt werden.')
        return
      }
      const newIdea = await response.json()
      setIdeas([...ideas, newIdea])
    } catch (error) {
      console.error('Error adding idea:', error)
      showError('Idee konnte nicht erstellt werden.')
    }
  }

  const updateIdea = async (
    id: string,
    title: string,
    content: string,
    tags: string[],
    visibility: 'PRIVATE' | 'FAMILY'
  ) => {
    try {
      const response = await fetch(`/api/ideas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, tags, visibility })
      })
      if (!response.ok) {
        showError('Idee konnte nicht gespeichert werden.')
        return
      }
      const updated = await response.json()
      setIdeas(ideas.map(i => i.id === id ? updated : i))
    } catch (error) {
      console.error('Error updating idea:', error)
      showError('Idee konnte nicht gespeichert werden.')
    }
  }

  const deleteIdea = (ideaId: string) => {
    requestConfirm('Idee löschen', 'Möchtest du diese Idee wirklich löschen?', async () => {
      onConfirmed()
      try {
        const response = await fetch(`/api/ideas/${ideaId}`, { method: 'DELETE' })
        if (!response.ok) {
          showError('Idee konnte nicht gelöscht werden.')
          return
        }
        setIdeas(ideas.filter(i => i.id !== ideaId))
      } catch (error) {
        console.error('Error deleting idea:', error)
        showError('Idee konnte nicht gelöscht werden.')
      }
    })
  }

  return {
    ideas,
    editingIdea,
    setEditingIdea,
    addIdea,
    updateIdea,
    deleteIdea,
  }
}
