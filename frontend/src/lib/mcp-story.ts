import { universeTools } from './universe-schema'
import { runUniverseAction } from './universe-service'
import { prisma } from './prisma'
import { hashCredential } from './oauth-credentials'
import { oauthConfig } from './oauth-config'
import { hasMythosScope } from './integration-permissions'
import { storyTools } from './story-tool-schema'
import { runStoryAction } from './story-service'

export async function callMcpStory(bearer: string | null, name: string, args: unknown) {
  const tool = [...storyTools, ...universeTools].find(t => t.name === name)
  if (!tool) return { status: 400, error: 'Unbekanntes Werkzeug.' }
  const match = bearer?.match(/^Bearer ([A-Za-z0-9._~-]{1,512})$/i)
  if (!match) return { status: 401, error: 'Nicht autorisiert.' }
  const token = await prisma.oAuthAccessToken.findUnique({ where: { tokenHash: hashCredential(match[1]) } })
  if (!token || token.revokedAt || token.expiresAt <= new Date() || token.resource !== oauthConfig().resource) return { status: 401, error: 'Nicht autorisiert.' }
  if (!hasMythosScope(token.scope, tool.annotations.readOnlyHint ? 'mythos:read' : 'mythos:write')) return { status: 403, error: 'Erforderliche Berechtigung fehlt.' }
  const user = await prisma.user.findUnique({ where: { id: token.userId }, select: { id: true, familyId: true, role: true } })
  if (!user) return { status: 401, error: 'Nicht autorisiert.' }
  return (universeTools.some(t => t.name === name) ? runUniverseAction : runStoryAction)({ userId: user.id, familyId: user.familyId, role: user.role }, name.slice(7), args)
}
