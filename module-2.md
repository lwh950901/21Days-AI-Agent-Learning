# 模块 2 学习归档：Structured Output 与 Tool Calling

## 1. 模块目标

本模块目标是把模块 1 的“会调用 LLM、会流式展示文本”升级为企业级 AI 应用开发中更关键的两类能力：

1. Structured Output：让模型输出可校验、可类型推导、可被前端和后端稳定消费的业务对象。
2. Tool Calling：让模型在后端提供的工具白名单中选择工具、生成参数，再由后端校验、执行、返回工具结果和记录日志。

ProductCraft 业务目标：

- 用户输入一句产品想法。
- 系统生成 ProductBrief。
- 用户可以人工编辑确认。
- 后续可以调用工具搜索竞品、保存项目、导出 Markdown。
- 整个过程要能解释给面试官：模型负责理解和决策，后端负责边界、安全和副作用。

## 2. 诊断结果与纠正点

### 2.1 模块 1 项目状态检查

最初检查发现，用户给出的 `/Users/elvis/Desktop/21DaysLLMLearning/part1` 路径里没有完整源码，实际模块 1 Demo 在：

```text
/Users/elvis/Desktop/21DaysLLMLearning/demo1
```

模块 2 代码产出最终拆成：

```text
/Users/elvis/Desktop/21DaysLLMLearning/demo2
/Users/elvis/Desktop/21DaysLLMLearning/demo3
```

纠正点：

- 最终课程代码应放到 `21DaysLLMLearning/demoN`，而不是只放在本窗口 `work/` 临时目录。
- `demo2` 只保留 Structured Output。
- `demo3` 只保留 Tool Calling。
- `demo3` 可以复用 ProductBrief 业务概念和 Schema，但不保留 `demo2` 的 ProductBrief 生成页面、`/api/product-brief` 或 Structured Output workflow。

### 2.2 Structured Output 练习纠正点

#### 普通 JSON Prompt 风险

用户最初判断：

- 字段名语义不好会导致 LLM 取值偏差。
- 改 key，例如 `name` 改成 `productName`。

纠正后完整理解：

- 字段名不清晰只是其中一个风险。
- 更大的风险是：模型可能返回非纯 JSON、非法 JSON、字段缺失、字段类型不对。
- `JSON.parse()` 只负责解析字符串，不能保证字段结构满足业务需要。

正确表达：

> 普通 JSON Prompt 只能提高模型倾向于输出 JSON 的概率，但不能提供类型和业务结构保证。企业级应用中需要用 Schema 约束输出，并对解析失败、缺字段和人工修正做兜底。

#### Schema 字段设计

用户最初把 `competitors` 作为 ProductBrief 第一步必填，把 `confidence` 放到后续补充。

纠正后理解：

- `competitors` 通常需要搜索工具获取，不应该在第一步强迫模型凭空补全。
- `confidence` 是模型对结构化提取质量的自评信号，适合作为必填字段。
- 必填字段不是“最终想要的数据”，而是“当前步骤稳定生成且后续流程依赖的数据”。

推荐 ProductBrief 字段：

```text
必填：
productName
oneSentencePitch
targetUsers
painPoints
coreFeatures
confidence

默认空数组：
competitors

可为空：
pricing
```

#### 字段缺失

用户曾认为 `competitors` 可以用 `nullable`。

纠正后理解：

- 列表型字段优先用空数组表达“暂无数据”。
- 单值未知字段适合 `nullable`。
- 完全不参与当前流程的字段才用 `optional`。

规则：

```text
数组字段暂无数据：default([])
单个分析结论未知：nullable()
当前流程不需要：optional()
当前步骤必须稳定生成：required
```

#### Structured Output 概念澄清

用户疑问：

> Schema 是怎么给到 LLM 的？LLM 会看到什么 Schema 内容？

纠正后理解：

- LLM 通常不是直接看到 Zod 代码。
- AI SDK 会把 Zod Schema 转成模型/provider 能理解的结构约束，例如 JSON Schema 或 response format。
- `.describe()` 会影响模型对字段含义的理解，可以理解成字段级 Prompt。

正确表达：

> Zod Schema 写在代码里，AI SDK 会把它转换成模型请求里的结构约束；模型按这个约束生成，SDK 再校验输出。LLM 看到的不是 TypeScript 代码本身，而是由 Schema 转换出来的字段结构、类型和描述。

#### Structured Output 失败处理

