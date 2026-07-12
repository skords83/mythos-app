import { useEffect, useState } from 'react'
import { Note } from '../components/types'

interface UseNotesArgs {
  selectedChapterId: string | undefined
  showError: (message: string) => void
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void
  onConfirmed: () => void
}

export function useNotes({ selectedChapterId, showError, requestConfirm, onConfirmed }: UseNotesArgs) {
  const [notes, setNotes] = useState<Note[]>([])

  const loadNotes = async (chapterId: string) => {
    try {
      const response = await fetch(`/api/notes?chapterId=${chapterId}`)
      if (response.ok) {
        const data = await response.json()
        setNotes(data)
      } else {
        showError('Notizen konnten nicht geladen werden.')
      }
    } catch (error) {
      console.error('Error loading notes:', error)
      showError('Notizen konnten nicht geladen werden.')
    }
  }

  useEffect(() => {
    if (selectedChapterId) {
      loadNotes(selectedChapterId)
    } else {
      setNotes([])
    }
  }, [selectedChapterId])

  const addNote = async (title: string, content: string, chapterId: string) => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, chapterId })
      })
      if (!response.ok) {
        showError('Notiz konnte nicht erstellt werden.')
        return
      }
      const newNote = await response.json()
      setNotes([newNote, ...notes])
    } catch (error) {
      console.error('Error adding note:', error)
      showError('Notiz konnte nicht erstellt werden.')
    }
  }

  const updateNote = async (noteId: string, title: string, content: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      })
      if (!response.ok) {
        showError('Notiz konnte nicht gespeichert werden.')
        return
      }
      const updatedNote = await response.json()
      setNotes(notes.map(n => n.id === noteId ? updatedNote : n))
    } catch (error) {
      console.error('Error updating note:', error)
      showError('Notiz konnte nicht gespeichert werden.')
    }
  }

  const deleteNote = (noteId: string) => {
    requestConfirm('Notiz löschen', 'Möchtest du diese Notiz wirklich löschen?', async () => {
      onConfirmed()
      try {
        const response = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' })
        if (!response.ok) {
          showError('Notiz konnte nicht gelöscht werden.')
          return
        }
        setNotes(notes.filter(n => n.id !== noteId))
      } catch (error) {
        console.error('Error deleting note:', error)
        showError('Notiz konnte nicht gelöscht werden.')
      }
    })
  }

  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
  }
}
