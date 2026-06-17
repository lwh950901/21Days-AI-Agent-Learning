"use client";

import { useState } from "react";
import type { ProductCraftCheckpoint } from "../src/checkpoint-store.ts";
import { NODE_LABELS, STATUS_LABELS } from "../src/labels.ts";
import type { StatePersistenceDemoResult } from "../src/demo.ts";

const defaultIdea = "AI PDF assistant for legal and research teams";

// ── Learning notes ──

const LEARNING_NOTES: Record<string, { concept: string; interview: string }> = {
  requirementsApproval: {
    concept:
      "首次 checkpoint 保存 threadId + Agent State 快照到磁盘。threadId 是恢复工作流的唯一凭证。",
    interview:
      "每个工作流实例都有一个 threadId，checkpoint 序列化后落盘，任何时刻都可以通过 threadId 恢复。",
  },
  resume: {
    concept:
      "通过 threadId 加载 checkpoint，写入人工审批结果后路由到下一个节点——这就是 Resume。",
    interview:
      "Resume 不是重新开始，而是从上次暂停的节点继续。人工审批不是 UI 状态，而是写进 Agent State 的结构化事件。",
  },
  generatePrd: {
    concept:
      "模型调用是 Workflow 的一个节点：输入来自 Agent State，输出写回 Agent State，然后再次 checkpoint。",
    interview:
      "我把 DeepSeek 封装成 Workflow 节点，和手写逻辑平等对待。这样模型调用可追踪、可恢复、可审计。",
  },
  prdApproval: {
    concept:
      "生成完成后再次 checkpoint 并暂停，等待人工审批。这就是 HITL——人类在关键节点介入。",
    interview:
      "AI 生成 PRD 后不直接发布，而是暂停等人确认。HITL 是 AI 工作流的安全边界，不是事后补救。",
  },
  finalize: {
    concept:
      "审批通过后进入 completed 终态，nextNode 置空。checkpoint 链完整可追溯。",
    interview:
      "每一次人工决策都记录在 checkpoint 里，形成完整的审计链。这在合规场景下非常重要。",
  },
};

function getLearningNote(label: string) {
  return LEARNING_NOTES[label] ?? null;
}

// ── Components ──

function LearningPanel({ step }: { step: string }) {
  const note = getLearningNote(step);
  if (!note) return null;

  return (
    <section className="panel learning-panel">
      <h2>Learning context</h2>
      <div className="learning-sections">
        <div>
          <h4>📖 核心概念</h4>
          <p>{note.concept}</p>
        </div>
        <div>
          <h4>💬 面试表达</h4>
          <p>{note.interview}</p>
        </div>
      </div>
    </section>
  );
}

