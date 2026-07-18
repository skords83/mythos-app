import type { MentionableEntityKind } from './entityMentionExtension'

interface MentionNodeLike {
  type: { name: string }
  attrs: Record<string, any>
}

export interface MentionClickResult {
  kind: 'CHARACTER' | MentionableEntityKind
  id: string
  position: { x: number; y: number }
}

export function resolveMentionClick(node: MentionNodeLike, event: MouseEvent): MentionClickResult | null {
  const position = { x: event.clientX, y: event.clientY }

  if (node.type.name === 'characterMention' && node.attrs.characterId) {
    return { kind: 'CHARACTER', id: node.attrs.characterId, position }
  }
  if (node.type.name === 'entityMention' && node.attrs.entityId && node.attrs.kind) {
    return { kind: node.attrs.kind, id: node.attrs.entityId, position }
  }
  return null
}
