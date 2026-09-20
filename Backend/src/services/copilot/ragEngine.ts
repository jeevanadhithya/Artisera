import { getPool } from '../db';
import { EmbeddingService } from './embeddingService';
import { VERIFIED_KNOWLEDGE_BASE } from './knowledgeBase';

export interface GuideCitation {
  id: string;
  title: string;
  language: string;
  topic: string;
  scheme_or_marketplace?: string;
  official_source_url: string;
  last_verified_date: string;
  document_version: string;
  state_applicability?: string[];
  is_translated?: boolean;
  key_takeaways: string[];
  relevance_score: number;
}

export type RAGCitation = GuideCitation;

export interface VectorRetrievalResult {
  citations: GuideCitation[];
  documents: GuideCitation[];
  contextString: string;
  hasSufficientKnowledge: boolean;
  dominantSchemeOrMarketplace?: string;
  languageUsed: string;
  isTranslatedFallback: boolean;
}

export class RAGEngine {
  /**
   * Vector-based semantic document retrieval with preferred-language priority
   * and verified English fallback.
   */
  public static async retrieve(
    query: string,
    preferredLanguage: string = 'en',
    schemeOrMarketplaceFilter?: string,
    maxDocuments: number = 3
  ): Promise<VectorRetrievalResult> {
    const cleanQuery = (query || '').trim();
    const queryVector = await EmbeddingService.generateEmbedding(cleanQuery);

    const pool = getPool();
    let dbDocs: any[] = [];

    try {
      let sql = `
        SELECT id, title, language, topic, scheme_or_marketplace, official_source_url,
               last_verified_date, document_version, state_applicability, content,
               key_takeaways, embedding
        FROM public.guide_knowledge_documents
      `;
      const params: any[] = [];
      if (schemeOrMarketplaceFilter) {
        sql += ` WHERE scheme_or_marketplace = $1`;
        params.push(schemeOrMarketplaceFilter);
      }
      const res = await pool.query(sql, params);
      dbDocs = res.rows;
    } catch {
      // If DB is offline, fall back to VERIFIED_KNOWLEDGE_BASE
    }

    // If DB is empty, map from in-memory verified knowledge base
    if (dbDocs.length === 0) {
      dbDocs = VERIFIED_KNOWLEDGE_BASE.map(k => ({
        id: k.id,
        title: k.title,
        language: k.language || 'en',
        topic: k.topic,
        scheme_or_marketplace: k.platform,
        official_source_url: k.sourceUrl,
        last_verified_date: k.lastVerifiedDate,
        document_version: k.documentVersion,
        state_applicability: ['All India'],
        content: k.content,
        key_takeaways: k.keyTakeaways,
        embedding: EmbeddingService.deterministicEmbedding(`${k.title} ${k.content} ${k.keyTakeaways.join(' ')}`),
      }));
    }

    // 1. Score documents using Vector Cosine Similarity
    const scoredDocs = dbDocs.map(doc => {
      const docEmbedding = Array.isArray(doc.embedding) ? doc.embedding : [];
      const similarity = EmbeddingService.cosineSimilarity(queryVector, docEmbedding);
      return { doc, score: similarity };
    });

    // 2. Language-priority search: Look for matches in user's preferred language first
    const targetLang = (preferredLanguage || 'en').toLowerCase().substring(0, 2);
    const langMatches = scoredDocs
      .filter(item => item.doc.language === targetLang)
      .sort((a, b) => b.score - a.score);

    let finalTopDocs: { doc: any; score: number; isTranslated: boolean }[] = [];
    let isTranslatedFallback = false;

    if (langMatches.length > 0 && langMatches[0].score >= 0.25) {
      finalTopDocs = langMatches.slice(0, maxDocuments).map(item => ({
        doc: item.doc,
        score: item.score,
        isTranslated: false,
      }));
    } else {
      // Fall back to English verified documents
      const englishMatches = scoredDocs
        .filter(item => item.doc.language === 'en')
        .sort((a, b) => b.score - a.score);

      finalTopDocs = englishMatches.slice(0, maxDocuments).map(item => ({
        doc: item.doc,
        score: item.score,
        isTranslated: targetLang !== 'en',
      }));
      isTranslatedFallback = targetLang !== 'en' && finalTopDocs.length > 0;
    }

    const hasSufficientKnowledge = finalTopDocs.length > 0 && finalTopDocs[0].score >= 0.15;

    // Build Citations
    const citations: GuideCitation[] = finalTopDocs.map(item => ({
      id: item.doc.id,
      title: item.doc.title,
      language: item.doc.language,
      topic: item.doc.topic,
      scheme_or_marketplace: item.doc.scheme_or_marketplace,
      official_source_url: item.doc.official_source_url,
      last_verified_date: item.doc.last_verified_date instanceof Date
        ? item.doc.last_verified_date.toISOString().slice(0, 10)
        : String(item.doc.last_verified_date || '2026-09-01'),
      document_version: item.doc.document_version,
      state_applicability: item.doc.state_applicability || ['All India'],
      is_translated: item.isTranslated,
      key_takeaways: Array.isArray(item.doc.key_takeaways) ? item.doc.key_takeaways : [],
      relevance_score: Math.min(100, Math.round(item.score * 100)),
    }));

    // Build Context String for LLM
    const contextLines: string[] = [];
    for (const item of finalTopDocs) {
      const d = item.doc;
      const translationBadge = item.isTranslated ? ' [TRANSLATED FROM VERIFIED SOURCE]' : '';
      contextLines.push(`---
DOCUMENT: ${d.title}${translationBadge} (Language: ${d.language}, Topic: ${d.topic}, Version: ${d.document_version}, Verified: ${d.last_verified_date})
OFFICIAL SOURCE: ${d.official_source_url}
STATE APPLICABILITY: ${(d.state_applicability || ['All India']).join(', ')}
CONTENT:
${d.content}
KEY TAKEAWAYS:
${(Array.isArray(d.key_takeaways) ? d.key_takeaways : []).map((k: string) => `• ${k}`).join('\n')}
---`);
    }

    const dominantSchemeOrMarketplace = finalTopDocs.find(d => d.doc.scheme_or_marketplace)?.doc.scheme_or_marketplace;

    return {
      citations,
      documents: citations,
      contextString: contextLines.join('\n\n'),
      hasSufficientKnowledge,
      dominantSchemeOrMarketplace,
      languageUsed: isTranslatedFallback ? 'en (translated)' : targetLang,
      isTranslatedFallback,
    };
  }
}
