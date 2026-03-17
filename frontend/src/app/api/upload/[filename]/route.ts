import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join, extname } from 'path'

const UPLOAD_DIR = '/app/public/uploads'

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename
    // Kein Path-Traversal
    if (filename.includes('/') || filename.includes('..')) {
      return new NextResponse('Not found', { status: 404 })
    }
    const filepath = join(UPLOAD_DIR, filename)
    const buffer = await readFile(filepath)
    const ext = extname(filename).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }
    const contentType = mimeTypes[ext] || 'application/octet-stream'
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}