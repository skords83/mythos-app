'use client'

import { X, Check, RotateCcw, Trash2 } from 'lucide-react'
import { Comment } from './types'
import { SURFACE, SURFACE_ALT, RADIUS, BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, ACCENT_TEXT, HOVER_SURFACE } from '@/lib/theme'

interface CommentsPanelProps {
  comments: Comment[]
  anchoredCommentIds: Set<string>
  onClose: () => void
  onJump: (commentId: string) => void
  onToggleResolved: (commentId: string, resolved: boolean) => void
  onDelete: (commentId: string) => void
}

export function CommentsPanel({ comments, anchoredCommentIds, onClose, onJump, onToggleResolved, onDelete }: CommentsPanelProps) {
  return (
    <div className={`w-[380px] shrink-0 ${BORDER} ${RADIUS} ${SURFACE} overflow-hidden sticky top-6 max-h-[calc(100vh-6rem)] flex flex-col`}>
      <div className={`flex items-center gap-1 p-2 border-b border-zinc-300 dark:border-zinc-700 ${SURFACE_ALT}`}>
        <span className={`px-2 py-1 text-xs font-medium ${TEXT_MUTED}`}>Kommentare</span>
        <div className="flex-1" />
        <button onClick={onClose} className={`p-1.5 ${RADIUS} ${HOVER_SURFACE} transition-colors`} title="Kommentare schließen">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 overflow-y-auto space-y-3">
        {comments.length === 0 && (
          <p className={`text-sm ${TEXT_MUTED}`}>Noch keine Kommentare in diesem Kapitel.</p>
        )}
        {comments.map((comment) => {
          const orphaned = !anchoredCommentIds.has(comment.id)
          return (
            <div
              key={comment.id}
              onClick={() => !orphaned && onJump(comment.id)}
              className={`p-3 ${BORDER} ${RADIUS} ${orphaned ? '' : `cursor-pointer ${HOVER_SURFACE}`} transition-colors`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${TEXT_SECONDARY}`}>{comment.author?.name || 'Unbekannt'}</span>
                <span className={`text-[11px] ${TEXT_MUTED}`}>
                  {new Date(comment.createdAt).toLocaleDateString('de-DE')}
                </span>
              </div>
              <p className={`text-sm ${comment.resolved ? TEXT_MUTED : TEXT_PRIMARY} line-clamp-3 mb-2`}>
                {comment.content}
              </p>
              {orphaned && (
                <span className="inline-block text-[11px] text-amber-700 dark:text-amber-400 mb-2">
                  Anker im Text nicht gefunden
                </span>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleResolved(comment.id, !comment.resolved) }}
                  className={`text-xs ${ACCENT_TEXT} hover:underline flex items-center gap-1`}
                >
                  {comment.resolved ? (
                    <>
                      <RotateCcw size={12} /> Wieder öffnen
                    </>
                  ) : (
                    <>
                      <Check size={12} /> Erledigt
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(comment.id) }}
                  className="text-xs text-zinc-400 hover:text-red-500 transition-colors flex items-center gap-1"
                  title="Kommentar löschen"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