用户练习中理解到：

- 不应该只返回“系统错误”。
- 要提示用户补充目标用户、痛点、核心功能。

进一步纠正：

- provider 超时或限流可以重试。
- 轻微 schema mismatch 可以修复一次。
- 用户输入不足应该让用户补充，不要盲目重试。
- `confidence` 低时应该展示草稿并提示人工编辑。

### 2.3 Tool Calling 练习纠正点

#### Tool Calling 不是 LLM 直接调用数据库

用户正确理解：

- LLM 负责决策和生成参数。
- 后端负责校验和执行。

补充纠正：

- 模型可能选择 0 个、1 个或多个工具。
- 最小 Demo 中通常先限制为一个或少量工具，便于控制。

#### 工具定义不能泛化

用户最初把 `helper` 改成 `requestHelper`，但仍使用 `data: z.any()`。

纠正后理解：

- 工具不是“通用函数包装器”，而是“受控业务能力”。
- 应该按具体业务动作命名，例如 `saveProject`、`searchCompetitors`。
- `description` 要说明什么时候用、什么时候不要用、是否有副作用。
- `inputSchema` 不能是 `z.any()`，要定义具体结构和范围。

#### 参数校验

用户曾对 `projectId` 格式合法但属于其他用户的例子不理解。

纠正后理解：

```text
Zod 问：参数长得对吗？
后端问：这个操作允许做吗？
```

例子：

- `projectId: z.string().min(1)` 只能保证非空字符串。
- 它不能保证项目属于当前用户。
- 资源归属和权限必须在 `execute` 中校验。

#### Tool Result

用户能识别 `rawPrompt`、`apiKeyUsed`、`ownerUserId`、`databaseTable` 不该返回。

进一步纠正：

- `saveProject` 结果通常不需要返回完整 `brief`。
- 更好的结果是最小业务回执：

```json
{
  "projectId": "proj_123",
  "status": "saved",
  "savedAt": "2026-06-15T10:00:00Z"
}
```

#### 只读工具与副作用工具

用户最初把 `searchCompetitors` 归为副作用工具。

纠正后理解：

- `searchCompetitors` 通常是只读工具，因为它只查询竞品候选，不改变业务数据。
- 但只读不等于不用管控，仍要限制 query、limit、频率和日志。
- `saveProject` 是业务工具，因为它会写入业务存储。
- `deleteProject`、`sendEmail` 是更高危副作用工具，通常需要审批。

## 3. Structured Output 核心知识点

### 3.1 为什么普通 JSON Prompt 不稳定

普通写法：

```text
请严格返回 JSON，不要输出解释。
```

问题：

- 模型可能在 JSON 前后加解释。
- 字段名可能变化。
- 数组可能变字符串。
- 必填字段可能缺失。
- JSON 语法可能非法。
- JSON 语法合法但业务结构不对。

核心判断：

> JSON Prompt 是自然语言请求，不是工程约束。

### 3.2 Structured Output 是什么

Structured Output 是让模型输出程序可以稳定消费的数据结构，而不是只输出自然语言文本。

流程：

```text
Zod Schema
→ AI SDK 转成模型可理解的结构约束
→ 模型按结构生成
→ SDK/后端校验
→ 业务代码消费结构化对象
```

它解决的是：

- 前端渲染稳定。
- 后端存储字段稳定。
- 后续 Tool Calling 或 Workflow 可以消费同一份业务对象。
- 面试中能解释“模型输出如何被系统可靠使用”。

### 3.3 Zod Schema 的作用

Zod Schema 是业务数据契约：

- 给模型字段结构和语义。
- 给后端校验输出。
- 给 TypeScript 推导类型。
- 给前端稳定渲染字段。
- 给后续工具输入提供一致结构。

ProductBrief 示例字段：

```text
productName
oneSentencePitch
targetUsers
painPoints
coreFeatures
competitors
pricing
confidence
```

### 3.4 Schema 设计原则

字段设计要看数据来源：

```text
用户输入能稳定提取：必填
工具或数据库才能获得：后续补齐
列表型暂无结果：default([])
单值未知但页面需要占位：nullable()
非当前流程字段：optional()
```

不要第一版就塞入：

```text
marketSize
revenueForecast
technicalArchitecture
fundraisingPlan
```

这些字段需要外部数据或后续流程，第一步让模型生成容易幻觉。

### 3.5 字段缺失处理

错误做法：

