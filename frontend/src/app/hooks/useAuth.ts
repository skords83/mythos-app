import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AuthUser {
  id: string
  name?: string | null
  email?: string
  familyId?: string
  role?: string
}

export function useAuth() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth')
        const data = await res.json()

        if (data.user) {
          setUser(data.user)
          const storedProjectId = localStorage.getItem('selectedProjectId')
          if (storedProjectId) {
            setIsCheckingAuth(false)
          } else {
            router.replace('/dashboard')
          }
        } else {
          router.replace('/login')
        }
      } catch (error) {
        router.replace('/login')
      }
    }

    checkAuth()
  }, [])

  return { isCheckingAuth, user }
}
