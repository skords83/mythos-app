'use client'

import { Trash2 } from 'lucide-react'
import { Faction } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, ENTITY_SWATCH_TEXT, ICON_PROPS } from '@/lib/theme'
import { Card } from './Card'
import { EntityAvatar } from './EntityAvatar'

interface FactionCardProps {
  faction: Faction
  onEdit: () => void
  onDelete: () => void
}

export function FactionCard({ faction, onEdit, onDelete }: FactionCardProps) {
  return (
    <Card onClick={onEdit}>
      <div className="flex items-start gap-3">
        <EntityAvatar kind="group" label={faction.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`font-semibold ${TEXT_PRIMARY} truncate`}>{faction.name}</h4>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={16} strokeWidth={ICON_PROPS.strokeWidth} />
            </button>
          </div>
          {faction.description && (
            <p className={`text-sm ${TEXT_SECONDARY} mt-1 line-clamp-2`}>{faction.description}</p>
          )}
          {faction.goal && (
            <p className={`text-xs ${ENTITY_SWATCH_TEXT.group} mt-2 italic`}>„{faction.goal}"</p>
          )}
        </div>
      </div>
    </Card>
  )
}
