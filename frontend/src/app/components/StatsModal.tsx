'use client'

import React, { useMemo } from 'react'
import { X, Flame, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { OVERLAY, MODAL_PANEL, TEXT_PRIMARY, TEXT_MUTED, MONO_LABEL_MUTED, HAIRLINE, ICON_PROPS } from '@/lib/theme'
import { ActivityHeatmap } from './ActivityHeatmap'
import { DailyWordCountEntry, computeCurrentStreak, computeLongestStreak, computeWeekOverWeekChange } from '@/lib/activityStats'

interface StatsModalProps {
  isOpen: boolean
  onClose: () => void
  entries: DailyWordCountEntry[]
  todayDateString: string
}

export function StatsModal({ isOpen, onClose, entries, todayDateString }: StatsModalProps) {
  const currentStreak = useMemo(() => computeCurrentStreak(entries, todayDateString), [entries, todayDateString])
  const longestStreak = useMemo(() => computeLongestStreak(entries), [entries])
  const weekChange = useMemo(() => computeWeekOverWeekChange(entries, todayDateString), [entries, todayDateString])

  if (!isOpen) return null

  return (
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-display font-light ${TEXT_PRIMARY}`}>Schreib-Statistik</h2>
          <button onClick={onClose} className={`${TEXT_MUTED} hover:${TEXT_PRIMARY} transition-colors`}>
            <X size={20} />
          </button>
        </div>

        <div className={`grid grid-cols-3 gap-4 mb-6 pb-6 border-b ${HAIRLINE}`}>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Flame size={14} strokeWidth={1.75} className={TEXT_MUTED} />
              <span className={MONO_LABEL_MUTED}>Serie</span>
            </div>
            <p className={`text-2xl font-semibold ${TEXT_PRIMARY}`}>
              {currentStreak} <span className={`text-sm font-normal ${TEXT_MUTED}`}>{currentStreak === 1 ? 'Tag' : 'Tage'}</span>
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy size={14} strokeWidth={1.75} className={TEXT_MUTED} />
              <span className={MONO_LABEL_MUTED}>Längste Serie</span>
            </div>
            <p className={`text-2xl font-semibold ${TEXT_PRIMARY}`}>
              {longestStreak} <span className={`text-sm font-normal ${TEXT_MUTED}`}>{longestStreak === 1 ? 'Tag' : 'Tage'}</span>
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              {weekChange === null || weekChange === 0 ? (
                <Minus size={14} strokeWidth={1.75} className={TEXT_MUTED} />
              ) : weekChange > 0 ? (
                <TrendingUp size={14} strokeWidth={1.75} className={TEXT_MUTED} />
              ) : (
                <TrendingDown size={14} strokeWidth={1.75} className={TEXT_MUTED} />
              )}
              <span className={MONO_LABEL_MUTED}>Woche vs. Woche</span>
            </div>
            <p className={`text-2xl font-semibold ${TEXT_PRIMARY}`}>
              {weekChange === null ? '—' : `${weekChange > 0 ? '+' : ''}${weekChange}%`}
            </p>
          </div>
        </div>

        <ActivityHeatmap entries={entries} todayDateString={todayDateString} />
      </div>
    </div>
  )
}
