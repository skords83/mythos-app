'use client'

import React from 'react'
import { Trash2 } from 'lucide-react'
import { Character } from './types'

interface CharacterCardProps {
  character: Character
  onDelete: () => void
}

export function CharacterCard({ character, onDelete }: CharacterCardProps) {
  return (
    <div className="bg-white dark:bg-[#262626] rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 card-hover group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A7C59] to-[#6B9E7C] flex items-center justify-center text-white font-semibold flex-shrink-0">
          {character.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{character.name}</h4>
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
          {character.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{character.description}</p>
          )}
          {character.motivation && (
            <p className="text-xs text-[#4A7C59] mt-2 italic">„{character.motivation}"</p>
          )}
        </div>
      </div>
    </div>
  )
}
