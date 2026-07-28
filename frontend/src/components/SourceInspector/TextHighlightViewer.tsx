import { useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'

interface TextHighlightViewerProps {
  fullText: string
  highlightStart?: number
  highlightEnd?: number
  className?: string
}

export function TextHighlightViewer({
  fullText,
  highlightStart,
  highlightEnd,
  className,
}: TextHighlightViewerProps) {
  const highlightRef = useRef<HTMLElement>(null)

  const hasHighlight =
    highlightStart !== undefined &&
    highlightEnd !== undefined &&
    highlightStart >= 0 &&
    highlightEnd > highlightStart &&
    highlightEnd <= fullText.length

  useEffect(() => {
    if (hasHighlight) {
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [hasHighlight, highlightStart, highlightEnd])

  if (!hasHighlight) {
    return (
      <div className={cn('text-sm leading-relaxed whitespace-pre-wrap text-text-primary dark:text-text-primary-dark', className)}>
        {fullText}
      </div>
    )
  }

  const before = fullText.slice(0, highlightStart)
  const highlighted = fullText.slice(highlightStart, highlightEnd)
  const after = fullText.slice(highlightEnd)

  return (
    <div className={cn('text-sm leading-relaxed whitespace-pre-wrap text-text-primary dark:text-text-primary-dark', className)}>
      {before}
      <mark
        ref={highlightRef}
        className="bg-amber-200 dark:bg-amber-900/70 text-amber-950 dark:text-amber-100 px-1 py-0.5 rounded font-medium"
      >
        {highlighted}
      </mark>
      {after}
    </div>
  )
}
