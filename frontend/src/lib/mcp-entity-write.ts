import { prisma } from '@/lib/prisma'
import { hashCredential } from '@/lib/oauth-credentials'
import { hasMythosScope } from '@/lib/integration-permissions'
import { oauthConfig } from '@/lib/oauth-config'

const fields = {
  character: ['name', 'appearance', 'personality', 'backstory', 'motivation', 'flaw', 'secrets'],
  place: ['name', 'description', 'location', 'climate', 'importance', 'history', 'politics', 'sensoryDetails'],
  lore: ['title', 'content', 'category'],
} as const
type Entity = keyof typeof fields
const entities = Object.keys(fields) as Entity[]
const identifier = { type: 'string', minLength: 1, maxLength: 128 }
const propertiesFor = (entity: Entity): Record<string, unknown> => ({
  ...Object.fromEntries(fields[entity].map(key => [key, { type: 'string', maxLength: key === 'name' || key === 'title' ? 300 : 20000, ...(key === 'name' || key === 'title' ? { minLength: 1 } : {}) }])),
  ...(entity !== 'lore' ? { aliases: { type: 'array', maxItems: 30, items: { type: 'string', minLength: 1, maxLength: 100 } } } : {}),
  ...(entity === 'character' ? { role: { enum: ['PROTAGONIST', 'ANTAGONIST', 'MENTOR', null] } } : {}),
})
export const entityWriteTools = entities.flatMap(entity => ['create', 'update'].map(operation => ({
  name: `mythos_${operation}_${entity}`,
  description: `${operation === 'create' ? 'Create a private' : 'Update an authored'} ${entity} in an owned project. Saves immediately. ${operation === 'update' ? 'Read first and pass updatedAt as expectedUpdatedAt; omitted fields remain unchanged.' : 'Requires name (character/place) or title (lore).'} Lore content is plain text.`,
  annotations: { readOnlyHint: false, destructiveHint: operation === 'update', idempotentHint: false, openWorldHint: false },
  securitySchemes: [{ type: 'oauth2', scopes: ['mythos:read', 'mythos:write'] }],
  _meta: { securitySchemes: [{ type: 'oauth2', scopes: ['mythos:read', 'mythos:write'] }] },
  inputSchema: {
    type: 'object', additionalProperties: false,
    properties: {
      projectId: identifier,
      ...(operation === 'update' ? { id: identifier, expectedUpdatedAt: { type: 'string', format: 'date-time' } } : {}),
      ...propertiesFor(entity),
    },
    required: operation === 'update' ? ['projectId', 'id', 'expectedUpdatedAt'] : ['projectId', entity === 'lore' ? 'title' : 'name'],
  },
})))

export async function writeMcpEntity(bearer: string | null, name: string, input: unknown) {
  const tool = entityWriteTools.find(tool => tool.name === name)
  const invalid = { status: 400, error: 'Invalid write arguments' }
  if (!tool || !input || typeof input !== 'object' || Array.isArray(input)) return invalid
  const args = input as Record<string, unknown>
  const entity = name.split('_')[2] as Entity
  const updating = name.split('_')[1] === 'update'
  if (Object.keys(args).some(key => !Object.prototype.hasOwnProperty.call(tool.inputSchema.properties, key)) || tool.inputSchema.required.some(key => args[key] === undefined)) return invalid
  for (const key of ['projectId', ...(updating ? ['id'] : [])]) {
    if (typeof args[key] !== 'string' || !(args[key] as string).trim() || (args[key] as string).length > 128) return invalid
  }
  if (updating && (typeof args.expectedUpdatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(args.expectedUpdatedAt) || !Number.isFinite(Date.parse(args.expectedUpdatedAt)))) return invalid
  const data: Record<string, string | string[] | null> = {}
  for (const key of fields[entity]) {
    if (args[key] === undefined) continue
    const value = args[key]
    const heading = key === 'name' || key === 'title'
    if (typeof value !== 'string' || value.length > (heading ? 300 : 20000) || (heading && !value.trim())) return invalid
    data[key] = value
  }
  if (args.aliases !== undefined) {
    if (!Array.isArray(args.aliases) || args.aliases.length > 30 || args.aliases.some(value => typeof value !== 'string' || !value.trim() || value.length > 100)) return invalid
    data.aliases = Array.from(new Set(args.aliases.map(value => value.trim())))
  }
  if (args.role !== undefined) {
    if (args.role !== null && !['PROTAGONIST', 'ANTAGONIST', 'MENTOR'].includes(args.role as string)) return invalid
    data.role = args.role as string | null
  }
  if (!Object.keys(data).length) return invalid
  const match = bearer?.match(/^Bearer ([A-Za-z0-9._~-]{1,512})$/i)
  if (!match) return { status: 401, error: 'Unauthorized' }
  const token = await prisma.oAuthAccessToken.findUnique({ where: { tokenHash: hashCredential(match[1]) } })
  if (!token || token.revokedAt || token.expiresAt <= new Date() || token.resource !== oauthConfig().resource) return { status: 401, error: 'Unauthorized' }
  if (!hasMythosScope(token.scope, 'mythos:write')) return { status: 403, error: 'Write scope required' }
  return prisma.$transaction(async tx => {
    const project = await tx.project.findFirst({ where: { id: args.projectId as string, userId: token.userId }, select: { user: { select: { familyId: true } } } })
    if (!project) return { status: 404, error: 'Project not found' }
    const scope = { projectId: args.projectId as string, authorId: token.userId, familyId: project.user.familyId }
    // The field allowlist above is shared with the advertised schema.
    if (!updating) {
      const createData = { ...data, ...scope, visibility: 'PRIVATE' as const }
      const result = entity === 'character'
        ? await tx.character.create({ data: createData as Parameters<typeof tx.character.create>[0]['data'], select: { id: true, updatedAt: true } })
        : entity === 'place'
          ? await tx.place.create({ data: createData as Parameters<typeof tx.place.create>[0]['data'], select: { id: true, updatedAt: true } })
          : await tx.loreEntry.create({ data: createData as Parameters<typeof tx.loreEntry.create>[0]['data'], select: { id: true, updatedAt: true } })
      return { status: 201, ...result }
    }
    const where = { ...scope, id: args.id as string }
    const query = { where, select: { updatedAt: true } }
    const current = entity === 'character' ? await tx.character.findFirst(query) : entity === 'place' ? await tx.place.findFirst(query) : await tx.loreEntry.findFirst(query)
    if (!current) return { status: 404, error: 'Entry not found' }
    const expected = new Date(args.expectedUpdatedAt as string)
    const updatedAt = new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1))
    const update = { where: { ...where, updatedAt: expected }, data: { ...data, updatedAt } }
    const result = entity === 'character' ? await tx.character.updateMany(update) : entity === 'place' ? await tx.place.updateMany(update) : await tx.loreEntry.updateMany(update)
    if (!result.count) return { status: 409, error: 'Entry changed since last read; read again before updating' }
    return { status: 200, id: args.id, updatedAt }
  })
}
