'use client'

import { useState } from 'react'
import { Trash2, Pencil } from 'lucide-react'
import { Note } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, RADIUS, ICON_PROPS } from '@/lib/theme'
import { Card } from './Card'
import { HairlineButton } from './HairlineButton'

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
      <Card>
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
          <HairlineButton emphasised onClick={handleSave} className="text-sm py-1.5">
            Speichern
          </HairlineButton>
          <HairlineButton onClick={handleCancel} className="text-sm py-1.5">
            Abbrechen
          </HairlineButton>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-start justify-between mb-2">
        <h4 className={`font-semibold ${TEXT_PRIMARY}`}>{note.title}</h4>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            title="Bearbeiten"
          >
            <Pencil size={14} strokeWidth={ICON_PROPS.strokeWidth} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Löschen"
          >
            <Trash2 size={14} strokeWidth={ICON_PROPS.strokeWidth} />
          </button>
        </div>
      </div>
      <p className={`text-sm ${TEXT_SECONDARY} line-clamp-3`}>{note.content}</p>
      <p className={`text-xs ${TEXT_MUTED} mt-2`}>
        {new Date(note.updatedAt).toLocaleDateString('de-DE')}
      </p>
    </Card>
  )
}
