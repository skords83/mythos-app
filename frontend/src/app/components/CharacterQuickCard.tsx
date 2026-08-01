'use client'

import React from 'react'
import { Character } from './types'
import { TEXT_PRIMARY, TEXT_MUTED, ENTITY_SWATCH_TEXT, RADIUS, BORDER } from '@/lib/theme'
import { EntityAvatar } from './EntityAvatar'
import { MonoLabel } from './MonoLabel'

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
        className={`fixed z-50 bg-white dark:bg-zinc-900 ${RADIUS} ${BORDER} p-4 w-72 animate-fade-in`}
        style={{
          left: Math.min(state.position.x, typeof window !== 'undefined' ? window.innerWidth - 300 : 300),
          top: Math.min(state.position.y, typeof window !== 'undefined' ? window.innerHeight - 250 : 250)
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <EntityAvatar kind="person" label={state.character.name} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className={`font-display font-light text-lg ${TEXT_PRIMARY} truncate`}>
              {state.character.name}
            </h3>
            <span className={`text-xs ${ENTITY_SWATCH_TEXT.person} font-medium`}>Charakter</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            ×
          </button>
        </div>
        <div className="space-y-3">
          {state.character.appearance && (
            <div>
              <MonoLabel className="block mb-1">Äußeres</MonoLabel>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {state.character.appearance}
              </p>
            </div>
          )}
          {state.character.personality && (
            <div>
              <MonoLabel className="block mb-1">Persönlichkeit</MonoLabel>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {state.character.personality}
              </p>
            </div>
          )}
          {state.character.backstory && (
            <div>
              <MonoLabel className="block mb-1">Vergangenheit</MonoLabel>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {state.character.backstory}
              </p>
            </div>
          )}
          {state.character.motivation && (
            <div>
              <MonoLabel className="block mb-1">Motivation</MonoLabel>
              <p className={`text-sm ${ENTITY_SWATCH_TEXT.person} italic leading-relaxed`}>
                "{state.character.motivation}"
              </p>
            </div>
          )}
        </div>
        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
          <p className={`text-xs ${TEXT_MUTED} text-center`}>
            Klicke auf "Charaktere" für mehr Details
          </p>
        </div>
      </div>
    </>
  )
}
