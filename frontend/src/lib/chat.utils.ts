import { generateId } from './utils'
import type { Source } from '../types'

export function mapCitationsToSources(
  citations: any[],
  activeNotebookSources: Source[],
  notebookId: string
): Source[] {
  if (!citations.length) return []

  const groupedMap = new Map<string, Source>()
  let currentNumber = 1

  citations.forEach((c: any) => {
    const matchByChunkId = c.chunk_id
      ? activeNotebookSources.find(
          (s) => s.chunkId === c.chunk_id || s.chunks?.some((ch) => ch.chunkId === c.chunk_id)
        )
      : undefined
    const matchByStoreId = c.source_id
      ? activeNotebookSources.find((s) => s.id === c.source_id)
      : undefined
    const matchedWorkspaceSource = matchByChunkId || matchByStoreId

    const key = c.chunk_id || (matchedWorkspaceSource ? matchedWorkspaceSource.id : c.source_id || c.title || 'unknown-src')
    const existing = groupedMap.get(key)

    const chunkItem = {
      chunkId: c.chunk_id,
      retrievedChunk: c.retrievedChunk,
      pageNumber: c.pageNumber,
      similarity: c.similarity,
      timelineSegment: c.timelineSegment,
    }

    if (existing) {
      existing.chunks?.push(chunkItem)
      const pagesSet = new Set<number>()
      existing.chunks?.forEach((ch) => {
        if (ch.pageNumber) pagesSet.add(ch.pageNumber)
      })
      if (pagesSet.size > 0) {
        existing.pagesText = `p.${Array.from(pagesSet).sort((a, b) => a - b).join(', p.')}`
      }
      return
    }

    const pagesText = c.pageNumber ? `p.${c.pageNumber}` : undefined
    const rawType = (c.source_type || matchedWorkspaceSource?.type || 'text').toLowerCase()
    const sourceType =
      rawType === 'text' && matchedWorkspaceSource?.type ? matchedWorkspaceSource.type : (rawType as Source['type'])

    groupedMap.set(key, {
      id: matchedWorkspaceSource?.id || c.source_id || generateId(),
      notebookId,
      type: sourceType,
      title: matchedWorkspaceSource?.title || c.title || 'Knowledge Base Source',
      url: c.url || matchedWorkspaceSource?.url,
      domain:
        c.domain ||
        matchedWorkspaceSource?.domain ||
        (c.url ? new URL(c.url).hostname : 'Knowledge Base'),
      number: currentNumber++,
      status: 'ready',
      retrievedChunk: c.retrievedChunk,
      similarity: c.similarity,
      pageNumber: c.pageNumber,
      totalPages: c.totalPages || matchedWorkspaceSource?.totalPages,
      timelineSegment: c.timelineSegment,
      chunkId: c.chunk_id,
      chunks: [chunkItem],
      pagesText,
    })
  })

  return Array.from(groupedMap.values())
}
