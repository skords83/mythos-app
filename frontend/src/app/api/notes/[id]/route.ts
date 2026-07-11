import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// PUT /api/notes/[id] - Notiz aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify note belongs to user's project
    const note = await prisma.note.findFirst({
      where: { 
        id: params.id,
        chapter: { project: { userId } }
      }
    })

    if (!note) {
      return NextResponse.json({ error: 'Notiz nicht gefunden' }, { status: 404 })
    }

    const body = await request.json()
    const { title, content } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content

    const updated = await prisma.note.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

// DELETE /api/notes/[id] - Notiz löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify note belongs to user's project
    const note = await prisma.note.findFirst({
      where: { 
        id: params.id,
        chapter: { project: { userId } }
      }
    })

    if (!note) {
      return NextResponse.json({ error: 'Notiz nicht gefunden' }, { status: 404 })
    }

    await prisma.note.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
