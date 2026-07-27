import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, ExternalLink, Copy, Check, Play, FileText, Globe } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { ApiService } from '../../services/api.service'
import { SOURCE_TYPE_CONFIG } from '../../lib/constants'
import { SourceIcon } from '../SourceCard/SourceCard'
import { cn } from '../../lib/utils'

function getYouTubeId(url?: string): string {
  if (!url) return ''
  const match = url.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : ''
}

function parseSubtitlesToTranscript(rawText: string) {
  if (!rawText) return []
  const blocks = rawText.split(/\n\s*\n/)
  const entries: { timestamp: string; seconds: number; text: string; isCited?: boolean }[] = []

  for (const block of blocks) {
    const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) continue

    const timeLineIndex = lines.findIndex((l) => l.includes('-->'))
    if (timeLineIndex !== -1) {
      const timeLine = lines[timeLineIndex]
      const textLines = lines.slice(timeLineIndex + 1).join(' ')
      const match = timeLine.match(/(\d{2}:\d{2}:\d{2}[\.,]\d{3}|\d{2}:\d{2}[\.,]\d{3}|\d{2}:\d{2}:\d{2}|\d{2}:\d{2})\s*-->/)
      if (match) {
        const timestamp = match[1].replace(',', '.')
        const parts = timestamp.split(':')
        let seconds = 0
        if (parts.length === 3) {
          seconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2])
        } else if (parts.length === 2) {
          seconds = parseInt(parts[0], 10) * 60 + parseFloat(parts[1])
        }
        if (textLines) {
          entries.push({ timestamp, seconds: Math.floor(seconds), text: textLines, isCited: true })
        }
      }
    }
  }
  return entries
}

export function SourceInspector() {
  const {
    sources: storeSources,
    sourceInspectorOpen,
    activeSourceId,
    activeSourceOverride,
    activeSourceTab,
    setActiveSourceTab,
    closeSourceInspector,
    openSourceInspector,
  } = useAppStore()
  const [copiedChunk, setCopiedChunk] = useState(false)
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null)
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null)

  const sources = storeSources
  const activeIndex = sources.findIndex((s) => s.id === activeSourceId)
  const baseSource = activeIndex >= 0 ? sources[activeIndex] : null
  const source = activeSourceOverride
    ? { ...(baseSource || {}), ...activeSourceOverride }
    : baseSource

  useEffect(() => {
    let isMounted = true
    if (sourceInspectorOpen && source?.id) {
      if (source.url && (source.url.startsWith('http://') || source.url.startsWith('https://'))) {
        setPresignedUrl(source.url)
      } else {
        ApiService.getSourcePreview(source.id)
          .then((res) => {
            if (isMounted && res?.presignedDownloadUrl) {
              setPresignedUrl(res.presignedDownloadUrl)
            }
          })
          .catch(() => {})
      }
    } else {
      setPresignedUrl(null)
    }
    return () => {
      isMounted = false
    }
  }, [sourceInspectorOpen, source?.id, source?.url])

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
              {(source.url || presignedUrl) && (
                <a
                  href={presignedUrl || source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
                  aria-label={`Open ${source.title} in new tab`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Original Source File</span>
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
                          <span className="font-semibold text-text-muted">PDF Document Page</span>
                          <span className="font-mono font-bold text-primary">
                            Page {source.pageNumber || 1} {source.totalPages ? `of ${source.totalPages}` : ''}
                          </span>
                        </div>

                        {/* PDF Page Canvas */}
                        <div className="relative w-full rounded-xl border border-border dark:border-border-dark bg-white dark:bg-[#18181B] p-4 shadow-sm overflow-hidden flex flex-col justify-between">
                          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-2 mb-3">
                            <span className="text-[11px] font-bold text-text-primary dark:text-text-primary-dark truncate max-w-[240px]">
                              {source.title}
                            </span>
                            {source.pageNumber && (
                              <span className="text-[10px] text-primary font-mono font-semibold bg-primary/10 px-2 py-0.5 rounded">
                                Page {source.pageNumber}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 bg-gray-50/50 dark:bg-white/5 rounded-lg p-3.5 space-y-3 text-xs leading-relaxed">
                            {source.retrievedChunk ? (
                              <div className="relative p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border-l-4 border-amber-500 text-amber-950 dark:text-amber-100 font-medium shadow-xs">
                                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                                  Extracted Knowledge Base Chunk
                                </span>
                                <p className="whitespace-pre-wrap">{source.retrievedChunk}</p>
                              </div>
                            ) : (
                              <p className="text-text-muted italic text-xs">No text extracted for this page.</p>
                            )}
                          </div>

                          <div className="pt-3 mt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-[10px] text-text-muted">
                            <span>Chaibook PDF Source Inspector</span>
                            {source.url && (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary font-semibold hover:underline flex items-center gap-1"
                              >
                                Open Document <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* VTT / SRT Subtitle Transcript Viewer */}
                    {(source.type === 'vtt' || source.type === 'srt') && (() => {
                      const transcriptList = (source.transcript && source.transcript.length > 0)
                        ? source.transcript
                        : parseSubtitlesToTranscript(source.retrievedChunk || '')
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
                            <span>Subtitle Transcript Stream</span>
                            <span className="font-mono text-primary">[{source.type.toUpperCase()}]</span>
                          </div>
                          {transcriptList.length > 0 ? (
                            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                              {transcriptList.map((entry, idx) => (
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
                            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-border dark:border-border-dark text-xs text-text-primary dark:text-text-primary-dark whitespace-pre-wrap">
                              {source.retrievedChunk || 'No subtitle content available.'}
                            </div>
                          )}
                        </div>
                      )
                    })()}

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
                    {/* Multi-chunk retrieved content list */}
                    {source.chunks && source.chunks.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-text-primary dark:text-text-primary-dark">
                            Retrieved Passages ({source.chunks.length} cited excerpt{source.chunks.length > 1 ? 's' : ''})
                          </span>
                          {source.pagesText && (
                            <span className="text-[11px] font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                              {source.pagesText}
                            </span>
                          )}
                        </div>

                        {source.chunks.map((chk, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/15 dark:border-primary/25 space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-primary flex items-center gap-1.5">
                                <span>Excerpt #{idx + 1}</span>
                                {chk.pageNumber && (
                                  <span className="font-mono bg-primary/15 px-1.5 py-0.2 rounded text-[10px]">
                                    Page {chk.pageNumber}
                                  </span>
                                )}
                              </span>
                              {chk.similarity !== undefined && (
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                                  {Math.round(chk.similarity * 100)}% match
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-text-primary dark:text-text-primary-dark leading-relaxed font-medium border-l-2 border-primary pl-2.5">
                              {chk.retrievedChunk}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : source.retrievedChunk ? (
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
                    ) : (
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                        <p className="font-bold">No Retrieved Chunk Context Available</p>
                        <p className="leading-relaxed opacity-90">
                          Click on an inline citation badge (e.g. [1], [2]) or a cited source pill directly under an AI response to view the exact text extracted for that answer.
                        </p>
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
                          { label: 'Domain / Path', value: source.domain || source.title || '—' },
                          source.pageNumber ? { label: 'Cited Page', value: `Page ${source.pageNumber} of ${source.totalPages || '—'}` } : null,
                          source.similarity !== undefined ? { label: 'Relevance Score', value: `${Math.round(source.similarity * 100)}% match` } : null,
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
