import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { visibilityWhere } from '@/lib/visibility'
import { manuscriptText, discoverNames, mentionLabels } from '@/lib/storyTools'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getAuthContext(request)
    if (!context) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    const project = await prisma.project.findFirst({ where: { id: params.id, userId: context.userId } })
    if (!project) return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    const where = { projectId: params.id, OR: visibilityWhere(context) }
    const [chapters, characters, places, items, scenes, events] = await Promise.all([
      prisma.chapter.findMany({ where: { projectId: params.id }, orderBy: { order: 'asc' } }),
      prisma.character.findMany({ where }), prisma.place.findMany({ where }), prisma.item.findMany({ where }),
      prisma.scene.findMany({ where: { chapter: { projectId: params.id }, OR: visibilityWhere(context) }, orderBy: { order: 'asc' } }),
      prisma.timelineEvent.findMany({ where, orderBy: { order: 'asc' } }),
    ])
    const entities = [...characters.map(e => ({...e,kind:'CHARACTER'})),...places.map(e => ({...e,kind:'PLACE'})),...items.map(e => ({...e,kind:'ITEM'}))]
    const visible = new Set([...entities.map(e => `${e.kind}:${e.id}`), ...scenes.map(e => `SCENE:${e.id}`), ...events.map(e => `EVENT:${e.id}`)])
    const relations = (await prisma.relation.findMany({ where: { familyId: context.familyId } })).filter(r => visible.has(`${r.sourceType}:${r.sourceId}`) && visible.has(`${r.targetType}:${r.targetId}`))
    const texts = chapters.map(c => ({ id:c.id,title:c.title,order:c.order,wordCount:c.wordCount,updatedAt:c.updatedAt,text:manuscriptText(c.content),linkedNames:mentionLabels(c.content) }))
    return NextResponse.json({ chapters:texts, entities, scenes, events, relations, suggestions:discoverNames(texts.map(c => c.text),entities.flatMap(e => [e.name,...e.aliases])) })
  } catch (error) {
    logger.error(error, {route:'GET project story'})
    return NextResponse.json({error:'Story Explorer konnte nicht geladen werden.'},{status:500})
  }
}
