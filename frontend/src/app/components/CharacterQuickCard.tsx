'use client'

import React from 'react'
import { Character } from './types'

interface QuickCardState {
  character: Character | null
  position: { x: number, y: number }
  visible: boolean
}

interface CharacterQuickCardProps {
  state: QuickCardState
  onClose: () => void
}

export function CharacterQuickCard({ state, onClose }: CharacterQuickCardProps) {
  if (!state.visible || !state.character) return null

  return (
    <>
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        className="fixed z-50 bg-white dark:bg-[#262626] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-72 animate-fade-in"
        style={{
          left: Math.min(state.position.x, typeof window !== 'undefined' ? window.innerWidth - 300 : 300),
          top: Math.min(state.position.y, typeof window !== 'undefined' ? window.innerHeight - 250 : 250)
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#4A7C59] to-[#6B9E7C] flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-md">
            {state.character.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-bold text-lg text-gray-900 dark:text-gray-100 truncate">
              {state.character.name}
            </h3>
            <span className="text-xs text-[#4A7C59] font-medium">Charakter</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            ×
          </button>
        </div>
        <div className="space-y-3">
          {state.character.description && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Beschreibung
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {state.character.description}
              </p>
            </div>
          )}
          {state.character.motivation && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Motivation
              </h4>
              <p className="text-sm text-[#4A7C59] italic leading-relaxed">
                "{state.character.motivation}"
              </p>
            </div>
          )}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 text-center">
            Klicke auf "Charaktere" für mehr Details
          </p>
        </div>
      </div>
    </>
  )
}
