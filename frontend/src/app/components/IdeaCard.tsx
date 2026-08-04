'use client'

import { Trash2, Archive, ArchiveRestore } from 'lucide-react'
import { Idea } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from '@/lib/theme'
import { Card } from './Card'
import { Chip } from './Chip'

interface IdeaCardProps {
  idea: Idea
  onEdit: () => void
  onDelete: () => void
  onArchiveToggle: () => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void
}

export function IdeaCard({ idea, onEdit, onDelete, onArchiveToggle, draggable, onDragStart, onDragEnd }: IdeaCardProps) {
  const archived = !!idea.archivedAt

  return (
    <Card onClick={onEdit} draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={`font-semibold ${TEXT_PRIMARY} truncate`}>{idea.title}</h4>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onArchiveToggle() }}
                className="p-1 text-gray-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                title={archived ? 'Wiederherstellen' : 'Archivieren'}
              >
                {archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="p-1 text-gray-400 hover:text-red-500"
                title="Löschen"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          {idea.content && (
            <p className={`text-sm ${TEXT_SECONDARY} mt-1 line-clamp-2`}>{idea.content}</p>
          )}
          {!idea.content && (
            <p className={`text-sm ${TEXT_MUTED} mt-1 italic`}>Kein Inhalt</p>
          )}
          {idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {idea.tags.map((tag) => (
                <Chip key={tag} swatchClassName="bg-[var(--entity-idea)]">{tag}</Chip>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
