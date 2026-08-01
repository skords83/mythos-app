'use client'

import { useState } from 'react'
import { HairlineButton } from './HairlineButton'
import { RADIUS, BORDER, TEXT_PRIMARY, INPUT } from '@/lib/theme'

interface NewCommentInputProps {
  position: { x: number; y: number }
  onCancel: () => void
  onSubmit: (content: string, visibility: 'PRIVATE' | 'FAMILY') => void
}

export function NewCommentInput({ position, onCancel, onSubmit }: NewCommentInputProps) {
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FAMILY'>('PRIVATE')

  const submit = () => {
    if (!content.trim()) return
    onSubmit(content.trim(), visibility)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onCancel} />
      <div
        className={`fixed z-50 bg-white dark:bg-zinc-900 ${RADIUS} ${BORDER} p-4 w-80 animate-fade-in`}
        style={{
          left: Math.min(position.x, typeof window !== 'undefined' ? window.innerWidth - 340 : 340),
          top: Math.min(position.y, typeof window !== 'undefined' ? window.innerHeight - 240 : 240),
        }}
      >
        <h3 className={`font-display font-light text-sm ${TEXT_PRIMARY} mb-2`}>Kommentar hinzufügen</h3>
        <textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Anmerkung zu dieser Textstelle..."
          rows={3}
          className={`${INPUT} text-sm mb-2`}
        />
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as 'PRIVATE' | 'FAMILY')}
          className={`${INPUT} text-sm mb-3`}
        >
          <option value="PRIVATE">Privat (nur ich)</option>
          <option value="FAMILY">Familie (alle sehen)</option>
        </select>
        <div className="flex justify-end gap-2">
          <HairlineButton type="button" onClick={onCancel} className="px-3 py-1.5 text-xs">
            Abbrechen
          </HairlineButton>
          <HairlineButton
            type="button"
            emphasised
            onClick={submit}
            disabled={!content.trim()}
            className="px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Kommentieren
          </HairlineButton>
        </div>
      </div>
    </>
  )
}