```text
把所有最终想要的字段都设成必填。
```

正确做法：

- 对当前步骤必须稳定生成的字段设为 required。
- 对列表字段使用 default([])。
- 对当前未知但要保留位置的字段使用 nullable。
- 对当前流程不需要的字段使用 optional。

### 3.6 解析失败、重试和修复

失败类型：

```text
provider/network/timeout 错误 → 自动重试
轻微结构不匹配 → 尝试一次修复
输入信息不足 → 提示用户补充
confidence 低 → 人工编辑确认
```

不要无限重试，因为：

- 浪费 token。
- 输入不足时重试无意义。
- 容易造成不可控循环。

### 3.7 前端人工编辑

Structured Output 解决“结构稳定”，不保证“业务一定正确”。

所以 ProductCraft 应该：

- 展示字段级 ProductBrief。
- 允许用户编辑数组字段。
- 允许补充 nullable 字段。
- confidence 低时提示用户检查。
- 保存前再用 Schema 校验。

## 4. Tool Calling 核心知识点

### 4.1 Tool Calling 完整流程

```text
用户请求
→ 后端提供工具白名单
→ 模型决定是否调用工具
→ 模型生成 toolName + arguments
→ inputSchema 校验参数
→ 后端 execute 执行工具
→ 返回 tool result
→ 模型继续回答或前端展示
```

核心边界：

```text
模型负责决策和填参
后端负责校验和执行
```

### 4.2 Tool 定义四要素

```text
tool name
description
inputSchema
execute
```

作用：

- tool name：影响模型识别工具。
- description：告诉模型什么时候使用、什么时候不要使用。
- inputSchema：约束模型参数，也给后端校验。
- execute：后端真正执行业务逻辑。

### 4.3 Model 决策与后端执行

模型负责：

- 判断用户意图。
- 选择工具。
- 生成工具参数。

后端负责：

- 工具白名单。
- 参数校验。
- 权限判断。
- 资源归属校验。
- 执行业务函数。
- 记录日志。
- 错误收敛。

### 4.4 Tool Result 设计

Tool Result 是 `execute` 的返回值，不是数据库原始对象。

好的结果：

```json
{
  "projectId": "proj_123",
  "status": "saved",
  "savedAt": "2026-06-15T10:00:00Z"
}
```

不要返回：

```text
apiKey
ownerUserId
databaseTable
rawPrompt 全文
stack trace
node_modules 路径
数据库内部对象
```

### 4.5 Tool Calling 与 Agent 的区别

Tool Calling：

```text
模型可以调用外部工具。
```

Agent：

```text
模型或系统围绕目标进行多步规划、调用工具、观察结果、继续决策，直到完成任务。
```

结论：

> 用了 Tool Calling 不等于做了 Agent。

ProductCraft 更适合：

```text
可控 Workflow + 局部 Tool Calling
```

### 4.6 参数校验

两层校验：

```text
结构校验：Zod inputSchema
业务校验：权限、资源归属、操作边界、速率限制
```

例子：

- `projectId` 是非空字符串，只说明格式对。
- 它是否属于当前用户，要在 `execute` 里查权限。

### 4.7 工具错误

不要返回裸异常：

```json
{
  "error": "FetchError: request timed out at node_modules/..."
}
```

应该返回结构化业务错误：

```json
{
  "ok": false,
  "error": "SEARCH_TIMEOUT",
  "message": "竞品搜索超时，请稍后重试。"
}
```

后端保留完整日志，前端和模型只拿可解释、可恢复的错误。

### 4.8 工具白名单

模型只能调用后端当前请求显式提供的工具。

按阶段开放工具：

```text
生成 ProductBrief：不开放工具
竞品研究：只开放 searchCompetitors
保存阶段：只开放 saveProject
导出阶段：只开放 exportMarkdown
```

### 4.9 只读工具与副作用工具

只读工具：

```text
loadProject
searchCompetitors
```

特点：

- 不修改系统状态。
- 可以在合适上下文自动执行。
- 仍需要参数限制、权限、频率和日志。

副作用工具：

```text
saveProject
exportMarkdown
deleteProject
sendEmail
```

特点：

- 会写入、删除、导出、发送或对外产生动作。
- 需要明确用户意图。
- 高危工具需要审批。

### 4.10 工具审批

模型生成 tool call 不代表后端立刻执行。

高危工具流程：

