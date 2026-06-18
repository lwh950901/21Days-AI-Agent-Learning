import type { QualityLog, RetrievedChunk, SearchMode } from "./types.ts";
import type { VectorStore } from "./vector-store.ts";

export async function retrieveRelevantChunks(
  store: VectorStore,
  options: {
    query: string;
    topK: number;
    minScore: number;
    searchMode?: SearchMode;
  },
): Promise<RetrievedChunk[]> {
  return store.search(options.query, {
    topK: options.topK,
    minScore: options.minScore,
    searchMode: options.searchMode,
  });
}

export function buildContext(results: RetrievedChunk[]) {
  return results
    .map((result, index) => {
      const source = result.chunk.metadata.headingPath
        ? `${result.chunk.metadata.source} / ${result.chunk.metadata.headingPath}`
        : result.chunk.metadata.source;

      return [`[${index + 1}] ${source}`, result.chunk.text].join("\n");
    })
    .join("\n\n---\n\n");
}

function createQualityLog(
  query: string,
  topK: number,
  minScore: number,
  results: RetrievedChunk[],
  allRetrieved: RetrievedChunk[],
): QualityLog {
  const hasAnswer = results.length > 0;

  // results: 高于 minScore 的 chunk
  // allRetrieved: 所有检索到的 chunk（含低于 minScore 被过滤的）
  let reason: QualityLog["reason"];
  if (hasAnswer) {
    reason = "answered";
  } else if (allRetrieved.length > 0) {
    reason = "low_relevance";
  } else {
    reason = "no_chunks";
  }

  return {
    query,
    topK,
    minScore,
    retrievedCount: results.length,
    hasAnswer,
    reason,
    matchedChunks: results.map((result) => ({
      id: result.chunk.id,
      source: result.chunk.metadata.source,
      headingPath: result.chunk.metadata.headingPath,
      score: Number(result.score.toFixed(4)),
      vectorScore: Number(result.vectorScore.toFixed(4)),
      keywordScore: Number(result.keywordScore.toFixed(4)),
    })),
  };
}

export async function answerWithRetrievedContext(
  store: VectorStore,
  options: {
    query: string;
    topK: number;
    minScore: number;
    searchMode?: SearchMode;
  },
  generateAnswer?: (context: string, query: string) => Promise<string>,
) {
  // 先获取全部 topK 结果（不设 minScore），用于质量日志分析
  const allRetrieved = await retrieveRelevantChunks(store, {
    ...options,
    minScore: -1,
  });

  // 再按 minScore 过滤得到有效结果
  const results = allRetrieved.filter((r) => r.score >= options.minScore);
  const hasAnswer = results.length > 0;
  const context = buildContext(results);
  const qualityLog = createQualityLog(
    options.query,
    options.topK,
    options.minScore,
    results,
    allRetrieved,
  );

  if (!hasAnswer) {
    return {
      answer: "暂未检索到相关内容。",
      context,
      retrievedChunks: results,
      hasAnswer,
      qualityLog,
    };
  }

  const answer = generateAnswer
    ? await generateAnswer(context, options.query)
    : `基于检索到的 ${results.length} 个片段：\n\n${context}`;

  return {
    answer,
    context,
    retrievedChunks: results,
    hasAnswer,
    qualityLog,
  };
}
