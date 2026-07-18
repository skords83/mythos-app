'use client'

import { useState } from 'react'
import { Plus, Scroll } from 'lucide-react'
import { LoreEntryCard } from './LoreEntryCard'
import { LoreEntry } from './types'
import { TEXT_PRIMARY, TEXT_MUTED, ACCENT, ACTIVE_SURFACE, HOVER_SURFACE, RADIUS, BORDER } from '@/lib/theme'

interface LoreViewProps {
  loreEntries: LoreEntry[]
  onAddClick: () => void
  onEdit: (loreEntry: LoreEntry) => void
  onDelete: (id: string) => void
}

export function LoreView({ loreEntries, onAddClick, onEdit, onDelete }: LoreViewProps) {
  const [filter, setFilter] = useState('ALL')

  const categories = Array.from(
    new Set(loreEntries.map((e) => e.category).filter((c): c is string => !!c))
  )
  const filteredEntries = loreEntries.filter((e) => filter === 'ALL' || e.category === filter)

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className={`text-3xl font-serif font-bold ${TEXT_PRIMARY}`}>Lore-Bibel</h2>
        <button
          onClick={onAddClick}
          className={`px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors flex items-center gap-2`}
        >
          <Plus size={18} />
          Neue Weltenregel
        </button>
      </div>
      {categories.length > 0 && (
        <div className={`flex gap-1 mb-6 p-1 ${RADIUS} ${BORDER} w-fit flex-wrap`}>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 text-sm ${RADIUS} transition-colors ${
              filter === 'ALL' ? ACTIVE_SURFACE : HOVER_SURFACE
            } ${TEXT_PRIMARY}`}
          >
            Alle
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-1.5 text-sm ${RADIUS} transition-colors ${
                filter === c ? ACTIVE_SURFACE : HOVER_SURFACE
              } ${TEXT_PRIMARY}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-3">
        {filteredEntries.map((entry) => (
          <LoreEntryCard
            key={entry.id}
            loreEntry={entry}
            onEdit={() => onEdit(entry)}
            onDelete={() => onDelete(entry.id)}
          />
        ))}
        {filteredEntries.length === 0 && (
          <div className={`text-center py-12 ${TEXT_MUTED}`}>
            <Scroll className="mx-auto mb-3" size={32} />
            <p>Noch keine Weltenregeln vorhanden.</p>
            <button onClick={onAddClick} className={`mt-4 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors`}>
              Erste Weltenregel erstellen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
