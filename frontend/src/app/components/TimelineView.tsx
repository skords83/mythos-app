'use client'

import { useState } from 'react'
import { Plus, Clock } from 'lucide-react'
import { TimelineEventCard } from './TimelineEventCard'
import { TimelineEvent } from './types'
import { TEXT_PRIMARY, TEXT_MUTED, ACCENT, ACTIVE_SURFACE, HOVER_SURFACE, RADIUS, BORDER } from '@/lib/theme'

type FilterType = 'ALL' | 'LORE' | 'PLOT'

interface TimelineViewProps {
  timelineEvents: TimelineEvent[]
  onAddClick: () => void
  onEdit: (timelineEvent: TimelineEvent) => void
  onDelete: (id: string) => void
}

export function TimelineView({ timelineEvents, onAddClick, onEdit, onDelete }: TimelineViewProps) {
  const [filter, setFilter] = useState<FilterType>('ALL')

  const filteredEvents = timelineEvents.filter((e) => filter === 'ALL' || e.type === filter)

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className={`text-3xl font-serif font-bold ${TEXT_PRIMARY}`}>Der Zeitstrahl</h2>
        <button
          onClick={onAddClick}
          className={`px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors flex items-center gap-2`}
        >
          <Plus size={18} />
          Neues Ereignis
        </button>
      </div>
      <div className={`flex gap-1 mb-6 p-1 ${RADIUS} ${BORDER} w-fit`}>
        {(['ALL', 'PLOT', 'LORE'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm ${RADIUS} transition-colors ${
              filter === f ? ACTIVE_SURFACE : HOVER_SURFACE
            } ${TEXT_PRIMARY}`}
          >
            {f === 'ALL' ? 'Alle' : f === 'PLOT' ? 'Plot' : 'Lore'}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filteredEvents.map((event) => (
          <TimelineEventCard
            key={event.id}
            timelineEvent={event}
            onEdit={() => onEdit(event)}
            onDelete={() => onDelete(event.id)}
          />
        ))}
        {filteredEvents.length === 0 && (
          <div className={`text-center py-12 ${TEXT_MUTED}`}>
            <Clock className="mx-auto mb-3" size={32} />
            <p>Noch keine Ereignisse vorhanden.</p>
            <button onClick={onAddClick} className={`mt-4 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors`}>
              Erstes Ereignis erstellen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
