import { LucideIcon } from 'lucide-react'
import { TEXT_MUTED, ICON_PROPS } from '@/lib/theme'
import { MonoLabel } from './MonoLabel'

interface EmptyStateProps {
  icon: LucideIcon
  label: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, label, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-16 ${className}`}>
      <Icon size={96} strokeWidth={ICON_PROPS.strokeWidth} className={TEXT_MUTED} />
      <MonoLabel>{label}</MonoLabel>
      {action}
    </div>
  )
}
