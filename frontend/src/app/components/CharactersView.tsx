'use client'

import { useState } from 'react'
import Link from 'next/link'
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
  projectId?: string
  universeId?: string | null
  characters: Character[]
  onAddClick: () => void
  onEdit: (character: Character) => void
  onDelete: (id: string) => void
}

export function CharactersView({ projectId, universeId, characters, onAddClick, onEdit, onDelete }: CharactersViewProps) {
  const [filter, setFilter] = useState<RoleFilter>('ALL')

  const filteredCharacters = characters.filter((c) => filter === 'ALL' || c.role === filter)

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
      <ViewHeader className="flex-wrap gap-3" title="Charaktere" actionLabel="Neuer Charakter" actionIcon={Plus} onAction={onAddClick} />
      <p className="text-sm text-[var(--text-secondary)] mb-4">In diesem Buch verwendet: {characters.length}. Die Liste enthält nur Figuren dieses Buchs.</p>
      {universeId && <p className="mb-6 text-sm"><Link className="underline underline-offset-4" href={`/universes?projectId=${encodeURIComponent(projectId!)}&universeId=${encodeURIComponent(universeId)}&entityType=CHARACTER`}>Figuren im Universum auswählen · Buchverwendung verwalten</Link><br />Figuren im Universum werden erst nach ausdrücklicher Zuordnung hier angezeigt.</p>}
      <div className={`flex flex-wrap gap-1 mb-6 p-1 ${RADIUS} ${BORDER} w-fit`}>
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
          <div className="col-span-full">
            <EmptyState
              icon={Users}
              label="Keine Charaktere in dieser Buchauswahl"
              action={<HairlineButton emphasised onClick={onAddClick}>Ersten Charakter erstellen</HairlineButton>}
            />
          </div>
        )}
      </div>
    </div>
  )
}
