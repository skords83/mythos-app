interface MentionNodeLike {
  type: { name: string }
  attrs: Record<string, any>
}

export interface MentionClickResult {
  characterId: string
  position: { x: number; y: number }
}

export function resolveCharacterMentionClick(
  node: MentionNodeLike,
  event: MouseEvent
): MentionClickResult | null {
  if (node.type.name !== 'characterMention' || !node.attrs.characterId) return null
  return { characterId: node.attrs.characterId, position: { x: event.clientX, y: event.clientY } }
}
