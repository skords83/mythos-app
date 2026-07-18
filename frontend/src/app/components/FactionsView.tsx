'use client'

import { Plus, Shield } from 'lucide-react'
import { FactionCard } from './FactionCard'
import { Faction } from './types'
import { TEXT_PRIMARY, TEXT_MUTED, ACCENT, RADIUS } from '@/lib/theme'

interface FactionsViewProps {
  factions: Faction[]
  onAddClick: () => void
  onEdit: (faction: Faction) => void
  onDelete: (id: string) => void
}

export function FactionsView({ factions, onAddClick, onEdit, onDelete }: FactionsViewProps) {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className={`text-3xl font-serif font-bold ${TEXT_PRIMARY}`}>Fraktionen & Organisationen</h2>
        <button
          onClick={onAddClick}
          className={`px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors flex items-center gap-2`}
        >
          <Plus size={18} />
          Neue Fraktion
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {factions.map((faction) => (
          <FactionCard key={faction.id} faction={faction} onEdit={() => onEdit(faction)} onDelete={() => onDelete(faction.id)} />
        ))}
        {factions.length === 0 && (
          <div className={`col-span-2 text-center py-12 ${TEXT_MUTED}`}>
            <Shield className="mx-auto mb-3" size={32} />
            <p>Noch keine Fraktionen vorhanden.</p>
            <button onClick={onAddClick} className={`mt-4 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors`}>
              Erste Fraktion erstellen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
