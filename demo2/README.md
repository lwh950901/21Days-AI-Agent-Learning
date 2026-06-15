# ProductCraft Module 2 Demo: Structured Output 与 Tool Calling

这是 21 天 AI 应用开发求职冲刺模块 2 的最小可运行 Demo，围绕 ProductCraft 展示如何把用户的产品想法生成可校验、可编辑的 ProductBrief。

## 能力覆盖

- Next.js App Router + TypeScript
- ProductBrief Zod Schema
- Vercel AI SDK `Output.object`
- Structured Output API
- 输入不足时返回业务错误码，避免无效模型调用
- 前端字段级人工编辑
- 错误提示
- provider / model 配置集中管理

## 运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

然后打开 `http://localhost:3000`。

## 环境变量

默认使用 Vercel AI Gateway 的字符串模型写法：

```bash
AI_GATEWAY_API_KEY=your_key_here
AI_MODEL_FAST=deepseek/deepseek-v4-flash
AI_MODEL_QUALITY=deepseek/deepseek-v4-pro
```

如需换 provider / model，只改 `.env.local` 或 `lib/ai/model.ts` 的映射，不需要改业务页面。
