import { generateId } from './utils'
import type { Source, SourceChunk } from '../types'

/** Normalize live SSE citations, DB MessageCitation rows, or stored message.sources JSON. */
export function normalizeCitationInput(c: any, idx: number) {
  return {
    citationNumber: c.citationNumber ?? c.number ?? idx + 1,
    chunk_id: c.chunk_id || c.chunkId || undefined,
    source_id: c.source_id || c.sourceId || undefined,
    source_type: c.source_type || c.sourceType || 'text',
    title: c.title,
    url: c.url,
    domain: c.domain,
    pageNumber: c.pageNumber ?? c.page,
    similarity: c.similarity ?? c.score,
    retrievedChunk: c.retrievedChunk || c.snippet || c.retrieved_chunk || '',
    timelineSegment: c.timelineSegment,
    totalPages: c.totalPages,
  }
}

/**
 * Group citations by document (source_id), not by chunk.
 * Each document Source holds all retrieved chunks; citationNumber on each chunk
 * keeps [1]…[n] and Cited Sources pills working.
 */
export function mapCitationsToSources(
  citations: any[],
  activeNotebookSources: Source[],
  notebookId: string
): Source[] {
  if (!citations.length) return []

  const groupedMap = new Map<string, Source>()
  let documentNumber = 1

  citations.forEach((raw: any, idx: number) => {
    const c = normalizeCitationInput(raw, idx)

    const matchByChunkId = c.chunk_id
      ? activeNotebookSources.find(
          (s) => s.chunkId === c.chunk_id || s.chunks?.some((ch) => ch.chunkId === c.chunk_id)
        )
      : undefined
    const matchByStoreId = c.source_id
      ? activeNotebookSources.find((s) => s.id === c.source_id)
      : undefined
    const matchedWorkspaceSource = matchByStoreId || matchByChunkId

    // One card per document — never key by chunk_id
    const key =
      matchedWorkspaceSource?.id ||
      c.source_id ||
      c.title ||
      'unknown-src'

    const chunkItem: SourceChunk = {
      chunkId: c.chunk_id,
      retrievedChunk: c.retrievedChunk,
      pageNumber: c.pageNumber,
      similarity: c.similarity,
      timelineSegment: c.timelineSegment,
      citationNumber: c.citationNumber,
    }

    const existing = groupedMap.get(key)
    if (existing) {
      existing.chunks = existing.chunks || []
      existing.chunks.push(chunkItem)
      const pagesSet = new Set<number>()
      existing.chunks.forEach((ch) => {
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
      rawType === 'text' && matchedWorkspaceSource?.type
        ? matchedWorkspaceSource.type
        : (rawType as Source['type'])

    groupedMap.set(key, {
      id: matchedWorkspaceSource?.id || c.source_id || generateId(),
      notebookId,
      type: sourceType,
      title: matchedWorkspaceSource?.title || c.title || 'Knowledge Base Source',
      url: c.url || matchedWorkspaceSource?.url,
      domain:
        c.domain ||
        matchedWorkspaceSource?.domain ||
        (c.url
          ? (() => {
              try {
                return new URL(c.url).hostname
              } catch {
                return 'Knowledge Base'
              }
            })()
          : 'Knowledge Base'),
      number: documentNumber++,
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

export type CitationPill = {
  citationNumber: number
  source: Source
  chunk: SourceChunk
}

/** Expand document-grouped sources into one pill/target per citation number. */
export function getCitationPills(sources?: Source[]): CitationPill[] {
  if (!sources?.length) return []

  const pills: CitationPill[] = []
  for (const source of sources) {
    if (source.chunks && source.chunks.length > 0) {
      for (const chunk of source.chunks) {
        pills.push({
          citationNumber: chunk.citationNumber ?? source.number,
          source,
          chunk,
        })
      }
    } else {
      pills.push({
        citationNumber: source.number,
        source,
        chunk: {
          chunkId: source.chunkId,
          retrievedChunk: source.retrievedChunk || '',
          pageNumber: source.pageNumber,
          similarity: source.similarity,
          citationNumber: source.number,
        },
      })
    }
  }

  return pills.sort((a, b) => a.citationNumber - b.citationNumber)
}

export function findCitationByNumber(
  sources: Source[] | undefined,
  sourceNum: number
): CitationPill | null {
  return getCitationPills(sources).find((p) => p.citationNumber === sourceNum) || null
}

/** Build inspector override focused on the clicked citation, keeping all sibling chunks. */
export function sourceForCitationOpen(pill: CitationPill): Source {
  return {
    ...pill.source,
    chunkId: pill.chunk.chunkId,
    pageNumber: pill.chunk.pageNumber,
    retrievedChunk: pill.chunk.retrievedChunk,
    similarity: pill.chunk.similarity,
  }
}
