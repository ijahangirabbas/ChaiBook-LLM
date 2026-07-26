import { motion } from 'framer-motion'
import { FileText, MessageCircle, Layout, Zap, BookMarked, Shield } from 'lucide-react'
import type { QuickAction } from '../../types'
import { cn } from '../../lib/utils'

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  FileText,
  MessageCircle,
  Layout,
  Zap,
  BookMarked,
  Shield,
}

const COLOR_MAP: Record<string, { bg: string; icon: string; darkBg: string }> = {
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-500', darkBg: 'dark:bg-indigo-950/30' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-500',  darkBg: 'dark:bg-green-950/30' },
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   darkBg: 'dark:bg-blue-950/30' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-500', darkBg: 'dark:bg-orange-950/30' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-500', darkBg: 'dark:bg-purple-950/30' },
  pink:   { bg: 'bg-pink-50',   icon: 'text-pink-500',   darkBg: 'dark:bg-pink-950/30' },
}

interface QuickActionCardProps {
  action: QuickAction
  onClick?: (prompt: string) => void
  index?: number
}

export function QuickActionCard({ action, onClick, index = 0 }: QuickActionCardProps) {
  const Icon = ICON_MAP[action.icon] || FileText
  const colors = COLOR_MAP[action.color] || COLOR_MAP.indigo

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(action.prompt)}
      className={cn(
        'flex flex-col items-center text-center gap-2 p-4 rounded-card',
        'bg-card dark:bg-card-dark border border-border dark:border-[#1C1C1C]',
        'cursor-pointer transition-colors duration-200',
        'hover:border-primary/40 dark:hover:border-primary/40',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
      )}
      aria-label={`${action.label}: ${action.description}`}
    >
      {/* Icon */}
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center',
        colors.bg, colors.darkBg
      )}>
        <Icon className={cn('w-5 h-5', colors.icon)} />
      </div>

      {/* Label */}
      <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
        {action.label}
      </p>

      {/* Description */}
      <p className="text-xs text-text-muted dark:text-text-muted-dark leading-relaxed">
        {action.description}
      </p>
    </motion.button>
  )
}
