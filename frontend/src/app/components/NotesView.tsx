'use client'

import { Plus, StickyNote } from 'lucide-react'
import { NoteCard } from './NoteCard'
import { Chapter, Note } from './types'
import { TEXT_PRIMARY, TEXT_MUTED, ACCENT, RADIUS } from '@/lib/theme'

interface NotesViewProps {
  notes: Note[]
  selectedChapter: Chapter | null
  onAddClick: () => void
  onUpdate: (id: string, title: string, content: string) => void
  onDelete: (id: string) => void
}

export function NotesView({ notes, selectedChapter, onAddClick, onUpdate, onDelete }: NotesViewProps) {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className={`text-3xl font-serif font-bold ${TEXT_PRIMARY}`}>Notizen</h2>
        <button
          onClick={onAddClick}
          disabled={!selectedChapter}
          className={`px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Plus size={20} />
          Neue Notiz
        </button>
      </div>
      {!selectedChapter ? (
        <div className={`text-center py-12 ${TEXT_MUTED}`}>
          <StickyNote size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p>Bitte wähle zuerst ein Kapitel aus, um Notizen anzuzeigen.</p>
        </div>
      ) : notes.length === 0 ? (
        <div className={`text-center py-12 ${TEXT_MUTED}`}>
          <StickyNote size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p>Noch keine Notizen für dieses Kapitel.</p>
          <p className="text-sm mt-2">Klicke auf &quot;Neue Notiz&quot; um eine zu erstellen.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onUpdate={(title, content) => onUpdate(note.id, title, content)}
              onDelete={() => onDelete(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
