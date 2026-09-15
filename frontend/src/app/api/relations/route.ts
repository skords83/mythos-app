import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'
import {
  isEntityVisibleToViewer,
  isRelationVisible,
  isSameEntity,
  isValidEntityType,
  resolveEntity,
} from '@/lib/relations'

// GET /api/relations?entityType=CHARACTER&entityId=xxx - Relationen einer Entität (beide Richtungen)
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    if (!entityType || !entityId || !isValidEntityType(entityType)) {
      return NextResponse.json({ error: 'entityType (CHARACTER/PLACE) und entityId sind erforderlich' }, { status: 400 })
    }

    const anchor = await resolveEntity(prisma, entityType, entityId, context.familyId)
    if (!anchor || !isEntityVisibleToViewer(context, anchor)) {
      return NextResponse.json({ error: 'Entität nicht gefunden' }, { status: 404 })
    }

    const relations = await prisma.relation.findMany({
      where: {
        familyId: context.familyId,
        OR: [
          { sourceType: entityType, sourceId: entityId },
          { targetType: entityType, targetId: entityId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    })

    const visible = []
    for (const relation of relations) {
      const isAnchorSource = relation.sourceType === entityType && relation.sourceId === entityId
      const counterpartType = isAnchorSource ? relation.targetType : relation.sourceType
      const counterpartId = isAnchorSource ? relation.targetId : relation.sourceId
      const counterpart = await resolveEntity(prisma, counterpartType, counterpartId, context.familyId)
      if (!counterpart || !isRelationVisible(context, anchor, counterpart)) continue
      visible.push({ ...relation, counterpart: { type: counterpartType, id: counterpart.id } })
    }

    return NextResponse.json(visible)
  } catch (error) {
    logger.error(error, { route: 'GET /api/relations', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Relationen' }, { status: 500 })
  }
}

// POST /api/relations - Neue Relation zwischen zwei Entitäten erstellen
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const body = await request.json()
    const { sourceType, sourceId, targetType, targetId, relationType, label } = body

    if (!isValidEntityType(sourceType) || !isValidEntityType(targetType)) {
      return NextResponse.json({ error: 'sourceType und targetType müssen CHARACTER oder PLACE sein' }, { status: 400 })
    }
    if (!sourceId || !targetId || !relationType) {
      return NextResponse.json({ error: 'sourceId, targetId und relationType sind erforderlich' }, { status: 400 })
    }
    if (isSameEntity(sourceType, sourceId, targetType, targetId)) {
      return NextResponse.json({ error: 'Eine Entität kann nicht mit sich selbst verknüpft werden' }, { status: 400 })
    }

    const [source, target] = await Promise.all([
      resolveEntity(prisma, sourceType, sourceId, context.familyId),
      resolveEntity(prisma, targetType, targetId, context.familyId),
    ])
    if (!source) {
      return NextResponse.json({ error: 'Quell-Entität nicht gefunden' }, { status: 404 })
    }
    if (!target) {
      return NextResponse.json({ error: 'Ziel-Entität nicht gefunden' }, { status: 404 })
    }

    if (['BEFORE', 'TAKES_PLACE_AT', 'REFERENCES_PAST'].includes(relationType)) {
      if (!isRelationVisible(context, source, target)) return NextResponse.json({error:'Entität nicht gefunden'}, {status:404})
      if (targetType !== 'EVENT' || sourceType !== (relationType === 'BEFORE' ? 'EVENT' : 'SCENE')) return NextResponse.json({error:'Ungültige Timeline-Verknüpfung'}, {status:400})
      const event = await prisma.timelineEvent.findFirst({where:{id:targetId}})
      const origin = sourceType === 'EVENT' ? await prisma.timelineEvent.findFirst({where:{id:sourceId}}) : await prisma.scene.findFirst({where:{id:sourceId},include:{chapter:true}})
      const originProject = origin && ('chapter' in origin ? origin.chapter.projectId : origin.projectId)
      if (!event?.projectId || event.projectId !== originProject) return NextResponse.json({error:'Verknüpfungen müssen im selben Projekt liegen'}, {status:400})
      if (relationType === 'TAKES_PLACE_AT' && await prisma.relation.findFirst({where:{sourceType,sourceId,relationType}})) return NextResponse.json({error:'Die Szene hat bereits einen Zeitpunkt. Entferne zuerst die bestehende Zuordnung.'}, {status:409})
      if (await prisma.relation.findFirst({where:{sourceType,sourceId,targetType,targetId,relationType}})) return NextResponse.json({error:'Verknüpfung besteht bereits'}, {status:409})
    }
    const relation = await prisma.relation.create({
      data: {
        sourceType,
        sourceId,
        targetType,
        targetId,
        relationType,
        label: label || null,
        familyId: context.familyId,
        authorId: context.userId,
      },
    })

    return NextResponse.json(relation, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/relations', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen der Relation' }, { status: 500 })
  }
}
