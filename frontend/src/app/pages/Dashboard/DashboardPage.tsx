import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Zap, BookOpen, Lock, Plus } from 'lucide-react'
import { Header } from '../../../components/Header/Header'
import { HeroBanner } from '../../../components/HeroBanner/HeroBanner'
import { ChatInput } from '../../../components/ChatInput/ChatInput'
import { QuickActionCard } from '../../../components/QuickActionCard/QuickActionCard'
import { NotebookCard } from '../../../components/NotebookCard/NotebookCard'
import { QUICK_ACTIONS, PRODUCT_FEATURES } from '../../../lib/constants'
import { useAppStore } from '../../../store/useAppStore'
import { ApiService } from '../../../services/api.service'
import type { Notebook } from '../../../types'
import { cn } from '../../../lib/utils'

const FEATURE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Shield,
  Zap,
  BookOpen,
  Lock,
}

const FEATURE_COLORS = [
  { bg: 'bg-indigo-50 dark:bg-indigo-950/40', icon: 'text-indigo-500' },
  { bg: 'bg-yellow-50 dark:bg-yellow-950/40', icon: 'text-yellow-500' },
  { bg: 'bg-green-50 dark:bg-green-950/40',   icon: 'text-green-500' },
  { bg: 'bg-purple-50 dark:bg-purple-950/40', icon: 'text-purple-500' },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const { notebooks, loadingNotebooks, notebooksError, setActiveNotebook, addNotebook, fetchNotebooksFromApi } = useAppStore()
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    fetchNotebooksFromApi()
  }, [fetchNotebooksFromApi])

  const ensureNotebook = async (): Promise<string | null> => {
    if (notebooks.length > 0 && notebooks[0].id) {
      return notebooks[0].id
    }
    try {
      setCreateError(null)
      const created = await ApiService.createNotebook({
        title: 'New AI Research Notebook',
        color: 'indigo',
        icon: 'BookOpen',
      })
      addNotebook(created)
      return created.id
    } catch {
      const newId = `nb-${Date.now()}`
      const newNb = {
        id: newId,
        title: 'New AI Research Notebook',
        sourceCount: 0,
        updatedAt: new Date(),
        color: 'indigo' as const,
        icon: 'BookOpen',
      }
      addNotebook(newNb)
      return newId
    }
  }

  const handleChatInput = async (_message: string) => {
    const targetId = await ensureNotebook()
    if (targetId) {
      setActiveNotebook(targetId)
      navigate(`/chat/${targetId}`)
    }
  }

  const handleQuickAction = async (_prompt: string) => {
    const targetId = await ensureNotebook()
    if (targetId) {
      setActiveNotebook(targetId)
      navigate(`/chat/${targetId}`)
    }
  }

  const handleCreateNotebookClick = async () => {
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
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg dark:bg-bg-dark">
      <Header title="Home" />

      {/* Scrollable content container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto px-8 xl:px-12 py-8 space-y-8">

          {/* Hero Banner */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <HeroBanner />
          </motion.div>

          {/* Create or Fetch Error Banner */}
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

          {/* Single Chat Input */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <ChatInput
              onSend={handleChatInput}
              placeholder="Ask anything about your sources..."
              disclaimer=""
            />
          </motion.div>

          {/* Quick Action Cards */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            aria-labelledby="quick-actions-heading"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {QUICK_ACTIONS.map((action, index) => (
                <QuickActionCard
                  key={action.id}
                  action={action}
                  onClick={handleQuickAction}
                  index={index}
                />
              ))}
            </div>
          </motion.section>

          {/* Your Notebooks Box Grid */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            aria-labelledby="notebooks-heading"
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                id="notebooks-heading"
                className="text-lg font-bold text-text-primary dark:text-text-primary-dark tracking-tight"
              >
                Your Notebooks ({notebooks.length})
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCreateNotebookClick}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> New Notebook
                </button>
                <motion.button
                  whileHover={{ x: 2 }}
                  onClick={() => navigate('/notebooks')}
                  className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  View all notebooks <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {loadingNotebooks ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-36 rounded-card bg-card/60 dark:bg-card-dark/60 animate-pulse border border-border/50" />
                ))}
              </div>
            ) : notebooks.length === 0 ? (
              <div className="p-8 rounded-card border border-dashed border-border dark:border-border-dark text-center bg-card/50 dark:bg-card-dark/50">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 text-primary text-xl">
                  📚
                </div>
                <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                  No Notebooks Created Yet
                </h3>
                <p className="text-xs text-text-muted dark:text-text-muted-dark mb-4 max-w-sm mx-auto">
                  Create your first notebook to organize sources and start asking grounded AI questions.
                </p>
                <button
                  onClick={handleCreateNotebookClick}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Create Notebook
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {notebooks.map((notebook: Notebook, index: number) => (
                  <motion.div
                    key={notebook.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + index * 0.06 }}
                  >
                    <NotebookCard
                      notebook={notebook}
                      onClick={() => {
                        setActiveNotebook(notebook.id)
                        navigate(`/chat/${notebook.id}`)
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Why users love ChaiBook LLM */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            aria-labelledby="features-heading"
          >
            <h2
              id="features-heading"
              className="text-lg font-bold text-text-primary dark:text-text-primary-dark tracking-tight mb-4"
            >
              Why users love ChaiBook LLM
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PRODUCT_FEATURES.map((feat, index) => {
                const Icon = FEATURE_ICONS[feat.icon] || Shield
                const colors = FEATURE_COLORS[index % FEATURE_COLORS.length]

                return (
                  <motion.div
                    key={feat.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + index * 0.07 }}
                    whileHover={{ y: -2 }}
                    className={cn(
                      'p-5 rounded-card bg-card dark:bg-card-dark',
                      'border border-border dark:border-[#1C1C1C]',
                      'transition-colors duration-200 hover:border-primary/40'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                      colors.bg
                    )}>
                      <Icon className={cn('w-5 h-5', colors.icon)} />
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-text-muted dark:text-text-muted-dark leading-relaxed">
                      {feat.description}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </motion.section>

          {/* Bottom spacer */}
          <div className="h-8" />
        </div>
      </div>
    </div>
  )
}
