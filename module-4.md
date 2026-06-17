# 模块 4 学习归档：State、Persistence、Checkpoint 与 Human-in-the-loop

## 1. 模块目标

本模块目标是把模块 3 的 Workflow / Agent / LangGraph 思路延伸到“可恢复流程”，掌握企业级 AI 应用中常见的 State、Persistence、Checkpoint、Resume 和 Human-in-the-loop 设计方法。

本模块不追求扩展 RAG、Memory 系统或 MCP，而是重点掌握：

1. State：区分 UI State、Model Messages、Agent State。
2. Persistence：理解保存机制，不把它误认为 Memory。
3. Checkpoint：保存流程快照，用于失败、中断、刷新后的恢复。
4. threadId：标识一次可恢复 workflow。
5. Resume：从 checkpoint 继续，而不是从头重新跑。
6. HITL：人在关键节点 Approve、Reject、Edit，并影响流程路由。
7. 项目表达：把 Demo 讲成可恢复 AI Workflow，而不是一次性生成页面。

本模块的 Demo 选择 ProductCraft / PRD 生成作为场景，但学习目标不是 PRD 本身，而是通用可恢复 AI Workflow 能力：

```text
用户输入
→ 创建 threadId
→ 保存 checkpoint
→ 调 DeepSeek 生成业务产物
→ 暂停等待人工审批
→ 刷新后恢复
→ Approve / Reject / Edit
→ 完成、退回或重新生成
```

这套能力可以迁移到 AI PDF 助手、合同审查、报告生成、客服工单、简历筛选等企业级 AI 应用。

## 2. 诊断结果与纠正点

### 2.1 开场诊断结果

开场诊断确认已经能初步区分：

```text
UI State
Model Messages
Agent State
Checkpoint
threadId
Resume
HITL
```

最初判断正确：

- UI State、Model Messages、Agent State 不是同一类状态。
- 不应该把所有工程状态塞进 messages。
- Checkpoint 不是聊天记录，而是流程快照。
- threadId 不是 userId，也不是 messageId。
- Resume 不是重新开始，而是从中断点继续。

### 2.2 Persistence / Memory 纠正点

用户一开始把 Persistence 理解成“Agent 记忆 / 长期记忆”。

纠正后理解：

```text
Persistence：保存机制，关注数据能不能保存和读回。
Memory：可复用信息，关注未来任务值不值得使用。
```

例子：

```text
保存 checkpoint：Persistence，但不是 Memory
保存报错日志：Persistence，但不是 Memory
保存用户偏好：Persistence + Memory
保存长期技术栈：Persistence + Memory
```

核心口诀：

> 持久化看保存，记忆看复用。

### 2.3 Checkpoint / State 纠正点

用户曾把 Checkpoint 理解成“当前节点的内容”。

纠正后理解：

```text
State：流程运行时依赖的结构化数据
Checkpoint：为了恢复流程而保存的快照
```

Checkpoint 通常包含：

```text
threadId
currentNode
nextNode
status
完整 Agent State
metadata / timestamps
```

核心句：

> State 说明“有什么数据”，Checkpoint 说明“怎么恢复流程”。

### 2.4 currentNode / status 纠正点

用户一开始把 `currentNode` 和 `waiting_for_human` 混在一起。

纠正后理解：

```text
currentNode：流程位置
status：运行状态
```

例子：

```text
currentNode = prdApproval
status = waiting_for_human
```

含义：

> 当前停在 PRD 审批节点，并且正在等待人工操作。

`waiting_for_human` 不应该作为 currentNode，它是 status。

### 2.5 HITL Approve / Reject / Edit 纠正点

用户最初把三者简单理解成“通过、驳回、编辑”。

纠正后理解：

```text
Approve：接受当前结果，继续向后或完成
Reject：否定当前结果，退回修正或重新生成
Edit：修改上游输入，旧输出失效，重新执行受影响节点
```

重点纠正：

- Reject 不一定停止流程。
- Edit 不是只更新当前节点内容。
- Edit 后如果上游输入改变，旧输出不能继续使用。

核心句：

> HITL 不是按钮 UI，而是 workflow routing signal。

### 2.6 messages / checkpoint 纠正点

用户能说出 messages 不够，但一开始表达较笼统。

纠正后理解：

```text
messages：恢复对话内容和模型上下文
checkpoint：恢复流程执行位置和状态
```

如果只保存 messages，可能出现：

```text
能看到历史对话，但不知道当前节点
重复生成
跳过人工审批
不知道 Approve 后去哪
把未确认内容当成最终结果
```

面试表达：

> 聊天记录可以恢复“说过什么”，但不能可靠恢复“流程执行到哪一步”。可恢复 AI Workflow 必须保存结构化 checkpoint。

