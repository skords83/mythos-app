import { LucideIcon } from 'lucide-react'
import { TEXT_MUTED, ICON_PROPS } from '@/lib/theme'
import { MonoLabel } from './MonoLabel'

interface EmptyStateProps {
  icon: LucideIcon
  label: string
  description?: string
  action?: React.ReactNode
  className?: string
  iconSize?: number
}

export function EmptyState({ icon: Icon, label, description, action, className = '', iconSize = 96 }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-16 ${className}`}>
      <Icon size={iconSize} strokeWidth={ICON_PROPS.strokeWidth} className={TEXT_MUTED} />
      <MonoLabel>{label}</MonoLabel>
      {description && <p className={`text-sm ${TEXT_MUTED} max-w-md text-center -mt-2`}>{description}</p>}
      {action}
    </div>
  )
}
