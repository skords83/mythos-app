import { createCharacterMentionSuggestion } from '../characterMentionSuggestion'
import type { Character } from '@/app/components/types'
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

describe('createCharacterMentionSuggestion', () => {
  it('items() reads live data through the ref, not a snapshot at creation time', () => {
    const charactersRef: MutableRefObject<Character[]> = { current: [makeCharacter('c1', 'Frodo')] }
    const suggestion = createCharacterMentionSuggestion(charactersRef)

    expect(suggestion.items!({ query: '', editor: {} as any })).toEqual([makeCharacter('c1', 'Frodo')])

    charactersRef.current = [makeCharacter('c1', 'Frodo'), makeCharacter('c2', 'Sam')]
    expect(suggestion.items!({ query: 'sam', editor: {} as any })).toEqual([makeCharacter('c2', 'Sam')])
  })

  it('items() caps results at 10 entries', () => {
    const characters = Array.from({ length: 15 }, (_, i) => makeCharacter(`c${i}`, `Character${i}`))
    const charactersRef: MutableRefObject<Character[]> = { current: characters }
    const suggestion = createCharacterMentionSuggestion(charactersRef)
    expect(suggestion.items!({ query: '', editor: {} as any })).toHaveLength(10)
  })

  it('command() inserts a characterMention node followed by a trailing space', () => {
    const charactersRef: MutableRefObject<Character[]> = { current: [] }
    const suggestion = createCharacterMentionSuggestion(charactersRef)

    const insertContentAt = jest.fn().mockReturnThis()
    const run = jest.fn()
    const focus = jest.fn().mockReturnValue({ insertContentAt })
    insertContentAt.mockReturnValue({ run })
    const chain = jest.fn().mockReturnValue({ focus })
    const editor = { chain }

    suggestion.command!({
      editor: editor as any,
      range: { from: 1, to: 3 },
      props: { characterId: 'c1', label: 'Frodo' },
    } as any)

    expect(insertContentAt).toHaveBeenCalledWith({ from: 1, to: 3 }, [
      { type: 'characterMention', attrs: { characterId: 'c1', label: 'Frodo' } },
      { type: 'text', text: ' ' },
    ])
    expect(run).toHaveBeenCalled()
  })
})
