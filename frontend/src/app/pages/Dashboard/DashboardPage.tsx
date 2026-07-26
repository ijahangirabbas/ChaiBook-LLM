import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Zap, BookOpen, Lock } from 'lucide-react'
import { Header } from '../../../components/Header/Header'
import { HeroBanner } from '../../../components/HeroBanner/HeroBanner'
import { ChatInput } from '../../../components/ChatInput/ChatInput'
import { QuickActionCard } from '../../../components/QuickActionCard/QuickActionCard'
import { NotebookCard } from '../../../components/NotebookCard/NotebookCard'
import { QUICK_ACTIONS, PRODUCT_FEATURES } from '../../../lib/constants'
import { useAppStore } from '../../../store/useAppStore'
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
  const { notebooks, setActiveNotebook, addNotebook, fetchNotebooksFromApi } = useAppStore()

  useEffect(() => {
    fetchNotebooksFromApi()
  }, [fetchNotebooksFromApi])

  const handleChatInput = (_message: string) => {
    const defaultNbId = notebooks[0]?.id || 'nb-1'
    setActiveNotebook(defaultNbId)
    navigate(`/chat/${defaultNbId}`)
  }

  const handleQuickAction = (_prompt: string) => {
    const defaultNbId = notebooks[0]?.id || 'nb-1'
    setActiveNotebook(defaultNbId)
    navigate(`/chat/${defaultNbId}`)
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
                  onClick={() => {
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
                  }}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                  + New Notebook
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
