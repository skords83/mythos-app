'use client'

import { Plus, Users } from 'lucide-react'
import { CharacterCard } from './CharacterCard'
import { Character } from './types'
import { ViewHeader } from './ViewHeader'
import { EmptyState } from './EmptyState'
import { HairlineButton } from './HairlineButton'

interface CharactersViewProps {
  characters: Character[]
  onAddClick: () => void
  onEdit: (character: Character) => void
  onDelete: (id: string) => void
}

export function CharactersView({ characters, onAddClick, onEdit, onDelete }: CharactersViewProps) {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <ViewHeader title="Charaktere" actionLabel="Neuer Charakter" actionIcon={Plus} onAction={onAddClick} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {characters.map((char) => (
          <CharacterCard key={char.id} character={char} onEdit={() => onEdit(char)} onDelete={() => onDelete(char.id)} />
        ))}
        {characters.length === 0 && (
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
