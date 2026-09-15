import { chronologyWarnings } from '../chronology'
const events=[{id:'arrival',title:'Ankunft',order:0},{id:'meeting',title:'Begegnung',order:1}]
const scenes=[{id:'scene',name:'Szene 14'}]
it('reports explicit order contradictions',()=>{
 expect(chronologyWarnings(events,[{sourceId:'meeting',sourceType:'EVENT',targetId:'arrival',targetType:'EVENT',relationType:'BEFORE'}],scenes)).toHaveLength(1)
})
it('checks past references against the assigned story time, not manuscript order',()=>{
 const anchor={sourceId:'scene',sourceType:'SCENE',targetId:'arrival',targetType:'EVENT',relationType:'TAKES_PLACE_AT'}
 const reference={...anchor,targetId:'meeting',relationType:'REFERENCES_PAST'}
 expect(chronologyWarnings(events,[anchor,reference],scenes)[0]).toContain('Szene 14')
 expect(chronologyWarnings(events,[reference],scenes)).toEqual([])
 expect(chronologyWarnings(events,[{...anchor,targetId:'meeting'},{...reference,targetId:'arrival'}],scenes)).toEqual([])
})
