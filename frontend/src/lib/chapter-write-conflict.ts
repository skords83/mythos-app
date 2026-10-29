import { Prisma } from '@prisma/client'

/** Millisecond revisions must advance even for writes in the same clock tick. */
export function nextChapterRevision(previous: Date, now = Date.now()): Date {
  return new Date(Math.max(now, previous.getTime() + 1))
}
export class ChapterWriteConflict extends Error {}
export function isChapterWriteConflict(error: unknown): boolean {
  return error instanceof ChapterWriteConflict ||
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034')
}
