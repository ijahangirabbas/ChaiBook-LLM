import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'
import type { Message } from '../../types'

export function CitationButton({
  sourceNum,
  sources,
}: {
  sourceNum: number
  sources?: Message['sources']
}) {
  const { openSourceInspector, sources: storeSources } = useAppStore()
  const activeSources = sources && sources.length > 0 ? sources : storeSources
  const targetSource = activeSources.find((s) => s.number === sourceNum)

  return (
    <button
      onClick={() => {
        if (!targetSource) return
        openSourceInspector(targetSource.id, targetSource, 'retrieved')
      }}
      className={cn(
        'inline-flex items-center justify-center mx-0.5 px-1.5 py-0.2 align-middle',
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
