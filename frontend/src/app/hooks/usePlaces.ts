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

  const addPlace = async (name: string, description: string, location: string, climate: string, importance: string, visibility: 'PRIVATE' | 'FAMILY', parentId: string | null = null) => {
    if (!selectedProject) return
    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, location, climate, importance, visibility, parentId, projectId: selectedProject.id })
      })
      if (!response.ok) {
        showError('Ort konnte nicht erstellt werden.')
        return
      }
      const newPlace = await response.json()
      setPlaces([{ ...newPlace, images: newPlace.images || [] }, ...places])
    } catch (error) {
      console.error('Error adding place:', error)
      showError('Ort konnte nicht erstellt werden.')
    }
  }

  const updatePlaceParent = async (placeId: string, parentId: string | null) => {
    try {
      const response = await fetch(`/api/places/${placeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId })
      })
      if (!response.ok) {
        showError('Übergeordneter Ort konnte nicht geändert werden.')
        return
      }
      const updated = await response.json()
      setPlaces(places.map(p => p.id === placeId ? updated : p))
    } catch (error) {
      console.error('Error updating place parent:', error)
      showError('Übergeordneter Ort konnte nicht geändert werden.')
    }
  }

  const addPlaceImage = async (placeId: string, file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadData = await uploadResponse.json()
      if (!uploadResponse.ok || !uploadData.url) {
        showError('Bild konnte nicht hochgeladen werden.')
        return
      }

      const response = await fetch(`/api/places/${placeId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: uploadData.url }),
      })
      if (!response.ok) {
        showError('Bild konnte nicht hinzugefügt werden.')
        return
      }
      const image = await response.json()
      setPlaces(places.map(p => p.id === placeId ? { ...p, images: [...p.images, image] } : p))
    } catch (error) {
      console.error('Error adding place image:', error)
      showError('Bild konnte nicht hinzugefügt werden.')
    }
  }

  const deletePlaceImage = async (placeId: string, imageId: string) => {
    try {
      const response = await fetch(`/api/places/${placeId}/images/${imageId}`, { method: 'DELETE' })
      if (!response.ok) {
        showError('Bild konnte nicht gelöscht werden.')
        return
      }
      setPlaces(places.map(p => p.id === placeId ? { ...p, images: p.images.filter(img => img.id !== imageId) } : p))
    } catch (error) {
      console.error('Error deleting place image:', error)
      showError('Bild konnte nicht gelöscht werden.')
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
    updatePlaceParent,
    addPlaceImage,
    deletePlaceImage,
  }
}