function HistoryPanel({
  history,
}: {
  history: ProductCraftCheckpoint[];
}) {
  if (history.length === 0) return null;

  return (
    <section className="panel history-panel">
      <h2>Checkpoint 变更历史</h2>
      <div className="history-list">
        {history.map((cp, i) => (
          <div key={cp.threadId + i} className="history-item">
            <span className="history-index">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <strong>{NODE_LABELS[cp.currentNode]}</strong>
              <span className="history-status">
                {STATUS_LABELS[cp.status]}
              </span>
              <p>
                {cp.state.approvalStatus === "approved"
                  ? "已批准"
                  : cp.state.approvalStatus === "rejected"
                    ? "已退回"
                    : cp.state.approvalStatus === "edited"
                      ? "已修改"
                      : "待审批"}
                {" · "}PRD: {cp.state.prdDraft ? "已生成" : "未生成"}
                {" · "}修订次数: {cp.state.revisionCount}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Step({
  title,
  caption,
  active,
}: {
  title: string;
  caption: string;
  active: boolean;
}) {
  return (
    <div className={active ? "step step-active" : "step"}>
      <strong>{title}</strong>
      <span>{caption}</span>
    </div>
  );
}

// ── Page ──

export default function Page() {
  const [idea, setIdea] = useState(defaultIdea);
  const [result, setResult] = useState<StatePersistenceDemoResult | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [currentCheckpoint, setCurrentCheckpoint] =
    useState<ProductCraftCheckpoint | null>(null);
  const [history, setHistory] = useState<ProductCraftCheckpoint[]>([]);
  const [activeStep, setActiveStep] = useState("");
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  async function startWorkflow() {
    setError("");
    setCurrentCheckpoint(null);
    setHistory([]);
    setActiveStep("");
    setIsStarting(true);

    const response = await fetch("/api/workflow/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea }),
    });

    const payload = await response.json();
    setIsStarting(false);

    if (!response.ok) {
      setError(payload.message ?? "工作流启动失败。");
      return;
    }

    setResult(payload);
    setThreadId(payload.prdApproval.threadId);

    // Build history: created → approved → prdApproval
    const steps: ProductCraftCheckpoint[] = [
      payload.created,
      payload.approved,
      payload.prdApproval,
    ];
    setHistory(steps);
    setCurrentCheckpoint(payload.prdApproval);
    setActiveStep("prdApproval");
  }

  async function updateWorkflow(action: string, edits?: Record<string, string>) {
    if (!threadId) return;

    setError("");
    setIsUpdating(true);

    const response = await fetch("/api/workflow/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, action, edits }),
    });

    const payload = await response.json();
    setIsUpdating(false);

    if (!response.ok) {
      setError(payload.message ?? "操作失败。");
      return;
    }

    const cp = payload.checkpoint as ProductCraftCheckpoint;
    setCurrentCheckpoint(cp);
    setHistory((prev) => [...prev, cp]);

    if (cp.currentNode === "requirementsApproval") {
      setActiveStep("requirementsApproval");
    } else if (cp.currentNode === "prdApproval") {
      setActiveStep("prdApproval");
    } else if (cp.status === "completed") {
      setActiveStep("finalize");
    }
  }

  const isAtPrdApproval = currentCheckpoint?.currentNode === "prdApproval";
  const isCompleted = currentCheckpoint?.status === "completed";
  const isRejected = currentCheckpoint?.currentNode === "requirementsApproval";

  return (
    <main className="shell">
      {/* ── Hero ── */}
      <section className="hero">
        <div>
          <p className="eyebrow">Module 4 / State · Checkpoint · Resume · HITL</p>
          <h1>可恢复 AI 工作流控制台</h1>
          <p className="lead">
            DeepSeek 生成 PRD，checkpoint 保存快照。人可以批准、退回、修改，每一步都记录在案。
          </p>
        </div>
        <div className="status-ribbon">
          <span>DeepSeek via AI SDK</span>
          <strong>
            {currentCheckpoint
              ? STATUS_LABELS[currentCheckpoint.status]
              : "待启动"}
          </strong>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="timeline" aria-label="workflow timeline">
        <Step
          title="1. 需求确认"
          caption="保存 checkpoint，等待人工确认"
          active={activeStep === "requirementsApproval" || Boolean(result)}
        />
        <Step
          title="2. 恢复执行"
          caption="通过 threadId 恢复，写入审批"
          active={Boolean(result?.approved)}
        />
        <Step
          title="3. 生成 PRD"
          caption="DeepSeek 生成 PRD 草稿"
          active={Boolean(result?.prdApproval.state.prdDraft)}
        />
        <Step
          title="4. PRD 审批"
          caption="再次 checkpoint，人工审批"
          active={isAtPrdApproval ?? false}
        />
        <Step
          title="5. 完结"
          caption="审批通过，进入终态"
          active={isCompleted}
        />
      </section>

      {/* ── Workbench ── */}
      <section className="workbench">
        <aside className="control-panel">
          <label htmlFor="idea">产品想法</label>
          <textarea
            id="idea"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            disabled={Boolean(result)}
          />
          <button onClick={startWorkflow} disabled={isStarting || Boolean(result)}>
            {isStarting ? "DeepSeek 生成中..." : "启动可恢复流程"}
          </button>

          {isAtPrdApproval && (
            <>
              <button onClick={() => updateWorkflow("approve")} disabled={isUpdating}>
                {isUpdating ? "处理中..." : "批准 PRD"}
              </button>
              <button
                className="secondary"
                onClick={() => updateWorkflow("reject")}
                disabled={isUpdating}
              >
                退回修改
              </button>
              <button
                className="secondary"
                onClick={() =>
                  updateWorkflow("edit", {
                    targetUsers: "Legal professionals and research analysts",
                  })
                }
                disabled={isUpdating}
              >
                编辑需求并重新生成
              </button>
            </>
          )}

          {isRejected && (
            <button
              onClick={() =>
                updateWorkflow("edit", {
                  targetUsers: "Legal professionals and research analysts",
                })
              }
              disabled={isUpdating}
            >
              修改需求后重新生成 PRD
            </button>
          )}

          {isCompleted && (
            <button onClick={startWorkflow} disabled={isStarting}>
              开始新的工作流
            </button>
          )}

          {error ? <p className="error">{error}</p> : null}
        </aside>

        <section className="output-grid">
          <article className="panel">
            <h2>PRD 草稿</h2>
            <pre>
              {currentCheckpoint?.state.prdDraft ??
                "启动流程后显示 DeepSeek 生成结果。"}
            </pre>
          </article>

          <LearningPanel step={activeStep} />
        </section>
      </section>

      {/* ── History ── */}
      <HistoryPanel history={history} />

      {/* ── Current checkpoint JSON ── */}
      {currentCheckpoint && (
        <section className="panel" style={{ marginTop: 14 }}>
          <h2>当前 Checkpoint (JSON)</h2>
          <pre>
            {JSON.stringify(currentCheckpoint, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
