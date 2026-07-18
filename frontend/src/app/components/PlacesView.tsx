'use client'

import { MapPin, Plus } from 'lucide-react'
import { PlaceCard } from './PlaceCard'
import { Character, Place } from './types'
import { TEXT_PRIMARY, TEXT_MUTED, ACCENT, RADIUS } from '@/lib/theme'

interface PlacesViewProps {
  places: Place[]
  characters: Character[]
  onAddClick: () => void
  onDelete: (id: string) => void
  onUpdateParent: (id: string, parentId: string | null) => void
  onAddImage: (id: string, file: File) => Promise<void>
  onDeleteImage: (id: string, imageId: string) => void
}

export function PlacesView({ places, characters, onAddClick, onDelete, onUpdateParent, onAddImage, onDeleteImage }: PlacesViewProps) {
  const placeIds = new Set(places.map((p) => p.id))
  const childrenByParent = new Map<string, Place[]>()
  const roots: Place[] = []
  for (const place of places) {
    if (place.parentId && placeIds.has(place.parentId)) {
      const siblings = childrenByParent.get(place.parentId) || []
      siblings.push(place)
      childrenByParent.set(place.parentId, siblings)
    } else {
      roots.push(place)
    }
  }

  const renderPlace = (place: Place, depth: number) => (
    <div key={place.id} style={depth > 0 ? { marginLeft: depth * 24 } : undefined} className="space-y-3">
      <PlaceCard
        place={place}
        places={places}
        characters={characters}
        onDelete={() => onDelete(place.id)}
        onUpdateParent={(parentId) => onUpdateParent(place.id, parentId)}
        onAddImage={(file) => onAddImage(place.id, file)}
        onDeleteImage={(imageId) => onDeleteImage(place.id, imageId)}
      />
      {(childrenByParent.get(place.id) || []).map((child) => renderPlace(child, depth + 1))}
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className={`text-3xl font-serif font-bold ${TEXT_PRIMARY}`}>Orte</h2>
        <button
          onClick={onAddClick}
          className={`px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors flex items-center gap-2`}
        >
          <Plus size={20} />
          Neuer Ort
        </button>
      </div>
      <div className="space-y-3">
        {roots.map((place) => renderPlace(place, 0))}
        {places.length === 0 && (
          <div className={`text-center py-12 ${TEXT_MUTED}`}>
            <MapPin size={48} className={`mx-auto mb-4 ${TEXT_MUTED}`} />
            <p>Noch keine Orte vorhanden.</p>
            <button onClick={onAddClick} className={`mt-4 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors`}>
              Ersten Ort erstellen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
