'use client'

import React from 'react'
import { Trash2 } from 'lucide-react'
import { Faction } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, ACCENT_TEXT, RADIUS, BORDER, ACCENT } from '@/lib/theme'

interface FactionCardProps {
  faction: Faction
  onEdit: () => void
  onDelete: () => void
}

export function FactionCard({ faction, onEdit, onDelete }: FactionCardProps) {
  return (
    <div
      onClick={onEdit}
      className={`bg-white dark:bg-zinc-900 ${RADIUS} p-4 ${BORDER} group cursor-pointer`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${RADIUS} ${ACCENT} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
          {faction.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`font-semibold ${TEXT_PRIMARY} truncate`}>{faction.name}</h4>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={16} />
            </button>
          </div>
          {faction.description && (
            <p className={`text-sm ${TEXT_SECONDARY} mt-1 line-clamp-2`}>{faction.description}</p>
          )}
          {faction.goal && (
            <p className={`text-xs ${ACCENT_TEXT} mt-2 italic`}>„{faction.goal}"</p>
          )}
        </div>
      </div>
    </div>
  )
}
