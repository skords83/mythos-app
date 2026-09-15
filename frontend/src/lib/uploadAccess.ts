import { prisma } from './prisma'
import type { AuthContext } from './auth'
import { visibilityWhere } from './visibility'

export async function canReadUpload(filename: string, context: AuthContext): Promise<boolean> {
  const upload = await prisma.upload.findUnique({ where: { filename } })
  if (!upload) return false
  if (upload.ownerIds.includes(context.userId)) return true
  const urls = [`/api/upload/${filename}`, `/uploads/${filename}`]
  // Only a trusted owner's reference may grant shared access. Otherwise someone
  // could paste another person's private URL into their own FAMILY entity.
  const [character, placeImage, version] = await Promise.all([
    prisma.character.findFirst({
      where: { avatarUrl: { in: urls }, authorId: { in: upload.ownerIds }, familyId: context.familyId, OR: visibilityWhere(context) },
      select: { id: true },
    }),
    prisma.placeImage.findFirst({
      where: { url: { in: urls }, authorId: { in: upload.ownerIds }, familyId: context.familyId,
        place: { familyId: context.familyId, OR: visibilityWhere(context) } },
      select: { id: true },
    }),
    prisma.chapterVersion.findFirst({
      where: { familyId: context.familyId, authorId: { in: upload.ownerIds }, OR: urls.flatMap(url => [
        { content: { string_contains: url } },
        { content: { path: ['content'], string_contains: url } },
      ]) },
      select: { id: true },
    }),
  ])
  return !!(character || placeImage || version)
}
