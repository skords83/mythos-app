// C11: pure date-math helpers behind the writing-activity heatmap and streak
// stats. Kept dependency-free (no date library) and separate from the
// useDailyWordCounts hook so the logic is directly unit-testable.

export interface DailyWordCountEntry {
  date: string // "YYYY-MM-DD"
  wordCount: number
}

function parseDateUTC(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDaysUTC(date: string, days: number): string {
  const d = parseDateUTC(date)
  d.setUTCDate(d.getUTCDate() + days)
  return toDateString(d)
}

// A day "counts" toward a streak once at least one word was written that day.
export function computeCurrentStreak(entries: DailyWordCountEntry[], todayDateString: string): number {
  const byDate = new Map(entries.map((e) => [e.date, e.wordCount]))
  let cursor = byDate.get(todayDateString) ? todayDateString : addDaysUTC(todayDateString, -1)
  let streak = 0
  while ((byDate.get(cursor) || 0) > 0) {
    streak++
    cursor = addDaysUTC(cursor, -1)
  }
  return streak
}

export function computeLongestStreak(entries: DailyWordCountEntry[]): number {
  const activeDates = entries
    .filter((e) => e.wordCount > 0)
    .map((e) => e.date)
    .sort()
  if (activeDates.length === 0) return 0

  let longest = 1
  let current = 1
  for (let i = 1; i < activeDates.length; i++) {
    current = activeDates[i] === addDaysUTC(activeDates[i - 1], 1) ? current + 1 : 1
    longest = Math.max(longest, current)
  }
  return longest
}

// % change of the trailing 7-day total (today inclusive) vs. the 7 days before
// that. Returns null when the prior week had zero words, since a percentage
// change from zero is undefined rather than meaningfully "+100%".
export function computeWeekOverWeekChange(entries: DailyWordCountEntry[], todayDateString: string): number | null {
  const byDate = new Map(entries.map((e) => [e.date, e.wordCount]))
  const sumWeek = (startOffset: number): number => {
    let sum = 0
    for (let i = 0; i < 7; i++) {
      sum += byDate.get(addDaysUTC(todayDateString, -(startOffset + i))) || 0
    }
    return sum
  }
  const thisWeek = sumWeek(0)
  const lastWeek = sumWeek(7)
  if (lastWeek === 0) return null
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
}

export interface HeatmapDay {
  date: string
  wordCount: number
  level: 0 | 1 | 2 | 3 | 4
}

export type HeatmapWeek = (HeatmapDay | null)[]

// Buckets word counts into 5 sequential levels (0 = none, 1-4 = quartiles of
// the observed max) — the standard GitHub-contributions encoding, computed
// relative to this project's own activity rather than a fixed word count.
function levelFor(wordCount: number, max: number): HeatmapDay['level'] {
  if (wordCount <= 0 || max <= 0) return 0
  const ratio = wordCount / max
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

// Builds `weeks` full weeks (Monday-first) ending on todayDateString, for
// rendering as a GitHub-style column-per-week grid. Leading cells before the
// range start are `null` so the grid stays a clean rectangle.
export function buildHeatmapWeeks(entries: DailyWordCountEntry[], todayDateString: string, weeks = 26): HeatmapWeek[] {
  const byDate = new Map(entries.map((e) => [e.date, e.wordCount]))
  const max = entries.reduce((m, e) => Math.max(m, e.wordCount), 0)

  const today = parseDateUTC(todayDateString)
  const mondayOffset = (today.getUTCDay() + 6) % 7 // 0 = Monday
  const gridEnd = addDaysUTC(todayDateString, 6 - mondayOffset) // Sunday closing the current week
  const totalDays = weeks * 7
  const gridStart = addDaysUTC(gridEnd, -(totalDays - 1))

  const result: HeatmapWeek[] = []
  let cursor = gridStart
  for (let w = 0; w < weeks; w++) {
    const week: HeatmapWeek = []
    for (let d = 0; d < 7; d++) {
      if (cursor > todayDateString) {
        week.push(null)
      } else {
        const wordCount = byDate.get(cursor) || 0
        week.push({ date: cursor, wordCount, level: levelFor(wordCount, max) })
      }
      cursor = addDaysUTC(cursor, 1)
    }
    result.push(week)
  }
  return result
}
