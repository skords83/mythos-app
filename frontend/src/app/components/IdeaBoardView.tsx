'use client'

import { useState } from 'react'
import { Plus, Lightbulb } from 'lucide-react'
import { IdeaCard } from './IdeaCard'
import { Idea } from './types'
import { TEXT_PRIMARY, ACTIVE_SURFACE, HOVER_SURFACE, RADIUS, BORDER } from '@/lib/theme'
import { ViewHeader } from './ViewHeader'
import { EmptyState } from './EmptyState'
import { HairlineButton } from './HairlineButton'

interface IdeaBoardViewProps {
  ideas: Idea[]
  onAddClick: () => void
  onEdit: (idea: Idea) => void
  onDelete: (id: string) => void
}

export function IdeaBoardView({ ideas, onAddClick, onEdit, onDelete }: IdeaBoardViewProps) {
  const [filter, setFilter] = useState('ALL')

  const tags = Array.from(new Set(ideas.flatMap((i) => i.tags)))
  const filteredIdeas = ideas.filter((i) => filter === 'ALL' || i.tags.includes(filter))

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <ViewHeader title="Ideenboard" actionLabel="Neue Idee" actionIcon={Plus} onAction={onAddClick} />
      {tags.length > 0 && (
        <div className={`flex gap-1 mb-6 p-1 ${RADIUS} ${BORDER} w-fit flex-wrap`}>
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
      <div className="space-y-3">
        {filteredIdeas.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            onEdit={() => onEdit(idea)}
            onDelete={() => onDelete(idea.id)}
          />
        ))}
        {filteredIdeas.length === 0 && (
          <EmptyState
            icon={Lightbulb}
            label="Noch keine Ideen vorhanden"
            action={<HairlineButton emphasised onClick={onAddClick}>Erste Idee erstellen</HairlineButton>}
          />
        )}
      </div>
    </div>
  )
}
