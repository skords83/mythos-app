'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Character, Place } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, ENTITY_SWATCH_TEXT, RADIUS, ICON_PROPS } from '@/lib/theme'
import { PlaceCharacterLinks } from './PlaceCharacterLinks'
import { PlaceImageGallery } from './PlaceImageGallery'
import { Card } from './Card'
import { EntityAvatar } from './EntityAvatar'
import { Chip } from './Chip'

interface PlaceCardProps {
  place: Place
  places: Place[]
  characters: Character[]
  onEdit: () => void
  onDelete: () => void
  onUpdateParent: (parentId: string | null) => void
  onAddImage: (file: File) => Promise<void>
  onDeleteImage: (imageId: string) => void
}

function isDescendant(candidateId: string, ancestorId: string, places: Place[]): boolean {
  let current = places.find((p) => p.id === candidateId)
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true
    current = places.find((p) => p.id === current!.parentId)
  }
  return false
}

export function PlaceCard({ place, places, characters, onEdit, onDelete, onUpdateParent, onAddImage, onDeleteImage }: PlaceCardProps) {
  const [editingParent, setEditingParent] = useState(false)
  const parent = place.parentId ? places.find((p) => p.id === place.parentId) : null
  const parentOptions = places.filter((p) => p.id !== place.id && !isDescendant(p.id, place.id, places))
  const coverImage = place.images[0]

  return (
    <Card>
      <div className="flex items-start gap-3">
        <EntityAvatar kind="place" label={place.name} imageUrl={coverImage?.url} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`font-semibold ${TEXT_PRIMARY} truncate`}>{place.name}</h4>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onEdit}
                className="p-1 text-gray-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <Pencil size={14} strokeWidth={ICON_PROPS.strokeWidth} />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <Trash2 size={14} strokeWidth={ICON_PROPS.strokeWidth} />
              </button>
            </div>
          </div>
          {place.description && (
            <p className={`text-sm ${TEXT_SECONDARY} mt-1 line-clamp-2`}>{place.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {place.location && <Chip>{place.location}</Chip>}
            {place.importance && (
              <Chip swatchClassName="bg-[var(--entity-place)]" className={ENTITY_SWATCH_TEXT.place}>
                {place.importance}
              </Chip>
            )}
          </div>
          <div className="mt-2">
            {editingParent ? (
              <select
                autoFocus
                value={place.parentId || ''}
                onChange={(e) => {
                  onUpdateParent(e.target.value || null)
                  setEditingParent(false)
                }}
                onBlur={() => setEditingParent(false)}
                className={`text-xs border border-zinc-300 dark:border-zinc-700 ${RADIUS} bg-stone-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 px-1 py-0.5 outline-none`}
              >
                <option value="">Kein übergeordneter Ort</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            ) : (
              <button
                onClick={() => setEditingParent(true)}
                className={`text-xs ${TEXT_MUTED} hover:${ENTITY_SWATCH_TEXT.place} transition-colors`}
              >
                {parent ? `Teil von: ${parent.name}` : '+ Übergeordneten Ort zuweisen'}
              </button>
            )}
          </div>
          <div className="mt-2">
            <PlaceCharacterLinks place={place} characters={characters} />
          </div>
          <PlaceImageGallery images={place.images} onAdd={onAddImage} onDelete={onDeleteImage} />
        </div>
      </div>
    </Card>
  )
}
