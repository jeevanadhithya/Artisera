import { BENCHMARK_CATALOG, BenchmarkItem } from './marketData';

export interface SimilarProduct {
  id: string;
  title: string;
  category: string;
  sellingPrice: number;
  sourcePlatform: string;
  description: string;
  similarityScore: number; // 0.0 to 1.0
  matchQuality: 'excellent' | 'good' | 'fair';
  provenance?: string;
  productUrl?: string;
}

/**
 * Tokenize and normalize text into word stems for semantic keyword matching.
 */
function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(words);
}

/**
 * Compute Jaccard / Cosine token overlap similarity between two text strings.
 */
function computeSimilarity(textA: string, textB: string): number {
  const setA = tokenize(textA);
  const setB = tokenize(textB);

  if (setA.size === 0 || setB.size === 0) return 0.2;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Retrieve top-K comparable benchmark products scored by semantic match to query.
 */
export function findSimilarBenchmarks(
  query: {
    title?: string;
    description?: string;
    category?: string;
    material?: string;
  },
  topK: number = 5,
  similarityThreshold: number = 0.15
): SimilarProduct[] {
  const queryText = `${query.title || ''} ${query.description || ''} ${query.category || ''} ${query.material || ''}`;
  const targetCategory = query.category?.toLowerCase().trim();

  const scored: SimilarProduct[] = BENCHMARK_CATALOG.map((item) => {
    const itemText = `${item.title} ${item.description} ${item.category} ${item.provenance || ''}`;
    let baseSim = computeSimilarity(queryText, itemText);

    // Boost if in same or related category
    if (targetCategory && item.category.toLowerCase().includes(targetCategory)) {
      baseSim = Math.min(1.0, baseSim + 0.35);
    }

    // Assign realistic floor so authentic catalog items provide guidance
    const finalScore = Math.min(0.96, Math.max(0.25, baseSim + 0.20));

    let matchQuality: 'excellent' | 'good' | 'fair' = 'fair';
    if (finalScore >= 0.75) matchQuality = 'excellent';
    else if (finalScore >= 0.55) matchQuality = 'good';

    return {
      id: item.id,
      title: item.title,
      category: item.category,
      sellingPrice: item.price,
      sourcePlatform: item.platform,
      description: item.description,
      similarityScore: Number(finalScore.toFixed(2)),
      matchQuality,
      provenance: item.provenance,
    };
  });

  // Sort descending by similarity score
  scored.sort((a, b) => b.similarityScore - a.similarityScore);

  const filtered = scored.filter((p) => p.similarityScore >= similarityThreshold);
  return filtered.slice(0, topK);
}
