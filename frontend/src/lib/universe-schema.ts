import { id, version, text, nullableText, object, type Schema } from './story-tool-schema'
export const sharedTypes = ['CHARACTER', 'PLACE', 'ITEM', 'FACTION', 'LORE_ENTRY'] as const
const entityType = { enum: [...sharedTypes] }
const anchorFields = { projectId: id, chapterId: id, sceneId: id, eventId: id }
export const anchorSchema = object(anchorFields, ['projectId'])
const nullableAnchor = { ...anchorSchema, type: ['object', 'null'] }
const paging = { page: { type: 'integer', minimum: 1, maximum: 10000 }, limit: { type: 'integer', minimum: 1, maximum: 100 } }
const scope = { universeId: id }
const entity = { ...scope, entityType, entityId: id }
const revision = { expectedUpdatedAt: version }
const title = { type: 'string', minLength: 1, maxLength: 300 }
const fields = object(Object.fromEntries(['name','title','appearance','personality','backstory','motivation','flaw','secrets','description','origin','significance','location','climate','importance','history','politics','sensoryDetails','goal','content','category'].map(k => [k, ['name','title'].includes(k) ? title : nullableText])))
const assertionFields = {
  kind: { enum: ['PROPERTY','OWNER','LOCATION','RELATION','MEMBERSHIP','KNOWLEDGE','RULE'] },
  property: title, value: { ...text, minLength: 1 }, perspective: { enum: ['WORLD','BELIEF'] },
  observerId: { type: ['string','null'], minLength: 1, maxLength: 128 },
  status: { enum: ['CONFIRMED','SUSPECTED','DISPUTED','REJECTED'] },
  startsAt: anchorSchema, endsAt: nullableAnchor, revealedAt: nullableAnchor,
  relationId: { type: ['string','null'], minLength: 1, maxLength: 128 },
  evidenceIds: { type: 'array', items: id, maxItems: 100 },
}
const definitions: Array<[string,string,Schema,boolean]> = [
 ['universes','Zugängliche Universen auflisten.',object(paging),false],
 ['universe','Universum lesen. Buchdetails nur für eigene Bücher; Freigabe öffnet keine Manuskripte.',object(scope,['universeId']),false],
 ['create_universe','Universum mit einer gemeinsamen Kontinuität anlegen; standardmäßig privat.',object({title,description:nullableText,visibility:{enum:['PRIVATE','FAMILY']}},['title']),true],
 ['update_universe','Titel, Beschreibung oder Sichtbarkeit als Autor korrigieren. Keine Buchrechte werden vergeben.',object({...scope,...revision,title,description:nullableText,visibility:{enum:['PRIVATE','FAMILY']}},['universeId','expectedUpdatedAt']),true],
 ['universe_books','Zugängliche zugeordnete Bücher in Lesereihenfolge, unabhängig von Ereigniszeit.',object({...scope,...paging},['universeId']),false],
 ['create_universe_book','Neues eigenes Buch mit erstem Kapitel im Universum atomar anlegen. Keine vorhandenen Inhalte übernehmen.',object({...scope,...revision,title,description:nullableText},['universeId','expectedUpdatedAt','title']),true],
 ['create_universe_event','Vorhandenes TimelineEvent als Handlungsanker in einem eigenen Buch anlegen; BEFORE-Beziehungen stellen explizite zeitliche Ordnung her.',object({...scope,projectId:id,title,description:nullableText,date:nullableText,chapterId:id},['universeId','projectId','title']),true],
 ['update_universe_event','Eigenes TimelineEvent mit Versionsschutz korrigieren. Keine Buchreihenfolge wird als Ereigniszeit interpretiert.',object({...scope,id,...revision,title,description:nullableText,date:nullableText},['universeId','id','expectedUpdatedAt']),true],
 ['attach_universe_book','Eigenes bestehendes Buch zuordnen; Universumsautor erforderlich. Keine Inhalte übernehmen.',object({...scope,projectId:id,...revision,projectExpectedUpdatedAt:version},['universeId','projectId','expectedUpdatedAt','projectExpectedUpdatedAt']),true],
 ['detach_universe_book','Buch nur ohne Verwendungen, Aussagen und gemeinsame Referenzen lösen. Manuskripte bleiben erhalten.',object({...scope,projectId:id,...revision,projectExpectedUpdatedAt:version},['universeId','projectId','expectedUpdatedAt','projectExpectedUpdatedAt']),true],
 ['reorder_universe_books','Vollständige Permutation der Buch-IDs atomar speichern; ändert keine Handlungszeit.',object({...scope,...revision,projectIds:{type:'array',items:id,maxItems:1000}},['universeId','expectedUpdatedAt','projectIds']),true],
 ['universe_entries','Gemeinsame Einträge nach Typ lesen. Mit projectId ausschließlich ausdrücklich verwendete Einträge.',object({...scope,entityType,projectId:id,...paging},['universeId','entityType']),false],
 ['universe_entry','Gemeinsame Identität, allgemeine Angaben und zugängliche Buchverwendungen lesen. Entwicklungen separat abfragen.',object(entity,['universeId','entityType','entityId']),false],
 ['create_universe_entry','Gemeinsamen Eintrag im bestehenden Wissensmodell anlegen. fields enthält typspezifische allgemeine Angaben. Keine automatische Buchverwendung.',object({...scope,entityType,fields,visibility:{enum:['PRIVATE','FAMILY']}},['universeId','entityType','fields']),true],
 ['update_universe_entry','Allgemeine Angaben korrigieren, keine Handlung entwickeln. Antwort zeigt betroffene Buchverwendungen. Ausgelassen bleibt erhalten; null leert optionale Textfelder.',object({...entity,...revision,fields,visibility:{enum:['PRIVATE','FAMILY']}},['universeId','entityType','entityId','expectedUpdatedAt','fields']),true],
 ['use_universe_entry','Gemeinsamen Eintrag ausdrücklich in eigenem Buch verwenden oder Verwendung kontrolliert aufheben. remove:true entfernt nur die Verwendung; Abhängigkeiten verhindern Entfernung.',object({...entity,projectId:id,...revision,remove:{type:'boolean'}},['universeId','entityType','entityId','projectId','expectedUpdatedAt']),true],
 ['preview_universe_promotion','Gezielte Übernahme eines eigenen lokalen Eintrags vorprüfen: Beziehungen, Textverknüpfungen, Quellen und mögliche Namensduplikate. Keine Änderungen.',object({...entity,projectId:id},['universeId','entityType','entityId','projectId']),false],
 ['promote_universe_entry','Einzelnen Eintrag nach Vorschau atomar übernehmen; IDs und Text bleiben unverändert. Keine Zusammenführung. previewToken schützt sämtliche Vorschauabhängigkeiten.',object({...entity,projectId:id,...revision,previewToken:{type:'string',minLength:64,maxLength:64}},['universeId','entityType','entityId','projectId','expectedUpdatedAt','previewToken']),true],
 ['universe_assertions','Aussagen/Entwicklungen am Handlungsstand abfragen. view:reader filtert spätere/unbekannte Enthüllungen; character zeigt Überzeugungen dieser Figur; author zeigt ausdrücklich alle Aussagen und darf at auslassen. Fehlende zeitliche Vergleichbarkeit bleibt UNKNOWN.',object({...entity,at:anchorSchema,view:{enum:['reader','character','author']},observerId:id,...paging},['universeId','entityType','entityId','view']),false],
 ['create_universe_assertion','Neue Entwicklung oder Aussage, nicht allgemeine Korrektur. Wahrheit (WORLD), Figurenüberzeugung (BELIEF), Erkenntnisstatus und revealedAt sind unabhängig. Quellen nur vorhandene zugängliche SourceEvidence-IDs.',object({...entity,...assertionFields},['universeId','entityType','entityId','kind','property','value','perspective','status','startsAt']),true],
 ['delete_universe_assertion','Eigene Aussage mit Versionsschutz entfernen. Identität, Beziehungen, Manuskripte und Quellenbelege bleiben erhalten.',object({...scope,id,...revision},['universeId','id','expectedUpdatedAt']),true],
 ['update_universe_assertion','Eigene Aussage mit Versionsschutz korrigieren. Neue Entwicklung als neue Aussage anlegen. Ausgelassen bleibt; endsAt/revealedAt/observerId/relationId:null leert; evidenceIds:[] entfernt Zuordnungen, nicht Belege.',object({...scope,id,...revision,...assertionFields},['universeId','id','expectedUpdatedAt']),true],
]
export const universeTools = definitions.map(([action,description,inputSchema,write]) => {
 const securitySchemes = [{type:'oauth2',scopes:write?['mythos:read','mythos:write']:['mythos:read']}]
 return {name:`mythos_${action}`,description,inputSchema,annotations:{readOnlyHint:!write,destructiveHint:write&&!action.startsWith('create'),idempotentHint:!write,openWorldHint:false},securitySchemes,_meta:{securitySchemes}}
})
