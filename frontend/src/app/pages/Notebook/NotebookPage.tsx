import { motion } from 'framer-motion'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../../../components/Header/Header'
import { ChatInput } from '../../../components/ChatInput/ChatInput'
import { useAppStore } from '../../../store/useAppStore'
import { cn } from '../../../lib/utils'

export function NotebookPage() {
  const { setAddSourceModalOpen } = useAppStore()
  const navigate = useNavigate()

  // Custom left content for notebook header
  const headerLeft = (
    <div className="flex items-center gap-3">
      <motion.button
        whileHover={{ x: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/dashboard')}
        className={cn(
          'w-8 h-8 flex items-center justify-center rounded-full',
          'text-text-secondary dark:text-text-secondary-dark',
          'hover:bg-gray-100 dark:hover:bg-white/10 transition-colors'
        )}
        aria-label="Go back"
      >
        <ArrowLeft className="w-4 h-4" />
      </motion.button>
      <h1 className="text-[15px] font-semibold text-text-primary dark:text-text-primary-dark">
        Untitled Notebook
      </h1>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={cn(
          'w-7 h-7 flex items-center justify-center rounded-lg',
          'text-text-muted dark:text-text-muted-dark',
          'hover:bg-gray-100 dark:hover:bg-white/10 transition-colors'
        )}
        aria-label="Rename notebook"
      >
        <Pencil className="w-3.5 h-3.5" />
      </motion.button>
    </div>
  )

  return (
    <div className="flex flex-col h-full min-h-0">
      <Header title="Untitled Notebook" leftContent={headerLeft} />

      {/* Main area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center max-w-xs"
          >
            {/* Notebook icon illustration */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className={cn(
                'w-20 h-20 rounded-2xl mb-5 flex items-center justify-center',
                'bg-gray-100 dark:bg-white/5 border-2 border-dashed border-border dark:border-border-dark'
              )}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-9 h-9 text-text-muted dark:text-text-muted-dark"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </motion.div>

            <h2 className="text-base font-semibold text-text-primary dark:text-text-primary-dark mb-2">
              Your notebook is empty
            </h2>
            <p className="text-sm text-text-muted dark:text-text-muted-dark mb-6">
              Add sources to get started
            </p>

            {/* Curved arrow + instruction */}
            <div className="flex items-center gap-2 text-sm text-text-muted dark:text-text-muted-dark mt-2">
              <svg
                className="w-12 h-12 text-text-muted dark:text-text-muted-dark -scale-x-100"
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 36 C8 20, 24 8, 40 12"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M36 8 L40 12 L36 16"
                />
              </svg>
              <p className="text-sm text-text-muted dark:text-text-muted-dark">
                Click{' '}
                <button
                  onClick={() => setAddSourceModalOpen(true)}
                  className="text-primary font-semibold hover:underline"
                >
                  "Add source"
                </button>
                {' '}to add your first source
              </p>
            </div>
          </motion.div>
        </div>

        {/* Bottom chat input */}
        <div className={cn(
          'border-t border-border dark:border-border-dark',
          'bg-bg dark:bg-bg-dark px-6 py-4'
        )}>
          <ChatInput
            placeholder="Ask anything about your sources..."
            disabled={true}
            disclaimer="ChaiBook LLM can make mistakes. Please verify important information."
          />
        </div>
      </div>
    </div>
  )
}
