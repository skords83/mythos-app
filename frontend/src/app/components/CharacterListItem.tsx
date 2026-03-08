'use client'

import React from 'react'
import { Character } from './types'

interface CharacterListItemProps {
  character: Character
  onClick?: () => void
}

export function CharacterListItem({ character, onClick }: CharacterListItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
    >
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4A7C59] to-[#6B9E7C] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
        {character.name.charAt(0)}
      </div>
      <span className="truncate text-sm text-gray-700 dark:text-gray-300">{character.name}</span>
    </button>
  )
}