## 3. State 核心知识点

### 3.1 四类状态边界

```text
UI State：界面展示状态
Model Messages：模型上下文和对话历史
Agent State：工作流推进需要的结构化业务数据
Checkpoint：用于恢复流程的持久化快照
```

判断方法：

```text
只影响界面吗？→ UI State
要给模型当上下文吗？→ Model Messages
会影响流程推进或最终产物吗？→ Agent State
恢复流程需要它吗？→ Checkpoint
```

### 3.2 UI State

UI State 只服务前端交互和展示。

例子：

```text
按钮 loading
页面当前打开哪个 Tab
面板是否展开
用户还没提交的输入草稿
```

它不应该作为后端 workflow 恢复依据。

### 3.3 Model Messages

Model Messages 是模型上下文和聊天记录。

例子：

```text
user message
assistant message
tool result message
```

作用：

```text
恢复对话展示
构造模型上下文
保留用户和模型说过什么
```

但 messages 不适合单独保存：

```text
currentNode
status
nextNode
threadId
人工审批路由
```

### 3.4 Agent State

Agent State 是 workflow 推进需要的结构化业务数据。

Demo5 中包括：

```text
产品想法
已确认需求
DeepSeek 生成的 PRD 草稿
人工审批结果
修改意见
重试次数
```

核心句：

> 如果一个数据会影响下一步、模型生成、人工审批或最终产物，就应该进入 Agent State。

### 3.5 Checkpoint

Checkpoint 是把某一刻的 Agent State 和执行位置一起保存下来。

Demo5 中包括：

```text
threadId
currentNode
nextNode
status
state
createdAt
updatedAt
```

Checkpoint 不是另一份业务状态，而是恢复包。

## 4. Persistence 与 Memory

### 4.1 Persistence 是什么

Persistence 是保存机制。

它回答：

```text
数据有没有保存下来？
保存在哪里？
刷新、重启、失败后还能不能读回来？
```

例子：

```text
保存 checkpoint 到文件
保存聊天记录到数据库
保存日志到对象存储
保存用户项目到 Postgres
保存缓存到 Redis
```

### 4.2 Memory 是什么

Memory 是未来任务值得复用的信息。

例子：

```text
用户偏好简洁回答
用户常用技术栈是 Next.js + TypeScript
用户偏好工程化面试表达
用户长期项目方向是 B2B SaaS
```

### 4.3 两者区别

```text
Persistence 是“保存动作 / 保存机制”
Memory 是“被保存内容中的一种特殊类型”
```

不是所有保存的数据都是 Memory。

代码类比：

```ts
await db.checkpoints.insert({
  threadId: "run_123",
  currentNode: "approval",
  status: "waiting_for_human",
});
```

这是 Persistence，但不是 Memory。它只服务这一次 workflow 恢复。

```ts
await db.memories.insert({
  userId: "u_1",
  preference: "回答要更偏工程面试表达",
});
```

这是 Persistence + Memory。它未来任务还会复用。

## 5. Checkpoint / Resume 核心知识点

### 5.1 Checkpoint 保存什么

一个合格 checkpoint 至少包含：

```text
threadId：恢复哪一次流程
currentNode：当前在哪一步
nextNode：下一步可能去哪
status：当前运行状态
state：完整 Agent State
updatedAt：保存时间
```

面试表达：

> Checkpoint 不只是保存业务数据，还要保存执行位置。否则系统刷新后只能看到数据，但不知道流程应该从哪里继续。

### 5.2 threadId

threadId 是一次 workflow 的可恢复运行 ID。

它不是：

```text
userId
browser tab ID
message ID
```

一个用户可以同时有多个 workflow：

```text
user_001
→ AI PDF 助手 PRD 流程
→ 合同审查流程
→ 报告生成流程
```

每个流程都应该有自己的 threadId。

### 5.3 Resume

Resume 是加载 checkpoint，从正确位置继续。

不是：

```text
重新跑一遍
只恢复页面内容
只恢复聊天记录
```

刷新恢复过程：

```text
1. 页面刷新。
2. 前端拿到 threadId。
3. 前端请求后端读取 checkpoint。
4. 后端返回 currentNode、status、state。
5. 前端根据 status 恢复审批界面。
6. 用户 Approve / Reject / Edit。
7. 后端写回 state 并继续流程。
```

## 6. HITL 核心知识点

### 6.1 HITL 是什么

Human-in-the-loop 是人在关键节点介入 workflow。

它不只是审批按钮，而是人工动作影响流程路由。

典型动作：

```text
Approve
Reject
Edit
```

