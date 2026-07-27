import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Home, MessageSquare, BookOpen, Database, MessageCircle, Layout, Settings, ChevronDown, MoreHorizontal } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
// import { UpgradeCard } from '../UpgradeCard/UpgradeCard'
// import { StorageCard } from '../StorageCard/StorageCard'
import { cn } from '../../lib/utils'
import { DASHBOARD_NAV_ITEMS, NOTEBOOK_NAV_ITEMS } from '../../lib/constants'

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Home,
  MessageSquare,
  BookOpen,
  Database,
  MessageCircle,
  Layout,
  Settings,
  Plus,
}

// Dashboard variant sidebar
function DashboardSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setAddSourceModalOpen, setSourcesModalOpen, addNotebook, setActiveNotebook, notebooks, activeNotebookId, user } = useAppStore()

  const handleNavClick = (item: (typeof DASHBOARD_NAV_ITEMS)[0]) => {
    if (item.id === 'sources') {
      setSourcesModalOpen(true)
      return
    }
    if (item.id === 'new-chat') {
      const newId = `nb-${Date.now()}`
      const newNb = {
        id: newId,
        title: 'Untitled Notebook',
        sourceCount: 0,
        updatedAt: new Date(),
        color: 'indigo' as const,
        icon: 'BookOpen',
      }
      addNotebook(newNb)
      setActiveNotebook(newId)
      navigate(`/chat/${newId}`)
      return
    }
    navigate(item.path)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-border dark:border-border-dark shrink-0 cursor-pointer" onClick={() => navigate('/dashboard')}>
        <div className="w-8 h-8 rounded-xl bg-[#5B46F6] flex items-center justify-center shrink-0">
          <span className="text-white text-sm">☕</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[15px] font-bold text-text-primary dark:text-text-primary-dark">ChaiBook</span>
          <span className="text-[15px] font-bold text-[#5B46F6]">LLM</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-3">
        {/* Add Source Button */}
        <div className="px-3 mb-4">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setAddSourceModalOpen(true)}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-btn',
              'bg-[#5B46F6] hover:bg-[#4F39F6] text-white font-semibold text-sm',
              'transition-colors duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
            )}
            aria-label="Add new source"
          >
            <Plus className="w-4 h-4 text-white" />
            Add Source
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-0.5" aria-label="Main navigation">
          {DASHBOARD_NAV_ITEMS.map((item, index) => {
            const Icon = ICON_MAP[item.icon] || Home
            const isActive = location.pathname === item.path

            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                whileHover={{ x: 2 }}
                onClick={() => handleNavClick(item)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-sidebar-item text-sm',
                  'transition-all duration-150 font-medium',
                  isActive
                    ? 'bg-primary/10 dark:bg-primary/15 text-primary font-semibold'
                    : 'text-text-secondary dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-text-primary-dark'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </motion.button>
            )
          })}
        </nav>

        {/* Notebooks List section */}
        {notebooks.length > 0 && (
          <div className="mt-5 px-3">
            <p className="text-xs font-semibold text-text-muted dark:text-text-muted-dark px-2 mb-2 uppercase tracking-wider">
              Your Notebooks
            </p>
            {notebooks.map((nb) => (
              <motion.button
                key={nb.id}
                whileHover={{ x: 2 }}
                onClick={() => {
                  setActiveNotebook(nb.id)
                  navigate(`/chat/${nb.id}`)
                }}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-sidebar-item text-sm',
                  'text-text-secondary dark:text-text-secondary-dark',
                  'hover:bg-primary/5 hover:text-primary dark:hover:bg-primary/10',
                  'transition-colors duration-150 group',
                  (activeNotebookId === nb.id || location.pathname.includes(nb.id)) && 'bg-primary/10 text-primary font-semibold'
                )}
                aria-label={`Open notebook: ${nb.title}`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span className="truncate">{nb.title}</span>
                </div>
                <MoreHorizontal className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="shrink-0 border-t border-border dark:border-border-dark pt-3">
        {/* User profile row */}
        <div className="mx-3 mb-3">
          <motion.button
            whileHover={{ backgroundColor: 'rgba(0,0,0,0.03)' }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-sidebar-item',
              'dark:hover:bg-white/5 transition-colors duration-150'
            )}
            aria-label="User profile"
          >
            <div className="w-8 h-8 rounded-full bg-[#5B46F6] text-white flex items-center justify-center text-sm font-bold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'M'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark truncate">
                {user?.name || 'Munna'}
              </p>
              <p className="text-xs text-text-muted dark:text-text-muted-dark truncate">
                {user?.email || 'munna@example.com'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted dark:text-text-muted-dark shrink-0" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}

// Notebook/Chat variant sidebar
function NotebookSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [chatsExpanded, setChatsExpanded] = useState(true)
  const {
    setAddSourceModalOpen,
    setSourcesModalOpen,
    addNotebook,
    setActiveNotebook,
    notebooks,
    activeNotebookId,
    user,
    chatSessions,
    activeChatSessionId,
    switchChatSession,
    createChatSession,
  } = useAppStore()

  // Sessions for current active notebook
  const currentNotebookId = activeNotebookId
  const activeNotebookSessions = currentNotebookId
    ? chatSessions.filter((s) => s.notebookId === currentNotebookId)
    : []

  const handleNavClick = (item: (typeof NOTEBOOK_NAV_ITEMS)[0]) => {
    if (item.id === 'sources') {
      setSourcesModalOpen(true)
      return
    }
    if (item.id === 'chats') {
      setChatsExpanded(!chatsExpanded)
      return
    }
    if (item.id === 'new-notebook') {
      const newId = `nb-${Date.now()}`
      const newNb = {
        id: newId,
        title: 'Untitled Notebook',
        sourceCount: 0,
        updatedAt: new Date(),
        color: 'indigo' as const,
        icon: 'BookOpen',
      }
      addNotebook(newNb)
      setActiveNotebook(newId)
      navigate(`/chat/${newId}`)
      return
    }
    navigate(item.path)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo: Strictly "ChaiBook LLM" */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-border dark:border-border-dark shrink-0 cursor-pointer" onClick={() => navigate('/dashboard')}>
        <div className="w-8 h-8 rounded-xl bg-[#5B46F6] flex items-center justify-center shrink-0">
          <span className="text-white text-sm">☕</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[15px] font-bold text-text-primary dark:text-text-primary-dark">ChaiBook</span>
          <span className="text-[15px] font-bold text-[#5B46F6]">LLM</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-3">
        {/* Add Source Button */}
        <div className="px-3 mb-4">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setAddSourceModalOpen(true)}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-btn',
              'bg-[#5B46F6] hover:bg-[#4F39F6] text-white font-semibold text-sm',
              'transition-colors duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
            )}
          >
            <Plus className="w-4 h-4 text-white" />
            Add source
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-0.5" aria-label="Notebook navigation">
          {NOTEBOOK_NAV_ITEMS.map((item, index) => {
            const Icon = ICON_MAP[item.icon] || Home
            const isActive = location.pathname.includes(item.path.replace('/chat/new', '/chat').replace('/notebook/new', '/notebook'))

            return (
              <div key={item.id}>
                <motion.button
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  whileHover={{ x: 2 }}
                  onClick={() => handleNavClick(item)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-sidebar-item text-sm',
                    'transition-all duration-150 font-medium',
                    isActive
                      ? 'bg-primary/10 dark:bg-primary/15 text-primary font-semibold'
                      : 'text-text-secondary dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-text-primary-dark'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </div>
                  {item.id === 'chats' && (
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 transition-transform duration-200',
                        chatsExpanded && 'rotate-180'
                      )}
                    />
                  )}
                </motion.button>

                {/* Inline Accordion for Chats */}
                {item.id === 'chats' && chatsExpanded && (
                  <div className="ml-5 my-1 border-l-2 border-primary/20 pl-2 space-y-1">
                    {activeNotebookSessions.map((session, i) => (
                      <button
                        key={session.id}
                        onClick={() => switchChatSession(session.id)}
                        className={cn(
                          'w-full text-left px-2.5 py-1.5 rounded-md text-xs truncate transition-colors flex items-center gap-2',
                          activeChatSessionId === session.id
                            ? 'bg-primary/15 text-primary font-bold'
                            : 'text-text-secondary dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-white/5'
                        )}
                      >
                        <MessageSquare className="w-3 h-3 shrink-0 opacity-70" />
                        <span className="truncate">Chat {i + 1}: {session.title.replace(/^Chat \d+:\s*/, '')}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => currentNotebookId && createChatSession(currentNotebookId)}
                      disabled={!currentNotebookId}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-primary font-semibold hover:bg-primary/5 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3 h-3 shrink-0" />
                      + New Chat Thread
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Active Notebooks List */}
        {notebooks.length > 0 && (
          <div className="mt-4 px-3">
            <p className="text-xs font-semibold text-text-muted dark:text-text-muted-dark px-2 mb-2 uppercase tracking-wider">
              Recent Notebooks
            </p>
            {notebooks.map((nb) => (
              <motion.button
                key={nb.id}
                whileHover={{ x: 2 }}
                onClick={() => {
                  setActiveNotebook(nb.id)
                  navigate(`/chat/${nb.id}`)
                }}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-sidebar-item text-sm',
                  'text-text-secondary dark:text-text-secondary-dark',
                  'hover:bg-primary/5 hover:text-primary dark:hover:bg-primary/10',
                  'transition-colors duration-150 group',
                  (activeNotebookId === nb.id || location.pathname.includes(nb.id)) && 'bg-primary/10 text-primary font-semibold'
                )}
                aria-label={`Open notebook: ${nb.title}`}
              >
                <span className="truncate">{nb.title}</span>
                <MoreHorizontal className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* User profile row */}
      <div className="shrink-0 border-t border-border dark:border-border-dark p-3">
        <motion.button
          whileHover={{ backgroundColor: 'rgba(0,0,0,0.03)' }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-sidebar-item',
            'dark:hover:bg-white/5 transition-colors duration-150'
          )}
          aria-label="User profile"
        >
          <div className="w-8 h-8 rounded-full bg-[#5B46F6] text-white flex items-center justify-center text-sm font-bold shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || 'M'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark truncate">
              {user?.name || 'Munna'}
            </p>
            <p className="text-xs text-text-muted dark:text-text-muted-dark truncate">
              {user?.email || 'munna@example.com'}
            </p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-text-muted dark:text-text-muted-dark shrink-0" />
        </motion.button>
      </div>
    </div>
  )
}

interface SidebarProps {
  mode?: 'dashboard' | 'notebook'
  isOpen?: boolean
}

export function Sidebar({ mode = 'dashboard', isOpen = true }: SidebarProps) {
  return (
    <aside
      className={cn(
        'hidden md:flex flex-col w-[300px] shrink-0',
        'bg-sidebar dark:bg-sidebar-dark',
        'border-r border-border dark:border-border-dark',
        'h-screen sticky top-0 overflow-hidden',
        'sidebar-transition',
        !isOpen && '-translate-x-full'
      )}
      aria-label="Sidebar navigation"
    >
      {mode === 'dashboard' ? <DashboardSidebar /> : <NotebookSidebar />}
    </aside>
  )
}
