import type { Prisma, RelatableEntityType } from '@prisma/client'
import type { AuthContext } from './auth'
import { validateUniverseEndpoint } from './universe-service'
const models={CHARACTER:'character',PLACE:'place',ITEM:'item',FACTION:'faction',LORE_ENTRY:'loreEntry',EVENT:'timelineEvent',SCENE:'scene'} as const
/** Existing local edges keep their semantics. Shared edges require compatible scope. */
export async function checkUniverseEdge(db:Prisma.TransactionClient,auth:AuthContext,edge:{sourceType:RelatableEntityType;sourceId:string;targetType:RelatableEntityType;targetId:string}) {
 const get=async(type:RelatableEntityType,id:string):Promise<any> => (db[models[type]] as any).findFirst({where:{id},...(type==='SCENE'?{include:{chapter:true}}:{})})
 const a=await get(edge.sourceType,edge.sourceId),b=await get(edge.targetType,edge.targetId)
 const projectUniverse=async(e:any) => {
  const projectId=e?.projectId??e?.chapter?.projectId
  return projectId ? (await db.project.findFirst({where:{id:projectId},select:{universeId:true}}))?.universeId : null
 }
 const universeId=a?.universeId??b?.universeId??await projectUniverse(a)??await projectUniverse(b)
 if(!universeId)return
 await validateUniverseEndpoint(db,auth,universeId,edge.sourceType,edge.sourceId)
 await validateUniverseEndpoint(db,auth,universeId,edge.targetType,edge.targetId)
 for(const [e,shared,type] of [[a,b,edge.targetType],[b,a,edge.sourceType]] as const) {
  const projectId=e?.projectId??e?.chapter?.projectId
  if(projectId&&shared?.universeId&&!await db.entityUsage.findFirst({where:{projectId,entityType:type,entityId:shared.id}})) throw new Error('Gemeinsamer Eintrag muss ausdrücklich im Buch verwendet werden.')
 }
 return true
}
