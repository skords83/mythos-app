import { ReactRenderer } from '@tiptap/react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import type { MutableRefObject } from 'react'
import type { SuggestionOptions } from '@tiptap/suggestion'
import { MentionSuggestionList, MentionSuggestionListHandle } from '@/app/components/MentionSuggestionList'
import { filterCharacters } from './characterMentionExtension'
import type { Character } from '@/app/components/types'

const MAX_SUGGESTIONS = 10

export function createCharacterMentionSuggestion(
  charactersRef: MutableRefObject<Character[]>
): Partial<SuggestionOptions> {
  return {
    items: ({ query }: { query: string }) => filterCharacters(query, charactersRef.current).slice(0, MAX_SUGGESTIONS),

    command: ({ editor, range, props }) => {
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          { type: 'characterMention', attrs: { characterId: props.characterId, label: props.label } },
          { type: 'text', text: ' ' },
        ])
        .run()
    },

    render: () => {
      let component: ReactRenderer<MentionSuggestionListHandle> | null = null
      let popup: TippyInstance | null = null

      return {
        onStart: props => {
          component = new ReactRenderer(MentionSuggestionList, {
            props: {
              items: props.items,
              command: (item: { characterId: string; label: string }) => props.command(item),
            },
            editor: props.editor,
          })
          if (!props.clientRect) return

          popup = tippy(document.body, {
            getReferenceClientRect: () => props.clientRect!() as DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            theme: 'transparent',
          })
        },

        onUpdate: props => {
          component?.updateProps({
            items: props.items,
            command: (item: { characterId: string; label: string }) => props.command(item),
          })
          if (!props.clientRect) return
          popup?.setProps({ getReferenceClientRect: () => props.clientRect!() as DOMRect })
        },

        onKeyDown: props => {
          if (props.event.key === 'Escape') {
            popup?.hide()
            return true
          }
          return component?.ref?.onKeyDown(props) ?? false
        },

        onExit: () => {
          popup?.destroy()
          component?.destroy()
        },
      }
    },
  }
}
