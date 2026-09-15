/** @jest-environment node */
import { POST } from '../route'
import { NextRequest } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile } from 'fs/promises'

jest.mock('@/lib/auth', () => ({ getUserFromRequest: jest.fn() }))
jest.mock('@/lib/rateLimit', () => ({ checkRateLimit: jest.fn().mockResolvedValue(null) }))
jest.mock('@/lib/prisma', () => ({ prisma: { upload: { create: jest.fn() } } }))
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn() } }))
jest.mock('fs/promises', () => ({ writeFile: jest.fn(), mkdir: jest.fn() }))
beforeEach(() => { jest.clearAllMocks() })
it('records ownership before returning a new image URL', async () => {
  jest.mocked(getUserFromRequest).mockResolvedValue('owner')
  const request = { formData: async () => ({ get: () => ({ type: 'image/png', size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }) }) } as unknown as NextRequest
  const response = await POST(request)
  expect(response.status).toBe(200)
  const { url } = await response.json()
  expect(prisma.upload.create).toHaveBeenCalledWith({ data: { filename: url.split('/').pop(), ownerIds: ['owner'] } })
  expect(writeFile).toHaveBeenCalled()
})
it('rejects anonymous uploads without writing files or ownership', async () => {
  jest.mocked(getUserFromRequest).mockResolvedValue(null)
  expect((await POST({} as NextRequest)).status).toBe(401)
  expect(writeFile).not.toHaveBeenCalled()
  expect(prisma.upload.create).not.toHaveBeenCalled()
})
