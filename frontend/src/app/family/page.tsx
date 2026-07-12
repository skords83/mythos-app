'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react'

interface Member {
  id: string
  email: string
  name: string | null
  role: 'OWNER' | 'ADULT' | 'CHILD'
  createdAt: string
}

export default function FamilyPage() {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'ADULT' | 'CHILD'>('ADULT')

  useEffect(() => {
    const load = async () => {
      try {
        const authRes = await fetch('/api/auth')
        const authData = await authRes.json()
        if (!authData.user) {
          router.replace('/login')
          return
        }
        setCurrentUserId(authData.user.id)

        const membersRes = await fetch('/api/family/members')
        if (!membersRes.ok) {
          setError('Familienmitglieder konnten nicht geladen werden.')
          return
        }
        setMembers(await membersRes.json())
      } catch {
        setError('Familienmitglieder konnten nicht geladen werden.')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [router])

  const currentUser = members.find((m) => m.id === currentUserId)
  const isOwner = currentUser?.role === 'OWNER'

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const response = await fetch('/api/family/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Familienmitglied konnte nicht angelegt werden.')
        return
      }
      setMembers([...members, data])
      setEmail('')
      setPassword('')
      setName('')
      setRole('ADULT')
      setShowAddForm(false)
    } catch {
      setError('Familienmitglied konnte nicht angelegt werden.')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-zinc-950">
        <Loader2 className="animate-spin text-zinc-900 dark:text-zinc-200" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 p-6 sm:p-10">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 mb-6 text-sm hover:underline"
        >
          <ArrowLeft size={16} />
          Zurück zum Dashboard
        </button>

        <div className="border-2 border-zinc-900 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-900 rounded-none shadow-[4px_4px_0_0_#18181b] dark:shadow-[4px_4px_0_0_#3f3f46] p-6">
          <h1 className="text-2xl font-bold mb-4">Familie</h1>

          {error && (
            <p className="mb-4 text-sm text-red-700 dark:text-red-400">{error}</p>
          )}

          <ul className="space-y-2 mb-6">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between border-zinc-900 dark:border-zinc-700 border-b py-2"
              >
                <div>
                  <p className="font-medium">{member.name || member.email}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{member.email}</p>
                </div>
                <span className="rounded-sm border border-zinc-900 dark:border-zinc-700 px-2 py-0.5 text-xs font-semibold">
                  {member.role}
                </span>
              </li>
            ))}
          </ul>

          {isOwner && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-none bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <UserPlus size={16} />
              Familienmitglied hinzufügen
            </button>
          )}

          {isOwner && showAddForm && (
            <form onSubmit={handleAddMember} className="space-y-3 border-t-2 border-zinc-900 dark:border-zinc-700 pt-4">
              <div>
                <label className="block text-sm font-medium mb-1">E-Mail *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-none border-2 border-zinc-900 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Passwort * (min. 8 Zeichen)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="w-full px-3 py-2 rounded-none border-2 border-zinc-900 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-none border-2 border-zinc-900 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rolle</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'ADULT' | 'CHILD')}
                  className="w-full px-3 py-2 rounded-none border-2 border-zinc-900 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="ADULT">Erwachsene:r</option>
                  <option value="CHILD">Kind</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 rounded-none border-2 border-zinc-900 dark:border-zinc-700"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-none bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Anlegen
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
