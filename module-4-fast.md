# 模块 4 一页纸速记：State、Persistence、Checkpoint 与 HITL

## 1. 模块 4 核心句

模块 4 学的不是“怎么调 DeepSeek 生成 PRD”，而是：

> 如何把 AI Workflow 做成可恢复、可审批、可继续执行的企业级流程。

通用模板：

```text
Input
→ Create threadId
→ Run Node
→ Save Checkpoint
→ HITL Pause
→ Resume
→ Approve / Reject / Edit
→ Continue / Regenerate / Finalize
```

## 2. State / Messages / Checkpoint 速记

```text
UI State：只服务界面展示
Model Messages：给模型看的对话上下文
Agent State：Workflow 推进需要的结构化业务数据
Checkpoint：为了恢复流程而保存的快照
```

核心句：

> Messages 解决“模型看到什么”，State 解决“流程用什么数据”，Checkpoint 解决“中断后怎么恢复”。

最容易说错：

```text
不要把 currentNode / status 塞进 messages
不要把按钮 loading 当成 Agent State
不要把 Checkpoint 理解成聊天记录
```

## 3. Persistence / Memory 速记

```text
Persistence：数据有没有保存下来，之后能不能读回来
Memory：这个信息未来任务值不值得复用
```

口诀：

```text
持久化看保存，记忆看复用。
```

例子：

```text
保存 checkpoint：Persistence，但不是 Memory
保存报错日志：Persistence，但不是 Memory
保存用户偏好：Persistence + Memory
保存长期技术栈：Persistence + Memory
```

面试句：

> Persistence 是工程上的保存机制，Memory 是 AI 应用里可长期复用的信息。不是所有保存下来的数据都是 Memory，比如 checkpoint 和日志虽然会被持久化，但它们通常只服务恢复、审计或排错。

## 4. Checkpoint 速记

Checkpoint = State + 执行位置 + 恢复元信息。

通常包含：

```text
threadId：哪一次流程
currentNode：当前在哪个节点
nextNode：下一步去哪
status：running / waiting_for_human / completed / failed
state：完整 Agent State
updatedAt：保存时间
```

核心句：

> State 说明“有什么数据”，Checkpoint 说明“怎么恢复流程”。

## 5. threadId / userId 区别

```text
userId：这个数据属于哪个用户
threadId：这是哪一次可恢复 workflow
```

一个用户可以有多个 threadId：

```text
user_001
→ run_prd_001
→ run_contract_002
→ run_report_003
```

面试句：

> threadId 是可恢复流程实例 ID，用来查找对应 checkpoint；userId 是用户身份 ID，用来做数据归属和权限控制。二者不能混用。

## 6. currentNode / status 区别

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

最容易说错：

```text
waiting_for_human 不是 currentNode
它是 status
```

## 7. Resume 速记

Resume 不是重新开始，而是从 checkpoint 继续。

刷新恢复流程：

```text
页面刷新
→ 前端拿 threadId
→ 后端读取 checkpoint
→ 返回 currentNode + status + state
→ 前端恢复审批界面
→ 用户 Approve / Reject / Edit
→ 后端写回 state
→ 继续或重跑
```

面试句：

> 恢复时不能只恢复聊天记录，而要根据 threadId 读取 checkpoint。checkpoint 里有 currentNode、status 和 Agent State，前端才能判断是否需要恢复 HITL 审批界面。

## 8. HITL：Approve / Reject / Edit

```text
Approve：接受当前结果 → 继续向后或完成
Reject：否定当前结果 → 退回修正或重新生成
Edit：修改上游输入 → 旧输出失效，重新生成受影响内容
```

核心句：

> HITL 不是按钮 UI，而是 workflow routing signal。

最容易说错：

```text
Reject 不一定停止流程
Edit 不是只改当前节点文字
Edit 通常要重新执行下游生成节点
```

## 9. Demo5 状态

