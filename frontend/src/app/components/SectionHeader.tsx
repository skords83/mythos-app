import { HAIRLINE } from '@/lib/theme'
import { MonoLabel } from './MonoLabel'

interface SectionHeaderProps {
  label: string
  meta?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({ label, meta, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-3 pb-2 mb-3 border-b ${HAIRLINE} ${className}`}>
      <MonoLabel>{label}</MonoLabel>
      <div className="flex items-center gap-2">
        {meta && <MonoLabel>{meta}</MonoLabel>}
        {action}
      </div>
    </div>
  )
}
