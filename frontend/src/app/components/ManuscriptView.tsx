'use client'

import { MutableRefObject, useState } from 'react'
import { RichTextEditor } from './RichTextEditor'
import { ReferencePanel } from './ReferencePanel'
import { Chapter, Character, Place } from './types'
import { ChapterDraft } from '@/lib/chapterDraftStore'
import { DraftRecoveryBanner } from './DraftRecoveryBanner'
import { TEXT_PRIMARY, TEXT_MUTED, ACCENT, RADIUS } from '@/lib/theme'

interface ManuscriptViewProps {
  selectedChapter: Chapter | null
  chapters: Chapter[]
  places: Place[]
  editorContent: string
  setEditorContent: (content: string) => void
  onTitleChange: (title: string) => void
  onCreateChapter: () => void
  editorSetContentRef: MutableRefObject<((content: string) => void) | null>
  pendingDraft: ChapterDraft | null
  onRestoreDraft: () => void
  onDiscardDraft: () => void
  characters: Character[]
  onMentionClick: (characterId: string, position: { x: number; y: number }) => void
  focusMode: boolean
}

export function ManuscriptView({
  selectedChapter,
  chapters,
  places,
  editorContent,
  setEditorContent,
  onTitleChange,
  onCreateChapter,
  editorSetContentRef,
  pendingDraft,
  onRestoreDraft,
  onDiscardDraft,
  characters,
  onMentionClick,
  focusMode,
}: ManuscriptViewProps) {
  const [splitScreenOpen, setSplitScreenOpen] = useState(false)

  return (
    <div className={`${splitScreenOpen ? 'max-w-6xl' : 'max-w-3xl'} mx-auto px-8 py-12 relative`}>
      {selectedChapter ? (
        <div className={splitScreenOpen ? 'flex gap-6 items-start' : ''}>
          <div className={splitScreenOpen ? 'flex-1 min-w-0' : ''}>
            {pendingDraft && pendingDraft.chapterId === selectedChapter.id && (
              <DraftRecoveryBanner draft={pendingDraft} onRestore={onRestoreDraft} onDiscard={onDiscardDraft} />
            )}
            <input
              type="text"
              placeholder="Kapiteltitel..."
              value={selectedChapter.title}
              onChange={(e) => onTitleChange(e.target.value)}
              className={`w-full text-3xl font-serif font-bold bg-transparent border-none outline-none placeholder-zinc-400 dark:placeholder-zinc-600 ${TEXT_PRIMARY} mb-8`}
            />
            <RichTextEditor
              content={editorContent}
              onChange={setEditorContent}
              placeholder="Beginne zu schreiben... (Klicke auf Charakternamen für Quick-Card)"
              onEditorReady={(setter) => { editorSetContentRef.current = setter }}
              characters={characters}
              onMentionClick={onMentionClick}
              splitScreenActive={splitScreenOpen}
              onToggleSplitScreen={() => setSplitScreenOpen((open) => !open)}
              typewriterMode={focusMode}
            />
          </div>
          {splitScreenOpen && (
            <ReferencePanel
              chapters={chapters}
              characters={characters}
              places={places}
              currentChapterId={selectedChapter.id}
              onClose={() => setSplitScreenOpen(false)}
            />
          )}
        </div>
      ) : (
        <div className={`text-center py-12 ${TEXT_MUTED}`}>
          <p>Erstelle ein neues Kapitel, um zu beginnen.</p>
          <button
            onClick={onCreateChapter}
            className={`mt-4 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors`}
          >
            Kapitel erstellen
          </button>
        </div>
      )}
    </div>
  )
}
