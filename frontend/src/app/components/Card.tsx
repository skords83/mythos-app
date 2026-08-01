import { RADIUS, BORDER } from '@/lib/theme'

interface CardProps {
  onClick?: () => void
  className?: string
  children: React.ReactNode
}

export function Card({ onClick, className = '', children }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-zinc-900 ${RADIUS} p-4 ${BORDER} group ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
