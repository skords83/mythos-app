import { act, renderHook } from '@testing-library/react'
import { useWritingSession } from '../useWritingSession'

beforeEach(()=>{
 jest.useFakeTimers()
 jest.setSystemTime(new Date('2026-09-15T10:00:00Z'))
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'})
 Object.defineProperty(crypto,'randomUUID',{configurable:true,value:jest.fn().mockReturnValueOnce('first-session').mockReturnValue('next-session')})
 global.fetch=jest.fn().mockResolvedValue({ok:true})
})
afterEach(()=>jest.useRealTimers())
it('accumulates subsecond typing, tracks net words and starts a new session after idle',async()=>{
 const {result,unmount}=renderHook(()=>useWritingSession('project','chapter',jest.fn()))
 await act(async()=>result.current('', '<p>Matti</p>'))
 for(let i=0;i<4;i++)await act(async()=>{jest.advanceTimersByTime(500);result.current('Matti','Matti geht')})
 await act(async()=>window.dispatchEvent(new Event('writing-session-flush')))
 const payloads=(fetch as jest.Mock).mock.calls.map(c=>JSON.parse(c[1].body))
 expect(payloads.at(-1)).toMatchObject({activeSeconds:2,words:5,id:'first-session'})
 await act(async()=>{jest.advanceTimersByTime(300000);result.current('Matti geht','Matti')})
 await act(async()=>window.dispatchEvent(new Event('writing-session-flush')))
 expect(JSON.parse((fetch as jest.Mock).mock.calls.at(-1)[1].body)).toMatchObject({activeSeconds:0,words:-1,id:'next-session'})
 unmount()
})
it('does not create sessions without actual changes or for a hidden editor',async()=>{
 const {result,unmount}=renderHook(()=>useWritingSession('project','chapter',jest.fn()))
 await act(async()=>result.current('Matti','Matti'))
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'})
 await act(async()=>result.current('','Matti'))
 expect(fetch).not.toHaveBeenCalled()
 unmount()
})
