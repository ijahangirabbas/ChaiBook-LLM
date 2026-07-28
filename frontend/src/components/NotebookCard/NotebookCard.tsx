import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreHorizontal, BookOpen, Database, FileText, Layout, Trash2 } from 'lucide-react'
import type { Notebook } from '../../types'
import { formatRelativeTime } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'

const COLOR_MAP: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  indigo: { icon: '📘', bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-900/30' },
  green:  { icon: '📗', bg: 'bg-green-50 dark:bg-green-950/40',   text: 'text-green-600 dark:text-green-400',   border: 'border-green-100 dark:border-green-900/30' },
  blue:   { icon: '📙', bg: 'bg-blue-50 dark:bg-blue-950/40',     text: 'text-blue-600 dark:text-blue-400',     border: 'border-blue-100 dark:border-blue-900/30' },
  orange: { icon: '📒', bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-900/30' },
  purple: { icon: '📓', bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-900/30' },
}

const ICON_COMPONENT: Record<string, React.FC<{ className?: string }>> = {
  BookOpen,
  Database,
  FileText,
  Layout,
}

interface NotebookCardProps {
  notebook: Notebook
  onClick?: () => void
}

export function NotebookCard({ notebook, onClick }: NotebookCardProps) {
  const { deleteNotebook } = useAppStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const colors = COLOR_MAP[notebook.color] || COLOR_MAP.indigo
  const Icon = ICON_COMPONENT[notebook.icon] || BookOpen

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    if (window.confirm(`Are you sure you want to delete "${notebook.title}"?`)) {
      deleteNotebook(notebook.id)
    }
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={cn(
        'group relative bg-card dark:bg-card-dark rounded-card p-5',
        'border border-border dark:border-[#1C1C1C]',
        'cursor-pointer transition-colors duration-200',
        'hover:border-primary/40 dark:hover:border-primary/40'
      )}
      role="button"
      tabIndex={0}
      aria-label={`Open notebook: ${notebook.title}`}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* More options button */}
      <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen(!menuOpen)
          }}
          className={cn(
            'w-7 h-7 flex items-center justify-center rounded-md',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
            'text-text-muted dark:text-text-muted-dark',
            'hover:bg-gray-100 dark:hover:bg-white/10',
            menuOpen && 'opacity-100 bg-gray-100 dark:bg-white/10'
          )}
          aria-label="More options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-1 w-40 py-1 bg-card dark:bg-card-dark rounded-xl border border-border dark:border-border-dark shadow-lg z-20"
            >
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Notebook
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Icon */}
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
        colors.bg
      )}>
        <Icon className={cn('w-5 h-5', colors.text)} />
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-1.5 pr-6 leading-snug line-clamp-2">
        {notebook.title}
      </h3>

      {/* Meta */}
      <p className="text-xs text-text-muted dark:text-text-muted-dark">
        {notebook.sourceCount} sources • Updated {formatRelativeTime(notebook.updatedAt)}
      </p>
    </motion.div>
  )
}
