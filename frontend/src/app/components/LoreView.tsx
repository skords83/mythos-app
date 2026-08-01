'use client'

import { useState } from 'react'
import { Plus, Scroll } from 'lucide-react'
import { LoreEntryCard } from './LoreEntryCard'
import { LoreEntry } from './types'
import { TEXT_PRIMARY, ACTIVE_SURFACE, HOVER_SURFACE, RADIUS, BORDER } from '@/lib/theme'
import { ViewHeader } from './ViewHeader'
import { EmptyState } from './EmptyState'
import { HairlineButton } from './HairlineButton'

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
      <ViewHeader title="Lore-Bibel" actionLabel="Neue Weltenregel" actionIcon={Plus} onAction={onAddClick} />
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
          <EmptyState
            icon={Scroll}
            label="Noch keine Weltenregeln vorhanden"
            action={<HairlineButton emphasised onClick={onAddClick}>Erste Weltenregel erstellen</HairlineButton>}
          />
        )}
      </div>
    </div>
  )
}
