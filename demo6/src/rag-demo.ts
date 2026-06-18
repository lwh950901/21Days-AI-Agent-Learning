import { chunkMarkdown } from "./chunking.ts";
import { createSiliconFlowEmbedder } from "./embeddings.ts";
import { createLocalKeywordEmbedder } from "./local-embedding.ts";
import { answerWithRetrievedContext } from "./rag.ts";
import { createInMemoryVectorStore } from "./vector-store.ts";

import type { ChunkingStrategy, SearchMode } from "./types.ts";

export type RagDemoInput = {
  markdown: string;
  query: string;
  source: string;
  maxLength: number;
  topK: number;
  minScore: number;
  useRealEmbeddings: boolean;
  useLlmAnswer: boolean;
  chunkingStrategy: ChunkingStrategy;
  searchMode: SearchMode;
};

export async function runRagDemo(input: RagDemoInput) {
  const chunks = chunkMarkdown(input.markdown, {
    source: input.source,
    maxLength: input.maxLength,
    strategy: input.chunkingStrategy,
  });

  const embed = input.useRealEmbeddings
    ? createSiliconFlowEmbedder()
    : createLocalKeywordEmbedder();

  const store = createInMemoryVectorStore({ embed });
  await store.index(chunks);

  let generateAnswer: ((context: string, query: string) => Promise<string>) | undefined;
  if (input.useLlmAnswer) {
    const { generateRagAnswer } = await import("./rag-llm.ts");
    generateAnswer = generateRagAnswer;
  }

  const ragResult = await answerWithRetrievedContext(
    store,
    {
      query: input.query,
      topK: input.topK,
      minScore: input.minScore,
      searchMode: input.searchMode,
    },
    generateAnswer,
  );

  return {
    chunks,
    ...ragResult,
    embeddingMode: input.useRealEmbeddings ? "siliconflow-bge-m3" : "local-keyword",
    answerMode: input.useLlmAnswer ? "deepseek-llm" : "template",
    searchMode: input.searchMode,
  };
}
