'use client'

import { Trash2 } from 'lucide-react'
import { TimelineEvent } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, ENTITY_SWATCH_TEXT, ICON_PROPS } from '@/lib/theme'
import { Card } from './Card'
import { Chip } from './Chip'

interface TimelineEventCardProps {
  timelineEvent: TimelineEvent
  onEdit: () => void
  onDelete: () => void
}

export function TimelineEventCard({ timelineEvent, onEdit, onDelete }: TimelineEventCardProps) {
  return (
    <Card onClick={onEdit}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className={`font-semibold ${TEXT_PRIMARY} truncate`}>{timelineEvent.title}</h4>
              <Chip
                swatchClassName={timelineEvent.type === 'PLOT' ? 'bg-[var(--entity-event)]' : undefined}
                className={timelineEvent.type === 'PLOT' ? ENTITY_SWATCH_TEXT.event : TEXT_SECONDARY}
              >
                {timelineEvent.type === 'PLOT' ? 'Plot' : 'Lore'}
              </Chip>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <Trash2 size={16} strokeWidth={ICON_PROPS.strokeWidth} />
            </button>
          </div>
          {timelineEvent.date && (
            <p className={`text-xs ${TEXT_MUTED} mt-1`}>{timelineEvent.date}</p>
          )}
          {timelineEvent.description && (
            <p className={`text-sm ${TEXT_SECONDARY} mt-1 line-clamp-2`}>{timelineEvent.description}</p>
          )}
        </div>
      </div>
    </Card>
  )
}
