import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, FileText, BookOpen, MessageCircle } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'
import { MOCK_NOTEBOOKS } from '../../lib/constants'

export function SearchBar() {
  const { searchOpen, setSearchOpen, searchQuery, setSearchQuery } = useAppStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [searchOpen])

  const results = searchQuery
    ? MOCK_NOTEBOOKS.filter((n) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  return (
    <div className="relative">
      {/* Trigger button */}
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

      {/* Search Popover: Positioned directly below the search bar and right-aligned */}
      <AnimatePresence>
        {searchOpen && (
          <>
            {/* Transparent click-away backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-[2px]"
              onClick={() => setSearchOpen(false)}
              aria-hidden="true"
            />

            {/* Popover Card */}
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
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border dark:border-[#1C1C1C]">
                <Search className="w-4 h-4 text-text-muted dark:text-text-muted-dark shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search notebooks, sources, chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    'flex-1 bg-transparent text-text-primary dark:text-text-primary-dark',
                    'placeholder:text-text-muted dark:placeholder:text-text-muted-dark',
                    'text-sm focus:outline-none'
                  )}
                  aria-label="Search input"
                />
                <button
                  onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                  className="p-1 rounded-md text-text-muted hover:text-text-primary dark:hover:text-text-primary-dark"
                  aria-label="Close search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto">
                {searchQuery && results.length === 0 && (
                  <p className="px-4 py-8 text-center text-sm text-text-muted dark:text-text-muted-dark">
                    No results for "{searchQuery}"
                  </p>
                )}

                {results.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1.5 text-xs font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider">
                      Notebooks
                    </p>
                    {results.map((notebook) => (
                      <button
                        key={notebook.id}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-sidebar-item',
                          'hover:bg-primary/5 dark:hover:bg-primary/10',
                          'text-left transition-colors duration-150'
                        )}
                        onClick={() => setSearchOpen(false)}
                      >
                        <BookOpen className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                            {notebook.title}
                          </p>
                          <p className="text-xs text-text-muted dark:text-text-muted-dark">
                            {notebook.sourceCount} sources
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!searchQuery && (
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider mb-2 px-2">
                      Quick access
                    </p>
                    {[
                      { icon: BookOpen, label: 'My Notebooks', hint: 'View all notebooks' },
                      { icon: FileText, label: 'Sources', hint: 'All uploaded sources' },
                      { icon: MessageCircle, label: 'Recent Chats', hint: 'Continue a conversation' },
                    ].map((item) => (
                      <button
                        key={item.label}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-sidebar-item',
                          'hover:bg-primary/5 dark:hover:bg-primary/10',
                          'text-left transition-colors duration-150'
                        )}
                        onClick={() => setSearchOpen(false)}
                      >
                        <item.icon className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                            {item.label}
                          </p>
                          <p className="text-xs text-text-muted dark:text-text-muted-dark">{item.hint}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
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
