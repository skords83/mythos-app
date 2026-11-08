'use client'
import { useEffect, useState } from 'react'
import { INPUT, BUTTON_SECONDARY, HAIRLINE } from '@/lib/theme'
type Row = Record<string, any>
async function get(url:string) {
 const response=await fetch(url)
 if(!response.ok)throw Error('Die Auswahl konnte nicht geladen werden.')
 return response.json()
}
// The chapter endpoint returns metadata only, ordered by order/id.
async function chaptersFor(projectId:string) {
 const rows:Row[]=[]
 for(let page=1;;page++) {
  const data=await get(`/api/chapters?projectId=${encodeURIComponent(projectId)}&limit=100&page=${page}`)
  rows.push(...data.chapters)
  if(page>=(data.pagination?.totalPages??1))return rows
 }
}
export function Anchor({label,value,onChange,books}:{label:string;value:Row;onChange:(v:Row)=>void;books:Row[]}) {
 const [data,setData]=useState<{project?:string;chapter?:string;chapters:Row[];events:Row[];scenes:Row[]}>({chapters:[],events:[],scenes:[]})
 const [error,setError]=useState(''),[sceneError,setSceneError]=useState(''),[loading,setLoading]=useState(false),[sceneLoading,setSceneLoading]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{
  let active=true;setError('');setLoading(!!value.projectId)
  if(value.projectId)Promise.all([chaptersFor(value.projectId),get(`/api/timeline-events?projectId=${encodeURIComponent(value.projectId)}`)]).then(([chapters,events])=>{if(active)setData(d=>({...d,project:value.projectId,chapters,events}))}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)})
  return()=>{active=false}
 },[value.projectId,books,retry])
 useEffect(()=>{
  let active=true;setSceneError('');setSceneLoading(!!value.chapterId)
  if(value.chapterId)get(`/api/scenes?chapterId=${encodeURIComponent(value.chapterId)}`).then(scenes=>{if(active)setData(d=>({...d,chapter:value.chapterId,scenes}))}).catch(e=>{if(active)setSceneError(e.message)}).finally(()=>{if(active)setSceneLoading(false)})
  return()=>{active=false}
 },[value.projectId,value.chapterId,retry])
 const select=(key:string,rows:Row[],placeholder:string,pending=false,failed=false)=>{
  const missing=value[key]&&!rows.some(r=>r.id===value[key])
  return <><select aria-label={`${label}: ${placeholder}`} className={INPUT} disabled={pending||failed} value={value[key]??''} onChange={e=>{
   const next={...value};if(e.target.value)next[key]=e.target.value;else delete next[key]
   if(key==='projectId'){delete next.restricted;delete next.chapterId;delete next.sceneId;delete next.eventId}
   if(key==='chapterId')delete next.sceneId
   onChange(next)
  }}><option value="">{placeholder}</option>{missing&&<option value={value[key]}>{pending?'Zuordnung wird geladen …':`Nicht auflösbare Zuordnung (${value[key]})`}</option>}{rows.map(r=><option key={r.id} value={r.id}>{r.title??r.name}</option>)}</select>{missing&&!pending&&!failed&&<p role="alert">Die bestehende Zuordnung ist nicht mehr zugänglich. Sie bleibt erhalten, bis du sie ausdrücklich änderst.</p>}</>
 }
 const chapters=data.project===value.projectId?data.chapters:[],events=data.project===value.projectId?data.events:[],scenes=data.chapter===value.chapterId?data.scenes:[]
 return <fieldset className={`min-w-0 space-y-2 border ${HAIRLINE} p-3`}><legend>{label}</legend>
 {value.restricted&&<p role="alert">Diese bestehende Zuordnung ist nicht zugänglich. Zum Ändern bitte einen zugänglichen Anker wählen.</p>}
 {select('projectId',books,'Buch wählen')}
 {(loading||sceneLoading)&&<p role="status">Handlungsanker werden geladen …</p>}
 {(error||sceneError)&&<p role="alert">{error||sceneError} <button type="button" className={BUTTON_SECONDARY} onClick={()=>setRetry(r=>r+1)}>Erneut laden</button></p>}
 {value.projectId&&<>{select('chapterId',chapters,'Kapitel optional',loading,!!error)}{value.chapterId&&select('sceneId',scenes,'Szene optional',sceneLoading,!!sceneError)}{select('eventId',events,'Ereignis optional',loading,!!error)}{!loading&&!error&&chapters.length===0&&<p>Keine zugänglichen Kapitel in diesem Buch.</p>}</>}
 </fieldset>
}
