'use client'

import React, { useState } from 'react'
import { Book, Eye, EyeOff, LogIn, UserPlus, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { MODAL_PANEL, INPUT, ACCENT, ACCENT_TEXT, RADIUS, CARD_SHADOW, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, SURFACE } from '@/lib/theme'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isLogin ? 'login' : 'register',
          email,
          password,
          name: isLogin ? undefined : name
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ein Fehler ist aufgetreten')
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`min-h-screen ${SURFACE} flex items-center justify-center p-4`}>
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 ${RADIUS} bg-indigo-600 mb-4 ${CARD_SHADOW}`}>
            <Book size={32} className="text-white" />
          </div>
          <h1 className={`text-3xl font-serif font-bold ${TEXT_PRIMARY} mb-2`}>
            Mythos
          </h1>
          <p className={TEXT_MUTED}>
            Dein persönliches Schreibstudio
          </p>
        </div>

        {/* Login/Register Card */}
        <div className={`${MODAL_PANEL} p-8`}>
          <h2 className={`text-xl font-semibold ${TEXT_PRIMARY} mb-6`}>
            {isLogin ? 'Anmelden' : 'Konto erstellen'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name (only for register) */}
            {!isLogin && (
              <div>
                <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-2`}>
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={INPUT}
                  placeholder="Dein Name"
                  required={!isLogin}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-2`}>
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT}
                placeholder="deine@email.de"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-2`}>
                Passwort
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${INPUT} pr-12`}
                  placeholder="••••••••"
                  required
                  minLength={isLogin ? undefined : 8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${TEXT_MUTED} hover:text-zinc-600 dark:hover:text-zinc-300`}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className={`p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 ${RADIUS}`}>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 ${ACCENT} text-white font-medium ${RADIUS} transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {isLogin ? 'Anmelden...' : 'Konto erstellen...'}
                </>
              ) : (
                <>
                  {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                  {isLogin ? 'Anmelden' : 'Konto erstellen'}
                </>
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-6 pt-6 border-t border-zinc-300 dark:border-zinc-700">
            <p className={`text-sm ${TEXT_MUTED} text-center`}>
              {isLogin ? 'Noch kein Konto?' : 'Bereits ein Konto?'}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                }}
                className={`ml-1 ${ACCENT_TEXT} hover:underline font-medium`}
              >
                {isLogin ? 'Konto erstellen' : 'Anmelden'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className={`text-center text-sm ${TEXT_MUTED} mt-8`}>
          © 2026 Mythos. Alle Rechte vorbehalten.
        </p>
      </div>
    </div>
  )
}
