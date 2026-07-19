'use client'

import { useState } from 'react'
import { CommentPopoverState } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, ACCENT_TEXT, ACCENT, RADIUS, BADGE_RADIUS, BORDER, CARD_SHADOW, BUTTON_SECONDARY, INPUT } from '@/lib/theme'

interface CommentPopoverProps {
  state: CommentPopoverState
  currentUserId: string | null
  onClose: () => void
  onUpdate: (commentId: string, content: string, visibility: 'PRIVATE' | 'FAMILY') => void
  onToggleResolved: (commentId: string, resolved: boolean) => void
  onDelete: (commentId: string) => void
}

export function CommentPopover({ state, currentUserId, onClose, onUpdate, onToggleResolved, onDelete }: CommentPopoverProps) {
  const comment = state.comment
  const [editing, setEditing] = useState(false)
  const [draftContent, setDraftContent] = useState('')
  const [draftVisibility, setDraftVisibility] = useState<'PRIVATE' | 'FAMILY'>('PRIVATE')

  if (!state.visible || !comment) return null

  const isAuthor = !!currentUserId && comment.authorId === currentUserId

  const startEditing = () => {
    setDraftContent(comment.content)
    setDraftVisibility(comment.visibility)
    setEditing(true)
  }

  const saveEdit = () => {
    if (!draftContent.trim()) return
    onUpdate(comment.id, draftContent.trim(), draftVisibility)
    setEditing(false)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={`fixed z-50 bg-white dark:bg-zinc-900 ${RADIUS} ${CARD_SHADOW} ${BORDER} p-4 w-80 animate-fade-in`}
        style={{
          left: Math.min(state.position.x, typeof window !== 'undefined' ? window.innerWidth - 340 : 340),
          top: Math.min(state.position.y, typeof window !== 'undefined' ? window.innerHeight - 260 : 260),
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-9 h-9 ${RADIUS} ${ACCENT} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
            {(comment.author?.name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-serif font-bold text-sm ${TEXT_PRIMARY} truncate`}>
              {comment.author?.name || 'Unbekannt'}
            </h3>
            <span className={`text-xs ${comment.resolved ? TEXT_MUTED : ACCENT_TEXT} font-medium`}>
              {comment.resolved ? 'Erledigt' : 'Offen'}
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
            ×
          </button>
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              rows={3}
              className={`${INPUT} text-sm`}
            />
            <select
              value={draftVisibility}
              onChange={(e) => setDraftVisibility(e.target.value as 'PRIVATE' | 'FAMILY')}
              className={`${INPUT} text-sm`}
            >
              <option value="PRIVATE">Privat (nur ich)</option>
              <option value="FAMILY">Familie (alle sehen)</option>
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className={`px-3 py-1.5 text-xs ${BUTTON_SECONDARY} ${BADGE_RADIUS}`}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={!draftContent.trim()}
                className={`px-3 py-1.5 text-xs ${BADGE_RADIUS} ${ACCENT} text-white disabled:opacity-50`}
              >
                Speichern
              </button>
            </div>
          </div>
        ) : (
          <p className={`text-sm ${TEXT_SECONDARY} whitespace-pre-wrap break-words mb-3`}>{comment.content}</p>
        )}

        {!editing && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => onToggleResolved(comment.id, !comment.resolved)}
              className={`text-xs ${ACCENT_TEXT} hover:underline`}
            >
              {comment.resolved ? 'Wieder öffnen' : 'Als erledigt markieren'}
            </button>
            {isAuthor && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={startEditing}
                  className={`text-xs ${TEXT_MUTED} hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors`}
                >
                  Bearbeiten
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(comment.id)}
                  className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
                >
                  Löschen
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
