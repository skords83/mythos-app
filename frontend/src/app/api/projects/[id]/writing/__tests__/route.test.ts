/** @jest-environment node */
import { NextRequest } from 'next/server'
import { POST, GET } from '../route'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
jest.mock('@/lib/auth',()=>({getUserFromRequest:jest.fn()}))
jest.mock('@/lib/logger',()=>({logger:{error:jest.fn()}}))
jest.mock('@/lib/prisma',()=>({prisma:{project:{findFirst:jest.fn()},$transaction:jest.fn(),writingSession:{findUnique:jest.fn(),upsert:jest.fn()},chapter:{findMany:jest.fn()},growthSnapshot:{upsert:jest.fn()}}}))
const db=prisma as any
const params={params:{id:'project'}}
const request=(body:unknown)=>new NextRequest('http://localhost',{method:'POST',body:JSON.stringify(body)})
beforeEach(()=>{jest.clearAllMocks();(getUserFromRequest as jest.Mock).mockResolvedValue('user');db.project.findFirst.mockResolvedValue({id:'project'});db.$transaction.mockImplementation((fn:any)=>fn(db));db.writingSession.findUnique.mockResolvedValue(null);db.chapter.findMany.mockResolvedValue([{id:'chapter',title:'Kapitel',wordCount:123}])})
it('does not read or write another user’s project',async()=>{
 db.project.findFirst.mockResolvedValue(null)
 expect((await GET(new NextRequest('http://localhost'),params)).status).toBe(404)
 expect((await POST(request({}),params)).status).toBe(404)
 expect(db.$transaction).not.toHaveBeenCalled()
 expect(db.project.findFirst).toHaveBeenCalledWith({where:{id:'project',userId:'user'}})
})
it('rejects invalid sessions before writing',async()=>{
 expect((await POST(request({id:'session-123',date:'2026-09-15',activeSeconds:-1,words:42}),params)).status).toBe(400)
 expect(db.$transaction).not.toHaveBeenCalled()
})
it('stores idempotent session snapshots and derives manuscript size on the server',async()=>{
 const body={id:'session-123',date:'2026-09-15',activeSeconds:30,words:-3}
 expect((await POST(request(body),params)).status).toBe(200)
 expect(db.writingSession.upsert).toHaveBeenCalledWith(expect.objectContaining({where:{id:'project:session-123'},update:{activeSeconds:30,words:-3}}))
 expect(db.growthSnapshot.upsert).toHaveBeenCalledWith(expect.objectContaining({create:expect.objectContaining({wordCount:123})}))
 db.writingSession.findUnique.mockResolvedValue({activeSeconds:60})
 db.writingSession.upsert.mockClear()
 await POST(request(body),params)
 expect(db.writingSession.upsert).not.toHaveBeenCalled()
})
