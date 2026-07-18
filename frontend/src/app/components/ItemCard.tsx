'use client'

import React from 'react'
import { Trash2 } from 'lucide-react'
import { Item } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, ACCENT_TEXT, RADIUS, BORDER, CARD_SHADOW, ACCENT } from '@/lib/theme'

interface ItemCardProps {
  item: Item
  onEdit: () => void
  onDelete: () => void
}

export function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const preview = item.description || item.origin

  return (
    <div
      onClick={onEdit}
      className={`bg-white dark:bg-zinc-900 ${RADIUS} p-4 ${BORDER} ${CARD_SHADOW} group cursor-pointer`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${RADIUS} ${ACCENT} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
          {item.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`font-semibold ${TEXT_PRIMARY} truncate`}>{item.name}</h4>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={16} />
            </button>
          </div>
          {preview && (
            <p className={`text-sm ${TEXT_SECONDARY} mt-1 line-clamp-2`}>{preview}</p>
          )}
          {item.significance && (
            <p className={`text-xs ${ACCENT_TEXT} mt-2 italic`}>„{item.significance}"</p>
          )}
        </div>
      </div>
    </div>
  )
}
