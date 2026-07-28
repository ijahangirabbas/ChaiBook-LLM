import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, BookOpen, Database, Sparkles, Folder } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../../../components/Header/Header'
import { NotebookCard } from '../../../components/NotebookCard/NotebookCard'
import { useAppStore } from '../../../store/useAppStore'
import { ApiService } from '../../../services/api.service'
import { cn } from '../../../lib/utils'

export function NotebooksPage() {
  const navigate = useNavigate()
  const { notebooks, loadingNotebooks, notebooksError, setActiveNotebook, addNotebook, fetchNotebooksFromApi } = useAppStore()
  const [searchFilter, setSearchFilter] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>('all')
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    fetchNotebooksFromApi()
  }, [fetchNotebooksFromApi])

  const filteredNotebooks = notebooks.filter((nb) => {
    const matchesSearch = nb.title.toLowerCase().includes(searchFilter.toLowerCase())
    const matchesColor = selectedColor === 'all' || nb.color === selectedColor
    return matchesSearch && matchesColor
  })

  const totalSourcesCount = notebooks.reduce((acc, nb) => acc + nb.sourceCount, 0)

  const handleCreateNotebook = async () => {
    try {
      setCreateError(null)
      const created = await ApiService.createNotebook({
        title: 'Untitled Notebook',
        color: 'indigo',
        icon: 'BookOpen',
      })
      addNotebook(created)
      setActiveNotebook(created.id)
      navigate(`/chat/${created.id}`)
    } catch {
      setCreateError('Unable to create a notebook. Check that the server is running and you are signed in.')
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg dark:bg-bg-dark">
      <Header title="Your Notebooks" />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto px-6 xl:px-10 py-8 space-y-8">
          
          {/* Top Banner & Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'p-8 rounded-[24px] bg-gradient-to-r from-[#5B46F6]/10 via-primary/5 to-transparent',
              'border border-border dark:border-[#1C1C1C] flex flex-col md:flex-row md:items-center justify-between gap-6'
            )}
          >
            <div>
              <div className="flex items-center gap-2 mb-2 text-primary font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> AI Knowledge Workspaces
              </div>
              <h1 className="text-2xl xl:text-3xl font-extrabold text-text-primary dark:text-text-primary-dark tracking-tight">
                All Notebooks ({notebooks.length})
              </h1>
              <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1 max-w-xl">
                Organize your documents, videos, notes, and AI conversations across dedicated topic notebooks.
              </p>
            </div>

            {/* Quick Stats & Action */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex gap-4 px-4 py-3 rounded-2xl bg-card dark:bg-[#0A0A0A] border border-border dark:border-[#1C1C1C] text-xs">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <div>
                    <span className="block font-bold text-text-primary dark:text-text-primary-dark">{notebooks.length}</span>
                    <span className="text-text-muted">Notebooks</span>
                  </div>
                </div>
                <div className="w-px bg-border dark:bg-border-dark" />
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="block font-bold text-text-primary dark:text-text-primary-dark">{totalSourcesCount}</span>
                    <span className="text-text-muted">Sources</span>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateNotebook}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                + New Notebook
              </motion.button>
            </div>
          </motion.div>

          {/* Error Banner */}
          {(notebooksError || createError) && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-between text-xs font-medium">
              <span>{notebooksError || createError}</span>
              <button
                onClick={() => fetchNotebooksFromApi()}
                className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Search Bar & Color Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search notebooks by title..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm',
                  'bg-card dark:bg-card-dark border border-border dark:border-border-dark',
                  'text-text-primary dark:text-text-primary-dark placeholder:text-text-muted',
                  'focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all'
                )}
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {['all', 'indigo', 'green', 'blue', 'orange', 'purple'].map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all',
                    selectedColor === color
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-card dark:bg-white/5 text-text-secondary dark:text-text-secondary-dark border border-border dark:border-border-dark hover:border-primary/40'
                  )}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          {/* Notebook Grid */}
          {loadingNotebooks ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 rounded-card bg-card/60 dark:bg-card-dark/60 animate-pulse border border-border/50" />
              ))}
            </div>
          ) : filteredNotebooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border dark:border-border-dark rounded-3xl">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Folder className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-text-primary dark:text-text-primary-dark mb-1">
                No notebooks found
              </h3>
              <p className="text-xs text-text-muted dark:text-text-muted-dark max-w-sm mb-4">
                No notebooks match your current search filter. Create a new notebook to get started!
              </p>
              <button
                onClick={handleCreateNotebook}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                Create Notebook
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredNotebooks.map((nb, index) => (
                <motion.div
                  key={nb.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <NotebookCard
                    notebook={nb}
                    onClick={() => {
                      setActiveNotebook(nb.id)
                      navigate(`/chat/${nb.id}`)
                    }}
                  />
                </motion.div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
