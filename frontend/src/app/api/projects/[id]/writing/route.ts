import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
async function owned(request:NextRequest,id:string){const userId=await getUserFromRequest(request);return userId?prisma.project.findFirst({where:{id,userId}}):null}
export async function GET(request:NextRequest,{params}:{params:{id:string}}){
  try { const project=await owned(request,params.id);if(!project)return NextResponse.json({error:'Projekt nicht gefunden'},{status:404})
    const [sessions,snapshots]=await Promise.all([prisma.writingSession.findMany({where:{projectId:params.id},orderBy:{startedAt:'asc'}}),prisma.growthSnapshot.findMany({where:{projectId:params.id},orderBy:{date:'asc'}})])
    return NextResponse.json({sessions,snapshots,totalWordGoal:project.totalWordGoal})
  }catch(error){logger.error(error,{route:'GET writing'});return NextResponse.json({error:'Statistik konnte nicht geladen werden.'},{status:500})}
}
export async function POST(request:NextRequest,{params}:{params:{id:string}}){
  try {if(!await owned(request,params.id))return NextResponse.json({error:'Projekt nicht gefunden'},{status:404})
    const body=await request.json();const {id,date,activeSeconds,words}=body
    if(typeof id!=='string'||!/^[a-zA-Z0-9-]{10,100}$/.test(id)||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isInteger(activeSeconds)||activeSeconds<0||activeSeconds>86400||!Number.isInteger(words)||Math.abs(words)>1000000)return NextResponse.json({error:'Ungültige Session'},{status:400})
    const key=`${params.id}:${id}`
    await prisma.$transaction(async tx=>{
      const existing=await tx.writingSession.findUnique({where:{id:key}})
      if(!existing||activeSeconds>=existing.activeSeconds) await tx.writingSession.upsert({where:{id:key},create:{id:key,projectId:params.id,date,activeSeconds,words},update:{activeSeconds,words}})
      const chapters=await tx.chapter.findMany({where:{projectId:params.id},select:{id:true,title:true,wordCount:true}})
      const wordCount=chapters.reduce((sum,c)=>sum+c.wordCount,0)
      await tx.growthSnapshot.upsert({where:{projectId_date:{projectId:params.id,date}},create:{projectId:params.id,date,wordCount,chapters},update:{wordCount,chapters}})
    })
    return NextResponse.json({success:true})
  }catch(error){logger.error(error,{route:'POST writing'});return NextResponse.json({error:'Session konnte nicht gespeichert werden.'},{status:500})}
}
