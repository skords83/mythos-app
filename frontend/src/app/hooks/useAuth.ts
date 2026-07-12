import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth')
        const data = await res.json()

        if (data.user) {
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

  return { isCheckingAuth }
}
