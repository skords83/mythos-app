'use client'
import { useEffect,useState } from 'react'
import { Chapter } from './types'
import { INPUT,TEXT_MUTED } from '@/lib/theme'
interface WritingData {totalWordGoal:number|null;sessions:{date:string;activeSeconds:number;words:number}[];snapshots:{date:string;wordCount:number;chapters:{id:string;title:string;wordCount:number}[]}[]}
export function WritingProgress({projectId,chapters,today}:{projectId:string;chapters:Chapter[];today:string}){
 const [data,setData]=useState<WritingData|null>(null),[goal,setGoal]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 useEffect(() => {
   let cancelled = false
   const load = async (initial = false) => {
     try {
       const response = await fetch(`/api/projects/${projectId}/writing`)
       if (!response.ok) throw new Error()
       const result = await response.json()
       if (!cancelled) { setData(result); if (initial) setGoal(result.totalWordGoal?.toString() ?? '') }
     } catch { if (!cancelled) setError('Schreibstatistik konnte nicht geladen werden.') }
   }
   const saved = () => { void load() }
   window.addEventListener('writing-session-saved', saved)
   window.dispatchEvent(new Event('writing-session-flush'))
   void load(true)
   return () => { cancelled = true; window.removeEventListener('writing-session-saved', saved) }
 }, [projectId])
 const localNow = new Date()
 const sessionDate = `${localNow.getFullYear()}-${String(localNow.getMonth()+1).padStart(2,'0')}-${String(localNow.getDate()).padStart(2,'0')}`
 const total=chapters.reduce((s,c)=>s+c.wordCount,0),sessions=data?.sessions.filter(s=>s.date===sessionDate)??[],words=sessions.reduce((s,c)=>s+c.words,0)
 const points=data?.snapshots??[],max=Math.max(1,...points.map(p=>p.wordCount)),previous=points.filter(p=>p.date<sessionDate).at(-1)
 const firstDate = points.length ? Date.parse(points[0].date) : 0
 const lastDate = points.length ? Date.parse(points[points.length - 1].date) : 0
 const x = (date: string) => 10 + (Date.parse(date) - firstDate) / Math.max(86400000, lastDate - firstDate) * 580
 return <section className="space-y-4 mb-6"><h3 className="font-medium">Projektfortschritt</h3><p>{total.toLocaleString('de-DE')} Wörter{data?.totalWordGoal?` · ${Math.round(total/data.totalWordGoal*100)} % von ${data.totalWordGoal.toLocaleString('de-DE')}`:''}</p>{data?.totalWordGoal&&<progress className="w-full" aria-label="Projektfortschritt" max={data.totalWordGoal} value={total}/>}
 <form className="flex items-end gap-2" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const totalWordGoal=goal?Number(goal):null;const r=await fetch(`/api/projects/${projectId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({totalWordGoal})});if(!r.ok)throw Error();setData(d=>d?{...d,totalWordGoal}:d)}catch{setError('Gesamtziel konnte nicht gespeichert werden.')}finally{setBusy(false)}}}><label className="text-sm">Gesamtziel (optional)<input className={INPUT} type="number" min="1" max="10000000" value={goal} onChange={e=>setGoal(e.target.value)} placeholder="80000"/></label><button disabled={busy} className="text-sm underline pb-2">Speichern</button></form>
 <h3 className="font-medium">Heute</h3><p>{words>=0?'+':''}{words.toLocaleString('de-DE')} Wörter · {Math.round(sessions.reduce((s,c)=>s+c.activeSeconds,0)/60)} Minuten · {sessions.length} Sessions</p><p className={`text-xs ${TEXT_MUTED}`}>Erfasst ab Einführung dieser Funktion. Eine Pause ab fünf Minuten beginnt eine neue Session; längere Lücken zwischen Eingaben zählen nicht vollständig als Schreibzeit.</p>
 <h3 className="font-medium">Manuskriptwachstum</h3>{points.length>0?<><svg role="img" aria-label="Manuskriptwachstum: gespeicherte Gesamtwortzahl pro Tag" viewBox="0 0 600 150" className="w-full h-36"><polyline fill="none" stroke="currentColor" strokeWidth="2" points={points.map((p,i)=>`${x(p.date)},${140-p.wordCount/max*125}`).join(' ')}/>{points.map((p,i)=><circle key={p.date} cx={x(p.date)} cy={140-p.wordCount/max*125} r="3" fill="currentColor"><title>{p.date}: {p.wordCount} Wörter</title></circle>)}</svg><p className={`text-xs ${TEXT_MUTED}`}>{points[0].date} — {points.at(-1)?.date} · bis {max.toLocaleString('de-DE')} Wörter</p><details><summary className="text-sm">Werte anzeigen</summary>{points.map(p=><p key={p.date} className="text-xs">{p.date}: {p.wordCount.toLocaleString('de-DE')} Wörter</p>)}</details></>:<p className="text-sm">Der Verlauf entsteht mit deinen nächsten Schreibsessions.</p>}
 <h3 className="font-medium">Kapitelentwicklung</h3><p className={`text-xs ${TEXT_MUTED}`}>Änderung gegenüber dem letzten erfassten Tag vor heute.</p><ul className="space-y-1">{chapters.map(c=>{const old=previous?.chapters.find(p=>p.id===c.id);return <li key={c.id} className="flex justify-between gap-2 text-sm"><span>{c.title}</span><span>{c.wordCount.toLocaleString('de-DE')} Wörter {old?`(${c.wordCount-old.wordCount>=0?'+':''}${c.wordCount-old.wordCount})`:'· noch kein Vergleich'}</span></li>})}</ul>{error&&<p role="alert">{error}</p>}</section>
}
