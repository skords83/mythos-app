'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { User, MapPin, Gem } from 'lucide-react'
import { SURFACE, BORDER, RADIUS, HOVER_SURFACE, ACTIVE_SURFACE, ACCENT_TEXT, TEXT_MUTED, TEXT_PRIMARY } from '@/lib/theme'

export interface MentionSuggestionItem {
  kind: 'CHARACTER' | 'PLACE' | 'ITEM'
  id: string
  label: string
}

const KIND_ICON = { CHARACTER: User, PLACE: MapPin, ITEM: Gem }

export interface MentionSuggestionListProps {
  items: MentionSuggestionItem[]
  command: (item: MentionSuggestionItem) => void
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
      const item = items[index]
      if (!item) return
      command(item)
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
      <div className={`${SURFACE} ${BORDER} ${RADIUS} w-64 max-h-64 overflow-y-auto p-1`}>
        {items.length === 0 ? (
          <div className={`px-3 py-2 text-sm ${TEXT_MUTED}`}>Keine Treffer gefunden</div>
        ) : (
          items.map((item, index) => {
            const Icon = KIND_ICON[item.kind]
            return (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                onClick={() => selectItem(index)}
                className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm ${HOVER_SURFACE} ${
                  index === selectedIndex ? `${ACTIVE_SURFACE} ${ACCENT_TEXT}` : TEXT_PRIMARY
                }`}
              >
                <Icon size={14} className="flex-shrink-0 opacity-70" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })
        )}
      </div>
    )
  }
)
