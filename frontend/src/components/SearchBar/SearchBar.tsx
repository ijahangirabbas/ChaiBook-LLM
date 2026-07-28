import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, FileText, BookOpen, MessageCircle } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { ApiService } from '../../services/api.service'
import { cn } from '../../lib/utils'

type SearchResultItem =
  | { kind: 'notebook'; id: string; title: string; subtitle?: string }
  | { kind: 'source'; id: string; title: string; subtitle?: string; notebookId: string }
  | { kind: 'conversation'; id: string; title: string; subtitle?: string; notebookId: string }
  | { kind: 'action'; id: string; title: string; subtitle?: string; path: string }

export function SearchBar() {
  const navigate = useNavigate()
  const { searchOpen, setSearchOpen, searchQuery, setSearchQuery, setActiveNotebook, setSourcesModalOpen } =
    useAppStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [apiResults, setApiResults] = useState<{
    notebooks: Array<{ id: string; title: string; sourceCount?: number }>
    sources: Array<{ id: string; title: string; notebookId: string; notebookTitle: string }>
    conversations: Array<{ id: string; title: string; notebookId: string; notebookTitle: string }>
  }>({ notebooks: [], sources: [], conversations: [] })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [searchOpen])

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setApiResults({ notebooks: [], sources: [], conversations: [] })
      setSearching(false)
      return
    }

    setSearching(true)
    const timer = setTimeout(() => {
      ApiService.search(searchQuery.trim())
        .then((data) => setApiResults(data))
        .catch(() => setApiResults({ notebooks: [], sources: [], conversations: [] }))
        .finally(() => setSearching(false))
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const quickActions: SearchResultItem[] = useMemo(
    () => [
      { kind: 'action', id: 'notebooks', title: 'My Notebooks', subtitle: 'View all notebooks', path: '/notebooks' },
      { kind: 'action', id: 'sources', title: 'Sources', subtitle: 'All uploaded sources', path: '/sources' },
      { kind: 'action', id: 'chats', title: 'Recent Chats', subtitle: 'Continue a conversation', path: '/chats' },
    ],
    []
  )

  const flatResults: SearchResultItem[] = useMemo(() => {
    if (!searchQuery.trim()) return quickActions

    const items: SearchResultItem[] = []
    apiResults.notebooks.forEach((nb) =>
      items.push({ kind: 'notebook', id: nb.id, title: nb.title, subtitle: `${nb.sourceCount ?? 0} sources` })
    )
    apiResults.sources.forEach((s) =>
      items.push({
        kind: 'source',
        id: s.id,
        title: s.title,
        subtitle: s.notebookTitle,
        notebookId: s.notebookId,
      })
    )
    apiResults.conversations.forEach((c) =>
      items.push({
        kind: 'conversation',
        id: c.id,
        title: c.title,
        subtitle: c.notebookTitle,
        notebookId: c.notebookId,
      })
    )
    return items
  }, [searchQuery, apiResults, quickActions])

  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery, flatResults.length])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
  }, [setSearchOpen, setSearchQuery])

  const activateResult = useCallback(
    (item: SearchResultItem) => {
      closeSearch()
      if (item.kind === 'action') {
        navigate(item.path)
        return
      }
      if (item.kind === 'notebook') {
        setActiveNotebook(item.id)
        navigate(`/chat/${item.id}`)
        return
      }
      if (item.kind === 'source') {
        setActiveNotebook(item.notebookId)
        navigate(`/chat/${item.notebookId}`)
        setSourcesModalOpen(true)
        return
      }
      if (item.kind === 'conversation') {
        setActiveNotebook(item.notebookId)
        navigate(`/chat/${item.notebookId}`, { state: { conversationId: item.id } })
      }
    },
    [closeSearch, navigate, setActiveNotebook, setSourcesModalOpen]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
      e.preventDefault()
      activateResult(flatResults[selectedIndex])
    } else if (e.key === 'Escape') {
      closeSearch()
    }
  }

  const renderIcon = (item: SearchResultItem) => {
    if (item.kind === 'notebook' || item.kind === 'action') return <BookOpen className="w-4 h-4 text-primary shrink-0" />
    if (item.kind === 'source') return <FileText className="w-4 h-4 text-primary shrink-0" />
    return <MessageCircle className="w-4 h-4 text-primary shrink-0" />
  }

  return (
    <div className="relative">
      <button
        onClick={() => setSearchOpen(!searchOpen)}
        aria-label="Search (Ctrl+K)"
        aria-expanded={searchOpen}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-input text-sm transition-all duration-200',
          'border border-border bg-white/70 text-text-secondary',
          'hover:bg-white hover:border-primary/30 hover:shadow-sm',
          'dark:bg-white/5 dark:border-border-dark dark:text-text-secondary-dark dark:hover:bg-white/10',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        )}
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline min-w-[140px] text-left">Search notebooks, sources...</span>
        <span className="hidden md:inline text-xs text-text-muted dark:text-text-muted-dark border border-border dark:border-border-dark px-1.5 py-0.5 rounded-md font-mono">
          Ctrl K
        </span>
      </button>

      <AnimatePresence>
        {searchOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-[2px]"
              onClick={closeSearch}
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={cn(
                'absolute right-0 top-full mt-2 z-50 w-[360px] sm:w-[420px]',
                'bg-card dark:bg-[#0A0A0A] rounded-modal shadow-2xl dark:shadow-none',
                'border border-border dark:border-[#1C1C1C] overflow-hidden'
              )}
              role="dialog"
              aria-label="Search popup"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border dark:border-[#1C1C1C]">
                <Search className="w-4 h-4 text-text-muted dark:text-text-muted-dark shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search notebooks, sources, chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    'flex-1 bg-transparent text-text-primary dark:text-text-primary-dark',
                    'placeholder:text-text-muted dark:placeholder:text-text-muted-dark',
                    'text-sm focus:outline-none'
                  )}
                  aria-label="Search input"
                />
                <button
                  onClick={closeSearch}
                  className="p-1 rounded-md text-text-muted hover:text-text-primary dark:hover:text-text-primary-dark"
                  aria-label="Close search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {searchQuery.trim().length >= 2 && searching && (
                  <p className="px-4 py-6 text-center text-sm text-text-muted">Searching…</p>
                )}

                {searchQuery.trim().length >= 2 && !searching && flatResults.length === 0 && (
                  <p className="px-4 py-8 text-center text-sm text-text-muted dark:text-text-muted-dark">
                    No results for "{searchQuery}"
                  </p>
                )}

                {flatResults.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1.5 text-xs font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider">
                      {searchQuery.trim() ? 'Results' : 'Quick access'}
                    </p>
                    {flatResults.map((item, idx) => (
                      <button
                        key={`${item.kind}-${item.id}`}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-sidebar-item text-left transition-colors duration-150',
                          idx === selectedIndex
                            ? 'bg-primary/10 dark:bg-primary/20'
                            : 'hover:bg-primary/5 dark:hover:bg-primary/10'
                        )}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => activateResult(item)}
                      >
                        {renderIcon(item)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark truncate">
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-xs text-text-muted dark:text-text-muted-dark truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-4 py-2 border-t border-border dark:border-[#1C1C1C] flex items-center gap-4 text-xs text-text-muted dark:text-text-muted-dark">
                <span><kbd className="font-mono">↵</kbd> to select</span>
                <span><kbd className="font-mono">↑↓</kbd> to navigate</span>
                <span><kbd className="font-mono">Esc</kbd> to close</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
