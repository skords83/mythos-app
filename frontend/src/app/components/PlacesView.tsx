'use client'

import { MapPin, Plus } from 'lucide-react'
import { PlaceCard } from './PlaceCard'
import { Place } from './types'

interface PlacesViewProps {
  places: Place[]
  onAddClick: () => void
  onDelete: (id: string) => void
}

export function PlacesView({ places, onAddClick, onDelete }: PlacesViewProps) {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100">Orte</h2>
        <button
          onClick={onAddClick}
          className="px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors flex items-center gap-2"
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
          <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">
            <MapPin size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>Noch keine Orte vorhanden.</p>
            <button onClick={onAddClick} className="mt-4 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors">
              Ersten Ort erstellen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
