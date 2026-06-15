"use client";

import { useState } from "react";
import type { ProductBrief } from "../lib/productcraft/schema";
import type { ToolCallLog } from "../lib/productcraft/tools";

const SAMPLE_PRODUCT_BRIEF: ProductBrief = {
  productName: "LaunchCraft",
  oneSentencePitch: "帮助独立开发者快速生成 SaaS 落地页定位和首屏文案。",
  targetUsers: ["独立开发者", "早期 SaaS 创业者"],
  painPoints: ["不会写清晰的产品定位", "落地页文案上线慢"],
  coreFeatures: ["生成一句话定位", "生成首屏文案", "生成核心卖点"],
  competitors: [],
  pricing: null,
  confidence: 0.82,
};

const TOOL_TASKS = [
  "请查找这个产品方向的竞品，返回候选列表。",
  "请把当前 ProductBrief 保存为 LaunchCraft 项目。",
  "请搜索 timeout，演示工具错误展示。",
];

export default function Home() {
  const [toolMessage, setToolMessage] = useState(TOOL_TASKS[0]);
  const [toolStatus, setToolStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [toolAnswer, setToolAnswer] = useState("");
  const [toolError, setToolError] = useState("");
  const [toolLogs, setToolLogs] = useState<ToolCallLog[]>([]);

  const runToolCalling = async (message = toolMessage) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || toolStatus === "running") {
      return;
    }

    setToolStatus("running");
    setToolError("");
    setToolAnswer("");
    setToolLogs([]);
    setToolMessage(trimmedMessage);

    try {
      const response = await fetch("/api/tool-calling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedMessage, brief: SAMPLE_PRODUCT_BRIEF }),
      });
      const payload = (await response.json()) as {
        answer?: string;
        logs?: ToolCallLog[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "工具调用失败。");
      }

      setToolAnswer(payload.answer ?? "工具执行完成。");
      setToolLogs(payload.logs ?? []);
      setToolStatus("done");
    } catch (fetchError) {
      setToolStatus("error");
      setToolError(fetchError instanceof Error ? fetchError.message : "工具调用失败。");
    }
  };

  return (
    <main className="workspace">
      <section className="briefing">
        <p className="eyebrow">Module 2 · Tool Calling</p>
        <h1>ProductCraft Tool Lab</h1>
        <p className="summary">
          专注演示 AI SDK Tool Calling：模型只能在后端白名单中选择
          <code>searchCompetitors</code> 和 <code>saveProject</code>，后端负责参数校验、执行、
          错误收敛和工具调用日志。
        </p>
        <div className="status-row" aria-live="polite">
          <span className={`status status-${toolStatus}`}>{toolStatus === "running" ? "执行中" : "待执行"}</span>
          <span>Tool name · inputSchema · execute · Tool Result</span>
        </div>
      </section>

      <section className="tool-lab" aria-label="ProductCraft 工具调用工作台">
        <div className="tool-runner">
          <p className="eyebrow">Tool request</p>
          <h2>运行工具调用</h2>
          <p>
            示例 ProductBrief 已固定在页面中。你只需要输入工具任务，模型会决定是否调用只读工具或业务工具。
          </p>
          <textarea
            disabled={toolStatus === "running"}
            onChange={(event) => setToolMessage(event.target.value)}
            value={toolMessage}
          />
          <div className="quick-actions">
            {TOOL_TASKS.map((task) => (
              <button
                disabled={toolStatus === "running"}
                key={task}
                onClick={() => void runToolCalling(task)}
                type="button"
              >
                {task}
              </button>
            ))}
          </div>
          <div className="composer-actions">
            <button
              disabled={!toolMessage.trim() || toolStatus === "running"}
              onClick={() => void runToolCalling()}
              type="button"
            >
              {toolStatus === "running" ? "执行中" : "运行工具调用"}
            </button>
          </div>
          {toolError ? <p className="error">{toolError}</p> : null}
        </div>

        <div className="tool-output">
          <section className="sample-brief" aria-label="示例 ProductBrief">
            <span className="status">brief</span>
            <h2>{SAMPLE_PRODUCT_BRIEF.productName}</h2>
            <p>{SAMPLE_PRODUCT_BRIEF.oneSentencePitch}</p>
            <ul>
              {SAMPLE_PRODUCT_BRIEF.coreFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </section>

          <div className="tool-answer">
            <span className="status">answer</span>
            <p>{toolAnswer || "运行工具调用后，这里会显示模型基于 tool result 生成的回答。"}</p>
          </div>

          <div className="tool-log-list">
            <h3>工具调用日志</h3>
            {toolLogs.length ? (
              toolLogs.map((log) => (
                <article className={`tool-log tool-log-${log.status}`} key={log.id}>
                  <div>
                    <strong>{log.toolName}</strong>
                    <span>{log.risk}</span>
                    <span>{log.status}</span>
                  </div>
                  <pre>{JSON.stringify(log.result, null, 2)}</pre>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <span>No calls</span>
                <p>如果模型没有选择工具，日志会保持为空。</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
