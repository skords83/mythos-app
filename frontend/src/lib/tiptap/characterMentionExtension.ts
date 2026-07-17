import Mention from '@tiptap/extension-mention'
import { mergeAttributes } from '@tiptap/core'
import type { Character } from '@/app/components/types'
import { ACCENT_TEXT, BADGE_RADIUS } from '@/lib/theme'

// Named 'characterMention' (not the default 'mention') so a future
// @Place/@Note mention type can be a sibling node without attribute collisions.
export const CharacterMention = Mention.extend({
  name: 'characterMention',

  addAttributes() {
    return {
      characterId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-character-id'),
        renderHTML: (attrs: { characterId?: string | null }) =>
          attrs.characterId ? { 'data-character-id': attrs.characterId } : {},
      },
      label: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-label') ?? el.textContent?.replace(/^@/, '') ?? null,
        renderHTML: (attrs: { label?: string | null }) => (attrs.label ? { 'data-label': attrs.label } : {}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-character-mention]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        {
          'data-character-mention': '',
          class: `${ACCENT_TEXT} ${BADGE_RADIUS} font-medium cursor-pointer bg-indigo-50 dark:bg-indigo-950 px-1`,
        },
        HTMLAttributes
      ),
      `@${node.attrs.label ?? ''}`,
    ]
  },
})

export function filterCharacters(query: string, characters: Character[]): Character[] {
  const q = query.trim().toLowerCase()
  if (!q) return characters
  return characters.filter(c => c.name.toLowerCase().includes(q))
}
