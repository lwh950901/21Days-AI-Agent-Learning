# 模块 2 一页纸速记：Structured Output 与 Tool Calling

## 1. Structured Output 速记

Structured Output = 让模型输出程序可稳定消费的业务对象，而不是自由文本。

流程：

```text
Zod Schema
→ AI SDK 转成模型可理解的结构约束
→ 模型按结构生成
→ SDK/后端校验
→ 前端/后端消费结构化对象
```

一句话：

> Structured Output 解决“模型输出能不能被系统稳定消费”的问题，不保证内容业务质量一定完美。

## 2. 为什么普通 JSON Prompt 不稳定

普通 Prompt：

```text
请严格返回 JSON，不要输出其他内容。
```

风险：

- 模型可能加解释文字。
- JSON 可能非法。
- 字段名可能变。
- 数组可能变字符串。
- 必填字段可能缺失。
- JSON.parse 成功也不代表结构符合业务。

核心句：

> JSON Prompt 是自然语言请求，不是类型系统。

## 3. Zod Schema / Schema 设计要点

Zod Schema 是业务契约：

- 定义字段名和类型。
- 定义必填、可选、nullable、默认值。
- 给模型字段语义描述。
- 给后端校验。
- 给 TypeScript 推导类型。

ProductBrief 字段：

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

字段设计：

```text
当前步骤稳定生成：required
列表暂无数据：default([])
单值未知：nullable()
当前流程不需要：optional()
```

例子：

```text
competitors → default([])
pricing → nullable()
confidence → required
```

## 4. 字段缺失、解析失败、重试和修复

字段缺失不是简单让模型“补全”，而是 Schema 设计问题。

失败处理：

```text
provider 超时/限流 → 自动重试
轻微 schema mismatch → 修复一次
输入不足 → 提示用户补充
confidence 低 → 前端人工编辑
```

不要无限重试：

- 浪费 token。
- 输入不足时无意义。
- 可能造成不可控循环。

前端提示例子：

```text
请补充目标用户、要解决的痛点、首版核心功能。
```

## 5. Tool Calling 完整流程

```text
用户请求
→ 后端提供工具白名单
→ 模型决定是否调用工具
→ 模型生成 toolName + arguments
→ inputSchema 校验
→ 后端 execute 执行
→ 返回 tool result
→ 模型继续回答或前端展示
```

核心边界：

```text
模型负责：意图判断、工具选择、参数生成
后端负责：白名单、校验、权限、执行、副作用、日志、错误
```

## 6. tool name / description / inputSchema / execute

```text
tool name：工具名，影响模型选择
description：给模型看的使用说明和边界
inputSchema：约束模型参数，也给后端校验
execute：后端真正执行工具
```

坏例子：

```text
helper(data: any)
```

好例子：

```text
searchCompetitors({ query, limit })
saveProject({ projectName, brief })
```

## 7. Model 决策与后端执行

模型可以判断：

- 用户是否想保存项目。
- 是否需要搜索竞品。
- 应该生成什么工具参数。

后端必须负责：

- 参数是否为空。
- 用户是否有权限。
- 项目是否属于当前用户。
- 是否允许写入数据库。
- 是否记录日志。
- 是否需要审批。

一句话：

> 模型生成 tool call，不代表后端必须执行。

## 8. Tool Result 如何回到模型

Tool Result 是 `execute` 的返回值。

在 AI SDK 多步调用中，工具结果可以回到模型，让模型基于结果继续回答。

