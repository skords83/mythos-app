import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// DELETE /api/characters/[id] - Charakter löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify ownership
    const character = await prisma.character.findFirst({
      where: { 
        id: params.id,
        project: { userId }
      }
    })

    if (!character) {
      return NextResponse.json({ error: 'Charakter nicht gefunden' }, { status: 404 })
    }

    await prisma.character.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting character:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
