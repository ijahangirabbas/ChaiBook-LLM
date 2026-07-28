import { useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Router } from './app/router'
import { useAppStore } from './store/useAppStore'
import { ApiService } from './services/api.service'

export default function App() {
  const { login, logout, fetchNotebooksFromApi } = useAppStore()
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
        plan: 'free',
        storage: { used: 0, total: 5 },
      })
      ApiService.getSettings()
        .then((settings) => {
          useAppStore.setState({ theme: settings.theme })
          if (settings.theme === 'dark') document.documentElement.classList.add('dark')
          else document.documentElement.classList.remove('dark')
        })
        .catch(() => {})
      fetchNotebooksFromApi()
    } else {
      // User is not signed into Clerk: clear any stale local state
      logout()
    }
  }, [isLoaded, isSignedIn, user, login, logout, fetchNotebooksFromApi])

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background dark:bg-background-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl animate-bounce">☕</div>
          <p className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
            Initializing ChaiBook LLM...
          </p>
        </div>
      </div>
    )
  }

  return <Router />
}

