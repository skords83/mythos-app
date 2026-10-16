'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type ClientInfo = { client_id: string; client_name: string; scope: string; redirect_uri: string }

export function OAuthAuthorizeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const query = searchParams.toString()
        const validation = await fetch('/api/oauth/authorize?' + query, { cache: 'no-store' })
        if (!validation.ok) throw new Error('Die OAuth-Anfrage ist ungültig oder nicht registriert.')
        const info = await validation.json()
        const auth = await fetch('/api/auth', { credentials: 'same-origin', cache: 'no-store' })
        if (cancelled) return
        if (auth.status === 401) {
          router.replace('/login?returnTo=' + encodeURIComponent('/oauth/authorize?' + query))
          return
        }
        if (!auth.ok) throw new Error('Die Anmeldung konnte nicht überprüft werden.')
        setClient(info)
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unbekannter Fehler')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [router, searchParams])

  function deny() {
    if (!client || loading) return
    const state = searchParams.get("state")
    if (!state) return
    const destination = new URL(client.redirect_uri)
    destination.searchParams.set("error", "access_denied")
    destination.searchParams.set("state", state)
    window.location.assign(destination.toString())
  }

  async function approve() {
    if (!client) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams(searchParams.toString())
      const response = await fetch('/api/oauth/authorize', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(params), consent: true }),
      })
      if (!response.ok) throw new Error('Die Freigabe ist fehlgeschlagen.')
      const result = await response.json()
      window.location.assign(result.redirect_to)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unbekannter Fehler')
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-16 text-zinc-900 dark:text-zinc-100">
      <section className="rounded-xl border border-zinc-300 p-6 dark:border-zinc-700">
        <h1 className="text-2xl font-semibold">Mythos – Zugriffsfreigabe</h1>
        {loading && <p className="mt-5">Anfrage wird geprüft …</p>}
        {error && <p role="alert" className="mt-5 text-red-600">{error}</p>}
        {client && <p className="mt-5">{client.client_name} möchte lesend auf deine Mythos-Daten zugreifen.</p>}
        {client && (
          <div className="mt-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Berechtigung: Projekte, Kapitel, Figuren, Orte und weitere
              Hintergrundinformationen lesen. Keine Schreibrechte.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void approve()}
                disabled={loading}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white disabled:opacity-50"
              >
                Zugriff erlauben
              </button>
              <button
                type="button"
                onClick={deny}
                disabled={loading}
                className="rounded-lg border border-zinc-400 px-5 py-3 font-medium dark:border-zinc-600"
              >
                Ablehnen
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
