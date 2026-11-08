import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import UniversesPage from '../page'
import { Anchor } from '../Anchor'
jest.mock('next/navigation',()=>({useRouter:()=>({push:jest.fn()}),usePathname:()=>'/universes'}))
jest.mock('../../components/UniverseRelations',()=>({UniverseRelations:()=>null}))
jest.mock('../../components/SourceEvidencePanel',()=>({SourceEvidencePanel:()=>null}))
const world={id:'world',title:'Welt',visibility:'PRIVATE',updatedAt:'v1'}
const books=[{id:'one',title:'Buch Eins'},{id:'two',title:'Buch Zwei'}]
let people:any[],claims:any[],fail:string,delayed:Record<string,()=>void>,delays:Set<string>
const response=(data:any,ok=true)=>({ok,json:async()=>data}) as Response
beforeEach(()=>{
 window.history.replaceState({},'','/universes?universeId=world&entityType=CHARACTER')
 people=[{id:'a',name:'Anna',appearance:'Rot',visibility:'PRIVATE',updatedAt:'v1'},{id:'b',name:'Berta',appearance:'Blau',visibility:'PRIVATE',updatedAt:'v1'}];claims=[];fail='';delayed={};delays=new Set()
 global.fetch=jest.fn(async(url,init)=>{
  if(url==='/api/story'){
   const {action,args}=JSON.parse(init!.body as string)
   const delayKey=args.entityId??(action==='universe'?args.universeId:undefined)
   if(delays.has(delayKey))await new Promise<void>(resolve=>{delayed[delayKey+action]=resolve})
   if(fail===action)return response({error:'Testfehler'},false)
   let data:any={entries:[],hasMore:false}
   if(action==='universes')data={entries:[world,{...world,id:'other',title:'Zweite Welt'}],hasMore:false}
   if(action==='universe')data={...world,id:args.universeId,title:args.universeId==='other'?'Zweite Welt':world.title}
   if(action==='universe_books')data={entries:args.universeId==='world'?books:[],hasMore:false}
   if(action==='universe_entries')data={entries:args.entityType==='CHARACTER'&&args.universeId==='world'?people:[],hasMore:false}
   if(action==='universe_entry')data={entry:people.find(p=>p.id===args.entityId),usages:[]}
   if(action==='create_universe_entry'){const p={...args.fields,id:'c',visibility:args.visibility,updatedAt:'v1'};people.push(p);data={entry:p}}
   if(action==='update_universe_entry'){Object.assign(people.find(p=>p.id===args.entityId),args.fields);data={entry:people.find(p=>p.id===args.entityId)}}
   if(action==='universe_assertions')data={entries:claims,hasMore:false}
   if(action==='create_universe_assertion'){claims.push({...args,id:'claim',updatedAt:'v1',sources:[]});data=claims[0]}
   return response({data})
  }
  if(String(url).startsWith('/api/projects'))return response({projects:books,pagination:{totalPages:1}})
  if(String(url).startsWith('/api/chapters'))return response({chapters:[],pagination:{totalPages:1}})
  return response([])
 })
})
async function openAnna(){render(<UniversesPage/>);fireEvent.click(await screen.findByRole('button',{name:'Anna'}));await waitFor(()=>expect(screen.getByLabelText('Name')).toHaveValue('Anna'))}
function discard(){fireEvent.click(screen.getByRole('button',{name:'Verwerfen und wechseln'}))}
it('resets A → B → new and type changes, preserving drafts when discard is cancelled',async()=>{
 await openAnna();fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Entwurf'}})
 fireEvent.click(screen.getByRole('button',{name:'Berta'}));fireEvent.click(screen.getByRole('button',{name:'Abbrechen'}));expect(screen.getByLabelText('Name')).toHaveValue('Entwurf')
 fireEvent.click(screen.getByRole('button',{name:'Berta'}));discard();await waitFor(()=>expect(screen.getByLabelText('Aussehen')).toHaveValue('Blau'))
 fireEvent.click(screen.getByRole('button',{name:'Neuer gemeinsamer Eintrag'}));expect(screen.getByLabelText('Name')).toHaveValue('');expect(screen.getByLabelText('Aussehen')).toHaveValue('')
 fireEvent.click(screen.getByRole('button',{name:'Orte'}));await waitFor(()=>expect(screen.getAllByLabelText('Beschreibung',{selector:'textarea'})[1]).toHaveValue(''))
 expect(screen.queryByLabelText('Aussehen')).not.toBeInTheDocument()
})
it('ignores a delayed entry response after selecting B',async()=>{
 render(<UniversesPage/>);await screen.findByRole('button',{name:'Anna'});delays.add('a')
 fireEvent.click(screen.getByRole('button',{name:'Anna'}));fireEvent.click(screen.getByRole('button',{name:'Berta'}));await waitFor(()=>expect(screen.getByLabelText('Name')).toHaveValue('Berta'))
 await act(async()=>{Object.values(delayed).forEach(resolve=>resolve())});expect(screen.getByLabelText('Name')).toHaveValue('Berta');expect(screen.getByLabelText('Aussehen')).toHaveValue('Blau')
})
it('refreshes figure list, detail and observer choices after create/update; save failures retain draft',async()=>{
 await openAnna();fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Anna Neu'}});fail='update_universe_entry'
 fireEvent.click(screen.getByRole('button',{name:'Allgemeine Angaben speichern'}));expect(await screen.findByRole('alert')).toHaveTextContent('Testfehler');expect(screen.getByLabelText('Name')).toHaveValue('Anna Neu');expect(screen.queryByText('Allgemeine Angaben gespeichert.')).not.toBeInTheDocument()
 fail='';fireEvent.click(screen.getByRole('button',{name:'Allgemeine Angaben speichern'}));await screen.findByText('Allgemeine Angaben gespeichert.');expect(screen.getByRole('button',{name:'Anna Neu'})).toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'Neuer gemeinsamer Eintrag'}));fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Clara'}});fireEvent.click(screen.getByRole('button',{name:'Allgemeine Angaben speichern'}));await screen.findByRole('button',{name:'Clara'});await waitFor(()=>expect(screen.getByLabelText('Name')).toHaveValue('Clara'))
 fireEvent.change(screen.getByLabelText('Ansicht'),{target:{value:'character'}});expect(within(screen.getByLabelText('Wissende Figur')).getByRole('option',{name:'Clara'})).toBeInTheDocument()
})
it('refreshes author statements without a query anchor and resets edit → new',async()=>{
 await openAnna();fireEvent.change(screen.getByLabelText('Ansicht'),{target:{value:'author'}})
 fireEvent.change(screen.getByLabelText('Eigenschaft / Aussage'),{target:{value:'Beruf'}});fireEvent.change(screen.getByLabelText('Wert / Inhalt'),{target:{value:'Pilotin'}});fireEvent.change(screen.getByLabelText('Gültig ab: Buch wählen'),{target:{value:'one'}})
 fireEvent.click(screen.getByRole('button',{name:'Neue Entwicklung speichern'}));await screen.findByText('Beruf: Pilotin');fireEvent.click(screen.getByRole('button',{name:'Aussage korrigieren'}));expect(screen.getByLabelText('Wert / Inhalt')).toHaveValue('Pilotin')
 fireEvent.click(screen.getByRole('button',{name:'Stattdessen neue Entwicklung'}));expect(screen.getByLabelText('Wert / Inhalt')).toHaveValue('');expect(screen.getByLabelText('Gültig ab: Buch wählen')).toHaveValue('')
})
it('distinguishes list load errors and retries without losing the current editor',async()=>{
 fail='universe_entries';render(<UniversesPage/>);expect(await screen.findByRole('alert')).toHaveTextContent('Laden fehlgeschlagen');expect(screen.queryByText(/Im Universum: 0/)).not.toBeInTheDocument();fail='';fireEvent.click(screen.getByRole('button',{name:'Erneut laden'}));await screen.findByRole('button',{name:'Anna'})
})
it('loads all chapter metadata pages, keeps missing assignments, and ignores delayed book responses',async()=>{
 let release:()=>void=()=>{};let failing=false
 global.fetch=jest.fn(async(url)=>{
  const u=new URL(String(url),'http://test');if(u.pathname==='/api/chapters'){
   if(failing)return response({},false)
   if(u.searchParams.get('projectId')==='two'){await new Promise<void>(r=>{release=r});return response({chapters:[{id:'other',title:'Anderes Kapitel'}],pagination:{totalPages:1}})}
   return response({chapters:u.searchParams.get('page')==='1'?[{id:'first',title:'Kapitel 1'}]:[{id:'last',title:'Kapitel 101'}],pagination:{totalPages:2}})
  }return response([])
 })
 const change=jest.fn();const {rerender}=render(<Anchor label="Test" books={books} value={{projectId:'one',chapterId:'last'}} onChange={change}/>)
 await screen.findByRole('option',{name:'Kapitel 101'});expect(screen.getByLabelText('Test: Kapitel optional')).toHaveValue('last');expect(fetch).toHaveBeenCalledWith('/api/chapters?projectId=one&limit=100&page=2')
 fireEvent.change(screen.getByLabelText('Test: Buch wählen'),{target:{value:'two'}});expect(change).toHaveBeenCalledWith({projectId:'two'})
 rerender(<Anchor label="Test" books={books} value={{projectId:'two'}} onChange={change}/>);expect(screen.queryByRole('option',{name:'Kapitel 101'})).not.toBeInTheDocument()
 rerender(<Anchor label="Test" books={books} value={{projectId:'one',chapterId:'gone'}} onChange={change}/>);await screen.findByText(/Die bestehende Zuordnung/);await act(async()=>release());expect(screen.queryByRole('option',{name:'Anderes Kapitel'})).not.toBeInTheDocument();expect(screen.getByLabelText('Test: Kapitel optional')).toHaveValue('gone')
 failing=true;rerender(<Anchor label="Test" books={[...books]} value={{projectId:'one'}} onChange={change}/>);await screen.findByRole('alert');expect(screen.queryByText('Keine zugänglichen Kapitel in diesem Buch.')).not.toBeInTheDocument();failing=false;fireEvent.click(screen.getByRole('button',{name:'Erneut laden'}));await waitFor(()=>expect(screen.queryByRole('alert')).not.toBeInTheDocument());expect(screen.getByRole('option',{name:'Kapitel 101'})).toBeInTheDocument()
})
it('blocks duplicate writes while saving and retains a separate statement draft when refreshing a figure',async()=>{
 await openAnna()
 fireEvent.change(screen.getByLabelText('Eigenschaft / Aussage'),{target:{value:'Noch nicht gespeichert'}})
 fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Anna Neu'}})
 delays.add('a')
 const save=screen.getByRole('button',{name:'Allgemeine Angaben speichern'})
 act(()=>{fireEvent.click(save);fireEvent.click(save)})
 expect(save).toBeDisabled()
 expect((fetch as jest.Mock).mock.calls.filter(([,init])=>init&&JSON.parse(init.body).action==='update_universe_entry')).toHaveLength(1)
 delays.clear();await act(async()=>delayed.aupdate_universe_entry())
 await screen.findByText('Allgemeine Angaben gespeichert.')
 expect(screen.getByLabelText('Eigenschaft / Aussage')).toHaveValue('Noch nicht gespeichert')
})
it('retains a failed statement draft and never reports success before persistence',async()=>{
 await openAnna();fireEvent.change(screen.getByLabelText('Eigenschaft / Aussage'),{target:{value:'Beruf'}});fireEvent.change(screen.getByLabelText('Wert / Inhalt'),{target:{value:'Pilotin'}});fireEvent.change(screen.getByLabelText('Gültig ab: Buch wählen'),{target:{value:'one'}})
 fail='create_universe_assertion';fireEvent.click(screen.getByRole('button',{name:'Neue Entwicklung speichern'}));expect(await screen.findByRole('alert')).toHaveTextContent('Testfehler')
 expect(screen.getByLabelText('Wert / Inhalt')).toHaveValue('Pilotin');expect(screen.getByLabelText('Gültig ab: Buch wählen')).toHaveValue('one');expect(screen.queryByText(/Aussage gespeichert;/)).not.toBeInTheDocument()
})
it('ignores an entry response after switching types and clears universe-specific fields for creation',async()=>{
 render(<UniversesPage/>);await screen.findByRole('button',{name:'Anna'});delays.add('a')
 fireEvent.click(screen.getByRole('button',{name:'Anna'}));fireEvent.click(screen.getByRole('button',{name:'Orte'}));await screen.findByLabelText('Lage')
 await act(async()=>Object.values(delayed).forEach(resolve=>resolve()))
 expect(screen.getByLabelText('Name')).toHaveValue('');expect(screen.queryByLabelText('Aussehen')).not.toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'Neues Universum'}));expect(screen.getByLabelText('Titel')).toHaveValue('');expect(screen.queryByText('Gemeinsames Wissen')).not.toBeInTheDocument()
})

it('switches universes atomically and ignores a late universe response',async()=>{
 await openAnna();fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Nicht übernehmen'}})
 const nav=screen.getByRole('navigation',{name:'Universum auswählen'})
 fireEvent.click(within(nav).getByRole('button',{name:/^Zweite Welt/}));discard()
 await waitFor(()=>expect(screen.getByLabelText('Titel')).toHaveValue('Zweite Welt'))
 expect(screen.getByLabelText('Name')).toHaveValue('');expect(screen.queryByRole('button',{name:'Anna'})).not.toBeInTheDocument();expect(screen.queryByText('1. Buch Eins')).not.toBeInTheDocument()
 fireEvent.click(within(nav).getByRole('button',{name:/^Welt/}));await screen.findByRole('button',{name:'Anna'})
 delays.add('other');fireEvent.click(within(nav).getByRole('button',{name:/^Zweite Welt/}));fireEvent.click(within(nav).getByRole('button',{name:/^Welt/}))
 await screen.findByRole('button',{name:'Anna'});await act(async()=>delayed.otheruniverse())
 expect(screen.getByLabelText('Titel')).toHaveValue('Welt');expect(screen.getByRole('button',{name:'Anna'})).toBeInTheDocument()
})
