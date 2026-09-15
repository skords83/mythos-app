/** @jest-environment node */
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
jest.mock('@/lib/auth',()=>({getAuthContext:jest.fn()}))
jest.mock('@/lib/logger',()=>({logger:{error:jest.fn()}}))
jest.mock('@/lib/prisma',()=>({prisma:Object.fromEntries(['project','chapter','character','place','item','scene','timelineEvent','relation'].map(k=>[k,{findFirst:jest.fn(),findMany:jest.fn()}]))}))
const db=prisma as any
beforeEach(()=>{jest.clearAllMocks();(getAuthContext as jest.Mock).mockResolvedValue({userId:'u',familyId:'f'});db.project.findFirst.mockResolvedValue({id:'p'});for(const key of ['chapter','character','place','item','scene','timelineEvent','relation'])db[key].findMany.mockResolvedValue([])})
it('requires authentication and project ownership before reading manuscripts',async()=>{
 (getAuthContext as jest.Mock).mockResolvedValue(null)
 expect((await GET(new NextRequest('http://localhost'),{params:{id:'p'}})).status).toBe(401)
 expect(db.chapter.findMany).not.toHaveBeenCalled()
 ;(getAuthContext as jest.Mock).mockResolvedValue({userId:'u',familyId:'f'})
 db.project.findFirst.mockResolvedValue(null)
 expect((await GET(new NextRequest('http://localhost'),{params:{id:'p'}})).status).toBe(404)
 expect(db.project.findFirst).toHaveBeenCalledWith({where:{id:'p',userId:'u'}})
})
it('indexes stored manuscript HTML and filters relations to visible endpoints',async()=>{
 db.chapter.findMany.mockResolvedValue([{id:'c',title:'Kapitel',content:{content:'<p>Matti Matti Matti</p>'}}])
 db.character.findMany.mockResolvedValue([{id:'known',name:'Fabian',aliases:[]}])
 db.relation.findMany.mockResolvedValue([{sourceType:'CHARACTER',sourceId:'known',targetType:'CHARACTER',targetId:'private'}])
 const response=await GET(new NextRequest('http://localhost'),{params:{id:'p'}})
 const data=await response.json()
 expect(data.chapters[0].text).toBe('Matti Matti Matti')
 expect(data.suggestions).toEqual([{name:'Matti',count:3}])
 expect(data.relations).toEqual([])
 expect(db.character.findMany.mock.calls[0][0].where.OR).toEqual([{visibility:'FAMILY'},{authorId:'u'}])
})
