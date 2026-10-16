'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type TiptapNode = { type?: string; text?: string; content?: TiptapNode[] }
type Proposal = {
  id: string
  title: string
  content: TiptapNode
  expiresAt: string
  canApply: boolean
  chapter: {
    id: string
    title: string
    content: TiptapNode
    project: { id: string; title: string }
  }
}

function plainText(node: TiptapNode | null | undefined): string {
  if (!node || typeof node !== 'object') return ''
  if (node.type === 'text') return node.text ?? ''
  const children = Array.isArray(node.content) ? node.content : []
  return children.map(plainText).join(node.type === 'doc' ? '\n\n' : '')
}

export default function ApprovalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    setError('')
    try {
      const response = await fetch('/api/integrations/approvals', { credentials: 'same-origin', cache: 'no-store' })
      if (!response.ok) throw new Error(response.status === 401 ? 'Bitte melde dich in Mythos an.' : 'Vorschläge konnten nicht geladen werden.')
      const result = await response.json()
      setProposals(result.proposals)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  async function decide(id: string, decision: 'approve' | 'reject') {
    if (busy) return
    const prompt = decision === 'approve'
      ? 'Die vorgeschlagene Fassung übernehmen? Die bisherige Fassung wird als Version gesichert.'
      : 'Diesen Vorschlag endgültig ablehnen?'
    if (!window.confirm(prompt)) return
    setBusy(id)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/integrations/approvals/' + encodeURIComponent(id), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Entscheidung fehlgeschlagen')
      setMessage(decision === 'approve' ? 'Kapitel übernommen. Die vorherige Fassung wurde gesichert.' : 'Vorschlag abgelehnt.')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unbekannter Fehler')
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 text-zinc-900 dark:text-zinc-100">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Kapitelvorschläge prüfen</h1>
          <p className="mt-2 text-sm text-zinc-500">Nur deine ausdrückliche Freigabe verändert ein Kapitel.</p>
        </div>
        <Link href="/" className="rounded border border-zinc-500 px-4 py-2 text-sm">Zurück zu Mythos</Link>
      </div>
      {error && <p role="alert" className="mb-5 rounded border border-red-500 p-3">{error}</p>}
      {message && <p role="status" className="mb-5 rounded border border-green-500 p-3">{message}</p>}
      {loading && <p>Vorschläge werden geladen …</p>}
      {!loading && !error && proposals.length === 0 && <p>Zurzeit gibt es keine offenen Kapitelvorschläge.</p>}
      {proposals.map((proposal) => (
        <section key={proposal.id} className="mb-8 rounded-xl border border-zinc-300 p-5 dark:border-zinc-700">
          <div className="mb-5">
            <p className="text-sm text-zinc-500">{proposal.chapter.project.title}</p>
            <h2 className="mt-1 text-xl font-medium">{proposal.chapter.title} → {proposal.title}</h2>
            {!proposal.canApply && <p className="mt-2 text-sm text-amber-600">Dieser Vorschlag ist abgelaufen oder das Kapitel wurde inzwischen verändert. Eine Übernahme ist nicht möglich.</p>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="min-w-0 rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
              <h3 className="mb-3 font-semibold">Aktuelle Fassung</h3>
              <div className="whitespace-pre-wrap break-words text-sm leading-7">{plainText(proposal.chapter.content)}</div>
            </div>
            <div className="min-w-0 rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
              <h3 className="mb-3 font-semibold">Vorgeschlagene Fassung</h3>
              <div className="whitespace-pre-wrap break-words text-sm leading-7">{plainText(proposal.content)}</div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" disabled={busy !== null || !proposal.canApply} onClick={() => void decide(proposal.id, 'approve')} className="rounded bg-emerald-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40">Übernehmen</button>
            <button type="button" disabled={busy !== null} onClick={() => void decide(proposal.id, 'reject')} className="rounded border border-zinc-500 px-4 py-2 disabled:opacity-40">Ablehnen</button>
          </div>
        </section>
      ))}
    </main>
  )
}
