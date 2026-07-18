/**
 * Shared relation-type vocabulary for A6 (Fraktionsmitgliedschaft), built on
 * the Z5 relation infrastructure. Relations are always stored as
 * sourceType=CHARACTER / targetType=FACTION; `characterLabel` reads as a
 * suffix after the character name ("{Charakter} ist Mitglied von"),
 * `factionLabel` as a suffix inside the faction's member list
 * ("{Charakter} ist Mitglied") — same underlying value, two grammatical
 * directions so both sides of the link read naturally.
 */
export const FACTION_MEMBERSHIP_RELATION_TYPES: {
  value: string
  characterLabel: string
  factionLabel: string
}[] = [
  { value: 'MEMBER_OF', characterLabel: 'ist Mitglied von', factionLabel: 'ist Mitglied' },
  { value: 'LEADER_OF', characterLabel: 'ist Anführer*in von', factionLabel: 'ist Anführer*in' },
  { value: 'FOUNDER_OF', characterLabel: 'ist Gründer*in von', factionLabel: 'ist Gründer*in' },
  { value: 'FORMER_MEMBER_OF', characterLabel: 'war Mitglied von', factionLabel: 'war Mitglied' },
]

export const CUSTOM_TYPE = 'CUSTOM'