路径：

```text
/Users/elvis/Desktop/21DaysLLMLearning/demo5
```

能力：

```text
Next.js 前端可视化页面
AI SDK + DeepSeek PRD 生成节点
threadId
Agent State
Checkpoint 文件持久化
HITL Approve / Reject / Edit
Checkpoint 历史展示
状态设计文档
HITL 流程文档
模块总结与面试题
```

关键文件：

```text
demo5/app/page.tsx
demo5/app/api/workflow/start/route.ts
demo5/app/api/workflow/update/route.ts
demo5/src/checkpoint-store.ts
demo5/src/prd-workflow.ts
demo5/src/deepseek-prd-generator.ts
demo5/STATE_DESIGN.md
demo5/CHECKPOINT_HITL_FLOW.md
demo5/MODULE_4_SUMMARY.md
```

运行：

```bash
cd /Users/elvis/Desktop/21DaysLLMLearning/demo5
npm run dev
```

页面：

```text
http://localhost:3000
```

验证：

```bash
npm run test:checkpoint
npm run typecheck
npm run build
```

已通过：

```text
npm run test:checkpoint：5/5
npm run typecheck
npm run build
```

## 10. 60 秒面试表达

> 我做了一个模块 4 Demo，把 AI 应用从一次性生成页面升级成可恢复 AI Workflow。DeepSeek 只是 PRD 生成节点，系统还维护 threadId、Agent State 和 checkpoint。AI 生成 PRD 后不会直接发布，而是在审批节点保存 checkpoint，并进入 waiting_for_human 状态。页面刷新后可以通过 threadId 恢复 currentNode、status 和 state，继续展示审批界面。

> HITL 里用户可以 Approve、Reject 或 Edit。Approve 会继续或完成流程，Reject 会退回修正，Edit 会修改上游输入并让旧输出失效，然后重新生成受影响内容。这个 Demo 体现了我对 AI Workflow 状态管理、持久化恢复和人工审批路由的工程理解。

## 11. 高频题速答

### 为什么不能只保存 messages？

> messages 只能恢复对话内容，不能可靠恢复流程位置。Workflow 还需要 currentNode、status、nextNode、threadId 和 Agent State。

### Checkpoint 和 State 区别？

> State 是流程使用的结构化数据；Checkpoint 是为了恢复流程保存的快照，包含 State 和执行位置信息。

### Persistence 和 Memory 区别？

> Persistence 看数据能不能保存和读回；Memory 看信息未来值不值得复用。

### threadId 和 userId 区别？

> threadId 是一次 workflow 运行 ID，userId 是用户身份 ID。一个用户可以有多个 threadId。

### currentNode 和 status 区别？

> currentNode 是在哪一步，status 是这一步当前是什么状态。

### 页面刷新后怎么恢复 HITL？

> 前端用 threadId 请求 checkpoint，后端返回 currentNode、status、state。若 status 是 waiting_for_human，就恢复审批界面和 Approve / Reject / Edit。

### Edit 后为什么要重新生成？

> Edit 改了上游输入，旧输出基于旧条件生成，已经不适用，所以要重新生成受影响内容。

## 12. 面试前 10 分钟检查

必须能说清：

```text
1. UI State / Model Messages / Agent State / Checkpoint 分别是什么
2. Persistence 和 Memory 为什么不是一回事
3. threadId 为什么不是 userId
4. currentNode 和 status 为什么不能混
5. waiting_for_human 的作用
6. 页面刷新后如何恢复审批界面
7. Approve / Reject / Edit 对 workflow 路由的影响
8. demo5 为什么不是一次性 AI 生成页面
```

最容易说错：

```text
State 不是保存动作
Checkpoint 不是聊天记录
Persistence 不是 Memory
waiting_for_human 不是 currentNode
Reject 不一定停止流程
Edit 不是只改 UI 文本
Demo 跑通不等于概念掌握
```
