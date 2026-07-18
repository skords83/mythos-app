import { EntityMention, filterByName } from '../entityMentionExtension'

describe('filterByName', () => {
  const entities = [
    { id: 'p1', name: 'Bruchtal' },
    { id: 'p2', name: 'Moria' },
    { id: 'p3', name: 'Morannon' },
  ]

  it('returns all entities for an empty query', () => {
    expect(filterByName('', entities)).toEqual(entities)
  })

  it('filters case-insensitively by substring match', () => {
    const result = filterByName('bruch', entities)
    expect(result).toEqual([entities[0]])
  })

  it('matches multiple entities sharing a substring', () => {
    const result = filterByName('mor', entities)
    expect(result.map(e => e.id)).toEqual(['p2', 'p3'])
  })

  it('returns an empty array when nothing matches', () => {
    expect(filterByName('gondor', entities)).toEqual([])
  })
})

// Mirrors what Tiptap core actually does before calling node.renderHTML: it runs
// each attribute's own renderHTML and merges the results into HTMLAttributes.
function computeHTMLAttributes(nodeAttrs: { kind?: string | null; entityId?: string | null; label?: string | null }) {
  const attrs = (EntityMention.config.addAttributes as any).call(EntityMention.config)
  return {
    ...attrs.kind.renderHTML(nodeAttrs),
    ...attrs.entityId.renderHTML(nodeAttrs),
    ...attrs.label.renderHTML(nodeAttrs),
  }
}

describe('EntityMention node config', () => {
  it('renderHTML produces a data-entity-mention span with the label text and kind', () => {
    const nodeAttrs = { kind: 'PLACE', entityId: 'p1', label: 'Bruchtal' }
    const result = (EntityMention.config.renderHTML as any).call(EntityMention.config, {
      node: { attrs: nodeAttrs },
      HTMLAttributes: computeHTMLAttributes(nodeAttrs),
    })

    expect(Array.isArray(result)).toBe(true)
    const [tag, attrs, text] = result as [string, Record<string, any>, string]
    expect(tag).toBe('span')
    expect(attrs['data-entity-mention']).toBe('')
    expect(attrs['data-entity-kind']).toBe('PLACE')
    expect(attrs['data-entity-id']).toBe('p1')
    expect(attrs['data-label']).toBe('Bruchtal')
    expect(text).toBe('@Bruchtal')
  })

  it('renderHTML omits data attrs when attrs are missing', () => {
    const nodeAttrs = {}
    const result = (EntityMention.config.renderHTML as any).call(EntityMention.config, {
      node: { attrs: nodeAttrs },
      HTMLAttributes: computeHTMLAttributes(nodeAttrs),
    })
    const [, attrs] = result as [string, Record<string, any>, string]
    expect(attrs['data-entity-kind']).toBeUndefined()
    expect(attrs['data-entity-id']).toBeUndefined()
    expect(attrs['data-label']).toBeUndefined()
  })

  it('parseHTML matches the data-entity-mention span selector', () => {
    const rules = EntityMention.config.parseHTML!.call(EntityMention.config as any)
    expect(rules).toEqual(
      expect.arrayContaining([expect.objectContaining({ tag: 'span[data-entity-mention]' })])
    )
  })

  it('the entityId/kind attributes parse back from data-entity-id/data-entity-kind', () => {
    const attrs = (EntityMention.config.addAttributes as any).call(EntityMention.config)
    const el = document.createElement('span')
    el.setAttribute('data-entity-kind', 'ITEM')
    el.setAttribute('data-entity-id', 'i9')
    el.setAttribute('data-label', 'Der Eine Ring')
    expect(attrs.kind.parseHTML(el)).toBe('ITEM')
    expect(attrs.entityId.parseHTML(el)).toBe('i9')
    expect(attrs.label.parseHTML(el)).toBe('Der Eine Ring')
  })

  it('the label attribute falls back to text content stripped of the @ prefix', () => {
    const attrs = (EntityMention.config.addAttributes as any).call(EntityMention.config)
    const el = document.createElement('span')
    el.textContent = '@Palantir'
    expect(attrs.label.parseHTML(el)).toBe('Palantir')
  })
})
