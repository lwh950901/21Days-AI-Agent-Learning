import type { Chunk, RetrievedChunk, SearchMode } from "./types.ts";

export type EmbedTexts = (texts: string[]) => Promise<number[][]>;

export type VectorStore = {
  index(chunks: Chunk[]): Promise<void>;
  search(
    query: string,
    options: { topK: number; minScore: number; searchMode?: SearchMode },
  ): Promise<RetrievedChunk[]>;
};

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function extractKeywordTerms(text: string) {
  const normalized = text.toLowerCase();
  const asciiTerms = normalized.match(/[a-z]+[-_]?\d+|\d+(?:\.\d+)+|[a-z_][a-z0-9_]+/g) ?? [];
  const cjkTerms = Array.from(normalized.matchAll(/[\p{Script=Han}]{2,}/gu)).flatMap(
    (match) => {
      const chars = Array.from(match[0]);
      const bigrams: string[] = [];
      for (let i = 0; i < chars.length - 1; i++) {
        bigrams.push(chars[i] + chars[i + 1]);
      }
      return bigrams;
    },
  );

  return Array.from(new Set([...asciiTerms, ...cjkTerms]));
}

export function keywordScore(query: string, text: string) {
  const terms = extractKeywordTerms(query);
  if (terms.length === 0) return 0;

  const normalizedText = text.toLowerCase();
  const matched = terms.filter((term) => normalizedText.includes(term));
  return matched.length / terms.length;
}

function combineScores(
  vectorScore: number,
  exactScore: number,
  searchMode: SearchMode,
) {
  if (searchMode === "keyword") return exactScore;
  if (searchMode === "hybrid") return vectorScore * 0.7 + exactScore * 0.3;
  return vectorScore;
}

export function createInMemoryVectorStore(options: { embed: EmbedTexts }): VectorStore {
  const records: Array<{ chunk: Chunk; embedding: number[] }> = [];

  return {
    async index(chunks) {
      const embeddings = await options.embed(chunks.map((chunk) => chunk.text));

      for (let i = 0; i < chunks.length; i++) {
        records.push({ chunk: chunks[i], embedding: embeddings[i] });
      }
    },

    async search(query, { topK, minScore, searchMode = "vector" }) {
      const [queryEmbedding] = await options.embed([query]);

      return records
        .map((record) => {
          const vectorScore = cosineSimilarity(queryEmbedding, record.embedding);
          const exactScore = keywordScore(query, record.chunk.text);

          return {
            chunk: record.chunk,
            score: combineScores(vectorScore, exactScore, searchMode),
            vectorScore,
            keywordScore: exactScore,
          };
        })
        .filter((result) => result.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    },
  };
}
