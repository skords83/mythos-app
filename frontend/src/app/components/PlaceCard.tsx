'use client'

import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Place } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, ACCENT_TEXT, RADIUS, BADGE_RADIUS, BORDER, CARD_SHADOW, ACCENT } from '@/lib/theme'

interface PlaceCardProps {
  place: Place
  onDelete: () => void
}

export function PlaceCard({ place, onDelete }: PlaceCardProps) {
  return (
    <div className={`bg-white dark:bg-zinc-900 ${RADIUS} p-4 ${BORDER} ${CARD_SHADOW} group`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${RADIUS} ${ACCENT} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`font-semibold ${TEXT_PRIMARY} truncate`}>{place.name}</h4>
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
          {place.description && (
            <p className={`text-sm ${TEXT_SECONDARY} mt-1 line-clamp-2`}>{place.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {place.location && (
              <span className={`text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 ${BADGE_RADIUS} text-zinc-600 dark:text-zinc-400`}>
                {place.location}
              </span>
            )}
            {place.importance && (
              <span className={`text-xs px-2 py-1 bg-indigo-600/10 ${ACCENT_TEXT} ${BADGE_RADIUS}`}>
                {place.importance}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
