import { resolveCharacterMentionClick } from '../mentionClick'

function makeEvent(clientX: number, clientY: number): MouseEvent {
  return { clientX, clientY } as MouseEvent
}

describe('resolveCharacterMentionClick', () => {
  it('returns null for a non-mention node', () => {
    const node = { type: { name: 'paragraph' }, attrs: {} }
    expect(resolveCharacterMentionClick(node, makeEvent(10, 20))).toBeNull()
  })

  it('returns null for a characterMention node without a characterId', () => {
    const node = { type: { name: 'characterMention' }, attrs: {} }
    expect(resolveCharacterMentionClick(node, makeEvent(10, 20))).toBeNull()
  })

  it('returns the characterId and click position for a valid mention node', () => {
    const node = { type: { name: 'characterMention' }, attrs: { characterId: 'c1', label: 'Frodo' } }
    expect(resolveCharacterMentionClick(node, makeEvent(42, 84))).toEqual({
      characterId: 'c1',
      position: { x: 42, y: 84 },
    })
  })
})
