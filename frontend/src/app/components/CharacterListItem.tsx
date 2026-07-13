'use client'

import React from 'react'
import { Character } from './types'
import { RADIUS, ACCENT, HOVER_SURFACE } from '@/lib/theme'

interface CharacterListItemProps {
  character: Character
  onClick?: () => void
}

export function CharacterListItem({ character, onClick }: CharacterListItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 ${RADIUS} ${HOVER_SURFACE} transition-colors text-left`}
    >
      <div className={`w-6 h-6 ${RADIUS} ${ACCENT} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
        {character.name.charAt(0)}
      </div>
      <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">{character.name}</span>
    </button>
  )
}