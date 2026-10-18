/** @jest-environment node */
import { randomUUID } from 'crypto'
import { prisma } from './prisma'
import { runUniverseAction } from './universe-service'
import { runStoryAction } from './story-service'
import { bookEntityScope } from './universe-scope'
import { sourceHash } from './evidence-anchor'
import type { AuthContext } from './auth'
const suite=process.env.MYTHOS_RUN_UNIVERSE_TEST==='1'?describe:describe.skip
suite('universes on isolated PostgreSQL (no user data)',()=>{
 let auth:AuthContext,other:AuthContext,u:any,b1:any,b2:any,item:any,c1:any,c2:any,e1:any,e2:any,proof:any,localPlace:any
 const uid=randomUUID(),versions=(r:any)=>r.updatedAt instanceof Date?r.updatedAt.toISOString():r.updatedAt
 const run=async(action:string,args:any,as=auth)=>runUniverseAction(as,action,args)
 const good=async(action:string,args:any,as=auth)=>{const r=await run(action,args,as);expect(r).not.toHaveProperty('error');return r.data as any}
 const refresh=async()=>{u=await prisma.universe.findUniqueOrThrow({where:{id:u.id}});item=await prisma.item.findUniqueOrThrow({where:{id:item.id}})}
 const common=()=>({universeId:u.id,entityType:'ITEM',entityId:item.id})
 beforeAll(async()=>{
  const url=new URL(process.env.DATABASE_URL!);if(url.hostname!=='127.0.0.1'||url.port!=='55432'||url.pathname!=='/mythos_integration_test'||url.searchParams.get('schema')!=='universe_acceptance')throw Error('Refusing non-test database')
  const family=await prisma.family.create({data:{name:`Universe acceptance ${uid}`}})
  const user=await prisma.user.create({data:{email:`universe-${uid}@example.invalid`,password:'not-a-login',familyId:family.id}})
  const reader=await prisma.user.create({data:{email:`reader-${uid}@example.invalid`,password:'not-a-login',familyId:family.id}})
  auth={userId:user.id,familyId:family.id,role:'ADULT'};other={...auth,userId:reader.id}
  b1=await prisma.project.create({data:{title:'Fixture Book One',userId:user.id}});b2=await prisma.project.create({data:{title:'Fixture Book Two',userId:user.id}})
  item=await prisma.item.create({data:{name:'Fixture rope',projectId:b1.id,familyId:family.id,authorId:user.id,visibility:'FAMILY'}})
  c1=await prisma.chapter.create({data:{projectId:b1.id,title:'PRIVATE CHAPTER',content:`<p><span data-type="mention" data-id="${item.id}">Fixture rope</span> found.</p>`}})
  c2=await prisma.chapter.create({data:{projectId:b2.id,title:'Second chapter',content:'<p>Second chapter.</p>'}})
  localPlace=await prisma.place.create({data:{name:'Fixture cave',projectId:b1.id,familyId:family.id,authorId:user.id}})
  await prisma.relation.create({data:{familyId:family.id,authorId:user.id,sourceType:'ITEM',sourceId:item.id,targetType:'PLACE',targetId:localPlace.id,relationType:'FOUND_AT',label:'metadata'}})
  proof=await prisma.sourceEvidence.create({data:{entityType:'ITEM',entityId:item.id,statement:'Found',chapterId:c1.id,quote:'Fixture rope',sourceHash:sourceHash(c1.content),sourceUpdatedAt:c1.updatedAt,familyId:family.id,authorId:user.id}})
 })
 afterAll(async()=>{
  if(!auth)return
  await prisma.continuityAssertion.deleteMany({where:{universe:{familyId:auth.familyId}}})
  await prisma.entityUsage.deleteMany({where:{project:{user:{familyId:auth.familyId}}}})
  // Unlink test-only rows before normal cascades; universe FK intentionally restricts.
  await prisma.project.updateMany({where:{user:{familyId:auth.familyId}},data:{universeId:null}})
  for(const m of ['character','place','item','faction','loreEntry'] as const) await (prisma[m] as any).updateMany({where:{familyId:auth.familyId},data:{universeId:null}})
  await prisma.universe.deleteMany({where:{familyId:auth.familyId}})
  await prisma.family.delete({where:{id:auth.familyId}});await prisma.$disconnect()
 })
 test('standalone books remain unchanged; attach is explicit, versioned and does not migrate content',async()=>{
  expect(await bookEntityScope(prisma,b1.id,'ITEM')).toEqual({projectId:b1.id})
  u=await good('create_universe',{title:'Fixture universe',visibility:'FAMILY'})
  u=await good('attach_universe_book',{universeId:u.id,projectId:b1.id,expectedUpdatedAt:versions(u),projectExpectedUpdatedAt:versions(b1)})
  u=await good('attach_universe_book',{universeId:u.id,projectId:b2.id,expectedUpdatedAt:versions(u),projectExpectedUpdatedAt:versions(b2)})
  expect((await prisma.item.findUniqueOrThrow({where:{id:item.id}})).projectId).toBe(b1.id)
  expect((await good('universe_entries',{universeId:u.id,entityType:'ITEM'})).entries).toEqual([])
 })
 test('promotion retains identity, prose, relations and sources; same names never merge',async()=>{
  await good('create_universe_entry',{universeId:u.id,entityType:'ITEM',fields:{name:item.name}})
  const preview=await good('preview_universe_promotion',{...common(),projectId:b1.id})
  expect(preview.possibleDuplicates).toHaveLength(1);expect(preview.relations).toHaveLength(1);expect(preview.sources).toHaveLength(1);expect(preview.textLinks).toHaveLength(1)
  item=await good('promote_universe_entry',{...common(),projectId:b1.id,expectedUpdatedAt:versions(item),previewToken:preview.previewToken})
  expect(item.projectId).toBeNull();expect(item.universeId).toBe(u.id)
  expect((await prisma.chapter.findUniqueOrThrow({where:{id:c1.id}})).content).toEqual(c1.content)
  expect(await prisma.sourceEvidence.findUnique({where:{id:proof.id}})).toMatchObject({entityId:item.id})
  expect((await good('universe_entries',{universeId:u.id,entityType:'ITEM'})).entries).toHaveLength(2)
  expect((await good('universe_entries',{universeId:u.id,entityType:'ITEM',projectId:b2.id})).entries).toHaveLength(0)
  await good('use_universe_entry',{...common(),projectId:b2.id,expectedUpdatedAt:versions(item)});await refresh()
  const second=await good('universe_entries',{universeId:u.id,entityType:'ITEM',projectId:b2.id});expect(second.entries.map((r:any)=>r.id)).toEqual([item.id])
 })
 test('stale versions and failed promotion leave all rows local',async()=>{
  const args={universeId:u.id,entityType:'PLACE',entityId:localPlace.id,projectId:b1.id}
  const preview=await good('preview_universe_promotion',args)
  await prisma.place.update({where:{id:localPlace.id},data:{description:'Concurrent correction'}})
  expect((await run('promote_universe_entry',{...args,expectedUpdatedAt:versions(localPlace),previewToken:preview.previewToken})).status).toBe(409)
  expect((await prisma.place.findUniqueOrThrow({where:{id:localPlace.id}})).projectId).toBe(b1.id)
  expect(await prisma.entityUsage.count({where:{entityId:localPlace.id}})).toBe(0)
  const before=await prisma.item.findUniqueOrThrow({where:{id:item.id}})
  expect((await run('update_universe_entry',{...common(),expectedUpdatedAt:'2000-01-01T00:00:00.000Z',fields:{name:'bad'}})).status).toBe(409)
  expect(await prisma.item.findUnique({where:{id:item.id}})).toEqual(before)
 })
 test('explicit events preserve earlier possession and book reorder does not change chronology',async()=>{
  const meta={familyId:auth.familyId,authorId:auth.userId}
  e1=await prisma.timelineEvent.create({data:{...meta,title:'Find fixture',projectId:b1.id}});e2=await prisma.timelineEvent.create({data:{...meta,title:'Lose fixture',projectId:b2.id}})
  expect((await runStoryAction(auth,'create_relation',{sourceType:'EVENT',sourceId:e1.id,targetType:'EVENT',targetId:e2.id,relationType:'BEFORE'})).status).toBe(201)
  const a={projectId:b1.id,eventId:e1.id},b={projectId:b2.id,eventId:e2.id}
  await good('create_universe_assertion',{...common(),kind:'OWNER',property:'Owner',value:'Fixture person A',perspective:'WORLD',status:'CONFIRMED',startsAt:a,endsAt:b,revealedAt:a,evidenceIds:[proof.id]})
  await good('create_universe_assertion',{...common(),kind:'OWNER',property:'Owner',value:'Nobody',perspective:'WORLD',status:'CONFIRMED',startsAt:b,revealedAt:b})
  const first=await good('universe_assertions',{...common(),at:a,view:'reader'});expect(first.entries.map((r:any)=>r.value)).toEqual(['Fixture person A'])
  const second=await good('universe_assertions',{...common(),at:b,view:'reader'});expect(second.entries.map((r:any)=>r.value)).toEqual(['Nobody'])
  await refresh();u=await good('reorder_universe_books',{universeId:u.id,expectedUpdatedAt:versions(u),projectIds:[b2.id,b1.id]})
  const after=await good('universe_assertions',{...common(),at:a,view:'author'});expect(after.entries.find((r:any)=>r.value==='Nobody').validity).toBe('FUTURE')
  u=await good('reorder_universe_books',{universeId:u.id,expectedUpdatedAt:versions(u),projectIds:[b1.id,b2.id]})
  const unknown=await good('universe_assertions',{...common(),at:{projectId:b1.id},view:'author'});expect(unknown.uncertain).toBe(true)
 })
 test('world, belief and reader revelation are separate; contradictions coexist',async()=>{
  const person=await good('create_universe_entry',{universeId:u.id,entityType:'CHARACTER',fields:{name:'Fixture observer'}})
  const a={projectId:b1.id,eventId:e1.id},b={projectId:b2.id,eventId:e2.id}
  for(const perspective of ['WORLD','BELIEF'])await good('create_universe_assertion',{...common(),kind:'RULE',property:'Material',value:perspective==='WORLD'?'Hemp':'Silk',perspective,status:perspective==='WORLD'?'CONFIRMED':'SUSPECTED',...(perspective==='BELIEF'?{observerId:person.id}:{}),startsAt:a,revealedAt:b})
  expect((await good('universe_assertions',{...common(),at:a,view:'reader'})).entries.some((r:any)=>r.property==='Material')).toBe(false)
  const character=await good('universe_assertions',{...common(),at:a,view:'character',observerId:person.id});expect(character.entries.map((r:any)=>r.value)).toEqual(['Silk'])
  await good('create_universe_assertion',{...common(),kind:'RULE',property:'Material',value:'Unknown fibre',perspective:'WORLD',status:'DISPUTED',startsAt:a,revealedAt:b})
  expect((await good('universe_assertions',{...common(),at:a,view:'author'})).contradictions).toHaveLength(2)
 })
 test('shared universe reveals no private book title, chapter title, quote or source ID',async()=>{
  expect((await good('universe_books',{universeId:u.id},other)).entries).toEqual([])
  expect((await good('universe_entry',common(),other)).usages).toEqual([])
  const readerBook=await prisma.project.create({data:{title:'Reader own fixture',userId:other.userId,universeId:u.id}})
  const rows=await good('universe_assertions',{...common(),at:{projectId:readerBook.id},view:'author'},other)
  const encoded=JSON.stringify(rows);expect(encoded).not.toContain('PRIVATE CHAPTER');expect(encoded).not.toContain(proof.id);expect(encoded).not.toContain(c1.id);expect(encoded).not.toContain(b1.id)
  expect((await run('update_universe_entry',{...common(),expectedUpdatedAt:versions(item),fields:{name:'unauthorized'}},other)).status).toBe(403)
  await prisma.project.delete({where:{id:readerBook.id}})
 })
 test('a failure after the identity update rolls back the whole promotion',async()=>{
  const candidate=await prisma.item.create({data:{name:'Rollback fixture',projectId:b1.id,familyId:auth.familyId,authorId:auth.userId}})
  const args={universeId:u.id,entityType:'ITEM',entityId:candidate.id,projectId:b1.id}
  const preview=await good('preview_universe_promotion',args)
  // Simulate a conflicting usage insert; the unique violation occurs after the scope update.
  await prisma.entityUsage.create({data:{entityType:'ITEM',entityId:candidate.id,projectId:b1.id}})
  expect((await run('promote_universe_entry',{...args,expectedUpdatedAt:versions(candidate),previewToken:preview.previewToken})).status).toBe(409)
  expect(await prisma.item.findUnique({where:{id:candidate.id}})).toEqual(candidate)
  await prisma.entityUsage.deleteMany({where:{entityId:candidate.id}})
 })
 test('empty book can be detached; foreign-universe edges cannot be created',async()=>{
  await refresh()
  const empty=await good('create_universe_book',{universeId:u.id,expectedUpdatedAt:versions(u),title:'Empty fixture'})
  await refresh()
  u=await good('detach_universe_book',{universeId:u.id,projectId:empty.id,expectedUpdatedAt:versions(u),projectExpectedUpdatedAt:versions(empty)})
  expect((await prisma.project.findUniqueOrThrow({where:{id:empty.id}})).universeId).toBeNull()
  const foreign=await good('create_universe',{title:'Foreign fixture'})
  const target=await good('create_universe_entry',{universeId:foreign.id,entityType:'ITEM',fields:{name:'Foreign object'}})
  expect((await runStoryAction(auth,'create_relation',{sourceType:'ITEM',sourceId:item.id,targetType:'ITEM',targetId:target.id,relationType:'RELATED_TO'})).status).toBe(409)
 })
 test('event and assertion maintenance is versioned; deleting an assertion preserves identity',async()=>{
  const event=await good('create_universe_event',{universeId:u.id,projectId:b1.id,title:'Maintenance fixture'})
  const updated=await good('update_universe_event',{universeId:u.id,id:event.id,expectedUpdatedAt:versions(event),title:'Corrected fixture'})
  expect(updated.title).toBe('Corrected fixture')
  expect((await run('update_universe_event',{universeId:u.id,id:event.id,expectedUpdatedAt:versions(event),title:'Stale'})).status).toBe(409)
  const a={projectId:b1.id,eventId:event.id}
  const args={...common(),kind:'PROPERTY',property:'Test',value:'Value',perspective:'WORLD',status:'SUSPECTED',startsAt:a}
  expect((await run('create_universe_assertion',{...args,endsAt:a})).status).toBe(400)
  const statement=await good('create_universe_assertion',args)
  expect((await run('delete_universe_assertion',{universeId:u.id,id:statement.id,expectedUpdatedAt:'2000-01-01T00:00:00.000Z'})).status).toBe(409)
  await good('delete_universe_assertion',{universeId:u.id,id:statement.id,expectedUpdatedAt:versions(statement)})
  expect(await prisma.item.findUnique({where:{id:item.id}})).not.toBeNull()
  expect(await prisma.sourceEvidence.findUnique({where:{id:proof.id}})).not.toBeNull()
 })
 test('dependent usages and books cannot be detached; manuscript and relations survive',async()=>{
  await refresh();b1=await prisma.project.findUniqueOrThrow({where:{id:b1.id}})
  expect((await run('use_universe_entry',{...common(),projectId:b1.id,expectedUpdatedAt:versions(item),remove:true})).status).toBe(409)
  expect((await run('detach_universe_book',{universeId:u.id,projectId:b1.id,expectedUpdatedAt:versions(u),projectExpectedUpdatedAt:versions(b1)})).status).toBe(409)
  expect((await prisma.chapter.findUniqueOrThrow({where:{id:c1.id}})).content).toEqual(c1.content)
 })
})
