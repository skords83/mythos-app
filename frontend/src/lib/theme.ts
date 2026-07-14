// Neo-Brutalism / High-Contrast-Flat design tokens (locked 2026-07-12 roadmap decision).
// Import these instead of hardcoding Tailwind strings so the palette/radius/shadow
// formula stays byte-identical across every component.

export const SURFACE = 'bg-stone-50 dark:bg-zinc-950'
export const SURFACE_ALT = 'bg-stone-100 dark:bg-zinc-900'
export const TEXT_PRIMARY = 'text-zinc-900 dark:text-zinc-200'
export const TEXT_SECONDARY = 'text-zinc-600 dark:text-zinc-400'
export const TEXT_MUTED = 'text-zinc-400 dark:text-zinc-500'
export const ACCENT = 'bg-indigo-600 hover:bg-indigo-700'
export const ACCENT_TEXT = 'text-indigo-600 dark:text-indigo-400'
export const RADIUS = 'rounded-none'
export const BADGE_RADIUS = 'rounded-sm'
export const CARD_SHADOW = 'shadow-[4px_4px_0_0_#18181b]'
export const BORDER = 'border border-zinc-300 dark:border-zinc-700'
export const PANEL_BORDER_R = 'border-r-2 border-zinc-900 dark:border-zinc-700'
export const PANEL_BORDER_L = 'border-l-2 border-zinc-900 dark:border-zinc-700'
export const HOVER_SURFACE = 'hover:bg-zinc-200 dark:hover:bg-zinc-800'
export const ACTIVE_SURFACE = 'bg-zinc-200 dark:bg-zinc-800'
export const DIVIDER = 'bg-zinc-300 dark:bg-zinc-700'
export const OVERLAY = 'fixed inset-0 bg-zinc-950/60 flex items-center justify-center z-50 animate-fade-in'
export const MODAL_PANEL = 'bg-stone-50 dark:bg-zinc-900 rounded-none shadow-[4px_4px_0_0_#18181b] border border-zinc-900 dark:border-zinc-700'
export const INPUT = 'w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-none bg-stone-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-600 outline-none'
export const BUTTON_SECONDARY = 'border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
