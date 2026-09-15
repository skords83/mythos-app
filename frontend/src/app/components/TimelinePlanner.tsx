'use client'
import { useEffect, useState } from 'react'
import type { StoryData } from './StoryExplorer'
import { chronologyWarnings } from '@/lib/chronology'
import { INPUT, BORDER, TEXT_MUTED } from '@/lib/theme'
export function TimelinePlanner({projectId,revision}:{projectId:string;revision:string}) {
  const [data,setData]=useState<StoryData|null>(null),[tick,setTick]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  const [source,setSource]=useState(''),[target,setTarget]=useState(''),[kind,setKind]=useState('BEFORE')
  useEffect(()=>{let cancelled=false;setError('');fetch(`/api/projects/${projectId}/story`).then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{if(!cancelled)setData(d)}).catch(()=>{if(!cancelled)setError('Story-Planung konnte nicht geladen werden.')});return()=>{cancelled=true}},[projectId,revision,tick])
  const mutate=async(url:string,method:string,body?:unknown)=>{setBusy(true);setError('');try{const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!r.ok){const detail=await r.json();throw new Error(detail.error || 'Änderung konnte nicht gespeichert werden.')}setTick(v=>v+1)}catch(error){setError(error instanceof Error ? error.message : 'Änderung konnte nicht gespeichert werden.')}finally{setBusy(false)}}
  const labels=new Map([...(data?.events??[]).map(e=>[e.id,e.title] as const),...(data?.scenes??[]).map(s=>[s.id,s.name] as const)])
  return <section className={`${BORDER} p-4 mb-6 space-y-3`}><h3 className="font-medium">Story-Planung</h3>{error&&<p role="alert">{error}<button onClick={()=>setTick(v=>v+1)}>Erneut versuchen</button></p>}{data?<>
    <p className="text-sm overflow-x-auto">{data.events.map(e=>e.title).join(' → ')||'Lege ein erstes Ereignis an.'}</p>
    <form className="grid gap-2 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();void mutate('/api/relations','POST',{sourceType:kind==='BEFORE'?'EVENT':'SCENE',sourceId:source,targetType:'EVENT',targetId:target,relationType:kind});}}>
    <label className="text-sm">Verknüpfung<select className={INPUT} value={kind} onChange={e=>{setKind(e.target.value);setSource('')}}><option value="BEFORE">Ereignis liegt vor …</option><option value="TAKES_PLACE_AT">Szene findet statt bei …</option><option value="REFERENCES_PAST">Szene verweist auf vergangenes Ereignis …</option></select></label>
    <label className="text-sm">{kind==='BEFORE'?'Ereignis':'Kapitel / Szene'}<select required className={INPUT} value={source} onChange={e=>setSource(e.target.value)}><option value="">Auswählen</option>{kind==='BEFORE'?data.events.map(e=><option key={e.id} value={e.id}>{e.title}</option>):data.scenes.map(s=><option key={s.id} value={s.id}>{data.chapters.find(c=>c.id===s.chapterId)?.title} / {s.name}</option>)}</select></label>
    <label className="text-sm">Bezugspunkt<select required className={INPUT} value={target} onChange={e=>setTarget(e.target.value)}><option value="">Ereignis auswählen</option>{data.events.filter(e=>kind!=='BEFORE'||e.id!==source).map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label><button disabled={busy} className="text-sm underline">Verknüpfen</button></form>
    {data.relations.filter(r=>['BEFORE','TAKES_PLACE_AT','REFERENCES_PAST'].includes(r.relationType)).map(r=><div key={r.id} className="flex gap-2 text-sm"><span>{labels.get(r.sourceId)} {r.relationType==='BEFORE'?'→ vor →':r.relationType==='TAKES_PLACE_AT'?'→ findet statt bei →':'→ erinnert an →'} {labels.get(r.targetId)}</span><button disabled={busy} aria-label="Verknüpfung entfernen" onClick={()=>void mutate(`/api/relations/${r.id}`,'DELETE')}>×</button></div>)}
    <h4 className="text-sm font-medium">Chronologieprüfung</h4><p className={`text-xs ${TEXT_MUTED}`}>Geprüft werden die Reihenfolge und ausdrücklich als Vergangenheit verknüpfte Ereignisse. Ordne einer Szene zuerst ihren Zeitpunkt zu. Rückblenden können einen früheren Zeitpunkt erhalten.</p>
    {chronologyWarnings(data.events,data.relations,data.scenes).map(w=><p key={w} className="text-sm text-amber-700 dark:text-amber-400">{w}</p>)}{chronologyWarnings(data.events,data.relations,data.scenes).length===0&&<p className="text-sm">Keine Widersprüche in den vorhandenen Verknüpfungen.</p>}
  </>:!error&&<p role="status">Planung wird geladen…</p>}</section>
}
