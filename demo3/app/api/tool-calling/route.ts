import { generateText, stepCountIs } from "ai";
import { getModel } from "../../../lib/ai/model";
import { productBriefSchema } from "../../../lib/productcraft/schema";
import {
  buildToolCallingPrompt,
  createProductCraftTools,
  type ToolCallLog,
} from "../../../lib/productcraft/tools";

export const maxDuration = 30;

export async function POST(req: Request) {
  const logs: ToolCallLog[] = [];

  try {
    const { message, brief }: { message?: string; brief?: unknown } = await req.json();
    const trimmedMessage = message?.trim();

    if (!trimmedMessage) {
      return Response.json(
        {
          error: "TOOL_MESSAGE_REQUIRED",
          message: "请先输入要让 ProductCraft 执行的工具任务。",
        },
        { status: 422 },
      );
    }

    const parsedBrief = brief ? productBriefSchema.safeParse(brief) : null;

    if (brief && !parsedBrief?.success) {
      return Response.json(
        {
          error: "INVALID_PRODUCT_BRIEF",
          message: "当前 ProductBrief 不符合 Schema，请先修正字段后再调用工具。",
        },
        { status: 422 },
      );
    }

    const result = await generateText({
      model: getModel("fast"),
      tools: createProductCraftTools(logs),
      stopWhen: stepCountIs(3),
      prompt: buildToolCallingPrompt(trimmedMessage, parsedBrief?.data ?? null),
      temperature: 0.2,
      maxOutputTokens: 800,
      maxRetries: 1,
      timeout: 15000,
    });

    return Response.json({
      answer: result.text,
      logs,
      stepCount: result.steps.length,
    });
  } catch (error) {
    console.error("Tool calling failed", error);
    return Response.json(
      {
        error: "TOOL_CALLING_FAILED",
        message: "工具调用失败，请稍后重试或改用更明确的任务描述。",
        logs,
      },
      { status: 422 },
    );
  }
}
