'use client'

import { Trash2 } from 'lucide-react'
import { Character } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, ENTITY_SWATCH_TEXT, ICON_PROPS } from '@/lib/theme'
import { Card } from './Card'
import { EntityAvatar } from './EntityAvatar'
import { Chip } from './Chip'

interface CharacterCardProps {
  character: Character
  onEdit: () => void
  onDelete: () => void
}

const ROLE_LABELS: Record<'PROTAGONIST' | 'ANTAGONIST' | 'MENTOR', string> = {
  PROTAGONIST: 'Protagonist:in',
  ANTAGONIST: 'Antagonist:in',
  MENTOR: 'Mentor:in',
}

export function CharacterCard({ character, onEdit, onDelete }: CharacterCardProps) {
  const preview = character.appearance || character.personality || character.backstory

  return (
    <Card onClick={onEdit}>
      <div className="flex items-start gap-3">
        <EntityAvatar kind="person" label={character.name} imageUrl={character.avatarUrl} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`font-semibold ${TEXT_PRIMARY} truncate`}>{character.name}</h4>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} strokeWidth={ICON_PROPS.strokeWidth} />
            </button>
          </div>
          {preview && (
            <p className={`text-sm ${TEXT_SECONDARY} mt-1 line-clamp-2`}>{preview}</p>
          )}
          {character.role && (
            <div className="flex flex-wrap gap-2 mt-2">
              <Chip swatchClassName="bg-[var(--entity-person)]" className={ENTITY_SWATCH_TEXT.person}>
                {ROLE_LABELS[character.role]}
              </Chip>
            </div>
          )}
          {character.motivation && (
            <p className={`text-xs ${ENTITY_SWATCH_TEXT.person} mt-2 italic`}>„{character.motivation}"</p>
          )}
        </div>
      </div>
    </Card>
  )
}