Tool Result 应该最小化：

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
数据库内部对象
```

## 9. Tool Calling 与 Agent 的区别

Tool Calling：

```text
模型可以调用工具。
```

Agent：

```text
围绕目标进行多步规划、调用工具、观察结果、继续决策。
```

例子：

```text
保存项目 → Tool Calling
自动生成简报、搜竞品、评估质量、重做、导出 → 更像 Agent / Workflow
```

核心句：

> 用了 Tool Calling 不等于做了 Agent。

## 10. 参数校验、工具错误、工具白名单

参数校验分两层：

```text
inputSchema：结构校验
execute：业务校验
```

例子：

```text
projectId 是 string，不代表它属于当前用户。
```

工具错误：

```json
{
  "ok": false,
  "error": "SEARCH_TIMEOUT",
  "message": "竞品搜索超时，请稍后重试。"
}
```

不要暴露裸异常。

工具白名单：

```text
模型只能调用当前后端显式提供的工具。
```

按阶段开放：

```text
生成 ProductBrief：不开工具
竞品阶段：searchCompetitors
保存阶段：saveProject
导出阶段：exportMarkdown
```

## 11. 只读工具与副作用工具

只读工具：

```text
loadProject
searchCompetitors
```

特点：

- 不修改系统状态。
- 可在合适上下文自动执行。
- 仍要限制参数、频率、权限和日志。

副作用工具：

```text
saveProject
exportMarkdown
deleteProject
sendEmail
```

特点：

- 会写入、删除、导出或对外发送。
- 需要明确用户意图。
- 高危工具需要审批。

高危审批：

```text
deleteProject
sendEmail
chargePayment
publishContent
```

## 12. 60 秒面试表达

> 在 ProductCraft 中，我会先用 Structured Output 把用户的一句话产品想法收敛成 ProductBrief。Schema 里包含产品名、目标用户、痛点、核心功能、竞品列表、定价和 confidence。字段设计会区分数据来源，比如竞品默认空数组，pricing 可以为 null，confidence 用来判断是否需要人工补充。生成失败时，我会区分 provider 错误、结构错误和输入不足，不会盲目重试。
>
> 第二阶段进入 Tool Calling。我会按业务阶段开放工具白名单，比如竞品阶段只开放 searchCompetitors，保存阶段才开放 saveProject。模型只负责选择工具和生成参数，后端负责 inputSchema 校验、权限校验、execute 执行、工具错误收敛和日志记录。只读工具可以自动执行，保存类工具需要明确用户意图，高危工具需要审批。

## 13. 面试前 10 分钟检查

代码路径：

```text
demo2：/Users/elvis/Desktop/21DaysLLMLearning/demo2
demo3：/Users/elvis/Desktop/21DaysLLMLearning/demo3
```

demo2 说法：

```text
ProductBrief Schema
Structured Output
输入不足 422
前端人工编辑
```

demo3 说法：

```text
searchCompetitors 只读工具
saveProject 业务工具
工具白名单
工具日志
结构化工具错误
```

验收命令：

```bash
npm test
npm run build
```

一句项目经历：

> demo2 证明我能把模型输出变成稳定业务对象，demo3 证明我能让模型在受控工具白名单中选择工具，并由后端安全执行。

## 14. 最容易说错的点

1. 错：Structured Output 就是让模型返回 JSON。  
   对：它是用 Schema 约束并校验模型输出的业务对象。

2. 错：JSON.parse 成功就安全。  
   对：还要校验字段结构和业务约束。

3. 错：所有字段都设必填更完整。  
   对：必填字段要看当前步骤能否稳定生成。

4. 错：Tool Calling 是 LLM 直接调用数据库。  
   对：LLM 只生成 tool call，后端 execute 才真正执行。

5. 错：inputSchema 通过就可以执行。  
   对：还要做权限、资源归属和副作用校验。

6. 错：用了工具就是 Agent。  
   对：Tool Calling 是能力，Agent 是多步自主决策模式。

7. 错：只读工具不用管控。  
   对：只读工具不改状态，但仍要限参、限频、记日志。

8. 错：工具错误直接返回原始异常。  
   对：后端记完整日志，前端/模型拿结构化业务错误。

9. 错：把所有工具都给模型更强。  
   对：按阶段白名单开放，最小授权更安全。

10. 错：高危工具模型决定了就执行。  
    对：删除、发送、支付、发布要 Human-in-the-loop 审批。
