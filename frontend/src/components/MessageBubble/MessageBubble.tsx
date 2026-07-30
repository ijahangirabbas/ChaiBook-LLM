import { Suspense, lazy, useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react'
import type { Message } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'
import { getCitationPills, sourceForCitationOpen } from '../../lib/chat.utils'

const ProcessedContent = lazy(() =>
  import('./ProcessedContent').then((m) => ({ default: m.ProcessedContent }))
)

interface MessageBubbleProps {
  message: Message
  onRegenerate?: () => void
}

export function MessageBubble({ message, onRegenerate }: MessageBubbleProps) {
  const { user, openSourceInspector } = useAppStore()
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState<boolean | null>(null)

  const isUser = message.role === 'user'
  const userInitial =
    user?.name?.trim().charAt(0).toUpperCase() ||
    user?.email?.trim().charAt(0).toUpperCase() ||
    'U'

  const citationPills = !isUser && !message.isStreaming ? getCitationPills(message.sources) : []

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
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-semibold text-xs text-white select-none',
          'bg-[#5B46F6]'
        )}
      >
        {isUser ? userInitial : '☕'}
      </div>

      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'p-4 rounded-[20px] text-sm leading-relaxed transition-colors',
            isUser
              ? 'bg-[#EEF1FF] dark:bg-[#151528] text-text-primary dark:text-text-primary-dark border border-indigo-100 dark:border-[#222240] rounded-tr-xs'
              : 'bg-card dark:bg-[#0A0A0A] text-text-primary dark:text-text-primary-dark border border-border dark:border-[#1C1C1C] rounded-tl-xs'
          )}
        >
          {message.content.trim() ? (
            isUser ? (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            ) : (
              <Suspense fallback={<p className="whitespace-pre-wrap break-words">{message.content}</p>}>
                <ProcessedContent content={message.content} sources={message.sources} />
              </Suspense>
            )
          ) : message.isStreaming ? (
            <p className="italic text-text-muted">Thinking…</p>
          ) : (
            <p className="italic text-text-muted">No answer generated for this query.</p>
          )}
          {message.isStreaming && message.content.trim() && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary animate-pulse align-middle" />
          )}
        </div>

        {citationPills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-1">
            <span className="text-[11px] font-semibold text-text-muted dark:text-text-muted-dark mr-1">
              Cited Sources:
            </span>
            {citationPills.map((pill) => (
              <button
                key={`${pill.source.id}-${pill.citationNumber}-${pill.chunk.chunkId || ''}`}
                onClick={() =>
                  openSourceInspector(pill.source.id, sourceForCitationOpen(pill), 'retrieved')
                }
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold border border-primary/20 transition-all cursor-pointer"
                title={`Click to view exact excerpt from ${pill.source.title}`}
              >
                <span>[{pill.citationNumber}]</span>
                <span className="max-w-[160px] truncate">{pill.source.title}</span>
                {(pill.chunk.pageNumber || pill.source.pagesText) && (
                  <span className="text-[10px] opacity-85 font-mono bg-primary/10 px-1 py-0.2 rounded">
                    {pill.chunk.pageNumber
                      ? `p.${pill.chunk.pageNumber}`
                      : pill.source.pagesText}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {!isUser && !message.isStreaming && (
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
