/** @jest-environment node */
import { callMcpStory } from './mcp-story'
import { prisma } from './prisma'
import { runStoryAction } from './story-service'
jest.mock('./prisma', () => ({ prisma: { oAuthAccessToken: { findUnique: jest.fn() }, user: { findUnique: jest.fn() } } }))
jest.mock('./story-service', () => ({ runStoryAction: jest.fn().mockResolvedValue({ status: 200 }) }))
const db = prisma as any
beforeEach(() => { jest.clearAllMocks(); process.env.MYTHOS_OAUTH_ISSUER = 'https://example.test'; db.oAuthAccessToken.findUnique.mockResolvedValue({ userId: 'u', resource: 'https://example.test/api/integrations/mcp', expiresAt: new Date(Date.now() + 60000), scope: 'mythos:read' }); db.user.findUnique.mockResolvedValue({ id: 'u', familyId: 'f', role: 'ADULT' }) })
test('read grant reads scenes but cannot write or remove edges', async () => {
  expect((await callMcpStory('Bearer t', 'mythos_scene', { id: 's' })).status).toBe(200)
  expect((await callMcpStory('Bearer t', 'mythos_delete_relation', {})).status).toBe(403)
  expect(runStoryAction).toHaveBeenCalledTimes(1)
})
test('revoked and wrong-resource tokens never reach service', async () => {
  db.oAuthAccessToken.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 60000), resource: 'wrong', scope: 'mythos:read mythos:write' })
  expect((await callMcpStory('Bearer t', 'mythos_scene', {})).status).toBe(401)
  db.oAuthAccessToken.findUnique.mockResolvedValue({ revokedAt: new Date() })
  expect((await callMcpStory('Bearer t', 'mythos_scene', {})).status).toBe(401)
  expect(runStoryAction).not.toHaveBeenCalled()
})

test('universe writes require write scope before service dispatch', async () => {
 expect((await callMcpStory('Bearer test', 'mythos_create_universe', {title:'Universe'})).status).toBe(403)
})
test.each(['create_event', 'update_event', 'delete_event', 'reorder_events'])('%s requires write grant', async action => {
  expect((await callMcpStory('Bearer t', `mythos_${action}`, {})).status).toBe(403)
  expect(runStoryAction).not.toHaveBeenCalled()
})
