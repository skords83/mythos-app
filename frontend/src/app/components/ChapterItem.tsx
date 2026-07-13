'use client'

import React from 'react'
import { Trash2 } from 'lucide-react'
import { Chapter } from './types'
import { RADIUS, ACTIVE_SURFACE, PANEL_BORDER_L, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, HOVER_SURFACE } from '@/lib/theme'

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
        ? `bg-indigo-600/10 ${TEXT_PRIMARY} border-l-4 ${ACTIVE_SURFACE}`
        : `${TEXT_SECONDARY} ${HOVER_SURFACE}`
    }`}>
      <button onClick={onClick} className="flex-1 text-left min-w-0">
        <div className="font-medium truncate">{chapter.title}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
