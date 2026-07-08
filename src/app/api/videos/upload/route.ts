import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import crypto from 'crypto'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500 MB
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/ogg',
]
const ALLOWED_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.avi', '.mkv', '.ogv'])

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const thumbnail = formData.get('thumbnail') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Fichier vidéo requis' }, { status: 400 })
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Format non supporté. Formats acceptés : ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux. Taille maximale : 500 Mo` },
        { status: 400 }
      )
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Fichier vide' }, { status: 400 })
    }

    // Generate unique filename preserving extension
    const ext = getExtension(file.name, file.type)
    const uniqueId = crypto.randomBytes(12).toString('hex')
    const filename = `${session.user.id}_${uniqueId}${ext}`
    const relativePath = `/uploads/videos/${filename}`

    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'videos')
    await mkdir(uploadDir, { recursive: true })

    // Write video file
    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, filename), Buffer.from(bytes))

    // Handle optional thumbnail
    let thumbnailPath: string | null = null
    if (thumbnail) {
      const thumbExt = getExtension(thumbnail.name, thumbnail.type)
      const thumbFilename = `${session.user.id}_${uniqueId}_thumb${thumbExt}`
      await writeFile(join(uploadDir, thumbFilename), Buffer.from(await thumbnail.arrayBuffer()))
      thumbnailPath = `/uploads/videos/${thumbFilename}`
    }

    return NextResponse.json({
      url: relativePath,
      thumbnailUrl: thumbnailPath,
      filename,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/videos/upload]', error)
    return NextResponse.json({ error: 'Erreur lors du téléchargement' }, { status: 500 })
  }
}

function getExtension(filename: string, mimeType: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext && ALLOWED_EXTENSIONS.has(`.${ext}`)) return `.${ext}`

  const mimeMap: Record<string, string> = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
    'video/x-matroska': '.mkv',
    'video/ogg': '.ogv',
  }
  return mimeMap[mimeType] || '.mp4'
}