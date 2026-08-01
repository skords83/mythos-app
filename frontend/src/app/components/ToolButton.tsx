'use client'

import { ButtonHTMLAttributes } from 'react'
import { OUTLINE_STRONG, RADIUS, TEXT_SECONDARY, TEXT_PRIMARY, HOVER_SURFACE } from '@/lib/theme'

interface ToolButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

export function ToolButton({ active = false, className = '', children, ...rest }: ToolButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center w-[30px] h-[30px] ${RADIUS} border transition-colors ${
        active
          ? `${OUTLINE_STRONG} bg-zinc-200 dark:bg-zinc-800 ${TEXT_PRIMARY}`
          : `border-transparent ${TEXT_SECONDARY} ${HOVER_SURFACE} hover:border-zinc-300 dark:hover:border-zinc-700`
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
