import { SURFACE_ALT, DIVIDER } from '@/lib/theme'

// Double-hairline title-bar rule (HdFolioDivider-style): a heavier line, a thin
// background-colored gap, then a hairline — gives header rows weight without shadows.
interface MastheadDividerProps {
  surface?: string
  className?: string
}

export function MastheadDivider({ surface = SURFACE_ALT, className = '' }: MastheadDividerProps) {
  return (
    <div className={className}>
      <div className="h-0.5 bg-zinc-900 dark:bg-zinc-100" />
      <div className={`h-[2px] ${surface}`} />
      <div className={`h-px ${DIVIDER}`} />
    </div>
  )
}