```text
模型请求调用 deleteProject
→ 后端识别高风险工具
→ 暂停执行
→ 前端展示工具名、参数、影响范围、风险
→ 用户确认
→ 后端执行并记录日志
```

## 5. Product / 企业级 AI 应用场景中的使用方式

ProductCraft 的企业级设计：

```text
用户输入产品想法
→ Structured Output 生成 ProductBrief
→ 前端人工编辑确认
→ searchCompetitors 补充竞品
→ saveProject 保存项目
→ exportMarkdown 导出文档
→ 展示工具日志和错误
```

工程原则：

- 模型输出先结构化，再进入业务流程。
- AI 生成结果是草稿，不是最终事实。
- 工具按业务阶段白名单开放。
- 只读工具和副作用工具分级处理。
- 后端控制权限、副作用、日志、错误。
- 高危操作必须审批。

## 6. 本模块 Demo 状态

### demo2：Structured Output

路径：

```text
/Users/elvis/Desktop/21DaysLLMLearning/demo2
```

能力：

- ProductBrief Zod Schema。
- `/api/product-brief`。
- AI SDK `Output.object`。
- 输入不足返回 422。
- 前端 ProductBrief 字段级编辑。
- 不包含 demo1 合同助手遗留内容。

技术栈：

- Next.js App Router。
- TypeScript。
- Vercel AI SDK。
- Zod。
- React。

关键文件：

```text
/Users/elvis/Desktop/21DaysLLMLearning/demo2/lib/productcraft/schema.ts
/Users/elvis/Desktop/21DaysLLMLearning/demo2/app/api/product-brief/route.ts
/Users/elvis/Desktop/21DaysLLMLearning/demo2/app/page.tsx
```

验证状态：

```text
npm test：通过
npm run build：通过
```

验收点：

- 能从产品想法生成 ProductBrief。
- 能展示结构化字段，而不是只显示一段文本。
- 输入太短时先返回业务错误，不浪费模型调用。
- 用户可以在前端人工编辑字段。
- 代码中不再保留 demo1 合同助手内容。

### demo3：Tool Calling

路径：

```text
/Users/elvis/Desktop/21DaysLLMLearning/demo3
```

能力：

- `/api/tool-calling`。
- `searchCompetitors` 只读工具。
- `saveProject` 业务工具。
- 工具调用日志。
- 工具错误展示。
- 使用固定示例 ProductBrief，不保留 demo2 的 ProductBrief 生成流程。
- 路由只包含 `/api/tool-calling`。

技术栈：

- Next.js App Router。
- TypeScript。
- Vercel AI SDK `tool`。
- Zod inputSchema。
- React。

关键文件：

```text
/Users/elvis/Desktop/21DaysLLMLearning/demo3/lib/productcraft/tools.ts
/Users/elvis/Desktop/21DaysLLMLearning/demo3/app/api/tool-calling/route.ts
/Users/elvis/Desktop/21DaysLLMLearning/demo3/app/page.tsx
```

验证状态：

```text
npm test：通过
npm run build：通过
```

验收点：

- 模型只能在白名单工具中选择。
- `searchCompetitors` 是只读工具。
- `saveProject` 是业务工具。
- 工具参数由 `inputSchema` 约束。
- 工具执行后返回最小必要 tool result。
- 前端展示工具调用日志。
- 工具失败返回结构化业务错误。
- 业务代码和 README 不再保留 demo2 的 Structured Output 生成流程。

注意：

- `demo2` 和 `demo3` 代码运行独立。
- 它们不互相调用 API，不互相 import 文件。
- 它们只是复用同一个业务概念：ProductBrief。

### 6.1 运行方式

demo2：

```bash
cd /Users/elvis/Desktop/21DaysLLMLearning/demo2
npm install
cp .env.example .env.local
npm run dev
```

demo3：

```bash
cd /Users/elvis/Desktop/21DaysLLMLearning/demo3
npm install
cp .env.example .env.local
npm run dev
```

注意：实际目录是 `/Users/elvis/Desktop/21DaysLLMLearning/demo3`。

### 6.2 可回填总控台账的汇报

代码路径：

```text
Structured Output Demo：
/Users/elvis/Desktop/21DaysLLMLearning/demo2

Tool Calling Demo：
/Users/elvis/Desktop/21DaysLLMLearning/demo3
```

运行证明：

```text
demo2：
npm test 通过
npm run build 通过

demo3：
npm test 通过
npm run build 通过
构建路由仅包含 /api/tool-calling
```

