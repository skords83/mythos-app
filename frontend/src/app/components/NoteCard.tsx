'use client'

import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Note } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, ACCENT_TEXT, RADIUS, BORDER, CARD_SHADOW, ACCENT } from '@/lib/theme'

interface NoteCardProps {
  note: Note
  onUpdate: (title: string, content: string) => void
  onDelete: () => void
}

export function NoteCard({ note, onUpdate, onDelete }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(note.title)
  const [editContent, setEditContent] = useState(note.content)

  const handleSave = () => {
    onUpdate(editTitle, editContent)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTitle(note.title)
    setEditContent(note.content)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className={`bg-white dark:bg-zinc-900 ${RADIUS} p-4 ${BORDER} ${CARD_SHADOW}`}>
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className={`w-full text-lg font-semibold bg-transparent border-none outline-none ${TEXT_PRIMARY} mb-2`}
          placeholder="Titel..."
        />
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className={`w-full min-h-[100px] bg-transparent border border-zinc-300 dark:border-zinc-600 ${RADIUS} p-2 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-600`}
          placeholder="Notiz..."
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSave}
            className={`px-3 py-1.5 ${ACCENT} text-white ${RADIUS} text-sm`}
          >
            Speichern
          </button>
          <button
            onClick={handleCancel}
            className={`px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 ${RADIUS} text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm`}
          >
            Abbrechen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-zinc-900 ${RADIUS} p-4 ${BORDER} ${CARD_SHADOW} group`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className={`font-semibold ${TEXT_PRIMARY}`}>{note.title}</h4>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            title="Bearbeiten"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Löschen"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <p className={`text-sm ${TEXT_SECONDARY} line-clamp-3`}>{note.content}</p>
      <p className={`text-xs ${TEXT_MUTED} mt-2`}>
        {new Date(note.updatedAt).toLocaleDateString('de-DE')}
      </p>
    </div>
  )
}
