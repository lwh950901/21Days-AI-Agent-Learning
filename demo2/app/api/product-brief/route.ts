import { generateText } from "ai";
import { getModel } from "../../../lib/ai/model";
import { buildProductBriefPrompt, validateProductIdea } from "../../../lib/productcraft/generation";
import { productBriefSchema } from "../../../lib/productcraft/schema";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { idea }: { idea?: string } = await req.json();
    const validation = validateProductIdea(idea ?? "");

    if (!validation.success) {
      return Response.json(
        {
          error: "PRODUCT_IDEA_TOO_VAGUE",
          message: "请补充目标用户、要解决的痛点或首版核心功能后再生成。",
        },
        { status: 422 },
      );
    }

    const { text } = await generateText({
      model: getModel("fast"),
      prompt: buildProductBriefPrompt(validation.data.idea),
      temperature: 0.2,
      maxRetries: 1,
      timeout: 30000,
      providerOptions: {
        openai: {
          responseFormat: { type: "json_object" },
        },
      },
    });

    console.log("=== Zod Schema Shape ===");
    console.log(JSON.stringify(productBriefSchema.shape, null, 2));
    console.log("=== LLM Raw Response ===");
    console.log(text);

    // DeepSeek 不支持 json_schema，用 json_object + 手动 Zod 校验
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || start >= end) {
      console.error("No valid JSON object in response:", text);
      throw new Error("No valid JSON object found in model response");
    }
    const jsonStr = text.slice(start, end + 1);
    const output = productBriefSchema.parse(JSON.parse(jsonStr));
    return Response.json({ brief: output });
  } catch (error) {
    console.error("ProductBrief extraction failed", error);
    return Response.json(
      {
        error: "PRODUCT_BRIEF_PARSE_FAILED",
        message: "产品简报生成失败，请补充更明确的目标用户、痛点或核心功能。",
      },
      { status: 422 },
    );
  }
}
