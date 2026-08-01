import { RADIUS, ENTITY_SWATCH_BG, EntityKind } from '@/lib/theme'

interface EntityAvatarProps {
  kind: EntityKind
  label: string
  imageUrl?: string | null
  size?: 'sm' | 'lg'
  className?: string
}

const SIZE_CLASSES: Record<'sm' | 'lg', string> = {
  sm: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-xl',
}

export function EntityAvatar({ kind, label, imageUrl, size = 'sm', className = '' }: EntityAvatarProps) {
  return (
    <div
      className={`${SIZE_CLASSES[size]} ${RADIUS} ${ENTITY_SWATCH_BG[kind]} flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden ${className}`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
      ) : (
        label.charAt(0).toUpperCase()
      )}
    </div>
  )
}
