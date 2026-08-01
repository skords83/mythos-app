'use client'

import React, { useMemo, useState } from 'react'
import { DailyWordCountEntry, HeatmapDay, buildHeatmapWeeks } from '@/lib/activityStats'
import { MONO_LABEL_MUTED, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY, HAIRLINE, RADIUS } from '@/lib/theme'

interface ActivityHeatmapProps {
  entries: DailyWordCountEntry[]
  todayDateString: string
}

// C11: sequential magnitude encoding, one neutral hue (zinc) light -> dark,
// anchor flipped in dark mode so the "most active" step still reads as the
// strongest step against its surface. Deliberately not the indigo ACCENT —
// theme.ts reserves that for primary actions/active indicators, never
// decorative/data fill.
const LEVEL_CLASSES: Record<HeatmapDay['level'], string> = {
  0: 'bg-zinc-100 dark:bg-zinc-800',
  1: 'bg-zinc-300 dark:bg-zinc-700',
  2: 'bg-zinc-400 dark:bg-zinc-600',
  3: 'bg-zinc-600 dark:bg-zinc-400',
  4: 'bg-zinc-800 dark:bg-zinc-200',
}

const WEEKDAY_LABELS = ['Mo', '', 'Mi', '', 'Fr', '', '']

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function formatFullDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${d}. ${MONTH_NAMES[m - 1]} ${y}`
}

export function ActivityHeatmap({ entries, todayDateString }: ActivityHeatmapProps) {
  const weeks = useMemo(() => buildHeatmapWeeks(entries, todayDateString, 26), [entries, todayDateString])
  const [hovered, setHovered] = useState<HeatmapDay | null>(null)
  const [showTable, setShowTable] = useState(false)

  const activeDays = useMemo(
    () => [...entries].filter((e) => e.wordCount > 0).sort((a, b) => b.date.localeCompare(a.date)),
    [entries]
  )

  const monthLabelForWeek = (week: (HeatmapDay | null)[], weekIndex: number): string | null => {
    const firstDay = week.find((d) => d !== null) as HeatmapDay | undefined
    if (!firstDay) return null
    const month = Number(firstDay.date.slice(5, 7))
    const prevWeek = weeks[weekIndex - 1]
    const prevFirstDay = prevWeek?.find((d) => d !== null) as HeatmapDay | undefined
    const prevMonth = prevFirstDay ? Number(prevFirstDay.date.slice(5, 7)) : null
    return month !== prevMonth ? MONTH_NAMES[month - 1] : null
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={MONO_LABEL_MUTED}>Aktivität</span>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className={`${MONO_LABEL_MUTED} hover:${TEXT_SECONDARY} transition-colors underline underline-offset-2`}
        >
          {showTable ? 'Als Kalender anzeigen' : 'Als Tabelle anzeigen'}
        </button>
      </div>

      {showTable ? (
        <div className={`max-h-64 overflow-y-auto border ${HAIRLINE}`}>
          {activeDays.length === 0 ? (
            <p className={`${TEXT_MUTED} text-sm p-3`}>Noch keine Aktivität erfasst.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${HAIRLINE}`}>
                  <th className={`${MONO_LABEL_MUTED} text-left font-normal px-3 py-2`}>Datum</th>
                  <th className={`${MONO_LABEL_MUTED} text-right font-normal px-3 py-2`}>Wörter</th>
                </tr>
              </thead>
              <tbody>
                {activeDays.map((day) => (
                  <tr key={day.date} className={`border-b ${HAIRLINE} last:border-b-0`}>
                    <td className={`${TEXT_PRIMARY} px-3 py-1.5`}>{formatFullDate(day.date)}</td>
                    <td className={`${TEXT_PRIMARY} text-right px-3 py-1.5 tabular-nums`}>{day.wordCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-[3px] overflow-x-auto pb-1">
            <div className="flex flex-col gap-[2px] pr-1 pt-[14px] flex-shrink-0">
              {WEEKDAY_LABELS.map((label, i) => (
                <span key={i} className="h-[11px] leading-[11px] text-[9px] font-mono text-zinc-400 dark:text-zinc-600">
                  {label}
                </span>
              ))}
            </div>
            {weeks.map((week, weekIndex) => {
              const monthLabel = monthLabelForWeek(week, weekIndex)
              return (
                <div key={weekIndex} className="flex flex-col gap-[2px] flex-shrink-0">
                  <span className="h-[12px] leading-[12px] text-[9px] font-mono text-zinc-400 dark:text-zinc-600 whitespace-nowrap">
                    {monthLabel || ''}
                  </span>
                  {week.map((day, dayIndex) =>
                    day === null ? (
                      <div key={dayIndex} className="w-[11px] h-[11px]" />
                    ) : (
                      <button
                        key={dayIndex}
                        type="button"
                        onMouseEnter={() => setHovered(day)}
                        onMouseLeave={() => setHovered((h) => (h?.date === day.date ? null : h))}
                        onFocus={() => setHovered(day)}
                        onBlur={() => setHovered((h) => (h?.date === day.date ? null : h))}
                        className={`w-[11px] h-[11px] ${RADIUS} ${LEVEL_CLASSES[day.level]} hover:ring-1 hover:ring-zinc-500 dark:hover:ring-zinc-400 focus:ring-1 focus:ring-zinc-500 dark:focus:ring-zinc-400 outline-none transition-shadow`}
                        aria-label={`${formatFullDate(day.date)}: ${day.wordCount} Wörter`}
                        title={`${formatFullDate(day.date)}: ${day.wordCount} Wörter`}
                      />
                    )
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs ${TEXT_MUTED} h-4`}>
              {hovered ? `${formatFullDate(hovered.date)} — ${hovered.wordCount} Wörter` : ''}
            </span>
            <div className="flex items-center gap-1">
              <span className={`text-[10px] font-mono ${TEXT_MUTED}`}>Weniger</span>
              {([0, 1, 2, 3, 4] as const).map((level) => (
                <div key={level} className={`w-[11px] h-[11px] ${RADIUS} ${LEVEL_CLASSES[level]}`} />
              ))}
              <span className={`text-[10px] font-mono ${TEXT_MUTED}`}>Mehr</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
