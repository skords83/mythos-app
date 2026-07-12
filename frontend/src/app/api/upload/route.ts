import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { getUserFromRequest } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'

// Falls back to a local folder outside Docker so `npm run dev` works
// without the container's absolute /app path existing on disk.
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads')

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

export async function POST(request: NextRequest) {
  const userId = await getUserFromRequest(request)
  try {
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const limited = await checkRateLimit(userId, 'upload', { limit: 30, windowMs: 10 * 60 * 1000 })
    if (limited) return limited

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'Keine Datei' }, { status: 400 })
    }

    const ext = ALLOWED_TYPES[file.type]
    if (!ext) {
      return NextResponse.json(
        { error: 'Nur JPEG-, PNG-, WebP- oder GIF-Bilder sind erlaubt' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Datei ist zu groß (max. 5 MB)' },
        { status: 400 }
      )
    }

    const filename = `${randomUUID()}${ext}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await mkdir(UPLOAD_DIR, { recursive: true })
    await writeFile(join(UPLOAD_DIR, filename), buffer)
    return NextResponse.json({ url: `/api/upload/${filename}` })
  } catch (error) {
    logger.error(error, { context: 'upload', userId })
    return NextResponse.json({ error: 'Upload fehlgeschlagen', details: String(error) }, { status: 500 })
  }
}