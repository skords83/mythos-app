'use client'

import { MapPin, Plus } from 'lucide-react'
import { PlaceCard } from './PlaceCard'
import { Character, Place } from './types'
import { ViewHeader } from './ViewHeader'
import { EmptyState } from './EmptyState'
import { HairlineButton } from './HairlineButton'

interface PlacesViewProps {
  places: Place[]
  characters: Character[]
  onAddClick: () => void
  onEdit: (place: Place) => void
  onDelete: (id: string) => void
  onUpdateParent: (id: string, parentId: string | null) => void
  onAddImage: (id: string, file: File) => Promise<void>
  onDeleteImage: (id: string, imageId: string) => void
}

export function PlacesView({ places, characters, onAddClick, onEdit, onDelete, onUpdateParent, onAddImage, onDeleteImage }: PlacesViewProps) {
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
        onEdit={() => onEdit(place)}
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
      <ViewHeader title="Orte" actionLabel="Neuer Ort" actionIcon={Plus} onAction={onAddClick} />
      <div className="space-y-3">
        {roots.map((place) => renderPlace(place, 0))}
        {places.length === 0 && (
          <EmptyState
            icon={MapPin}
            label="Noch keine Orte vorhanden"
            action={<HairlineButton emphasised onClick={onAddClick}>Ersten Ort erstellen</HairlineButton>}
          />
        )}
      </div>
    </div>
  )
}
