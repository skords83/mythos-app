import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Comment } from '../components/types'

interface UseCommentsArgs {
  chapterId: string | null
  showError: (message: string) => void
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void
  onConfirmed: () => void
}

export function useComments({ chapterId, showError, requestConfirm, onConfirmed }: UseCommentsArgs) {
  const router = useRouter()
  const [comments, setComments] = useState<Comment[]>([])

  const loadComments = async (chapterId: string) => {
    try {
      const response = await fetch(`/api/comments?chapterId=${chapterId}`)
      if (response.status === 401) {
        router.push('/login')
        return
      }
      if (!response.ok) {
        showError('Kommentare konnten nicht geladen werden.')
        setComments([])
        return
      }
      const data = await response.json()
      setComments(data)
    } catch (error) {
      console.error('Error loading comments:', error)
      showError('Kommentare konnten nicht geladen werden.')
      setComments([])
    }
  }

  useEffect(() => {
    if (chapterId) {
      loadComments(chapterId)
    } else {
      setComments([])
    }
  }, [chapterId])

  const addComment = async (content: string, visibility: 'PRIVATE' | 'FAMILY'): Promise<Comment | null> => {
    if (!chapterId) return null
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, visibility, chapterId })
      })
      if (!response.ok) {
        showError('Kommentar konnte nicht erstellt werden.')
        return null
      }
      const newComment = await response.json()
      setComments([...comments, newComment])
      return newComment
    } catch (error) {
      console.error('Error adding comment:', error)
      showError('Kommentar konnte nicht erstellt werden.')
      return null
    }
  }

  const updateComment = async (id: string, content: string, visibility: 'PRIVATE' | 'FAMILY') => {
    try {
      const response = await fetch(`/api/comments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, visibility })
      })
      if (!response.ok) {
        showError('Kommentar konnte nicht gespeichert werden.')
        return
      }
      const updated = await response.json()
      setComments(comments.map(c => c.id === id ? updated : c))
    } catch (error) {
      console.error('Error updating comment:', error)
      showError('Kommentar konnte nicht gespeichert werden.')
    }
  }

  const toggleResolved = async (id: string, resolved: boolean) => {
    try {
      const response = await fetch(`/api/comments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved })
      })
      if (!response.ok) {
        showError('Kommentar konnte nicht aktualisiert werden.')
        return
      }
      const updated = await response.json()
      setComments(comments.map(c => c.id === id ? updated : c))
    } catch (error) {
      console.error('Error toggling comment resolved state:', error)
      showError('Kommentar konnte nicht aktualisiert werden.')
    }
  }

  const deleteComment = (commentId: string, onDeleted?: () => void) => {
    requestConfirm('Kommentar löschen', 'Möchtest du diesen Kommentar wirklich löschen?', async () => {
      onConfirmed()
      try {
        const response = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
        if (!response.ok) {
          showError('Kommentar konnte nicht gelöscht werden.')
          return
        }
        setComments(comments.filter(c => c.id !== commentId))
        onDeleted?.()
      } catch (error) {
        console.error('Error deleting comment:', error)
        showError('Kommentar konnte nicht gelöscht werden.')
      }
    })
  }

  return {
    comments,
    addComment,
    updateComment,
    toggleResolved,
    deleteComment,
  }
}
