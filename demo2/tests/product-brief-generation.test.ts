import { describe, expect, test } from "vitest";
import { buildProductBriefPrompt, validateProductIdea } from "../lib/productcraft/generation";

describe("validateProductIdea", () => {
  test("rejects vague product ideas before calling the model", () => {
    const result = validateProductIdea("做个 AI 工具");

    expect(result.success).toBe(false);
  });

  test("accepts a product idea with user and problem context", () => {
    const result = validateProductIdea(
      "我想做一个面向独立开发者的 AI 落地页生成工具，解决他们不会写产品定位和首屏文案的问题。",
    );

    expect(result.success).toBe(true);
  });
});

describe("buildProductBriefPrompt", () => {
  test("keeps the structured output prompt compact", () => {
    const prompt = buildProductBriefPrompt(
      "我想做一个面向独立开发者的 AI 落地页生成工具，解决他们不会写产品定位和首屏文案的问题。",
    );

    expect(prompt).toContain("ProductBrief");
    expect(prompt.length).toBeLessThan(700);
  });
});
