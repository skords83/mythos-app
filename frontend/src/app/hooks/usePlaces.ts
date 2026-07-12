import { useEffect, useState } from 'react'
import { Place, Project } from '../components/types'

interface UsePlacesArgs {
  selectedProject: Project | null
  showError: (message: string) => void
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void
  onConfirmed: () => void
}

export function usePlaces({ selectedProject, showError, requestConfirm, onConfirmed }: UsePlacesArgs) {
  const [places, setPlaces] = useState<Place[]>([])

  const loadPlaces = async (projectId: string) => {
    try {
      const response = await fetch(`/api/places?projectId=${projectId}`)
      if (!response.ok) {
        showError('Orte konnten nicht geladen werden.')
        return
      }
      const data = await response.json()
      setPlaces(data)
    } catch (error) {
      console.error('Error loading places:', error)
      showError('Orte konnten nicht geladen werden.')
    }
  }

  useEffect(() => {
    if (selectedProject) {
      loadPlaces(selectedProject.id)
    } else {
      setPlaces([])
    }
  }, [selectedProject])

  const addPlace = async (name: string, description: string, location: string, climate: string, importance: string, visibility: 'PRIVATE' | 'FAMILY') => {
    if (!selectedProject) return
    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, location, climate, importance, visibility, projectId: selectedProject.id })
      })
      if (!response.ok) {
        showError('Ort konnte nicht erstellt werden.')
        return
      }
      const newPlace = await response.json()
      setPlaces([newPlace, ...places])
    } catch (error) {
      console.error('Error adding place:', error)
      showError('Ort konnte nicht erstellt werden.')
    }
  }

  const deletePlace = (placeId: string) => {
    requestConfirm('Ort löschen', 'Möchtest du diesen Ort wirklich löschen?', async () => {
      onConfirmed()
      try {
        const response = await fetch(`/api/places/${placeId}`, { method: 'DELETE' })
        if (!response.ok) {
          showError('Ort konnte nicht gelöscht werden.')
          return
        }
        setPlaces(places.filter(p => p.id !== placeId))
      } catch (error) {
        console.error('Error deleting place:', error)
        showError('Ort konnte nicht gelöscht werden.')
      }
    })
  }

  return {
    places,
    addPlace,
    deletePlace,
  }
}
