import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TimelineEvent, Project } from '../components/types'

interface UseTimelineEventsArgs {
  selectedProject: Project | null
  showError: (message: string) => void
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void
  onConfirmed: () => void
}

export function useTimelineEvents({ selectedProject, showError, requestConfirm, onConfirmed }: UseTimelineEventsArgs) {
  const router = useRouter()
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [editingTimelineEvent, setEditingTimelineEvent] = useState<TimelineEvent | null>(null)

  const loadTimelineEvents = async (projectId: string) => {
    try {
      const response = await fetch(`/api/timeline-events?projectId=${projectId}`)
      if (response.status === 401) {
        router.push('/login')
        return
      }
      if (!response.ok) {
        showError('Zeitstrahl konnte nicht geladen werden.')
        setTimelineEvents([])
        return
      }
      const data = await response.json()
      setTimelineEvents(data)
    } catch (error) {
      console.error('Error loading timeline events:', error)
      showError('Zeitstrahl konnte nicht geladen werden.')
      setTimelineEvents([])
    }
  }

  useEffect(() => {
    if (selectedProject) {
      loadTimelineEvents(selectedProject.id)
    } else {
      setTimelineEvents([])
    }
  }, [selectedProject])

  const addTimelineEvent = async (
    title: string,
    description: string,
    date: string,
    type: 'LORE' | 'PLOT',
    visibility: 'PRIVATE' | 'FAMILY'
  ) => {
    if (!selectedProject) return
    try {
      const response = await fetch('/api/timeline-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, date, type, visibility, projectId: selectedProject.id })
      })
      if (!response.ok) {
        showError('Ereignis konnte nicht erstellt werden.')
        return
      }
      const newEvent = await response.json()
      setTimelineEvents([...timelineEvents, newEvent])
    } catch (error) {
      console.error('Error adding timeline event:', error)
      showError('Ereignis konnte nicht erstellt werden.')
    }
  }

  const updateTimelineEvent = async (
    id: string,
    title: string,
    description: string,
    date: string,
    type: 'LORE' | 'PLOT',
    visibility: 'PRIVATE' | 'FAMILY'
  ) => {
    try {
      const response = await fetch(`/api/timeline-events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, date, type, visibility })
      })
      if (!response.ok) {
        showError('Ereignis konnte nicht gespeichert werden.')
        return
      }
      const updated = await response.json()
      setTimelineEvents(timelineEvents.map(e => e.id === id ? updated : e))
    } catch (error) {
      console.error('Error updating timeline event:', error)
      showError('Ereignis konnte nicht gespeichert werden.')
    }
  }

  const deleteTimelineEvent = (eventId: string) => {
    requestConfirm('Ereignis löschen', 'Möchtest du dieses Ereignis wirklich löschen?', async () => {
      onConfirmed()
      try {
        const response = await fetch(`/api/timeline-events/${eventId}`, { method: 'DELETE' })
        if (!response.ok) {
          showError('Ereignis konnte nicht gelöscht werden.')
          return
        }
        setTimelineEvents(timelineEvents.filter(e => e.id !== eventId))
      } catch (error) {
        console.error('Error deleting timeline event:', error)
        showError('Ereignis konnte nicht gelöscht werden.')
      }
    })
  }

  return {
    timelineEvents,
    editingTimelineEvent,
    setEditingTimelineEvent,
    addTimelineEvent,
    updateTimelineEvent,
    deleteTimelineEvent,
  }
}
