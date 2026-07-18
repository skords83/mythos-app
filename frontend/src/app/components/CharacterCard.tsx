'use client'

import React from 'react'
import { Trash2 } from 'lucide-react'
import { Character } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, ACCENT_TEXT, RADIUS, BORDER, CARD_SHADOW, ACCENT } from '@/lib/theme'

interface CharacterCardProps {
  character: Character
  onEdit: () => void
  onDelete: () => void
}

export function CharacterCard({ character, onEdit, onDelete }: CharacterCardProps) {
  const preview = character.appearance || character.personality || character.backstory

  return (
    <div
      onClick={onEdit}
      className={`bg-white dark:bg-zinc-900 ${RADIUS} p-4 ${BORDER} ${CARD_SHADOW} group cursor-pointer`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${RADIUS} ${ACCENT} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
          {character.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`font-semibold ${TEXT_PRIMARY} truncate`}>{character.name}</h4>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
          {preview && (
            <p className={`text-sm ${TEXT_SECONDARY} mt-1 line-clamp-2`}>{preview}</p>
          )}
          {character.motivation && (
            <p className={`text-xs ${ACCENT_TEXT} mt-2 italic`}>„{character.motivation}"</p>
          )}
        </div>
      </div>
    </div>
  )
}