学习笔记：

```text
已导出完整归档：
/Users/elvis/Documents/Codex/2026-06-14/module-2-structured-output-tool-calling/outputs/module-2-export.md

已导出速记版：
/Users/elvis/Documents/Codex/2026-06-14/module-2-structured-output-tool-calling/outputs/module-2-cheatsheet.md
```

练习结果：

```text
完成 Structured Output 8 个概念点练习。
完成 Tool Calling 10 个概念点练习。
纠正了 JSON Prompt、Schema 字段设计、Tool Result、参数校验、只读/副作用工具等常见误区。
```

面试表达：

```text
我完成了 ProductCraft 的 Structured Output 和 Tool Calling 两个独立 Demo。
demo2 用 Zod Schema 和 AI SDK Structured Output 生成可编辑 ProductBrief。
demo3 用 Tool Calling 实现 searchCompetitors 只读工具和 saveProject 业务工具，并展示工具调用日志和工具错误。
我能解释模型负责决策和填参，后端负责校验、权限、副作用、错误收敛和日志。
```

## 7. 面试表达草稿

### 7.1 30 秒版本

> 模块 2 我主要掌握了 Structured Output 和 Tool Calling。Structured Output 部分，我用 Zod 定义 ProductBrief，让模型输出可校验、可编辑的业务对象，而不是靠脆弱的 JSON Prompt。Tool Calling 部分，我实现了只读工具 searchCompetitors 和业务工具 saveProject，模型负责选择工具和生成参数，后端负责参数校验、执行、错误收敛和日志记录。

### 7.2 60 秒版本

> 在 ProductCraft 中，我会先用 Structured Output 把用户的一句话产品想法收敛成 ProductBrief。Schema 里包含产品名、目标用户、痛点、核心功能、竞品列表、定价和 confidence。字段设计会区分数据来源，比如竞品默认空数组，pricing 可以为 null，confidence 用来判断是否需要人工补充。生成失败时，我会区分 provider 错误、结构错误和输入不足，不会盲目重试。
>
> 第二阶段进入 Tool Calling。我会按业务阶段开放工具白名单，比如竞品阶段只开放 searchCompetitors，保存阶段才开放 saveProject。模型只负责选择工具和生成参数，后端负责 inputSchema 校验、权限校验、execute 执行、工具错误收敛和日志记录。只读工具可以自动执行，保存类工具需要明确用户意图，高危工具需要审批。

### 7.3 项目经历版本

> 我做了两个独立 Demo。demo2 是 Structured Output，用 ProductBrief Zod Schema 和 AI SDK 的结构化输出生成可编辑产品简报；demo3 是 Tool Calling，用本地 mock 工具实现 searchCompetitors 和 saveProject，并在前端展示工具调用日志和工具错误。这个设计能体现企业级 AI 应用的关键边界：模型负责理解和决策，后端负责结构、权限、副作用和审计。

## 8. 高频面试题

### 题 1：为什么不能只靠 Prompt 让模型返回 JSON？

**考点**

- 是否理解 LLM 是文本预测，不是类型系统。
- 是否知道 JSON.parse 的边界。
- 是否能说出工程风险。

**参考答案**

不能只靠 Prompt，因为“请返回 JSON”只是自然语言要求，模型可能返回解释文字、非法 JSON、字段名变化、数组变字符串、缺字段，或者 JSON 语法合法但业务结构不符合预期。企业级应用中，前端渲染、数据库存储、后续 workflow 都依赖稳定结构，所以我会用 Zod Schema 和 Structured Output，让模型按业务 Schema 输出，并在后端校验。

**追问**

如果 JSON.parse 成功，是不是就安全了？

**回答要点**

不是。JSON.parse 只说明语法合法，不说明字段结构正确。例如 `targetUsers` 可能是字符串而不是数组，`productName` 可能缺失。还需要 Schema 校验和业务校验。

### 题 2：Zod Schema 在 AI 应用里有什么作用？

**考点**

- 是否把 Zod 仅理解为 TS 类型工具。
- 是否知道 Schema 会参与模型输出约束。

**参考答案**

Zod Schema 是业务契约。它定义字段名、类型、必填/可选/nullable、数组长度、数值范围和字段描述。AI SDK 可以把 Zod Schema 转成模型可理解的结构约束，模型按结构生成，SDK/后端再校验输出。同时 TypeScript 可以通过 `z.infer` 推导类型，让前端、后端和工具调用共享同一份业务结构。

