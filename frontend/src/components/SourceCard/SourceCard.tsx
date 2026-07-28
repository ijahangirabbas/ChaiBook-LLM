import { motion } from 'framer-motion'
import { Globe, FileText, File, RefreshCw, Trash2 } from 'lucide-react'
import type { Source } from '../../types'
import { SOURCE_TYPE_CONFIG } from '../../lib/constants'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'

// Source type icons
function SourceIcon({ type }: { type: Source['type'] }) {
  switch (type) {
    case 'youtube':
      return (
        <div className="w-5 h-5 bg-red-600 rounded-sm flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3">
            <path d="M10 15l5.19-3L10 9v6zm11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/>
          </svg>
        </div>
      )
    case 'pdf':
      return (
        <div className="w-5 h-5 bg-red-500 rounded-sm flex items-center justify-center shrink-0">
          <span className="text-white text-[8px] font-bold leading-none">PDF</span>
        </div>
      )
    case 'webpage':
      return (
        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0">
          <Globe className="w-3 h-3 text-white" />
        </div>
      )
    case 'text':
      return (
        <div className="w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center shrink-0">
          <FileText className="w-3 h-3 text-white" />
        </div>
      )
    default:
      return (
        <div className="w-5 h-5 bg-gray-400 rounded-sm flex items-center justify-center shrink-0">
          <File className="w-3 h-3 text-white" />
        </div>
      )
  }
}

interface SourceCardProps {
  source: Source
  onClick?: () => void
  isActive?: boolean
}

export function SourceCard({ source, onClick, isActive }: SourceCardProps) {
  const { reindexSource, removeSource } = useAppStore()
  const config = SOURCE_TYPE_CONFIG[source.type] || SOURCE_TYPE_CONFIG.text
  const status = source.status || 'ready'
  const progress = source.indexingProgress ?? (status === 'ready' ? 100 : 0)

  const statusLabel =
    status === 'error'
      ? 'Failed'
      : status === 'uploading'
        ? 'Uploading'
        : status === 'indexing' || progress < 100
          ? 'Indexing'
          : 'Ready'

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={cn(
        'relative flex flex-col gap-1.5 p-3.5 rounded-xl text-left group cursor-pointer',
        'bg-card dark:bg-[#0A0A0A] min-w-[200px] max-w-[230px] w-[210px] shrink-0',
        'border transition-colors duration-200',
        isActive
          ? 'border-primary dark:border-primary'
          : 'border-border dark:border-[#1C1C1C] hover:border-primary/40'
      )}
      aria-label={`View source: ${source.title}`}
    >
      {/* Number badge */}
      <span className={cn(
        'absolute top-2.5 right-2.5 w-5 h-5 rounded-full text-[10px] font-bold',
        'flex items-center justify-center',
        config.bgColor, config.textColor,
        config.darkBg, config.darkText
      )}>
        {source.number}
      </span>

      {/* Source type + icon */}
      <div className="flex items-center gap-2">
        <SourceIcon type={source.type} />
        <span className={cn(
          'text-xs font-semibold',
          config.textColor, config.darkText
        )}>
          {config.label}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark leading-snug line-clamp-2 pr-4">
        {source.title}
      </p>

      {/* Domain */}
      <p className="text-xs text-text-muted dark:text-text-muted-dark truncate">
        {source.domain}
      </p>

      {/* Status Dot Indicator & Label */}
      <div className="flex items-center justify-between gap-1.5 mt-1 pt-1.5 border-t border-border/50 dark:border-white/5">
        {status === 'error' ? (
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>{statusLabel}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                reindexSource(source.id)
              }}
              className="text-[10px] font-bold text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : status !== 'ready' && progress < 100 ? (
          <div className="flex items-center justify-between w-full text-xs text-amber-600 dark:text-amber-400 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-ping" />
              <span>{statusLabel}</span>
            </div>
            <span className="text-[10px] bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded font-bold">
              {progress}%
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>{statusLabel}</span>
          </div>
        )}
      </div>

      {/* Hover Action Menu (Re-index / Delete) */}
      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card dark:bg-[#0A0A0A] p-0.5 rounded-lg border border-border dark:border-[#1C1C1C] shadow-sm">
        <button
          onClick={(e) => {
            e.stopPropagation()
            reindexSource(source.id)
          }}
          title="Re-index Source"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-text-muted hover:text-primary transition-colors"
          aria-label="Re-index source"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            removeSource(source.id)
          }}
          title="Remove Source"
          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-text-muted hover:text-danger transition-colors"
          aria-label="Remove source"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

export { SourceIcon }
