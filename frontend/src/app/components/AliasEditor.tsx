'use client'
import { useState } from 'react'
import { INPUT, BUTTON_SECONDARY } from '@/lib/theme'
export function AliasEditor({ id, kind, aliases = [], onSaved }: { id:string; kind:string; aliases?:string[]; onSaved?:()=>void }) {
  const [value,setValue] = useState(aliases.join('\n'))
  const [status,setStatus] = useState('')
  const [busy,setBusy] = useState(false)
  return <div className="space-y-2"><label className="block text-sm">Aliase (ein Name pro Zeile)<textarea className={INPUT} rows={3} value={value} onChange={e=>setValue(e.target.value)} /></label><button type="button" disabled={busy} className={`${BUTTON_SECONDARY} px-3 py-1 text-sm`} onClick={async()=>{
    setBusy(true);setStatus('')
    try {const r=await fetch(`/api/${kind}/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({aliases:value.split('\n').map(s=>s.trim()).filter(Boolean)})});if(!r.ok)throw Error();setStatus('Aliase gespeichert.');window.dispatchEvent(new Event('story-entities-updated'));onSaved?.()}catch{setStatus('Aliase konnten nicht gespeichert werden.')}finally{setBusy(false)}
  }}>Aliase speichern</button><p role="status" className="text-xs">{status}</p></div>
}
