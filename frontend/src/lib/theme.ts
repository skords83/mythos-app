// "Manuskript" design tokens (Hammer-Editor-inspired, replaces Neo-Brutalism 2026-08-01).
// Import these instead of hardcoding Tailwind strings so the palette/radius/hairline
// formula stays byte-identical across every component.
//
// Principles: structure via hairlines (never shadows/elevation), square corners
// everywhere, color reserved for the single primary accent + entity-type swatches
// (never as icon fill/stroke — icons stay monochrome), mono labels for all
// metadata/captions.

export const SURFACE = 'bg-stone-50 dark:bg-zinc-950'
export const SURFACE_ALT = 'bg-stone-100 dark:bg-zinc-900'
export const TEXT_PRIMARY = 'text-zinc-900 dark:text-zinc-200'
export const TEXT_SECONDARY = 'text-zinc-600 dark:text-zinc-400'
export const TEXT_MUTED = 'text-zinc-400 dark:text-zinc-500'
export const ACCENT = 'bg-indigo-600 hover:bg-indigo-700'
export const ACCENT_TEXT = 'text-indigo-600 dark:text-indigo-400'
export const RADIUS = 'rounded-none'

// Hairline is the only structural device — no shadows anywhere in this system.
export const HAIRLINE = 'border-zinc-300 dark:border-zinc-700'
export const OUTLINE_STRONG = 'border-zinc-900 dark:border-zinc-100'
export const BORDER = `border ${HAIRLINE}`
export const PANEL_BORDER_R = `border-r ${HAIRLINE}`
export const PANEL_BORDER_L = `border-l ${HAIRLINE}`
// Double-hairline masthead rule (heavier line + gap + hairline) — sits under
// screen/modal title rows to give "title bar" weight without a shadow.
export const MASTHEAD_DIVIDER_STRONG = `border-t-2 ${OUTLINE_STRONG}`
export const MASTHEAD_DIVIDER_HAIR = `border-t ${HAIRLINE}`

export const HOVER_SURFACE = 'hover:bg-zinc-200 dark:hover:bg-zinc-800'
export const ACTIVE_SURFACE = 'bg-zinc-200 dark:bg-zinc-800'
export const DIVIDER = 'bg-zinc-300 dark:bg-zinc-700'
export const OVERLAY = 'fixed inset-0 bg-zinc-950/60 flex items-center justify-center z-50 animate-fade-in'
export const MODAL_PANEL = `bg-stone-50 dark:bg-zinc-900 ${RADIUS} border ${OUTLINE_STRONG}`
export const INPUT = `w-full px-3 py-2 border ${HAIRLINE} ${RADIUS} bg-stone-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-600 outline-none`
export const BUTTON_SECONDARY = `border ${HAIRLINE} text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`

// Mono labels: the single most recognizable signal of this design — anything
// that would be a "label"/"caption"/"metadata" line uses this instead of
// text-sm font-semibold uppercase tracking-wider (the old ad-hoc pattern).
export const MONO_LABEL = 'font-mono text-[11px] uppercase tracking-[0.12em]'
export const MONO_LABEL_MUTED = `${MONO_LABEL} ${TEXT_MUTED}`

// Shared icon preset — one size/stroke-width app-wide (lucide-react props).
export const ICON_PROPS = { size: 18, strokeWidth: 1.75 } as const

// Easing used for the nav-rail width transition and sliding active indicator
// (matches Hammer's FastOutSlowInEasing — deliberate motion, not a generic fade).
export const EASE_STANDARD = 'ease-[cubic-bezier(0.4,0,0.2,1)]'

// Entity-type accent colors. NEVER apply these to icon fill/stroke — icons stay
// monochrome (TEXT_SECONDARY/TEXT_PRIMARY). Use only for small swatches, chip
// backgrounds, or thin accent strips. Values are CSS custom properties (see
// globals.css :root / .dark) so light/dark swap automatically with the theme.
export type EntityKind = 'person' | 'place' | 'thing' | 'group' | 'event' | 'idea'

export const ENTITY_SWATCH_BG: Record<EntityKind, string> = {
  person: 'bg-[var(--entity-person)]',
  place: 'bg-[var(--entity-place)]',
  thing: 'bg-[var(--entity-thing)]',
  group: 'bg-[var(--entity-group)]',
  event: 'bg-[var(--entity-event)]',
  idea: 'bg-[var(--entity-idea)]',
}

export const ENTITY_SWATCH_TEXT: Record<EntityKind, string> = {
  person: 'text-[var(--entity-person)]',
  place: 'text-[var(--entity-place)]',
  thing: 'text-[var(--entity-thing)]',
  group: 'text-[var(--entity-group)]',
  event: 'text-[var(--entity-event)]',
  idea: 'text-[var(--entity-idea)]',
}

// Mapping from Mythos entity/model names to the semantic color slot above.
export const ENTITY_KIND_BY_MODEL: Record<string, EntityKind> = {
  Character: 'person',
  Place: 'place',
  Item: 'thing',
  Faction: 'group',
  TimelineEvent: 'event',
  LoreEntry: 'idea',
}
