'use client'

import { Plus, Gem } from 'lucide-react'
import { ItemCard } from './ItemCard'
import { Item } from './types'
import { ViewHeader } from './ViewHeader'
import { EmptyState } from './EmptyState'
import { HairlineButton } from './HairlineButton'

interface ItemsViewProps {
  items: Item[]
  onAddClick: () => void
  onEdit: (item: Item) => void
  onDelete: (id: string) => void
}

export function ItemsView({ items, onAddClick, onEdit, onDelete }: ItemsViewProps) {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <ViewHeader title="Items & Artefakte" actionLabel="Neues Item" actionIcon={Plus} onAction={onAddClick} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)} />
        ))}
        {items.length === 0 && (
          <div className="col-span-2">
            <EmptyState
              icon={Gem}
              label="Noch keine Items vorhanden"
              action={<HairlineButton emphasised onClick={onAddClick}>Erstes Item erstellen</HairlineButton>}
            />
          </div>
        )}
      </div>
    </div>
  )
}
