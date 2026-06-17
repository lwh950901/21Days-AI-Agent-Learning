import { generateText } from "ai";

import { getFastModel } from "./model.ts";
import type { ProductCraftAgentState } from "./checkpoint-store.ts";

export async function createDeepSeekPrdDraft(
  state: ProductCraftAgentState,
): Promise<string> {
  // DeepSeek 接入沿用 demo3 的 OpenAI-compatible 模式，由 model.ts 集中管理模型配置。
  const result = await generateText({
    model: getFastModel(),
    temperature: 0.2,
    maxOutputTokens: 900,
    maxRetries: 1,
    timeout: 20000,
    prompt: [
      "你是 ProductCraft 的产品经理节点。",
      "根据当前 Agent State 生成一版简洁 PRD 草稿。",
      "只输出 Markdown，不要解释工作流机制。",
      "",
      `产品想法：${state.idea}`,
      `已澄清需求：${state.clarifiedRequirements.join("；")}`,
      `目标用户：${state.targetUsers ?? "尚未明确，请给出合理假设"}`,
      "",
      "PRD 必须包含：目标用户、核心问题、MVP 功能、验收标准、风险。",
    ].join("\n"),
  });

  return result.text;
}
