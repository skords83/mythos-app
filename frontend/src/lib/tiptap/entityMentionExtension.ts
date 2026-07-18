import { Node, mergeAttributes } from '@tiptap/core'
import { BADGE_RADIUS } from '@/lib/theme'

export type MentionableEntityKind = 'PLACE' | 'ITEM'

const KIND_CLASSES: Record<MentionableEntityKind, string> = {
  PLACE: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950',
  ITEM: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950',
}

// Schema-only node — no Suggestion plugin of its own. The '@' trigger and popup are
// owned by CharacterMention (lib/tiptap/characterMentionExtension.ts); its suggestion
// command inserts this node when the chosen item is a Place or Item, keeping a single
// live '@' plugin in the editor instead of one per mentionable entity type.
export const EntityMention = Node.create({
  name: 'entityMention',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  addAttributes() {
    return {
      kind: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-entity-kind'),
        renderHTML: (attrs: { kind?: MentionableEntityKind | null }) =>
          attrs.kind ? { 'data-entity-kind': attrs.kind } : {},
      },
      entityId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-entity-id'),
        renderHTML: (attrs: { entityId?: string | null }) =>
          attrs.entityId ? { 'data-entity-id': attrs.entityId } : {},
      },
      label: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-label') ?? el.textContent?.replace(/^@/, '') ?? null,
        renderHTML: (attrs: { label?: string | null }) => (attrs.label ? { 'data-label': attrs.label } : {}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-entity-mention]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const kind = (node.attrs.kind as MentionableEntityKind | null) ?? 'PLACE'
    return [
      'span',
      mergeAttributes(
        {
          'data-entity-mention': '',
          class: `${KIND_CLASSES[kind]} ${BADGE_RADIUS} font-medium cursor-pointer px-1`,
        },
        HTMLAttributes
      ),
      `@${node.attrs.label ?? ''}`,
    ]
  },
})

export function filterByName<T extends { name: string }>(query: string, entities: T[]): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return entities
  return entities.filter(e => e.name.toLowerCase().includes(q))
}
