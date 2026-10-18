import { compareStoryAnchors, validityAt } from './universe-time'
import { universeTools } from './universe-schema'
import { valid } from './story-tool-schema'
const first={projectId:'book1',eventId:'found'},later={projectId:'book2',eventId:'lost'}
const edges=[{sourceId:'found',targetId:'lost'}]
test('explicit chronology, not book identifiers, establishes time',()=>{
 expect(compareStoryAnchors(first,later,edges)).toBe('BEFORE')
 expect(compareStoryAnchors(first,later,[])).toBe('UNKNOWN')
 expect(compareStoryAnchors({projectId:'book1'},{projectId:'book2'},edges)).toBe('UNKNOWN')
})
test('end is exclusive; later possession cannot overwrite the earlier checkpoint',()=>{
 expect(validityAt(first,later,first,edges)).toBe('ACTIVE')
 expect(validityAt(first,later,later,edges)).toBe('ENDED')
 expect(validityAt(later,null,first,edges)).toBe('FUTURE')
})
test('cycles and unspecified granularity stay unknown',()=>{
 expect(compareStoryAnchors(first,later,[...edges,{sourceId:'lost',targetId:'found'}])).toBe('UNKNOWN')
 expect(validityAt({projectId:'book1'},null,first,edges)).toBe('UNKNOWN')
})
test('every MCP tool has explicit scopes, validation and bounded pagination',()=>{
 expect(universeTools).toHaveLength(22)
 for(const t of universeTools){expect(t.securitySchemes[0].scopes).toEqual(t.annotations.readOnlyHint?['mythos:read']:['mythos:read','mythos:write']);expect(valid(t.inputSchema,null)).toBe(false);expect(t.inputSchema.additionalProperties).toBe(false)}
 const t=universeTools.find(t=>t.name==='mythos_update_universe')!
 expect(valid(t.inputSchema,{universeId:'u',title:'x'})).toBe(false)
 expect(valid(t.inputSchema,{universeId:'u',expectedUpdatedAt:'2026-10-18T10:00:00.000Z',description:null})).toBe(true)
})
