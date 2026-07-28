import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Database, Plus, BookOpen } from 'lucide-react'
import { Header } from '../../../components/Header/Header'
import { SourceCard } from '../../../components/SourceCard/SourceCard'
import { useAppStore } from '../../../store/useAppStore'
import { ApiService } from '../../../services/api.service'
import type { Source, SourceIndexingStatus } from '../../../types'
import { cn } from '../../../lib/utils'

export function SourcesPage() {
  const navigate = useNavigate()
  const { setAddSourceModalOpen, setActiveNotebook, openSourceInspector } = useAppStore()
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'ready' | 'indexing' | 'error'>('all')

  const loadSources = () => {
    setLoading(true)
    setError(null)
    ApiService.getWorkspaceSources()
      .then((rows) => {
        setSources(
          rows.map((s, idx) => ({
            id: s.id,
            notebookId: s.notebookId,
            type: ApiService.detectSourceType(s.title, undefined, s.type),
            title: s.title,
            domain: s.notebookTitle || 'Notebook',
            number: idx + 1,
            status: (s.status || 'ready') as SourceIndexingStatus,
            indexingProgress: s.indexingProgress ?? (s.status === 'ready' ? 100 : 25),
            errorMessage: s.errorMessage,
          }))
        )
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load sources'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSources()
  }, [])

  const filtered = sources.filter((s) => {
    if (filter === 'all') return true
    if (filter === 'ready') return s.status === 'ready' || (s.indexingProgress ?? 0) >= 100
    if (filter === 'indexing') return s.status === 'indexing' || s.status === 'uploading'
    return s.status === 'error'
  })

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg dark:bg-bg-dark">
      <Header title="All Sources" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary dark:text-text-primary-dark flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Workspace Sources
              </h2>
              <p className="text-xs text-text-muted mt-1">
                {sources.length} source{sources.length !== 1 ? 's' : ''} across all notebooks
              </p>
            </div>
            <button
              onClick={() => setAddSourceModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Add Source
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'ready', 'indexing', 'error'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors',
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-white/5 text-text-secondary hover:bg-primary/10'
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex justify-between items-center">
              <span>{error}</span>
              <button onClick={loadSources} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold">
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 rounded-xl bg-card/60 animate-pulse border border-border/50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 rounded-card border border-dashed border-border text-center">
              <Database className="w-10 h-10 text-primary mx-auto mb-3 opacity-60" />
              <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                No sources found
              </p>
              <p className="text-xs text-text-muted">
                {filter === 'all' ? 'Add a source to get started.' : `No sources with status "${filter}".`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((source, index) => (
                <motion.div
                  key={source.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="space-y-2"
                >
                  <SourceCard
                    source={source}
                    onClick={() => {
                      if (source.notebookId) setActiveNotebook(source.notebookId)
                      openSourceInspector(source.id, source, 'overview')
                    }}
                  />
                  {source.notebookId && (
                    <button
                      onClick={() => {
                        setActiveNotebook(source.notebookId!)
                        navigate(`/chat/${source.notebookId}`)
                      }}
                      className="text-[10px] text-primary font-semibold flex items-center gap-1 hover:underline px-1"
                    >
                      <BookOpen className="w-3 h-3" />
                      Open notebook
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
