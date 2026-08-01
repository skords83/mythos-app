'use client'

import React, { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ChapterVersion } from './types'
import { TEXT_MUTED, ACCENT_TEXT, HAIRLINE, MONO_LABEL_MUTED, INPUT } from '@/lib/theme'

interface ChapterVersionSwitcherProps {
  versions: ChapterVersion[]
  activeVersionId: string | null
  onSelect: (id: string | null) => void
  onCreate: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

// C9: tabs for switching between a chapter's "Original" content and its named,
// switchable alternate drafts (ChapterVersion). Kept as its own small component
// since ManuscriptView already owns a lot of split-screen/comment state.
export function ChapterVersionSwitcher({ versions, activeVersionId, onSelect, onCreate, onRename, onDelete }: ChapterVersionSwitcherProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const startRename = (version: ChapterVersion) => {
    setRenamingId(version.id)
    setRenameValue(version.name)
  }

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }

  if (versions.length === 0 && renamingId === null) {
    return (
      <div className={`flex items-center gap-2 mb-4 pb-2 border-b ${HAIRLINE}`}>
        <span className={MONO_LABEL_MUTED}>Original</span>
        <button
          type="button"
          onClick={onCreate}
          className={`flex items-center gap-1 text-xs ${TEXT_MUTED} hover:${ACCENT_TEXT} transition-colors`}
        >
          <Plus size={12} />
          Entwurf
        </button>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1 mb-4 pb-2 border-b ${HAIRLINE} flex-wrap`}>
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`px-2 py-1 text-xs font-mono ${activeVersionId === null ? `${ACCENT_TEXT} border-b-2 border-indigo-600` : `${TEXT_MUTED} hover:${ACCENT_TEXT}`}`}
      >
        Original
      </button>
      {versions.map((version) => {
        const isActive = version.id === activeVersionId
        if (renamingId === version.id) {
          return (
            <input
              key={version.id}
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') { setRenamingId(null); setRenameValue('') }
              }}
              className={`${INPUT} text-xs w-32 py-1`}
            />
          )
        }
        return (
          <div key={version.id} className="flex items-center gap-0.5 group">
            <button
              type="button"
              onClick={() => onSelect(version.id)}
              className={`px-2 py-1 text-xs font-mono ${isActive ? `${ACCENT_TEXT} border-b-2 border-indigo-600` : `${TEXT_MUTED} hover:${ACCENT_TEXT}`}`}
            >
              {version.name}
            </button>
            {isActive && (
              <>
                <button
                  type="button"
                  onClick={() => startRename(version)}
                  className={`p-1 ${TEXT_MUTED} hover:${ACCENT_TEXT} transition-colors opacity-0 group-hover:opacity-100`}
                >
                  <Pencil size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(version.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={11} />
                </button>
              </>
            )}
          </div>
        )
      })}
      <button
        type="button"
        onClick={onCreate}
        className={`flex items-center gap-1 px-2 py-1 text-xs ${TEXT_MUTED} hover:${ACCENT_TEXT} transition-colors`}
      >
        <Plus size={12} />
        Entwurf
      </button>
    </div>
  )
}
