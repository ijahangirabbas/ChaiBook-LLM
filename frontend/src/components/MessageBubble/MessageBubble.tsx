import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react'
import type { Message } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'

interface MessageBubbleProps {
  message: Message
  onRegenerate?: () => void
}

function ProcessedContent({ content, sources }: { content: string; sources?: Message['sources'] }) {
  const { openSourceInspector, sources: storeSources } = useAppStore()
  const activeSources = sources && sources.length > 0 ? sources : storeSources

  // Regex matches [1], [2], [Source 1], etc.
  const parts = content.split(/(\[\d+\]|\[Source \d+\])/g)

  return (
    <div className="whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        const match = part.match(/\[(?:Source )?(\d+)\]/)
        if (match) {
          const sourceNum = parseInt(match[1], 10)
          const targetSource = activeSources.find((s) => s.number === sourceNum)
          return (
            <button
              key={i}
              onClick={() => targetSource && openSourceInspector(targetSource.id, targetSource, 'retrieved')}
              className={cn(
                'inline-flex items-center justify-center mx-0.5 px-1.5 py-0.2',
                'rounded-md text-[11px] font-bold text-primary dark:text-primary-light',
                'bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30',
                'border border-primary/20 transition-all cursor-pointer select-none'
              )}
              title={targetSource ? `Inspect Source ${sourceNum}: ${targetSource.title}` : `Source ${sourceNum}`}
            >
              [{sourceNum}]
            </button>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </div>
  )
}

export function MessageBubble({ message, onRegenerate }: MessageBubbleProps) {
  const { openSourceInspector } = useAppStore()
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState<boolean | null>(null)

  const isUser = message.role === 'user'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex gap-3.5 max-w-3xl', isUser && 'ml-auto flex-row-reverse')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-semibold text-xs text-white select-none',
          isUser
            ? 'bg-[#5B46F6]'
            : 'bg-[#5B46F6]'
        )}
      >
        {isUser ? 'M' : '☕'}
      </div>

      {/* Bubble Container */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'p-4 rounded-[20px] text-sm leading-relaxed transition-colors',
            isUser
              ? 'bg-[#EEF1FF] dark:bg-[#151528] text-text-primary dark:text-text-primary-dark border border-indigo-100 dark:border-[#222240] rounded-tr-xs'
              : 'bg-card dark:bg-[#0A0A0A] text-text-primary dark:text-text-primary-dark border border-border dark:border-[#1C1C1C] rounded-tl-xs'
          )}
        >
          {/* Content with interactive citation parsing */}
          <ProcessedContent content={message.content} sources={message.sources} />
        </div>

        {/* Cited Sources Badge List */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-1">
            <span className="text-[11px] font-semibold text-text-muted dark:text-text-muted-dark mr-1">
              Cited Sources:
            </span>
            {message.sources.map((s, idx) => (
              <button
                key={s.id || idx}
                onClick={() => openSourceInspector(s.id, s, 'retrieved')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold border border-primary/20 transition-all cursor-pointer"
                title={`Click to view exact excerpt from ${s.title}`}
              >
                <span>[{s.number || idx + 1}]</span>
                <span className="max-w-[160px] truncate">{s.title}</span>
                {(s.pagesText || s.pageNumber) && (
                  <span className="text-[10px] opacity-85 font-mono bg-primary/10 px-1 py-0.2 rounded">
                    {s.pagesText || `p.${s.pageNumber}`}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Action bar for assistant messages */}
        {!isUser && (
          <div className="flex items-center gap-1 mt-2 ml-1 text-text-muted dark:text-text-muted-dark">
            <button
              onClick={handleCopy}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium',
                'hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-150',
                copied && 'text-success'
              )}
              aria-label="Copy message"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>

            <button
              onClick={() => setLiked(liked === true ? null : true)}
              className={cn(
                'p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-150',
                liked === true && 'text-primary'
              )}
              aria-label="Good response"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setLiked(liked === false ? null : false)}
              className={cn(
                'p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-150',
                liked === false && 'text-danger'
              )}
              aria-label="Bad response"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>

            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-150"
                aria-label="Regenerate response"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
