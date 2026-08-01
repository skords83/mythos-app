import { RADIUS, HAIRLINE, TEXT_SECONDARY, MONO_LABEL } from '@/lib/theme'

interface ChipProps {
  children: React.ReactNode
  swatchClassName?: string
  className?: string
}

export function Chip({ children, swatchClassName, className = '' }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 border ${HAIRLINE} ${RADIUS} ${MONO_LABEL} ${TEXT_SECONDARY} ${className}`}
    >
      {swatchClassName && <span className={`w-1.5 h-1.5 ${swatchClassName} flex-shrink-0`} />}
      {children}
    </span>
  )
}
