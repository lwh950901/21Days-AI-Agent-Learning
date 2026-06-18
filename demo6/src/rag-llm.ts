import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export async function generateRagAnswer(
  context: string,
  query: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_deepseek_api_key_here") {
    return `基于检索到的上下文（未配置 LLM，返回原始上下文）：\n\n${context}`;
  }

  const openai = createOpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL ?? "https://api.deepseek.com",
  });
  const modelId = process.env.AI_MODEL_FAST ?? "deepseek-v4-flash";

  const { text } = await generateText({
    model: openai.chat(modelId),
    temperature: 0.1,
    maxOutputTokens: 600,
    timeout: 15000,
    system: `你是 RAG 问答助手。只根据以下检索到的上下文回答问题。如果上下文中找不到答案，请明确说"根据现有资料无法回答"。不要编造信息。`,
    prompt: `上下文：\n${context}\n\n问题：${query}\n\n请基于以上上下文回答：`,
  });

  return text;
}
