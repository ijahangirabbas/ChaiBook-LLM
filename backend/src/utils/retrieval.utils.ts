import { VectorSearchResult } from '../vectorstore/base.vectorstore';

export const MIN_SIMILARITY_SCORE = 0.3;

export function filterByMinScore(
  results: VectorSearchResult[],
  minScore = MIN_SIMILARITY_SCORE
): VectorSearchResult[] {
  return results.filter((r) => r.score >= minScore);
}

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Maximal Marginal Relevance — reduce near-duplicate chunks in results. */
export function applyMMR(
  results: VectorSearchResult[],
  topK: number,
  lambda = 0.7
): VectorSearchResult[] {
  if (results.length <= topK) return results;

  const tokenized = results.map((r) => tokenSet(r.document.pageContent));
  const selected: VectorSearchResult[] = [];
  const selectedIdx = new Set<number>();

  while (selected.length < topK && selected.length < results.length) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < results.length; i++) {
      if (selectedIdx.has(i)) continue;

      const relevance = results[i].score;
      let maxSimToSelected = 0;
      for (const sel of selectedIdx) {
        maxSimToSelected = Math.max(maxSimToSelected, jaccardSimilarity(tokenized[i], tokenized[sel]));
      }

      const mmrScore = lambda * relevance - (1 - lambda) * maxSimToSelected;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;
    selectedIdx.add(bestIdx);
    selected.push(results[bestIdx]);
  }

  return selected;
}

/** Lightweight keyword-overlap rerank on top of vector scores. */
export function rerankByKeywordOverlap(
  query: string,
  results: VectorSearchResult[]
): VectorSearchResult[] {
  const queryTokens = tokenSet(query);
  if (queryTokens.size === 0) return results;

  return [...results]
    .map((r) => {
      const docTokens = tokenSet(r.document.pageContent);
      let overlap = 0;
      for (const t of queryTokens) {
        if (docTokens.has(t)) overlap++;
      }
      const boost = overlap / queryTokens.size;
      return { result: r, score: r.score + boost * 0.15 };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => ({ ...item.result, score: item.score }));
}
