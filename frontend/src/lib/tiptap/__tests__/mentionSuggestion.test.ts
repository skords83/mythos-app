import { createMentionSuggestion, MentionableData } from '../mentionSuggestion'
import type { MentionSuggestionItem } from '@/app/components/MentionSuggestionList'
import type { Character, Item, Place } from '@/app/components/types'
import type { MutableRefObject } from 'react'

function makeCharacter(id: string, name: string): Character {
  return {
    id,
    name,
    appearance: null,
    personality: null,
    backstory: null,
    motivation: null,
    avatarUrl: null,
    visibility: 'PRIVATE',
    projectId: 'proj-1',
    familyId: 'fam-1',
    authorId: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function makePlace(id: string, name: string): Place {
  return {
    id,
    name,
    description: null,
    location: null,
    climate: null,
    importance: null,
    visibility: 'PRIVATE',
    projectId: 'proj-1',
    familyId: 'fam-1',
    authorId: 'user-1',
    parentId: null,
    images: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function makeItem(id: string, name: string): Item {
  return {
    id,
    name,
    description: null,
    origin: null,
    significance: null,
    visibility: 'PRIVATE',
    projectId: 'proj-1',
    familyId: 'fam-1',
    authorId: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function makeRef(overrides: Partial<MentionableData> = {}): MutableRefObject<MentionableData> {
  return { current: { characters: [], places: [], items: [], ...overrides } }
}

describe('createMentionSuggestion', () => {
  it('items() combines characters, places and items, reading live data through the ref', () => {
    const dataRef = makeRef({ characters: [makeCharacter('c1', 'Frodo')] })
    const suggestion = createMentionSuggestion(dataRef)

    expect(suggestion.items!({ query: '', editor: {} as any })).toEqual([
      { kind: 'CHARACTER', id: 'c1', label: 'Frodo' },
    ])

    dataRef.current = {
      characters: [makeCharacter('c1', 'Frodo')],
      places: [makePlace('p1', 'Bruchtal')],
      items: [makeItem('i1', 'Der Eine Ring')],
    }
    expect(suggestion.items!({ query: '', editor: {} as any })).toEqual([
      { kind: 'CHARACTER', id: 'c1', label: 'Frodo' },
      { kind: 'PLACE', id: 'p1', label: 'Bruchtal' },
      { kind: 'ITEM', id: 'i1', label: 'Der Eine Ring' },
    ])
  })

  it('items() filters each entity type by the query independently', () => {
    const dataRef = makeRef({
      characters: [makeCharacter('c1', 'Sam')],
      places: [makePlace('p1', 'Bruchtal'), makePlace('p2', 'Samwise Hollow')],
      items: [makeItem('i1', 'Stab')],
    })
    const suggestion = createMentionSuggestion(dataRef)
    const result = suggestion.items!({ query: 'sam', editor: {} as any }) as MentionSuggestionItem[]
    expect(result.map(r => r.id)).toEqual(['c1', 'p2'])
  })

  it('items() caps combined results at 10 entries', () => {
    const characters = Array.from({ length: 6 }, (_, i) => makeCharacter(`c${i}`, `Character${i}`))
    const places = Array.from({ length: 6 }, (_, i) => makePlace(`p${i}`, `Place${i}`))
    const dataRef = makeRef({ characters, places })
    const suggestion = createMentionSuggestion(dataRef)
    expect(suggestion.items!({ query: '', editor: {} as any })).toHaveLength(10)
  })

  function stubEditorChain() {
    const insertContentAt = jest.fn().mockReturnThis()
    const run = jest.fn()
    const focus = jest.fn().mockReturnValue({ insertContentAt })
    insertContentAt.mockReturnValue({ run })
    const chain = jest.fn().mockReturnValue({ focus })
    return { editor: { chain } as any, insertContentAt, run }
  }

  it('command() inserts a characterMention node for a CHARACTER item, followed by a trailing space', () => {
    const suggestion = createMentionSuggestion(makeRef())
    const { editor, insertContentAt, run } = stubEditorChain()

    suggestion.command!({
      editor,
      range: { from: 1, to: 3 },
      props: { kind: 'CHARACTER', id: 'c1', label: 'Frodo' },
    } as any)

    expect(insertContentAt).toHaveBeenCalledWith({ from: 1, to: 3 }, [
      { type: 'characterMention', attrs: { characterId: 'c1', label: 'Frodo' } },
      { type: 'text', text: ' ' },
    ])
    expect(run).toHaveBeenCalled()
  })

  it('command() inserts an entityMention node for a PLACE item, followed by a trailing space', () => {
    const suggestion = createMentionSuggestion(makeRef())
    const { editor, insertContentAt, run } = stubEditorChain()

    suggestion.command!({
      editor,
      range: { from: 1, to: 3 },
      props: { kind: 'PLACE', id: 'p1', label: 'Bruchtal' },
    } as any)

    expect(insertContentAt).toHaveBeenCalledWith({ from: 1, to: 3 }, [
      { type: 'entityMention', attrs: { kind: 'PLACE', entityId: 'p1', label: 'Bruchtal' } },
      { type: 'text', text: ' ' },
    ])
    expect(run).toHaveBeenCalled()
  })
})
