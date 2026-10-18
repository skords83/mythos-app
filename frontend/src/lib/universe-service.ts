import { Prisma, RelatableEntityType } from '@prisma/client'
import { createHash } from 'crypto'
import { prisma } from './prisma'
import type { AuthContext } from './auth'
import { visibilityWhere } from './visibility'
import { universeTools, sharedTypes } from './universe-schema'
import { valid } from './story-tool-schema'
import { compareStoryAnchors, validityAt, type StoryAnchor } from './universe-time'
import { locateEvidence } from './evidence-anchor'

type DB = Prisma.TransactionClient
const models = { CHARACTER:'character',PLACE:'place',ITEM:'item',FACTION:'faction',LORE_ENTRY:'loreEntry' } as const
const allowed = {
 CHARACTER:['name','appearance','personality','backstory','motivation','flaw','secrets'],
 PLACE:['name','description','location','climate','importance','history','politics','sensoryDetails'],
 ITEM:['name','description','origin','significance'], FACTION:['name','description','goal'], LORE_ENTRY:['title','content','category'],
}
class UniverseError extends Error { constructor(public status:number,message:string){super(message)} }
const fail = (status:number,message:string):never => {throw new UniverseError(status,message)}
const conflict = ():never => fail(409,'Zwischenzeitlich geändert. Bitte neu lesen und Vorschau erneuern.')
const stamp = (old:Date) => new Date(Math.max(Date.now(),old.getTime()+1))
const version = (row:{updatedAt:Date},expected:string) => {if(row.updatedAt.toISOString()!==expected) conflict()}
const author = (auth:AuthContext,row:{authorId:string}) => {if(row.authorId!==auth.userId) fail(403,'Nur der Autor darf diesen Eintrag ändern.')}
const paginate = <T>(rows:T[],args:any) => {const page=args.page??1,limit=args.limit??50;return {entries:rows.slice((page-1)*limit,page*limit),page,limit,total:rows.length,hasMore:rows.length>page*limit}}
// Prisma has distinct typed delegates; the model key is validated by the shared schema.
const model = (db:DB,type:keyof typeof models):any => db[models[type]]
async function universe(db:DB,auth:AuthContext,id:string,write=false) {
 const row=await db.universe.findFirst({where:{id,familyId:auth.familyId,OR:visibilityWhere(auth)}})
 if(!row) return fail(404,'Universum nicht gefunden oder nicht zugänglich.')
 if(write) author(auth,row)
 return row
}
async function book(db:DB,auth:AuthContext,id:string,universeId?:string) {
 const row=await db.project.findFirst({where:{id,userId:auth.userId,...(universeId?{universeId}:{})}})
 if(!row) return fail(404,'Buch nicht gefunden oder nicht zugänglich.')
 return row
}
async function entry(db:DB,auth:AuthContext,type:keyof typeof models,id:string,universeId?:string) {
 const row=await model(db,type).findFirst({where:{id,familyId:auth.familyId,OR:visibilityWhere(auth),...(universeId?{universeId}:{})}})
 if(!row) return fail(404,'Eintrag nicht gefunden oder nicht zugänglich.')
 return row
}
async function uses(db:DB,auth:AuthContext,type:RelatableEntityType,id:string) {
 return db.entityUsage.findMany({where:{entityType:type,entityId:id,project:{userId:auth.userId}},include:{project:{select:{id:true,title:true,universeOrder:true}}},orderBy:[{project:{universeOrder:'asc'}},{id:'asc'}]})
}
async function touch(db:DB,row:{id:string;updatedAt:Date}) {
 if((await db.universe.updateMany({where:{id:row.id,updatedAt:row.updatedAt},data:{updatedAt:stamp(row.updatedAt)}})).count!==1) conflict()
}
async function anchor(db:DB,auth:AuthContext,universeId:string,a:StoryAnchor) {
 await book(db,auth,a.projectId,universeId)
 if(a.chapterId && !await db.chapter.findFirst({where:{id:a.chapterId,projectId:a.projectId}})) fail(400,'Kapitel gehört nicht zum Buch.')
 if(a.sceneId && (!a.chapterId || !await db.scene.findFirst({where:{id:a.sceneId,chapterId:a.chapterId,familyId:auth.familyId,OR:visibilityWhere(auth)}}))) fail(400,'Szene gehört nicht zum Kapitel oder ist nicht zugänglich.')
 if(a.eventId && !await db.timelineEvent.findFirst({where:{id:a.eventId,projectId:a.projectId,familyId:auth.familyId,OR:visibilityWhere(auth)}})) fail(400,'Ereignis gehört nicht zum Buch oder ist nicht zugänglich.')
}
async function dependencies(db:DB,type:RelatableEntityType,id:string,projectId:string) {
 const chapters=await db.chapter.findMany({where:{projectId},select:{id:true,updatedAt:true,content:true}})
 const versions=await db.chapterVersion.findMany({where:{chapter:{projectId}},select:{id:true,updatedAt:true,content:true}})
 const relations=await db.relation.findMany({where:{OR:[{sourceType:type,sourceId:id},{targetType:type,targetId:id}]},orderBy:{id:'asc'}})
 const evidence=await db.sourceEvidence.findMany({where:{entityType:type,entityId:id},orderBy:{id:'asc'}})
 // IDs in JSON/HTML marks are stable; conservative detection also protects old formats.
 const textLinks=[...chapters,...versions].filter(c=>JSON.stringify(c.content).includes(id)).map(({content,...c})=>c)
 return {relations,evidence,textLinks}
}
async function preview(db:DB,auth:AuthContext,args:any) {
 await universe(db,auth,args.universeId,true)
 await book(db,auth,args.projectId,args.universeId)
 const row=await entry(db,auth,args.entityType,args.entityId)
 author(auth,row)
 if(row.projectId!==args.projectId || row.universeId) fail(400,'Nur lokale Einträge dieses Buchs können übernommen werden.')
 const deps=await dependencies(db,args.entityType,args.entityId,args.projectId)
 // A promotion cannot silently widen endpoints into another universe or book.
 for(const edge of deps.relations) {
  const type=edge.sourceId===row.id?edge.targetType:edge.sourceType, id=edge.sourceId===row.id?edge.targetId:edge.sourceId
  await validateUniverseEndpoint(db,auth,args.universeId,type,id,args.projectId)
 }
 if(args.entityType==='PLACE') {
  const related=await db.place.findMany({where:{OR:[{id:row.parentId??''},{parentId:row.id}]}})
  if(related.some(p=>p.universeId!==args.universeId && p.projectId!==args.projectId)) fail(409,'Ortshierarchie verweist auf einen anderen Geltungsbereich.')
 }
 const nameKey=args.entityType==='LORE_ENTRY'?'title':'name'
 const duplicates=await model(db,args.entityType).findMany({where:{universeId:args.universeId,[nameKey]:{equals:row[nameKey],mode:'insensitive'},familyId:auth.familyId,OR:visibilityWhere(auth)},select:{id:true,[nameKey]:true}})
 const token=createHash('sha256').update(JSON.stringify({row,deps,duplicates})).digest('hex')
 // Never return private source metadata. Fingerprint still covers hidden dependencies.
 const sources=[]
 for(const e of deps.evidence) if(await db.chapter.findFirst({where:{id:e.chapterId,project:{userId:auth.userId}}})) sources.push({id:e.id,chapterId:e.chapterId,sceneId:e.sceneId,updatedAt:e.updatedAt})
 return {entry:row,relations:deps.relations,textLinks:deps.textLinks,sources,possibleDuplicates:duplicates,previewToken:token}
}
export async function validateUniverseEndpoint(db:DB,auth:AuthContext,universeId:string,type:RelatableEntityType,id:string,localProjectId?:string) {
 if(sharedTypes.includes(type as any)) {
  const e=await entry(db,auth,type as keyof typeof models,id)
  if(e.universeId===universeId) return
  if(e.projectId) {await book(db,auth,e.projectId,universeId); if(!localProjectId || e.projectId===localProjectId) return}
 } else if(type==='EVENT') {
  const e=await db.timelineEvent.findFirst({where:{id,familyId:auth.familyId,OR:visibilityWhere(auth)}})
  if(e?.projectId) {await book(db,auth,e.projectId,universeId);return}
 } else if(type==='SCENE') {
  const e=await db.scene.findFirst({where:{id,familyId:auth.familyId,OR:visibilityWhere(auth)},include:{chapter:true}})
  if(e) {await book(db,auth,e.chapter.projectId,universeId);return}
 }
 fail(409,'Referenz führt in ein fremdes Universum oder einen unzulässigen Geltungsbereich.')
}
async function narrativeVisible(db:DB,reveal:StoryAnchor|null,at:StoryAnchor) {
 if(!reveal) return false
 const [a,b]=await Promise.all([db.project.findUnique({where:{id:reveal.projectId}}),db.project.findUnique({where:{id:at.projectId}})])
 if(!a||!b) return false
 if(a.id!==b.id) return a.universeOrder<b.universeOrder
 if(reveal.chapterId) {
  if(!at.chapterId) return false
  const [x,y]=await Promise.all([db.chapter.findUnique({where:{id:reveal.chapterId}}),db.chapter.findUnique({where:{id:at.chapterId}})])
  if(!x||!y) return false
  if(x.id!==y.id) return x.order<y.order
 }
 if(reveal.sceneId) {
  if(!at.sceneId) return false
  const [x,y]=await Promise.all([db.scene.findUnique({where:{id:reveal.sceneId}}),db.scene.findUnique({where:{id:at.sceneId}})])
  if(!x||!y) return false
  if(x.id!==y.id) return x.order<y.order
 }
 if(reveal.eventId && reveal.eventId!==at.eventId) return false
 return true
}
async function statements(db:DB,auth:AuthContext,action:string,args:any) {
 await universe(db,auth,args.universeId)
 if(action==='universe_assertions') {
  await entry(db,auth,args.entityType,args.entityId,args.universeId)
  if(args.at) await anchor(db,auth,args.universeId,args.at)
  else if(args.view!=='author') fail(400,'Leser- und Figurenansicht benötigen einen Handlungsstand.')
  const rows=await db.continuityAssertion.findMany({where:{universeId:args.universeId,entityType:args.entityType,entityId:args.entityId},orderBy:[{createdAt:'asc'},{id:'asc'}]})
  const edges=await db.relation.findMany({where:{familyId:auth.familyId,sourceType:'EVENT',targetType:'EVENT',relationType:'BEFORE'}})
  const accessibleEdges=[]
  for(const e of edges) {try{await validateUniverseEndpoint(db,auth,args.universeId,'EVENT',e.sourceId);await validateUniverseEndpoint(db,auth,args.universeId,'EVENT',e.targetId);accessibleEdges.push(e)}catch{}}
  const result=[]
  for(const row of rows) {
   if(row.observerId && !await db.character.findFirst({where:{id:row.observerId,familyId:auth.familyId,OR:visibilityWhere(auth)}})) continue
   if(args.view==='character' && (row.perspective!=='BELIEF'||row.observerId!==args.observerId)) continue
   if(args.view==='reader' && !await narrativeVisible(db,row.revealedAt as StoryAnchor|null,args.at)) continue
   // World knowledge must never expose private source/book anchors.
   const redact=async(a:any)=>{if(!a)return null;return await db.project.findFirst({where:{id:a.projectId,userId:auth.userId}})?a:{restricted:true}}
   const validity=args.at?validityAt(row.startsAt as StoryAnchor,row.endsAt as StoryAnchor|null,args.at,accessibleEdges):'UNKNOWN'
   if(args.view!=='author' && (validity==='FUTURE'||validity==='ENDED')) continue
   if(args.view==='character' && validity!=='ACTIVE') continue
   const sources=[]
   for(const id of row.evidenceIds) {
    const evidence=await db.sourceEvidence.findFirst({where:{id,familyId:auth.familyId,chapter:{project:{userId:auth.userId}}},include:{chapter:true}})
    if(evidence) {const {chapter,...e}=evidence;sources.push({...e,anchor:locateEvidence(chapter.content,evidence)})}
   }
   let relationId=row.relationId
   if(relationId) {const r=await db.relation.findUnique({where:{id:relationId}});try{if(!r)throw Error();await validateUniverseEndpoint(db,auth,args.universeId,r.sourceType,r.sourceId);await validateUniverseEndpoint(db,auth,args.universeId,r.targetType,r.targetId)}catch{relationId=null}}
   result.push({...row,relationId,startsAt:await redact(row.startsAt),endsAt:await redact(row.endsAt),revealedAt:await redact(row.revealedAt),evidenceIds:sources.map(e=>e.id),sources,validity})
  }
  return {...paginate(result,args),uncertain:result.some(r=>r.validity==='UNKNOWN'),contradictions:result.filter((r,_,all)=>all.some(o=>o.id!==r.id&&o.property===r.property&&o.perspective===r.perspective&&o.observerId===r.observerId&&o.value!==r.value&&o.validity===r.validity)).map(r=>r.id)}
 }
 const old=action!=='create_universe_assertion'?await db.continuityAssertion.findFirst({where:{id:args.id,universeId:args.universeId}}):null
 if(action!=='create_universe_assertion'&&!old) fail(404,'Aussage nicht gefunden.')
 if(old){author(auth,old);version(old,args.expectedUpdatedAt)}
 if(action==='delete_universe_assertion') {
  const e=await entry(db,auth,old!.entityType as keyof typeof models,old!.entityId,args.universeId);author(auth,e)
  if((await db.continuityAssertion.deleteMany({where:{id:old!.id,updatedAt:old!.updatedAt,authorId:auth.userId}})).count!==1) conflict()
  return {deleted:old!.id}
 }
 const row={...old,...args}
 const e=await entry(db,auth,row.entityType,row.entityId,args.universeId);author(auth,e)
 await anchor(db,auth,args.universeId,row.startsAt)
 if(row.endsAt) {
  await anchor(db,auth,args.universeId,row.endsAt)
  const edges=await db.relation.findMany({where:{familyId:auth.familyId,sourceType:'EVENT',targetType:'EVENT',relationType:'BEFORE'}})
  const order=compareStoryAnchors(row.startsAt,row.endsAt,edges)
  if(order==='AFTER'||order==='SAME') fail(400,'Das Ende muss nach dem Beginn liegen; gleiche oder umgekehrte Anker sind kein gültiges Intervall.')
 }
 if(row.revealedAt) await anchor(db,auth,args.universeId,row.revealedAt)
 for(const a of [row.startsAt,row.endsAt,row.revealedAt].filter(Boolean)) {
  if(!await db.entityUsage.findFirst({where:{entityType:row.entityType,entityId:row.entityId,projectId:a.projectId}})) fail(409,'Eintrag muss zuerst ausdrücklich in allen referenzierten Büchern verwendet werden.')
 }
 if(row.perspective==='BELIEF'&&!row.observerId) fail(400,'Figurenüberzeugung benötigt eine Figur.')
 if(row.perspective==='WORLD'&&row.observerId) fail(400,'Weltwissen besitzt keinen Überzeugungsträger.')
 if(row.observerId) await validateUniverseEndpoint(db,auth,args.universeId,'CHARACTER',row.observerId)
 if(row.relationId) {
  const r=await db.relation.findFirst({where:{id:row.relationId,familyId:auth.familyId}})
  if(!r) fail(404,'Beziehung nicht zugänglich.')
  await validateUniverseEndpoint(db,auth,args.universeId,r!.sourceType,r!.sourceId)
  await validateUniverseEndpoint(db,auth,args.universeId,r!.targetType,r!.targetId)
  if(!((r!.sourceType===row.entityType&&r!.sourceId===row.entityId)||(r!.targetType===row.entityType&&r!.targetId===row.entityId))) fail(400,'Beziehung gehört nicht zum Eintrag.')
 }
 for(const id of row.evidenceIds??[]) if(!await db.sourceEvidence.findFirst({where:{id,entityType:row.entityType,entityId:row.entityId,familyId:auth.familyId,chapter:{project:{userId:auth.userId}}}})) fail(404,'Quellenbeleg nicht zugänglich oder gehört nicht zum Eintrag.')
 const {id,expectedUpdatedAt,...data}=args
 for(const key of ['endsAt','revealedAt']) if(data[key]===null) data[key]=Prisma.DbNull
 if(!old) return db.continuityAssertion.create({data:{...data,authorId:auth.userId}})
 if((await db.continuityAssertion.updateMany({where:{id:old.id,updatedAt:old.updatedAt,authorId:auth.userId},data:{...data,updatedAt:stamp(old.updatedAt)}})).count!==1) conflict()
 return db.continuityAssertion.findUnique({where:{id:old.id}})
}
async function execute(db:DB,auth:AuthContext,action:string,args:any):Promise<any> {
 if(action.includes('assertion')) return statements(db,auth,action,args)
 if(action==='universes') return paginate(await db.universe.findMany({where:{familyId:auth.familyId,OR:visibilityWhere(auth)},orderBy:[{createdAt:'asc'},{id:'asc'}]}),args)
 if(action==='create_universe') return db.universe.create({data:{...args,familyId:auth.familyId,authorId:auth.userId}})
 const write=!['universe','universe_books','universe_entries','universe_entry','universe_assertions','use_universe_entry'].includes(action)
 const u=await universe(db,auth,args.universeId,write)
 if(action==='create_universe_book') {
  version(u,args.expectedUpdatedAt)
  const last=await db.project.aggregate({where:{universeId:u.id},_max:{universeOrder:true}})
  const project=await db.project.create({data:{title:args.title,description:args.description,universeId:u.id,universeOrder:(last._max.universeOrder??-1)+1,userId:auth.userId,chapters:{create:{title:'Kapitel 1',order:0}}}})
  await touch(db,u);return project
 }
 if(action==='create_universe_event') {
  await book(db,auth,args.projectId,u.id)
  await anchor(db,auth,u.id,{projectId:args.projectId,...(args.chapterId?{chapterId:args.chapterId}:{})})
  const {universeId,...data}=args
  return db.timelineEvent.create({data:{...data,familyId:auth.familyId,authorId:auth.userId}})
 }
 if(action==='update_universe_event') {
  const event=await db.timelineEvent.findFirst({where:{id:args.id,authorId:auth.userId,familyId:auth.familyId,project:{universeId:u.id,userId:auth.userId}}})
  if(!event) return fail(404,'Ereignis nicht zugänglich.')
  version(event,args.expectedUpdatedAt)
  const {universeId,id,expectedUpdatedAt,...data}=args
  if((await db.timelineEvent.updateMany({where:{id,updatedAt:event.updatedAt},data:{...data,updatedAt:stamp(event.updatedAt)}})).count!==1) conflict()
  return db.timelineEvent.findUnique({where:{id}})
 }
 if(action==='universe') return u
 if(action==='universe_books') return paginate(await db.project.findMany({where:{universeId:u.id,userId:auth.userId},orderBy:[{universeOrder:'asc'},{id:'asc'}]}),args)
 if(action==='update_universe') {
  version(u,args.expectedUpdatedAt)
  const {universeId,expectedUpdatedAt,...data}=args
  if((await db.universe.updateMany({where:{id:u.id,updatedAt:u.updatedAt},data:{...data,updatedAt:stamp(u.updatedAt)}})).count!==1) conflict()
  return db.universe.findUnique({where:{id:u.id}})
 }
 if(['attach_universe_book','detach_universe_book','reorder_universe_books'].includes(action)) {
  version(u,args.expectedUpdatedAt)
  if(action==='reorder_universe_books') {
   const books=await db.project.findMany({where:{universeId:u.id}})
   if(books.some(p=>p.userId!==auth.userId)) fail(403,'Nicht alle Bücher sind zugänglich.')
   if(books.length!==args.projectIds.length||new Set(args.projectIds).size!==books.length||books.some(p=>!args.projectIds.includes(p.id))) conflict()
   for(const [universeOrder,id] of args.projectIds.entries()) await db.project.update({where:{id},data:{universeOrder}})
  } else {
   const p=await book(db,auth,args.projectId);version(p,args.projectExpectedUpdatedAt)
   if(action==='attach_universe_book') {
    if(p.universeId) fail(409,'Buch gehört bereits einem Universum an. Zuerst kontrolliert lösen.')
    const last=await db.project.aggregate({where:{universeId:u.id},_max:{universeOrder:true}})
    await db.project.update({where:{id:p.id},data:{universeId:u.id,universeOrder:(last._max.universeOrder??-1)+1}})
   } else {
    if(p.universeId!==u.id) fail(400,'Buch gehört nicht zu diesem Universum.')
    if(await db.entityUsage.count({where:{projectId:p.id}})) fail(409,'Buch verwendet gemeinsame Einträge. Zuerst Verwendungen und deren Abhängigkeiten lösen.')
    const assertions=await db.continuityAssertion.findMany({where:{universeId:u.id}})
    if(assertions.some(a=>[a.startsAt,a.endsAt,a.revealedAt].some(v=>(v as any)?.projectId===p.id))) fail(409,'Zeitliche Aussagen oder Enthüllungen verweisen auf dieses Buch.')
    // Relations and source references can outlive a removed use; scan the whole catalogue.
    for(const type of sharedTypes) for(const e of await model(db,type).findMany({where:{universeId:u.id}})) {
     const d=await dependencies(db,type,e.id,p.id)
     if(d.textLinks.length) fail(409,'Gemeinsame Einträge sind noch im Buchtext verknüpft.')
     for(const r of d.relations) {
      const t=r.sourceId===e.id?r.targetType:r.sourceType, id=r.sourceId===e.id?r.targetId:r.sourceId
      const linked= t==='SCENE'?await db.scene.findUnique({where:{id},include:{chapter:true}}): t==='EVENT'?await db.timelineEvent.findUnique({where:{id}}):await model(db,t as keyof typeof models).findUnique({where:{id}})
      if(linked?.projectId===p.id||linked?.chapter?.projectId===p.id) fail(409,'Gemeinsame Beziehungen verweisen noch auf lokale Einträge dieses Buchs.')
     }
     if(await db.sourceEvidence.count({where:{entityType:type,entityId:e.id,chapter:{projectId:p.id}}})) fail(409,'Gemeinsame Quellenbelege verweisen auf dieses Buch.')
    }
    await db.project.update({where:{id:p.id},data:{universeId:null,universeOrder:0}})
   }
  }
  await touch(db,u);return db.universe.findUnique({where:{id:u.id}})
 }
 if(action==='preview_universe_promotion') return preview(db,auth,args)
 if(action==='promote_universe_entry') {
  const p=await preview(db,auth,args);version(p.entry,args.expectedUpdatedAt)
  if(p.previewToken!==args.previewToken) conflict()
  if((await model(db,args.entityType).updateMany({where:{id:args.entityId,updatedAt:p.entry.updatedAt,projectId:args.projectId},data:{projectId:null,universeId:u.id,updatedAt:stamp(p.entry.updatedAt)}})).count!==1) conflict()
  await db.entityUsage.create({data:{entityType:args.entityType,entityId:args.entityId,projectId:args.projectId}})
  await touch(db,u);return entry(db,auth,args.entityType,args.entityId,u.id)
 }
 if(action==='universe_entries') {
  if(args.projectId) await book(db,auth,args.projectId,u.id)
  const usages=args.projectId?await db.entityUsage.findMany({where:{projectId:args.projectId,entityType:args.entityType}}):null
  return paginate(await model(db,args.entityType).findMany({where:{universeId:u.id,familyId:auth.familyId,OR:visibilityWhere(auth),...(usages?{id:{in:usages.map(v=>v.entityId)}}:{})},orderBy:[{createdAt:'asc'},{id:'asc'}]}),args)
 }
 if(action==='create_universe_entry'||action==='update_universe_entry') {
  if(Object.keys(args.fields).some(k=>!allowed[args.entityType as keyof typeof allowed].includes(k))) fail(400,'Feld passt nicht zum Eintragstyp.')
  if(action==='create_universe_entry') {
   const name=args.entityType==='LORE_ENTRY'?'title':'name'
   if(!args.fields[name]) fail(400,'Name beziehungsweise Titel fehlt.')
   return model(db,args.entityType).create({data:{...args.fields,universeId:u.id,familyId:auth.familyId,authorId:auth.userId,visibility:args.visibility??'PRIVATE'}})
  }
  const e=await entry(db,auth,args.entityType,args.entityId,u.id);author(auth,e);version(e,args.expectedUpdatedAt)
  if((await model(db,args.entityType).updateMany({where:{id:e.id,updatedAt:e.updatedAt},data:{...args.fields,...(args.visibility?{visibility:args.visibility}:{}),updatedAt:stamp(e.updatedAt)}})).count!==1) conflict()
  return {entry:await entry(db,auth,args.entityType,e.id,u.id),usages:await uses(db,auth,args.entityType,e.id)}
 }
 const e=await entry(db,auth,args.entityType,args.entityId,u.id)
 if(action==='universe_entry') return {entry:e,usages:await uses(db,auth,args.entityType,e.id)}
 if(action==='use_universe_entry') {
  const p=await book(db,auth,args.projectId,u.id);version(e,args.expectedUpdatedAt)
  if(args.remove) {
   const d=await dependencies(db,args.entityType,e.id,p.id)
   if(d.textLinks.length || await db.sourceEvidence.count({where:{entityType:args.entityType,entityId:e.id,chapter:{projectId:p.id}}})) fail(409,'Textverknüpfungen oder Quellen dieses Buchs benötigen den Eintrag.')
   const assertions=await db.continuityAssertion.findMany({where:{entityId:e.id,entityType:args.entityType}})
   if(assertions.some(a=>[a.startsAt,a.endsAt,a.revealedAt].some(v=>(v as any)?.projectId===p.id))) fail(409,'Entwicklungen oder Enthüllungen benötigen diese Buchverwendung.')
   for(const r of d.relations) {
    const t=r.sourceId===e.id?r.targetType:r.sourceType,id=r.sourceId===e.id?r.targetId:r.sourceId
    const linked=t==='SCENE'?await db.scene.findFirst({where:{id},include:{chapter:true}}):t==='EVENT'?await db.timelineEvent.findFirst({where:{id}}):await model(db,t as keyof typeof models).findFirst({where:{id}})
    if(linked?.projectId===p.id||linked?.chapter?.projectId===p.id) fail(409,'Beziehungen zu lokalen Einträgen benötigen diese Buchverwendung.')
   }
   if(args.entityType==='PLACE' && await db.place.count({where:{projectId:p.id,OR:[{parentId:e.id},{id:e.parentId??''}]}})) fail(409,'Die Ortshierarchie benötigt diese Buchverwendung.')
   await db.entityUsage.deleteMany({where:{entityId:e.id,entityType:args.entityType,projectId:p.id}})
  } else await db.entityUsage.upsert({where:{entityType_entityId_projectId:{entityType:args.entityType,entityId:e.id,projectId:p.id}},create:{entityType:args.entityType,entityId:e.id,projectId:p.id},update:{}})
  await model(db,args.entityType).update({where:{id:e.id},data:{updatedAt:stamp(e.updatedAt)}})
  return {entry:await entry(db,auth,args.entityType,e.id,u.id),usages:await uses(db,auth,args.entityType,e.id)}
 }
 return fail(400,'Unbekannte Aktion.')
}
export async function runUniverseAction(auth:AuthContext,action:string,input:unknown) {
 const tool=universeTools.find(t=>t.name===`mythos_${action}`)
 if(!tool||!valid(tool.inputSchema,input)) return {status:400,error:'Ungültige Argumente.'}
 try {
  const data=await prisma.$transaction(db=>execute(db,auth,action,input),{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000})
  return {status:action.startsWith('create_')?201:200,data}
 } catch(e) {
  if(e instanceof UniverseError) return {status:e.status,error:e.message}
  if(e instanceof Prisma.PrismaClientKnownRequestError && ['P2034','P2002'].includes(e.code)) return {status:409,error:'Zwischenzeitlich geändert. Bitte erneut lesen.'}
  throw e
 }
}
