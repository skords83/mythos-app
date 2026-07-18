/**
 * Shared relation-type vocabulary for A3 (Charakter-Ort-Verknüpfung), built on
 * the Z5 relation infrastructure. Relations are always stored as
 * sourceType=CHARACTER / targetType=PLACE; `characterLabel` reads as a prefix
 * before the place name ("lebt in {Ort}"), `placeLabel` as a suffix after the
 * character name ("{Charakter} lebt hier") — same underlying value, two
 * grammatical directions so both sides of the link read naturally.
 */
export const CHARACTER_PLACE_RELATION_TYPES: {
  value: string
  characterLabel: string
  placeLabel: string
}[] = [
  { value: 'LIVES_IN', characterLabel: 'lebt in', placeLabel: 'lebt hier' },
  { value: 'RULES_OVER', characterLabel: 'herrscht über', placeLabel: 'herrscht hier' },
  { value: 'VISITS', characterLabel: 'hält sich auf in', placeLabel: 'hält sich hier auf' },
  { value: 'BORN_IN', characterLabel: 'wurde geboren in', placeLabel: 'wurde hier geboren' },
  { value: 'WORKS_IN', characterLabel: 'arbeitet in', placeLabel: 'arbeitet hier' },
]

export const CUSTOM_TYPE = 'CUSTOM'
