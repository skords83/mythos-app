import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join, extname } from 'path'
import { getAuthContext } from '@/lib/auth'
import { canReadUpload } from '@/lib/uploadAccess'

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads')

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const context = await getAuthContext(request)
    if (!context) return new NextResponse('Unauthorized', { status: 401, headers: { 'Cache-Control': 'private, no-store' } })
    const filename = params.filename
    if (!/^[0-9a-fA-F-]{36}\.(png|jpe?g|gif|webp)$/.test(filename) || !await canReadUpload(filename, context)) {
      return new NextResponse('Not found', { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
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
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
  }
}