import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const EMBEDDING_MODEL = "BAAI/bge-m3";
const DEFAULT_BASE_URL = "https://api.siliconflow.cn/v1";

export type EmbeddingClientOptions = {
  apiKey?: string;
  baseUrl?: string;
  cacheDir?: string;
};

function hashText(model: string, text: string) {
  return createHash("sha256").update(`${model}:${text}`).digest("hex");
}

async function readCachedEmbedding(cacheDir: string, key: string) {
  try {
    const raw = await readFile(join(cacheDir, `${key}.json`), "utf8");
    return JSON.parse(raw) as number[];
  } catch {
    return null;
  }
}

async function writeCachedEmbedding(cacheDir: string, key: string, embedding: number[]) {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(join(cacheDir, `${key}.json`), JSON.stringify(embedding));
}

export function createSiliconFlowEmbedder(options: EmbeddingClientOptions = {}) {
  const apiKey = options.apiKey ?? process.env.SILICONFLOW_API_KEY;
  const baseUrl = options.baseUrl ?? process.env.SILICONFLOW_BASE_URL ?? DEFAULT_BASE_URL;
  const cacheDir = options.cacheDir ?? ".cache/embeddings";

  return async function embed(texts: string[]): Promise<number[][]> {
    if (!apiKey) {
      throw new Error("Missing SILICONFLOW_API_KEY for embedding API calls.");
    }

    const results: Array<number[] | null> = [];
    const uncachedTexts: string[] = [];
    const uncachedIndexes: number[] = [];

    for (let i = 0; i < texts.length; i++) {
      const key = hashText(EMBEDDING_MODEL, texts[i]);
      const cached = await readCachedEmbedding(cacheDir, key);
      results[i] = cached;

      if (!cached) {
        uncachedTexts.push(texts[i]);
        uncachedIndexes.push(i);
      }
    }

    if (uncachedTexts.length > 0) {
      const response = await fetch(`${baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: uncachedTexts,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API failed: ${response.status} ${await response.text()}`);
      }

      const payload = (await response.json()) as {
        data: Array<{ embedding: number[] }>;
      };

      for (let i = 0; i < payload.data.length; i++) {
        const embedding = payload.data[i].embedding;
        const originalIndex = uncachedIndexes[i];
        const key = hashText(EMBEDDING_MODEL, texts[originalIndex]);
        results[originalIndex] = embedding;
        await writeCachedEmbedding(cacheDir, key, embedding);
      }
    }

    return results.map((embedding) => {
      if (!embedding) throw new Error("Embedding result missing after API call.");
      return embedding;
    });
  };
}
