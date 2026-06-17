import { createOpenAI } from "@ai-sdk/openai";

let fastModel: ReturnType<ReturnType<typeof createOpenAI>["chat"]> | null = null;

function getOpenAICompatibleProvider() {
  return createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL ?? "https://api.deepseek.com",
  });
}

export function getFastModel() {
  if (!fastModel) {
    const id = process.env.AI_MODEL_FAST ?? "deepseek-v4-flash";
    console.log("Initializing fast model:", id);
    fastModel = getOpenAICompatibleProvider().chat(id);
  }

  return fastModel;
}
