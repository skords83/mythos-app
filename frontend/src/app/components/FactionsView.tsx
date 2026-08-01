'use client'

import { Plus, Shield } from 'lucide-react'
import { FactionCard } from './FactionCard'
import { Faction } from './types'
import { ViewHeader } from './ViewHeader'
import { EmptyState } from './EmptyState'
import { HairlineButton } from './HairlineButton'

interface FactionsViewProps {
  factions: Faction[]
  onAddClick: () => void
  onEdit: (faction: Faction) => void
  onDelete: (id: string) => void
}

export function FactionsView({ factions, onAddClick, onEdit, onDelete }: FactionsViewProps) {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <ViewHeader title="Fraktionen & Organisationen" actionLabel="Neue Fraktion" actionIcon={Plus} onAction={onAddClick} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {factions.map((faction) => (
          <FactionCard key={faction.id} faction={faction} onEdit={() => onEdit(faction)} onDelete={() => onDelete(faction.id)} />
        ))}
        {factions.length === 0 && (
          <div className="col-span-2">
            <EmptyState
              icon={Shield}
              label="Noch keine Fraktionen vorhanden"
              action={<HairlineButton emphasised onClick={onAddClick}>Erste Fraktion erstellen</HairlineButton>}
            />
          </div>
        )}
      </div>
    </div>
  )
}