人工决策应该写入结构化 Agent State。

### 6.2 Approve

含义：

```text
当前结果可接受
```

流程影响：

```text
写入 approved
继续到下一节点
或进入 completed
```

### 6.3 Reject

含义：

```text
当前结果不合格
```

流程影响：

```text
写入 rejected
旧输出失效
退回修正或重新生成
```

Reject 不一定停止流程。

### 6.4 Edit

含义：

```text
人工修改了上游输入或约束
```

流程影响：

```text
写回新的 state
旧输出失效
重新执行受影响的下游节点
再次等待审批
```

例子：

```text
AI 根据“目标用户是学生”生成方案。
用户改成“目标用户是企业法务团队”。
旧方案不再适用，所以要重新生成。
```

面试表达：

> Edit 改的是上游输入；上游输入变了，下游输出就要重新生成。

## 7. Demo5 实现归档

### 7.1 路径

```text
/Users/elvis/Desktop/21DaysLLMLearning/demo5
```

### 7.2 能力覆盖

```text
Next.js 前端可视化页面
AI SDK + DeepSeek
threadId
Agent State
Checkpoint 文件持久化
HITL Approve / Reject / Edit
Checkpoint 历史展示
学习说明面板
状态设计文档
Checkpoint / HITL 流程文档
模块总结与面试题
```

### 7.3 关键文件

```text
app/page.tsx
app/api/workflow/start/route.ts
app/api/workflow/update/route.ts
src/checkpoint-store.ts
src/prd-workflow.ts
src/deepseek-prd-generator.ts
src/model.ts
src/labels.ts
tests/checkpoint.test.ts
STATE_DESIGN.md
CHECKPOINT_HITL_FLOW.md
MODULE_4_SUMMARY.md
```

### 7.4 工作流

```text
用户输入产品想法
→ 创建 threadId
→ 保存 requirementsApproval checkpoint
→ 通过 threadId 恢复
→ 写入需求确认 Approve
→ 调 DeepSeek 生成 PRD
→ 保存 prdApproval checkpoint
→ status = waiting_for_human
→ 用户 Approve / Reject / Edit
→ finalize / return / regenerate
```

### 7.5 DeepSeek 接入

Demo5 沿用 OpenAI-compatible 方式：

```text
@ai-sdk/openai
OPENAI_BASE_URL=https://api.deepseek.com
AI_MODEL_FAST=deepseek-v4-flash
```

关键文件：

```text
src/model.ts
src/deepseek-prd-generator.ts
```

核心理解：

> DeepSeek 是 workflow 中的 PRD 生成节点，不是整个应用。

### 7.6 HITL 路由

Demo5 中：

```text
Approve PRD
→ finalizeApprovedCheckpoint
→ currentNode = finalize
→ status = completed

Reject PRD
→ rejectCheckpoint
→ 清空旧 PRD
→ 回到 requirementsApproval

Edit requirements
→ editCheckpoint
→ 更新 Agent State
→ 清空旧 PRD
→ 再次调用 DeepSeek
→ 回到 prdApproval
```

## 8. 文档产出

### 8.1 STATE_DESIGN.md

作用：

```text
说明状态边界
```

覆盖：

```text
UI State
Model Messages
Agent State
Checkpoint
字段归属
为什么不能只靠 messages
刷新恢复流程
```

### 8.2 CHECKPOINT_HITL_FLOW.md

作用：

```text
说明流程如何暂停、恢复、审批后路由
```

覆盖：

```text
最小可恢复流程
checkpoint 保存什么
什么时候保存 checkpoint
Approve / Reject / Edit
刷新后恢复
常见错误
面试表达
```

### 8.3 MODULE_4_SUMMARY.md

作用：

```text
模块总结与面试复习
```

覆盖：

```text
核心概念
Demo5 能力
高频面试题
项目设计题
常见错误
掌握度自检
最终面试 Pitch
```

## 9. 严格理解验收结果

本模块执行严格理解验收，不因为 Demo 跑通或用户说懂了就标记完成。

验收项：

```text
1. 核心概念追问
2. 场景判断
3. 项目表达
4. 代码产出与运行验证
5. 面试题快速回答
```

结果：

```text
核心概念追问：通过
场景判断：通过
项目表达：通过
代码产出与运行验证：通过
面试题快速回答：通过
```

关键回补：

```text
Persistence vs Memory
currentNode vs status
Reject vs Edit
Edit 后为什么要重新生成
为什么不能只保存 messages
```

## 10. 验证结果

在 Demo5 中已验证：

```bash
npm run test:checkpoint
npm run typecheck
npm run build
```

结果：

```text
npm run test:checkpoint：5/5 通过
npm run typecheck：通过
npm run build：通过
```

