import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, ExternalLink, Copy, Check, Info, Play, FileText, Globe } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { SOURCE_TYPE_CONFIG } from '../../lib/constants'
import { SourceIcon } from '../SourceCard/SourceCard'
import { cn } from '../../lib/utils'

function getYouTubeId(url?: string): string {
  if (!url) return 'GdjkfD93jU'
  const match = url.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : 'GdjkfD93jU'
}

export function SourceInspector() {
  const {
    sources: storeSources,
    sourceInspectorOpen,
    activeSourceId,
    activeSourceTab,
    setActiveSourceTab,
    closeSourceInspector,
    openSourceInspector,
  } = useAppStore()
  const [copiedChunk, setCopiedChunk] = useState(false)
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null)

  const sources = storeSources
  const activeIndex = sources.findIndex((s) => s.id === activeSourceId)
  const source = activeIndex >= 0 ? sources[activeIndex] : null

  const handlePrev = () => {
    if (activeIndex > 0) {
      setSelectedTimestamp(null)
      openSourceInspector(sources[activeIndex - 1].id)
    }
  }

  const handleNext = () => {
    if (activeIndex < sources.length - 1) {
      setSelectedTimestamp(null)
      openSourceInspector(sources[activeIndex + 1].id)
    }
  }

  const handleCopyChunk = async () => {
    if (source?.retrievedChunk) {
      try {
        await navigator.clipboard.writeText(source.retrievedChunk)
        setCopiedChunk(true)
        setTimeout(() => setCopiedChunk(false), 2000)
      } catch {}
    }
  }

  const sourceConfig = source ? (SOURCE_TYPE_CONFIG[source.type] || SOURCE_TYPE_CONFIG.text) : null
  const currentStartSeconds = selectedTimestamp ?? source?.timelineSegment?.startSeconds ?? 0

  return (
    <AnimatePresence>
      {sourceInspectorOpen && source && sourceConfig && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/20 md:hidden"
            onClick={closeSourceInspector}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={cn(
              'fixed right-0 top-0 bottom-0 z-40',
              'w-full md:w-[380px] lg:w-[420px]',
              'bg-card dark:bg-card-dark',
              'border-l border-border dark:border-border-dark',
              'flex flex-col overflow-hidden shadow-modal dark:shadow-modal-dark'
            )}
            role="complementary"
            aria-label="Source inspector"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-border-dark">
              {/* Prev */}
              <button
                onClick={handlePrev}
                disabled={activeIndex === 0}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-lg',
                  'text-text-secondary dark:text-text-secondary-dark',
                  'hover:bg-gray-100 dark:hover:bg-white/10 transition-colors',
                  activeIndex === 0 && 'opacity-40 cursor-not-allowed'
                )}
                aria-label="Previous source"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Counter */}
              <span className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
                Source {activeIndex + 1} of {sources.length}
              </span>

              {/* Next + Close */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleNext}
                  disabled={activeIndex >= sources.length - 1}
                  className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-lg',
                    'text-text-secondary dark:text-text-secondary-dark',
                    'hover:bg-gray-100 dark:hover:bg-white/10 transition-colors',
                    activeIndex >= sources.length - 1 && 'opacity-40 cursor-not-allowed'
                  )}
                  aria-label="Next source"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={closeSourceInspector}
                  className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-lg',
                    'text-text-secondary dark:text-text-secondary-dark',
                    'hover:bg-gray-100 dark:hover:bg-white/10 transition-colors'
                  )}
                  aria-label="Close source inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Source meta */}
            <div className="px-4 py-3 border-b border-border dark:border-border-dark">
              <div className="flex items-center gap-2 mb-1.5">
                <SourceIcon type={source.type} />
                <span className={cn(
                  'text-xs font-semibold',
                  sourceConfig.textColor,
                  sourceConfig.darkText
                )}>
                  {sourceConfig.label}
                </span>
                {source.number && (
                  <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    [{source.number}]
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-1 leading-snug">
                {source.title}
              </h3>
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                  aria-label={`Open ${source.title} in new tab`}
                >
                  <span className="truncate">{source.domain || source.url}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border dark:border-border-dark">
              {(['overview', 'retrieved'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveSourceTab(tab)}
                  className={cn(
                    'flex-1 py-2.5 text-xs font-semibold capitalize transition-all duration-150',
                    activeSourceTab === tab
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark'
                  )}
                  aria-selected={activeSourceTab === tab}
                  role="tab"
                >
                  {tab === 'overview' ? 'Original Source Viewer' : 'Retrieved Content'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* ─── TAB 1: Original Source Viewer ─────────────────────────────────── */}
                {activeSourceTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 space-y-4"
                  >
                    {/* YouTube Deep-Link Player */}
                    {source.type === 'youtube' && (
                      <div className="space-y-4">
                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-md border border-border dark:border-border-dark">
                          <iframe
                            key={currentStartSeconds}
                            src={`https://www.youtube-nocookie.com/embed/${getYouTubeId(source.url)}?start=${currentStartSeconds}&autoplay=1`}
                            title={source.title}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>

                        {/* Timeline Segment Info */}
                        {source.timelineSegment && (
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-border dark:border-border-dark flex items-center justify-between text-xs">
                            <span className="font-semibold text-text-muted">Cited Timestamp Range:</span>
                            <span className="font-mono font-bold text-primary">
                              {source.timelineSegment.start} — {source.timelineSegment.end}
                            </span>
                          </div>
                        )}

                        {/* Interactive Transcript Stream */}
                        {source.transcript && source.transcript.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                              Interactive Video Transcript
                            </h4>
                            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                              {source.transcript.map((entry, idx) => {
                                const isSelected = entry.seconds === currentStartSeconds || entry.isCited
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => setSelectedTimestamp(entry.seconds)}
                                    className={cn(
                                      'p-2.5 rounded-lg text-xs flex gap-3 cursor-pointer transition-all duration-150',
                                      isSelected
                                        ? 'bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/50 text-amber-950 dark:text-amber-100 font-medium shadow-xs'
                                        : 'bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-text-secondary dark:text-text-secondary-dark'
                                    )}
                                  >
                                    <span className="font-mono font-semibold text-primary shrink-0 flex items-center gap-1">
                                      <Play className="w-3 h-3 fill-primary" />
                                      {entry.timestamp}
                                    </span>
                                    <p className="flex-1">{entry.text}</p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PDF Deep-Linked Viewer */}
                    {source.type === 'pdf' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-border dark:border-border-dark text-xs">
                          <span className="font-semibold text-text-muted">PDF Page Navigation</span>
                          <span className="font-mono font-bold text-primary">
                            Page {source.pageNumber || 1} of {source.totalPages || 1}
                          </span>
                        </div>

                        {/* PDF Page Canvas Mockup */}
                        <div className="relative w-full aspect-[1/1.3] rounded-xl border border-border dark:border-border-dark bg-white dark:bg-[#18181B] p-4 shadow-sm overflow-hidden flex flex-col justify-between select-none">
                          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-2 mb-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {source.title} — Page {source.pageNumber || 1}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">Confidential</span>
                          </div>

                          {/* Render Bounding Box Highlight if present */}
                          {source.bbox ? (
                            <div className="relative flex-1 bg-gray-50/50 dark:bg-white/5 rounded p-3 space-y-2 text-[11px] leading-relaxed text-gray-700 dark:text-gray-300">
                              <p className="opacity-60">
                                1. Introduction to Retrieval Augmented Generation architecture and pipeline components.
                              </p>
                              <div className="relative p-2.5 rounded-md bg-amber-100/90 dark:bg-amber-950/80 border-2 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100 font-medium shadow-sm">
                                <span className="absolute -top-2.5 left-2 px-1.5 py-0.2 bg-amber-500 text-white text-[9px] font-bold uppercase rounded">
                                  Cited Highlight
                                </span>
                                {source.retrievedChunk}
                              </div>
                              <p className="opacity-60">
                                2. Evaluation metrics including BLEU, ROUGE, and cosine similarity embeddings.
                              </p>
                            </div>
                          ) : (
                            <div className="flex-1 bg-gray-50/50 dark:bg-white/5 rounded p-3 space-y-2 text-[11px] leading-relaxed text-gray-700 dark:text-gray-300">
                              <p className="border-l-2 border-primary pl-2 font-medium text-text-primary dark:text-text-primary-dark">
                                {source.retrievedChunk || 'No text extracted for this page.'}
                              </p>
                            </div>
                          )}

                          <div className="pt-2 border-t border-gray-100 dark:border-white/10 text-center text-[10px] text-gray-400">
                            Chaibook Deep-Linked Source Viewer • Page {source.pageNumber || 1}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* VTT / SRT Subtitle Transcript Viewer */}
                    {(source.type === 'vtt' || source.type === 'srt') && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
                          <span>Subtitle Transcript Stream</span>
                          <span className="font-mono text-primary">[{source.type.toUpperCase()}]</span>
                        </div>
                        {source.transcript && source.transcript.length > 0 ? (
                          <div className="space-y-2">
                            {source.transcript.map((entry, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  'p-3 rounded-xl text-xs flex gap-3 border transition-colors',
                                  entry.isCited
                                    ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/50 text-amber-950 dark:text-amber-100 font-medium'
                                    : 'bg-gray-50 dark:bg-white/5 border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark'
                                )}
                              >
                                <span className="font-mono font-semibold text-primary shrink-0">{entry.timestamp}</span>
                                <p>{entry.text}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-border dark:border-border-dark text-xs text-text-muted">
                            {source.retrievedChunk}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Webpage / Text Reader View */}
                    {(source.type === 'webpage' || source.type === 'text' || source.type === 'markdown' || source.type === 'word' || source.type === 'powerpoint') && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
                          <span className="flex items-center gap-1.5">
                            {source.type === 'webpage' ? <Globe className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                            Extracted Reader View
                          </span>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#121212] border border-border dark:border-border-dark leading-relaxed text-sm text-text-primary dark:text-text-primary-dark whitespace-pre-wrap">
                          {source.retrievedChunk ? (
                            <mark className="bg-amber-200 dark:bg-amber-900/70 text-amber-950 dark:text-amber-100 px-1.5 py-0.5 rounded font-medium block border-l-4 border-amber-500">
                              {source.retrievedChunk}
                            </mark>
                          ) : (
                            <p className="text-text-muted text-xs">No specific chunk highlighted.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ─── TAB 2: Retrieved Content / Chunk ──────────────────────────────── */}
                {activeSourceTab === 'retrieved' && (
                  <motion.div
                    key="retrieved"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 space-y-4"
                  >
                    {/* Similarity score */}
                    {source.similarity !== undefined && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-xs font-semibold text-text-secondary dark:text-text-secondary-dark">
                            Similarity Match Score
                          </span>
                          <Info className="w-3.5 h-3.5 text-text-muted dark:text-text-muted-dark" />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${source.similarity * 100}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className="h-full bg-gradient-primary rounded-full"
                            />
                          </div>
                          <span className="text-sm font-bold text-primary">
                            {Math.round(source.similarity * 100)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Retrieved chunk */}
                    {source.retrievedChunk && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-text-secondary dark:text-text-secondary-dark">
                            Retrieved Content Chunk
                          </span>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCopyChunk}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                            aria-label="Copy chunk text"
                          >
                            {copiedChunk ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                            {copiedChunk ? 'Copied' : 'Copy Chunk'}
                          </motion.button>
                        </div>
                        <div className={cn(
                          'p-3.5 rounded-xl text-sm text-text-primary dark:text-text-primary-dark leading-relaxed',
                          'bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20'
                        )}>
                          <p className="border-l-2 border-primary pl-3 font-medium">
                            {source.retrievedChunk}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Chunk metadata */}
                    <div>
                      <p className="text-xs font-semibold text-text-secondary dark:text-text-secondary-dark mb-2">
                        Chunk Metadata
                      </p>
                      <div className="space-y-1.5 text-xs">
                        {[
                          { label: 'Source Type', value: sourceConfig.label },
                          { label: 'Domain / Path', value: source.domain || '—' },
                          source.pageNumber ? { label: 'Cited Page', value: `Page ${source.pageNumber} of ${source.totalPages || '—'}` } : null,
                          source.timelineSegment ? { label: 'Cited Video Time', value: `${source.timelineSegment.start} — ${source.timelineSegment.end}` } : null,
                          source.chunkIndex !== undefined ? { label: 'Chunk Index', value: `#${source.chunkIndex}` } : null,
                        ].filter(Boolean).map((item) => (
                          <div key={item!.label} className="flex items-center justify-between py-1 border-b border-border/60 dark:border-border-dark/60">
                            <span className="text-text-muted dark:text-text-muted-dark">{item!.label}</span>
                            <span className="text-text-primary dark:text-text-primary-dark font-medium">{item!.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer note */}
                    <div className={cn(
                      'p-3 rounded-xl text-xs text-text-muted dark:text-text-muted-dark leading-relaxed',
                      'bg-gray-50 dark:bg-white/5 border border-border dark:border-border-dark italic'
                    )}>
                      This exact content segment was extracted from your knowledge base and passed to the LLM context.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
