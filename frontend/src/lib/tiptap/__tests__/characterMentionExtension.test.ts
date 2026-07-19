import { CharacterMention, filterCharacters } from '../characterMentionExtension'
import type { Character } from '@/app/components/types'

function makeCharacter(overrides: Partial<Character>): Character {
  return {
    id: 'char-1',
    name: 'Frodo',
    appearance: null,
    personality: null,
    backstory: null,
    motivation: null,
    flaw: null,
    secrets: null,
    avatarUrl: null,
    visibility: 'PRIVATE',
    projectId: 'proj-1',
    familyId: 'fam-1',
    authorId: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('filterCharacters', () => {
  const characters = [
    makeCharacter({ id: 'c1', name: 'Frodo' }),
    makeCharacter({ id: 'c2', name: 'Sam' }),
    makeCharacter({ id: 'c3', name: 'Samwise Gamgee' }),
  ]

  it('returns all characters for an empty query', () => {
    expect(filterCharacters('', characters)).toEqual(characters)
  })

  it('filters case-insensitively by substring match', () => {
    const result = filterCharacters('fro', characters)
    expect(result).toEqual([characters[0]])
  })

  it('matches multiple characters sharing a substring', () => {
    const result = filterCharacters('sam', characters)
    expect(result.map(c => c.id)).toEqual(['c2', 'c3'])
  })

  it('returns an empty array when nothing matches', () => {
    expect(filterCharacters('gandalf', characters)).toEqual([])
  })
})

// Mirrors what Tiptap core actually does before calling node.renderHTML: it runs
// each attribute's own renderHTML and merges the results into HTMLAttributes.
function computeHTMLAttributes(nodeAttrs: { characterId?: string | null; label?: string | null }) {
  const attrs = (CharacterMention.config.addAttributes as any).call(CharacterMention.config)
  return {
    ...attrs.characterId.renderHTML(nodeAttrs),
    ...attrs.label.renderHTML(nodeAttrs),
  }
}

describe('CharacterMention node config', () => {
  it('renderHTML produces a data-character-mention span with the label text', () => {
    const nodeAttrs = { characterId: 'c1', label: 'Frodo' }
    const result = (CharacterMention.config.renderHTML as any).call(CharacterMention.config, {
      node: { attrs: nodeAttrs },
      HTMLAttributes: computeHTMLAttributes(nodeAttrs),
    })

    expect(Array.isArray(result)).toBe(true)
    const [tag, attrs, text] = result as [string, Record<string, any>, string]
    expect(tag).toBe('span')
    expect(attrs['data-character-mention']).toBe('')
    expect(attrs['data-character-id']).toBe('c1')
    expect(attrs['data-label']).toBe('Frodo')
    expect(text).toBe('@Frodo')
  })

  it('renderHTML omits data attrs when attrs are missing', () => {
    const nodeAttrs = {}
    const result = (CharacterMention.config.renderHTML as any).call(CharacterMention.config, {
      node: { attrs: nodeAttrs },
      HTMLAttributes: computeHTMLAttributes(nodeAttrs),
    })
    const [, attrs] = result as [string, Record<string, any>, string]
    expect(attrs['data-character-id']).toBeUndefined()
    expect(attrs['data-label']).toBeUndefined()
  })

  it('parseHTML matches the data-character-mention span selector', () => {
    const rules = CharacterMention.config.parseHTML!.call(CharacterMention.config as any)
    expect(rules).toEqual(
      expect.arrayContaining([expect.objectContaining({ tag: 'span[data-character-mention]' })])
    )
  })

  it('the characterId attribute parses back from data-character-id', () => {
    const attrs = (CharacterMention.config.addAttributes as any).call(CharacterMention.config)
    const el = document.createElement('span')
    el.setAttribute('data-character-id', 'c9')
    el.setAttribute('data-label', 'Sam')
    expect(attrs.characterId.parseHTML(el)).toBe('c9')
    expect(attrs.label.parseHTML(el)).toBe('Sam')
  })

  it('the label attribute falls back to text content stripped of the @ prefix', () => {
    const attrs = (CharacterMention.config.addAttributes as any).call(CharacterMention.config)
    const el = document.createElement('span')
    el.textContent = '@Gandalf'
    expect(attrs.label.parseHTML(el)).toBe('Gandalf')
  })
})