Build 路由：

```text
/
/api/workflow/start
/api/workflow/update
```

## 11. 高频面试题

### 11.1 State、Messages、Checkpoint 有什么区别？

Messages 是模型上下文和聊天历史，主要记录 user、assistant、tool 之间说过什么。State 是工作流运行需要的结构化业务数据，比如输入、生成结果、人工审批结果和重试次数。Checkpoint 是为了恢复流程而保存的快照，它通常包含完整 State，再加上 threadId、currentNode、nextNode、status 等执行位置信息。

一句话：

```text
Messages 解决模型看到什么。
State 解决流程用什么数据。
Checkpoint 解决中断后怎么恢复。
```

### 11.2 Persistence 和 Memory 有什么区别？

Persistence 是工程层面的持久化机制，表示把数据保存到数据库、文件或缓存中，保证刷新、重启或失败后还能恢复。Memory 是 AI 应用里的长期可复用信息，通常是用户偏好、稳定背景或长期约束。

一句话：

```text
Persistence 管存不存得住。
Memory 管以后用不用得上。
```

### 11.3 为什么 AI Workflow 不能只保存 messages？

因为 messages 只能恢复对话内容和模型上下文，不能可靠恢复流程执行位置。AI Workflow 需要知道当前节点、运行状态、下一步路由、threadId 和结构化 Agent State。否则页面刷新后可能看得到历史对话，但不知道是否正在等待人工审批，也不知道下一步该做什么。

### 11.4 页面刷新后如何恢复 HITL 审批界面？

前端通过 threadId 请求后端读取 checkpoint。后端返回 currentNode、status 和 Agent State。前端根据 currentNode 判断当前是否在审批节点，根据 `status = waiting_for_human` 判断是否需要等待人工。如果是，就恢复审批界面，并展示 Approve、Reject、Edit 操作。

### 11.5 threadId 和 userId 有什么区别？

threadId 是一次 workflow 运行 ID，用于查找 checkpoint 和恢复流程。userId 是用户身份 ID，用于数据归属和权限控制。一个用户可以有多个 threadId。

### 11.6 currentNode 和 status 有什么区别？

currentNode 表示流程当前在哪个节点，status 表示这个节点当前的运行状态。

例子：

```text
currentNode = prdApproval
status = waiting_for_human
```

表示当前在 PRD 审批节点，并且正在等待人工操作。

### 11.7 Approve / Reject / Edit 分别意味着什么？

Approve 表示当前结果被接受，流程继续或完成。Reject 表示当前结果不合格，流程通常退回修正或重新生成。Edit 表示用户修改了上游输入，系统要让旧输出失效，并重新执行受影响的下游节点。

### 11.8 Edit 后为什么不能只改当前节点？

因为 Edit 通常修改的是上游输入或约束。旧输出是基于旧输入生成的，如果继续使用会导致状态和产物不一致。所以要写回新的 State，清空或标记旧输出失效，重新生成受影响内容，并再次等待审批。

## 12. 项目设计题

题目：

```text
设计一个 AI 合同审查系统，要求支持律师审批和页面刷新后恢复。
```

参考回答：

```text
我会为每次合同审查生成一个 threadId。Workflow State 中保存合同 ID、AI 生成的风险点、律师审批状态、修改意见和重试次数。AI 生成风险点后，系统保存 checkpoint，包含 currentNode = lawyerApproval、status = waiting_for_human、nextNode = generateFinalReport 和完整 Agent State。页面刷新后，前端通过 threadId 恢复 checkpoint，如果 status 是 waiting_for_human，就展示律师审批界面。律师 Approve 后生成最终报告，Reject 后退回风险点修正，Edit 后更新审查条件并重新生成风险点。
```

## 13. 项目表达

> Demo5 不是一次性生成页面，而是一个可恢复 AI Workflow。DeepSeek 在里面只是 PRD 生成节点，系统还维护 threadId、Agent State 和 checkpoint。AI 生成 PRD 后，流程会暂停在 HITL 审批节点，用户可以批准、退回或编辑。checkpoint 支持页面刷新后恢复当前节点、运行状态和业务状态，避免流程错乱或重复生成。这个项目体现了我对 AI Workflow 状态管理、持久化恢复和人工审批路由的工程能力。

## 14. 模块 4 完成判定

模块 4 已完成：

```text
核心概念掌握：通过
项目代码完成：通过
功能可以运行：通过
练习通过：通过
章节总结完成：通过
高频面试题完成：通过
项目设计题完成：通过
```

最终结论：

> 模块 4 可以标记完成。下一模块可进入 RAG，但本模块窗口不提前展开模块 5。
