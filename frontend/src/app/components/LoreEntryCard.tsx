'use client'

import { Trash2 } from 'lucide-react'
import { LoreEntry } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, ICON_PROPS } from '@/lib/theme'
import { Card } from './Card'
import { Chip } from './Chip'

interface LoreEntryCardProps {
  loreEntry: LoreEntry
  onEdit: () => void
  onDelete: () => void
}

export function LoreEntryCard({ loreEntry, onEdit, onDelete }: LoreEntryCardProps) {
  return (
    <Card onClick={onEdit}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className={`font-semibold ${TEXT_PRIMARY} truncate`}>{loreEntry.title}</h4>
              {loreEntry.category && (
                <Chip swatchClassName="bg-[var(--entity-idea)]">{loreEntry.category}</Chip>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <Trash2 size={16} strokeWidth={ICON_PROPS.strokeWidth} />
            </button>
          </div>
          {loreEntry.content && (
            <p className={`text-sm ${TEXT_SECONDARY} mt-1 line-clamp-2`}>{loreEntry.content}</p>
          )}
          {!loreEntry.content && (
            <p className={`text-sm ${TEXT_MUTED} mt-1 italic`}>Kein Inhalt</p>
          )}
        </div>
      </div>
    </Card>
  )
}
