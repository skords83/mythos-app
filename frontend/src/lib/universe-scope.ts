import type { Prisma, RelatableEntityType } from '@prisma/client'
/** Extend a book query only by its explicit usages, never the whole universe. */
export async function bookEntityScope(db: Pick<Prisma.TransactionClient,'entityUsage'|'project'>, projectId:string, entityType:RelatableEntityType) {
 const project=await db.project.findFirst({where:{id:projectId},select:{universeId:true}})
 if(!project?.universeId) return {projectId}
 const usages=await db.entityUsage.findMany({where:{projectId,entityType},select:{entityId:true}})
 return {OR:[{projectId},{universeId:project.universeId,id:{in:usages.map(u=>u.entityId)}}]}
}
