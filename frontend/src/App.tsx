import { useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Router } from './app/router'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const { isAuthenticated, login, fetchNotebooksFromApi } = useAppStore()
  const { user, isLoaded, isSignedIn } = useUser()

  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && user) {
      const email =
        user.primaryEmailAddress?.emailAddress ||
        user.emailAddresses?.[0]?.emailAddress ||
        (user.externalAccounts?.[0] as any)?.emailAddress ||
        ''

      const name =
        user.fullName ||
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        (email ? email.split('@')[0] : 'User')

      login({
        id: user.id,
        name,
        email,
        avatar: user.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email || user.id}`,
        plan: 'pro',
        storage: { used: 1.2, total: 10 },
      })
      fetchNotebooksFromApi()
    } else if (!isAuthenticated) {
      // Unauthenticated fallback context
      login({
        id: 'dev-user',
        name: 'ChaiBook User',
        email: 'user@chaibook.ai',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chaibook',
        plan: 'pro',
        storage: { used: 1.2, total: 10 },
      })
      fetchNotebooksFromApi()
    }
  }, [isLoaded, isSignedIn, user, login, fetchNotebooksFromApi, isAuthenticated])

  return <Router />
}
