'use client'

import React from 'react'
import { ItemQuickCardState } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, ACCENT_TEXT, ACCENT, RADIUS, BORDER } from '@/lib/theme'

interface ItemQuickCardProps {
  state: ItemQuickCardState
  onClose: () => void
}

export function ItemQuickCard({ state, onClose }: ItemQuickCardProps) {
  if (!state.visible || !state.item) return null

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
          <div className={`w-14 h-14 ${RADIUS} ${ACCENT} flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>
            {state.item.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-serif font-bold text-lg ${TEXT_PRIMARY} truncate`}>
              {state.item.name}
            </h3>
            <span className={`text-xs ${ACCENT_TEXT} font-medium`}>Objekt</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            ×
          </button>
        </div>
        <div className="space-y-3">
          {state.item.description && (
            <div>
              <h4 className={`text-xs font-semibold ${TEXT_SECONDARY} uppercase tracking-wider mb-1`}>
                Beschreibung
              </h4>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {state.item.description}
              </p>
            </div>
          )}
          {state.item.origin && (
            <div>
              <h4 className={`text-xs font-semibold ${TEXT_SECONDARY} uppercase tracking-wider mb-1`}>
                Herkunft
              </h4>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {state.item.origin}
              </p>
            </div>
          )}
          {state.item.significance && (
            <div>
              <h4 className={`text-xs font-semibold ${TEXT_SECONDARY} uppercase tracking-wider mb-1`}>
                Bedeutung
              </h4>
              <p className={`text-sm ${ACCENT_TEXT} italic leading-relaxed`}>
                "{state.item.significance}"
              </p>
            </div>
          )}
        </div>
        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
          <p className={`text-xs ${TEXT_MUTED} text-center`}>
            Klicke auf "Objekte" für mehr Details
          </p>
        </div>
      </div>
    </>
  )
}
