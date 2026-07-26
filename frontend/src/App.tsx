import { useEffect } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { Router } from './app/router'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const { isAuthenticated, login, logout, fetchNotebooksFromApi } = useAppStore()

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // In local dev without Supabase configured, ensure user remains authenticated
      if (!isAuthenticated) {
        login({
          id: 'dev-user',
          name: 'ChaiBook User',
          email: 'user@chaibook.ai',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chaibook',
          plan: 'pro',
          storage: { used: 1.2, total: 10 },
        })
      }
      fetchNotebooksFromApi()
      return
    }

    // Sync active session on mount
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const session = data.session
      if (session?.user) {
        const u = session.user
        login({
          id: u.id,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'User',
          email: u.email || '',
          avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
          plan: 'pro',
          storage: { used: 1.2, total: 10 },
        })
        fetchNotebooksFromApi()
      }
    })

    // Listen for auth state changes (OAuth redirect, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        const u = session.user
        login({
          id: u.id,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'User',
          email: u.email || '',
          avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
          plan: 'pro',
          storage: { used: 1.2, total: 10 },
        })
        fetchNotebooksFromApi()
      } else if (_event === 'SIGNED_OUT') {
        logout()
      }
    })

    return () => subscription.unsubscribe()
  }, [isAuthenticated, login, logout, fetchNotebooksFromApi])

  return <Router />
}
