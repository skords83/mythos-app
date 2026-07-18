import { resolveMentionClick } from '../mentionClick'

function makeEvent(clientX: number, clientY: number): MouseEvent {
  return { clientX, clientY } as MouseEvent
}

describe('resolveMentionClick', () => {
  it('returns null for a non-mention node', () => {
    const node = { type: { name: 'paragraph' }, attrs: {} }
    expect(resolveMentionClick(node, makeEvent(10, 20))).toBeNull()
  })

  it('returns null for a characterMention node without a characterId', () => {
    const node = { type: { name: 'characterMention' }, attrs: {} }
    expect(resolveMentionClick(node, makeEvent(10, 20))).toBeNull()
  })

  it('returns the id and click position for a valid characterMention node', () => {
    const node = { type: { name: 'characterMention' }, attrs: { characterId: 'c1', label: 'Frodo' } }
    expect(resolveMentionClick(node, makeEvent(42, 84))).toEqual({
      kind: 'CHARACTER',
      id: 'c1',
      position: { x: 42, y: 84 },
    })
  })

  it('returns null for an entityMention node missing entityId or kind', () => {
    const node = { type: { name: 'entityMention' }, attrs: { kind: 'PLACE' } }
    expect(resolveMentionClick(node, makeEvent(10, 20))).toBeNull()
  })

  it('returns the id, kind and click position for a valid entityMention (PLACE) node', () => {
    const node = { type: { name: 'entityMention' }, attrs: { kind: 'PLACE', entityId: 'p1', label: 'Bruchtal' } }
    expect(resolveMentionClick(node, makeEvent(42, 84))).toEqual({
      kind: 'PLACE',
      id: 'p1',
      position: { x: 42, y: 84 },
    })
  })

  it('returns the id, kind and click position for a valid entityMention (ITEM) node', () => {
    const node = { type: { name: 'entityMention' }, attrs: { kind: 'ITEM', entityId: 'i1', label: 'Der Eine Ring' } }
    expect(resolveMentionClick(node, makeEvent(1, 2))).toEqual({
      kind: 'ITEM',
      id: 'i1',
      position: { x: 1, y: 2 },
    })
  })
})
