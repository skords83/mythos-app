import { ReactRenderer } from '@tiptap/react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import type { MutableRefObject } from 'react'
import type { SuggestionOptions } from '@tiptap/suggestion'
import { MentionSuggestionList, MentionSuggestionListHandle, MentionSuggestionItem } from '@/app/components/MentionSuggestionList'
import { filterCharacters } from './characterMentionExtension'
import { filterByName } from './entityMentionExtension'
import type { Character, Item, Place } from '@/app/components/types'

const MAX_SUGGESTIONS = 10

export interface MentionableData {
  characters: Character[]
  places: Place[]
  items: Item[]
}

function collectSuggestions(query: string, data: MentionableData): MentionSuggestionItem[] {
  return [
    ...filterCharacters(query, data.characters).map(c => ({ kind: 'CHARACTER' as const, id: c.id, label: c.name })),
    ...filterByName(query, data.places).map(p => ({ kind: 'PLACE' as const, id: p.id, label: p.name })),
    ...filterByName(query, data.items).map(i => ({ kind: 'ITEM' as const, id: i.id, label: i.name })),
  ].slice(0, MAX_SUGGESTIONS)
}

export function createMentionSuggestion(
  dataRef: MutableRefObject<MentionableData>
): Partial<SuggestionOptions> {
  return {
    items: ({ query }: { query: string }) => collectSuggestions(query, dataRef.current),

    command: ({ editor, range, props }) => {
      const node =
        props.kind === 'CHARACTER'
          ? { type: 'characterMention', attrs: { characterId: props.id, label: props.label } }
          : { type: 'entityMention', attrs: { kind: props.kind, entityId: props.id, label: props.label } }

      editor
        .chain()
        .focus()
        .insertContentAt(range, [node, { type: 'text', text: ' ' }])
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
              command: (item: MentionSuggestionItem) => props.command(item),
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
            command: (item: MentionSuggestionItem) => props.command(item),
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
