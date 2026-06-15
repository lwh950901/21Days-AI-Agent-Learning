import { z } from "zod";

export const productBriefSchema = z.object({
  productName: z.string().min(1).describe("产品名称，简短具体，不要超过 20 个字"),
  oneSentencePitch: z.string().min(1).describe("一句话说明这个产品为谁解决什么问题"),
  targetUsers: z.array(z.string().min(1)).min(1).describe("核心目标用户，避免泛泛写所有人"),
  painPoints: z.array(z.string().min(1)).min(1).describe("目标用户的真实痛点"),
  coreFeatures: z
    .array(z.string().min(1))
    .min(1)
    .max(5)
    .describe("首版 MVP 核心功能，不要超过 5 个"),
  competitors: z.array(z.string().min(1)).default([]).describe("竞品列表，第一步可以为空数组"),
  pricing: z.string().min(1).nullable().describe("初步定价想法；信息不足时返回 null"),
  confidence: z.number().min(0).max(1).describe("模型对提取结果的信心，0 到 1"),
});

export type ProductBrief = z.infer<typeof productBriefSchema>;
