import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StoryExplorer } from '../StoryExplorer'
const data={chapters:[{id:'chapter',title:'Ankunft',order:0,text:'Matti wartet. Matti geht. Aginolf Aginolf Aginolf Aginolf Aginolf Aginolf Aginolf',updatedAt:'2026-09-15'}],entities:[{id:'matti',kind:'CHARACTER',name:'Fabian',aliases:['Matti'],personality:'Neugierig'}],scenes:[],events:[],relations:[],suggestions:[{name:'Aginolf',count:7}]}
beforeEach(()=>{global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>data})})
it('opens a linked profile and lists all alias occurrences with chapter navigation',async()=>{
 const navigate=jest.fn()
 render(<StoryExplorer projectId="p" currentChapterId="other" currentText="" selection={{id:'matti',kind:'CHARACTER'}} onNavigate={navigate}/>)
 expect(await screen.findByText('Neugierig')).toBeInTheDocument()
 fireEvent.click(screen.getByText('Alle Vorkommen im Manuskript'))
 expect(screen.getAllByText('Ankunft')).toHaveLength(2)
 fireEvent.click(screen.getAllByText('Ankunft')[0])
 expect(navigate).toHaveBeenCalledWith('chapter')
})
it('creates a proposed name only after the user chooses its type',async()=>{
 render(<StoryExplorer projectId="p" currentChapterId="other" currentText=""/>)
 expect(await screen.findByText('Aginolf kommt 7× vor')).toBeInTheDocument()
 expect(fetch).toHaveBeenCalledTimes(1)
 fireEvent.click(screen.getByText('Ort anlegen'))
 await waitFor(()=>expect(fetch).toHaveBeenCalledWith('/api/places',expect.objectContaining({method:'POST',body:JSON.stringify({name:'Aginolf',projectId:'p',visibility:'PRIVATE'})})))
})
