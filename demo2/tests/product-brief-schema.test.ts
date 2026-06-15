import { describe, expect, test } from "vitest";
import { productBriefSchema } from "../lib/productcraft/schema";

describe("productBriefSchema", () => {
  test("accepts a minimal ProductBrief draft", () => {
    const result = productBriefSchema.safeParse({
      productName: "PDFPilot",
      oneSentencePitch: "帮助知识工作者快速理解长 PDF 的 AI 助手。",
      targetUsers: ["知识工作者"],
      painPoints: ["长 PDF 阅读耗时"],
      coreFeatures: ["总结 PDF", "生成问答"],
      competitors: [],
      pricing: null,
      confidence: 0.72,
    });

    expect(result.success).toBe(true);
  });

  test("rejects a brief without target users", () => {
    const result = productBriefSchema.safeParse({
      productName: "PDFPilot",
      oneSentencePitch: "帮助知识工作者快速理解长 PDF 的 AI 助手。",
      targetUsers: [],
      painPoints: ["长 PDF 阅读耗时"],
      coreFeatures: ["总结 PDF"],
      competitors: [],
      pricing: null,
      confidence: 0.72,
    });

    expect(result.success).toBe(false);
  });
});
