'use client'

import { MutableRefObject } from 'react'
import { RichTextEditor } from './RichTextEditor'
import { Chapter } from './types'

interface ManuscriptViewProps {
  selectedChapter: Chapter | null
  editorContent: string
  setEditorContent: (content: string) => void
  onTitleChange: (title: string) => void
  onCreateChapter: () => void
  editorSetContentRef: MutableRefObject<((content: string) => void) | null>
}

export function ManuscriptView({
  selectedChapter,
  editorContent,
  setEditorContent,
  onTitleChange,
  onCreateChapter,
  editorSetContentRef,
}: ManuscriptViewProps) {
  return (
    <div className="max-w-3xl mx-auto px-8 py-12 relative">
      {selectedChapter ? (
        <>
          <input
            type="text"
            placeholder="Kapiteltitel..."
            value={selectedChapter.title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full text-3xl font-serif font-bold bg-transparent border-none outline-none placeholder-gray-400 dark:placeholder-gray-600 text-gray-800 dark:text-gray-100 mb-8"
          />
          <RichTextEditor
            content={editorContent}
            onChange={setEditorContent}
            placeholder="Beginne zu schreiben... (Klicke auf Charakternamen für Quick-Card)"
            onEditorReady={(setter) => { editorSetContentRef.current = setter }}
          />
        </>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>Erstelle ein neues Kapitel, um zu beginnen.</p>
          <button
            onClick={onCreateChapter}
            className="mt-4 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors"
          >
            Kapitel erstellen
          </button>
        </div>
      )}
    </div>
  )
}
