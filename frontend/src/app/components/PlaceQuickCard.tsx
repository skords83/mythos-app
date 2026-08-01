'use client'

import React from 'react'
import { PlaceQuickCardState } from './types'
import { TEXT_PRIMARY, TEXT_MUTED, ENTITY_SWATCH_TEXT, RADIUS, BORDER } from '@/lib/theme'
import { EntityAvatar } from './EntityAvatar'
import { MonoLabel } from './MonoLabel'

interface PlaceQuickCardProps {
  state: PlaceQuickCardState
  onClose: () => void
}

export function PlaceQuickCard({ state, onClose }: PlaceQuickCardProps) {
  if (!state.visible || !state.place) return null

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
          <EntityAvatar kind="place" label={state.place.name} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className={`font-display font-light text-lg ${TEXT_PRIMARY} truncate`}>
              {state.place.name}
            </h3>
            <span className={`text-xs ${ENTITY_SWATCH_TEXT.place} font-medium`}>Ort</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            ×
          </button>
        </div>
        <div className="space-y-3">
          {state.place.location && (
            <div>
              <MonoLabel className="block mb-1">Lage</MonoLabel>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {state.place.location}
              </p>
            </div>
          )}
          {state.place.climate && (
            <div>
              <MonoLabel className="block mb-1">Klima</MonoLabel>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {state.place.climate}
              </p>
            </div>
          )}
          {state.place.description && (
            <div>
              <MonoLabel className="block mb-1">Beschreibung</MonoLabel>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {state.place.description}
              </p>
            </div>
          )}
          {state.place.importance && (
            <div>
              <MonoLabel className="block mb-1">Bedeutung</MonoLabel>
              <p className={`text-sm ${ENTITY_SWATCH_TEXT.place} italic leading-relaxed`}>
                "{state.place.importance}"
              </p>
            </div>
          )}
        </div>
        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
          <p className={`text-xs ${TEXT_MUTED} text-center`}>
            Klicke auf "Orte" für mehr Details
          </p>
        </div>
      </div>
    </>
  )
}
