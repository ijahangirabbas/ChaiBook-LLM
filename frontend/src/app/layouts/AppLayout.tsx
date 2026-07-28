import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../../components/Sidebar/Sidebar'
import { AddSourceModal } from '../../components/AddSourceModal/AddSourceModal'
import { SourcesModal } from '../../components/SourcesModal/SourcesModal'
import { SourceInspector } from '../../components/SourceInspector/SourceInspector'
import { useAppStore } from '../../store/useAppStore'
import { useKeyboard } from '../../hooks/useKeyboard'
import { cn } from '../../lib/utils'

interface AppLayoutProps {
  sidebarMode?: 'dashboard' | 'notebook'
}

export function AppLayout({ sidebarMode: explicitSidebarMode }: AppLayoutProps) {
  const { sidebarOpen, sources, pollPendingSources } = useAppStore()
  const location = useLocation()

  useEffect(() => {
    const hasPending = sources.some(
      (s) => s.status === 'indexing' || s.status === 'uploading' || (s.indexingProgress ?? 0) < 100
    )
    if (!hasPending) return

    const interval = setInterval(() => {
      void pollPendingSources()
    }, 3000)

    return () => clearInterval(interval)
  }, [sources, pollPendingSources])

  // Auto-detect notebook sidebar mode for chat and notebook routes
  const isNotebookRoute = location.pathname.startsWith('/chat') || location.pathname.startsWith('/notebook')
  const activeSidebarMode = explicitSidebarMode || (isNotebookRoute ? 'notebook' : 'dashboard')

  // Register global keyboard shortcuts
  useKeyboard()

  return (
    <div className="flex h-screen overflow-hidden bg-bg dark:bg-bg-dark">
      {/* Fixed sidebar: switches to notebook mode ('Chai / ChaiBook LLM') automatically on chat/notebook routes */}
      <Sidebar mode={activeSidebarMode} isOpen={sidebarOpen} />

      {/* Main content */}
      <main
        className={cn(
          'flex-1 flex flex-col min-w-0',
          'bg-bg dark:bg-bg-dark',
          'transition-all duration-300'
        )}
      >
        <Outlet />
      </main>

      {/* Global modals */}
      <AddSourceModal />
      <SourcesModal />
      <SourceInspector />
    </div>
  )
}
