import { z } from "zod";

const productIdeaSchema = z.object({
  idea: z.string().trim().min(18, "请补充目标用户、痛点或首版功能。"),
});

export function validateProductIdea(idea: string) {
  return productIdeaSchema.safeParse({ idea });
}

export function buildProductBriefPrompt(idea: string) {
  return `从产品想法中提取 ProductBrief。只基于用户输入，不要编造竞品或定价；信息不足时 pricing 返回 null，competitors 返回空数组，confidence 降低。

产品想法：
${idea.trim()}

请严格返回 JSON（不要用 markdown 代码块）：
{"productName":"名称","oneSentencePitch":"一句话定位","targetUsers":["用户"],"painPoints":["痛点"],"coreFeatures":["功能1","功能2"],"competitors":[],"pricing":null,"confidence":0.8}`;
}
