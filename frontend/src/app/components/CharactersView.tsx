'use client'

import { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { CharacterCard } from './CharacterCard'
import { Character } from './types'
import { TEXT_PRIMARY, ACTIVE_SURFACE, HOVER_SURFACE, RADIUS, BORDER } from '@/lib/theme'
import { ViewHeader } from './ViewHeader'
import { EmptyState } from './EmptyState'
import { HairlineButton } from './HairlineButton'

type RoleFilter = 'ALL' | 'PROTAGONIST' | 'ANTAGONIST' | 'MENTOR'

const ROLE_FILTER_LABELS: Record<RoleFilter, string> = {
  ALL: 'Alle',
  PROTAGONIST: 'Protagonist:in',
  ANTAGONIST: 'Antagonist:in',
  MENTOR: 'Mentor:in',
}

interface CharactersViewProps {
  characters: Character[]
  onAddClick: () => void
  onEdit: (character: Character) => void
  onDelete: (id: string) => void
}

export function CharactersView({ characters, onAddClick, onEdit, onDelete }: CharactersViewProps) {
  const [filter, setFilter] = useState<RoleFilter>('ALL')

  const filteredCharacters = characters.filter((c) => filter === 'ALL' || c.role === filter)

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <ViewHeader title="Charaktere" actionLabel="Neuer Charakter" actionIcon={Plus} onAction={onAddClick} />
      <div className={`flex gap-1 mb-6 p-1 ${RADIUS} ${BORDER} w-fit`}>
        {(['ALL', 'PROTAGONIST', 'ANTAGONIST', 'MENTOR'] as RoleFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm ${RADIUS} transition-colors ${
              filter === f ? ACTIVE_SURFACE : HOVER_SURFACE
            } ${TEXT_PRIMARY}`}
          >
            {ROLE_FILTER_LABELS[f]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCharacters.map((char) => (
          <CharacterCard key={char.id} character={char} onEdit={() => onEdit(char)} onDelete={() => onDelete(char.id)} />
        ))}
        {filteredCharacters.length === 0 && (
          <div className="col-span-2">
            <EmptyState
              icon={Users}
              label="Noch keine Charaktere vorhanden"
              action={<HairlineButton emphasised onClick={onAddClick}>Ersten Charakter erstellen</HairlineButton>}
            />
          </div>
        )}
      </div>
    </div>
  )
}
