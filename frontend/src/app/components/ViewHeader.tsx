import { LucideIcon } from 'lucide-react'
import { TEXT_PRIMARY, ICON_PROPS } from '@/lib/theme'
import { HairlineButton } from './HairlineButton'

interface ViewHeaderProps {
  title: string
  actionLabel: string
  actionIcon: LucideIcon
  onAction: () => void
  actionDisabled?: boolean
}

export function ViewHeader({ title, actionLabel, actionIcon: ActionIcon, onAction, actionDisabled }: ViewHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <h2 className={`text-3xl font-display font-light ${TEXT_PRIMARY}`}>{title}</h2>
      <HairlineButton
        emphasised
        onClick={onAction}
        disabled={actionDisabled}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ActionIcon {...ICON_PROPS} />
        {actionLabel}
      </HairlineButton>
    </div>
  )
}
