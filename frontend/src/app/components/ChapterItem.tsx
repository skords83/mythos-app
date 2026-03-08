'use client'

import React from 'react'
import { Trash2 } from 'lucide-react'
import { Chapter } from './types'

interface ChapterItemProps {
  chapter: Chapter
  active: boolean
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}

export function ChapterItem({ chapter, active, onClick, onDelete }: ChapterItemProps) {
  return (
    <div className={`group relative w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between ${
      active 
        ? 'bg-[#4A7C59]/10 text-[#4A7C59] border-l-4 border-[#4A7C59]' 
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`}>
      <button onClick={onClick} className="flex-1 text-left min-w-0">
        <div className="font-medium truncate">{chapter.title}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {chapter.wordCount} Wörter
        </div>
      </button>
      <button
        onClick={onDelete}
        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1"
        title="Kapitel löschen"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
