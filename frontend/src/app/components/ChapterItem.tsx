'use client'

import React from 'react'
import { Trash2 } from 'lucide-react'
import { Chapter } from './types'
import { RADIUS, TEXT_MUTED } from '@/lib/theme'

interface ChapterItemProps {
  chapter: Chapter
  active: boolean
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}

export function ChapterItem({ chapter, active, onClick, onDelete }: ChapterItemProps) {
  return (
    <div className={`group relative w-full text-left px-4 py-3 ${RADIUS} transition-colors flex items-center justify-between ${
      active
        ? 'text-zinc-900 dark:text-zinc-100 border-l-2 border-indigo-600'
        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 border-l-2 border-transparent'
    }`}>
      <button onClick={onClick} className="flex-1 text-left min-w-0">
        <div className="font-medium truncate">{chapter.title}</div>
        <div className={`text-xs ${TEXT_MUTED} mt-1`}>
          {chapter.wordCount} Wörter
        </div>
      </button>
      <button
        onClick={onDelete}
        className={`p-1 ${TEXT_MUTED} hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1`}
        title="Kapitel löschen"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
