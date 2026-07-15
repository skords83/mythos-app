'use client'

import { MapPin, Plus } from 'lucide-react'
import { PlaceCard } from './PlaceCard'
import { Place } from './types'
import { TEXT_PRIMARY, TEXT_MUTED, ACCENT, RADIUS } from '@/lib/theme'

interface PlacesViewProps {
  places: Place[]
  onAddClick: () => void
  onDelete: (id: string) => void
}

export function PlacesView({ places, onAddClick, onDelete }: PlacesViewProps) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {places.map((place) => (
          <PlaceCard key={place.id} place={place} onDelete={() => onDelete(place.id)} />
        ))}
        {places.length === 0 && (
          <div className={`col-span-2 text-center py-12 ${TEXT_MUTED}`}>
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
