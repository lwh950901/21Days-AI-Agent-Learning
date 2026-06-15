import { tool } from "ai";
import { z } from "zod";
import { productBriefSchema, type ProductBrief } from "./schema";

export const searchCompetitorsInputSchema = z.object({
  query: z.string().min(2).describe("产品方向、目标用户或核心痛点关键词"),
  limit: z.number().min(1).max(5).default(3).describe("返回竞品数量，最多 5 个"),
});

export const saveProjectInputSchema = z.object({
  projectName: z.string().min(1).max(40).describe("项目名称"),
  brief: productBriefSchema.describe("用户确认后的 ProductBrief"),
});

export type SearchCompetitorsInput = z.infer<typeof searchCompetitorsInputSchema>;
export type SaveProjectInput = z.infer<typeof saveProjectInputSchema>;

export type ToolRisk = "readonly" | "business";

export type ToolCallLog = {
  id: string;
  toolName: "searchCompetitors" | "saveProject";
  risk: ToolRisk;
  status: "success" | "error";
  input: unknown;
  result: unknown;
  createdAt: string;
};

const COMPETITOR_CANDIDATES = [
  {
    name: "Durable",
    positioning: "AI website builder for small businesses",
    relevance: 0.84,
  },
  {
    name: "Framer AI",
    positioning: "AI-assisted website and landing page creation",
    relevance: 0.79,
  },
  {
    name: "Mixo",
    positioning: "快速生成创业项目落地页",
    relevance: 0.73,
  },
  {
    name: "Typedream",
    positioning: "面向创作者和创业者的无代码网站搭建",
    relevance: 0.66,
  },
  {
    name: "Gamma",
    positioning: "用 AI 生成演示文稿和网页内容",
    relevance: 0.61,
  },
];

export async function searchCompetitorsForDemo({ query, limit }: SearchCompetitorsInput) {
  if (query.toLowerCase().includes("timeout")) {
    return {
      ok: false as const,
      error: "SEARCH_TIMEOUT" as const,
      message: "竞品搜索超时，请稍后重试。",
    };
  }

  return {
    ok: true as const,
    competitors: COMPETITOR_CANDIDATES.slice(0, limit),
  };
}

export async function saveProjectForDemo({ projectName }: SaveProjectInput) {
  if (projectName.toLowerCase().includes("fail")) {
    return {
      ok: false as const,
      error: "PROJECT_SAVE_FAILED" as const,
      message: "项目保存失败，请稍后重试。",
    };
  }

  return {
    ok: true as const,
    projectId: `proj_${crypto.randomUUID().slice(0, 8)}`,
    status: "saved" as const,
    savedAt: new Date().toISOString(),
  };
}

export function toToolCallLog({
  toolName,
  risk,
  input,
  result,
}: {
  toolName: ToolCallLog["toolName"];
  risk: ToolRisk;
  input: unknown;
  result: unknown;
}) {
  return {
    id: `log_${crypto.randomUUID().slice(0, 8)}`,
    toolName,
    risk,
    status: isToolResultOk(result) ? ("success" as const) : ("error" as const),
    input,
    result,
    createdAt: new Date().toISOString(),
  };
}

export function createProductCraftTools(logs: ToolCallLog[]) {
  return {
    searchCompetitors: tool({
      description:
        "当用户需要查找某个产品方向的竞品时使用。该工具只读，不保存项目，也不修改 ProductBrief。",
      inputSchema: searchCompetitorsInputSchema,
      execute: async (input) => {
        const result = await searchCompetitorsForDemo(input);
        logs.push(
          toToolCallLog({
            toolName: "searchCompetitors",
            risk: "readonly",
            input,
            result,
          }),
        );
        return result;
      },
    }),
    saveProject: tool({
      description:
        "只在用户明确要求保存当前 ProductBrief 时使用。该工具会写入项目存储，属于业务工具。",
      inputSchema: saveProjectInputSchema,
      execute: async (input) => {
        const result = await saveProjectForDemo(input);
        logs.push(
          toToolCallLog({
            toolName: "saveProject",
            risk: "business",
            input: { projectName: input.projectName, briefProductName: input.brief.productName },
            result,
          }),
        );
        return result;
      },
    }),
  };
}

function isToolResultOk(result: unknown) {
  return Boolean(
    result &&
      typeof result === "object" &&
      "ok" in result &&
      (result as { ok?: unknown }).ok === true,
  );
}

export function buildToolCallingPrompt(message: string, brief: ProductBrief | null) {
  const briefContext = brief
    ? `\n当前 ProductBrief：\n${JSON.stringify(brief)}`
    : "\n当前还没有 ProductBrief。";

  return `你是 ProductCraft 的工具调度助手。根据用户请求决定是否调用工具。

规则：
1. 用户需要竞品信息时，调用 searchCompetitors。
2. 用户明确要求保存项目时，调用 saveProject。
3. 不要调用未提供的工具。
4. 工具失败时，用工具返回的业务错误说明下一步。

用户请求：
${message.trim()}
${briefContext}`;
}
