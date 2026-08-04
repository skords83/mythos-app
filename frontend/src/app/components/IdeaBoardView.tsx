'use client'

import { useState } from 'react'
import { Plus, Lightbulb, Archive } from 'lucide-react'
import { IdeaCard } from './IdeaCard'
import { Idea, IdeaStatus } from './types'
import { TEXT_PRIMARY, TEXT_MUTED, ACTIVE_SURFACE, HOVER_SURFACE, RADIUS, BORDER, MONO_LABEL_MUTED } from '@/lib/theme'
import { ViewHeader } from './ViewHeader'
import { EmptyState } from './EmptyState'
import { HairlineButton } from './HairlineButton'

interface IdeaBoardViewProps {
  ideas: Idea[]
  onAddClick: () => void
  onEdit: (idea: Idea) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: IdeaStatus) => void
  onArchiveToggle: (id: string, archived: boolean) => void
}

const COLUMNS: { status: IdeaStatus; label: string }[] = [
  { status: 'IDEE', label: 'Idee' },
  { status: 'IN_ARBEIT', label: 'In Arbeit' },
  { status: 'UMGESETZT', label: 'Umgesetzt' },
]

export function IdeaBoardView({ ideas, onAddClick, onEdit, onDelete, onStatusChange, onArchiveToggle }: IdeaBoardViewProps) {
  const [filter, setFilter] = useState('ALL')
  const [showArchived, setShowArchived] = useState(false)
  const [dragOverStatus, setDragOverStatus] = useState<IdeaStatus | null>(null)

  const active = ideas.filter((i) => !i.archivedAt)
  const archived = ideas.filter((i) => i.archivedAt)

  const tags = Array.from(new Set(active.flatMap((i) => i.tags)))
  const filtered = active.filter((i) => filter === 'ALL' || i.tags.includes(filter))

  const handleDrop = (status: IdeaStatus) => (e: React.DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (id) onStatusChange(id, status)
    setDragOverStatus(null)
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      <ViewHeader title="Ideenboard" actionLabel="Neue Idee" actionIcon={Plus} onAction={onAddClick} />

      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        {tags.length > 0 && (
          <div className={`flex gap-1 p-1 ${RADIUS} ${BORDER} w-fit flex-wrap`}>
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 text-sm ${RADIUS} transition-colors ${
                filter === 'ALL' ? ACTIVE_SURFACE : HOVER_SURFACE
              } ${TEXT_PRIMARY}`}
            >
              Alle
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilter(tag)}
                className={`px-3 py-1.5 text-sm ${RADIUS} transition-colors ${
                  filter === tag ? ACTIVE_SURFACE : HOVER_SURFACE
                } ${TEXT_PRIMARY}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
        {archived.length > 0 && (
          <HairlineButton onClick={() => setShowArchived((v) => !v)}>
            <Archive size={16} />
            {showArchived ? 'Archiv ausblenden' : `Archiv anzeigen (${archived.length})`}
          </HairlineButton>
        )}
      </div>

      {active.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          label="Noch keine Ideen vorhanden"
          action={<HairlineButton emphasised onClick={onAddClick}>Erste Idee erstellen</HairlineButton>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map(({ status, label }) => {
            const columnIdeas = filtered.filter((i) => i.status === status)
            return (
              <div
                key={status}
                onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status) }}
                onDragLeave={() => setDragOverStatus((s) => (s === status ? null : s))}
                onDrop={handleDrop(status)}
                className={`p-3 ${RADIUS} ${BORDER} min-h-[12rem] transition-colors ${
                  dragOverStatus === status ? ACTIVE_SURFACE : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className={MONO_LABEL_MUTED}>{label}</span>
                  <span className={`text-xs ${TEXT_MUTED}`}>{columnIdeas.length}</span>
                </div>
                <div className="space-y-3">
                  {columnIdeas.map((idea) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      onEdit={() => onEdit(idea)}
                      onDelete={() => onDelete(idea.id)}
                      onArchiveToggle={() => onArchiveToggle(idea.id, true)}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', idea.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showArchived && archived.length > 0 && (
        <div className="mt-10">
          <span className={MONO_LABEL_MUTED}>Archiviert</span>
          <div className="space-y-3 mt-3">
            {archived.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onEdit={() => onEdit(idea)}
                onDelete={() => onDelete(idea.id)}
                onArchiveToggle={() => onArchiveToggle(idea.id, false)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
