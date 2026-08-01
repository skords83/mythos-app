import { MONO_LABEL, MONO_LABEL_MUTED, TEXT_PRIMARY } from '@/lib/theme'

interface MonoLabelProps {
  children: React.ReactNode
  muted?: boolean
  className?: string
}

export function MonoLabel({ children, muted = true, className = '' }: MonoLabelProps) {
  const base = muted ? MONO_LABEL_MUTED : `${MONO_LABEL} ${TEXT_PRIMARY}`
  return <span className={`${base} ${className}`}>{children}</span>
}
