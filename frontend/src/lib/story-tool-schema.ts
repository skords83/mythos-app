// Shared MCP/HTTP validation: schemas are also enforced server-side.
export type Schema = { type?: string | string[]; enum?: unknown[]; properties?: Record<string, Schema>; required?: string[]; additionalProperties?: boolean; items?: Schema; minLength?: number; maxLength?: number; maxItems?: number; minimum?: number; maximum?: number; format?: string }
export const id: Schema = { type: 'string', minLength: 1, maxLength: 128 }
export const version: Schema = { type: 'string', format: 'date-time' }
export const entityType: Schema = { enum: ['CHARACTER', 'PLACE', 'ITEM', 'FACTION', 'SCENE', 'EVENT', 'LORE_ENTRY'] }
export const text: Schema = { type: 'string', maxLength: 20000 }
export const nullableText: Schema = { type: ['string', 'null'], maxLength: 20000 }
export const object = (properties: Record<string, Schema>, required: string[] = []): Schema => ({ type: 'object', properties, required, additionalProperties: false })
export function valid(schema: Schema, value: unknown): boolean {
  if (schema.enum && !schema.enum.includes(value)) return false
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : []
  if (types.length && !types.some(t => t === 'null' ? value === null : t === 'array' ? Array.isArray(value) : t === 'integer' ? Number.isInteger(value) : t === 'object' ? !!value && typeof value === 'object' && !Array.isArray(value) : typeof value === t)) return false
  if (typeof value === 'string' && ((schema.minLength && value.trim().length < schema.minLength) || (schema.maxLength && value.length > schema.maxLength) || (schema.format === 'date-time' && (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value)))))) return false
  if (typeof value === 'number' && ((schema.minimum !== undefined && value < schema.minimum) || (schema.maximum !== undefined && value > schema.maximum))) return false
  if (Array.isArray(value) && ((schema.maxItems !== undefined && value.length > schema.maxItems) || (schema.items && !value.every(v => valid(schema.items!, v))))) return false
  if (value && typeof value === 'object' && !Array.isArray(value) && schema.properties) {
    const row = value as Record<string, unknown>
    if (schema.required?.some(k => row[k] === undefined) || Object.keys(row).some(k => !schema.properties![k] || !valid(schema.properties![k], row[k]))) return false
  }
  return true
}
const eventFields = { title: { ...text, minLength: 1, maxLength: 300 }, description: nullableText, date: nullableText, duration: { type: ['string', 'null'], maxLength: 100 }, chapterId: { ...id, type: ['string', 'null'] }, order: { type: 'integer', minimum: 0, maximum: 1000000 }, type: { enum: ['LORE', 'PLOT'] }, visibility: { enum: ['PRIVATE', 'FAMILY'] } }
const sceneFields = { name: { ...text, minLength: 1, maxLength: 300 }, description: nullableText, outline: nullableText, tags: { type: 'array', maxItems: 100, items: { type: 'string', minLength: 1, maxLength: 100 } }, visibility: { enum: ['PRIVATE', 'FAMILY'] }, chapterId: id }
const edgeFields = { sourceType: entityType, sourceId: id, targetType: entityType, targetId: id, relationType: { ...text, minLength: 1, maxLength: 300 }, label: nullableText }
const evidenceFields = {
  field: { type: ['string', 'null'], maxLength: 128 }, statement: { ...text, minLength: 1, maxLength: 2000 },
  chapterId: id, sceneId: { type: ['string', 'null'], minLength: 1, maxLength: 128 },
  quote: { ...text, minLength: 1, maxLength: 1000 }, prefix: { ...text, maxLength: 200 }, suffix: { ...text, maxLength: 200 },
  commentId: { type: ['string', 'null'], minLength: 1, maxLength: 128 },
  sourceExpectedUpdatedAt: version, flagged: { type: 'boolean' },
}
const anchor = { entityType, entityId: id }
const paging = { page: { type: 'integer', minimum: 1, maximum: 10000 }, limit: { type: 'integer', minimum: 1, maximum: 100 } }
const definitions: Array<[string, string, Schema, boolean]> = [
  ['create_event', 'Ereignis im eigenen Projekt sofort anlegen. Titel sind nicht eindeutig. Ohne order am Ende; date und duration sind freie Texte (auch relativ/ungefähr), kein Kalenderdatum erforderlich. Standard: PLOT, PRIVATE. Beziehungen und Belege separat mit entityType EVENT verwalten; kein Kapiteltext wird verändert.', object({ projectId: id, ...eventFields }, ['projectId', 'title']), true],
  ['update_event', 'Eigenes Ereignis im eigenen Projekt bearbeiten. Zuvor lesen: expectedUpdatedAt erforderlich. Ausgelassen bleibt unverändert; description/date/duration mit null oder leerem String leeren, chapterId mit null. Projekt und Autor bleiben unverändert.', object({ projectId: id, id, expectedUpdatedAt: version, ...eventFields }, ['projectId', 'id', 'expectedUpdatedAt']), true],
  ['delete_event', 'Sichtbares Ereignis im eigenen Projekt löschen (Autor oder Familien-Owner), mit expectedUpdatedAt. Beziehungen und Quellenbelege werden atomar entfernt; zeitliche Aussagen blockieren das Löschen. Andere Einträge und Kapiteltexte bleiben erhalten.', object({ projectId: id, id, expectedUpdatedAt: version }, ['projectId', 'id', 'expectedUpdatedAt']), true],
  ['reorder_events', 'Alle Ereignisse eines eigenen Projekts (PLOT und LORE, ohne Filter) atomar auf Positionen 0 bis n-1 sortieren. Vollständige eindeutige ID-Liste und expectedUpdatedAt je Ereignis erforderlich. Fremde Autoren verhindern jede Änderung.', object({ projectId: id, events: { type: 'array', maxItems: 1000, items: object({ id, expectedUpdatedAt: version }, ['id', 'expectedUpdatedAt']) } }, ['projectId', 'events']), true],
  ['scenes', 'Szenen eines Kapitels vollständig mit sichtbaren Beziehungen lesen. Szenen sind Planung (Beschreibung, Gliederung, Tags), ohne eigenen Romantext oder Status. Kapiteltext bleibt im Kapitel.', object({ chapterId: id, ...paging }, ['chapterId']), false],
  ['scene', 'Eine sichtbare Szene vollständig lesen, einschließlich updatedAt und Beziehungen.', object({ id }, ['id']), false],
  ['create_scene', 'Szene am Kapitelende anlegen. Verändert keinen Kapiteltext.', object(sceneFields, ['chapterId', 'name']), true],
  ['update_scene', 'Eigene Szene bearbeiten oder innerhalb desselben Projekts einem Kapitel zuordnen (dort ans Ende). Kein Text wird kopiert oder überschrieben. Ausgelassen bleibt unverändert; null leert Beschreibung/Gliederung, [] leert Tags.', object({ id, expectedUpdatedAt: version, ...sceneFields }, ['id', 'expectedUpdatedAt']), true],
  ['reorder_scenes', 'Alle Szenen eines Kapitels atomar in der angegebenen Reihenfolge sortieren. Erfordert Autorenschaft und aktuelle expectedUpdatedAt für jede Szene; bei fremden Szenen keine Änderung.', object({ chapterId: id, scenes: { type: 'array', maxItems: 1000, items: object({ id, expectedUpdatedAt: version }, ['id', 'expectedUpdatedAt']) } }, ['chapterId', 'scenes']), true],
  ['relations', 'Sichtbare Beziehungen einer Entität in beiden Richtungen lesen, mit IDs, Typ, Beschriftung, Autor und updatedAt.', object({ ...anchor, ...paging }, ['entityType', 'entityId']), false],
  ['create_relation', 'Eine gerichtete Beziehung anlegen. Mitgliedschaft: CHARACTER → FACTION. Timeline-Sonderregeln gelten. Beschriftung optional; keine anderen Beziehungen werden ersetzt.', object(edgeFields, ['sourceType', 'sourceId', 'targetType', 'targetId', 'relationType']), true],
  ['update_relation', 'Eine eigene sichtbare Beziehung gezielt ändern, auch Richtung/Endpunkte. Ausgelassene Felder bleiben, label:null leert die Beschriftung. Versionsschutz erforderlich.', object({ id, expectedUpdatedAt: version, ...edgeFields }, ['id', 'expectedUpdatedAt']), true],
  ['delete_relation', 'Nur die benannte sichtbare Beziehung entfernen (Autor oder Familien-Owner). Versionsschutz erforderlich.', object({ id, expectedUpdatedAt: version }, ['id', 'expectedUpdatedAt']), true],
  ['evidence', 'Quellenbelege einer Wissensentität mit aktuellem Ankerstatus lesen. Nur zugängliche Einträge und eigene Kapitel; mehrere Belege je Aussage möglich.', object({ ...anchor, ...paging }, ['entityType', 'entityId']), false],
  ['create_evidence', 'Manuell geprüften Quellenbeleg anlegen. Exaktes Zitat plus optionaler Kontext bilden einen dauerhaften Textanker; vorhandene commentId wird bevorzugt. sourceExpectedUpdatedAt ist der gelesene Kapitelstand. Keine Textänderung. Nur eigene Wissenseinträge.', object({ ...anchor, ...evidenceFields }, ['entityType', 'entityId', 'statement', 'chapterId', 'quote', 'sourceExpectedUpdatedAt']), true],
  ['update_evidence', 'Quellenbeleg bearbeiten. Ausgelassen bleibt erhalten; field/sceneId/commentId:null entfernt die Angabe. flagged:true markiert Prüfbedarf. Neue Textverankerung verlangt sourceExpectedUpdatedAt und eindeutigen Fund.', object({ id, expectedUpdatedAt: version, ...evidenceFields }, ['id', 'expectedUpdatedAt']), true],
  ['delete_evidence', 'Einen Quellenbeleg gezielt entfernen, mit Versionsschutz und denselben Autorenrechten wie der Wissenseintrag.', object({ id, expectedUpdatedAt: version }, ['id', 'expectedUpdatedAt']), true],
]
export const storyTools = definitions.map(([action, description, inputSchema, write]) => {
  const securitySchemes = [{ type: 'oauth2', scopes: write ? ['mythos:read', 'mythos:write'] : ['mythos:read'] }]
  return { name: `mythos_${action}`, description, inputSchema, annotations: { readOnlyHint: !write, destructiveHint: write && !action.startsWith('create'), idempotentHint: !write, openWorldHint: false }, securitySchemes, _meta: { securitySchemes } }
})
