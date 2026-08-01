'use client'

import { ButtonHTMLAttributes } from 'react'
import { HAIRLINE, RADIUS, TEXT_SECONDARY, HOVER_SURFACE } from '@/lib/theme'

interface HairlineButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  emphasised?: boolean
}

export function HairlineButton({ emphasised = false, className = '', children, ...rest }: HairlineButtonProps) {
  const tone = emphasised
    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/10'
    : `${HAIRLINE} ${TEXT_SECONDARY} ${HOVER_SURFACE}`

  return (
    <button
      className={`inline-flex items-center gap-2 px-3 py-1.5 ${RADIUS} border ${tone} transition-colors ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
