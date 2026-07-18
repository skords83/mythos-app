'use client'

import { Plus, Gem } from 'lucide-react'
import { ItemCard } from './ItemCard'
import { Item } from './types'
import { TEXT_PRIMARY, TEXT_MUTED, ACCENT, RADIUS } from '@/lib/theme'

interface ItemsViewProps {
  items: Item[]
  onAddClick: () => void
  onEdit: (item: Item) => void
  onDelete: (id: string) => void
}

export function ItemsView({ items, onAddClick, onEdit, onDelete }: ItemsViewProps) {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className={`text-3xl font-serif font-bold ${TEXT_PRIMARY}`}>Items & Artefakte</h2>
        <button
          onClick={onAddClick}
          className={`px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors flex items-center gap-2`}
        >
          <Plus size={18} />
          Neues Item
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)} />
        ))}
        {items.length === 0 && (
          <div className={`col-span-2 text-center py-12 ${TEXT_MUTED}`}>
            <Gem className="mx-auto mb-3" size={32} />
            <p>Noch keine Items vorhanden.</p>
            <button onClick={onAddClick} className={`mt-4 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors`}>
              Erstes Item erstellen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
