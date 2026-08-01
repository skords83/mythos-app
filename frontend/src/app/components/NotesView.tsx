'use client'

import { Plus, StickyNote } from 'lucide-react'
import { NoteCard } from './NoteCard'
import { Chapter, Note } from './types'
import { ViewHeader } from './ViewHeader'
import { EmptyState } from './EmptyState'

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
      <ViewHeader
        title="Notizen"
        actionLabel="Neue Notiz"
        actionIcon={Plus}
        onAction={onAddClick}
        actionDisabled={!selectedChapter}
      />
      {!selectedChapter ? (
        <EmptyState icon={StickyNote} label="Bitte wähle zuerst ein Kapitel aus, um Notizen anzuzeigen" />
      ) : notes.length === 0 ? (
        <EmptyState icon={StickyNote} label={'Noch keine Notizen für dieses Kapitel — „Neue Notiz" erstellt eine.'} />
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