**追问**

LLM 会直接看到 Zod 代码吗？

**回答要点**

通常不会。LLM 看到的是由 Zod 转换出的结构描述，例如 JSON Schema 或 provider 的 response format。`.describe()` 会成为字段语义的一部分，影响模型理解字段。

### 题 3：optional、nullable、default([]) 怎么选？

**考点**

- 是否能根据数据来源设计字段。
- 是否知道列表和单值未知的区别。

**参考答案**

如果字段完全不是当前流程必须展示或消费的，用 optional；如果字段应该存在但当前未知，用 nullable；如果字段是列表型数据，暂无结果时优先用 default([])。例如 ProductBrief 里的 competitors 是列表，第一步还没搜索时用空数组；pricing 是单值判断，信息不足时用 null。

**追问**

为什么 competitors 不用 nullable？

**回答要点**

因为它是集合字段，空数组更方便前端渲染和后续工具追加。`null` 更适合单个未知结论，例如 pricing、marketSize。

### 题 4：Structured Output 失败怎么办？

**考点**

- 是否知道结构化输出不是 100% 成功。
- 是否能区分失败类型。

**参考答案**

我会先区分失败原因。provider 超时、429 或网络问题可以自动重试；轻微 schema mismatch 可以尝试一次修复；如果是用户输入不足，就返回业务错误码，让前端提示补充目标用户、痛点、核心功能；如果 confidence 低但结构合法，就展示草稿并让用户人工编辑。

**追问**

为什么不一直重试直到成功？

**回答要点**

因为输入不足时重试不能提高质量，只会浪费 token，还可能造成不可控循环。重试要有次数、超时和日志。

### 题 5：Structured Output 和 JSON.parse 的区别是什么？

**考点**

- 是否理解语法解析和业务结构校验的区别。

**参考答案**

JSON.parse 只是把字符串解析成 JS 对象，不能保证字段名、字段类型、必填字段和业务约束。Structured Output 是先用 Schema 定义目标结构，让模型按结构生成，再由 SDK/后端校验，最终业务代码消费的是结构化结果，而不是裸 JSON 字符串。

**追问**

Structured Output 能保证内容一定正确吗？

**回答要点**

不能。它主要保证结构可用，不保证业务质量一定高。所以还需要 confidence、人工编辑、业务校验和错误处理。

### 题 6：Tool Calling 是不是让模型直接执行代码？

**考点**

- 是否能说清模型和后端职责边界。

**参考答案**

不是。模型不会直接访问数据库、文件系统或外部 API。后端把工具白名单、description 和 inputSchema 提供给模型，模型决定是否调用工具并生成参数。参数校验通过后，由后端的 execute 函数真正执行工具。

**追问**

那 execute 是谁执行的？

**回答要点**

execute 是在后端进程中由 SDK/后端调用的，不是模型执行。模型只生成 tool call。

### 题 7：一个 tool 定义里最重要的部分是什么？

**考点**

- 是否知道工具不是简单函数。
- 是否理解 description 和 inputSchema 的作用。

**参考答案**

主要是 tool name、description、inputSchema、execute。tool name 要业务明确；description 告诉模型什么时候该用、什么时候不要用；inputSchema 约束模型生成参数，也给后端校验；execute 是后端真正执行业务逻辑的位置。

**追问**

为什么不能写一个 `helper(data: any)`？

**回答要点**

因为这会让模型不知道工具边界，后端也无法校验参数。工具应该是具体业务能力，例如 saveProject、searchCompetitors，并用 Zod 定义明确参数。

### 题 8：为什么 inputSchema 通过了还要做后端校验？

**考点**

- 是否理解结构校验和业务校验的区别。

**参考答案**

inputSchema 只能保证参数形状正确，比如 projectId 是非空字符串。但它不能保证这个项目属于当前用户、用户有读取权限、操作频率合理，或者这个副作用应该执行。所以 execute 里还要做资源归属、权限、速率限制和业务边界校验。

**追问**

如果 projectId 格式合法但属于别人，怎么办？

**回答要点**

后端拒绝读取，返回 PROJECT_NOT_FOUND 或 FORBIDDEN，不返回项目内容。安全上通常不要暴露别人的项目是否存在。

### 题 9：Tool Result 应该怎么设计？

**考点**

- 是否知道工具结果不是数据库对象。
- 是否有数据最小化意识。

