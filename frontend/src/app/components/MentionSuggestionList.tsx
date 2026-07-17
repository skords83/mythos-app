'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { Character } from './types'
import { SURFACE, BORDER, RADIUS, CARD_SHADOW, HOVER_SURFACE, ACTIVE_SURFACE, ACCENT_TEXT, TEXT_MUTED } from '@/lib/theme'

export interface MentionSuggestionListProps {
  items: Character[]
  command: (item: { characterId: string; label: string }) => void
}

export interface MentionSuggestionListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const MentionSuggestionList = forwardRef<MentionSuggestionListHandle, MentionSuggestionListProps>(
  function MentionSuggestionList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    const selectItem = (index: number) => {
      const character = items[index]
      if (!character) return
      command({ characterId: character.id, label: character.name })
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowDown') {
          setSelectedIndex(index => (index + 1) % items.length)
          return true
        }
        if (event.key === 'ArrowUp') {
          setSelectedIndex(index => (index + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    return (
      <div className={`${SURFACE} ${BORDER} ${RADIUS} ${CARD_SHADOW} w-64 max-h-64 overflow-y-auto p-1`}>
        {items.length === 0 ? (
          <div className={`px-3 py-2 text-sm ${TEXT_MUTED}`}>Keine Charaktere gefunden</div>
        ) : (
          items.map((character, index) => (
            <button
              key={character.id}
              type="button"
              onClick={() => selectItem(index)}
              className={`w-full text-left px-3 py-2 text-sm ${HOVER_SURFACE} ${
                index === selectedIndex ? `${ACTIVE_SURFACE} ${ACCENT_TEXT}` : ''
              }`}
            >
              {character.name}
            </button>
          ))
        )}
      </div>
    )
  }
)
