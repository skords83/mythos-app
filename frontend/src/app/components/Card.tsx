import { RADIUS, BORDER } from '@/lib/theme'

interface CardProps {
  onClick?: () => void
  className?: string
  children: React.ReactNode
  draggable?: boolean
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void
}

export function Card({ onClick, className = '', children, draggable, onDragStart, onDragEnd }: CardProps) {
  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white dark:bg-zinc-900 ${RADIUS} p-4 ${BORDER} group ${onClick ? 'cursor-pointer' : ''} ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
