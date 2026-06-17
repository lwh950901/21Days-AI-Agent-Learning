import { join } from "node:path";

import { createDeepSeekPrdDraft } from "../../../../src/deepseek-prd-generator.ts";
import { runStatePersistenceDemo } from "../../../../src/demo.ts";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { idea?: string };
    const idea = body.idea?.trim();

    if (!idea) {
      return Response.json(
        { error: "IDEA_REQUIRED", message: "请输入一个产品想法。" },
        { status: 422 },
      );
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_deepseek_api_key_here") {
      return Response.json(
        {
          error: "API_KEY_MISSING",
          message: "请配置 .env.local 中的 OPENAI_API_KEY。复制 .env.example 为 .env.local 并填入你的 DeepSeek API Key。",
        },
        { status: 422 },
      );
    }

    const threadId = `run_${Date.now()}`;
    const checkpointDir = join(process.cwd(), "data", "checkpoints");

    const result = await runStatePersistenceDemo({
      checkpointDir,
      threadId,
      idea,
      generatePrd: createDeepSeekPrdDraft,
    });

    return Response.json(result);
  } catch (error) {
    console.error("Workflow start failed", error);
    return Response.json(
      {
        error: "WORKFLOW_START_FAILED",
        message:
          "工作流启动失败。请确认 .env.local 已配置 OPENAI_API_KEY，并且 DeepSeek API 可访问。",
      },
      { status: 500 },
    );
  }
}