**参考答案**

Tool Result 应该是最小必要业务结果。比如 saveProject 只返回 projectId、status、savedAt，不返回 ownerUserId、apiKey、rawPrompt、数据库表名或 stack trace。这样可以降低 token 成本，避免泄露内部字段，也让模型后续回答更稳定。

**追问**

什么时候可以返回完整 brief？

**回答要点**

如果后端保存时会补充或修正 brief，并且前端或模型确实需要这些字段，可以返回精简后的 brief 或版本号。但不要默认返回完整数据库对象。

### 题 10：Tool Calling 和 Agent 有什么区别？

**考点**

- 是否把调用工具误认为 Agent。

**参考答案**

Tool Calling 是模型调用外部工具的机制；Agent 是围绕目标进行多步决策、工具调用、观察结果和继续行动的控制模式。一个应用用了 Tool Calling 不代表它是 Agent。比如用户明确要求保存项目，模型调用一次 saveProject，这是 Tool Calling；如果系统自动规划、搜索竞品、生成方案、评估质量并重做，才更接近 Agent 或 Workflow + Agent。

**追问**

ProductCraft 应该做成完全自主 Agent 吗？

**回答要点**

不一定。企业级应用更适合可控 Workflow 编排主流程，在局部节点使用 Tool Calling，必要时引入 Agent 式循环。这样更容易控制权限、成本、失败和日志。

### 题 11：什么是工具白名单？

**考点**

- 是否有最小授权意识。

**参考答案**

工具白名单是指模型只能调用当前后端显式提供的工具，不能调用任意函数。并且工具集应该按业务阶段和用户权限动态收窄。比如生成 ProductBrief 阶段不开工具，竞品阶段只开放 searchCompetitors，保存阶段才开放 saveProject。

**追问**

为什么不把所有工具都给模型？

**回答要点**

工具越多，误调用和 prompt injection 风险越大，模型决策空间也更复杂。最小授权可以降低副作用风险，也便于审计。

### 题 12：只读工具和副作用工具怎么区分？

**考点**

- 是否能按工具实际影响分类风险。

**参考答案**

只读工具只查询信息，不改变系统状态，比如 loadProject、searchCompetitors。副作用工具会写入、删除、导出、发送或对外产生动作，比如 saveProject、deleteProject、sendEmail。只读工具可以在合适上下文自动执行，但仍要参数、权限、频率和日志控制；副作用工具需要明确用户意图，高危工具需要审批。

**追问**

searchCompetitors 调外部 API，算副作用吗？

**回答要点**

通常仍算只读，因为它不改变业务数据。但它仍需要 query/limit 限制、频率限制、日志和隐私控制。

### 题 13：工具错误应该怎么返回？

**考点**

- 是否知道错误收敛和信息泄露风险。

**参考答案**

后端应该记录完整异常日志，但返回给模型或前端的是结构化业务错误，例如 `ok: false`、`error: SEARCH_TIMEOUT`、`message: 竞品搜索超时，请稍后重试。` 不要把 stack trace、node_modules 路径、数据库错误或 API key 暴露出去。

**追问**

为什么 message 不能太技术化？

**回答要点**

前端和模型需要的是可恢复方向，不是内部调试信息。内部异常应写入后端日志，而不是返回给用户或模型。

### 题 14：为什么高危工具需要审批？

**考点**

- 是否理解 HITL 和副作用控制。

**参考答案**

因为模型生成 tool call 不代表用户真的授权执行。删除、发送、支付、发布等操作可能不可逆或影响外部系统，所以需要 Human-in-the-loop。前端展示工具名、参数、影响范围和风险，用户确认后后端才执行，并记录日志。

**追问**

saveProject 每次都要审批吗？

**回答要点**

不一定。saveProject 通常需要明确用户意图或点击保存，但不一定每次都要额外审批。deleteProject、sendEmail、chargePayment 这类更高危工具更需要审批。

### 题 15：你在 ProductCraft 里怎么落地模块 2？

**考点**

- 是否能把概念落到项目。

**参考答案**

我做了两个独立 Demo。demo2 用 Zod Schema 和 Structured Output 生成可编辑 ProductBrief；demo3 用 Tool Calling 实现 searchCompetitors 只读工具和 saveProject 业务工具，并展示工具调用日志和工具错误。模型负责选择工具和生成参数，后端负责校验、执行、错误收敛和日志记录。

**追问**

