'use client'

import { Plus, Users } from 'lucide-react'
import { CharacterCard } from './CharacterCard'
import { Character } from './types'
import { TEXT_PRIMARY, TEXT_MUTED, ACCENT, RADIUS } from '@/lib/theme'

interface CharactersViewProps {
  characters: Character[]
  onAddClick: () => void
  onDelete: (id: string) => void
}

export function CharactersView({ characters, onAddClick, onDelete }: CharactersViewProps) {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className={`text-3xl font-serif font-bold ${TEXT_PRIMARY}`}>Charaktere</h2>
        <button
          onClick={onAddClick}
          className={`px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors flex items-center gap-2`}
        >
          <Plus size={20} />
          Neuer Charakter
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {characters.map((char) => (
          <CharacterCard key={char.id} character={char} onDelete={() => onDelete(char.id)} />
        ))}
        {characters.length === 0 && (
          <div className={`col-span-2 text-center py-12 ${TEXT_MUTED}`}>
            <Users size={48} className={`mx-auto mb-4 ${TEXT_MUTED}`} />
            <p>Noch keine Charaktere vorhanden.</p>
            <button onClick={onAddClick} className={`mt-4 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors`}>
              Ersten Charakter erstellen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