demo2 和 demo3 是否互相依赖？

**回答要点**

不互相依赖。它们代码运行独立，不互相调用 API，也不互相 import 文件。它们只是共享 ProductBrief 这个业务概念。

## 9. 项目设计题

### 题目

如果让你设计一个 ProductCraft AI 应用，用户输入一句产品想法后，系统要生成 ProductBrief、搜索竞品、保存项目，并支持导出 Markdown。你会怎么设计 Structured Output 和 Tool Calling？

### 标准答题结构

#### 1. 总体流程

```text
用户输入产品想法
→ Structured Output 生成 ProductBrief
→ 前端展示并允许人工编辑
→ 用户确认后进入工具阶段
→ searchCompetitors 补充竞品
→ saveProject 保存项目
→ exportMarkdown 导出文档
→ 展示工具日志和错误
```

#### 2. Structured Output

用 Zod 定义 ProductBrief：

```text
productName
oneSentencePitch
targetUsers
painPoints
coreFeatures
competitors
pricing
confidence
```

字段策略：

- ProductBrief 骨架字段必填。
- competitors 默认空数组。
- pricing nullable。
- confidence 判断是否需要人工补充。

#### 3. Tool Calling

工具设计：

```text
searchCompetitors：只读工具
saveProject：业务工具
exportMarkdown：导出工具
```

后端负责：

- 工具白名单。
- inputSchema 校验。
- 权限和资源归属。
- execute 执行。
- 工具日志。
- 错误收敛。

#### 4. 安全和错误

- 不把所有工具一次性给模型。
- 不返回数据库原始对象。
- 不暴露 API key、stack trace、rawPrompt。
- 高危工具进入审批。

### 你的最终优化表达

> 我会先做 Structured Output 阶段。用户输入产品想法后，用 Zod 定义 ProductBrief Schema，比如项目名称、目标人群、痛点、核心需求、竞品列表和 confidence。模型生成结果后，后端用 Schema 校验，前端展示字段级编辑；如果输入不足或 confidence 低，就提示用户补充，而不是直接保存。
>
> 第二阶段做 Tool Calling。我会按业务阶段开放工具白名单。比如 saveProject 是业务工具，inputSchema 包含 projectName 和 ProductBrief，后端在 execute 里继续做完整性校验、用户权限校验，然后保存，并返回 projectId、status、savedAt，不返回数据库内部对象。exportMarkdown 可以把确认后的 ProductBrief 转成 Markdown；如果只是返回 Markdown 字符串风险较低，如果要读取已保存项目或写文件，就必须校验用户是否有权限。
>
> 整体上，模型负责选择工具和生成参数，后端负责参数校验、权限、副作用执行、错误收敛和工具日志。工具失败时返回结构化业务错误，比如 ok false、error code 和 message，前端给用户可操作提示。

## 10. 掌握度判断

### 已掌握

- 能解释普通 JSON Prompt 为什么不稳定。
- 能解释 Structured Output 的工程意义。
- 能说清 Zod Schema 如何影响模型输出和后端校验。
- 能区分 required、optional、nullable、default([])。
- 能处理输入不足、解析失败、低 confidence。
- 能解释 Tool Calling 完整流程。
- 能区分模型决策和后端执行。
- 能说清 tool name、description、inputSchema、execute。
- 能设计 Tool Result。
- 能区分 Tool Calling 与 Agent。
- 能区分只读工具和副作用工具。
- 能解释工具白名单、工具错误和审批。
- 已完成 demo2 和 demo3。

### 仍需加强

- 真实 provider 下 Tool Calling 的多步行为观察。
- `stopWhen`、`steps`、tool result 如何回到模型的运行细节。
- 工具审批 UI 的完整实现。
- 将 Tool Calling 与模块 3 Workflow / LangGraph 串起来。

### 当前判断

模块 2 达到“可面试表达 + 有代码作品集 Demo”的水平。下一阶段可以进入模块 3 Workflow、Agent 与 LangGraph，但在进入前建议至少手动运行一次 demo2 和 demo3，并口头复述 60 秒面试表达。

建议掌握度：约 85% - 90%。

判断依据：

- 概念链路完整，能区分 Structured Output、Tool Calling、Agent。
- 有 demo2 和 demo3 两个独立代码产出。
- 能回答高频面试题，并能处理追问。
- 还需要在真实模型调用中多观察 tool call、tool result、steps 和审批流程。
